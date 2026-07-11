# SameCharge Closed Beta Runbook

Status: beta_operations_draft
Scope: Android-first closed beta, Istanbul only, 18+ only
Last updated: 2026-07-11

## Operating Principles

- Closed beta is invite-only.
- Android is the only supported beta platform.
- Beta city is Istanbul only.
- Testers must be 18+.
- No fake users, fake online counts, fake battery data, or fake activity indicators are allowed.
- Premium, payments, ads, admin panel, push notifications, media messages, and location sharing are disabled or not implemented.
- Production Firebase deploy has not been performed.
- Google Play production publishing has not been performed.
- Production deploy requires explicit owner approval.
- Production launch requires explicit owner approval.
- Legal and KVKK items remain `TBD_LEGAL_REVIEW` or `TODO_LEGAL_REVIEW` until reviewed by counsel.

## Beta Entry Gate

Before inviting testers, confirm:

- [ ] `main` is on the approved beta candidate commit.
- [ ] `mobile`, `functions`, and `firebase-rules` CI are green on `main`.
- [ ] Dev debug APK builds.
- [ ] Prod debug APK builds while production Firebase remains disabled/fail-closed.
- [ ] Manual Android QA in `docs/manual_android_qa.md` is complete for the APK being shared.
- [ ] `docs/privacy_legal_checklist.md` is reviewed and legal TODOs are acknowledged.
- [ ] `docs/play_internal_testing_checklist.md` is reviewed before any Play internal testing setup.
- [ ] No Firebase production deploy was performed.
- [ ] No Google Play publish was performed.

## Roles

- Owner: approves beta invite list, production Firebase enablement, and any production launch step.
- Beta operator: distributes APK or internal test access, collects feedback, watches incidents.
- Tester: uses the app only as instructed and reports issues through the feedback template.
- Engineering reviewer: triages bugs and confirms whether a blocker needs a fix PR.

## Daily Beta Routine

- Check GitHub CI health before sharing a fresh APK.
- Confirm no production Firebase deploy happened.
- Review incoming feedback using `docs/beta_feedback_template.md`.
- Review incident signals using `docs/beta_incident_checklist.md`.
- Track crash-free startup, sign-in, onboarding, discovery, chat send, report/block/unmatch, and deletion request outcomes.
- Keep known limitations visible to testers.

## Tester Invite Rules

- Invite only consenting adult testers.
- Keep the group small enough for manual support.
- Prefer testers with Android devices in the supported beta range.
- Do not invite users outside Istanbul beta scope unless owner explicitly changes the city policy.
- Do not promise production availability, premium features, push notifications, media chat, or admin tooling.

## APK Sharing Rules

- Share only the approved beta APK/build.
- Tell testers whether the build is dev, prod debug, or Play internal testing.
- Do not ask testers to send public screenshots with personal data.
- Do not ask testers to post logs publicly.
- Do not share production Firebase credentials or config files.

## Stop-The-Line Conditions

Pause tester expansion if any of these occur:

- App cannot start for multiple testers.
- Sign-in or onboarding fails broadly.
- Photo upload/finalization is broken.
- Discovery returns private data, fake users, or fake activity.
- Chat sends duplicate messages or allows messaging after block/unmatch/deletion.
- Report, block, unmatch, or account deletion request fails in a safety-impacting way.
- Sensitive data appears in logs.
- Unexpected Android permission prompt appears.
- Firebase cost or traffic spikes unexpectedly.
- A privacy or legal concern appears.

## Escalation

For a beta blocker:

1. Record the issue with `docs/beta_feedback_template.md`.
2. Classify severity.
3. Stop inviting new testers if safety, privacy, account deletion, or data exposure is involved.
4. Create a focused fix PR only for the blocker.
5. Re-run mobile, functions, and rules validation as relevant.
6. Do not deploy Firebase or publish to Google Play without explicit owner approval.

## Closeout

At the end of a beta round:

- Export or summarize feedback without sensitive personal data.
- List blockers, non-blocking issues, and product questions separately.
- Confirm legal/KVKK TODOs are still visible.
- Confirm no production deploy or production launch happened.
- Decide whether to run another closed beta round or prepare a separate owner-approved release plan.
