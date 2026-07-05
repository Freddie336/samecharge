# SameCharge Kişisel Veri Haritası (GDPR / KVKK)

- **Amaç:** Sistemde saklanan verilerin sınıflandırılması, erişim sınırları ve uyumluluk haritası.
- **Kapsam:** SameCharge veri katmanları.
- **Son Güncelleme:** 2026-07-06

---

## 1. Veri Erişim Kural Özeti

| Kural | Açıklama |
|---|---|
| İstemci `profiles` okuyamaz | Profil verisi yalnızca CandidateView DTO veya aktif match üzerinden iletilir |
| İstemci başka kullanıcıların RTDB presence kaydını okuyamaz | Kullanıcı yalnızca kendi kaydını okuyabilir/yazabilir; listeleme yasaktır |
| Fotoğraflar public URL değil | Kısa süreli imzalı URL üretilir; sunucu üzerinden iletilir |
| Rıza ayrı ayrı alınır | Her rıza türü ayrı kayıtla saklanır; tek checkbox kullanılmaz |
| `users_private` doğrudan okunmaz | Belge Admin SDK only; uygulama Auth ve sanitized callable response kullanır |
| Presence çapraz okunmaz | Kullanıcı yalnızca kendi kaydını okuyabilir/yazabilir; listeleme ve başka UID okuma yasak |

---

## 2. Veri Sınıflandırma Tablosu

| Veri | Yol | Kategori | Okuma İzni | Yazma İzni | Yasal Dayanak |
|---|---|---|---|---|---|
| E-posta | Firebase Auth + `users_private/{uid}` | Kişisel | Auth oturumu / Server; Firestore belgesi Admin only | Server | `TBD_LEGAL_REVIEW` |
| Doğum Tarihi | `users_private/{uid}` | Kişisel | Yalnızca Server | Server | `TBD_LEGAL_REVIEW` (18+ kontrolü) |
| Profil alanları | `profile_revisions` → onay sonrası `profiles/{uid}` | Kişisel | CandidateView / Match / kendi sanitized DTO | Callable + Server | `TBD_LEGAL_REVIEW` |
| Profil Fotoğrafı | `profile_photos` (→ imzalı URL) | Kişisel | Kısa süreli URL / Server | Server | Açık Rıza / Alenileştirme |
| Kendi Cinsiyeti | `preferences/{uid}.selfGender` | Potansiyel özel nitelikli veri | Yalnızca sahibi / Server | Kullanıcı | `TBD_LEGAL_REVIEW` |
| Dating Tercihleri | `preferences/{uid}` | Potansiyel özel nitelikli veri | Yalnızca sahibi / Server | Kullanıcı | `TBD_LEGAL_REVIEW` |
| Batarya Seviyesi | `presence/{uid}` (RTDB) | Teknik/Geçici | Kendi kaydı / Server; başka UID yasak | Kullanıcı (kendi izinli alanları) | `TBD_LEGAL_REVIEW` |
| Sohbet Mesajları | `matches/{pairKey}/messages` | Kişisel/Gizli | Eşleşen 2 üye / Server | Server (`sendMessage`) | Sözleşme |
| Şikâyet Kaydı | `reports` + `moderation_cases` | Kişisel | Yalnızca Server / Admin | Server | Meşru Menfaat |
| Rıza Geçmişi | `consent_history/{uid}/records` | Kişisel | Yalnızca sahibi / Server | Server | Hukuki Yükümlülük |
| Push Token | `push_tokens/{uid}/tokens` | Teknik | Yalnızca Server | Server (`registerPushToken`) | Sözleşme / Açık Rıza |
| Denetim Günlüğü | `audit_logs` | Teknik (Değişmez) | Yalnızca Admin | Server | Meşru Menfaat / Hukuk |
| Silme İş Kaydı | `deletion_jobs` | Operasyonel | Yalnızca Server | Server | Hukuki Yükümlülük |

---

## 3. Rıza Türleri ve Kayıt Yapısı

Her rıza türü ayrı `consent_history/{uid}/records/{recordId}` belgesi olarak saklanır:

| Rıza Türü (`consentType`) | Açıklama | Zorunlu |
|---|---|---|
| `terms` | Kullanım Koşulları | Evet |
| `privacy` | Gizlilik / Aydınlatma Metni | Evet |
| `explicit_data` | Hassas veri işleme açık rızası | Evet |
| `analytics` | Firebase Analytics | Hayır |
| `marketing` | Pazarlama Push bildirimleri | Hayır |

Her kayıt: `consentType`, `version`, `granted`, `recordedAt`, `ipRegion` (ülke seviyesi) içerir.

---

## 4. Hassas Veri Koruma Prensipleri

- **Doğum tarihi:** Public profilde saklanmaz. Yaş hesaplaması yalnızca sunucuda yapılır.
- **Konum:** Detaylı GPS toplanmaz; şehir bazlı eşleşme.
- **Cinsiyet:** `selfGender` alanı `preferences/{uid}` içinde tutulur, public profile'a dahil edilmez.
- **Analitik:** UID, kesin yaş, doğum tarihi, fotoğraf URL analitik olaylara yazılmaz.

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** legal review (KVKK Verbis kaydı, veri sorumlusu atanması, yasal dayanakların onayı)
- **Release blockers:** Legal review of privacy policy and consent model required before production. TBD_LEGAL_REVIEW on all retention durations.
- **Last reviewed:** 2026-07-06
