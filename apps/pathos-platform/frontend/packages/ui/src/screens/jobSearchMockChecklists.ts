/**
 * Mock checklist data for Job Search details panel (v1).
 * Stable per mock job id for SPECIALIZED EXPERIENCE, SKILLS & KEYWORDS, DOCUMENTS NEEDED.
 */

export interface JobChecklistData {
  specializedExperience: string[];
  skillsKeywords: string[];
  documentsNeeded: string[];
}

const CHECKLISTS: Record<string, JobChecklistData> = {
  'mock-1': {
    specializedExperience: [
      '1 year systems administration at GS-9 or equivalent',
      'Windows Server and Active Directory experience',
      'Network troubleshooting and security',
    ],
    skillsKeywords: ['Windows Server', 'Active Directory', 'VMware', 'PowerShell', 'ITIL'],
    documentsNeeded: ['Resume', 'SF-50', 'IT certifications (if applicable)'],
  },
  'mock-2': {
    specializedExperience: [
      '1 year experience in organizational analysis',
      'Experience with process improvement methodologies',
    ],
    skillsKeywords: ['Process improvement', 'Data analysis', 'Stakeholder communication'],
    documentsNeeded: ['Resume', 'SF-50'],
  },
  'mock-3': {
    specializedExperience: [
      '1 year program analysis or evaluation experience',
      'Experience with program metrics and reporting',
    ],
    skillsKeywords: ['Program evaluation', 'Excel', 'Written communication'],
    documentsNeeded: ['Resume', 'SF-50'],
  },
  'mock-4': {
    specializedExperience: [
      '1 year budget formulation or execution experience',
      'Experience with financial systems',
    ],
    skillsKeywords: ['Budget execution', 'Financial analysis', 'SAP'],
    documentsNeeded: ['Resume', 'SF-50'],
  },
  'mock-5': {
    specializedExperience: [
      '1 year HR advisory experience in staffing or classification',
      'Experience with USA Staffing or similar systems',
    ],
    skillsKeywords: ['Staffing', 'Classification', 'Employee relations'],
    documentsNeeded: ['Resume', 'SF-50'],
  },
  'mock-6': {
    specializedExperience: [
      '1 year contract administration or procurement experience',
      'FAC-C or DAWIA certification (or equivalent)',
    ],
    skillsKeywords: ['Contract administration', 'Negotiation', 'FAR'],
    documentsNeeded: ['Resume', 'SF-50', 'Certifications (if applicable)'],
  },
};

/**
 * Map job-search mock ids (mock-js-*) to checklist keys so details pane shows checklists.
 * mock-js-1..10 mapped explicitly; mock-js-11..36 use (n-1) % 6 + 1 for mock-1..mock-6.
 */
function buildJobSearchChecklistMap(): Record<string, string> {
  const m: Record<string, string> = {
    'mock-js-1': 'mock-1',
    'mock-js-2': 'mock-2',
    'mock-js-3': 'mock-3',
    'mock-js-4': 'mock-4',
    'mock-js-5': 'mock-5',
    'mock-js-6': 'mock-6',
    'mock-js-7': 'mock-1',
    'mock-js-8': 'mock-2',
    'mock-js-9': 'mock-4',
    'mock-js-10': 'mock-3',
  };
  for (let n = 11; n <= 36; n++) {
    m['mock-js-' + n] = 'mock-' + ((n - 1) % 6 + 1);
  }
  return m;
}

const JOB_SEARCH_CHECKLIST_MAP: Record<string, string> = buildJobSearchChecklistMap();

export function getChecklistForJob(jobId: string): JobChecklistData | null {
  const key = JOB_SEARCH_CHECKLIST_MAP[jobId] !== undefined ? JOB_SEARCH_CHECKLIST_MAP[jobId] : jobId;
  return CHECKLISTS[key] !== undefined ? CHECKLISTS[key] : null;
}
