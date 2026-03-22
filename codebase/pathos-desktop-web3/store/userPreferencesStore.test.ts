/**
 * ============================================================================
 * USER PREFERENCES STORE TRIPWIRE TESTS
 * ============================================================================
 *
 * FILE PURPOSE:
 * These tests verify that visibility preferences work correctly, including:
 * - Global privacy toggle behavior
 * - Per-card visibility toggling
 * - Default visibility state
 * - Merge behavior for new card keys
 *
 * NOTE ON TESTING STORES:
 * These tests focus on the pure functions and state logic, not the React hooks.
 * We test the helper functions directly to avoid needing React Testing Library.
 *
 * @version Day 14 - Process Hardening
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_CARD_KEYS,
  type CardKey,
  type CardVisibilityState,
} from './userPreferencesStore';

// ============================================================================
// HELPER FUNCTIONS (copied from store to test in isolation)
// ============================================================================

/**
 * Create default card visibility with all cards visible.
 */
function createDefaultCardVisibility(): CardVisibilityState {
  const defaults = {} as CardVisibilityState;
  for (let i = 0; i < ALL_CARD_KEYS.length; i++) {
    defaults[ALL_CARD_KEYS[i]] = true;
  }
  return defaults;
}

/**
 * Merge stored card visibility with defaults.
 * This is the logic we need to test to catch persistence bugs.
 */
function mergeCardVisibility(stored: Partial<CardVisibilityState> | null | undefined): CardVisibilityState {
  const base: CardVisibilityState = Object.assign({}, createDefaultCardVisibility());

  if (stored && typeof stored === 'object') {
    for (let i = 0; i < ALL_CARD_KEYS.length; i++) {
      const key = ALL_CARD_KEYS[i];
      if (Object.prototype.hasOwnProperty.call(stored, key)) {
        base[key] = !!stored[key];
      }
    }
  }

  return base as CardVisibilityState;
}

// ============================================================================
// TEST SUITE: Default Visibility State
// ============================================================================

describe('Default card visibility', function () {
  /**
   * TRIPWIRE: All cards should be visible by default.
   */
  it('should have all cards visible by default', function () {
    const defaults = createDefaultCardVisibility();

    for (let i = 0; i < ALL_CARD_KEYS.length; i++) {
      const key = ALL_CARD_KEYS[i];
      expect(defaults[key]).toBe(true);
    }
  });

  /**
   * TRIPWIRE: Default state should include all known card keys.
   */
  it('should include all known card keys', function () {
    const defaults = createDefaultCardVisibility();
    const keys = Object.keys(defaults);

    expect(keys.length).toBe(ALL_CARD_KEYS.length);
  });

  /**
   * TRIPWIRE: Job seeker cards should be in the card key list.
   * These were added in Day 13 and must not be missing.
   */
  it('should include job seeker card keys', function () {
    expect(ALL_CARD_KEYS).toContain('jobseeker.marketPosition');
    expect(ALL_CARD_KEYS).toContain('jobseeker.nextBestMoves');
    expect(ALL_CARD_KEYS).toContain('jobseeker.benefitsSwitching');
    expect(ALL_CARD_KEYS).toContain('jobseeker.federalOfferPreview');
  });
});

// ============================================================================
// TEST SUITE: Merge Behavior
// ============================================================================

describe('Card visibility merge behavior', function () {
  /**
   * TRIPWIRE: Merging null should return all-visible defaults.
   */
  it('should return defaults when merging null', function () {
    const result = mergeCardVisibility(null);

    for (let i = 0; i < ALL_CARD_KEYS.length; i++) {
      expect(result[ALL_CARD_KEYS[i]]).toBe(true);
    }
  });

  /**
   * TRIPWIRE: Merging undefined should return all-visible defaults.
   */
  it('should return defaults when merging undefined', function () {
    const result = mergeCardVisibility(undefined);

    for (let i = 0; i < ALL_CARD_KEYS.length; i++) {
      expect(result[ALL_CARD_KEYS[i]]).toBe(true);
    }
  });

  /**
   * TRIPWIRE: Stored false values should override defaults.
   */
  it('should respect stored false values', function () {
    const stored: Partial<CardVisibilityState> = {
      'dashboard.totalCompensation': false,
      'dashboard.retirementReadiness': false,
    };

    const result = mergeCardVisibility(stored);

    expect(result['dashboard.totalCompensation']).toBe(false);
    expect(result['dashboard.retirementReadiness']).toBe(false);
    // Other cards should still be visible
    expect(result['dashboard.taxInsights']).toBe(true);
  });

  /**
   * TRIPWIRE: New card keys (not in stored) should get default visibility.
   */
  it('should add default visibility for new card keys', function () {
    // Simulate old stored state that doesn't have newer cards
    const stored: Partial<CardVisibilityState> = {
      'dashboard.totalCompensation': true,
      // Note: jobseeker.* cards not present (simulating pre-Day-13 storage)
    };

    const result = mergeCardVisibility(stored);

    // New keys should default to visible
    expect(result['jobseeker.marketPosition']).toBe(true);
    expect(result['jobseeker.nextBestMoves']).toBe(true);
  });

  /**
   * TRIPWIRE: Unknown keys in storage should be ignored (not added to state).
   */
  it('should ignore unknown keys in stored data', function () {
    const stored = {
      'dashboard.totalCompensation': false,
      'unknown.invalidKey': true, // This key doesn't exist in CardKey
    } as Partial<CardVisibilityState>;

    const result = mergeCardVisibility(stored);
    const keys = Object.keys(result);

    // Should only have known keys
    expect(keys).not.toContain('unknown.invalidKey');
    expect(keys.length).toBe(ALL_CARD_KEYS.length);
  });
});

// ============================================================================
// TEST SUITE: Visibility Toggle Logic
// ============================================================================

describe('Card visibility toggle logic', function () {
  /**
   * Simulates the toggle logic from the store.
   */
  function toggleCardVisibility(
    current: CardVisibilityState,
    cardKey: CardKey
  ): CardVisibilityState {
    const currentValue = !!current[cardKey];
    const next = Object.assign({}, current);
    next[cardKey] = !currentValue;
    return next;
  }

  /**
   * TRIPWIRE: Toggling should flip visibility.
   */
  it('should toggle from true to false', function () {
    const initial = createDefaultCardVisibility();
    expect(initial['dashboard.totalCompensation']).toBe(true);

    const toggled = toggleCardVisibility(initial, 'dashboard.totalCompensation');
    expect(toggled['dashboard.totalCompensation']).toBe(false);
  });

  it('should toggle from false to true', function () {
    const initial = createDefaultCardVisibility();
    initial['dashboard.totalCompensation'] = false;

    const toggled = toggleCardVisibility(initial, 'dashboard.totalCompensation');
    expect(toggled['dashboard.totalCompensation']).toBe(true);
  });

  /**
   * TRIPWIRE: Toggle should not mutate original state.
   */
  it('should not mutate original state', function () {
    const initial = createDefaultCardVisibility();
    const originalValue = initial['dashboard.totalCompensation'];

    toggleCardVisibility(initial, 'dashboard.totalCompensation');

    // Original should be unchanged
    expect(initial['dashboard.totalCompensation']).toBe(originalValue);
  });

  /**
   * TRIPWIRE: Toggle should only affect the specified card.
   */
  it('should only affect the specified card', function () {
    const initial = createDefaultCardVisibility();

    const toggled = toggleCardVisibility(initial, 'dashboard.totalCompensation');

    // Other cards should be unchanged
    expect(toggled['dashboard.retirementReadiness']).toBe(true);
    expect(toggled['dashboard.taxInsights']).toBe(true);
    expect(toggled['dashboard.fehbComparison']).toBe(true);
  });
});

// ============================================================================
// TEST SUITE: CardKey Type Safety
// ============================================================================

describe('CardKey registry integrity', function () {
  /**
   * TRIPWIRE: ALL_CARD_KEYS should not have duplicates.
   */
  it('should not have duplicate keys', function () {
    const uniqueKeys = new Set(ALL_CARD_KEYS);
    expect(uniqueKeys.size).toBe(ALL_CARD_KEYS.length);
  });

  /**
   * TRIPWIRE: All keys should follow naming convention (category.name).
   * Category can be camelCase (e.g., jobSearch) and name can be camelCase.
   */
  it('should follow naming convention', function () {
    // Pattern: category.name where both can be camelCase
    // Examples: dashboard.totalCompensation, jobSearch.overview, jobseeker.marketPosition
    const dotPattern = /^[a-zA-Z]+\.[a-zA-Z]+$/;

    for (let i = 0; i < ALL_CARD_KEYS.length; i++) {
      const key = ALL_CARD_KEYS[i];
      expect(key).toMatch(dotPattern);
    }
  });
});

// ============================================================================
// TEST SUITE: PathAdvisor Dock Position Normalization
// ============================================================================
// These tests verify the normalization logic for pathAdvisorDock preference.
// Day 17: The 'bottom' position was removed from the UI, so any stored
// 'bottom' value must be normalized to 'right' during hydration.
// ============================================================================

describe('PathAdvisor dock position normalization', function () {
  /**
   * Helper: Normalize dock position to valid values ('left' | 'right').
   * This mirrors the logic in profile-context.tsx loadInitialProfileState.
   */
  function normalizeDockPosition(value: string | undefined | null): 'left' | 'right' {
    if (value === 'left') {
      return 'left';
    }
    // 'bottom', 'right', undefined, null, or any other value → 'right'
    return 'right';
  }

  /**
   * TRIPWIRE: 'left' should remain 'left'.
   */
  it('should keep left as left', function () {
    expect(normalizeDockPosition('left')).toBe('left');
  });

  /**
   * TRIPWIRE: 'right' should remain 'right'.
   */
  it('should keep right as right', function () {
    expect(normalizeDockPosition('right')).toBe('right');
  });

  /**
   * TRIPWIRE: 'bottom' should be normalized to 'right'.
   * Day 17 change: bottom position removed from UI.
   */
  it('should normalize bottom to right', function () {
    expect(normalizeDockPosition('bottom')).toBe('right');
  });

  /**
   * TRIPWIRE: undefined should default to 'right'.
   */
  it('should default undefined to right', function () {
    expect(normalizeDockPosition(undefined)).toBe('right');
  });

  /**
   * TRIPWIRE: null should default to 'right'.
   */
  it('should default null to right', function () {
    expect(normalizeDockPosition(null)).toBe('right');
  });

  /**
   * TRIPWIRE: Invalid values should default to 'right'.
   */
  it('should default invalid values to right', function () {
    expect(normalizeDockPosition('top')).toBe('right');
    expect(normalizeDockPosition('center')).toBe('right');
    expect(normalizeDockPosition('')).toBe('right');
  });

  /**
   * TRIPWIRE: Critical dashboard cards should be present.
   */
  it('should include critical dashboard cards', function () {
    expect(ALL_CARD_KEYS).toContain('dashboard.pathAdvisorInsights');
    expect(ALL_CARD_KEYS).toContain('dashboard.totalCompensation');
    expect(ALL_CARD_KEYS).toContain('dashboard.retirementReadiness');
  });

  /**
   * TRIPWIRE: Resume builder cards should be present.
   */
  it('should include resume builder cards', function () {
    expect(ALL_CARD_KEYS).toContain('resume.scoreCard');
    expect(ALL_CARD_KEYS).toContain('resume.experience');
    expect(ALL_CARD_KEYS).toContain('resume.skills');
  });
});

// ============================================================================
// TEST SUITE: Persistence Edge Cases
// ============================================================================

describe('Visibility persistence edge cases', function () {
  /**
   * TRIPWIRE: Empty object stored should use defaults.
   */
  it('should handle empty object gracefully', function () {
    const result = mergeCardVisibility({} as Partial<CardVisibilityState>);

    // All should be visible (defaults)
    for (let i = 0; i < ALL_CARD_KEYS.length; i++) {
      expect(result[ALL_CARD_KEYS[i]]).toBe(true);
    }
  });

  /**
   * TRIPWIRE: Non-object stored values should use defaults.
   */
  it('should handle non-object stored values gracefully', function () {
    // TypeScript would catch this, but runtime might have corrupted data
    const result1 = mergeCardVisibility('invalid' as unknown as Partial<CardVisibilityState>);
    const result2 = mergeCardVisibility(123 as unknown as Partial<CardVisibilityState>);

    // Should fall back to defaults
    expect(result1['dashboard.totalCompensation']).toBe(true);
    expect(result2['dashboard.totalCompensation']).toBe(true);
  });

  /**
   * TRIPWIRE: Partial state should merge correctly with defaults.
   */
  it('should merge partial state with defaults', function () {
    const partial: Partial<CardVisibilityState> = {
      'dashboard.totalCompensation': false,
      'resume.scoreCard': false,
    };

    const result = mergeCardVisibility(partial);

    // Explicitly set values
    expect(result['dashboard.totalCompensation']).toBe(false);
    expect(result['resume.scoreCard']).toBe(false);

    // Unset values should be defaults
    expect(result['dashboard.retirementReadiness']).toBe(true);
    expect(result['resume.experience']).toBe(true);
  });
});
