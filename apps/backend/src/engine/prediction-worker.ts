import { supabase } from '../lib/supabase.js';

/**
 * settleMatchPredictions
 *
 * Called after a match finishes.
 * Implements the Social Predictions settlement logic using spark_credit RPC:
 *
 *  1. Aggregate all spark_transactions for this match (support_player_1/2)
 *  2. Split into winnerPool (backers of winning side) and loserPool (losing side)
 *  3. Deduct 5% Treasury Tax from loserPool → creates 'treasury_tax' transactions
 *  4. Distribute remaining loserPool pro-rata to winner backers → 'prediction_win' credit RPC
 *  5. Award 2.5% of winnerPool to the winning bot's owner → 'bot_owner_cut' credit RPC
 */
export async function settleMatchPredictions(
  matchId: string,
  winnerId: string
): Promise<void> {
  try {
    // ── 1. Load all support transactions for this match ──────────────────────
    const { data: txns, error: txErr } = await supabase
      .from('spark_transactions')
      .select('user_id, amount, transaction_type')
      .eq('reference_id', matchId)
      .in('transaction_type', ['support_player_1', 'support_player_2']);

    if (txErr || !txns || txns.length === 0) {
      console.log(`[Prediction] Match ${matchId}: No support transactions found — skipping settlement.`);
      return;
    }

    // Determine which transaction_type corresponds to the winner
    const { data: matchData } = await supabase
      .from('matches')
      .select('player_1_id, player_2_id, winner_id, is_pool_voided')
      .eq('id', matchId)
      .single();

    if (!matchData) {
      console.warn(`[Prediction] Match ${matchId}: Could not load match data.`);
      return;
    }

    if (matchData.is_pool_voided) {
      console.log(`[Prediction] Match ${matchId}: Pool was voided — skipping settlement.`);
      return;
    }

    const winnerTxType =
      matchData.winner_id === matchData.player_1_id
        ? 'support_player_1'
        : 'support_player_2';
    const loserTxType =
      winnerTxType === 'support_player_1' ? 'support_player_2' : 'support_player_1';

    // ── 2. Bucket into prediction contributions ────────────────────────────
    // spark_transactions.amount is negative for spends; Math.abs gives the backed value.
    const winnerTxns = txns.filter(t => t.transaction_type === winnerTxType);
    const loserTxns  = txns.filter(t => t.transaction_type === loserTxType);

    const totalWinnerPool = winnerTxns.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const totalLoserPool  = loserTxns.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

    console.log(
      `[Prediction] Match ${matchId}: winnerPool=${totalWinnerPool} loserPool=${totalLoserPool}`
    );

    const TREASURY_TAX_RATE = 0.05;  // 5% system fee
    const BOT_OWNER_CUT_RATE = 0.025; // 2.5% bot owner fee (total tax on loser pool = 7.5%)

    // ── 3. Deductions from Loser Pool ─────────────────────────────────────────
    const treasuryTax = Math.floor(totalLoserPool * TREASURY_TAX_RATE);
    const botOwnerCut = Math.floor(totalLoserPool * BOT_OWNER_CUT_RATE);
    const distributablePool = totalLoserPool - treasuryTax - botOwnerCut;

    // Record the treasury tax as a single system-level transaction (no user_id)
    if (treasuryTax > 0) {
      try {
        await supabase.from('spark_transactions').insert({
          user_id: null as unknown as string, // system / treasury
          amount: treasuryTax,
          transaction_type: 'treasury_tax',
          reference_id: matchId,
        });
      } catch (e: any) {
        console.warn('[Prediction] Treasury tax insert failed:', e.message);
      }
    }

    // ── 4. Distribute winnings to winner backers ────────────────────────────
    if (winnerTxns.length > 0) {
      for (const backer of winnerTxns) {
        const backerStake = Math.abs(Number(backer.amount));
        const share = totalWinnerPool > 0 && distributablePool > 0
          ? Math.floor((backerStake / totalWinnerPool) * distributablePool)
          : 0;
        
        // Winners get their original stake back PLUS their share of the distributable loser pool
        const payout = backerStake + share;

        // Use the tested and safe spark_credit RPC
        try {
          await supabase.rpc('spark_credit', {
            p_user_id: backer.user_id,
            p_amount: payout, // spark_credit correctly handles amount internally
            p_wallet_address: null,
            p_tx_type: 'prediction_win',
            p_reference_id: matchId,
          });
          console.log(`[Prediction] Credited ${payout} to user ${backer.user_id} (Stake: ${backerStake}, Share: ${share})`);
        } catch (payErr: any) {
          console.warn(`[Prediction] Failed to credit prediction_win to ${backer.user_id}:`, payErr?.message);
        }
      }
    }

    console.log(
      `[Prediction] Match ${matchId}: Distributed ${distributablePool} Sparks ` +
      `to ${winnerTxns.length} backers (Sytem fee kept ${treasuryTax}).`
    );

    // ── 5. Bot Owner Cut ────────────────────────────────────────────────────
    if (botOwnerCut > 0 && winnerId) {
      const { data: winnerBot } = await supabase
        .from('bots')
        .select('owner_id')
        .eq('id', winnerId)
        .single();

      const ownerId = winnerBot?.owner_id;
      if (ownerId) {
        try {
          await supabase.rpc('spark_credit', {
            p_user_id: ownerId,
            p_amount: botOwnerCut,
            p_wallet_address: null,
            p_tx_type: 'bot_owner_cut',
            p_reference_id: matchId,
          });
        } catch (err: any) {
          console.warn(`[Prediction] Failed to credit bot_owner_cut to ${ownerId}:`, err?.message);
        }

        console.log(
          `[Prediction] Match ${matchId}: Credited ${botOwnerCut} Sparks ` +
          `bot_owner_cut to owner ${ownerId}.`
        );
      }
    }
  } catch (err: any) {
    console.error('[Prediction] Settlement error (non-fatal):', err?.message ?? err);
  }
}
