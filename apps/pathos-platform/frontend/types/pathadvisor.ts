/**
 * PathAdvisor Type Definitions
 *
 * These types define the contract between the frontend and the PathAdvisor
 * backend service. The frontend treats these as opaque data - all calculation
 * logic lives in the backend.
 */

// ============================================================================
// Request Types
// ============================================================================

/**
 * Minimal user profile representation for PathAdvisor requests.
 * Maps to the existing Profile type but with only the fields needed by PathAdvisor.
 */
export interface PathAdvisorUserProfile {
  /** User persona type */
  persona: 'jobSeeker' | 'employee' | 'retiree';
  /** Current grade band (e.g., "GS-13", "GS-12") */
  currentGradeBand?: string | null;
  /** Current salary amount */
  currentSalary?: number | null;
  /** Current duty location */
  location?: string | null;
  /** Current agency (for employees) */
  agency?: string | null;
  /** Current series (for employees) */
  series?: string | null;
  /** Years of federal service (for employees) */
  yearsOfService?: number | null;
  /** Target grade range from */
  targetGradeFrom?: string | null;
  /** Target grade range to */
  targetGradeTo?: string | null;
}

/**
 * Scenario context for PathAdvisor analysis.
 * Represents the "what-if" scenario the user is exploring.
 */
export interface PathScenario {
  /** Target grade band for the scenario */
  targetGradeBand?: string | null;
  /** Target location for the scenario */
  targetLocation?: string | null;
  /** Target agency for the scenario */
  targetAgency?: string | null;
  /** Job posting ID if analyzing a specific job */
  jobId?: string | null;
  /** Job series code */
  jobSeries?: string | null;
  /** Job title */
  jobTitle?: string | null;
  /** Scenario type identifier */
  scenarioType?: 'promotion' | 'lateral' | 'entry' | 'relocation' | null;
}

/**
 * Request payload for PathAdvisor insights endpoint.
 */
export interface PathAdvisorRequest {
  /** User profile data */
  profile: PathAdvisorUserProfile;
  /** Optional scenario context */
  scenario?: PathScenario;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Salary projection result from PathAdvisor.
 */
export interface SalaryProjectionResult {
  /** Estimated salary increase amount */
  estimatedIncrease?: number | null;
  /** Estimated new total salary */
  estimatedNewSalary?: number | null;
  /** Estimated locality pay adjustment */
  localityAdjustment?: number | null;
  /** Human-readable notes about the projection */
  notes?: string | null;
}

/**
 * Retirement impact analysis result.
 */
export interface RetirementImpactResult {
  /** Change to TSP balance projection */
  tspDelta?: number | null;
  /** Retirement readiness score (0-100) */
  retirementReadinessScore?: number | null;
  /** Estimated years to retirement eligibility */
  yearsToEligibility?: number | null;
  /** FERS annuity impact estimate */
  annuityImpact?: number | null;
  /** Human-readable notes about retirement impact */
  notes?: string | null;
}

/**
 * Relocation insights for location-based scenarios.
 */
export interface RelocationInsights {
  /** Cost of living adjustment amount */
  costAdjustment?: number | null;
  /** Risk level assessment for the relocation */
  riskLevel?: 'low' | 'medium' | 'high' | null;
  /** Estimated PCS allowance if applicable */
  pcsAllowance?: number | null;
  /** Housing cost differential */
  housingDelta?: number | null;
  /** Human-readable notes about relocation */
  notes?: string | null;
}

/**
 * Full response from PathAdvisor insights endpoint.
 */
export interface PathAdvisorResponse {
  /** Salary projection data */
  salaryProjection: SalaryProjectionResult | null;
  /** Retirement impact data */
  retirementImpact: RetirementImpactResult | null;
  /** Qualification match score (0-100) */
  qualificationMatch: number | null;
  /** Competitiveness score (0-100) */
  competitivenessScore: number | null;
  /** Relocation insights (if scenario involves location change) */
  relocationInsights?: RelocationInsights | null;
  /** Timestamp of the analysis */
  timestamp?: string | null;
  /** Error message if analysis failed */
  error?: string | null;
}

// ============================================================================
// Store/State Types
// ============================================================================

/**
 * State shape for PathAdvisor insights in Zustand stores or component state.
 */
export interface PathAdvisorInsightsState {
  /** The insights data */
  insights: PathAdvisorResponse | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Timestamp of last successful fetch */
  lastFetched: string | null;
}

/**
 * Default/empty state for PathAdvisor insights.
 */
export const defaultPathAdvisorInsightsState: PathAdvisorInsightsState = {
  insights: null,
  isLoading: false,
  error: null,
  lastFetched: null,
};














