# SameCharge Phase 0 & 0.5 Walkthrough

- **Son Güncelleme:** 2026-07-06
- **Kapsam:** Dokümantasyon geçişleri ve gerçek proje durumu

---

## 1. Son Dokümantasyon Durumu

Pass 3 sırasında ZIP içindeki eski/yeni dosya karışımı giderildi. C-18–C-26 çelişkileri düzeltilerek veri modeli, API sözleşmeleri, ekran akışları, state makineleri, retention politikası ve güvenlik sınırları aynı modele getirildi.

Öne çıkan nihai kararlar:

- `users_private` ve `users_internal` doğrudan istemci erişimine kapalıdır.
- Canlı profil alanları yalnızca onaylı içeriktir; düzenlemeler `profile_revisions` üzerinden ilerler.
- Fotoğraf pending durumundayken onboarding tamamlanabilir; discovery için approved fotoğraf gerekir.
- Pre-match rapor, like/pass tokenından ayrı `reportToken` kullanır; DB'de `reportTokenHash` tutulur.
- Presence çapraz kullanıcı okuması ve kök listeleme yasaktır.
- Hesap silme, anında erişim kesme ve 10 adımlı idempotent worker olarak ayrılmıştır.

---

## 2. Faz Durumu

| Başlık | Durum |
|---|---|
| Phase 0 ürün/teknik dokümanları | `documents_ready` |
| Phase 0 dokümanlar arası tutarlılık | `verified` |
| Phase 0 GitHub/Firebase altyapısı | `not_started` |
| Phase 0.5 planlama belgeleri | `documents_ready` |
| Tıklanabilir prototip | `not_started` |
| Gerçek kullanıcı görüşmeleri | `not_started` |
| Teknik spike'lar | `not_started` |
| Hukuk incelemesi | `not_started` |
| Flutter/Firebase uygulama kodu | `not_started` |
| Production yayına hazırlık | `no` |

---

## 3. Açık Ürün Kararları

Kullanıcı görüşmesi: OD-001, OD-002, OD-003, OD-004, OD-006, OD-011, OD-012, OD-013.

Teknik spike: OD-005, OD-007, OD-008, OD-009.

Hukuk: OD-010 ve tüm retention/yasal dayanak kararları.

---

## 4. Sonraki Teknik Sıra

1. Private GitHub repository ve ilk dokümantasyon commit'i.
2. Android application ID ve dev/prod ortam isimleri.
3. Firebase dev/prod projeleri ve region kararı.
4. Firebase CLI, FlutterFire CLI ve Emulator Suite.
5. Security Rules test iskeleti ve App Check debug spike.
6. Flutter/Firebase monorepo iskeleti.

Bu dosya uygulama kodunun yazıldığını veya gerçek kullanıcı/hukuk doğrulamasının tamamlandığını iddia etmez.

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** infrastructure setup, technical spikes, user interviews and legal review
- **Release blockers:** see release_checklist.md
- **Last reviewed:** 2026-07-06
