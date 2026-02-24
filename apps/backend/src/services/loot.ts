import { ethers } from 'ethers';

const LOOT_ABI = [
  'function requestLoot(string matchId, address winner) external returns (uint256)',
  'function getLoot(string matchId) external view returns (bool fulfilled, address winner, uint256 itemId, uint256 randomness, uint256 timestamp, uint256 requestId)'
];

function getLootContract() {
  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const contractAddress = process.env.LOOT_CHEST_CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    console.warn('[Loot] ⚠️ Env değişkenleri eksik, loot entegrasyonu pasif.');
    return null;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, LOOT_ABI, wallet);
}

export async function requestLootForWinner(matchId: string, winnerWallet: string) {
  const contract = getLootContract();
  if (!contract) return null;

  if (!winnerWallet || !ethers.isAddress(winnerWallet)) {
    console.warn(`[Loot] ⚠️ Geçersiz winner address: ${winnerWallet}`);
    return null;
  }

  try {
    console.log(`[Loot] 🎲 Loot isteği gönderiliyor. Match=${matchId}, winner=${winnerWallet}`);
    // Bazı Fuji RPC node'ları subscription / consumer durumunda geriden gelebiliyor.
    // estimateGas sırasında InvalidConsumer revert'i almamak için manuel gasLimit veriyoruz.
    const tx = await contract.requestLoot(matchId, winnerWallet, {
      gasLimit: 500_000
    });
    console.log(`[Loot] ⏳ TX gönderildi: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`[Loot] ✅ Loot isteği on-chain kaydedildi. Blok #${receipt.blockNumber}`);
    return tx.hash as string;
  } catch (err: any) {
    console.error('[Loot] ❌ Loot isteği hatası:', err?.message || err);
    return null;
  }
}

export async function getLootForMatch(matchId: string) {
  const contract = getLootContract();
  if (!contract) return null;

  try {
    const [fulfilled, winner, itemId, randomness, timestamp, requestId] = await contract.getLoot(matchId);
    return {
      fulfilled: Boolean(fulfilled),
      winner: String(winner),
      itemId: Number(itemId),
      randomness: String(randomness),
      timestamp: Number(timestamp),
      requestId: String(requestId)
    };
  } catch (err: any) {
    console.error('[Loot] ❌ Loot sorgu hatası:', err?.message || err);
    return null;
  }
}

