/**
 * ============================================================================
 * SERIES GUIDE DATA — Deterministic local dataset for Series & role guide
 * ============================================================================
 *
 * Federal job series codes with title, typical roles, common grades, and category.
 * Used by FilterGuideDrawer (Series mode) for search and category filter.
 * No API; all data is local and deterministic (executive-grade).
 */

/** Single series entry: code, title, typical roles, grades, category. */
export interface SeriesGuideEntry {
  seriesCode: string;
  title: string;
  typicalRoles: string;
  commonGrades: string;
  category: string;
}

/** Category labels for filter chips (must match entry.category values). */
export const SERIES_CATEGORIES = [
  'All',
  'IT & Cyber',
  'Admin',
  'HR',
  'Financial',
  'Engineering',
  'Analysis',
];

/** Deterministic list of 10–20 federal series (no spread; explicit construction). */
export const SERIES_GUIDE_DATA: SeriesGuideEntry[] = [
  { seriesCode: '0301', title: 'Miscellaneous Administration & Program', typicalRoles: 'Admin Officer, Program Specialist', commonGrades: 'GS-5–15', category: 'Admin' },
  { seriesCode: '0343', title: 'Management & Program Analysis', typicalRoles: 'Program Analyst, Management Analyst', commonGrades: 'GS-9–15', category: 'Analysis' },
  { seriesCode: '0560', title: 'Budget Analysis', typicalRoles: 'Budget Analyst, Budget Officer', commonGrades: 'GS-9–15', category: 'Financial' },
  { seriesCode: '0510', title: 'Accounting', typicalRoles: 'Accountant, Financial Manager', commonGrades: 'GS-7–15', category: 'Financial' },
  { seriesCode: '0201', title: 'Human Resources Management', typicalRoles: 'HR Specialist, HR Manager', commonGrades: 'GS-5–15', category: 'HR' },
  { seriesCode: '0212', title: 'Personnel Management', typicalRoles: 'Personnel Specialist, Staffing Manager', commonGrades: 'GS-5–14', category: 'HR' },
  { seriesCode: '2210', title: 'Information Technology Management', typicalRoles: 'IT Specialist, Sys Admin, DevOps', commonGrades: 'GS-7–14', category: 'IT & Cyber' },
  { seriesCode: '2220', title: 'Information Technology Project Management', typicalRoles: 'IT Project Manager, Program Manager', commonGrades: 'GS-12–15', category: 'IT & Cyber' },
  { seriesCode: '1550', title: 'Computer Science', typicalRoles: 'Computer Scientist, Software Engineer', commonGrades: 'GS-9–15', category: 'IT & Cyber' },
  { seriesCode: '0801', title: 'General Engineering', typicalRoles: 'General Engineer, Project Engineer', commonGrades: 'GS-5–15', category: 'Engineering' },
  { seriesCode: '0830', title: 'Mechanical Engineering', typicalRoles: 'Mechanical Engineer, Design Engineer', commonGrades: 'GS-5–15', category: 'Engineering' },
  { seriesCode: '0855', title: 'Electronics Engineering', typicalRoles: 'Electronics Engineer, Systems Engineer', commonGrades: 'GS-5–15', category: 'Engineering' },
  { seriesCode: '1102', title: 'Contracting', typicalRoles: 'Contract Specialist, Contracting Officer', commonGrades: 'GS-7–15', category: 'Analysis' },
  { seriesCode: '1101', title: 'General Business & Industry', typicalRoles: 'Business Specialist, Industry Analyst', commonGrades: 'GS-5–15', category: 'Analysis' },
  { seriesCode: '0132', title: 'Intelligence', typicalRoles: 'Intelligence Analyst, Intel Specialist', commonGrades: 'GS-7–15', category: 'Analysis' },
];

/**
 * Filter series by search query and category.
 * Search matches seriesCode OR title OR typicalRoles (case-insensitive).
 * Category "All" means no category filter.
 *
 * @param data - Full list of series entries
 * @param query - Search string (trimmed, case-insensitive match)
 * @param category - Selected category; "All" skips category filter
 * @returns Filtered array (new array; does not mutate input)
 */
export function filterSeriesGuide(
  data: SeriesGuideEntry[],
  query: string,
  category: string
): SeriesGuideEntry[] {
  const q = query.trim().toLowerCase();
  const result: SeriesGuideEntry[] = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const matchCategory = category === 'All' || row.category === category;
    if (!matchCategory) continue;
    if (q === '') {
      result.push(row);
      continue;
    }
    const matchCode = row.seriesCode.toLowerCase().indexOf(q) !== -1;
    const matchTitle = row.title.toLowerCase().indexOf(q) !== -1;
    const matchRoles = row.typicalRoles.toLowerCase().indexOf(q) !== -1;
    if (matchCode || matchTitle || matchRoles) {
      result.push(row);
    }
  }
  return result;
}
