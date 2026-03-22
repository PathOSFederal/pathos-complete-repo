/**
 * ============================================================================
 * BOUNDARY CHECK SCRIPT
 * ============================================================================
 *
 * Enforces architectural boundaries for the monorepo packages:
 *
 * 1. packages/core  — MUST NOT import next/*, electron/*, react-router*
 * 2. packages/ui    — MUST NOT import next/*, electron/*, react-router*
 * 3. packages/adapters/src — adapter interfaces only; MUST NOT import
 *    next/*, electron/*, react-router* (implementations live in apps/)
 *
 * Run: pnpm check:boundaries
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const FORBIDDEN_PATTERNS = [
  // Next.js
  /from\s+['"]next\//,
  /require\(\s*['"]next\//,
  /import\s+['"]next\//,
  // Electron
  /from\s+['"]electron['"]/,
  /require\(\s*['"]electron['"]/,
  /import\s+['"]electron['"]/,
  // React Router (only allowed in apps/)
  /from\s+['"]react-router/,
  /require\(\s*['"]react-router/,
  /import\s+['"]react-router/,
];

const PACKAGES_TO_CHECK = [
  { name: 'packages/core', dir: path.join(ROOT, 'packages', 'core', 'src') },
  { name: 'packages/ui', dir: path.join(ROOT, 'packages', 'ui', 'src') },
  { name: 'packages/adapters', dir: path.join(ROOT, 'packages', 'adapters', 'src') },
];

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

/**
 * Recursively collect all source files in a directory.
 */
function collectSourceFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) {
    return results;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Check a single file for forbidden imports.
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          line: i + 1,
          text: line.trim(),
          pattern: pattern.source,
        });
      }
    }
  }

  return violations;
}

// Main
let totalViolations = 0;
const report = [];

for (const pkg of PACKAGES_TO_CHECK) {
  const files = collectSourceFiles(pkg.dir);
  for (const file of files) {
    const violations = checkFile(file);
    if (violations.length > 0) {
      const relPath = path.relative(ROOT, file);
      totalViolations += violations.length;
      for (const v of violations) {
        report.push(`  VIOLATION: ${relPath}:${v.line} — ${v.text}`);
      }
    }
  }
}

if (totalViolations > 0) {
  console.error(`\nBoundary check FAILED: ${totalViolations} violation(s) found.\n`);
  for (const line of report) {
    console.error(line);
  }
  console.error('\nPackages (core, ui, adapters) must not import next/*, electron/*, or react-router*.');
  console.error('Platform-specific implementations belong in apps/web or apps/desktop.\n');
  process.exit(1);
} else {
  console.log(`\nBoundary check PASSED: 0 violations across ${PACKAGES_TO_CHECK.length} packages.\n`);
  process.exit(0);
}
