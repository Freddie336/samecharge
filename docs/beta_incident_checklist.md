# SameCharge Beta Incident Checklist

Status: beta_incident_draft
Scope: closed beta operational incidents
Last updated: 2026-07-11

## First Response

- [ ] Record incident time.
- [ ] Record build/flavor.
- [ ] Record affected device/account count.
- [ ] Stop inviting new testers if safety, privacy, account deletion, or data exposure is involved.
- [ ] Do not deploy Firebase without explicit owner approval.
- [ ] Do not publish to Google Play.
- [ ] Do not ask testers to post sensitive logs publicly.

## Crash

- [ ] Does app fail on startup?
- [ ] Does crash affect dev debug, prod debug, or both?
- [ ] Can tester reproduce after restart?
- [ ] Any recent config/build change?
- [ ] Collect safe device/build details.
- [ ] Create blocker fix PR if crash affects multiple testers or startup.

## Login Failure

- [ ] Confirm network state.
- [ ] Confirm auth emulator/dev/prod target expected for the build.
- [ ] Confirm error copy is safe and non-technical.
- [ ] Check whether multiple testers are affected.
- [ ] Do not expose emails or auth tokens in public notes.

## Photo Upload Failure

- [ ] Confirm image type and size.
- [ ] Confirm upload reaches expected state.
- [ ] Confirm invalid images fail safely.
- [ ] Confirm no raw photo URL/path appears in UI or logs.
- [ ] Escalate if valid uploads fail broadly.

## Discovery Or Match Failure

- [ ] Confirm tester completed onboarding and has approved photo.
- [ ] Confirm presence/battery flow is active in foreground.
- [ ] Confirm no fake users/activity are shown.
- [ ] Confirm like/pass does not double-submit.
- [ ] Escalate if private fields appear or invalid candidates are shown.

## Chat Failure

- [ ] Confirm match is active.
- [ ] Confirm `messagingEnabled` should be true.
- [ ] Confirm message is text-only and under limit.
- [ ] Confirm duplicate send is not created.
- [ ] Confirm blocked/unmatched/deletion-pending match cannot send.
- [ ] Escalate if messages are duplicated or sent after safety closure.

## Unsafe Content Report

- [ ] Ask reporter to use in-app report flow if safe.
- [ ] Record target type: user / match / message.
- [ ] Do not copy full chat history into incident notes.
- [ ] Do not publish screenshots with private data.
- [ ] Preserve `TBD_LEGAL_REVIEW` retention markers.
- [ ] Escalate safety-impacting reports to owner.

## Block Or Unmatch Failure

- [ ] Confirm action was submitted.
- [ ] Confirm chat input disabled after success.
- [ ] Confirm future send is denied.
- [ ] Confirm discovery/rematch does not immediately reintroduce blocked/unmatched pair.
- [ ] Escalate if safety action only changes UI but backend still allows interaction.

## Account Deletion Issue

- [ ] Confirm exact account state.
- [ ] Confirm `reauthentication_required` behavior if recent login cannot be verified.
- [ ] Confirm deletion-pending disables discovery and messaging.
- [ ] Confirm deletion job state if available.
- [ ] Do not promise immediate hard deletion; retention policy remains `TBD_LEGAL_REVIEW`.
- [ ] Escalate if deletion-pending account can continue normal matching or messaging.

## Firebase Cost Or Traffic Spike

- [ ] Check whether spike is emulator/dev/prod.
- [ ] Confirm no production deploy happened unexpectedly.
- [ ] Pause beta expansion if cost risk is active.
- [ ] Record suspected source: auth / storage / functions / firestore / RTDB.
- [ ] Escalate to owner before any production config change.

## Privacy Concern

- [ ] Stop sharing affected build if private data exposure is suspected.
- [ ] Record minimal facts only.
- [ ] Do not copy private data into public issue text.
- [ ] Confirm whether profile, presence, photo, message, report, or token data is involved.
- [ ] Escalate to owner and legal review path.

## Closeout

- [ ] Incident severity assigned.
- [ ] Root cause identified or tracked.
- [ ] Fix PR linked if needed.
- [ ] Validation rerun after fix.
- [ ] Tester communication sent privately.
- [ ] No production deploy or Play publish occurred without approval.
