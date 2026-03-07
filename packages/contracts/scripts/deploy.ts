import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function deployArenaOracle(wallet: ethers.Wallet) {
  console.log("🚀 ArenaOracle v2 (with Combat Log Hash) Fuji'ye deploy ediliyor...");

  const artifactPath = path.join(__dirname, "../artifacts/contracts/ArenaOracle.sol/ArenaOracle.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const oracle = await factory.deploy();

  console.log("⏳ ArenaOracle için onay bekleniyor...");
  await oracle.waitForDeployment();

  const address = await oracle.getAddress();

  console.log("\n✅ ArenaOracle v2 başarıyla deploy edildi!");
  console.log("🛡️  ArenaOracle Adresi:", address);
  console.log(`\n👉 apps/backend/.env.local dosyasında güncelleyin:\nORACLE_CONTRACT_ADDRESS=${address}`);
  console.log(`🔗 Snowtrace: https://testnet.snowtrace.io/address/${address}\n`);

  return address;
}

async function deployLootChest(wallet: ethers.Wallet) {
  console.log("🎲 LootChest (Chainlink VRF, legacy per-match) Fuji'ye deploy ediliyor...");

  const vrfCoordinator = process.env.VRF_COORDINATOR_ADDRESS;
  const vrfSubId = process.env.VRF_SUBSCRIPTION_ID;
  const vrfKeyHash = process.env.VRF_KEY_HASH;

  if (!vrfCoordinator || !vrfSubId || !vrfKeyHash) {
    console.warn(
      "⚠️  VRF env değişkenleri eksik. LootChest deploy'u atlanıyor.\n" +
        "Gerekli değişkenler: VRF_COORDINATOR_ADDRESS, VRF_SUBSCRIPTION_ID, VRF_KEY_HASH"
    );
    return null;
  }

  const callbackGasLimit = Number(process.env.VRF_CALLBACK_GAS_LIMIT || "250000");
  const requestConfirmations = Number(process.env.VRF_REQUEST_CONFIRMATIONS || "3");
  const numWords = Number(process.env.VRF_NUM_WORDS || "1");

  const artifactPath = path.join(__dirname, "../artifacts/contracts/LootChest.sol/LootChest.json");
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

  console.log("⏳ LootChest için onay bekleniyor...");
  await loot.waitForDeployment();

  const address = await loot.getAddress();

  console.log("\n✅ LootChest başarıyla deploy edildi!");
  console.log("🎁 LootChest Adresi:", address);
  console.log(
    `\n👉 apps/backend/.env.local dosyasında güncelleyin:\nLOOT_CHEST_CONTRACT_ADDRESS=${address}\n` +
      "Ayrıca VRF subscription'ınızı Chainlink panelinden bu kontratı consumer olarak eklemeyi unutmayın."
  );
  console.log(`🔗 Snowtrace: https://testnet.snowtrace.io/address/${address}\n`);

  return address;
}

async function deployRankUpLootNFT(wallet: ethers.Wallet) {
  console.log("🎁 RankUpLootNFT (ERC-1155 + Chainlink VRF) Fuji'ye deploy ediliyor...");

  const vrfCoordinator = process.env.VRF_COORDINATOR_ADDRESS;
  const vrfSubId = process.env.VRF_SUBSCRIPTION_ID;
  const vrfKeyHash = process.env.VRF_KEY_HASH;
  const baseURI = process.env.RANK_UP_LOOT_BASE_URI || "https://example.com/assets/items/metadata/";

  if (!vrfCoordinator || !vrfSubId || !vrfKeyHash) {
    console.warn(
      "⚠️  VRF env değişkenleri eksik. RankUpLootNFT deploy'u atlanıyor.\n" +
        "Gerekli: VRF_COORDINATOR_ADDRESS, VRF_SUBSCRIPTION_ID, VRF_KEY_HASH"
    );
    return null;
  }

  const callbackGasLimit = Number(process.env.VRF_CALLBACK_GAS_LIMIT || "250000");
  const requestConfirmations = Number(process.env.VRF_REQUEST_CONFIRMATIONS || "3");
  const numWords = Number(process.env.VRF_NUM_WORDS || "1");

  const artifactPath = path.join(__dirname, "../artifacts/contracts/RankUpLootNFT.sol/RankUpLootNFT.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const nft = await factory.deploy(
    baseURI,
    vrfCoordinator,
    BigInt(vrfSubId),
    vrfKeyHash,
    callbackGasLimit,
    requestConfirmations,
    numWords
  );

  console.log("⏳ RankUpLootNFT için onay bekleniyor...");
  await nft.waitForDeployment();

  const address = await nft.getAddress();

  console.log("\n✅ RankUpLootNFT başarıyla deploy edildi!");
  console.log("🎁 RankUpLootNFT Adresi:", address);
  console.log(
    `\n👉 Backend .env: RANK_UP_LOOT_NFT_ADDRESS=${address}` +
      `\n👉 Frontend build env: VITE_RANK_UP_LOOT_NFT_ADDRESS=${address}` +
      "\n👉 Chainlink panel: Add this contract as consumer to your VRF subscription."
  );
  console.log(`🔗 Snowtrace: https://testnet.snowtrace.io/address/${address}\n`);

  return address;
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY bulunamadı!");

  const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("📦 Deployer:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Bakiye:", ethers.formatEther(balance), "AVAX\n");

  await deployArenaOracle(wallet);
  await deployLootChest(wallet);
  await deployRankUpLootNFT(wallet);
}

main().catch((error) => {
  console.error("❌ Deploy hatası:", error.message);
  process.exitCode = 1;
});