import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: rootEnv });
dotenv.config({ path: path.join(__dirname, "../.env") });

/** Chainlink AVAX/USD Price Feed on Avalanche Fuji testnet */
const FUJI_AVAX_USD_FEED = "0x5498BB86BC934c8D34FDA08E81D444153d0D06aD";

/**
 * SparkTreasury deploy – Avalanche Fuji.
 * Uses Fuji AVAX/USD feed (see FUJI_AVAX_USD_FEED). Override via .env AVAX_USD_PRICE_FEED_FUJI.
 */
async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not set");

  const rpcUrl = process.env.AVALANCHE_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const priceFeedAddress = process.env.AVAX_USD_PRICE_FEED_FUJI || FUJI_AVAX_USD_FEED;

  // rewardPool = backend relayer wallet (holds 10% of each purchase for bot rewards).
  // Defaults to deployer address if not set separately.
  const rewardPoolAddress = process.env.REWARD_POOL_ADDRESS || wallet.address;

  console.log("📦 Deployer:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "AVAX");
  console.log("📊 Price Feed (AVAX/USD):", priceFeedAddress);
  console.log("🏦 Reward Pool:", rewardPoolAddress, "\n");

  console.log("SparkTreasury deploying to Fuji...");

  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/SparkTreasury.sol/SparkTreasury.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const treasury = await factory.deploy(priceFeedAddress, rewardPoolAddress);

  await treasury.waitForDeployment();
  const address = await treasury.getAddress();

  console.log("\nSparkTreasury deployed!");
  console.log("Address:", address);
  console.log("\nBackend .env: SPARK_TREASURY_CONTRACT_ADDRESS=" + address);
  console.log("Snowtrace: https://testnet.snowtrace.io/address/" + address + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
