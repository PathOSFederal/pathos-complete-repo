/**
 * ============================================================================
 * LOCATION GUIDE DATA — Deterministic local dataset for Location picker
 * ============================================================================
 *
 * Derived from MOCK_JOBS unique locations. Aliases: DC, Washington DC, DMV, NCR
 * map to Washington, DC (DMV). Remote/Nationwide as special entries. Used by
 * FilterGuideDrawer (Location mode). Token-only; no geocoding.
 */

import { MOCK_JOBS } from '../../screens/jobSearchMockJobs';
import type { LocationGuideEntry } from './filterGuideTypes';

/**
 * Alias -> canonical label. Used so "DMV" or "NCR" finds "Washington, DC (DMV)".
 * Canonical value stored in filters is the entry's label (same as dropdown).
 */
const LOCATION_ALIASES: Record<string, string> = {
  DC: 'Washington, DC',
  'Washington, DC': 'Washington, DC',
  'Washington DC': 'Washington, DC',
  DMV: 'Washington, DC (DMV)',
  NCR: 'Washington, DC (DMV)',
  'Nationwide': 'Remote',
};

/**
 * Classify location type from label (deterministic). Remote/Nationwide = remote;
 * "City, ST" pattern = metro or state; else other.
 */
function classifyType(label: string): 'metro' | 'state' | 'remote' | 'other' {
  const lower = label.toLowerCase();
  if (lower === 'remote' || lower === 'nationwide') return 'remote';
  if (label.indexOf(', ') !== -1) return 'metro';
  if (label.length <= 3 || label === 'Florida' || label === 'Texas') return 'state';
  return 'other';
}

/**
 * Build location guide entries: unique labels from MOCK_JOBS, plus special
 * "Washington, DC (DMV)" when we have Washington, DC (so DMV/NCR map to it).
 * Remote and Nationwide treated as one canonical "Remote" entry.
 */
function buildLocationGuideData(): LocationGuideEntry[] {
  const byLabel: Record<string, LocationGuideEntry> = {};
  for (let i = 0; i < MOCK_JOBS.length; i++) {
    const loc = MOCK_JOBS[i].location;
    if (loc === undefined || loc === '') continue;
    const canonical =
      loc === 'Nationwide' ? 'Remote' : loc;
    if (byLabel[canonical] === undefined) {
      const aliases: string[] = [];
      const keys = Object.keys(LOCATION_ALIASES);
      for (let k = 0; k < keys.length; k++) {
        if (LOCATION_ALIASES[keys[k]] === canonical) aliases.push(keys[k]);
      }
      if (canonical === 'Washington, DC') {
        aliases.push('DC');
        aliases.push('Washington DC');
        aliases.push('DMV');
        aliases.push('NCR');
      }
      const type = classifyType(canonical);
      byLabel[canonical] = {
        id: canonical.replace(/\s+/g, '-').replace(/,/g, '').toLowerCase(),
        label: canonical,
        aliases,
        type,
      };
    }
  }
  if (byLabel['Washington, DC'] !== undefined) {
    const dmvLabel = 'Washington, DC (DMV)';
    if (byLabel[dmvLabel] === undefined) {
      byLabel[dmvLabel] = {
        id: 'washington-dc-dmv',
        label: dmvLabel,
        aliases: ['DMV', 'NCR', 'DC', 'Washington DC'],
        type: 'metro',
        applyValue: 'Washington, DC',
      };
    }
  }
  const out: LocationGuideEntry[] = [];
  const labels = Object.keys(byLabel).sort(function (a, b) {
    if (a === 'Remote') return 1;
    if (b === 'Remote') return -1;
    return a.localeCompare(b);
  });
  for (let i = 0; i < labels.length; i++) {
    const e = byLabel[labels[i]];
    if (e !== undefined) out.push(e);
  }
  return out;
}

export const LOCATION_GUIDE_DATA: LocationGuideEntry[] = buildLocationGuideData();

/** Optional quick chips for Location drawer (Remote, DC/DMV, etc.). */
export const LOCATION_QUICK_CHIPS = ['Remote', 'DC/DMV', 'Florida', 'Texas'];

/**
 * Filter location guide by search query. Matches label and aliases (case-insensitive).
 *
 * @param data - Full list of location entries
 * @param query - Search string (trimmed, case-insensitive)
 * @returns Filtered array (new array; does not mutate input)
 */
export function filterLocationGuide(
  data: LocationGuideEntry[],
  query: string
): LocationGuideEntry[] {
  const q = query.trim().toLowerCase();
  const result: LocationGuideEntry[] = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (q === '') {
      result.push(row);
      continue;
    }
    const matchLabel = row.label.toLowerCase().indexOf(q) !== -1;
    const matchId = row.id.toLowerCase().indexOf(q) !== -1;
    let matchAlias = false;
    if (row.aliases !== undefined) {
      for (let a = 0; a < row.aliases.length; a++) {
        const al = row.aliases[a];
        if (al !== undefined && al.toLowerCase().indexOf(q) !== -1) {
          matchAlias = true;
          break;
        }
      }
    }
    if (matchLabel || matchId || matchAlias) result.push(row);
  }
  return result;
}
