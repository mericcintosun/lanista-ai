import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module env loading
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { recordMatchOnChain, computeCombatLogHash } from './services/oracle.js';

async function testOracle() {
  console.log("🧪 ArenaOracle v2 Integration Test Starting...");
  console.log("📍 Contract:", process.env.ORACLE_CONTRACT_ADDRESS);

  const mockMatchId = "test-match-" + Math.floor(Math.random() * 1000000);
  const winnerAddress = "0xDCfcDac6846Fe80f9ed11A9b93d551af8AFcf8aa"; // DUMMY Winner
  const loserAddress = "0x8672037a232667C732d983AE15cB693D5839f2A2"; // DUMMY Loser

  const mockLogs = [
    { round: 1, action: "ATTACK", damage: 25 },
    { round: 2, action: "DEFEND", block: 10 }
  ];

  const logHash = computeCombatLogHash(mockLogs);

  console.log(`📡 Submitted MatchID: ${mockMatchId}`);
  console.log(`📋 Generated Log Hash: ${logHash}`);

  try {
    const txHash = await recordMatchOnChain(mockMatchId, winnerAddress, loserAddress, logHash);

    if (txHash) {
      console.log("\n✅ TEST PASSED!");
      console.log(`🔗 Transaction Link: https://testnet.snowtrace.io/tx/${txHash}`);
    } else {
      console.log("\n❌ TEST FAILED! recordMatchOnChain returned null.");
    }
  } catch (err: any) {
    console.error("\n❌ TEST ERROR:", err.message);
  }
}

testOracle();
