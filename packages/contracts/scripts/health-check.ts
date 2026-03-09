/**
 * health-check.ts
 *
 * End-to-end on-chain verification for all Lanista contracts deployed on Fuji.
 * Checks: SparkTreasury · ArenaOracle · LanistaAgentPassport · RankUpLootNFT
 *
 * Usage:  npx tsx scripts/health-check.ts
 */

import { ethers } from "ethers";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// ─── Addresses ───────────────────────────────────────────────────────────────

const ADDRESSES = {
  sparkTreasury:  process.env.SPARK_TREASURY_CONTRACT_ADDRESS  || "",
  oracle:         process.env.ORACLE_CONTRACT_ADDRESS          || "",
  passport:       process.env.AGENT_PASSPORT_CONTRACT_ADDRESS  || "",
  rankUpLoot:     process.env.RANK_UP_LOOT_NFT_ADDRESS         || "",
  rewardPool:     process.env.REWARD_POOL_ADDRESS              || "",
  priceFeed:      "0x5498BB86BC934c8D34FDA08E81D444153d0D06aD",
  vrfCoordinator: process.env.VRF_COORDINATOR_ADDRESS          || "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE",
};

// ─── ABIs (minimal read-only) ─────────────────────────────────────────────────

const SPARK_TREASURY_ABI = [
  "function owner() view returns (address)",
  "function rewardPool() view returns (address)",
  "function rewardSharePct() view returns (uint256)",
  "function packageCount() view returns (uint256)",
  "function packages(uint256) view returns (uint256 sparkAmount, uint256 priceUsd8)",
  "function priceFeed() view returns (address)",
];

const PRICE_FEED_ABI = [
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
];

const ORACLE_ABI = [
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function getRoleAdmin(bytes32 role) view returns (bytes32)",
];

const PASSPORT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function nextTokenId() view returns (uint256)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
];

const RANK_UP_ABI = [
  "function totalRanks() view returns (uint8)",
  "function subscriptionId() view returns (uint256)",
  "function keyHash() view returns (bytes32)",
  "function callbackGasLimit() view returns (uint32)",
  "function requestConfirmations() view returns (uint16)",
  "function numWords() view returns (uint32)",
  "function pendingCount() view returns (uint256)",
];

const VRF_COORDINATOR_ABI = [
  "function getSubscription(uint256 subId) view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] consumers)",
];

// ─── Reporter ────────────────────────────────────────────────────────────────

const PASS  = "  PASS";
const FAIL  = "  FAIL";
const WARN  = "  WARN";
const INFO  = "  INFO";

let totalPass = 0;
let totalFail = 0;
let totalWarn = 0;

function pass(label: string, detail = "") {
  totalPass++;
  console.log(`${PASS}  ${label}${detail ? "  →  " + detail : ""}`);
}
function fail(label: string, detail = "") {
  totalFail++;
  console.log(`${FAIL}  ${label}${detail ? "  →  " + detail : ""}`);
}
function warn(label: string, detail = "") {
  totalWarn++;
  console.log(`${WARN}  ${label}${detail ? "  →  " + detail : ""}`);
}
function info(label: string, detail = "") {
  console.log(`${INFO}  ${label}${detail ? "  →  " + detail : ""}`);
}

function section(title: string) {
  console.log(`\n${"─".repeat(56)}`);
  console.log(` ${title}`);
  console.log("─".repeat(56));
}

// ─── Checks ──────────────────────────────────────────────────────────────────

async function checkEnv() {
  section("ENV VARIABLES");
  const required: Record<string, string> = {
    SPARK_TREASURY_CONTRACT_ADDRESS:  ADDRESSES.sparkTreasury,
    ORACLE_CONTRACT_ADDRESS:          ADDRESSES.oracle,
    AGENT_PASSPORT_CONTRACT_ADDRESS:  ADDRESSES.passport,
    RANK_UP_LOOT_NFT_ADDRESS:         ADDRESSES.rankUpLoot,
    REWARD_POOL_ADDRESS:              ADDRESSES.rewardPool,
    DEPLOYER_PRIVATE_KEY:             process.env.DEPLOYER_PRIVATE_KEY || "",
    VRF_SUBSCRIPTION_ID:              process.env.VRF_SUBSCRIPTION_ID  || "",
  };

  for (const [key, val] of Object.entries(required)) {
    if (!val) {
      fail(key, "NOT SET");
    } else if (val.startsWith("0x") && val.length !== 42 && key.endsWith("_ADDRESS")) {
      fail(key, `Bad address length: ${val}`);
    } else {
      pass(key, val.length > 20 ? val.slice(0, 10) + "…" + val.slice(-6) : val);
    }
  }
}

async function checkNetwork(provider: ethers.JsonRpcProvider) {
  section("NETWORK");
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  if (chainId === 43113) {
    pass("Fuji testnet", `chainId=${chainId}`);
  } else {
    fail("Wrong network", `chainId=${chainId}, expected 43113 (Fuji)`);
  }

  const block = await provider.getBlockNumber();
  pass("RPC responsive", `latest block #${block}`);

  const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
  const balance = await provider.getBalance(deployer.address);
  const avax = parseFloat(ethers.formatEther(balance));
  const label = `Deployer balance: ${avax.toFixed(4)} AVAX`;
  if (avax < 0.05) warn(label, "Low — may not be able to send transactions");
  else pass(label);
}

async function checkSparkTreasury(provider: ethers.JsonRpcProvider) {
  section("SPARK TREASURY  " + ADDRESSES.sparkTreasury);
  if (!ADDRESSES.sparkTreasury) { fail("Address not set"); return; }

  try {
    const c = new ethers.Contract(ADDRESSES.sparkTreasury, SPARK_TREASURY_ABI, provider);

    // Owner
    const owner = await c.owner();
    const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider).address;
    owner.toLowerCase() === deployer.toLowerCase()
      ? pass("owner() == deployer", owner)
      : warn("owner() != deployer", `owner=${owner}`);

    // rewardPool
    const pool = await c.rewardPool();
    pool.toLowerCase() === (ADDRESSES.rewardPool || "").toLowerCase()
      ? pass("rewardPool matches .env REWARD_POOL_ADDRESS", pool)
      : fail("rewardPool mismatch", `on-chain=${pool}  env=${ADDRESSES.rewardPool}`);

    // rewardSharePct
    const pct = Number(await c.rewardSharePct());
    pct >= 1 && pct <= 50
      ? pass(`rewardSharePct = ${pct}%`)
      : fail(`rewardSharePct = ${pct}%`, "must be 1–50");

    // priceFeed
    const feedAddr = await c.priceFeed();
    feedAddr.toLowerCase() === ADDRESSES.priceFeed.toLowerCase()
      ? pass("priceFeed = Fuji AVAX/USD Chainlink", feedAddr)
      : warn("priceFeed unexpected", feedAddr);

    // Price feed freshness
    try {
      const feed = new ethers.Contract(ADDRESSES.priceFeed, PRICE_FEED_ABI, provider);
      const { answer, updatedAt, roundId, answeredInRound } = await feed.latestRoundData();
      const ageSeconds = Math.floor(Date.now() / 1000) - Number(updatedAt);
      const price = Number(answer) / 1e8;

      if (Number(answer) <= 0) {
        fail("Price feed: non-positive answer", String(answer));
      } else if (ageSeconds > 3600) {
        fail(`Price feed STALE: ${ageSeconds}s old`, `$${price.toFixed(2)} AVAX/USD`);
      } else if (Number(answeredInRound) < Number(roundId)) {
        fail("Price feed: answeredInRound < roundId (incomplete round)");
      } else {
        pass(`Price feed: $${price.toFixed(2)} AVAX/USD`, `${ageSeconds}s ago — fresh`);
      }
    } catch (e) {
      fail("Price feed: latestRoundData() call failed", (e as Error).message);
    }

    // Packages
    const pkgCount = Number(await c.packageCount());
    info(`packageCount = ${pkgCount}`);
    for (let i = 1; i < pkgCount; i++) {
      const [sparkAmt, priceUsd8] = await c.packages(i);
      if (Number(sparkAmt) === 0) {
        warn(`Package #${i}: sparkAmount = 0 (invalid)`);
      } else {
        pass(`Package #${i}: ${sparkAmt.toString()} Sparks = $${(Number(priceUsd8) / 1e8).toFixed(2)}`);
      }
    }
  } catch (e) {
    fail("SparkTreasury unreachable", (e as Error).message);
  }
}

async function checkArenaOracle(provider: ethers.JsonRpcProvider) {
  section("ARENA ORACLE  " + ADDRESSES.oracle);
  if (!ADDRESSES.oracle) { fail("Address not set"); return; }

  try {
    const c = new ethers.Contract(ADDRESSES.oracle, ORACLE_ABI, provider);

    const ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

    const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider).address;
    const relayer  = ADDRESSES.rewardPool; // derived from ARENA_PRIVATE_KEY

    const deployerHasAdmin  = await c.hasRole(DEFAULT_ADMIN_ROLE, deployer);
    const deployerHasOracle = await c.hasRole(ORACLE_ROLE, deployer);
    const relayerHasOracle  = relayer ? await c.hasRole(ORACLE_ROLE, relayer) : false;

    deployerHasAdmin  ? pass("Deployer has DEFAULT_ADMIN_ROLE") : fail("Deployer missing DEFAULT_ADMIN_ROLE");
    deployerHasOracle ? pass("Deployer has ORACLE_ROLE") : warn("Deployer does not have ORACLE_ROLE");
    relayer
      ? relayerHasOracle
        ? pass("Relayer (ARENA wallet) has ORACLE_ROLE", relayer)
        : warn("Relayer does NOT have ORACLE_ROLE — backend cannot record matches", relayer)
      : warn("REWARD_POOL_ADDRESS not set, cannot check relayer role");

    // Code size — verify it's a real contract
    const code = await provider.getCode(ADDRESSES.oracle);
    code && code !== "0x"
      ? pass("Contract code present on Fuji")
      : fail("No bytecode at address — wrong address?");

  } catch (e) {
    fail("ArenaOracle unreachable", (e as Error).message);
  }
}

async function checkPassport(provider: ethers.JsonRpcProvider) {
  section("LANISTA AGENT PASSPORT  " + ADDRESSES.passport);
  if (!ADDRESSES.passport) { fail("Address not set"); return; }

  try {
    const c = new ethers.Contract(ADDRESSES.passport, PASSPORT_ABI, provider);

    const name   = await c.name();
    const symbol = await c.symbol();
    name === "Lanista Agent Passport" ? pass(`name() = "${name}"`)   : warn(`Unexpected name: "${name}"`);
    symbol === "LAP"                   ? pass(`symbol() = "${symbol}"`) : warn(`Unexpected symbol: "${symbol}"`);

    const nextId = Number(await c.nextTokenId());
    pass(`nextTokenId = ${nextId}`, nextId === 1 ? "(no passports minted yet)" : `${nextId - 1} passport(s) minted`);

    const ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

    const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider).address;
    const relayer  = ADDRESSES.rewardPool;

    const [dAdmin, dOracle, dMinter] = await Promise.all([
      c.hasRole(DEFAULT_ADMIN_ROLE, deployer),
      c.hasRole(ORACLE_ROLE, deployer),
      c.hasRole(MINTER_ROLE, deployer),
    ]);

    dAdmin  ? pass("Deployer has DEFAULT_ADMIN_ROLE") : fail("Deployer missing DEFAULT_ADMIN_ROLE");
    dOracle ? pass("Deployer has ORACLE_ROLE")        : warn("Deployer missing ORACLE_ROLE");
    dMinter ? pass("Deployer has MINTER_ROLE")        : fail("Deployer missing MINTER_ROLE");

    if (relayer) {
      const rOracle = await c.hasRole(ORACLE_ROLE, relayer);
      rOracle
        ? pass("Relayer has ORACLE_ROLE", relayer)
        : warn("Relayer does NOT have ORACLE_ROLE — backend cannot update reputation", relayer);
    }

  } catch (e) {
    fail("LanistaAgentPassport unreachable", (e as Error).message);
  }
}

async function checkRankUpLoot(provider: ethers.JsonRpcProvider) {
  section("RANK UP LOOT NFT  " + ADDRESSES.rankUpLoot);
  if (!ADDRESSES.rankUpLoot) { fail("Address not set"); return; }

  try {
    const c = new ethers.Contract(ADDRESSES.rankUpLoot, RANK_UP_ABI, provider);

    const [totalRanks, subId, keyHash, gasLimit, confirms, numWords, pendingCount] = await Promise.all([
      c.totalRanks(),
      c.subscriptionId(),
      c.keyHash(),
      c.callbackGasLimit(),
      c.requestConfirmations(),
      c.numWords(),
      c.pendingCount(),
    ]);

    Number(totalRanks) === 7  ? pass(`totalRanks = ${totalRanks}`) : warn(`totalRanks = ${totalRanks} (expected 7)`);
    Number(gasLimit) >= 100_000 ? pass(`callbackGasLimit = ${gasLimit}`) : fail(`callbackGasLimit = ${gasLimit} (too low)`);
    Number(confirms) >= 1 && Number(confirms) <= 200 ? pass(`requestConfirmations = ${confirms}`) : fail(`requestConfirmations = ${confirms} out of range`);
    Number(numWords) === 1 ? pass(`numWords = ${numWords}`) : warn(`numWords = ${numWords} (expected 1)`);
    Number(pendingCount) === 0 ? pass("pendingCount = 0 (no stuck requests)") : warn(`pendingCount = ${pendingCount} (unfulfilled VRF requests!)`);

    const envSubId = process.env.VRF_SUBSCRIPTION_ID || "";
    subId.toString() === envSubId
      ? pass("subscriptionId matches .env", subId.toString().slice(0, 16) + "…")
      : warn("subscriptionId mismatch", `on-chain=${subId.toString().slice(0,12)}… env=${envSubId.slice(0,12)}…`);

    // VRF Subscription: LINK balance + consumer check
    try {
      const coord = new ethers.Contract(ADDRESSES.vrfCoordinator, VRF_COORDINATOR_ABI, provider);
      const sub = await coord.getSubscription(subId);
      const linkBalance = Number(ethers.formatEther(sub.balance));
      const consumers: string[] = sub.consumers ?? sub[4];

      linkBalance > 0
        ? linkBalance >= 2
          ? pass(`VRF subscription LINK balance: ${linkBalance.toFixed(4)} LINK`)
          : warn(`VRF subscription LINK balance low: ${linkBalance.toFixed(4)} LINK (recommend ≥ 2)`)
        : fail("VRF subscription has NO LINK — rank-up rewards will fail");

      const isConsumer = consumers
        .map((a: string) => a.toLowerCase())
        .includes(ADDRESSES.rankUpLoot.toLowerCase());

      isConsumer
        ? pass("Contract is registered as VRF consumer")
        : fail("Contract NOT registered as VRF consumer", "Add it at vrf.chain.link/fuji");

      info(`Total consumers on subscription: ${consumers.length}`);
    } catch (e) {
      warn("Could not check VRF subscription state", (e as Error).message);
    }

  } catch (e) {
    fail("RankUpLootNFT unreachable", (e as Error).message);
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Lanista Contract Health Check  —  Avalanche Fuji");
  console.log("═══════════════════════════════════════════════════════");

  const provider = new ethers.JsonRpcProvider(
    process.env.AVALANCHE_RPC_URL || "https://avalanche-fuji-c-chain-rpc.publicnode.com"
  );

  await checkEnv();
  await checkNetwork(provider);
  await checkSparkTreasury(provider);
  await checkArenaOracle(provider);
  await checkPassport(provider);
  await checkRankUpLoot(provider);

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(
    `  Results:  ${totalPass} passed  ·  ${totalWarn} warnings  ·  ${totalFail} failed`
  );
  if (totalFail > 0) {
    console.log("  STATUS: UNHEALTHY — fix failures before going live");
  } else if (totalWarn > 0) {
    console.log("  STATUS: DEGRADED  — review warnings");
  } else {
    console.log("  STATUS: HEALTHY   — all checks passed");
  }
  console.log("═══════════════════════════════════════════════════════\n");

  if (totalFail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("Health check crashed:", e.message);
  process.exitCode = 1;
});
