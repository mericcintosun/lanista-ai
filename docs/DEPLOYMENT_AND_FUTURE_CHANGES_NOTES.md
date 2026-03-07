# Lanista AI — Deployment & Architecture Notes

## Summary (What's There at a Glance?)

- ✅ **Backend deployed to Railway** — Redis, Supabase, env vars configured
- ✅ **Frontend deployed to Railway** — as separate service
- ✅ **CORS error resolved** — `credentials: true` + wildcard origin incompatibility
- ✅ **API URLs made dynamic** — `VITE_API_URL` in frontend, `API_BASE` in scripts
- ✅ **API documentation created** — 17 endpoints + WebSocket + Supabase Realtime
- ✅ **Unity integration guide written** — postMessage + polling architecture
- ✅ **Worker concurrency limit** — configurable via `MATCH_WORKER_CONCURRENCY` env (default: 5)
- ✅ **Blockchain queue added** — on-chain operations run sequentially in separate BullMQ queue with concurrency=1 (no nonce collision)
- 📋 **Scaling plan** — horizontal scaling, auto-scaling

---

## 1. Deployment Architecture

```
┌─────────────────────────────────┐
│  Railway                        │
│                                 │
│  ┌──────────┐  ┌─────────────┐  │
│  │ Backend  │  │   Redis     │  │
│  │ (Express │──│  (BullMQ    │  │
│  │ + BullMQ)│  │   queues)   │  │
│  └──────────┘  └─────────────┘  │
│                                 │
│  ┌──────────────────┐           │
│  │ Frontend (Vite)  │           │
│  │ static with serve│           │
│  └──────────────────┘           │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Supabase (Cloud)               │
│  - matches, bots, combat_logs   │
│  - Realtime subscriptions       │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Avalanche (Fuji Testnet)       │
│  - Oracle contract              │
│  - Chainlink VRF Loot           │
└─────────────────────────────────┘
```

### Backend Service (Railway)
- **Root Directory**: `/` (monorepo — for `@lanista/types` workspace dependency)
- **Build Command**: `npm install`
- **Start Command**: `cd apps/backend && npx tsx index.ts`
- **Watch Paths**: `/apps/backend/**`

### Frontend Service (Railway)
- **Root Directory**: `apps/frontend`
- **Build Command**: `npm run build`
- **Start Command**: `npm run start` (→ `npx serve dist -s -l $PORT`)
- **Note**: `VITE_` variables are baked at build-time, not runtime

---

## 2. Environment Variables

### Backend (Railway Variables)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (write access) |
| `REDIS_URL` | Railway Redis service reference |
| `JWT_SECRET` | JWT signing key |
| `ENCRYPTION_KEY` | API key encryption |
| `ARENA_PRIVATE_KEY` | Arena contract private key |
| `ORACLE_CONTRACT_ADDRESS` | Oracle contract address |
| `DEPLOYER_PRIVATE_KEY` | Deployer wallet private key |
| `AVALANCHE_RPC_URL` | Avalanche Fuji RPC endpoint |
| `LOOT_CHEST_CONTRACT_ADDRESS` | Loot chest contract (legacy per-match) |
| `RANK_UP_LOOT_NFT_ADDRESS` | Rank-up ERC-1155 NFT contract (Chainlink VRF, mint on rank-up) |
| `CORS_ORIGIN` | Allowed origins (default: `*`) |
| `MATCH_WORKER_CONCURRENCY` | Max concurrent matches to process (default: 5) |
| `PORT` | Set by Railway — do not set manually |

### Frontend (Railway Variables)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend Railway URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_RANK_UP_LOOT_NFT_ADDRESS` | Rank-up NFT contract address (Inventory + Snowtrace link) |

### Local Scripts (root `.env`)

| Variable | Description |
|---|---|
| `API_BASE` | `http://localhost:3001` (local) or Railway URL (live test) |

---

## 3. Code Changes Made

### Frontend: Central API URL Configuration
- **New file**: `apps/frontend/src/lib/api.ts` — reads from `VITE_API_URL` env var, fallback to `localhost:3001`
- **6 files updated**: Hardcoded `localhost:3001` → `API_URL` import
  - `useCombatRealtime.ts`, `Hub.tsx`, `Landing.tsx`, `Oracle.tsx`, `HallOfFame.tsx`, `Layout.tsx`

### Backend: Production Readiness
- **`package.json`**: `"start": "npx tsx index.ts"` added
- **`index.ts`**: Server bound to `0.0.0.0` (required for containers)
- **`index.ts`**: CORS read from `CORS_ORIGIN` env var
- **`nixpacks.toml`**: Railway build config (Node 20)
- **`.dockerignore`**: Exclude node_modules/.env

### Scripts: Dynamic API URL
- `spawn-dummy.ts`, `spawn-dummy-requeue.ts`, `test-endpoints.ts`: `API_BASE` now read from `.env`
- `dotenv/config` import added

---

## 4. CORS Issue and Solution

### Problem
Frontend (Railway domain A) → Backend (Railway domain B) requests were blocked by browser:
```
Cross-Origin Request Blocked: CORS header 'Access-Control-Allow-Origin' missing
```

### Cause
```typescript
// WRONG — credentials: true with origin: '*' does NOT work
app.use(cors({
  origin: '*',
  credentials: true  // ← Browser rejects this with wildcard
}));
```

### Solution
```typescript
// CORRECT — credentials removed as not needed
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
```

### Why credentials not needed?
Lanista API uses Bearer token auth (`Authorization: Bearer <key>`), not cookies. Bearer tokens work without `credentials: true`.

---

## 5. Worker Concurrency & Blockchain Queue (RESOLVED ✅)

### Problem
- Matches pair but wait on "Neural uplink synchronizing..." message
- Max 5 matches at once (default) → increased to `MATCH_WORKER_CONCURRENCY=20`
- Higher concurrency caused blockchain tx's from same deployer wallet to be sent concurrently → **nonce collision**

### Solution: Separate Blockchain Queue
`blockchain-worker.ts` created — all on-chain operations run sequentially with concurrency=1:

```
Match ends → match-worker freed (immediately moves to new match)
          → job added to blockchain-queue
          → blockchain-worker processes in order (Oracle + Loot)
          → tx_hash written to Supabase → frontend updates
```

**Configuration:**
- `blockchain-worker.ts`: concurrency=1, lockDuration=120s, 3 retries (exponential backoff)
- `match-worker.ts`: adds job via `blockchainQueue.add()`, does not await
- `index.ts`: blockchain worker import added

**Result:**
- ✅ Nonce collision fully resolved
- ✅ Match worker freed immediately → new matches start right away
- ✅ BullMQ retry handles blockchain errors automatically
- ✅ Frontend verify status updates in background (Supabase Realtime)

---

## 6. Unity WebGL Integration

### Architecture
React (`/arena/:matchId`) → iframe (Unity WebGL) → Backend API

### Data Flow
1. React sends `matchId` + `apiUrl` to Unity via `postMessage`
2. Unity polls `GET /api/combat/status?matchId=<ID>` every 1-2 seconds
3. For each new combat log, plays 3D animation based on `action_type`
4. When `match.status === "finished"` shows victory screen

### Action Types → Animations
| action_type | Effect | Animation |
|---|---|---|
| `ATTACK` | Normal damage | Sword/punch |
| `HEAVY_ATTACK` | 1.5x damage, next turn vulnerable | Heavy attack |
| `DEFEND` | Block + light counter | Shield |
| `HEAL` | 10% of max HP | Heal effect |
| `CRITICAL` | Final blow | Death animation |

### Detailed guide: `docs/GAME_DEVELOPER_INTEGRATION.md`

---

## 7. Scaling Roadmap

| Phase | When | What to do |
|---|---|---|
| ~~**Now**~~ | ✅ Done | `MATCH_WORKER_CONCURRENCY=20` + blockchain queue |
| **Medium term** | 100+ concurrent matches | Separate worker from API (dedicated service) |
| **Long term** | 500+ concurrent matches | Horizontal scaling (multiple worker replicas) |
| **Scale** | 1000+ | Auto-scaling + monitoring dashboard |

---

## 8. File References

| File | Description |
|---|---|
| `docs/API.md` | Documentation for all 17 endpoints |
| `docs/GAME_DEVELOPER_INTEGRATION.md` | Unity integration guide (English) |
| `apps/frontend/src/lib/api.ts` | Frontend API URL central config |
| `apps/backend/nixpacks.toml` | Railway build config |
| `apps/backend/index.ts` | CORS, 0.0.0.0 binding, all endpoints |
| `apps/backend/src/engine/match-worker.ts` | Match processing, concurrency, job addition to blockchain queue |
| `apps/backend/src/engine/blockchain-worker.ts` | On-chain operations (Oracle + rank-up loot NFT), concurrency=1 |
| `docs/supabase_rank_up_loot_requests.sql` | Table to run in Supabase: rank_up_loot_requests |
| `apps/backend/src/engine/matchmaker.ts` | Redis Lua atomic matchmaking |
| `.env` | Root env — `API_BASE` for scripts |
