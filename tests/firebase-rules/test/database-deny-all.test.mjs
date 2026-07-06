import { test } from 'node:test';
import { assertFails } from '@firebase/rules-unit-testing';
import {
  cleanupRulesTestEnvironment,
  createRulesTestEnvironment,
  withSeededDatabase,
} from './test-environment.mjs';

async function runDatabaseDeniedCase(name, operation, seed) {
  test(name, async () => {
    const testEnv = await createRulesTestEnvironment();

    try {
      if (seed) {
        await withSeededDatabase(testEnv, seed);
      }

      await assertFails(operation(testEnv));
    } finally {
      await cleanupRulesTestEnvironment(testEnv);
    }
  });
}

await runDatabaseDeniedCase(
  'Realtime Database unauthenticated client is denied reading alice presence',
  (testEnv) => testEnv.unauthenticatedContext().database().ref('presence/alice').get(),
  (db) => db.ref('presence/alice').set({ online: true }),
);

await runDatabaseDeniedCase(
  'Realtime Database unauthenticated client is denied writing alice presence',
  (testEnv) => testEnv.unauthenticatedContext().database().ref('presence/alice').set({ online: true }),
);

await runDatabaseDeniedCase(
  'Realtime Database unauthenticated client is denied updating alice discovery session',
  (testEnv) => testEnv.unauthenticatedContext().database().ref('discovery_sessions/alice').update({ active: true }),
  (db) => db.ref('discovery_sessions/alice').set({ active: false }),
);

await runDatabaseDeniedCase(
  'Realtime Database unauthenticated client is denied removing alice rate limit',
  (testEnv) => testEnv.unauthenticatedContext().database().ref('rate_limits/alice').remove(),
  (db) => db.ref('rate_limits/alice').set({ count: 1 }),
);

await runDatabaseDeniedCase(
  'Realtime Database authenticated alice client is denied reading her own presence',
  (testEnv) => testEnv.authenticatedContext('alice').database().ref('presence/alice').get(),
  (db) => db.ref('presence/alice').set({ online: true }),
);

await runDatabaseDeniedCase(
  'Realtime Database authenticated alice client is denied writing her own presence',
  (testEnv) => testEnv.authenticatedContext('alice').database().ref('presence/alice').set({ online: true }),
);

await runDatabaseDeniedCase(
  'Realtime Database authenticated alice client is denied reading bob presence',
  (testEnv) => testEnv.authenticatedContext('alice').database().ref('presence/bob').get(),
  (db) => db.ref('presence/bob').set({ online: true }),
);

await runDatabaseDeniedCase(
  'Realtime Database authenticated alice client is denied writing bob presence',
  (testEnv) => testEnv.authenticatedContext('alice').database().ref('presence/bob').set({ online: true }),
);

await runDatabaseDeniedCase(
  'Realtime Database authenticated alice client is denied listing presence records',
  (testEnv) => testEnv.authenticatedContext('alice').database().ref('presence').get(),
  (db) => Promise.all([
    db.ref('presence/alice').set({ online: true }),
    db.ref('presence/bob').set({ online: true }),
  ]),
);
