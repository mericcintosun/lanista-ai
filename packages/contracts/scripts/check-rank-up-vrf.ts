/**
 * Reads RankUpLootNFT VRF config from chain so you can verify it matches your
 * Chainlink subscription (vrf.chain.link → Fuji).
 *
 * Run from repo root: npx tsx packages/contracts/scripts/check-rank-up-vrf.ts
 * Uses .env: AVALANCHE_RPC_URL, RANK_UP_LOOT_NFT_ADDRESS
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dir, '../../../.env');
dotenv.config({ path: rootEnv });

const ABI = [
  'function subscriptionId() view returns (uint256)',
  'function keyHash() view returns (bytes32)',
  'function callbackGasLimit() view returns (uint32)',
  'function requestConfirmations() view returns (uint16)',
  'function numWords() view returns (uint32)',
];

async function main() {
  const rpc = process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
  const address = process.env.RANK_UP_LOOT_NFT_ADDRESS;

  if (!address) {
    console.error('RANK_UP_LOOT_NFT_ADDRESS not set in .env');
    process.exitCode = 1;
    return;
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const contract = new ethers.Contract(address, ABI, provider);

  const [subId, keyHash, callbackGas, confirmations, numWords] = await Promise.all([
    contract.subscriptionId(),
    contract.keyHash(),
    contract.callbackGasLimit(),
    contract.requestConfirmations(),
    contract.numWords(),
  ]);

  console.log('\n--- RankUpLootNFT VRF config (on-chain) ---');
  console.log('Contract:', address);
  console.log('Subscription ID:', subId.toString());
  console.log('Key hash:     ', keyHash);
  console.log('Callback gas: ', callbackGas.toString());
  console.log('Confirmations:', confirmations.toString());
  console.log('Num words:    ', numWords.toString());
  console.log('\nCheck:');
  console.log('1. Go to https://vrf.chain.link/fuji');
  console.log('2. Find the subscription with ID =', subId.toString());
  console.log('3. Under Consumers, ensure this contract is listed:', address);
  console.log('4. Fund the subscription (LINK or native) if balance is 0.');
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
