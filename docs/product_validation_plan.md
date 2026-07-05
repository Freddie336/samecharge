# SameCharge Ürün Doğrulama Planı

- **Amaç:** Çekirdek ürün hipotezlerini gerçek hedef kullanıcılarla test etmek.
- **Kapsam:** SameCharge Faz 0.5 kullanıcı araştırması.
- **Son Güncelleme:** 2026-07-06

> ⚠️ **Faz 0.5 Durumu:** Planlama dokümanları `documents_ready`. Gerçek kullanıcı görüşmeleri **not_started**. En az 10–20 görüşme tamamlanmadan Faz 0.5 `completed` olarak işaretlenemez.

---

## 1. Hedefler

- Uygulamanın temel fikrini (batarya eşleşmesi) hedef kullanıcıların açıklama yapılmadan anlayıp anlamadığını doğrulamak.
- Onboarding sürecindeki potansiyel terk noktalarını tespit etmek.
- Batarya paylaşımına karşı kullanıcı güven ve mahremiyet algısını ölçmek.
- Boş havuz durumunu bekleme toleransını anlamak.
- Faz 1 geliştirmeye devam edilip edilmeyeceğine dair ölçülebilir kararı almak.

---

## 2. Katılımcı Profili

| Kriter | Detay |
|---|---|
| **Yaş aralığı** | 18–32 (çekirdek hedef grup) |
| **Konum** | İstanbul veya büyük şehirde yaşayan |
| **Teknoloji kullanımı** | Akıllı telefon aktif kullanıcısı |
| **Dating deneyimi** | En az 1 dating uygulaması kullanmış veya hâlâ kullanan |
| **Gender** | Çeşitlilik sağlanmalı (yalnızca tek cinsiyetten oluşmamalı) |
| **Sayı** | Minimum 10, hedef 20 katılımcı |
| **Tanışıklık** | Araştırmacının yakın çevresinden seçilmemeli |

---

## 3. Test Edilecek Hipotezler

| ID | Hipotez | Başarı kriteri | Başarısızlık sinyali |
|---|---|---|---|
| H1 | Kullanıcı uygulamanın temel fikrini ilk ekranda anlıyor | ≥ 70% doğru anlıyor | < 50% doğru anlıyor → değer önerisi yeniden tasarlanmalı |
| H2 | Batarya yüzdesini paylaşmak kullanıcıya rahatsız edici gelmiyor | ≥ 60% "rahatsız değilim" | > 50% "endişeleniyorum" → gizlilik mesajlaşması güçlendirilmeli |
| H3 | Kullanıcı boş havuz sonucunda uygulamadan çıkmak yerine bekliyor | ≥ 50% "tekrar denerim" | > 60% "çıkarım" → boş havuz UX değiştirilmeli |
| H4 | ±1 veya ±3 genişleme kullanıcı tarafından kabul görüyor | ≥ 60% kabul | > 50% "sadece exact match istiyorum" → OD-003 yeniden değerlendirilmeli |
| H5 | Kullanıcı bu uygulamaya güvenlik açısından güven duyuyor | ≥ 65% "güveniyorum" | < 50% güven → güvenlik kommunikasyonu geliştirilmeli |
| H6 | Onboarding akışı aşırı uzun veya karmaşık hissettirmiyor | < 30% "çok uzun" | > 50% terk sinyali → onboarding sadeleştirilmeli |

---

## 4. Test Yöntemi

- **Format:** Yüz yüze veya video görüşmesi, yaklaşık 45 dakika.
- **Materyal:** Clickable Flutter prototipi (mock data) veya Figma tıklanabilir prototipi.
- **Kayıt:** Ses kaydı (onay alındıktan sonra). Ekran kaydı (cihaz üzerinde).
- **Moderatör:** Araştırmacı soruları sormadan önce katılımcının kendi düşüncesini sesli ifade etmesini ister (Think Aloud protokolü).

---

## 5. Görüşme Bölümleri

### Bölüm A — Tanışma ve Arka Plan (5 dk)
- Katılımcı hangi dating uygulamalarını kullanmış, genel deneyimi.
- Telefon şarjına dikkat ediyor mu?

### Bölüm B — İlk İzlenim (10 dk)
- Uygulama açılış ekranı gösterilir: "Bu uygulama ne yapıyor, anlat."
- Walkthrough slaytlarını kendisi gezsin; açıklama yapılmadan anlayışı ölçülür.

### Bölüm C — Onboarding (15 dk)
- Katılımcıya onboarding akışı adım adım gezdirtilir.
- Batarya paylaşım adımına gelince: "Bu adımda ne hissediyorsun?"
- Rıza adımlarında: "Bu kutuları okudun mu? Ne düşünüyorsun?"
- Terk eğilimi sinyalleri not edilir.

### Bölüm D — Keşif ve Boş Havuz (10 dk)
- Aday arama başlatılır; kandidat gösterilir.
- Boş havuz simüle edilir: "Şu an kimse bulunamadı. Ne yaparsın?"
- "Aynı yüzde yerine ±3 farkla biriyle eşleşmek ister miydin?" sorusu.

### Bölüm E — Kapanış (5 dk)
- "Bu uygulamayı gerçekte kullanır mıydın?"
- "Bu uygulamaya güvenebilir miydin?"
- "Nesi eksik?"

---

## 6. Karar Eşikleri

| Gerçek durum | Karar |
|---|---|
| H1–H5 hipotezlerinin ≥ 4'ü başarı kriterini karşıladı | ✅ Faz 1'e devam et |
| H1 veya H2 başarısız, diğerleri geçti | ⚠️ Revize et (değer önerisi veya gizlilik mesajlaşması) |
| H1 + H3 başarısız | ⛔ Core concept revizyon; Faz 1 durdurulur |
| ≥ 3 hipotez başarısız | ⛔ Konsept yeniden değerlendirilir |

---

## 7. Çıktılar

- Hipotez bazında sonuç özeti.
- Açık ürün kararlarında güncelleme (OD-002, OD-003, OD-004, OD-006, OD-011, OD-012).
- Onboarding terk noktaları listesi.
- Faz 1 başlama / revizyon / durdurma kararı.

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** real user interviews (not_started)
- **Release blockers:** Phase 0.5 cannot be marked completed without ≥ 10 real user interviews.
- **Last reviewed:** 2026-07-06
