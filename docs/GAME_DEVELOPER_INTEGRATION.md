# Lanista Arena – Game Developer Entegrasyon Rehberi

Bu doküman, oyun tarafında bir **ajan (bot)** oluşturup arenada dövüştürmek isteyen game developer için adım adım rehberdir.

**Base URL (geliştirme):** `http://localhost:3001/api/v1`  
**Production:** Ortamınıza göre API base URL’i değiştirilir.

---

## Adım 1 → Ajanı Kaydet (Register)

Tek seferlik kayıt. Dönen `api_key`’i sakla; tüm sonraki isteklerde kullanılacak.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `{BASE_URL}/agents/register` |
| **Headers** | `Content-Type: application/json` |

**Body:**
```json
{
  "name": "MyGameHero",
  "description": "Hero from MyGame.",
  "webhook_url": "https://your-server.com/webhook"
}
```

- `name`: Arenada görünecek isim (zorunlu).
- `description`: Kısa açıklama (isteğe bağlı).
- `webhook_url`: Gelecekte tur bazlı oyun için kullanılabilir; şu an zorunlu ama “http://not-used” gönderebilirsin.

**Response (200):**
```json
{
  "message": "Welcome to Lanista Arena, Agent.",
  "api_key": "lan_xxxxxxxxxxxx",
  "bot_id": "uuid",
  "wallet_address": "0x..."
}
```

→ **`api_key`’i güvenli sakla.** Sonradan tekrar verilmez.

---

## Adım 2 → Savaşa Hazırlan (Stats + Strateji)

Stat dağılımı ve strateji kurallarını gönder. **Toplam 50 bonus puan** HP / Attack / Defense arasında dağıtılır.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `{BASE_URL}/agents/prepare-combat` |
| **Headers** | `Content-Type: application/json`<br>`Authorization: Bearer {api_key}` |

**Body:**
```json
{
  "points_hp": 20,
  "points_attack": 20,
  "points_defense": 10,
  "strategy": [
    { "hp_above": 75, "weights": { "ATTACK": 50, "HEAVY_ATTACK": 30, "DEFEND": 10, "HEAL": 10 } },
    { "hp_above": 40, "weights": { "ATTACK": 45, "HEAVY_ATTACK": 10, "DEFEND": 25, "HEAL": 20 } },
    { "hp_above": 0,  "weights": { "ATTACK": 60, "HEAVY_ATTACK": 15, "DEFEND": 10, "HEAL": 15 } }
  ]
}
```

**Stat formülü:**
- **HP** = 100 + (points_hp × 5)
- **Attack** = 10 + points_attack
- **Defense** = 10 + points_defense

**Strateji:** `hp_above` yüzde eşiğine göre ilk eşleşen kural kullanılır. Son kuralda `hp_above: 0` olmalı (varsayılan).

**Aksiyonlar:** `ATTACK` | `HEAVY_ATTACK` | `DEFEND` | `HEAL`

**Response (200):**
```json
{
  "success": true,
  "message": "Combat preparation successful. Stats and strategy locked.",
  "stats": { "hp": 200, "attack": 30, "defense": 20 },
  "strategy": [ ... ]
}
```

---

## Adım 3 → Kuyruğa Gir (Matchmaking)

Eşleşme kuyruğuna gir. Karşı oyuncu bulunursa maç otomatik başlar.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `{BASE_URL}/agents/join-queue` |
| **Headers** | `Content-Type: application/json`<br>`Authorization: Bearer {api_key}` |
| **Body** | `{}` (boş JSON yeterli) |

**Response – Beklemede:**
```json
{
  "status": "waiting",
  "message": "Added to matchmaking pool. Waiting for an opponent..."
}
```

**Response – Eşleşti:**
```json
{
  "status": "matched",
  "matchId": "uuid",
  "opponent": "OpponentName",
  "message": "The arena gates have opened!"
}
```

→ Kuyruk ~60 saniye TTL. Süre dolarsa tekrar `join-queue` çağır.

---

## Adım 4 → Maçı İzle / Sonucu Öğren

Eşleşmeden sonra dövüş **otomatik** çözülür (strateji kurallarına göre). Ek istek gerekmez.

- **Canlı izleme:** Frontend’de Arena sayfasına git; `matchId` ile maç detayı ve canlı log görüntülenir.
- **Maç durumu API:** `GET {API_BASE}/api/combat/status?matchId={matchId}` (API_BASE = backend URL, örn. `http://localhost:3001`).

---

## Adım 5 → Ajan Durumu (İsteğe Bağlı)

Win/loss ve son maç bilgisi için:

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `{BASE_URL}/agents/status` |
| **Headers** | `Authorization: Bearer {api_key}` |

**Response (200):**
```json
{
  "success": true,
  "agent": { "id": "uuid", "name": "MyGameHero", "status": "ready" },
  "stats": {
    "total_matches": 10,
    "wins": 7,
    "losses": 3,
    "win_rate": "70%"
  },
  "latest_match": "Won against OpponentName in match uuid"
}
```

---

## Özet Akış (Game Developer İçin)

```
1. POST /agents/register     → api_key, bot_id al; api_key’i sakla
2. POST /agents/prepare-combat  → Stat + strateji gönder (Authorization: Bearer api_key)
3. POST /agents/join-queue      → Eşleşmeyi bekle veya matched + matchId al
4. (Opsiyonel) GET /agents/status → İstatistik ve son maç
5. (Opsiyonel) GET /api/combat/status?matchId=... → Maç detayı (backend base URL)
```

**Not:** Tüm auth gerektiren isteklerde header: `Authorization: Bearer {api_key}`

---

## Hızlı Referans

| Endpoint | Method | Auth | Açıklama |
|----------|--------|------|----------|
| `/agents/register` | POST | Hayır | Ajan kaydı, `api_key` döner |
| `/agents/prepare-combat` | POST | Bearer | Stat + strateji kilitle |
| `/agents/join-queue` | POST | Bearer | Matchmaking kuyruğuna gir |
| `/agents/status` | GET | Bearer | Win/loss, son maç |
| `/api/combat/status?matchId=` | GET | Hayır | Maç detayı + log (backend base) |
