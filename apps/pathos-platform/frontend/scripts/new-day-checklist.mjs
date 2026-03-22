#!/usr/bin/env node

/**
 * ============================================================================
 * NEW DAY CHECKLIST GENERATOR
 * ============================================================================
 *
 * PURPOSE:
 * Creates a new day checklist file from the template. Helps reduce context
 * reset between development sessions by providing a consistent structure.
 *
 * USAGE:
 *   pnpm day:new <day-number> <title>
 *
 * EXAMPLES:
 *   pnpm day:new 14 "Process Hardening"
 *   pnpm day:new 15 "API Integration"
 *
 * OUTPUT:
 *   Creates docs/day-by-day/day-XX-slug.md from the template
 *
 * NOTES:
 *   - Will not overwrite existing files (safety check)
 *   - Day number must be a positive integer
 *   - Title is used to generate both the heading and filename slug
 *
 * ============================================================================
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get the project root directory.
 * __dirname equivalent for ES modules.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

/**
 * Paths relative to project root
 */
const TEMPLATE_PATH = join(PROJECT_ROOT, 'docs', 'day-checklist-template.md');
const OUTPUT_DIR = join(PROJECT_ROOT, 'docs', 'day-by-day');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converts a title string to a URL-friendly slug.
 *
 * HOW IT WORKS:
 * 1. Convert to lowercase
 * 2. Replace spaces with hyphens
 * 3. Remove non-alphanumeric characters (except hyphens)
 * 4. Collapse multiple hyphens into one
 * 5. Trim leading/trailing hyphens
 *
 * EXAMPLES:
 *   "Process Hardening" → "process-hardening"
 *   "API Integration v2" → "api-integration-v2"
 *   "Bug Fix -- Critical!" → "bug-fix-critical"
 *
 * @param {string} title - The title to slugify
 * @returns {string} URL-friendly slug
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '')     // Remove non-alphanumeric (except hyphens)
    .replace(/-+/g, '-')            // Collapse multiple hyphens
    .replace(/^-|-$/g, '');         // Trim leading/trailing hyphens
}

/**
 * Pads a number to 2 digits with leading zero.
 *
 * EXAMPLES:
 *   padDay(5) → "05"
 *   padDay(14) → "14"
 *
 * @param {number} num - The number to pad
 * @returns {string} Two-digit string
 */
function padDay(num) {
  return num.toString().padStart(2, '0');
}

/**
 * Gets today's date in YYYY-MM-DD format.
 *
 * @returns {string} ISO date string (date portion only)
 */
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Prints usage information and exits.
 */
function printUsage() {
  console.log('');
  console.log('Usage: pnpm day:new <day-number> <title>');
  console.log('');
  console.log('Arguments:');
  console.log('  day-number   Positive integer (e.g., 14, 15)');
  console.log('  title        Title for the day in quotes');
  console.log('');
  console.log('Examples:');
  console.log('  pnpm day:new 14 "Process Hardening"');
  console.log('  pnpm day:new 15 "API Integration"');
  console.log('');
  process.exit(1);
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

/**
 * Main function - parses arguments and creates the checklist file.
 */
function main() {
  // --------------------------------------------------------------------------
  // STEP 1: Parse command line arguments
  // --------------------------------------------------------------------------
  const args = process.argv.slice(2);

  // Check for help flag
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
  }

  // Validate argument count
  if (args.length < 2) {
    console.error('Error: Missing required arguments.');
    printUsage();
  }

  const dayNumberArg = args[0];
  // Join remaining args as title (handles titles with spaces even without quotes)
  const title = args.slice(1).join(' ');

  // --------------------------------------------------------------------------
  // STEP 2: Validate day number
  // --------------------------------------------------------------------------
  const dayNumber = parseInt(dayNumberArg, 10);

  if (isNaN(dayNumber) || dayNumber < 1) {
    console.error('Error: Day number must be a positive integer.');
    console.error(`  Received: "${dayNumberArg}"`);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // STEP 3: Validate title
  // --------------------------------------------------------------------------
  if (!title || title.trim() === '') {
    console.error('Error: Title cannot be empty.');
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // STEP 4: Generate output filename
  // --------------------------------------------------------------------------
  const slug = slugify(title);
  const paddedDay = padDay(dayNumber);
  const filename = `day-${paddedDay}-${slug}.md`;
  const outputPath = join(OUTPUT_DIR, filename);

  // --------------------------------------------------------------------------
  // STEP 5: Check if file already exists
  // --------------------------------------------------------------------------
  if (existsSync(outputPath)) {
    console.error('Error: File already exists and will not be overwritten.');
    console.error(`  Path: ${outputPath}`);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // STEP 6: Ensure output directory exists
  // --------------------------------------------------------------------------
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUTPUT_DIR}`);
  }

  // --------------------------------------------------------------------------
  // STEP 7: Read template
  // --------------------------------------------------------------------------
  let template;
  try {
    template = readFileSync(TEMPLATE_PATH, 'utf-8');
  } catch (error) {
    console.error('Error: Could not read template file.');
    console.error(`  Path: ${TEMPLATE_PATH}`);
    console.error(`  Error: ${error.message}`);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // STEP 8: Replace placeholders in template
  // --------------------------------------------------------------------------
  const today = getTodayDate();
  const branchName = `feature/day-${paddedDay}-${slug}`;

  let content = template;

  // Replace the template header with the actual content
  // First, remove the "Day Checklist Template" header and usage note
  content = content.replace(
    /# Day Checklist Template\n\n> \*\*Usage\*\*:.*?\n\n---\n\n/s,
    ''
  );

  // Replace placeholder values
  content = content
    .replace(/Day XX — \[Title\]/g, `Day ${paddedDay} — ${title}`)
    .replace(/`feature\/day-XX-short-slug`/g, `\`${branchName}\``)
    .replace(/YYYY-MM-DD/g, today);

  // --------------------------------------------------------------------------
  // STEP 9: Write output file
  // --------------------------------------------------------------------------
  try {
    writeFileSync(outputPath, content, 'utf-8');
  } catch (error) {
    console.error('Error: Could not write output file.');
    console.error(`  Path: ${outputPath}`);
    console.error(`  Error: ${error.message}`);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // STEP 10: Print success message
  // --------------------------------------------------------------------------
  console.log('');
  console.log('✅ Day checklist created successfully!');
  console.log('');
  console.log(`  File:   ${filename}`);
  console.log(`  Path:   ${outputPath}`);
  console.log(`  Branch: ${branchName}`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. git checkout -b ${branchName}`);
  console.log(`  2. Open ${filename} and fill in the tasks`);
  console.log('');
}

// Run main function
main();
