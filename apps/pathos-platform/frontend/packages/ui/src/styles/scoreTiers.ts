/**
 * ============================================================================
 * SCORE TIER COLORS — Shared deterministic color mapping for readiness and
 * match scores across all PathOS surfaces
 * ============================================================================
 *
 * PURPOSE: Provides a single, reusable function that maps numeric scores
 * (0–100) to PathOS theme color tokens. Used by Saved Jobs, Job Search,
 * Career Readiness, and any future surface that needs color-coded score
 * indicators (readiness badges, match bars, progress fills, score pills).
 *
 * WHY SHARED: The same score (e.g., readiness 75) must always appear in
 * the same color tier regardless of which page renders it. Duplicating
 * the mapping per-screen leads to visual drift and inconsistency. This
 * module is the single source of truth for score → color.
 *
 * COLOR SCALE (green → amber → red):
 *   Strong (>=80): --p-success (green)  — user is well-positioned
 *   Medium (>=60): --p-warning (amber)  — needs attention, addressable
 *   Weak   (<60):  --p-danger  (red)    — significant gap or risk
 *
 * WHY THIS SCALE: Green/amber/red is universally understood as a
 * traffic-light severity scale. Users can scan a column of color-coded
 * scores and immediately identify which items need attention without
 * reading the numbers. Prior implementation used accent (blue) for medium
 * and warning (amber) for weak, which broke the intuitive severity
 * gradient and made medium scores look neutral rather than cautionary.
 *
 * THRESHOLDS: 80 and 60 are intentionally simple, round, and match the
 * gap-state thresholds used in Match Intelligence (Strong / Adequate / Gap).
 * They align with common federal assessment scoring conventions.
 *
 * FALLBACKS: --p-warning and --p-danger include fallback hex values in
 * case a theme variant does not define them. These fallbacks match the
 * standard PathOS dark theme values.
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 */

// ---------------------------------------------------------------------------
// Threshold constants — exported so consumers can reuse them for conditional
// logic (e.g., "if score >= SCORE_TIER_STRONG, show a 'Ready' badge").
// ---------------------------------------------------------------------------

/** Threshold at or above which a score is considered "strong" (green). */
export const SCORE_TIER_STRONG = 80;

/** Threshold at or above which a score is considered "medium" (amber). */
export const SCORE_TIER_MEDIUM = 60;

// ---------------------------------------------------------------------------
// Score-to-color mapping function
// ---------------------------------------------------------------------------

/**
 * Map a numeric score (0–100) to a PathOS theme color token string.
 *
 * Returns a CSS custom property reference suitable for use in inline
 * `style` objects — e.g., `{ color: scoreTierColor(85) }`.
 *
 * Tiers:
 *   score >= 80 → var(--p-success)   green — strong
 *   score >= 60 → var(--p-warning)   amber — medium, needs attention
 *   score <  60 → var(--p-danger)    red   — weak, significant gap
 *
 * This function is deterministic, pure, and safe to call in render paths.
 * It uses only CSS custom property references (no runtime DOM access).
 */
export function scoreTierColor(score: number): string {
  if (score >= SCORE_TIER_STRONG) return 'var(--p-success)';
  if (score >= SCORE_TIER_MEDIUM) return 'var(--p-warning, #eab308)';
  return 'var(--p-danger, #ef4444)';
}
