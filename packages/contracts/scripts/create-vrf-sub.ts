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

  // Parse SubscriptionCreated event (VRF v2.5 uses uint256 for subId)
  const iface = new ethers.Interface([
    "event SubscriptionCreated(uint256 indexed subId, address indexed owner)",
  ]);
  let subId: string | null = null;
  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed?.name === "SubscriptionCreated") {
        subId = String(parsed.args.subId);
        break;
      }
    } catch {
      /* skip non-matching logs */
    }
  }

  if (subId) {
    console.log("🔢 Subscription ID:", subId);
    console.log("\n👉 Add to packages/contracts/.env:\nVRF_SUBSCRIPTION_ID=" + subId + "\n");
  } else {
    console.log(
      "\n⚠️  Could not parse SubscriptionCreated event. Check Snowtrace for the event and copy the subId:\n" +
        `   https://testnet.snowtrace.io/tx/${tx.hash}\n` +
        "   Subscription IDs are typically small numbers (e.g. 1, 2, 3). Do NOT use placeholder values.\n"
    );
  }
}

main().catch((err) => {
  console.error("❌ create-vrf-sub error:", err);
  process.exitCode = 1;
});

