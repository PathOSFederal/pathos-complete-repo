/**
 * ============================================================================
 * READINESS TRAJECTORY ECHARTS — Premium two-line chart (Actual vs Possible)
 * ============================================================================
 *
 * Replaces the SVG ReadinessTrajectoryChart with Apache ECharts for better
 * interactivity: axis tooltip, legend toggles, consistent PathOS styling.
 * Data: Actual (solid, accent) and Possible (dashed, muted). Client-only.
 */

'use client';

import type React from 'react';
import { useMemo } from 'react';
import type { TrajectoryData } from './careerReadinessMockData';
import { EChart, type EChartOption } from '../../charts/EChart';
import { getPathosChartColors } from '../../charts/pathosChartTheme';

export interface ReadinessTrajectoryEChartProps {
  /** Two-series trajectory: actualPoints and possiblePoints (same time labels). */
  trajectory: TrajectoryData;
}

/** Chart container height so the card stays balanced with the Radar card. */
const CHART_HEIGHT = 220;

/**
 * Builds ECharts option for the readiness trajectory: two lines, axis tooltip,
 * legend toggles, PathOS colors. No animation for stable, non-flashy UX.
 */
function buildTrajectoryOption(trajectory: TrajectoryData): EChartOption {
  const colors = getPathosChartColors();
  const actualPoints = trajectory.actualPoints;
  const possiblePoints = trajectory.possiblePoints;
  const labels: string[] = [];
  const actualData: number[] = [];
  const possibleData: number[] = [];
  const n = actualPoints.length > 0 ? actualPoints.length : possiblePoints.length;
  for (let i = 0; i < n; i++) {
    if (actualPoints.length > 0) {
      labels.push(actualPoints[i].label);
      actualData.push(actualPoints[i].score);
    } else {
      labels.push(possiblePoints[i].label);
      actualData.push(0);
    }
    if (possiblePoints.length > 0) {
      possibleData.push(possiblePoints[i].score);
    } else {
      possibleData.push(0);
    }
  }

  const option: EChartOption = {
    animation: false,
    grid: {
      left: 48,
      right: 24,
      top: 24,
      bottom: 32,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: colors.grid } },
      axisLabel: { color: colors.textDim, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } },
      axisLine: { show: false },
      axisLabel: { color: colors.textDim, fontSize: 10 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      textStyle: { color: colors.text, fontSize: 12 },
      formatter: function (params: unknown) {
        const p = params as Array<{ seriesName: string; name: string; value: number }>;
        if (p === null || p === undefined || p.length === 0) return '';
        const label = p[0].name;
        let actualVal: number | null = null;
        let possibleVal: number | null = null;
        for (let i = 0; i < p.length; i++) {
          if (p[i].seriesName === 'Actual') actualVal = p[i].value;
          if (p[i].seriesName === 'Possible') possibleVal = p[i].value;
        }
        const gap =
          actualVal !== null && possibleVal !== null ? possibleVal - actualVal : null;
        const lines: string[] = [label];
        if (actualVal !== null) lines.push('Actual: ' + actualVal);
        if (possibleVal !== null) lines.push('Possible: ' + possibleVal);
        if (gap !== null) lines.push('Gap: ' + gap);
        lines.push('Possible assumes selected actions completed');
        return lines.join('<br/>');
      },
    },
    legend: {
      data: ['Actual', 'Possible'],
      top: 0,
      right: 0,
      textStyle: { color: colors.textDim, fontSize: 11 },
      itemGap: 16,
    },
    series: [
      {
        name: 'Actual',
        type: 'line',
        data: actualData,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: colors.accent, width: 2 },
        itemStyle: { color: colors.accent },
      },
      {
        name: 'Possible',
        type: 'line',
        data: possibleData,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: colors.accentMuted, width: 2, type: 'dashed' },
        itemStyle: { color: colors.accentMuted },
      },
    ],
  };
  return option;
}

/**
 * Renders the readiness trajectory as an ECharts line chart: Actual (solid) and
 * Possible (dashed), premium tooltip with Gap and note, legend toggles.
 */
export function ReadinessTrajectoryEChart(props: ReadinessTrajectoryEChartProps): React.ReactElement {
  const trajectory = props.trajectory;
  const actualPoints = trajectory.actualPoints;
  const possiblePoints = trajectory.possiblePoints;

  const option = useMemo(
    function () {
      return buildTrajectoryOption(trajectory);
    },
    [trajectory]
  );

  if (actualPoints.length === 0 && possiblePoints.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm"
        style={{ minHeight: CHART_HEIGHT, color: 'var(--p-text-dim)' }}
      >
        No trajectory data
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col" role="group" aria-label="Readiness trajectory over time">
      <EChart
        option={option}
        style={{ height: CHART_HEIGHT, width: '100%' }}
        className="min-w-0"
      />
    </div>
  );
}
