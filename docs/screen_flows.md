# SameCharge Ekran Akışları Dokümanı

- **Amaç:** Uygulama içi ekran geçişleri, onboarding adımları ve edge-case davranışları tanımlamak.
- **Son Güncelleme:** 2026-07-06

---

## 1. Onboarding Akışı

### Ekran 1 — Splash
- **Amaç:** Auth durumunu arka planda kontrol etmek.
- **API:** Firebase Auth `.authStateChanges()`, sonrasında `getAppBootstrap`.
- **Yönlendirme:** Oturum yok → Walkthrough. Onboarding tamamlanmamış → Onboarding adımı. Profil onaylı → Home.

### Ekran 2 — Walkthrough
- **Gösterilen veri:** 3 slayt (değer önerisi). **Kullanıcı aksiyonu:** Kaydır veya "Başla".

### Ekran 3 — 18+ Yaş Onayı
- **Disabled:** Beyan kabul edilmeden devam engellenmiştir.

### Ekran 4 — Kayıt / Giriş
- **Error:** Stabil hata kodlarıyla (ham Firebase mesajı gösterilmez).

### Ekran 5 — Doğum Tarihi
- 18 yaş altı → hata, devam engellenir. Kesin doğrulama `completeOnboarding` sunucusundadır.

### Ekran 6 — Kullanım Amacı
- Seçenekler: Dating, Arkadaşlık, Sohbet.

### Ekran 7 — Cinsiyet ve Tercihler
- `selfGender` **isteğe bağlıdır**; varsayılan `unspecified`. Seçilmeden devam edilebilir.
- Gösterilecek cinsiyet tercihleri de isteğe bağlıdır; boşsa tüm cinsiyetler gösterilir.
- `selfGender` public profile'a dahil edilmez; `preferences/{uid}` içinde tutulur.

### Ekran 8 — Şehir Seçimi
- Arama destekli liste. Bağlantı hatası → offline uyarısı.

### Ekran 9 — Profil Fotoğrafları
- **Durum etiketleri:** boş, yükleniyor, pending ("İnceleniyor"), approved, rejected (sebep kodu), failed.
- **Disabled:** Yükleme hâlâ `temporary|processing` iken devam pasif. En az bir fotoğraf `pending|approved|needs_review` olduğunda devam edilebilir; approved sonucu onboarding içinde beklenmez.
- **Sonuç:** `completeOnboarding` sonrası profil `pending` olur. Discovery, en az bir fotoğraf approved olana kadar kapalıdır.
- **API:** `finalizeProfilePhoto`, durum yenileme için `getMyProfile`.

### Ekran 10 — Biyografi ve İlgi Alanları

### Ekran 11 — Rıza Adımları (5 Ayrı Checkbox)

| # | Rıza | Zorunlu |
|---|---|---|
| 1 | Kullanım Koşulları (`terms`) | **Evet** |
| 2 | Gizlilik Metni (`privacy`) | **Evet** |
| 3 | Açık Rıza — hassas veri (`explicit_data`) | **Evet** |
| 4 | Analitik tercihi (`analytics`) | **Hayır** |
| 5 | Pazarlama bildirimleri (`marketing`) | **Hayır** |

- Hayır olan seçenekler `false` olarak kaydedilebilir; devam butonu yalnızca 1-2-3 işaretlenirse etkinleşir.
- **API:** `completeOnboarding`.

---

## 2. Ana Akışlar

### Battery Home (Ana Ekran)
- Batarya göstergesi, "Keşfet" butonu.
- Profil pending → "Profilin inceleniyor" banner. Rejected → "Profilini düzenle" banner.
- **API:** Heartbeat. `getAppBootstrap` ile durum kontrolü.

### Searching / Radar Animasyonu
- `startDiscovery` çağrılırken. Boş havuz, rate limit, hata durumları.

### Empty Pool
- "Şu an aynı enerjide kimse bulunamadı." Ana ekrana dön.

### Candidate Card
- Fotoğraf (imzalı URL), isim, yaş, şehir, batarya etiketi, bio, ilgi alanları.
- Token expired → "Bu aday artık kullanılamaz."
- **API:** `submitDiscoveryDecision`.

### Match Ekranı
- Karşılıklı batarya, "Mesaj Gönder" / "Keşfe Devam Et".

### Sohbet Listesi
- Aktif matchler, okunmamış sayacı, "Mesajlaşma kapandı" etiketi (blocked/unmatched).

### Sohbet Detayı
- `messaging_disabled` iken input pasif.
- `clientMessageId` idempotency.
- **API:** `sendMessage`, `markMatchRead`, `setMatchMuted`.

---

## 3. Profil Düzenleme Akışları

### 3.1 Bio / İlgi Alanları Güncelleme
- Profil Düzenle ekranında metin alanı ve etiket seçimi.
- **API:** `updateProfile`.
- **Sonuç:** Değişiklikler `profile_revisions` altında draft oluşturur; canlı approved profil doğrudan değişmez. `submitProfileForReview` sonrası revizyon pending olur ve eski onaylı içerik onay sonuçlanana kadar görünür.

### 3.2 Fotoğraf Silme
- Fotoğraf slot'unda silme ikonu → onay dialogu → `deleteProfilePhoto`.
- `approved` fotoğraf silinince hem `profiles.photoIds`'dan hem CandidateView'den anında çıkar.

### 3.3 Fotoğraf Sıralama
- Drag-and-drop veya ok butonları ile sıralama.
- **API:** `reorderProfilePhotos`.
- Yalnızca `approved` fotoğraflar sıralanabilir.

### 3.4 Profil Tekrar Moderasyona Gönderme
- `rejected` veya `draft` durumundaki profil düzenleme tamamlandıktan sonra "Tekrar Gönder" butonu.
- **API:** `submitProfileForReview` → `profileStatus: pending`.

### 3.5 Mevcut Approved Fotoğrafların Davranışı
- Yeni fotoğraf yüklendiğinde mevcut `approved` fotoğraflar CandidateView'de görünmeye devam eder.
- Yeni fotoğraf `pending` durumundadır; onaylanana kadar diğer kullanıcılara gösterilmez.
- Kullanıcı bir `approved` fotoğrafı silerse o anda listeden çıkar; mevcut approved listesi küçülür.

---

## 4. Güvenlik ve Hata Akışları

### Block / Report
- **Block:** `blockUser` → match kapanır, çift yeniden aday gösterilmez.
- **Report:**
  - Pre-match (Candidate Card): ayrı `reportToken` ile `reportContent(context=pre_match)`. Decision token tüketilmez.
  - Match raporu: `matchId` ile `reportContent(context=match)`.
  - Mesaj raporu: `matchId + messageId` ile `reportContent(context=message)`.
  - İstemci reportedUserId göndermez; sunucu türetir.

### Profil Reddi ve Düzeltme
- Sebep kodu gösterilir ("Yüzünüzün net göründüğü bir fotoğraf yükleyiniz.").
- Kullanıcı düzenler → `submitProfileForReview` → `pending`.

### Hesap Silme
1. Profil Ayarları → "Hesabı Sil".
2. Yeniden kimlik doğrulama (şifre veya Google) — **sunucu ID token `auth_time` kontrol eder.** Eski oturumlarda `reauthentication_required` döner.
3. "Bu işlem geri alınamaz" onay dialogu.
4. `requestAccountDeletion` çağrılır; oturum kapatılır.

### Bağlantı / Genel Hata
- Ham Firebase hatası gösterilmez. Stabil hata kodları kullanılır.

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** user interviews (onboarding drop-off, empty pool acceptance), wireframe validation
- **Release blockers:** none pending legal review completion
- **Last reviewed:** 2026-07-06
