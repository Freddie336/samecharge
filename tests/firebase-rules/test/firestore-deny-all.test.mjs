import { test } from 'node:test';
import { assertFails } from '@firebase/rules-unit-testing';
import {
  cleanupRulesTestEnvironment,
  createRulesTestEnvironment,
  withSeededFirestore,
} from './test-environment.mjs';

async function runFirestoreDeniedCase(name, operation, seed) {
  test(name, async () => {
    const testEnv = await createRulesTestEnvironment();

    try {
      if (seed) {
        await withSeededFirestore(testEnv, seed);
      }

      await assertFails(operation(testEnv));
    } finally {
      await cleanupRulesTestEnvironment(testEnv);
    }
  });
}

await runFirestoreDeniedCase(
  'Firestore unauthenticated client is denied reading an existing profile document',
  (testEnv) => testEnv.unauthenticatedContext().firestore().doc('profiles/alice').get(),
  (db) => db.doc('profiles/alice').set({ displayName: 'Alice' }),
);

await runFirestoreDeniedCase(
  'Firestore unauthenticated client is denied listing profile documents',
  (testEnv) => testEnv.unauthenticatedContext().firestore().collection('profiles').get(),
  (db) => db.doc('profiles/alice').set({ displayName: 'Alice' }),
);

await runFirestoreDeniedCase(
  'Firestore unauthenticated client is denied creating a profile document',
  (testEnv) => testEnv.unauthenticatedContext().firestore().doc('profiles/alice').set({ displayName: 'Alice' }),
);

await runFirestoreDeniedCase(
  'Firestore unauthenticated client is denied updating an existing match document',
  (testEnv) => testEnv.unauthenticatedContext().firestore().doc('matches/alice_bob').update({ state: 'accepted' }),
  (db) => db.doc('matches/alice_bob').set({ state: 'pending' }),
);

await runFirestoreDeniedCase(
  'Firestore unauthenticated client is denied deleting an existing consent history document',
  (testEnv) => testEnv.unauthenticatedContext().firestore().doc('consent_history/alice/records/test-record').delete(),
  (db) => db.doc('consent_history/alice/records/test-record').set({ granted: true }),
);

await runFirestoreDeniedCase(
  'Firestore authenticated alice client is denied reading her own profile document',
  (testEnv) => testEnv.authenticatedContext('alice').firestore().doc('profiles/alice').get(),
  (db) => db.doc('profiles/alice').set({ displayName: 'Alice' }),
);

await runFirestoreDeniedCase(
  'Firestore authenticated alice client is denied reading her own private user document',
  (testEnv) => testEnv.authenticatedContext('alice').firestore().doc('users_private/alice').get(),
  (db) => db.doc('users_private/alice').set({ email: 'alice@example.invalid' }),
);

await runFirestoreDeniedCase(
  'Firestore authenticated alice client is denied reading bob profile document',
  (testEnv) => testEnv.authenticatedContext('alice').firestore().doc('profiles/bob').get(),
  (db) => db.doc('profiles/bob').set({ displayName: 'Bob' }),
);

await runFirestoreDeniedCase(
  'Firestore authenticated alice client is denied creating her own profile document',
  (testEnv) => testEnv.authenticatedContext('alice').firestore().doc('profiles/alice').set({ displayName: 'Alice' }),
);

await runFirestoreDeniedCase(
  'Firestore authenticated alice client is denied updating her own profile document',
  (testEnv) => testEnv.authenticatedContext('alice').firestore().doc('profiles/alice').update({ displayName: 'Alice A.' }),
  (db) => db.doc('profiles/alice').set({ displayName: 'Alice' }),
);

await runFirestoreDeniedCase(
  'Firestore authenticated alice client is denied deleting her own private user document',
  (testEnv) => testEnv.authenticatedContext('alice').firestore().doc('users_private/alice').delete(),
  (db) => db.doc('users_private/alice').set({ email: 'alice@example.invalid' }),
);

await runFirestoreDeniedCase(
  'Firestore authenticated alice client is denied listing profile documents',
  (testEnv) => testEnv.authenticatedContext('alice').firestore().collection('profiles').get(),
  (db) => db.doc('profiles/alice').set({ displayName: 'Alice' }),
);

for (const path of [
  'discovery_sessions/alice-session',
  'discovery_sessions/alice-session/candidates/token-doc',
  'discovery_decisions/alice-bob',
  'matches/alice_bob',
  'entitlements/alice',
  'audit_logs/log-1',
]) {
  await runFirestoreDeniedCase(
    `Firestore authenticated alice client is denied writing ${path}`,
    (testEnv) => testEnv.authenticatedContext('alice').firestore().doc(path).set({ ownerId: 'alice' }),
  );
}
