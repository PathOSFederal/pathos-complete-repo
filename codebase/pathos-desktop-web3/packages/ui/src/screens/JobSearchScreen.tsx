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
import { CAREER_READINESS } from '../routes/routes';
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

  const rowBg =
    props.isSelected ? 'var(--p-surface2)' : (hover ? 'var(--p-surface2)' : 'transparent');

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
        <p className="text-sm font-medium truncate" style={{ color: 'var(--p-text)' }}>
          {props.job.title}
        </p>
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
// Job details panel — PathOS Snapshot (above tabs) + Tabs: Overview & Docs (default), Requirements, PathOS Brief
// ---------------------------------------------------------------------------

type DetailsTab = 'overview' | 'requirements' | 'pathosBrief';

function JobDetailsPanel(props: {
  job: Job | JobWithOverview | undefined;
  isSaved: boolean;
  activeTab: DetailsTab;
  onTabChange: (tab: DetailsTab) => void;
  decisionBrief: import('../stores/decisionBriefsV1Store').DecisionBriefRecord | null;
  /** Qualification snapshot for Snapshot panel; undefined when no job selected. Used for Explain in PathAdvisor fit briefing. */
  snapshot: QualificationSnapshot | undefined;
  /** Job Match Snapshot v1 (readiness ↔ job); when set, panel shows Match for this job + breakdown. */
  jobMatchSnapshot: JobMatchSnapshot | undefined;
  onSave: () => void;
  onTailor: () => void;
  onAskPathAdvisor: () => void;
  /** Open PathAdvisor rail with qualification briefing (no inline expansion). */
  onExplainInPathAdvisor: (snapshot: QualificationSnapshot) => void;
  /** Navigate to Career Readiness with #action-plan focus (e.g. for "Fix <gap>" CTA). */
  onOpenCareerReadinessActionPlan: () => void;
  /** Open PathAdvisor rail with dimension briefing for a Match Breakdown row. */
  onOpenDimensionBriefing: (dim: JobMatchDimension) => void;
}) {
  if (props.job === undefined || props.job === null) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 p-8"
        style={{ color: 'var(--p-text-dim)' }}
      >
        <Briefcase className="w-10 h-10 opacity-40" />
        <p className="text-sm">Select a job to view details</p>
      </div>
    );
  }

  const job = props.job;
  const usajobsUrl = job.url !== undefined && job.url !== '' ? job.url : 'https://www.usajobs.gov';
  const checklist = getChecklistForJob(job.id);
  const brief = props.decisionBrief;
  const snapshot = props.snapshot;
  const jobMatch = props.jobMatchSnapshot;
  const hasOverview = 'overview' in job && job.overview !== undefined;

  /* Meta chips: GS, Close date, Remote/Telework/Series if present (from summary/location). */
  const hasRemote = job.summary && job.summary.toLowerCase().indexOf('remote') !== -1;
  const hasTelework = job.summary && job.summary.toLowerCase().indexOf('telework') !== -1;
  const seriesMatch = job.summary && job.summary.match(/\bSeries\s+(\d+)\b/);
  const seriesLabel = seriesMatch ? seriesMatch[1] : null;

  /* Use longhand border only (no shorthand border) to avoid React warning when mixing with borderBottom. */
  const tabStyle = function (tab: DetailsTab) {
    const active = props.activeTab === tab;
    return {
      background: active ? 'var(--p-surface2)' : 'transparent',
      color: active ? 'var(--p-text)' : 'var(--p-text-muted)',
      borderTop: 'none',
      borderRight: 'none',
      borderLeft: 'none',
      borderBottom: active ? '2px solid var(--p-accent)' : '2px solid transparent',
      padding: '8px 12px',
      fontSize: '12px',
      fontWeight: active ? 600 : 400,
      cursor: 'pointer',
    } as React.CSSProperties;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Match for this job: Job Match Snapshot v1 (readiness ↔ job); local-only Match Breakdown. */}
      {jobMatch !== undefined ? (
        <div
          className="flex-shrink-0 px-4 pt-3 pb-3 border-b"
          style={{
            borderColor: 'var(--p-border)',
            background: 'var(--p-surface)',
          }}
        >
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--p-text-dim)' }}>
            Match for this job
          </h3>
          <div className="space-y-2">
            {/* Readiness vs Job match: both numbers visible to resolve confusion. */}
            <div className="flex flex-wrap items-baseline gap-3 text-[11px]">
              <span style={{ color: 'var(--p-text)' }}>
                Readiness: {String(jobMatch.overallReadinessScore)}/{String(jobMatch.overallReadinessMax)}
              </span>
              <span style={{ color: 'var(--p-text)' }}>
                Job match: {String(jobMatch.overallMatchScore)}/100 ({jobMatch.matchLevel})
              </span>
            </div>
            <p className="text-[10px]" style={{ color: 'var(--p-text-dim)' }}>
              Job match weights what this announcement emphasizes most.
            </p>
            {/* Match breakdown: 5 dimensions in consistent order; each row is interactive (opens dimension briefing in PathAdvisor). */}
            <div className="mt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--p-text-dim)' }}>
                Match breakdown
              </p>
              <ul className="list-none space-y-1" role="list">
                {jobMatch.dimensions.map(function (dim, i) {
                  const emphasisLevel = dim.demandWeight >= 0.25 ? 'High' : dim.demandWeight >= 0.18 ? 'Medium' : 'Low';
                  const gap = 100 - dim.matchScore;
                  const rowTooltip = 'User: ' + String(dim.readinessScore) + '/100 • Job emphasis: ' + emphasisLevel + ' • Gap: ' + String(gap);
                  return (
                    <li key={i} className="flex flex-wrap items-center gap-2 text-[11px]">
                      <Tooltip content={rowTooltip} contentId={'match-breakdown-dim-' + i}>
                        <button
                          type="button"
                          onClick={function () {
                            props.onOpenDimensionBriefing(dim);
                          }}
                          onKeyDown={function (e: React.KeyboardEvent) {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              props.onOpenDimensionBriefing(dim);
                            }
                          }}
                          className={INTERACTIVE_HOVER_CLASS + ' group flex flex-wrap items-center gap-2 w-full text-left rounded px-1 py-0.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] focus-visible:ring-inset border border-transparent hover:border-[var(--p-border)] hover:bg-[var(--p-surface2)]'}
                          style={{ background: 'transparent' }}
                          aria-label={'Open dimension details for ' + dim.label}
                        >
                          <span className="w-32 flex-shrink-0" style={{ color: 'var(--p-text)' }}>
                            {dim.label}
                          </span>
                          <span
                            className="text-[10px] px-1 py-0.5 rounded flex-shrink-0"
                            style={{
                              background: 'var(--p-surface2)',
                              color:
                                dim.status === 'Good'
                                  ? 'var(--p-success)'
                                  : dim.status === 'Mixed'
                                    ? 'var(--p-text-muted)'
                                    : 'var(--p-text-dim)',
                            }}
                          >
                            {dim.status}
                          </span>
                          <div
                            className="flex-1 min-w-[60px] h-1 rounded overflow-hidden max-w-[80px]"
                            style={{ background: 'var(--p-surface2)' }}
                            aria-hidden
                          >
                            <div
                              className="h-full rounded"
                              style={{
                                width: String(dim.matchScore) + '%',
                                background: 'var(--p-accent)',
                              }}
                            />
                          </div>
                          <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--p-text-dim)' }}>
                            User: {String(dim.readinessScore)}/100
                          </span>
                          <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--p-text-muted)' }}>
                            {dim.why}
                          </span>
                          <span className="flex-shrink-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 flex items-center" style={{ color: 'var(--p-text-dim)' }}>
                            <ChevronRight className="w-3.5 h-3.5" aria-hidden />
                          </span>
                        </button>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            </div>
            {/* Day 62: What you're missing and primary blocker moved to PathAdvisor Context Log. */}
            <p className="text-[10px] mt-2" style={{ color: 'var(--p-text-dim)' }}>
              Details appear in PathAdvisor.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {props.isSaved ? (
                <button
                  type="button"
                  onClick={props.onTailor}
                  className={INTERACTIVE_HOVER_CLASS + ' text-[11px] font-medium'}
                  style={{ color: 'var(--p-accent)' }}
                >
                  Start Tailoring
                </button>
              ) : (
                <button
                  type="button"
                  onClick={props.onSave}
                  className={INTERACTIVE_HOVER_CLASS + ' text-[11px] font-medium'}
                  style={{ color: 'var(--p-accent)' }}
                >
                  Save + Start Tailoring
                </button>
              )}
              <Tooltip content={'Open Career Readiness and focus Action Plan: ' + jobMatch.topJobRelevantGap.label} contentId="snapshot-open-career-readiness">
                <button
                  type="button"
                  onClick={props.onOpenCareerReadinessActionPlan}
                  className={INTERACTIVE_HOVER_CLASS + ' text-[11px] font-medium'}
                  style={{ color: 'var(--p-accent)' }}
                >
                  Open Career Readiness: Fix {jobMatch.topJobRelevantGap.label} (+{String(jobMatch.topJobRelevantGap.impactPoints)})
                </button>
              </Tooltip>
              {snapshot !== undefined ? (
                <Tooltip content="Open PathAdvisor rail with alignment summary, reasons, and next action." contentId="snapshot-explain-pathadvisor">
                  <button
                    type="button"
                    onClick={function () {
                      props.onExplainInPathAdvisor(snapshot);
                    }}
                    className={INTERACTIVE_HOVER_CLASS + ' text-[11px]'}
                    style={{ color: 'var(--p-text-muted)' }}
                  >
                    Explain this match
                  </button>
                </Tooltip>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab row: Overview & Docs (first/default) | Requirements | PathOS Brief */}
      <div
        className="flex border-b flex-shrink-0"
        style={{ borderColor: 'var(--p-border)', background: 'var(--p-surface)' }}
      >
        <button type="button" className={INTERACTIVE_HOVER_CLASS} onClick={function () { props.onTabChange('overview'); }} style={tabStyle('overview')}>
          Overview & Docs
        </button>
        <button type="button" className={INTERACTIVE_HOVER_CLASS} onClick={function () { props.onTabChange('requirements'); }} style={tabStyle('requirements')}>
          Requirements
        </button>
        <button type="button" className={INTERACTIVE_HOVER_CLASS} onClick={function () { props.onTabChange('pathosBrief'); }} style={tabStyle('pathosBrief')}>
          PathOS Brief
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5" style={{ lineHeight: 'var(--p-line-height-body)' }}>
        {props.activeTab === 'pathosBrief' ? (
          /* PathOS Brief tab: fit stars + confidence, risks, effort, 3 next actions; compact, no paragraphs */
          <div className="space-y-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--p-text)' }}>
              {job.title}
            </h2>
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
              <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>
                Save this job to generate a PathOS Brief (fit, risks, next actions).
              </p>
            )}
          </div>
        ) : props.activeTab === 'requirements' ? (
          /* Requirements tab: checklists only (no plain-English toggle) */
          <>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--p-text)' }}>{job.title}</h2>
            </div>
            {checklist !== null ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--p-text-dim)' }}>
                    Specialized experience
                  </h3>
                  <ul className="list-none space-y-1.5">
                    {checklist.specializedExperience.map(function (item, i) {
                      return (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--p-text-muted)' }}>
                          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--p-success)' }} aria-hidden />
                          {item}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--p-text-dim)' }}>
                    Skills & keywords
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {checklist.skillsKeywords.map(function (item, i) {
                      return (
                        <span key={i} className="text-[12px] px-2 py-1 rounded" style={{ background: 'var(--p-surface2)', color: 'var(--p-text-muted)' }}>
                          {item}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--p-text-dim)' }}>
                    Documents needed
                  </h3>
                  <ul className="list-none space-y-1">
                    {checklist.documentsNeeded.map(function (item, i) {
                      return (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--p-text-muted)' }}>
                          <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--p-success)' }} aria-hidden />
                          {item}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          /* Overview & Docs: Key Facts 2-col grid, Risk Flags chips, required docs, View on USAJOBS first */
          <>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--p-text)' }}>{job.title}</h2>
              <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>
                {job.agency}
                {job.location ? ' · ' + job.location : ''}
              </p>
            </div>
            {hasOverview && job.overview !== undefined ? (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {job.grade !== undefined && job.grade !== '' ? (
                    <>
                      <span style={{ color: 'var(--p-text-dim)' }}>Grade</span>
                      <span style={{ color: 'var(--p-text)' }}>{job.grade}</span>
                    </>
                  ) : null}
                  {job.overview.payRange !== undefined && job.overview.payRange !== '' ? (
                    <>
                      <span style={{ color: 'var(--p-text-dim)' }}>Pay range</span>
                      <span style={{ color: 'var(--p-text)' }}>{job.overview.payRange}</span>
                    </>
                  ) : null}
                  {job.overview.workSchedule !== undefined && job.overview.workSchedule !== '' ? (
                    <>
                      <span style={{ color: 'var(--p-text-dim)' }}>Schedule</span>
                      <span style={{ color: 'var(--p-text)' }}>{job.overview.workSchedule}</span>
                    </>
                  ) : null}
                  {job.overview.remoteJob !== undefined && job.overview.remoteJob !== '' ? (
                    <>
                      <span style={{ color: 'var(--p-text-dim)' }}>Remote</span>
                      <span style={{ color: 'var(--p-text)' }}>{job.overview.remoteJob}</span>
                    </>
                  ) : null}
                  {job.overview.promotionPotential !== undefined && job.overview.promotionPotential !== '' ? (
                    <>
                      <span style={{ color: 'var(--p-text-dim)' }}>Promotion potential</span>
                      <span style={{ color: 'var(--p-text)' }}>{job.overview.promotionPotential}</span>
                    </>
                  ) : null}
                  {job.overview.appointmentType !== undefined && job.overview.appointmentType !== '' ? (
                    <>
                      <span style={{ color: 'var(--p-text-dim)' }}>Appointment type</span>
                      <span style={{ color: 'var(--p-text)' }}>{job.overview.appointmentType}</span>
                    </>
                  ) : null}
                </div>
                {getRiskFlagLabels(job).length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {getRiskFlagLabels(job).map(function (label, i) {
                      const tip = chipTooltips[label] !== undefined ? chipTooltips[label] : '';
                      const chip = (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--p-surface2)', color: 'var(--p-text-dim)' }}>
                          {label}
                        </span>
                      );
                      return tip !== '' ? (
                        <Tooltip key={i} content={tip} contentId={'overview-risk-' + i}>
                          {chip}
                        </Tooltip>
                      ) : (
                        <span key={i}>{chip}</span>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : null}
            {checklist !== null ? (
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--p-text-dim)' }}>
                  Required documents
                </h3>
                <ul className="list-none space-y-1">
                  {checklist.documentsNeeded.map(function (item, i) {
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--p-text-muted)' }}>
                        <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--p-success)' }} aria-hidden />
                        {item}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            <p className="text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
              View on USAJOBS for full announcement. PathOS does not access your USAJOBS account.
            </p>
          </>
        )}
      </div>

      {/* Action bar: sticky at bottom of details panel so primary actions stay visible when scrolling. */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 border-t flex-shrink-0"
        style={{
          position: 'sticky',
          bottom: 0,
          borderColor: 'var(--p-border)',
          background: 'var(--p-surface)',
        }}
      >
        <Tooltip content={props.isSaved ? 'Saved to your list' : 'Save job and create PathOS Brief'} contentId="details-save-btn">
        <button
          type="button"
          onClick={props.isSaved ? function () {} : props.onSave}
          className={INTERACTIVE_HOVER_CLASS + ' inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded'}
          style={{
            background: props.isSaved ? 'var(--p-accent)' : 'var(--p-accent)',
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
          style={{
            background: 'var(--p-surface2)',
            color: 'var(--p-text-muted)',
            border: '1px solid var(--p-border)',
            borderRadius: 'var(--p-radius)',
          }}
        >
          Tailor resume
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
      <p className="text-[11px] px-4 pb-2" style={{ color: 'var(--p-text-dim)' }}>
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
      helperParagraph:
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
        nav.push('/dashboard/resume-readiness');
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
        route: '/dashboard/resume-readiness',
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
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--p-text-dim)' }} />
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
            className="flex-1 min-w-0 px-3 py-2 text-sm rounded border bg-transparent outline-none"
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
            className="flex-1 min-w-0 px-3 py-2 text-sm rounded border bg-transparent outline-none"
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
      <p className="text-[11px] mx-4 mt-0.5" style={{ color: 'var(--p-text-dim)' }}>
        PathOS will translate it into filters you can review.
      </p>

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

      <p className="text-[11px] mx-4 mt-1" style={{ color: 'var(--p-text-dim)' }} title="Sorted by selected option; order is deterministic and reproducible.">
        Results shown from saved snapshots (mock). Sorted by {sortBy === 'likelihood' ? 'Likelihood of success (fit score)' : sortBy === 'effortToReward' ? 'Effort-to-reward' : sortBy === 'strategic' ? 'Strategic value' : 'Urgency (close date)'}.
      </p>

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

      {/* Workspace viewport: fills remaining height (flex-1 min-h-0 CRITICAL so panes can scroll). */}
      <div
        className="mt-4 grid gap-4 flex-1 min-h-0"
        style={{
          gridTemplateColumns: 'clamp(480px, 38vw, 560px) minmax(420px, 1fr)',
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
              nav.push('/dashboard/resume-readiness');
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
