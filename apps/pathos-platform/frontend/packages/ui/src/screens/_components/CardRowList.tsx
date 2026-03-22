/**
 * ============================================================================
 * CARD ROW LIST — Faint row dividers for dashboard list-card parity
 * ============================================================================
 *
 * Renders children as vertical rows with a token-safe faint divider between
 * each row (not before the first). Divider is inset (mx-3), 1px height, and
 * uses var(--p-border) with reduced opacity for a non-table-like look. Each
 * row is wrapped in a container with py-2 and leading-5 for comfortable spacing.
 */

'use client';

import React from 'react';
import type { ReactElement, ReactNode } from 'react';

export interface CardRowListProps {
  /** Row elements rendered vertically with dividers between. */
  children: ReactNode;
  /** Optional class name for the container. */
  className?: string;
}

/**
 * Renders rows vertically and inserts a faint inset divider between each row.
 * Divider: h-px, mx-3 inset, var(--p-border) with opacity ~0.22 (no thick borders).
 * Row wrapper: py-2 + leading-5 for breathing room.
 */
export function CardRowList(props: CardRowListProps): ReactElement {
  const raw = React.Children.toArray(props.children);
  const filtered = raw.filter(function (c) {
    return c !== null && c !== undefined;
  });
  const className = props.className != null ? props.className : '';

  if (filtered.length === 0) {
    return <div className={className} />;
  }

  const nodes: ReactNode[] = [];
  for (let i = 0; i < filtered.length; i++) {
    if (i > 0) {
      nodes.push(
        <div
          key={'divider-' + i}
          role="separator"
          aria-hidden="true"
          className="mx-3 h-px"
          style={{ backgroundColor: 'var(--p-border)', opacity: 0.22 }}
        />
      );
    }
    nodes.push(
      <div key={'row-' + i} className="py-2 leading-5">
        {filtered[i]}
      </div>
    );
  }

  return <div className={className}>{nodes}</div>;
}
