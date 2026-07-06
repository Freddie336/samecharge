import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectId = 'demo-samecharge-rules';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const rulesProjectRoot = resolve(scriptDir, '..');
const repoRoot = resolve(rulesProjectRoot, '..', '..');
const firebaseCli = resolve(
  rulesProjectRoot,
  'node_modules',
  'firebase-tools',
  'lib',
  'bin',
  'firebase.js',
);

const testCommand = [
  JSON.stringify(process.execPath),
  '--test',
  '--test-concurrency=1',
  JSON.stringify('test/firestore-deny-all.test.mjs'),
  JSON.stringify('test/database-deny-all.test.mjs'),
  JSON.stringify('test/storage-deny-all.test.mjs'),
].join(' ');

const child = spawn(
  process.execPath,
  [
    firebaseCli,
    'emulators:exec',
    '--project',
    projectId,
    '--config',
    resolve(repoRoot, 'firebase.json'),
    '--only',
    'firestore,database,storage',
    testCommand,
  ],
  {
    cwd: rulesProjectRoot,
    env: {
      ...process.env,
      GCLOUD_PROJECT: projectId,
      FIREBASE_CONFIG: JSON.stringify({ projectId }),
    },
    shell: false,
    stdio: 'inherit',
  },
);

child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`firebase emulators:exec terminated by ${signal}`);
    process.exitCode = 1;
    return;
  }

  process.exitCode = code ?? 1;
});
