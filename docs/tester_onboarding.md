# SameCharge Tester Onboarding

Status: beta_tester_draft
Scope: closed beta testers
Last updated: 2026-07-11

## Welcome

Thanks for helping test SameCharge. This is a closed beta, not a public launch.

Beta scope:

- Android-first.
- Istanbul only.
- 18+ only.
- Invite-only testers.
- Text-only chat MVP.
- No premium, payments, ads, push notifications, media messages, location sharing, or admin panel.

## What To Try

Please try these flows:

- Fresh install and first launch.
- Sign up or sign in.
- Complete onboarding.
- Upload a real profile photo.
- Open discovery.
- Like and pass candidates.
- Create or verify a match if test data allows it.
- Open match list.
- Send a text-only chat message.
- Use read/mute where available.
- Report a user or message.
- Block a match.
- Unmatch.
- Request account deletion and note any `reauthentication_required` state.
- Restart the app.
- Try poor network or offline behavior.
- Try Android large font if you can.

## What Feedback To Send

Use `docs/beta_feedback_template.md` format when possible.

Helpful details:

- Device model.
- Android version.
- App flavor/build.
- What you were trying to do.
- What you expected.
- What actually happened.
- Whether you can reproduce it.
- Screenshot only if it is safe and does not expose private data.

## What Not To Share Publicly

Do not post publicly:

- Email addresses.
- Message text.
- Birth date.
- Profile photos.
- Raw screenshots with private data.
- Tokens, logs, or backend error details.
- Other testers' identity or account details.

Send sensitive feedback privately to the beta operator.

## Safety Expectations

- Use report if content feels unsafe, abusive, or inappropriate.
- Use block if you do not want further interaction.
- Use unmatch if the match should be closed.
- Do not test harassment or unsafe content against real people.
- Do not assume account deletion instantly erases all data everywhere; retention and legal policy items remain `TBD_LEGAL_REVIEW`.

## Known Limitations

- Istanbul-only beta.
- Android-first beta.
- No push notifications.
- No media messages.
- No location sharing.
- No premium, payments, or ads.
- No admin panel in the app.
- Production Firebase has not been deployed.
- Google Play production publishing has not happened.
- Legal/KVKK review is not finalized.

## When To Stop Testing And Report Immediately

Stop and report if:

- App crashes repeatedly.
- You see another user's private data.
- You see fake users or fake activity.
- Chat works after block, unmatch, or deletion-pending state.
- You get unexpected Android permission prompts.
- You see message text, email, birth date, raw photo path, raw presence, or tokens in logs.
- Account deletion request behaves unexpectedly.
