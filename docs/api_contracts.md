# SameCharge API Sözleşmeleri (Callable Functions)

- **Amaç:** Tüm istemci-callable ve iç Cloud Functions sözleşmelerini tanımlamak.
- **Son Güncelleme:** 2026-07-06

---

## Genel Kurallar

- Ham Firebase veya platform hata mesajları istemciye gösterilmez.
- Tüm hatalar aşağıdaki stabil uygulama hata kodlarıyla döner.
- **App Check:** Production ortamında tüm istemci-callable functions için zorunludur. Dev/emulator ortamında debug provider istisna olarak izin verilir. `"Önerilir"` ifadesi artık kullanılmaz.

### Canonical Onboarding Doğrulaması

Onboarding ve profil metin alanlarında ortak canonical doğrulama sırası:

1. Girdi `string` olmalıdır.
2. Unicode NFKC normalization uygulanır.
3. Baştaki ve sondaki Unicode whitespace kaldırılır.
4. `displayName` içindeki ardışık whitespace tek normal boşluğa dönüştürülür.
5. Unicode C0/C1 control karakterleri reddedilir.
6. Bidi override/isolate kontrol karakterleri reddedilir.
7. Uzunluk JavaScript UTF-16 code unit ile değil Unicode code point sayısıyla ölçülür.
8. Canonical değer doğrulama ve saklama için kullanılır.

Bu normalizasyon kullanıcı UID, consent type, consent version, city ID veya interest ID gibi identifier alanlarına uygulanmaz. Identifier alanları kendi canonical formatlarına tam olarak uymalıdır; hatalı değerler trim, lowercase veya transliteration ile sessizce düzeltilmez.

`displayName` sözleşmesi: NFKC + trim + whitespace collapse sonrası 2-30 Unicode code point; satır sonu, C0/C1 control ve bidi control karakterleri yasaktır. Harf tabanlı dar regex kullanılmaz; Türkçe karakterler, farklı alfabeler, boşluk, apostrof, tire, nokta ve makul Unicode isim karakterleri kabul edilebilir.

`bio` sözleşmesi: NFKC + trim sonrası 0-300 Unicode code point; normal satır sonları kabul edilir, diğer C0/C1 control ve bidi control karakterleri reddedilir. Boş bio onboarding'i engellemez.

`interests` sözleşmesi: Kullanıcıya gösterilen lokalize etiketler değil canonical interest ID dizisidir. Dizi 0-10 öğe içerebilir. Her ID 1-32 ASCII karakter, lowercase slug ve `^[a-z0-9]+(?:_[a-z0-9]+)*$` formatında olmalıdır. Örnek geçerli ID'ler: `music`, `coffee`, `live_music`, `outdoor_sports`. `Live Music`, `live-music`, `live/music`, `live music`, boş string ve 32 karakterden uzun ID'ler geçersizdir. Duplicate ID reddedilir; dizi sırası kullanıcı tercih sırası olarak korunabilir. Backend bu aşamada ürün katalog içeriği icat etmez; PR 5 yalnızca format, count ve uniqueness doğrular.

`cityId` sözleşmesi: Kullanıcının yazdığı şehir adı değil server-supported canonical city ID'dir. Genel format `^[a-z0-9]+(?:_[a-z0-9]+)*$`, 2-64 ASCII karakter, lowercase slug. Mevcut kapalı beta server allowlist yalnızca `istanbul` değerini içerir. `İstanbul`, `Istanbul`, `istanbul ` veya başka şehir ID'si reddedilir. İkinci şehir eklemek allowlist değişikliği ve ürün kararı gerektirir; İstanbul dışına genişleme kararı hâlâ ürün doğrulamasına bağlıdır.

`consentRecords.version` sözleşmesi: Kullanıcı metni değil canonical legal document version ID'sidir. 1-64 ASCII karakter, lowercase, başı ve sonu alphanumeric, ortada yalnızca lowercase harf, rakam, nokta, alt çizgi ve tire bulunur. Format: `^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$`. Örnek geçerli değerler: `v1`, `v1.0`, `2026-07-06`, `beta_terms_v1`. `/terms/v1`, `../v1`, `V1`, `v1/`, boş string, whitespace içeren değer ve 64 karakterden uzun değer geçersizdir. Raw version Firestore document ID olarak kullanılmaz ve loglanmaz.

`consentRecords` sözleşmesi: İzin verilen type değerleri `terms`, `privacy`, `explicit_data`, `analytics`, `marketing`. Her type en fazla bir kez bulunabilir; bilinmeyen veya duplicate type reddedilir. `terms`, `privacy`, `explicit_data` mevcut olmalı ve `granted=true` olmalıdır. `analytics` ve `marketing` isteğe bağlıdır, `granted=false` olabilir, yoklukları `granted=true` varsayılmaz. `granted` kesin boolean olmalıdır. Client timestamp kabul edilmez; server timestamp kullanılır. Her gönderilen rıza ayrı history belgesi olarak saklanır ve her type kendi version değerine sahiptir.

### İstemci-Callable vs. İç Worker Ayrımı

| Tür | Kim çağırır? | App Check |
|---|---|---|
| İstemci-Callable | Mobil uygulama | **Zorunlu (prod)** / debug-provider (dev) |
| İç Worker | Başka Cloud Functions / Pub/Sub | N/A |

### Stabil Uygulama Hata Kodları

| Kod | Açıklama |
|---|---|
| `unauthenticated` | Auth token geçersiz veya eksik |
| `app_check_required` | App Check doğrulaması başarısız |
| `rate_limited` | Hız sınırı aşıldı |
| `input_invalid` | Girdi şeması geçersiz |
| `profile_not_eligible` | Profil discovery için uygun değil |
| `candidate_token_invalid` | Token hash eşleşmiyor |
| `candidate_token_expired` | Token TTL dolmuş |
| `candidate_token_used` | Token daha önce kullanılmış |
| `candidate_token_revoked` | Token iptal edilmiş |
| `report_token_invalid` | Pre-match rapor tokenı geçersiz |
| `report_token_expired` | Rapor tokenı TTL dolmuş |
| `report_token_used` | Rapor tokenı daha önce kullanılmış |
| `discovery_limit_reached` | Günlük limit dolmuş |
| `match_not_active` | Match active değil |
| `messaging_disabled` | messagingEnabled = false |
| `content_rejected` | İçerik politikasına aykırı |
| `account_restricted` | Hesap restricted veya deletion_pending |
| `not_found` | Kayıt bulunamadı |
| `already_exists` | İdempotent işlem tamamlanmış |
| `permission_denied` | Yetki yetersiz |
| `reauthentication_required` | ID token too old; yeniden giriş gerekli |
| `internal` | Sunucu iç hatası (ayrıntı gizli) |

---

## A — İstemci-Callable Functions

### A-01. `getAppBootstrap`

**Amaç:** Uygulama başlangıcında durumu güvenli biçimde almak. Ham iç durum alanları dönmez.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** Parametre yok.

**Response:**
```json
{
  "onboardingStatus": "not_started | in_progress | completed",
  "accountStatus": "active | suspended | deletion_pending",
  "profileStatus": "draft | pending | approved | rejected | needs_review",
  "discoveryEligible": true,
  "moderationActionRequired": false,
  "notificationPreferences": { "newMatch": true, "newMessage": true, "systemAnnouncements": true, "marketingNotifications": false },
  "consentSummary": {
    "terms": { "version": "1.0", "granted": true },
    "privacy": { "version": "1.0", "granted": true },
    "explicit_data": { "version": "1.0", "granted": true },
    "analytics": { "version": "1.0", "granted": false },
    "marketing": { "version": "1.0", "granted": false }
  }
}
```

**Güvenlik:** `riskScore`, `suspensionReason`, `moderationNotes` ve diğer iç alanlar response'a dahil edilmez.
**Hata kodları:** `unauthenticated`, `app_check_required`.

---

### A-02. `getMyProfile`

**Amaç:** Kendi canlı profilini, taslak/bekleyen revizyonunu ve fotoğraf durumlarını sanitized biçimde almak.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** Parametre yok.

**Response:**
```json
{
  "profileStatus": "draft|pending|approved|rejected|needs_review",
  "liveProfile": {
    "displayName": "string",
    "cityId": "string",
    "bio": "string",
    "interests": ["string"],
    "intent": "string"
  },
  "activeRevision": {
    "revisionId": "string",
    "status": "draft|pending|rejected|needs_review",
    "proposedDisplayName": "string",
    "proposedCityId": "string",
    "proposedBio": "string",
    "proposedInterests": ["string"],
    "proposedIntent": "string",
    "reasonCode": "string|null"
  },
  "photos": [
    { "photoId": "string", "status": "pending|approved|rejected|needs_review|failed", "reasonCode": "string|null", "signedUrl": "string|null", "sortOrder": 0 }
  ]
}
```

İlk onay öncesinde `liveProfile` null olabilir. `storagePath`, MIME, dosya boyutu ve moderatör notları dönmez.
**Hata kodları:** `unauthenticated`, `app_check_required`.

---

### A-03. `updateProfile`

**Amaç:** Profil değişikliklerini canlı profilin üzerine yazmadan bir `profile_revisions` taslağına kaydetmek.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:**
```json
{
  "displayName": "string (2-30 Unicode code points)",
  "bio": "string (0-300 Unicode code points)",
  "interests": ["canonical_interest_id"],
  "intent": "dating | friendship | chat",
  "cityId": "canonical_city_id"
}
```

**Response:** `{ "revisionId": "string", "status": "draft" }`

**Server davranışı:** Kullanıcının mevcut tek aktif draft revizyonunu idempotent biçimde günceller veya yeni draft oluşturur. Onaylı `profiles` alanları değişmez. Hesap restricted ise reddedilir.
**Rate limit:** Dakikada 3 çağrı.
**Hata kodları:** `unauthenticated`, `app_check_required`, `input_invalid`, `account_restricted`.

---

### A-04. `submitProfileForReview`

**Amaç:** Aktif profil revizyonunu moderasyon kuyruğuna göndermek.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** `{ "revisionId": "string" }`

**Response:** `{ "revisionId": "string", "status": "pending", "profileStatus": "pending|approved" }`

**Server validasyonları:**
- Revizyon kullanıcıya ait ve `draft|rejected` durumunda olmalı.
- Zorunlu profil alanları geçerli olmalı.
- En az bir fotoğraf `pending|approved|needs_review` durumunda bulunmalı; fotoğrafın henüz approved olması gerekmez.
- İlk profil onayından önce `profileStatus=pending` yapılır.
- Daha önce onaylı canlı profil varsa `profileStatus=approved` kalır; eski içerik revizyon onaylanana kadar yayınlanmaya devam eder.

**Idempotency:** Aynı revizyon zaten pending ise aynı sonuç döner.
**Hata kodları:** `unauthenticated`, `app_check_required`, `profile_not_eligible`, `already_exists`, `not_found`.

---

### A-05. `completeOnboarding`

**Amaç:** Onboarding verilerini kaydetmek; yaş doğrulaması ve zorunlu rıza kontrolü.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:**
```json
{
  "displayName": "string (2-30 Unicode code points)",
  "birthDate": "YYYY-MM-DD",
  "cityId": "canonical_city_id",
  "bio": "string (0-300 Unicode code points)",
  "interests": ["canonical_interest_id"],
  "intent": "dating | friendship | chat",
  "selfGender": "male | female | nonbinary | unspecified",
  "shownGenderPreferences": ["male", "female", "nonbinary"],
  "consentRecords": [
    { "type": "terms", "version": "1.0", "granted": true },
    { "type": "privacy", "version": "1.0", "granted": true },
    { "type": "explicit_data", "version": "1.0", "granted": true },
    { "type": "analytics", "version": "1.0", "granted": false },
    { "type": "marketing", "version": "1.0", "granted": false }
  ]
}
```

**Server validasyonları:**
- 18+ yaş server time ile kontrol.
- `displayName`, `bio`, `interests`, `cityId` ve consent version alanları yukarıdaki canonical sözleşmelere göre doğrulanır.
- Mevcut kapalı beta allowlist'inde yalnızca `cityId == "istanbul"` kabul edilir.
- `terms`, `privacy`, `explicit_data` türleri için `granted: true` zorunludur; bu üçü eksik veya `false` ise `input_invalid` döner.
- `analytics` ve `marketing` isteğe bağlıdır; `false` olabilir ve onboarding'i engellemez.
- Her consent type en fazla bir kez bulunabilir; unknown veya duplicate type `input_invalid` döndürür.
- `selfGender` isteğe bağlıdır; belirtilmezse `unspecified` kaydedilir.
- `shownGenderPreferences` boş olabilir; doluysa yalnızca `male|female|nonbinary|unspecified` değerlerini içerir.
- En az bir finalize edilmiş fotoğraf `pending|approved|needs_review` durumunda olmalıdır; moderasyon onayını onboarding ekranında beklemek gerekmez.
- İlk `profile_revisions` kaydı `pending`, `profiles.profileStatus` ise `pending` oluşturulur. Discovery ancak profil approved ve en az bir fotoğraf approved olduğunda açılır.

**Response:** `{ "status": "completed", "profileStatus": "pending", "discoveryEligible": false }`

**Yazılan belgeler:** `users_private`, `users_internal`, `preferences`, `profiles`, ilk `profile_revisions` kaydı ve `consent_history`.

**Rate limit:** IP tabanlı 5/saat.
**Idempotency:** İlk geçerli çağrı onboarding kayıtlarını atomik olarak oluşturur ve `{ "status": "completed" }` döner. Aynı canonical payload yeniden gönderilirse yeni primary belge veya consent history belgesi oluşturulmaz, mevcut veri değiştirilmez ve aynı başarılı response döner. Onboarding tamamlandıktan sonra farklı canonical payload gönderilirse mevcut identity/onboarding verisi değişmez, yeni consent history oluşturulmaz ve `already_exists` application error döner. Canonical karşılaştırmada object key sırası dikkate alınmaz; array sırası anlamlı alanlarda korunur; consent kayıtları karşılaştırma için consent type'a göre sıralanır. Raw request payload saklanmaz.
**Hata kodları:** `unauthenticated`, `app_check_required`, `input_invalid`, `account_restricted`, `already_exists`.

---

### A-06. `finalizeProfilePhoto`

**Amaç:** Geçici yüklenen fotoğrafı sunucuda doğrulayıp `pending` moderasyon durumuna almak.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** `{ "tempFilePath": "string" }`

**Response:** `{ "photoId": "string", "status": "pending" }`

**Server validasyonları:** Sahiplik, MIME, boyut ≤ 5 MB, görsel bomba, EXIF temizleme, WebP yeniden encode. Maks 4 aktif fotoğraf.
**Rate limit:** Günlük 10 yükleme.
**Hata kodları:** `unauthenticated`, `app_check_required`, `input_invalid`, `rate_limited`, `content_rejected`, `internal`.

---

### A-07. `deleteProfilePhoto`

**Amaç:** Kendi fotoğrafını silmek.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** `{ "photoId": "string" }`

**Response:** `{ "status": "deleted" }`

**Server validasyonları:** Sahiplik. `approved` fotoğraf silinirse `profiles.photoIds` listesinden ve CandidateView'den anında çıkarılır. Son approved fotoğraf silinirse `discoveryEligible=false` olur; kullanıcının `preferences.discoveryEnabled` tercihi otomatik değiştirilmez.
**Hata kodları:** `unauthenticated`, `app_check_required`, `not_found`, `permission_denied`.

---

### A-08. `reorderProfilePhotos`

**Amaç:** Onaylı fotoğrafların sırasını değiştirmek.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** `{ "orderedPhotoIds": ["string"] }`

**Response:** `{ "status": "updated" }`

**Server validasyonları:** Tüm ID'ler sahibine ait ve `approved` durumunda olmalı.
**Hata kodları:** `unauthenticated`, `app_check_required`, `input_invalid`, `permission_denied`.

---

### A-09. `startDiscovery`

**Amaç:** Batarya eşleşmeli aday listesi üretmek.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** `{ "requestedRange": 0, "pageSize": 10 }`

**Response:**
```json
{
  "candidates": [
    {
      "candidateToken": "string",
      "reportToken": "string",
      "displayName": "string",
      "age": 24,
      "cityLabel": "string",
      "bio": "string",
      "approvedPhotoSignedUrls": ["string"],
      "interests": ["string"],
      "batteryLabel": "%47",
      "batteryDifference": 0,
      "expiresAt": "timestamp"
    }
  ],
  "sessionId": "string",
  "isEmpty": false
}
```

**Rate limit:** Dakikada 5 çağrı.
**Hata kodları:** `unauthenticated`, `app_check_required`, `profile_not_eligible`, `rate_limited`, `discovery_limit_reached`.

---

### A-10. `submitDiscoveryDecision`

**Amaç:** Like/pass karar göndermek.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** `{ "candidateToken": "string", "decision": "like | pass" }`

**Response:** `{ "matched": true | false, "matchId": "string | null" }`

**Pass kararı:** `decisionId = {actorId}_{candidateId}` kalıcı kayıt oluşturur. Pass kararı varsayılan olarak kalıcıdır; süre bazlı cooldown açık karardır (OD-013).
**Hata kodları:** `candidate_token_invalid`, `candidate_token_expired`, `candidate_token_used`, `candidate_token_revoked`, `rate_limited`, `account_restricted`.

---

### A-11. `sendMessage`

**Amaç:** Match içinde mesaj göndermek.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** `{ "matchId": "string", "clientMessageId": "uuid", "text": "string (max 1000 char)" }`

**Response:** `{ "messageId": "string", "createdAt": "timestamp" }`

**Idempotency:** Aynı `clientMessageId` ikinci çağrıda aynı sonucu döner.
**Hata kodları:** `match_not_active`, `messaging_disabled`, `rate_limited`, `content_rejected`, `input_invalid`.

---

### A-12. `blockUser`

**Amaç:** Bir eşleşmedeki kullanıcıyı kalıcı olarak engellemek.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** `{ "matchId": "string" }`

**Response:** `{ "status": "blocked" }`

**Hata kodları:** `match_not_active`, `already_exists`, `rate_limited`.

---

### A-13. `unmatchUser`

**Amaç:** Eşleşmeyi kaldırmak (sosyal tercih; kalıcı blok değil).
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** `{ "matchId": "string" }`

**Response:** `{ "status": "unmatched" }`

**Hata kodları:** `match_not_active`, `already_exists`.

---

### A-14. `reportContent`

**Amaç:** Kullanıcı veya içerik şikayet etmek.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

İstemci `reportedUserId`'yi **göndermez**; sunucu bağlama göre türetir.

**Request:**
```json
{
  "context": "pre_match | match | message",
  "reportToken":    "string (yalnızca context=pre_match)",
  "matchId":        "string (context=match veya message)",
  "messageId":      "string (yalnızca context=message)",
  "category": "harassment | fake_profile | spam | inappropriate_content | other",
  "reporterNote": "string (max 500 char, optional)"
}
```

**Server işlemi:**
- `context=pre_match`: Ham `reportToken` SHA-256 ile hashlenir, `reportTokenHash` ile karşılaştırılır ve `reportUsedAt` işaretlenir. Like/pass `candidateToken` durumu değişmez. `reportedUserId` server-side türetilir.
- `context=match` veya `message`: `matchId` üyeliği doğrulanır; `reportedUserId` karşı üyeden türetilir. Mesaj bağlamını sunucu toplar.

**Response:** `{ "reportId": "string" }`

**Rate limit:** Günlük 10 rapor.
**Hata kodları:** `rate_limited`, `not_found`, `input_invalid`, `report_token_invalid`, `report_token_expired`, `report_token_used`.

---

### A-15. `requestAccountDeletion`

**Amaç:** Hesap silme sürecini başlatmak. Sunucu ID token `auth_time` değerini kontrol eder.
**Auth:** Zorunlu + Recent re-authentication. **App Check:** Zorunlu (prod).

**Request:** Parametre yok.

**Response:** `{ "status": "deletion_pending" }`

**Server validasyonları:**
- ID token `auth_time` ≤ 5 dakika önce değilse `reauthentication_required` döner. İstemcinin "yeniden doğrulama yaptım" beyanına güvenilmez.
- Zaten `deletion_pending` ise idempotent.

**Yazılan belgeler:** `users_internal/{uid}.accountStatus = 'deletion_pending'`, `preferences/{uid}.discoveryEnabled = false`, `deletion_jobs/{jobId}` (created).
**Hata kodları:** `unauthenticated`, `app_check_required`, `reauthentication_required`, `already_exists`.

---

### A-16. `registerPushToken`

**Amaç:** Cihaz push token kaydetmek veya güncellemek.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** `{ "token": "string", "platform": "android | ios", "appVersion": "string" }`

**Response:** `{ "tokenId": "string" }`

---

### A-17. `updateNotificationPreferences`

**Amaç:** Bildirim tercihlerini güncellemek.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** `{ "newMatch": bool, "newMessage": bool, "systemAnnouncements": bool, "marketingNotifications": bool }`

**Response:** `{ "status": "updated" }`

---

### A-18. `markMatchRead`

**Amaç:** Eşleşmenin okunma zamanını güncellemek ve okunmamış sayacını sıfırlamak.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** `{ "matchId": "string" }`

**Response:** `{ "status": "updated" }`

**Yazılan belgeler:** `member_state/{uid}.lastReadAt = serverTimestamp()`, `unreadCount = 0`.
**Not:** Başka üyenin `member_state` belgesi değiştirilemez.
**Hata kodları:** `match_not_active`, `permission_denied`.

---

### A-19. `setMatchMuted`

**Amaç:** Eşleşme sessize almak veya açmak.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** `{ "matchId": "string", "muted": true | false }`

**Response:** `{ "status": "updated" }`

**Yazılan belgeler:** `member_state/{uid}.muted`.
**Hata kodları:** `match_not_active`, `permission_denied`.

---

### A-20. `getMatchProfile`

**Amaç:** Aktif eşleşmedeki karşı tarafın sanitized profil bilgisini almak.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** `{ "matchId": "string" }`

**Response:**
```json
{
  "displayName": "string",
  "age": 24,
  "cityLabel": "string",
  "bio": "string",
  "interests": ["string"],
  "approvedPhotoSignedUrls": ["string"]
}
```

**Server validasyonları:** İstemci yalnızca kendi aktif matchlerindeki karşı profili isteyebilir. Karşı tarafın UID'i response'a dahil edilmeyebilir (tasarım tercihi).
**Hata kodları:** `match_not_active`, `permission_denied`, `not_found`.

---

### A-21. `verifyPurchase`

**Amaç:** Satın alımı doğrulayıp premium haklarını aktifleştirmek.
**Auth:** Zorunlu. **App Check:** Zorunlu (prod).

**Request:** `{ "purchaseToken": "string", "productId": "string", "platform": "android | ios" }`

**Response:** `{ "premiumActive": true, "expiresAt": "timestamp" }`

**Idempotency:** Aynı `purchaseToken` ikinci kez işlenmez.
**Hata kodları:** `unauthenticated`, `app_check_required`, `input_invalid`, `already_exists`, `internal`.

---

## B — İç Worker Functions (İstemci Tarafından Çağrılmaz)

### B-01. `processAccountDeletion`
Admin SDK / Pub/Sub tarafından tetiklenir. App Check N/A.
Silme adımlarını `data_model.md` ve `data_retention_policy.md` içindeki aynı 10 adımlı sırayla idempotent biçimde yürütür; `deletion_jobs/{jobId}` adım adım güncellenir. Firebase Auth hesabı son adımdır.

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** rate limit value finalization (TBD), auth_time window (5 min) review
- **Release blockers:** none
- **Last reviewed:** 2026-07-06
