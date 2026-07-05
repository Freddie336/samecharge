# SameCharge Yayına Hazırlık Kontrol Listesi

- **Amaç:** Google Play ve App Store yayını için teknik, hukuki ve politika gereksinimlerini listelemek.
- **Kapsam:** SameCharge Android kapalı beta ve production yayına hazırlık.
- **Son Güncelleme:** 2026-07-06

---

## 1. Hukuki ve Politika Belgeleri (Release Blockers)

> ⛔ Bu maddelerin tamamı hukuk danışmanı tarafından onaylanmadan production yayını yapılamaz.

- [ ] **Kullanım Koşulları (ToS):** Versiyon ve tarihi ile web'de yayınlanmış — `TBD_LEGAL_REVIEW`
- [ ] **Gizlilik Politikası (KVKK/GDPR):** Dating uygulamasına özgü hassas veri işleme beyanı — `TBD_LEGAL_REVIEW`
- [ ] **Açık Rıza Metni:** Aydınlatma yükümlülüğü, KVKK m.10 — `TBD_LEGAL_REVIEW`
- [ ] **Topluluk Kuralları:** Moderasyon kriterleri halka açık — `TBD_LEGAL_REVIEW`
- [ ] **Çocuk Güvenliği Politikası:** 18+ zorunluluğu ve önlemler — `TBD_LEGAL_REVIEW`
- [ ] **Veri Saklama Süreleri Onayı:** Tüm retention durations confirmed by legal — `TBD_LEGAL_REVIEW`
- [ ] **Hesap Silme Web Sayfası:** URL belirlenmeli ve Google Play'e bildirilmeli
- [ ] **Destek ve İletişim Sayfası:** Yayınlanmış, erişilebilir

---

## 2. Mağaza Hazırlıkları

- [ ] Google Play Developer hesabı açık ve doğrulanmış
- [ ] **Google Play Data Safety formu:** Hangi veriler toplandığı ve paylaşıldığına dair beyan tamamlanmış
- [ ] **18+ Yaş Derecelendirmesi:** Dating kategorisine uygun derecelendirme anketi tamamlanmış
- [ ] Raporlama ve engelleme mekanizması mağaza sayfasında açıklanmış
- [ ] Demo hesaplar (2 adet, çift onaylı profil) ve inceleme notları hazırlanmış
- [ ] Hesap silme web sayfası bağlantısı Play Console'a girilmiş

---

## 3. Firebase ve Sunucu Yapılandırması

- [ ] **Prod Firebase projesi:** Dev'den tamamen ayrı, ayrı configuration dosyaları
- [ ] **App Check Enforcement — ZORUNLU:**
  - Android: Play Integrity API aktif (debug provider production'da kapalı)
  - iOS: DeviceCheck / App Attest aktif
  - Tüm callable functions'da App Check doğrulaması zorlanıyor
- [ ] **Security Rules:** Production ortamına deploy'dan önce CI emulator testleri zorunlu
  - `users_private` ve `users_internal` istemciden tamamen kapalı
  - `profiles`, `profile_revisions`, `profile_photos` ham belgeleri istemciden kapalı
  - RTDB presence çapraz UID okuma ve kök listeleme reddediliyor
  - Presence server-owned alan yazma ve sahte timestamp testleri reddediliyor
- [ ] **Admin Rights:** Yalnızca yetkili hesaplara custom claims atanmış; MFA zorunlu
- [ ] **Rate Limits:** Tüm callable functions'da server-side limitler etkin
- [ ] **Bütçe Alarmı:** Firebase/Google Cloud aylık maliyet eşikleri belirlenmiş ve bildirim kanalı test edilmiş
- [ ] **Crashlytics symbol upload:** Otomatik — debug ve release modları
- [ ] **Remote Config:** Premium, reklam ve kapalı beta feature flag'leri varsayılan `false`

---

## 4. Mobil Derleme Hazırlıkları

- [ ] Release signing keystore oluşturulmuş ve güvenli yedeklenmiş
- [ ] `.gitignore` ile keystore Git dışında tutulduğu doğrulanmış
- [ ] Code obfuscation (Dart ve Android Proguard) aktif
- [ ] Crashlytics / dSYM sembol dosyaları otomatik yükleniyor

---

## 5. Güvenlik ve Operasyon

- [ ] Security Rules deployment pipeline: CI testler geçmeden deploy engelleniyor
- [ ] Monitoring ve alert: Firestore/RTDB erişim anomalileri için uyarı kurulmuş
- [ ] Backup ve incident response planı hazırlanmış ve test edilmiş
- [ ] Logs: Mesaj metni, e-posta, doğum tarihi, hassas tercih log içermediği doğrulanmış

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** legal review (all ToS, privacy, retention), App Check configuration (technical), store account setup
- **Release blockers:** ⛔ Legal approval of all policy documents is mandatory. App Check enforcement must be active in production. Security Rules CI must pass.
- **Last reviewed:** 2026-07-06
