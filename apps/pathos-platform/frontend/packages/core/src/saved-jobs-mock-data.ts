/**
 * ============================================================================
 * SAVED JOBS MOCK DATA — Deterministic fake dataset for Saved Jobs page
 * ============================================================================
 *
 * PURPOSE: Provides a stable, reviewable set of fake saved-job entries so
 * the Saved Jobs page (/dashboard/saved-jobs) renders fully populated during
 * development. Every value is hardcoded — no randomness, no Date.now(),
 * no lorem ipsum. Easy to review, easy to replace when real data flows in.
 *
 * USAGE: Import seedSavedJobsIfEmpty() and call it with a loaded store.
 * If the store already has jobs, it returns unchanged (same pattern as
 * loadMockResultsIfEmpty in job-storage.ts).
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 */

import type { Job } from './job-types';
import type { SavedJobsStore } from './saved-jobs-types';

// ---------------------------------------------------------------------------
// Deterministic mock dataset — 8 plausible federal-job entries
// ---------------------------------------------------------------------------
// Dates are fixed strings (ISO 8601 for savedAt, short format for closeDate).
// IDs use a 'saved-mock-' prefix so they are obviously synthetic.
// Statuses, match scores, grades, telework, and appointment types are varied
// to exercise every metric strip bucket and card chip the UI supports.
//
// SALARY RANGES: Derived from the GS base pay scale with a moderate locality
// adjustment. Ranges represent Step 1 through Step 10 for the position grade.
// GS step structure: ~30% spread from Step 1 to Step 10; ~20% increase between
// adjacent grade levels. These are intentionally consistent so the salary tile
// in the Decision Summary Band shows values that match real federal pay tables.
//   GS-11: $63,795 – $82,932   (Step 1 – Step 10)
//   GS-12: $76,459 – $99,404   (Step 1 – Step 10)
//   GS-13: $90,893 – $118,161  (Step 1 – Step 10)
//
// READINESS SCORE SPREAD: matchScores are intentionally spread across the full
// 0–100 range so the derived readiness scores (via deriveReadinessScore) exercise
// every color band in the scoreTierColor() traffic-light scale.
//
// Readiness = round(matchScore * 0.85 + 10). Color thresholds: >=80 green,
// >=60 amber, <60 red.
//
//   mock-1  matchScore 96  → readiness 92  → GREEN  (elite)
//   mock-2  matchScore 74  → readiness 73  → AMBER  (medium-strong)
//   mock-3  matchScore 14  → readiness 22  → RED    (very weak)
//   mock-4  matchScore 41  → readiness 45  → RED    (weak)
//   mock-5  matchScore 89  → readiness 86  → GREEN  (very strong)
//   mock-6  matchScore 59  → readiness 60  → AMBER  (threshold case)
//   mock-7  matchScore 82  → readiness 80  → GREEN  (threshold case)
//   mock-8  matchScore 65  → readiness 65  → AMBER  (medium)
//
// This gives 3 green, 3 amber, 2 red — the left-pane list visibly shows all
// three colors at once when the page loads. Summaries and statuses are adjusted
// so narratives are believable at their respective score levels.
// ---------------------------------------------------------------------------

const MOCK_SAVED_JOBS: Job[] = [
  /* ── mock-1: matchScore 96 → readiness 92 → GREEN (elite) ───────────── */
  {
    id: 'saved-mock-1',
    title: 'IT Specialist (INFOSEC)',
    agency: 'Department of Homeland Security',
    location: 'Washington, DC',
    grade: 'GS-13',
    salaryRange: '$90,893 – $118,161',
    url: 'https://www.usajobs.gov/job/825742100',
    summary:
      'Leads planning, implementation, and oversight of information security programs across DHS cyber operations. ' +
      'Coordinates vulnerability assessments, incident response protocols, and compliance reporting for agency-wide IT infrastructure. ' +
      'Strong alignment with your cybersecurity background and FISMA experience.',
    savedAt: '2026-03-12T14:32:00.000Z',
    matchScore: 96,
    closeDate: 'Mar 22, 2026',
    telework: 'Telework Eligible',
    appointmentType: 'Permanent',
    status: 'high-match',
  },
  /* ── mock-2: matchScore 74 → readiness 73 → AMBER (medium-strong) ───── */
  {
    id: 'saved-mock-2',
    title: 'Management Analyst',
    agency: 'Office of Personnel Management',
    location: 'Washington, DC',
    grade: 'GS-12',
    salaryRange: '$76,459 – $99,404',
    url: 'https://www.usajobs.gov/job/825110200',
    summary:
      'Conducts organizational studies, evaluates management practices, and recommends process improvements for OPM programs. ' +
      'Develops performance metrics and prepares briefing materials for senior leadership. ' +
      'Good general alignment — your analytical background covers the core duties, but the role expects deeper management consulting evidence than your resume currently shows.',
    savedAt: '2026-03-10T09:15:00.000Z',
    matchScore: 74,
    closeDate: 'Mar 28, 2026',
    telework: 'Remote',
    appointmentType: 'Permanent',
    status: 'needs-review',
  },
  /* ── mock-3: matchScore 14 → readiness 22 → RED (very weak) ─────────── */
  {
    id: 'saved-mock-3',
    title: 'Program Analyst',
    agency: 'Department of Veterans Affairs',
    location: 'Remote',
    grade: 'GS-11',
    salaryRange: '$63,795 – $82,932',
    url: 'https://www.usajobs.gov/job/824985300',
    summary:
      'Analyzes program operations and effectiveness for VA health services. ' +
      'Requires specialized experience in health program evaluation, clinical data analysis, and Veterans Health Administration procedures. ' +
      'Significant gap — this is a career-change stretch role. Your current background does not directly address the health-services specialization required. Saved for aspirational tracking.',
    savedAt: '2026-03-08T16:45:00.000Z',
    matchScore: 14,
    closeDate: 'Apr 5, 2026',
    telework: 'Remote',
    appointmentType: 'Term - 2 Years',
    status: 'backup',
  },
  /* ── mock-4: matchScore 41 → readiness 45 → RED (weak) ──────────────── */
  {
    id: 'saved-mock-4',
    title: 'Budget Analyst',
    agency: 'Department of Defense',
    location: 'Arlington, VA',
    grade: 'GS-12',
    salaryRange: '$76,459 – $99,404',
    url: 'https://www.usajobs.gov/job/824876100',
    summary:
      'Formulates, justifies, and executes budget estimates for assigned defense programs. ' +
      'Monitors obligation rates, prepares variance analyses, and briefs program managers on execution status. ' +
      'Weak fit — the role requires specialized defense budgeting and PPBE process experience that is not reflected in your current resume. Would need substantial tailoring to be competitive.',
    savedAt: '2026-03-05T11:20:00.000Z',
    matchScore: 41,
    closeDate: 'Apr 15, 2026',
    telework: 'Telework Eligible',
    appointmentType: 'Permanent',
    status: 'backup',
  },
  /* ── mock-5: matchScore 89 → readiness 86 → GREEN (very strong) ──────── */
  {
    id: 'saved-mock-5',
    title: 'Human Resources Specialist (Classification)',
    agency: 'Department of the Interior',
    location: 'Denver, CO',
    grade: 'GS-11',
    salaryRange: '$63,795 – $82,932',
    url: 'https://www.usajobs.gov/job/824512400',
    summary:
      'Provides position classification and compensation advisory services for the regional office. ' +
      'Evaluates position descriptions, conducts desk audits, and ensures compliance with OPM classification standards. ' +
      'Strong match on HR fundamentals — your staffing and classification experience directly addresses core requirements.',
    savedAt: '2026-03-03T08:50:00.000Z',
    matchScore: 89,
    closeDate: 'Mar 25, 2026',
    telework: 'Telework Eligible',
    appointmentType: 'Permanent',
    status: 'high-match',
  },
  /* ── mock-6: matchScore 59 → readiness 60 → AMBER (threshold case) ───── */
  {
    id: 'saved-mock-6',
    title: 'Contract Specialist',
    agency: 'General Services Administration',
    location: 'Kansas City, MO',
    grade: 'GS-12',
    salaryRange: '$76,459 – $99,404',
    url: 'https://www.usajobs.gov/job/824321700',
    summary:
      'Plans, negotiates, awards, and administers contracts for IT products and professional services. ' +
      'Manages full acquisition lifecycle from pre-solicitation through closeout for GSA Schedule contracts. ' +
      'Below threshold — FAR/DFARS procurement knowledge is a core requirement and a significant gap in your current profile. Needs substantial resume work before applying.',
    savedAt: '2026-02-28T13:10:00.000Z',
    matchScore: 59,
    closeDate: 'Apr 10, 2026',
    telework: 'Telework Eligible',
    appointmentType: 'Permanent',
    status: 'needs-review',
  },
  /* ── mock-7: matchScore 82 → readiness 80 → GREEN (threshold case) ───── */
  {
    id: 'saved-mock-7',
    title: 'Policy Analyst',
    agency: 'Executive Office of the President',
    location: 'Washington, DC',
    grade: 'GS-13',
    salaryRange: '$90,893 – $118,161',
    url: 'https://www.usajobs.gov/job/824198500',
    summary:
      'Develops and evaluates domestic policy proposals for OMB program divisions. ' +
      'Conducts interagency coordination, prepares policy memoranda, and supports regulatory review processes. ' +
      'Your policy analysis and cross-agency coordination experience align well with the core duties.',
    savedAt: '2026-02-25T10:30:00.000Z',
    matchScore: 82,
    closeDate: 'Mar 30, 2026',
    telework: 'Telework Eligible',
    appointmentType: 'Permanent',
    status: 'ready',
  },
  /* ── mock-8: matchScore 65 → readiness 65 → AMBER (medium) ──────────── */
  {
    id: 'saved-mock-8',
    title: 'Data Scientist',
    agency: 'U.S. Census Bureau',
    location: 'Suitland, MD',
    grade: 'GS-13',
    salaryRange: '$90,893 – $118,161',
    url: 'https://www.usajobs.gov/job/824055800',
    summary:
      'Designs and implements statistical models and machine learning pipelines for Census survey data. ' +
      'Collaborates with subject matter experts to improve data quality and develops visualization dashboards. ' +
      'Moderate fit — your general data skills apply, but the role requires specialized statistical survey methodology and Census-specific tooling that your resume does not yet demonstrate.',
    savedAt: '2026-02-22T15:45:00.000Z',
    matchScore: 65,
    closeDate: 'Apr 2, 2026',
    telework: 'Remote',
    appointmentType: 'Permanent',
    status: 'needs-review',
  },
];

// ---------------------------------------------------------------------------
// Seeder function — matches the loadMockResultsIfEmpty pattern
// ---------------------------------------------------------------------------

/**
 * Returns a SavedJobsStore seeded with the deterministic mock dataset
 * if the store has no jobs. If the store already contains saved jobs,
 * it is returned unchanged.
 *
 * Selects the first job by default so the detail workspace is populated
 * immediately on first render.
 *
 * This function does not write to localStorage — the caller is responsible
 * for persisting if desired (matches the loadMockResultsIfEmpty contract).
 */
export function seedSavedJobsIfEmpty(store: SavedJobsStore): SavedJobsStore {
  if (store.jobs.length > 0) return store;

  const jobs = MOCK_SAVED_JOBS.slice();
  return {
    schemaVersion: store.schemaVersion,
    jobs: jobs,
    selectedJobId: jobs.length > 0 ? jobs[0].id : null,
  };
}

/**
 * Returns the raw deterministic mock dataset (for tests or direct use).
 * Returns a fresh copy each call to avoid shared-reference mutation.
 */
export function createSavedJobsMockData(): Job[] {
  const result: Job[] = [];
  for (let i = 0; i < MOCK_SAVED_JOBS.length; i++) {
    result.push(Object.assign({}, MOCK_SAVED_JOBS[i]));
  }
  return result;
}
