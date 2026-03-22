/**
 * ============================================================================
 * AGENCY GUIDE DATA — Deterministic local dataset for Agency guide
 * ============================================================================
 *
 * Primary source: unique agencies derived from MOCK_JOBS. Secondary: curated
 * set (DHS, VA, DoD, HHS, IRS, SSA, USDA, DOJ, GSA, DOC, DOT, OPM) so common
 * acronyms resolve. Used by FilterGuideDrawer (Agency mode). Token-only; no API.
 */

import { MOCK_JOBS } from '../../screens/jobSearchMockJobs';
import type { AgencyGuideEntry } from './filterGuideTypes';

/** Optional category for chips; minimal set to avoid clutter. */
export const AGENCY_CATEGORIES = ['All', 'Popular', 'Cabinet', 'Independent'];

/**
 * Curated acronym/alias -> full name. Used to ensure search by "VA" finds
 * "Department of Veterans Affairs". Canonical value stored in filters is the
 * full name (same as dropdown option value).
 */
const AGENCY_ALIASES: Record<string, string> = {
  DHS: 'Department of Homeland Security',
  VA: 'Department of Veterans Affairs',
  DoD: 'Department of Defense',
  HHS: 'Department of Health and Human Services',
  IRS: 'Internal Revenue Service',
  SSA: 'Social Security Administration',
  USDA: 'Department of Agriculture',
  DOJ: 'Department of Justice',
  GSA: 'General Services Administration',
  DOC: 'Department of Commerce',
  DOT: 'Department of Transportation',
  OPM: 'Office of Personnel Management',
};

/** Cabinet agencies (for optional category chip). */
const CABINET_AGENCIES: Record<string, boolean> = {
  'Department of Homeland Security': true,
  'Department of Veterans Affairs': true,
  'Department of Defense': true,
  'Department of Health and Human Services': true,
  'Department of Agriculture': true,
  'Department of Justice': true,
  'Department of Commerce': true,
  'Department of Transportation': true,
};

/** Popular in mock set (appear in MOCK_JOBS). */
function isPopular(name: string): boolean {
  for (let i = 0; i < MOCK_JOBS.length; i++) {
    if (MOCK_JOBS[i].agency === name) return true;
  }
  return false;
}

/**
 * Build agency guide entries: unique agencies from MOCK_JOBS plus any from
 * alias map not already present. Each entry: id (slug), name (canonical),
 * aliases, optional parent, optional tags (Popular, Cabinet, Independent).
 */
function buildAgencyGuideData(): AgencyGuideEntry[] {
  const byName: Record<string, AgencyGuideEntry> = {};
  for (let i = 0; i < MOCK_JOBS.length; i++) {
    const a = MOCK_JOBS[i].agency;
    if (a !== undefined && a !== '' && byName[a] === undefined) {
      const aliases: string[] = [];
      const keys = Object.keys(AGENCY_ALIASES);
      for (let k = 0; k < keys.length; k++) {
        if (AGENCY_ALIASES[keys[k]] === a) aliases.push(keys[k]);
      }
      const tags: string[] = [];
      if (isPopular(a)) tags.push('Popular');
      if (CABINET_AGENCIES[a] === true) tags.push('Cabinet');
      else if (a !== '') tags.push('Independent');
      byName[a] = {
        id: a.replace(/\s+/g, '-').toLowerCase(),
        name: a,
        aliases,
        tags,
      };
    }
  }
  const aliasNames = Object.keys(AGENCY_ALIASES).map(function (k) {
    return AGENCY_ALIASES[k];
  });
  for (let j = 0; j < aliasNames.length; j++) {
    const name = aliasNames[j];
    if (name !== undefined && byName[name] === undefined) {
      const aliases: string[] = [];
      const keys = Object.keys(AGENCY_ALIASES);
      for (let k = 0; k < keys.length; k++) {
        if (AGENCY_ALIASES[keys[k]] === name) aliases.push(keys[k]);
      }
      const tags: string[] = [];
      if (CABINET_AGENCIES[name] === true) tags.push('Cabinet');
      else tags.push('Independent');
      byName[name] = {
        id: name.replace(/\s+/g, '-').toLowerCase(),
        name,
        aliases,
        tags,
      };
    }
  }
  const out: AgencyGuideEntry[] = [];
  const names = Object.keys(byName).sort();
  for (let i = 0; i < names.length; i++) {
    const e = byName[names[i]];
    if (e !== undefined) out.push(e);
  }
  return out;
}

export const AGENCY_GUIDE_DATA: AgencyGuideEntry[] = buildAgencyGuideData();

/**
 * Filter agency guide by search query and optional category.
 * Search matches: name, id, and any alias (case-insensitive).
 * Category "All" skips category filter. Popular/Cabinet/Independent filter by tags.
 *
 * @param data - Full list of agency entries
 * @param query - Search string (trimmed, case-insensitive)
 * @param category - Selected category; "All" = no category filter
 * @returns Filtered array (new array; does not mutate input)
 */
export function filterAgencyGuide(
  data: AgencyGuideEntry[],
  query: string,
  category: string
): AgencyGuideEntry[] {
  const q = query.trim().toLowerCase();
  const result: AgencyGuideEntry[] = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const matchCategory =
      category === 'All' ||
      (row.tags !== undefined && row.tags.indexOf(category) !== -1);
    if (!matchCategory) continue;
    if (q === '') {
      result.push(row);
      continue;
    }
    const matchName = row.name.toLowerCase().indexOf(q) !== -1;
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
    if (matchName || matchId || matchAlias) result.push(row);
  }
  return result;
}
