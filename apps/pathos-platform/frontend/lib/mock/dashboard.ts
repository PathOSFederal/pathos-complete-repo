// Mock dashboard data for Zustand stores

export interface CompensationData {
  basePay: number;
  localityPay: number;
  totalPay: number;
  tspContribution: number;
  tspMatch: number;
  fehbCost: number;
  leaveValue: number;
  totalCompensation: number;
}

export interface RetirementData {
  yearsOfService: number;
  retirementEligibility: string;
  estimatedAnnuity: number;
  tspBalance: number;
  projectedTspAtRetirement: number;
}

export interface LeaveData {
  annualLeaveBalance: number;
  annualLeaveMax: number;
  sickLeaveBalance: number;
  useOrLoseDeadline: string;
  useOrLoseAmount: number;
}

export interface FehbData {
  currentPlan: string;
  monthlyPremium: number;
  coverageType: string;
  enrollmentCode: string;
}

export interface TaxData {
  federalWithholding: number;
  stateWithholding: number;
  effectiveTaxRate: number;
  estimatedRefund: number;
}

export interface PcsData {
  lastPcsDate: string;
  lastPcsLocation: string;
  estimatedPcsCost: number;
  dityCost: number;
}

export const mockCompensationData: CompensationData = {
  basePay: 115811,
  localityPay: 35643,
  totalPay: 151454,
  tspContribution: 7573,
  tspMatch: 7573,
  fehbCost: 8400,
  leaveValue: 8724,
  totalCompensation: 175324,
};

export const mockRetirementData: RetirementData = {
  yearsOfService: 12,
  retirementEligibility: 'MRA + 10 in 8 years',
  estimatedAnnuity: 42500,
  tspBalance: 285000,
  projectedTspAtRetirement: 850000,
};

export const mockLeaveData: LeaveData = {
  annualLeaveBalance: 156,
  annualLeaveMax: 240,
  sickLeaveBalance: 320,
  useOrLoseDeadline: '2025-01-11',
  useOrLoseAmount: 0,
};

export const mockFehbData: FehbData = {
  currentPlan: 'Blue Cross Blue Shield',
  monthlyPremium: 350,
  coverageType: 'Self + Family',
  enrollmentCode: '104',
};

export const mockTaxData: TaxData = {
  federalWithholding: 22500,
  stateWithholding: 6800,
  effectiveTaxRate: 19.3,
  estimatedRefund: 1200,
};

export const mockPcsData: PcsData = {
  lastPcsDate: '2022-06-15',
  lastPcsLocation: 'San Diego, CA',
  estimatedPcsCost: 12500,
  dityCost: 8500,
};

// Job seeker specific mock data
export const mockJobSeekerCompensationData: CompensationData = {
  basePay: 72750,
  localityPay: 22397,
  totalPay: 95147,
  tspContribution: 4757,
  tspMatch: 4757,
  fehbCost: 4200,
  leaveValue: 5489,
  totalCompensation: 110150,
};

