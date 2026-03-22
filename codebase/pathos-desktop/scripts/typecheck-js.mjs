/**
 * This script provides a lightweight "typecheck" for a JavaScript-only repo.
 * It does not use TypeScript; instead, it validates JavaScript syntax using
 * Node's built-in parser via `node --check`.
 *
 * Why this file exists:
 * - CI needs a reliable `pnpm typecheck` command.
 * - The project is JavaScript, so we validate syntax without adding TS.
 *
 * How it works:
 * - Walks selected directories (currently `src/`).
 * - Optionally includes top-level preload files (e.g. `preload*.js`).
 * - Runs `node --check` on every `.js`, `.mjs`, and `.cjs` file found.
 * - Stops at the first failure and returns a non-zero exit code.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(projectRoot, "..");

const includeDirs = [path.join(repoRoot, "src")];
const skipDirNames = new Set([
  "node_modules",
  "release",
  "dist",
  "out",
  "coverage",
]);

/**
 * Collect any top-level preload files (if present) so build-time preloads
 * stay covered even when they are not inside `src/`.
 */
const topLevelPreloads = fs
  .readdirSync(repoRoot, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isFile() &&
      /^preload.*\.(js|mjs|cjs)$/u.test(entry.name)
  )
  .map((entry) => path.join(repoRoot, entry.name));

const isJavaScriptFile = (filePath) =>
  /\.(js|mjs|cjs)$/u.test(filePath.toLowerCase());

const collectJavaScriptFiles = (startDir) => {
  const results = [];
  const entries = fs.readdirSync(startDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(startDir, entry.name);

    if (entry.isDirectory()) {
      if (skipDirNames.has(entry.name)) {
        continue;
      }
      results.push(...collectJavaScriptFiles(fullPath));
      continue;
    }

    if (entry.isFile() && isJavaScriptFile(fullPath)) {
      results.push(fullPath);
    }
  }

  return results;
};

const filesToCheck = [
  ...includeDirs.flatMap((dir) =>
    fs.existsSync(dir) ? collectJavaScriptFiles(dir) : []
  ),
  ...topLevelPreloads,
];

if (filesToCheck.length === 0) {
  console.log("typecheck: no JavaScript files found.");
  process.exit(0);
}

let checkedCount = 0;

for (const filePath of filesToCheck) {
  const result = spawnSync(process.execPath, ["--check", filePath], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.error(`typecheck: failed on ${filePath}`);
    process.exit(result.status ?? 1);
  }

  checkedCount += 1;
}

console.log(`typecheck: checked ${checkedCount} file(s).`);
