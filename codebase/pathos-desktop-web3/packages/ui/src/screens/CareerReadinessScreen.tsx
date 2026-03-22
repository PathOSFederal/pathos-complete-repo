/**
 * ============================================================================
 * CAREER READINESS SCREEN — Competitiveness baseline for federal roles
 * ============================================================================
 *
 * BOUNDARY RULE: No next/* or electron/* imports.
 *
 * Layout: title row with header controls; primary score card; two-column
 * (Readiness Trajectory chart, Readiness Radar + gaps); Action Plan card;
 * Evidence & Inputs collapsible. PathAdvisor rail overrides set on mount
 * (Viewing: Career Readiness, INSIGHT + NEXT BEST ACTION). Local-only mock data.
 */

'use client';

import type React from 'react';
import { useEffect, useState, useCallback } from 'react';
import {
  Cog,
  RefreshCw,
  TrendingUp,
  Radar,
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { ModuleCard } from '../components/ModuleCard';
import { FilterDropdown } from './_components/FilterDropdown';
import { usePathAdvisorScreenOverridesStore } from '../stores/pathAdvisorScreenOverridesStore';
import { INTERACTIVE_HOVER_CLASS } from '../styles/interactiveHover';
import {
  CAREER_READINESS_MOCK,
  type CareerReadinessMockData,
  type ActionPlanItem,
} from './careerReadiness/careerReadinessMockData';
import { ReadinessTrajectoryEChart } from './careerReadiness/ReadinessTrajectoryEChart';
import { ReadinessRadarEChart } from './careerReadiness/ReadinessRadarEChart';
import { publishScreenContext } from '../lib/pathAdvisorPublish';

// ---------------------------------------------------------------------------
// Target role dropdown options (header)
// ---------------------------------------------------------------------------

const TARGET_ROLE_OPTIONS = [
  { value: 'general', label: 'General readiness (recommended)' },
];

/** One line of context under the score badge based on selected target role. */
function getTargetRoleMicrocopy(value: string): string {
  if (value === 'general') {
    return 'Baseline competitiveness across common federal roles.';
  }
  if (value.indexOf('GS-13') !== -1 && value.indexOf('Program') !== -1) {
    return 'Competitiveness for GS-13 Program Analyst (0343) roles.';
  }
  return 'Baseline competitiveness across common federal roles.';
}

// ---------------------------------------------------------------------------
// Projected readiness: base + sum(selected impacts), clamp to 100
// ---------------------------------------------------------------------------

function computeProjectedScore(baseScore: number, selectedIds: Set<string>, items: ActionPlanItem[]): number {
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    if (selectedIds.has(items[i].id)) {
      sum += items[i].impact;
    }
  }
  const total = baseScore + sum;
  return total > 100 ? 100 : total;
}

// ---------------------------------------------------------------------------
// CareerReadinessScreen
// ---------------------------------------------------------------------------

export function CareerReadinessScreen(): React.ReactElement {
  const mock: CareerReadinessMockData = CAREER_READINESS_MOCK;
  const setOverrides = usePathAdvisorScreenOverridesStore(function (s) { return s.setOverrides; });

  const [targetRole, setTargetRole] = useState('general');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set(['quantified']));

  const projectedScore = computeProjectedScore(mock.score, selectedActionIds, mock.actionPlanItems);

  useEffect(
    function scrollToActionPlanWhenHashPresent() {
      if (typeof window === 'undefined') return;
      if (window.location.hash !== '#action-plan') return;
      const el = document.getElementById('action-plan');
      if (el !== null) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    []
  );

  useEffect(
    function () {
      setOverrides({
        screenId: 'career-readiness',
        viewingLabel: 'Career Readiness',
        suggestedPrompts: [
          'Why is my readiness 74?',
          'What will move the needle most?',
          'How is the score calculated?',
        ],
      });
      return function () {
        setOverrides(null);
      };
    },
    [setOverrides]
  );

  const toggleAction = useCallback(function (id: string) {
    setSelectedActionIds(function (prev) {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelections = useCallback(function () {
    setSelectedActionIds(new Set());
  }, []);

  return (
    <div className="p-6 pb-8 space-y-6">
      {/* Title row + header controls */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--p-text)' }}>
            Career Readiness
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--p-text-muted)' }}>
            Your competitiveness baseline for federal roles.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Cog className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--p-accent)' }} aria-hidden />
            <FilterDropdown
              value={targetRole}
              label="Target role"
              options={TARGET_ROLE_OPTIONS}
              onSelect={setTargetRole}
            />
          </div>
          <span className="text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
            Local-only • Updated 2 min ago
          </span>
          <button
            type="button"
            className={INTERACTIVE_HOVER_CLASS + ' h-9 w-9 grid place-items-center rounded-[var(--p-radius)] border'}
            style={{
              background: 'var(--p-surface2)',
              borderColor: 'var(--p-border)',
              color: 'var(--p-text-muted)',
            }}
            aria-label="Recompute readiness"
            title="Recompute readiness"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary score card (full width) — no card title, same chrome as ModuleCard */}
      <div
        className="p-4"
        style={{
          background: 'var(--p-surface)',
          border: '1px solid var(--p-border)',
          borderRadius: 'var(--p-radius-lg)',
          boxShadow: 'var(--p-shadow-elev-1)',
          borderTop: '1px solid var(--p-accent-muted)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-3xl font-bold" style={{ color: 'var(--p-text)' }}>
              {mock.score} / {mock.scoreMax}
            </p>
            <span
              className="inline-block mt-2 px-2.5 py-1 text-[12px] font-medium rounded"
              style={{ background: 'var(--p-warning-bg)', color: 'var(--p-warning)' }}
            >
              {mock.badgeLabel}
            </span>
            <p className="mt-1.5 text-[11px] max-w-xl" style={{ color: 'var(--p-text-dim)' }}>
              {getTargetRoleMicrocopy(targetRole)}
            </p>
            <p className="mt-2 text-sm max-w-xl" style={{ color: 'var(--p-text-muted)' }}>
              {mock.explanationText}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={INTERACTIVE_HOVER_CLASS + ' px-4 py-2 text-sm font-medium rounded-[var(--p-radius)]'}
              style={{
                background: 'var(--p-accent)',
                color: 'var(--p-bg)',
              }}
              onClick={function () {
                publishScreenContext({
                  screen: 'career-readiness',
                  anchor: { type: 'card', id: 'career-readiness:improve', label: 'Improve readiness' },
                  title: 'What to do next',
                  sections: [
                    { title: 'Why this matters', lines: [mock.explanationText] },
                    { title: 'Next steps', bullets: mock.actionPlanItems.slice(0, 3).map(function (a) { return a.label + ' (+' + String(a.impact) + ')'; }) },
                  ],
                  tags: ['localOnly'],
                  dedupeKey: 'career-readiness:improve',
                });
              }}
            >
              Improve readiness
            </button>
            <button
              type="button"
              className={INTERACTIVE_HOVER_CLASS + ' px-4 py-2 text-sm font-medium rounded-[var(--p-radius)] border'}
              style={{
                borderColor: 'var(--p-accent)',
                color: 'var(--p-accent)',
                background: 'transparent',
              }}
              onClick={function () {
                publishScreenContext({
                  screen: 'career-readiness',
                  anchor: { type: 'card', id: 'career-readiness:opportunities', label: 'View top opportunities' },
                  title: 'Why this changed',
                  sections: [{ lines: ['Your readiness baseline supports exploring roles that match your profile. Top opportunities appear in Job Search.'] }],
                  tags: ['localOnly'],
                  dedupeKey: 'career-readiness:opportunities',
                });
              }}
            >
              View top opportunities
            </button>
          </div>
        </div>
      </div>

      {/* Two-column: Trajectory + Radar — shared min-height so both cards feel like peers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[320px]">
        <ModuleCard
          icon={<TrendingUp className="w-4 h-4" />}
          title="Readiness Trajectory"
          variant="default"
          className="h-full flex flex-col"
        >
          <div className="flex-1 flex flex-col justify-center min-h-0">
            <ReadinessTrajectoryEChart trajectory={mock.trajectory} />
            <p className="mt-2 text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
              Actual shows your progress over time. Possible shows where you could be if you complete selected actions. Local-only.
            </p>
            <button
            type="button"
            className={INTERACTIVE_HOVER_CLASS + ' mt-2 flex items-center gap-1.5 rounded px-1.5 py-1 text-[12px] border border-transparent'}
            style={{ color: 'var(--p-accent-muted)' }}
            onClick={function () { setAssumptionsOpen(!assumptionsOpen); }}
          >
            {assumptionsOpen ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" aria-hidden /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />}
            Show assumptions
          </button>
          {assumptionsOpen ? (
            <ul className="mt-1.5 text-[11px] pl-5 list-disc space-y-0.5" style={{ color: 'var(--p-text-dim)' }}>
              <li>Selected actions completed</li>
              <li>Target role unchanged</li>
              <li>Profile inputs remain consistent</li>
            </ul>
          ) : null}
          </div>
        </ModuleCard>

        <ModuleCard
          icon={<Radar className="w-4 h-4" />}
          title="Readiness Radar"
          variant="default"
          className="h-full flex flex-col"
        >
          <ReadinessRadarEChart spokes={mock.radarSpokes} />
          <p className="mt-3 text-[12px] font-medium" style={{ color: 'var(--p-text)' }}>
            Top gaps holding you back
          </p>
          <ul className="mt-2 space-y-3">
            {mock.gaps.map(function (g, i) {
              return (
                <li key={i}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[12px] font-medium" style={{ color: 'var(--p-text)' }}>
                      {g.name}
                    </span>
                    <span
                      className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded"
                      style={{ background: 'var(--p-success-bg)', color: 'var(--p-success)' }}
                    >
                      +{g.impact}
                    </span>
                    <button
                      type="button"
                      className={INTERACTIVE_HOVER_CLASS + ' text-[12px] font-medium px-2 py-1 rounded border'}
                      style={{
                        borderColor: 'var(--p-border)',
                        color: 'var(--p-accent)',
                      }}
                      onClick={function () {
                        publishScreenContext({
                          screen: 'career-readiness',
                          anchor: { type: 'card', id: 'career-readiness:gap:' + g.name, label: g.name },
                          title: 'Why this changed: ' + g.name,
                          sections: [
                            { title: 'Impact', lines: ['+' + String(g.impact) + ' points'] },
                            { title: 'What to do', lines: [g.reason] },
                          ],
                          tags: ['localOnly'],
                          dedupeKey: 'career-readiness:gap:' + g.name,
                        });
                      }}
                    >
                      {g.ctaLabel}
                    </button>
                  </div>
                  <p className="mt-0.5 text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
                    {g.reason}
                  </p>
                </li>
              );
            })}
          </ul>
        </ModuleCard>
      </div>

      {/* Action Plan card — id for dashboard CTA deep-link (hash #action-plan) */}
      <div id="action-plan">
        <ModuleCard
          icon={<ClipboardList className="w-4 h-4" />}
          title="Action Plan"
        variant="default"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-[12px]"
              style={{ color: 'var(--p-accent-muted)' }}
              onClick={clearSelections}
            >
              Clear selections
            </button>
            <span
              className="px-2 py-0.5 text-[11px] font-medium rounded-full"
              style={{ background: 'var(--p-accent-bg)', color: 'var(--p-accent)' }}
            >
              Projected readiness: {projectedScore}
            </span>
          </div>
        }
      >
        <ul className="space-y-3">
          {mock.actionPlanItems.map(function (item) {
            const checked = selectedActionIds.has(item.id);
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-start gap-2"
                style={{
                  background: checked ? 'var(--p-accent-bg)' : 'transparent',
                  padding: '8px',
                  borderRadius: 'var(--p-radius)',
                }}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  className="flex-shrink-0 mt-0.5 w-4 h-4 rounded border grid place-items-center"
                  style={{
                    borderColor: 'var(--p-border)',
                    background: checked ? 'var(--p-accent)' : 'transparent',
                  }}
                  onClick={function () {
                    toggleAction(item.id);
                    publishScreenContext({
                      screen: 'career-readiness',
                      anchor: { type: 'card', id: 'career-readiness:action:' + item.id, label: item.label },
                      title: 'What to do next: ' + item.label,
                      sections: [
                        { lines: [item.helperText] },
                        { title: 'Impact', lines: ['+' + String(item.impact) + ' • ' + item.effort] },
                      ],
                      tags: ['localOnly'],
                      dedupeKey: 'career-readiness:action:' + item.id,
                    });
                  }}
                >
                  {checked ? (
                    <span className="text-white text-[10px]" aria-hidden>✓</span>
                  ) : null}
                </button>
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-medium" style={{ color: 'var(--p-text)' }}>
                    {item.label}
                  </span>
                  <span
                    className="ml-1.5 inline-block px-1.5 py-0.5 text-[10px] font-medium rounded"
                    style={{ background: 'var(--p-success-bg)', color: 'var(--p-success)' }}
                  >
                    +{item.impact}
                  </span>
                  <span
                    className="ml-1 inline-block px-1.5 py-0.5 text-[10px] rounded"
                    style={{ background: 'var(--p-surface2)', color: 'var(--p-text-dim)' }}
                  >
                    {item.effort}
                  </span>
                  <p className="mt-0.5 text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
                    {item.helperText}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </ModuleCard>
      </div>

      {/* Evidence & Inputs: collapsible with prominent collapsed row and hint for discoverability */}
      <div
        style={{
          border: '1px solid var(--p-accent-muted)',
          borderRadius: 'var(--p-radius-lg)',
          overflow: 'hidden',
          background: 'var(--p-surface)',
        }}
      >
        <button
          type="button"
          onClick={function () { setEvidenceOpen(!evidenceOpen); }}
          className={INTERACTIVE_HOVER_CLASS + ' w-full flex items-center justify-between px-4 py-3 text-left'}
          style={{
            background: 'var(--p-surface2)',
            color: 'var(--p-text)',
            borderBottom: evidenceOpen ? '1px solid var(--p-border)' : 'none',
          }}
        >
          <span className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--p-accent)' }} aria-hidden />
            <span className="font-semibold" style={{ fontSize: 'var(--p-font-size-section)' }}>
              Evidence & Inputs
            </span>
            <span
              className="px-1.5 py-0.5 text-[10px] font-medium rounded"
              style={{ background: 'var(--p-accent-bg)', color: 'var(--p-accent)' }}
            >
              Audit details
            </span>
          </span>
          {evidenceOpen ? <ChevronDown className="w-4 h-4 flex-shrink-0" aria-hidden /> : <ChevronRight className="w-4 h-4 flex-shrink-0" aria-hidden />}
        </button>
        {!evidenceOpen ? (
          <p className="px-4 pb-3 text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
            See what inputs were used for scoring.
          </p>
        ) : null}
        {evidenceOpen ? (
          <div className="px-4 py-3 space-y-2" style={{ background: 'var(--p-surface)' }}>
            <p className="text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
              Deterministic scoring • No hidden factors
            </p>
            <p className="text-[12px]" style={{ color: 'var(--p-text-muted)' }}>
              Profile fields used: {mock.evidenceProfileFields.join(', ')}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--p-text-muted)' }}>
              Resume used: {mock.evidenceResumeUsed}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--p-text-muted)' }}>
              Target role used: {mock.evidenceTargetRoleUsed}
            </p>
            <p className="text-[11px] mt-2" style={{ color: 'var(--p-text-dim)' }}>
              {mock.evidencePrivacyNote}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
