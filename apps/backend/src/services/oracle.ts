import { ethers } from 'ethers';

// ArenaOracle v2 ABI — includes combatLogHash parameter
const ORACLE_ABI = [
  "function recordMatchResult(string matchId, address winner, address loser, bytes32 combatLogHash) external",
  "function getMatchRecord(string matchId) external view returns (address winner, address loser, bytes32 combatLogHash, uint256 timestamp)",
  "event MatchRecorded(string indexed matchId, address indexed winner, address indexed loser, bytes32 combatLogHash, uint256 timestamp)"
];

import stableStringify from 'fast-json-stable-stringify';

/**
 * Computes the keccak256 hash of combat logs.
 * Uses fast-json-stable-stringify on the Node.js side to produce
 * a deterministic, key-order-independent hash.
 */
export function computeCombatLogHash(logs: object[]): string {
  const canonical = stableStringify(logs);
  return ethers.keccak256(ethers.toUtf8Bytes(canonical));
}

/**
 * Writes the match result and combat log hash to the ArenaOracle v2
 * contract on Avalanche C-Chain (Fuji).
 *
 * @param matchId       Match UUID from Supabase
 * @param winner        Winner agent's wallet address
 * @param loser         Loser agent's wallet address
 * @param combatLogHash keccak256(combat_logs JSON) — integrity proof
 * @returns             TX hash or null (on error/missing config)
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
    console.warn('[Oracle] ⚠️  Env variables missing, skipping on-chain recording.');
    return null;
  }

  if (!winner || !loser || !ethers.isAddress(winner) || !ethers.isAddress(loser)) {
    console.warn(`[Oracle] ⚠️  Invalid addresses: winner=${winner}, loser=${loser}. Skipping.`);
    return null;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const oracle = new ethers.Contract(contractAddress, ORACLE_ABI, wallet);

    console.log(`[Oracle] 🔗 Writing to chain (Relayer)... Match: ${matchId}`);
    console.log(`[Oracle] 🏆 Winner: ${winner}`);
    console.log(`[Oracle] 💀 Loser: ${loser}`);
    console.log(`[Oracle] 📋 Combat Log Hash: ${combatLogHash}`);

    // Dynamic gas fees (EIP-1559 support for Fuji/Avalanche)
    const feeData = await provider.getFeeData();

    const tx = await oracle.recordMatchResult(matchId, winner, loser, combatLogHash, {
      gasLimit: 300_000,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
    });
    console.log(`[Oracle] ⏳ TX sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`[Oracle] ✅ Recorded on-chain! Block #${receipt.blockNumber} | TX: ${tx.hash}`);
    console.log(`[Oracle] 🔎 https://testnet.snowtrace.io/tx/${tx.hash}`);

    return tx.hash as string;
  } catch (err: any) {
    if (err?.message?.includes('Match already recorded')) {
      console.warn(`[Oracle] ⚠️  This match is already recorded on-chain: ${matchId}`);
      return null;
    }
    console.error('[Oracle] ❌ On-chain recording error:', err?.message || err);
    return null;
  }
}
