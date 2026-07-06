# SameCharge Ürün Gereksinimleri Dokümanı (PRD)

- **Amaç:** MVP kapsam, 18+ kuralları ve altyapı kısıtlamalarını tanımlamak.
- **Son Güncelleme:** 2026-07-06

---

## 1. Ürün Tanımı

SameCharge, 18 yaşından büyük kullanıcıların anlık batarya yüzdelerine göre eşleştiği bir dating uygulamasıdır.

---

## 2. Hedef Kullanıcı

- 18+ yaşında, dating veya sosyal etkileşim arayan mobil kullanıcılar.
- Kapalı beta: İstanbul odaklı, davetli kullanıcı grubu.

---

## 3. Rıza Modeli

Tek checkbox kullanılmaz. Her rıza türü ayrı checkbox ile alınır:

| Rıza Türü | `consentType` | Zorunluluk | Açıklama |
|---|---|---|---|
| Kullanım Koşulları | `terms` | **Zorunlu** | Hizmet sözleşmesi |
| Gizlilik / Aydınlatma | `privacy` | **Zorunlu** | KVKK m.10 aydınlatma |
| Açık Rıza (hassas veri) | `explicit_data` | **Zorunlu** (yasal incelemeye bağlı) | Özel nitelikli dating verisi işleme |
| Analitik Tercihi | `analytics` | **İsteğe bağlı** — `false` olabilir | Firebase Analytics |
| Pazarlama Bildirimleri | `marketing` | **İsteğe bağlı** — `false` olabilir | Promosyonel push |

`analytics` ve `marketing` false olduğunda onboarding engellenmez.
Server validation yalnızca `terms`, `privacy`, `explicit_data` türlerinin `granted: true` olmasını kontrol eder.
Consent version değeri canonical legal document version ID'sidir; lowercase, slash içermeyen, 1-64 ASCII karakterli güvenli ID formatına uymalıdır. Her consent type en fazla bir kez gönderilebilir; optional consent yoksa granted varsayılmaz.

---

## 4. Güvenlik Kararları

1. İstemci `profiles` koleksiyonunu doğrudan okuyamaz.
2. İstemci RTDB presence listesini okuyamaz.
3. Aday bilgileri yalnızca `startDiscovery` CandidateView DTO üzerinden iletilir.
4. Candidate token kısa ömürlü, hashlenmiş, tek kullanımlık.
5. Like/pass yalnızca `submitDiscoveryDecision` üzerinden yapılır.
6. Match yalnızca sunucu tarafından deterministik pairKey ile oluşturulur.
7. Block ve unmatch sonrası MVP'de aynı çift yeniden aday gösterilmez (OD-002).
8. Onaylanmamış fotoğraf discovery ve match profiline dahil edilmez.
9. Fotoğraflar kalıcı public URL ile sunulmaz; imzalı kısa süreli URL kullanılır.
10. `reportContent` istemciden `reportedUserId` almaz; sunucu türetir.
11. Retention süreleri TBD_LEGAL_REVIEW ve server-configurable.
12. App Check tek başına tam güvenlik sağlamaz.
13. Analitik olaylarda UID, candidate ID, kesin yaş, doğum tarihi, mesaj metni bulunmaz.
14. Rıza türleri tek checkbox altında birleştirilmez.
15. Server-owned state alanlarına istemci doğrudan yazamaz.
16. `requestAccountDeletion`'da sunucu ID token `auth_time` değerini doğrular; istemci beyanına güvenilmez.
17. Aynı belgede hem owner-readable hem server-only alanlar bulundurulamaz; Firestore field-level partial read yoktur.
18. `users_private` Admin SDK only'dir; istemci sanitized callable/Auth verisi kullanır.
19. Pre-match rapor için decision tokenından ayrı `reportToken` kullanılır ve veritabanında yalnızca `reportTokenHash` saklanır.
20. RTDB presence üzerinde çapraz UID okuma ve kök listeleme yasaktır.

---

## 5. MVP Kapsamı

### 5.1 Kimlik Doğrulama
- E-posta/şifre ve Google Sign-In.
- 18+ istemcide ön kontrol; kesin doğrulama `completeOnboarding` içinde.

### 5.2 Profil
- Görüntülenen ad, şehir, bio, ilgi alanları, amaç, cinsiyet.
- Onboarding metinleri canonical doğrulanır: `displayName` NFKC + trim + whitespace collapse sonrası 2-30 Unicode code point; `bio` NFKC + trim sonrası 0-300 Unicode code point.
- İlgi alanları lokalize etiket değil canonical interest ID dizisidir: 0-10 unique lowercase slug, her ID 1-32 ASCII karakter ve `^[a-z0-9]+(?:_[a-z0-9]+)*$` formatında.
- Şehir, kullanıcı metni değil canonical `cityId` değeridir. Kapalı beta teknik allowlist'i yalnızca `istanbul` içerir; İstanbul dışına genişleme kararı ürün doğrulamasına bağlıdır.
- `selfGender`: MVP'de zorunlu değil; varsayılan `unspecified`. Bu değer diğer kullanıcının cinsiyet filtresini bypass etmez.
- Onboarding için en az bir finalize edilmiş fotoğraf gerekir; fotoğraf `pending` olabilir. Discovery için en az bir `approved` fotoğraf zorunludur.
- En fazla 4 aktif fotoğraf.
- Profil metin değişiklikleri canlı alanların üzerine yazılmaz; `profile_revisions` moderasyonundan sonra yayınlanır.
- Profil düzenleme: `updateProfile`, `submitProfileForReview`, `deleteProfilePhoto`, `reorderProfilePhotos`.

### 5.3 Batarya Takibi
- Foreground only. 45 saniyelik heartbeat.

### 5.4 Discovery
- Tüm mantık sunucu taraflı. `startDiscovery` callable.
- Pass kararı varsayılan kalıcı (OD-013).

### 5.5 Eşleşme ve Sohbet
- Match yalnızca sunucu transaction ile.
- `sendMessage` callable; doğrudan Firestore yazımı yasaktır.
- `member_state` (unreadCount, lastReadAt, muted) yalnızca callable üzerinden güncellenir.

---

## 6. MVP Dışında Kalanlar

- Sohbet içi medya (fotoğraf, video, ses).
- Arka plan batarya takibi.
- Premium özellikler (Remote Config ile kapalı).
- Reklam gösterimi.

---

## 7. Onboarding Ekran Sırası

Splash → Walkthrough → 18+ Onayı → Kayıt/Giriş → Doğum Tarihi → Amaç → Cinsiyet & Tercihler (isteğe bağlı) → Şehir → Fotoğraflar → Bio & İlgi Alanları → Rıza Adımları (5 ayrı) → Ana Ekran.

---

## 8. Başarı Metrikleri (Kapalı Beta)

- DAU ve haftalık tutma.
- Eşleşme oranı (match per discovery session).
- İlk mesaj süresi.
- Boş havuz oranı.
- Şikayet ve engelleme oranları.

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** legal review (consent model, KVKK), user interviews
- **Release blockers:** Legal review of ToS, Privacy, explicit_data consent required before production.
- **Last reviewed:** 2026-07-06
