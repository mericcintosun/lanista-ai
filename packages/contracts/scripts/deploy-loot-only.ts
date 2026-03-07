import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function deployLootChest(wallet: ethers.Wallet) {
  console.log("🎲 Deploying LootChest (Chainlink VRF v2.5 + Claim Logic) to Fuji...");

  const vrfCoordinator = process.env.VRF_COORDINATOR_ADDRESS;
  const vrfSubId = process.env.VRF_SUBSCRIPTION_ID;
  const vrfKeyHash = process.env.VRF_KEY_HASH;

  if (!vrfCoordinator || !vrfSubId || !vrfKeyHash) {
    console.warn(
      "⚠️  VRF env variables missing. Skipping LootChest deploy.\n" +
        "Required: VRF_COORDINATOR_ADDRESS, VRF_SUBSCRIPTION_ID, VRF_KEY_HASH"
    );
    return null;
  }

  const callbackGasLimit = Number(process.env.VRF_CALLBACK_GAS_LIMIT || "1000000");
  const requestConfirmations = Number(process.env.VRF_REQUEST_CONFIRMATIONS || "3");
  const numWords = Number(process.env.VRF_NUM_WORDS || "1");

  // ES Module dirname fix
  const artifactPath = path.resolve("artifacts/contracts/LootChest.sol/LootChest.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const loot = await factory.deploy(
    vrfCoordinator,
    BigInt(vrfSubId),
    vrfKeyHash,
    callbackGasLimit,
    requestConfirmations,
    numWords
  );

  console.log("⏳ Waiting for LootChest confirmation...");
  await loot.waitForDeployment();

  const address = await loot.getAddress();

  console.log("\n✅ LootChest v2 deployed successfully!");
  console.log("🎁 LootChest Address:", address);
  console.log(
    `\n👉 Update in apps/backend/.env.local:\nLOOT_CHEST_CONTRACT_ADDRESS=${address}\n` +
      "Also add this contract as consumer to your VRF subscription in Chainlink panel."
  );
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

  await deployLootChest(wallet);
}

main().catch((error) => {
  console.error("❌ Deploy error:", error.message);
  process.exitCode = 1;
});
