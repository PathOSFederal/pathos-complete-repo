#!/usr/bin/env node
// ============================================================================
// VALIDATE CHANGE BRIEF
// ============================================================================
//
// PURPOSE:
// Ensures the day's change brief document exists before a PR can be merged.
// Change briefs are non-technical summaries for stakeholders explaining:
// - What changed
// - Why it matters
// - What users/devs should notice
//
// REQUIRED FILE:
// - docs/change-briefs/day-XX.md
//
// USAGE:
// DAY=34 node scripts/validate-change-brief.mjs
// PowerShell: $env:DAY="34"; node scripts/validate-change-brief.mjs
//
// The DAY environment variable is required.
//
// EXIT CODES:
// 0 = success (file exists)
// 1 = failure (file missing)
//
// ============================================================================

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------

// Build absolute paths
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

/**
 * Get current day number from environment variable.
 * @returns {number|null} Day number or null if not found
 */
function getCurrentDay() {
  // Check DAY environment variable (required)
  if (process.env.DAY) {
    const day = parseInt(process.env.DAY, 10);
    if (!isNaN(day) && day > 0) {
      return day;
    }
  }
  return null;
}

// Get day number
const CURRENT_DAY = getCurrentDay();

if (!CURRENT_DAY) {
  console.error('ERROR: DAY environment variable is required');
  console.error('');
  console.error('Please set the DAY environment variable:');
  console.error('  PowerShell: $env:DAY="34"; pnpm ci:validate');
  console.error('  Bash: DAY=34 pnpm ci:validate');
  console.error('');
  process.exit(1);
}

// Build absolute path to required change brief file
const changeBriefPath = resolve(
  projectRoot,
  'docs',
  'change-briefs',
  `day-${CURRENT_DAY}.md`
);
const changeBriefRelative = `docs/change-briefs/day-${CURRENT_DAY}.md`;

// ----------------------------------------------------------------------------
// VALIDATION LOGIC
// ----------------------------------------------------------------------------

/**
 * Validates that the day's change brief file exists.
 * Prints clear error message with guidance on what to include.
 *
 * @returns {boolean} true if file exists, false otherwise
 */
function validateChangeBrief() {
  console.log('='.repeat(60));
  console.log(`Validating Day ${CURRENT_DAY} change brief...`);
  console.log('='.repeat(60));
  console.log('');

  const exists = existsSync(changeBriefPath);

  if (exists) {
    console.log(`✓ Found: ${changeBriefRelative}`);
    console.log('');
    console.log('✓ Day ' + CURRENT_DAY + ' change brief present.');
    console.log('');
    return true;
  }

  console.log(`✗ MISSING: ${changeBriefRelative}`);
  console.log('');
  console.log('='.repeat(60));
  console.log('ERROR: Missing required change brief!');
  console.log('='.repeat(60));
  console.log('');
  console.log('Create the file with this structure:');
  console.log('');
  console.log('```markdown');
  console.log(`# Day ${CURRENT_DAY} — [Title]`);
  console.log('');
  console.log('## What Changed');
  console.log('- [Brief bullet points]');
  console.log('');
  console.log('## Why It Matters');
  console.log('- [Business/user impact]');
  console.log('');
  console.log('## What to Notice');
  console.log('- [Observable changes for users/devs]');
  console.log('```');
  console.log('');
  console.log('Then re-run: pnpm ci:validate');
  console.log('');
  return false;
}

// ----------------------------------------------------------------------------
// MAIN EXECUTION
// ----------------------------------------------------------------------------

const success = validateChangeBrief();
process.exit(success ? 0 : 1);
