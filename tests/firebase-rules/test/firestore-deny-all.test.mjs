import { test } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
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

await runFirestoreDeniedCase(
  'Firestore authenticated alice client is denied listing match documents',
  (testEnv) => testEnv.authenticatedContext('alice').firestore().collection('matches').get(),
  (db) => Promise.all([
    db.doc('matches/alice_bob').set({ memberIds: ['alice', 'bob'], status: 'active' }),
    db.doc('matches/carol_dave').set({ memberIds: ['carol', 'dave'], status: 'active' }),
  ]),
);

test('Firestore authenticated member can read only their own match query', async () => {
  const testEnv = await createRulesTestEnvironment();

  try {
    await withSeededFirestore(testEnv, (db) => Promise.all([
      db.doc('matches/alice_bob').set({
        memberIds: ['alice', 'bob'],
        status: 'active',
        messagingEnabled: true,
      }),
      db.doc('matches/carol_dave').set({
        memberIds: ['carol', 'dave'],
        status: 'active',
        messagingEnabled: true,
      }),
    ]));

    await assertSucceeds(
      testEnv.authenticatedContext('alice')
        .firestore()
        .collection('matches')
        .where('memberIds', 'array-contains', 'alice')
        .get(),
    );
    await assertFails(
      testEnv.authenticatedContext('alice')
        .firestore()
        .doc('matches/carol_dave')
        .get(),
    );
  } finally {
    await cleanupRulesTestEnvironment(testEnv);
  }
});

test('Firestore match members can read active match messages only', async () => {
  const testEnv = await createRulesTestEnvironment();

  try {
    await withSeededFirestore(testEnv, (db) => Promise.all([
      db.doc('matches/alice_bob').set({
        memberIds: ['alice', 'bob'],
        status: 'active',
        messagingEnabled: true,
      }),
      db.doc('matches/alice_bob/messages/message-1').set({
        senderId: 'alice',
        type: 'text',
        text: 'Merhaba',
      }),
      db.doc('matches/carol_dave').set({
        memberIds: ['carol', 'dave'],
        status: 'active',
        messagingEnabled: true,
      }),
      db.doc('matches/carol_dave/messages/message-1').set({
        senderId: 'carol',
        type: 'text',
        text: 'Secret',
      }),
      db.doc('matches/alice_inactive').set({
        memberIds: ['alice', 'erin'],
        status: 'inactive',
        messagingEnabled: false,
      }),
      db.doc('matches/alice_inactive/messages/message-1').set({
        senderId: 'erin',
        type: 'text',
        text: 'Closed',
      }),
      db.doc('matches/alice_blocked').set({
        memberIds: ['alice', 'frank'],
        status: 'blocked',
        messagingEnabled: false,
      }),
      db.doc('matches/alice_blocked/messages/message-1').set({
        senderId: 'frank',
        type: 'text',
        text: 'Blocked',
      }),
      db.doc('matches/alice_unmatched').set({
        memberIds: ['alice', 'grace'],
        status: 'unmatched',
        messagingEnabled: false,
      }),
      db.doc('matches/alice_unmatched/messages/message-1').set({
        senderId: 'grace',
        type: 'text',
        text: 'Unmatched',
      }),
    ]));

    await assertSucceeds(
      testEnv.authenticatedContext('alice')
        .firestore()
        .collection('matches/alice_bob/messages')
        .get(),
    );
    await assertFails(
      testEnv.authenticatedContext('alice')
        .firestore()
        .collection('matches/carol_dave/messages')
        .get(),
    );
    await assertFails(
      testEnv.authenticatedContext('alice')
        .firestore()
        .collection('matches/alice_inactive/messages')
        .get(),
    );
    await assertFails(
      testEnv.authenticatedContext('alice')
        .firestore()
        .collection('matches/alice_blocked/messages')
        .get(),
    );
    await assertFails(
      testEnv.authenticatedContext('alice')
        .firestore()
        .collection('matches/alice_unmatched/messages')
        .get(),
    );
  } finally {
    await cleanupRulesTestEnvironment(testEnv);
  }
});

for (const path of [
  'discovery_sessions/alice-session',
  'discovery_sessions/alice-session/candidates/token-doc',
  'discovery_decisions/alice-bob',
  'matches/alice_bob',
  'reports/report-1',
  'blocks/alice/blocked/bob',
  'deletion_jobs/alice',
  'entitlements/alice',
  'audit_logs/log-1',
]) {
  await runFirestoreDeniedCase(
    `Firestore authenticated alice client is denied writing ${path}`,
    (testEnv) => testEnv.authenticatedContext('alice').firestore().doc(path).set({ ownerId: 'alice' }),
  );
}

await runFirestoreDeniedCase(
  'Firestore authenticated alice client is denied updating account status directly',
  (testEnv) => testEnv.authenticatedContext('alice')
    .firestore()
    .doc('users_internal/alice')
    .update({ accountStatus: 'deletion_pending' }),
  (db) => db.doc('users_internal/alice').set({ accountStatus: 'active' }),
);

await runFirestoreDeniedCase(
  'Firestore authenticated alice client is denied bypassing deletion pending preferences',
  (testEnv) => testEnv.authenticatedContext('alice')
    .firestore()
    .doc('preferences/alice')
    .update({ discoveryEnabled: true }),
  (db) => db.doc('preferences/alice').set({ discoveryEnabled: false }),
);

await runFirestoreDeniedCase(
  'Firestore authenticated alice client is denied updating report status',
  (testEnv) => testEnv.authenticatedContext('alice')
    .firestore()
    .doc('reports/report-1')
    .update({ status: 'closed' }),
  (db) => db.doc('reports/report-1').set({
    reporterId: 'alice',
    status: 'open',
  }),
);

await runFirestoreDeniedCase(
  'Firestore authenticated alice client is denied updating discovery token docs',
  (testEnv) => testEnv.authenticatedContext('alice')
    .firestore()
    .doc('discovery_sessions/alice-session/candidates/token-doc')
    .update({ used: true }),
  (db) => db.doc('discovery_sessions/alice-session/candidates/token-doc').set({
    tokenHash: 'hash',
    used: false,
  }),
);

await runFirestoreDeniedCase(
  'Firestore authenticated alice client is denied creating match messages directly',
  (testEnv) => testEnv.authenticatedContext('alice')
    .firestore()
    .doc('matches/alice_bob/messages/message-2')
    .set({ senderId: 'alice', text: 'Direct write' }),
  (db) => db.doc('matches/alice_bob').set({
    memberIds: ['alice', 'bob'],
    status: 'active',
  }),
);

await runFirestoreDeniedCase(
  'Firestore authenticated alice client is denied updating server-owned message fields',
  (testEnv) => testEnv.authenticatedContext('alice')
    .firestore()
    .doc('matches/alice_bob/messages/message-1')
    .update({ text: 'Tampered' }),
  (db) => Promise.all([
    db.doc('matches/alice_bob').set({
      memberIds: ['alice', 'bob'],
      status: 'active',
    }),
    db.doc('matches/alice_bob/messages/message-1').set({
      senderId: 'alice',
      type: 'text',
      text: 'Original',
    }),
  ]),
);
