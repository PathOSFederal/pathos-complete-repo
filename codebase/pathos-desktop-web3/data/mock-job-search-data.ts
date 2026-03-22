// Mock job search data for PathOS Tier 1.
// Replace with backend API data once the FastAPI service is ready.

import type { JobResult, RecommendedRole } from '@/types/job-search';

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
