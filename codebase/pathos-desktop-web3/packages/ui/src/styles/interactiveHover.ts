/**
 * ============================================================================
 * INTERACTIVE HOVER V1 — Shared class for consistent "alive on hover" UX
 * ============================================================================
 *
 * Applied to buttons, dropdown triggers, tabs, icon buttons. CSS lives in
 * theme.css (.pathos-interactive-hover). Hover uses var(--p-surface2) and
 * var(--p-border-light); transition 180ms ease-out; focus-visible ring;
 * disabled has no hover. Token-only; no hardcoded colors.
 *
 * Export so components and tests can reference the same class name.
 */

/** Class name for Interactive Hover v1 (defined in theme.css). */
export const INTERACTIVE_HOVER_CLASS = 'pathos-interactive-hover';
