import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const ABI = [
  'function setPackage(uint256 packageId, uint256 sparkAmount, uint256 priceUsd8) external',
  'function packages(uint256) view returns (uint256 sparkAmount, uint256 priceUsd8)',
];

const PACKAGES = [
  { id: 2, sparks: 5_000,  priceUsd: 22 },  // Challenger  — $4.40/1k
  { id: 3, sparks: 12_000, priceUsd: 45 },  // Commander   — $3.75/1k  ⭐ BEST VALUE
  { id: 4, sparks: 25_000, priceUsd: 80 },  // Elite       — $3.20/1k
];

async function main() {
  const rpcUrl = process.env.AVALANCHE_RPC_URL!;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY!;
  const contractAddress = process.env.SPARK_TREASURY_CONTRACT_ADDRESS!;

  if (!rpcUrl || !privateKey || !contractAddress) {
    throw new Error('AVALANCHE_RPC_URL, DEPLOYER_PRIVATE_KEY and SPARK_TREASURY_CONTRACT_ADDRESS must be set');
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, ABI, wallet);

  console.log(`📦 Adding packages to SparkTreasury at ${contractAddress}\n`);

  for (const pkg of PACKAGES) {
    const priceUsd8 = BigInt(pkg.priceUsd) * 10n ** 8n;
    console.log(`Setting package ${pkg.id}: ${pkg.sparks.toLocaleString()} Sparks = $${pkg.priceUsd}...`);
    const tx = await contract.setPackage(pkg.id, pkg.sparks, priceUsd8);
    await tx.wait();
    console.log(`  ✅ tx ${tx.hash}`);
  }

  console.log('\nAll packages set. Verifying...');
  for (const pkg of PACKAGES) {
    const [sparkAmount, priceUsd8] = await contract.packages(pkg.id);
    console.log(`  Package ${pkg.id}: ${sparkAmount.toString()} Sparks = $${(Number(priceUsd8) / 1e8).toFixed(2)}`);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
