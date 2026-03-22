#!/usr/bin/env node

/**
 * day-snapshot.mjs
 *
 * PURPOSE:
 * This script creates a "snapshot" of the current development day's work by:
 * 1. Generating a patch file (git diff develop...HEAD) in artifacts/
 * 2. Capturing key git state information (status, branch, file changes)
 * 3. Appending an auto-generated markdown section to docs/merge-notes.md
 *
 * HOW IT WORKS:
 * 1. Parses the --day argument from CLI (required, must be positive integer)
 * 2. Ensures the artifacts/ directory exists
 * 3. Runs git diff develop...HEAD and saves output to artifacts/day-<N>.patch
 * 4. Runs several git commands to capture repository state
 * 5. Gets the file size of the generated patch
 * 6. Builds a markdown section with all captured info
 * 7. Appends that section to docs/merge-notes.md
 *
 * USAGE:
 * node scripts/day-snapshot.mjs --day 15
 * pnpm docs:day-snapshot --day 15
 *
 * REQUIREMENTS:
 * - --day <N> is required, where N is a positive integer
 * - Must be run from the repository root
 * - Git must be installed and repository must have a develop branch
 *
 * WINDOWS COMPATIBILITY:
 * - Uses execSync with shell: true to support both PowerShell and bash
 * - Uses Node's fs.statSync for file size instead of ls -lh (cross-platform)
 * - All file paths use forward slashes for git compatibility
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Configuration: File paths and git commands
// ---------------------------------------------------------------------------

/**
 * Directory where patch artifacts are stored.
 * Relative to repository root.
 */
const ARTIFACTS_DIR = 'artifacts';

/**
 * Path to merge-notes.md where we append the snapshot section.
 * Relative to repository root.
 */
const MERGE_NOTES_PATH = 'docs/merge-notes.md';

/**
 * Git commands we run to capture repository state.
 * Each entry has:
 * - name: Human-readable label for the command
 * - command: The actual command to execute
 *
 * Note: The patch creation command is handled separately since it writes to a file.
 */
const GIT_COMMANDS = [
  {
    name: 'git status',
    command: 'git status',
  },
  {
    name: 'git branch --show-current',
    command: 'git branch --show-current',
  },
  {
    name: 'git diff --name-status develop...HEAD',
    command: 'git diff --name-status develop...HEAD',
  },
  {
    name: 'git diff --stat develop...HEAD',
    command: 'git diff --stat develop...HEAD',
  },
];

// ---------------------------------------------------------------------------
// Helper: Parse command-line arguments
// ---------------------------------------------------------------------------

/**
 * Parses the --day argument from process.argv.
 *
 * RETURNS:
 * - The day number (positive integer) if valid
 * - null if --day is missing or invalid
 *
 * WHY WE NEED THIS:
 * The user must specify which "Day" this snapshot is for, so we can name the
 * patch file correctly (day-15.patch) and title the merge-notes section.
 */
function parseDayArgument() {
  // Get all arguments after "node" and script name
  const args = process.argv.slice(2);

  // Look for --day in the arguments
  let dayIndex = -1;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--day') {
      dayIndex = i;
      break;
    }
  }

  // --day not found
  if (dayIndex === -1) {
    return null;
  }

  // --day found but no value after it
  if (dayIndex + 1 >= args.length) {
    return null;
  }

  // Get the value after --day
  const dayValue = args[dayIndex + 1];

  // Parse as integer
  const dayNumber = parseInt(dayValue, 10);

  // Validate: must be a positive integer
  // - parseInt returns NaN for non-numeric strings
  // - We also check it's > 0 and is a whole number
  if (Number.isNaN(dayNumber) || dayNumber <= 0 || dayNumber !== parseFloat(dayValue)) {
    return null;
  }

  return dayNumber;
}

// ---------------------------------------------------------------------------
// Helper: Execute a shell command and capture output
// ---------------------------------------------------------------------------

/**
 * Executes a shell command and returns the result (stdout and stderr).
 *
 * WHY SHELL: TRUE?
 * We use shell: true to support both PowerShell (Windows) and bash (Unix).
 * This allows git commands to work normally in both environments.
 *
 * @param {string} command - The command to execute
 * @returns {{ success: boolean, stdout: string, stderr: string }}
 */
function runCommand(command) {
  try {
    // Execute command with shell support
    // stdio: 'pipe' ensures we capture both stdout and stderr
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    return {
      success: true,
      stdout: output.trim(),
      stderr: '',
    };
  } catch (error) {
    // Command failed - capture what we can
    // execSync throws an error object with stdout/stderr properties
    const stdout = error.stdout ? error.stdout.toString().trim() : '';
    const stderr = error.stderr ? error.stderr.toString().trim() : '';

    return {
      success: false,
      stdout: stdout,
      stderr: stderr,
    };
  }
}

// ---------------------------------------------------------------------------
// Helper: Ensure artifacts directory exists
// ---------------------------------------------------------------------------

/**
 * Creates the artifacts/ directory if it doesn't exist.
 *
 * WHY THIS IS NEEDED:
 * The patch file will be written to artifacts/day-<N>.patch.
 * If the directory doesn't exist, the file write will fail.
 */
function ensureArtifactsDir() {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    console.log('📁 Created artifacts/ directory');
  }
}

// ---------------------------------------------------------------------------
// Helper: Get file size in human-readable format
// ---------------------------------------------------------------------------

/**
 * Gets the size of a file in human-readable format (e.g., "260 KB").
 *
 * WHY NOT USE ls -lh?
 * The ls command doesn't exist on Windows. We use Node's fs.statSync
 * to get the file size in bytes, then format it ourselves.
 *
 * @param {string} filePath - Path to the file
 * @returns {string} - Human-readable size (e.g., "1.5 MB") or error message
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const bytes = stats.size;

    // Convert bytes to human-readable format
    // Using 1024 as the base (KB, MB, GB)
    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      const kb = bytes / 1024;
      return kb.toFixed(1) + ' KB';
    } else if (bytes < 1024 * 1024 * 1024) {
      const mb = bytes / (1024 * 1024);
      return mb.toFixed(1) + ' MB';
    } else {
      const gb = bytes / (1024 * 1024 * 1024);
      return gb.toFixed(1) + ' GB';
    }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- error intentionally caught and ignored
  } catch (_error) {
    return '(file not found or cannot read size)';
  }
}

// ---------------------------------------------------------------------------
// Helper: Get current date in ISO format
// ---------------------------------------------------------------------------

/**
 * Returns the current date in a readable format for the snapshot header.
 *
 * @returns {string} - Date string like "December 13, 2025"
 */
function getCurrentDate() {
  const now = new Date();

  // Array of month names for formatting
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const month = months[now.getMonth()];
  const day = now.getDate();
  const year = now.getFullYear();

  return month + ' ' + day + ', ' + year;
}

// ---------------------------------------------------------------------------
// Main: Create the snapshot
// ---------------------------------------------------------------------------

/**
 * Main function that orchestrates the snapshot creation.
 *
 * STEPS:
 * 1. Parse and validate --day argument
 * 2. Ensure artifacts/ exists
 * 3. Create patch file
 * 4. Run git status commands
 * 5. Get patch file size
 * 6. Build markdown section
 * 7. Append to merge-notes.md
 */
function main() {
  console.log('📸 Day Snapshot Generator\n');

  // ---------------------------------------------------------------------------
  // Step 1: Parse and validate --day argument
  // ---------------------------------------------------------------------------
  const dayNumber = parseDayArgument();

  if (dayNumber === null) {
    console.error('❌ Error: --day argument is required and must be a positive integer.\n');
    console.error('Usage: node scripts/day-snapshot.mjs --day <N>\n');
    console.error('Examples:');
    console.error('  node scripts/day-snapshot.mjs --day 15');
    console.error('  pnpm docs:day-snapshot --day 15\n');
    process.exit(1);
  }

  console.log('   Day: ' + dayNumber);
  console.log('   Date: ' + getCurrentDate() + '\n');

  // ---------------------------------------------------------------------------
  // Step 2: Ensure artifacts/ directory exists
  // ---------------------------------------------------------------------------
  ensureArtifactsDir();

  // ---------------------------------------------------------------------------
  // Step 3: Create patch file (git diff develop...HEAD > artifacts/day-N.patch)
  // ---------------------------------------------------------------------------
  const patchFileName = 'day-' + dayNumber + '.patch';
  const patchFilePath = path.join(ARTIFACTS_DIR, patchFileName);

  console.log('📝 Creating patch file: ' + patchFilePath);

  const patchCommand = 'git diff develop...HEAD';
  const patchResult = runCommand(patchCommand);

  if (!patchResult.success) {
    console.error('⚠️  Warning: Patch creation had issues');
    if (patchResult.stderr) {
      console.error('   ' + patchResult.stderr);
    }
  }

  // Write patch to file (even if empty - that's valid if no changes)
  try {
    fs.writeFileSync(patchFilePath, patchResult.stdout, 'utf8');
    console.log('   ✓ Patch file created\n');
  } catch (error) {
    console.error('❌ Error writing patch file: ' + error.message);
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Step 4: Run git status commands and collect outputs
  // ---------------------------------------------------------------------------
  console.log('🔍 Capturing git state...\n');

  /**
   * Array to store command results for markdown generation.
   * Each entry has: { name, command, success, output }
   */
  const commandResults = [];

  for (let i = 0; i < GIT_COMMANDS.length; i++) {
    const cmdInfo = GIT_COMMANDS[i];
    console.log('   Running: ' + cmdInfo.command);

    const result = runCommand(cmdInfo.command);

    // Combine stdout and stderr for output
    let output = result.stdout;
    if (result.stderr) {
      output = output + '\n\n[stderr]:\n' + result.stderr;
    }

    commandResults.push({
      name: cmdInfo.name,
      command: cmdInfo.command,
      success: result.success,
      output: output,
    });

    if (!result.success) {
      console.log('   ⚠️  Command had issues (included in output)');
    } else {
      console.log('   ✓ Done');
    }
  }

  console.log('');

  // ---------------------------------------------------------------------------
  // Step 5: Get patch file size
  // ---------------------------------------------------------------------------
  const patchSize = getFileSize(patchFilePath);
  console.log('📦 Patch file: ' + patchFilePath + ' (' + patchSize + ')\n');

  // ---------------------------------------------------------------------------
  // Step 6: Build markdown section
  // ---------------------------------------------------------------------------
  console.log('📄 Building markdown section...\n');

  /**
   * Build the markdown content for the snapshot section.
   * Uses string concatenation (no template literals with backticks in content).
   */
  let markdown = '';

  // Section header
  markdown = markdown + '\n---\n\n';
  markdown = markdown + '## Snapshot – Day ' + dayNumber + ' (auto-generated)\n\n';
  markdown = markdown + '**Generated:** ' + getCurrentDate() + '\n\n';

  // Add each command and its output
  for (let i = 0; i < commandResults.length; i++) {
    const cmdResult = commandResults[i];

    markdown = markdown + '### ' + cmdResult.name + '\n\n';
    markdown = markdown + '**Command:**\n\n';
    markdown = markdown + '```bash\n';
    markdown = markdown + cmdResult.command + '\n';
    markdown = markdown + '```\n\n';

    if (!cmdResult.success) {
      markdown = markdown + '**Status:** ⚠️ Command had issues\n\n';
    }

    markdown = markdown + '**Output:**\n\n';
    markdown = markdown + '```\n';
    markdown = markdown + (cmdResult.output || '(no output)') + '\n';
    markdown = markdown + '```\n\n';
  }

  // Add patch file info
  markdown = markdown + '### Patch Artifact\n\n';
  markdown = markdown + '**File:** `' + patchFilePath + '`\n\n';
  markdown = markdown + '**Size:** ' + patchSize + '\n\n';
  markdown = markdown + '**Command used:**\n\n';
  markdown = markdown + '```bash\n';
  markdown = markdown + 'git diff develop...HEAD > ' + patchFilePath + '\n';
  markdown = markdown + '```\n\n';

  // Note about full diff
  markdown = markdown + '> Note: Full diff is in the patch file. ';
  markdown = markdown + 'Only summaries and file info are included here.\n';

  // ---------------------------------------------------------------------------
  // Step 7: Append to merge-notes.md
  // ---------------------------------------------------------------------------
  console.log('📝 Appending to ' + MERGE_NOTES_PATH + '...\n');

  try {
    // Read existing content
    let existingContent = '';
    if (fs.existsSync(MERGE_NOTES_PATH)) {
      existingContent = fs.readFileSync(MERGE_NOTES_PATH, 'utf8');
    }

    // Append new section
    const newContent = existingContent + markdown;

    // Write back
    fs.writeFileSync(MERGE_NOTES_PATH, newContent, 'utf8');

    console.log('   ✓ Snapshot section appended to merge-notes.md\n');
  } catch (error) {
    console.error('❌ Error updating merge-notes.md: ' + error.message);
    console.error('   The markdown content was generated but could not be appended.\n');
    console.error('   You can manually append the following section:\n');
    console.error('---BEGIN SECTION---');
    console.error(markdown);
    console.error('---END SECTION---\n');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Done!
  // ---------------------------------------------------------------------------
  console.log('✅ Snapshot complete!\n');
  console.log('   Artifacts:');
  console.log('   - ' + patchFilePath + ' (' + patchSize + ')');
  console.log('   - ' + MERGE_NOTES_PATH + ' (updated)\n');
  console.log('   Next steps:');
  console.log('   1. Review the appended section in ' + MERGE_NOTES_PATH);
  console.log('   2. Commit when ready (do NOT use this script to commit)\n');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
main();
