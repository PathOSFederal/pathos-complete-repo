/**
 * ============================================================================
 * GUIDED USAJOBS SELECTION HELPERS (Day 44)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Pure math helpers for selection rectangles. This keeps pointer math separate
 * from React so we can test bounds clamping and click-to-explain sizing.
 *
 * @version Day 44 - Guided USAJOBS Click-to-Explain v1
 * ============================================================================
 */

import type { GuidedUsaJobsRegion } from '@/lib/guided-usajobs/types';

export interface GuidedUsaJobsSelectionParams {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  containerWidth: number;
  containerHeight: number;
  clickThreshold: number;
  clickWidth: number;
  clickHeight: number;
  minDragSize: number;
}

/**
 * Build a normalized, clamped region for click/drag selection.
 */
export function buildGuidedUsaJobsRegion(params: GuidedUsaJobsSelectionParams): GuidedUsaJobsRegion {
  const startX = params.startX;
  const startY = params.startY;
  const endX = params.endX;
  const endY = params.endY;
  const containerWidth = params.containerWidth;
  const containerHeight = params.containerHeight;

  const dragWidth = Math.abs(endX - startX);
  const dragHeight = Math.abs(endY - startY);
  const isClick = dragWidth < params.clickThreshold && dragHeight < params.clickThreshold;

  if (isClick) {
    const rawWidth = Math.min(params.clickWidth, containerWidth);
    const rawHeight = Math.min(params.clickHeight, containerHeight);
    const rawX = endX - rawWidth / 2;
    const rawY = endY - rawHeight / 2;

    const clampedX = clampValue(rawX, 0, Math.max(0, containerWidth - rawWidth));
    const clampedY = clampValue(rawY, 0, Math.max(0, containerHeight - rawHeight));

    return {
      x: clampedX,
      y: clampedY,
      width: rawWidth,
      height: rawHeight,
    };
  }

  const rawX = Math.min(startX, endX);
  const rawY = Math.min(startY, endY);
  const rawWidth = Math.abs(endX - startX);
  const rawHeight = Math.abs(endY - startY);

  let width = rawWidth;
  let height = rawHeight;

  if (rawWidth < params.minDragSize || rawHeight < params.minDragSize) {
    width = params.minDragSize;
    height = params.minDragSize;
  }

  width = clampValue(width, params.minDragSize, containerWidth);
  height = clampValue(height, params.minDragSize, containerHeight);

  const clampedX = clampValue(rawX, 0, Math.max(0, containerWidth - width));
  const clampedY = clampValue(rawY, 0, Math.max(0, containerHeight - height));

  return {
    x: clampedX,
    y: clampedY,
    width: width,
    height: height,
  };
}

function clampValue(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
