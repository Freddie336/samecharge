import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

export const projectId = 'demo-samecharge-rules';
export const host = '127.0.0.1';
export const ports = {
  firestore: 8080,
  database: 9000,
  storage: 9199,
};

const testDir = dirname(fileURLToPath(import.meta.url));
const rulesProjectRoot = resolve(testDir, '..');
export const repoRoot = resolve(rulesProjectRoot, '..', '..');

export async function createRulesTestEnvironment() {
  const [firestoreRules, databaseRules, storageRules] = await Promise.all([
    readFile(resolve(repoRoot, 'firestore.rules'), 'utf8'),
    readFile(resolve(repoRoot, 'database.rules.json'), 'utf8'),
    readFile(resolve(repoRoot, 'storage.rules'), 'utf8'),
  ]);

  return initializeTestEnvironment({
    projectId,
    firestore: {
      host,
      port: ports.firestore,
      rules: firestoreRules,
    },
    database: {
      host,
      port: ports.database,
      rules: databaseRules,
    },
    storage: {
      host,
      port: ports.storage,
      rules: storageRules,
    },
  });
}

export async function cleanupRulesTestEnvironment(testEnv) {
  try {
    await testEnv.clearFirestore();
    await testEnv.clearDatabase();
    await testEnv.clearStorage();
  } finally {
    await testEnv.cleanup();
  }
}

export async function withSeededFirestore(testEnv, callback) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await callback(context.firestore());
  });
}

export async function withSeededDatabase(testEnv, callback) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await callback(context.database());
  });
}

export async function withSeededStorage(testEnv, callback) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await callback(context.storage());
  });
}

export async function putTestObject(storage, path) {
  const ref = storage.ref(path);
  await ref.put(new Uint8Array([1, 2, 3]), { contentType: 'application/octet-stream' });
  await ref.getMetadata();
}
