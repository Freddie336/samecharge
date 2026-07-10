# SameCharge Operations Runbook

Status: beta_readiness_draft  
Scope: closed beta operations, no production launch automation  
Last updated: 2026-07-10

## Release Gate

1. Confirm `main` has green `mobile`, `functions`, and `firebase-rules` checks.
2. Confirm no production Firebase deploy has been performed.
3. Build dev and prod debug APKs from the same commit under test.
4. Run the APK smoke checklist in `docs/beta_test_checklist.md`.
5. Verify production launch remains blocked until explicit owner approval.

## Incident Triage

- Treat any profile scraping, presence scraping, direct message write, direct match creation, or token leakage as a security incident.
- Preserve logs without adding sensitive content.
- Do not paste message text, email, birth date, raw photo paths, raw presence payloads, candidate tokens, report tokens, or auth tokens into issue trackers.
- If account deletion or report retention behavior is involved, preserve `TBD_LEGAL_REVIEW` markers and request legal review before destructive action.

## Firebase Safety

- Do not run `firebase deploy` during beta readiness work.
- Do not add production Firebase config files without explicit owner approval.
- Run emulator rules tests before any rules deployment.
- Confirm App Check expectations before enabling production callables.

## Manual Smoke Signals

- App starts without crash.
- Auth and onboarding handle loading and backend failures.
- Discovery has safe loading, empty, token expired, and retry states.
- Chat remains text-only and callable-mediated.
- Block, unmatch, and deletion states disable messaging.
- Report and deletion UI copy does not overpromise deletion or moderation outcomes.
