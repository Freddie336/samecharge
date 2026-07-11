# SameCharge Play Internal Testing Checklist

Status: play_internal_testing_draft
Scope: preparation only, not production launch
Last updated: 2026-07-11

## Gate

Before Play internal testing setup:

- [ ] Owner explicitly approves Play internal testing setup.
- [ ] Production launch is not approved by this checklist.
- [ ] Production Firebase deploy has not been performed.
- [ ] Production Firebase enablement requires explicit owner approval.
- [ ] Google Play production publishing requires explicit owner approval.
- [ ] Legal/KVKK items remain `TBD_LEGAL_REVIEW` or `TODO_LEGAL_REVIEW` until finalized.

## App Identity

- [ ] App name is confirmed for internal testing.
- [ ] Android package/application ID is confirmed.
- [ ] Dev/debug and production/release build naming is clear.
- [ ] Internal testers can distinguish build flavor.
- [ ] No fake users, fake online counts, fake battery data, or fake activity indicators are present.

## Build And Signing

- [ ] Release signing keystore exists: `TODO_RELEASE_SIGNING`.
- [ ] Keystore is not committed to Git.
- [ ] Signing credentials are stored securely.
- [ ] Version code/name are correct for the uploaded internal test build.
- [ ] Debug builds are not uploaded as production releases.
- [ ] Prod flavor remains fail-closed until production Firebase is explicitly approved.

## Store Listing Draft

- [ ] Short description drafted: `TODO_STORE_LISTING`.
- [ ] Full description drafted: `TODO_STORE_LISTING`.
- [ ] Screenshots prepared: `TODO_STORE_ASSETS`.
- [ ] App icon and feature graphic prepared: `TODO_STORE_ASSETS`.
- [ ] 18+ dating positioning is clear.
- [ ] Istanbul-only beta scope is clear for testers.
- [ ] No premium, payments, ads, push notifications, media messages, or location sharing are promised.

## Policy And Legal

- [ ] Privacy policy URL exists: `TODO_LEGAL_REVIEW`.
- [ ] Terms URL exists: `TODO_LEGAL_REVIEW`.
- [ ] KVKK disclosure and consent copy reviewed: `TBD_LEGAL_REVIEW`.
- [ ] Account deletion web page exists and is linked: `TODO_LEGAL_REVIEW`.
- [ ] Support email finalized: `TODO_SUPPORT_SETUP`.
- [ ] Support domain/page finalized: `TODO_SUPPORT_SETUP`.
- [ ] Child safety / 18+ policy reviewed: `TBD_LEGAL_REVIEW`.
- [ ] Retention durations approved: `TBD_LEGAL_REVIEW`.

## Google Play Forms

- [ ] Data Safety form completed: `TODO_PLAY_CONSOLE`.
- [ ] App content questionnaire completed: `TODO_PLAY_CONSOLE`.
- [ ] 18+ age rating questionnaire completed: `TODO_PLAY_CONSOLE`.
- [ ] Target audience and content section completed: `TODO_PLAY_CONSOLE`.
- [ ] Sensitive permissions reviewed.
- [ ] No unexpected Android permission prompts in manual QA.

## Test Track

- [ ] Internal testing track selected.
- [ ] Tester email list prepared.
- [ ] Tester instructions link to `docs/tester_onboarding.md`.
- [ ] Manual QA script link to `docs/manual_android_qa.md`.
- [ ] Feedback template link to `docs/beta_feedback_template.md`.
- [ ] Incident checklist link to `docs/beta_incident_checklist.md`.

## Pre-Upload Verification

- [ ] `mobile`, `functions`, and `firebase-rules` CI are green on `main`.
- [ ] Manual Android QA is complete for the build.
- [ ] Dev debug APK built.
- [ ] Prod debug APK built.
- [ ] No production Firebase deploy occurred.
- [ ] No production launch automation exists.
- [ ] No PR13 broad product scope started.

## Release Decision

Internal testing may proceed only when owner approves. Production release remains blocked until:

- [ ] Legal/KVKK review is complete.
- [ ] Production Firebase setup is explicitly approved and reviewed.
- [ ] Google Play policy items are complete.
- [ ] Account deletion web page is live.
- [ ] Support channel is live.
- [ ] A separate production release plan is approved.
