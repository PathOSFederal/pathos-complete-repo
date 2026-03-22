/**
 * ============================================================================
 * JOB SEEKER INTELLIGENCE LAYER v1 - RULES ENGINE
 * ============================================================================
 *
 * FILE PURPOSE:
 * This module provides deterministic, rules-based intelligence signals for
 * federal job seekers. It computes four "Career Outlook" signals that help
 * users understand the value and implications of a federal job opportunity.
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Located in lib/intelligence/ as a pure computation module
 * - No network calls, no backend dependencies - frontend-only
 * - Can be replaced by PathAdvisor backend logic in future versions
 * - Consumed by Career Outlook UI components in the dashboard
 *
 * THE FOUR SIGNALS:
 * 1. Locality Power Score (0-100) - Purchasing power of salary in location
 * 2. Career Trajectory Preview - Promotion runway assessment
 * 3. Benefit Value Signal - Federal benefits advantage assessment
 * 4. Retirement Impact Tier - Long-horizon retirement leverage assessment
 *
 * DESIGN PRINCIPLES:
 * - Transparent, explainable rules (no black box)
 * - Coarse v1 estimates with clear disclaimers
 * - Safe inputs only (no sensitive document parsing)
 * - OPSEC-safe: no uploads, no external data collection
 *
 * @version v1 - Day 10 Implementation
 * ============================================================================
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Input shape for computing Career Outlook signals.
 * 
 * WHY THIS SHAPE:
 * - Uses only data already available from job listings
 * - No sensitive personal information required
 * - All fields are optional to handle partial data gracefully
 *
 * @example
 * const input: JobSeekerIntelligenceInput = {
 *   jobTitle: 'Management Analyst',
 *   location: 'Washington, DC',
 *   salaryMin: 100000,
 *   salaryMax: 130000,
 *   grade: 'GS-13',
 *   series: '0343',
 *   isRemote: false,
 * };
 */
export type JobSeekerIntelligenceInput = {
  // Job identification
  jobTitle: string;
  
  // Location information - used for locality power calculation
  location: string;
  
  // Salary range - used for locality power and benefit calculations
  salaryMin: number;
  salaryMax: number;
  
  // Grade band - used for trajectory and retirement calculations
  // Format: 'GS-12', 'GS-13', 'GS-14', 'GS-15', etc.
  grade: string;
  
  // Occupational series - used for trajectory assessment
  // Format: '0343', '2210', etc.
  series: string;
  
  // Work arrangement - affects locality calculations
  isRemote: boolean;
  
  // Optional: telework arrangement details
  telework: string;
  
  // Optional: agency name for context
  agency: string;
};

/**
 * Rating levels used across multiple signals.
 * Provides consistent, user-friendly labels.
 */
export type SignalRating = 'Strong' | 'Moderate' | 'Limited' | 'Minimal';

/**
 * Impact tier for retirement signal.
 */
export type RetirementImpactTier = 'High' | 'Medium' | 'Low';

/**
 * Locality Power Score output.
 * 
 * WHY THIS SIGNAL:
 * Federal salaries include locality pay adjustments, but true purchasing
 * power varies by cost of living. This signal helps job seekers understand
 * their real buying power in different locations.
 *
 * V1 LIMITATIONS:
 * - Uses coarse regional proxies, not actual COL data
 * - Does not account for individual spending patterns
 * - Remote work scenarios use national average assumptions
 */
export type LocalityPowerSignal = {
  // Score from 0-100, higher = better purchasing power
  score: number;
  
  // Human-readable label
  label: string;
  
  // 1-2 sentence explanations
  explanations: string[];
  
  // Disclosure about estimation method
  methodNote: string;
};

/**
 * Career Trajectory Preview output.
 * 
 * WHY THIS SIGNAL:
 * Federal careers have predictable ladder patterns based on grade bands
 * and series. This helps job seekers understand their promotion runway.
 *
 * V1 LIMITATIONS:
 * - Based on typical GS ladder patterns, not agency-specific data
 * - Does not account for competitive positions or SES track
 * - Assumes standard career progression timelines
 */
export type TrajectorySignal = {
  // Primary rating
  rating: SignalRating;
  
  // 1-2 bullet explanations
  explanations: string[];
  
  // Years estimate for next promotion (approximate)
  yearsToNextPromotion: string;
  
  // Disclosure about estimation method
  methodNote: string;
};

/**
 * Benefit Value Signal output.
 * 
 * WHY THIS SIGNAL:
 * Federal benefits (FEHB, FERS, TSP match, leave) add significant value
 * beyond base salary. This helps job seekers understand the total package.
 *
 * V1 LIMITATIONS:
 * - Does not compare specific FEHB plans
 * - Uses average benefit values, not personalized
 * - Does not account for dependents or health conditions
 */
export type BenefitsSignal = {
  // Primary rating
  rating: SignalRating;
  
  // 1-2 bullet explanations
  explanations: string[];
  
  // Estimated annual benefit value added (approximate)
  estimatedAnnualValue: string;
  
  // Disclosure about estimation method
  methodNote: string;
};

/**
 * Retirement Impact Tier output.
 * 
 * WHY THIS SIGNAL:
 * Federal FERS pension and TSP matching provide long-horizon retirement
 * leverage that compounds over time. This helps job seekers understand
 * the retirement implications of federal vs private sector.
 *
 * V1 LIMITATIONS:
 * - Does not perform actuarial calculations
 * - Uses typical career duration assumptions
 * - Does not account for prior service or buyback options
 */
export type RetirementSignal = {
  // Primary tier
  tier: RetirementImpactTier;
  
  // 1-2 bullet explanations
  explanations: string[];
  
  // Disclosure about estimation method
  methodNote: string;
};

/**
 * Complete Career Outlook output combining all four signals.
 * This is the main return type from computeJobSeekerOutlook.
 */
export type CareerOutlookResult = {
  // The four primary signals
  localityPower: LocalityPowerSignal;
  trajectory: TrajectorySignal;
  benefitsSignal: BenefitsSignal;
  retirementTier: RetirementSignal;
  
  // Overall summary for quick display
  overallSummary: string;
  
  // Timestamp of computation for caching purposes
  computedAt: number;
};

// ============================================================================
// CONSTANTS AND LOOKUP TABLES
// ============================================================================

/**
 * Cost of Living adjustment factors by region.
 * 
 * METHODOLOGY (v1 Estimate):
 * These are coarse regional proxies based on general cost of living patterns.
 * A factor of 1.0 represents the national average.
 * - Higher factor = higher cost of living = lower purchasing power
 * - Lower factor = lower cost of living = higher purchasing power
 *
 * FUTURE IMPROVEMENT:
 * Replace with actual COL indices from Bureau of Labor Statistics or
 * similar authoritative sources when backend integration is available.
 */
const COST_OF_LIVING_FACTORS: Record<string, number> = {
  // High cost areas (factor > 1.2)
  'washington, dc': 1.35,
  'dc': 1.35,
  'new york': 1.45,
  'ny': 1.45,
  'san francisco': 1.50,
  'sf': 1.50,
  'bay area': 1.50,
  'los angeles': 1.40,
  'la': 1.40,
  'seattle': 1.35,
  'boston': 1.35,
  'hawaii': 1.40,
  'hi': 1.40,
  
  // Moderate cost areas (factor 1.0-1.2)
  'denver': 1.20,
  'colorado': 1.15,
  'co': 1.15,
  'chicago': 1.15,
  'atlanta': 1.10,
  'ga': 1.05,
  'phoenix': 1.10,
  'az': 1.05,
  'philadelphia': 1.15,
  'pa': 1.05,
  'virginia': 1.20,
  'va': 1.20,
  'maryland': 1.20,
  'md': 1.20,
  
  // Lower cost areas (factor < 1.0)
  'texas': 0.95,
  'tx': 0.95,
  'dallas': 1.00,
  'houston': 0.98,
  'san antonio': 0.90,
  'austin': 1.05,
  'ohio': 0.88,
  'oh': 0.88,
  'michigan': 0.90,
  'mi': 0.90,
  'florida': 1.00,
  'fl': 1.00,
  'alabama': 0.85,
  'al': 0.85,
  'tennessee': 0.90,
  'tn': 0.90,
  'kentucky': 0.85,
  'ky': 0.85,
  'oklahoma': 0.85,
  'ok': 0.85,
  'kansas': 0.85,
  'ks': 0.85,
  'nebraska': 0.88,
  'ne': 0.88,
  'iowa': 0.88,
  'ia': 0.88,
  'missouri': 0.88,
  'mo': 0.88,
  'arkansas': 0.82,
  'ar': 0.82,
  'mississippi': 0.82,
  'ms': 0.82,
  'louisiana': 0.88,
  // Note: 'la' already defined above for Los Angeles - Louisiana uses 'louisiana' key
  'west virginia': 0.82,
  'wv': 0.82,
  'north carolina': 0.95,
  'nc': 0.95,
  'south carolina': 0.92,
  'sc': 0.92,
  
  // Remote work - use moderate national average assumption
  'remote': 1.00,
  'telework': 1.00,
  'anywhere': 1.00,
  
  // Default fallback
  'default': 1.00,
};

/**
 * GS Grade numeric extraction helper.
 * Extracts the numeric grade from strings like 'GS-13', 'GS-14/15', etc.
 *
 * @param grade - Grade string (e.g., 'GS-13', 'GS-14')
 * @returns Numeric grade or 0 if not parseable
 *
 * @example
 * extractGradeNumber('GS-13') // returns 13
 * extractGradeNumber('GS-14/15') // returns 14 (takes first)
 */
function extractGradeNumber(grade: string): number {
  // Handle null/undefined/empty gracefully
  if (!grade) {
    return 0;
  }
  
  // Normalize input - convert to lowercase and trim
  const normalized = grade.toLowerCase().trim();
  
  // Try to extract number after 'gs-' or just find first number
  // Pattern: 'gs-13', 'gs13', '13', 'gs-14/15', etc.
  
  // First try: look for 'gs-' followed by number
  const gsMatch = normalized.match(/gs-?(\d+)/);
  if (gsMatch && gsMatch[1]) {
    return parseInt(gsMatch[1], 10);
  }
  
  // Second try: just find the first number in the string
  const numMatch = normalized.match(/(\d+)/);
  if (numMatch && numMatch[1]) {
    return parseInt(numMatch[1], 10);
  }
  
  return 0;
}

/**
 * Career ladder progression patterns by grade band.
 * 
 * METHODOLOGY (v1 Estimate):
 * Based on typical GS career progression patterns:
 * - GS-5 to GS-7: Entry level, typically 1-year progression
 * - GS-7 to GS-9: Journey level progression
 * - GS-9 to GS-11: Career ladder completion
 * - GS-11 to GS-12: Full performance level
 * - GS-12 to GS-13: Competitive/merit promotion
 * - GS-13 to GS-14: Senior specialist/supervisor
 * - GS-14 to GS-15: Senior management/expert
 * - GS-15 and above: Executive track (SES consideration)
 */
const GRADE_PROGRESSION_DATA: Record<number, { runway: SignalRating; years: string; notes: string }> = {
  5: { runway: 'Strong', years: '1-2', notes: 'Entry-level with typical 5/7/9/11/12 ladder' },
  6: { runway: 'Strong', years: '1-2', notes: 'Entry-level with clear progression path' },
  7: { runway: 'Strong', years: '1-2', notes: 'Early career with multiple promotion opportunities' },
  8: { runway: 'Strong', years: '1-2', notes: 'Technician track with progression options' },
  9: { runway: 'Strong', years: '1-2', notes: 'Journey level with ladder progression' },
  10: { runway: 'Moderate', years: '1-2', notes: 'Technical track, may require competition' },
  11: { runway: 'Moderate', years: '1-3', notes: 'Full performance, competitive promotion ahead' },
  12: { runway: 'Moderate', years: '2-4', notes: 'Senior journey, competitive promotion to GS-13' },
  13: { runway: 'Moderate', years: '3-5', notes: 'Senior specialist, promotion requires competition' },
  14: { runway: 'Limited', years: '4-6', notes: 'Senior management, limited GS-15 positions' },
  15: { runway: 'Limited', years: 'N/A', notes: 'Top of GS scale, SES track consideration' },
};

// ============================================================================
// CORE COMPUTATION FUNCTIONS
// ============================================================================

/**
 * Computes the Locality Power Score.
 *
 * PURPOSE:
 * Estimates the purchasing power of a federal salary based on location.
 * Helps job seekers understand that a $120K salary in DC buys less
 * than a $100K salary in Texas.
 *
 * ALGORITHM:
 * 1. Extract midpoint salary from min/max
 * 2. Look up cost of living factor for location
 * 3. Calculate adjusted salary = midpoint / COL factor
 * 4. Score = normalized comparison to national average
 *
 * @param input - Job data including location and salary range
 * @returns LocalityPowerSignal with score, label, and explanations
 *
 * @example
 * const signal = computeLocalityPower({
 *   location: 'Washington, DC',
 *   salaryMin: 100000,
 *   salaryMax: 130000,
 *   isRemote: false,
 * });
 * // Returns: { score: 68, label: 'Moderate', ... }
 */
function computeLocalityPower(input: Partial<JobSeekerIntelligenceInput>): LocalityPowerSignal {
  // Step 1: Extract salary midpoint
  // Default to 0 if not provided
  const salaryMin = input.salaryMin || 0;
  const salaryMax = input.salaryMax || 0;
  const salaryMidpoint = (salaryMin + salaryMax) / 2;
  
  // Step 2: Determine cost of living factor
  // Normalize location to lowercase for lookup
  const locationRaw = input.location || '';
  const locationKey = locationRaw.toLowerCase().trim();
  
  // Handle remote work specially - assume they can live anywhere
  // and use national average cost of living
  let colFactor = COST_OF_LIVING_FACTORS['default'];
  
  if (input.isRemote) {
    // Remote workers get the benefit of choosing lower COL areas
    // We use a slightly favorable factor (0.95) to reflect this advantage
    colFactor = 0.95;
  } else {
    // Try to find matching location in our lookup table
    // Check for exact match first, then partial matches
    const keys = Object.keys(COST_OF_LIVING_FACTORS);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (locationKey.indexOf(key) !== -1 || key.indexOf(locationKey) !== -1) {
        colFactor = COST_OF_LIVING_FACTORS[key];
        break;
      }
    }
  }
  
  // Step 3: Calculate adjusted purchasing power
  // A $100K salary in a 1.3 COL area has purchasing power of ~$77K
  const adjustedSalary = salaryMidpoint / colFactor;
  
  // Step 4: Calculate score (0-100)
  // Score is based on how the adjusted salary compares to national benchmarks
  // We use a scaling factor based on typical federal salary ranges
  // $60K adjusted = 40 points, $120K adjusted = 85 points
  let score = 0;
  if (adjustedSalary > 0) {
    // Linear scaling: each $1K of adjusted salary adds ~0.5 points
    // Base of 20 points minimum, max of 100
    score = Math.min(100, Math.max(0, Math.round(20 + (adjustedSalary / 1500))));
  }
  
  // Step 5: Determine label based on score
  let label = 'Needs Review';
  if (score >= 75) {
    label = 'Strong';
  } else if (score >= 55) {
    label = 'Good';
  } else if (score >= 35) {
    label = 'Moderate';
  } else {
    label = 'Limited';
  }
  
  // Step 6: Generate explanations
  const explanations: string[] = [];
  
  if (input.isRemote) {
    explanations.push('Remote position offers flexibility to live in lower-cost areas.');
  } else if (colFactor > 1.2) {
    explanations.push('High cost-of-living area reduces purchasing power.');
  } else if (colFactor < 0.95) {
    explanations.push('Lower cost-of-living area increases purchasing power.');
  } else {
    explanations.push('Average cost-of-living area for this salary level.');
  }
  
  if (salaryMidpoint > 100000) {
    explanations.push('Salary is competitive for the federal pay scale.');
  } else if (salaryMidpoint > 70000) {
    explanations.push('Salary is in the mid-range for federal positions.');
  } else {
    explanations.push('Entry-level salary with growth potential through promotions.');
  }
  
  return {
    score: score,
    label: label,
    explanations: explanations,
    methodNote: 'v1 estimate using regional cost-of-living proxies. Actual purchasing power varies by individual circumstances.',
  };
}

/**
 * Computes the Career Trajectory Preview.
 *
 * PURPOSE:
 * Assesses the promotion runway based on current grade level and
 * typical federal career ladder patterns.
 *
 * ALGORITHM:
 * 1. Extract numeric grade from input
 * 2. Look up progression data for that grade
 * 3. Return runway rating with appropriate context
 *
 * @param input - Job data including grade
 * @returns TrajectorySignal with rating and explanations
 *
 * @example
 * const signal = computeTrajectory({ grade: 'GS-12' });
 * // Returns: { rating: 'Moderate', yearsToNextPromotion: '2-4', ... }
 */
function computeTrajectory(input: Partial<JobSeekerIntelligenceInput>): TrajectorySignal {
  // Step 1: Extract grade number
  const gradeNum = extractGradeNumber(input.grade || '');
  
  // Step 2: Look up progression data
  // Default to GS-12 assumptions if grade not recognized
  const progression = GRADE_PROGRESSION_DATA[gradeNum] || GRADE_PROGRESSION_DATA[12];
  
  // Step 3: Generate explanations based on grade level
  const explanations: string[] = [];
  
  if (gradeNum <= 9) {
    explanations.push('Entry to journey level with structured career ladder progression.');
    explanations.push('Time-in-grade promotions typically available with satisfactory performance.');
  } else if (gradeNum <= 12) {
    explanations.push('Mid-career level with competitive promotion opportunities.');
    explanations.push('Advancement typically requires demonstrating specialized experience.');
  } else if (gradeNum <= 14) {
    explanations.push('Senior level with fewer but significant advancement opportunities.');
    explanations.push('Leadership or deep technical expertise typically required for promotion.');
  } else {
    explanations.push('Top of the GS pay scale with strong earning potential.');
    explanations.push('SES (Senior Executive Service) track may be considered for further advancement.');
  }
  
  return {
    rating: progression.runway,
    explanations: explanations,
    yearsToNextPromotion: progression.years,
    methodNote: 'v1 estimate based on typical GS ladder patterns. Actual progression depends on agency, position, and performance.',
  };
}

/**
 * Computes the Benefit Value Signal.
 *
 * PURPOSE:
 * Estimates the value of federal benefits package including health
 * insurance (FEHB), retirement (FERS), TSP matching, and leave.
 *
 * ALGORITHM:
 * 1. Calculate TSP match value (up to 5% of salary)
 * 2. Estimate FEHB employer contribution value
 * 3. Calculate FERS pension accrual value
 * 4. Add leave value (annual + sick)
 * 5. Sum and rate as Strong/Moderate/Minimal
 *
 * KEY ASSUMPTIONS:
 * - TSP: Assumes 5% contribution to get full 5% match
 * - FEHB: Uses ~$6,000/year employer contribution average
 * - FERS: Assumes ~1% per year pension accrual
 * - Leave: 13-26 days annual + 13 days sick per year
 *
 * @param input - Job data including salary range
 * @returns BenefitsSignal with rating and value estimate
 *
 * @example
 * const signal = computeBenefits({ salaryMin: 100000, salaryMax: 130000 });
 * // Returns: { rating: 'Strong', estimatedAnnualValue: '~$35K', ... }
 */
function computeBenefits(input: Partial<JobSeekerIntelligenceInput>): BenefitsSignal {
  // Step 1: Calculate salary midpoint
  const salaryMin = input.salaryMin || 0;
  const salaryMax = input.salaryMax || 0;
  const salaryMidpoint = (salaryMin + salaryMax) / 2;
  
  // Step 2: Calculate TSP match value
  // Federal employees get automatic 1% + up to 4% match = 5% total
  const tspMatchValue = salaryMidpoint * 0.05;
  
  // Step 3: Estimate FEHB employer contribution
  // On average, federal government pays ~72% of premium
  // Average premium for self+family ~$17K/year, so employer pays ~$12K
  // For self-only ~$7K/year, employer pays ~$5K
  // We use an average estimate of $8,000
  const fehbValue = 8000;
  
  // Step 4: Estimate FERS pension accrual
  // FERS pension = 1% (or 1.1% if 20+ years) × high-3 × years
  // Per year, this is roughly 1% of salary added to future pension value
  // Present value of this is complex, but we estimate ~3-5% of salary
  const fersAnnualValue = salaryMidpoint * 0.04;
  
  // Step 5: Calculate leave value
  // Annual leave: 13-26 days based on years of service (use 19 average)
  // Sick leave: 13 days per year
  // Total: ~32 days × (daily rate = salary / 260 work days)
  const dailyRate = salaryMidpoint / 260;
  const leaveValue = dailyRate * 32;
  
  // Step 6: Sum total benefit value
  const totalBenefitValue = tspMatchValue + fehbValue + fersAnnualValue + leaveValue;
  
  // Step 7: Calculate benefit as percentage of salary
  const benefitPercentage = salaryMidpoint > 0 ? (totalBenefitValue / salaryMidpoint) * 100 : 0;
  
  // Step 8: Determine rating
  // Federal benefits typically add 30-40% on top of salary
  // This is significantly higher than most private sector
  let rating: SignalRating = 'Moderate';
  if (benefitPercentage >= 35) {
    rating = 'Strong';
  } else if (benefitPercentage >= 25) {
    rating = 'Moderate';
  } else {
    rating = 'Minimal';
  }
  
  // Step 9: Generate explanations
  const explanations: string[] = [];
  
  explanations.push('Federal benefits include FEHB health insurance, FERS pension, and TSP matching.');
  
  if (tspMatchValue > 5000) {
    explanations.push('TSP 5% match adds significant value to retirement savings.');
  } else {
    explanations.push('TSP matching provides employer retirement contributions up to 5% of salary.');
  }
  
  // Step 10: Format value for display
  const valueInK = Math.round(totalBenefitValue / 1000);
  const estimatedAnnualValue = '~$' + valueInK + 'K';
  
  return {
    rating: rating,
    explanations: explanations,
    estimatedAnnualValue: estimatedAnnualValue,
    methodNote: 'v1 estimate using average benefit values. Actual value depends on plan selections and family status.',
  };
}

/**
 * Computes the Retirement Impact Tier.
 *
 * PURPOSE:
 * Assesses the long-horizon retirement leverage of federal service
 * compared to typical private sector employment.
 *
 * ALGORITHM:
 * 1. Consider grade level (higher grades = more retirement leverage)
 * 2. Consider years of potential service (lower grades have more runway)
 * 3. Rate as High/Medium/Low based on combined factors
 *
 * KEY FACTORS:
 * - FERS pension provides guaranteed income in retirement
 * - Social Security provides base coverage (unlike some state plans)
 * - TSP with matching amplifies retirement savings
 * - Time in service matters for pension multiplier
 *
 * @param input - Job data including grade
 * @returns RetirementSignal with tier and explanations
 *
 * @example
 * const signal = computeRetirement({ grade: 'GS-13' });
 * // Returns: { tier: 'High', ... }
 */
function computeRetirement(input: Partial<JobSeekerIntelligenceInput>): RetirementSignal {
  // Step 1: Extract grade number
  const gradeNum = extractGradeNumber(input.grade || '');
  
  // Step 2: Assess retirement impact tier
  // Higher grades = higher salary = higher pension base
  // Lower grades = more time to accumulate years of service
  // Middle grades often have best balance
  
  let tier: RetirementImpactTier = 'Medium';
  const explanations: string[] = [];
  
  if (gradeNum >= 13) {
    // High grades: Strong pension base, but may have fewer years ahead
    tier = 'High';
    explanations.push('Higher salary grade contributes to a stronger pension base (high-3 average).');
    explanations.push('FERS pension combined with TSP provides substantial retirement income.');
  } else if (gradeNum >= 9) {
    // Mid grades: Good balance of salary and years of potential service
    tier = 'High';
    explanations.push('Mid-career entry allows significant years of service for pension accrual.');
    explanations.push('Federal retirement benefits compound significantly over a 20+ year career.');
  } else if (gradeNum >= 5) {
    // Entry grades: Long runway for service years, but lower starting salary
    tier = 'Medium';
    explanations.push('Entry-level position with potential for decades of service credit.');
    explanations.push('Early career federal service maximizes long-term pension value.');
  } else {
    // Unknown or very low grade
    tier = 'Medium';
    explanations.push('Federal FERS pension provides guaranteed retirement income.');
    explanations.push('TSP matching and Social Security provide additional retirement security.');
  }
  
  return {
    tier: tier,
    explanations: explanations,
    methodNote: 'v1 coarse estimate. Actual retirement impact depends on years of service, age at retirement, and individual financial situation.',
  };
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Computes all four Career Outlook signals for a job opportunity.
 *
 * PURPOSE:
 * This is the main entry point for the Job Seeker Intelligence Layer.
 * It takes job data and returns a complete Career Outlook assessment.
 *
 * HOW TO USE:
 * 1. Extract job data from job listing or search result
 * 2. Call this function with the data
 * 3. Display the results in the Career Outlook panel
 *
 * PRIVACY NOTES:
 * - This function uses only job listing data (no personal information)
 * - No network calls are made
 * - No data is stored or transmitted
 *
 * @param input - Job data for analysis
 * @returns Complete CareerOutlookResult with all four signals
 *
 * @example
 * const result = computeJobSeekerOutlook({
 *   jobTitle: 'Management Analyst',
 *   location: 'Washington, DC',
 *   salaryMin: 100000,
 *   salaryMax: 130000,
 *   grade: 'GS-13',
 *   series: '0343',
 *   isRemote: false,
 *   telework: 'Hybrid',
 *   agency: 'Department of Defense',
 * });
 *
 * // Use in UI:
 * <CareerOutlookPanel outlook={result} />
 */
export function computeJobSeekerOutlook(
  input: Partial<JobSeekerIntelligenceInput>
): CareerOutlookResult {
  // Step 1: Compute each individual signal
  const localityPower = computeLocalityPower(input);
  const trajectory = computeTrajectory(input);
  const benefitsSignal = computeBenefits(input);
  const retirementTier = computeRetirement(input);
  
  // Step 2: Generate overall summary
  // This provides a quick one-liner for users who want the gist
  let overallSummary = '';
  
  // Count "positive" signals
  let positiveCount = 0;
  if (localityPower.score >= 60) positiveCount++;
  if (trajectory.rating === 'Strong' || trajectory.rating === 'Moderate') positiveCount++;
  if (benefitsSignal.rating === 'Strong') positiveCount++;
  if (retirementTier.tier === 'High') positiveCount++;
  
  if (positiveCount >= 3) {
    overallSummary = 'This position offers a strong overall career outlook with competitive compensation and benefits.';
  } else if (positiveCount >= 2) {
    overallSummary = 'This position offers a solid career opportunity with notable federal benefits.';
  } else {
    overallSummary = 'This position provides entry into federal service with standard benefits and growth potential.';
  }
  
  // Step 3: Return complete result
  return {
    localityPower: localityPower,
    trajectory: trajectory,
    benefitsSignal: benefitsSignal,
    retirementTier: retirementTier,
    overallSummary: overallSummary,
    computedAt: Date.now(),
  };
}

/**
 * Helper function to create a default/empty Career Outlook result.
 * Used when job data is not available or incomplete.
 *
 * @returns CareerOutlookResult with empty/default values
 */
export function createEmptyOutlook(): CareerOutlookResult {
  return {
    localityPower: {
      score: 0,
      label: 'Unknown',
      explanations: ['Insufficient data to calculate purchasing power.'],
      methodNote: 'No salary or location data provided.',
    },
    trajectory: {
      rating: 'Moderate',
      explanations: ['Standard federal career ladder applies.'],
      yearsToNextPromotion: 'Varies',
      methodNote: 'No grade information provided.',
    },
    benefitsSignal: {
      rating: 'Strong',
      explanations: ['Federal benefits typically add 30-40% to base salary.'],
      estimatedAnnualValue: 'Varies',
      methodNote: 'Default federal benefits estimate.',
    },
    retirementTier: {
      tier: 'Medium',
      explanations: ['Federal FERS pension provides retirement security.'],
      methodNote: 'Default retirement assessment.',
    },
    overallSummary: 'Federal positions offer competitive benefits and retirement security.',
    computedAt: Date.now(),
  };
}
