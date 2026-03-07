# Lanista AI — Deployment & Architecture Notes

## Özet (İlk Bakışta Ne Var?)

- ✅ **Backend Railway'e deploy edildi** — Redis, Supabase, env vars ayarlandı
- ✅ **Frontend Railway'e deploy edildi** — ayrı servis olarak
- ✅ **CORS hatası çözüldü** — `credentials: true` + wildcard origin uyumsuzluğu
- ✅ **API URL'leri dinamik yapıldı** — frontend'de `VITE_API_URL`, script'lerde `API_BASE`
- ✅ **API dokümantasyonu oluşturuldu** — 17 endpoint + WebSocket + Supabase Realtime
- ✅ **Unity entegrasyon rehberi yazıldı** — postMessage + polling mimarisi
- ✅ **Worker concurrency limiti** — `MATCH_WORKER_CONCURRENCY` env ile ayarlanabilir (varsayılan: 5)
- ✅ **Blockchain queue eklendi** — on-chain işlemler ayrı BullMQ queue'da concurrency=1 ile sıralı çalışıyor (nonce çakışması yok)
- 📋 **Ölçeklendirme planı** — horizontal scaling, auto-scaling

---

## 1. Deployment Mimarisi

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
│  │ serve ile static │           │
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

### Backend Servisi (Railway)
- **Root Directory**: `/` (monorepo — `@lanista/types` workspace dependency'si için)
- **Build Command**: `npm install`
- **Start Command**: `cd apps/backend && npx tsx index.ts`
- **Watch Paths**: `/apps/backend/**`

### Frontend Servisi (Railway)
- **Root Directory**: `apps/frontend`
- **Build Command**: `npm run build`
- **Start Command**: `npm run start` (→ `npx serve dist -s -l $PORT`)
- **Not**: `VITE_` değişkenleri build-time'da bake edilir, runtime'da değil

---

## 2. Environment Variables

### Backend (Railway Variables)

| Değişken | Açıklama |
|---|---|
| `SUPABASE_URL` | Supabase proje URL'i |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (yazma izni) |
| `REDIS_URL` | Railway Redis servisi referansı |
| `JWT_SECRET` | JWT imzalama anahtarı |
| `ENCRYPTION_KEY` | API key şifreleme |
| `ARENA_PRIVATE_KEY` | Arena contract private key |
| `ORACLE_CONTRACT_ADDRESS` | Oracle contract adresi |
| `DEPLOYER_PRIVATE_KEY` | Deployer wallet private key |
| `AVALANCHE_RPC_URL` | Avalanche Fuji RPC endpoint |
| `LOOT_CHEST_CONTRACT_ADDRESS` | Loot chest contract (legacy per-match) |
| `RANK_UP_LOOT_NFT_ADDRESS` | Rank-up ERC-1155 NFT contract (Chainlink VRF, mint on rank-up) |
| `CORS_ORIGIN` | İzin verilen origin'ler (varsayılan: `*`) |
| `MATCH_WORKER_CONCURRENCY` | Aynı anda işlenecek max maç sayısı (varsayılan: 5) |
| `PORT` | Railway otomatik atar — elle ayarlama |

### Frontend (Railway Variables)

| Değişken | Açıklama |
|---|---|
| `VITE_API_URL` | Backend Railway URL'i |
| `VITE_SUPABASE_URL` | Supabase proje URL'i |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_RANK_UP_LOOT_NFT_ADDRESS` | Rank-up NFT contract address (Inventory + Snowtrace link) |

### Local Scripts (root `.env`)

| Değişken | Açıklama |
|---|---|
| `API_BASE` | `http://localhost:3001` (local) veya Railway URL (live test) |

---

## 3. Yapılan Kod Değişiklikleri

### Frontend: API URL Merkezi Konfigürasyon
- **Yeni dosya**: `apps/frontend/src/lib/api.ts` — `VITE_API_URL` env var'ından okur, yoksa `localhost:3001`'e fallback
- **6 dosya güncellendi**: Hardcoded `localhost:3001` → `API_URL` import
  - `useCombatRealtime.ts`, `Hub.tsx`, `Landing.tsx`, `Oracle.tsx`, `HallOfFame.tsx`, `Layout.tsx`

### Backend: Production Hazırlık
- **`package.json`**: `"start": "npx tsx index.ts"` eklendi
- **`index.ts`**: Server `0.0.0.0`'a bind edildi (container'lar için zorunlu)
- **`index.ts`**: CORS `CORS_ORIGIN` env var'ından okunuyor
- **`nixpacks.toml`**: Railway build config (Node 20)
- **`.dockerignore`**: node_modules/.env hariç tutma

### Script'ler: Dinamik API URL
- `spawn-dummy.ts`, `spawn-dummy-requeue.ts`, `test-endpoints.ts`: `API_BASE` artık `.env`'den okunuyor
- `dotenv/config` import eklendi

---

## 4. CORS Sorunu ve Çözümü

### Problem
Frontend (Railway domain A) → Backend (Railway domain B) istekleri browser tarafından bloklanıyordu:
```
Cross-Origin Request Blocked: CORS header 'Access-Control-Allow-Origin' missing
```

### Sebep
```typescript
// YANLIŞ — credentials: true ile origin: '*' birlikte ÇALIŞMAZ
app.use(cors({
  origin: '*',
  credentials: true  // ← Browser bunu wildcard ile reddeder
}));
```

### Çözüm
```typescript
// DOĞRU — credentials gerekmediği için kaldırıldı
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
```

### Neden credentials gerekmiyor?
Lanista API'si Bearer token auth kullanıyor (`Authorization: Bearer <key>`), cookie kullanmıyor. Bearer token'lar `credentials: true` olmadan da çalışır.

---

## 5. Worker Concurrency & Blockchain Queue (ÇÖZÜLDÜ ✅)

### Problem
- Maçlar eşleşiyor ama "Neural uplink synchronizing..." mesajında bekliyor
- Aynı anda max 5 maç (varsayılan) → `MATCH_WORKER_CONCURRENCY=20` ile artırıldı
- Concurrency artınca blockchain tx'leri aynı deployer wallet'tan eş zamanlı gönderiliyordu → **nonce çakışması**

### Çözüm: Ayrı Blockchain Queue
`blockchain-worker.ts` oluşturuldu — concurrency=1 ile tüm on-chain işlemler sıralı çalışıyor:

```
Maç biter → match-worker serbest kalır (hemen yeni maça geçer)
          → blockchain-queue'ya job eklenir
          → blockchain-worker sırayla işler (Oracle + Loot)
          → tx_hash Supabase'e yazılır → frontend güncellenir
```

**Yapılandırma:**
- `blockchain-worker.ts`: concurrency=1, lockDuration=120s, 3 retry (exponential backoff)
- `match-worker.ts`: `blockchainQueue.add()` ile job ekler, await etmez
- `index.ts`: blockchain worker import'u eklendi

**Sonuç:**
- ✅ Nonce çakışması tamamen çözüldü
- ✅ Match worker hemen serbest kalıyor → yeni maçlar anında başlıyor
- ✅ BullMQ retry mekanizması ile blockchain hataları otomatik tekrarlanıyor
- ✅ Frontend verify durumu arka planda güncelleniyor (Supabase Realtime)

---

## 6. Unity WebGL Entegrasyonu

### Mimari
React (`/arena/:matchId`) → iframe (Unity WebGL) → Backend API

### Veri Akışı
1. React, `postMessage` ile Unity'ye `matchId` + `apiUrl` gönderir
2. Unity `GET /api/combat/status?matchId=<ID>` endpoint'ini her 1-2 saniyede çeker
3. Her yeni combat log için `action_type`'a göre 3D animasyon oynatır
4. `match.status === "finished"` olunca zafer ekranı gösterir

### Action Tipleri → Animasyonlar
| action_type | Efekt | Animasyon |
|---|---|---|
| `ATTACK` | Normal hasar | Kılıç/yumruk |
| `HEAVY_ATTACK` | 1.5x hasar, sonraki tur savunmasız | Güçlü atak |
| `DEFEND` | Blok + hafif counter | Kalkan |
| `HEAL` | Max HP'nin %10'u | İyileşme efekti |
| `CRITICAL` | Son vuruş | Ölüm animasyonu |

### Detaylı rehber: `docs/GAME_DEVELOPER_INTEGRATION.md`

---

## 7. Ölçeklendirme Yol Haritası

| Aşama | Ne Zaman | Ne Yapılacak |
|---|---|---|
| ~~**Şimdi**~~ | ✅ Tamamlandı | `MATCH_WORKER_CONCURRENCY=20` + blockchain queue |
| **Orta vade** | 100+ eş zamanlı maç | Worker'ı API'den ayır (ayrı servis) |
| **Uzun vade** | 500+ eş zamanlı maç | Horizontal scaling (birden fazla worker replica) |
| **Ölçek** | 1000+ | Auto-scaling + monitoring dashboard |

---

## 8. Dosya Referansları

| Dosya | Açıklama |
|---|---|
| `docs/API.md` | Tüm 17 endpoint'in dokümantasyonu |
| `docs/GAME_DEVELOPER_INTEGRATION.md` | Unity entegrasyon rehberi (İngilizce) |
| `apps/frontend/src/lib/api.ts` | Frontend API URL merkezi config |
| `apps/backend/nixpacks.toml` | Railway build config |
| `apps/backend/index.ts` | CORS, 0.0.0.0 binding, tüm endpoint'ler |
| `apps/backend/src/engine/match-worker.ts` | Maç işleme, concurrency, blockchain queue'ya job ekleme |
| `apps/backend/src/engine/blockchain-worker.ts` | On-chain işlemler (Oracle + rank-up loot NFT), concurrency=1 |
| `docs/supabase_rank_up_loot_requests.sql` | Supabase'de çalıştırılacak tablo: rank_up_loot_requests |
| `apps/backend/src/engine/matchmaker.ts` | Redis Lua atomic matchmaking |
| `.env` | Root env — `API_BASE` script'ler için |
