# SameCharge Veri Saklama ve İmha Politikası

- **Amaç:** Hesap silme ve veri yaşam döngüsü kurallarını tanımlamak.
- **Kapsam:** SameCharge veri imha sınıfları.
- **Son Güncelleme:** 2026-07-06

> **Önemli:** Tüm kesin saklama süreleri `TBD_LEGAL_REVIEW` durumundadır ve sunucu tarafında yapılandırılabilir olmalıdır. Hukuk onayı alınmadan production koduna sabit süre gömülmez.

---

## 1. Silme Talebinde Anında Uygulanan Erişim Kısıtları

Silme talebi kabul edildiğinde fiziksel silme worker'ı tamamlanmayı beklemeden erişim kesilir:

1. `users_internal/{uid}.accountStatus = 'deletion_pending'`.
2. `preferences/{uid}.discoveryEnabled = false`.
3. Açık eşleşmelerde `messagingEnabled = false`.
4. RTDB `presence/{uid}` kaldırılır veya offline duruma getirilir.
5. Push tokenları pasifleştirilir/silinir.
6. İstemci oturumu kapatılır; bütün callable fonksiyonlar `account_restricted` döndürür.

`profiles/{uid}.discoveryEnabled` ve `profileStatus='deleted'` kullanılmaz. `discoveryEnabled` yalnızca `preferences` altındadır; `deleted` yalnızca `users_internal.accountStatus` değeridir.

---

## 2. İdempotent Silme Worker'ı

`processAccountDeletion` istemci-callable değildir. `deletion_jobs/{jobId}` üzerinden aynı job tekrar çalıştırılabilir ve tamamlanan adımlar tekrarlanmaz.

Sıralı adımlar:

1. `preferences.discoveryEnabled = false` değerini doğrula.
2. Açık matchlerde `messagingEnabled = false` yap.
3. `push_tokens/{uid}` kayıtlarını sil.
4. RTDB `presence/{uid}` kaydını sil.
5. `profiles/{uid}` ve `profile_revisions/{uid}` verisini retention kararına göre sil veya anonimleştir.
6. `preferences/{uid}` belgesini sil veya anonimleştir.
7. `profile_photos` belgelerini ve Storage nesnelerini sil; hukuki hold varsa yalnızca erişimi kapat.
8. `users_private/{uid}` belgesini sil.
9. `users_internal/{uid}` belgesini minimum tombstone kaydına indir (`accountStatus=deleted`) veya hukuk kararına göre sil; job tamamlanması `deletion_jobs` içinde kalır.
10. Firebase Auth hesabını **en son** sil ve job'ı `completed` yap.

Job durumu: `created → running → partially_failed | completed`. `partially_failed → running` retry geçişi idempotenttir.

---

## 3. Anonimleştirme ve Saklama Sınıfları

### 3.1 Diğer Kullanıcı Deneyimi İçin Anonimleştirilebilecekler

Nihai karar OD-010 ve hukuk incelemesine bağlıdır:

- Mesajlarda `senderId` anonim bir sabit kimliğe dönüştürülebilir.
- Match kaydındaki silinen üye referansı anonimleştirilebilir.
- Mesaj metninin korunması, silinmesi veya gizlenmesi `TBD_LEGAL_REVIEW` olarak kalır.

### 3.2 Sınırlı Süre Saklanabilecekler

| Veri kategorisi | Süre | Durum |
|---|---|---|
| Açık güvenlik şikâyeti, moderasyon ve ban kanıtı | `TBD_LEGAL_REVIEW` | Hukuk onayı gerekli |
| Satın alım/fatura kayıtları | `TBD_LEGAL_REVIEW` | Vergi/muhasebe incelemesi gerekli |
| Güvenlik ve erişim logları | `TBD_LEGAL_REVIEW` | Mevzuat incelemesi gerekli |
| Rıza geçmişi | `TBD_LEGAL_REVIEW` | İspat yükümlülüğü incelemesi gerekli |

Saklanan her veri için amaç, erişim rolü, hukuki hold ve silme tarihi yapılandırmada tutulur.

---

## 4. Silme Sonrası Mesaj Görünümü

Diğer kullanıcının sohbetinde görülecek metin ve geçmiş mesaj davranışı OD-010 sonucuna ve hukuk onayına bağlıdır. Geçici UX metni:

> “Bu kullanıcı artık mevcut değil.”

---

## 5. Uygulama Dışı Silme Talebi

Mağaza gereksinimleri için uygulama dışında hesap silme talebi başlatılabilen doğrulanmış bir web sayfası yayınlanır. Kimlik doğrulama ve kötüye kullanım önleme akışı ayrıca tasarlanmalıdır.

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** legal review of retention periods, legal bases and OD-010
- **Release blockers:** Production release requires legal approval and configured retention parameters.
- **Last reviewed:** 2026-07-06
