/**
 * RankUpLootNFT constructor arguments.
 * Loads from env: VRF_COORDINATOR_ADDRESS, VRF_SUBSCRIPTION_ID, VRF_KEY_HASH,
 * VRF_CALLBACK_GAS_LIMIT, VRF_REQUEST_CONFIRMATIONS, VRF_NUM_WORDS.
 * Set in packages/contracts/.env (see .env.example)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const coordinator = process.env.VRF_COORDINATOR_ADDRESS;
const subscriptionId = process.env.VRF_SUBSCRIPTION_ID;
const keyHash = process.env.VRF_KEY_HASH;

if (!coordinator || !subscriptionId || !keyHash) {
  throw new Error(
    'VRF env required. Set in .env: VRF_COORDINATOR_ADDRESS, VRF_SUBSCRIPTION_ID, VRF_KEY_HASH'
  );
}

module.exports = [
  coordinator,
  subscriptionId,
  keyHash,
  Number(process.env.VRF_CALLBACK_GAS_LIMIT || '250000'),
  Number(process.env.VRF_REQUEST_CONFIRMATIONS || '3'),
  Number(process.env.VRF_NUM_WORDS || '1'),
];

