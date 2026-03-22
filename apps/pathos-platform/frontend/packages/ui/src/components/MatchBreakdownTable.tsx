/**
 * ============================================================================
 * MATCH BREAKDOWN TABLE — Shared component for the dimension-score table
 * ============================================================================
 *
 * PURPOSE: One canonical match-breakdown table used by both Saved Jobs and
 * Job Search. Both screens previously had separate implementations of the
 * same five-column dimension breakdown (Dimension / Score bar / Pts / Demand /
 * Status). This shared component eliminates the drift between them and
 * provides consistent alignment, hover, focus-visible, and click behavior.
 *
 * ARCHITECTURE:
 *   MatchBreakdownHeader — renders the column header row
 *   MatchBreakdownRow    — renders a single interactive dimension row
 *
 * INTERACTION MODEL (per Interaction-State Standard in cursor-house-rules.md):
 *   hover: background shift + border appears (INTERACTIVE_HOVER_CLASS +
 *          explicit border). ChevronRight icon appears on hover/focus.
 *   focus-visible: accent ring via :focus-visible
 *   active/pressed: handled by INTERACTIVE_HOVER_CLASS
 *   click: fires onRowClick when provided; no-op otherwise
 *   tooltip: dimension detail summary on hover/focus
 *
 * ALIGNMENT CONTRACT:
 *   Both header and data rows share the same padding and column widths.
 *   The header includes a trailing spacer equal to the chevron column width
 *   so data-row content aligns perfectly under the header labels even when
 *   the chevron is visible on hover.
 *
 * COLUMN WIDTHS (fixed):
 *   Dimension: 120px (flex-shrink-0, truncates long labels)
 *   Score bar: flex-1 (fills remaining horizontal space)
 *   Pts:       32px  (right-aligned numeric score)
 *   Demand:    48px  (center-aligned emphasis badge)
 *   Status:    56px  (right-aligned gap/status label)
 *   Chevron:   20px  (flex-shrink-0, visible only on hover/focus)
 *
 * ACCESSIBILITY:
 *   - Each row is a <button> with role implied by native semantics
 *   - aria-label describes the dimension and the available action
 *   - Horizontal bar includes role="progressbar" with aria attributes
 *   - Tooltip via Radix provides additional detail on hover and focus
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 */

'use client';

import type React from 'react';
import { ChevronRight } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { INTERACTIVE_HOVER_CLASS } from '../styles/interactiveHover';
import { scoreTierColor } from '../styles/scoreTiers';

// ---------------------------------------------------------------------------
// Row data interface — normalized shape that both screens map into
// ---------------------------------------------------------------------------

/**
 * Normalized data for a single match-breakdown row.
 *
 * Both Job Search (JobMatchDimension) and Saved Jobs (MatchDimension) map
 * their screen-specific data into this shape before passing it to the
 * shared MatchBreakdownRow component.
 */
export interface MatchBreakdownRowData {
  /** Human-readable dimension name (e.g. "Target Alignment"). */
  label: string;
  /** Score 0–100. Drives bar fill width and color via scoreTierColor(). */
  score: number;
  /** Emphasis level — how much this job demands this dimension. */
  emphasisLevel: string;
  /** Status or gap-state label (e.g. "Good", "Strong", "Gap"). */
  statusLabel: string;
  /** CSS color string for the status label. */
  statusColor: string;
  /** Tooltip text shown on hover/focus. */
  tooltipText: string;
  /** Accessible label for the button element. */
  ariaLabel: string;
}

// ---------------------------------------------------------------------------
// MatchBreakdownHeader — column labels for the table
// ---------------------------------------------------------------------------

/**
 * Renders the column header row for the match-breakdown table.
 *
 * WHY A SHARED COMPONENT: The header must use the same padding and column
 * widths as the data rows. Keeping them together in one module guarantees
 * alignment stays correct even when individual pages evolve independently.
 *
 * The trailing 20px spacer matches the chevron column in data rows so
 * header labels align with row data without shift.
 */
export function MatchBreakdownHeader() {
  return (
    <div
      className="flex items-center gap-2 text-[9px] uppercase tracking-wider font-medium mb-1.5 px-1"
      style={{ color: 'var(--p-text-dim)' }}
    >
      <span className="w-[120px] flex-shrink-0">Dimension</span>
      <span className="flex-1">Score</span>
      <span className="w-[32px] text-right">Pts</span>
      <span className="w-[48px] text-center">Demand</span>
      <span className="w-[56px] text-right">Status</span>
      {/* Spacer matching the chevron column in data rows. Without this,
       * the Status header would appear shifted left relative to the row
       * status values because rows include a chevron-width trailing column. */}
      <span className="w-[20px] flex-shrink-0" aria-hidden />
    </div>
  );
}

// ---------------------------------------------------------------------------
// MatchBreakdownRow — interactive dimension data row
// ---------------------------------------------------------------------------

/**
 * Props for a single match-breakdown row.
 *
 * onRowClick is optional: when provided, the row fires the callback on
 * click and shows a cursor-pointer. When absent, the row is still rendered
 * as a button for consistent hover/focus treatment but clicking is a no-op.
 */
export interface MatchBreakdownRowProps {
  /** Row data in the normalized shape. */
  data: MatchBreakdownRowData;
  /** Unique key suffix for tooltip contentId (prevents collisions). */
  tooltipIdSuffix: string;
  /** Optional callback when the row is clicked. */
  onRowClick?: () => void;
  /** Optional callback for keyboard activation (Enter / Space). */
  onKeyActivate?: () => void;
}

/**
 * A single interactive row in the match-breakdown table.
 *
 * WHY <button>: Buttons provide native keyboard focus, Enter/Space
 * activation, and screen-reader announcement without extra ARIA.
 * Even when onRowClick is absent, the button element gives consistent
 * hover and focus-visible treatment across both screens.
 *
 * ALIGNMENT: The row uses the same px-1 padding and column widths as
 * MatchBreakdownHeader. The trailing chevron column (w-[20px]) ensures
 * that on hover (when the chevron appears) no content shifts — the
 * space is always reserved.
 */
export function MatchBreakdownRow(props: MatchBreakdownRowProps) {
  const d = props.data;
  const barColor = scoreTierColor(d.score);

  /** Handle keyboard activation (Enter / Space). */
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (props.onKeyActivate) {
        props.onKeyActivate();
      } else if (props.onRowClick) {
        props.onRowClick();
      }
    }
  }

  return (
    <li>
      <Tooltip content={d.tooltipText} contentId={'match-breakdown-' + props.tooltipIdSuffix}>
        <button
          type="button"
          onClick={props.onRowClick !== undefined ? props.onRowClick : function () {}}
          onKeyDown={handleKeyDown}
          className={
            INTERACTIVE_HOVER_CLASS +
            ' group flex items-center gap-2 w-full text-left rounded px-1 py-1 outline-none' +
            ' focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] focus-visible:ring-inset' +
            ' border border-transparent hover:border-[var(--p-border)] hover:bg-[var(--p-surface2)]' +
            (props.onRowClick !== undefined ? ' cursor-pointer' : '')
          }
          style={{ background: 'transparent' }}
          aria-label={d.ariaLabel}
        >
          {/* Dimension label — w-[120px] matches header column */}
          <span
            className="text-[11px] font-medium w-[120px] flex-shrink-0 truncate"
            style={{ color: 'var(--p-text-muted)' }}
          >
            {d.label}
          </span>

          {/* Horizontal score bar — flex-1 fills remaining space */}
          <div
            className="flex-1 h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--p-surface2)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: String(d.score) + '%',
                background: barColor,
                minWidth: '4px',
              }}
              role="progressbar"
              aria-valuenow={d.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={d.label + ' score'}
            />
          </div>

          {/* Numeric score — w-[32px] right-aligned */}
          <span
            className="text-[11px] font-semibold tabular-nums w-[32px] text-right"
            style={{ color: barColor }}
          >
            {String(d.score)}
          </span>

          {/* Emphasis/demand badge — w-[48px] center-aligned */}
          <span
            className="text-[9px] font-medium w-[48px] text-center px-1 py-0.5 rounded"
            style={{
              background: d.emphasisLevel === 'High'
                ? 'color-mix(in srgb, var(--p-accent) 10%, transparent)'
                : 'var(--p-surface2)',
              color: d.emphasisLevel === 'High'
                ? 'var(--p-accent)'
                : 'var(--p-text-dim)',
            }}
          >
            {d.emphasisLevel}
          </span>

          {/* Status / gap label — w-[56px] right-aligned */}
          <span
            className="text-[10px] font-semibold w-[56px] text-right"
            style={{ color: d.statusColor }}
          >
            {d.statusLabel}
          </span>

          {/* Chevron indicator — w-[20px] fixed, visible on hover/focus.
           * Always occupies space so column widths never shift. Opacity
           * toggles between 0 (rest) and 1 (hover/focus) using Tailwind
           * group-hover and group-focus-visible utilities. */}
          <span
            className="w-[20px] flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
            style={{ color: 'var(--p-text-dim)' }}
            aria-hidden
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </button>
      </Tooltip>
    </li>
  );
}
