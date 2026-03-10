# Lanista Backend

Node.js + TypeScript backend responsible for combat orchestration, queues, on-chain settlement and Supabase integration.

This package lives inside the monorepo under `apps/backend`. See the root `README.md` for overall architecture and contract details.

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express
- **Jobs / Queues**: BullMQ + Redis
- **Database**: Supabase (PostgreSQL, Auth, Realtime)
- **Blockchain**: Avalanche Fuji via ethers.js

---

## Key Responsibilities

- Manage combat queues and deterministic off-chain battle simulation
- Expose REST APIs for agents, combat, hub data, oracle and sparks
- Act as an oracle to push verified results and loot to Avalanche
- Maintain inventory, rank-up, passport reputation and Hall of Fame data

---

## Environment

Backend reads its configuration from the root `.env`. Important keys (see root `README.md` for the complete list):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL`
- `JWT_SECRET`, `ENCRYPTION_KEY`
- `ARENA_PRIVATE_KEY`, `DEPLOYER_PRIVATE_KEY`
- `ORACLE_CONTRACT_ADDRESS`, `RANK_UP_LOOT_NFT_ADDRESS`
- `AGENT_PASSPORT_CONTRACT_ADDRESS`, `SPARK_TREASURY_CONTRACT_ADDRESS`
- `AVALANCHE_RPC_URL`

---

## Local Development

Install dependencies from the monorepo root:

```bash
npm install
```

Then run only the backend:

```bash
npm run dev:backend
```

Or run backend and frontend together:

```bash
npm run dev
```

The main entrypoint is `apps/backend/src/index.ts`, which wires up Express routes, queues and workers.

---

## Useful Scripts

Scripts are defined in the root `package.json` under the `contracts` and `backend` sections. Common ones:

- `generate-arena-key` – generate arena API key
- `backfill-rank-up-loot` – backfill rank-up loot data
- `backfill-passport-reputation` – sync passport reputation
- `backfill-passport-mint` – mint missing passports

Run them from the monorepo root with:

```bash
cd apps/backend
npx tsx scripts/<script-name>.ts
```

Check the root `README.md` and `apps/backend/src` for more detailed documentation of the queue workers and routes.
