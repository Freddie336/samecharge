# SameCharge Wireframe Spesifikasyonları

- **Amaç:** Her ekranın amacını, gösterilen veriyi, kullanıcı aksiyonlarını, durumlarını ve teknik bağımlılıklarını tanımlamak.
- **Kapsam:** SameCharge MVP tüm ekranlar ve edge case durumları.
- **Son Güncelleme:** 2026-07-06

---

## WF-01: Splash

| Başlık | Detay |
|---|---|
| **Amaç** | Auth oturum durumunu kontrol etmek; kullanıcıyı doğru yere yönlendirmek. |
| **Gösterilen veri** | Logo, uygulama adı (provisional). |
| **Kullanıcı aksiyonu** | Yok. Otomatik yönlendirme. |
| **Loading** | Spinner veya logo animasyonu. |
| **Error** | Auth servisi erişilemez → "Bağlantı kurulamadı, tekrar dene" + retry butonu. |
| **Yönlendirme** | Oturum yok → WF-02, Auth var & onboarding tamamlanmamış → WF-04/05, Auth var & onaylı profil → WF-09. |
| **Erişilebilirlik** | Loading durumunda `accessibilityLabel="Yükleniyor"`. |
| **API bağımlılığı** | Firebase Auth `.authStateChanges()`. |

---

## WF-02: Walkthrough / Tanıtım

| Başlık | Detay |
|---|---|
| **Amaç** | Değer önerisini 3 slaytla göstermek. |
| **Gösterilen veri** | İkon, başlık, açıklama metni. Slayt 1: Batarya konsepti. Slayt 2: Güvenli eşleşme. Slayt 3: Gerçek zamanlı. |
| **Kullanıcı aksiyonu** | Sürükleme ile slayt geçişi, "Başla" butonu (son slayt), "Atla" linki. |
| **Empty** | — |
| **Erişilebilirlik** | Sayfa göstergesi labelli; her slayt `accessibilityLabel`. |
| **API bağımlılığı** | Yok. |

---

## WF-03: 18+ Yaş Onayı

| Başlık | Detay |
|---|---|
| **Amaç** | 18+ beyanını kayıt öncesinde almak. |
| **Gösterilen veri** | Yaş uyarısı açıklaması, "18 yaşından büyüğüm" butonu, geri linki. |
| **Kullanıcı aksiyonu** | Beyan et → WF-04. Geri → WF-02. |
| **Disabled** | Devam butonu, beyan sonrasına kadar pasif. |
| **Erişilebilirlik** | Metin kontrastı WCAG AA minimum. |
| **API bağımlılığı** | Yok. |

---

## WF-04: Kayıt / Giriş

| Başlık | Detay |
|---|---|
| **Amaç** | Hesap oluşturma veya giriş yapma. |
| **Gösterilen veri** | E-posta alanı, şifre alanı, "Giriş Yap" / "Kayıt Ol" tab geçişi, Google Sign-In butonu. |
| **Kullanıcı aksiyonu** | Form gönder, Google butonu. |
| **Loading** | Buton disabled, spinner. |
| **Error** | Stabil hata kodlarıyla: hatalı şifre, e-posta zaten kayıtlı, ağ hatası. Ham Firebase mesajı gösterilmez. |
| **Erişilebilirlik** | Input label ve error label eşleşmesi. |
| **API bağımlılığı** | Firebase Auth. |

---

## WF-05: Doğum Tarihi

| Başlık | Detay |
|---|---|
| **Amaç** | Yaş doğrulaması için doğum tarihi girmek. |
| **Gösterilen veri** | Tarih seçici (gün/ay/yıl tekerlekleri veya takvim). |
| **Kullanıcı aksiyonu** | Tarih seç, devam et. |
| **Disabled** | 18 yaş altı seçimde buton pasif + inline hata. |
| **Not** | İstemci ön kontrol yapar; kesin doğrulama sunucu tarafında `completeOnboarding` içinde. |
| **API bağımlılığı** | Yok (istemci taraflı validasyon). |

---

## WF-06: Kullanım Amacı

| Başlık | Detay |
|---|---|
| **Amaç** | Eşleştirme filtresi için kullanım amacını seçmek. |
| **Gösterilen veri** | Seçim kartları: Dating, Arkadaşlık, Sohbet. |
| **Kullanıcı aksiyonu** | Tek seçim, devam et. |
| **API bağımlılığı** | Yok (onboarding verisi biriktirir). |

---

## WF-07: Cinsiyet ve Tercihler

| Başlık | Detay |
|---|---|
| **Amaç** | Kullanıcının cinsiyetini ve aday tercihlerini kaydetmek. |
| **Gösterilen veri** | Cinsiyet seçeneği + "Kendin tanımla" alanı, tercih seçenekleri. |
| **Kullanıcı aksiyonu** | Seçim veya atla (zorunlu değil). |
| **Not** | `selfGender` public profile'a dahil edilmez; yalnızca discovery sunucu mantığında kullanılır. |
| **API bağımlılığı** | Yok. |

---

## WF-08: Şehir Seçimi

| Başlık | Detay |
|---|---|
| **Amaç** | Şehir tabanlı eşleşme filtresi belirlemek. |
| **Gösterilen veri** | Arama destekli şehir listesi. |
| **Kullanıcı aksiyonu** | Şehir seç, devam et. |
| **Empty** | Arama sonucu yok → "Şehrinizi bulamadık" mesajı. |
| **Error** | Ağ hatası → "Şehir listesi yüklenemedi, bağlantını kontrol et." |
| **API bağımlılığı** | Statik şehir listesi veya Firestore'dan lookup. |

---

## WF-09: Profil Fotoğrafları

| Başlık | Detay |
|---|---|
| **Amaç** | En fazla 4 onaylı fotoğraf yüklemek. |
| **Gösterilen veri** | 4 fotoğraf slot'u. Her slot duruma göre: boş (+ ikon), yükleniyor (spinner), pending (saat ikonu + "İnceleniyor"), approved (onay), rejected (X + sebep kodu), failed (uyarı). |
| **Kullanıcı aksiyonu** | Slot tıkla → galeri/kamera seçici. Fotoğraf sil. Sıralamayı değiştir. |
| **Disabled** | 5 MB aşımında hata. Yükleme `temporary|processing` iken devam pasif; en az bir fotoğraf `pending|approved|needs_review` olduğunda devam aktif. |
| **Erişilebilirlik** | content-desc her slot için. |
| **API bağımlılığı** | `finalizeProfilePhoto`; ham fotoğraf belgesi dinlenmez, sanitized durum `getMyProfile` ile yenilenir. |

---

## WF-10: Biyografi ve İlgi Alanları

| Başlık | Detay |
|---|---|
| **Amaç** | Bio ve etiket girişi. |
| **Gösterilen veri** | Metin alanı (karakter sayacı ile), ilgi alanı seçim kutuları. |
| **Kullanıcı aksiyonu** | Yaz, etiket seç/kaldır, devam et. |
| **Disabled** | Karakter limiti aşıldığında devam butonu pasif. |
| **API bağımlılığı** | Yok (onboarding verisi biriktirir). |

---

## WF-11: Rıza Adımları (Onboarding)

| Başlık | Detay |
|---|---|
| **Amaç** | Ayrı checkbox'larla versiyonlu rıza kaydı almak. **Tek checkbox kullanılmaz.** |
| **Gösterilen veri** | 5 ayrı checkbox: Kullanım Koşulları (link), Gizlilik Metni (link), Açık Rıza, Analitik, Pazarlama. |
| **Kullanıcı aksiyonu** | Zorunlu 3 tanesi işaretlenmeden devam butonu pasif. |
| **API bağımlılığı** | `completeOnboarding` (tüm onboarding verisi bu çağrıda iletilir). |

---

## WF-12: Battery Home (Ana Ekran)

| Başlık | Detay |
|---|---|
| **Amaç** | Kullanıcının şarjını göstermek ve keşif başlatmak. |
| **Gösterilen veri** | Büyük batarya göstergesi (%xx), şarj durumu etiketi, "Keşfet" butonu, profil ikonu, eşleşmeler ikon. |
| **Error durumları** | Profil pending → "Profilin inceleniyor" banner. Rejected → "Profilini düzenle" banner. suspended → suspense ekranı. |
| **Erişilebilirlik** | Batarya göstergesi `semanticLabel`. |
| **API bağımlılığı** | RTDB presence writer (heartbeat). |

---

## WF-13: Searching (Radar Animasyonu)

| Başlık | Detay |
|---|---|
| **Amaç** | `startDiscovery` çağrısı sırasında görsel geri bildirim. |
| **Loading** | Radar/arama animasyonu. |
| **Error** | Ağ hatası → "Bağlantı kesildi, tekrar dene." Rate limit → "Günlük keşfin doldu." |
| **API bağımlılığı** | `startDiscovery`. |

---

## WF-13b: Empty Pool

| Başlık | Detay |
|---|---|
| **Amaç** | Boş havuz sonucunu göstermek. |
| **Gösterilen veri** | "Şu an aynı enerjide kimse yok. Birazdan tekrar dene." |
| **Kullanıcı aksiyonu** | Ana ekrana dön. |

---

## WF-14: Candidate Card

| Başlık | Detay |
|---|---|
| **Amaç** | Adayı göstermek ve karar almak. |
| **Gösterilen veri** | Fotoğraf (imzalı URL), isim, yaş, şehir, batarya etiketi, bio, ilgi alanları; görünmeyen ayrı `reportToken` action context içinde tutulur. |
| **Kullanıcı aksiyonu** | Sağa kaydır veya yeşil buton (Like), sola kaydır veya kırmızı buton (Pass). |
| **Loading** | Karar gönderilirken butonlar disabled. |
| **Error** | Token expired → "Bu aday artık kullanılamaz." Ağ hatası → retry. |
| **API bağımlılığı** | `submitDiscoveryDecision`. |

---

## WF-15: Match Ekranı (Same Energy!)

| Başlık | Detay |
|---|---|
| **Amaç** | Karşılıklı beğeninin kutlanması. |
| **Gösterilen veri** | Her iki kullanıcının batarya seviyesi, animasyon, "Mesaj Gönder" ve "Keşfe Devam Et". |
| **API bağımlılığı** | Firestore `matches` listener (sunucu oluşturur). |

---

## WF-16: Sohbet Listesi

| Başlık | Detay |
|---|---|
| **Gösterilen veri** | Eşleşme listesi, kısaltılmış son mesaj, zaman, okunmamış sayacı. |
| **Empty** | "Henüz eşleşmen yok." |
| **Durumlar** | Engellenmiş → "Mesajlaşma kapandı" etiketi. |
| **API bağımlılığı** | Firestore `matches` listener. |

---

## WF-17: Sohbet Detayı

| Başlık | Detay |
|---|---|
| **Gösterilen veri** | Mesaj balonları, zaman damgası, okundu göstergesi, "Seçenekler" butonu üstte. |
| **Kullanıcı aksiyonu** | Mesaj gir, gönder. Seçenekler: Engelle / Şikayet Et / Eşleşmeyi Kaldır. |
| **Disabled** | `messagingEnabled = false` iken input pasif. |
| **Error** | Rate limit → uyarı mesajı. Ağ hatası → mesaj taslak (yerel, gönderilmedi ikonu). |
| **API bağımlılığı** | `sendMessage` (clientMessageId ile). |

---

## WF-18: Profil Düzenleme

| Başlık | Detay |
|---|---|
| **Gösterilen veri** | Mevcut bio, ilgi alanları, fotoğraflar ve moderasyon durumu etiketi. |
| **Kullanıcı aksiyonu** | Düzenle, kaydet. Fotoğraf yükle/sil. |
| **Not** | Profil alanı değişiklikleri `profile_revisions` draftına kaydedilir; eski approved içerik korunur. Yeni fotoğraf pending durumuna düşer ve onaylanana kadar başkalarına gösterilmez. |

---

## WF-19: Bildirim Ayarları

| Başlık | Detay |
|---|---|
| **Gösterilen veri** | Toggle listesi: yeni eşleşme, yeni mesaj, sistem, pazarlama. |
| **API bağımlılığı** | `updateNotificationPreferences`. |

---

## WF-20: Block / Report Dialog

| Başlık | Detay |
|---|---|
| **Amaç** | Engelleme veya şikayet sürecini başlatmak. |
| **Block akışı** | "Engelle" → Onay dialogu → `blockUser`. |
| **Report akışı** | Candidate kartında `reportToken`; matchte `matchId`; mesajda `matchId+messageId` ile kategori/not gönderilir. `reportedUserId` istemciden alınmaz. |
| **Not** | İstemci mesaj metni veya snapshot göndermez. Sunucu bağlamı toplar. |
| **Success** | "Şikayetin alındı" onay ekranı. |

---

## WF-21: Profil Reddi ve Düzeltme

| Başlık | Detay |
|---|---|
| **Amaç** | Kullanıcıya reddedilen içeriği düzeltme fırsatı vermek. |
| **Gösterilen veri** | "Profilindeki [X] topluluk kurallarına uymadığı için onaylanmadı." + sebep kodu açıklaması. |
| **Kullanıcı aksiyonu** | Sadece fotoğraf veya bio düzenleme. Yeniden gönderme. |
| **Durumlar** | Yeniden gönderimde `pending` durumuna geçiş. |

---

## WF-22: Hesap Silme

| Başlık | Detay |
|---|---|
| **Amaç** | Hesap silme sürecini başlatmak. |
| **Kullanıcı aksiyonu** | Ayarlar → Hesabı Sil → Yeniden doğrulama → Onay dialogu → `requestAccountDeletion`. |
| **Disabled** | Onay olmadan devam butonu pasif. |
| **Success** | Oturum kapatılır, kullanıcı WF-04'e yönlendirilir. |
| **API bağımlılığı** | `requestAccountDeletion`. |

---

## WF-23: Bağlantı ve Genel Hata Durumları

| Durum | Davranış |
|---|---|
| İnternet yok | Global banner: "Çevrimdışısın. Bağlantını kontrol et." |
| Sunucu hatası | "Bir sorun oluştu. Daha sonra tekrar dene." + Retry butonu. |
| `account_restricted` | "Hesabın kısıtlandı. Destek için X iletişim kanalına ulaş." |
| Ham Firebase hatası | **Hiçbir zaman kullanıcıya gösterilmez.** Stabil hata kodlarına eşleştirilir. |

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** user interview validation (onboarding drop-off, empty pool tolerance), design review
- **Release blockers:** none
- **Last reviewed:** 2026-07-06
