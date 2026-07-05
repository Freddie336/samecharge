# SameCharge Analitik Olay Tanımları

- **Amaç:** Uygulama performansını ve dönüşüm hunisini izlemek için Firebase Analytics olaylarını tanımlamak.
- **Kapsam:** Mobil istemci ve sunucu analitik şeması.
- **Son Güncelleme:** 2026-07-06

---

## 1. Kesinlikle Yasaklı Parametre Listesi

Aşağıdaki değerler hiçbir analitik olayında bulunmamalıdır:

- Kullanıcı UID'si
- Aday UID'si veya tekil tanımlayıcısı (`candidateId`, `candidateToken`)
- Kesin yaş (`age: 24`)
- Doğum tarihi
- Mesaj içeriği
- Fotoğraf URL'si veya depolama yolu
- Hassas dating tercihleri (kesin cinsiyet tercihleri, kesin niyet)
- E-posta adresi

**Yerine kullanılanlar:**
- Yaş → `candidate_age_bucket` (örn: `"18-22"`, `"23-27"`, `"28-34"`, `"35+"`)
- Tercih → boolean flag (örn: `has_gender_preference: true`)

---

## 2. Yeniden Tanımlama (Re-Identification) Riski

Kapalı beta gibi düşük kullanıcı sayılı ortamlarda `city_id`, `battery_level_bucket` ve `candidate_age_bucket` kombinasyonu tek bir kişiyi tanımlayabilir.

**Önlem:**
- Analitik olaylarında şehir, batarya ve yaş alanları aynı anda kayıt edilmez.
- Gerektiğinde yalnızca aggregated (toplulaştırılmış) metrikler izlenir.
- DAU < belirli eşik ise şehir bazlı raporlama gizlenir (TODO: eşik değeri belirlenmeli).

---

## 3. Olay Listesi

### 3.1 Onboarding
- `onboarding_started` — Hiç parametre.
- `onboarding_step_completed` — `{ step_name: string }` (örn: `"photo_upload"`, `"consent_terms"`)
- `onboarding_completed` — `{ sign_in_method: "email"|"google", duration_seconds: number }`
- `onboarding_abandoned` — `{ last_step: string }`

### 3.2 Profil ve Moderasyon
- `profile_photo_uploaded` — Parametre yok.
- `profile_submitted` — Parametre yok.
- `profile_approved` — *(Sunucu taraflı)* Parametre yok.
- `profile_rejected` — *(Sunucu taraflı)* `{ reason_code: string }` — sebep kodu kategorik, açık metin değil.

### 3.3 Discovery
- `discovery_started` — `{ battery_level_bucket: string, requested_range: number }`
- `discovery_candidate_shown` — `{ candidate_age_bucket: string, battery_difference: number }`
- `discovery_decision_submitted` — `{ decision: "like"|"pass", battery_difference: number }`
- `discovery_empty` — `{ battery_level_bucket: string }`
- `discovery_limit_reached` — Parametre yok.

### 3.4 Eşleşme ve Sohbet
- `match_created` — `{ matched_battery_level_bucket: string }`
- `chat_first_message_sent` — Parametre yok.
- `chat_became_two_sided` — Parametre yok.
- `chat_unmatched` — Parametre yok.
- `user_blocked` — Parametre yok.
- `report_submitted` — `{ category: string }`

### 3.5 Hesap ve Premium
- `account_deletion_requested` — Parametre yok.
- `purchase_started` — `{ product_id: string }`
- `purchase_completed` — `{ product_id: string }`
- `push_notification_received` — `{ notification_type: string }` (örn: `"new_match"`, generic sadece)
- `push_notification_opened` — `{ notification_type: string }`

---

## 4. Loglarda Bulunmaması Gereken Veriler (Yapısal Zorunluluk)

Cloud Functions structured logging dahil olmak üzere sunucu loglarına şunlar yazılmaz:
- Mesaj metni
- E-posta
- Doğum tarihi
- Fotoğraf URL
- Hassas tercihler

Bu kural logging yardımcı fonksiyonlarla ve code review checklist ile zorunlu kılınır.

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** Firebase Consent Mode integration design, legal review (analytics tracking under KVKK)
- **Release blockers:** Analytics data collection must comply with KVKK — legal review required before production.
- **Last reviewed:** 2026-07-06
