import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function main() {
  const contractAddress =
    process.env.LOOT_CHEST_CONTRACT_ADDRESS || "0x2E078795472996d6FB090A630Dc63f09e3Bda0d1";
  const subId = process.env.VRF_SUBSCRIPTION_ID;
  const keyHash = process.env.VRF_KEY_HASH;

  const callbackGasLimit = Number(process.env.VRF_CALLBACK_GAS_LIMIT || "250000");
  const requestConfirmations = Number(process.env.VRF_REQUEST_CONFIRMATIONS || "3");
  const numWords = Number(process.env.VRF_NUM_WORDS || "1");

  if (!contractAddress) {
    throw new Error("LOOT_CHEST_CONTRACT_ADDRESS missing in .env");
  }
  if (!subId || !keyHash) {
    throw new Error("VRF_SUBSCRIPTION_ID or VRF_KEY_HASH missing in .env");
  }

  console.log("🛠️ Updating LootChest VRF config");
  console.log("📍 Contract:", contractAddress);
  console.log("🔗 Sub ID:", subId);
  console.log("🔑 Key hash:", keyHash);

  const lootChest = await ethers.getContractAt("LootChest", contractAddress);

  const tx = await lootChest.setVrfConfig(
    BigInt(subId),
    keyHash,
    1000000, // 1 Million (1,000,000) for safety
    3,
    1
  );

  console.log("⏳ TX sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ Config updated in block:", receipt.blockNumber);
}

main().catch((error) => {
  console.error("❌ update-vrf-config error:", error);
  process.exitCode = 1;
});

