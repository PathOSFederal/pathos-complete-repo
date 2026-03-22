/**
 * ============================================================================
 * docs-merge-summary-pr.mjs
 * ============================================================================
 *
 * FILE PURPOSE:
 * Automates creation of a docs-only branch with a merge summary entry,
 * commits it, and tells the user what to push.
 *
 * WHERE IT FITS IN THE ARCHITECTURE:
 * This is a developer workflow helper. It does not affect runtime code.
 * It wraps create-merge-summary.mjs with branch creation and commit logic.
 *
 * USAGE:
 * node scripts/docs-merge-summary-pr.mjs --title "..." --summary "..." --pr "<url>"
 *
 * ============================================================================
 * RE-RUN SAFETY (IDEMPOTENT BEHAVIOR)
 * ============================================================================
 *
 * WHY THIS FIX IS NEEDED:
 * If this script fails mid-run (for example, after creating the branch but
 * before committing), a subsequent run would crash with:
 *
 *   fatal: A branch named 'docs/merge-summary-xxx' already exists.
 *
 * This is frustrating because the user must manually delete the branch
 * before retrying. We want the script to be idempotent (safe to re-run).
 *
 * HOW THE FIX WORKS:
 * Before attempting to create a branch, we check if it already exists.
 *   - If it exists: we checkout the existing branch (git checkout <branch>)
 *   - If it does not exist: we create it (git checkout -b <branch>)
 *
 * HOW BRANCH DETECTION WORKS:
 * We use: git show-ref --verify --quiet refs/heads/<branch>
 *   - Exit code 0 means the branch exists
 *   - Non-zero exit code means the branch does not exist
 *   - The --quiet flag suppresses output (we only need the exit code)
 *   - The --verify flag requires an exact ref match (no partial matching)
 *
 * This approach is reliable across platforms (macOS, Linux, Windows).
 * ============================================================================
 */

import { execSync } from "node:child_process";

/**
 * Execute a shell command and return trimmed stdout.
 * Throws on non-zero exit code.
 */
function sh(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

/**
 * Check if a local git branch exists.
 *
 * @param {string} branchName - The branch name to check
 * @returns {boolean} - True if the branch exists locally, false otherwise
 *
 * HOW IT WORKS:
 * Uses `git show-ref --verify --quiet refs/heads/<branch>` which:
 *   - Returns exit code 0 if the ref exists
 *   - Returns non-zero exit code if the ref does not exist
 *   - The --quiet flag suppresses output (we only care about exit code)
 *
 * WHY TRY/CATCH:
 * Node's execSync throws an error when a command exits with non-zero code.
 * We catch that error to return false (branch does not exist).
 */
function branchExists(branchName) {
  try {
    // stdio: "ignore" suppresses all output (stdout, stderr, stdin)
    // We only care whether the command succeeds (exit 0) or fails (non-zero)
    execSync(`git show-ref --verify --quiet refs/heads/${branchName}`, {
      stdio: "ignore",
    });
    // If we reach here, exit code was 0, so the branch exists
    return true;
  } catch {
    // execSync throws on non-zero exit code, meaning branch does not exist
    return false;
  }
}

/**
 * Extract a CLI argument value by name.
 * Returns undefined if the argument is not present.
 */
function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

// ============================================================================
// Gather git metadata
// ============================================================================

const shortSha = sh("git rev-parse --short HEAD");
const targetBranch = `docs/merge-summary-${shortSha}`;

// ============================================================================
// Parse CLI arguments
// ============================================================================

const title = getArg("--title") || `Post-merge summary (${shortSha})`;
const summary = getArg("--summary") || "Add human summary here.";
const pr = getArg("--pr") || "";

// ============================================================================
// Checkout or create the target branch
// ============================================================================
// This is the key fix: check if the branch already exists before creating.
// This makes the script safe to re-run after a partial failure.

let branchAction = "";

if (branchExists(targetBranch)) {
  // Branch already exists (likely from a previous partial run)
  // Just checkout the existing branch instead of failing
  console.log(`Branch already exists: ${targetBranch}`);
  console.log("Checking out existing branch...");
  sh(`git checkout ${targetBranch}`);
  branchAction = "reused";
} else {
  // Branch does not exist, create it fresh
  console.log(`Creating branch: ${targetBranch}`);
  sh(`git checkout -b ${targetBranch}`);
  branchAction = "created";
}

// ============================================================================
// Run the merge summary generator
// ============================================================================

// Escape double quotes in arguments to prevent shell issues
const escapedTitle = title.replace(/"/g, '\\"');
const escapedSummary = summary.replace(/"/g, '\\"');
const escapedPr = pr.replace(/"/g, '\\"');

const createSummaryCmd = `node scripts/create-merge-summary.mjs --title "${escapedTitle}" --summary "${escapedSummary}" --pr "${escapedPr}"`;

sh(createSummaryCmd);

// ============================================================================
// Stage and commit
// ============================================================================

sh("git add docs/merge-notes.md");
sh(`git commit -m "docs: add merge summary (${shortSha})"`);

// ============================================================================
// Print next steps
// ============================================================================

console.log("");
if (branchAction === "reused") {
  console.log("Done! Reused existing branch and added a new commit.");
} else {
  console.log("Done! Created branch and committed.");
}
console.log("");
console.log("Next steps:");
console.log(`1) git push -u origin ${targetBranch}`);
console.log("2) Open a PR into develop.");
