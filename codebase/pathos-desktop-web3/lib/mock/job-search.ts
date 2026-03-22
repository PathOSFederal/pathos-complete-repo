// Mock job search data for Zustand stores
// This file provides mock data for the job search functionality

export interface JobResult {
  id: number;
  role: string;
  series: string;
  grade: string;
  location: string;
  agency: string;
  type: string;
  estTotalComp: number;
  retirementImpact: string;
  matchPercent: number;
}

export interface RecommendedRole {
  id: number;
  title: string;
  location: string;
  matchPercent: number;
  tags: string[];
}

export interface JobAlertSummaryItem {
  id: string;
  savedSearchId: string;
  savedSearchName: string;
  title: string;
  grade: string;
  agency: string;
  location: string;
  match: number;
  estComp: string;
  createdAt: string;
  isNew: boolean;
}

export interface JobAlerts {
  totalNew: number;
  items: JobAlertSummaryItem[];
}

export const mockJobs: JobResult[] = [
  {
    id: 1,
    role: 'Program Analyst',
    series: '0343',
    grade: 'GS-14',
    location: 'Washington, DC',
    agency: 'Department of Defense',
    type: 'Federal',
    estTotalComp: 142500,
    retirementImpact: '+2 years',
    matchPercent: 94,
  },
  {
    id: 2,
    role: 'Management Analyst',
    series: '0343',
    grade: 'GS-13',
    location: 'Remote',
    agency: 'Department of Veterans Affairs',
    type: 'Federal',
    estTotalComp: 118700,
    retirementImpact: 'No change',
    matchPercent: 88,
  },
  {
    id: 3,
    role: 'Budget Analyst',
    series: '0560',
    grade: 'GS-14',
    location: 'San Antonio, TX',
    agency: 'USDA',
    type: 'Federal',
    estTotalComp: 135200,
    retirementImpact: '-6 months',
    matchPercent: 82,
  },
  {
    id: 4,
    role: 'IT Project Manager',
    series: '2210',
    grade: 'GS-14',
    location: 'Colorado Springs, CO',
    agency: 'Space Force',
    type: 'Military',
    estTotalComp: 148900,
    retirementImpact: '+1 year',
    matchPercent: 76,
  },
];

export const mockRecommendedRoles: RecommendedRole[] = [
  {
    id: 1,
    title: 'Senior Policy Analyst',
    location: 'Washington, DC',
    matchPercent: 96,
    tags: ['Higher pay', 'Same location'],
  },
  {
    id: 2,
    title: 'Branch Chief',
    location: 'Atlanta, GA',
    matchPercent: 91,
    tags: ['Leadership role', 'PCS required'],
  },
  {
    id: 3,
    title: 'Program Director',
    location: 'Remote',
    matchPercent: 89,
    tags: ['Higher pay', 'No PCS'],
  },
  {
    id: 4,
    title: 'Division Lead',
    location: 'Denver, CO',
    matchPercent: 85,
    tags: ['Leadership role', 'Relocation bonus'],
  },
];

export function createMockJobAlerts(): JobAlerts {
  return {
    totalNew: 3,
    items: [
      {
        id: 'alert-1',
        savedSearchId: '',
        savedSearchName: 'DC GS-13 Analyst',
        title: 'Program Analyst',
        grade: 'GS-13',
        agency: 'DoD',
        location: 'Washington, DC',
        match: 92,
        estComp: '$142,500',
        createdAt: new Date().toISOString(),
        isNew: true,
      },
      {
        id: 'alert-2',
        savedSearchId: '',
        savedSearchName: 'Remote IT Specialist',
        title: 'IT Specialist (INFOSEC)',
        grade: 'GS-14',
        agency: 'DHS',
        location: 'Remote',
        match: 87,
        estComp: '$156,200',
        createdAt: new Date().toISOString(),
        isNew: true,
      },
      {
        id: 'alert-3',
        savedSearchId: '',
        savedSearchName: 'DC GS-13 Analyst',
        title: 'Management Analyst',
        grade: 'GS-13',
        agency: 'VA',
        location: 'Washington, DC',
        match: 85,
        estComp: '$138,900',
        createdAt: new Date().toISOString(),
        isNew: true,
      },
    ],
  };
}

