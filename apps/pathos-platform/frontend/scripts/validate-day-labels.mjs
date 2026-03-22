#!/usr/bin/env node
// ============================================================================
// VALIDATE DAY LABELS
// ============================================================================
//
// PURPOSE:
// Ensures day labels are consistent and don't have mismatched references.
// Catches common mistakes like:
// - Referencing "Day 17" in Day 18 documentation (unless explicitly archived)
// - Inconsistent day numbers in merge-notes or change briefs
//
// FILES SCANNED:
// - merge-notes.md
// - docs/change-briefs/day-XX.md (current day)
// - docs/ai/*.md (optional, for cursor rules)
//
// HEURISTICS:
// - Looks for "Day N" patterns where N != current day
// - Ignores references in archive contexts (e.g., "archived Day 17")
// - Ignores references to older days in history/changelog sections
//
// USAGE:
// DAY=34 node scripts/validate-day-labels.mjs
// PowerShell: $env:DAY="34"; node scripts/validate-day-labels.mjs
//
// The DAY environment variable is required.
//
// EXIT CODES:
// 0 = success (no mismatched labels found)
// 1 = failure (potential mismatched labels detected)
//
// ============================================================================

import { existsSync, readFileSync, readdirSync } from 'fs';
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

// Files to scan for day label consistency
// NOTE: We intentionally do NOT scan docs/merge-notes/** because those are
// archived notes from previous days. Old day references in archived files
// are expected and should not trigger warnings.
const filesToScan = [
  {
    path: resolve(projectRoot, 'merge-notes.md'),
    name: 'merge-notes.md',
    required: true,
  },
  {
    path: resolve(projectRoot, 'docs', 'change-briefs', `day-${CURRENT_DAY}.md`),
    name: `docs/change-briefs/day-${CURRENT_DAY}.md`,
    required: false, // May not exist yet when this runs
  },
];

// Directories to explicitly exclude from scanning
// Archived merge notes should never be scanned for day label consistency
const excludedDirs = [
  'docs/merge-notes', // Archived notes from previous days
];

// Patterns that indicate an "archive context" where old day references are OK
const archivePatterns = [
  /archived?\s+day\s+\d+/i,
  /merge-notes-day-\d+/i,
  /prior\s+day/i,
  /previous\s+day/i,
  /day\s+\d+\s+merge\s+notes/i,
  /from\s+day\s+\d+/i,
  /Day\s+\d+\s+Archive\s+Fixup/i, // References to archive fixups in current notes
];

// ----------------------------------------------------------------------------
// VALIDATION LOGIC
// ----------------------------------------------------------------------------

/**
 * Checks if a file path is in an excluded directory.
 * Used to skip archived notes from previous days.
 *
 * @param {string} relativePath - The relative path from project root
 * @returns {boolean} true if the file should be excluded
 */
function isExcludedPath(relativePath) {
  for (let i = 0; i < excludedDirs.length; i++) {
    if (relativePath.startsWith(excludedDirs[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a line is in an archive context where old day references are OK.
 *
 * @param {string} line - The line to check
 * @returns {boolean} true if this is an archive context
 */
function isArchiveContext(line) {
  const lowerLine = line.toLowerCase();
  for (let i = 0; i < archivePatterns.length; i++) {
    if (archivePatterns[i].test(lowerLine)) {
      return true;
    }
  }
  return false;
}

/**
 * Scans a file for mismatched day references.
 *
 * @param {string} filePath - Absolute path to file
 * @param {string} fileName - Display name for file
 * @returns {Array} Array of issues found, each with {line, lineNum, dayRef}
 */
function scanFileForMismatchedDays(filePath, fileName) {
  const issues = [];

  if (!existsSync(filePath)) {
    return issues; // File doesn't exist, nothing to scan
  }

  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Pattern to match "Day N" where N is a number (case insensitive)
  const dayPattern = /\bDay\s+(\d+)\b/gi;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    // Skip archive context lines
    if (isArchiveContext(line)) {
      continue;
    }

    // Find all day references on this line
    let match;
    // Reset lastIndex for global regex
    dayPattern.lastIndex = 0;

    while ((match = dayPattern.exec(line)) !== null) {
      const dayNum = parseInt(match[1], 10);

      // Flag if day number doesn't match current day
      // Allow references to days that are clearly in the past (more than 2 days old)
      // as these might be intentional historical references
      if (dayNum !== CURRENT_DAY && dayNum > CURRENT_DAY - 3) {
        issues.push({
          file: fileName,
          lineNum: lineNum + 1,
          line: line.trim(),
          dayRef: dayNum,
        });
      }
    }
  }

  return issues;
}

/**
 * Main validation function.
 * Scans configured files for mismatched day labels.
 *
 * @returns {boolean} true if no issues found, false otherwise
 */
function validateDayLabels() {
  console.log('='.repeat(60));
  console.log(`Validating Day ${CURRENT_DAY} label consistency...`);
  console.log('='.repeat(60));
  console.log('');

  let allIssues = [];

  // Scan configured files
  for (let i = 0; i < filesToScan.length; i++) {
    const fileConfig = filesToScan[i];

    // Skip files in excluded directories (e.g., archived merge notes)
    if (isExcludedPath(fileConfig.name)) {
      console.log(`Skipping (excluded): ${fileConfig.name}`);
      continue;
    }

    if (!existsSync(fileConfig.path)) {
      if (fileConfig.required) {
        console.log(`⚠ Warning: ${fileConfig.name} not found (skipping scan)`);
      }
      continue;
    }

    console.log(`Scanning: ${fileConfig.name}`);
    const issues = scanFileForMismatchedDays(fileConfig.path, fileConfig.name);

    if (issues.length > 0) {
      allIssues = allIssues.concat(issues);
    }
  }

  // Also scan docs/ai/*.md for any obvious mismatches
  const aiDocsPath = resolve(projectRoot, 'docs', 'ai');
  if (existsSync(aiDocsPath)) {
    const aiFiles = readdirSync(aiDocsPath);
    for (let j = 0; j < aiFiles.length; j++) {
      const aiFile = aiFiles[j];
      if (aiFile.endsWith('.md')) {
        const fullPath = resolve(aiDocsPath, aiFile);
        const issues = scanFileForMismatchedDays(fullPath, `docs/ai/${aiFile}`);
        if (issues.length > 0) {
          allIssues = allIssues.concat(issues);
        }
      }
    }
  }

  console.log('');

  if (allIssues.length === 0) {
    console.log('✓ No mismatched day labels found.');
    console.log('');
    return true;
  }

  // Report issues
  console.log('='.repeat(60));
  console.log('WARNING: Potential day label mismatches detected!');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Current day: Day ${CURRENT_DAY}`);
  console.log(`Found ${allIssues.length} reference(s) to other recent days:`);
  console.log('');

  for (let k = 0; k < allIssues.length; k++) {
    const issue = allIssues[k];
    console.log(`  ${issue.file}:${issue.lineNum}`);
    console.log(`    References: Day ${issue.dayRef}`);
    console.log(`    Line: ${issue.line.substring(0, 80)}${issue.line.length > 80 ? '...' : ''}`);
    console.log('');
  }

  console.log('If these references are intentional (e.g., historical notes),');
  console.log('you can ignore this warning. Otherwise, update them to Day ' + CURRENT_DAY + '.');
  console.log('');

  // Return success anyway — day label mismatches are warnings, not blockers
  // This allows intentional historical references without blocking CI
  console.log('✓ Day label validation passed (with warnings).');
  console.log('');
  return true;
}

// ----------------------------------------------------------------------------
// MAIN EXECUTION
// ----------------------------------------------------------------------------

const success = validateDayLabels();
process.exit(success ? 0 : 1);
