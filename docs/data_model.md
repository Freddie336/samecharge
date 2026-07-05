# SameCharge Veri Modeli Dokümanı

- **Amaç:** Firestore koleksiyonları, RTDB presence şeması ve erişim sınırlarını tanımlamak.
- **Kapsam:** SameCharge veritabanı şeması.
- **Son Güncelleme:** 2026-07-06

> **Temel ilke:** Firestore Security Rules **belge düzeyinde** okuma/yazma kontrolü sağlar; alan düzeyinde kısmi okuma garantisi vermez. Bu nedenle aynı belgede hem sahip-okuyabilir hem de yalnızca-sunucu alanları **bulundurulamaz**. Her belge tek bir erişim sınıfına sahip olmalıdır.

> **İstemci erişim yasağı:** İstemci `profiles` koleksiyonunu toplu veya tekil doğrudan okuyamaz. Aday profil bilgileri yalnızca `startDiscovery` CandidateView DTO veya aktif match üzerinden iletilir.

---

## 1. `users_private/{uid}`
**Erişim sınıfı:** Yalnızca Admin SDK. Sahip dahil hiçbir istemci bu belgeyi doğrudan okuyamaz veya yazamaz.

Kullanıcının kimlik ve yaş doğrulamasında gereken kişisel alanları içerir. Uygulamada gösterilecek e-posta Firebase Auth oturumundan; rıza özeti ise `getAppBootstrap` içindeki sanitized `consentSummary` alanından alınır.

| Alan | Tür | Sahip | Açıklama |
|---|---|---|---|
| `email` | String | Server (`completeOnboarding`) | Firebase Auth e-postasının sunucu kopyası |
| `birthDate` | String (YYYY-MM-DD) | **Server only** | Yaş hesaplaması; istemciye döndürülmez |
| `consentSummary` | Map | Server | Rıza türü → son sürüm, granted ve recordedAt özeti |
| `createdAt` | Timestamp | Server | — |

> Firestore belge düzeyinde okuma yaptığı için bu belgede owner-readable alan bulunmaz.

## 2. `users_internal/{uid}`
**Erişim sınıfı:** Yalnızca Admin SDK. İstemci veya sahip okuyamaz.
Hesap durumu, güvenlik sinyalleri, iç notlar.

| Alan | Tür | Sahip | Açıklama |
|---|---|---|---|
| `accountStatus` | String enum (`active\|suspended\|deletion_pending\|deleted`) | **Server only** | `getAppBootstrap` üzerinden sanitized bilgi döner |
| `deletionRequestedAt` | Timestamp? | **Server only** | — |
| `suspensionReason` | String? | **Server only** | — |
| `riskScore` | Number | **Server only** | İstemciye hiçbir zaman gönderilmez |
| `moderationNotes` | String? | **Server only** | — |
| `lastLoginAt` | Timestamp | Server | Auth token auth_time üzerinden de izlenir |

---

## 3. `profiles/{uid}`
**Erişim sınıfı:** Yalnızca Admin SDK. İstemci bu koleksiyonu doğrudan okuyamaz veya yazamaz.

Bu belge yalnızca **canlı/onaylanmış profil kopyasını** ve genel profil durumunu tutar. Kullanıcının yeni değişiklikleri doğrudan bu alanların üzerine yazılmaz; önce `profile_revisions` altında moderasyona girer.

| Alan | Tür | Sahip | Açıklama |
|---|---|---|---|
| `displayName` | String? | Server | Son onaylı değer; ilk onay öncesi null olabilir |
| `cityId` | String? | Server | Son onaylı değer |
| `bio` | String? | Server | Son onaylı değer |
| `interests` | String[] | Server | Son onaylı değer |
| `intent` | String? | Server | Son onaylı değer |
| `photoIds` | String[] | Server | Yalnızca `approved` fotoğraflar |
| `profileStatus` | String enum (`draft\|pending\|approved\|rejected\|needs_review`) | **Server only** | Sanitized biçimde callable response içinde döner |
| `activeRevisionId` | String? | Server | Bekleyen/draft revizyon referansı |
| `completionScore` | Number | **Server only** | — |
| `createdAt` | Timestamp | Server | — |
| `updatedAt` | Timestamp | Server | — |

CandidateView ve match profili yalnızca bu belgedeki onaylı canlı alanları kullanır.

## 4. `profile_revisions/{uid}/items/{revisionId}`
**Erişim sınıfı:** Yalnızca Admin SDK. İstemci `getMyProfile`, `updateProfile` ve `submitProfileForReview` üzerinden sanitized DTO kullanır.

| Alan | Tür | Sahip | Açıklama |
|---|---|---|---|
| `ownerId` | String | Server | Auth UID |
| `proposedDisplayName` | String | Kullanıcı → callable | Önerilen değer |
| `proposedCityId` | String | Kullanıcı → callable | Önerilen değer |
| `proposedBio` | String | Kullanıcı → callable | Önerilen değer |
| `proposedInterests` | String[] | Kullanıcı → callable | Önerilen değer |
| `proposedIntent` | String | Kullanıcı → callable | Önerilen değer |
| `status` | String enum (`draft\|pending\|approved\|rejected\|needs_review`) | **Server only** | Revizyon moderasyon durumu |
| `reasonCode` | String? | **Server only** | Kullanıcıya gösterilebilen genel kod |
| `baseProfileUpdatedAt` | Timestamp? | Server | Çakışma denetimi |
| `createdAt` | Timestamp | Server | — |
| `submittedAt` | Timestamp? | Server | — |
| `resolvedAt` | Timestamp? | Server | — |

**Yayınlama davranışı:** Onaylanmış profil varken yeni revizyon `pending` olsa bile eski canlı profil görünmeye devam eder. Revizyon `approved` olduğunda sunucu proposed alanları transaction ile `profiles/{uid}` belgesine kopyalar. Reddedilirse canlı profil değişmez.

---

## 5. `preferences/{uid}`
**Erişim sınıfı:** Yalnızca sahibi + Admin SDK.

| Alan | Tür | Sahip | Açıklama |
|---|---|---|---|
| `selfGender` | String (`male\|female\|nonbinary\|unspecified`) | Kullanıcı | MVP'de zorunlu değil; varsayılan `unspecified` |
| `shownGenderPreferences` | String[] (`male|female|nonbinary|unspecified`) | Kullanıcı | Boşsa tüm değerler kabul edilir; doluysa hedef cinsiyet listede olmalıdır |
| `minAge` | Number | Kullanıcı | — |
| `maxAge` | Number | Kullanıcı | — |
| `cityIds` | String[] | Kullanıcı | — |
| `intentPreferences` | String[] | Kullanıcı | — |
| `discoveryEnabled` | Boolean | Kullanıcı + **Server** | Hesap silme/askıya alma anında Server `false` yazar |
| `updatedAt` | Timestamp | Server | — |

**Not:** `discoveryEnabled` alanı `profiles` belgesinde **değil**, `preferences/{uid}` içindedir. Hesap `deletion_pending` veya `suspended` durumuna geçtiğinde sunucu bu alanı `false` yazar.

---

## 6. `profile_photos/{photoId}`
**Erişim sınıfı:** Admin SDK. İstemciye `getMyProfile` üzerinden sanitized DTO döner; ham belge okunmaz.

| Alan | Tür | Sahip | İstemciye gösterilir mi? |
|---|---|---|---|
| `ownerId` | String | Server | ✅ (kendi fotoğrafı için) |
| `storagePath` | String | **Server only** | ❌ |
| `status` | String enum (`temporary\|processing\|pending\|approved\|rejected\|failed\|needs_review`) | **Server only** | ✅ (sanitized: sadece durum kodu) |
| `moderationReason` | String? | **Server only** | ✅ (yalnızca reason code, not moderator note) |
| `fileSizeBytes` | Number | **Server only** | ❌ |
| `mimeType` | String | **Server only** | ❌ |
| `imageWidthPx` | Number | **Server only** | ❌ |
| `thumbnailPath` | String? | **Server only** | ❌ |
| `createdAt` | Timestamp | Server | ✅ |

**İstemciye `getMyProfile`/`getAppBootstrap` aracılığıyla dönen sanitized fotoğraf DTO:**
```json
{ "photoId": "...", "status": "pending|approved|rejected|needs_review|failed", "reasonCode": "...", "signedUrl": "..." }
```
`storagePath`, `mimeType`, `fileSizeBytes` asla iletilmez.

---

## 7. `discovery_sessions/{sessionId}`
**Erişim sınıfı:** Admin SDK.

| Alan | Tür | Sahip |
|---|---|---|
| `ownerId` | String | Server |
| `status` | String enum (`active\|closed\|expired`) | **Server only** |
| `requestedRange` | Number | Server |
| `createdAt` | Timestamp | Server |
| `expiresAt` | Timestamp | Server |

---

## 8. `discovery_sessions/{sessionId}/candidates/{candidateHash}`
**Erişim sınıfı:** Yalnızca Admin SDK.
**TTL:** `expiresAt` sonrası Cloud Function cleanup ile silinir.

| Alan | Tür | Açıklama |
|---|---|---|
| `tokenHash` | String (SHA-256) | Ham token saklanmaz |
| `candidateId` | String | — |
| `issuedAt` | Timestamp | — |
| `expiresAt` | Timestamp | — |
| `usedAt` | Timestamp? | `like\|pass` kararı sonrasında |
| `decision` | String? (`like\|pass`) | — |
| `batteryDifference` | Number | — |
| `revoked` | Boolean | — |
| `reportTokenHash` | String (SHA-256) | Pre-match rapor için ayrı opaque tokenın hash’i; ham token saklanmaz |
| `reportUsedAt` | Timestamp? | Rapor tokenı kullanıldığında işaretlenir |

**`reportTokenHash`** candidate token hash’inden bağımsızdır. `reportContent` ham `reportToken` değerini hashleyip karşılaştırır; rapor işlemi karar tokenının `usedAt` alanını değiştirmez.

---

## 9. `discovery_sessions/{sessionId}/exposures/{candidateId}`
**Erişim sınıfı:** Yalnızca Admin SDK.
TTL'li gösterim geçmişi.

| Alan | Tür |
|---|---|
| `shownAt` | Timestamp |
| `expiresAt` | Timestamp (TTL) |

---

## 10. `discovery_decisions/{decisionId}`
**Erişim sınıfı:** Yalnızca Admin SDK.
`decisionId` = `{actorId}_{candidateId}` — deterministik ve idempotent. Lifetime boyunca tek karar.

| Alan | Tür | Sahip |
|---|---|---|
| `actorId` | String | Server |
| `candidateId` | String | Server |
| `sessionId` | String | Server |
| `decision` | String (`like\|pass`) | Server |
| `createdAt` | Timestamp | Server |

**Pass kararının kalıcılığı:** Pass kararı varsayılan olarak kalıcıdır (aynı `decisionId` yeniden oluşturulamaz). Süre bazlı yeniden gösterim (pass cooldown/reconsideration) açık bir ürün kararıdır: **OD-013**.

**İstemci bu koleksiyona doğrudan yazamaz.**

---

## 11. `matches/{pairKey}`
**Erişim sınıfı:** Yalnızca iki üye okuyabilir; yalnızca server yazar.
`pairKey` = iki UID lexicographic sırayla hashlenmiş deterministik anahtar.

| Alan | Tür | Sahip |
|---|---|---|
| `memberIds` | String[2] | Server |
| `matchedBatteryLevelA` | Number | Server |
| `matchedBatteryLevelB` | Number | Server |
| `createdAt` | Timestamp | Server |
| `status` | String enum (`active\|unmatched\|blocked`) | **Server only** |
| `messagingEnabled` | Boolean | **Server only** |
| `blockedBy` | String? | **Server only** |
| `unmatchedBy` | String? | **Server only** |
| `lastMessageAt` | Timestamp? | Server |

---

## 12. `matches/{pairKey}/member_state/{uid}`
**Erişim:** İlgili üye kendi belgesini okuyabilir. Başka üye okuyamaz.

| Alan | Tür | Sahip | Yazma yöntemi |
|---|---|---|---|
| `lastReadAt` | Timestamp? | İlgili üye | `markMatchRead` callable |
| `muted` | Boolean | İlgili üye | `setMatchMuted` callable |
| `unreadCount` | Number | **Server only** | Sunucu artırır; istemci doğrudan yazamaz |

**İstemci doğrudan Firestore'a yazamaz. `lastReadAt` ve `muted` yalnızca callable üzerinden güncellenir.**

---

## 13. `matches/{pairKey}/messages/{messageId}`
**Erişim sınıfı:** Yalnızca aktif/geçmiş match üyeleri politika kapsamında okuyabilir; yalnızca `sendMessage`/server yazar.

| Alan | Tür | Sahip |
|---|---|---|
| `senderId` | String | Server |
| `type` | String (`text`) | Server |
| `text` | String | Server (normalized) |
| `clientMessageId` | String | İstemci (idempotency) |
| `createdAt` | Timestamp | Server |
| `moderationStatus` | String (`clean\|flagged\|blocked`) | **Server only** |
| `anonymizedAt` | Timestamp? | Server (silme sonrası) |

---

## 14. `blocks/{uid}/blocked/{blockedUid}`
**Erişim sınıfı:** Sahibi kendi blok listesini okuyabilir; yalnızca `blockUser`/server yazar.

| Alan | Tür |
|---|---|
| `blockedAt` | Timestamp |
| `matchId` | String? |

---

## 15. `reports/{reportId}`
**Erişim sınıfı:** Ham belge yalnızca Admin SDK; kullanıcıya gerekirse sanitized durum callable ile döner.
İstemci `reportedUserId` değerini **göndermez**; sunucu pre-match `reportToken`, match veya mesaj bağlamından türetir.

| Alan | Tür | Kaynak |
|---|---|---|
| `reporterId` | String | Server (auth) |
| `reportedUserId` | String | **Server only** (reportToken/match/message bağlamından türetilir) |
| `context` | String (`pre_match\|match\|message`) | İstemci |
| `sourceCandidateHash` | String? | Server (pre-match bağlamında; ham token saklanmaz) |
| `matchId` | String? | İstemci (match/message bağlamında) |
| `messageId` | String? | İstemci (message bağlamında) |
| `category` | String | İstemci |
| `reporterNote` | String? | İstemci (max 500 char) |
| `status` | String (`pending\|resolved`) | **Server only** |
| `moderationCaseId` | String? | **Server only** |
| `createdAt` | Timestamp | Server |

---

## 16. `moderation_cases/{caseId}`
**Erişim sınıfı:** Yalnızca yetkili moderasyon rolleri / Admin SDK.

| Alan | Tür |
|---|---|
| `reportId` | String |
| `reportedUserId` | String |
| `reporterId` | String |
| `category` | String |
| `messageSnapshot` | Map (değiştirilemez) |
| `contextSnapshotBefore` | Map[] |
| `contextSnapshotAfter` | Map[] |
| `status` | String enum (`open\|in_review\|actioned\|dismissed\|appealed\|closed`) |
| `assignedModeratorId` | String? |
| `resolution` | String? |
| `createdAt` | Timestamp |
| `resolvedAt` | Timestamp? |

---

## 17. `push_tokens/{uid}/tokens/{tokenId}`
**Erişim sınıfı:** Yalnızca Admin SDK; kayıt/güncelleme `registerPushToken` üzerinden.

| Alan | Tür |
|---|---|
| `token` | String |
| `platform` | String (`android\|ios`) |
| `appVersion` | String |
| `registeredAt` | Timestamp |
| `lastSeenAt` | Timestamp |
| `active` | Boolean |

---

## 18. `notification_preferences/{uid}`
**Erişim sınıfı:** Sahibi okuyabilir; yalnızca `updateNotificationPreferences`/server yazar.

| Alan | Tür |
|---|---|
| `newMatch` | Boolean |
| `newMessage` | Boolean |
| `systemAnnouncements` | Boolean |
| `marketingNotifications` | Boolean |
| `updatedAt` | Timestamp |

---

## 19. `rate_limits/{uid}`
**Erişim sınıfı:** Admin SDK only.

| Alan | Tür |
|---|---|
| `dailyDiscoveryCount` | Number |
| `dailyDecisionCount` | Number |
| `dailyMessageCount` | Number |
| `lastResetAt` | Timestamp |
| `windowCounts` | Map (function → count) |

---

## 20. `deletion_jobs/{jobId}`
**Erişim sınıfı:** Yalnızca Admin SDK.

| Alan | Tür |
|---|---|
| `uid` | String |
| `status` | String enum (`created\|running\|partially_failed\|completed`) |
| `steps` | Map[] (adım adı, durum, hata) |
| `requestedAt` | Timestamp |
| `startedAt` | Timestamp? |
| `completedAt` | Timestamp? |
| `lastError` | String? |

**Silme iş adımları (sıralı):**
1. `preferences.discoveryEnabled = false`
2. `matches` — açık matchler için `messagingEnabled = false`
3. `push_tokens/{uid}` silinir
4. RTDB `presence/{uid}` silinir
5. `profiles/{uid}` anonymize veya silinir (retention kuralına göre)
6. `preferences/{uid}` anonymize veya silinir
7. `profile_photos` storage dosyaları ve belgeler silinir
8. `users_private/{uid}` silinir
9. `users_internal/{uid}` minimum tombstone kaydına indirilir (`accountStatus=deleted`) veya hukuk kararına göre silinir
10. Firebase Auth hesabı silinir (en son adım)

---

## 21. `consent_history/{uid}/records/{recordId}`
**Erişim sınıfı:** Sahibi kendi kayıtlarını okuyabilir; yalnızca server yazar.

| Alan | Tür |
|---|---|
| `consentType` | String (`terms\|privacy\|explicit_data\|analytics\|marketing`) |
| `version` | String |
| `granted` | Boolean |
| `recordedAt` | Timestamp |
| `ipRegion` | String? (ülke düzeyi) |

---

## 22. `entitlements/{uid}`
**Erişim sınıfı:** Admin SDK.

| Alan | Tür | Sahip |
|---|---|---|
| `premiumActive` | Boolean | **Server only** |
| `expiresAt` | Timestamp? | **Server only** |
| `grantedAt` | Timestamp? | Server |

---

## 23. `audit_logs/{logId}`

| Alan | Tür |
|---|---|
| `adminId` | String |
| `adminRole` | String |
| `action` | String |
| `targetId` | String |
| `previousState` | Map |
| `newState` | Map |
| `reason` | String? |
| `createdAt` | Timestamp |

---

## 24. RTDB — Presence (`presence/{uid}`)
**Okuma kuralları:**
- Kullanıcı yalnızca kendi `presence/{auth.uid}` kaydını okuyabilir.
- Kullanıcı başka UID kaydını okuyamaz ve `presence` kökünde liste sorgusu yapamaz.
- Matchmaking sunucusu tüm kayıtları yalnızca Admin SDK ile okur.

**Yazma kuralları:**
- Kullanıcı yalnızca kendi kaydındaki izinli istemci alanlarını yazabilir.
- `cityId` ve `profileEligible` yalnızca sunucu tarafından yazılır.
- `lastSeenAt`, RTDB ServerValue timestamp kullanılarak yazılır ve Rules tarafından sayı/monotonluk doğrulamasından geçirilir.

| Alan | Tür | İstemci yazabilir mi? | Açıklama |
|---|---|---|---|
| `online` | Boolean | Kendi kaydında evet | `onDisconnect().set(false)` |
| `batteryLevel` | Number (0-100) | Kendi kaydında evet | Rules aralık doğrulaması |
| `batteryState` | String (`charging\|discharging\|full\|unknown`) | Kendi kaydında evet | Enum doğrulaması |
| `lastSeenAt` | Number (server timestamp ms) | ServerValue ile | İstemci keyfi geçmiş/gelecek değer yazamaz |
| `appVersion` | String | Kendi kaydında evet | Uzunluk/format sınırı |
| `cityId` | String | Hayır | Server, onaylı profil/tercihten kopyalar |
| `profileEligible` | Boolean | Hayır | Server hesaplar |

> RTDB Rules testleri; çapraz UID okuma, kök listeleme, server-owned alan yazma ve sahte timestamp denemelerini reddetmelidir.

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** technical spike (Firestore index, TTL cleanup), legal review (retention durations)
- **Release blockers:** Retention durations TBD_LEGAL_REVIEW; document-level access separation must be verified in security rules before production.
- **Last reviewed:** 2026-07-06
