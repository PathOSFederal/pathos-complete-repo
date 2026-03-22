/**
 * Deprecated: replaced by ECharts implementation (ReadinessRadarEChart).
 *
 * Readiness Radar — Minimal SVG radar (pentagon) with one polygon for values.
 * Spokes: Target Alignment, Specialized Exp, Resume Evidence, Keywords Coverage, Leadership & Scope.
 * Uses theme accent; values 0–100 scale to radius.
 */

'use client';

import type React from 'react';
import type { RadarSpoke } from './careerReadinessMockData';

/* Chart drawn in 0..SIZE; viewBox includes padding so axis labels never clip. */
const SIZE = 200;
const CENTER = SIZE / 2;
const MAX_R = 72;
const VIEW_PADDING = 44;
const LABEL_OFFSET = 28;
/* Fixed rendered size so SVG (and label text) never scales; prevents giant labels when container stretches. */
const RENDER_SIZE = 220;

export interface ReadinessRadarChartProps {
  spokes: RadarSpoke[];
}

function angleForIndex(i: number, total: number): number {
  return (i / total) * 2 * Math.PI - Math.PI / 2;
}

/**
 * Renders a radar chart: one polygon from spoke values (0–100 → radius), labels at spoke ends.
 */
export function ReadinessRadarChart(props: ReadinessRadarChartProps): React.ReactElement {
  const spokes = props.spokes;
  if (spokes.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--p-text-dim)' }}>
        No radar data
      </div>
    );
  }

  const points: Array<{ x: number; y: number; label: string }> = [];
  for (let i = 0; i < spokes.length; i++) {
    const a = angleForIndex(i, spokes.length);
    const r = (spokes[i].value / 100) * MAX_R;
    const x = CENTER + r * Math.cos(a);
    const y = CENTER + r * Math.sin(a);
    points.push({ x, y, label: spokes[i].name });
  }

  const labelRadius = MAX_R + LABEL_OFFSET;
  const viewSize = SIZE + 2 * VIEW_PADDING;

  return (
    <div className="w-full flex justify-center items-center min-h-[200px]">
      <svg
        width={RENDER_SIZE}
        height={RENDER_SIZE}
        viewBox={'0 0 ' + viewSize + ' ' + viewSize}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible flex-shrink-0"
        role="img"
        aria-label="Readiness radar by dimension"
      >
      {/* Grid: full pentagon outline (offset by VIEW_PADDING so labels fit in viewBox) */}
      <polygon
        points={spokes.map(function (_, i) {
          const a = angleForIndex(i, spokes.length);
          const x = VIEW_PADDING + CENTER + MAX_R * Math.cos(a);
          const y = VIEW_PADDING + CENTER + MAX_R * Math.sin(a);
          return x + ',' + y;
        }).join(' ')}
        fill="none"
        stroke="var(--p-border)"
        strokeWidth="1"
      />
      {/* Data polygon */}
      <polygon
        points={points.map(function (p) {
          return (VIEW_PADDING + p.x) + ',' + (VIEW_PADDING + p.y);
        }).join(' ')}
        fill="var(--p-accent-bg)"
        stroke="var(--p-accent)"
        strokeWidth="1.5"
      />
      {/* Spoke labels at outer radius; fontSize 9 for consistency with section UI */}
      {spokes.map(function (s, i) {
        const a = angleForIndex(i, spokes.length);
        const x = VIEW_PADDING + CENTER + labelRadius * Math.cos(a);
        const y = VIEW_PADDING + CENTER + labelRadius * Math.sin(a);
        const anchor = x < VIEW_PADDING + CENTER - 5 ? 'end' : x > VIEW_PADDING + CENTER + 5 ? 'start' : 'middle';
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={anchor}
            fontSize="9"
            fill="var(--p-text-dim)"
          >
            {s.name}
          </text>
        );
      })}
    </svg>
    </div>
  );
}
