/**
 * ============================================================================
 * FILTER GUIDE TYPES — Data shapes for Series, Agency, Location guides
 * ============================================================================
 *
 * Series is fully implemented; Agency and Location are stubbed for future data.
 * Used by FilterGuideDrawer to render the correct title and content per mode.
 */

/**
 * Agency guide entry. id: stable id; name: canonical display name (same as filter value);
 * aliases: e.g. VA, DHS; optional parent and tags (Popular, Cabinet, Independent).
 */
export interface AgencyGuideEntry {
  id: string;
  name: string;
  aliases?: string[];
  parent?: string;
  tags?: string[];
}

/**
 * Location guide entry. id: stable id; label: display text; applyValue: value
 * to set in store (defaults to label). Use applyValue when label is a synonym
 * (e.g. "Washington, DC (DMV)" applies "Washington, DC" for dropdown/match).
 */
export interface LocationGuideEntry {
  id: string;
  label: string;
  city?: string;
  state?: string;
  aliases?: string[];
  type?: 'metro' | 'state' | 'remote' | 'other';
  /** Value to apply to store; when undefined, use label. */
  applyValue?: string;
}

/** Which guide drawer is open: series (full), agency (stub), location (stub). */
export type FilterGuideKind = 'series' | 'agency' | 'location';
