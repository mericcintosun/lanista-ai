import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 ArenaOracle Avalanche Fuji Testnet'e deploy ediliyor...");

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY bulunamadı! .env dosyasını kontrol edin.");
  }

  // Fuji RPC'ye doğrudan bağlan
  const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("📦 Deployer Adresi:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Bakiye:", ethers.formatEther(balance), "AVAX");

  if (balance === 0n) {
    throw new Error("Yetersiz bakiye! Fuji faucet'ten AVAX alın: https://faucet.avax.network");
  }

  // ABI ve Bytecode'u artifacts'tan oku
  const artifactPath = path.join(__dirname, "../artifacts/contracts/ArenaOracle.sol/ArenaOracle.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const oracle = await factory.deploy();

  console.log("⏳ Onay bekleniyor...");
  await oracle.waitForDeployment();

  const address = await oracle.getAddress();

  console.log("\n✅ ArenaOracle başarıyla deploy edildi!");
  console.log("🛡️  Sözleşme Adresi:", address);
  console.log(`\n👉 apps/backend/.env.local dosyasına ekleyin:\nORACLE_CONTRACT_ADDRESS=${address}`);
  console.log(`\n🔗 Snowtrace'de görüntüle: https://testnet.snowtrace.io/address/${address}`);
}

main().catch((error) => {
  console.error("❌ Deploy hatası:", error.message);
  process.exitCode = 1;
});