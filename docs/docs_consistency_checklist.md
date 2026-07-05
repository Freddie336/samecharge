# SameCharge Dokümanlar Arası Tutarlılık Kontrol Listesi

- **Amaç:** Dokümanların veri yolu, erişim, API, state ve ürün davranışı açısından aynı sözleşmeyi kullanmasını sağlamak.
- **Son Güncelleme:** 2026-07-06

---

## 1. Kalıcı Doğrulama Kontrolleri

| Kontrol | Sonuç |
|---|---|
| `profiles` ve `profile_revisions` istemciden doğrudan okunamaz/yazılamaz | ✅ |
| `users_private` ve `users_internal` Admin SDK only | ✅ |
| Firestore document-level read sınırıyla çelişen kısmi okuma yok | ✅ |
| Profil değişiklikleri revizyon üzerinden moderasyona girer; canlı approved içerik korunur | ✅ |
| Onboarding pending fotoğrafla tamamlanabilir; discovery için approved fotoğraf gerekir | ✅ |
| `preferences.discoveryEnabled` doğru yoldadır; `profiles.discoveryEnabled` yoktur | ✅ |
| `profileStatus='deleted'` yok; silme durumu `users_internal.accountStatus` altındadır | ✅ |
| Silme worker'ı bütün belgelerde aynı 10 adımı kullanır | ✅ |
| Presence: kendi kayıt erişimi; çapraz UID okuma ve kök listeleme yasak | ✅ |
| Presence `cityId/profileEligible` server-only, `lastSeenAt` server timestamp | ✅ |
| `unspecified` diğer kullanıcının gender filtresini bypass etmez | ✅ |
| Decision `candidateToken` ve pre-match `reportToken` ayrıdır | ✅ |
| Veritabanında yalnızca `reportTokenHash` saklanır | ✅ |
| Rapor hedef alanı her yerde `reportedUserId`; istemciden alınmaz | ✅ |
| App Check tüm production client-callable fonksiyonlarda zorunlu | ✅ |
| `processAccountDeletion` yalnızca iç worker | ✅ |
| Retention süreleri `TBD_LEGAL_REVIEW` ve server-configurable | ✅ |
| Analytics içinde UID, exact age, mesaj metni ve fotoğraf yolu yok | ✅ |
| Tüm dokümanların cross-document status değeri `verified` | ✅ |

---

## 2. API / Ekran Eşleşmeleri

| Akış | API | Sonuç |
|---|---|---|
| Uygulama başlangıcı | `getAppBootstrap` | ✅ |
| Kendi profilini görüntüleme | `getMyProfile` | ✅ |
| Profil taslağı | `updateProfile` | ✅ |
| Revizyonu gönderme | `submitProfileForReview` | ✅ |
| Fotoğraf finalize/sil/sırala | `finalizeProfilePhoto`, `deleteProfilePhoto`, `reorderProfilePhotos` | ✅ |
| Discovery ve karar | `startDiscovery`, `submitDiscoveryDecision` | ✅ |
| Pre-match rapor | `reportContent` + `reportToken` | ✅ |
| Match/message rapor | `reportContent` + match/message referansı | ✅ |
| Mesaj/okundu/mute | `sendMessage`, `markMatchRead`, `setMatchMuted` | ✅ |
| Hesap silme | `requestAccountDeletion` → internal `processAccountDeletion` | ✅ |

---

## 3. State Enum Kontrolleri

| Varlık | Enum / geçiş özeti | Sonuç |
|---|---|---|
| Profile | `draft|pending|approved|rejected|needs_review` | ✅ |
| Profile revision | `draft|pending|approved|rejected|needs_review` | ✅ |
| Photo | `temporary|processing|pending|approved|rejected|failed|needs_review` | ✅ |
| Discovery session | `active|closed|expired` | ✅ |
| Candidate/report token | `issued|used|expired|revoked` | ✅ |
| Match | `active|unmatched|blocked` | ✅ |
| Account | `active|suspended|deletion_pending|deleted` | ✅ |
| Deletion job | `created|running|partially_failed|completed` | ✅ |

---

## 4. Pass 3'te Düzeltilen Çelişkiler

| ID | Önceki sorun | Çözüm |
|---|---|---|
| C-18 | Retention dosyasında eski `profiles.discoveryEnabled` ve `profileStatus='deleted'` kaldı | Yeni yol ve 10 adımlı worker ile düzeltildi |
| C-19 | `users_private` owner-readable iken `birthDate` server-only gösteriliyordu | Belge tamamen Admin SDK only yapıldı |
| C-20 | Presence “Admin only” denirken istemci yazarı da tanımlanıyordu | Ayrı read/write matrisi tanımlandı |
| C-21 | `unspecified` diğer kullanıcının cinsiyet filtresini bypass ediyordu | Boş liste veya açık `unspecified` üyeliği kuralı getirildi |
| C-22 | Onboarding approved fotoğraf bekliyordu | Pending fotoğrafla tamamlama, approved fotoğrafla discovery modeli getirildi |
| C-23 | Bio/ilgi alanı canlı profile doğrudan yazılabiliyordu | `profile_revisions` moderasyon modeli eklendi |
| C-24 | Hash alanı `reportToken` diye adlandırılmıştı | `reportTokenHash` ve `reportUsedAt` olarak düzeltildi |
| C-25 | `reportedId` / `reportedUserId` adları karışıktı | Her yerde `reportedUserId` kullanıldı |
| C-26 | Checklist verified iken bazı belgeler hâlâ sorunlu durumda görünüyordu | Bütün status blokları aynı sonuca getirildi |

---

## 5. Doğrulama Kapsamı

Bu `verified` sonucu yalnızca dokümanların birbirleriyle tutarlı olduğunu ifade eder. Aşağıdakileri tamamlanmış saymaz:

- Firebase Security Rules/emulator testleri
- Cloud Functions ve Flutter uygulaması
- App Check production testi
- Kullanıcı görüşmeleri
- Hukuk incelemesi
- Mağaza yayın hazırlığı

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** engineering, user and legal validation
- **Release blockers:** tracked in release_checklist.md
- **Last reviewed:** 2026-07-06
