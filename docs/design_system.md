# SameCharge Tasarım Sistemi

- **Amaç:** Görsel dili, renk token sistemini ve tipografiyi tanımlamak.
- **Kapsam:** SameCharge mobil istemci.
- **Son Güncelleme:** 2026-07-06

> ⚠️ **PROVISIONAL:** Bu dokümandaki tüm renk değerleri, logo, uygulama adı ve animasyon dili **geçici**'dir. Gerçek kullanıcı doğrulaması tamamlanmadan ve marka kararı verilmeden bunlar nihai kabul edilmez.

---

## 1. Tasarım İlkeleri

- **Dark mode öncelikli:** Ana deneyim dark mode olarak tasarlanır. Light mode desteği yol haritasına alınabilir.
- **Kontrast uyumu:** Tüm metin/arka plan çiftleri WCAG 2.1 AA standardı ≥ 4.5:1 (normal metin) ve ≥ 3:1 (büyük metin / UI bileşen) sağlamalıdır.
- **Türkçe karakter desteği:** Kullanılan fontlar Türkçe karakterleri (İ, Ş, Ğ, Ü, Ö, Ç) tam desteklemeli ve ticari kullanıma açık lisansa sahip olmalıdır (Google Fonts veya eşdeğeri önerilir).
- **Marka adı geçici:** "SameCharge" ismi ve logo gerçek uygulama adı kararı verilene kadar placeholder kalır (bkz. OD-001).

---

## 2. Renk Token Sistemi (Semantic)

Sabit HSL değerleri yerine **semantic token** adları kullanılır. Her token bir renk amacını ifade eder; HSL değerleri tema dosyasında merkezi olarak tanımlanır.

| Token | Amaç | Dark Mode (Provisional HSL) |
|---|---|---|
| `background` | Ekran arka planı | `hsl(222, 20%, 10%)` |
| `surface` | Kart, modal yüzeyi | `hsl(222, 18%, 15%)` |
| `surfaceElevated` | Yükseltilmiş kart (shadow) | `hsl(222, 16%, 20%)` |
| `textPrimary` | Ana başlık ve içerik metni | `hsl(210, 15%, 92%)` |
| `textSecondary` | Yardımcı, placeholder metin | `hsl(210, 12%, 60%)` |
| `accent` | CTA buton, link, aktif element | `hsl(162, 72%, 50%)` *(provisional)* |
| `success` | Başarı, onay, like butonu | `hsl(142, 65%, 48%)` |
| `warning` | Uyarı, moderasyon bekleme | `hsl(38, 90%, 55%)` |
| `destructive` | Silme, engelleme, pass butonu | `hsl(0, 72%, 55%)` |
| `batteryLow` | Batarya %0–20 göstergesi | `hsl(0, 72%, 55%)` |
| `batteryMedium` | Batarya %21–60 göstergesi | `hsl(38, 90%, 55%)` |
| `batteryHigh` | Batarya %61–100 göstergesi | `hsl(142, 65%, 48%)` |

*Tüm HSL değerleri provisional'dır. Kullanıcı doğrulaması veya marka kararı sonrasında güncellenebilir.*

---

## 3. Tipografi

| Kullanım | Font | Ağırlık | Boyut |
|---|---|---|---|
| Başlık (H1) | *TBD — Türkçe destekli, ticari lisanslı* | Bold (700) | 28sp |
| Başlık (H2) | — | SemiBold (600) | 22sp |
| Gövde (Body) | — | Regular (400) | 16sp |
| Küçük (Caption) | — | Regular (400) | 12sp |
| Buton | — | Medium (500) | 16sp |

> **Font seçimi açık karardır.** Google Fonts üzerinden Noto Sans, Inter veya Outfit değerlendirilebilir (Türkçe karakter desteği doğrulanmıştır). Kesin seçim marka kararıyla birlikte yapılacaktır.

---

## 4. Boyut ve Izgara (Spacing Grid)

- Temel birim: 4dp
- İç boşluklar (padding): 4, 8, 12, 16, 24, 32dp
- Kart iç payı: 16dp
- Buton yüksekliği: 48dp minimum (WCAG dokunma hedefi ≥ 44px)
- Kenar payı (screen margin): 16dp

---

## 5. Animasyon ve Geçişler

| Element | Animasyon | Provisional Süre |
|---|---|---|
| Ekran geçişi | Slide / Fade | 250ms |
| Radar (Searching) | Radyal dalga animasyonu | Döngüsel |
| Match kutlaması | Scale + Fade in | 400ms |
| Buton basımı | Ripple / Scale 0.96 | 100ms |
| Batarya göstergesi | Dolum animasyonu | 600ms |

*Animasyon dili provisional'dır. Motion design detayları kullanıcı testi sonrasında kesinleştirilir.*

---

## 6. Erişilebilirlik Kontrolleri (Zorunlu)

- Tüm metin/arka plan çiftleri WCAG AA kontrastı geçmeli (araçlı otomatik kontrol CI'ya eklenebilir).
- Dokunma hedefleri minimum 44px × 44px.
- Ekran okuyucu desteği: Her etkileşimli element için `semanticLabel` mevcut.
- Animasyonlar sistem "reduce motion" ayarına saygı göstermeli.

---

## Document Status

- **Document status:** documents_ready (provisional)
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** brand/name decision (OD-001), user validation, accessibility audit
- **Release blockers:** Font selection and brand color finalization required before UI implementation. WCAG contrast audit before production.
- **Last reviewed:** 2026-07-06
