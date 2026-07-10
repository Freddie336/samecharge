# SameCharge Known Limitations

Status: beta_readiness_draft  
Last updated: 2026-07-10

## Product Scope

- Closed beta is Android-first and Istanbul-only.
- Product is 18+ only.
- No premium, payments, ads, admin panel, push notifications, media messages, or location sharing are implemented.
- No production launch automation is implemented.
- No fake users, fake online counts, fake battery data, or fake activity indicators are allowed.

## Safety And Legal

- Legal documents and retention durations require `TBD_LEGAL_REVIEW`.
- Account deletion web page is still `TODO_LEGAL_REVIEW`.
- Support email/domain is still `TODO_SUPPORT_SETUP`.
- Account deletion foundation is implemented, but final legal retention policy is not finalized.
- Admin moderation tooling is not part of the beta readiness PR.

## Observability

- Structured callable logging is intentionally limited to safe allowlisted fields.
- Crashlytics and Analytics production setup is future work and must not be enabled without explicit owner approval.
- Logs must not contain message text, email, birth date, raw photo paths, raw presence payloads, sensitive preferences, auth tokens, candidate tokens, or report tokens.
