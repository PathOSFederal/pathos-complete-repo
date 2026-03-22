#!/usr/bin/env node

/**
 * check-docs-artifacts.mjs
 * 
 * PURPOSE:
 * This script ensures that every Day PR includes the required documentation artifacts:
 * 1. merge-notes.md - Technical documentation for engineers
 * 2. docs/change-briefs/day-14.md - Non-technical summary for stakeholders
 * 
 * HOW IT WORKS:
 * 1. Finds the merge-base between origin/develop and HEAD
 * 2. Gets the list of files changed in that range
 * 3. If any "code files" changed (app/, components/, lib/, stores/, contexts/, scripts/),
 *    it requires both documentation files to also be changed
 * 4. If only non-code files changed, no requirements are enforced
 * 
 * USAGE:
 * pnpm docs:check
 * 
 * This script is designed to be Windows-safe by using execFileSync instead of shell commands.
 */

import { execFileSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Configuration: Which directories contain "code" that requires documentation
// ---------------------------------------------------------------------------
const CODE_ROOTS = [
  'app/',
  'components/',
  'lib/',
  'stores/',
  'contexts/',
  'scripts/',
  'store/', // Also check store/ since some projects use this naming
];

// ---------------------------------------------------------------------------
// Configuration: Which documentation files are required when code changes
// ---------------------------------------------------------------------------
const REQUIRED_DOCS = [
  'merge-notes.md',
  'docs/change-briefs/day-14.md',
];

// ---------------------------------------------------------------------------
// Helper: Run git command safely (Windows-compatible, no shell)
// ---------------------------------------------------------------------------
/**
 * Executes a git command using execFileSync (no shell, Windows-safe).
 * 
 * @param {string[]} args - Arguments to pass to git
 * @returns {string} - Trimmed stdout from the command
 */
function runGit(args) {
  try {
    const result = execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch (error) {
    // If the command fails, return empty string or re-throw based on context
    // For merge-base, an error might mean we're on develop itself
    if (error.stderr && error.stderr.includes('fatal')) {
      console.error(`Git error: ${error.stderr}`);
    }
    return '';
  }
}

// ---------------------------------------------------------------------------
// Main: Check if documentation artifacts are present when code changes
// ---------------------------------------------------------------------------
function main() {
  console.log('📋 Checking documentation artifacts...\n');

  // Step 1: Find merge-base between origin/develop and HEAD
  // This gives us the common ancestor, so we can see what changed in this branch
  const mergeBase = runGit(['merge-base', 'origin/develop', 'HEAD']);
  
  if (!mergeBase) {
    // If we can't find a merge-base, we might be on develop or origin/develop doesn't exist
    console.log('⚠️  Could not determine merge-base with origin/develop.');
    console.log('   This might mean:');
    console.log('   - You are on the develop branch itself');
    console.log('   - origin/develop does not exist locally');
    console.log('   - This is the first commit\n');
    console.log('✅ Skipping documentation check.\n');
    process.exit(0);
  }

  console.log(`   Merge base: ${mergeBase.slice(0, 8)}`);

  // Step 2: Get list of changed files in the range mergeBase..HEAD
  // Using diff --name-only to get just file paths
  const diffOutput = runGit(['diff', '--name-only', `${mergeBase}..HEAD`]);
  
  if (!diffOutput) {
    console.log('   No files changed relative to origin/develop.\n');
    console.log('✅ No documentation required.\n');
    process.exit(0);
  }

  const changedFiles = diffOutput.split('\n').filter(Boolean);
  console.log(`   Files changed: ${changedFiles.length}\n`);

  // Step 3: Check if any code files changed
  // A file is a "code file" if it starts with any of the CODE_ROOTS prefixes
  const codeFilesChanged = changedFiles.filter(function(file) {
    // Normalize path separators for Windows compatibility
    const normalizedFile = file.replace(/\\/g, '/');
    
    for (let i = 0; i < CODE_ROOTS.length; i++) {
      if (normalizedFile.startsWith(CODE_ROOTS[i])) {
        return true;
      }
    }
    return false;
  });

  if (codeFilesChanged.length === 0) {
    console.log('   No code files changed (only docs/config).\n');
    console.log('✅ No documentation required.\n');
    process.exit(0);
  }

  console.log(`   Code files changed: ${codeFilesChanged.length}`);
  console.log('   Sample code files:');
  // Show first 5 code files as examples
  for (let i = 0; i < Math.min(5, codeFilesChanged.length); i++) {
    console.log(`     - ${codeFilesChanged[i]}`);
  }
  if (codeFilesChanged.length > 5) {
    console.log(`     ... and ${codeFilesChanged.length - 5} more\n`);
  } else {
    console.log('');
  }

  // Step 4: Check if required documentation files are in the changed files list
  const missingDocs = [];
  
  for (let i = 0; i < REQUIRED_DOCS.length; i++) {
    const docFile = REQUIRED_DOCS[i];
    // Normalize for comparison
    const normalizedDocFile = docFile.replace(/\\/g, '/');
    
    // Check if this doc file is in the changed files
    const found = changedFiles.some(function(file) {
      const normalizedFile = file.replace(/\\/g, '/');
      return normalizedFile === normalizedDocFile;
    });
    
    if (!found) {
      missingDocs.push(docFile);
    }
  }

  // Step 5: Report results
  if (missingDocs.length === 0) {
    console.log('✅ All required documentation artifacts are present!\n');
    process.exit(0);
  }

  // Some docs are missing - report error
  console.error('❌ Missing required documentation artifacts!\n');
  console.error('   The following documentation files must be modified when code changes:\n');
  
  for (let i = 0; i < missingDocs.length; i++) {
    console.error(`   ❌ ${missingDocs[i]}`);
  }
  
  console.error('\n   How to fix:');
  console.error('   1. Update merge-notes.md with details about your changes');
  console.error('   2. Update docs/change-briefs/day-14.md with a non-technical summary');
  console.error('   3. See docs/dev-docs/docs-protocol.md for templates and guidance\n');
  
  process.exit(1);
}

// Run the main function
main();
