import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const FUJI_AVAX_USD_FEED = "0x5498BB86BC934c8D34FDA08E81D444153d0D06aD";

function loadArtifact(contractName: string) {
  const p = path.join(
    __dirname,
    `../artifacts/contracts/${contractName}.sol/${contractName}.json`
  );
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function deployArenaOracle(wallet: ethers.Wallet) {
  console.log("\n--- ArenaOracle ---");
  const artifact = loadArtifact("ArenaOracle");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("ArenaOracle:", address);
  console.log("Snowtrace: https://testnet.snowtrace.io/address/" + address);
  return address;
}

async function deployPassport(wallet: ethers.Wallet) {
  console.log("\n--- LanistaAgentPassport ---");
  const artifact = loadArtifact("LanistaAgentPassport");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("LanistaAgentPassport:", address);
  console.log("Snowtrace: https://testnet.snowtrace.io/address/" + address);
  return address;
}

async function deployRankUpLootNFT(wallet: ethers.Wallet) {
  console.log("\n--- RankUpLootNFT ---");

  const vrfCoordinator = process.env.VRF_COORDINATOR_ADDRESS;
  const vrfSubId = process.env.VRF_SUBSCRIPTION_ID;
  const vrfKeyHash = process.env.VRF_KEY_HASH;

  if (!vrfCoordinator || !vrfSubId || !vrfKeyHash) {
    console.warn(
      "VRF env variables missing. Skipping RankUpLootNFT deploy.\n" +
        "Required: VRF_COORDINATOR_ADDRESS, VRF_SUBSCRIPTION_ID, VRF_KEY_HASH"
    );
    return null;
  }

  const callbackGasLimit = Number(process.env.VRF_CALLBACK_GAS_LIMIT || "250000");
  const requestConfirmations = Number(process.env.VRF_REQUEST_CONFIRMATIONS || "3");
  const numWords = Number(process.env.VRF_NUM_WORDS || "1");
  const baseURI = process.env.RANK_UP_LOOT_BASE_URI || "https://app.lanista.xyz/assets/items/metadata/";

  const artifact = loadArtifact("RankUpLootNFT");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(
    baseURI,
    vrfCoordinator,
    BigInt(vrfSubId),
    vrfKeyHash,
    callbackGasLimit,
    requestConfirmations,
    numWords
  );
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("RankUpLootNFT:", address);
  console.log("Snowtrace: https://testnet.snowtrace.io/address/" + address);
  console.log("ACTION REQUIRED: Add this contract as consumer to your Chainlink VRF subscription.");
  return address;
}

async function deploySparkTreasury(wallet: ethers.Wallet) {
  console.log("\n--- SparkTreasury ---");

  const rewardPoolAddress = process.env.REWARD_POOL_ADDRESS;
  if (!rewardPoolAddress) {
    throw new Error(
      "REWARD_POOL_ADDRESS is not set.\n" +
      "This must be the backend relayer wallet. Refusing to default to deployer."
    );
  }

  const priceFeedAddress = process.env.AVAX_USD_PRICE_FEED_FUJI || FUJI_AVAX_USD_FEED;

  console.log("Price Feed (AVAX/USD):", priceFeedAddress);
  console.log("Reward Pool:", rewardPoolAddress);

  const artifact = loadArtifact("SparkTreasury");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(priceFeedAddress, rewardPoolAddress);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("SparkTreasury:", address);
  console.log("Snowtrace: https://testnet.snowtrace.io/address/" + address);
  return address;
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not set");

  const rpcUrl = process.env.AVALANCHE_RPC_URL || "https://avalanche-fuji-c-chain-rpc.publicnode.com";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("Deployer:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "AVAX");

  const oracleAddress     = await deployArenaOracle(wallet);
  const passportAddress   = await deployPassport(wallet);
  const rankUpAddress     = await deployRankUpLootNFT(wallet);
  const treasuryAddress   = await deploySparkTreasury(wallet);

  console.log("\n=================================================");
  console.log("DEPLOYMENT COMPLETE — paste these into your .env files:");
  console.log("=================================================");
  console.log(`ORACLE_CONTRACT_ADDRESS=${oracleAddress}`);
  console.log(`AGENT_PASSPORT_CONTRACT_ADDRESS=${passportAddress}`);
  if (rankUpAddress) {
    console.log(`RANK_UP_LOOT_NFT_ADDRESS=${rankUpAddress}`);
    console.log(`VITE_RANK_UP_LOOT_NFT_ADDRESS=${rankUpAddress}`);
  }
  if (treasuryAddress) {
    console.log(`SPARK_TREASURY_CONTRACT_ADDRESS=${treasuryAddress}`);
    console.log(`VITE_SPARK_TREASURY_CONTRACT_ADDRESS=${treasuryAddress}`);
  }
  console.log("=================================================");
}

main().catch((e) => {
  console.error("Deploy failed:", e.message);
  process.exitCode = 1;
});
