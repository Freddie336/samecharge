import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const functionsDir = path.resolve(currentDir, "..");
const repoRoot = path.resolve(functionsDir, "..");
const nodeCommand = process.execPath;
const firebaseCliScript = path.join(functionsDir, "node_modules", "firebase-tools", "lib", "bin", "firebase.js");
const testArgs = [
  "--test",
  "--test-concurrency=1",
  path.join("functions", "integration", "*.integration.test.js"),
];

function quoteCommandPart(value) {
  return `"${value.replaceAll("\"", "\\\"")}"`;
}

const testCommand = [
  quoteCommandPart(nodeCommand),
  ...testArgs.map((value) => quoteCommandPart(value)),
].join(" ");
const emulatorsArgs = [
  firebaseCliScript,
  "emulators:exec",
  "--project",
  "demo-samecharge-onboarding",
  "--only",
  "auth,firestore,functions,storage",
  "--config",
  "firebase.json",
  testCommand,
];

const child = spawn(nodeCommand, emulatorsArgs, {
  cwd: repoRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    GCLOUD_PROJECT: "demo-samecharge-onboarding",
    GOOGLE_CLOUD_PROJECT: "demo-samecharge-onboarding",
    FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
    FIREBASE_CONFIG: JSON.stringify({
      projectId: "demo-samecharge-onboarding",
      storageBucket: "demo-samecharge-onboarding.appspot.com",
    }),
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
