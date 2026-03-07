import { ethers } from 'ethers';

const RANK_UP_LOOT_ABI = [
  'function requestRankUpLoot(address botWallet, uint8 rankIndex) external returns (uint256 requestId)',
  'function getRankUpLootResult(uint256 requestId) external view returns (address botWallet, uint8 rankIndex, uint256 itemId, bool fulfilled)',
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
  'event RankUpLootRequested(uint256 indexed requestId, address indexed botWallet, uint8 rankIndex)',
];

const TOTAL_TOKEN_IDS = 35;

function getRankUpLootContract() {
  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const contractAddress = process.env.RANK_UP_LOOT_NFT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    console.warn('[RankUpLoot] Env missing (AVALANCHE_RPC_URL, DEPLOYER_PRIVATE_KEY, RANK_UP_LOOT_NFT_ADDRESS).');
    return null;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, RANK_UP_LOOT_ABI, wallet);
}

/**
 * Request rank-up loot NFT via Chainlink VRF. Only call when bot has actually ranked up.
 * Returns the VRF requestId so it can be stored and polled for fulfillment.
 */
export async function requestRankUpLoot(
  botWallet: string,
  rankIndex: number
): Promise<{ requestId: string } | null> {
  const contract = getRankUpLootContract();
  if (!contract) return null;

  if (!botWallet || !ethers.isAddress(botWallet)) {
    console.warn('[RankUpLoot] Invalid bot wallet:', botWallet);
    return null;
  }

  if (rankIndex < 0 || rankIndex > 6) {
    console.warn('[RankUpLoot] Invalid rank index (0-6):', rankIndex);
    return null;
  }

  try {
    console.log(`[RankUpLoot] Requesting VRF. wallet=${botWallet}, rankIndex=${rankIndex}`);
    const tx = await contract.requestRankUpLoot(botWallet, rankIndex, { gasLimit: 500_000 });
    const receipt = await tx.wait();

    const iface = new ethers.Interface(RANK_UP_LOOT_ABI);
    const event = receipt?.logs?.find((log: { topics: string[] }) =>
      log.topics[0] === iface.getEvent('RankUpLootRequested')?.topicHash
    );
    if (!event) {
      console.warn('[RankUpLoot] RankUpLootRequested event not found in receipt');
      return null;
    }

    const parsed = iface.parseLog({ topics: event.topics as string[], data: event.data });
    const requestId = parsed?.args?.requestId != null ? String(parsed.args.requestId) : null;
    if (!requestId) return null;

    console.log(`[RankUpLoot] TX ${tx.hash} requestId=${requestId}`);
    return { requestId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[RankUpLoot] requestRankUpLoot error:', msg);
    return null;
  }
}

/**
 * Get fulfillment result for a rank-up loot request.
 */
export async function getRankUpLootResult(requestId: string): Promise<{
  botWallet: string;
  rankIndex: number;
  itemId: number;
  fulfilled: boolean;
} | null> {
  const contract = getRankUpLootContract();
  if (!contract) return null;

  try {
    const [botWallet, rankIndex, itemId, fulfilled] = await contract.getRankUpLootResult(requestId);
    return {
      botWallet: String(botWallet),
      rankIndex: Number(rankIndex),
      itemId: Number(itemId),
      fulfilled: Boolean(fulfilled),
    };
  } catch (err: unknown) {
    console.error('[RankUpLoot] getRankUpLootResult error:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Get ERC-1155 balances for a wallet for all 35 token IDs (1..35).
 */
export async function getInventoryBalances(wallet: string): Promise<{ tokenId: number; balance: number }[]> {
  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const contractAddress = process.env.RANK_UP_LOOT_NFT_ADDRESS;
  if (!rpcUrl || !contractAddress) {
    if (!contractAddress) console.warn('[RankUpLoot] getInventoryBalances: RANK_UP_LOOT_NFT_ADDRESS not set');
    if (!rpcUrl) console.warn('[RankUpLoot] getInventoryBalances: AVALANCHE_RPC_URL not set');
    return [];
  }

  if (!wallet || !ethers.isAddress(wallet)) return [];

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, RANK_UP_LOOT_ABI, provider);

  const results: { tokenId: number; balance: number }[] = [];
  for (let id = 1; id <= TOTAL_TOKEN_IDS; id++) {
    try {
      const balance = await contract.balanceOf(wallet, id);
      const b = Number(balance);
      if (b > 0) results.push({ tokenId: id, balance: b });
    } catch {
      // skip failed id
    }
  }
  return results;
}
