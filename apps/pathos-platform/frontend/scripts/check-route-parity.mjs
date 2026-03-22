#!/usr/bin/env node
// ============================================================================
// ROUTE PARITY CHECK — Desktop and Next must resolve every Sidebar href
// ============================================================================
//
// PURPOSE: Enforce docs/architecture/routing-contract.md. Every link in the
// shared Sidebar must have a matching route in both Desktop (DesktopApp.tsx)
// and Next (app/**/page.tsx), or be listed in desktop-only allowlist.
//
// A) Reads canonical route paths from packages/ui/src/routes/routes.ts
//    (SIDEBAR_ROUTES order; values parsed from export const X = '...').
// B) Desktop: ensures each required path appears in apps/desktop/.../DesktopApp.tsx
//    <Route path="..." /> (string match).
// C) Next: for each required path, ensures a matching app/**/page.tsx exists
//    (route groups like (shared) do not add to path), or route is in allowlist.
//
// USAGE: pnpm routes:check   or   node scripts/check-route-parity.mjs
// EXIT: 0 = parity OK; 1 = mismatch (missing route in Desktop or Next).
//
// ============================================================================

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// ----------------------------------------------------------------------------
// Canonical Sidebar route names in display order (from routes.ts SIDEBAR_ROUTES)
// ----------------------------------------------------------------------------
const SIDEBAR_ROUTE_NAMES = [
  'DASHBOARD',
  'COMPENSATION',
  'BENEFITS',
  'RETIREMENT',
  'RESUME_READINESS',
  'RESUME_BUILDER',
  'JOB_SEARCH',
  'SAVED_JOBS',
  'GUIDED_APPLY_CANON',
  'EXPLORE_BENEFITS',
  'ALERTS',
  'IMPORT',
  'SETTINGS',
];

/** Routes that may exist only in Desktop (placeholder); no Next page required. */
const DESKTOP_ONLY_ALLOWLIST = [];

// ----------------------------------------------------------------------------
// A) Parse routes.ts and return ordered list of path strings for Sidebar
// ----------------------------------------------------------------------------
function getCanonicalSidebarRoutes() {
  const routesPath = join(projectRoot, 'packages', 'ui', 'src', 'routes', 'routes.ts');
  if (!existsSync(routesPath)) {
    console.error('routes:check: missing file:', routesPath);
    process.exit(1);
  }
  const content = readFileSync(routesPath, 'utf8');
  const map = {};
  const re = /export\s+const\s+(\w+)\s*=\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    map[m[1]] = m[2];
  }
  const out = [];
  for (let i = 0; i < SIDEBAR_ROUTE_NAMES.length; i++) {
    const name = SIDEBAR_ROUTE_NAMES[i];
    const pathVal = map[name];
    if (pathVal === undefined) {
      console.error('routes:check: routes.ts missing constant:', name);
      process.exit(1);
    }
    out.push(pathVal);
  }
  return out;
}

// ----------------------------------------------------------------------------
// B) Extract <Route path="..." /> paths from DesktopApp.tsx (string match)
// ----------------------------------------------------------------------------
function getDesktopRoutePaths() {
  const desktopAppPath = join(projectRoot, 'apps', 'desktop', 'src', 'DesktopApp.tsx');
  if (!existsSync(desktopAppPath)) {
    console.error('routes:check: missing file:', desktopAppPath);
    process.exit(1);
  }
  const content = readFileSync(desktopAppPath, 'utf8');
  const paths = [];
  const re = /<Route\s+path=["]([^"]+)["]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    paths.push(m[1]);
  }
  return paths;
}

// ----------------------------------------------------------------------------
// C) Discover Next app routes from app/**/page.tsx (route groups stripped)
// ----------------------------------------------------------------------------
function getNextAppRoutes(dir, prefix) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const routes = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      const segment = e.name.startsWith('(') && e.name.endsWith(')') ? '' : e.name;
      const nextPrefix = segment ? (prefix ? prefix + '/' + segment : segment) : prefix;
      const sub = getNextAppRoutes(full, nextPrefix);
      for (let j = 0; j < sub.length; j++) routes.push(sub[j]);
    } else if (e.name === 'page.tsx' || e.name === 'page.js') {
      const route = prefix ? '/' + prefix : '/';
      routes.push(route);
    }
  }
  return routes;
}

function getAllNextRoutes() {
  const appDir = join(projectRoot, 'app');
  if (!existsSync(appDir)) return [];
  return getNextAppRoutes(appDir, '');
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
function main() {
  const required = getCanonicalSidebarRoutes();
  const desktopPaths = getDesktopRoutePaths();
  const nextRoutes = getAllNextRoutes();
  const desktopSet = new Set(desktopPaths);
  const nextSet = new Set(nextRoutes);

  let failed = false;

  for (let i = 0; i < required.length; i++) {
    const path = required[i];
    if (!desktopSet.has(path)) {
      console.error('routes:check: Desktop missing route:', path);
      failed = true;
    }
  }

  for (let i = 0; i < required.length; i++) {
    const path = required[i];
    if (DESKTOP_ONLY_ALLOWLIST.indexOf(path) !== -1) continue;
    if (!nextSet.has(path)) {
      console.error('routes:check: Next missing page for route:', path, '(expected app path mapping to', path + ')');
      failed = true;
    }
  }

  if (failed) {
    console.error('routes:check: FAILED (routing parity broken).');
    process.exit(1);
  }

  console.log('routes:check: OK — all Sidebar routes resolve in Desktop and Next.');
}

main();
