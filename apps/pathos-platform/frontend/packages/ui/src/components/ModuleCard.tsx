/**
 * ============================================================================
 * MODULE CARD — Reusable instrument-panel card for Dashboard and PathAdvisor
 * ============================================================================
 *
 * Provides consistent surface hierarchy: header row (icon + title + optional
 * action), subtle top accent highlight, and elevation. Used to replace
 * ad-hoc card blocks so the UI reads as a serious instrument panel.
 *
 * BOUNDARY RULE: No next/* or electron/* imports.
 */

'use client';

import type React from 'react';

export interface ModuleCardProps {
  /** Optional icon element (e.g. Lucide icon) shown before title */
  icon?: React.ReactNode;
  /** Header title; required for consistent card identity */
  title: string;
  /** Optional subtitle or description; rendered as small muted text below title in header */
  subtitle?: string;
  /** Optional slot for right-aligned action (e.g. Reset button); same as rightSlot for API clarity */
  action?: React.ReactNode;
  /** Card body content */
  children: React.ReactNode;
  /** Visual density: default (standard padding) or dense (tighter) */
  variant?: 'default' | 'dense';
  /** Optional className for the root element (e.g. grid placement) */
  className?: string;
}

/**
 * Single source of card chrome: 1px top highlight (accent-muted), surface
 * background, consistent border/radius, elevation-1 shadow. Header row
 * aligns icon + title + action; body uses theme spacing.
 */
export function ModuleCard(props: ModuleCardProps) {
  const variant = props.variant !== undefined ? props.variant : 'default';
  const isDense = variant === 'dense';
  const paddingClass = isDense ? 'p-3' : 'p-4';
  const headerGap = 'gap-2';
  const hasAction = props.action !== null && props.action !== undefined;

  return (
    <div
      className={paddingClass + (props.className ? ' ' + props.className : '')}
      style={{
        background: 'var(--p-surface)',
        border: '1px solid var(--p-border)',
        borderRadius: 'var(--p-radius-lg)',
        boxShadow: 'var(--p-shadow-elev-1)',
        borderTop: '1px solid var(--p-accent-muted)',
      }}
    >
      {/* Header row: icon + title + optional action; optional subtitle below */}
      <div className={isDense ? ' mb-2' : ' mb-3'}>
        <div className={'flex items-center flex-wrap ' + headerGap}>
          {props.icon !== null && props.icon !== undefined ? (
            <span className="flex-shrink-0" style={{ color: 'var(--p-accent)' }}>
              {props.icon}
            </span>
          ) : null}
          <h3
            className="flex-1 min-w-0 font-semibold uppercase tracking-[var(--p-letter-spacing-section)]"
            style={{
              color: 'var(--p-text-dim)',
              fontSize: 'var(--p-font-size-section)',
            }}
          >
            {props.title}
          </h3>
          {hasAction ? (
            <div className="flex-shrink-0">{props.action}</div>
          ) : null}
        </div>
        {props.subtitle !== undefined && props.subtitle !== '' ? (
          <p
            className="mt-1"
            style={{
              color: 'var(--p-text-muted)',
              fontSize: '0.75rem',
            }}
          >
            {props.subtitle}
          </p>
        ) : null}
      </div>
      {props.children}
    </div>
  );
}
