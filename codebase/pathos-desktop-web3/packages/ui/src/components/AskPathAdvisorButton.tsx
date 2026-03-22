/**
 * ============================================================================
 * ASK PATHADVISOR BUTTON — Branded secondary CTA with PathAdvisor emblem
 * ============================================================================
 *
 * Reusable button for "Ask PathAdvisor" CTAs. Uses the same PathAdvisor
 * emblem (Sparkles) as the PathAdvisor rail header. Secondary/outline style
 * only; no new colors. Optional tooltip with optional shortcut hint.
 *
 * BOUNDARY RULE: No next/* or electron/* imports.
 */

'use client';

import type React from 'react';
import { Sparkles } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { INTERACTIVE_HOVER_CLASS } from '../styles/interactiveHover';

export interface AskPathAdvisorButtonProps {
  /** Click handler; typically opens PathAdvisor briefing or focus. */
  onClick: () => void;
  /** Disabled state. */
  disabled?: boolean;
  /** Visual size: default (sm) or medium. */
  size?: 'default' | 'sm';
  /** Optional extra class names (applied to the button). */
  className?: string;
  /**
   * Optional tooltip body. When not provided, default text is used.
   * Default: "Opens a PathAdvisor briefing for this recommendation."
   */
  tooltipText?: string;
  /**
   * Optional shortcut hint (e.g. "A"). When provided, appended to tooltip
   * as "Shortcut: A". Only add if the app actually wires the shortcut.
   */
  shortcutHint?: string;
  /**
   * Optional id for the tooltip element (for aria-describedby). Use when
   * multiple buttons on the same page need distinct tooltip ids.
   */
  tooltipId?: string;
}

const DEFAULT_TOOLTIP = 'Opens a PathAdvisor briefing for this recommendation.';

/**
 * Builds full tooltip content: description + optional shortcut line.
 * Keeps tooltip logic in one place and avoids inline conditionals in JSX.
 */
function getTooltipContent(tooltipText: string, shortcutHint: string | undefined): string {
  if (shortcutHint !== undefined && shortcutHint !== '') {
    return tooltipText + ' Shortcut: ' + shortcutHint;
  }
  return tooltipText;
}

/**
 * AskPathAdvisorButton — Secondary button with PathAdvisor emblem and label "Ask PathAdvisor".
 * Icon is aria-hidden; visible text is the label. Tooltip shows on hover and focus.
 */
export function AskPathAdvisorButton(props: AskPathAdvisorButtonProps) {
  const onClick = props.onClick;
  const disabled = props.disabled === true;
  const size = props.size !== undefined ? props.size : 'default';
  const className = props.className;
  const tooltipBody =
    props.tooltipText !== undefined && props.tooltipText !== ''
      ? props.tooltipText
      : DEFAULT_TOOLTIP;
  const shortcutHint = props.shortcutHint;
  const tooltipContent = getTooltipContent(tooltipBody, shortcutHint);
  const tooltipId =
    props.tooltipId !== undefined && props.tooltipId !== ''
      ? props.tooltipId
      : 'ask-pathadvisor-tooltip';

  const isSm = size === 'sm';
  const buttonPadding = isSm ? 'px-2 py-1' : 'px-3 py-1.5';
  const textSize = isSm ? 'text-[11px]' : 'text-sm';
  const iconSize = isSm ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const buttonClassName =
    INTERACTIVE_HOVER_CLASS +
    ' rounded-[var(--p-radius)] font-medium inline-flex items-center gap-1.5 ' +
    buttonPadding +
    ' ' +
    textSize +
    (className !== undefined && className !== '' ? ' ' + className : '');

  return (
    <Tooltip contentId={tooltipId} side="top" content={
      <>
        <p className="font-semibold" style={{ color: 'var(--p-text)' }}>
          Ask PathAdvisor
        </p>
        <p>{tooltipContent}</p>
      </>
    }>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={buttonClassName}
        style={{
          background: 'var(--p-surface2)',
          border: '1px solid var(--p-border)',
          color: 'var(--p-text-muted)',
        }}
        aria-label="Ask PathAdvisor"
      >
        <span className="flex-shrink-0" style={{ color: 'var(--p-accent)' }}>
          <Sparkles className={iconSize} aria-hidden />
        </span>
        Ask PathAdvisor
      </button>
    </Tooltip>
  );
}
