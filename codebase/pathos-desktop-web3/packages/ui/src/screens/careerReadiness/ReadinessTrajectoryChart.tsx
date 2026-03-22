/**
 * Deprecated: replaced by ECharts implementation (ReadinessTrajectoryEChart).
 *
 * Readiness Trajectory — Two-line SVG chart: Actual (solid, primary) and
 * Possible (dashed, muted). Legend and hover tooltip show both values per point.
 * Uses PathOS tokens only; no new chart library.
 */

'use client';

import type React from 'react';
import type { TrajectoryData, TrajectoryPoint } from './careerReadinessMockData';
import { Tooltip } from '../../components/Tooltip';

/* Chart height: tall enough for two lines + gridlines without over-compression (v0 parity). */
const CHART_WIDTH = 280;
const CHART_HEIGHT = 80;
const PADDING = { top: 8, right: 8, bottom: 20, left: 36 };
/** Hit area half-width for hover (viewBox units). */
const HIT_PAD = 16;

export interface ReadinessTrajectoryChartProps {
  /** Two-series trajectory: actualPoints and possiblePoints (same time labels). */
  trajectory: TrajectoryData;
}

function clampScore(score: number, min: number, max: number): number {
  if (score < min) return min;
  if (score > max) return max;
  return score;
}

/**
 * Builds SVG path d for a series of points (M x,y L x,y ...).
 */
function buildPathD(
  points: TrajectoryPoint[],
  xScale: (i: number) => number,
  yScale: (score: number) => number
): string {
  const parts: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const x = xScale(i);
    const y = yScale(points[i].score);
    parts.push((i === 0 ? 'M' : 'L') + x + ',' + y);
  }
  return parts.join(' ');
}

/**
 * Renders two-line chart: Actual (solid accent) and Possible (dashed muted).
 * Legend top-right; hover tooltip shows both values and trust note.
 */
export function ReadinessTrajectoryChart(props: ReadinessTrajectoryChartProps): React.ReactElement {
  const trajectory = props.trajectory;
  const actualPoints = trajectory.actualPoints;
  const possiblePoints = trajectory.possiblePoints;

  if (actualPoints.length === 0 && possiblePoints.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-sm" style={{ color: 'var(--p-text-dim)' }}>
        No trajectory data
      </div>
    );
  }

  const minScore = 0;
  const maxScore = 100;
  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  /* Use actual length for x scale; both series share same time points (Today, 3 mo, 6 mo, 12 mo). */
  const pointCount = actualPoints.length > 0 ? actualPoints.length : possiblePoints.length;
  const xScale = (i: number) =>
    pointCount <= 1
      ? PADDING.left + innerWidth / 2
      : PADDING.left + (i / (pointCount - 1)) * innerWidth;
  const yScale = (score: number) => {
    const s = clampScore(score, minScore, maxScore);
    return PADDING.top + innerHeight - (s / maxScore) * innerHeight;
  };

  const actualPathD = buildPathD(actualPoints, xScale, yScale);
  const possiblePathD = buildPathD(possiblePoints, xScale, yScale);

  /* X-axis labels from actual (or possible if actual empty). */
  const labels = actualPoints.length > 0 ? actualPoints : possiblePoints;

  /**
   * Build tooltip content for a given point index: label, Actual/Possible scores,
   * and trust note. Used by canonical Tooltip (portaled) per hit area.
   */
  function pointTooltipContent(i: number): React.ReactNode {
    const label = i >= 0 && i < labels.length ? labels[i].label : '';
    const actualScore = i >= 0 && i < actualPoints.length ? actualPoints[i].score : null;
    const possibleScore = i >= 0 && i < possiblePoints.length ? possiblePoints[i].score : null;
    return (
      <>
        <div className="font-medium">{label}</div>
        {actualScore !== null ? <div>Actual: {actualScore}</div> : null}
        {possibleScore !== null ? <div>Possible: {possibleScore}</div> : null}
        <div className="mt-0.5" style={{ color: 'var(--p-text-dim)' }}>
          Possible assumes selected actions completed
        </div>
      </>
    );
  }

  return (
    <div className="w-full flex flex-col" style={{ minHeight: CHART_HEIGHT }} role="group" aria-label="Readiness trajectory over time">
      {/* Legend: top-right inside card; subtle, aligned to card header style. */}
      <div className="flex justify-end gap-4 mb-1 flex-shrink-0" style={{ fontSize: '10px', color: 'var(--p-text-dim)' }}>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-5 h-0.5 rounded-full"
            style={{ background: 'var(--p-accent)' }}
            aria-hidden
          />
          Actual
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-5 h-0.5"
            style={{ borderBottom: '2px dashed var(--p-text-dim)' }}
            aria-hidden
          />
          Possible
        </span>
      </div>

      <div className="flex-1 relative flex items-center">
        <svg
          width="100%"
          height={CHART_HEIGHT}
          viewBox={'0 0 ' + CHART_WIDTH + ' ' + CHART_HEIGHT}
          preserveAspectRatio="xMidYMid meet"
          className="overflow-visible flex-shrink-0"
          role="img"
          aria-label="Readiness trajectory: Actual and Possible over time"
        >
          {/* Actual trajectory: solid, primary accent. */}
          {actualPathD !== '' ? (
            <path
              d={actualPathD}
              fill="none"
              stroke="var(--p-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {/* Possible trajectory: dashed, muted. */}
          {possiblePathD !== '' ? (
            <path
              d={possiblePathD}
              fill="none"
              stroke="var(--p-text-dim)"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Visible dots on Actual line only (primary series). */}
          {actualPoints.map(function (p, i) {
            const x = xScale(i);
            const y = yScale(p.score);
            return (
              <circle
                key={'actual-' + i}
                cx={x}
                cy={y}
                r="4"
                fill="var(--p-accent)"
                stroke="var(--p-surface)"
                strokeWidth="1"
                aria-hidden
              />
            );
          })}

          {/* X-axis labels (below chart). */}
          {labels.map(function (p, i) {
            const x = xScale(i);
            return (
              <text
                key={'label-' + i}
                x={x}
                y={CHART_HEIGHT - 4}
                textAnchor="middle"
                fontSize="10"
                fill="var(--p-text-dim)"
              >
                {p.label}
              </text>
            );
          })}

          {/* Invisible hit areas for hover (one per time point). Each wrapped in canonical Tooltip (portaled). */}
          {labels.map(function (_p, i) {
            const x = xScale(i);
            const left = Math.max(PADDING.left, x - HIT_PAD);
            const w = Math.min(innerWidth, HIT_PAD * 2);
            const actualVal = actualPoints[i] !== undefined ? actualPoints[i].score : '—';
            const possibleVal = possiblePoints[i] !== undefined ? possiblePoints[i].score : '—';
            const ariaLabel = labels[i].label + ': Actual ' + actualVal + ', Possible ' + possibleVal;
            return (
              <Tooltip key={'hit-' + i} content={pointTooltipContent(i)} side="top">
                <g tabIndex={0} aria-label={ariaLabel}>
                  <rect
                    x={left}
                    y={PADDING.top}
                    width={w}
                    height={innerHeight}
                    fill="transparent"
                  />
                </g>
              </Tooltip>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
