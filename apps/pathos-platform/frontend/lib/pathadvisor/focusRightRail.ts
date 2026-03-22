/**
 * ============================================================================
 * FOCUS MODE RIGHT RAIL VIEW MODEL BUILDER (Day 43)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Builds anchor-aware right rail view models for PathAdvisor Focus Mode.
 * When a user asks from a specific context (job, resume, benefits, etc.),
 * the right rail must display context-relevant information instead of
 * generic Profile/Key Metrics cards.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - View Model Layer: Transforms anchor + store data into display-ready models
 * - Used by: path-advisor-focus-mode.tsx (right rail section)
 * - Data Sources: activeAnchor from pathAdvisorStore, context from other stores
 *
 * WHY THIS FILE EXISTS:
 * Day 43 UX contract requires Focus Mode to be anchor-aware. The right rail
 * must become anchor-scoped, showing relevant context based on where the user
 * initiated the Ask action. This file centralizes the logic for building
 * display-ready view models from anchor data and store lookups.
 *
 * KEY CONCEPTS:
 * - Anchor-First: The activeAnchor drives what the right rail shows
 * - Graceful Fallback: If store lookup fails, show anchor summary as context
 * - Source-Scoped: Different sources (job/resume/benefits) show different data
 * - View Model Pattern: Transforms raw data into display-ready format
 *
 * HOW IT WORKS (STEP BY STEP):
 * 1. Focus Mode reads activeAnchor from pathAdvisorStore
 * 2. Focus Mode calls buildFocusRightRailModel(activeAnchor, dependencies)
 * 3. This function checks anchor.source and builds appropriate model
 * 4. If sourceId exists, attempts to lookup additional context from stores
 * 5. Returns a FocusRightRailModel with title, rows, and optional CTAs
 * 6. Focus Mode renders the model as a single "Anchor Context" card
 *
 * DAY 43 REQUIREMENT:
 * "Focus Mode must be anchor-aware and render an anchor summary (not full
 * dashboard). The right rail must become anchor-scoped (or hidden) based
 * on activeAnchor.source."
 *
 * This file implements that requirement by:
 * - Building source-specific context models
 * - Always showing sourceLabel + summary from anchor
 * - Attempting store lookups when sourceId is available
 * - Providing clean fallbacks when lookup data isn't available
 *
 * @version Day 43 - Anchor Focus Architecture
 * ============================================================================
 */

import type { PathAdvisorAnchor, PathAdvisorAnchorSource } from './anchors';
import type { JobDetailModel } from '@/lib/jobs';
import type { ScenarioState } from '@/store/benefitsWorkspaceStore';

/**
 * A single row in the right rail context card.
 *
 * PURPOSE:
 * Represents a label/value pair for display in the context card.
 * Examples: "Grade: GS-14", "Salary: $142,500", "Coverage: Self + Family"
 */
export interface FocusRightRailRow {
  /** Label for the row (displayed on left) */
  label: string;
  /** Value for the row (displayed on right) */
  value: string;
  /** Optional: Is this value sensitive (should respect privacy mode)? */
  isSensitive?: boolean;
}

/**
 * The complete view model for the Focus Mode right rail.
 *
 * PURPOSE:
 * Provides all data needed to render the anchor context card in Focus Mode.
 * Built by buildFocusRightRailModel() based on activeAnchor and store data.
 *
 * DESIGN DECISIONS:
 * - title: Always present, describes the context type ("Job Context", etc.)
 * - subtitle: Optional, usually the sourceLabel from anchor
 * - summary: Optional, the anchor.summary (reason for asking)
 * - rows: Array of label/value pairs for context details
 * - ctas: Optional call-to-action strings (future use)
 */
export interface FocusRightRailModel {
  /** Card title (e.g., "Job Context", "Benefits Context") */
  title: string;
  /** Optional subtitle (usually anchor.sourceLabel) */
  subtitle?: string;
  /** Optional summary (anchor.summary - reason for asking) */
  summary?: string;
  /** Array of label/value rows for context details */
  rows: FocusRightRailRow[];
  /** Optional call-to-action strings (future use) */
  ctas?: string[];
  /** Source type for icon selection */
  source: PathAdvisorAnchorSource;
}

/**
 * Dependencies object for building right rail models.
 *
 * PURPOSE:
 * Encapsulates all external data sources that buildFocusRightRailModel
 * might need. This keeps the function pure (given inputs, outputs are
 * deterministic) and makes testing easier.
 *
 * WHY NOT IMPORT STORES DIRECTLY:
 * - Keeps this file as a pure utility (no React hooks)
 * - Allows Focus Mode component to pass in current store snapshots
 * - Makes it testable without mocking Zustand stores
 *
 * FIELDS:
 * - selectedJob: Currently selected job from jobSearchStore (for 'job' source)
 * - benefitsScenario: Active scenario from benefitsWorkspaceStore (for 'benefits')
 * - profile: User profile data (for 'dashboard' and general context)
 * - resume: Active resume/tailoring context (for 'resume' source)
 * - dashboardMetrics: Key metrics from dashboardStore (for 'dashboard')
 */
export interface FocusRightRailDependencies {
  /** Selected job from jobSearchStore (nullable) */
  selectedJob?: JobDetailModel | null;
  /** Active benefits scenario (nullable) */
  benefitsScenario?: ScenarioState | null;
  /** User profile summary (nullable) */
  profile?: {
    persona: 'fed_employee' | 'job_seeker';
    targetGrade?: string;
    location?: string;
  } | null;
  /** Resume context (nullable) */
  resume?: {
    activeTargetJobTitle?: string;
    isTailoringMode?: boolean;
  } | null;
  /** Dashboard metrics (nullable) */
  dashboardMetrics?: {
    totalComp?: number;
    tspBalance?: number;
  } | null;
}

/**
 * Formats a number as currency (USD).
 *
 * @param value - The number to format
 * @returns Formatted string like "$142,500"
 */
function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * Builds a right rail model for 'job' source anchors.
 *
 * PURPOSE:
 * When user asks from a job context (job details slideover, job card),
 * show job-specific context in the right rail.
 *
 * DATA SOURCES:
 * - anchor.sourceLabel: Job title (always available)
 * - anchor.summary: Reason for asking (always available)
 * - anchor.sourceId: Job ID (may be used for lookup)
 * - dependencies.selectedJob: Full job details (if available)
 *
 * BEHAVIOR:
 * - If selectedJob exists and matches sourceId, show full job details
 * - Otherwise, show anchor data with "details not available" fallback
 *
 * @param anchor - The active PathAdvisorAnchor
 * @param deps - Dependencies with optional selectedJob
 * @returns FocusRightRailModel for job context
 */
function buildJobModel(
  anchor: PathAdvisorAnchor,
  deps: FocusRightRailDependencies
): FocusRightRailModel {
  const rows: FocusRightRailRow[] = [];

  // Check if we have a matching selected job
  const job = deps.selectedJob;
  const hasMatchingJob = job && anchor.sourceId && job.id === anchor.sourceId;

  if (hasMatchingJob && job) {
    // Full job context available from store
    if (job.gradeLevel) {
      rows.push({ label: 'Grade', value: job.gradeLevel });
    }
    if (job.organizationName) {
      rows.push({ label: 'Agency', value: job.organizationName });
    }
    if (job.locationDisplay) {
      rows.push({ label: 'Location', value: job.locationDisplay });
    }
    if (job.seriesCode) {
      rows.push({ label: 'Series', value: job.seriesCode });
    }
    if (job.estimatedTotalComp) {
      rows.push({
        label: 'Est. Total Comp',
        value: formatCurrency(job.estimatedTotalComp),
        isSensitive: true,
      });
    }
    if (job.employmentType) {
      rows.push({ label: 'Type', value: job.employmentType });
    }
  } else {
    // No matching job in store - show anchor-only data with fallback
    rows.push({
      label: 'Context',
      value: 'Details from job listing',
    });
    rows.push({
      label: 'Lookup',
      value: 'Full details available in Job Search',
    });
  }

  return {
    title: 'Job Context',
    subtitle: anchor.sourceLabel,
    summary: anchor.summary,
    rows: rows,
    source: 'job',
  };
}

/**
 * Builds a right rail model for 'resume' source anchors.
 *
 * PURPOSE:
 * When user asks from resume builder context, show resume-specific
 * context in the right rail.
 *
 * DATA SOURCES:
 * - anchor.sourceLabel: Resume section or target job (always available)
 * - anchor.summary: Reason for asking (always available)
 * - dependencies.resume: Active tailoring context (if available)
 *
 * @param anchor - The active PathAdvisorAnchor
 * @param deps - Dependencies with optional resume context
 * @returns FocusRightRailModel for resume context
 */
function buildResumeModel(
  anchor: PathAdvisorAnchor,
  deps: FocusRightRailDependencies
): FocusRightRailModel {
  const rows: FocusRightRailRow[] = [];

  const resume = deps.resume;

  if (resume) {
    if (resume.isTailoringMode) {
      rows.push({ label: 'Mode', value: 'Tailoring for specific job' });
    } else {
      rows.push({ label: 'Mode', value: 'Master resume' });
    }
    if (resume.activeTargetJobTitle) {
      rows.push({ label: 'Target Job', value: resume.activeTargetJobTitle });
    }
  } else {
    // No resume context - show anchor-only data
    rows.push({
      label: 'Context',
      value: 'Resume Builder workspace',
    });
  }

  return {
    title: 'Resume Context',
    subtitle: anchor.sourceLabel,
    summary: anchor.summary,
    rows: rows,
    source: 'resume',
  };
}

/**
 * Builds a right rail model for 'resume-review' source anchors.
 *
 * PURPOSE:
 * When user is in Resume Review mode (Day 43), show review-specific
 * context in the right rail. This is distinct from 'resume' source
 * to provide specialized guidance prompts and context during review.
 *
 * DAY 43 UX CONTRACT:
 * - Resume Review is a MODE, not a destination
 * - PathAdvisor provides guidance while user edits (not read-only analysis)
 * - Suggested improvements are optional and user-driven
 *
 * DATA SOURCES:
 * - anchor.sourceLabel: "Resume Review" (always available)
 * - anchor.summary: Review context description (always available)
 * - dependencies.resume: Active tailoring context (if available)
 *
 * @param anchor - The active PathAdvisorAnchor
 * @param deps - Dependencies with optional resume context
 * @returns FocusRightRailModel for resume review context
 */
function buildResumeReviewModel(
  anchor: PathAdvisorAnchor,
  deps: FocusRightRailDependencies
): FocusRightRailModel {
  const rows: FocusRightRailRow[] = [];

  const resume = deps.resume;

  // Always show review mode indicator
  rows.push({
    label: 'Mode',
    value: 'Live Editing Enabled',
  });

  if (resume) {
    if (resume.isTailoringMode && resume.activeTargetJobTitle) {
      rows.push({ label: 'Target Job', value: resume.activeTargetJobTitle });
    }
  }

  // Add guidance hint for resume review
  rows.push({
    label: 'Guidance',
    value: 'Focus on federal standards & alignment',
  });

  return {
    title: 'Resume Review',
    subtitle: anchor.sourceLabel,
    summary: anchor.summary,
    rows: rows,
    source: 'resume-review',
  };
}

/**
 * Builds a right rail model for 'benefits' source anchors.
 *
 * PURPOSE:
 * When user asks from benefits workspace context, show benefits-specific
 * context in the right rail.
 *
 * DATA SOURCES:
 * - anchor.sourceLabel: Benefits feature name (always available)
 * - anchor.summary: Reason for asking (always available)
 * - dependencies.benefitsScenario: Active scenario data (if available)
 *
 * @param anchor - The active PathAdvisorAnchor
 * @param deps - Dependencies with optional benefits scenario
 * @returns FocusRightRailModel for benefits context
 */
function buildBenefitsModel(
  anchor: PathAdvisorAnchor,
  deps: FocusRightRailDependencies
): FocusRightRailModel {
  const rows: FocusRightRailRow[] = [];

  const scenario = deps.benefitsScenario;

  if (scenario) {
    rows.push({
      label: 'Salary Assumption',
      value: formatCurrency(scenario.salary),
      isSensitive: true,
    });
    rows.push({ label: 'Coverage', value: scenario.coverage === 'self' ? 'Self Only' : scenario.coverage === 'self-plus-one' ? 'Self + One' : 'Family' });
    rows.push({ label: 'Tenure', value: scenario.tenure === 'short' ? '< 3 years' : scenario.tenure === 'medium' ? '3-10 years' : '10+ years' });
    if (scenario.mode === 'comparePrivate') {
      rows.push({ label: 'Mode', value: 'Comparing to private offer' });
    }
  } else {
    // No scenario context - show anchor-only data
    rows.push({
      label: 'Context',
      value: 'Benefits workspace',
    });
  }

  return {
    title: 'Benefits Context',
    subtitle: anchor.sourceLabel,
    summary: anchor.summary,
    rows: rows,
    source: 'benefits',
  };
}

/**
 * Builds a right rail model for 'import' source anchors.
 *
 * PURPOSE:
 * When user asks from document import context, show import-specific
 * context in the right rail.
 *
 * DATA SOURCES:
 * - anchor.sourceLabel: Document type or import feature (always available)
 * - anchor.summary: Reason for asking (always available)
 * - No store lookup implemented yet (anchor-only for Day 43)
 *
 * @param anchor - The active PathAdvisorAnchor
 * @param _deps - Dependencies (not used for import, reserved for future)
 * @returns FocusRightRailModel for import context
 */
function buildImportModel(
  anchor: PathAdvisorAnchor,
  _deps: FocusRightRailDependencies
): FocusRightRailModel {
  void _deps;
  const rows: FocusRightRailRow[] = [];

  // Import context is anchor-only for Day 43 (no store lookup yet)
  rows.push({
    label: 'Context',
    value: 'Document import triage',
  });
  rows.push({
    label: 'Status',
    value: 'Processing imported data',
  });

  return {
    title: 'Import Context',
    subtitle: anchor.sourceLabel,
    summary: anchor.summary,
    rows: rows,
    source: 'import',
  };
}

/**
 * Builds a right rail model for 'retirement' source anchors.
 *
 * PURPOSE:
 * When user asks from retirement calculator context, show retirement-specific
 * context in the right rail.
 *
 * DATA SOURCES:
 * - anchor.sourceLabel: Retirement feature name (always available)
 * - anchor.summary: Reason for asking (always available)
 * - No store lookup implemented yet (anchor-only for Day 43)
 *
 * @param anchor - The active PathAdvisorAnchor
 * @param _deps - Dependencies (not used for retirement, reserved for future)
 * @returns FocusRightRailModel for retirement context
 */
function buildRetirementModel(
  anchor: PathAdvisorAnchor,
  _deps: FocusRightRailDependencies
): FocusRightRailModel {
  void _deps;
  const rows: FocusRightRailRow[] = [];

  // Retirement context is anchor-only for Day 43 (minimal placeholder)
  rows.push({
    label: 'Context',
    value: 'Retirement planning',
  });
  rows.push({
    label: 'Focus',
    value: 'FERS, TSP, and pension projections',
  });

  return {
    title: 'Retirement Context',
    subtitle: anchor.sourceLabel,
    summary: anchor.summary,
    rows: rows,
    source: 'retirement',
  };
}

/**
 * Builds a right rail model for 'dashboard' source anchors.
 *
 * PURPOSE:
 * When user asks from dashboard context (generic Ask from dashboard cards),
 * show profile and key metrics context in the right rail.
 *
 * DATA SOURCES:
 * - anchor.sourceLabel: Dashboard card name (always available)
 * - anchor.summary: Reason for asking (always available)
 * - dependencies.profile: User profile summary (if available)
 * - dependencies.dashboardMetrics: Key metrics (if available)
 *
 * BEHAVIOR:
 * Dashboard source keeps similar behavior to the original Profile/Key Metrics
 * cards, but now driven by the view model pattern for consistency.
 *
 * @param anchor - The active PathAdvisorAnchor
 * @param deps - Dependencies with optional profile and metrics
 * @returns FocusRightRailModel for dashboard context
 */
function buildDashboardModel(
  anchor: PathAdvisorAnchor,
  deps: FocusRightRailDependencies
): FocusRightRailModel {
  const rows: FocusRightRailRow[] = [];

  const profile = deps.profile;
  const metrics = deps.dashboardMetrics;

  // Profile context
  if (profile) {
    rows.push({
      label: 'Type',
      value: profile.persona === 'job_seeker' ? 'Job Seeker' : 'Federal Employee',
    });
    if (profile.targetGrade) {
      rows.push({ label: 'Target Grade', value: profile.targetGrade });
    }
    if (profile.location) {
      rows.push({ label: 'Location', value: profile.location });
    }
  }

  // Metrics context
  if (metrics) {
    if (metrics.totalComp !== undefined) {
      rows.push({
        label: 'Est. Total Comp',
        value: formatCurrency(metrics.totalComp),
        isSensitive: true,
      });
    }
  }

  // If no profile or metrics, show generic dashboard context
  if (rows.length === 0) {
    rows.push({
      label: 'Context',
      value: 'Dashboard overview',
    });
  }

  return {
    title: 'Dashboard Context',
    subtitle: anchor.sourceLabel,
    summary: anchor.summary,
    rows: rows,
    source: 'dashboard',
  };
}

/**
 * Main function: Builds a FocusRightRailModel based on activeAnchor.
 *
 * PURPOSE:
 * This is the primary entry point for the Focus Mode right rail.
 * Given an activeAnchor and dependencies, returns a complete view model
 * ready for rendering.
 *
 * HOW IT WORKS:
 * 1. Checks anchor.source to determine which builder function to use
 * 2. Calls the appropriate builder (buildJobModel, buildResumeModel, etc.)
 * 3. Builder uses anchor data + optional store lookups to build rows
 * 4. Returns complete FocusRightRailModel
 *
 * DAY 43 BEHAVIOR RULES:
 * - When activeAnchor changes, this should be called to rebuild the model
 * - The model drives the right rail UI (title, rows, source icon)
 * - If anchor is null, caller should show empty/neutral state (not this function's job)
 *
 * @param activeAnchor - The current PathAdvisorAnchor (must not be null)
 * @param deps - Dependencies with optional store data for context lookup
 * @returns FocusRightRailModel ready for rendering
 */
export function buildFocusRightRailModel(
  activeAnchor: PathAdvisorAnchor,
  deps: FocusRightRailDependencies = {}
): FocusRightRailModel {
  // Route to source-specific builder
  switch (activeAnchor.source) {
    case 'job':
      return buildJobModel(activeAnchor, deps);
    case 'resume':
      return buildResumeModel(activeAnchor, deps);
    case 'resume-review':
      return buildResumeReviewModel(activeAnchor, deps);
    case 'benefits':
      return buildBenefitsModel(activeAnchor, deps);
    case 'import':
      return buildImportModel(activeAnchor, deps);
    case 'retirement':
      return buildRetirementModel(activeAnchor, deps);
    case 'dashboard':
      return buildDashboardModel(activeAnchor, deps);
    default:
      // Fallback for unknown source (should not happen with typed anchors)
      return {
        title: 'Context',
        subtitle: activeAnchor.sourceLabel,
        summary: activeAnchor.summary,
        rows: [
          { label: 'Source', value: activeAnchor.source },
        ],
        source: activeAnchor.source,
      };
  }
}
