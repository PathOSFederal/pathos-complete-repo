/**
 * ============================================================================
 * JOB SEARCH SCREEN V1 — Unified search: manual + optional "translate to filters"
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * TRUST-FIRST: No scraping, no auto-apply. Jobs from local mock; save adds to
 * core saved-jobs store so they appear in Saved Jobs screen.
 *
 * UNIFIED SEARCH: One search pipeline. Manual search + filters is primary.
 * "Describe what you want" is collapsed by default; expands to translate prompt
 * into filters; Apply sets same filter state and runs the same search.
 *
 * LAYOUT: Title/subtitle, Search row + collapsed Describe CTA, Filters bar,
 * Results list (left) + Job details (center). PathAdvisor rail via overrides.
 */

'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  ExternalLink,
  BookmarkPlus,
  BookmarkCheck,
  Briefcase,
  Inbox,
  Sparkles,
  X,
  Check,
  BookOpen,
  ChevronRight,
  Info,
  FileText,
  Building2,
  DollarSign,
  Calendar,
  TrendingUp,
  BarChart2,
  MapPin,
} from 'lucide-react';
import { useNav } from '@pathos/adapters';
import { storageSetJSON, storageGetJSON } from '@pathos/core';
import {
  createSession,
  addSession,
  loadGuidedApplyStore,
  saveGuidedApplyStore,
} from '@pathos/core';
import type { Job } from '@pathos/core';
import { useJobSearchV1Store } from '../stores/jobSearchV1Store';
import { usePathAdvisorScreenOverridesStore } from '../stores/pathAdvisorScreenOverridesStore';
import { AskPathAdvisorButton } from '../components/AskPathAdvisorButton';
import { useDashboardHeroDoNowStore } from '../stores/dashboardHeroDoNowStore';
import { parsePromptToFilters, type ParsedPromptResult } from '../lib/promptToFiltersParser';
import { getChecklistForJob } from './jobSearchMockChecklists';
import { MOCK_JOBS, MOCK_JOB_TAGS } from './jobSearchMockJobs';
import type { JobWithOverview } from './jobSearchMockJobs';
import { CAREER_READINESS_MOCK } from './careerReadiness/careerReadinessMockData';
import {
  buildJobMatchSnapshot,
  buildReadinessInputFromMock,
  buildDimensionBriefingPayload,
  type JobMatchSnapshot,
  type JobMatchDimension,
  type MatchLevel,
} from '../lib/jobMatchSnapshot';
import { publishScreenContext, publishDimensionExplainContext, publishSelectionContext } from '../lib/pathAdvisorPublish';
import { CAREER_READINESS, RESUME_BUILDER } from '../routes/routes';
import { FilterDropdown } from './_components/FilterDropdown';
import {
  buildFitAssessment,
  fitScoreToStars,
  effortEstimate as calcEffort,
  strategicValue as calcStrategic,
  effortToReward as calcEffortToReward,
  primaryBlocker,
} from '../lib/fitScoring';
import type { FitAssessment } from '../lib/fitScoring';
import { chipTooltips, fitTooltips, getChipTooltip, getFilterGroupTooltip, getSortTooltip } from '../lib/tooltipCopy';
import { useTargetRoleV1Store } from '../stores/targetRoleV1Store';
import {
  useDecisionBriefsV1Store,
  buildDecisionBriefRecord,
} from '../stores/decisionBriefsV1Store';
import { usePathAdvisorBriefingStore } from '../stores/pathAdvisorBriefingStore';
import { Tooltip } from '../components/Tooltip';
import { FilterGuideDrawer } from '../components/filter-guides';
import type { FilterGuideKind } from '../components/filter-guides';
import { INTERACTIVE_HOVER_CLASS } from '../styles/interactiveHover';
import { scoreTierColor } from '../styles/scoreTiers';
import { MatchBreakdownHeader, MatchBreakdownRow } from '../components/MatchBreakdownTable';
import type { MatchBreakdownRowData } from '../components/MatchBreakdownTable';

/** localStorage key for prompt-to-filters audit (view evidence). Not exported from core. */
const PROMPT_TO_FILTERS_AUDIT_KEY = 'pathos:prompt-to-filters-audit';

const JOB_SEARCH_SUGGESTED_PROMPTS = [
  'Summarize in plain English',
  'Do I meet specialized experience?',
  'What should I do next?',
  'Compare to my resume',
];

const PLACEHOLDER_PROMPT =
  'Remote GS-12 cybersecurity roles at DHS or VA near DC, open for 2+ weeks';

/** Filter dropdown options: Grades (GS-9..GS-15 + All). */
const GRADE_OPTIONS = [
  { value: '', label: 'All Grades' },
  { value: 'GS-9', label: 'GS-9' },
  { value: 'GS-10', label: 'GS-10' },
  { value: 'GS-11', label: 'GS-11' },
  { value: 'GS-12', label: 'GS-12' },
  { value: 'GS-13', label: 'GS-13' },
  { value: 'GS-14', label: 'GS-14' },
  { value: 'GS-15', label: 'GS-15' },
];

/** Filter dropdown options: Series (2210, 0343, 0301, 1102 + All). */
const SERIES_OPTIONS = [
  { value: '', label: 'All Series' },
  { value: '2210', label: '2210' },
  { value: '0343', label: '0343' },
  { value: '0301', label: '0301' },
  { value: '1102', label: '1102' },
];

/** Filter dropdown options: Types = appointment type (Competitive, Excepted, Term + All). */
const TYPES_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'Competitive', label: 'Competitive' },
  { value: 'Excepted', label: 'Excepted' },
  { value: 'Term', label: 'Term' },
];

/** Derive unique agencies from MOCK_JOBS for filter dropdown (no spread). */
function getAgencyOptions(): Array<{ value: string; label: string }> {
  const out: Array<{ value: string; label: string }> = [{ value: '', label: 'All Agencies' }];
  const seen: Record<string, boolean> = {};
  for (let i = 0; i < MOCK_JOBS.length; i++) {
    const a = MOCK_JOBS[i].agency;
    if (a !== undefined && a !== '' && seen[a] !== true) {
      seen[a] = true;
      out.push({ value: a, label: a });
    }
  }
  out.sort(function (x, y) {
    return x.label.localeCompare(y.label);
  });
  return out;
}

/** Derive unique locations from MOCK_JOBS for filter dropdown (no spread). */
function getLocationOptions(): Array<{ value: string; label: string }> {
  const out: Array<{ value: string; label: string }> = [{ value: '', label: 'Any Location' }];
  const seen: Record<string, boolean> = {};
  for (let i = 0; i < MOCK_JOBS.length; i++) {
    const loc = MOCK_JOBS[i].location;
    if (loc !== undefined && loc !== '' && seen[loc] !== true) {
      seen[loc] = true;
      out.push({ value: loc, label: loc });
    }
  }
  out.sort(function (x, y) {
    return x.label.localeCompare(y.label);
  });
  return out;
}

const AGENCY_OPTIONS = getAgencyOptions();
const LOCATION_OPTIONS = getLocationOptions();

/** Sort option for results list (deterministic, explainable). */
export type JobSearchSortKind = 'likelihood' | 'effortToReward' | 'strategic' | 'urgency';

const SORT_OPTIONS: Array<{ value: JobSearchSortKind; label: string }> = [
  { value: 'likelihood', label: 'Likelihood of success' },
  { value: 'effortToReward', label: 'Effort-to-reward' },
  { value: 'strategic', label: 'Strategic value' },
  { value: 'urgency', label: 'Urgency (close date)' },
];

export interface JobSearchScreenProps {
  initialQuery?: string;
}

/** Derive risk flag labels from job overview for compact chips (Travel, Drug test, Clearance). */
function getRiskFlagLabels(job: Job | JobWithOverview): string[] {
  const ov = 'overview' in job && job.overview !== undefined ? job.overview : undefined;
  if (ov === undefined) return [];
  const out: string[] = [];
  if (ov.travelRequired !== undefined && ov.travelRequired !== '' && ov.travelRequired.toLowerCase() !== 'no') {
    out.push('Travel');
  }
  if (ov.drugTest === 'Yes') out.push('Drug test');
  if (ov.securityClearance !== undefined && ov.securityClearance !== '' && ov.securityClearance.toLowerCase() !== 'none' && ov.securityClearance.toLowerCase() !== 'unknown') {
    out.push('Clearance');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Job list item — Listbox-style row: full-width click selects; compact content; no inline expand
// ---------------------------------------------------------------------------

/** Derive Remote/Telework label from job overview (token-safe; no hardcoded colors). */
function getRemoteTeleworkLabel(job: Job | JobWithOverview): string | null {
  const ov = 'overview' in job && job.overview !== undefined ? job.overview : undefined;
  if (ov === undefined) return null;
  if (ov.remoteJob === 'Yes') return 'Remote';
  if (ov.teleworkEligible === 'Yes') return 'Telework';
  return null;
}

/**
 * Single row: entire row is click target for selection; hover and selected styles (token-only).
 * Option A2: Left-edge 2px match bar (scan-first signal) by matchLevel; selection is background-only (no double bar).
 * Match badge (Strong/Moderate/Stretch) + match score from JobMatchSnapshot; no fit stars or "Why this fit?".
 */
function JobListItem(props: {
  job: Job | JobWithOverview;
  isSelected: boolean;
  isSaved: boolean;
  /** Match level and score from JobMatchSnapshot (same builder as details panel). */
  matchInfo: { matchLevel: MatchLevel; overallMatchScore: number };
  riskFlags: string[];
  tag?: 'New' | 'Close date updated';
  onSelect: (id: string) => void;
  onSave: () => void;
  /** Optional: append job summary to PathAdvisor context log (Quick preview). */
  onPeek?: (job: Job | JobWithOverview) => void;
}) {
  const [hover, setHover] = useState(false);
  const closeLabel = props.tag === 'Close date updated' ? 'Closes soon' : 'Closes Apr 1';
  const closeChipUrgency = props.tag === 'Close date updated';
  const remoteLabel = getRemoteTeleworkLabel(props.job);
  const oneRisk = props.riskFlags.length > 0 ? props.riskFlags[0] : null;

  /* Per-job readiness for scan-level color-coded badge (matches Saved Jobs list pattern). */
  const readiness = deriveJobReadiness(props.matchInfo.overallMatchScore);

  /* Selection uses accent-tinted bg (warmer, distinct from hover) matching Saved Jobs. */
  const rowBg =
    props.isSelected
      ? 'color-mix(in srgb, var(--p-accent) 8%, var(--p-surface))'
      : (hover ? 'var(--p-surface2)' : 'transparent');

  /* Left match bar color by level: Strong = success-ish token, Moderate = accent-muted, Stretch = border-strong/dim. */
  const matchBarColor =
    props.matchInfo.matchLevel === 'Strong'
      ? 'var(--p-success)'
      : props.matchInfo.matchLevel === 'Moderate'
        ? 'var(--p-accent-muted)'
        : 'var(--p-border-strong)';

  return (
    <div
      role="option"
      aria-selected={props.isSelected}
      className="border-b last:border-b-0 flex items-stretch min-h-[88px] cursor-pointer relative"
      style={{
        borderColor: 'var(--p-border)',
        background: rowBg,
      }}
      onMouseEnter={function () { setHover(true); }}
      onMouseLeave={function () { setHover(false); }}
      onClick={function () { props.onSelect(props.job.id); }}
    >
      {/* Option A2: 2px left match bar always present (scan-first signal); no layout shift. */}
      <div
        className="absolute inset-y-0 left-0 w-[2px] flex-shrink-0"
        style={{ background: matchBarColor }}
        aria-hidden
      />
      <div
        className="flex-1 min-w-0 text-left pl-[calc(0.75rem+2px)] pr-3 py-2 flex flex-col justify-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] focus-visible:ring-inset"
        style={{ color: 'var(--p-text)' }}
        tabIndex={0}
        onKeyDown={function (e: React.KeyboardEvent) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            props.onSelect(props.job.id);
          }
        }}
      >
        {props.tag !== undefined ? (
          <span className="text-[10px] font-medium uppercase tracking-wide block mb-0.5" style={{ color: 'var(--p-accent)' }}>
            {props.tag}
          </span>
        ) : null}
        {/* Title row: job title left, readiness score pill right (matches Saved Jobs scan signal). */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="text-sm font-medium truncate flex-1 min-w-0 leading-snug" style={{ color: 'var(--p-text)' }}>
            {props.job.title}
          </p>
          <span
            className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: 'color-mix(in srgb, ' + scoreTierColor(readiness) + ' 15%, transparent)',
              color: scoreTierColor(readiness),
            }}
            title={'Readiness: ' + String(readiness) + '/100'}
          >
            {String(readiness)}%
          </span>
        </div>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--p-text-muted)' }}>
          {props.job.agency}
          {props.job.location ? ' • ' + props.job.location : ''}
        </p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {props.job.grade !== undefined && props.job.grade !== '' ? (
            <Tooltip content={chipTooltips.grade} contentId="job-list-chip-grade">
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{ background: 'var(--p-accent-bg)', color: 'var(--p-accent)' }}
              >
                {props.job.grade}
              </span>
            </Tooltip>
          ) : null}
          <Tooltip content={getChipTooltip(closeLabel, closeChipUrgency) || chipTooltips.closeDate} contentId="job-list-chip-close">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: closeChipUrgency ? 'var(--p-accent-bg)' : 'var(--p-surface2)',
                color: closeChipUrgency ? 'var(--p-accent)' : 'var(--p-text-dim)',
              }}
            >
              {closeLabel}
            </span>
          </Tooltip>
          {remoteLabel !== null ? (
            (chipTooltips[remoteLabel] !== undefined ? (
              <Tooltip content={chipTooltips[remoteLabel]} contentId="job-list-chip-remote">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--p-surface2)', color: 'var(--p-text-dim)' }}
                >
                  {remoteLabel}
                </span>
              </Tooltip>
            ) : (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: 'var(--p-surface2)', color: 'var(--p-text-dim)' }}
              >
                {remoteLabel}
              </span>
            ))
          ) : null}
          {oneRisk !== null ? (
            (chipTooltips[oneRisk] !== undefined ? (
              <Tooltip content={chipTooltips[oneRisk]} contentId="job-list-chip-risk">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--p-surface2)', color: 'var(--p-text-dim)' }}
                >
                  {oneRisk}
                </span>
              </Tooltip>
            ) : (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: 'var(--p-surface2)', color: 'var(--p-text-dim)' }}
              >
                {oneRisk}
              </span>
            ))
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              background:
                props.matchInfo.matchLevel === 'Strong'
                  ? 'var(--p-accent-bg)'
                  : 'var(--p-surface2)',
              color:
                props.matchInfo.matchLevel === 'Strong'
                  ? 'var(--p-accent)'
                  : 'var(--p-text-muted)',
            }}
          >
            {props.matchInfo.matchLevel}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-baseline"
            style={{ background: 'var(--p-surface2)', color: 'var(--p-text-dim)' }}
          >
            <span style={{ fontWeight: 600, color: 'var(--p-text)' }}>{String(props.matchInfo.overallMatchScore)}</span>
            <span style={{ color: 'var(--p-text-dim)' }}>/100</span>
          </span>
        </div>
      </div>
      {props.onPeek !== undefined ? (
        <Tooltip content="Quick preview" contentId={'job-list-peek-' + props.job.id}>
          <button
            type="button"
            onClick={function (e: React.MouseEvent) {
              e.stopPropagation();
              if (props.onPeek !== undefined) props.onPeek(props.job);
            }}
            onKeyDown={function (e: React.KeyboardEvent) {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                if (props.onPeek !== undefined) props.onPeek(props.job);
              }
            }}
            className={INTERACTIVE_HOVER_CLASS + ' flex-shrink-0 p-2 self-center rounded'}
            aria-label="Quick preview: add job summary to PathAdvisor"
            style={{ color: 'var(--p-text-muted)', border: '1px solid transparent' }}
          >
            <Info className="w-4 h-4" />
          </button>
        </Tooltip>
      ) : null}
      <Tooltip content={props.isSaved ? 'Saved to your list' : 'Save job'} contentId="job-list-save">
        <button
          type="button"
          onClick={function (e: React.MouseEvent) {
            e.stopPropagation();
            props.onSave();
          }}
          className={INTERACTIVE_HOVER_CLASS + ' flex-shrink-0 p-2 self-center rounded'}
          aria-label={props.isSaved ? 'Saved' : 'Save job'}
          style={{ color: props.isSaved ? 'var(--p-accent)' : 'var(--p-text-muted)', border: '1px solid transparent' }}
        >
          {props.isSaved ? <BookmarkCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
        </button>
      </Tooltip>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fit stars display: 1–5 ★ from fitScore; confidence as lightweight chip
// ---------------------------------------------------------------------------

const STAR_FULL = '★';
const STAR_EMPTY = '☆';

/** Render "Fit: ★★★★☆" (or just stars) from fitAssessment.score; confidence separate. */
function FitStarsRow(props: { fitAssessment: FitAssessment }) {
  const stars = fitScoreToStars(props.fitAssessment.score);
  const parts: string[] = [];
  for (let i = 0; i < 5; i++) {
    parts.push(i < stars ? STAR_FULL : STAR_EMPTY);
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <Tooltip content={fitTooltips.fitStars} contentId="details-fit-stars">
        <span style={{ color: 'var(--p-accent)' }} aria-label={'Fit: ' + stars + ' of 5 stars'}>
          Fit: {parts.join('')}
        </span>
      </Tooltip>
      <Tooltip content={fitTooltips.confidence} contentId="details-confidence">
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: 'var(--p-surface2)', color: 'var(--p-text-dim)' }}
        >
          {props.fitAssessment.confidence} confidence
        </span>
      </Tooltip>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Qualification snapshot — Deterministic alignment summary for details pane header
// ---------------------------------------------------------------------------

/** Snapshot data computed from fit assessment + job; passed into JobDetailsPanel. */
export interface QualificationSnapshot {
  stars: number;
  confidence: string;
  blocker: string;
  effort: string;
  reasons: string[];
  risks: string[];
  inputsUsed: string[];
  missingInputs: string[];
}

// ---------------------------------------------------------------------------
// View mode type — top-level workspace mode for the selected-job detail panel
// ---------------------------------------------------------------------------

/**
 * The two content modes available in the Job Search detail workspace.
 *   - 'match': shows job info band + match intelligence + considerations (default)
 *   - 'listing': shows sub-tabs (Overview & Docs / Requirements / PathOS Brief)
 * Mirrors the Match Overview / Job Overview pattern established in Saved Jobs.
 */
type JobSearchViewMode = 'match' | 'listing';

// ---------------------------------------------------------------------------
// Per-job readiness derivation — varies per job so color tiers are exercised
// ---------------------------------------------------------------------------

/**
 * Derive a per-job readiness score from the match score.
 *
 * In a full system this would combine Career Readiness signals with
 * job-specific qualification alignment. For evaluation this uses the same
 * formula as Saved Jobs: matchScore * 0.85 + 10, clamped to 0–100.
 * This produces a spread across strong (>=80), medium (>=60), and weak (<60)
 * tiers so the color-coded readiness treatment is visibly exercised.
 */
function deriveJobReadiness(matchScore: number | undefined): number {
  if (matchScore === undefined) return 70;
  const base = Math.round(matchScore * 0.85 + 10);
  return base > 100 ? 100 : base;
}

// ---------------------------------------------------------------------------
// Professional mode tab — matches WorkspaceModeTab pattern from Saved Jobs
// ---------------------------------------------------------------------------

/**
 * A single tab in the top-level workspace mode switch (Match Overview / Job Details).
 *
 * INTERACTION STATES (per Interaction-State Standard):
 *   hover (not selected): text brightens from dim to muted; faint underline appears
 *   hover (selected): text stays accent; underline stays accent — no visual regression
 *   focus-visible: standard accent ring via :focus-visible
 *   active/pressed: brief opacity reduction (0.75) confirming the click registered
 *   selected: accent text + 2px accent bottom bar + subtle accent bg tint —
 *             persistent, visually stronger than hover, survives hover overlay
 */
function JobSearchModeTab(props: {
  label: string;
  isSelected: boolean;
  id: string;
  controlsId: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  /* Text color: selected = accent; hover = muted; default = dim. */
  const textColor = props.isSelected
    ? 'var(--p-accent)'
    : (hover ? 'var(--p-text-muted)' : 'var(--p-text-dim)');

  /* Underline: selected = accent; hover = dim hint; default = transparent. */
  const underlineColor = props.isSelected
    ? 'var(--p-accent)'
    : (hover ? 'var(--p-text-dim)' : 'transparent');

  const opacity = active ? 0.75 : 1;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={props.isSelected}
      aria-controls={props.controlsId}
      id={props.id}
      tabIndex={props.isSelected ? 0 : -1}
      onClick={props.onClick}
      onMouseEnter={function () { setHover(true); }}
      onMouseLeave={function () { setHover(false); setActive(false); }}
      onMouseDown={function () { setActive(true); }}
      onMouseUp={function () { setActive(false); }}
      className="relative px-5 py-2.5 text-xs font-semibold tracking-wide uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] focus-visible:ring-inset"
      style={{
        color: textColor,
        background: props.isSelected
          ? 'color-mix(in srgb, var(--p-accent) 5%, transparent)'
          : 'transparent',
        border: 'none',
        opacity: opacity,
      }}
    >
      {props.label}
      <span
        className="absolute bottom-0 left-0 right-0 h-[2px] transition-all"
        style={{ background: underlineColor }}
        aria-hidden="true"
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Professional sub-tab — matches AnnouncementSectionTab pattern from Saved Jobs
// ---------------------------------------------------------------------------

/**
 * A single tab in the sub-tab navigation row (listing mode).
 * Slightly smaller and lighter than the mode switch tabs because it
 * represents section-level navigation within a mode.
 *
 * INTERACTION STATES:
 *   hover (not selected): text brightens; subtle underline hint
 *   hover (selected): text stays accent; underline stays — no regression
 *   focus-visible: accent ring
 *   active/pressed: opacity reduction confirming click
 *   selected: accent text + 2px accent underline + faint accent bg tint
 */
function JobSearchSubTab(props: {
  label: string;
  sectionKey: string;
  isActive: boolean;
  id: string;
  controlsId: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  const textColor = props.isActive
    ? 'var(--p-accent)'
    : (hover ? 'var(--p-text-muted)' : 'var(--p-text-dim)');

  const underlineColor = props.isActive
    ? 'var(--p-accent)'
    : (hover ? 'var(--p-text-dim)' : 'transparent');

  const opacity = active ? 0.75 : 1;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={props.isActive}
      aria-controls={props.controlsId}
      id={props.id}
      tabIndex={props.isActive ? 0 : -1}
      onClick={props.onClick}
      onMouseEnter={function () { setHover(true); }}
      onMouseLeave={function () { setHover(false); setActive(false); }}
      onMouseDown={function () { setActive(true); }}
      onMouseUp={function () { setActive(false); }}
      className="relative px-3 py-2 text-[11px] font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] focus-visible:ring-inset"
      style={{
        color: textColor,
        background: props.isActive
          ? 'color-mix(in srgb, var(--p-accent) 4%, transparent)'
          : 'transparent',
        border: 'none',
        opacity: opacity,
      }}
    >
      {props.label}
      <span
        className="absolute bottom-0 left-0 right-0 h-[2px] transition-all"
        style={{ background: underlineColor }}
        aria-hidden="true"
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Job details panel — Parity with Saved Jobs fixed-zone architecture
// ---------------------------------------------------------------------------

/**
 * Keys for the selectable announcement sections in Job Overview mode.
 * Mirrors the exact 8-section structure from Saved Jobs plus a PathOS Brief
 * section unique to Job Search. The section set matches standard USAJOBS
 * announcement structure so the inner viewer reads like a professional
 * document navigation system.
 */
type JobSearchAnnouncementSectionKey =
  | 'overview'
  | 'qualifications'
  | 'requirements'
  | 'documents'
  | 'how-to-apply'
  | 'evaluation'
  | 'benefits'
  | 'additional'
  | 'pathosBrief';

/**
 * A single announcement section's metadata and content.
 * Matches the AnnouncementSectionDef shape from Saved Jobs.
 */
interface JobSearchAnnouncementSectionDef {
  key: JobSearchAnnouncementSectionKey;
  label: string;
  content: string;
}

/** ARIA helper: unique ID for a mode tab button (Match Overview / Job Overview). */
function getSearchModeTabId(mode: JobSearchViewMode): string {
  return 'job-search-mode-tab-' + mode;
}

/** ARIA helper: unique ID for the panel controlled by a mode tab. */
function getSearchModePanelId(mode: JobSearchViewMode): string {
  return 'job-search-mode-panel-' + mode;
}

/** ARIA helper: unique ID for an announcement section tab button. */
function getSearchSectionTabId(sectionKey: JobSearchAnnouncementSectionKey): string {
  return 'job-search-section-tab-' + sectionKey;
}

/** ARIA helper: unique ID for the panel controlled by a section tab. */
function getSearchSectionPanelId(sectionKey: JobSearchAnnouncementSectionKey): string {
  return 'job-search-section-panel-' + sectionKey;
}

/**
 * Generate deterministic mock announcement sections for a Job Search job.
 *
 * PURPOSE: Provide the same information-dense federal announcement content
 * structure that Saved Jobs uses, so the Job Overview viewer in Job Search
 * reads like the same sibling document system. Content adapts to the job's
 * title, agency, grade, and overview fields where available.
 *
 * Returns an array of 8 standard USAJOBS sections. The PathOS Brief section
 * is handled separately since it uses structured decision-intelligence data
 * rather than announcement prose.
 */
function getSearchAnnouncementSections(job: Job | JobWithOverview): JobSearchAnnouncementSectionDef[] {
  const title = job.title;
  const agency = job.agency;
  const grade = job.grade !== undefined && job.grade !== '' ? job.grade : 'the advertised grade';
  const location = job.location !== undefined && job.location !== '' ? job.location : 'the duty station';

  return [
    {
      key: 'overview',
      label: 'Role Overview',
      content:
        'This position serves as a ' + title + ' within ' + agency + ', located in ' + location + '. ' +
        'The incumbent performs professional-level work supporting the agency\'s mission through specialized analysis, program support, and stakeholder coordination.\n\n' +
        'Major duties include but are not limited to:\n\n' +
        '- Conducting analysis of program operations, policies, and procedures to evaluate effectiveness and recommend improvements.\n' +
        '- Preparing written reports, briefings, and decision memoranda for senior leadership summarizing findings and proposed courses of action.\n' +
        '- Coordinating with internal and external stakeholders across organizational boundaries to ensure alignment of program objectives.\n' +
        '- Monitoring program milestones, deliverables, and performance indicators; reporting variances and recommending corrective action.\n' +
        '- Participating in working groups, task forces, and interagency committees as a subject-matter representative.\n' +
        '- Reviewing and interpreting federal regulations, policies, and guidance applicable to the program area.\n\n' +
        'This position offers the opportunity to contribute directly to ' + agency + '\'s strategic priorities while building specialized federal career experience at the ' + grade + ' level. ' +
        'The work environment emphasizes analytical rigor, cross-functional collaboration, and evidence-based decision making.',
    },
    {
      key: 'qualifications',
      label: 'Qualifications',
      content:
        'To qualify for this position at the ' + grade + ' level, applicants must demonstrate one year of specialized experience equivalent to the next lower grade level in the federal service (or equivalent in other pay systems).\n\n' +
        'Specialized experience is defined as experience that has equipped the applicant with the particular knowledge, skills, and abilities to successfully perform the duties of this position. ' +
        'Examples of qualifying specialized experience include:\n\n' +
        '- Applying analytical methods and techniques to evaluate program performance, identify trends, and develop recommendations for management action.\n' +
        '- Preparing clear, well-organized written products (reports, memoranda, briefings) for technical and non-technical audiences.\n' +
        '- Coordinating across organizational boundaries with multiple stakeholders to accomplish project or program objectives.\n' +
        '- Using office productivity and data analysis tools (e.g., Excel, SharePoint, Power BI, Tableau, or equivalent) to organize, analyze, and present information.\n\n' +
        'In addition to the specialized experience requirement, applicants should demonstrate:\n\n' +
        '- Strong written and oral communication skills.\n' +
        '- Ability to manage competing priorities and meet deadlines in a fast-paced environment.\n' +
        '- Familiarity with federal regulations, policies, or procedures applicable to the program area.\n\n' +
        'Experience may have been gained in the federal government, state or local government, the private sector, or a non-profit organization. Volunteer experience and experience obtained outside paid employment will be considered on the same basis as paid experience.',
    },
    {
      key: 'requirements',
      label: 'Requirements',
      content:
        'Conditions of Employment:\n\n' +
        '- Must be a United States citizen or national.\n' +
        '- Must successfully complete a background investigation and, where applicable, obtain and maintain the required security clearance.\n' +
        '- Males born after December 31, 1959, must be registered with the Selective Service System or have an approved exemption.\n' +
        '- Subject to satisfactory completion of a one-year probationary period if not previously completed.\n' +
        '- Must meet all qualification requirements by the closing date of the announcement.\n\n' +
        'Additional Requirements:\n\n' +
        '- This position may require occasional travel (up to 10% of the time) for site visits, conferences, and stakeholder meetings.\n' +
        '- A valid state driver\'s license may be required if travel by government vehicle is necessary.\n' +
        '- Incumbent must be able to obtain and maintain a government-issued Personal Identity Verification (PIV) card.\n' +
        '- Financial disclosure may be required in accordance with federal ethics regulations.\n\n' +
        'Physical Requirements:\n\n' +
        'The work is primarily sedentary. Some standing, walking, bending, and carrying of light items (files, notebooks, supplies) may be required. ' +
        'No special physical demands are required to perform the work.',
    },
    {
      key: 'documents',
      label: 'Required Documents',
      content:
        'The following documents are required and must be submitted by the closing date of this announcement:\n\n' +
        '1. Resume: Your resume must include the following for each position held: job title, employer name and address, start and end dates (month/year), hours worked per week, and a detailed description of duties performed. ' +
        'Resumes exceeding 5 pages may not be fully reviewed.\n\n' +
        '2. Transcripts: If qualifying based on education or a combination of education and experience, you must submit unofficial transcripts with your application. ' +
        'Official transcripts will be required if selected.\n\n' +
        '3. SF-50 (Notification of Personnel Action): Current or former federal employees must submit a copy of their most recent SF-50 showing tenure, grade, and pay plan.\n\n' +
        '4. Veterans\' Preference Documentation: If claiming veterans\' preference, submit a DD-214 (Member Copy 4), SF-15, and any required VA documentation.\n\n' +
        '5. Schedule A Letter: If applying under the Schedule A hiring authority for individuals with disabilities, submit your Schedule A letter from a licensed medical professional, vocational rehabilitation specialist, or any government agency that issues or provides disability benefits.\n\n' +
        'Failure to provide required documents may result in disqualification. Ensure all documents are legible and properly formatted.',
    },
    {
      key: 'how-to-apply',
      label: 'How to Apply',
      content:
        'To apply for this position, you must complete the online application through USAJOBS:\n\n' +
        '1. Create or log in to your USAJOBS account at www.usajobs.gov.\n' +
        '2. Search for this announcement using the control number or job title.\n' +
        '3. Click "Apply" and follow the prompts to complete the occupational questionnaire.\n' +
        '4. Upload all required documents (see Required Documents section).\n' +
        '5. Review your application package for completeness and submit.\n\n' +
        'Your application must be received by 11:59 PM Eastern Time on the closing date. Late applications will not be accepted.\n\n' +
        'Important Notes:\n\n' +
        '- Ensure your USAJOBS profile is current and includes your most recent resume.\n' +
        '- You may check the status of your application at any time through your USAJOBS account.\n' +
        '- Applications submitted by any means other than the USAJOBS online application system will not be accepted.\n' +
        '- If you experience technical difficulties with the application system, contact the Help Desk before the closing date.\n\n' +
        'After submitting your application, you will receive a confirmation email. If you do not receive confirmation within 24 hours, contact the HR point of contact listed below.',
    },
    {
      key: 'evaluation',
      label: 'Evaluation',
      content:
        'Your application will be evaluated based on the following criteria:\n\n' +
        'Initial Review: Applications will be reviewed for completeness and minimum qualifications. Applicants who do not meet the minimum qualifications or fail to submit required documents will be rated ineligible.\n\n' +
        'Qualified applicants will be evaluated using a structured assessment process that considers:\n\n' +
        '- Demonstrated specialized experience relevant to the duties of the position.\n' +
        '- Quality and relevance of education, training, and professional development.\n' +
        '- Responses to the occupational questionnaire, which measures job-related competencies.\n\n' +
        'Competencies assessed include:\n\n' +
        '- Analytical Thinking: Ability to interpret data, identify patterns, and develop evidence-based recommendations.\n' +
        '- Communication: Skill in preparing clear written products and delivering oral presentations to diverse audiences.\n' +
        '- Stakeholder Management: Effectiveness in building and maintaining productive working relationships across organizational boundaries.\n' +
        '- Project/Program Management: Ability to plan, execute, and monitor work within scope, schedule, and resource constraints.\n\n' +
        'Best-qualified applicants may be referred to the hiring manager for further consideration and interview. ' +
        'Interview format may include structured panel interviews, writing samples, or work simulations.',
    },
    {
      key: 'benefits',
      label: 'Benefits',
      content:
        'As a federal employee of ' + agency + ', you are eligible for a comprehensive benefits package including:\n\n' +
        'Health Insurance: Choice of several Federal Employees Health Benefits (FEHB) plans covering medical, dental, and vision. ' +
        'The government pays a significant portion of the premium.\n\n' +
        'Retirement: Federal Employees Retirement System (FERS) including a basic benefit plan, Thrift Savings Plan (TSP) with government matching contributions of up to 5%, and Social Security coverage.\n\n' +
        'Leave: 13 days of annual leave per year (increasing to 20 and then 26 days with tenure), 13 days of sick leave per year, and 11 paid federal holidays.\n\n' +
        'Life Insurance: Federal Employees Group Life Insurance (FEGLI) with multiple coverage options.\n\n' +
        'Flexible Spending Accounts: Pre-tax accounts for health care and dependent care expenses.\n\n' +
        'Transit Benefits: Monthly subsidy for public transportation or vanpool commuting costs.\n\n' +
        'Work-Life Programs: Employee Assistance Program (EAP), fitness center access at many locations, telework and alternative work schedule options where available.\n\n' +
        'Additional Benefits: Long-term care insurance, student loan repayment program (agency discretion), recruitment and relocation incentives (where authorized).',
    },
    {
      key: 'additional',
      label: 'Additional Information',
      content:
        'Agency Contact Information:\n' +
        'For questions about this vacancy, contact the Human Resources Office of ' + agency + '.\n\n' +
        'Telework: This position may be eligible for telework as determined by agency policy. ' +
        'The specific telework arrangement will be discussed during the interview process and is subject to supervisor approval and organizational needs.\n\n' +
        'Bargaining Unit: This position may be covered under a collective bargaining agreement. Contact the HR office for specific information about bargaining unit status.\n\n' +
        'Equal Employment Opportunity: ' + agency + ' is an equal opportunity employer. ' +
        'Selection will be made without regard to race, color, religion, sex, national origin, age, disability, sexual orientation, gender identity, or any other non-merit factor.\n\n' +
        'Reasonable Accommodations: This agency provides reasonable accommodations to applicants with disabilities. ' +
        'If you need an accommodation for any part of the application or hiring process, contact the HR office.\n\n' +
        'This announcement may be used to fill additional vacancies in the same organizational unit within 90 days of the original selection. ' +
        'Multiple selections may be made from this announcement.\n\n' +
        'Applicants must meet all qualifications and eligibility requirements by the closing date of this announcement.',
    },
  ];
}

/** Legacy sub-tab type — kept for compatibility but PathOS Brief is now
 * part of the announcement section navigation system. */
type DetailsTab = 'overview' | 'requirements' | 'pathosBrief';

function JobDetailsPanel(props: {
  job: Job | JobWithOverview | undefined;
  isSaved: boolean;
  activeTab: DetailsTab;
  onTabChange: (tab: DetailsTab) => void;
  decisionBrief: import('../stores/decisionBriefsV1Store').DecisionBriefRecord | null;
  snapshot: QualificationSnapshot | undefined;
  jobMatchSnapshot: JobMatchSnapshot | undefined;
  onSave: () => void;
  onTailor: () => void;
  onAskPathAdvisor: () => void;
  onExplainInPathAdvisor: (snapshot: QualificationSnapshot) => void;
  onOpenCareerReadinessActionPlan: () => void;
  onOpenDimensionBriefing: (dim: JobMatchDimension) => void;
}) {
  /* No-selection state — shown when no job is selected. */
  if (props.job === undefined || props.job === null) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center"
        style={{ color: 'var(--p-text-dim)' }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'var(--p-surface2)' }}
        >
          <Briefcase className="w-6 h-6 opacity-50" />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--p-text-muted)' }}>
          Select a job to view details
        </p>
        <p className="text-xs max-w-xs" style={{ color: 'var(--p-text-dim)' }}>
          Choose a position from the results to review match intelligence, requirements, and next steps.
        </p>
      </div>
    );
  }

  /* Delegate to content component keyed by job id so internal state
   * (viewMode) resets cleanly when the selected job changes. */
  return (
    <JobDetailsPanelContent
      key={props.job.id}
      job={props.job}
      isSaved={props.isSaved}
      activeTab={props.activeTab}
      onTabChange={props.onTabChange}
      decisionBrief={props.decisionBrief}
      snapshot={props.snapshot}
      jobMatchSnapshot={props.jobMatchSnapshot}
      onSave={props.onSave}
      onTailor={props.onTailor}
      onAskPathAdvisor={props.onAskPathAdvisor}
      onExplainInPathAdvisor={props.onExplainInPathAdvisor}
      onOpenCareerReadinessActionPlan={props.onOpenCareerReadinessActionPlan}
      onOpenDimensionBriefing={props.onOpenDimensionBriefing}
    />
  );
}

/**
 * Inner content component for the selected-job detail panel.
 *
 * ARCHITECTURE: Follows the same fixed-zone pattern as SavedJobDetailsContent,
 * now with structural parity in the Job Overview mode. Both screens use the
 * same 8-section USAJOBS announcement navigation system with rich long-form
 * content. The viewer reads like a professional document navigation system —
 * not a loose metadata card.
 *
 *   FIXED ZONE 1: Job header (title, agency, readiness badge, match badge)
 *   FIXED ZONE 2: Workspace mode tabs (Match Overview / Job Overview)
 *   FIXED ZONE 3: Announcement section navigation (Job Overview mode only)
 *   SCROLLABLE VIEWPORT: content that scrolls within the card
 *   FIXED ZONE 4: Action bar (Save, Build Resume, USAJOBS, Ask PathAdvisor)
 *   Trust footer
 *
 * This ensures the lower layout is structurally stable — the action bar
 * never shifts position regardless of content length or tab switches.
 */
function JobDetailsPanelContent(props: {
  job: Job | JobWithOverview;
  isSaved: boolean;
  activeTab: DetailsTab;
  onTabChange: (tab: DetailsTab) => void;
  decisionBrief: import('../stores/decisionBriefsV1Store').DecisionBriefRecord | null;
  snapshot: QualificationSnapshot | undefined;
  jobMatchSnapshot: JobMatchSnapshot | undefined;
  onSave: () => void;
  onTailor: () => void;
  onAskPathAdvisor: () => void;
  onExplainInPathAdvisor: (snapshot: QualificationSnapshot) => void;
  onOpenCareerReadinessActionPlan: () => void;
  onOpenDimensionBriefing: (dim: JobMatchDimension) => void;
}) {
  const job = props.job;
  const usajobsUrl = job.url !== undefined && job.url !== '' ? job.url : 'https://www.usajobs.gov';
  const brief = props.decisionBrief;
  const snapshot = props.snapshot;
  const jobMatch = props.jobMatchSnapshot;
  const hasOverview = 'overview' in job && job.overview !== undefined;

  /* View mode: 'match' shows job info + match intelligence (default);
   * 'listing' shows announcement section navigation (parity with Saved Jobs). */
  const [viewMode, setViewMode] = useState<JobSearchViewMode>('match');

  /* Announcement section state: which section is active in Job Overview.
   * Default is 'overview' (Role Overview) — the most decision-relevant
   * starting point, matching Saved Jobs default. */
  const [announcementSection, setAnnouncementSection] = useState<JobSearchAnnouncementSectionKey>('overview');

  /* Auto-switch to listing mode when parent sets pathOS brief tab
   * (e.g. after save action triggers brief generation). */
  useEffect(function () {
    if (props.activeTab === 'pathosBrief') {
      setViewMode('listing');
      setAnnouncementSection('pathosBrief');
    }
  }, [props.activeTab]);

  /* Per-job readiness score — derived from match score so each job exercises
   * a different color tier (strong/green >= 80, medium/amber >= 60, weak/red < 60). */
  const displayReadiness = jobMatch !== undefined
    ? deriveJobReadiness(jobMatch.overallMatchScore)
    : 70;
  const readinessColor = scoreTierColor(displayReadiness);
  const matchScoreColor = jobMatch !== undefined
    ? scoreTierColor(jobMatch.overallMatchScore)
    : 'var(--p-text-muted)';

  /* Overview fields for the Decision Summary Band. */
  const ov = hasOverview && 'overview' in job ? job.overview : undefined;
  const remoteLabel = getRemoteTeleworkLabel(job);

  /* Close-date display — uses mock close dates for evaluation. */
  const closeDateLabel = MOCK_JOB_TAGS[job.id] === 'Close date updated' ? 'Closes soon' : 'Open';
  const isUrgent = MOCK_JOB_TAGS[job.id] === 'Close date updated';

  /* Announcement sections for the document viewer. Generated per-job so
   * content references the job's title, agency, and grade for realism.
   * Matches the same 8-section USAJOBS structure used in Saved Jobs. */
  const announcementSections = getSearchAnnouncementSections(job);

  /* Build the full section list including PathOS Brief as a 9th tab.
   * PathOS Brief is Job Search-specific intelligence — it does not appear
   * in Saved Jobs' announcement tabs (where it was moved to PathAdvisor).
   * Including it here gives users document-level access to fit intelligence
   * within the same navigation system. */
  const allSections: Array<{ key: JobSearchAnnouncementSectionKey; label: string }> = [];
  for (let i = 0; i < announcementSections.length; i++) {
    allSections.push({ key: announcementSections[i].key, label: announcementSections[i].label });
  }
  allSections.push({ key: 'pathosBrief', label: 'PathOS Brief' });

  /* Find the active announcement section content. Explicit loop to avoid ?.
   * Default to first section if key not found. Returns empty string for
   * PathOS Brief since that section renders structured data, not prose. */
  let activeAnnouncementContent = '';
  for (let i = 0; i < announcementSections.length; i++) {
    if (announcementSections[i].key === announcementSection) {
      activeAnnouncementContent = announcementSections[i].content;
      break;
    }
  }
  if (activeAnnouncementContent === '' && announcementSection !== 'pathosBrief' && announcementSections.length > 0) {
    activeAnnouncementContent = announcementSections[0].content;
  }

  return (
    /* WORKSPACE FRAME: flex column fills the available card height.
     * Fixed zones use flex-shrink-0 to stay in place; only the content
     * viewport scrolls. This prevents the action bar from drifting. */
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── FIXED ZONE 1: Job header ──────────────────────────────────────
       * Title and agency on the left; large readiness badge + match badge
       * on the right. Matches Saved Jobs header hierarchy exactly. */}
      <div
        className="px-5 pt-4 pb-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--p-border)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2
              className="text-xl font-bold leading-snug"
              style={{ color: 'var(--p-text)' }}
            >
              {job.title}
            </h2>
            <p
              className="text-sm mt-0.5 flex items-center gap-1.5"
              style={{ color: 'var(--p-text-muted)' }}
            >
              <Building2
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: 'var(--p-accent)' }}
              />
              {job.agency}
            </p>
          </div>
          {/* Right side: large readiness badge + match score badge */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className="flex flex-col items-center px-3 py-2 rounded-lg"
              style={{
                background: 'color-mix(in srgb, ' + readinessColor + ' 10%, var(--p-surface))',
                border: '1px solid color-mix(in srgb, ' + readinessColor + ' 20%, var(--p-border))',
              }}
            >
              <span
                className="text-2xl font-bold tabular-nums leading-none"
                style={{ color: readinessColor }}
              >
                {String(displayReadiness)}
              </span>
              <span
                className="text-[9px] font-semibold uppercase tracking-wider mt-1 leading-none"
                style={{ color: 'var(--p-text-dim)' }}
              >
                Readiness
              </span>
            </div>
            {jobMatch !== undefined ? (
              <span
                className="text-sm font-semibold tabular-nums px-2 py-1 rounded-md"
                style={{
                  color: matchScoreColor,
                  background: 'color-mix(in srgb, ' + matchScoreColor + ' 10%, transparent)',
                }}
              >
                {String(jobMatch.overallMatchScore)}/100 Match
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── FIXED ZONE 2: Workspace mode tabs ─────────────────────────────
       * Professional underline tabs matching Saved Jobs WorkspaceModeTab pattern.
       * Match Overview (default) shows job info + match intelligence.
       * Job Overview shows announcement section navigation (parity with Saved Jobs).
       * RENAMED from "Job Details" to "Job Overview" to match Saved Jobs exactly. */}
      <div
        className="flex items-stretch flex-shrink-0"
        style={{ borderBottom: '1px solid var(--p-border)' }}
        role="tablist"
        aria-label="Detail view mode"
      >
        <JobSearchModeTab
          label="Match Overview"
          id={getSearchModeTabId('match')}
          controlsId={getSearchModePanelId('match')}
          isSelected={viewMode === 'match'}
          onClick={function () { setViewMode('match'); }}
        />
        <JobSearchModeTab
          label="Job Overview"
          id={getSearchModeTabId('listing')}
          controlsId={getSearchModePanelId('listing')}
          isSelected={viewMode === 'listing'}
          onClick={function () { setViewMode('listing'); }}
        />
      </div>

      {/* ── FIXED ZONE 3: Job Overview section navigation ──────────────────
       * Visible only in Job Overview mode. Professional document-navigation
       * row using JobSearchSubTab components — structurally identical to
       * the AnnouncementSectionTab row in Saved Jobs.
       *
       * 8 standard USAJOBS sections + PathOS Brief (Job Search-specific).
       * overflow-x-auto allows horizontal scrolling when all 9 tabs
       * exceed the available width. flex-shrink-0 keeps the row pinned. */}
      {viewMode === 'listing' ? (
        <div
          className="flex items-stretch overflow-x-auto flex-shrink-0 px-3"
          style={{ borderBottom: '1px solid var(--p-border)' }}
          role="tablist"
          aria-label="Job Overview sections"
        >
          {allSections.map(function (sec) {
            return (
              <JobSearchSubTab
                key={sec.key}
                label={sec.label}
                sectionKey={sec.key}
                id={getSearchSectionTabId(sec.key)}
                controlsId={getSearchSectionPanelId(sec.key)}
                isActive={sec.key === announcementSection}
                onClick={function () { setAnnouncementSection(sec.key); }}
              />
            );
          })}
        </div>
      ) : null}

      {/* ── SCROLLABLE CONTENT VIEWPORT ──────────────────────────────────
       * Only this region scrolls. Everything above (header, mode tabs,
       * section nav) and below (action bar, trust footer) stays fixed.
       * flex-1 + min-h-0 fills remaining space; overflow-y-auto scrolls. */}
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ overscrollBehavior: 'contain' }}
      >

      {viewMode === 'match' ? (
        <div
          role="tabpanel"
          id={getSearchModePanelId('match')}
          aria-labelledby={getSearchModeTabId('match')}
        >
          {/* ── Decision Summary Band ─────────────────────────────────────
           * Key decision factors at first glance: salary, grade/promotion,
           * work mode, and deadline. Tile order matches Saved Jobs' band.
           * Agency lives in the fixed header above (identity first, then
           * detail tiles — consistent with how Saved Jobs structures it). */}
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--p-border)' }}>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
            >
              {/* Salary — monetary decision factor, displayed first in success green. */}
              <div
                className="px-3 py-2 rounded-md"
                style={{ background: 'var(--p-surface2)', border: '1px solid var(--p-border)' }}
              >
                <span
                  className="text-[9px] uppercase tracking-wider font-medium flex items-center gap-1 mb-0.5"
                  style={{ color: 'var(--p-text-dim)' }}
                >
                  <DollarSign className="w-2.5 h-2.5 flex-shrink-0" />
                  Salary
                </span>
                <span
                  className="text-xs font-bold leading-snug block"
                  style={{ color: 'var(--p-success)' }}
                >
                  {ov !== undefined && ov.payRange !== undefined && ov.payRange !== ''
                    ? ov.payRange
                    : 'See announcement'}
                </span>
              </div>

              {/* Grade & Promotion — career trajectory at a glance. */}
              <div
                className="px-3 py-2 rounded-md"
                style={{ background: 'var(--p-surface2)', border: '1px solid var(--p-border)' }}
              >
                <span
                  className="text-[9px] uppercase tracking-wider font-medium flex items-center gap-1 mb-0.5"
                  style={{ color: 'var(--p-text-dim)' }}
                >
                  <TrendingUp className="w-2.5 h-2.5 flex-shrink-0" />
                  Grade & Promotion
                </span>
                <span
                  className="text-xs font-bold leading-snug block"
                  style={{ color: 'var(--p-text)' }}
                >
                  {(function () {
                    if (job.grade === undefined || job.grade === '') return 'See announcement';
                    const gradeMatch = job.grade.match(/GS-(\d+)/);
                    if (gradeMatch) {
                      const current = parseInt(gradeMatch[1], 10);
                      const next = current + 1;
                      if (next <= 15) return job.grade + ' \u2192 GS-' + String(next);
                      return job.grade + ' (at ceiling)';
                    }
                    return job.grade;
                  })()}
                </span>
              </div>

              {/* Work Mode — remote / telework / on-site flexibility. */}
              <div
                className="px-3 py-2 rounded-md"
                style={{ background: 'var(--p-surface2)', border: '1px solid var(--p-border)' }}
              >
                <span
                  className="text-[9px] uppercase tracking-wider font-medium mb-0.5 block"
                  style={{ color: 'var(--p-text-dim)' }}
                >
                  Work Mode
                </span>
                <span
                  className="text-xs font-bold leading-snug block"
                  style={{ color: 'var(--p-text)' }}
                >
                  {remoteLabel !== null ? remoteLabel : 'On-site'}
                </span>
              </div>

              {/* Deadline — time-sensitivity signal with accent urgency. */}
              <div
                className="px-3 py-2 rounded-md"
                style={{ background: 'var(--p-surface2)', border: '1px solid var(--p-border)' }}
              >
                <span
                  className="text-[9px] uppercase tracking-wider font-medium flex items-center gap-1 mb-0.5"
                  style={{ color: 'var(--p-text-dim)' }}
                >
                  <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                  Deadline
                </span>
                <span
                  className="text-xs font-bold leading-snug block"
                  style={{ color: isUrgent ? 'var(--p-accent)' : 'var(--p-text)' }}
                >
                  {closeDateLabel}{isUrgent ? ' \u2014 act now' : ''}
                </span>
              </div>
            </div>

            {/* Secondary metadata row: location, schedule, security, appointment type */}
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 text-[11px]"
              style={{ color: 'var(--p-text-dim)' }}
            >
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {job.location !== undefined && job.location !== '' ? job.location : 'Location TBD'}
              </span>
              {ov !== undefined && ov.workSchedule !== undefined && ov.workSchedule !== '' ? (
                <span>{ov.workSchedule}</span>
              ) : null}
              {ov !== undefined && ov.securityClearance !== undefined && ov.securityClearance !== '' && ov.securityClearance.toLowerCase() !== 'none' ? (
                <span>{ov.securityClearance}</span>
              ) : null}
              {ov !== undefined && ov.appointmentType !== undefined && ov.appointmentType !== '' ? (
                <span>{ov.appointmentType}</span>
              ) : null}
              {ov !== undefined && ov.promotionPotential !== undefined && ov.promotionPotential !== '' ? (
                <span>Promotion to {ov.promotionPotential}</span>
              ) : null}
            </div>
          </div>

          {/* ── Match Intelligence Section ───────────────────────────────
           * Match for this job: readiness ↔ job breakdown with dimensions.
           * Preserves all Job Search-specific match intelligence while
           * following the Saved Jobs section density and seriousness. */}
          {jobMatch !== undefined ? (
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--p-border)' }}>
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5"
                style={{ color: 'var(--p-text-dim)' }}
              >
                <BarChart2 className="w-3.5 h-3.5" style={{ color: 'var(--p-accent)' }} aria-hidden />
                Match for this job
              </h3>

              {/* Compact advisory — preserves the primary-blocker guidance that
               * was in the removed summary grid, but without repeating the headline
               * Readiness and Job Match values already visible in FIXED ZONE 1 badges.
               * Single subdued line sits between the section heading and the breakdown
               * table so the user sees actionable advice without redundant metrics. */}
              <p
                className="text-[11px] mb-3 pb-2"
                style={{
                  color: 'var(--p-text-muted)',
                  borderBottom: '1px solid var(--p-border)',
                }}
              >
                {jobMatch.primaryBlocker}
              </p>

              {/* Match breakdown: shared table component for dimension bars.
               * Uses the canonical MatchBreakdownHeader + MatchBreakdownRow
               * components so alignment and interaction behavior are identical
               * to the Saved Jobs match breakdown. */}
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--p-text-dim)' }}
                >
                  Match breakdown
                </p>

                <MatchBreakdownHeader />

                <ul className="list-none space-y-1.5" role="list">
                  {jobMatch.dimensions.map(function (dim, i) {
                    const emphasisLevel = dim.demandWeight >= 0.25 ? 'High' : dim.demandWeight >= 0.18 ? 'Medium' : 'Low';
                    const statusColor = dim.status === 'Good'
                      ? 'var(--p-success)'
                      : dim.status === 'Mixed'
                        ? 'var(--p-warning, #eab308)'
                        : 'var(--p-danger, #ef4444)';
                    const rowData: MatchBreakdownRowData = {
                      label: dim.label,
                      score: dim.matchScore,
                      emphasisLevel: emphasisLevel,
                      statusLabel: dim.status,
                      statusColor: statusColor,
                      tooltipText: 'User: ' + String(dim.readinessScore) + '/100 \u2022 Job emphasis: ' + emphasisLevel + ' \u2022 Gap: ' + String(100 - dim.matchScore),
                      ariaLabel: 'Open dimension details for ' + dim.label,
                    };
                    /* Capture dim in a local constant so the closure does not
                     * close over the loop variable. */
                    const capturedDim = dim;
                    return (
                      <MatchBreakdownRow
                        key={i}
                        data={rowData}
                        tooltipIdSuffix={'search-dim-' + i}
                        onRowClick={function () {
                          props.onOpenDimensionBriefing(capturedDim);
                        }}
                      />
                    );
                  })}
                </ul>
              </div>

              {/* Match intelligence actions — search-specific: save, tailor, career readiness. */}
              <div className="flex flex-wrap items-center gap-2 pt-3 mt-3" style={{ borderTop: '1px solid var(--p-border)' }}>
                {props.isSaved ? (
                  <button
                    type="button"
                    onClick={props.onTailor}
                    className={INTERACTIVE_HOVER_CLASS + ' text-[11px] font-medium rounded px-2 py-1'}
                    style={{ color: 'var(--p-accent)', border: '1px solid transparent' }}
                  >
                    Start Tailoring
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={props.onSave}
                    className={INTERACTIVE_HOVER_CLASS + ' text-[11px] font-medium rounded px-2 py-1'}
                    style={{ color: 'var(--p-accent)', border: '1px solid transparent' }}
                  >
                    Save + Start Tailoring
                  </button>
                )}
                <Tooltip content={'Open Career Readiness action plan to address: ' + jobMatch.topJobRelevantGap.label + ' (+' + String(jobMatch.topJobRelevantGap.impactPoints) + ' pts)'} contentId="snapshot-open-career-readiness">
                  <button
                    type="button"
                    onClick={props.onOpenCareerReadinessActionPlan}
                    className={INTERACTIVE_HOVER_CLASS + ' text-[11px] font-medium rounded px-2 py-1'}
                    style={{ color: 'var(--p-accent)', border: '1px solid transparent' }}
                  >
                    Fix {jobMatch.topJobRelevantGap.label}
                  </button>
                </Tooltip>
                {snapshot !== undefined ? (
                  <Tooltip content="Open PathAdvisor with alignment summary and next action." contentId="snapshot-explain-pathadvisor">
                    <button
                      type="button"
                      onClick={function () {
                        props.onExplainInPathAdvisor(snapshot);
                      }}
                      className={INTERACTIVE_HOVER_CLASS + ' text-[11px] rounded px-2 py-1'}
                      style={{ color: 'var(--p-text-muted)', border: '1px solid transparent' }}
                    >
                      Explain Match
                    </button>
                  </Tooltip>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        /* ── JOB OVERVIEW MODE: announcement document viewer ──
         * Section navigation tabs are in FIXED ZONE 3 above. Only the
         * selected section's content renders here. Content flows naturally
         * inside the scrollable viewport — matching Saved Jobs' viewer. */
        <div
          role="tabpanel"
          id={getSearchModePanelId('listing')}
          aria-labelledby={getSearchModeTabId('listing')}
        >

        {/* PathOS Brief section — Job Search-specific structured intelligence */}
        {announcementSection === 'pathosBrief' ? (
          <div
            className="px-5 py-4"
            role="tabpanel"
            id={getSearchSectionPanelId('pathosBrief')}
            aria-labelledby={getSearchSectionTabId('pathosBrief')}
          >
            <div className="space-y-4">
              {brief !== null ? (
                <>
                  <div className="flex flex-wrap gap-2 items-center">
                    <FitStarsRow fitAssessment={brief.fitAssessment} />
                    <Tooltip content={fitTooltips.effort} contentId="details-effort">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--p-surface2)', color: 'var(--p-text-muted)' }}>
                        Effort: {brief.effortEstimate}
                      </span>
                    </Tooltip>
                  </div>
                  {brief.risks.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {brief.risks.map(function (r, i) {
                        const tip = chipTooltips[r] !== undefined ? chipTooltips[r] : '';
                        const chip = (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--p-surface2)', color: 'var(--p-text-dim)' }}>
                            {r}
                          </span>
                        );
                        return tip !== '' ? (
                          <Tooltip key={i} content={tip} contentId={'details-risk-' + i}>
                            {chip}
                          </Tooltip>
                        ) : (
                          <span key={i}>{chip}</span>
                        );
                      })}
                    </div>
                  ) : null}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--p-text-dim)' }}>
                      Next actions
                    </h3>
                    <ul className="list-none space-y-1">
                      {brief.nextActions.map(function (a, i) {
                        return (
                          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--p-text-muted)' }}>
                            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--p-success)' }} aria-hidden />
                            {a}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
                    Based on: {brief.fitAssessment.inputsUsed.join(', ') || 'target role and job data'}
                  </p>
                </>
              ) : (
                <div className="space-y-2 text-sm" style={{ color: 'var(--p-text-muted)' }}>
                  <p>
                    Save this job to generate a PathOS Brief with fit assessment, risk analysis, and recommended next actions.
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
                    The brief combines your career readiness profile with this announcement's requirements to produce tailored decision intelligence.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Standard announcement section content ──
           * Renders the content of the currently selected announcement section.
           * Content is split on double-newline into paragraphs for readable layout.
           * Lines starting with "- " are rendered as list items; other lines as
           * normal paragraph text. Dense enough to test scroll and reading flow.
           * This rendering logic mirrors Saved Jobs' announcement viewer exactly. */
          <div
            className="px-5 py-4"
            role="tabpanel"
            id={getSearchSectionPanelId(announcementSection)}
            aria-labelledby={getSearchSectionTabId(announcementSection)}
          >
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--p-text-muted)' }}>
              {activeAnnouncementContent.split('\n\n').map(function (para, pIdx) {
                /* Detect list blocks: if the paragraph starts with "- " render as <ul>. */
                const trimmed = para.trim();
                if (trimmed.indexOf('- ') === 0) {
                  const items = trimmed.split('\n');
                  return (
                    <ul key={pIdx} className="list-none space-y-1.5 pl-1">
                      {items.map(function (item, iIdx) {
                        const text = item.replace(/^-\s*/, '');
                        if (text.trim() === '') return null;
                        return (
                          <li key={iIdx} className="flex items-start gap-2">
                            <span
                              className="flex-shrink-0 mt-[7px] w-1.5 h-1.5 rounded-full"
                              style={{ background: 'var(--p-text-dim)' }}
                              aria-hidden
                            />
                            <span>{text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  );
                }
                /* Detect numbered list blocks: "1. " or "2. " etc. */
                if (/^\d+\.\s/.test(trimmed)) {
                  return (
                    <p key={pIdx}>{trimmed}</p>
                  );
                }
                return (
                  <p key={pIdx}>{trimmed}</p>
                );
              })}
            </div>
          </div>
        )}

        </div>
      )}

      </div>
      {/* ── END SCROLLABLE CONTENT VIEWPORT ── */}

      {/* ── FIXED ZONE 4: Action bar ──────────────────────────────────────
       * Structurally anchored at the bottom of the workspace frame.
       * flex-shrink-0 prevents compression. Does NOT move when switching
       * between tabs or when content length changes. */}
      <div
        className="flex flex-wrap items-center gap-3 px-5 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid var(--p-border)', background: 'var(--p-surface)' }}
      >
        <Tooltip content={props.isSaved ? 'Saved to your list' : 'Save job and create PathOS Brief'} contentId="details-save-btn">
          <button
            type="button"
            onClick={props.isSaved ? function () {} : props.onSave}
            className={INTERACTIVE_HOVER_CLASS + ' inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded'}
            style={{
              background: 'var(--p-accent)',
              color: 'var(--p-bg)',
              border: '1px solid transparent',
              borderRadius: 'var(--p-radius)',
            }}
          >
            {props.isSaved ? <BookmarkCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
            {props.isSaved ? 'Saved' : 'Save + Start Tailoring'}
          </button>
        </Tooltip>
        <button
          type="button"
          onClick={props.onTailor}
          className={INTERACTIVE_HOVER_CLASS + ' inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded'}
          data-testid="build-resume-action"
          style={{
            background: 'var(--p-surface2)',
            color: 'var(--p-text-muted)',
            border: '1px solid var(--p-border)',
            borderRadius: 'var(--p-radius)',
          }}
        >
          <FileText className="w-4 h-4" />
          Build Resume
        </button>
        <AskPathAdvisorButton
          onClick={props.onAskPathAdvisor}
          tooltipText="Get briefing for this job from PathAdvisor."
        />
        <Tooltip content="Open full announcement on USAJOBS in your browser" contentId="details-usajobs-link">
          <a
            href={usajobsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={INTERACTIVE_HOVER_CLASS + ' inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded'}
            style={{
              background: 'var(--p-surface2)',
              color: 'var(--p-text-muted)',
              border: '1px solid var(--p-border)',
              borderRadius: 'var(--p-radius)',
            }}
          >
            <ExternalLink className="w-4 h-4" />
            View on USAJOBS
          </a>
        </Tooltip>
      </div>

      {/* ── Trust footer ── */}
      <p className="text-[11px] px-5 pb-3 flex-shrink-0" style={{ color: 'var(--p-text-dim)' }}>
        Opens in your browser. PathOS does not access your USAJOBS account.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Applied from prompt — View panel: original prompt, evidence, proposed filters
// (Auditability: read from PROMPT_TO_FILTERS_AUDIT_KEY when View is open.)
// ---------------------------------------------------------------------------

interface AuditStored {
  promptText?: string;
  proposedFilters?: Record<string, string>;
  evidence?: Array<{ type: string; value: string; source: string }>;
  timestamp?: string;
}

function AppliedFromPromptViewPanel(props: { promptText: string; onClose: () => void }) {
  const raw = storageGetJSON<AuditStored>(PROMPT_TO_FILTERS_AUDIT_KEY, {});
  const evidence = Array.isArray(raw.evidence) ? raw.evidence : [];
  const proposedFilters = raw.proposedFilters !== null && typeof raw.proposedFilters === 'object' ? raw.proposedFilters : {};

  return (
    <div
      className="mx-4 mt-2 p-3 rounded border"
      style={{
        background: 'var(--p-surface2)',
        borderColor: 'var(--p-border)',
        borderRadius: 'var(--p-radius)',
      }}
    >
      <p className="text-xs font-medium" style={{ color: 'var(--p-text)' }}>
        Original prompt
      </p>
      <p className="text-sm mt-1" style={{ color: 'var(--p-text-muted)' }}>
        {props.promptText}
      </p>
      {evidence.length > 0 ? (
        <>
          <p className="text-xs font-medium mt-3" style={{ color: 'var(--p-text)' }}>
            Extracted evidence
          </p>
          <ul className="list-none mt-1 space-y-0.5 text-[11px]" style={{ color: 'var(--p-text-muted)' }}>
            {evidence.map(function (e, i) {
              return (
                <li key={i}>
                  {e.type}: {e.value} (from &quot;{e.source}&quot;)
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
      {Object.keys(proposedFilters).length > 0 ? (
        <>
          <p className="text-xs font-medium mt-2" style={{ color: 'var(--p-text)' }}>
            Proposed filters applied
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {Object.keys(proposedFilters).map(function (k) {
              const v = proposedFilters[k];
              if (v === undefined || v === '') return null;
              return (
                <span
                  key={k}
                  className="text-[11px] px-2 py-0.5 rounded"
                  style={{ background: 'var(--p-surface)', color: 'var(--p-text-muted)' }}
                >
                  {k}: {v}
                </span>
              );
            })}
          </div>
        </>
      ) : null}
      <button
        type="button"
        onClick={props.onClose}
        className={INTERACTIVE_HOVER_CLASS + ' mt-3 text-xs flex items-center gap-1 rounded px-1 py-0.5'}
        style={{ color: 'var(--p-text-dim)', border: '1px solid transparent' }}
      >
        <X className="w-3 h-3" />
        Close
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function JobSearchScreen(props: JobSearchScreenProps) {
  const nav = useNav();
  const store = useJobSearchV1Store();
  const setOverrides = usePathAdvisorScreenOverridesStore(function (s) {
    return s.setOverrides;
  });
  const setHeroDoNow = useDashboardHeroDoNowStore(function (s) {
    return s.setAction;
  });

  const [mounted, setMounted] = useState(false);
  /** Describe panel: collapsed by default so search feels like one system. */
  const [describePanelExpanded, setDescribePanelExpanded] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [proposed, setProposed] = useState<ParsedPromptResult | null>(null);
  const [viewAuditOpen, setViewAuditOpen] = useState(false);
  const [sortBy, setSortBy] = useState<JobSearchSortKind>('urgency');
  const [detailsTab, setDetailsTab] = useState<DetailsTab>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [targetRoleModalOpen, setTargetRoleModalOpen] = useState(false);
  /** Undo applied-from-prompt: show toast and allow one-click revert. */
  const [showUndoAppliedPrompt, setShowUndoAppliedPrompt] = useState(false);
  /** Which filter guide drawer is open (series | agency | location); null = closed. */
  const [filterGuideKind, setFilterGuideKind] = useState<FilterGuideKind | null>(null);
  /** Ref for results pane scroll container (scroll to top on filter/sort reset). */
  const resultsScrollRef = useRef<HTMLDivElement>(null);

  const targetRoleStore = useTargetRoleV1Store();
  const decisionBriefsStore = useDecisionBriefsV1Store();

  useEffect(function () {
    store.loadFromStorage();
    targetRoleStore.loadFromStorage();
    decisionBriefsStore.loadFromStorage();
    if (props.initialQuery !== undefined && props.initialQuery !== '') {
      store.setLastQuery({ keywords: props.initialQuery });
    }
    queueMicrotask(function () {
      setMounted(true);
    });
  }, []);

  const openFitBriefing = usePathAdvisorBriefingStore(function (s) {
    return s.openBriefing;
  });

  const targetRole = useMemo(
    function () {
      return {
        series: targetRoleStore.series,
        gsTarget: targetRoleStore.gsTarget,
        location: targetRoleStore.location,
        remotePreference: targetRoleStore.remotePreference,
      };
    },
    [targetRoleStore.series, targetRoleStore.gsTarget, targetRoleStore.location, targetRoleStore.remotePreference]
  );

  const sortedResults = useMemo(
    function () {
      const list = store.results;
      if (list.length === 0) return list;
      const withScores: Array<{ job: Job | JobWithOverview; score: number; effortToReward: string; strategic: string }> = [];
      for (let i = 0; i < list.length; i++) {
        const job = list[i];
        if (job === undefined) continue;
        const fit = buildFitAssessment({
          job,
          targetRole,
          profile: { skillsKeywords: [] },
          checklistCounts: (function () {
            const c = getChecklistForJob(job.id);
            if (c === null) return undefined;
            return { specialized: c.specializedExperience.length, skills: c.skillsKeywords.length, documents: c.documentsNeeded.length };
          })(),
        });
        const effort = calcEffort(fit, (function () {
          const c = getChecklistForJob(job.id);
          if (c === null) return undefined;
          return { specialized: c.specializedExperience.length, skills: c.skillsKeywords.length, documents: c.documentsNeeded.length };
        })());
        const strat = calcStrategic(job, fit);
        const etr = calcEffortToReward(job, effort, strat);
        withScores.push({
          job,
          score: fit.score,
          effortToReward: etr,
          strategic: strat,
        });
      }
      const out: Array<Job | JobWithOverview> = [];
      if (sortBy === 'urgency') {
        for (let i = 0; i < list.length; i++) {
          if (list[i] !== undefined) out.push(list[i]);
        }
        return out;
      }
      if (sortBy === 'likelihood') {
        withScores.sort(function (a, b) { return b.score - a.score; });
        for (let i = 0; i < withScores.length; i++) {
          const x = withScores[i];
          if (x !== undefined) out.push(x.job);
        }
        return out;
      }
      if (sortBy === 'effortToReward') {
        const ord = function (s: string) { return s === 'High' ? 3 : s === 'Medium' ? 2 : 1; };
        withScores.sort(function (a, b) { return ord(b.effortToReward) - ord(a.effortToReward); });
        for (let i = 0; i < withScores.length; i++) {
          const x = withScores[i];
          if (x !== undefined) out.push(x.job);
        }
        return out;
      }
      if (sortBy === 'strategic') {
        const ord = function (s: string) { return s === 'High' ? 3 : s === 'Medium' ? 2 : 1; };
        withScores.sort(function (a, b) { return ord(b.strategic) - ord(a.strategic); });
        for (let i = 0; i < withScores.length; i++) {
          const x = withScores[i];
          if (x !== undefined) out.push(x.job);
        }
        return out;
      }
      return list;
    },
    [store.results, sortBy, targetRole]
  );

  const selectedJob =
    store.selectedJobId !== null
      ? sortedResults.find(function (j) {
          return j.id === store.selectedJobId;
        })
      : undefined;

  /** Qualification snapshot for the selected job (deterministic: stars, blocker, effort, reasons, risks). */
  const qualificationSnapshot = useMemo(
    function (): QualificationSnapshot | undefined {
      if (selectedJob === undefined) return undefined;
      const fit = buildFitAssessment({
        job: selectedJob,
        targetRole,
        profile: { skillsKeywords: [] },
        checklistCounts: (function () {
          const c = getChecklistForJob(selectedJob.id);
          if (c === null) return undefined;
          return { specialized: c.specializedExperience.length, skills: c.skillsKeywords.length, documents: c.documentsNeeded.length };
        })(),
      });
      const effort = calcEffort(fit, (function () {
        const c = getChecklistForJob(selectedJob.id);
        if (c === null) return undefined;
        return { specialized: c.specializedExperience.length, skills: c.skillsKeywords.length, documents: c.documentsNeeded.length };
      })());
      const blocker = primaryBlocker(selectedJob, targetRole, fit);
      const risks = getRiskFlagLabels(selectedJob);
      return {
        stars: fitScoreToStars(fit.score),
        confidence: fit.confidence,
        blocker,
        effort,
        reasons: fit.reasons,
        risks,
        inputsUsed: fit.inputsUsed,
        missingInputs: fit.missingInputs !== undefined ? fit.missingInputs : [],
      };
    },
    [selectedJob, targetRole]
  );

  /** Job Match Snapshot v1: readiness ↔ job mapping (local-only Match Breakdown). */
  const readinessInput = useMemo(function () {
    return buildReadinessInputFromMock({
      score: CAREER_READINESS_MOCK.score,
      scoreMax: CAREER_READINESS_MOCK.scoreMax,
      badgeLabel: CAREER_READINESS_MOCK.badgeLabel,
      radarSpokes: CAREER_READINESS_MOCK.radarSpokes,
      gaps: CAREER_READINESS_MOCK.gaps,
      actionPlanItems: CAREER_READINESS_MOCK.actionPlanItems,
    });
  }, []);
  /** Per-row match level and score from same JobMatchSnapshot builder; cached so 36 mock jobs do not recompute every render. */
  const matchByJobId = useMemo(
    function (): Record<string, { matchLevel: MatchLevel; overallMatchScore: number }> {
      const out: Record<string, { matchLevel: MatchLevel; overallMatchScore: number }> = {};
      for (let i = 0; i < sortedResults.length; i++) {
        const job = sortedResults[i];
        if (job === undefined) continue;
        const snap = buildJobMatchSnapshot(readinessInput, job);
        out[job.id] = { matchLevel: snap.matchLevel, overallMatchScore: snap.overallMatchScore };
      }
      return out;
    },
    [readinessInput, sortedResults]
  );
  const jobMatchSnapshot = useMemo(
    function (): JobMatchSnapshot | undefined {
      if (selectedJob === undefined) return undefined;
      return buildJobMatchSnapshot(readinessInput, selectedJob);
    },
    [selectedJob, readinessInput]
  );

  /* Day 62: Append job match entry to PathAdvisor Context Log when user selects a job. */
  useEffect(
    function () {
      if (selectedJob === undefined || jobMatchSnapshot === undefined) return;
      const job = selectedJob;
      const snap = jobMatchSnapshot;
      const agency = job.agency !== undefined && job.agency !== '' ? job.agency : 'Agency';
      const location = job.location !== undefined && job.location !== '' ? job.location : 'Location';
      const subtitle = agency + ' • ' + location;
      const missingBullets: string[] = [];
      for (let i = 0; i < snap.missingEvidence.length; i++) {
        const item = snap.missingEvidence[i];
        if (item !== undefined) {
          const line = item.impactPoints !== undefined ? item.label + ' (+' + String(item.impactPoints) + ')' : item.label;
          missingBullets.push(line);
        }
      }
      const nextActionLine =
        'Fix ' + snap.topJobRelevantGap.label + ' (+' + String(snap.topJobRelevantGap.impactPoints) + ')';
      const tags: Array<'localOnly' | 'demo' | 'explainability'> = ['localOnly'];
      if (job.id.indexOf('mock-js-') === 0) {
        tags.push('demo');
      }
      publishScreenContext({
        screen: 'job-search',
        anchor: { type: 'job', id: job.id, label: job.title !== undefined && job.title !== '' ? job.title : job.id },
        title: 'Job match: ' + (job.title !== undefined && job.title !== '' ? job.title : job.id),
        subtitle,
        sections: [
          {
            title: 'Summary',
            lines: [
              'Readiness: ' + String(snap.overallReadinessScore) + '/' + String(snap.overallReadinessMax),
              'Job match: ' + String(snap.overallMatchScore) + '/100 (' + snap.matchLevel + '). Job match weights what this announcement emphasizes most.',
            ],
          },
          { title: 'Primary blocker', lines: [snap.primaryBlocker] },
          missingBullets.length > 0 ? { title: "What you're missing", bullets: missingBullets } : { title: "What you're missing", lines: ['None identified.'] },
          {
            title: 'Next best action',
            bullets: [nextActionLine],
          },
        ],
        ctas: [
          { label: 'Open Career Readiness: Fix ' + snap.topJobRelevantGap.label, action: 'nav', route: CAREER_READINESS + '#action-plan' },
        ],
        tags,
        dedupeKey: 'selectJob:' + job.id + ':' + String(snap.overallMatchScore),
      });
    },
    [selectedJob, jobMatchSnapshot]
  );

  useEffect(function () {
    /* Day 62: Job Search no longer sets railContent; context log entries replace static Insight card. */
    setOverrides({
      screenId: 'job-search',
      viewingLabel: 'Job Search',
      suggestedPrompts:
        jobMatchSnapshot !== undefined
          ? [
              'Why is this a stretch for me?',
              'Show what evidence I\'m missing',
              'What will move my score fastest?',
            ]
          : JOB_SEARCH_SUGGESTED_PROMPTS,
      briefingLabel: 'From Job Search',
      briefingHelperText:
        'Use this workspace to decode job requirements and decide your next best move. Ask about specialized experience, keywords, and what to do next.',
      onRailNextBestActionClick:
        jobMatchSnapshot !== undefined
          ? function () {
              nav.push(CAREER_READINESS + '#action-plan');
            }
          : undefined,
      onFitBriefingPrimaryAction: function () {
        const briefing = usePathAdvisorBriefingStore.getState().briefing;
        if (briefing === null || typeof briefing !== 'object' || (briefing as { type?: string }).type !== 'fit') return;
        const fit = briefing as import('../stores/pathAdvisorBriefingStore').PathAdvisorBriefingFit;
        const results = useJobSearchV1Store.getState().results;
        let job: Job | JobWithOverview | undefined;
        for (let i = 0; i < results.length; i++) {
          if (results[i] !== undefined && results[i].id === fit.jobId) {
            job = results[i];
            break;
          }
        }
        if (job !== undefined && !fit.isJobSaved) {
          useJobSearchV1Store.getState().saveJob(job);
          const tr = useTargetRoleV1Store.getState();
          const targetRole = {
            series: tr.series,
            gsTarget: tr.gsTarget,
            location: tr.location,
            remotePreference: tr.remotePreference,
          };
          const record = buildDecisionBriefRecord(job.id, job, targetRole, { skillsKeywords: [] });
          useDecisionBriefsV1Store.getState().saveBrief(record);
        }
        nav.push(RESUME_BUILDER);
      },
    });
    return function () {
      setOverrides(null);
      setHeroDoNow(null);
    };
  }, [setOverrides, setHeroDoNow, nav, jobMatchSnapshot]);

  useEffect(function () {
    if (selectedJob !== undefined) {
      setHeroDoNow({
        label: 'Save and start tailoring',
        route: RESUME_BUILDER,
      });
    } else {
      setHeroDoNow(null);
    }
  }, [selectedJob, setHeroDoNow]);

  const handleTranslate = useCallback(function () {
    const trimmed = promptInput.trim();
    if (trimmed === '') return;
    const result = parsePromptToFilters(trimmed);
    setProposed(result);
  }, [promptInput]);

  const handleApplyProposed = useCallback(function () {
    if (proposed === null) return;
    store.applyProposedFiltersFromPrompt(promptInput.trim(), proposed.filters);
    if (proposed.keywords.trim() !== '') {
      store.setLastQuery({
        keywords: proposed.keywords.trim(),
        location: store.lastQuery.location,
      });
    }
    storageSetJSON(PROMPT_TO_FILTERS_AUDIT_KEY, {
      promptText: promptInput.trim(),
      proposedFilters: proposed.filters,
      evidence: proposed.evidence,
      timestamp: new Date().toISOString(),
    });
    setProposed(null);
    setDescribePanelExpanded(false);
    store.runSearch();
    setShowUndoAppliedPrompt(true);
    setTimeout(function () {
      setShowUndoAppliedPrompt(false);
    }, 6000);
  }, [proposed, promptInput, store]);

  const handleDiscardProposed = useCallback(function () {
    setProposed(null);
  }, []);

  const handleSearch = useCallback(function () {
    store.runSearch();
  }, [store]);

  const handleReset = useCallback(function () {
    store.setLastQuery({ keywords: '', location: '' });
    store.clearAllFilters();
    store.setAppliedFromPrompt(null);
    store.setFilters({});
    store.setSelectedJob(null);
    store.clearSearchResults();
    setProposed(null);
    setDescribePanelExpanded(false);
    setViewAuditOpen(false);
    setShowUndoAppliedPrompt(false);
  }, [store]);

  const handleSelectJob = useCallback(
    function (id: string) {
      store.setSelectedJob(id);
    },
    [store]
  );

  const handleJobPeek = useCallback(
    function (job: Job | JobWithOverview) {
      const title = job.title !== undefined && job.title !== '' ? job.title : job.id;
      const excerpt =
        job.summary !== undefined && job.summary !== ''
          ? job.summary.length > 280 ? job.summary.slice(0, 277) + '...' : job.summary
          : (job.agency !== undefined ? job.agency : '') + (job.location !== undefined && job.location !== '' ? ' • ' + job.location : '') + '. No description available.';
      publishSelectionContext({
        screen: 'job-search',
        anchor: { type: 'job', id: job.id, label: title },
        payload: {
          title: 'Quick preview: ' + title,
          subtitle: job.agency !== undefined ? job.agency + (job.location ? ' • ' + job.location : '') : undefined,
          lines: [excerpt],
        },
        dedupeKey: 'peek:' + job.id,
      });
    },
    []
  );

  const handleSaveJob = useCallback(
    function (job: Job | JobWithOverview) {
      store.saveJob(job);
      const targetRole = {
        series: targetRoleStore.series,
        gsTarget: targetRoleStore.gsTarget,
        location: targetRoleStore.location,
        remotePreference: targetRoleStore.remotePreference,
      };
      const record = buildDecisionBriefRecord(job.id, job, targetRole, {
        skillsKeywords: [],
      });
      decisionBriefsStore.saveBrief(record);
      setToastMessage('Saved. PathOS Brief created.');
      setDetailsTab('pathosBrief');
      setTimeout(function () {
        setToastMessage(null);
      }, 3000);
    },
    [store, targetRoleStore, decisionBriefsStore]
  );

  const handleStartGuidedApply = useCallback(
    function () {
      if (selectedJob === undefined) return;
      const gaStore = loadGuidedApplyStore();
      const session = createSession(selectedJob.title, selectedJob.url !== undefined ? selectedJob.url : '');
      const updatedGaStore = addSession(gaStore, session);
      saveGuidedApplyStore(updatedGaStore);
      nav.push('/guided-apply');
    },
    [selectedJob, nav]
  );

  const interpretationParts: string[] = [];
  if (proposed !== null) {
    if (proposed.filters.remoteType !== undefined && proposed.filters.remoteType !== '') {
      interpretationParts.push(proposed.filters.remoteType + ' roles');
    }
    if (proposed.filters.gradeBand !== undefined && proposed.filters.gradeBand !== '') {
      interpretationParts.push(proposed.filters.gradeBand);
    }
    if (proposed.filters.agency !== undefined && proposed.filters.agency !== '') {
      interpretationParts.push(proposed.filters.agency);
    }
    if (proposed.filters.location !== undefined && proposed.filters.location !== '') {
      interpretationParts.push(proposed.filters.location + ' area');
    }
    if (proposed.keywords.trim() !== '') {
      interpretationParts.push("keywords '" + proposed.keywords.trim() + "'");
    }
  }
  const interpretationLine =
    proposed !== null && interpretationParts.length > 0
      ? 'Interpreted: ' + interpretationParts.join(', ') + '.'
      : proposed !== null
        ? 'Interpreted: (no structured filters extracted).'
        : '';

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--p-text-dim)' }}>
        <p className="text-sm">Loading job search...</p>
      </div>
    );
  }

  /* Scroll Invariant v1: workspace viewport is fixed-height under controls; results and details scroll internally; rail stays fixed. */
  return (
    <div className="flex flex-col h-full min-h-0 w-full" style={{ color: 'var(--p-text)' }}>
      {/* Top controls: natural height; stay above workspace viewport. */}
      <div className="flex-shrink-0">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--p-text)' }}>
          Job Search
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--p-text-muted)' }}>
          Explore roles, save targets, and reduce uncertainty.
        </p>
      </div>
      {toastMessage !== null && toastMessage !== '' ? (
        <div
          className="mx-4 mt-2 px-3 py-2 rounded text-sm"
          style={{ background: 'var(--p-accent-bg)', color: 'var(--p-accent)' }}
        >
          {toastMessage}
        </div>
      ) : null}

      {/* Search row: primary controls. Single Search button runs search (manual or after Apply). */}
      <div
        className="mx-4 mt-3 flex flex-wrap items-center gap-3"
        style={{ borderBottom: '1px solid var(--p-border)', paddingBottom: '12px' }}
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--p-text-dim)', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Job title, keywords, or series..."
            value={store.lastQuery.keywords}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              store.setLastQuery({
                keywords: e.target.value,
                location: store.lastQuery.location,
              });
            }}
            className="w-full pl-9 pr-3 py-2 text-sm rounded border bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] focus-visible:ring-inset transition-shadow"
            style={{
              borderColor: 'var(--p-border)',
              color: 'var(--p-text)',
              borderRadius: 'var(--p-radius)',
            }}
          />
        </div>
        <div className="flex items-center gap-2 min-w-[180px]">
          <input
            type="text"
            placeholder="Location (optional)"
            value={store.lastQuery.location !== undefined ? store.lastQuery.location : ''}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              store.setLastQuery({
                keywords: store.lastQuery.keywords,
                location: e.target.value.trim() !== '' ? e.target.value : undefined,
              });
            }}
            className="flex-1 min-w-0 px-3 py-2 text-sm rounded border bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] focus-visible:ring-inset transition-shadow"
            style={{
              borderColor: 'var(--p-border)',
              color: 'var(--p-text)',
              borderRadius: 'var(--p-radius)',
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className={INTERACTIVE_HOVER_CLASS + ' px-4 py-2 text-sm font-medium rounded'}
          style={{
            background: 'var(--p-accent)',
            color: 'var(--p-bg)',
            border: '1px solid transparent',
            borderRadius: 'var(--p-radius)',
          }}
        >
          Search
        </button>
        <button
          type="button"
          onClick={handleReset}
          className={INTERACTIVE_HOVER_CLASS + ' px-4 py-2 text-sm font-medium rounded'}
          style={{
            background: 'var(--p-surface2)',
            color: 'var(--p-text-muted)',
            border: '1px solid var(--p-border)',
            borderRadius: 'var(--p-radius)',
          }}
        >
          Reset
        </button>
        {/* Collapsed Describe CTA: subtle, secondary; expands to translate-to-filters panel. */}
        <button
          type="button"
          onClick={function () { setDescribePanelExpanded(!describePanelExpanded); }}
          className={INTERACTIVE_HOVER_CLASS + ' text-[12px] flex items-center gap-1 rounded px-1 py-0.5'}
          style={{ color: 'var(--p-text-dim)', border: '1px solid transparent' }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--p-accent)' }} />
          Describe what you want (optional)
        </button>
      </div>

      {/* Expanded Describe panel: same component as before, compact; no duplicate Search button. */}
      {describePanelExpanded ? (
        <div
          className="mx-4 mt-2 p-3 rounded-lg border"
          style={{
            background: 'var(--p-surface)',
            borderColor: 'var(--p-border)',
            borderRadius: 'var(--p-radius-lg)',
          }}
        >
          <input
            type="text"
            placeholder={PLACEHOLDER_PROMPT}
            value={promptInput}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              setPromptInput(e.target.value);
            }}
            className="w-full px-3 py-2 text-sm rounded border bg-transparent outline-none placeholder:opacity-60"
            style={{
              borderColor: 'var(--p-border)',
              color: 'var(--p-text)',
              borderRadius: 'var(--p-radius)',
            }}
          />
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <button
              type="button"
              onClick={function () { setPromptInput(PLACEHOLDER_PROMPT); }}
              className={INTERACTIVE_HOVER_CLASS + ' text-[12px] rounded px-0.5 py-0.5'}
              style={{ color: 'var(--p-accent)', border: '1px solid transparent' }}
            >
              Use example prompt
            </button>
            <span className="text-[12px]" style={{ color: 'var(--p-text-dim)' }}>·</span>
            <button
              type="button"
              onClick={function () { setTargetRoleModalOpen(true); }}
              className={INTERACTIVE_HOVER_CLASS + ' text-[12px] rounded px-0.5 py-0.5'}
              style={{ color: 'var(--p-accent)', border: '1px solid transparent' }}
            >
              Set target role
            </button>
          </div>
          {targetRoleModalOpen ? (
            <div
              className="mt-3 p-3 rounded border"
              style={{
                background: 'var(--p-surface2)',
                borderColor: 'var(--p-border)',
                borderRadius: 'var(--p-radius)',
              }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--p-text)' }}>Target role (for fit scoring)</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <input
                  type="text"
                  placeholder="Series (e.g. 2210)"
                  value={targetRoleStore.series !== undefined ? targetRoleStore.series : ''}
                  onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                    targetRoleStore.setTargetRole({
                      series: e.target.value.trim() !== '' ? e.target.value : undefined,
                      gsTarget: targetRoleStore.gsTarget,
                      location: targetRoleStore.location,
                      remotePreference: targetRoleStore.remotePreference,
                    });
                  }}
                  className="px-2 py-1.5 rounded border bg-transparent"
                  style={{ borderColor: 'var(--p-border)', color: 'var(--p-text)' }}
                />
                <input
                  type="text"
                  placeholder="GS target (e.g. GS-12)"
                  value={targetRoleStore.gsTarget !== undefined ? targetRoleStore.gsTarget : ''}
                  onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                    targetRoleStore.setTargetRole({
                      series: targetRoleStore.series,
                      gsTarget: e.target.value.trim() !== '' ? e.target.value : undefined,
                      location: targetRoleStore.location,
                      remotePreference: targetRoleStore.remotePreference,
                    });
                  }}
                  className="px-2 py-1.5 rounded border bg-transparent"
                  style={{ borderColor: 'var(--p-border)', color: 'var(--p-text)' }}
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={targetRoleStore.location !== undefined ? targetRoleStore.location : ''}
                  onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                    targetRoleStore.setTargetRole({
                      series: targetRoleStore.series,
                      gsTarget: targetRoleStore.gsTarget,
                      location: e.target.value.trim() !== '' ? e.target.value : undefined,
                      remotePreference: targetRoleStore.remotePreference,
                    });
                  }}
                  className="px-2 py-1.5 rounded border bg-transparent"
                  style={{ borderColor: 'var(--p-border)', color: 'var(--p-text)' }}
                />
                <input
                  type="text"
                  placeholder="Remote preference"
                  value={targetRoleStore.remotePreference !== undefined ? targetRoleStore.remotePreference : ''}
                  onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                    targetRoleStore.setTargetRole({
                      series: targetRoleStore.series,
                      gsTarget: targetRoleStore.gsTarget,
                      location: targetRoleStore.location,
                      remotePreference: e.target.value.trim() !== '' ? e.target.value : undefined,
                    });
                  }}
                  className="px-2 py-1.5 rounded border bg-transparent"
                  style={{ borderColor: 'var(--p-border)', color: 'var(--p-text)' }}
                />
              </div>
              <button
                type="button"
                onClick={function () { setTargetRoleModalOpen(false); }}
                className={INTERACTIVE_HOVER_CLASS + ' mt-2 text-xs rounded px-1 py-0.5'}
                style={{ color: 'var(--p-text-dim)', border: '1px solid transparent' }}
              >
                Done
              </button>
            </div>
          ) : null}
          <button
            type="button"
            disabled={promptInput.trim() === ''}
            onClick={handleTranslate}
            className={INTERACTIVE_HOVER_CLASS + ' mt-3 px-4 py-2 text-sm font-medium rounded'}
            style={{
              background: promptInput.trim() === '' ? 'var(--p-surface2)' : 'var(--p-surface2)',
              color: promptInput.trim() === '' ? 'var(--p-text-dim)' : 'var(--p-text)',
              border: '1px solid var(--p-border)',
              borderRadius: 'var(--p-radius)',
            }}
          >
            Translate to filters
          </button>

          {proposed !== null ? (
            <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--p-border)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--p-text-dim)' }}>
                Proposed filters
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {proposed.filters.gradeBand !== undefined && proposed.filters.gradeBand !== '' ? (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded"
                    style={{ background: 'var(--p-surface2)', color: 'var(--p-text-muted)' }}
                  >
                    {proposed.filters.gradeBand}
                  </span>
                ) : null}
                {proposed.filters.agency !== undefined && proposed.filters.agency !== '' ? (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded"
                    style={{ background: 'var(--p-surface2)', color: 'var(--p-text-muted)' }}
                  >
                    {proposed.filters.agency}
                  </span>
                ) : null}
                {proposed.filters.remoteType !== undefined && proposed.filters.remoteType !== '' ? (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded"
                    style={{ background: 'var(--p-surface2)', color: 'var(--p-text-muted)' }}
                  >
                    {proposed.filters.remoteType}
                  </span>
                ) : null}
                {proposed.filters.location !== undefined && proposed.filters.location !== '' ? (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded"
                    style={{ background: 'var(--p-surface2)', color: 'var(--p-text-muted)' }}
                  >
                    {proposed.filters.location}
                  </span>
                ) : null}
                {proposed.keywords.trim() !== '' ? (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded"
                    style={{ background: 'var(--p-surface2)', color: 'var(--p-text-muted)' }}
                  >
                    {proposed.keywords.trim()}
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] mb-3" style={{ color: 'var(--p-text-dim)' }}>
                {interpretationLine}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApplyProposed}
                  className={INTERACTIVE_HOVER_CLASS + ' px-3 py-1.5 text-sm font-medium rounded'}
                  style={{
                    background: 'var(--p-accent)',
                    color: 'var(--p-bg)',
                    border: '1px solid transparent',
                    borderRadius: 'var(--p-radius)',
                  }}
                >
                  Apply filters
                </button>
                <button
                  type="button"
                  onClick={function () {
                    setProposed(null);
                    setViewAuditOpen(false);
                  }}
                  className={INTERACTIVE_HOVER_CLASS + ' px-3 py-1.5 text-sm font-medium rounded'}
                  style={{
                    background: 'var(--p-surface2)',
                    color: 'var(--p-text-muted)',
                    border: '1px solid var(--p-border)',
                    borderRadius: 'var(--p-radius)',
                  }}
                >
                  Edit filters
                </button>
                <button
                  type="button"
                  onClick={handleDiscardProposed}
                  className={INTERACTIVE_HOVER_CLASS + ' px-3 py-1.5 text-sm font-medium rounded'}
                  style={{
                    background: 'var(--p-surface2)',
                    color: 'var(--p-text-muted)',
                    border: '1px solid var(--p-border)',
                    borderRadius: 'var(--p-radius)',
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {showUndoAppliedPrompt && store.appliedFromPrompt !== null && store.appliedFromPrompt !== undefined ? (
        <div className="mx-4 mt-2 flex items-center gap-2 px-3 py-2 rounded text-sm" style={{ background: 'var(--p-surface2)', color: 'var(--p-text-muted)' }}>
          <span>Filters applied from your description.</span>
          <button
            type="button"
            onClick={function () {
              store.clearAllFilters();
              store.setAppliedFromPrompt(null);
              store.setFilters({});
              store.persist();
              setShowUndoAppliedPrompt(false);
            }}
            className={INTERACTIVE_HOVER_CLASS + ' font-medium rounded px-1 py-0.5'}
            style={{ color: 'var(--p-accent)', border: '1px solid transparent' }}
          >
            Undo
          </button>
        </div>
      ) : null}

      {/* Sort by + Filters bar: token-styled portaled dropdowns (Overlay Rule v1). */}
      <div className="mx-4 mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--p-text-dim)' }}>Sort by</span>
        <FilterDropdown
          label="Sort"
          value={sortBy}
          options={SORT_OPTIONS.map(function (o) { return { value: o.value, label: o.label }; })}
          onSelect={function (v) {
              store.resetPaging();
              if (resultsScrollRef.current) resultsScrollRef.current.scrollTop = 0;
              setSortBy(v as JobSearchSortKind);
            }}
          tooltip={getSortTooltip(sortBy)}
        />
        <FilterDropdown
          label="Grades"
          value={store.filters.gradeBand !== undefined ? store.filters.gradeBand : ''}
          options={GRADE_OPTIONS}
          onSelect={function (v) {
            const next = Object.assign({}, store.filters);
            if (v === '') delete next.gradeBand;
            else next.gradeBand = v;
            store.setFilters(next);
          }}
          tooltip={getFilterGroupTooltip('Grades')}
        />
        <span className="flex items-center gap-1">
          <FilterDropdown
            label="Series"
            value={store.filters.series !== undefined && store.filters.series !== '' ? store.filters.series : ''}
            options={SERIES_OPTIONS}
            onSelect={function (v) {
              const next = Object.assign({}, store.filters);
              if (v === '') delete next.series;
              else next.series = v;
              store.setFilters(next);
            }}
            tooltip={getFilterGroupTooltip('Series')}
          />
          <Tooltip content="Open series guide. Browse federal series codes and apply one to your search." contentId="series-guide-btn">
            <button
              type="button"
              onClick={function () { setFilterGuideKind('series'); }}
              className={INTERACTIVE_HOVER_CLASS + ' inline-flex items-center justify-center w-7 h-7 rounded border shrink-0'}
              style={{
                borderColor: 'var(--p-border)',
                background: 'var(--p-surface)',
                color: 'var(--p-text-muted)',
              }}
              aria-label="Open series guide"
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden />
            </button>
          </Tooltip>
        </span>
        <span className="flex items-center gap-1">
          <FilterDropdown
            label="Agencies"
            value={store.filters.agency !== undefined ? store.filters.agency : ''}
            options={AGENCY_OPTIONS}
            onSelect={function (v) {
              const next = Object.assign({}, store.filters);
              if (v === '') delete next.agency;
              else next.agency = v;
              store.setFilters(next);
            }}
            tooltip={getFilterGroupTooltip('Agencies')}
          />
          <Tooltip content="Browse agencies and apply one to your search." contentId="agency-guide-btn">
            <button
              type="button"
              onClick={function () { setFilterGuideKind('agency'); }}
              className={INTERACTIVE_HOVER_CLASS + ' inline-flex items-center justify-center w-7 h-7 rounded border shrink-0'}
              style={{
                borderColor: 'var(--p-border)',
                background: 'var(--p-surface)',
                color: 'var(--p-text-muted)',
              }}
              aria-label="Open agency guide"
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden />
            </button>
          </Tooltip>
        </span>
        <span className="flex items-center gap-1">
          <FilterDropdown
            label="Location"
            value={store.filters.location !== undefined ? store.filters.location : ''}
            options={LOCATION_OPTIONS}
            onSelect={function (v) {
              const next = Object.assign({}, store.filters);
              if (v === '') delete next.location;
              else next.location = v;
              store.setFilters(next);
            }}
            tooltip={getFilterGroupTooltip('Location')}
          />
          <Tooltip content="Browse locations and apply one to your search." contentId="location-guide-btn">
            <button
              type="button"
              onClick={function () { setFilterGuideKind('location'); }}
              className={INTERACTIVE_HOVER_CLASS + ' inline-flex items-center justify-center w-7 h-7 rounded border shrink-0'}
              style={{
                borderColor: 'var(--p-border)',
                background: 'var(--p-surface)',
                color: 'var(--p-text-muted)',
              }}
              aria-label="Open location picker"
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden />
            </button>
          </Tooltip>
        </span>
        <FilterDropdown
          label="Types"
          value={store.filters.appointmentType !== undefined ? store.filters.appointmentType : ''}
          options={TYPES_OPTIONS}
          onSelect={function (v) {
            const next = Object.assign({}, store.filters);
            if (v === '') delete next.appointmentType;
            else next.appointmentType = v;
            store.setFilters(next);
          }}
          tooltip={getFilterGroupTooltip('Types')}
        />
        <Tooltip content="Remove all filter selections (grades, series, agency, location, type)" contentId="clear-all-filters">
        <button
          type="button"
          onClick={function () {
              store.resetPaging();
              if (resultsScrollRef.current) resultsScrollRef.current.scrollTop = 0;
              store.clearAllFilters();
            }}
          className={INTERACTIVE_HOVER_CLASS + ' text-xs px-2 py-1 rounded'}
          style={{ color: 'var(--p-text-dim)', border: '1px solid transparent' }}
        >
          Clear all filters
        </button>
        </Tooltip>
        {store.appliedFromPrompt !== null && store.appliedFromPrompt !== undefined ? (
          <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--p-text-dim)' }}>
            Applied from prompt
            <Tooltip content="View proposed filters and evidence applied from your description" contentId="applied-from-prompt-view">
            <button
              type="button"
              onClick={function () {
                setViewAuditOpen(!viewAuditOpen);
              }}
              className={INTERACTIVE_HOVER_CLASS + ' underline rounded px-0.5 py-0.5'}
              style={{ border: '1px solid transparent' }}
            >
              View
            </button>
            </Tooltip>
          </span>
        ) : null}
      </div>

      {viewAuditOpen && store.appliedFromPrompt !== null && store.appliedFromPrompt !== undefined ? (
        <AppliedFromPromptViewPanel
          promptText={store.appliedFromPrompt.promptText}
          onClose={function () { setViewAuditOpen(false); }}
        />
      ) : null}

      {/* Filter guide drawer: portaled to OverlayRoot. Series selection writes to store (single source of truth); dropdown reads store.filters.series so label updates immediately. */}
      {filterGuideKind !== null ? (
        <FilterGuideDrawer
          kind={filterGuideKind}
          open={true}
          onOpenChange={function (open) {
            if (!open) setFilterGuideKind(null);
          }}
          onApplySeries={filterGuideKind === 'series' ? function (seriesCode) {
            const next = Object.assign({}, store.filters);
            next.series = seriesCode;
            store.setFilters(next);
            store.runSearch();
          } : undefined}
          onApplyAgency={filterGuideKind === 'agency' ? function (agencyName) {
            const next = Object.assign({}, store.filters);
            next.agency = agencyName;
            store.setFilters(next);
            store.runSearch();
          } : undefined}
          onApplyLocation={filterGuideKind === 'location' ? function (locationValue) {
            const next = Object.assign({}, store.filters);
            next.location = locationValue;
            store.setFilters(next);
            store.runSearch();
          } : undefined}
        />
      ) : null}

      </div>

      {/* Workspace viewport: fills remaining height (flex-1 min-h-0 CRITICAL so panes can scroll).
       * Grid proportions aligned with Saved Jobs for layout parity:
       * left results column at ~30% (250-360px), detail workspace fills the rest. */}
      <div
        className="mt-3 grid gap-3.5 flex-1 min-h-0 px-4 pb-3"
        style={{
          gridTemplateColumns: 'clamp(250px, 30%, 360px) minmax(320px, 1fr)',
        }}
      >
        {/* Results pane: fixed-height column; status line above list; list scrolls independently. */}
        <div
          className="flex flex-col rounded-lg border min-w-0 h-full min-h-0"
          style={{
            borderColor: 'var(--p-border)',
            background: 'var(--p-surface)',
            borderRadius: 'var(--p-radius-lg)',
          }}
        >
          {/* Compact status line: "Showing 1–20 of 146" or "0 results". */}
          {store.hasSearched ? (
            <div
              className="flex-shrink-0 px-3 py-2 text-xs border-b"
              style={{ borderColor: 'var(--p-border)', color: 'var(--p-text-dim)' }}
            >
              {store.totalCount === 0
                ? '0 results'
                : 'Showing ' +
                  String(1) +
                  '–' +
                  String(store.results.length) +
                  ' of ' +
                  String(store.totalCount)}
            </div>
          ) : null}
          <div
            ref={resultsScrollRef}
            role="listbox"
            aria-label="Job search results"
            className="h-full min-h-0 overflow-y-auto flex-1"
            style={{ overscrollBehavior: 'contain' }}
          >
            {store.loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map(function (i) {
                  return (
                    <div
                      key={i}
                      className="h-16 rounded"
                      style={{ background: 'var(--p-surface2)' }}
                    />
                  );
                })}
              </div>
            ) : !store.hasSearched ? (
              <div
                className="flex flex-col items-center justify-center gap-3 p-8 text-center"
                style={{ color: 'var(--p-text-dim)' }}
              >
                <Inbox className="w-10 h-10 opacity-40" />
                <p className="text-sm">Run a search to view jobs.</p>
                <button
                  type="button"
                  onClick={function () { store.loadSampleJobs(); }}
                  className="px-4 py-2 text-sm font-medium rounded"
                  style={{
                    background: 'var(--p-surface2)',
                    color: 'var(--p-text)',
                    border: '1px solid var(--p-border)',
                    borderRadius: 'var(--p-radius)',
                  }}
                >
                  Load sample jobs
                </button>
              </div>
            ) : store.results.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-3 p-8 text-center"
                style={{ color: 'var(--p-text-dim)' }}
              >
                <Inbox className="w-10 h-10 opacity-40" />
                <p className="text-sm">No jobs found.</p>
                <p className="text-xs">Try broadening keywords or clearing filters.</p>
              </div>
            ) : (
              sortedResults.map(function (job) {
                const tag = MOCK_JOB_TAGS[job.id];
                const matchInfo = matchByJobId[job.id] !== undefined ? matchByJobId[job.id] : { matchLevel: 'Moderate' as MatchLevel, overallMatchScore: 50 };
                const riskFlags = getRiskFlagLabels(job);
                return (
                  <JobListItem
                    key={job.id}
                    job={job}
                    isSelected={store.selectedJobId === job.id}
                    isSaved={store.isJobSaved(job.id)}
                    matchInfo={matchInfo}
                    riskFlags={riskFlags}
                    tag={tag}
                    onSelect={handleSelectJob}
                    onSave={function () {
                      if (store.isJobSaved(job.id)) {
                        store.removeSavedJob(job.id);
                      } else {
                        handleSaveJob(job);
                      }
                    }}
                    onPeek={handleJobPeek}
                  />
                );
              })
            )}
            {/* Load more footer: full-width secondary button when hasMore; loading state; or "End of results". */}
            {store.hasSearched && store.results.length > 0 ? (
              <div className="flex-shrink-0 p-3 border-t" style={{ borderColor: 'var(--p-border)' }}>
                {store.isLoadingMore ? (
                  <div className="flex items-center justify-center gap-2 py-2" style={{ color: 'var(--p-text-dim)' }}>
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : store.hasMore ? (
                  <button
                    type="button"
                    onClick={function () { store.loadMore(); }}
                    className={INTERACTIVE_HOVER_CLASS + ' w-full py-2 text-sm font-medium rounded border'}
                    style={{
                      background: 'var(--p-surface2)',
                      color: 'var(--p-text-muted)',
                      borderColor: 'var(--p-border)',
                      borderRadius: 'var(--p-radius)',
                    }}
                  >
                    Load next {store.pageSize}
                  </button>
                ) : (
                  <p className="text-xs text-center py-1" style={{ color: 'var(--p-text-dim)' }}>
                    End of results
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Details pane: fixed-height column; content scrolls internally; action bar sticky at bottom. */}
        <div
          className="flex flex-col rounded-lg border min-w-0 h-full min-h-0"
          style={{
            borderColor: 'var(--p-border)',
            background: 'var(--p-surface)',
            borderRadius: 'var(--p-radius-lg)',
          }}
        >
          <JobDetailsPanel
            job={selectedJob}
            isSaved={selectedJob !== undefined ? store.isJobSaved(selectedJob.id) : false}
            activeTab={detailsTab}
            onTabChange={setDetailsTab}
            decisionBrief={selectedJob !== undefined ? decisionBriefsStore.getBrief(selectedJob.id) : null}
            snapshot={qualificationSnapshot}
            jobMatchSnapshot={jobMatchSnapshot}
            onSave={function () {
              if (selectedJob !== undefined) handleSaveJob(selectedJob);
            }}
            onTailor={function () {
              nav.push(RESUME_BUILDER);
            }}
            onAskPathAdvisor={function () {}}
            onOpenCareerReadinessActionPlan={function () {
              nav.push(CAREER_READINESS + '#action-plan');
            }}
            onExplainInPathAdvisor={function (snap: QualificationSnapshot) {
              if (selectedJob === undefined) return;
              openFitBriefing({
                type: 'fit',
                jobId: selectedJob.id,
                jobTitle: selectedJob.title,
                stars: snap.stars,
                confidence: snap.confidence,
                reasons: snap.reasons,
                blocker: snap.blocker,
                effort: snap.effort,
                risks: snap.risks,
                inputsUsed: snap.inputsUsed,
                missingInputs: snap.missingInputs,
                isJobSaved: store.isJobSaved(selectedJob.id),
              });
            }}
            onOpenDimensionBriefing={function (dim: JobMatchDimension) {
              if (jobMatchSnapshot === undefined || selectedJob === undefined) return;
              const payload = buildDimensionBriefingPayload(dim, jobMatchSnapshot, CAREER_READINESS + '#action-plan');
              const evidenceFound: string[] = [];
              const evidenceMissing: string[] = [];
              for (let s = 0; s < payload.sections.length; s++) {
                const sec = payload.sections[s];
                if (sec === undefined) continue;
                if (sec.heading === 'Evidence found') {
                  evidenceFound.push(sec.body);
                } else if (sec.heading === 'Evidence missing') {
                  evidenceMissing.push(sec.body);
                }
              }
              publishDimensionExplainContext({
                screen: 'job-search',
                anchor: { type: 'job', id: selectedJob.id, label: selectedJob.title !== undefined && selectedJob.title !== '' ? selectedJob.title : selectedJob.id },
                dimension: dim.label,
                payload: {
                  whatMeasures: [payload.sections[0] !== undefined ? payload.sections[0].body : ''],
                  yourSignal: payload.sections[1] !== undefined ? payload.sections[1].body : '',
                  evidenceFound: evidenceFound.length > 0 ? evidenceFound : undefined,
                  evidenceMissing: evidenceMissing.length > 0 ? evidenceMissing : undefined,
                  fastestFix: payload.sections[4] !== undefined ? payload.sections[4].body : undefined,
                  ctaLabel: payload.primaryCta !== undefined ? payload.primaryCta.label : undefined,
                  ctaRoute: payload.primaryCta !== undefined ? payload.primaryCta.route : undefined,
                },
                dedupeKey: 'dimension:' + dim.key + ':' + String(jobMatchSnapshot.overallMatchScore),
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
