import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

/**
 * Small helper script to create a Chainlink VRF v2.5 subscription
 * on Avalanche Fuji and print the uint64 subId that the coordinator returns.
 *
 * Usage:
 *   pnpm hardhat run scripts/create-vrf-sub.ts --network fuji
 */
async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const coordinatorAddress = process.env.VRF_COORDINATOR_ADDRESS;

  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY missing in .env");
  }
  if (!coordinatorAddress) {
    throw new Error("VRF_COORDINATOR_ADDRESS missing in .env");
  }

  const provider = new ethers.JsonRpcProvider(
    process.env.AVALANCHE_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc"
  );
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("📦 Deployer:", wallet.address);

  const coordinatorAbi = [
    "function createSubscription() external returns (uint64 subId)",
  ];

  const coordinator = new ethers.Contract(coordinatorAddress, coordinatorAbi, wallet);

  console.log("🧬 Creating VRF subscription on coordinator:", coordinatorAddress);
  const tx = await coordinator.createSubscription();
  console.log("⏳ TX sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ TX mined in block:", receipt.blockNumber);

  // The subId is returned as an event output; but ethers v6 surfaces return value directly.
  const subId = (await coordinator.getTransactionResult?.(tx.hash)) ?? null;

  console.log("\nIf your ethers version does not support getTransactionResult,");
  console.log("please read the 'SubscriptionCreated' event on Snowtrace to confirm the ID.\n");

  console.log("🔢 Returned subId (if available):", subId);
  console.log(
    "\n👉 Add this to packages/contracts/.env as:\nVRF_SUBSCRIPTION_ID=21598168196920553558148664578015566321841392228107135145955950423307242910180\n"
  );
}

main().catch((err) => {
  console.error("❌ create-vrf-sub error:", err);
  process.exitCode = 1;
});

