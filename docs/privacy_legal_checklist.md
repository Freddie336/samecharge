# SameCharge Privacy And Legal Checklist

Status: legal_review_pending  
Scope: closed beta readiness, not final production legal text  
Last updated: 2026-07-10

## Required Before Production Launch

- [ ] Terms of Service approved and published: `TBD_LEGAL_REVIEW`.
- [ ] Privacy Policy approved and published: `TBD_LEGAL_REVIEW`.
- [ ] KVKK disclosure and explicit consent text approved: `TBD_LEGAL_REVIEW`.
- [ ] Community guidelines approved: `TBD_LEGAL_REVIEW`.
- [ ] Child safety policy approved for an 18+ dating product: `TBD_LEGAL_REVIEW`.
- [ ] Data retention durations approved: `TBD_LEGAL_REVIEW`.
- [ ] Account deletion web page exists and is linked from store metadata: `TODO_LEGAL_REVIEW`.
- [ ] Support email and support domain finalized: `TODO_SUPPORT_SETUP`.

## Data Handling Boundaries

- [ ] No public permanent profile photo URLs.
- [ ] No profile scraping.
- [ ] No presence scraping.
- [ ] No direct client discovery decision writes.
- [ ] No direct client match creation.
- [ ] Chat is text-only for MVP.
- [ ] Report, block, unmatch, and account deletion flows are callable-mediated.
- [ ] Account deletion remains idempotent and retention-safe.
- [ ] Reports, moderation records, security records, and legal placeholders are not hard-deleted while retention policy is pending.

## Logging And Observability

- [ ] Do not log message text.
- [ ] Do not log email.
- [ ] Do not log birth date.
- [ ] Do not log raw photo URLs or storage paths.
- [ ] Do not log raw presence payloads.
- [ ] Do not log sensitive dating preferences.
- [ ] Do not log auth tokens, candidate tokens, or report tokens.
- [ ] Structured logs use safe event names and allowlisted fields only.

## Store Review Notes

- [ ] Closed beta is Android-first.
- [ ] Beta is Istanbul-only.
- [ ] Product is 18+ only.
- [ ] No fake users or fake activity are used.
- [ ] Premium and ads are not implemented for this beta readiness pass.
- [ ] Production Firebase deploy requires explicit owner approval.
