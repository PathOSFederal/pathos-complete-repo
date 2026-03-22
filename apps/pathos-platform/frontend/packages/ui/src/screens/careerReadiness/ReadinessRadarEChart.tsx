/**
 * ============================================================================
 * READINESS RADAR ECHARTS — Premium radar chart (5 dimensions, 0–100 scale)
 * ============================================================================
 *
 * Replaces the SVG ReadinessRadarChart with Apache ECharts for consistent
 * interactivity and PathOS styling. Indicators: Target Alignment, Specialized
 * Experience, Resume Evidence, Keywords Coverage, Leadership & Scope.
 * Values from mock (radarSpokes); tooltip shows indicator + value + local-only hint.
 * Client-only to avoid SSR/hydration issues (same pattern as ReadinessTrajectoryEChart).
 */

'use client';

import type React from 'react';
import { useMemo } from 'react';
import type { RadarSpoke } from './careerReadinessMockData';
import { EChart, type EChartOption } from '../../charts/EChart';
import { getPathosChartColors } from '../../charts/pathosChartTheme';

/** Exact indicator names required by spec (display + tooltip). */
const RADAR_INDICATOR_NAMES: string[] = [
  'Target Alignment',
  'Specialized Experience',
  'Resume Evidence',
  'Keywords Coverage',
  'Leadership & Scope',
];

export interface ReadinessRadarEChartProps {
  /** Spoke data: name + value 0–100. Names may match or map to RADAR_INDICATOR_NAMES. */
  spokes: RadarSpoke[];
}

/** Chart container height to balance with Trajectory card. */
const CHART_HEIGHT = 220;

/**
 * Maps mock spoke names to the exact indicator names. Mock may use short labels
 * (e.g. "Specialized Exp"); we use full names for the chart.
 */
function mapSpokeNameToIndicator(name: string): string {
  const lower = name.toLowerCase();
  if (lower.indexOf('target') !== -1 && lower.indexOf('alignment') !== -1) return 'Target Alignment';
  if (lower.indexOf('specialized') !== -1) return 'Specialized Experience';
  if (lower.indexOf('resume') !== -1 && lower.indexOf('evidence') !== -1) return 'Resume Evidence';
  if (lower.indexOf('keywords') !== -1) return 'Keywords Coverage';
  if (lower.indexOf('leadership') !== -1) return 'Leadership & Scope';
  return name;
}

/**
 * Builds ECharts option for radar: 5 indicators (max 100), one series from spokes.
 * Tooltip: indicator name + value + "Local-only. Derived from profile + resume evidence."
 * Uses PathOS theme colors; no label clipping; font sizes from theme.
 */
function buildRadarOption(spokes: RadarSpoke[]): EChartOption {
  const colors = getPathosChartColors();
  const indicators = RADAR_INDICATOR_NAMES.map(function (name) {
    return { name: name, max: 100 };
  });
  const valueByIndicator: Record<string, number> = {};
  for (let i = 0; i < RADAR_INDICATOR_NAMES.length; i++) {
    valueByIndicator[RADAR_INDICATOR_NAMES[i]] = 0;
  }
  for (let i = 0; i < spokes.length; i++) {
    const key = mapSpokeNameToIndicator(spokes[i].name);
    if (valueByIndicator[key] !== undefined) {
      valueByIndicator[key] = spokes[i].value;
    }
  }
  const values = RADAR_INDICATOR_NAMES.map(function (name) {
    return valueByIndicator[name];
  });

  const option: EChartOption = {
    animation: false,
    radar: {
      indicator: indicators,
      center: ['50%', '52%'],
      radius: '58%',
      axisName: {
        color: colors.textDim,
        fontSize: 10,
      },
      splitLine: { lineStyle: { color: colors.grid } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: colors.grid } },
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      textStyle: { color: colors.text, fontSize: 12 },
      formatter: function (params: unknown) {
        const p = params as { value?: number[]; dataIndex?: number };
        if (p === null || p === undefined) return '';
        const dataIndex = p.dataIndex !== undefined ? p.dataIndex : 0;
        const indicatorName = dataIndex >= 0 && dataIndex < RADAR_INDICATOR_NAMES.length
          ? RADAR_INDICATOR_NAMES[dataIndex]
          : 'Readiness';
        const valArr = Array.isArray(p.value) ? p.value : [];
        const val = dataIndex < valArr.length ? Number(valArr[dataIndex]) : 0;
        const lines: string[] = [indicatorName + ': ' + val];
        lines.push('Local-only. Derived from profile + resume evidence.');
        return lines.join('<br/>');
      },
    },
    series: [
      {
        type: 'radar',
        data: [{ value: values, name: 'Readiness', lineStyle: { color: colors.accent }, areaStyle: { color: colors.accent, opacity: 0.2 } }],
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { width: 2, color: colors.accent },
        itemStyle: { color: colors.accent },
      },
    ],
  };
  return option;
}

/**
 * Renders the readiness radar as an ECharts radar chart: 5 indicators, scale 0–100,
 * tooltip with indicator + value + local-only hint. Includes a visually-hidden list
 * of indicators and values for screen readers and test stability.
 */
export function ReadinessRadarEChart(props: ReadinessRadarEChartProps): React.ReactElement {
  const spokes = props.spokes;

  const option = useMemo(
    function () {
      return buildRadarOption(spokes);
    },
    [spokes]
  );

  const valueByIndicator: Array<{ name: string; value: number }> = useMemo(
    function () {
      const out: Array<{ name: string; value: number }> = [];
      for (let i = 0; i < RADAR_INDICATOR_NAMES.length; i++) {
        const name = RADAR_INDICATOR_NAMES[i];
        let val = 0;
        for (let j = 0; j < spokes.length; j++) {
          if (mapSpokeNameToIndicator(spokes[j].name) === name) {
            val = spokes[j].value;
            break;
          }
        }
        out.push({ name: name, value: val });
      }
      return out;
    },
    [spokes]
  );

  if (spokes.length === 0) {
    return (
      <div
        className="h-48 flex items-center justify-center text-sm"
        style={{ color: 'var(--p-text-dim)' }}
      >
        No radar data
      </div>
    );
  }

  /* Accessible fallback: always render so SSR and tests can assert on the 5 indicators */
  const indicatorList = (
    <ul
      className="sr-only"
      aria-hidden="true"
    >
      {valueByIndicator.map(function (item, i) {
        return (
          <li key={i}>
            {item.name}: {item.value}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="w-full flex flex-col" role="group" aria-label="Readiness radar by dimension">
      <EChart
        option={option}
        style={{ height: CHART_HEIGHT, width: '100%' }}
        className="min-w-0"
      />
      {indicatorList}
    </div>
  );
}
