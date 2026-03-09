/**
 * Verifies AGENT_PASSPORT_CONTRACT_ADDRESS and ORACLE_ROLE for the relayer.
 * Run: npx tsx scripts/check-passport-roles.ts
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { ethers } from 'ethers';

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dir, '..', '..', '..', '.env') });

const PASSPORT_ABI = [
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function ORACLE_ROLE() external view returns (bytes32)',
  'function getPassportByBotWallet(address) external view returns (uint256, address, uint256, uint32, uint32, string, uint256)',
];

const ORACLE_ABI = [
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function ORACLE_ROLE() external view returns (bytes32)',
];

async function main() {
  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const passportAddr = process.env.AGENT_PASSPORT_CONTRACT_ADDRESS;
  const oracleAddr = process.env.ORACLE_CONTRACT_ADDRESS;

  console.log('═══════════════════════════════════════════════════════');
  console.log('  Passport & Oracle Role Check');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!rpcUrl) {
    console.error('❌ AVALANCHE_RPC_URL not set');
    process.exit(1);
  }
  if (!privateKey) {
    console.error('❌ DEPLOYER_PRIVATE_KEY not set');
    process.exit(1);
  }

  const wallet = new ethers.Wallet(privateKey);
  const relayerAddress = wallet.address;
  console.log('📍 Relayer address (from DEPLOYER_PRIVATE_KEY):', relayerAddress);

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // --- Passport ---
  if (!passportAddr) {
    console.log('\n⚠️  AGENT_PASSPORT_CONTRACT_ADDRESS not set — skipping Passport check');
  } else {
    console.log('\n📜 Passport contract:', passportAddr);
    try {
      const passport = new ethers.Contract(passportAddr, PASSPORT_ABI, provider);
      const oracleRole = await passport.ORACLE_ROLE();
      const hasOracleRole = await passport.hasRole(oracleRole, relayerAddress);
      console.log('   ORACLE_ROLE (relayer):', hasOracleRole ? '✅ YES' : '❌ NO');
      if (!hasOracleRole) {
        console.log('   → Relayer cannot call updateReputation. Grant ORACLE_ROLE or redeploy with this wallet.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('   ❌ Error:', msg);
      console.log('   → Contract may not exist at this address or RPC unreachable.');
    }
  }

  // --- Oracle ---
  if (!oracleAddr) {
    console.log('\n⚠️  ORACLE_CONTRACT_ADDRESS not set — skipping Oracle check');
  } else {
    console.log('\n📜 Oracle contract:', oracleAddr);
    try {
      const oracle = new ethers.Contract(oracleAddr, ORACLE_ABI, provider);
      const oracleRole = await oracle.ORACLE_ROLE();
      const hasOracleRole = await oracle.hasRole(oracleRole, relayerAddress);
      console.log('   ORACLE_ROLE (relayer):', hasOracleRole ? '✅ YES' : '❌ NO');
      if (!hasOracleRole) {
        console.log('   → Relayer cannot call recordMatchResult. Grant ORACLE_ROLE or redeploy with this wallet.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('   ❌ Error:', msg);
      console.log('   → Contract may not exist at this address or RPC unreachable.');
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
}

main().catch(console.error);
