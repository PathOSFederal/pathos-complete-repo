#!/usr/bin/env node

/*
 * ============================================================================
 * OWNER MAP GENERATOR (Day 20)
 * ============================================================================
 *
 * PURPOSE:
 * Auto-generates docs/owner-map.generated.md from the codebase.
 * This provides a deterministic, always-up-to-date reference of:
 *   - Routes (from app/[route]/page.tsx files)
 *   - Zustand stores (from store/*.ts files)
 *   - localStorage keys (from lib/storage-keys.ts STORAGE_KEYS object)
 *
 * USAGE:
 *   pnpm docs:owner-map
 *   node scripts/generate-owner-map.mjs
 *
 * OUTPUT:
 *   docs/owner-map.generated.md
 *
 * CI ENFORCEMENT:
 *   CI runs this script and fails if the generated file changes.
 *   This ensures the generated map stays in sync with the codebase.
 *
 * @version Day 20 - Initial creation
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Recursively find all files matching a pattern in a directory.
 *
 * @param {string} dir - Directory to search
 * @param {string} filename - Filename to match (e.g., 'page.tsx')
 * @param {string[]} results - Accumulator for results
 * @returns {string[]} Array of matching file paths (relative to projectRoot)
 */
function findFiles(dir, filename, results = []) {
  const fullDir = path.join(projectRoot, dir);
  
  // Skip if directory doesn't exist
  if (!fs.existsSync(fullDir)) {
    return results;
  }
  
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const entryPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Recurse into subdirectories
      findFiles(entryPath, filename, results);
    } else if (entry.name === filename) {
      // Found a match
      results.push(entryPath);
    }
  }
  
  return results;
}

/**
 * Find all TypeScript files in a directory (non-recursive).
 *
 * @param {string} dir - Directory to search
 * @returns {string[]} Array of .ts file paths (relative to projectRoot)
 */
function findTsFilesInDir(dir) {
  const fullDir = path.join(projectRoot, dir);
  const results = [];
  
  // Skip if directory doesn't exist
  if (!fs.existsSync(fullDir)) {
    return results;
  }
  
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      results.push(path.join(dir, entry.name));
    }
  }
  
  return results;
}

/**
 * Extract STORAGE_KEYS from lib/storage-keys.ts.
 *
 * Parses the file to find the STORAGE_KEYS object and extract key-value pairs.
 *
 * @returns {Array<{name: string, value: string}>} Array of storage key info
 */
function extractStorageKeys() {
  const storageKeysPath = path.join(projectRoot, 'lib', 'storage-keys.ts');
  const results = [];
  
  if (!fs.existsSync(storageKeysPath)) {
    console.warn('[generate-owner-map] lib/storage-keys.ts not found');
    return results;
  }
  
  const content = fs.readFileSync(storageKeysPath, 'utf8');
  
  // Find the STORAGE_KEYS object block
  const storageKeysMatch = content.match(/export const STORAGE_KEYS\s*=\s*\{([^}]+)\}/s);
  
  if (!storageKeysMatch) {
    console.warn('[generate-owner-map] STORAGE_KEYS object not found in lib/storage-keys.ts');
    return results;
  }
  
  const objectBody = storageKeysMatch[1];
  
  // Parse each line like: PROFILE: PROFILE_STORAGE_KEY,
  const lines = objectBody.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Match: KEY_NAME: CONSTANT_NAME,
    const match = line.match(/^(\w+):\s*(\w+),?$/);
    if (match) {
      const keyName = match[1];
      const constantName = match[2];
      
      // Find the actual string value of the constant
      const constMatch = content.match(new RegExp(`export const ${constantName}\\s*=\\s*['"]([^'"]+)['"]`));
      const value = constMatch ? constMatch[1] : '(unknown)';
      
      results.push({ name: keyName, value: value });
    }
  }
  
  return results;
}

/**
 * Convert a page file path to a route path.
 *
 * @param {string} filePath - File path like 'app/dashboard/job-search/page.tsx'
 * @returns {string} Route path like '/dashboard/job-search'
 */
function filePathToRoute(filePath) {
  // Remove 'app/' prefix and '/page.tsx' suffix
  let route = filePath
    .replace(/^app[/\\]/, '')
    .replace(/[/\\]page\.tsx?$/, '');
  
  // Handle root page
  if (route === '' || route === 'page.tsx') {
    return '/';
  }
  
  // Normalize slashes and add leading slash
  route = '/' + route.replace(/\\/g, '/');
  
  return route;
}

/**
 * Main generation function.
 */
function generateOwnerMap() {
  console.log('[generate-owner-map] Scanning codebase...');
  
  // 1. Find all routes
  const pageFiles = findFiles('app', 'page.tsx');
  const routes = pageFiles
    .map(function (filePath) {
      return {
        route: filePathToRoute(filePath),
        file: filePath.replace(/\\/g, '/'),
      };
    })
    .sort(function (a, b) {
      return a.route.localeCompare(b.route);
    });
  
  console.log('[generate-owner-map] Found ' + routes.length + ' routes');
  
  // 2. Find all stores
  const storeFiles = findTsFilesInDir('store');
  const stores = storeFiles
    .map(function (filePath) {
      return filePath.replace(/\\/g, '/');
    })
    .sort();
  
  console.log('[generate-owner-map] Found ' + stores.length + ' stores');
  
  // 3. Extract localStorage keys
  const storageKeys = extractStorageKeys();
  console.log('[generate-owner-map] Found ' + storageKeys.length + ' storage keys');
  
  // 4. Generate markdown
  // NOTE: No timestamp - output must be deterministic for CI stability.
  // The file is regenerated when source files change, so a date header is unnecessary.
  
  let md = `# PathOS Owner Map (Auto-Generated)

> **WARNING**: This file is auto-generated by \`scripts/generate-owner-map.mjs\`.
> Do not edit manually. Run \`pnpm docs:owner-map\` to regenerate.
>
> For human-maintained notes, see \`docs/owner-map.md\`.

---

## Routes

| Route | Page File |
|-------|-----------|
`;
  
  for (let i = 0; i < routes.length; i++) {
    const r = routes[i];
    md += `| \`${r.route}\` | \`${r.file}\` |\n`;
  }
  
  md += `
---

## Stores

| Store File |
|------------|
`;
  
  for (let i = 0; i < stores.length; i++) {
    md += `| \`${stores[i]}\` |\n`;
  }
  
  md += `
---

## localStorage Keys

| Key Name | localStorage Key |
|----------|------------------|
`;
  
  for (let i = 0; i < storageKeys.length; i++) {
    const k = storageKeys[i];
    md += `| \`${k.name}\` | \`${k.value}\` |\n`;
  }
  
  md += `
---

*Auto-generated by scripts/generate-owner-map.mjs*
`;
  
  // 5. Write output
  const outputPath = path.join(projectRoot, 'docs', 'owner-map.generated.md');
  fs.writeFileSync(outputPath, md, 'utf8');
  
  console.log('[generate-owner-map] Written to docs/owner-map.generated.md');
  console.log('[generate-owner-map] Done.');
}

// Run
generateOwnerMap();

