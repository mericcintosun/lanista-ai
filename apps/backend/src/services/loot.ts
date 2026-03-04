import { ethers } from 'ethers';

const LOOT_ABI = [
  'function requestLoot(string matchId, address winner) external returns (uint256)',
  'function getLoot(string matchId) external view returns (bool fulfilled, bool claimed, address winner, uint256 itemId, uint256 randomness, uint256 timestamp, uint256 requestId)'
];

function getLootContract() {
  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const contractAddress = process.env.LOOT_CHEST_CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    console.warn('[Loot] ⚠️ Env variables missing, loot integration disabled.');
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
    console.warn(`[Loot] ⚠️ Invalid winner address: ${winnerWallet}`);
    return null;
  }

  try {
    console.log(`[Loot] 🎲 Sending loot request. Match=${matchId}, winner=${winnerWallet}`);
    // Some Fuji RPC nodes can lag behind on subscription/consumer state.
    // We set manual gasLimit to avoid InvalidConsumer reverts during estimateGas.
    const tx = await contract.requestLoot(matchId, winnerWallet, {
      gasLimit: 500_000
    });
    console.log(`[Loot] ⏳ TX sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`[Loot] ✅ Loot request recorded on-chain. Block #${receipt.blockNumber}`);
    return tx.hash as string;
  } catch (err: any) {
    console.error('[Loot] ❌ Loot request error:', err?.message || err);
    return null;
  }
}

export async function getLootForMatch(matchId: string) {
  const contract = getLootContract();
  if (!contract) return null;

  try {
    const [fulfilled, claimed, winner, itemId, randomness, timestamp, requestId] = await contract.getLoot(matchId);
    return {
      fulfilled: Boolean(fulfilled),
      claimed: Boolean(claimed),
      winner: String(winner),
      itemId: Number(itemId),
      randomness: String(randomness),
      timestamp: Number(timestamp),
      requestId: String(requestId)
    };
  } catch (err: any) {
    console.error('[Loot] ❌ Loot query error:', err?.message || err);
    return null;
  }
}

