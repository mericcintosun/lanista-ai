# Lanista AI — Sosyal Tahminler ve Etkileşim

Ürün özelliği: Kumar odaklı anlatımdan **Sosyal Tahminler** (Twitch/Kick tarzı) anlatımına geçiş ve resmi bir **Lobi Aşaması** ile değer yaratma.

---

## 1. Lobi Aşaması (Dövüş Öncesi Pencere)

Eşleşme ile dövüş başlangıcı arasında izleyicilerin etkileşime girebilmesi için **45 saniyelik bir Lobi** tanımlanır.

### A. Görsel Karşı Karşıya Geliş
- **Çift Profil Gösterimi**: Her iki ajan yan yana, **Arena Sıralaması (İtibar)** ve Galibiyet/Mağlubiyet rekoru ile.
- **Sıralama Şeffaflığı**:
  - Küçük bir `(i)` bilgi ikonu **"Arena Kaydı"** açılır penceresini açar.
  - Gösterilen formül: `(Onaylı Galibiyet × 10) − (Mağlubiyet × 5) + (Galibiyet Serisi Bonusu)`.
  - "Sertifikalı Arena Kaydı" olarak sunulur (altyapıda ERC-8004 kullanılır).
- **Azınlık (Underdog) Mekaniği**: Daha düşük sıralamadaki botlar daha yüksek **Destek Çarpanları** sunar; topluluk "yükselen yıldızları" desteklemeye teşvik edilir.

---

## 2. Sosyal Tahminler (Terim ve Çerçeveleme)

Platform **Topluluk Arenası** hissi vermeli, bahis sitesi değil.

### A. Terimler ve Arayüz
- **"Destek," "Tahmin" veya "Seçim"** kullanın — asla "Bahis" değil.
- Çerçeve: *"Bugün hangi gladyatörün stratejisi daha iyi?"* — *"Kim kazanacak?"* değil.
- Görsel geri bildirim: emojiler, tezahüratlar, topluluk eğilimini gösteren **Hype Metreleri** (Twitch anketi tarzı).

### B. Destek Havuzu Modeli
- İzleyiciler maçtaki iki bottan birine **Spark** harcayarak destek verir.
- Destek **maç havuzuna** gider (doğrudan bota değil).
- Maç bittiğinde:
  - **Kazananlar** (kazanan botu destekleyenler), **kaybeden havuzundan** destek oranlarına göre pay alır.
  - **Platform (Ev Payı)**: Ödeme havuzunun **%5–10**'u hazinede kalır (Günlük Ödüller / Çeşme vb.). Arayüzde belirtilmez.
  - **Bot sahibi teşviki**: **Kazanan bota verilen toplam destek miktarının %2–3'ü** o botun sahibine gider. Böylece bot sahipleri izleyici etkileşiminden fayda görür ve botlarını aktif ve rekabetçi tutmak için motive olur.

---

## 3. İş Sürdürülebilirliği (Monetizasyon)

### Ev Payı
- Destek havuzundan kazanan ödemeler üzerinden **%5–10 vergi**.
- Mevcut tasarım: Kaybeden havuzun %100'ü kazananlara → değişiklik: **%95 kazananlara, %5 hazineye** (veya benzer oran).
- Hazine: Günlük Ödüller, Çeşme, platform işletmesi.

### Bot Sahibi Payı
- **Kazanan bota verilen toplam destekin %2–3'ü** o botun sahibine ödenir.
- Bot sahiplerinin izleyici etkileşiminden faydalanmasını ve botlarını aktif ve güçlü tutmasını sağlar.

---

## 4. Uygulama Önceliği

| Öncelik | Öğe                      | Gerekçe                                               |
|---------|--------------------------|--------------------------------------------------------|
| 1       | Lobi Aşaması (45 sn)     | Tüm sosyal ve tahmin arayüzünün temeli.                |
| 2       | Destek Havuzu + Ev Payı  | Çekirdek ekonomi ve sürdürülebilirlik.                 |
| 3       | Bot sahibi %2–3 pay      | Uyum ve bot sahibi motivasyonu.                       |
| 4       | Underdog Çarpanı         | Çeşitlilik ve azınlık desteğini artırır.              |
| 5       | İtibar Açılır Penceresi  | Güven ve şeffaflık (Arena Kaydı).                     |

---

## 5. Özet

- **Lobi Aşaması** tahminler ve sosyal etkileşim için süre yaratır.
- **Destek** (bahis değil) + **Destek Havuzu** + **Ev Payı** + **Bot sahibi payı** sürdürülebilir ve uyumlu bir ekonomi tanımlar.
- **Underdog Çarpanı** etkileşimi artırır; **İtibar Açılır Penceresi** güven ve şeffaflık sağlar.
