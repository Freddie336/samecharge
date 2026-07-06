# SameCharge Moderasyon Politikası

- **Amaç:** Profil, fotoğraf ve içerik doğrulama kurallarını tanımlamak.
- **Son Güncelleme:** 2026-07-06

---

## 1. Fotoğraf Yükleme Akışı

```
Kullanıcı fotoğraf seçer
→ İstemcide UX amaçlı boyutlandırma (güvenlik garantisi DEĞİL)
→ Cloud Storage temp_uploads/{uid}/ klasörüne yükleme
→ finalizeProfilePhoto callable çağrılır
→ Sunucu: MIME header + gerçek dosya içeriği birlikte doğrulanır
→ Sunucu: Görsel bomba ve aşırı çözünürlük kontrolleri
→ Sunucu: Metadata ve EXIF sıfırdan temizlenir
→ Sunucu: WebP/JPEG yeniden encode
→ Kalıcı Cloud Storage yoluna taşır: profile_photos/{uid}/{photoId}.webp
→ Firestore metadata belgesi oluşturur: profile_photos/{photoId}, status='pending'
→ Moderasyon kararı: approved | rejected | needs_review
→ Sadece approved fotoğraflar CandidateView ve match profiline dahil edilir
```

**Not:** `needs_review` durumu moderatörün bir üst incelemeye sevk ettiğini gösterir. Data model, moderation_policy ve state_machines'de `needs_review` fotoğraf durum enum'una dahildir.

---

## 2. Fotoğraf Durum Enum

`temporary | processing | pending | approved | rejected | failed | needs_review`

**Tüm bu değerler state_machines.md ve data_model.md ile tutarlıdır.**

---

## 3. Sunucu Taraflı Doğrulama Kontrolleri

- **Sahiplik:** Yükleme yapan UID ile dosya yolu eşleşmesi.
- **Boyut:** Maksimum 5 MB.
- **MIME:** Header bildirilen tip ile gerçek dosya birlikte kontrol edilir.
- **Görsel bomba:** Decode boyutu bellek güvenli limitler içinde kontrol edilir.
- **Çözünürlük:** Maksimum piksel boyutu sınırlandırılır.
- **EXIF/metadata:** Decode + yeniden encode sürecinde tüm metadata sıfırlanır.
- **Format:** Çıktı WebP veya JPEG.
- **Idempotency:** Aynı `photoId` için ikinci çağrı duplicate oluşturmaz.

---

## 4. Storage Rules

```
temp_uploads/{uid}/   → Yalnızca sahibi yazabilir, max 5 MB, JPEG/PNG/WebP
profile_photos/{uid}/ → Cloud Storage permanent object prefix; yalnızca Admin SDK (Cloud Functions) yazabilir
```

Onaylanmış fotoğraflara doğrudan public URL erişimi kapalıdır. Erişim yalnızca kısa süreli imzalı URL ile sağlanır.

Firestore metadata için canonical document path `profile_photos/{photoId}` değeridir. Firestore altında `profile_photos/{uid}/{photoId}` kullanılmaz. İlişki alanları: Firestore document ID `photoId`, Firestore `ownerId` alanı `uid`, Firestore `storagePath` alanı `profile_photos/{uid}/{photoId}.webp`. İstemci permanent path'i veya Firestore metadata belgesini kendisi belirlemez; `finalizeProfilePhoto` server tarafında oluşturur.

---

## 5. Profil Durumu Geçişleri

Bkz. `state_machines.md` — Photo Durumu bölümü.

---

## 6. İçerik Moderasyon Red Kriterleri

- Çıplaklık veya aşırı cinsel poz
- Şiddet, kan, silah
- Nefret söylemi
- Reşit olmayan görünüm
- Tanınmış kişi fotoğrafı / sahte kimlik
- Net yüz görünmüyor
- Yanıltıcı veya reklam içeriği

---

## 7. Kullanıcı Bildirimi

Redde uğrayan kullanıcıya genel sebep kodu gösterilir; ham moderatör notu iletilmez:
- `face_not_visible` → "Net yüzünüzün göründüğü bir fotoğraf yükleyiniz."
- `inappropriate_content` → "Fotoğraf topluluk kurallarına uygun değil."
- `identity_mismatch` → "Fotoğraf sahipliğini doğrulayamadık."

---

## 8. Otomatik Görüntü Analizi (Opsiyonel)

Cloud Vision API veya benzer bir ML servisiyle otomatik güvenlik taraması kullanılıp kullanılmayacağı açık bir ürün kararıdır: **OD-008** (fotoğraf doğrulama seviyesi). Henüz uygulanmamıştır.

---

## 9. Mevcut Onaylı Fotoğrafların Davranışı

Kullanıcı yeni bir fotoğraf yüklediğinde:
- Mevcut `approved` fotoğraflar CandidateView ve match profilinde görünmeye devam eder.
- Yeni fotoğraf `pending` durumundadır; onaylanana kadar hiçbir adaya gösterilmez.
- Kullanıcı bir fotoğrafı sildiğinde (`deleteProfilePhoto`) o fotoğraf `pending` veya `approved` durumunda olsa bile anında listeden çıkar.

---

## 10. Profil Metni ve Alan Revizyonları

- `updateProfile` değişiklikleri doğrudan canlı `profiles` belgesine yazmaz; `profile_revisions` draftı oluşturur.
- `submitProfileForReview` revizyonu `pending` yapar.
- Kullanıcının onaylı profili varsa eski canlı içerik yeni revizyon sonuçlanana kadar CandidateView ve match profilinde kalır.
- Revizyon approved olduğunda alanlar transaction ile canlı profile kopyalanır; rejected olduğunda canlı profil değişmez.
- URL, iletişim bilgisi, taciz ve politika sinyalleri server-side moderasyona girer.

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** OD-008 (Cloud Vision / ML moderation) technical spike
- **Release blockers:** none
- **Last reviewed:** 2026-07-06
