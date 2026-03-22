import { create } from 'zustand';
import {
  mockCompensationData,
  mockRetirementData,
  mockLeaveData,
  mockFehbData,
  mockTaxData,
  mockPcsData,
  mockJobSeekerCompensationData,
  fetchCompensationData,
  fetchRetirementSnapshot,
  fetchLeaveData,
  fetchFehbData,
  fetchTaxData,
  fetchPcsData,
  fetchAllDashboardData,
  type CompensationData,
  type RetirementData,
  type LeaveData,
  type FehbData,
  type TaxData,
  type PcsData,
} from '@/lib/api/retirement';
import {
  fetchAdvisorInsights,
  buildAdvisorRequest,
  PathAdvisorError,
} from '@/lib/api/pathadvisor-client';
import type {
  PathAdvisorResponse,
  PathScenario,
} from '@/types/pathadvisor';

// Store interface
interface DashboardState {
  // Dashboard data
  compensation: CompensationData;
  retirement: RetirementData;
  leave: LeaveData;
  fehb: FehbData;
  tax: TaxData;
  pcs: PcsData;
  isLoading: boolean;
  lastUpdated: string | null;

  // Series guide state
  seriesGuideOpen: boolean;

  // PathAdvisor insights state
  pathAdvisorInsights: PathAdvisorResponse | null;
  pathAdvisorLoading: boolean;
  pathAdvisorError: string | null;
  pathAdvisorLastFetched: string | null;
}

interface DashboardActions {
  // Dashboard data setters
  setCompensation: (data: CompensationData) => void;
  setRetirement: (data: RetirementData) => void;
  setLeave: (data: LeaveData) => void;
  setFehb: (data: FehbData) => void;
  setTax: (data: TaxData) => void;
  setPcs: (data: PcsData) => void;

  // Series guide actions
  setSeriesGuideOpen: (open: boolean) => void;

  // Mock loading functions
  loadMockData: (isEmployee: boolean) => void;
  loadCompensationData: (isEmployee: boolean) => Promise<void>;
  loadRetirementData: () => Promise<void>;
  loadLeaveData: () => Promise<void>;
  loadFehbData: () => Promise<void>;
  loadTaxData: () => Promise<void>;
  loadPcsData: () => Promise<void>;
  refreshAllData: (isEmployee: boolean) => Promise<void>;

  // PathAdvisor actions
  fetchPathAdvisorInsights: (
    profile: Parameters<typeof buildAdvisorRequest>[0],
    scenario?: PathScenario
  ) => Promise<void>;
  clearPathAdvisorInsights: () => void;

  // Reset action for "Delete All Local Data"
  resetDashboard: () => void;
}

export type DashboardStore = DashboardState & DashboardActions;

// Selectors
export const selectCompensation = function (state: DashboardStore): CompensationData {
  return state.compensation;
};

export const selectRetirement = function (state: DashboardStore): RetirementData {
  return state.retirement;
};

export const selectLeave = function (state: DashboardStore): LeaveData {
  return state.leave;
};

export const selectFehb = function (state: DashboardStore): FehbData {
  return state.fehb;
};

export const selectTax = function (state: DashboardStore): TaxData {
  return state.tax;
};

export const selectPcs = function (state: DashboardStore): PcsData {
  return state.pcs;
};

export const selectIsLoading = function (state: DashboardStore): boolean {
  return state.isLoading;
};

export const selectLastUpdated = function (state: DashboardStore): string | null {
  return state.lastUpdated;
};

// Computed selectors
export const selectTotalCompensation = function (state: DashboardStore): number {
  return state.compensation.totalCompensation;
};

export const selectBasePay = function (state: DashboardStore): number {
  return state.compensation.basePay;
};

export const selectTspBalance = function (state: DashboardStore): number {
  return state.retirement.tspBalance;
};

export const selectAnnualLeaveBalance = function (state: DashboardStore): number {
  return state.leave.annualLeaveBalance;
};

export const selectSickLeaveBalance = function (state: DashboardStore): number {
  return state.leave.sickLeaveBalance;
};

export const selectSeriesGuideOpen = function (state: DashboardStore): boolean {
  return state.seriesGuideOpen;
};

// PathAdvisor selectors
export const selectPathAdvisorInsights = function (state: DashboardStore): PathAdvisorResponse | null {
  return state.pathAdvisorInsights;
};

export const selectPathAdvisorLoading = function (state: DashboardStore): boolean {
  return state.pathAdvisorLoading;
};

export const selectPathAdvisorError = function (state: DashboardStore): string | null {
  return state.pathAdvisorError;
};

// Create the store
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- get provided by Zustand, reserved for future use
export const useDashboardStore = create<DashboardStore>(function (set, _get) {
  return {
    // Initial state - Dashboard data
    compensation: Object.assign({}, mockCompensationData),
    retirement: Object.assign({}, mockRetirementData),
    leave: Object.assign({}, mockLeaveData),
    fehb: Object.assign({}, mockFehbData),
    tax: Object.assign({}, mockTaxData),
    pcs: Object.assign({}, mockPcsData),
    isLoading: false,
    lastUpdated: null,

    // Initial state - Series guide
    seriesGuideOpen: false,

    // Initial state - PathAdvisor
    pathAdvisorInsights: null,
    pathAdvisorLoading: false,
    pathAdvisorError: null,
    pathAdvisorLastFetched: null,

    // Dashboard data setters
    setCompensation: function (data) {
      set({ compensation: Object.assign({}, data) });
    },

    setRetirement: function (data) {
      set({ retirement: Object.assign({}, data) });
    },

    setLeave: function (data) {
      set({ leave: Object.assign({}, data) });
    },

    setFehb: function (data) {
      set({ fehb: Object.assign({}, data) });
    },

    setTax: function (data) {
      set({ tax: Object.assign({}, data) });
    },

    setPcs: function (data) {
      set({ pcs: Object.assign({}, data) });
    },

    // Series guide actions
    setSeriesGuideOpen: function (open) {
      set({ seriesGuideOpen: open });
    },

    // Mock loading functions
    loadMockData: function (isEmployee) {
      if (isEmployee) {
        set({
          compensation: Object.assign({}, mockCompensationData),
          retirement: Object.assign({}, mockRetirementData),
          leave: Object.assign({}, mockLeaveData),
          fehb: Object.assign({}, mockFehbData),
          tax: Object.assign({}, mockTaxData),
          pcs: Object.assign({}, mockPcsData),
          lastUpdated: new Date().toISOString(),
        });
      } else {
        set({
          compensation: Object.assign({}, mockJobSeekerCompensationData),
          retirement: Object.assign({}, mockRetirementData, {
            yearsOfService: 0,
            tspBalance: 0,
            projectedTspAtRetirement: 0,
          }),
          leave: Object.assign({}, mockLeaveData, {
            annualLeaveBalance: 0,
            sickLeaveBalance: 0,
          }),
          fehb: Object.assign({}, mockFehbData),
          tax: Object.assign({}, mockTaxData),
          pcs: Object.assign({}, mockPcsData, {
            lastPcsDate: '',
            lastPcsLocation: '',
          }),
          lastUpdated: new Date().toISOString(),
        });
      }
    },

    loadCompensationData: function (isEmployee) {
      set({ isLoading: true });
      return fetchCompensationData(isEmployee).then(function (data) {
        set({
          compensation: data,
          isLoading: false,
          lastUpdated: new Date().toISOString(),
        });
      });
    },

    loadRetirementData: function () {
      set({ isLoading: true });
      return fetchRetirementSnapshot().then(function (data) {
        set({
          retirement: data,
          isLoading: false,
          lastUpdated: new Date().toISOString(),
        });
      });
    },

    loadLeaveData: function () {
      set({ isLoading: true });
      return fetchLeaveData().then(function (data) {
        set({
          leave: data,
          isLoading: false,
          lastUpdated: new Date().toISOString(),
        });
      });
    },

    loadFehbData: function () {
      set({ isLoading: true });
      return fetchFehbData().then(function (data) {
        set({
          fehb: data,
          isLoading: false,
          lastUpdated: new Date().toISOString(),
        });
      });
    },

    loadTaxData: function () {
      set({ isLoading: true });
      return fetchTaxData().then(function (data) {
        set({
          tax: data,
          isLoading: false,
          lastUpdated: new Date().toISOString(),
        });
      });
    },

    loadPcsData: function () {
      set({ isLoading: true });
      return fetchPcsData().then(function (data) {
        set({
          pcs: data,
          isLoading: false,
          lastUpdated: new Date().toISOString(),
        });
      });
    },

    refreshAllData: function (isEmployee) {
      set({ isLoading: true });
      return fetchAllDashboardData(isEmployee).then(function (data) {
        set({
          compensation: data.compensation,
          retirement: data.retirement,
          leave: data.leave,
          fehb: data.fehb,
          tax: data.tax,
          pcs: data.pcs,
          isLoading: false,
          lastUpdated: new Date().toISOString(),
        });
      });
    },

    // PathAdvisor actions
    fetchPathAdvisorInsights: function (profile, scenario) {
      set({
        pathAdvisorLoading: true,
        pathAdvisorError: null,
      });

      const request = buildAdvisorRequest(profile, scenario);

      return fetchAdvisorInsights(request)
        .then(function (response) {
          set({
            pathAdvisorInsights: response,
            pathAdvisorLoading: false,
            pathAdvisorError: null,
            pathAdvisorLastFetched: new Date().toISOString(),
          });
        })
        .catch(function (err) {
          let errorMessage = 'Failed to load PathAdvisor insights';
          if (err instanceof PathAdvisorError) {
            errorMessage = err.message;
          } else if (err instanceof Error) {
            errorMessage = err.message;
          }
          set({
            pathAdvisorLoading: false,
            pathAdvisorError: errorMessage,
          });
        });
    },

    clearPathAdvisorInsights: function () {
      set({
        pathAdvisorInsights: null,
        pathAdvisorLoading: false,
        pathAdvisorError: null,
        pathAdvisorLastFetched: null,
      });
    },

    // Reset action for "Delete All Local Data"
    resetDashboard: function () {
      set({
        // Reset dashboard data to initial mock values
        compensation: Object.assign({}, mockCompensationData),
        retirement: Object.assign({}, mockRetirementData),
        leave: Object.assign({}, mockLeaveData),
        fehb: Object.assign({}, mockFehbData),
        tax: Object.assign({}, mockTaxData),
        pcs: Object.assign({}, mockPcsData),
        isLoading: false,
        lastUpdated: null,

        // Reset UI state
        seriesGuideOpen: false,

        // Reset PathAdvisor state
        pathAdvisorInsights: null,
        pathAdvisorLoading: false,
        pathAdvisorError: null,
        pathAdvisorLastFetched: null,
      });
    },
  };
});

// Re-export types
export type {
  CompensationData,
  RetirementData,
  LeaveData,
  FehbData,
  TaxData,
  PcsData,
};

// Re-export PathAdvisor types
export type { PathAdvisorResponse, PathScenario } from '@/types/pathadvisor';
