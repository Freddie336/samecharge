import { test } from 'node:test';
import { assertFails } from '@firebase/rules-unit-testing';
import {
  cleanupRulesTestEnvironment,
  createRulesTestEnvironment,
  putTestObject,
  withSeededStorage,
} from './test-environment.mjs';

async function runStorageDeniedCase(name, operation, seed) {
  test(name, async () => {
    const testEnv = await createRulesTestEnvironment();

    try {
      if (seed) {
        await withSeededStorage(testEnv, seed);
      }

      await assertFails(operation(testEnv));
    } finally {
      await cleanupRulesTestEnvironment(testEnv);
    }
  });
}

const payload = new Uint8Array([4, 5, 6]);

await runStorageDeniedCase(
  'Cloud Storage unauthenticated client is denied uploading alice temp object',
  (testEnv) => testEnv.unauthenticatedContext().storage().ref('temp_uploads/alice/photo.jpg').put(payload, { contentType: 'image/jpeg' }),
);

await runStorageDeniedCase(
  'Cloud Storage unauthenticated client is denied reading alice object metadata',
  (testEnv) => testEnv.unauthenticatedContext().storage().ref('temp_uploads/alice/photo.jpg').getMetadata(),
  (storage) => putTestObject(storage, 'temp_uploads/alice/photo.jpg'),
);

await runStorageDeniedCase(
  'Cloud Storage unauthenticated client is denied downloading alice object',
  (testEnv) => testEnv.unauthenticatedContext().storage().ref('temp_uploads/alice/photo.jpg').getDownloadURL(),
  (storage) => putTestObject(storage, 'temp_uploads/alice/photo.jpg'),
);

await runStorageDeniedCase(
  'Cloud Storage unauthenticated client is denied deleting alice object',
  (testEnv) => testEnv.unauthenticatedContext().storage().ref('temp_uploads/alice/photo.jpg').delete(),
  (storage) => putTestObject(storage, 'temp_uploads/alice/photo.jpg'),
);

await runStorageDeniedCase(
  'Cloud Storage authenticated alice client is denied uploading her temp object',
  (testEnv) => testEnv.authenticatedContext('alice').storage().ref('temp_uploads/alice/photo.jpg').put(payload, { contentType: 'image/jpeg' }),
);

await runStorageDeniedCase(
  'Cloud Storage authenticated alice client is denied reading her temp object metadata',
  (testEnv) => testEnv.authenticatedContext('alice').storage().ref('temp_uploads/alice/photo.jpg').getMetadata(),
  (storage) => putTestObject(storage, 'temp_uploads/alice/photo.jpg'),
);

await runStorageDeniedCase(
  'Cloud Storage authenticated alice client is denied deleting her temp object',
  (testEnv) => testEnv.authenticatedContext('alice').storage().ref('temp_uploads/alice/photo.jpg').delete(),
  (storage) => putTestObject(storage, 'temp_uploads/alice/photo.jpg'),
);

await runStorageDeniedCase(
  'Cloud Storage authenticated alice client is denied uploading bob profile photo',
  (testEnv) => testEnv.authenticatedContext('alice').storage().ref('profile_photos/bob/photo.jpg').put(payload, { contentType: 'image/jpeg' }),
);

await runStorageDeniedCase(
  'Cloud Storage authenticated alice client is denied reading bob private object metadata',
  (testEnv) => testEnv.authenticatedContext('alice').storage().ref('private/bob/test.txt').getMetadata(),
  (storage) => putTestObject(storage, 'private/bob/test.txt'),
);
