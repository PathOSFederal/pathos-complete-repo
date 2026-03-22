'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * Creates a unique ID for saved searches, with a fallback for environments
 * where crypto.randomUUID is not available (e.g., some mobile browsers).
 */
function createSavedSearchId(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cryptoObj = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID() as string;
  }
  // Fallback: timestamp + random string
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Types
export interface JobSearchFilters {
  query: string;
  segment: 'federal' | 'military' | 'civilian';
  location?: string | null;
  gradeBand?: string | null;
  agency?: string | null;
  workType?: string | null;
  seriesCode?: string | null;
  seriesCodes?: string[];

  // Advanced filters
  appointmentTypes?: AppointmentType[];
  workSchedules?: WorkSchedule[];
  promotionPotential?: PromotionPotentialFilter | null;
  supervisoryStatuses?: SupervisoryStatus[];

  teleworkPreference?: TeleworkPreference | null;
  travelFrequency?: TravelFrequency | null;

  clearanceLevels?: ClearanceLevel[];
  positionSensitivities?: PositionSensitivity[];

  hiringPaths?: HiringPath[];
  internalExternal?: InternalExternal | null;

  qualificationEmphasis?: QualificationEmphasis | null;
  trajectoryPreference?: TrajectoryPreference | null;
  retirementImpactPreference?: RetirementImpactPreference | null;
  compensationFocus?: CompensationFocus | null;
}

export interface JobAlertConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'off';
  minMatch: number; // 0-100, default 80
  channel: 'in-app' | 'email';
}

export interface SavedJobSearch {
  id: string;
  name: string;
  filters: JobSearchFilters;
  createdAt: string;
  isDefault?: boolean;
  alerts?: JobAlertConfig;
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
  estComp?: string;
  createdAt: string;
  isNew: boolean;
}

export interface JobAlerts {
  totalNew: number;
  items: JobAlertSummaryItem[];
}

interface JobSearchContextType {
  // Current filters
  jobSearchFilters: JobSearchFilters;
  setJobSearchFilters: (filters: Partial<JobSearchFilters>) => void;
  resetJobSearchFilters: () => void;

  // Defaults
  jobSearchDefaults: JobSearchFilters | null;
  setJobSearchDefaults: (filters: JobSearchFilters) => void;
  clearJobSearchDefaults: () => void;

  // Saved searches
  savedJobSearches: SavedJobSearch[];
  saveCurrentSearch: (name?: string) => SavedJobSearch;
  addSavedJobSearch: (search: Omit<SavedJobSearch, 'id' | 'createdAt'>) => void;
  updateSavedJobSearch: (id: string, updates: Partial<SavedJobSearch>) => void;
  deleteSavedJobSearch: (id: string) => void;
  setDefaultSavedJobSearch: (id: string | null) => void;
  applySavedJobSearch: (id: string) => void;

  // Active saved search tracking
  activeSavedSearchId: string | null;
  setActiveSavedSearchId: (id: string | null) => void;

  // Series guide panel state
  seriesGuideOpen: boolean;
  setSeriesGuideOpen: (open: boolean) => void;

  jobAlerts: JobAlerts;
  setJobAlerts: (alerts: JobAlerts) => void;
  fetchJobAlerts: () => Promise<void>;
}

const JobSearchContext = createContext<JobSearchContextType | undefined>(undefined);

const STORAGE_KEY = 'pathos-job-search-preferences';

type AppointmentType = 'permanent' | 'term' | 'temporary' | 'detail';
type WorkSchedule = 'full-time' | 'part-time' | 'intermittent' | 'shift';
type PromotionPotentialFilter = 'none' | 'up-to-current' | 'at-or-above-target';
type SupervisoryStatus = 'non-supervisory' | 'supervisory' | 'team-lead';
type TeleworkPreference = 'remote-only' | 'remote-or-telework' | 'on-site-preferred' | 'any';
type TravelFrequency = 'none' | 'up-to-25' | 'up-to-50' | 'over-50';
type ClearanceLevel = 'none' | 'public-trust' | 'secret' | 'ts' | 'ts-sci';
type PositionSensitivity =
  | 'non-sensitive'
  | 'non-critical-sensitive'
  | 'critical-sensitive'
  | 'special-sensitive';
type HiringPath = 'status' | 'veterans' | 'recent-graduates' | 'students' | 'public';
type InternalExternal = 'agency-only' | 'gov-wide' | 'all-sources';
type QualificationEmphasis = 'technical' | 'leadership' | 'policy-analysis' | 'any';
type TrajectoryPreference = 'lateral' | 'promotion' | 'senior-track' | 'any';
type RetirementImpactPreference = 'improve' | 'neutral' | 'avoid-negative' | 'any';
type CompensationFocus = 'maximize-salary' | 'balance' | 'quality-of-life';

const defaultFilters: JobSearchFilters = {
  query: '',
  segment: 'federal',
  location: null,
  gradeBand: null,
  agency: null,
  workType: null,
  seriesCode: null,
  seriesCodes: [],
  appointmentTypes: [],
  workSchedules: [],
  promotionPotential: null,
  supervisoryStatuses: [],
  teleworkPreference: null,
  travelFrequency: null,
  clearanceLevels: [],
  positionSensitivities: [],
  hiringPaths: [],
  internalExternal: null,
  qualificationEmphasis: null,
  trajectoryPreference: null,
  retirementImpactPreference: null,
  compensationFocus: null,
};

const defaultJobAlerts: JobAlerts = {
  totalNew: 0,
  items: [],
};

const mockJobAlerts: JobAlerts = {
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

/**
 * Helper: Load and compute initial state from localStorage.
 * Returns an object with all computed initial values.
 *
 * WHY THIS EXISTS:
 * We use lazy initializers to avoid setState in useEffect.
 * This function is called during the first render to compute initial state.
 */
function loadInitialJobSearchState(): {
  filters: JobSearchFilters;
  defaults: JobSearchFilters | null;
  savedSearches: SavedJobSearch[];
  activeSearchId: string | null;
} {
  // SSR guard: return defaults during server-side rendering
  if (typeof window === 'undefined') {
    return {
      filters: defaultFilters,
      defaults: null,
      savedSearches: [],
      activeSearchId: null,
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      let filters = defaultFilters;
      let defaults: JobSearchFilters | null = null;
      let savedSearches: SavedJobSearch[] = [];
      let activeSearchId: string | null = null;

      // Load saved job search defaults
      if (parsed.jobSearchDefaults) {
        defaults = parsed.jobSearchDefaults;
        // Apply defaults to filters
        filters = { ...defaultFilters, ...parsed.jobSearchDefaults };
      }

      // Load saved searches
      if (parsed.savedJobSearches) {
        savedSearches = parsed.savedJobSearches;
        // Check for default saved search and apply it
        const defaultSearch = parsed.savedJobSearches.find(function (s: SavedJobSearch) {
          return s.isDefault;
        });
        if (defaultSearch) {
          filters = { ...defaultFilters, ...defaultSearch.filters };
          activeSearchId = defaultSearch.id;
        }
      }

      return { filters, defaults, savedSearches, activeSearchId };
    }
  } catch (error) {
    console.error('Failed to load job search preferences:', error);
  }

  return {
    filters: defaultFilters,
    defaults: null,
    savedSearches: [],
    activeSearchId: null,
  };
}

/**
 * JobSearchProvider component
 *
 * WHY THIS EXISTS:
 * Provides job search context to the app including filters, saved searches, and alerts.
 *
 * HOW IT WORKS:
 * 1. Uses lazy initializers to load from localStorage on first render (no setState in effect)
 * 2. Uses effect only for WRITING to localStorage (external system sync)
 * 3. Provides callbacks for updating search state
 */
export function JobSearchProvider({ children }: { children: React.ReactNode }) {
  /**
   * Lazy initializer: compute all initial state from localStorage synchronously.
   * This avoids the need for useEffect that calls setState.
   */
  const [initialState] = useState(loadInitialJobSearchState);

  const [jobSearchFilters, setFiltersState] = useState<JobSearchFilters>(initialState.filters);
  const [jobSearchDefaults, setDefaultsState] = useState<JobSearchFilters | null>(initialState.defaults);
  const [savedJobSearches, setSavedJobSearches] = useState<SavedJobSearch[]>(initialState.savedSearches);
  const [activeSavedSearchId, setActiveSavedSearchId] = useState<string | null>(initialState.activeSearchId);
  const [seriesGuideOpen, setSeriesGuideOpen] = useState(false);
  const [jobAlerts, setJobAlerts] = useState<JobAlerts>(defaultJobAlerts);

  /**
   * Track whether initial hydration is complete.
   * Use state here because isLoaded is consumed by the context value.
   * Note: setIsLoaded not needed since we initialize based on window existence.
   */
  const [isLoaded] = useState(function getInitialIsLoaded() {
    // If we're in the browser, we're loaded (data was read in lazy initializer)
    return typeof window !== 'undefined';
  });

  // Save to localStorage whenever saved searches or defaults change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            jobSearchDefaults,
            savedJobSearches,
          }),
        );
      } catch (error) {
        console.error('Failed to save job search preferences:', error);
      }
    }
  }, [jobSearchDefaults, savedJobSearches, isLoaded]);

  const setJobSearchFilters = useCallback((filters: Partial<JobSearchFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...filters }));
    // Clear active saved search when filters are manually changed
    setActiveSavedSearchId(null);
  }, []);

  const resetJobSearchFilters = useCallback(() => {
    if (jobSearchDefaults) {
      setFiltersState({ ...defaultFilters, ...jobSearchDefaults });
    } else {
      setFiltersState(defaultFilters);
    }
    setActiveSavedSearchId(null);
  }, [jobSearchDefaults]);

  const setJobSearchDefaults = useCallback((filters: JobSearchFilters) => {
    setDefaultsState(filters);
  }, []);

  const clearJobSearchDefaults = useCallback(() => {
    setDefaultsState(null);
  }, []);

  const addSavedJobSearch = useCallback((search: Omit<SavedJobSearch, 'id' | 'createdAt'>) => {
    const newSearch: SavedJobSearch = {
      ...search,
      id: createSavedSearchId(),
      createdAt: new Date().toISOString(),
    };

    setSavedJobSearches((prev) => {
      // If this is marked as default, unmark others
      if (search.isDefault) {
        return [...prev.map((s) => ({ ...s, isDefault: false })), newSearch];
      }
      return [...prev, newSearch];
    });

    if (search.isDefault) {
      setDefaultsState(search.filters);
    }
  }, []);

  const updateSavedJobSearch = useCallback((id: string, updates: Partial<SavedJobSearch>) => {
    setSavedJobSearches((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return { ...s, ...updates };
        }
        // If updating to default, unmark others
        if (updates.isDefault) {
          return { ...s, isDefault: false };
        }
        return s;
      }),
    );
  }, []);

  const deleteSavedJobSearch = useCallback((id: string) => {
    setSavedJobSearches((prev) => prev.filter((s) => s.id !== id));
    setActiveSavedSearchId((prev) => (prev === id ? null : prev));
  }, []);

  const setDefaultSavedJobSearch = useCallback(
    (id: string | null) => {
      setSavedJobSearches((prev) =>
        prev.map((s) => ({
          ...s,
          isDefault: s.id === id,
        })),
      );

      if (id) {
        const search = savedJobSearches.find((s) => s.id === id);
        if (search) {
          setDefaultsState(search.filters);
        }
      } else {
        setDefaultsState(null);
      }
    },
    [savedJobSearches],
  );

  const applySavedJobSearch = useCallback((id: string) => {
    setSavedJobSearches((prev) => {
      const search = prev.find((s) => s.id === id);
      if (search) {
        setFiltersState({ ...defaultFilters, ...search.filters });
        setActiveSavedSearchId(id);
      }
      return prev;
    });
  }, []);

  const saveCurrentSearch = useCallback(
    (name?: string): SavedJobSearch => {
      const searchName =
        name || `Search – ${jobSearchFilters.segment} – ${jobSearchFilters.query || 'All'}`;

      let result: SavedJobSearch | null = null;

      setSavedJobSearches((prev) => {
        const existing = prev.find((s) => s.name === searchName);

        if (existing) {
          // Update existing search with same name
          const updated: SavedJobSearch = {
            ...existing,
            filters: { ...jobSearchFilters },
          };
          result = updated;
          return prev.map((s) => (s.id === existing.id ? updated : s));
        }

        // Create new search
        const newSearch: SavedJobSearch = {
          id: createSavedSearchId(),
          name: searchName,
          filters: { ...jobSearchFilters },
          createdAt: new Date().toISOString(),
          alerts: {
            enabled: false,
            frequency: 'off',
            minMatch: 80,
            channel: 'in-app',
          },
        };

        result = newSearch;
        return [...prev, newSearch];
      });

      return result!;
    },
    [jobSearchFilters],
  );

  const fetchJobAlerts = useCallback(async () => {
    // TODO: Replace with real API call, e.g. /api/job-alerts
    // For now, return mocked data
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Map mock alerts to include actual saved search IDs if available
    // If no saved searches, return mock alerts as-is to avoid modulo-with-zero
    const alertsWithSearchIds: JobAlerts =
      savedJobSearches.length === 0
        ? mockJobAlerts
        : {
            ...mockJobAlerts,
            items: mockJobAlerts.items.map((item, index) => {
              const search = savedJobSearches[index % savedJobSearches.length];
              return {
                ...item,
                savedSearchId: search?.id || '',
                savedSearchName: search?.name || item.savedSearchName,
              };
            }),
          };

    setJobAlerts(alertsWithSearchIds);
  }, [savedJobSearches]);

  if (!isLoaded) {
    return null;
  }

  return (
    <JobSearchContext.Provider
      value={{
        jobSearchFilters,
        setJobSearchFilters,
        resetJobSearchFilters,
        jobSearchDefaults,
        setJobSearchDefaults,
        clearJobSearchDefaults,
        savedJobSearches,
        saveCurrentSearch,
        addSavedJobSearch,
        updateSavedJobSearch,
        deleteSavedJobSearch,
        setDefaultSavedJobSearch,
        applySavedJobSearch,
        activeSavedSearchId,
        setActiveSavedSearchId,
        seriesGuideOpen,
        setSeriesGuideOpen,
        jobAlerts,
        setJobAlerts,
        fetchJobAlerts,
      }}
    >
      {children}
    </JobSearchContext.Provider>
  );
}

export function useJobSearch() {
  const context = useContext(JobSearchContext);
  if (!context) {
    throw new Error('useJobSearch must be used within JobSearchProvider');
  }
  return context;
}
