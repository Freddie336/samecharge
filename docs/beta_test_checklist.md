# SameCharge Closed Beta Test Checklist

Automated CI gates before manual testing: `release-guards`, `mobile`, `functions`,
`beta-smoke`, and `firebase-rules` must all pass on the candidate commit.

Status: beta_readiness_draft  
Scope: Android-first closed beta, Istanbul only, 18+ only  
Last updated: 2026-07-10

## Beta Entry Criteria

- [ ] PR7-PR12 mobile, functions, and Firebase rules CI are green on `main`.
- [ ] No production Firebase deploy has been performed for this beta readiness pass.
- [ ] Production Firebase remains disabled unless the owner explicitly approves enabling it.
- [ ] No fake users, fake online counts, fake battery data, or fake activity indicators are used.
- [ ] Premium, payments, ads, admin panel, push notifications, media messages, and location sharing remain disabled or unimplemented.
- [ ] Legal copy remains marked `TBD_LEGAL_REVIEW` or `TODO_LEGAL_REVIEW` where final review is pending.

## Android APK Smoke Test

- [ ] Fresh install on a small Android device.
- [ ] Fresh install on a larger Android device or emulator.
- [ ] App starts without unexpected production Firebase calls.
- [ ] No unexpected permission prompt appears.
- [ ] Sign up or sign in.
- [ ] Complete 18+ onboarding.
- [ ] Upload profile photo and complete onboarding.
- [ ] Verify pending or moderation state is safe and non-technical.
- [ ] Open discovery and see loading/searching state.
- [ ] Verify empty pool state is safe.
- [ ] Like and pass candidates.
- [ ] Create or verify a match in emulator/test data.
- [ ] Open match list.
- [ ] Open chat detail.
- [ ] Send a text-only message.
- [ ] Verify read and mute state.
- [ ] Report a user or message.
- [ ] Block a match and confirm input becomes disabled.
- [ ] Unmatch and confirm input becomes disabled.
- [ ] Request account deletion and verify `reauthentication_required` state if applicable.
- [ ] Restart the app and verify routing does not crash.
- [ ] Toggle offline/network error condition and verify safe retry states.
- [ ] Test with Android large font enabled.
- [ ] Confirm no message text, email, birth date, raw photo path, raw presence payload, candidate token, or report token appears in logs.

## Tester Notes

- Use only consenting adult beta testers.
- Keep beta access Istanbul-only until the city support policy changes.
- Do not publish to Google Play production from this checklist.
- Record crash-free startup, onboarding completion, discovery availability, chat send, and safety flow results for each APK build.
