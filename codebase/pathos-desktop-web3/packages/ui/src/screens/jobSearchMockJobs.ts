/**
 * ============================================================================
 * JOB SEARCH MOCK JOBS — Evaluation-quality mock dataset and mock search
 * ============================================================================
 *
 * PURPOSE: Stable mock jobs (36) for Load more paging and filter testing.
 * mockSearchJobs is a pure, deterministic filter/sort; no network.
 * BOUNDARY: No next/* or electron/*. Uses @pathos/core Job type.
 *
 * Dataset: 36 jobs built from 10 base templates; id, grade, agency, location
 * varied by index (deterministic). Close-date order and tags support urgency sort.
 */

import type { Job } from '@pathos/core';

// ---------------------------------------------------------------------------
// Job overview (evaluation-quality): Key Facts + risk flags for details panel
// ---------------------------------------------------------------------------

/** USAJOBS-style overview fields for Key Facts grid and risk chips. All optional. */
export interface JobOverview {
  openTo?: string[];
  appointmentType?: string;
  teleworkEligible?: string;
  remoteJob?: string;
  workSchedule?: string;
  travelRequired?: string;
  securityClearance?: string;
  drugTest?: string;
  financialDisclosure?: string;
  supervisoryStatus?: string;
  bargainingUnitStatus?: string;
  promotionPotential?: string;
  payRange?: string;
}

/** Job with optional overview (used by mock list and details; core Job remains unchanged). */
export interface JobWithOverview extends Job {
  overview?: JobOverview;
}

const MOCK_SAVED_AT = '2025-02-01T12:00:00.000Z';

// ---------------------------------------------------------------------------
// Base templates (10): title, agency, location, grade, summary, overview shape.
// Used to build 36 jobs by varying id, grade, agency, location by index.
// ---------------------------------------------------------------------------

interface TemplateRow {
  title: string;
  agency: string;
  location: string;
  grade: string;
  summary: string;
  overview: JobOverview;
}

const BASE_TEMPLATES: TemplateRow[] = [
  {
    title: 'IT Specialist (Cybersecurity)',
    agency: 'Department of Homeland Security',
    location: 'Washington, DC',
    grade: 'GS-12',
    summary: 'Cybersecurity roles supporting DHS mission. Remote work possible. Series 2210.',
    overview: {
      openTo: ['Public', 'Veterans'],
      appointmentType: 'Competitive',
      teleworkEligible: 'Yes',
      remoteJob: 'No',
      workSchedule: 'Full-time',
      travelRequired: 'Yes',
      securityClearance: 'Secret',
      drugTest: 'Yes',
      promotionPotential: 'GS-13',
      payRange: '$86,962 - $113,047',
    },
  },
  {
    title: 'Management Analyst',
    agency: 'Department of Veterans Affairs',
    location: 'Remote',
    grade: 'GS-11',
    summary: 'Organizational analysis and process improvement. Series 0343.',
    overview: {
      openTo: ['Public'],
      appointmentType: 'Competitive',
      teleworkEligible: 'Yes',
      remoteJob: 'Yes',
      workSchedule: 'Full-time',
      travelRequired: 'No',
      securityClearance: 'None',
      drugTest: 'No',
      promotionPotential: 'GS-12',
      payRange: '$72,553 - $94,317',
    },
  },
  {
    title: 'Program Analyst',
    agency: 'Department of Veterans Affairs',
    location: 'Washington, DC',
    grade: 'GS-12',
    summary: 'Program evaluation and metrics. Hybrid telework. Series 0343.',
    overview: {
      openTo: ['Public', 'Veterans'],
      appointmentType: 'Competitive',
      teleworkEligible: 'Yes',
      remoteJob: 'No',
      workSchedule: 'Full-time',
      travelRequired: '25% or less',
      securityClearance: 'None',
      drugTest: 'No',
      promotionPotential: 'GS-13',
      payRange: '$86,962 - $113,047',
    },
  },
  {
    title: 'Budget Analyst',
    agency: 'Department of Defense',
    location: 'Arlington, VA',
    grade: 'GS-12',
    summary: 'Budget formulation and execution. On-site. Series 0510.',
    overview: {
      openTo: ['Public'],
      appointmentType: 'Competitive',
      teleworkEligible: 'No',
      remoteJob: 'No',
      workSchedule: 'Full-time',
      travelRequired: 'No',
      securityClearance: 'Secret',
      drugTest: 'No',
      financialDisclosure: 'Yes',
      promotionPotential: 'GS-13',
      payRange: '$86,962 - $113,047',
    },
  },
  {
    title: 'Human Resources Specialist',
    agency: 'Department of Homeland Security',
    location: 'Washington, DC',
    grade: 'GS-13',
    summary: 'Staffing and classification. Series 0201.',
    overview: {
      openTo: ['Internal'],
      appointmentType: 'Competitive',
      teleworkEligible: 'Yes',
      remoteJob: 'No',
      workSchedule: 'Full-time',
      travelRequired: 'No',
      securityClearance: 'None',
      drugTest: 'No',
      supervisoryStatus: 'Yes',
      promotionPotential: 'GS-14',
      payRange: '$103,409 - $134,435',
    },
  },
  {
    title: 'Contract Specialist',
    agency: 'General Services Administration',
    location: 'Kansas City, MO',
    grade: 'GS-11',
    summary: 'Contract administration and negotiation. Series 1102.',
    overview: {
      openTo: ['Public', 'Veterans'],
      appointmentType: 'Competitive',
      teleworkEligible: 'Yes',
      remoteJob: 'No',
      workSchedule: 'Full-time',
      travelRequired: '25% or less',
      securityClearance: 'None',
      drugTest: 'No',
      promotionPotential: 'GS-12',
      payRange: '$72,553 - $94,317',
    },
  },
  {
    title: 'IT Specialist (INFOSEC)',
    agency: 'Department of Defense',
    location: 'Remote',
    grade: 'GS-13',
    summary: 'Information security programs. Series 2210.',
    overview: {
      openTo: ['Public'],
      appointmentType: 'Excepted',
      teleworkEligible: 'Yes',
      remoteJob: 'Yes',
      workSchedule: 'Full-time',
      travelRequired: 'No',
      securityClearance: 'Top Secret',
      drugTest: 'Yes',
      promotionPotential: 'GS-14',
      payRange: '$103,409 - $134,435',
    },
  },
  {
    title: 'Program Analyst',
    agency: 'Office of Personnel Management',
    location: 'Washington, DC',
    grade: 'GS-12',
    summary: 'Policy analysis and program evaluation. Series 0343.',
    overview: {
      openTo: ['Public'],
      appointmentType: 'Competitive',
      teleworkEligible: 'Yes',
      remoteJob: 'No',
      workSchedule: 'Full-time',
      travelRequired: 'No',
      securityClearance: 'None',
      drugTest: 'No',
      promotionPotential: 'GS-13',
      payRange: '$86,962 - $113,047',
    },
  },
  {
    title: 'Financial Analyst',
    agency: 'Department of Veterans Affairs',
    location: 'Remote',
    grade: 'GS-12',
    summary: 'Financial analysis and reporting. Series 0560.',
    overview: {
      openTo: ['Public', 'Veterans'],
      appointmentType: 'Competitive',
      teleworkEligible: 'Yes',
      remoteJob: 'Yes',
      workSchedule: 'Full-time',
      travelRequired: 'No',
      securityClearance: 'None',
      drugTest: 'No',
      financialDisclosure: 'Yes',
      promotionPotential: 'GS-13',
      payRange: '$86,962 - $113,047',
    },
  },
  {
    title: 'Policy Analyst',
    agency: 'Department of Homeland Security',
    location: 'Washington, DC',
    grade: 'GS-14',
    summary: 'Policy development and strategic planning. Series 0301.',
    overview: {
      openTo: ['Public'],
      appointmentType: 'Competitive',
      teleworkEligible: 'Yes',
      remoteJob: 'No',
      workSchedule: 'Full-time',
      travelRequired: 'Yes',
      securityClearance: 'Secret',
      drugTest: 'No',
      financialDisclosure: 'Yes',
      promotionPotential: 'GS-15',
      payRange: '$122,198 - $158,860',
    },
  },
];

/** Grades to cycle over (index % length) for variety. */
const GRADES: string[] = ['GS-9', 'GS-10', 'GS-11', 'GS-12', 'GS-13', 'GS-14', 'GS-15'];

/** Agencies to cycle over so we get DHS, VA, DoD, HHS, IRS, SSA, USDA, DOJ, GSA, Census. */
const AGENCIES: string[] = [
  'Department of Homeland Security',
  'Department of Veterans Affairs',
  'Department of Defense',
  'Department of Health and Human Services',
  'Internal Revenue Service',
  'Social Security Administration',
  'Department of Agriculture',
  'Department of Justice',
  'General Services Administration',
  'Office of Personnel Management',
  'U.S. Census Bureau',
];

/** Locations to cycle over: DC, Arlington VA, Remote, Tampa, Miami, San Antonio, Chicago, etc. */
const LOCATIONS: string[] = [
  'Washington, DC',
  'Arlington, VA',
  'Remote',
  'Tampa, FL',
  'Miami, FL',
  'San Antonio, TX',
  'Chicago, IL',
  'Kansas City, MO',
  'Denver, CO',
  'Atlanta, GA',
  'Seattle, WA',
  'Philadelphia, PA',
];

/** Number of mock jobs to generate (deterministic; enables multiple Load more pages). */
const MOCK_JOBS_COUNT = 36;

/**
 * Build MOCK_JOBS array deterministically from templates.
 * Each job: id mock-js-(i+1), template from BASE_TEMPLATES[i % 10],
 * grade/agency/location from GRADES/AGENCIES/LOCATIONS by index (no randomness).
 */
function buildMockJobs(): JobWithOverview[] {
  const out: JobWithOverview[] = [];
  for (let i = 0; i < MOCK_JOBS_COUNT; i++) {
    const t = BASE_TEMPLATES[i % BASE_TEMPLATES.length];
    const id = 'mock-js-' + (i + 1);
    const grade = GRADES[i % GRADES.length];
    const agency = AGENCIES[i % AGENCIES.length];
    const location = LOCATIONS[i % LOCATIONS.length];
    const job: JobWithOverview = {
      id,
      title: t.title,
      agency,
      location,
      grade,
      url: 'https://www.usajobs.gov/job/sample' + (i + 1),
      summary: t.summary,
      savedAt: MOCK_SAVED_AT,
      overview: t.overview,
    };
    out.push(job);
  }
  return out;
}

export const MOCK_JOBS: JobWithOverview[] = buildMockJobs();

/**
 * Which mock job ids show "New" or "Close date updated" tag.
 * First three ids (1,2,3) are "closes soon" (Close date updated); id 1 also New.
 */
export const MOCK_JOB_TAGS: Record<string, 'New' | 'Close date updated'> = {
  'mock-js-1': 'New',
  'mock-js-2': 'Close date updated',
  'mock-js-3': 'Close date updated',
};

/**
 * Order of ids by "close date soonest first" for deterministic sort.
 * First 3 = closes soon (3–5 days); then 4–36 by index (staggered 10–45 days).
 * Ids not in this array are appended after, in original order.
 */
function buildCloseDateOrder(): string[] {
  const order: string[] = [];
  for (let i = 1; i <= MOCK_JOBS_COUNT; i++) {
    order.push('mock-js-' + i);
  }
  return order;
}

const CLOSE_DATE_ORDER: string[] = buildCloseDateOrder();

// ---------------------------------------------------------------------------
// Mock search: inputs and filter shape (aligned with store)
// ---------------------------------------------------------------------------

export interface MockSearchInput {
  keywords?: string;
  location?: string;
  filters?: {
    gradeBand?: string;
    series?: string;
    agency?: string;
    remoteType?: string;
    appointmentType?: string;
    location?: string;
  };
}

/**
 * Pure, deterministic mock search. Matches keywords (title/summary), location,
 * and filters (grade, agency, location, remoteType via location string).
 * Returns jobs sorted by closeDate order (soonest first).
 * Accepts Job[] or JobWithOverview[]; returns same type as input.
 */
export function mockSearchJobs(
  input: MockSearchInput,
  jobs: JobWithOverview[]
): JobWithOverview[] {
  const keywords = (input.keywords !== undefined ? input.keywords : '').trim().toLowerCase();
  const location = (input.location !== undefined ? input.location : '').trim().toLowerCase();
  const filters = input.filters !== undefined ? input.filters : {};

  let list: JobWithOverview[] = [];
  for (let i = 0; i < jobs.length; i++) {
    list.push(jobs[i]);
  }

  if (keywords !== '') {
    const next: JobWithOverview[] = [];
    for (let i = 0; i < list.length; i++) {
      const j = list[i];
      const titleMatch = j.title && j.title.toLowerCase().indexOf(keywords) !== -1;
      const summaryMatch = j.summary && j.summary.toLowerCase().indexOf(keywords) !== -1;
      const seriesInSummary = j.summary && j.summary.toLowerCase().indexOf(keywords) !== -1;
      if (titleMatch || summaryMatch || seriesInSummary) {
        next.push(j);
      }
    }
    list = next;
  }

  if (location !== '') {
    const next: JobWithOverview[] = [];
    for (let i = 0; i < list.length; i++) {
      const j = list[i];
      if (j.location && j.location.toLowerCase().indexOf(location) !== -1) {
        next.push(j);
      }
    }
    list = next;
  }

  if (filters.gradeBand !== undefined && filters.gradeBand !== '') {
    const next: JobWithOverview[] = [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].grade === filters.gradeBand) {
        next.push(list[i]);
      }
    }
    list = next;
  }

  if (filters.agency !== undefined && filters.agency !== '') {
    const next: JobWithOverview[] = [];
    for (let i = 0; i < list.length; i++) {
      const a = list[i].agency;
      if (a && a.indexOf(filters.agency) !== -1) {
        next.push(list[i]);
      }
    }
    list = next;
  }

  if (filters.series !== undefined && filters.series !== '') {
    const next: JobWithOverview[] = [];
    for (let i = 0; i < list.length; i++) {
      const s = list[i].summary;
      if (s && s.indexOf(filters.series) !== -1) {
        next.push(list[i]);
      }
    }
    list = next;
  }

  if (filters.location !== undefined && filters.location !== '') {
    const next: JobWithOverview[] = [];
    for (let i = 0; i < list.length; i++) {
      const loc = list[i].location;
      if (loc && loc.indexOf(filters.location) !== -1) {
        next.push(list[i]);
      }
    }
    list = next;
  }

  if (filters.remoteType !== undefined && filters.remoteType !== '') {
    const next: JobWithOverview[] = [];
    const rt = filters.remoteType.toLowerCase();
    for (let i = 0; i < list.length; i++) {
      const job = list[i];
      if (job === undefined) continue;
      const loc = job.location ? job.location.toLowerCase() : '';
      const sum = job.summary ? job.summary.toLowerCase() : '';
      const match = loc.indexOf(rt) !== -1 || sum.indexOf(rt) !== -1;
      if (match) {
        next.push(job);
      }
    }
    list = next;
  }

  if (filters.appointmentType !== undefined && filters.appointmentType !== '') {
    const next: JobWithOverview[] = [];
    for (let i = 0; i < list.length; i++) {
      const s = list[i].summary;
      if (s && s.indexOf(filters.appointmentType) !== -1) {
        next.push(list[i]);
      }
    }
    list = next;
  }

  // Sort by close-date order (soonest first). Ids not in CLOSE_DATE_ORDER go at end.
  const orderIndex: Record<string, number> = {};
  for (let i = 0; i < CLOSE_DATE_ORDER.length; i++) {
    orderIndex[CLOSE_DATE_ORDER[i]] = i;
  }
  list.sort(function (a, b) {
    const ai = orderIndex[a.id] !== undefined ? orderIndex[a.id] : CLOSE_DATE_ORDER.length;
    const bi = orderIndex[b.id] !== undefined ? orderIndex[b.id] : CLOSE_DATE_ORDER.length;
    if (ai !== bi) return ai - bi;
    return 0;
  });

  return list;
}
