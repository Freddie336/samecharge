import { rm } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const functionsRoot = resolve(scriptDirectory, "..");
const libDirectory = resolve(functionsRoot, "lib");
const expectedPrefix = `${functionsRoot}${sep}`;

if (!libDirectory.startsWith(expectedPrefix) || libDirectory === functionsRoot) {
  throw new Error("Refusing to remove a path outside the Functions root.");
}

await rm(libDirectory, {
  recursive: true,
  force: true,
});
