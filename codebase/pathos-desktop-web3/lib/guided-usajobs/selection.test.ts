/**
 * ============================================================================
 * GUIDED USAJOBS SELECTION TESTS (Day 44)
 * ============================================================================
 *
 * Verifies selection rectangle math and clamping behavior.
 */

import { describe, it, expect } from 'vitest';
import { buildGuidedUsaJobsRegion } from './selection';

describe('buildGuidedUsaJobsRegion', function () {
  it('should convert a click into a centered rectangle and clamp to bounds', function () {
    const region = buildGuidedUsaJobsRegion({
      startX: 10,
      startY: 10,
      endX: 12,
      endY: 12,
      containerWidth: 200,
      containerHeight: 100,
      clickThreshold: 12,
      clickWidth: 180,
      clickHeight: 120,
      minDragSize: 24,
    });

    expect(region.width).toBe(180);
    expect(region.height).toBe(100);
    expect(region.x).toBe(0);
    expect(region.y).toBe(0);
  });

  it('should clamp drag selections to min size and container bounds', function () {
    const region = buildGuidedUsaJobsRegion({
      startX: 190,
      startY: 90,
      endX: 210,
      endY: 120,
      containerWidth: 200,
      containerHeight: 100,
      clickThreshold: 12,
      clickWidth: 180,
      clickHeight: 120,
      minDragSize: 24,
    });

    expect(region.width).toBe(24);
    expect(region.height).toBe(24);
    expect(region.x).toBe(176);
    expect(region.y).toBe(76);
  });
});
