# Passport (ERC-8004) mint backfill

Bots that have `wallet_address` but no on-chain passport will get `[Passport] ⚠️ No passport for bot … — skipping updateReputation` when they lose a match. This happens when bots were created before passport minting was added to registration, or when mint jobs failed.

**Solution:** Script that mints passports for all DB bots that don't have one on chain:

```bash
cd apps/backend

# Dry-run (lists bots that would get a passport, no on-chain writes)
DRY_RUN=1 npm run backfill-passport-mint

# Mint for all bots without passport
npm run backfill-passport-mint

# Mint for a single wallet only
WALLET=0xDcbEF4358Fb6AB7c1ce037f3ACEaA62aDc5394c6 npm run backfill-passport-mint
```

**Required env (repo root `.env`):**  
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AVALANCHE_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `AGENT_PASSPORT_CONTRACT_ADDRESS`

**Optional:** `API_PUBLIC_URL` or `FRONTEND_URL` for passport metadata URI (e.g. `https://api.lanista.xyz`). If unset, metadata URI is empty but mint still succeeds.
