/**
 * ============================================================================
 * JOB SEEKER INTELLIGENCE COMPONENTS - INDEX
 * ============================================================================
 *
 * FILE PURPOSE:
 * Central export point for the Job Seeker Intelligence Layer UI components.
 * Part of Day 10 feature implementation.
 *
 * HOW TO IMPORT:
 * Instead of:
 *   import { CareerOutlookPanel } from '@/components/jobseeker-intelligence/career-outlook-panel';
 *
 * You can use:
 *   import { CareerOutlookPanel, CareerOutlookCompact } from '@/components/jobseeker-intelligence';
 *
 * COMPONENTS INCLUDED:
 * - CareerOutlookPanel: Full panel for Job Details slide-over
 * - CareerOutlookCompact: Compact strip/grid for Job Search and Resume Builder
 *
 * @version v1 - Day 10 Implementation
 * ============================================================================
 */

// Full Career Outlook panel component
export { CareerOutlookPanel } from './career-outlook-panel';
export type { CareerOutlookPanelProps } from './career-outlook-panel';

// Compact Career Outlook component (strip/grid variants)
export { CareerOutlookCompact } from './career-outlook-compact';
export type { CareerOutlookCompactProps, CompactVariant } from './career-outlook-compact';
