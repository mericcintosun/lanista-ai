import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

const rootEnv = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: rootEnv });
dotenv.config({ path: path.join(__dirname, "../.env") });

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}

async function main() {
  const privateKey =
    process.env.OWNER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      "OWNER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY not found (must be current contract owner)"
    );
  }

  const rpcUrl =
    process.env.AVALANCHE_RPC_URL ||
    "https://avalanche-fuji-c-chain-rpc.publicnode.com";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const contractAddress = requireEnv("RANK_UP_LOOT_NFT_ADDRESS");
  const newBaseUri =
    process.env.RANK_UP_LOOT_BASE_URI ||
    "https://lanista-ai-production.up.railway.app/assets/items/metadata/";

  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/RankUpLootNFT.sol/RankUpLootNFT.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const nft = new ethers.Contract(contractAddress, artifact.abi, wallet);

  console.log("RPC:", rpcUrl);
  console.log("Caller:", wallet.address);
  console.log("Contract:", contractAddress);
  console.log("New baseURI:", newBaseUri);

  try {
    const before = await nft.uri(1n);
    console.log("uri(1) before:", before);
  } catch {
    // ignore
  }

  const tx = await nft.setBaseURI(newBaseUri);
  console.log("Tx:", tx.hash);
  const receipt = await tx.wait();
  console.log("Mined in block:", receipt?.blockNumber);

  try {
    const after = await nft.uri(1n);
    console.log("uri(1) after:", after);
  } catch {
    // ignore
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
