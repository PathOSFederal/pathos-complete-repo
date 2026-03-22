/**
 * ============================================================================
 * OVERLAY RULE v1 AUDIT — Enforce canonical overlay usage (OverlayRoot)
 * ============================================================================
 *
 * Scope: packages/ui/src, apps/desktop/src, app/(shared).
 *
 * Fails if any of the following exist (with small allowlists):
 * 1. className contains " z-" (Tailwind z-index utilities) — use zIndex.ts + inline style.
 * 2. role="tooltip" — except in Tooltip.tsx (canonical component).
 * 3. createPortal( — prefer none; allowlist empty unless one helper file is needed.
 *
 * Run: pnpm overlays:check
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const UI_SRC = path.join(ROOT, 'packages', 'ui', 'src');
const DESKTOP_SRC = path.join(ROOT, 'apps', 'desktop', 'src');
const APP_SHARED = path.join(ROOT, 'app', '(shared)');

/**
 * Recursively collect all source files in a directory.
 */
function collectSourceFiles(dir, extSet) {
  const results = [];
  if (!fs.existsSync(dir)) {
    return results;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(fullPath, extSet));
    } else if (entry.isFile() && extSet.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

/** Files allowed to contain role="tooltip" (e.g. canonical Tooltip component). */
const ALLOWLIST_ROLE_TOOLTIP = new Set(['Tooltip.tsx', 'DrawerTooltip.tsx']);

/** Files allowed to contain createPortal( (prefer none). */
const ALLOWLIST_CREATE_PORTAL = new Set([]);

/** Files where " z-" may appear only in comments (not in className). */
const ALLOWLIST_Z_CLASS = new Set(['zIndex.ts', 'AppShell.tsx']);

function getAllScopedFiles() {
  const ui = collectSourceFiles(UI_SRC, SOURCE_EXTENSIONS);
  const desktop = fs.existsSync(DESKTOP_SRC) ? collectSourceFiles(DESKTOP_SRC, SOURCE_EXTENSIONS) : [];
  const appShared = fs.existsSync(APP_SHARED) ? collectSourceFiles(APP_SHARED, SOURCE_EXTENSIONS) : [];
  return { ui, desktop, appShared, all: ui.concat(desktop).concat(appShared) };
}

let failed = false;
const { all: allFiles } = getAllScopedFiles();

// 1) className contains " z-" (Tailwind z-index)
for (const filePath of allFiles) {
  const base = path.basename(filePath);
  if (ALLOWLIST_Z_CLASS.has(base)) continue;
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.indexOf(' z-') >= 0) {
    console.error('[overlays:check] Tailwind z- in className (use zIndex.ts + inline style):', path.relative(ROOT, filePath));
    failed = true;
  }
}

// 2) role="tooltip" except allowlist
for (const filePath of allFiles) {
  const base = path.basename(filePath);
  if (ALLOWLIST_ROLE_TOOLTIP.has(base)) continue;
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.indexOf('role="tooltip"') >= 0) {
    console.error('[overlays:check] role="tooltip" found (use Tooltip component):', path.relative(ROOT, filePath));
    failed = true;
  }
}

// 3) createPortal( except allowlist
for (const filePath of allFiles) {
  const base = path.basename(filePath);
  if (ALLOWLIST_CREATE_PORTAL.has(base)) continue;
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.indexOf('createPortal(') >= 0) {
    console.error('[overlays:check] createPortal( found (use Radix Portal + OverlayRoot):', path.relative(ROOT, filePath));
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
console.log('overlays:check passed (Overlay Rule v1 / OverlayRoot).');
