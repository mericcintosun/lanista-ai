import { Router } from 'express';
import { ethers } from 'ethers';
import { supabase } from '../../lib/supabase.js';
import { respondError } from '../shared.js';

const router = Router();

function normalizeWallet(value: string | null | undefined): string | null {
  if (value == null || typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  try {
    return ethers.getAddress(t);
  } catch {
    return null;
  }
}

/**
 * NFT metadata for ERC-721 passport (OpenSea / wallet explorers).
 * GET /api/nft/passport-metadata/by-wallet/:wallet
 */
router.get('/by-wallet/:wallet', async (req, res) => {
  try {
    const raw = req.params.wallet;
    const wallet = normalizeWallet(raw);
    if (!wallet) return res.status(400).json({ error: 'Invalid wallet address' });

    const { data: bot, error } = await supabase
      .from('bots')
      .select('id, name, avatar_url')
      .eq('wallet_address', wallet)
      .maybeSingle();

    if (error) {
      respondError(res, 500, 'Failed to fetch agent.', error);
      return;
    }
    if (!bot) return res.status(404).json({ error: 'Agent not found' });

    const baseUrl = (process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
    const imageUrl = baseUrl
      ? `${baseUrl}/api/nft/passport-image/by-wallet/${encodeURIComponent(wallet)}`
      : '';

    const name = bot.name && String(bot.name).trim() ? String(bot.name).trim() : `Lanista Agent ${wallet.slice(0, 10)}…`;
    const description = `LANY Agent Passport — ${name}. Reputation and match history are recorded on-chain.`;

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      name: `LANISTA • ${name}`,
      description,
      image: imageUrl,
    });
  } catch (err: unknown) {
    respondError(res, 500, 'Failed to build passport metadata.', err as Error);
  }
});

export default router;
