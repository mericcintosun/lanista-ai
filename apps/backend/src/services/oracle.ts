import { ethers } from 'ethers';

// ArenaOracle v2 ABI — combatLogHash parametresi eklendi
const ORACLE_ABI = [
  "function recordMatchResult(string matchId, address winner, address loser, bytes32 combatLogHash) external",
  "function getMatchRecord(string matchId) external view returns (address winner, address loser, bytes32 combatLogHash, uint256 timestamp)",
  "event MatchRecorded(string indexed matchId, address indexed winner, address indexed loser, bytes32 combatLogHash, uint256 timestamp)"
];

/**
 * Combat log'larının keccak256 hash'ini hesaplar.
 * Log'lar Supabase'de saklanır, hash Avalanche'a yazılır — tamper-proof integrity.
 */
export function computeCombatLogHash(logs: object[]): string {
  const canonical = JSON.stringify(logs, Object.keys(logs[0] || {}).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(canonical));
}

/**
 * Maç sonucunu ve combat log hash'ini Avalanche C-Chain (Fuji) üzerindeki
 * ArenaOracle v2 sözleşmesine yazar.
 *
 * @param matchId       Supabase'deki maç UUID'si
 * @param winner        Kazanan ajanın cüzdan adresi
 * @param loser         Kaybeden ajanın cüzdan adresi
 * @param combatLogHash keccak256(combat_logs JSON) — integrity proof
 * @returns             TX hash veya null (hata/eksik config durumunda)
 */
export async function recordMatchOnChain(
  matchId: string,
  winner: string,
  loser: string,
  combatLogHash: string = ethers.ZeroHash
): Promise<string | null> {
  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const contractAddress = process.env.ORACLE_CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    console.warn('[Oracle] ⚠️  Env değişkenleri eksik, on-chain kayıt atlandı.');
    return null;
  }

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
    console.log(`[Oracle] 📋 Combat Log Hash: ${combatLogHash}`);

    const tx = await oracle.recordMatchResult(matchId, winner, loser, combatLogHash, {
      gasLimit: 250_000,
      gasPrice: ethers.parseUnits('30', 'gwei')
    });
    console.log(`[Oracle] ⏳ TX gönderildi: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`[Oracle] ✅ On-chain kaydedildi! Blok #${receipt.blockNumber} | TX: ${tx.hash}`);
    console.log(`[Oracle] 🔎 https://testnet.snowtrace.io/tx/${tx.hash}`);

    return tx.hash as string;
  } catch (err: any) {
    if (err?.message?.includes('Match already recorded')) {
      console.warn(`[Oracle] ⚠️  Bu maç zaten zincirde kayıtlı: ${matchId}`);
      return null;
    }
    console.error('[Oracle] ❌ On-chain kayıt hatası:', err?.message || err);
    return null;
  }
}
