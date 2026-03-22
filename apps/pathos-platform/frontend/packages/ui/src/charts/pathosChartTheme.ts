/**
 * ============================================================================
 * PATHOS CHART THEME — Map CSS variables to ECharts-compatible colors
 * ============================================================================
 *
 * Reads PathOS design tokens from the document so charts (ECharts) use the
 * same colors as the rest of the app. Safe fallbacks when variables are missing
 * (e.g. in tests or before theme is applied).
 */

/** Colors and styles derived from PathOS CSS variables for use in chart options. */
export interface PathosChartColors {
  textDim: string;
  text: string;
  grid: string;
  accent: string;
  accentMuted: string;
  surface: string;
  border: string;
}

const FALLBACK = {
  textDim: '#94a3b8',
  text: '#e2e8f0',
  grid: '#1e293b',
  accent: '#2563eb',
  accentMuted: '#1d4ed8',
  surface: '#121829',
  border: '#1e293b',
};

/**
 * Reads PathOS CSS variables via getComputedStyle and returns an object
 * suitable for ECharts option styling (axis labels, split lines, tooltip, etc.).
 * Call only in browser; provides fallbacks if document or variables are missing.
 *
 * @returns PathosChartColors with hex/rgba values
 */
export function getPathosChartColors(): PathosChartColors {
  if (typeof document === 'undefined' || document.documentElement === null) {
    return FALLBACK;
  }
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const getVar = function (name: string, fallback: string): string {
    const value = style.getPropertyValue(name).trim();
    return value !== '' ? value : fallback;
  };
  return {
    textDim: getVar('--p-text-dim', FALLBACK.textDim),
    text: getVar('--p-text', FALLBACK.text),
    grid: getVar('--p-border', FALLBACK.grid),
    accent: getVar('--p-accent', FALLBACK.accent),
    accentMuted: getVar('--p-accent-muted', FALLBACK.accentMuted),
    surface: getVar('--p-surface', FALLBACK.surface),
    border: getVar('--p-border', FALLBACK.border),
  };
}
