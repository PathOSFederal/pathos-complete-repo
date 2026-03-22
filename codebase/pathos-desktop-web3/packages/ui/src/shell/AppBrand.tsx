/**
 * ============================================================================
 * APP BRAND — Reusable PathOS branding (logo + optional text)
 * ============================================================================
 *
 * WHY A TWO-TIER LOGO SYSTEM:
 * A single full badge everywhere was not ideal: in the compact top shell it
 * competed with status pills and felt crowded; in the sidebar we wanted a
 * richer, more expressive block. We now use two assets: a symbol-only logo
 * for compact surfaces (top bar, small nav identity) and a full badge for
 * richer areas (sidebar brand block, onboarding). This keeps the shell crisp
 * and the sidebar premium without visual duplication or awkwardness.
 *
 * WHERE EACH ASSET IS USED:
 * - appLogoSymbol.png: Top bar lockup (symbol + "PathOS" wordmark), compact
 *   nav identity, and any icon-sized in-app brand usage. Small and readable
 *   at 28–32px.
 * - appLogoFull.png: Sidebar brand block, onboarding, and larger brand areas
 *   where the full badge has room to read and feel intentional.
 *
 * WHY THE OLD IMAGE LOADING FAILED (ROOT CAUSE):
 * The shared component used hardcoded absolute paths like /branding/appLogoSymbol.png.
 * - Web (Next.js at repo root): Next serves only from root public/. The two-tier
 *   assets lived in app/web/public/branding/, which is NOT the same as root public/,
 *   so /branding/* returned 404 and the browser showed broken-image placeholders.
 * - Desktop (Vite in apps/desktop): Vite uses base: './' for file:// compatibility.
 *   Absolute paths like /branding/... resolve to the origin root; in dev that might
 *   not match Vite's publicDir, and in packaged Electron file:///branding/... is
 *   wrong. So the same hardcoded path failed in both runtimes.
 *
 * HOW WEB AND DESKTOP ASSET SERVING DIFFER:
 * - Web: Next.js serves files from the project's public/ directory at the site root.
 *   So public/branding/foo.png is available at /branding/foo.png. Base URL is "/".
 * - Desktop: Vite copies public/ into the build output and serves with base: './'.
 *   So we need relative URLs (e.g. ./branding/foo.png) so that in packaged app
 *   they resolve relative to the loaded HTML (file:///.../index.html).
 *
 * HOW THE NEW SOLUTION WORKS:
 * 1. Canonical branding assets live in root public/branding/ (web) and
 *    apps/desktop/public/branding/ (desktop) so each runtime has the files.
 * 2. AppBrand accepts an optional brandingBaseUrl. When provided (e.g. by the
 *    desktop app as import.meta.env.BASE_URL), we resolve asset paths relative
 *    to it so ./branding/appLogoSymbol.png works in desktop. When not provided
 *    (web), we use "/" so /branding/appLogoSymbol.png works.
 * 3. Explicit logoUrl still overrides everything for custom hosts.
 *
 * HOW TO SAFELY REPLACE BRANDING ASSETS LATER:
 * 1. Replace files: put new PNGs in public/branding/ (web) and
 *    apps/desktop/public/branding/ (desktop) with the same filenames.
 * 2. Add/rename: add new files and update BRANDING_SYMBOL_PATH / BRANDING_FULL_PATH
 *    (and DEFAULT_LOGO_PATH) in this file; call sites use asset="symbol" | "full"
 *    and do not need edits.
 * 3. Custom host: pass logoUrl to AppBrand to override built-in paths.
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 * We use a plain <img> so it works in any React host.
 */

'use client';

import type React from 'react';

// ---------------------------------------------------------------------------
// Constants — path segments only (no leading slash); base URL comes from host
// ---------------------------------------------------------------------------

/**
 * Symbol-only logo path segment for compact surfaces (top bar, small nav).
 * Use this where space is tight and the full badge would feel crowded.
 */
const BRANDING_SYMBOL_PATH = 'branding/appLogoSymbol.png';

/**
 * Full badge path segment for richer branding (sidebar, onboarding).
 * Use where the full mark has room to read and feel intentional.
 */
const BRANDING_FULL_PATH = 'branding/appLogoFull.png';

/** Legacy/default path segment when neither asset nor logoUrl is specified. */
const DEFAULT_LOGO_PATH = 'branding/appLogo.png';

/** Default product name for icon + text lockup. */
const DEFAULT_PRODUCT_NAME = 'PathOS';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AppBrandVariant = 'iconOnly' | 'iconAndText';

/** Picks which built-in branding asset to use when logoUrl is not provided. */
export type AppBrandAsset = 'symbol' | 'full';

export interface AppBrandProps {
  /**
   * URL to the logo image. When set, overrides asset.
   * Use for custom hosts (e.g. Electron file://) or one-off overrides.
   */
  logoUrl?: string;
  /**
   * Base URL for resolving built-in branding paths. When not set, "/" is used
   * (web: /branding/... works). When set (e.g. desktop passes import.meta.env.BASE_URL
   * as "./"), we resolve paths like base + "branding/appLogoSymbol.png" so desktop
   * gets ./branding/appLogoSymbol.png and assets load from the app bundle.
   */
  brandingBaseUrl?: string;
  /**
   * Which built-in asset to use when logoUrl is not set.
   * - symbol: appLogoSymbol.png — compact shell, top bar, small nav.
   * - full: appLogoFull.png — sidebar brand block, onboarding, rich areas.
   */
  asset?: AppBrandAsset;
  /**
   * Variant: icon only (badge/symbol) or icon + product name.
   */
  variant?: AppBrandVariant;
  /**
   * Product name shown next to the icon when variant is iconAndText.
   * Omitted when variant is iconOnly.
   */
  productName?: string;
  /**
   * Size of the logo image in pixels (width and height).
   * Kept modest so the brand does not dominate the header/sidebar.
   */
  size?: number;
  /**
   * Optional CSS class for the wrapper (flex container).
   */
  className?: string;
  /**
   * Optional CSS class for the product name span (when variant is iconAndText).
   * Use for theme overrides (e.g. legacy dark header: text-white).
   */
  textClassName?: string;
  /**
   * Optional inline style for the product name span.
   */
  textStyle?: React.CSSProperties;
  /**
   * Accessible alt text for the logo image.
   */
  alt?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Authoritative asset resolution (single place for all logo URLs)
// ---------------------------------------------------------------------------
//
// BROKEN PATH THAT CAUSED 404 / BROKEN IMAGES:
// Previously we did: base = "/" when brandingBaseUrl omitted, then
// return base + '/' + pathSegment → "/" + "/" + "branding/appLogoSymbol.png"
// = "//branding/appLogoSymbol.png". In HTML, src="//branding/..." is a
// protocol-relative URL with authority "branding", so the browser does not
// request /branding/... from the current origin. Result: 404 and broken-image
// placeholders in both web and desktop when brandingBaseUrl was not passed.
//
// WHY THE EARLIER FIX WAS INCOMPLETE:
// The fix added path segments and brandingBaseUrl so desktop could pass "./",
// but when baseUrl was omitted (web, legacy PathOSTopBar/PathOSSidebar), we
// still concatenated base "/" + "/" + pathSegment, producing the double slash.
//
// HOW WEB AND DESKTOP DIFFER:
// - Web: Next.js serves from root public/ at "/". We want final URL
//   "/branding/appLogoSymbol.png" (one leading slash). So we must not add
//   an extra slash when the effective base is "/".
// - Desktop: Vite uses base "./". We pass brandingBaseUrl so base becomes "."
//   and return "." + "/" + pathSegment = "./branding/appLogoSymbol.png",
//   which resolves relative to the loaded HTML (dev or file:// bundle).
//
// HOW THE FINAL PATH IS NOW RESOLVED:
// - If logoUrl is provided, use it (custom host override).
// - Else choose path segment from asset (symbol → appLogoSymbol.png, full →
//   appLogoFull.png, default → appLogo.png).
// - If baseUrl is missing or empty, use root-relative single slash: "/" +
//   pathSegment (e.g. "/branding/appLogoSymbol.png") so web works.
// - If baseUrl is provided (e.g. "./" from desktop), normalize trailing
//   slash then return base + "/" + pathSegment so desktop gets
//   "./branding/appLogoSymbol.png".
//
// HOW TO REPLACE LOGOS LATER WITHOUT BREAKING RUNTIME:
// Replace the PNG files in public/branding/ (web) and
// apps/desktop/public/branding/ (desktop); keep filenames the same. No code
// change. To add a new asset, add a constant and branch in pathSegment logic.
/**
 * Resolves the image URL: explicit logoUrl wins; else we resolve built-in path
 * using baseUrl (or "/" when not provided). Never produces "//" so web and
 * desktop both get valid URLs.
 */
function resolveLogoUrl(
  logoUrl: string | undefined | null,
  asset: AppBrandAsset | undefined | null,
  baseUrl: string | undefined | null,
): string {
  if (logoUrl !== undefined && logoUrl !== null && logoUrl !== '') {
    return logoUrl;
  }
  const pathSegment =
    asset === 'symbol'
      ? BRANDING_SYMBOL_PATH
      : asset === 'full'
        ? BRANDING_FULL_PATH
        : DEFAULT_LOGO_PATH;

  const hasBase = baseUrl !== undefined && baseUrl !== null && baseUrl !== '';
  if (!hasBase) {
    return '/' + pathSegment;
  }
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return base + '/' + pathSegment;
}

/**
 * Renders the PathOS app brand: symbol or full badge image with optional product name.
 * Use in TopBar (asset="symbol"), Sidebar (asset="full"), and onboarding for consistent branding.
 */
export function AppBrand(props: AppBrandProps) {
  const resolvedUrl = resolveLogoUrl(props.logoUrl, props.asset, props.brandingBaseUrl);
  const variant = props.variant !== undefined && props.variant !== null
    ? props.variant
    : 'iconAndText';
  const size = props.size !== undefined && props.size !== null
    ? props.size
    : 32;
  const productName = props.productName !== undefined && props.productName !== null
    ? props.productName
    : DEFAULT_PRODUCT_NAME;
  const alt = props.alt !== undefined && props.alt !== null
    ? props.alt
    : 'PathOS app logo';

  const showText = variant === 'iconAndText';

  // CSS custom properties (--p-text etc.) are theme tokens; we use them
  // for color/font so the lockup respects light/dark and shell overrides.
  const defaultTextStyle: React.CSSProperties = {
    color: 'var(--p-text)',
    fontSize: 'var(--p-font-size-section)',
  };
  const textStyle: React.CSSProperties = props.textStyle
    ? Object.assign({}, defaultTextStyle, props.textStyle)
    : defaultTextStyle;
  const textClassName = props.textClassName !== undefined && props.textClassName !== null
    ? props.textClassName
    : 'font-semibold';

  // Tight gap (0.375rem) so badge + product name read as one visual unit,
  // not a favicon floating next to text. objectFit contain preserves
  // aspect ratio and keeps the badge crisp on dark backgrounds.
  return (
    <div
      className={props.className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
      }}
    >
      <img
        src={resolvedUrl}
        alt={alt}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          objectFit: 'contain',
        }}
        decoding="async"
        fetchPriority="high"
      />
      {showText && (
        <span className={textClassName} style={textStyle}>
          {productName}
        </span>
      )}
    </div>
  );
}
