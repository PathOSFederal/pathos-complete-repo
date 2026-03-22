#!/usr/bin/env node
// ============================================================================
// GENERATE DAY PATCHES
// ============================================================================
//
// PURPOSE:
// Generates exactly two patch files per day:
// - artifacts/day-<N>.patch (cumulative, baseline develop to current working tree)
// - artifacts/day-<N>-run.patch (incremental for the latest Cursor run)
//
// USAGE:
//   node scripts/gen-day-patches.mjs --day 34
//   DAY=34 node scripts/gen-day-patches.mjs
//   pnpm docs:day-patches --day 34
//
// REQUIREMENTS:
// - Node only, no optional chaining or nullish coalescing
// - Writes UTF-8 files
// - Includes untracked files via git add -N
// - Excludes artifacts/ folder from diffs
//
// ============================================================================

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const artifactsDir = resolve(projectRoot, 'artifacts');

// ----------------------------------------------------------------------------
// ARGUMENT PARSING
// ----------------------------------------------------------------------------

/**
 * Get day number from CLI args or environment variable.
 * @returns {number} Day number
 */
function getDayNumber() {
  // Check CLI args for --day <number>
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--day' && i + 1 < args.length) {
      const day = parseInt(args[i + 1], 10);
      if (!isNaN(day) && day > 0) {
        return day;
      }
    }
  }
  
  // Check environment variable
  if (process.env.DAY) {
    const day = parseInt(process.env.DAY, 10);
    if (!isNaN(day) && day > 0) {
      return day;
    }
  }
  
  console.error('ERROR: Day number required');
  console.error('Usage: node scripts/gen-day-patches.mjs --day <N>');
  console.error('   or: DAY=<N> node scripts/gen-day-patches.mjs');
  process.exit(1);
}

// ----------------------------------------------------------------------------
// GIT COMMANDS
// ----------------------------------------------------------------------------

/**
 * Run git command and return output as string. Exits on error.
 * Use this for commands that must succeed (e.g., git add -N).
 * @param {string} command - Git command to run
 * @returns {string} Command output
 */
function runGitStrict(command) {
  try {
    return execSync(command, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (error) {
    console.error('ERROR: Git command failed:', command);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Run git command and return result object. Does NOT exit on error.
 * Use this when you need fallback logic (e.g., pathspec exclude with manual filtering).
 * @param {string} command - Git command to run
 * @returns {{ ok: boolean, out: string }} Result object with success flag and output
 */
function runGitTry(command) {
  try {
    const output = execSync(command, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return { ok: true, out: output };
  } catch {
    return { ok: false, out: '' };
  }
}

/**
 * Ensure untracked files are included in diffs.
 */
function addUntrackedFiles() {
  runGitStrict('git add -N .');
}

/**
 * Generate cumulative patch (develop baseline to current working tree).
 * @param {number} day - Day number
 * @returns {string} Patch content
 */
function generateCumulativePatch(day) {
  console.log(`[gen-day-patches] Generating cumulative patch for day ${day}...`);
  
  // Try with pathspec exclude first
  const result = runGitTry('git diff --binary develop -- . ":(exclude)artifacts"');
  
  if (result.ok) {
    return result.out;
  }
  
  // Fallback: use git diff and filter out artifacts manually
  console.log('[gen-day-patches] Pathspec exclude failed, using fallback method...');
  const fullResult = runGitTry('git diff --binary develop -- .');
  
  if (!fullResult.ok) {
    console.error('ERROR: Both pathspec and full diff failed');
    process.exit(1);
  }
  
  // Simple filter: remove lines that reference artifacts/ in file paths
  const lines = fullResult.out.split('\n');
  const filtered = [];
  let skipFile = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if this is a file header line
    if (line.startsWith('diff --git')) {
      skipFile = line.includes('artifacts/');
    }
    if (!skipFile) {
      filtered.push(line);
    }
  }
  
  return filtered.join('\n');
}

/**
 * Generate incremental patch (current run, HEAD to working tree).
 * @param {number} day - Day number
 * @returns {string} Patch content
 */
function generateIncrementalPatch(day) {
  console.log(`[gen-day-patches] Generating incremental patch for day ${day}...`);
  
  // Try with pathspec exclude first
  const result = runGitTry('git diff --binary HEAD -- . ":(exclude)artifacts"');
  
  if (result.ok) {
    return result.out;
  }
  
  // Fallback: use git diff and filter out artifacts manually
  console.log('[gen-day-patches] Pathspec exclude failed, using fallback method...');
  const fullResult = runGitTry('git diff --binary HEAD -- .');
  
  if (!fullResult.ok) {
    console.error('ERROR: Both pathspec and full diff failed');
    process.exit(1);
  }
  
  // Simple filter: remove lines that reference artifacts/ in file paths
  const lines = fullResult.out.split('\n');
  const filtered = [];
  let skipFile = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if this is a file header line
    if (line.startsWith('diff --git')) {
      skipFile = line.includes('artifacts/');
    }
    if (!skipFile) {
      filtered.push(line);
    }
  }
  
  return filtered.join('\n');
}

// ----------------------------------------------------------------------------
// FILE WRITING
// ----------------------------------------------------------------------------

/**
 * Write patch file with UTF-8 encoding.
 * @param {string} filePath - Full path to file
 * @param {string} content - Patch content
 */
function writePatchFile(filePath, content) {
  // Ensure directory exists
  if (!existsSync(artifactsDir)) {
    mkdirSync(artifactsDir, { recursive: true });
  }
  
  // Write with UTF-8 encoding
  writeFileSync(filePath, content, { encoding: 'utf8' });
  
  // Get file size for logging
  const stats = statSync(filePath);
  console.log(`[gen-day-patches] Written: ${filePath} (${stats.size} bytes)`);
}

// ----------------------------------------------------------------------------
// MAIN EXECUTION
// ----------------------------------------------------------------------------

function main() {
  const day = getDayNumber();
  
  console.log('='.repeat(60));
  console.log(`Generating Day ${day} patch artifacts...`);
  console.log('='.repeat(60));
  console.log('');
  
  // Ensure untracked files are included
  addUntrackedFiles();
  
  // Generate cumulative patch
  const cumulativePatch = generateCumulativePatch(day);
  const cumulativePath = resolve(artifactsDir, `day-${day}.patch`);
  writePatchFile(cumulativePath, cumulativePatch);
  
  // Generate incremental patch
  const incrementalPatch = generateIncrementalPatch(day);
  const incrementalPath = resolve(artifactsDir, `day-${day}-run.patch`);
  writePatchFile(incrementalPath, incrementalPatch);
  
  console.log('');
  console.log('='.repeat(60));
  console.log(`✓ Day ${day} patch artifacts generated successfully`);
  console.log('='.repeat(60));
  console.log('');
  console.log('Files created:');
  console.log(`  - artifacts/day-${day}.patch (cumulative)`);
  console.log(`  - artifacts/day-${day}-run.patch (incremental)`);
  console.log('');
}

main();

