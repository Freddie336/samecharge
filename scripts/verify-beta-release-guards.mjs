import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";

const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
}).split("\0").filter(Boolean);

const forbiddenBasenames = new Set([
  "google-services.json",
  "GoogleService-Info.plist",
  "key.properties",
]);
const forbiddenExtensions = new Set([".jks", ".keystore", ".p12", ".pfx"]);
const forbiddenPatterns = [
  /^service-account.*\.json$/i,
  /^firebase-adminsdk.*\.json$/i,
  /^\.env(?:\..+)?$/i,
];

const sensitiveFiles = trackedFiles.filter((file) => {
  const name = basename(file);
  return forbiddenBasenames.has(name) ||
    forbiddenExtensions.has(extname(name).toLowerCase()) ||
    forbiddenPatterns.some((pattern) => pattern.test(name));
});

if (sensitiveFiles.length > 0) {
  throw new Error(`Tracked sensitive configuration is forbidden: ${sensitiveFiles.join(", ")}`);
}

const workflowFiles = trackedFiles.filter((file) =>
  file.startsWith(".github/workflows/") && /\.ya?ml$/i.test(file));
const forbiddenWorkflowCommands = [
  /\bfirebase\s+deploy\b/i,
  /\bgcloud\s+(?:app\s+deploy|functions\s+deploy|run\s+deploy)\b/i,
  /\bfastlane\s+(?:supply|upload_to_play_store)\b/i,
  /\bgradlew\b[^\n]*(?:publish|bundle.*Release)/i,
];

for (const file of workflowFiles) {
  const content = readFileSync(file, "utf8");
  for (const pattern of forbiddenWorkflowCommands) {
    if (pattern.test(content)) {
      throw new Error(`Production deploy or publish command found in ${file}: ${pattern}`);
    }
  }
}

const mainManifestPath = "apps/mobile/android/app/src/main/AndroidManifest.xml";
const mainManifest = readFileSync(mainManifestPath, "utf8");
if (/<uses-permission\b/i.test(mainManifest)) {
  throw new Error(`${mainManifestPath} must not request runtime permissions for closed beta.`);
}

const runtimeConfigPath = "apps/mobile/lib/core/firebase/firebase_runtime_config.dart";
const runtimeConfig = readFileSync(runtimeConfigPath, "utf8");
const prodGuardFragments = [
  "if (environment == AppEnvironment.prod)",
  "return FirebaseRuntimeTarget.disabled;",
  "throw StateError('Firebase is disabled for production.');",
];

for (const fragment of prodGuardFragments) {
  if (!runtimeConfig.includes(fragment)) {
    throw new Error(`Production Firebase fail-closed guard is missing: ${fragment}`);
  }
}

console.log("Beta release guards passed: no tracked credentials, deploy workflow, main runtime permission, or prod Firebase enablement detected.");
