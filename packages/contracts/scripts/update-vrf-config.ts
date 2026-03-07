import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function main() {
  const rankUpAddress = process.env.RANK_UP_LOOT_NFT_ADDRESS;
  const lootChestAddress = process.env.LOOT_CHEST_CONTRACT_ADDRESS;

  const contractAddress = rankUpAddress || lootChestAddress;
  const contractName = rankUpAddress ? "RankUpLootNFT" : "LootChest";

  const subId = process.env.VRF_SUBSCRIPTION_ID;
  const keyHash = process.env.VRF_KEY_HASH;

  const callbackGasLimit = Number(process.env.VRF_CALLBACK_GAS_LIMIT || "250000");
  const requestConfirmations = Number(process.env.VRF_REQUEST_CONFIRMATIONS || "3");
  const numWords = Number(process.env.VRF_NUM_WORDS || "1");

  if (!contractAddress) {
    throw new Error(
      "Set RANK_UP_LOOT_NFT_ADDRESS or LOOT_CHEST_CONTRACT_ADDRESS in .env"
    );
  }
  if (!subId || !keyHash) {
    throw new Error("VRF_SUBSCRIPTION_ID or VRF_KEY_HASH missing in .env");
  }

  console.log(`🛠️ Updating ${contractName} VRF config`);
  console.log("📍 Contract:", contractAddress);
  console.log("🔗 Sub ID:", subId);
  console.log("🔑 Key hash:", keyHash);

  const contract = await ethers.getContractAt(contractName, contractAddress);

  const tx = await contract.setVrfConfig(
    BigInt(subId),
    keyHash,
    callbackGasLimit,
    requestConfirmations,
    numWords
  );

  console.log("⏳ TX sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ Config updated in block:", receipt.blockNumber);
}

main().catch((error) => {
  console.error("❌ update-vrf-config error:", error);
  process.exitCode = 1;
});

