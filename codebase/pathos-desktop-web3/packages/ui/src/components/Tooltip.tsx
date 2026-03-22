/**
 * ============================================================================
 * TOOLTIP — Canonical portaled tooltip (Overlay Rule v1)
 * ============================================================================
 *
 * Single Radix-based tooltip used across packages/ui. Content is portaled to
 * the global OverlayRoot (pathos-overlay-root) when present, else document.body,
 * so it is never clipped by overflow or stacking context. Z-index from zIndex.ts.
 *
 * Use this instead of inline role="tooltip" siblings or absolute div tooltips.
 */

'use client';

import type React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { OVERLAY_ROOT_ID, Z_TOOLTIP } from '../styles/zIndex';

/** Resolve portal container: OverlayRoot when available, else body (SSR-safe). */
function getOverlayContainer(): HTMLElement | undefined {
  if (typeof document === 'undefined') return undefined;
  const el = document.getElementById(OVERLAY_ROOT_ID);
  return el !== null ? el : document.body;
}

/** Delay before tooltip shows (ms). */
const DELAY_MS = 0;

/** Default gap between trigger and content (px). */
const DEFAULT_SIDE_OFFSET = 8;

/** Default padding from viewport edge when avoiding collisions (px). */
const DEFAULT_COLLISION_PADDING = 12;

export interface TooltipProps {
  /** Trigger element. Pass as child; Trigger uses asChild. */
  children: React.ReactNode;
  /** Tooltip content (string or React node for title + body). */
  content: React.ReactNode;
  /** Optional id for the content element (accessibility). */
  contentId?: string;
  /** Placement relative to trigger. */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Gap between trigger and content (px). */
  sideOffset?: number;
  /** Padding from viewport edge when avoiding collisions (px). */
  collisionPadding?: number;
}

/**
 * Canonical tooltip: portaled to body, Z_TOOLTIP, default collision/side offset.
 */
export function Tooltip(props: TooltipProps) {
  const side = props.side !== undefined ? props.side : 'top';
  const sideOffset = props.sideOffset !== undefined ? props.sideOffset : DEFAULT_SIDE_OFFSET;
  const collisionPadding =
    props.collisionPadding !== undefined ? props.collisionPadding : DEFAULT_COLLISION_PADDING;

  const container = getOverlayContainer();

  return (
    <TooltipPrimitive.Provider delayDuration={DELAY_MS}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {props.children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal container={container}>
          <TooltipPrimitive.Content
            id={props.contentId}
            side={side}
            sideOffset={sideOffset}
            collisionPadding={collisionPadding}
            className="max-w-[14rem] rounded-[var(--p-radius)] border p-2 text-left text-[11px]"
            style={{
              background: 'var(--p-surface)',
              borderColor: 'var(--p-border)',
              color: 'var(--p-text-muted)',
              zIndex: Z_TOOLTIP,
              pointerEvents: 'auto',
            }}
          >
            {props.content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
