#!/usr/bin/env node
// ============================================================================
// VALIDATE DAY ARTIFACTS
// ============================================================================
//
// PURPOSE:
// Ensures day patch artifacts exist before a PR can be merged.
// This enforces the Definition of Done requirement that every day's work
// produces traceable patch files.
//
// REQUIRED FILES:
// - artifacts/day-XX.patch (cumulative patch from develop baseline)
// - artifacts/day-XX-run.patch (incremental patch for current run)
//
// USAGE:
// DAY=34 node scripts/validate-day-artifacts.mjs
// PowerShell: $env:DAY="34"; node scripts/validate-day-artifacts.mjs
//
// The DAY environment variable is required. If not set, the script will try to
// detect the day from docs/merge-notes/current.md or the branch name, but
// explicit DAY env var is preferred for CI and consistency.
//
// EXIT CODES:
// 0 = success (both files exist)
// 1 = failure (one or both files missing)
//
// ============================================================================

import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------

// Build absolute paths
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const artifactsDir = resolve(projectRoot, 'artifacts');
const mergeNotesPath = resolve(projectRoot, 'docs', 'merge-notes', 'current.md');

/**
 * Get current day number from environment variable, merge notes, or branch name.
 * Priority: DAY env var > merge-notes/current.md > branch name
 * @returns {number|null} Day number or null if not found
 */
function getCurrentDay() {
  // Priority 1: Check DAY environment variable (explicit override)
  if (process.env.DAY) {
    const day = parseInt(process.env.DAY, 10);
    if (!isNaN(day) && day > 0) {
      return day;
    }
  }

  // Priority 2: Try to read from merge-notes/current.md
  if (existsSync(mergeNotesPath)) {
    const content = readFileSync(mergeNotesPath, 'utf8');
    const match = content.match(/\bDay\s+(\d+)\b/i);
    if (match) {
      const day = parseInt(match[1], 10);
      if (!isNaN(day) && day > 0) {
        return day;
      }
    }
  }
  
  // Priority 3: Try to detect from branch name
  try {
    const branch = execSync('git branch --show-current', {
      cwd: projectRoot,
      encoding: 'utf8'
    }).trim();
    const branchMatch = branch.match(/day[-\s]?(\d+)/i);
    if (branchMatch) {
      const day = parseInt(branchMatch[1], 10);
      if (!isNaN(day) && day > 0) {
        return day;
      }
    }
  } catch {
    // Git command failed, continue
  }
  
  return null;
}

// Get day number
const CURRENT_DAY = getCurrentDay();

if (!CURRENT_DAY) {
  console.error('ERROR: Could not determine current day number');
  console.error('');
  console.error('Please set the DAY environment variable:');
  console.error('  PowerShell: $env:DAY="34"; pnpm ci:validate');
  console.error('  Bash: DAY=34 pnpm ci:validate');
  console.error('');
  console.error('Alternatively, ensure docs/merge-notes/current.md contains "Day N"');
  console.error('or that your branch name contains a day number.');
  process.exit(1);
}

const requiredFiles = [
  {
    path: resolve(artifactsDir, `day-${CURRENT_DAY}.patch`),
    name: `artifacts/day-${CURRENT_DAY}.patch`,
    description: 'Cumulative patch (develop baseline to working tree)',
    command: `pnpm docs:day-patches --day ${CURRENT_DAY}`,
  },
  {
    path: resolve(artifactsDir, `day-${CURRENT_DAY}-run.patch`),
    name: `artifacts/day-${CURRENT_DAY}-run.patch`,
    description: 'Incremental patch (current run)',
    command: `pnpm docs:day-patches --day ${CURRENT_DAY}`,
  },
];

// ----------------------------------------------------------------------------
// VALIDATION LOGIC
// ----------------------------------------------------------------------------

/**
 * Validates that all required day artifact files exist.
 * Prints clear error messages with exact commands to fix issues.
 *
 * @returns {boolean} true if all files exist, false otherwise
 */
function validateDayArtifacts() {
  console.log('='.repeat(60));
  console.log(`Validating Day ${CURRENT_DAY} patch artifacts...`);
  console.log('='.repeat(60));
  console.log('');

  let allExist = true;
  const missingFiles = [];

  for (let i = 0; i < requiredFiles.length; i++) {
    const file = requiredFiles[i];
    const exists = existsSync(file.path);

    if (exists) {
      console.log(`✓ Found: ${file.name}`);
    } else {
      console.log(`✗ MISSING: ${file.name}`);
      missingFiles.push(file);
      allExist = false;
    }
  }

  console.log('');

  if (!allExist) {
    console.log('='.repeat(60));
    console.log('ERROR: Missing required patch artifacts!');
    console.log('='.repeat(60));
    console.log('');
    console.log('To fix, run these commands:');
    console.log('');

    for (let j = 0; j < missingFiles.length; j++) {
      const missing = missingFiles[j];
      console.log(`# ${missing.description}`);
      console.log(missing.command);
      console.log('');
    }

    console.log('Then re-run: pnpm ci:validate');
    console.log('');
    return false;
  }

  console.log('✓ All Day ' + CURRENT_DAY + ' patch artifacts present.');
  console.log('');
  return true;
}

// ----------------------------------------------------------------------------
// MAIN EXECUTION
// ----------------------------------------------------------------------------

const success = validateDayArtifacts();
process.exit(success ? 0 : 1);
