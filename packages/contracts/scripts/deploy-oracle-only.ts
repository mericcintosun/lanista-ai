import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function deployArenaOracle(wallet: ethers.Wallet) {
  console.log("🚀 Deploying ArenaOracle v2 (with Combat Log Hash & Gas Optimization) to Fuji...");

  const artifactPath = path.join(__dirname, "../artifacts/contracts/ArenaOracle.sol/ArenaOracle.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const oracle = await factory.deploy();

  console.log("⏳ Waiting for ArenaOracle confirmation...");
  await oracle.waitForDeployment();

  const address = await oracle.getAddress();

  console.log("\n✅ ArenaOracle v2 deployed successfully!");
  console.log("🛡️  ArenaOracle Address:", address);
  console.log(`\n👉 Update in apps/backend/.env.local:\nORACLE_CONTRACT_ADDRESS=${address}`);
  console.log(`🔗 Snowtrace: https://testnet.snowtrace.io/address/${address}\n`);

  return address;
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not found!");

  const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("📦 Deployer:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "AVAX\n");

  await deployArenaOracle(wallet);
}

main().catch((error) => {
  console.error("❌ Deploy error:", error.message);
  process.exitCode = 1;
});
