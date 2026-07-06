# Firebase Rules Tests

This package verifies the current SameCharge Firebase Security Rules baseline. Firestore, Realtime Database, and Cloud Storage are intentionally deny-by-default, so authenticated and unauthenticated client reads and writes must fail.

The tests use only the local Firebase Emulator Suite with the fake project ID `demo-samecharge-rules`. They do not use Firebase cloud resources, Firebase login tokens, service accounts, or the dev/prod SameCharge project IDs.

## Requirements

- Node.js 22
- Java 21

## Run Locally

```sh
npm ci
npm run test:rules
```

`npm run test:rules` starts only these emulators from the repository root `firebase.json`:

- Firestore
- Realtime Database
- Cloud Storage

When product rules are opened in future PRs, add matching allow tests and deny tests together so the security boundary remains explicit.
