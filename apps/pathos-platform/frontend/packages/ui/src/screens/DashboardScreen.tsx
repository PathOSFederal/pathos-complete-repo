/**
 * ============================================================================
 * SHARED DASHBOARD SCREEN — Command Center v1 (Mockup parity)
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * LAYOUT: Briefing row, Today's Focus (hero + 2 small cards), Your Active
 * Tracks (Saved Jobs, Applications, Resume), Signals (Updates, Readiness,
 * Timeline). Driven by optional data prop (e.g. from lib/dashboard/mockDashboardData).
 * Uses existing theme tokens and ModuleCard only; no theme drift.
 */

'use client';

import type React from 'react';
import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  FileText,
  Bell,
  TrendingUp,
  Clock,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  LayoutList,
} from 'lucide-react';
import { ModuleCard } from '../components/ModuleCard';
import { AskPathAdvisorButton } from '../components/AskPathAdvisorButton';
import { CardRowList } from './_components/CardRowList';
import { usePathAdvisorBriefingStore } from '../stores/pathAdvisorBriefingStore';
import { useDashboardHeroDoNowStore } from '../stores/dashboardHeroDoNowStore';
import { useNav } from '@pathos/adapters';
import { mockDashboardData } from './dashboard/mockDashboardData';
import { buildDashboardViewModel } from './dashboard/buildDashboardViewModel';
import { useDashboardSnapshot } from './dashboard/useDashboardSnapshot';
import type { FocusItem } from './dashboard/dashboardModel';
import { JOB_SEARCH, IMPORT, RESUME_BUILDER, CAREER_READINESS, SAVED_JOBS } from '../routes/routes';
import { getCareerReadinessSummary } from './careerReadiness/careerReadinessMockData';
import { publishScreenContext } from '../lib/pathAdvisorPublish';
import { usePathAdvisorScreenOverridesStore } from '../stores/pathAdvisorScreenOverridesStore';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Info } from 'lucide-react';
import { OVERLAY_ROOT_ID, Z_POPOVER } from '../styles/zIndex';

/** Resolve portal container for Popover (OverlayRoot when available, else body). */
function getPopoverContainer(): HTMLElement | undefined {
  if (typeof document === 'undefined') return undefined;
  const el = document.getElementById(OVERLAY_ROOT_ID);
  return el !== null ? el : document.body;
}

/** Data shape for dashboard content; app passes mock or real data. */
export interface DashboardData {
  briefing: Array<{ label: string; value: string; subtext: string; subtextPositive?: boolean }>;
  focusHero: {
    title: string;
    reason: string;
    ctaLabel: string;
    stepBadge: string;
    explainKnow: string;
    explainNotKnow: string;
    explainWhy: string;
    /** Optional hero density: estimated time, why it matters, what you'll do. */
    estimatedTime?: string;
    whyItMatters?: string;
    whatYoullDo?: string;
  } | null;
  focusSmall: Array<{ title: string; description: string; ctaLabel: string }>;
  savedJobs: Array<{ title: string; orgGrade: string; status: string; timeAgo: string }>;
  applications: Array<{
    title: string;
    submittedDate: string;
    status: string;
    statusVariant?: string;
  }>;
  resume: {
    progressPercent: number;
    checklist: Array<{ label: string; checked: boolean }>;
    openCtaLabel: string;
  };
  updatesSinceVisit: Array<{ icon: string; text: string; timeAgo: string }>;
  readinessDeltas: Array<{
    label: string;
    delta: string;
    deltaPositive?: boolean;
    deltaNegative?: boolean;
    explanation: string;
  }>;
  timelineEstimates: Array<{ label: string; range: string }>;
  timelineDisclaimer: string;
  timelineMethodology: string;
  /** When set, section headers show "Last updated: {lastUpdated}". When missing, label is hidden. */
  lastUpdated?: string;
}

export interface DashboardScreenProps {
  isEmployee?: boolean;
  userName?: string;
  /** When provided, dashboard content is driven from this data (mock or real). */
  data?: DashboardData;
  /**
   * When provided, a "Weekly briefing (60–90s)" button is shown in the header
   * area. Clicking it calls this callback (e.g. to open an Explainer modal in the app).
   */
  onOpenWeeklyBriefing?: () => void;
  /** Called by the "Fix resume gap" CTA in Today's Focus hero. */
  onFixResumeGap?: () => void;
  /** Called by the "Decode" CTA in Today's Focus small card (or "Track" when no apps). */
  onDecodeTrackedApp?: () => void;
  /** Called by the "Review" / "Start" CTA in Today's Focus small card. */
  onReviewQuestionnaire?: () => void;
  /**
   * When false (default), show "Start Guided Apply" in second right card.
   * When true, show "Tighten questionnaire alignment" from data.
   * Driven by mock or real guided-apply context; not wired to stores in this pass.
   */
  hasGuidedApplyContext?: boolean;
}

// ---------------------------------------------------------------------------
// Snapshot "How this works" — opens PathAdvisor briefing for local snapshot logic
// ---------------------------------------------------------------------------

function SnapshotHowThisWorksLink() {
  const openBriefing = usePathAdvisorBriefingStore(function (s) {
    return s.openBriefing;
  });
  const handleClick = useCallback(
    function () {
      openBriefing({
        id: 'snapshot-how',
        title: 'How "since last visit" works',
        sourceLabel: 'Briefing',
        sections: [
          {
            heading: 'Local snapshot',
            body: 'PathOS stores a small snapshot of your dashboard (focus and signal counts) in this browser. When you return, it compares the current view to that snapshot to show what changed.',
          },
          {
            heading: 'Privacy',
            body: 'The snapshot stays on your device. Only counts and ids are stored, not the content of your focus or signals.',
          },
          {
            heading: 'Resetting',
            body: 'Clearing site data or using a different browser or device will show no "since last visit" until a new snapshot is saved.',
          },
        ],
      });
    },
    [openBriefing]
  );
  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-[11px] underline hover:no-underline"
      style={{ color: 'var(--p-text-dim)' }}
    >
      How this works
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section header with optional "Last updated" (hidden when no timestamp)
// ---------------------------------------------------------------------------

function SectionHeader(props: { title: string; lastUpdated?: string }) {
  const showUpdated =
    props.lastUpdated !== undefined && props.lastUpdated !== null && props.lastUpdated !== '';
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
      <h2
        className="font-semibold uppercase tracking-[var(--p-letter-spacing-section)]"
        style={{ color: 'var(--p-text-dim)', fontSize: 'var(--p-font-size-section)' }}
      >
        {props.title}
      </h2>
      {showUpdated ? (
        <span className="text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
          Last updated: {props.lastUpdated}
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Briefing: 4 compact tiles (Saved Jobs, Tracked Apps, Readiness, Next Milestone).
// Same card treatment as Resume Readiness tiles: border, radius, surface,
// 1px top accent; no left accent strip. Emphasis via content (value + subtext/deltas).
// All four tiles share a consistent height contract so one tile cannot expand the row.
// ---------------------------------------------------------------------------

/** Minimum height (px) for all Briefing row tiles. Prevents Readiness from stretching others. */
const BRIEFING_TILE_MIN_H = 160;

/**
 * Shared PrimaryMetric styling for briefing row tiles (instrument panel emphasis).
 * Primary value: 26–28px equivalent, bold/heavy, compact line-height.
 * Secondary label: 11–12px muted. No ~18px so numbers read as key markers.
 */
const PRIMARY_METRIC_VALUE_STYLE: React.CSSProperties = {
  color: 'var(--p-text)',
  fontSize: '1.625rem',
  fontWeight: 'bold',
  lineHeight: 1.2,
};
/** Next Milestone value is text (e.g. "Referral review"): headline size so it reads as primary value. */
const PRIMARY_METRIC_HEADLINE_STYLE: React.CSSProperties = {
  color: 'var(--p-text)',
  fontSize: '1.125rem',
  fontWeight: 600,
  lineHeight: 1.25,
};
const PRIMARY_METRIC_LABEL_STYLE: React.CSSProperties = {
  color: 'var(--p-text-muted)',
  fontSize: '11px',
};
const PRIMARY_METRIC_STATUS_STYLE: React.CSSProperties = {
  color: 'var(--p-text-dim)',
  fontSize: '11px',
};
/** CTA: same slot in every tile; muted accent, hover underline; shared class for alignment. */
const BRIEFING_TILE_CTA_CLASS =
  'w-full text-left rounded-[var(--p-radius)] mt-1 p-0 border-0 bg-transparent cursor-pointer text-[11px] font-medium hover:underline focus:outline focus-visible:ring-2 focus-visible:ring-offset-1';

function BriefingTile(props: {
  label: string;
  value: string;
  subtext: string;
  subtextPositive?: boolean;
  /** When true, value is text (e.g. Next Milestone) and uses headline style. */
  valueAsHeadline?: boolean;
  ctaLabel?: string;
  onCtaClick?: () => void;
}) {
  const valueStyle = props.valueAsHeadline === true ? PRIMARY_METRIC_HEADLINE_STYLE : PRIMARY_METRIC_VALUE_STYLE;
  return (
    <div
      className="rounded-[var(--p-radius-lg)] flex flex-col"
      style={{
        background: 'var(--p-surface)',
        border: '1px solid var(--p-border)',
        borderRadius: 'var(--p-radius-lg)',
        boxShadow: 'var(--p-shadow-elev-1)',
        borderTop: '1px solid var(--p-accent-muted)',
        minHeight: BRIEFING_TILE_MIN_H,
      }}
    >
      <div className="p-3 flex flex-col gap-0.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-[11px] uppercase tracking-wide"
            style={{ color: 'var(--p-text-dim)' }}
          >
            {props.label}
          </span>
        </div>
        <p style={valueStyle}>
          {props.value}
        </p>
        <p
          className="text-[11px] font-medium"
          style={{
            color: props.subtextPositive ? 'var(--p-success)' : 'var(--p-text-muted)',
          }}
        >
          {props.subtext}
        </p>
        {props.ctaLabel !== undefined && props.ctaLabel !== '' && props.onCtaClick !== undefined ? (
          <button
            type="button"
            className={BRIEFING_TILE_CTA_CLASS}
            style={{ color: 'var(--p-accent-muted)' }}
            onClick={props.onCtaClick}
            aria-label={props.ctaLabel}
          >
            {props.ctaLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Readiness briefing tile — Compact summary only; Details popover for context
// ---------------------------------------------------------------------------
//
// Single source of truth: getCareerReadinessSummary() from careerReadinessMockData.
// Tile body: primary metric (74/100), label, CTA "Open Career Readiness" only.
// "Target: General readiness" and "Local-only • Updated 2 min ago" live in the Details popover.
// Exactly ONE top-right icon: Details (Info) with aria-label "Readiness details".

function ReadinessBriefingTile(props: { onOpenCareerReadiness: () => void }) {
  const summary = useMemo(function () {
    return getCareerReadinessSummary();
  }, []);
  const scorePart = String(summary.score);
  const scoreMaxPart = '/' + String(summary.scoreMax);
  const targetLabel =
    summary.targetRoleLabel !== undefined && summary.targetRoleLabel !== null && summary.targetRoleLabel !== ''
      ? summary.targetRoleLabel
      : 'General readiness';
  const popoverContainer = getPopoverContainer();

  return (
    <div
      className="rounded-[var(--p-radius-lg)] flex flex-col"
      style={{
        background: 'var(--p-surface)',
        border: '1px solid var(--p-border)',
        borderRadius: 'var(--p-radius-lg)',
        boxShadow: 'var(--p-shadow-elev-1)',
        borderTop: '1px solid var(--p-accent-muted)',
        minHeight: BRIEFING_TILE_MIN_H,
      }}
    >
      <div className="p-3 flex flex-col gap-0.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-[11px] uppercase tracking-wide"
            style={{ color: 'var(--p-text-dim)' }}
          >
            Readiness
          </span>
          <PopoverPrimitive.Root>
            <PopoverPrimitive.Trigger asChild>
              <button
                type="button"
                className="rounded p-0.5 hover:opacity-80 focus:outline focus-visible:ring-2 focus-visible:ring-offset-1 flex-shrink-0"
                style={{ color: 'var(--p-text-muted)' }}
                aria-label="Readiness details"
                onClick={function (e) {
                  e.stopPropagation();
                }}
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal container={popoverContainer}>
              <PopoverPrimitive.Content
                side="bottom"
                sideOffset={6}
                collisionPadding={12}
                className="rounded-[var(--p-radius)] border p-3 text-left w-[240px]"
                style={{
                  background: 'var(--p-surface)',
                  borderColor: 'var(--p-border)',
                  zIndex: Z_POPOVER,
                }}
              >
                <p className="font-semibold text-[12px]" style={{ color: 'var(--p-text)' }}>
                  Readiness details
                </p>
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--p-text-muted)' }}>
                  Target: {targetLabel}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--p-text-muted)' }}>
                  Privacy: Local-only
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--p-text-muted)' }}>
                  Updated: {summary.updatedAt}
                </p>
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--p-text-muted)' }}>
                  Next best action: {summary.nextBestActionText}
                </p>
                <p className="text-[10px] uppercase mt-2" style={{ color: 'var(--p-text-dim)' }}>
                  Top gaps
                </p>
                <ul className="mt-0.5 space-y-0.5 list-none pl-0">
                  {summary.topGaps.slice(0, 3).map(function (g, idx) {
                    return (
                      <li key={idx} className="text-[11px]" style={{ color: 'var(--p-text-muted)' }}>
                        {g.name} (+{g.impact})
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[10px] mt-2 pt-2 border-t" style={{ color: 'var(--p-text-dim)', borderColor: 'var(--p-border)' }}>
                  Computed locally from profile + resume evidence.
                </p>
              </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
          </PopoverPrimitive.Root>
        </div>
        <p className="inline" style={{ margin: 0 }}>
          <span style={PRIMARY_METRIC_VALUE_STYLE}>{scorePart}</span>
          <span className="text-[11px]" style={{ color: 'var(--p-text-muted)' }}>{scoreMaxPart}</span>
        </p>
        <p style={PRIMARY_METRIC_LABEL_STYLE}>
          {summary.label}
        </p>
        <button
          type="button"
          className={BRIEFING_TILE_CTA_CLASS}
          style={{ color: 'var(--p-accent-muted)' }}
          onClick={props.onOpenCareerReadiness}
          aria-label="Open Career Readiness"
        >
          Open Career Readiness
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Today's Focus: hero card; deep explanation opens in PathAdvisor rail (no inline expansion)
// ---------------------------------------------------------------------------

function FocusHeroCard(props: {
  title: string;
  reason: string;
  ctaLabel: string;
  stepBadge: string;
  explainKnow: string;
  explainNotKnow: string;
  explainWhy: string;
  estimatedTime?: string;
  whyItMatters?: string;
  whatYoullDo?: string;
  onCtaClick?: () => void;
  /** Optional grid placement (e.g. md:col-span-2 md:row-span-2) */
  className?: string;
}) {
  const openBriefing = usePathAdvisorBriefingStore(function (s) {
    return s.openBriefing;
  });

  const handleAskPathAdvisor = useCallback(function () {
    openBriefing({
      id: 'hero-focus',
      title: 'Why this is your next best move',
      sourceLabel: "Today's focus",
      sections: [
        { heading: 'What PathOS knows', body: props.explainKnow },
        { heading: 'What PathOS does not know', body: props.explainNotKnow },
        { heading: 'Why this is recommended', body: props.explainWhy },
      ],
    });
  }, [openBriefing, props.explainKnow, props.explainNotKnow, props.explainWhy]);

  const hasDensity =
    (props.estimatedTime !== undefined && props.estimatedTime !== '') ||
    (props.whyItMatters !== undefined && props.whyItMatters !== '') ||
    (props.whatYoullDo !== undefined && props.whatYoullDo !== '');

  return (
    <ModuleCard
      title={'✨ ' + props.title}
      action={
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            background: 'var(--p-accent-bg)',
            color: 'var(--p-accent)',
            border: '1px solid var(--p-accent-muted)',
          }}
        >
          {props.stepBadge}
        </span>
      }
      className={props.className}
    >
      <p className="font-medium" style={{ color: 'var(--p-text)', fontSize: 'var(--p-font-size-body)' }}>
        {props.title}
      </p>
      <p className="mt-1" style={{ color: 'var(--p-text-muted)', fontSize: 'var(--p-font-size-body)' }}>
        {props.reason}
      </p>
      {hasDensity ? (
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--p-border)' }}>
          <CardRowList>
            {props.estimatedTime !== undefined && props.estimatedTime !== '' ? (
              <p className="text-[11px] py-0" style={{ color: 'var(--p-text-dim)' }}>
                <strong style={{ color: 'var(--p-text-muted)' }}>Estimated time:</strong> {props.estimatedTime}
              </p>
            ) : null}
            {props.whyItMatters !== undefined && props.whyItMatters !== '' ? (
              <p className="text-[11px] py-0" style={{ color: 'var(--p-text-dim)' }}>
                <strong style={{ color: 'var(--p-text-muted)' }}>Why it matters:</strong> {props.whyItMatters}
              </p>
            ) : null}
            {props.whatYoullDo !== undefined && props.whatYoullDo !== '' ? (
              <p className="text-[11px] py-0" style={{ color: 'var(--p-text-dim)' }}>
                <strong style={{ color: 'var(--p-text-muted)' }}>What you&apos;ll do:</strong> {props.whatYoullDo}
              </p>
            ) : null}
          </CardRowList>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={props.onCtaClick}
          className="rounded-[var(--p-radius)] px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-90"
          style={{
            background: 'var(--p-accent)',
            color: 'var(--p-bg)',
          }}
        >
          {props.ctaLabel}
        </button>
        <AskPathAdvisorButton
          onClick={handleAskPathAdvisor}
          size="sm"
          tooltipId="focus-hero-ask-pathadvisor-tooltip"
        />
      </div>
    </ModuleCard>
  );
}

/** Hero focus card driven by view model FocusItem; optional dataHero for stepBadge and briefing. */
function FocusHeroCardFromItem(props: {
  item: FocusItem;
  dataHero: DashboardData['focusHero'];
  onCtaClick: () => void;
  className?: string;
}) {
  const d = props.dataHero;
  const stepBadge = d !== null && d !== undefined ? d.stepBadge : 'Step 1';
  const explainKnow = d !== null && d !== undefined ? d.explainKnow : '';
  const explainNotKnow = d !== null && d !== undefined ? d.explainNotKnow : '';
  const explainWhy = d !== null && d !== undefined ? d.explainWhy : '';
  const estimatedTime = d !== null && d !== undefined ? d.estimatedTime : undefined;
  const whyItMatters = d !== null && d !== undefined ? d.whyItMatters : undefined;
  const whatYoullDo = d !== null && d !== undefined ? d.whatYoullDo : undefined;
  return (
    <FocusHeroCard
      title={props.item.title}
      reason={props.item.reason}
      ctaLabel={props.item.actionLabel}
      stepBadge={stepBadge}
      explainKnow={explainKnow}
      explainNotKnow={explainNotKnow}
      explainWhy={explainWhy}
      estimatedTime={estimatedTime}
      whyItMatters={whyItMatters}
      whatYoullDo={whatYoullDo}
      onCtaClick={props.onCtaClick}
      className={props.className}
    />
  );
}

/** Small focus card from view model with optional dismiss (recognition over recall). */
function FocusSmallCardFromItem(props: {
  item: FocusItem;
  onCtaClick: () => void;
  onDismiss?: () => void;
}) {
  return (
    <ModuleCard title={props.item.title}>
      <p className="mt-0.5" style={{ color: 'var(--p-text-muted)', fontSize: 'var(--p-font-size-body)' }}>
        {props.item.reason}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={props.onCtaClick}
          className="rounded-[var(--p-radius)] px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-90"
          style={{
            background: 'var(--p-surface2)',
            border: '1px solid var(--p-border)',
            color: 'var(--p-text)',
          }}
        >
          {props.item.actionLabel}
        </button>
        {props.onDismiss !== undefined ? (
          <button
            type="button"
            onClick={props.onDismiss}
            className="rounded-[var(--p-radius)] px-2 py-1 text-[11px] transition-colors hover:opacity-80"
            style={{ color: 'var(--p-text-dim)' }}
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </ModuleCard>
  );
}

/** Dismissed focus items in subdued style when "Show dismissed" is expanded. */
function DismissedFocusList(props: {
  dismissedIds: string[];
  allFocus: FocusItem[];
  onUndo: (id: string) => void;
}) {
  const idToItem: Record<string, FocusItem> = {};
  for (let i = 0; i < props.allFocus.length; i++) {
    idToItem[props.allFocus[i].id] = props.allFocus[i];
  }
  const items: FocusItem[] = [];
  for (let i = 0; i < props.dismissedIds.length; i++) {
    const item = idToItem[props.dismissedIds[i]];
    if (item !== undefined) {
      items.push(item);
    }
  }
  if (items.length === 0) {
    return null;
  }
  return (
    <div
      className="mt-2 pt-2 border-t rounded-[var(--p-radius)] px-2 py-1"
      style={{ borderColor: 'var(--p-border)', background: 'var(--p-surface2)', opacity: 0.9 }}
    >
      {items.map(function (item) {
        return (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 py-1 text-[11px]"
            style={{ color: 'var(--p-text-muted)' }}
          >
            <span>{item.title}</span>
            <button
              type="button"
              onClick={function () {
                props.onUndo(item.id);
              }}
              className="underline hover:no-underline"
              style={{ color: 'var(--p-text-dim)' }}
            >
              Undo
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Calm empty state when no focus items; single CTA routes via shared route constant. */
function DashboardEmptyFocus(props: { onNavigate: (path: string) => void }) {
  return (
    <ModuleCard title="Today's Focus">
      <p className="mt-0.5" style={{ color: 'var(--p-text-muted)', fontSize: 'var(--p-font-size-body)' }}>
        Nothing in focus right now. Explore job search or come back later.
      </p>
      <button
        type="button"
        onClick={function () {
          props.onNavigate(JOB_SEARCH);
        }}
        className="mt-3 rounded-[var(--p-radius)] px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-90"
        style={{
          background: 'var(--p-accent)',
          color: 'var(--p-bg)',
        }}
      >
        Explore job search
      </button>
    </ModuleCard>
  );
}

/** Calm empty state when no signals; single CTA to job search. */
function DashboardEmptySignals(props: { onNavigate: (path: string) => void }) {
  return (
    <ModuleCard title="Signals" variant="dense">
      <p className="mt-0.5" style={{ color: 'var(--p-text-muted)', fontSize: 'var(--p-font-size-body)' }}>
        No updates or timeline signals yet. Save jobs or track applications to see activity here.
      </p>
      <button
        type="button"
        onClick={function () {
          props.onNavigate(JOB_SEARCH);
        }}
        className="mt-3 rounded-[var(--p-radius)] px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-90"
        style={{
          background: 'var(--p-accent)',
          color: 'var(--p-bg)',
        }}
      >
        Go to job search
      </button>
    </ModuleCard>
  );
}

// ---------------------------------------------------------------------------
// Your Active Tracks: Saved Jobs, Applications, Resume cards with lists
// ---------------------------------------------------------------------------

function SavedJobsCard(props: {
  items: Array<{ title: string; orgGrade: string; status: string; timeAgo: string }>;
}) {
  const count = props.items.length;
  return (
    <ModuleCard title="SAVED JOBS" subtitle={count + ' jobs'} variant="dense">
      <CardRowList className="mt-0">
        {props.items.map(function (item, i) {
          return (
            <div key={i} className="flex flex-wrap items-baseline justify-between gap-2 text-[12px] py-1">
              <div className="min-w-0 flex-1">
                <span style={{ color: 'var(--p-text)' }}>{item.title}</span>
                <span className="ml-1" style={{ color: 'var(--p-text-muted)' }}>
                  ({item.orgGrade})
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    background: 'var(--p-surface2)',
                    border: '1px solid var(--p-border)',
                    color: 'var(--p-text-muted)',
                  }}
                >
                  {item.status}
                </span>
                <span style={{ color: 'var(--p-text-dim)', fontSize: '11px' }}>{item.timeAgo}</span>
              </div>
            </div>
          );
        })}
      </CardRowList>
    </ModuleCard>
  );
}

function ApplicationsCard(props: {
  items: Array<{
    title: string;
    submittedDate: string;
    status: string;
    statusVariant?: string;
  }>;
}) {
  const count = props.items.length;
  return (
    <ModuleCard title="APPLICATIONS" subtitle={count + ' tracked'} variant="dense">
      <CardRowList className="mt-0">
        {props.items.map(function (item, i) {
          const chipBg =
            item.statusVariant === 'info'
              ? 'var(--p-info-bg)'
              : item.statusVariant === 'warning'
                ? 'var(--p-warning-bg)'
                : 'var(--p-surface2)';
          const chipBorder =
            item.statusVariant === 'info'
              ? 'var(--p-info)'
              : item.statusVariant === 'warning'
                ? 'var(--p-warning)'
                : 'var(--p-border)';
          return (
            <div key={i} className="flex flex-wrap items-baseline justify-between gap-2 text-[12px] py-1">
              <div className="min-w-0 flex-1">
                <span style={{ color: 'var(--p-text)' }}>{item.title}</span>
                <span className="block text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
                  {item.submittedDate}
                </span>
              </div>
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0"
                style={{
                  background: chipBg,
                  border: '1px solid ' + chipBorder,
                  color: 'var(--p-text)',
                }}
              >
                {item.status}
              </span>
            </div>
          );
        })}
      </CardRowList>
      <p className="mt-2 text-[10px]" style={{ color: 'var(--p-text-dim)' }}>
        Statuses update automatically from USAJOBS
      </p>
    </ModuleCard>
  );
}

function ResumeCard(props: {
  progressPercent: number;
  checklist: Array<{ label: string; checked: boolean }>;
  openCtaLabel: string;
}) {
  return (
    <ModuleCard title="RESUME" subtitle={props.progressPercent + '% complete'} variant="dense">
      <div
        className="h-2 rounded-full overflow-hidden mt-1"
        style={{ background: 'var(--p-surface2)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: props.progressPercent + '%',
            background: 'var(--p-accent)',
          }}
        />
      </div>
      <CardRowList className="mt-3 text-[12px]">
        {props.checklist.map(function (item, i) {
          return (
            <div key={i} className="flex items-center gap-2 py-1" style={{ color: 'var(--p-text-muted)' }}>
              <span
                className="inline-block w-4 h-4 rounded border flex-shrink-0 grid place-items-center text-[10px]"
                style={{
                  borderColor: 'var(--p-border)',
                  background: item.checked ? 'var(--p-success)' : 'var(--p-surface2)',
                  color: item.checked ? 'var(--p-bg)' : 'var(--p-text-dim)',
                }}
              >
                {item.checked ? '✓' : ''}
              </span>
              {item.label}
            </div>
          );
        })}
      </CardRowList>
      <button
        type="button"
        className="mt-3 w-full rounded-[var(--p-radius)] px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-1.5"
        style={{
          background: 'var(--p-surface2)',
          border: '1px solid var(--p-border)',
          color: 'var(--p-text)',
        }}
      >
        {props.openCtaLabel}
        <ExternalLink className="w-3.5 h-3.5" style={{ color: 'var(--p-text-muted)' }} />
      </button>
    </ModuleCard>
  );
}

// ---------------------------------------------------------------------------
// Signals: Updates since visit, Readiness deltas, Timeline estimates
// ---------------------------------------------------------------------------

const SIGNAL_ICONS: Record<string, React.ReactNode> = {
  bell: <Bell className="w-3.5 h-3.5" style={{ color: 'var(--p-text-muted)' }} />,
  document: <FileText className="w-3.5 h-3.5" style={{ color: 'var(--p-text-muted)' }} />,
  trend: <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--p-success)' }} />,
  clock: <Clock className="w-3.5 h-3.5" style={{ color: 'var(--p-text-muted)' }} />,
  warning: <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--p-warning)' }} />,
};

function UpdatesSinceVisitCard(props: {
  items: Array<{ icon: string; text: string; timeAgo: string }>;
  onNavigate?: (path: string) => void;
}) {
  const isEmpty = props.items.length === 0;
  if (isEmpty && props.onNavigate !== undefined) {
    return (
      <ModuleCard title="UPDATES SINCE LAST VISIT" variant="dense">
        <p className="text-[12px] mt-0" style={{ color: 'var(--p-text-muted)' }}>
          No application or job updates yet.
        </p>
        <button
          type="button"
          onClick={function () {
            const nav = props.onNavigate;
            if (nav !== undefined) {
              nav(IMPORT);
            }
          }}
          className="mt-3 rounded-[var(--p-radius)] px-3 py-1.5 text-[12px] font-medium transition-colors hover:opacity-90"
          style={{
            background: 'var(--p-surface2)',
            border: '1px solid var(--p-border)',
            color: 'var(--p-text)',
          }}
        >
          Track applications
        </button>
      </ModuleCard>
    );
  }
  if (isEmpty) {
    return (
      <ModuleCard title="UPDATES SINCE LAST VISIT" variant="dense">
        <p className="text-[12px] mt-0" style={{ color: 'var(--p-text-muted)' }}>
          No application or job updates yet.
        </p>
      </ModuleCard>
    );
  }
  return (
    <ModuleCard title="UPDATES SINCE LAST VISIT" variant="dense">
      <CardRowList className="mt-0">
        {props.items.map(function (item, i) {
          const iconEl = SIGNAL_ICONS[item.icon];
          return (
            <div key={i} className="flex gap-2 text-[12px] py-1">
              <span className="flex-shrink-0 mt-0.5">{iconEl != null ? iconEl : null}</span>
              <div className="min-w-0 flex-1">
                <span style={{ color: 'var(--p-text)' }}>{item.text}</span>
                <span className="block text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
                  {item.timeAgo}
                </span>
              </div>
            </div>
          );
        })}
      </CardRowList>
    </ModuleCard>
  );
}

function ReadinessDeltasCard(props: {
  items: Array<{
    label: string;
    delta: string;
    deltaPositive?: boolean;
    deltaNegative?: boolean;
    explanation: string;
  }>;
  onNavigate?: (path: string) => void;
}) {
  const isEmpty = props.items.length === 0;
  if (isEmpty && props.onNavigate !== undefined) {
    return (
      <ModuleCard title="READINESS DELTAS" variant="dense">
        <p className="text-[12px] mt-0" style={{ color: 'var(--p-text-muted)' }}>
          No readiness changes yet.
        </p>
        <button
          type="button"
          onClick={function () {
            const nav = props.onNavigate;
            if (nav !== undefined) {
              nav(RESUME_BUILDER);
            }
          }}
          className="mt-3 rounded-[var(--p-radius)] px-3 py-1.5 text-[12px] font-medium transition-colors hover:opacity-90"
          style={{
            background: 'var(--p-surface2)',
            border: '1px solid var(--p-border)',
            color: 'var(--p-text)',
          }}
        >
          Open Resume Builder
        </button>
      </ModuleCard>
    );
  }
  if (isEmpty) {
    return (
      <ModuleCard title="READINESS DELTAS" variant="dense">
        <p className="text-[12px] mt-0" style={{ color: 'var(--p-text-muted)' }}>
          No readiness changes yet.
        </p>
      </ModuleCard>
    );
  }
  return (
    <ModuleCard title="READINESS DELTAS" variant="dense">
      <CardRowList className="mt-0">
        {props.items.map(function (item, i) {
          const deltaColor = item.deltaPositive
            ? 'var(--p-success)'
            : item.deltaNegative
              ? 'var(--p-danger)'
              : 'var(--p-text-muted)';
          return (
            <div key={i} className="text-[12px] py-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span style={{ color: 'var(--p-text)' }}>{item.label}</span>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0"
                  style={{
                    background: 'var(--p-surface2)',
                    border: '1px solid var(--p-border)',
                    color: deltaColor,
                  }}
                >
                  {item.delta}
                </span>
              </div>
              <p className="mt-0.5 text-[11px]" style={{ color: 'var(--p-text-muted)' }}>
                {item.explanation}
              </p>
            </div>
          );
        })}
      </CardRowList>
    </ModuleCard>
  );
}

function TimelineEstimatesCard(props: {
  disclaimer: string;
  items: Array<{ label: string; range: string }>;
  methodology: string;
  onNavigate?: (path: string) => void;
}) {
  const openBriefing = usePathAdvisorBriefingStore(function (s) {
    return s.openBriefing;
  });

  const handleAskPathAdvisor = useCallback(function () {
    openBriefing({
      id: 'timeline-methodology',
      title: 'How PathAdvisor estimates timelines',
      sourceLabel: 'Timeline estimates',
      sections: [
        {
          heading: 'Data is historical',
          body: 'These estimates are derived from aggregated USAJOBS data and user-reported timelines.',
        },
        {
          heading: 'Ranges vary',
          body: 'Factors like agency workload, clearance requirements, and hiring authority type can significantly extend or shorten these windows.',
        },
        {
          heading: 'No guarantees',
          body: 'They reflect median values, not guarantees. Your timeline may be shorter or longer.',
        },
        {
          heading: 'What signals matter',
          body: 'PathAdvisor uses job series, agency, and submission date to align you with similar cases; updates may refine estimates as more data is available.',
        },
      ],
    });
  }, [openBriefing]);

  const isEmpty = props.items.length === 0;
  if (isEmpty && props.onNavigate !== undefined) {
    return (
      <ModuleCard title="TIMELINE ESTIMATES" variant="dense">
        <p className="text-[12px] mt-0" style={{ color: 'var(--p-text-muted)' }}>
          No timeline estimates yet.
        </p>
        <button
          type="button"
          onClick={function () {
            const nav = props.onNavigate;
            if (nav !== undefined) {
              nav(RESUME_BUILDER);
            }
          }}
          className="mt-3 rounded-[var(--p-radius)] px-3 py-1.5 text-[12px] font-medium transition-colors hover:opacity-90"
          style={{
            background: 'var(--p-surface2)',
            border: '1px solid var(--p-border)',
            color: 'var(--p-text)',
          }}
        >
          Open Resume Builder
        </button>
        <div className="mt-2">
          <AskPathAdvisorButton
            onClick={handleAskPathAdvisor}
            size="sm"
            tooltipId="timeline-ask-pathadvisor-tooltip"
            tooltipText="Opens PathAdvisor briefing explaining how timeline estimates are calculated."
          />
        </div>
      </ModuleCard>
    );
  }
  if (isEmpty) {
    return (
      <ModuleCard title="TIMELINE ESTIMATES" variant="dense">
        <p className="text-[12px] mt-0" style={{ color: 'var(--p-text-muted)' }}>
          No timeline estimates yet.
        </p>
        <div className="mt-2">
          <AskPathAdvisorButton
            onClick={handleAskPathAdvisor}
            size="sm"
            tooltipId="timeline-ask-pathadvisor-tooltip"
            tooltipText="Opens PathAdvisor briefing explaining how timeline estimates are calculated."
          />
        </div>
      </ModuleCard>
    );
  }

  return (
    <ModuleCard title="TIMELINE ESTIMATES" variant="dense">
      <p className="text-[11px] flex items-start gap-1.5 mt-0" style={{ color: 'var(--p-text-muted)' }}>
        <span className="flex-shrink-0 mt-0.5">
          <LayoutList className="w-3.5 h-3.5" style={{ color: 'var(--p-info)' }} />
        </span>
        {props.disclaimer}
      </p>
      <div className="mt-2 pt-2 text-[12px]" style={{ borderTop: '1px solid var(--p-border-light)' }}>
        <CardRowList>
          {props.items.map(function (item, i) {
            return (
              <div key={i} className="flex justify-between gap-2 py-1">
                <span style={{ color: 'var(--p-text)' }}>{item.label}</span>
                <span style={{ color: 'var(--p-text-muted)' }}>{item.range}</span>
              </div>
            );
          })}
        </CardRowList>
      </div>
      <div className="mt-2">
        <AskPathAdvisorButton
          onClick={handleAskPathAdvisor}
          size="sm"
          tooltipId="timeline-ask-pathadvisor-tooltip"
          tooltipText="Opens PathAdvisor briefing explaining how timeline estimates are calculated."
        />
      </div>
    </ModuleCard>
  );
}

// ---------------------------------------------------------------------------
// Placeholder fallbacks when no data (minimal; match prior scaffold)
// ---------------------------------------------------------------------------

function TrackPlaceholderCard(props: { title: string }) {
  return (
    <ModuleCard title={props.title} variant="dense">
      <p className="mt-0.5" style={{ color: 'var(--p-text-muted)', fontSize: 'var(--p-font-size-body)' }}>
        Placeholder. No real logic in Pass 1.
      </p>
    </ModuleCard>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard screen — Command Center layout driven by optional data
// ---------------------------------------------------------------------------

const DASHBOARD_SUGGESTED_PROMPTS = [
  'What should I focus on first today?',
  'Why did my readiness score change?',
  'When can I expect a referral decision?',
];

export function DashboardScreen(props: DashboardScreenProps) {
  const hasWeeklyBriefing = props.onOpenWeeklyBriefing !== undefined && props.onOpenWeeklyBriefing !== null;
  const data = props.data !== undefined && props.data !== null ? props.data : mockDashboardData;
  const nav = useNav();
  const setOverrides = usePathAdvisorScreenOverridesStore(function (s) {
    return s.setOverrides;
  });
  const setHeroDoNow = useDashboardHeroDoNowStore(function (s) {
    return s.setAction;
  });

  useEffect(
    function () {
      setOverrides({
        screenId: 'dashboard',
        viewingLabel: 'Dashboard',
        suggestedPrompts: DASHBOARD_SUGGESTED_PROMPTS,
      });
      return function () {
        setOverrides(null);
      };
    },
    [setOverrides]
  );

  const viewModel = useMemo(
    function () {
      return buildDashboardViewModel(data);
    },
    [data]
  );

  const {
    changes,
    dismissedFocusIds,
    dismissFocusId,
    undoDismissFocusId,
  } = useDashboardSnapshot(viewModel);
  const [showDismissedExpanded, setShowDismissedExpanded] = useState(false);

  const visibleFocus = useMemo(
    function () {
      const dismissedSet: Record<string, boolean> = {};
      for (let i = 0; i < dismissedFocusIds.length; i++) {
        dismissedSet[dismissedFocusIds[i]] = true;
      }
      const out: FocusItem[] = [];
      for (let i = 0; i < viewModel.focus.length; i++) {
        if (!dismissedSet[viewModel.focus[i].id]) {
          out.push(viewModel.focus[i]);
        }
      }
      return out;
    },
    [viewModel.focus, dismissedFocusIds]
  );

  useEffect(
    function () {
      const hero = visibleFocus.length > 0 && visibleFocus[0].id === 'focus-hero'
        ? visibleFocus[0]
        : null;
      if (hero !== null) {
        setHeroDoNow({ label: hero.actionLabel, route: hero.actionRoute });
      } else {
        setHeroDoNow(null);
      }
    },
    [visibleFocus, setHeroDoNow]
  );

  const handleDoNow = useCallback(
    function (path: string) {
      if (path !== null && path !== undefined && path !== '') {
        const pathWithHash =
          path === CAREER_READINESS ? path + '#action-plan' : path;
        nav.push(pathWithHash);
      }
    },
    [nav]
  );

  return (
    <div className="p-4 lg:p-5 space-y-5">
      {/* Header: title, subtitle, optional Weekly briefing button */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="font-semibold"
            style={{ color: 'var(--p-text)', fontSize: 'var(--p-font-size-page-title)' }}
          >
            Dashboard
          </h1>
          <p
            className="mt-0.5"
            style={{ color: 'var(--p-text-muted)', fontSize: 'var(--p-font-size-body)' }}
          >
            Your command center for federal job search.
          </p>
        </div>
        {hasWeeklyBriefing ? (
          <button
            type="button"
            onClick={props.onOpenWeeklyBriefing}
            className="rounded-[var(--p-radius)] px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 shrink-0 flex items-center gap-1.5"
            style={{
              background: 'var(--p-surface2)',
              border: '1px solid var(--p-border)',
              color: 'var(--p-text)',
            }}
          >
            <Sparkles className="w-4 h-4" style={{ color: 'var(--p-accent)' }} />
            Weekly briefing (60–90s)
          </button>
        ) : null}
      </div>

      {/* A) Briefing row: 4 compact tiles; "since last visit" only when there are actual changes; How this works opens PathAdvisor. */}
      {data.briefing && data.briefing.length > 0 ? (
        <div>
          <SectionHeader title="Briefing" lastUpdated={viewModel.lastUpdated} />
          {changes.hasPriorVisit && changes.summaryLine !== '' ? (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-2">
              <p className="text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
                {changes.summaryLine}
              </p>
              <SnapshotHowThisWorksLink />
            </div>
          ) : null}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.briefing.map(function (tile, i) {
              if (tile.label === 'Readiness') {
                return (
                  <ReadinessBriefingTile
                    key={i}
                    onOpenCareerReadiness={function () {
                      nav.push(CAREER_READINESS);
                    }}
                  />
                );
              }
              const ctaLabel =
                tile.label === 'Saved Jobs'
                  ? 'Open Saved Jobs'
                  : tile.label === 'Tracked Apps'
                    ? 'Open Applications'
                    : tile.label === 'Next Milestone'
                      ? 'Open Status'
                      : undefined;
              const ctaRoute =
                tile.label === 'Saved Jobs'
                  ? SAVED_JOBS
                  : tile.label === 'Tracked Apps' || tile.label === 'Next Milestone'
                    ? IMPORT
                    : undefined;
              return (
                <BriefingTile
                  key={i}
                  label={tile.label}
                  value={tile.value}
                  subtext={tile.subtext}
                  subtextPositive={tile.subtextPositive}
                  valueAsHeadline={tile.label === 'Next Milestone'}
                  ctaLabel={ctaLabel}
                  onCtaClick={
                    ctaRoute !== undefined
                      ? function () {
                          nav.push(ctaRoute);
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {/* B) Today's Focus: view model driven; hero then secondary cards; dismiss (optional for hero) + undo. */}
      <div>
        <SectionHeader title="Today's Focus" lastUpdated={viewModel.lastUpdated} />
        {visibleFocus.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visibleFocus[0].id === 'focus-hero' ? (
              <FocusHeroCardFromItem
                item={visibleFocus[0]}
                dataHero={data.focusHero}
                onCtaClick={function () {
                  publishScreenContext({
                    screen: 'dashboard',
                    anchor: { type: 'card', id: 'dashboard:focus', label: visibleFocus[0].title },
                    title: visibleFocus[0].title,
                    sections: [{ lines: [visibleFocus[0].reason] }],
                    tags: ['localOnly'],
                    dedupeKey: 'dashboard:focus:' + visibleFocus[0].actionRoute,
                  });
                  handleDoNow(visibleFocus[0].actionRoute);
                }}
                className="md:col-span-2 md:row-span-2"
              />
            ) : (
              <div className="md:col-span-2 md:row-span-2" />
            )}
            {visibleFocus[0].id === 'focus-hero' && visibleFocus.length > 1 ? (
              <div className="md:col-start-3 md:row-start-1">
                <FocusSmallCardFromItem
                  item={visibleFocus[1]}
                  onCtaClick={function () {
                    publishScreenContext({
                      screen: 'dashboard',
                      anchor: { type: 'card', id: 'dashboard:focus:' + visibleFocus[1].id, label: visibleFocus[1].title },
                      title: visibleFocus[1].title,
                      sections: [{ lines: [visibleFocus[1].reason] }],
                      tags: ['localOnly'],
                      dedupeKey: 'dashboard:focus:' + visibleFocus[1].actionRoute,
                    });
                    handleDoNow(visibleFocus[1].actionRoute);
                  }}
                  onDismiss={function () {
                    dismissFocusId(visibleFocus[1].id);
                  }}
                />
              </div>
            ) : visibleFocus.length > 0 ? (
              <div className="md:col-start-3 md:row-start-1">
                <FocusSmallCardFromItem
                  item={visibleFocus[0]}
                  onCtaClick={function () {
                    publishScreenContext({
                      screen: 'dashboard',
                      anchor: { type: 'card', id: 'dashboard:focus:' + visibleFocus[0].id, label: visibleFocus[0].title },
                      title: visibleFocus[0].title,
                      sections: [{ lines: [visibleFocus[0].reason] }],
                      tags: ['localOnly'],
                      dedupeKey: 'dashboard:focus:' + visibleFocus[0].actionRoute,
                    });
                    handleDoNow(visibleFocus[0].actionRoute);
                  }}
                  onDismiss={function () {
                    dismissFocusId(visibleFocus[0].id);
                  }}
                />
              </div>
            ) : null}
            {visibleFocus[0].id === 'focus-hero' && visibleFocus.length > 2 ? (
              <div className="md:col-start-3 md:row-start-2">
                <FocusSmallCardFromItem
                  item={visibleFocus[2]}
                  onCtaClick={function () {
                    publishScreenContext({
                      screen: 'dashboard',
                      anchor: { type: 'card', id: 'dashboard:focus:' + visibleFocus[2].id, label: visibleFocus[2].title },
                      title: visibleFocus[2].title,
                      sections: [{ lines: [visibleFocus[2].reason] }],
                      tags: ['localOnly'],
                      dedupeKey: 'dashboard:focus:' + visibleFocus[2].actionRoute,
                    });
                    handleDoNow(visibleFocus[2].actionRoute);
                  }}
                  onDismiss={function () {
                    dismissFocusId(visibleFocus[2].id);
                  }}
                />
              </div>
            ) : visibleFocus.length > 1 ? (
              <div className="md:col-start-3 md:row-start-2">
                <FocusSmallCardFromItem
                  item={visibleFocus[1]}
                  onCtaClick={function () {
                    publishScreenContext({
                      screen: 'dashboard',
                      anchor: { type: 'card', id: 'dashboard:focus:' + visibleFocus[1].id, label: visibleFocus[1].title },
                      title: visibleFocus[1].title,
                      sections: [{ lines: [visibleFocus[1].reason] }],
                      tags: ['localOnly'],
                      dedupeKey: 'dashboard:focus:' + visibleFocus[1].actionRoute,
                    });
                    handleDoNow(visibleFocus[1].actionRoute);
                  }}
                  onDismiss={function () {
                    dismissFocusId(visibleFocus[1].id);
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        {dismissedFocusIds.length > 0 ? (
          <div className="mt-2">
            <button
              type="button"
              onClick={function () {
                setShowDismissedExpanded(!showDismissedExpanded);
              }}
              className="text-[10px] underline hover:no-underline"
              style={{ color: 'var(--p-text-dim)', opacity: 0.85 }}
            >
              {showDismissedExpanded ? 'Hide dismissed' : 'Show dismissed'}
            </button>
            {showDismissedExpanded ? (
              <DismissedFocusList
                dismissedIds={dismissedFocusIds}
                allFocus={viewModel.focus}
                onUndo={undoDismissFocusId}
              />
            ) : null}
          </div>
        ) : null}
        {visibleFocus.length === 0 && dismissedFocusIds.length === 0 ? (
          <DashboardEmptyFocus onNavigate={handleDoNow} />
        ) : null}
      </div>

      {/* C) Your Active Tracks: view model driven; top 3 items per track for preview. */}
      <div>
        <SectionHeader title="Your Active Tracks" lastUpdated={viewModel.lastUpdated} />
        {viewModel.tracks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.savedJobs && data.savedJobs.length > 0 ? (
              <SavedJobsCard items={data.savedJobs.slice(0, 3)} />
            ) : (
              <TrackPlaceholderCard title="Saved Jobs" />
            )}
            {data.applications && data.applications.length > 0 ? (
              <ApplicationsCard items={data.applications.slice(0, 3)} />
            ) : (
              <TrackPlaceholderCard title="Applications" />
            )}
            {data.resume ? (
              <ResumeCard
                progressPercent={data.resume.progressPercent}
                checklist={data.resume.checklist}
                openCtaLabel={data.resume.openCtaLabel}
              />
            ) : (
              <TrackPlaceholderCard title="Resume" />
            )}
          </div>
        ) : null}
      </div>

      {/* D) Signals: view model driven (updatesSinceVisit, readinessDeltas, timeline). */}
      <div>
        <SectionHeader title="Signals" lastUpdated={viewModel.lastUpdated} />
        {viewModel.signals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UpdatesSinceVisitCard items={viewModel.updatesSinceVisit} onNavigate={handleDoNow} />
            <ReadinessDeltasCard items={viewModel.readinessDeltas} onNavigate={handleDoNow} />
            <TimelineEstimatesCard
              disclaimer={viewModel.timelineDisclaimer}
              items={viewModel.timelineEstimates}
              methodology={viewModel.timelineMethodology}
              onNavigate={handleDoNow}
            />
          </div>
        ) : (
          <DashboardEmptySignals onNavigate={handleDoNow} />
        )}
      </div>
    </div>
  );
}
