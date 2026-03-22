'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { JobResult, RecommendedRole } from '@/types/job-search';
import { mockJobs, mockRecommendedRoles } from '@/data/mock-job-search-data';

interface JobDataContextType {
  jobs: JobResult[];
  recommendedRoles: RecommendedRole[];
}

const JobDataContext = createContext<JobDataContextType | null>(null);

export function JobDataProvider({ children }: { children: ReactNode }) {
  const value: JobDataContextType = {
    jobs: mockJobs,
    recommendedRoles: mockRecommendedRoles,
  };

  return <JobDataContext.Provider value={value}>{children}</JobDataContext.Provider>;
}

export function useJobData(): JobDataContextType {
  const context = useContext(JobDataContext);
  if (!context) {
    throw new Error('useJobData must be used within a JobDataProvider');
  }
  return context;
}
