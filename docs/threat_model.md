# SameCharge Tehdit Modeli Dokümanı

- **Amaç:** Güvenlik risklerini, alınan önlemleri ve kalan riskleri tanımlamak.
- **Kapsam:** İstemci, sunucu, veritabanı ve operasyon güvenliği.
- **Son Güncelleme:** 2026-07-06

> **Önemli not:** Bu doküman saldırı yüzeyini sistematik bir şekilde tanımlar. "Kalan risk yok" ifadesi hiçbir tehdit için kullanılmaz; her kategoride bir miktar kalan risk mevcuttur.

---

## 1. Profil Scraping

| Başlık | Detay |
|---|---|
| **Risk** | Botların tüm kullanıcı profillerini otomatik olarak toplaması. |
| **Önlem** | İstemci `profiles` koleksiyonunu toplu veya tekil okuyamaz. Aday bilgileri yalnızca `startDiscovery` CandidateView DTO üzerinden gelir; her seansta sınırlı sayıda aday döner. Daily limit ve App Check zorunlu kılınır. |
| **Kalan Risk** | **low.** CandidateView içindeki sınırlı veriyi oturum başına kayıt eden bir bot, uzun sürede profil verisi biriktirebilir. Rate limiting ve günlük limitler bu riski önemli ölçüde azaltır ancak tamamen ortadan kaldırmaz. |

---

## 2. Presence Scraping

| Başlık | Detay |
|---|---|
| **Risk** | Kullanıcıların çevrimiçi durumu ve batarya seviyesinin toplu olarak izlenmesi. |
| **Önlem** | RTDB kuralları kullanıcının yalnızca kendi presence kaydını okumasına/yazmasına izin verir; başka UID okuma ve kök listeleme yasaktır. Matchmaking havuzuna yalnızca Admin SDK erişir. |
| **Kalan Risk** | **low.** Yanlış yapılandırılmış RTDB rules deployment durumunda veri açığa çıkabilir (bkz. Tehdit 13). |

---

## 3. Stalking ve Konum Çıkarımı

| Başlık | Detay |
|---|---|
| **Risk** | Kullanıcının fiziksel konumunun tespit edilmesi. |
| **Önlem** | Detaylı GPS toplanmaz; yalnızca şehir bazında (`cityId`) eşleşme yapılır. EXIF metadata sunucu tarafında fotoğraflardan temizlenir. |
| **Kalan Risk** | **medium.** Kullanıcı kendi konum bilgisini bio veya sohbet içinde paylaşabilir. Bu sosyal mühendislik riski teknik önlemlerle tam olarak engellenemez. |

---

## 4. Bot Hesaplar ve Sahte Profiller

| Başlık | Detay |
|---|---|
| **Risk** | Platformun sahte veya otomatik oluşturulmuş hesaplarla dolması. |
| **Önlem** | App Check (Android: Play Integrity, iOS: DeviceCheck/App Attest), IP tabanlı kayıt hız limiti, fotoğraf moderasyon onayı zorunluluğu. |
| **Önemli:** | **App Check tek başına bot veya sahte istemciyi tamamen engelleyemez.** Rootlu, emüle edilmiş veya sertifika pinning atlatılmış cihazlar üzerinden kasıtlı saldırılar gerçekleştirilebilir. App Check bir katman sağlar, mutlak güvence vermez. |
| **Kalan Risk** | **medium.** Gerçek insanlar tarafından açılan sahte hesaplar fotoğraf moderasyonu ve şikayet sistemiyle görece yavaş elenir. |

---

## 5. Like Spam

| Başlık | Detay |
|---|---|
| **Risk** | Günlük limitsiz beğeni göndererek havuzu tüketmek. |
| **Önlem** | `submitDiscoveryDecision` sunucu tarafında günlük decision limiti ve rate limit uygular. |
| **Kalan Risk** | **low.** Limit ayarlarının yanlış değerlendirilmesi durumunda spamın bir kısmı geçebilir; limitler izlenerek ayarlanmalıdır. |

---

## 6. Mesaj Spamı

| Başlık | Detay |
|---|---|
| **Risk** | Eşleşme sonrası aşırı miktarda rahatsız edici mesaj gönderilmesi. |
| **Önlem** | `sendMessage` rate limiting, karakter uzunluğu, `clientMessageId` idempotency ve URL/iletişim bilgisi sinyal kontrolü içerir. Engelleme hakkında tek tıkla erişim. |
| **Kalan Risk** | **medium.** İzin verilen limitler dahilinde yine de rahatsız edici iletişim kurulabilir; şikayet mekanizması bu riski yönetir. |

---

## 7. Sahte Batarya Değeri

| Başlık | Detay |
|---|---|
| **Risk** | Batarya API'sini manipüle ederek tercih edilen yüzdeyle arama yapmak. |
| **Önlem** | Sunucu 90 saniyelik freshness kontrolü uygular. Dakikalar içindeki gerçekçi olmayan batarya sıçramaları risk sinyali olarak loglanır. App Check + server-side rate limit ekstra bariyer sağlar. |
| **Kalan Risk** | **medium.** Küçük ve stabil sahte değerler teknik önlemlerle tespit edilemez. Kullanıcı davranışı izlenerek anormallik tespiti geliştirilebilir. |

---

## 8. Candidate Token Tekrar Kullanımı (Replay Attack)

| Başlık | Detay |
|---|---|
| **Risk** | Ele geçirilen token ile birden fazla karar gönderme. |
| **Önlem** | Token kısa ömürlü, SHA-256 hashlenmiş ve tek kullanımlıktır. Veritabanında yalnızca hash saklanır. Kullanım sonrası `usedAt` işaretlenir, aynı hash ikinci kez reddedilir. Token `actorId`, `sessionId` ve `candidateId` ile ilişkilendirilmiştir. |
| **Kalan Risk** | **low.** Token ağ katmanında ele geçirilse bile kısa TTL içinde kullanılabilir pencere çok dardır. |

---

## 9. Match Oluşturma Sahteciliği

| Başlık | Detay |
|---|---|
| **Risk** | İstemcinin doğrudan `matches` koleksiyonuna yazarak hileli eşleşme oluşturması. |
| **Önlem** | Firestore Rules ile istemci `matches` koleksiyonuna yazamaz. Match yalnızca sunucu tarafında transaction ile oluşturulur. |
| **Kalan Risk** | **low.** Güvenlik kurallarının yanlış deploy edilmesi durumunda açık oluşabilir (bkz. Tehdit 13). |

---

## 10. Premium Sahteciliği

| Başlık | Detay |
|---|---|
| **Risk** | İstemci parametresiyle premium hak kazanmaya çalışmak. |
| **Önlem** | `entitlements` yalnızca `verifyPurchase` sunucu doğrulamasından sonra yazılır. İstemcinin gönderdiği hiçbir flag güvenilmez. |
| **Kalan Risk** | **low.** Mağaza server doğrulaması bypass edilirse açık olabilir; satın alma token'ı her zaman mağaza API'sinden doğrulanmalıdır. |

---

## 11. Fotoğraf Kötüye Kullanımı

| Başlık | Detay |
|---|---|
| **Risk** | Başkasının görselini kullanma, zararlı dosya yükleme, görsel bomba (image bomb). |
| **Önlem** | `finalizeProfilePhoto` sunucuda MIME kontrolü, boyut limiti, decode + WebP yeniden encode, EXIF temizleme, çözünürlük kontrolü yapar. Onaysız fotoğraf CandidateView'a eklenmez. Storage Rules geçici klasör erişimini yalnızca kendi UID'i ile sınırlar. |
| **Kalan Risk** | **medium.** Otomatik moderasyon sistemleri her zaman hatalı pozitif/negatif üretir; insan moderasyonu gereklidir. |

---

## 12. Şikayet Sistemi Kötüye Kullanımı

| Başlık | Detay |
|---|---|
| **Risk** | Seri şikayetle gerçek kullanıcıları susturmak. |
| **Önlem** | `reportContent` rate limit içerir. Duplicate rapor kontrolü yapılır. Her rapor moderatör incelemesine gider. |
| **Kalan Risk** | **medium.** Çok sayıda koordineli sahte hesap gerçek kullanıcıyı zorlayabilir; çok adımlı ban süreci gereklidir. |

---

## 13. Yanlış Security Rules Deployment

| Başlık | Detay |
|---|---|
| **Risk** | Üretim ortamına hatalı Firestore veya RTDB kuralları deploy edilmesi. |
| **Önlem** | CI pipeline'da emulator ile rules unit testleri zorunlu; deployment sadece testler geçince yapılır. Rules review checklist mevcuttur. |
| **Kalan Risk** | **medium.** Hatalı kural değişikliği kısa süre için veri açığına yol açabilir. Otomatik geri alma (rollback) mekanizması ve monitoring kurulmalıdır. |

---

## 14. Admin Hesabı Ele Geçirilmesi

| Başlık | Detay |
|---|---|
| **Risk** | Yetkili bir admin hesabının kimlik bilgilerinin çalınması. |
| **Önlem** | Admin paneli şu gereksinimlere tabi olmalıdır: MFA zorunlu, rol tabanlı custom claims, her admin işlemi audit log'a kaydedilir, yalnızca raporlanan içerik ve sınırlı bağlam görünür. |
| **Kalan Risk** | **medium.** Sosyal mühendislik veya credential stuffing saldırıları teknik kontrollere ek olarak güvenlik eğitimi gerektirir. |

---

## 15. Token ve Kimlik Bilgisi Sızıntısı

| Başlık | Detay |
|---|---|
| **Risk** | API anahtarları, Firebase config veya service account dosyalarının repository'e eklenmesi. |
| **Önlem** | `.gitignore` ile secret dosyaları engellenir. CI/CD'de secret scanning kullanılır. Service account key dosyaları repoya eklenmez. |
| **Kalan Risk** | **low.** Geçmişte yanlışlıkla commit edilen secret'lar dönüştürülmeden önce açığa çıkabilir; git history taraması ve secret rotation önerilir. |

---

## 16. Cloud Functions Replay/Retry Hataları

| Başlık | Detay |
|---|---|
| **Risk** | Tekrar için event'lerin mükerrer satın alma veya match oluşturması. |
| **Önlem** | Tüm fonksiyonlar idempotent tasarlanmıştır. `clientMessageId`, `decisisionId` gibi deterministik anahtarlar kullanılır. Transaction içinde create-if-absent mantığı uygulanır. |
| **Kalan Risk** | **low.** Alışılmadık sıra koşulları (race condition) edge case'ler üretebilir; kapsamlı retry ve idempotency testleri gereklidir. |

---

## 17. Veri Sızıntısı (Genel)

| Başlık | Detay |
|---|---|
| **Risk** | Yetkisiz kişinin Firestore / RTDB / Storage'a erişmesi. |
| **Önlem** | security rules her koleksiyon için owner kontrolü uygular. Admin SDK yalnızca Cloud Functions içinde kullanılır. |
| **Kalan Risk** | **low.** Yanlış rules deployment (bkz. Tehdit 13) bu riski artırır. Monitoring ve alert zorunludur. |

---

## 18. Hesap Silme Sonrası Veri Kalması

| Başlık | Detay |
|---|---|
| **Risk** | Silme işlemi sırasındaki hata veya eksiklikten dolayı kişisel verinin sistemde kalması. |
| **Önlem** | `deletion_jobs` ile her adım izlenir. Job yeniden başlatılabilir (idempotent). RTDB presence ve push token anında silinir. |
| **Kalan Risk** | **low.** Storage dosyaları veya nadir edge case koleksiyonlar temizlenmeden kalabilir; kapsamlı deletion audit gereklidir. |

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** legal review (retention durations), technical spike (App Check testing), security penetration testing
- **Release blockers:** Security rules CI test suite must pass; MFA requirement for admin panel must be enforced before production.
- **Last reviewed:** 2026-07-06
