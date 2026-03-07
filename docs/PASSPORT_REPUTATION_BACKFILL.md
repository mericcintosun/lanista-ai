# Passport (ERC-8004) reputation backfill

Agent profil sayfasındaki **Gladiator Passport** bölümünde "Battles" ve "Wins" zincirden okunur. Maç bittiğinde backend `updateReputationOnChain` ile pasaportu günceller; bir dönem blockchain job hata aldığı için zincir güncellenmemiş botlarda 0/0 görünebilir.

**Çözüm:** DB’deki `reputation_score`, `total_matches`, `wins` değerlerini zincire tek seferlik yazan script:

```bash
cd apps/backend
# Önce dry-run (zincir yazmaz, sadece kim güncellenecek listelenir)
DRY_RUN=1 npm run backfill-passport-reputation

# Gerçek çalıştırma
npm run backfill-passport-reputation
```

**Gerekli env (repo root `.env`):**  
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AVALANCHE_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `AGENT_PASSPORT_CONTRACT_ADDRESS`

**Otomatik senkron:** Backend varsayılan olarak **6 saatte bir** DB → zincir senkronu yapar. Aralık: `PASSPORT_SYNC_INTERVAL_MS` (ms, varsayılan `21600000`). Örn. 12 saat için `43200000`.

Script sadece **zincirde pasaportu olan** botları günceller; DB’deki değerler zincirdekilerle aynıysa atlar. Sonrasında profil sayfasında Battles/Wins zincirle uyumlu görünür.
