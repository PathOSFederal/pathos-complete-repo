/**
 * ============================================================================
 * create-merge-summary.mjs
 * ============================================================================
 *
 * FILE PURPOSE:
 * Generate a markdown “merge notes” entry from git metadata and a user-provided
 * title, PR link, and summary text.
 *
 * WHERE IT FITS IN THE ARCHITECTURE:
 * This is a developer workflow helper. It does not affect runtime code.
 *
 * HOW IT WORKS:
 * 1) Detect current branch and current HEAD.
 * 2) Collect changed files and commit subjects for a given range.
 * 3) Append a new entry to docs/merge-notes.md in a consistent format.
 *
 * USAGE EXAMPLES:
 * node scripts/create-merge-summary.mjs --title "Day 12 ..." --summary "..." --pr "<url>"
 * node scripts/create-merge-summary.mjs --auto
 * ============================================================================
 */

import fs from "node:fs";
import { execSync } from "node:child_process";

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const isAuto = process.argv.includes("--auto");

const branch = sh("git rev-parse --abbrev-ref HEAD");
const headSha = sh("git rev-parse HEAD");
const shortSha = sh("git rev-parse --short HEAD");

const dateISO = new Date().toISOString().slice(0, 10);

// Prefer merge-commit diff if HEAD is a merge commit (has 2 parents).
let rangeBase = "";
let rangeHead = "HEAD";
try {
  const parentCount = sh("git rev-list --parents -n 1 HEAD").split(" ").length - 1;
  if (parentCount >= 2) {
    rangeBase = "HEAD^1";
  } else {
    rangeBase = "HEAD~1";
  }
} catch {
  rangeBase = "HEAD~1";
}

const filesChanged = sh(`git diff --name-status ${rangeBase}..${rangeHead}`)
  .split("\n")
  .filter(Boolean)
  .map((line) => `- ${line}`)
  .join("\n");

const commits = sh(`git log --oneline ${rangeBase}..${rangeHead}`)
  .split("\n")
  .filter(Boolean)
  .map((line) => `- ${line}`)
  .join("\n");

const title = isAuto ? `Post-merge summary (${shortSha})` : (getArg("--title") || `Post-merge summary (${shortSha})`);
const pr = getArg("--pr") || "";
const summary = getArg("--summary") || (isAuto ? "Auto-generated entry. Replace with a human summary." : "");

const entry = [
  "",
  `## ${dateISO} , ${title}`,
  "",
  `**Branch:** \`${branch}\``,
  `**Commit:** \`${headSha}\``,
  pr ? `**PR:** ${pr}` : `**PR:** (add link)`,
  "",
  `### Summary`,
  summary ? summary : "(add summary)",
  "",
  `### Files changed (from ${rangeBase}..${rangeHead})`,
  filesChanged ? filesChanged : "- (none detected)",
  "",
  `### Commits (from ${rangeBase}..${rangeHead})`,
  commits ? commits : "- (none detected)",
  "",
].join("\n");

const targetPath = "docs/merge-notes.md";
if (!fs.existsSync(targetPath)) {
  fs.mkdirSync("docs", { recursive: true });
  fs.writeFileSync(targetPath, "# Develop Merge Notes\n\n", "utf8");
}

fs.appendFileSync(targetPath, entry, "utf8");

console.log(`Wrote merge entry to ${targetPath}`);
