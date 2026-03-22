/**
 * ============================================================================
 * ECHART WRAPPER — Client-only React wrapper for Apache ECharts
 * ============================================================================
 *
 * Renders ECharts only after mount to avoid SSR/hydration issues. Handles
 * resize automatically via echarts-for-react. Caller supplies full option
 * (no theme baked in); use getPathosChartColors() for PathOS styling.
 */

'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

/** ECharts option shape; we accept the same object echarts expects. */
export type EChartOption = Record<string, unknown>;

export interface EChartProps {
  /** Full ECharts option (grid, series, tooltip, legend, etc.). */
  option: EChartOption;
  /** Inline style for the chart container (e.g. height, width). */
  style?: React.CSSProperties;
  /** Optional class name for the chart container. */
  className?: string;
}

/**
 * Renders ECharts in a client-only way: nothing on server, chart after mount.
 * Resize is handled by echarts-for-react. No built-in theme; pass option from caller.
 */
export function EChart(props: EChartProps): React.ReactElement {
  const option = props.option;
  const style = props.style !== undefined ? props.style : { height: '280px', width: '100%' };
  const className = props.className !== undefined ? props.className : '';

  const [mounted, setMounted] = useState(false);
  useEffect(
    function () {
      const t = setTimeout(function () {
        setMounted(true);
      }, 0);
      return function () {
        clearTimeout(t);
      };
    },
    []
  );

  if (!mounted) {
    return (
      <div
        className={className}
        style={style}
        role="img"
        aria-label="Chart loading"
      />
    );
  }

  return (
    <ReactECharts
      option={option}
      style={style}
      className={className}
      notMerge={true}
      opts={{ renderer: 'canvas' }}
    />
  );
}
