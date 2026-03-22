/**
 * ============================================================================
 * INTELLIGENCE MODULE - INDEX
 * ============================================================================
 *
 * FILE PURPOSE:
 * Central export point for the PathOS Intelligence Layer modules.
 * Currently includes the Job Seeker Intelligence Layer (Day 10 feature).
 *
 * HOW TO IMPORT:
 * Instead of:
 *   import { computeJobSeekerOutlook } from '@/lib/intelligence/jobseeker-intelligence';
 *
 * You can use:
 *   import { computeJobSeekerOutlook } from '@/lib/intelligence';
 *
 * MODULES INCLUDED:
 * - jobseeker-intelligence: Career Outlook signals for job seekers
 *
 * @version v1 - Day 10 Implementation
 * ============================================================================
 */

// Re-export all types and functions from the jobseeker-intelligence module
export {
  // Main computation function
  computeJobSeekerOutlook,
  
  // Helper function for empty/default state
  createEmptyOutlook,
  
  // Types for the input
  type JobSeekerIntelligenceInput,
  
  // Types for the output signals
  type CareerOutlookResult,
  type LocalityPowerSignal,
  type TrajectorySignal,
  type BenefitsSignal,
  type RetirementSignal,
  
  // Common types
  type SignalRating,
  type RetirementImpactTier,
} from './jobseeker-intelligence';
