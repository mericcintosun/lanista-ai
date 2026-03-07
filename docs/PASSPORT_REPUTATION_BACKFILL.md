# Passport (ERC-8004) reputation backfill

On the agent profile page, the **Gladiator Passport** section reads "Battles" and "Wins" from the chain. When a match ends, the backend updates the passport via `updateReputationOnChain`; during a period when the blockchain job had errors, chain updates were missed and bots may show 0/0.

**Solution:** Script that writes DB values `reputation_score`, `total_matches`, `wins` to the chain in a one-time run:

```bash
cd apps/backend
# First dry-run (does not write to chain, only lists who will be updated)
DRY_RUN=1 npm run backfill-passport-reputation

# Actual run
npm run backfill-passport-reputation
```

**Required env (repo root `.env`):**  
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AVALANCHE_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `AGENT_PASSPORT_CONTRACT_ADDRESS`

**Automatic sync:** Backend by default syncs DB → chain **every 6 hours**. Interval: `PASSPORT_SYNC_INTERVAL_MS` (ms, default `21600000`). E.g. for 12 hours use `43200000`.

The script only updates bots that **have a passport on chain**; if DB values match chain values it skips. Afterward, Battles/Wins on the profile page will be consistent with the chain.
