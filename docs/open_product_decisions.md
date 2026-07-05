# SameCharge Açık Ürün Kararları

- **Amaç:** Teknik geliştirme başlamadan önce netleştirilmesi gereken kararları takip etmek.
- **Son Güncelleme:** 2026-07-06

---

## OD-001: Gerçek Uygulama Adı

| Alan | Detay |
|---|---|
| **Decision ID** | OD-001 |
| **Topic** | Uygulamanın gerçek adı ve marka kimliği |
| **Current assumption** | "SameCharge" geçici ad |
| **Alternatives** | Farklı Türkçe veya İngilizce markalar |
| **Status** | `awaiting_user_interview` |
| **Owner** | Ürün sahibi |
| **Evidence needed** | Kullanıcı algısı, marka araştırması, trademark kontrolü |
| **Target decision date** | Faz 0.5 görüşmeleri sonrası |
| **Affected documents** | design_system.md, product_requirements.md, release_checklist.md |

---

## OD-002: Unmatch / Block Sonrası Yeniden Karşılaşma

| Alan | Detay |
|---|---|
| **Decision ID** | OD-002 |
| **Topic** | Block/unmatch geçmişi olan çiftin yeniden aday gösterilmesi |
| **Current assumption** | MVP'de kalıcı filtre — gösterilmez |
| **Alternatives** | (A) Kalıcı, (B) Unmatch için 30/90 gün sonra yeniden gösterim, (C) Kullanıcı seçimi |
| **Status** | `awaiting_user_interview` |
| **Owner** | Ürün sahibi |
| **Evidence needed** | Kullanıcı rahatsızlık algısı araştırması |
| **Target decision date** | Faz 0.5 sonrası |
| **Affected documents** | matching_algorithm.md, state_machines.md, product_requirements.md |

---

## OD-003: Boş Havuzda Otomatik Batarya Aralığı Genişleme

| Alan | Detay |
|---|---|
| **Decision ID** | OD-003 |
| **Topic** | Tam eşleşme bulunamadığında ±1 veya ±3'e otomatik genişleme yapılıp yapılmaması |
| **Current assumption** | Sunucu kademeleri sırasıyla dener; kullanıcı her kademeyi ayrı görmez |
| **Alternatives** | (A) Şeffaf otomatik genişleme, (B) Kullanıcıya onay sor, (C) Yalnızca exact match |
| **Status** | `awaiting_user_interview` |
| **Owner** | Ürün sahibi |
| **Evidence needed** | "Telefonun %47'de ama %48'deki biriyle eşleşmek ister misin?" algısı |
| **Target decision date** | Faz 0.5 sonrası |
| **Affected documents** | matching_algorithm.md, product_requirements.md |

---

## OD-004: Günlük Ücretsiz Aday Limiti

| Alan | Detay |
|---|---|
| **Decision ID** | OD-004 |
| **Topic** | Ücretsiz hesap için günlük kaç adayla eşleşme arama yapılabilir |
| **Current assumption** | TBD |
| **Alternatives** | 10, 20, 30, limitsiz (beta), premium sonrası limitsiz |
| **Status** | `awaiting_user_interview` |
| **Owner** | Ürün sahibi + iş geliştirme |
| **Evidence needed** | Günlük engagement beklentisi ve limit toleransı |
| **Target decision date** | Faz 0.5 sonrası |
| **Affected documents** | product_requirements.md, api_contracts.md, matching_algorithm.md |

---

## OD-005: Presence Freshness Eşiği

| Alan | Detay |
|---|---|
| **Decision ID** | OD-005 |
| **Topic** | Presence `lastSeenAt` için stale sayılma süresi (şu an: 90s) |
| **Current assumption** | 90 saniye |
| **Alternatives** | 60s, 90s, 120s |
| **Status** | `awaiting_technical_spike` |
| **Owner** | Teknik ekip |
| **Evidence needed** | Heartbeat maliyet vs. UX kalibrasyonu |
| **Target decision date** | Faz 1 başlangıcı |
| **Affected documents** | matching_algorithm.md, api_contracts.md |

---

## OD-006: Son Görülme Bilgisinin Kullanıcıya Gösterilmesi

| Alan | Detay |
|---|---|
| **Decision ID** | OD-006 |
| **Topic** | Eşleşilen kullanıcıya "son görülme" gösterilip gösterilmeyeceği |
| **Current assumption** | Gösterilmez (privacy-first) |
| **Alternatives** | (A) Hiç gösterilmez, (B) Yalnızca eşleşilen kullanıcıya, (C) Kullanıcı tercihi |
| **Status** | `awaiting_user_interview` |
| **Owner** | Ürün sahibi |
| **Evidence needed** | Stalking riski algısı ve iletişim beklentisi |
| **Target decision date** | Faz 0.5 sonrası |
| **Affected documents** | privacy_data_map.md, screen_flows.md |

---

## OD-007: Ekran Görüntüsü Caydırma Yöntemi

| Alan | Detay |
|---|---|
| **Decision ID** | OD-007 |
| **Topic** | Profil fotoğraflarının ekran görüntüsüyle kopyalanmasını caydırma |
| **Current assumption** | Teknik engel yok; politika ve önlem |
| **Alternatives** | (A) Android FLAG_SECURE, (B) Watermark, (C) Sadece ToS uyarısı |
| **Status** | `awaiting_technical_spike` |
| **Owner** | Teknik ekip + ürün sahibi |
| **Evidence needed** | Kullanıcı toleransı, platforma göre teknik maliyet analizi |
| **Target decision date** | Faz 1 öncesi |
| **Affected documents** | threat_model.md, product_requirements.md |

---

## OD-008: Fotoğraf Doğrulama Seviyesi

| Alan | Detay |
|---|---|
| **Decision ID** | OD-008 |
| **Topic** | Profil fotoğraflarında AI/ML güvenlik taraması (Cloud Vision vb.) kullanılıp kullanılmayacağı |
| **Current assumption** | Yalnızca insan moderasyonu |
| **Alternatives** | (A) Yalnızca moderasyon, (B) Cloud Vision temizlik kontrolü, (C) Liveness/face matching |
| **Status** | `awaiting_technical_spike` |
| **Owner** | Teknik ekip + ürün sahibi |
| **Evidence needed** | Maliyet/kalite analizi; yanlış pozitif oranı |
| **Target decision date** | Faz 1 öncesi |
| **Affected documents** | moderation_policy.md |

---

## OD-009: Offline Mesaj Taslağı

| Alan | Detay |
|---|---|
| **Decision ID** | OD-009 |
| **Topic** | Çevrimdışıyken yazılan mesajların yerel taslak saklanması |
| **Current assumption** | Taslak saklanır; bağlantı gelince gönderilir |
| **Alternatives** | (A) Yerel taslak + otomatik gönderim, (B) Sadece hata göster, (C) Kullanıcı tercihi |
| **Status** | `awaiting_technical_spike` |
| **Owner** | Teknik ekip |
| **Evidence needed** | Flutter offline queue maliyet analizi |
| **Target decision date** | Faz Chat başlangıcı |
| **Affected documents** | screen_flows.md, wireframe_spec.md |

---

## OD-010: Hesap Silinince Mesajların Görünümü

| Alan | Detay |
|---|---|
| **Decision ID** | OD-010 |
| **Topic** | Hesabı silinen kullanıcının mesajlarının diğer tarafın sohbetinde nasıl görüneceği |
| **Current assumption** | senderId anonimleştirilir |
| **Alternatives** | (A) "Kullanıcı artık mevcut değil" + metin gizli, (B) Metin korunur + anonim, (C) Metin silinir |
| **Status** | `awaiting_legal_review` |
| **Owner** | Ürün sahibi + hukuk |
| **Evidence needed** | KVKK/GDPR anonimleştirme/silme yükümlülükleri |
| **Target decision date** | Hukuk review sonrası |
| **Affected documents** | data_retention_policy.md, data_model.md |

---

## OD-011: Kapalı Beta Kullanıcı Sayısı

| Alan | Detay |
|---|---|
| **Decision ID** | OD-011 |
| **Topic** | Kapalı beta için hedef kullanıcı sayısı ve davetiye mekanizması |
| **Current assumption** | TBD |
| **Alternatives** | 100–500, 500–2000, davetiye kodu, bekleme listesi |
| **Status** | `awaiting_user_interview` |
| **Owner** | Ürün sahibi |
| **Evidence needed** | Boş havuz eşiği için minimum CCU analizi |
| **Target decision date** | Faz 0.5 sonrası |
| **Affected documents** | product_requirements.md, matching_algorithm.md |

---

## OD-012: İlk Şehir ve Genişleme Kriterleri

| Alan | Detay |
|---|---|
| **Decision ID** | OD-012 |
| **Topic** | İlk beta şehri (İstanbul) ve ikinci şehre geçiş metrikleri |
| **Current assumption** | İstanbul; genişleme TBD |
| **Alternatives** | — |
| **Status** | `awaiting_user_interview` |
| **Owner** | Ürün sahibi |
| **Evidence needed** | DAU yoğunluğu; boş havuz oranı eşiği |
| **Target decision date** | Beta başlangıcında |
| **Affected documents** | product_requirements.md, matching_algorithm.md |

---

## OD-013: Pass Kararı Kalıcılığı (Pass Cooldown / Reconsideration)

| Alan | Detay |
|---|---|
| **Decision ID** | OD-013 |
| **Topic** | Geçilen (pass) adayın belirli bir süre sonra yeniden gösterilip gösterilmeyeceği |
| **Current assumption** | Pass kararı kalıcıdır (`decisionId` lifetime boyunca tek karar) |
| **Alternatives** | (A) Kalıcı pass, (B) 7/30/90 gün cooldown sonrası yeniden gösterim, (C) Kullanıcı geri al seçeneği (premium) |
| **Status** | `awaiting_user_interview` |
| **Owner** | Ürün sahibi |
| **Evidence needed** | "Geçtiğin biri için fikrin değişir mi?" kullanıcı algısı |
| **Target decision date** | Faz 0.5 sonrası |
| **Affected documents** | matching_algorithm.md, api_contracts.md (submitDiscoveryDecision), data_model.md (discovery_decisions) |

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** user interviews (multiple ODs), legal review (OD-010), technical spikes
- **Release blockers:** OD-010 requires legal review before production.
- **Last reviewed:** 2026-07-06
