/**
 * ============================================================================
 * SAVED JOBS SCREEN — PathOS decision workspace for saved federal job listings
 * ============================================================================
 *
 * PURPOSE: This screen lives at /dashboard/saved-jobs and provides users with
 * a workspace to review, search, sort, and act on their locally saved jobs.
 * It is designed as a decision workspace — not a generic favorites list.
 *
 * ARCHITECTURE:
 *   Route:    app/(shared)/dashboard/saved-jobs/page.tsx  (thin wrapper)
 *   Shell:    SharedDashboardRouteShell (provides app shell + PathAdvisor rail)
 *   This file: primary implementation surface for all page-level UX.
 *
 * DATA SOURCE:
 *   Reads from @pathos/core saved-jobs store (localStorage key: pathos:saved-jobs-store).
 *   Local-first and deterministic — no remote fetch dependencies.
 *   Mutations write back via saveSavedJobsStore() on every change.
 *   Cross-tab sync is handled via the window 'storage' event listener.
 *
 * TRUST-FIRST:
 *   No credentials, no scraping, no auto-apply.
 *   USAJOBS links open externally in the user's browser.
 *   Microcopy in the header and action footer reinforces this explicitly.
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 */

'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bookmark,
  ExternalLink,
  Trash2,
  ClipboardList,
  MapPin,
  Building2,
  DollarSign,
  Search,
  ArrowUpDown,
  Shield,
  Calendar,
  Filter,
  Check,
  Star,
  AlertTriangle,
  Clock,
  TrendingUp,
  BarChart2,
  FileText,
} from 'lucide-react';
import { useNav } from '@pathos/adapters';
import { CAREER_READINESS, RESUME_BUILDER } from '../routes/routes';
import {
  loadSavedJobsStore,
  saveSavedJobsStore,
  removeSavedJob,
  selectSavedJob,
  createSession,
  addSession,
  loadGuidedApplyStore,
  saveGuidedApplyStore,
  seedSavedJobsIfEmpty,
  SAVED_JOBS_STORE_KEY,
} from '@pathos/core';
import type { Job, SavedJobsStore, SavedJobStatus } from '@pathos/core';
import { AskPathAdvisorButton } from '../components/AskPathAdvisorButton';
import { usePathAdvisorScreenOverridesStore } from '../stores/pathAdvisorScreenOverridesStore';
import {
  usePathAdvisorContextLogStore,
  buildAnchorKey,
} from '../stores/pathAdvisorContextLogStore';
import type { PathAdvisorContextEntry } from '../stores/pathAdvisorContextLogStore';
import { INTERACTIVE_HOVER_CLASS } from '../styles/interactiveHover';
import { scoreTierColor } from '../styles/scoreTiers';
import { MatchBreakdownHeader, MatchBreakdownRow } from '../components/MatchBreakdownTable';
import type { MatchBreakdownRowData } from '../components/MatchBreakdownTable';
import {
  buildDimensionBriefingPayload,
  DimensionKey,
  JobMatchDimension,
  JobMatchSnapshot,
  MatchLevel,
} from '../lib/jobMatchSnapshot';
import { publishDimensionExplainContext } from '../lib/pathAdvisorPublish';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Valid sort keys for the saved jobs list.
 * 'date-desc' is the default — mirrors the prepend-order new saves use in storage helpers.
 */
type SortKey = 'date-desc' | 'date-asc' | 'title' | 'agency';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for SavedJobsScreen; currently no required props. */
export type SavedJobsScreenProps = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Local derived-data helpers
// ---------------------------------------------------------------------------

/**
 * Count jobs saved within the last N calendar days.
 * Used for the "Saved This Week" and "Last 30 Days" metrics in the summary strip.
 * Entirely local — no remote calls.
 */
function countRecentJobs(jobs: Job[], days: number): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  let count = 0;
  for (let i = 0; i < jobs.length; i++) {
    if (new Date(jobs[i].savedAt) >= cutoff) count++;
  }
  return count;
}

/**
 * Count distinct agencies across all saved jobs.
 * Gives users a quick sense of how many agencies they are tracking.
 */
function countUniqueAgencies(jobs: Job[]): number {
  const seen = new Set<string>();
  for (let i = 0; i < jobs.length; i++) {
    seen.add(jobs[i].agency);
  }
  return seen.size;
}

/**
 * Filter saved jobs by a free-text query.
 * Matches title, agency, and location case-insensitively.
 * Returns the original array reference unchanged when the query is empty
 * (avoids unnecessary allocation on every render).
 */
function filterJobs(jobs: Job[], query: string): Job[] {
  const q = query.trim().toLowerCase();
  if (!q) return jobs;
  const result: Job[] = [];
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    if (
      j.title.toLowerCase().includes(q) ||
      j.agency.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q)
    ) {
      result.push(j);
    }
  }
  return result;
}

/**
 * Sort saved jobs by the given sort key.
 * Returns a new array; never mutates the input.
 * Stable: equal elements retain their original relative order (slice + sort).
 */
function sortJobs(jobs: Job[], key: SortKey): Job[] {
  const copy = jobs.slice();
  switch (key) {
    case 'date-desc':
      // Newest first — default, mirrors how addSavedJob prepends to the list.
      return copy.sort(function (a, b) {
        return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
      });
    case 'date-asc':
      return copy.sort(function (a, b) {
        return new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
      });
    case 'title':
      return copy.sort(function (a, b) {
        return a.title.localeCompare(b.title);
      });
    case 'agency':
      return copy.sort(function (a, b) {
        return a.agency.localeCompare(b.agency);
      });
    default:
      return copy;
  }
}

/** Human-readable labels for each sort key; used in the sort dropdown. */
const SORT_LABELS: Record<SortKey, string> = {
  'date-desc': 'Newest first',
  'date-asc': 'Oldest first',
  'title': 'Title A–Z',
  'agency': 'Agency A–Z',
};

const ALL_SORT_KEYS: SortKey[] = ['date-desc', 'date-asc', 'title', 'agency'];

// ---------------------------------------------------------------------------
// PathAdvisor screen overrides
// ---------------------------------------------------------------------------

/**
 * Suggested prompts shown in the PathAdvisor rail when the Saved Jobs screen
 * is active. These prompt the user toward useful decision actions.
 * Set via usePathAdvisorScreenOverridesStore on mount; cleared on unmount.
 */
const SAVED_JOBS_ADVISOR_PROMPTS = [
  'Compare this against my other saved jobs',
  'Tell me what to improve before applying',
  'Help tailor my resume for this role',
  'Which saved job should I prioritize?',
];

// ---------------------------------------------------------------------------
// Sub-component: Summary metrics strip
// ---------------------------------------------------------------------------

/**
 * Count jobs by optional status for the mockup-aligned metrics strip.
 * Only jobs with the given status are counted; no inferred status.
 */
function countByStatus(jobs: Job[], status: SavedJobStatus): number {
  let count = 0;
  for (let i = 0; i < jobs.length; i++) {
    if (jobs[i].status === status) count++;
  }
  return count;
}

/**
 * Summary metrics strip — five large tile cards (mockup-aligned).
 * Each tile: rounded, dark bg, subtle border — count dominant (large bold number),
 * label below it, icon in a larger container to the left.
 * Total Saved, Ready to Apply, Needs Review, High Match, Recently Saved.
 *
 * SIZING: These are meant to read as meaningful summary tiles, not compact chips.
 * The mockup shows generous padding, prominent numbers, and clear labels.
 */
function MetricsStrip(props: { jobs: Job[] }) {
  const total = props.jobs.length;
  const readyToApply = countByStatus(props.jobs, 'ready');
  const needsReview = countByStatus(props.jobs, 'needs-review');
  const highMatch = countByStatus(props.jobs, 'high-match');
  const recentlySaved = countRecentJobs(props.jobs, 7);

  return (
    <div
      className="flex items-stretch gap-3 px-4 py-3 flex-shrink-0"
      style={{ borderBottom: '1px solid var(--p-border)' }}
    >
      <MetricItem
        icon={<Bookmark className="w-4 h-4" />}
        label="Total Saved"
        value={String(total)}
      />
      <MetricItem
        icon={<Check className="w-4 h-4" />}
        label="Ready to Apply"
        value={String(readyToApply)}
        valueColor="var(--p-success)"
      />
      <MetricItem
        icon={<AlertTriangle className="w-4 h-4" />}
        label="Needs Review"
        value={String(needsReview)}
        valueColor="var(--p-warning, #eab308)"
      />
      <MetricItem
        icon={<Star className="w-4 h-4" />}
        label="High Match"
        value={String(highMatch)}
        valueColor="var(--p-accent)"
      />
      <MetricItem
        icon={<Clock className="w-4 h-4" />}
        label="Recently Saved"
        value={String(recentlySaved)}
        valueColor="var(--p-accent-muted, #3b82f6)"
      />
    </div>
  );
}

/**
 * A single metric tile in the summary strip.
 * Larger than previous: bigger padding, bigger number, bigger icon container.
 * Mockup parity: the number should be the most visually prominent element,
 * with the label directly below and the icon as a supporting visual cue.
 */
function MetricItem(props: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  const valueStyle = props.valueColor
    ? { color: props.valueColor }
    : { color: 'var(--p-text)' };
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 rounded-lg flex-1 min-w-0"
      style={{
        background: 'var(--p-surface2)',
        border: '1px solid var(--p-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div
        className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--p-surface)', color: 'var(--p-text-muted)' }}
      >
        {props.icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums leading-none" style={valueStyle}>
          {props.value}
        </p>
        <p className="text-[11px] mt-1 leading-none truncate" style={{ color: 'var(--p-text-dim)' }}>
          {props.label}
        </p>
      </div>
    </div>
  );
}

/** Human-readable label for SavedJobStatus for list card tags. */
const STATUS_LABELS: Record<SavedJobStatus, string> = {
  'ready': 'Ready to Apply',
  'needs-review': 'Needs Review',
  'high-match': 'High Match',
  'backup': 'Backup',
};

/**
 * Returns true if job has a close date within the next N days (for "Apply Soon").
 * Parses closeDate as ISO or locale date string.
 */
function isCloseDateSoon(closeDate: string | undefined, withinDays: number): boolean {
  if (!closeDate) return false;
  const parsed = new Date(closeDate);
  if (isNaN(parsed.getTime())) return false;
  const now = new Date();
  const diff = parsed.getTime() - now.getTime();
  const days = diff / (24 * 60 * 60 * 1000);
  return days >= 0 && days <= withinDays;
}

/**
 * A single row in the left-pane saved jobs list.
 *
 * INTERACTION MODEL — matches Job Search JobListItem:
 *   - Entire row is click target for selection.
 *   - Two compact icon buttons on the right side: quick preview + remove.
 *   - No expanding inline buttons. No row height change on select/hover.
 *
 * THEME PARITY with Job Search JobListItem:
 *   - Unselected: transparent bg; hover: surface2 bg (explicit mouse tracking).
 *   - Selected: accent-tinted bg (warmer than surface2, distinct from hover).
 *   - 3px left-edge accent bar on selected (scan signal).
 *   - Grade badge: accent-bg/accent. Other chips: surface2/text-dim.
 */
function SavedJobItem(props: {
  job: Job;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const job = props.job;
  const isSelected = props.isSelected;
  const [hover, setHover] = useState(false);

  const savedDate = new Date(job.savedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  /* Readiness score derived from matchScore — displayed as a prominent scan-level
   * badge in the title row so users can compare readiness across the list. */
  const readiness = deriveReadinessScore(job.matchScore);

  /* Mockup parity: selected uses accent-tinted background (warmer, more distinct than surface2).
   * Unselected: transparent. Hover: subtle surface2.
   * The accent tint uses color-mix to blend a low percentage of accent into surface,
   * creating the warm selection treatment visible in the approved mockup. */
  const rowBg = isSelected
    ? 'color-mix(in srgb, var(--p-accent) 8%, var(--p-surface))'
    : (hover ? 'var(--p-surface2)' : 'transparent');

  return (
    <div
      role="option"
      aria-selected={isSelected}
      className="border-b last:border-b-0 flex items-stretch min-h-[80px] cursor-pointer relative focus-within:ring-2 focus-within:ring-[var(--p-accent)] focus-within:ring-inset"
      style={{
        borderColor: 'var(--p-border)',
        background: rowBg,
        color: 'var(--p-text)',
      }}
      onMouseEnter={function () { setHover(true); }}
      onMouseLeave={function () { setHover(false); }}
      onClick={function () { props.onSelect(job.id); }}
    >
      {/* 3px left accent bar on selected — stronger scan signal matching mockup selection treatment */}
      <div
        className="absolute inset-y-0 left-0 w-[3px] flex-shrink-0"
        style={{ background: isSelected ? 'var(--p-accent)' : 'transparent' }}
        aria-hidden
      />

      {/* Main content area: title with readiness badge, agency, chips, saved date.
       * Fixed layout — never expands. Readiness badge is on the title line for
       * immediate scan visibility, stronger than low-priority metadata. */}
      <div
        className="flex-1 min-w-0 text-left pl-[calc(0.75rem+3px)] pr-1 py-2.5 flex flex-col justify-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] focus-visible:ring-inset"
        tabIndex={0}
        onKeyDown={function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            props.onSelect(job.id);
          }
        }}
      >
        {/* Title row: job title left, readiness score pill right.
         * The readiness pill is the strongest scan signal in each row — bold,
         * color-coded, rounded-full — so users can scan down the list and
         * immediately see readiness levels without selecting each job. */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p
            className="text-sm font-medium truncate leading-snug flex-1 min-w-0"
            style={{ color: 'var(--p-text)' }}
          >
            {job.title}
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

        {/* Agency + location on one line (matches Job Search compact format) */}
        <p
          className="text-xs mt-0.5 truncate"
          style={{ color: 'var(--p-text-muted)' }}
        >
          {job.agency}
          {job.location ? ' \u2022 ' + job.location : ''}
        </p>

        {/* Chips row: grade badge + status tag + urgent close date */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {job.grade ? (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ background: 'var(--p-accent-bg)', color: 'var(--p-accent)' }}
            >
              {job.grade}
            </span>
          ) : null}
          {job.status ? (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none"
              style={{
                background: 'var(--p-surface2)',
                color: 'var(--p-text-muted)',
              }}
            >
              {STATUS_LABELS[job.status]}
            </span>
          ) : null}
          {job.closeDate && isCloseDateSoon(job.closeDate, 14) ? (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--p-accent-bg)',
                color: 'var(--p-accent)',
              }}
            >
              Closes {job.closeDate}
            </span>
          ) : null}
        </div>

        {/* Saved date */}
        <p className="text-[10px] mt-1" style={{ color: 'var(--p-text-dim)' }}>
          Saved on {savedDate}
        </p>
      </div>

      {/* Right-side action: trash icon only, vertically centered.
       * No chevron, no expanding buttons, no extra icons. Row height stays stable.
       * Readiness score is now in the title row for better scan visibility. */}
      <div className="flex items-center justify-center pr-2 flex-shrink-0">
        <button
          type="button"
          onClick={function (e: React.MouseEvent) {
            e.stopPropagation();
            props.onRemove(job.id);
          }}
          onKeyDown={function (e: React.KeyboardEvent) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              props.onRemove(job.id);
            }
          }}
          className={INTERACTIVE_HOVER_CLASS + ' flex-shrink-0 p-1.5 rounded'}
          aria-label={'Remove ' + job.title + ' from saved'}
          style={{ color: 'var(--p-text-dim)', border: '1px solid transparent' }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Detail workspace (main pane)
// ---------------------------------------------------------------------------

/**
 * Derive job-specific consideration bullets from available job data.
 * These give the Readiness & Considerations section realistic, data-driven
 * content rather than generic hardcoded bullets. Each bullet is derived from
 * actual fields on the Job record so it reads as a meaningful evaluation cue.
 */
function deriveConsiderationBullets(job: Job): string[] {
  const bullets: string[] = [];

  /* Match-based considerations: strong vs moderate vs stretch. */
  const score = job.matchScore;
  if (score !== undefined && score !== null) {
    if (score >= 85) {
      bullets.push('Strong match on specialized experience requirements.');
    } else if (score >= 70) {
      bullets.push('Moderate alignment — consider adding evidence or examples to strengthen your application.');
    } else {
      bullets.push('Stretch opportunity — review required qualifications carefully before applying.');
    }
  }

  /* Close-date urgency: if the closing date is within 14 days, flag it. */
  if (isCloseDateSoon(job.closeDate, 14)) {
    bullets.push('Close date approaching — prioritize this if you intend to apply.');
  } else if (job.closeDate) {
    bullets.push('Closing ' + job.closeDate + ' — you have time to prepare a strong application.');
  }

  /* Resume tailoring cue based on summary content. */
  if (job.summary) {
    const lower = job.summary.toLowerCase();
    if (lower.indexOf('resume') !== -1 || lower.indexOf('tailor') !== -1) {
      bullets.push('Resume tailoring recommended — check that your experience statements match this role\'s language.');
    }
    if (lower.indexOf('stakeholder') !== -1 || lower.indexOf('coordination') !== -1 || lower.indexOf('interagency') !== -1) {
      bullets.push('Review resume for stakeholder coordination and cross-agency collaboration examples.');
    }
    if (lower.indexOf('clearance') !== -1 || lower.indexOf('security') !== -1) {
      bullets.push('Security or clearance requirements may apply — verify your eligibility before applying.');
    }
  }

  /* Telework/remote position consideration. */
  if (job.telework === 'Remote') {
    bullets.push('Fully remote position — confirm your resume includes remote work readiness signals.');
  } else if (job.telework) {
    bullets.push('Telework eligible — review the agency\'s specific telework policy before applying.');
  }

  /* Appointment type consideration for non-permanent. */
  if (job.appointmentType && job.appointmentType.toLowerCase().indexOf('term') !== -1) {
    bullets.push('Term appointment — consider career timeline and conversion potential.');
  }

  /* Ensure we always have at least 3 bullets for visual density. */
  if (bullets.length < 3) {
    bullets.push('Use Guided Apply to build a structured, targeted application for this position.');
  }

  return bullets;
}

/**
 * Derive a synthetic readiness score from match score.
 * In a full system this would come from Career Readiness; for content-density
 * evaluation this derives a plausible readiness value from the match score.
 * Always returns a number so the detail workspace can show both scores.
 */
export function deriveReadinessScore(matchScore: number | undefined): number {
  if (matchScore === undefined || matchScore === null) return 70;
  /* Readiness tends to track match but isn't identical. Offset slightly. */
  const base = Math.round(matchScore * 0.85 + 10);
  return base > 100 ? 100 : base;
}

// ---------------------------------------------------------------------------
// Match Overview — weighted dimensional breakdown for decision support
// ---------------------------------------------------------------------------

/**
 * A single dimension in the match intelligence breakdown.
 * Each dimension represents one axis of fit between user and job.
 * The UI renders these as horizontal bars with labels, scores, emphasis
 * indicators, and gap assessments — giving users a scannable, decision-oriented
 * view of WHY they match or don't match, not just a single number.
 *
 * Fields:
 *   label       — human-readable name (e.g. "Target Alignment")
 *   score       — user's score on this dimension (0–100), drives bar fill width
 *   weight      — dimension weight in overall match (0–1, sums to ~1.0)
 *   jobEmphasis — how much this job demands this dimension ("High" | "Medium" | "Low")
 *   gapState    — user gap assessment ("Strong" | "Adequate" | "Gap")
 */
interface MatchDimension {
  label: string;
  score: number;
  weight: number;
  jobEmphasis: string;
  gapState: string;
}

/**
 * Derive weighted match dimensions from a job's data.
 *
 * Produces five scored dimensions so users can see which aspects of the
 * job they are strong on and where gaps exist. Each dimension includes
 * a score (for the bar), a weight (for context on importance), a job
 * emphasis level, and a gap assessment.
 *
 * Dimensions:
 *   1. Target Alignment (35%) — career target alignment
 *   2. Specialized Experience (25%) — depth of qualifying experience
 *   3. Resume Evidence (20%) — resume-to-announcement documentation strength
 *   4. Keywords Coverage (12%) — keyword overlap with announcement
 *   5. Leadership / Scope (8%) — supervisory and program scope match
 *
 * All scores use deterministic offsets from the base matchScore. No randomness.
 * In production these would come from NLP/scoring engine analysis.
 */
function deriveMatchDimensions(job: Job): MatchDimension[] {
  const base = (job.matchScore !== undefined && job.matchScore !== null) ? job.matchScore : 65;

  /* Clamp helper: keeps dimension scores within 0–100. */
  const clamp = function (v: number): number {
    if (v < 0) return 0;
    if (v > 100) return 100;
    return Math.round(v);
  };

  /* Helper: derive gap state from a score. Thresholds:
   * >=80 = Strong (user is well-positioned), >=60 = Adequate, <60 = Gap. */
  const toGap = function (s: number): string {
    if (s >= 80) return 'Strong';
    if (s >= 60) return 'Adequate';
    return 'Gap';
  };

  /* 1. Target Alignment: slightly higher for strong matches, lower for stretches. */
  const targetAlignment = clamp(base + (base >= 80 ? 5 : -3));

  /* 2. Specialized Experience: offset by grade-level indicator. */
  let expOffset = 0;
  if (job.grade) {
    const gradeMatch = job.grade.match(/GS-(\d+)/);
    if (gradeMatch) {
      const gradeNum = parseInt(gradeMatch[1], 10);
      expOffset = gradeNum >= 13 ? 4 : (gradeNum >= 11 ? 1 : -2);
    }
  }
  const specializedExperience = clamp(base + expOffset - 2);

  /* 3. Resume Evidence: slightly below base — resume alignment is usually the gap. */
  const resumeEvidence = clamp(base - 5);

  /* 4. Keywords Coverage: slightly above for roles with detailed summaries. */
  const keywordsOffset = (job.summary && job.summary.length > 100) ? 6 : -1;
  const keywordsCoverage = clamp(base + keywordsOffset);

  /* 5. Leadership / Scope: lower for entry-level, higher for senior. */
  let leadershipOffset = -4;
  let leadershipEmphasis = 'Medium';
  if (job.grade) {
    const gradeMatch = job.grade.match(/GS-(\d+)/);
    if (gradeMatch) {
      const gradeNum = parseInt(gradeMatch[1], 10);
      if (gradeNum >= 14) {
        leadershipOffset = 8;
        leadershipEmphasis = 'High';
      } else if (gradeNum >= 12) {
        leadershipOffset = 3;
      } else {
        leadershipOffset = -4;
        leadershipEmphasis = 'Low';
      }
    }
  }
  const leadershipScope = clamp(base + leadershipOffset);

  return [
    { label: 'Target Alignment', score: targetAlignment, weight: 0.35, jobEmphasis: 'High', gapState: toGap(targetAlignment) },
    { label: 'Specialized Experience', score: specializedExperience, weight: 0.25, jobEmphasis: base >= 80 ? 'High' : 'Medium', gapState: toGap(specializedExperience) },
    { label: 'Resume Evidence', score: resumeEvidence, weight: 0.20, jobEmphasis: 'High', gapState: toGap(resumeEvidence) },
    { label: 'Keywords Coverage', score: keywordsCoverage, weight: 0.12, jobEmphasis: 'Medium', gapState: toGap(keywordsCoverage) },
    { label: 'Leadership / Scope', score: leadershipScope, weight: 0.08, jobEmphasis: leadershipEmphasis, gapState: toGap(leadershipScope) },
  ];
}

/* Score-to-color mapping now uses the shared scoreTierColor() from
 * styles/scoreTiers.ts. The previous local dimensionScoreColor() used
 * accent (blue) for medium and warning (amber) for weak; the shared
 * function uses the correct green → amber → red severity scale:
 *   >=80: --p-success (green)
 *   >=60: --p-warning (amber)
 *   <60:  --p-danger  (red)
 * This ensures the same score always renders in the same color across
 * Saved Jobs, Job Search, and any future surface. */

// ---------------------------------------------------------------------------
// Match Overview — compact summary derivation
// ---------------------------------------------------------------------------

/**
 * Compact summary of match intelligence for the summary row.
 * Distills the weighted dimension breakdown into four scannable data points:
 *   1. readiness — from deriveReadinessScore
 *   2. weightedFit — weighted sum of all dimension scores (0-100)
 *   3. limitingFactor — the dimension with the lowest score (user's weakest axis)
 *   4. topAction — a short recommended action string based on the limiting factor
 *
 * This summary sits above the dimension bars so users can scan the headline
 * without reading each bar individually.
 */
interface MatchSummary {
  readiness: number;
  weightedFit: number;
  limitingFactor: string;
  topAction: string;
}

/**
 * Derive the compact match summary for a job.
 * Pulls readiness from deriveReadinessScore and computes a weighted fit
 * score by summing dim.score * dim.weight across all dimensions. The
 * limiting factor is the dimension with the lowest raw score. The top
 * action is a short recommendation derived from the limiting factor's
 * score tier and label.
 */
export function deriveMatchSummary(job: Job): MatchSummary {
  const readiness = deriveReadinessScore(job.matchScore);
  const dims = deriveMatchDimensions(job);

  /* Compute weighted fit: sum of (score * weight) across dimensions. */
  let weightedFit = 0;
  for (let i = 0; i < dims.length; i++) {
    weightedFit = weightedFit + (dims[i].score * dims[i].weight);
  }
  weightedFit = Math.round(weightedFit);

  /* Find the dimension with the lowest score — that is the limiting factor. */
  let lowestIdx = 0;
  for (let i = 1; i < dims.length; i++) {
    if (dims[i].score < dims[lowestIdx].score) {
      lowestIdx = i;
    }
  }
  const limitingDim = dims[lowestIdx];
  const limitingFactor = limitingDim.label;

  /* Derive a short action string based on the limiting factor's score tier.
   * Keeps the summary actionable, not just diagnostic. */
  let topAction: string;
  if (limitingDim.score >= 80) {
    topAction = 'All dimensions strong — proceed with confidence.';
  } else if (limitingDim.score >= 60) {
    topAction = 'Strengthen ' + limitingFactor.toLowerCase() + ' evidence in your resume.';
  } else {
    topAction = 'Address ' + limitingFactor.toLowerCase() + ' gap before applying.';
  }

  return {
    readiness: readiness,
    weightedFit: weightedFit,
    limitingFactor: limitingFactor,
    topAction: topAction,
  };
}

function mapSavedJobStatusToMatchLevel(status: SavedJobStatus | undefined): MatchLevel {
  if (status === 'high-match' || status === 'ready') return 'Strong';
  if (status === 'needs-review') return 'Moderate';
  if (status === 'backup') return 'Stretch';
  return 'Moderate';
}

const DIMENSION_LABEL_TO_KEY: Record<string, DimensionKey> = {
  'Target Alignment': 'Target Alignment',
  'Specialized Experience': 'Specialized Experience',
  'Resume Evidence': 'Resume Evidence',
  'Keywords Coverage': 'Keywords Coverage',
  'Leadership / Scope': 'Leadership & Scope',
};

function dimensionLabelToKey(label: string): DimensionKey {
  return DIMENSION_LABEL_TO_KEY[label] !== undefined ? DIMENSION_LABEL_TO_KEY[label] : 'Target Alignment';
}

function convertMatchDimensionToJobMatchDimension(dim: MatchDimension): JobMatchDimension {
  const status: 'Good' | 'Mixed' | 'Weak' =
    dim.score >= 80 ? 'Good' : (dim.score >= 60 ? 'Mixed' : 'Weak');
  return {
    key: dimensionLabelToKey(dim.label),
    label: dim.label,
    readinessScore: dim.score,
    demandWeight: dim.weight,
    matchScore: dim.score,
    status: status,
    why: `${dim.gapState} gap state • ${dim.jobEmphasis} emphasis`,
  };
}

export function buildSavedJobMatchSnapshot(job: Job, dims: MatchDimension[], summary: MatchSummary): JobMatchSnapshot {
  const matchScore = job.matchScore !== undefined && job.matchScore !== null ? job.matchScore : 70;
  let lowestScore = 100;
  for (let i = 0; i < dims.length; i++) {
    if (dims[i].score < lowestScore) lowestScore = dims[i].score;
  }
  const impactPoints = Math.max(1, Math.round((100 - lowestScore) / 5));
  return {
    matchLevel: mapSavedJobStatusToMatchLevel(job.status),
    overallMatchScore: matchScore,
    overallReadinessScore: summary.readiness,
    overallReadinessMax: 100,
    primaryBlocker: summary.topAction,
    topJobRelevantGap: {
      label: summary.limitingFactor,
      impactPoints: impactPoints,
    },
    missingEvidence: [],
    dimensions: dims.map(convertMatchDimensionToJobMatchDimension),
    audit: {
      rulesFired: ['saved-jobs-match-overview'],
      localOnly: true,
    },
  };
}

// ---------------------------------------------------------------------------
// Detail view mode — Match Overview vs Job Overview
// ---------------------------------------------------------------------------

/**
 * The two content modes available in the selected-job detail workspace.
 *   - 'decision': shows job details, match intelligence, key considerations,
 *     compact recommendation — the default analytical view.
 *   - 'announcement': shows a compact federal-announcement reading workspace
 *     with selectable sections so users can inspect the official listing
 *     without leaving PathOS.
 */
export type DetailViewMode = 'decision' | 'announcement';

/**
 * Keys for the selectable sections in Job Overview.
 * Each section corresponds to a standard USAJOBS announcement section.
 * 'overview' is the default — combines Summary + Duties for a decision-relevant
 * starting point.
 */
export type AnnouncementSectionKey =
  | 'overview'
  | 'qualifications'
  | 'requirements'
  | 'documents'
  | 'how-to-apply'
  | 'evaluation'
  | 'benefits'
  | 'additional';

/**
 * A single announcement section's metadata and mock content.
 * Each section has a machine key, a human-readable label for the tab bar,
 * and multi-paragraph content resembling a real federal announcement.
 */
interface AnnouncementSectionDef {
  key: AnnouncementSectionKey;
  label: string;
  content: string;
}

function getModeTabId(mode: DetailViewMode): string {
  return 'saved-job-mode-tab-' + mode;
}

function getModePanelId(mode: DetailViewMode): string {
  return 'saved-job-mode-panel-' + mode;
}

function getAnnouncementTabId(sectionKey: AnnouncementSectionKey): string {
  return 'saved-job-announcement-tab-' + sectionKey;
}

function getAnnouncementPanelId(sectionKey: AnnouncementSectionKey): string {
  return 'saved-job-announcement-panel-' + sectionKey;
}

// ---------------------------------------------------------------------------
// Mock announcement content — realistic federal-announcement text
// ---------------------------------------------------------------------------

/**
 * Generate deterministic mock announcement sections for a saved job.
 *
 * PURPOSE: Provide enough information-dense federal announcement content
 * so the Job Overview layout and reading experience can be properly
 * evaluated. Text resembles real USAJOBS announcement structure and tone
 * without being copied from any actual listing.
 *
 * Each section is 100-250 words to test reading flow and scrolling behavior.
 * The content adapts to the job's title, agency, and grade where possible
 * so it reads as a plausible announcement for that specific position.
 *
 * Returns an array of 8 sections in the standard USAJOBS order.
 */
function getAnnouncementSections(job: Job): AnnouncementSectionDef[] {
  const title = job.title;
  const agency = job.agency;
  const grade = job.grade || 'the advertised grade';
  const location = job.location;

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
        '- If you experience technical difficulties with the application system, contact the Help Desk at mgshelp@monster.com before the closing date.\n\n' +
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

// ---------------------------------------------------------------------------
// PathOS Brief — structured decision-intelligence content
// ---------------------------------------------------------------------------

/**
 * Structured brief content returned by deriveBriefContent.
 * Each field maps to a sub-section inside the PathOS Brief panel.
 * All fields are strings so the UI can render them without further logic.
 */
interface BriefContent {
  roleFitSummary: string;
  strategicRelevance: string;
  strengths: string[];
  risks: string[];
  careerTrajectory: string;
  timingSignal: string;
  recommendation: string;
}

/**
 * Derive structured PathOS Brief content from a saved job's data.
 *
 * In a full system this would combine career intelligence, user profile data,
 * and labor-market signals. For content-density evaluation this derives
 * realistic, plausible decision-intelligence content from the fields available
 * on the Job record. Every section adapts to the data present; no generic
 * filler is used — content is always grounded in visible job attributes.
 */
function deriveBriefContent(job: Job): BriefContent {
  const score = job.matchScore;
  const hasScore = score !== undefined && score !== null;
  const readiness = deriveReadinessScore(score);
  const isSoon = isCloseDateSoon(job.closeDate, 14);

  /* Role Fit Summary: one concise sentence combining match quality and agency. */
  let roleFitSummary: string;
  if (hasScore && score >= 85) {
    roleFitSummary = 'Strong alignment with your profile. Your experience maps directly to ' + job.agency + '\'s requirements for this ' + job.title + ' role.';
  } else if (hasScore && score >= 70) {
    roleFitSummary = 'Solid alignment with moderate gaps. Your background covers most requirements for this ' + job.title + ' position at ' + job.agency + ', with a few areas to strengthen.';
  } else if (hasScore) {
    roleFitSummary = 'Stretch opportunity. This ' + job.title + ' role at ' + job.agency + ' extends beyond your current profile but may be worth pursuing strategically.';
  } else {
    roleFitSummary = 'This ' + job.title + ' position at ' + job.agency + ' aligns with your saved criteria. Review the requirements to confirm fit.';
  }

  /* Strategic Relevance: why this role matters for this user's trajectory. */
  let strategicRelevance: string;
  if (job.grade) {
    const gradeMatch = job.grade.match(/GS-(\d+)/);
    const gradeNum = gradeMatch ? parseInt(gradeMatch[1], 10) : 0;
    if (gradeNum >= 13) {
      strategicRelevance = 'Senior-level position (' + job.grade + ') with direct decision-making scope. Positions at this grade typically carry supervisory or program management responsibilities that strengthen executive-track competitiveness.';
    } else if (gradeNum >= 11) {
      strategicRelevance = 'Mid-career position (' + job.grade + ') at a grade that builds toward senior leadership eligibility. Success here establishes the specialized experience base required for GS-13+ roles.';
    } else {
      strategicRelevance = 'Entry-to-mid level position (' + job.grade + '). A solid foundation role for building federal career trajectory and accumulating qualifying experience.';
    }
  } else {
    strategicRelevance = 'Federal position at ' + job.agency + '. Evaluate grade, promotion potential, and mission alignment to assess strategic fit.';
  }

  /* Strengths: specific advantages PathOS identifies from the user's profile context. */
  const strengths: string[] = [];
  if (hasScore && score >= 80) {
    strengths.push('High match score (' + String(score) + '/100) indicates strong keyword and qualification alignment with the announcement.');
  }
  if (readiness >= 80) {
    strengths.push('Profile readiness (' + String(readiness) + '/100) suggests your resume already addresses most core requirements.');
  }
  if (job.telework === 'Remote') {
    strengths.push('Fully remote — removes geographic constraints and expands your competitive pool positioning.');
  }
  if (job.summary) {
    const lower = job.summary.toLowerCase();
    if (lower.indexOf('stakeholder') !== -1 || lower.indexOf('coordination') !== -1) {
      strengths.push('Your cross-functional coordination experience is directly relevant to this role\'s stakeholder requirements.');
    }
    if (lower.indexOf('analysis') !== -1 || lower.indexOf('analytical') !== -1) {
      strengths.push('Analytical skill emphasis aligns well with your demonstrated competencies.');
    }
  }
  if (strengths.length === 0) {
    strengths.push('Your saved criteria match this position\'s core profile. Review the announcement to identify specific experience statements to highlight.');
  }

  /* Risks: honest assessment of gaps or concerns. */
  const risks: string[] = [];
  if (hasScore && score < 70) {
    risks.push('Below-threshold match score — consider whether your specialized experience fully covers the minimum qualifications.');
  }
  if (readiness < 70) {
    risks.push('Profile readiness below 70 — you may need to add targeted experience bullets or certifications before applying.');
  }
  if (job.appointmentType && job.appointmentType.toLowerCase().indexOf('term') !== -1) {
    risks.push('Term appointment — limited duration. Evaluate conversion likelihood and career continuity before committing.');
  }
  if (job.summary) {
    const lower = job.summary.toLowerCase();
    if (lower.indexOf('clearance') !== -1 || lower.indexOf('security') !== -1) {
      risks.push('Security clearance likely required — verify eligibility and expect longer onboarding timeline.');
    }
  }
  if (isSoon) {
    risks.push('Close date within 14 days — limited time to tailor your application effectively.');
  }
  if (risks.length === 0) {
    risks.push('No significant risks identified from available data. Verify qualifications against the full announcement.');
  }

  /* Career Trajectory: upside signal based on grade and appointment data. */
  let careerTrajectory: string;
  if (job.grade) {
    const gradeMatch = job.grade.match(/GS-(\d+)/);
    if (gradeMatch) {
      const current = parseInt(gradeMatch[1], 10);
      const next = current + 1;
      if (next <= 15) {
        careerTrajectory = 'Promotion potential to GS-' + String(next) + '. At ' + job.agency + ', typical time-in-grade for ' + job.grade + ' to GS-' + String(next) + ' is 1–2 years with demonstrated performance.';
      } else {
        careerTrajectory = 'At GS-15, lateral movement into SES-feeder positions or cross-agency leadership roles is the primary advancement path.';
      }
    } else {
      careerTrajectory = 'Review the announcement for promotion potential and career ladder information.';
    }
  } else {
    careerTrajectory = 'Grade and promotion potential not specified. Confirm career ladder details in the full announcement before applying.';
  }

  /* Timing Signal: urgency and window assessment. */
  let timingSignal: string;
  if (isSoon) {
    timingSignal = 'Closing soon (' + (job.closeDate || '') + '). If you intend to apply, begin tailoring your resume and assembling documents now. Delay risks missing this window.';
  } else if (job.closeDate) {
    timingSignal = 'Open until ' + job.closeDate + '. You have time to prepare a strong, tailored application. Use this window to align your resume with the announcement language.';
  } else {
    timingSignal = 'No close date specified — the position may be open continuous or have a rolling deadline. Check the official listing for current status.';
  }

  /* Recommendation: concise pursuit rationale. */
  let recommendation: string;
  if (hasScore && score >= 85 && isSoon) {
    recommendation = 'High priority. Strong match and approaching deadline — start Guided Apply now to submit a competitive application before the window closes.';
  } else if (hasScore && score >= 85) {
    recommendation = 'Recommended. Strong alignment across qualifications and readiness. Use Guided Apply to build a targeted application at your pace.';
  } else if (hasScore && score >= 70) {
    recommendation = 'Worth pursuing. Moderate match with addressable gaps. Consider tailoring your resume to close the alignment delta before applying.';
  } else if (hasScore) {
    recommendation = 'Evaluate carefully. This is a stretch role — weigh the strategic value against the preparation effort required to submit a competitive application.';
  } else {
    recommendation = 'Review the full announcement to confirm alignment, then use Guided Apply to build a structured application.';
  }

  return {
    roleFitSummary: roleFitSummary,
    strategicRelevance: strategicRelevance,
    strengths: strengths,
    risks: risks,
    careerTrajectory: careerTrajectory,
    timingSignal: timingSignal,
    recommendation: recommendation,
  };
}

// ---------------------------------------------------------------------------
// Sub-component: WorkspaceModeTab — professional underline mode switch tab
// ---------------------------------------------------------------------------

/**
 * A single tab in the top-level workspace mode switch (Match Overview / Job Overview).
 *
 * WHY A DEDICATED COMPONENT: The mode switch uses an underline-accent tab pattern
 * (selected = accent text + 2px bottom bar, unselected = dim text). This pattern
 * requires hover, focus-visible, active, and selected states that differ from the
 * background-fill hover provided by INTERACTIVE_HOVER_CLASS. Managing hover and
 * active state per-tab via useState gives precise control over how each state
 * layer (hover, active, selected) composes visually without conflict.
 *
 * INTERACTION STATES (per Interaction-State Standard in cursor-house-rules.md):
 *   hover (not selected): text brightens from dim to muted; faint underline appears
 *   hover (selected): text stays accent; underline stays accent — no visual regression
 *   focus-visible: standard accent ring via :focus-visible
 *   active/pressed: brief opacity reduction (0.75) confirming the click registered
 *   selected: accent text + 2px accent bottom bar + subtle accent bg tint —
 *             persistent, visually stronger than hover, survives hover overlay
 *
 * DESIGN INTENT: Reads as a workspace mode switch, not a marketing pill button.
 * Professional, restrained, and serious — matching the tone of a decision workspace.
 * The subtle accent bg tint on the selected tab provides a secondary signal beyond
 * color alone (per the interaction-state standard: "must not rely on color alone").
 */
function WorkspaceModeTab(props: {
  label: string;
  isSelected: boolean;
  id: string;
  controlsId: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  /* Text color logic:
   * - Selected: always accent (strongest signal, survives hover)
   * - Hover (not selected): brightens to muted (noticeable but weaker than selected)
   * - Default: dim (resting state) */
  const textColor = props.isSelected
    ? 'var(--p-accent)'
    : (hover ? 'var(--p-text-muted)' : 'var(--p-text-dim)');

  /* Underline color logic:
   * - Selected: accent bar (persistent, strongest indicator)
   * - Hover (not selected): dim bar (subtle hint that this is interactive)
   * - Default: transparent (clean, uncluttered resting state) */
  const underlineColor = props.isSelected
    ? 'var(--p-accent)'
    : (hover ? 'var(--p-text-dim)' : 'transparent');

  /* Active (pressed) state: brief opacity reduction to confirm the click.
   * Returns to full opacity on mouseUp. */
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
      {/* Underline bar: 2px accent bar at the bottom edge for selected state;
       * dim bar on hover; transparent at rest. transition-all smooths the
       * appearance/disappearance for a polished workspace feel. */}
      <span
        className="absolute bottom-0 left-0 right-0 h-[2px] transition-all"
        style={{ background: underlineColor }}
        aria-hidden="true"
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: AnnouncementSectionTab — professional document section nav
// ---------------------------------------------------------------------------

/**
 * A single tab in the announcement section navigation row.
 *
 * WHY A DEDICATED COMPONENT: Same rationale as WorkspaceModeTab — underline-accent
 * document navigation needs managed hover/active states that differ from generic
 * button hover. This component is slightly smaller and lighter than the mode switch
 * tabs because it represents section-level navigation within a mode, not top-level
 * mode switching. The visual weight hierarchy is: mode switch > section nav.
 *
 * INTERACTION STATES:
 *   hover (not selected): text brightens; subtle underline hint
 *   hover (selected): text stays accent; underline stays — no regression
 *   focus-visible: accent ring
 *   active/pressed: opacity reduction confirming click
 *   selected: accent text + 2px accent underline + faint accent bg tint — persistent
 *
 * DESIGN INTENT: Reads as serious document section navigation, not playful filter
 * chips. Matches the mode switch pattern for visual consistency within the workspace.
 */
function AnnouncementSectionTab(props: {
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

/**
 * Main detail workspace for the selected saved job.
 *
 * TWO CONTENT MODES (Match Overview / Job Overview):
 *   Match Overview (default) — analytical workspace for evaluating the job:
 *     1. Job Information Header (title, agency, readiness badge, match badge)
 *     2. Job Details (compact key-value grid: location, grade, salary, etc.)
 *     3. Match Overview (summary row + weighted dimension bars + considerations)
 *     4. Action row (Guided Apply, Open Official Listing, Ask PathAdvisor, Remove)
 *     5. Trust footer
 *
 *   Job Overview — compact reading workspace for the official listing:
 *     1. Job Information Header (same as Match Overview — always visible)
 *     2. Section selector tab bar (8 standard USAJOBS announcement sections)
 *     3. Selected section content (dense, realistic mock federal text)
 *     4. Action row (same as Match Overview — always visible)
 *     5. Trust footer
 *
 * The mode toggle sits below the job header so both modes share the same
 * title/agency/readiness context. Default is Match Overview.
 *
 * REMOVED SECTIONS (no longer in either view):
 *   - PathOS Brief: intelligence moved to PathAdvisor context log
 *   - Position Details / Required Documents: absorbed into Job Details and
 *     Job Overview respectively
 *
 * Action hierarchy:
 *   1. Guided Apply        — primary accent fill
 *   2. Open Official Listing — secondary ghost/outlined
 *   3. Ask PathAdvisor     — tertiary (CTA for the always-visible rail)
 *   4. Remove from Saved   — danger outlined, visually last
 */
export type SavedJobDetailsProps = {
  job: Job | undefined;
  onRemove: () => void;
  onStartGuidedApply: () => void;
  onBuildResume: () => void;
  onAskPathAdvisor: () => void;
  initialViewMode?: DetailViewMode;
  initialAnnouncementSection?: AnnouncementSectionKey;
};

export function SavedJobDetails(props: SavedJobDetailsProps) {
  /* No-selection state — shown when no job is selected OR when the selected job
   * has been filtered out of the current search results. */
  if (!props.job) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center"
        style={{ color: 'var(--p-text-dim)' }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'var(--p-surface2)' }}
        >
          <Bookmark className="w-6 h-6 opacity-50" />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--p-text-muted)' }}>
          Select a saved job to view details
        </p>
        <p className="text-xs max-w-xs" style={{ color: 'var(--p-text-dim)' }}>
          Choose a position from the list on the left to review it and decide on next steps.
        </p>
      </div>
    );
  }

  return (
    <SavedJobDetailsContent
      key={
        props.job.id +
        '|' +
        (props.initialViewMode ? props.initialViewMode : 'decision') +
        '|' +
        (props.initialAnnouncementSection ? props.initialAnnouncementSection : 'overview')
      }
      job={props.job}
      onRemove={props.onRemove}
      onStartGuidedApply={props.onStartGuidedApply}
      onBuildResume={props.onBuildResume}
      onAskPathAdvisor={props.onAskPathAdvisor}
      initialViewMode={props.initialViewMode}
      initialAnnouncementSection={props.initialAnnouncementSection}
    />
  );
}

type SavedJobDetailsContentProps = {
  job: Job;
  onRemove: () => void;
  onStartGuidedApply: () => void;
  onBuildResume: () => void;
  onAskPathAdvisor: () => void;
  initialViewMode?: DetailViewMode;
  initialAnnouncementSection?: AnnouncementSectionKey;
};

function SavedJobDetailsContent(props: SavedJobDetailsContentProps) {
  const job = props.job;
  const usajobsUrl = job.url ? job.url : 'https://www.usajobs.gov';

  /* ── View mode state ──────────────────────────────────────────────────
   * Controls whether the detail panel shows Match Overview (analytical) or
   * Job Overview (reading workspace). Resets to 'decision' whenever
   * the selected job changes so the user always lands on the default view. */
  const initialViewMode = props.initialViewMode ? props.initialViewMode : 'decision';
  const initialAnnouncementSection = props.initialAnnouncementSection
    ? props.initialAnnouncementSection
    : 'overview';
  const [viewMode, setViewMode] = useState<DetailViewMode>(initialViewMode);

  /* Announcement section state: which section is active in Job Overview.
   * Default is 'overview' (Role Overview) — the most decision-relevant starting point. */
  const [announcementSection, setAnnouncementSection] = useState<AnnouncementSectionKey>(initialAnnouncementSection);

  /* Derived scores and bullets for the Readiness & Considerations section. */
  const hasMatchScore = job.matchScore !== undefined && job.matchScore !== null;
  const readinessScore = deriveReadinessScore(job.matchScore);
  const matchScoreColor = hasMatchScore ? scoreTierColor(job.matchScore as number) : 'var(--p-text-muted)';
  const considerationBullets = deriveConsiderationBullets(job);

  /* Compact match summary — headline-level summary of match intelligence. */
  const matchSummary = deriveMatchSummary(job);
  const matchDims = deriveMatchDimensions(job);
  const jobMatchSnapshot = buildSavedJobMatchSnapshot(job, matchDims, matchSummary);

  /* Close-date urgency check — used by Job Details and consideration bullets. */
  const isSoon = isCloseDateSoon(job.closeDate, 14);

  /* Status label for the header area (when present). */
  const statusLabel = job.status ? STATUS_LABELS[job.status] : null;

  /* Announcement sections for the reading workspace. Generated per-job so
   * content references the job's title, agency, and grade for realism. */
  const announcementSections = getAnnouncementSections(job);

  /* Find the active announcement section content. Explicit loop to avoid ?.
   * Default to first section if key not found. */
  let activeAnnouncementContent = '';
  for (let i = 0; i < announcementSections.length; i++) {
    if (announcementSections[i].key === announcementSection) {
      activeAnnouncementContent = announcementSections[i].content;
      break;
    }
  }
  if (activeAnnouncementContent === '' && announcementSections.length > 0) {
    activeAnnouncementContent = announcementSections[0].content;
  }

  return (
    /* WORKSPACE FRAME: flex column fills the available card height.
     * The structural zones (header, mode strip, section nav, action bar)
     * use flex-shrink-0 so they remain fixed in place. Only the content
     * viewport in the middle scrolls via overflow-y-auto. This prevents
     * the action bar from drifting vertically when switching between
     * shorter and longer content sections or between view modes. */
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── FIXED ZONE 1: Job header — title, agency, readiness badge, match badge ──
       * flex-shrink-0 keeps this zone at its natural height regardless of
       * how much content is in the scrollable viewport below. */}
      <div
        className="px-5 pt-4 pb-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--p-border)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold leading-snug" style={{ color: 'var(--p-text)' }}>
              {job.title}
            </h2>
            <p className="text-sm mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--p-text-muted)' }}>
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--p-accent)' }} />
              {job.agency}
            </p>
          </div>
          {/* Right side of header: large readiness badge only.
           * The readiness score is the sole dominant visual element here.
           * Grade is NOT shown in this emphasis corner — it belongs in Job Details below.
           * Match badge sits next to readiness for quick comparison. */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Large readiness score — primary scan signal in the detail header.
             * Color-coded by score tier for instant visual assessment. */}
            <div
              className="flex flex-col items-center px-3 py-2 rounded-lg"
              style={{
                background: 'color-mix(in srgb, ' + scoreTierColor(readinessScore) + ' 10%, var(--p-surface))',
                border: '1px solid color-mix(in srgb, ' + scoreTierColor(readinessScore) + ' 20%, var(--p-border))',
              }}
            >
              <span
                className="text-2xl font-bold tabular-nums leading-none"
                style={{ color: scoreTierColor(readinessScore) }}
              >
                {String(readinessScore)}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider mt-1 leading-none" style={{ color: 'var(--p-text-dim)' }}>
                Readiness
              </span>
            </div>
            {hasMatchScore ? (
              <span
                className="text-sm font-semibold tabular-nums px-2 py-1 rounded-md"
                style={{
                  color: matchScoreColor,
                  background: 'color-mix(in srgb, ' + matchScoreColor + ' 10%, transparent)',
                }}
              >
                {String(job.matchScore)}/100 Match
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── FIXED ZONE 2: Workspace mode strip ─────────────────────────────
       * High-level mode selector for switching between Match Overview
       * (analytical assessment) and Job Overview (official listing reader).
       *
       * REDESIGN: Now uses WorkspaceModeTab components with explicit per-tab
       * hover, active, and selected state management. Each tab tracks its own
       * mouse/keyboard interaction state via useState, providing:
       *   - hover: text brightens + subtle underline hint (not bg-fill)
       *   - focus-visible: accent ring (keyboard accessibility)
       *   - active/pressed: brief opacity reduction
       *   - selected: accent text + 2px accent bar + subtle accent bg tint
       *
       * WHY THIS DESIGN OVER INTERACTIVE_HOVER_CLASS: INTERACTIVE_HOVER_CLASS
       * applies a background-fill on hover, which conflicts with the underline
       * tab visual language. Underline tabs communicate "mode switch," not
       * "action button." The per-tab state management gives precise control
       * over how selected and hover compose without visual regression.
       *
       * flex-shrink-0 keeps this zone pinned at its natural height. */}
      <div
        className="flex items-stretch flex-shrink-0"
        style={{ borderBottom: '1px solid var(--p-border)' }}
        role="tablist"
        aria-label="Detail view mode"
      >
        <WorkspaceModeTab
          label="Match Overview"
          id={getModeTabId('decision')}
          controlsId={getModePanelId('decision')}
          isSelected={viewMode === 'decision'}
          onClick={function () { setViewMode('decision'); }}
        />
        <WorkspaceModeTab
          label="Job Overview"
          id={getModeTabId('announcement')}
          controlsId={getModePanelId('announcement')}
          isSelected={viewMode === 'announcement'}
          onClick={function () { setViewMode('announcement'); }}
        />
      </div>

      {/* ── FIXED ZONE 3: Job Overview section navigation ──────────────────
       * Visible only in Job Overview mode. Professional document-navigation
       * row using AnnouncementSectionTab components with explicit per-tab
       * hover, active, and selected state management.
       *
       * REDESIGN: Each section tab manages its own interaction states for
       * precise control. Selected section gets accent text + 2px underline
       * + subtle bg tint; hover brightens text + shows subtle underline hint.
       * Pattern matches the mode switch above for visual consistency.
       *
       * WHY NOT INTERACTIVE_HOVER_CLASS: Same reasoning as the mode strip —
       * background-fill hover conflicts with underline tab semantics. Section
       * navigation inside a federal announcement should read like navigating
       * a serious document, not selecting playful filter chips.
       *
       * flex-shrink-0 keeps this row fixed; content scrolls independently below. */}
      {viewMode === 'announcement' ? (
        <div
          className="flex items-stretch overflow-x-auto flex-shrink-0 px-3"
          style={{ borderBottom: '1px solid var(--p-border)' }}
          role="tablist"
          aria-label="Job Overview sections"
        >
          {announcementSections.map(function (sec) {
            return (
              <AnnouncementSectionTab
                key={sec.key}
                label={sec.label}
                id={getAnnouncementTabId(sec.key)}
                controlsId={getAnnouncementPanelId(sec.key)}
                sectionKey={sec.key}
                isActive={sec.key === announcementSection}
                onClick={function () { setAnnouncementSection(sec.key); }}
              />
            );
          })}
        </div>
      ) : null}

      {/* ── SCROLLABLE CONTENT VIEWPORT ──────────────────────────────────
       * This is the only region that scrolls within the workspace frame.
       * Everything above (header, mode strip, section nav) and below
       * (action bar, trust footer) stays fixed. The flex-1 + min-h-0
       * combination allows this div to fill remaining vertical space and
       * shrink when the fixed zones need room, while overflow-y-auto
       * enables internal scrolling when content exceeds the viewport.
       * overscrollBehavior: contain prevents scroll chaining to the parent. */}
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        data-testid="saved-job-scroll-region"
        style={{ overscrollBehavior: 'contain' }}
      >

      {/* ── DECISION VIEW — job details + match intelligence ── */}
      {viewMode === 'decision' ? (
        <div
          role="tabpanel"
          id={getModePanelId('decision')}
          aria-labelledby={getModeTabId('decision')}
          data-testid="saved-job-decision-panel"
        >

      {/* ── Section 2: Decision Summary Band — decision-first hierarchy ──
       *
       * WHY THIS REDESIGN: The previous flat metadata grid led with low-value
       * items (location, grade, schedule) and buried the critical decision
       * factors (salary, deadline, work mode). A user evaluating whether to
       * pursue a role cares most about compensation, career trajectory, work
       * flexibility, and urgency. This band prioritizes those four factors.
       *
       * STRUCTURE:
       *   Primary strip: 4 prominent tiles in a horizontal grid —
       *     Salary, Grade+Promotion, Work Mode, Deadline
       *   Secondary row: compact inline text for lower-priority metadata —
       *     Location, Appointment type, Status (when present)
       *
       * REMOVED FROM THIS SECTION:
       *   "Saved" — user already knows the job is saved; wastes prime space
       *   "Schedule" — almost always Full-time in federal jobs; only unusual
       *     schedules would be decision-relevant, and those are rare
       *
       * SPACE EFFICIENCY: This compact band replaces the ~12-row grid, saving
       * significant vertical space so Match Overview sits higher in the
       * viewport. Users see more decision state at first glance. */}
      <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--p-border)' }}>

        {/* ── Primary decision strip: 4 key decision factors ──
         * Grid of 4 compact tiles. Each tile shows one high-priority decision
         * factor with a tiny label above and the value below. Values use color
         * coding (success green for salary, accent for urgency) to accelerate
         * scanning. Tiles use surface2 background with subtle border to read
         * as contained data points without heavy visual weight. */}
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>

          {/* Salary — the most critical monetary decision factor.
           * Displayed first and in success green to draw the eye immediately.
           * Falls back to "See announcement" when salaryRange is absent. */}
          <div
            className="px-3 py-2 rounded-md"
            style={{ background: 'var(--p-surface2)', border: '1px solid var(--p-border)' }}
          >
            <span className="text-[9px] uppercase tracking-wider font-medium flex items-center gap-1 mb-0.5" style={{ color: 'var(--p-text-dim)' }}>
              <DollarSign className="w-2.5 h-2.5 flex-shrink-0" />
              Salary
            </span>
            <span className="text-xs font-bold leading-snug block" style={{ color: 'var(--p-success)' }}>
              {job.salaryRange ? job.salaryRange : 'See announcement'}
            </span>
          </div>

          {/* Grade + Promotion — career trajectory at a glance.
           * Combines current grade and upward path into one tile so the user
           * sees both level and opportunity in a single scan. The arrow (→)
           * communicates forward momentum. Falls back gracefully when grade
           * is absent or at GS-15 ceiling. */}
          <div
            className="px-3 py-2 rounded-md"
            style={{ background: 'var(--p-surface2)', border: '1px solid var(--p-border)' }}
          >
            <span className="text-[9px] uppercase tracking-wider font-medium flex items-center gap-1 mb-0.5" style={{ color: 'var(--p-text-dim)' }}>
              <TrendingUp className="w-2.5 h-2.5 flex-shrink-0" />
              Grade & Promotion
            </span>
            <span className="text-xs font-bold leading-snug block" style={{ color: 'var(--p-text)' }}>
              {(function () {
                if (!job.grade) return 'See announcement';
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

          {/* Work Mode — remote / telework / on-site flexibility.
           * Critical for many candidates' lifestyle and location decisions.
           * "Fully Remote" is a strong positive signal; telework eligibility
           * is moderate; absent telework defaults to "On-site." */}
          <div
            className="px-3 py-2 rounded-md"
            style={{ background: 'var(--p-surface2)', border: '1px solid var(--p-border)' }}
          >
            <span className="text-[9px] uppercase tracking-wider font-medium mb-0.5 block" style={{ color: 'var(--p-text-dim)' }}>
              Work Mode
            </span>
            <span className="text-xs font-bold leading-snug block" style={{ color: 'var(--p-text)' }}>
              {job.telework
                ? (job.telework === 'Remote' ? 'Fully Remote' : job.telework)
                : 'On-site'}
            </span>
          </div>

          {/* Deadline / Urgency — time-sensitivity signal.
           * Uses accent color when the close date is within 14 days to create
           * urgency awareness without being alarming. "— soon" suffix reinforces
           * the urgency for scanning. Falls back to "Open / see listing" when
           * no close date is available. */}
          <div
            className="px-3 py-2 rounded-md"
            style={{ background: 'var(--p-surface2)', border: '1px solid var(--p-border)' }}
          >
            <span className="text-[9px] uppercase tracking-wider font-medium flex items-center gap-1 mb-0.5" style={{ color: 'var(--p-text-dim)' }}>
              <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
              Deadline
            </span>
            <span
              className="text-xs font-bold leading-snug block"
              style={{ color: isSoon ? 'var(--p-accent)' : 'var(--p-text)' }}
            >
              {job.closeDate
                ? job.closeDate + (isSoon ? ' \u2014 soon' : '')
                : 'Open / see listing'}
            </span>
          </div>
        </div>

        {/* ── Secondary metadata row: lower-priority position details ──
         * Compact inline text showing location, appointment type, and status.
         * Visually subordinate to the primary strip above — smaller text, dim
         * color, no tile containers. Items separated by bullet (·) via gaps.
         * Only items with data render (no empty placeholders). */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {job.location}
          </span>
          {job.appointmentType ? (
            <span>{job.appointmentType}</span>
          ) : null}
          {statusLabel !== null ? (
            <span style={{ color: 'var(--p-text-muted)' }}>{statusLabel}</span>
          ) : null}
        </div>
      </div>

      {/* ── Section 3: Match / Readiness Intelligence — weighted dimension breakdown ── */}
      {/* This is the primary analytical section. It replaces the old weak match
       * presentation with a comprehensive, weighted breakdown showing how the
       * user's profile maps to this role across five scored dimensions.
       * Each dimension is rendered as a labeled horizontal bar with score and weight.
       * The section header shows dual readiness/match scores for quick scanning. */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--p-border)' }}>
        <h3
          className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5"
          style={{ color: 'var(--p-text-dim)' }}
        >
          <BarChart2 className="w-3.5 h-3.5" style={{ color: 'var(--p-accent)' }} aria-hidden />
          Match Overview
        </h3>

        {/* Compact advisory — preserves the Top Action recommendation that was
         * in the removed summary grid. The redundant Readiness and Weighted Fit
         * values are already visible in the header badges (FIXED ZONE 1).
         * This single subdued line provides actionable guidance without
         * restating headline metrics. Sits between the section heading and the
         * breakdown table for a clean, professional transition. */}
        <p
          className="text-[11px] mb-3 pb-2"
          style={{
            color: 'var(--p-text-muted)',
            borderBottom: '1px solid var(--p-border)',
          }}
        >
          Top action: {matchSummary.topAction}
        </p>

        {/* Weighted dimension breakdown — decision-oriented graph block.
         * Each row shows five pieces of information:
         *   1. Label (what is being measured)
         *   2. Horizontal bar (visual score indicator)
         *   3. Numeric score
         *   4. Job emphasis badge (how important this dimension is for this role)
         *   5. Gap state label (Strong / Adequate / Gap)
         *
         * This structure helps users quickly understand WHY they fit or don't fit,
         * and which dimensions need attention before applying. More comprehensive
         * than a single match number or a generic chart. */}
        {/* Shared match-breakdown table: uses the canonical MatchBreakdownHeader +
         * MatchBreakdownRow components so alignment and interaction behavior are
         * identical to the Job Search match breakdown. Rows are now interactive
         * with hover, focus-visible, tooltip, and chevron — matching the stronger
         * pattern established in Job Search. Clicking a row shows dimension detail
         * in the tooltip; the chevron signals inspectability. */}
        <div className="space-y-2.5">
          <MatchBreakdownHeader />

          <ul className="list-none space-y-1.5" role="list">
            {deriveMatchDimensions(job).map(function (dim, idx) {
              /* Gap state color: Strong → green, Gap → red, Adequate → amber.
               * Matches the shared score-tier scale used across all surfaces. */
              const gapColor = dim.gapState === 'Strong'
                ? 'var(--p-success)'
                : (dim.gapState === 'Gap' ? 'var(--p-danger, #ef4444)' : 'var(--p-warning, #eab308)');

              const rowData: MatchBreakdownRowData = {
                label: dim.label,
                score: dim.score,
                emphasisLevel: dim.jobEmphasis,
                statusLabel: dim.gapState,
                statusColor: gapColor,
                tooltipText: dim.label + ': ' + String(dim.score) + '/100 \u2022 Weight: ' + String(Math.round(dim.weight * 100)) + '% \u2022 Emphasis: ' + dim.jobEmphasis + ' \u2022 ' + dim.gapState,
                ariaLabel: 'Explain ' + dim.label + ' dimension in PathAdvisor',
              };

              /* Capture dim in a local constant so the closure does not
               * close over the loop variable when onClick fires later. */
              const capturedDim = dim;
              const capturedJob = job;

              return (
                <MatchBreakdownRow
                  key={idx}
                  data={rowData}
                  tooltipIdSuffix={'saved-dim-' + idx}
                  onRowClick={function () {
                    /* Publish a dimension-explanation entry to PathAdvisor,
                     * mirroring the same interaction pattern used in Job Search.
                     * Saved Jobs constructs the payload from the local MatchDimension
                     * data rather than a full JobMatchSnapshot, but the resulting
                     * PathAdvisor entry has the same structure and intent:
                     * users click a breakdown row → PathAdvisor receives context
                     * about that dimension for explanation. */
                    const signalText = capturedDim.gapState === 'Strong'
                      ? 'Strong alignment — this dimension supports your competitiveness.'
                      : capturedDim.gapState === 'Adequate'
                        ? 'Moderate alignment — improving this could strengthen your fit.'
                        : 'Gap detected — this dimension is limiting competitiveness.';

                    publishDimensionExplainContext({
                      screen: 'saved-jobs',
                      anchor: {
                        type: 'job',
                        id: capturedJob.id,
                        label: capturedJob.title !== undefined && capturedJob.title !== '' ? capturedJob.title : capturedJob.id,
                      },
                      dimension: capturedDim.label,
                      payload: {
                        whatMeasures: [capturedDim.label + ' (' + String(Math.round(capturedDim.weight * 100)) + '% weight): measures alignment on this dimension.'],
                        yourSignal: signalText,
                        fastestFix: capturedDim.gapState !== 'Strong'
                          ? 'Review your resume and career readiness inputs for ' + capturedDim.label.toLowerCase() + '.'
                          : undefined,
                      },
                      dedupeKey: 'dimension:' + capturedDim.label + ':' + String(capturedDim.score),
                    });
                  }}
                />
              );
            })}
          </ul>
        </div>

        {/* Consideration bullets — derived from job data, placed under the bars
         * for additional context on what to focus on. */}
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--p-border)' }}>
          <span className="text-[11px] font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--p-text-dim)' }}>
            Key Considerations
          </span>
          <ul className="list-none text-xs space-y-1.5" style={{ color: 'var(--p-text-muted)' }}>
            {considerationBullets.map(function (bullet, idx) {
              return (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="flex-shrink-0 mt-[5px] w-1.5 h-1.5 rounded-full" style={{ background: 'var(--p-text-dim)' }} aria-hidden />
                  <span>{bullet}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* ── PathOS Brief REMOVED — intelligence moved to PathAdvisor ──────── */}
      {/* Per architecture correction: the page owns job details + visual match
       * intelligence. PathAdvisor owns interpretation, explanation, and decision
       * guidance. The brief content (role fit, strengths, risks, trajectory,
       * timing, recommendation) is now pushed into PathAdvisor as a unified
       * context log entry when a saved job is selected. See the useEffect in
       * SavedJobsScreen that calls appendEntry() on the context log store. */}

        </div>
      ) : (
        /* ── ANNOUNCEMENT VIEW — federal announcement reading workspace ──
         * Section navigation tabs are in FIXED ZONE 3 above this scroll
         * container. Only the selected section's content renders here.
         * Content flows naturally inside the scrollable viewport — no inner
         * overflow wrapper needed since the parent handles scrolling. */
        <div
          role="tabpanel"
          id={getModePanelId('announcement')}
          aria-labelledby={getModeTabId('announcement')}
          data-testid="saved-job-announcement-panel"
        >

      {/* ── Job Overview section content ── */}
      {/* Renders the content of the currently selected announcement section.
       * Content is split on double-newline into paragraphs for readable layout.
       * Lines starting with "- " are rendered as list items; other lines as
       * normal paragraph text. Dense enough to test scroll and reading flow. */}
      <div
        className="px-5 py-4"
        role="tabpanel"
        id={getAnnouncementPanelId(announcementSection)}
        aria-labelledby={getAnnouncementTabId(announcementSection)}
        data-testid="saved-job-announcement-section-panel"
      >
        <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--p-text-muted)' }}>
          {activeAnnouncementContent.split('\n\n').map(function (para, pIdx) {
            /* Detect list blocks: if the paragraph starts with "- " or contains
             * only lines starting with "- ", render as a <ul>. Otherwise <p>. */
            const trimmed = para.trim();
            if (trimmed.indexOf('- ') === 0) {
              /* List block — split into individual list items */
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

        </div>
      )}

      </div>
      {/* ── END SCROLLABLE CONTENT VIEWPORT ── */}

      {/* ── FIXED ZONE 4: Action bar ─────────────────────────────────────
       * Structurally anchored at the bottom of the workspace frame.
       * flex-shrink-0 prevents compression; border-top visually separates
       * this zone from the scrollable content above. The action bar does
       * NOT move when switching between tabs or when content length changes
       * because it sits outside the overflow-y-auto scroll container. */}
      <div
        className="px-5 py-3 flex-shrink-0"
        data-testid="saved-job-action-row"
        style={{ borderTop: '1px solid var(--p-border)' }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={props.onStartGuidedApply}
            className={INTERACTIVE_HOVER_CLASS + ' inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded'}
            style={{
              background: 'var(--p-accent)',
              color: 'var(--p-bg)',
              border: '1px solid transparent',
              borderRadius: 'var(--p-radius)',
            }}
          >
            <ClipboardList className="w-4 h-4" />
            Guided Apply
          </button>
          <button
            type="button"
            onClick={props.onBuildResume}
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
            Open Official Listing
          </a>
          <AskPathAdvisorButton
            onClick={props.onAskPathAdvisor}
            tooltipText="Ask PathAdvisor about this position in the right panel."
            tooltipId="ask-pathadvisor-saved-jobs"
          />
          <button
            type="button"
            onClick={props.onRemove}
            className={INTERACTIVE_HOVER_CLASS + ' inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded'}
            style={{
              background: 'transparent',
              color: 'var(--p-danger, #ef4444)',
              border: '1px solid var(--p-danger, #ef4444)',
              borderRadius: 'var(--p-radius)',
            }}
          >
            <Trash2 className="w-4 h-4" />
            Remove from Saved
          </button>
        </div>
      </div>

      {/* ── FIXED ZONE 5: Trust footer ── */}
      {/* TRUST-FIRST: explicit microcopy reinforcing that PathOS is local-only.
       * Anchored below the action bar; never scrolls away. flex-shrink-0
       * keeps it visible at the point of action regardless of content length. */}
      <p className="text-[11px] px-5 pb-3 flex-shrink-0" style={{ color: 'var(--p-text-dim)' }}>
        Opens in your browser. PathOS does not access your USAJOBS account.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: True empty state (no saved jobs at all)
// ---------------------------------------------------------------------------

/**
 * Shown when the user has no saved jobs at all.
 * Distinct from the search-empty state (below).
 * Prompts the user to go find and save jobs in Job Search.
 */
function EmptySavedJobs(props: { onGoToSearch: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: 'var(--p-surface2)' }}
      >
        <Bookmark className="w-8 h-8" style={{ color: 'var(--p-text-dim)' }} />
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-semibold" style={{ color: 'var(--p-text)' }}>
          No saved jobs yet
        </p>
        <p className="text-sm max-w-xs" style={{ color: 'var(--p-text-dim)' }}>
          Save jobs from Job Search to start building your decision workspace.
        </p>
      </div>
      <button
        type="button"
        onClick={props.onGoToSearch}
        className={INTERACTIVE_HOVER_CLASS + ' px-4 py-2 text-sm font-medium rounded'}
        style={{
          background: 'var(--p-accent)',
          color: 'var(--p-bg)',
          border: '1px solid transparent',
          borderRadius: 'var(--p-radius)',
        }}
      >
        Go to Job Search
      </button>
      {/* Trust-first: even in the empty state, be explicit about local-only storage */}
      <p className="text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
        All saved jobs stay on your device — PathOS does not sync to any server.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Search-empty state (jobs exist but query matched nothing)
// ---------------------------------------------------------------------------

/**
 * Shown when saved jobs exist but no job matches the current search query.
 * Intentionally distinct from EmptySavedJobs — the user needs to know
 * that clearing the search will restore the list, not that they have no saves.
 */
function SearchEmptyState(props: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 px-6 text-center">
      <Search className="w-8 h-8 opacity-30" style={{ color: 'var(--p-text-dim)' }} />
      <p className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>
        No results for &ldquo;{props.query}&rdquo;
      </p>
      <p className="text-xs" style={{ color: 'var(--p-text-dim)' }}>
        Try different keywords or clear the search.
      </p>
      <button
        type="button"
        onClick={props.onClear}
        className={INTERACTIVE_HOVER_CLASS + ' text-xs px-3 py-1.5 rounded'}
        style={{
          background: 'var(--p-surface2)',
          color: 'var(--p-text-muted)',
          border: '1px solid var(--p-border)',
          borderRadius: 'var(--p-radius)',
        }}
      >
        Clear search
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

/**
 * SavedJobsScreen — PathOS decision workspace for saved federal job listings.
 *
 * Rendered by app/(shared)/dashboard/saved-jobs/page.tsx inside
 * SharedDashboardRouteShell (which provides the shared app shell + PathAdvisor rail).
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────┐
 *   │ Header (title, subtitle, search, sort, trust)   │
 *   ├─────────────────────────────────────────────────┤
 *   │ Metrics strip (total, recency counts, agencies) │
 *   ├───────────────────┬─────────────────────────────┤
 *   │ Left pane         │ Detail workspace             │
 *   │ (filtered+sorted  │ (selected job + actions)     │
 *   │  job cards)       │                              │
 *   └───────────────────┴─────────────────────────────┘
 *
 * State ownership:
 *   - Component owns a local snapshot of the @pathos/core SavedJobsStore.
 *   - Every mutation writes back to localStorage via persist() immediately.
 *   - Cross-tab sync via window 'storage' event listener (mounted → unmounted).
 *   - Search and sort are purely local component state (not persisted).
 *   - PathAdvisor rail context is set via usePathAdvisorScreenOverridesStore
 *     on mount and cleared on unmount.
 */
export function SavedJobsScreen(_props: SavedJobsScreenProps) {
  const nav = useNav();

  // ── Core store snapshot ──────────────────────────────────────────────────
  // This screen owns its own component-state snapshot of the persisted store.
  // Keeps rendering deterministic and avoids the complexity of a shared Zustand
  // store for a concern that only this page cares about at any given time.
  const [store, setStore] = useState<SavedJobsStore>({
    schemaVersion: 1,
    jobs: [],
    selectedJobId: null,
  });
  const [mounted, setMounted] = useState(false);

  // ── Search + sort state ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date-desc');
  // Controls visibility of the sort dropdown menu
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // ── PathAdvisor screen overrides ─────────────────────────────────────────
  // Sets "Saved Jobs" context in the PathAdvisor rail while this screen is mounted.
  // Clears on unmount so the rail falls back to default (Dashboard) context.
  // Pattern matches how JobSearchScreen and CareerReadinessScreen set their context.
  const setAdvisorOverrides = usePathAdvisorScreenOverridesStore(function (s) {
    return s.setOverrides;
  });

  // ── On mount: load store + set advisor context + register storage listener ──
  useEffect(function () {
    // 1. Load saved jobs from localStorage into component state.
    //    If the store is empty, seed it with deterministic mock data so the page
    //    renders fully populated during development. seedSavedJobsIfEmpty returns
    //    unchanged when the store already has jobs (same guard as loadMockResultsIfEmpty).
    //    queueMicrotask ensures the state update happens after the initial render,
    //    avoiding hydration mismatches in Next.js (same approach as original screen).
    const loaded = loadSavedJobsStore();
    const seeded = seedSavedJobsIfEmpty(loaded);
    if (seeded !== loaded) {
      saveSavedJobsStore(seeded);
    }
    queueMicrotask(function () {
      setStore(seeded);
      setMounted(true);
    });

    // 2. Set PathAdvisor rail context for the Saved Jobs screen (static parts; railContent set when store is ready).
    setAdvisorOverrides({
      screenId: 'saved-jobs',
      viewingLabel: 'Saved Jobs',
      suggestedPrompts: SAVED_JOBS_ADVISOR_PROMPTS,
      briefingLabel: 'From Saved Jobs',
      briefingHelperText: 'Select a saved job to get personalized guidance.',
      composerPlaceholder: 'Ask about saved jobs...',
    });

    // 3. Cross-tab reactive sync: reload the store when another browser tab
    //    writes to the same localStorage key. This fires only for other-tab changes;
    //    same-tab mutations are handled immediately by persist() below.
    function handleStorageEvent(e: StorageEvent) {
      if (e.key === SAVED_JOBS_STORE_KEY) {
        setStore(loadSavedJobsStore());
      }
    }
    window.addEventListener('storage', handleStorageEvent);

    return function () {
      // Clear PathAdvisor overrides so the rail reverts to Dashboard context.
      setAdvisorOverrides(null);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [setAdvisorOverrides]);

  // ── PathAdvisor architecture: no railContent (no stacked mini-cards) ────
  // Per architecture correction: PathAdvisor is a unified output terminal.
  // Intelligence is pushed as context log entries (see effect below), not
  // as railContent insight/next-best-action mini-cards. The screen overrides
  // are set on mount (above) without railContent so PathAdvisorCard shows
  // context log entries instead of fragmented insight boxes.

  // ── Persist helper ───────────────────────────────────────────────────────
  // Every mutation goes through persist() which updates both component state
  // and localStorage atomically from the caller's perspective.
  const persist = useCallback(function (next: SavedJobsStore) {
    setStore(next);
    saveSavedJobsStore(next);
  }, []);

  // ── Derived list: filtered → sorted ─────────────────────────────────────
  // Computed fresh on each render from store.jobs + current search + current sort.
  // Never mutates stored job records — pure derived view.

  const filteredJobs = useMemo(function () {
    return filterJobs(store.jobs, searchQuery);
  }, [store.jobs, searchQuery]);

  const displayedJobs = useMemo(function () {
    return sortJobs(filteredJobs, sortKey);
  }, [filteredJobs, sortKey]);

  // ── Selected-job resolution ──────────────────────────────────────────────
  // The persisted selectedJobId is respected ONLY when the selected job is
  // present in the currently filtered list. If the user's search filters
  // out the selected job, the detail panel shows a "no selection" state
  // without clearing the persisted selection — so it comes back when the
  // user clears their search. This keeps selection behavior coherent and
  // avoids surprise mutations to the stored selectedJobId.
  const selectedJob = useMemo(function () {
    if (!store.selectedJobId) return undefined;
    const inList = displayedJobs.some(function (j) { return j.id === store.selectedJobId; });
    if (!inList) return undefined;
    return store.jobs.find(function (j) { return j.id === store.selectedJobId; });
  }, [store.jobs, store.selectedJobId, displayedJobs]);

  // ── PathAdvisor context log: push brief intelligence when a job is selected ──
  // Architecture: PathAdvisor owns interpretation, explanation, and decision
  // guidance. When a saved job is selected, we derive the brief content and
  // push it as a single structured context log entry. PathAdvisorCard renders
  // context log entries as one coherent output flow — no stacked mini-cards.
  // Deduplication prevents re-appending if the user clicks the same job again.
  const appendContextEntry = usePathAdvisorContextLogStore(function (s) {
    return s.appendEntry;
  });
  const clearContextScreen = usePathAdvisorContextLogStore(function (s) {
    return s.clearScreen;
  });

  useEffect(function () {
    if (selectedJob === undefined || selectedJob === null) {
      return;
    }

    // Derive the brief content for the selected job (same derivation used
    // previously for the on-page PathOS Brief section, now pushed to PathAdvisor).
    const brief = deriveBriefContent(selectedJob);

    // Build sections array for the context log entry. Each section maps to a
    // logical block in the unified PathAdvisor output surface.
    const sections = [];

    // Role Fit — top-line qualitative assessment
    sections.push({
      title: 'Role Fit',
      lines: [brief.roleFitSummary],
    });

    // Strategic Relevance — why this role matters
    sections.push({
      title: 'Strategic Relevance',
      lines: [brief.strategicRelevance],
    });

    // Strengths
    sections.push({
      title: 'Likely Strengths',
      bullets: brief.strengths,
    });

    // Risks
    sections.push({
      title: 'Likely Risks',
      bullets: brief.risks,
    });

    // Career Trajectory
    sections.push({
      title: 'Career Trajectory',
      lines: [brief.careerTrajectory],
    });

    // Timing Signal
    const timingLines = [brief.timingSignal];
    const closeDateVal = selectedJob.closeDate;
    if (closeDateVal !== undefined && closeDateVal !== null && closeDateVal !== '') {
      if (isCloseDateSoon(closeDateVal, 10)) {
        timingLines.push('⚠ Closing soon — act within the next few days.');
      }
    }
    sections.push({
      title: 'Timing',
      lines: timingLines,
    });

    // Recommendation — the core guidance
    sections.push({
      title: 'Recommendation',
      lines: [brief.recommendation],
    });

    // Build the context log entry
    const entry: PathAdvisorContextEntry = {
      id: 'saved-job-brief-' + selectedJob.id + '-' + Date.now(),
      createdAtISO: new Date().toISOString(),
      screen: 'saved-jobs',
      anchor: {
        type: 'job',
        id: selectedJob.id,
        label: selectedJob.title,
      },
      title: 'PathOS Brief — ' + selectedJob.title,
      subtitle: selectedJob.agency || '',
      sections: sections,
      ctas: [
        {
          label: 'Start Guided Apply',
          action: 'nav',
          route: '/guided-apply',
        },
      ],
      tags: ['localOnly', 'explainability'],
    };

    // Append with deduplication keyed on the job ID so clicking the same
    // job again doesn't create duplicate entries.
    appendContextEntry(entry, {
      dedupeKey: 'saved-job-brief-' + selectedJob.id,
      makeActive: true,
    });
  }, [selectedJob, appendContextEntry]);

  // Clean up context log entries when the screen unmounts so stale entries
  // from this screen do not persist in the PathAdvisor rail on other screens.
  useEffect(function () {
    return function () {
      clearContextScreen('saved-jobs');
    };
  }, [clearContextScreen]);

  // ── Event handlers ───────────────────────────────────────────────────────

  const handleSelect = useCallback(function (jobId: string) {
    persist(selectSavedJob(store, jobId));
  }, [store, persist]);

  const handleRemove = useCallback(function () {
    if (!selectedJob) return;
    // removeSavedJob in @pathos/core auto-selects the first remaining job.
    // That job may not be in the filtered list, which is intentional — the
    // selection resolution logic above will show "no selection" until the
    // user clears the search or the auto-selected job enters the filtered view.
    persist(removeSavedJob(store, selectedJob.id));
  }, [selectedJob, store, persist]);

  const handleStartGuidedApply = useCallback(function () {
    if (!selectedJob) return;
    const gaStore = loadGuidedApplyStore();
    const session = createSession(selectedJob.title, selectedJob.url || '');
    const updatedGaStore = addSession(gaStore, session);
    saveGuidedApplyStore(updatedGaStore);
    nav.push('/guided-apply');
  }, [selectedJob, nav]);

  /** Remove a saved job by ID and persist the change. Used by left-pane row remove icon. */
  const handleRemoveId = useCallback(function (jobId: string) {
    persist(removeSavedJob(store, jobId));
  }, [store, persist]);

  const handleGoToSearch = useCallback(function () {
    nav.push('/dashboard/job-search');
  }, [nav]);

  const handleClearSearch = useCallback(function () {
    setSearchQuery('');
  }, []);

  /**
   * Ask PathAdvisor click handler.
   * No-op following the same pattern as JobSearchScreen (onAskPathAdvisor).
   * The PathAdvisor rail is already rendered by SharedDashboardRouteShell
   * and visible in the right panel. SAVED_JOBS_ADVISOR_PROMPTS are already
   * set as context-aware suggested prompts via usePathAdvisorScreenOverridesStore.
   * Wiring a direct focus call would require a DOM ref from inside the screen to
   * the shell's rail input, which would fight the shell architecture.
   */
  const handleAskPathAdvisor = useCallback(function () {
    // no-op: user interacts with the PathAdvisor rail directly on the right
  }, []);

  // ── Loading state ────────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--p-text-dim)' }}>
        <p className="text-sm">Loading saved jobs...</p>
      </div>
    );
  }

  // ── True empty state ─────────────────────────────────────────────────────
  // No saved jobs at all — prompt the user to go to Job Search.
  if (store.jobs.length === 0) {
    return <EmptySavedJobs onGoToSearch={handleGoToSearch} />;
  }

  // ── Main workspace ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0 w-full" style={{ color: 'var(--p-text)' }}>

      {/* ── Page header ──────────────────────────────────────────────── */}
      {/*
       * Header contains: page title, subtitle, search input, sort control,
       * and trust-first microcopy. Kept compact so the workspace has
       * maximum vertical space.
       */}
      <div
        className="px-4 pt-4 pb-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--p-border)' }}
      >
        {/* Title row: matches Job Search header weight (text-xl font-semibold, px-4 pt-4 pb-2).
         * Trust microcopy top right; subtitle below title. */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: 'var(--p-text)' }}
            >
              Saved Jobs
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--p-text-muted)' }}>
              Review your saved positions and decide what to pursue next.
            </p>
          </div>
          {/* TRUST-FIRST microcopy: same dim, compact style as Job Search trust cues. */}
          <div
            className="flex items-center gap-1.5 text-[11px] flex-shrink-0 mt-0.5"
            style={{ color: 'var(--p-text-dim)' }}
          >
            <Shield className="w-3 h-3" />
            Saved locally on this device
          </div>
        </div>

        {/* Search + Sort/Filter row: compact single row matching Job Search control density.
         * Search input on left, sort/filter controls on right. */}
        <div className="flex flex-wrap items-center gap-3" style={{ paddingBottom: '6px' }}>
          {/* Search input: icon is positioned inside the input border to match mockup composition */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--p-text-dim)', transform: 'translateY(-50%)' }}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={function (e) { setSearchQuery(e.target.value); }}
              placeholder="Search saved jobs..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded border bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] focus-visible:ring-inset"
              style={{
                borderColor: 'var(--p-border)',
                color: 'var(--p-text)',
                borderRadius: 'var(--p-radius)',
              }}
            />
          </div>
          <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={function () { setSortMenuOpen(function (o) { return !o; }); }}
              className={INTERACTIVE_HOVER_CLASS + ' inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg'}
              style={{
                background: 'var(--p-surface2)',
                border: '1px solid var(--p-border)',
                color: 'var(--p-text-muted)',
                borderRadius: 'var(--p-radius)',
              }}
              aria-haspopup="listbox"
              aria-expanded={sortMenuOpen}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort
            </button>

            {/* Sort options dropdown menu */}
            {sortMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-20 rounded-lg overflow-hidden shadow-lg min-w-[160px]"
                style={{
                  background: 'var(--p-surface2)',
                  border: '1px solid var(--p-border)',
                  borderRadius: 'var(--p-radius-lg)',
                }}
                role="listbox"
              >
                {ALL_SORT_KEYS.map(function (key) {
                  return (
                    <button
                      key={key}
                      type="button"
                      role="option"
                      aria-selected={key === sortKey}
                      onClick={function () {
                        setSortKey(key);
                        setSortMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm transition-colors outline-none hover:bg-[var(--p-surface2)] focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] focus-visible:ring-inset"
                      style={{
                        color: key === sortKey ? 'var(--p-accent)' : 'var(--p-text-muted)',
                        background: key === sortKey
                          ? 'color-mix(in srgb, var(--p-accent) 8%, transparent)'
                          : 'transparent',
                        fontWeight: key === sortKey ? 600 : 400,
                      }}
                    >
                      {SORT_LABELS[key]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter dropdown (mockup: Filter button; minimal placeholder for now; hover/focus-visible for interaction) */}
          <button
            type="button"
            className={INTERACTIVE_HOVER_CLASS + ' inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] focus-visible:ring-inset'}
            style={{
              background: 'var(--p-surface2)',
              border: '1px solid var(--p-border)',
              color: 'var(--p-text-muted)',
              borderRadius: 'var(--p-radius)',
            }}
            aria-label="Filter saved jobs"
          >
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
          </div>
        </div>
      </div>

      {/* ── Metrics strip ────────────────────────────────────────────── */}
      {/*
       * Summary metrics derived from local saved-jobs data.
       * Always uses store.jobs (the full unfiltered list) so the metrics
       * reflect the user's actual saved state, not the current search view.
       */}
      <MetricsStrip jobs={store.jobs} />

      {/* Two-pane workspace: grid layout matching Job Search panel treatment.
       * Both panes wrapped in rounded-lg border containers with var(--p-surface) bg
       * — same visual language as Job Search results pane + details pane. */}
      {/* Two-pane workspace: left list at ~30% width, detail fills remaining.
       * Gap and padding tuned for the mockup's breathing room. */}
      <div
        className="mt-3 grid gap-3.5 flex-1 min-h-0 px-4 pb-3"
        style={{ gridTemplateColumns: 'clamp(250px, 30%, 360px) minmax(320px, 1fr)' }}
      >
        {/* Left pane: list of saved jobs in a bordered panel container */}
        <div
          className="flex flex-col rounded-lg border min-w-0 h-full min-h-0"
          style={{
            borderColor: 'var(--p-border)',
            background: 'var(--p-surface)',
            borderRadius: 'var(--p-radius-lg)',
          }}
        >
          {displayedJobs.length === 0 ? (
            <SearchEmptyState query={searchQuery} onClear={handleClearSearch} />
          ) : (
            <>
              <div
                className="flex-shrink-0 px-3 py-2 text-xs border-b"
                style={{ borderColor: 'var(--p-border)', color: 'var(--p-text-dim)' }}
              >
                {displayedJobs.length} saved job{displayedJobs.length !== 1 ? 's' : ''}
              </div>
              <div
                role="listbox"
                aria-label="Saved jobs list"
                className="h-full min-h-0 overflow-y-auto flex-1"
                style={{ overscrollBehavior: 'contain' }}
              >
                {displayedJobs.map(function (job) {
                  return (
                    <SavedJobItem
                      key={job.id}
                      job={job}
                      isSelected={store.selectedJobId === job.id}
                      onSelect={handleSelect}
                      onRemove={handleRemoveId}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right (main) pane: detail workspace in a bordered panel container.
         * selectedJob is undefined when no job is selected or filtered out. */}
        <div
          className="flex flex-col rounded-lg border min-w-0 h-full min-h-0"
          style={{
            borderColor: 'var(--p-border)',
            background: 'var(--p-surface)',
            borderRadius: 'var(--p-radius-lg)',
          }}
        >
          <SavedJobDetails
            job={selectedJob}
            onRemove={handleRemove}
            onStartGuidedApply={handleStartGuidedApply}
            onBuildResume={function () { nav.push(RESUME_BUILDER); }}
            onAskPathAdvisor={handleAskPathAdvisor}
          />
        </div>
      </div>

      {/*
       * Sort menu backdrop: clicking outside the sort dropdown closes it.
       * Uses z-10 (below the dropdown at z-20) so it captures all outside clicks
       * without blocking the rest of the UI when the menu is closed.
       */}
      {sortMenuOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={function () { setSortMenuOpen(false); }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
