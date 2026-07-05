# SameCharge Durum Makineleri (State Machines)

- **Amaç:** Sistemdeki server-owned varlık durumlarını ve izin verilen geçişleri tanımlamak.
- **Son Güncelleme:** 2026-07-06

> İstemci state alanlarına doğrudan yazamaz. Geçişler callable function, moderasyon servisi veya Admin SDK ile yapılır.

---

## 1. Profil Durumu (`profiles/{uid}.profileStatus`)

```text
draft → pending
pending → approved | rejected | needs_review
approved → needs_review | rejected
rejected → pending
needs_review → approved | rejected
```

- İlk onboarding tamamlandığında en az bir fotoğraf `pending|approved|needs_review` ise profil `pending` olabilir; approved fotoğraf beklemek onboarding'i kilitlemez.
- Discovery için ayrıca `profileStatus=approved` ve en az bir `approved` fotoğraf gerekir.
- Onaylı profil sahibinin yeni revizyonu pending iken profil `approved` kalır; eski canlı içerik gösterilir.

---

## 2. Profil Revizyonu (`profile_revisions/...status`)

```text
draft → pending
pending → approved | rejected | needs_review
rejected → draft | pending
needs_review → approved | rejected
```

`approved` geçişinde proposed alanlar transaction ile `profiles/{uid}` canlı alanlarına kopyalanır. `rejected` olduğunda canlı profil değişmez.

---

## 3. Fotoğraf Durumu (`profile_photos/{photoId}.status`)

```text
temporary → processing
processing → pending | failed
pending → approved | rejected | needs_review
approved → needs_review | rejected
needs_review → approved | rejected
```

Rejected/failed kayıt yeniden kullanılmaz; yeni yükleme yeni fotoğraf kaydı oluşturur.

---

## 4. Discovery Session

```text
active → closed | expired
```

Tek bir aday tokenının tüketilmesi session'ı kapatmaz.

---

## 5. Candidate Decision Token

```text
issued → used | expired | revoked
```

Token actorId, sessionId ve candidateId ilişkisine bağlıdır. Veritabanında yalnızca `tokenHash` saklanır.

---

## 6. Pre-match Report Token

```text
issued → used | expired | revoked
```

Ham token istemciye verilir; veritabanında yalnızca `reportTokenHash` saklanır. Kullanılması `reportUsedAt` alanını işaretler ve decision tokenını tüketmez.

---

## 7. Match Durumu

```text
active → unmatched | blocked
```

Her iki terminal durumda `messagingEnabled=false`. MVP'de geçmiş `unmatched|blocked` çift yeniden aday gösterilmez; OD-002 nihai ürün kararıdır.

---

## 8. Moderasyon Davası

```text
open → in_review
in_review → actioned | dismissed
actioned → appealed | closed
appealed → closed
dismissed → closed
```

---

## 9. Hesap Durumu (`users_internal/{uid}.accountStatus`)

```text
active → suspended | deletion_pending
suspended → active | deletion_pending
deletion_pending → deleted
```

`deletion_pending` anında discovery ve mesajlaşma erişimi kesilir. `deleted`, yalnızca minimal tombstone tutuluyorsa kalıcıdır; aksi durumda job kaydı tamamlanmayı kanıtlar. `profileStatus='deleted'` değeri yoktur.

---

## 10. Silme İşi

```text
created → running
running → completed | partially_failed
partially_failed → running | completed
```

Retry aynı jobId üzerinde idempotent yürür.

---

## Document Status

- **Document status:** documents_ready
- **Cross-document validation:** verified
- **Validated by:** AI cross-document review only
- **Awaiting:** engineering validation with emulator tests
- **Release blockers:** none for documentation; production blockers are tracked in release_checklist.md
- **Last reviewed:** 2026-07-06
