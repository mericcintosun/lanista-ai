import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: rootEnv });
dotenv.config({ path: ".env" });

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not set");

  const rpcUrl = process.env.AVALANCHE_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("📦 Deployer:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "AVAX\n");

  console.log("LanistaAgentPassport (ERC-8004 SBT) deploying to Fuji...");

  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/LanistaAgentPassport.sol/LanistaAgentPassport.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const passport = await factory.deploy();

  await passport.waitForDeployment();
  const address = await passport.getAddress();

  console.log("\nLanistaAgentPassport deployed!");
  console.log("Address:", address);
  console.log("\nBackend .env: AGENT_PASSPORT_CONTRACT_ADDRESS=" + address);
  console.log("Snowtrace: https://testnet.snowtrace.io/address/" + address + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
