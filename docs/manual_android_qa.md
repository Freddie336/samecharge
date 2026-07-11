# SameCharge Manual Android QA Script

Status: beta_manual_qa_draft
Scope: Android closed beta smoke and regression pass
Last updated: 2026-07-11

## Before You Start

- Use the approved APK/build only.
- Confirm tester is 18+.
- Use an Android test device or emulator.
- Keep screenshots private and avoid personal data where possible.
- Do not publish to Google Play production.
- Do not deploy Firebase.
- Do not enable production Firebase.

Record:

- Device model:
- Android version:
- App flavor/build:
- Network state:
- Tester account:
- Date/time:

## 1. Fresh Install

- [ ] Uninstall any previous SameCharge build.
- [ ] Install the approved APK/build.
- [ ] Launch the app.
- [ ] Confirm the app starts without crash.
- [ ] Confirm no unexpected Android permission prompt appears.
- [ ] Confirm the displayed environment/flavor matches the build instructions.

Expected result: app opens to the correct first screen or safe fail-closed state.

## 2. Auth

- [ ] Open sign-up/sign-in.
- [ ] Try invalid email/password and confirm safe validation copy.
- [ ] Sign up or sign in with a valid test account.
- [ ] Restart the app and confirm auth routing is stable.

Expected result: auth succeeds or fails with non-technical, safe copy.

## 3. Onboarding

- [ ] Complete all required onboarding fields.
- [ ] Confirm 18+ date requirement is enforced.
- [ ] Confirm Istanbul beta city is used.
- [ ] Try incomplete required fields and confirm validation.
- [ ] Submit with valid fields.

Expected result: onboarding cannot complete without required valid data and approved photo flow.

## 4. Photo Upload

- [ ] Start profile photo upload.
- [ ] Use a valid image.
- [ ] Confirm upload/finalization completes.
- [ ] Try an invalid or unavailable image if practical.
- [ ] Confirm errors are safe and retryable.
- [ ] Confirm no public raw photo URL/path is shown in UI.

Expected result: valid photo flow succeeds; invalid flow fails safely.

## 5. Discovery

- [ ] Open discovery.
- [ ] Confirm loading/searching state is clear.
- [ ] Confirm empty pool state is safe if no candidates exist.
- [ ] Confirm candidate card shows only safe fields.
- [ ] Confirm no email, birth date, raw UID, raw presence, or storage path is visible.
- [ ] Confirm no fake users, fake online counts, fake battery data, or fake activity appears.

Expected result: discovery shows only server-mediated, sanitized candidate data.

## 6. Like / Pass / Match

- [ ] Tap pass and confirm candidate advances or safe empty state appears.
- [ ] Tap like and confirm loading prevents double-submit.
- [ ] With prepared test data, create or verify a mutual match.
- [ ] Confirm match result does not imply chat features beyond text MVP.

Expected result: like/pass are safe, idempotent, and match is created only on mutual like.

## 7. Match List

- [ ] Open match list.
- [ ] Confirm empty state if no matches exist.
- [ ] Confirm match card shows safe counterpart preview only.
- [ ] Confirm unread and muted state display correctly if available.
- [ ] Confirm no raw UID, email, birth date, raw presence, or storage path is visible.

Expected result: current user's matches only are shown.

## 8. Chat Detail

- [ ] Open a match.
- [ ] Confirm message list loads.
- [ ] Send a text-only message.
- [ ] Confirm duplicate tapping does not send duplicate messages.
- [ ] Confirm read state updates.
- [ ] Confirm mute/unmute works if available in the UI.
- [ ] Confirm empty message cannot be sent.
- [ ] Confirm media, location, audio, and file message options are absent.

Expected result: text-only chat works and stays member-only.

## 9. Report User Or Message

- [ ] Open report flow from chat or match context.
- [ ] Pick a category.
- [ ] Add optional description if needed.
- [ ] Submit report.
- [ ] Confirm success copy is safe and does not reveal moderation internals.
- [ ] Confirm duplicate/rate-limit state is safe if it occurs.

Expected result: report submits through safe UI and does not expose private data.

## 10. Block

- [ ] Open block confirmation.
- [ ] Confirm copy is clear and not scary.
- [ ] Block the user.
- [ ] Confirm chat input becomes disabled.
- [ ] Confirm user cannot send another message.
- [ ] Confirm the UI does not claim old messages are erased from the other device/cache.

Expected result: block disables messaging and future interaction safely.

## 11. Unmatch

- [ ] Open unmatch confirmation.
- [ ] Confirm copy is clear.
- [ ] Unmatch.
- [ ] Confirm chat input becomes disabled.
- [ ] Confirm no automatic block is claimed unless explicitly implemented.

Expected result: unmatch closes the match safely and disables messaging.

## 12. Account Deletion Request

- [ ] Open account deletion screen.
- [ ] Confirm strong confirmation text is required.
- [ ] Submit request.
- [ ] Confirm `reauthentication_required` appears where recent-login support is required.
- [ ] Confirm deletion-pending copy is safe and does not overpromise immediate erasure.
- [ ] Confirm user cannot continue discovery or messaging after deletion-pending state if testable.

Expected result: deletion request is safe, idempotent, and retention-aware.

## 13. Offline And Error States

- [ ] Disable network during auth or discovery.
- [ ] Disable network during chat send.
- [ ] Re-enable network.
- [ ] Confirm retry/error copy is safe and non-technical.
- [ ] Confirm no raw backend error appears.

Expected result: app handles network failure without crash or sensitive details.

## 14. App Restart

- [ ] Restart after sign-in.
- [ ] Restart during onboarding.
- [ ] Restart after match/chat.
- [ ] Restart after block/unmatch/deletion-pending if practical.

Expected result: routing is stable and does not loop or crash.

## 15. Small Screen And Large Font

- [ ] Test on a small screen.
- [ ] Enable Android large font.
- [ ] Check onboarding, discovery card, chat detail, report dialog, block dialog, unmatch dialog, deletion dialog.
- [ ] Confirm buttons remain visible and tappable.
- [ ] Confirm dialogs scroll if needed.

Expected result: no blocking overflow or hidden critical action.

## 16. Prod Flavor Fail-Closed Behavior

- [ ] Install prod debug APK.
- [ ] Launch app without production Firebase config.
- [ ] Confirm it fails closed or shows the intended disabled state.
- [ ] Confirm no production Firebase call is made.

Expected result: prod flavor does not accidentally initialize production Firebase.

## QA Result

- Pass / Fail:
- Blocking issues:
- Non-blocking issues:
- Notes:
