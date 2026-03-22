// Retirement & Dashboard API module
// Wraps dashboard mock data with standardized async access

import { mockGet } from './client';
import {
  mockCompensationData,
  mockRetirementData,
  mockLeaveData,
  mockFehbData,
  mockTaxData,
  mockPcsData,
  mockJobSeekerCompensationData,
  type CompensationData,
  type RetirementData,
  type LeaveData,
  type FehbData,
  type TaxData,
  type PcsData,
} from '@/lib/mock/dashboard';

/**
 * Fetches the retirement snapshot data
 */
export function fetchRetirementSnapshot(): Promise<RetirementData> {
  return mockGet(() => ({ ...mockRetirementData }));
}

/**
 * Fetches retirement data for job seekers (zeroed out)
 */
export function fetchJobSeekerRetirementSnapshot(): Promise<RetirementData> {
  return mockGet(() => ({
    ...mockRetirementData,
    yearsOfService: 0,
    tspBalance: 0,
    projectedTspAtRetirement: 0,
  }));
}

/**
 * Fetches compensation data based on employee status
 */
export function fetchCompensationData(isEmployee: boolean): Promise<CompensationData> {
  return mockGet(() => {
    if (isEmployee) {
      return { ...mockCompensationData };
    }
    return { ...mockJobSeekerCompensationData };
  });
}

/**
 * Fetches employee compensation data
 */
export function fetchEmployeeCompensation(): Promise<CompensationData> {
  return mockGet(() => ({ ...mockCompensationData }));
}

/**
 * Fetches job seeker compensation data
 */
export function fetchJobSeekerCompensation(): Promise<CompensationData> {
  return mockGet(() => ({ ...mockJobSeekerCompensationData }));
}

/**
 * Fetches leave balance data
 */
export function fetchLeaveData(): Promise<LeaveData> {
  return mockGet(() => ({ ...mockLeaveData }));
}

/**
 * Fetches leave data for job seekers (zeroed out)
 */
export function fetchJobSeekerLeaveData(): Promise<LeaveData> {
  return mockGet(() => ({
    ...mockLeaveData,
    annualLeaveBalance: 0,
    sickLeaveBalance: 0,
  }));
}

/**
 * Fetches FEHB (Federal Employees Health Benefits) data
 */
export function fetchFehbData(): Promise<FehbData> {
  return mockGet(() => ({ ...mockFehbData }));
}

/**
 * Fetches tax withholding data
 */
export function fetchTaxData(): Promise<TaxData> {
  return mockGet(() => ({ ...mockTaxData }));
}

/**
 * Fetches PCS (Permanent Change of Station) data
 */
export function fetchPcsData(): Promise<PcsData> {
  return mockGet(() => ({ ...mockPcsData }));
}

/**
 * Fetches PCS data for job seekers (empty dates)
 */
export function fetchJobSeekerPcsData(): Promise<PcsData> {
  return mockGet(() => ({
    ...mockPcsData,
    lastPcsDate: '',
    lastPcsLocation: '',
  }));
}

/**
 * Fetches all dashboard data at once
 */
export interface DashboardData {
  compensation: CompensationData;
  retirement: RetirementData;
  leave: LeaveData;
  fehb: FehbData;
  tax: TaxData;
  pcs: PcsData;
}

export function fetchAllDashboardData(isEmployee: boolean): Promise<DashboardData> {
  return mockGet(() => {
    if (isEmployee) {
      return {
        compensation: { ...mockCompensationData },
        retirement: { ...mockRetirementData },
        leave: { ...mockLeaveData },
        fehb: { ...mockFehbData },
        tax: { ...mockTaxData },
        pcs: { ...mockPcsData },
      };
    }
    return {
      compensation: { ...mockJobSeekerCompensationData },
      retirement: {
        ...mockRetirementData,
        yearsOfService: 0,
        tspBalance: 0,
        projectedTspAtRetirement: 0,
      },
      leave: {
        ...mockLeaveData,
        annualLeaveBalance: 0,
        sickLeaveBalance: 0,
      },
      fehb: { ...mockFehbData },
      tax: { ...mockTaxData },
      pcs: {
        ...mockPcsData,
        lastPcsDate: '',
        lastPcsLocation: '',
      },
    };
  });
}

// Re-export types for convenience
export type {
  CompensationData,
  RetirementData,
  LeaveData,
  FehbData,
  TaxData,
  PcsData,
};

// Re-export raw data for stores that need synchronous initial state
export {
  mockCompensationData,
  mockRetirementData,
  mockLeaveData,
  mockFehbData,
  mockTaxData,
  mockPcsData,
  mockJobSeekerCompensationData,
} from '@/lib/mock/dashboard';

