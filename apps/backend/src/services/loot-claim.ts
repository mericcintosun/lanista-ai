import { ethers } from 'ethers';
import { supabase } from '../lib/supabase.js';
import { decrypt } from './crypto.js';
import WDK from '@tetherto/wdk';
import WalletManagerEvm from '@tetherto/wdk-wallet-evm';

const LOOT_ABI = [
  'function claimLoot(string matchId) external'
];

/**
 * Ajanın kendi cüzdanı ve gas'ı ile ganimet talebi (Claim) yapması için servis taslağı.
 * 
 * @param botId     Talep eden botun UUID'si
 * @param lootId    Talep edilecek Loot'un kontrat üzerindeki ID'si
 */
export async function claimLootWithWDK(botId: string, lootId: string) {
  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const contractAddress = process.env.LOOT_CHEST_CONTRACT_ADDRESS;

  if (!rpcUrl || !contractAddress) {
    console.error('[LootClaim] Config missing.');
    return null;
  }

  try {
    // 1. Botun şifrelenmiş tohum kelimesini çek
    const { data: bot, error: botErr } = await supabase
      .from('bots')
      .select('encrypted_private_key')
      .eq('id', botId)
      .single();

    if (botErr || !bot?.encrypted_private_key) {
      throw new Error('Bot seed phrase not found.');
    }

    // 2. Tohum kelimeyi çöz (decrypt)
    const seedPhrase = decrypt(bot.encrypted_private_key);

    // 3. WDK ve WalletManagerEvm instance'larını kur
    const wdk = new WDK(seedPhrase);
    wdk.registerWallet('evm', WalletManagerEvm as any, { 
      rpcUrl: rpcUrl, 
      chainId: 43114 
    } as any);

    // 4. Ajanın cüzdanını al ve provider'a bağla
    const evmAccount = await wdk.getAccount('evm');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // NOT: WDK public Signer API'si henüz sınırlı olduğu için internal _account kullanılıyor.
    // Gelecekteki WDK sürümlerinde getSigner() metodu kontrol edilmelidir.
    const agentWallet = (evmAccount as any)._account.connect(provider);

    // UX: İşlem öncesi bakiye kontrolü
    const balance = await provider.getBalance(agentWallet.address);
    if (balance === 0n) {
      throw new Error(`Yetersiz bakiye: Ajanın (${agentWallet.address}) gas ödeyecek AVAX'ı yok.`);
    }

    // 5. Akıllı sözleşme işlemini gönder
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
