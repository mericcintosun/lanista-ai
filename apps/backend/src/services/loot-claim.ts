import { ethers } from 'ethers';
import { supabase } from '../lib/supabase.js';
import { decrypt } from './crypto.js';
import WDK from '@tetherto/wdk';
import WalletManagerEvm from '@tetherto/wdk-wallet-evm';

const LOOT_ABI = [
  'function claimLoot(string matchId) external'
];

/**
 * Service for agents to claim loot using their own wallet and gas.
 * 
 * @param botId     UUID of the claiming bot
 * @param lootId    On-chain ID of the loot to claim
 */
export async function claimLootWithWDK(botId: string, lootId: string) {
  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const contractAddress = process.env.LOOT_CHEST_CONTRACT_ADDRESS;

  if (!rpcUrl || !contractAddress) {
    console.error('[LootClaim] Config missing.');
    return null;
  }

  try {
    // 1. Fetch the bot's encrypted seed phrase
    const { data: bot, error: botErr } = await supabase
      .from('bots')
      .select('encrypted_private_key')
      .eq('id', botId)
      .single();

    if (botErr || !bot?.encrypted_private_key) {
      throw new Error('Bot seed phrase not found.');
    }

    // 2. Decrypt the seed phrase
    const seedPhrase = decrypt(bot.encrypted_private_key);

    // 3. Initialize WDK and WalletManagerEvm instances
    const wdk = new WDK(seedPhrase);
    wdk.registerWallet('evm', WalletManagerEvm as any, {
      rpcUrl: rpcUrl,
      chainId: 43114
    } as any);

    // 4. Get the agent's wallet and connect to provider
    const evmAccount = await wdk.getAccount('evm');
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // NOTE: Using internal _account since WDK public Signer API is still limited.
    // Future WDK versions should be checked for a getSigner() method.
    const agentWallet = (evmAccount as any)._account.connect(provider);

    // UX: Pre-transaction balance check
    const balance = await provider.getBalance(agentWallet.address);
    if (balance === 0n) {
      throw new Error(`Insufficient balance: Agent (${agentWallet.address}) has no AVAX to pay for gas.`);
    }

    // 5. Send the smart contract transaction
    const lootContract = new ethers.Contract(contractAddress, LOOT_ABI, agentWallet);

    console.log(`[LootClaim] 🎒 Claiming loot ${lootId} for bot ${botId}...`);
    const tx = await lootContract.claimLoot(lootId);
    console.log(`[LootClaim] ⏳ Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`[LootClaim] ✅ Loot claimed successfully! TX: ${tx.hash}`);

    return tx.hash;
  } catch (err: any) {
    console.error('[LootClaim] ❌ Failed to claim loot:', err.message);
    return null;
  }
}
