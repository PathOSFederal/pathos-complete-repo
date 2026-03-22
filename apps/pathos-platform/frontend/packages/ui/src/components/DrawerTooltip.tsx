/**
 * ============================================================================
 * DRAWER TOOLTIP — Thin alias for Tooltip (Overlay Rule v1)
 * ============================================================================
 *
 * Tooltips for icon buttons inside drawers/sheets. Uses canonical Tooltip with
 * side="left" and drawer-friendly offsets so the tooltip opens inward and is
 * not clipped. Prefer Tooltip elsewhere; use DrawerTooltip for right-edge
 * buttons in side panels.
 */

'use client';

import type React from 'react';
import { Tooltip } from './Tooltip';

export interface DrawerTooltipProps {
  /** Trigger element (icon button). Pass as child. */
  children: React.ReactNode;
  /** Tooltip body text. */
  content: string;
  /** Optional id for the content element (accessibility). */
  contentId?: string;
  /** Placement: "left" for right-edge buttons so tooltip opens inward. */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Gap between trigger and content (px). */
  sideOffset?: number;
  /** Padding from viewport edge when avoiding collisions (px). */
  collisionPadding?: number;
}

/**
 * Thin alias: Tooltip with side=left and drawer-friendly defaults.
 */
export function DrawerTooltip(props: DrawerTooltipProps) {
  const side = props.side !== undefined ? props.side : 'left';
  const sideOffset = props.sideOffset !== undefined ? props.sideOffset : 8;
  const collisionPadding = props.collisionPadding !== undefined ? props.collisionPadding : 12;

  return (
    <Tooltip
      contentId={props.contentId}
      side={side}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      content={props.content}
    >
      {props.children}
    </Tooltip>
  );
}
