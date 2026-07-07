import { test } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
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
const validUploadId = 'AbCdEfGhIjKlMnOp';
const validPath = `temp_uploads/alice/${validUploadId}`;

await runStorageDeniedCase(
  'Cloud Storage unauthenticated client is denied uploading alice temp object',
  (testEnv) => testEnv.unauthenticatedContext().storage().ref(validPath).put(payload, { contentType: 'image/jpeg' }),
);

await runStorageDeniedCase(
  'Cloud Storage unauthenticated client is denied reading alice object metadata',
  (testEnv) => testEnv.unauthenticatedContext().storage().ref(validPath).getMetadata(),
  (storage) => putTestObject(storage, validPath),
);

await runStorageDeniedCase(
  'Cloud Storage unauthenticated client is denied downloading alice object',
  (testEnv) => testEnv.unauthenticatedContext().storage().ref(validPath).getDownloadURL(),
  (storage) => putTestObject(storage, validPath),
);

await runStorageDeniedCase(
  'Cloud Storage unauthenticated client is denied deleting alice object',
  (testEnv) => testEnv.unauthenticatedContext().storage().ref(validPath).delete(),
  (storage) => putTestObject(storage, validPath),
);

test('Cloud Storage owner can upload and clean up a valid temp image object', async () => {
  const testEnv = await createRulesTestEnvironment();

  try {
    const ownerRef = testEnv.authenticatedContext('alice').storage().ref(validPath);
    await assertSucceeds(ownerRef.put(payload, { contentType: 'image/jpeg' }));
    await assertSucceeds(ownerRef.delete());
  } finally {
    await cleanupRulesTestEnvironment(testEnv);
  }
});

await runStorageDeniedCase(
  'Cloud Storage owner cannot read her temp object metadata',
  (testEnv) => testEnv.authenticatedContext('alice').storage().ref(validPath).getMetadata(),
  (storage) => putTestObject(storage, validPath),
);

for (const [name, path, metadata] of [
  ['Cloud Storage rejects other-user temp upload', validPath, { contentType: 'image/jpeg' }],
  ['Cloud Storage rejects nested upload id path', 'temp_uploads/alice/nested/path', { contentType: 'image/jpeg' }],
  ['Cloud Storage rejects short upload id', 'temp_uploads/alice/short', { contentType: 'image/jpeg' }],
  ['Cloud Storage rejects invalid MIME', validPath, { contentType: 'text/plain' }],
]) {
  await runStorageDeniedCase(
    name,
    (testEnv) => testEnv.authenticatedContext(name.includes('other-user') ? 'bob' : 'alice')
      .storage()
      .ref(path)
      .put(payload, metadata),
  );
}

await runStorageDeniedCase(
  'Cloud Storage rejects oversized temp upload',
  (testEnv) => testEnv.authenticatedContext('alice')
    .storage()
    .ref(validPath)
    .put(new Uint8Array(5 * 1024 * 1024 + 1), { contentType: 'image/jpeg' }),
);

await runStorageDeniedCase(
  'Cloud Storage authenticated alice client is denied uploading bob profile photo',
  (testEnv) => testEnv.authenticatedContext('alice')
    .storage()
    .ref('profile_photos/bob/photo.jpg')
    .put(payload, { contentType: 'image/jpeg' }),
);

await runStorageDeniedCase(
  'Cloud Storage authenticated alice client is denied reading profile photo metadata',
  (testEnv) => testEnv.authenticatedContext('alice')
    .storage()
    .ref('profile_photos/alice/photo.webp')
    .getMetadata(),
  (storage) => putTestObject(storage, 'profile_photos/alice/photo.webp'),
);

await runStorageDeniedCase(
  'Cloud Storage authenticated alice client is denied reading other-user profile photo',
  (testEnv) => testEnv.authenticatedContext('alice')
    .storage()
    .ref('profile_photos/bob/photo.webp')
    .getDownloadURL(),
  (storage) => putTestObject(storage, 'profile_photos/bob/photo.webp'),
);

await runStorageDeniedCase(
  'Cloud Storage authenticated alice client is denied listing storage objects',
  (testEnv) => testEnv.authenticatedContext('alice')
    .storage()
    .ref('profile_photos')
    .listAll(),
);
