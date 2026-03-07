# How to deploy RankUpLootNFT (Avalanche Fuji)

## 1. Prepare `.env` file

Create `.env` in `packages/contracts/` (or edit existing). Not root `.env`; the script reads `packages/contracts/.env`.

```bash
cd packages/contracts
cp .env.example .env
# Edit .env
```

**Required fields:**

| Variable | Description | Where to get |
|----------|-------------|--------------|
| `DEPLOYER_PRIVATE_KEY` | Wallet private key (without 0x) | MetaMask export / env |
| `AVALANCHE_RPC_URL` | Fuji RPC | Default: `https://api.avax-test.network/ext/bc/C/rpc` |
| `VRF_COORDINATOR_ADDRESS` | Chainlink VRF Coordinator (Fuji) | [Chainlink Fuji VRF](https://docs.chain.link/vrf/v2-5/supported-networks#avalanche-fuji-testnet) |
| `VRF_SUBSCRIPTION_ID` | VRF subscription ID | Create subscription in Chainlink dashboard |
| `VRF_KEY_HASH` | VRF key hash (Fuji) | Same document |
| `RANK_UP_LOOT_BASE_URI` | Metadata base URL (trailing `/`) | E.g. `https://yourdomain.com/assets/items/metadata/` |

**Optional (defaults are sufficient):**

- `VRF_CALLBACK_GAS_LIMIT` (default: 250000)
- `VRF_REQUEST_CONFIRMATIONS` (default: 3)
- `VRF_NUM_WORDS` (default: 1)

VRF addresses and key hash for Fuji testnet:  
https://docs.chain.link/vrf/v2-5/supported-networks#avalanche-fuji-testnet

---

## 2. Create VRF subscription if needed

Chainlink VRF requires a subscription and LINK.

1. [vrf.chain.link](https://vrf.chain.link/) → Select Avalanche Fuji.
2. "Create subscription" → Create subscription on Fuji.
3. Fund subscription with **LINK** (Fuji testnet LINK; available from [faucets.chain.link/fuji](https://faucets.chain.link/fuji)).
4. Copy subscription ID → set as `VRF_SUBSCRIPTION_ID` in `.env`.
5. **Keep LINK balance topped up** — if the subscription runs out of LINK, VRF requests will fail.

**Alternative (programmatic):** Run `npx tsx scripts/create-vrf-sub.ts` from `packages/contracts` to create a subscription on-chain. The script parses the `SubscriptionCreated` event and prints the correct subId (do not use placeholder values).

---

## 3. Run deploy command

**To deploy only RankUpLootNFT (recommended):**

```bash
cd packages/contracts
pnpm exec hardhat compile
npx ts-node --esm scripts/deploy-rank-up-only.ts
```

If `ts-node` gives ESM error:

```bash
npx tsx scripts/deploy-rank-up-only.ts
```

(If `tsx` is not in project root: `npm i -D tsx` or `pnpm add -D tsx`.)

**To deploy all contracts (ArenaOracle + LootChest + RankUpLootNFT):**

```bash
cd packages/contracts
npx tsx scripts/deploy.ts
```

(Note: `deploy.ts` does not use Hardhat, connects directly to RPC via ethers. Working directory must be `packages/contracts` so `.env` is found.)

---

## 4. After deploy

1. **Contract address** is printed in terminal. Copy it.
2. **Backend:** `RANK_UP_LOOT_NFT_ADDRESS=<address>` (root or `apps/backend/.env`).
3. **Frontend (build):** `VITE_RANK_UP_LOOT_NFT_ADDRESS=<address>` (Railway/Vercel env or `.env.production`).
4. **Chainlink:** Add this contract address as **consumer** to the subscription in [vrf.chain.link](https://vrf.chain.link/) → Subscription → Add Consumer. Without this, VRF requests will be rejected.

---

## 5. Changing Base URI later

If metadata URL will change (e.g. domain changed):

- Call `setBaseURI(newUrl)` with the wallet that deployed the contract (owner).
- Do this via Snowtrace "Write Contract" or a small script.

---

## 6. Updating VRF config (subscription ID, key hash)

If you need to change VRF parameters (e.g. new subscription, different key hash):

```bash
cd packages/contracts
# Set RANK_UP_LOOT_NFT_ADDRESS in .env, then:
npx hardhat run scripts/update-vrf-config.ts --network fuji
```

---

## 7. Backfill: Missing rank-up loot (no NFT in Silver)

The blockchain job needs `winnerRep`/`loserRep` to run when a match ends. These were buggy for a while, so **during that period** VRF was never requested for bots that ranked up; Silver (or other rank) may show but no NFT in inventory.

**Solution:** Open missing rank-up requests with a one-time backfill:

```bash
cd apps/backend
# First dry-run to see who will receive requests
DRY_RUN=1 npm run backfill-rank-up-loot

# Actual run (requestRankUpLoot on chain + insert into rank_up_loot_requests)
npm run backfill-rank-up-loot
```

Required env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AVALANCHE_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `RANK_UP_LOOT_NFT_ADDRESS`. VRF fulfillment is async; backend RankUpLootPoller (~30s) updates `matches.winner_loot_item_id` and inventory when it sees fulfillment.

---

## Quick checklist

- [ ] `packages/contracts/.env` filled (DEPLOYER_PRIVATE_KEY, VRF_*, RANK_UP_LOOT_BASE_URI)
- [ ] Deployer wallet has AVAX on Fuji (for gas)
- [ ] VRF subscription created, LINK funded (monitor balance at vrf.chain.link)
- [ ] `npx tsx scripts/deploy-rank-up-only.ts` run
- [ ] Backend and frontend env have address set
- [ ] Contract added as consumer in Chainlink
