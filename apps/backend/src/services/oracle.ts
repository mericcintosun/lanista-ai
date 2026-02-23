import { ethers } from 'ethers';

// Sadece kullandığımız fonksiyon ve event'i içeren minimal ABI (Human-Readable)
const ORACLE_ABI = [
  "function recordMatchResult(string matchId, address winner, address loser) external",
  "event MatchRecorded(string indexed matchId, address indexed winner, address indexed loser, uint256 timestamp)"
];

/**
 * Maç sonucunu Avalanche C-Chain (Fuji) üzerindeki ArenaOracle sözleşmesine yazar.
 * Sadece bu backend sunucusu (onlyOwner) bu fonksiyonu çağırabilir.
 * 
 * @param matchId   Supabase'deki maç UUID'si
 * @param winner    Kazanan ajanın cüzdan adresi (wallet_address)
 * @param loser     Kaybeden ajanın cüzdan adresi (wallet_address)
 * @returns         İşlem hash'i (tx.hash) - Snowtrace'de doğrulanabilir
 */
export async function recordMatchOnChain(
  matchId: string,
  winner: string,
  loser: string
): Promise<string | null> {
  // Gerekli env değişkenleri yoksa sessizce geç (offline mod)
  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const contractAddress = process.env.ORACLE_CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    console.warn('[Oracle] ⚠️  Env değişkenleri eksik, on-chain kayıt atlandı.');
    return null;
  }

  // Geçersiz veya eksik cüzdan adresleri ile çağrı yapılmasın
  if (!winner || !loser || !ethers.isAddress(winner) || !ethers.isAddress(loser)) {
    console.warn(`[Oracle] ⚠️  Geçersiz adresler: winner=${winner}, loser=${loser}. Atlanıyor.`);
    return null;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const oracle = new ethers.Contract(contractAddress, ORACLE_ABI, wallet);

    console.log(`[Oracle] 🔗 Zincire yazılıyor... Match: ${matchId}`);
    console.log(`[Oracle] 🏆 Kazanan: ${winner}`);
    console.log(`[Oracle] 💀 Kaybeden: ${loser}`);

    const tx = await oracle.recordMatchResult(matchId, winner, loser, {
      gasLimit: 200_000,
      gasPrice: ethers.parseUnits('30', 'gwei') // Fuji için yeterli gas fiyatı
    });
    console.log(`[Oracle] ⏳ TX gönderildi: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`[Oracle] ✅ On-chain kaydedildi! Blok #${receipt.blockNumber} | TX: ${tx.hash}`);
    console.log(`[Oracle] 🔎 https://testnet.snowtrace.io/tx/${tx.hash}`);

    return tx.hash as string;
  } catch (err: any) {
    // "already recorded" hatası kritik değil, tekrar kaydı önlüyoruz
    if (err?.message?.includes('Match already recorded')) {
      console.warn(`[Oracle] ⚠️  Bu maç zaten zincirde kayıtlı: ${matchId}`);
      return null;
    }
    console.error('[Oracle] ❌ On-chain kayıt hatası:', err?.message || err);
    return null; // Blockchain hatası maç akışını durdurmasın
  }
}
