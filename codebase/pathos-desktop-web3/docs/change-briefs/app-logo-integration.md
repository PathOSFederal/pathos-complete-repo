# App Logo Integration — Two-tier branding (symbol + full badge)

**Branch:** `appLogo`  
**Goal:** Refactor PathOS branding across web and desktop to use a two-tier logo approach: symbol-only for compact shell surfaces, full badge for richer brand areas. Keep the implementation modular so future branding updates can swap assets without editing multiple unrelated files.

## Why the branding system is split by context

A single full badge everywhere was not ideal:

- In the **compact top shell**, the full badge competed with status pills and felt crowded; the row read like a favicon plus text rather than a crisp product identity.
- In the **sidebar**, we wanted a richer, more expressive brand block where the full mark has room to read and feel intentional.

We therefore use two assets:

- **appLogoSymbol.png** — compact surfaces: top bar lockup (symbol + “PathOS” wordmark), small nav identity, icon-sized in-app brand usage.
- **appLogoFull.png** — richer surfaces: sidebar brand block, onboarding, and larger brand areas.

This reduces visual duplication and awkwardness between shell and sidebar while preserving a trust-first, premium hierarchy.

## Where each asset is used

### appLogoSymbol.png

- **Shared TopBar** (packages/ui): Top-left lockup (symbol + “PathOS”); mobile shows symbol-only. LOCAL ONLY (and DESKTOP on desktop) remain secondary pills.
- **Shared BrandLockup**: Composes the symbol + wordmark for the shell; used by TopBar.
- **Legacy PathOSTopBar** (components/): Same — symbol + wordmark on desktop, symbol-only on mobile.
- Any future compact nav or icon-sized brand usage should use `AppBrand` with `asset="symbol"`.

### appLogoFull.png

- **Shared Sidebar** (packages/ui): Brand block at top of sidebar; full badge only (no duplicate “PathOS” text), with “Career Intelligence Dashboard” and “For federal job seekers”/“For federal employees” below. Clickable to Dashboard.
- **Legacy PathOSSidebar** (components/): Same — full badge (40px), taglines preserved, Link to /dashboard.
- **Onboarding disclaimer step** (components/onboarding-disclaimer-step.tsx): Uses Next.js `<Image src="/branding/appLogoFull.png" />` (hardcoded single-slash path; not AppBrand).

## Why the logos were broken before (root cause)

- The shared `AppBrand` component used **hardcoded absolute paths** (`/branding/appLogoSymbol.png`, `/branding/appLogoFull.png`).
- **Web (Next.js at repo root):** Next.js serves only from the project’s root `public/` directory. The two-tier assets lived in `app/web/public/branding/`, which is a different directory. So `/branding/*` requests returned 404 and the browser showed broken-image placeholders.
- **Desktop (Vite in apps/desktop):** Vite uses `base: './'` for file:// compatibility. Absolute paths like `/branding/...` resolve to the origin root; in dev the Vite server may not serve that path the same way, and in packaged Electron `file:///branding/...` is wrong. So the same hardcoded path failed in both runtimes.

## Remaining breakage (double-slash) — actual root cause fixed in this run

**Actual root cause:** In `resolveLogoUrl`, when `brandingBaseUrl` was omitted (web shell, legacy PathOSTopBar, PathOSSidebar, SharedDashboardRouteShell), the code set `base = '/'` and then returned `base + '/' + pathSegment`. That produced `'/' + '/' + 'branding/appLogoSymbol.png'` = **`//branding/appLogoSymbol.png`**. In HTML, `src="//branding/..."` is a protocol-relative URL with authority **"branding"**, so the browser does not request `/branding/...` from the current origin. Result: 404 and broken-image placeholders in both web and desktop for any caller that did not pass `brandingBaseUrl`.

**Exact broken paths at runtime:** The `<img>` element was rendering with `src="//branding/appLogoSymbol.png"` (top bar) and `src="//branding/appLogoFull.png"` (sidebar). Those URLs are invalid for same-origin static asset loading.

**Exact fixed path strategy:** When `brandingBaseUrl` is missing or empty, return `'/' + pathSegment` only (e.g. `/branding/appLogoSymbol.png`), so a single leading slash is used. When `brandingBaseUrl` is provided (desktop), normalize and use `base + '/' + pathSegment` (e.g. `./branding/appLogoSymbol.png`). Never concatenate `'/' + '/'` so `//` is never produced.

**Exact file locations used at runtime:**
- **Web:** Next.js serves from repo root `public/`. Requests are `/branding/appLogoSymbol.png` and `/branding/appLogoFull.png`, which map to `public/branding/appLogoSymbol.png` and `public/branding/appLogoFull.png`.
- **Desktop:** Vite/Electron serves from `apps/desktop/public/` (copied into build). Requests are `./branding/appLogoSymbol.png` and `./branding/appLogoFull.png`, which resolve relative to the loaded HTML (e.g. `file:///.../index.html` or dev server root).

**Which components use symbol vs full logo:**
- **Symbol** (`appLogoSymbol.png`): Shared TopBar (packages/ui), BrandLockup, legacy PathOSTopBar — compact top bar and mobile icon.
- **Full** (`appLogoFull.png`): Shared Sidebar (packages/ui), legacy PathOSSidebar — sidebar brand block. Onboarding disclaimer uses full via Next Image with `/branding/appLogoFull.png`.

## How the asset loading issue was fixed

1. **Canonical asset locations:** The same two PNGs are now present where each runtime expects them:
   - **Web:** `public/branding/appLogoSymbol.png` and `public/branding/appLogoFull.png` (repo root). Next.js serves these at `/branding/...`.
   - **Desktop:** `apps/desktop/public/branding/appLogoSymbol.png` and `appLogoFull.png`. Vite copies `public/` into the build output, so they are available at `./branding/...` when the app loads.
2. **Runtime-safe URL resolution:** `AppBrand` no longer hardcodes absolute URLs. It uses **path segments** (`branding/appLogoSymbol.png`) and an optional **brandingBaseUrl** from the host. When `brandingBaseUrl` is omitted (web), the effective base is `"/"`, so the resolved URL is `/branding/appLogoSymbol.png`. When the desktop app passes `import.meta.env.BASE_URL` (e.g. `"./"`), the resolved URL is `./branding/appLogoSymbol.png`, which loads correctly in both dev and packaged app.
3. **Shell wiring:** `SharedAppShell` accepts an optional `brandingBaseUrl`. The desktop app passes it; the web app and desktop-preview do not (so they use `/`). TopBar and Sidebar pass `brandingBaseUrl` into `AppBrand`.

## Where the source files now live

- **Authoritative/canonical assets:** `app/web/public/branding/appLogoSymbol.png` and `appLogoFull.png` (intended source for the two-tier design).
- **Web-serving copy:** `public/branding/appLogoSymbol.png` and `public/branding/appLogoFull.png` (so Next.js serves them at `/branding/...`).
- **Desktop-serving copy:** `apps/desktop/public/branding/appLogoSymbol.png` and `appLogoFull.png` (so Vite/Electron can serve them at `./branding/...`).

To avoid drift, when replacing or updating logos, update all three locations (or add a build step that copies from one canonical location).

## How web and desktop each resolve branding assets

- **Web:** Next.js serves files from root `public/` at the site root. No `brandingBaseUrl` is passed, so `resolveLogoUrl` returns `'/' + pathSegment` (e.g. `/branding/appLogoSymbol.png`) with a single leading slash. Those URLs resolve to the files in `public/branding/`. Used by: legacy PathOSTopBar, PathOSSidebar, SharedDashboardRouteShell (SharedAppShell), and any AppBrand that does not receive `brandingBaseUrl`.
- **Desktop:** Vite build uses `base: './'`. The desktop app passes `brandingBaseUrl={import.meta.env.BASE_URL}` (e.g. `"./"`) into `SharedAppShell`. `resolveLogoUrl` normalizes the base and returns e.g. `./branding/appLogoSymbol.png`, so the browser loads the file from the same origin as the loaded HTML (dev server or packaged `file://` bundle).

## How to swap or extend assets later

1. **Replace existing assets:** Update the PNGs in `public/branding/` (web), `apps/desktop/public/branding/` (desktop), and optionally keep `app/web/public/branding/` in sync. Same filenames; no code changes.
2. **Add or rename assets:** Add new files in those directories, then in `AppBrand.tsx` update `BRANDING_SYMBOL_PATH`, `BRANDING_FULL_PATH`, or `DEFAULT_LOGO_PATH`. Call sites use `asset="symbol"` or `asset="full"` and do not need edits.
3. **Custom host (e.g. different Electron path):** Pass `logoUrl={...}` to `AppBrand` to override the built-in path; `asset` is ignored when `logoUrl` is set.

## Web vs desktop

- **Web (shared shell):** TopBar uses symbol + PathOS; Sidebar uses full badge. Same components; NavigationProvider supplies NextNavLink; brand areas link to Dashboard.
- **Desktop (shared shell):** Same TopBar/Sidebar; platform is `desktop` or `desktop-preview` so TopBar shows “Desktop” pill plus “Local only”. RouterNavLink used for click-to-dashboard. DESKTOP pill kept for now; can be visually demoted in a follow-up if it clutters.
- **Legacy (components/):** PathOSTopBar and PathOSSidebar use the same two-tier strategy (symbol in top bar, full in sidebar) with theme-specific styling.

## Files changed (two-tier refactor)

- `packages/ui/src/shell/AppBrand.tsx` — Two-tier constants (`BRANDING_SYMBOL_URL`, `BRANDING_FULL_URL`), `asset` prop, `resolveLogoUrl`, teaching comments.

## Files changed (asset-loading fix — logos render in web and desktop)

- `packages/ui/src/shell/AppBrand.tsx` — Path constants changed to segments (`BRANDING_SYMBOL_PATH`, etc.); added `brandingBaseUrl` prop and runtime resolution so web uses `/` and desktop uses `./`. Teaching comments added (why broken, how fixed, how to replace assets).
- `packages/ui/src/shell/TopBar.tsx` — `brandingBaseUrl` prop; passed to `AppBrand` and `BrandLockup` brand config.
- `packages/ui/src/shell/Sidebar.tsx` — `brandingBaseUrl` prop; passed to `AppBrand`.
- `packages/ui/src/shell/AppShell.tsx` — `brandingBaseUrl` prop; passed to TopBar and Sidebar.
- `apps/desktop/src/DesktopApp.tsx` — Passes `brandingBaseUrl={import.meta.env.BASE_URL}` (with type-safe read) to `SharedAppShell`.
- `public/branding/appLogoSymbol.png`, `public/branding/appLogoFull.png` — Copies so Next.js serves at `/branding/...`.
- `apps/desktop/public/branding/` — New directory with `appLogoSymbol.png` and `appLogoFull.png` so Vite/desktop serves at `./branding/...`.
- `docs/change-briefs/app-logo-integration.md` — Added sections: why logos were broken, how fix works, where source files live, how web/desktop resolve assets, how to replace safely.
- **This run (double-slash fix):** `packages/ui/src/shell/AppBrand.tsx` — In `resolveLogoUrl`, when `brandingBaseUrl` is omitted, return `'/' + pathSegment` instead of `base + '/' + pathSegment` with base `'/'`, so the rendered `src` is `/branding/...` (single slash) not `//branding/...`. Over-commented the block (broken path, why earlier fix was incomplete, web vs desktop, how to replace logos). `docs/change-briefs/app-logo-integration.md` — Documented remaining root cause (double slash), exact broken/fixed paths, runtime file locations, and which components use symbol vs full.

## Follow-up work (packaged desktop / app icons)

- **Taskbar/dock/install icons:** Real packaged app icons (`.ico`, `.icns`, multi-size PNG sets) are **not** changed in this run. They are typically configured in the Electron build (e.g. `electron-builder` icon field) and are separate from the in-app branding components. A future task can export symbol or full badge into the required icon set for the installer and taskbar.
- **Electron asset serving:** Ensure packaged desktop serves `/branding/appLogoSymbol.png` and `/branding/appLogoFull.png` from the bundle, or pass `logoUrl` from the host if paths differ.

## Validation

- Lint, typecheck, test, build — all must pass.
- Manual: Web and desktop render correctly; top shell uses symbol + PathOS and looks compact; sidebar brand block uses full badge and feels premium; logo assets load in dev; no layout regression in standard desktop viewport; brand click → Dashboard works.

## Testing note

No new automated tests for the two-tier branding. Per `docs/ai/testing-standards.md`, tests are optional for pure UI/styling and presentational components. Validation is manual visual check and lint/typecheck/build. If automated tests are not sensible for this refinement, that is documented in merge-notes.
