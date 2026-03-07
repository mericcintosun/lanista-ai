# RankUpLootNFT nasıl deploy edilir (Avalanche Fuji)

## 1. `.env` dosyasını hazırla

`packages/contracts/` klasöründe `.env` oluştur (veya mevcut olanı düzenle). Root’taki `.env` değil; script `packages/contracts/.env` okuyor.

```bash
cd packages/contracts
cp .env.example .env
# .env'i düzenle
```

**Zorunlu alanlar:**

| Değişken | Açıklama | Nereden bulunur |
|----------|----------|------------------|
| `DEPLOYER_PRIVATE_KEY` | Cüzdan private key (0x olmadan) | MetaMask export / env'den |
| `AVALANCHE_RPC_URL` | Fuji RPC | Varsayılan: `https://api.avax-test.network/ext/bc/C/rpc` |
| `VRF_COORDINATOR_ADDRESS` | Chainlink VRF Coordinator (Fuji) | [Chainlink Fuji VRF](https://docs.chain.link/vrf/v2-5/supported-networks#avalanche-fuji-testnet) |
| `VRF_SUBSCRIPTION_ID` | VRF subscription ID | Chainlink dashboard’da subscription oluştur |
| `VRF_KEY_HASH` | VRF key hash (Fuji) | Aynı dokümandan |
| `RANK_UP_LOOT_BASE_URI` | Metadata base URL (sonunda `/`) | Örn. `https://yourdomain.com/assets/items/metadata/` |

**Opsiyonel (varsayılanlar yeterli):**

- `VRF_CALLBACK_GAS_LIMIT` (varsayılan: 250000)
- `VRF_REQUEST_CONFIRMATIONS` (varsayılan: 3)
- `VRF_NUM_WORDS` (varsayılan: 1)

Fuji testnet için VRF adresleri ve key hash:  
https://docs.chain.link/vrf/v2-5/supported-networks#avalanche-fuji-testnet

---

## 2. VRF subscription yoksa oluştur

Chainlink VRF kullanmak için bir subscription ve LINK gerekiyor.

1. [vrf.chain.link](https://vrf.chain.link/) → Avalanche Fuji seç.
2. “Create subscription” → Fuji’de subscription oluştur.
3. Subscription’a **LINK** yükle (Fuji testnet LINK; faucet’ten alınabilir).
4. Subscription ID’yi kopyala → `.env` içinde `VRF_SUBSCRIPTION_ID` yap.

---

## 3. Deploy komutunu çalıştır

**Sadece RankUpLootNFT deploy etmek için (önerilen):**

```bash
cd packages/contracts
pnpm exec hardhat compile
npx ts-node --esm scripts/deploy-rank-up-only.ts
```

`ts-node` ESM hatası verirse:

```bash
npx tsx scripts/deploy-rank-up-only.ts
```

(Proje kökünde `tsx` yoksa: `npm i -D tsx` veya `pnpm add -D tsx` ile ekleyebilirsin.)

**Tüm kontratları (ArenaOracle + LootChest + RankUpLootNFT) deploy etmek için:**

```bash
cd packages/contracts
npx tsx scripts/deploy.ts
```

(Not: `deploy.ts` Hardhat kullanmıyor, doğrudan ethers ile RPC’ye bağlanıyor. Çalışma dizini `packages/contracts` olmalı ki `.env` doğru yerde aransın.)

---

## 4. Deploy sonrası

1. **Kontrat adresi** terminalde yazılır. Bunu kopyala.
2. **Backend:** `RANK_UP_LOOT_NFT_ADDRESS=<adres>` (root veya `apps/backend/.env`).
3. **Frontend (build):** `VITE_RANK_UP_LOOT_NFT_ADDRESS=<adres>` (Railway/Vercel env veya `.env.production`).
4. **Chainlink:** VRF dashboard’da ilgili subscription’a bu kontrat adresini **consumer** olarak ekle.

---

## 5. Base URI’yi sonradan değiştirmek

Metadata URL’i değişecekse (ör. domain değişti):

- Kontratı deploy eden cüzdanla (owner) `setBaseURI(yeniUrl)` çağır.
- Bunu Snowtrace üzerinden “Write Contract” ile veya küçük bir script ile yapabilirsin.

---

## Kısa kontrol listesi

- [ ] `packages/contracts/.env` dolu (DEPLOYER_PRIVATE_KEY, VRF_*, RANK_UP_LOOT_BASE_URI)
- [ ] Fuji’de deployer cüzdanında AVAX var (gas için)
- [ ] VRF subscription oluşturuldu, LINK yüklendi
- [ ] `npx tsx scripts/deploy-rank-up-only.ts` çalıştırıldı
- [ ] Backend ve frontend env’lere adres yazıldı
- [ ] Chainlink’te kontrat consumer olarak eklendi
