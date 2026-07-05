# SameCharge Eşleşme Algoritması Dokümanı

- **Amaç:** Aday bulma mantığını, güncelleme filtrelerini ve ölçeklendirme kriterlerini tanımlamak.
- **Son Güncelleme:** 2026-07-06

---

## 1. selfGender Kararı (MVP)
**Karar:** `selfGender` MVP'de zorunlu değildir. Varsayılan değer `unspecified`'dır.

**Enum değerleri:** `male | female | nonbinary | unspecified`

Her yön için aynı fonksiyon uygulanır:

```text
accepts(viewerPreferences, targetGender):
  viewerPreferences boşsa true
  değilse targetGender viewerPreferences içinde olmalı
```

Buna göre hedef kullanıcının `selfGender = unspecified` olması, diğer kullanıcının filtresini **asla bypass etmez**. Yalnızca karşı tarafın tercih listesi boşsa veya `unspecified` açıkça listede bulunuyorsa eşleşme yönü geçer. Karşılıklı eşleşmede A→B ve B→A kontrollerinin ikisi de true olmalıdır.

## 2. Freshness Kontrolü

`presence/{uid}.lastSeenAt` sunucu zamanına göre en fazla **90 saniye** eski olabilir. 90 saniyeyi aşan kayıtlar havuza alınmaz. Geçmiş kayıtların temizliği ayrı scheduled function ile yapılır.

---

## 3. Aday Uygunluk Filtreleri

1. Aday kendisi değil.
2. `accountStatus == 'active'`.
3. `profileStatus == 'approved'`.
4. En az 1 `approved` fotoğraf.
5. `preferences.discoveryEnabled == true`.
6. Presence freshness (≤ 90s).
7. Karşılıklı yaş tercihleri uyumlu.
8. Karşılıklı `selfGender` / `shownGenderPreferences` uyumlu (unspecified kuralı Kıs. 1'de).
9. Şehir uyumlu.
10. Aktif blok yok (her iki yönde).
11. Aktif match yok.
12. Geçmiş match yok (`unmatched` veya `blocked`) — MVP kalıcı filtre (OD-002).
13. Exposure TTL içinde (yakın zamanda gösterilmemiş).
14. Günlük karar limiti dolmamış.

---

## 4. Arama Öncelik Sırası (Battery Matching)

| Kademe | Kriter | Açıklama |
|---|---|---|
| 1 | Fark = 0 | Tam eşleşme |
| 2 | ±1 aynı şarj yönü | — |
| 3 | Fark ≤ ±3 | — |
| 4 | Fark ≤ ±5 (Premium) | — |
| 5 | Boş havuz | — |

Kademeler arasındaki otomatik genişleme açık ürün kararıdır: **OD-003**.

---

## 5. CandidateView DTO

```json
{
  "candidateToken": "<like/pass için kısa ömürlü opaque token>",
  "reportToken": "<pre-match report için ayrı opaque token>",
  "displayName": "Deniz",
  "age": 24,
  "cityLabel": "İstanbul",
  "bio": "...",
  "approvedPhotoSignedUrls": ["<imzalı URL>"],
  "interests": ["music"],
  "batteryLabel": "%47",
  "batteryDifference": 0,
  "expiresAt": "<timestamp>"
}
```

- Ham token veritabanında saklanmaz; yalnızca SHA-256 hash.
- Kalıcı public URL kullanılmaz; kısa süreli imzalı URL üretilir.
- `candidateId` (UID) istemciye gönderilmek zorunda değildir.

---

## 6. Decision Idempotency ve Pass Kararı

`decisionId = {actorId}_{candidateId}` — deterministik, lifetime boyunca tek karar. Aynı çiftin kararı ikinci kez gönderilemez.

**Pass kararının kalıcılığı:** Varsayılan olarak kalıcıdır. Süre bazlı cooldown veya yeniden gösterim açık bir ürün kararıdır: **OD-013**.

---

## 7. Candidate Token Yaşam Döngüsü

```
issued → used | expired | revoked
```

Ham `reportToken`, candidate decision tokenından bağımsızdır. Veritabanında yalnızca `reportTokenHash` saklanır. `reportContent` ham tokenı hashleyip karşılaştırır, `reportUsedAt` alanını işaretler ve karar tokenının `usedAt` alanını değiştirmez.

---

## 8. Ölçeklendirme Planı

### Kademe A (CCU < ~1.000) — Fresh RTDB bazlı arama
### Kademe B (CCU ≥ ~1.000) — Server-maintained bucket index

```
matchmaking_pool/{cityId}/{batteryLevel}/{uid}
```

Bu index istemci tarafından okunamaz.

**Geçiş tetikleyicileri:** latency > 800ms, maliyet alarmı, CCU > ~1.500.

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** OD-003 (auto range expansion), OD-013 (pass cooldown) user interview results
- **Release blockers:** none
- **Last reviewed:** 2026-07-06
