import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY bulunamadı! packages/contracts/.env içinde set et.");

  const provider = new ethers.JsonRpcProvider(
    process.env.AVALANCHE_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc"
  );
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("📦 Deployer:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Bakiye:", ethers.formatEther(balance), "AVAX\n");

  const vrfCoordinator = process.env.VRF_COORDINATOR_ADDRESS;
  const vrfSubId = process.env.VRF_SUBSCRIPTION_ID;
  const vrfKeyHash = process.env.VRF_KEY_HASH;
  const baseURI = process.env.RANK_UP_LOOT_BASE_URI || "https://example.com/assets/items/metadata/";

  if (!vrfCoordinator || !vrfSubId || !vrfKeyHash) {
    throw new Error(
      "VRF env eksik. .env içinde set et: VRF_COORDINATOR_ADDRESS, VRF_SUBSCRIPTION_ID, VRF_KEY_HASH"
    );
  }

  const callbackGasLimit = Number(process.env.VRF_CALLBACK_GAS_LIMIT || "250000");
  const requestConfirmations = Number(process.env.VRF_REQUEST_CONFIRMATIONS || "3");
  const numWords = Number(process.env.VRF_NUM_WORDS || "1");

  const artifactPath = path.join(__dirname, "../artifacts/contracts/RankUpLootNFT.sol/RankUpLootNFT.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  console.log("🎁 RankUpLootNFT (ERC-1155 + VRF) Fuji'ye deploy ediliyor...");
  console.log("   baseURI:", baseURI);

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

  await nft.waitForDeployment();
  const address = await nft.getAddress();

  console.log("\n✅ RankUpLootNFT deploy edildi!");
  console.log("   Adres:", address);
  console.log("\n👉 Backend .env:  RANK_UP_LOOT_NFT_ADDRESS=" + address);
  console.log("👉 Frontend env: VITE_RANK_UP_LOOT_NFT_ADDRESS=" + address);
  console.log("👉 Chainlink VRF: Bu adresi subscription'a consumer ekle, LINK yükle.");
  console.log("🔗 https://testnet.snowtrace.io/address/" + address + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
