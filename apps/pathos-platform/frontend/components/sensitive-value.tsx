/**
 * ============================================================================
 * SENSITIVE VALUE COMPONENT
 * ============================================================================
 *
 * FILE PURPOSE:
 * A React component that displays sensitive financial or personal data with
 * optional masking. Used throughout PathOS to protect private information
 * like salaries, compensation figures, and personal identifiers.
 *
 * WHERE IT FITS IN THE ARCHITECTURE:
 * - UI Layer: Reusable presentation component
 * - Used by: Dashboard cards, modals, settings, job search, and all financial displays
 * - Controlled by: Global privacy state from useUserPreferencesStore
 *
 * KEY CONCEPTS:
 * - "Masking" replaces sensitive text with placeholder characters (e.g., "$•••,•••")
 * - Multiple prop aliases exist for backward compatibility (isHidden, overrideHide, forceHide)
 * - localOverride allows per-instance control ("show", "hide", or "default" to use global)
 * - Precedence order determines final visibility (see HIDE LOGIC below)
 *
 * HOW IT WORKS (STEP BY STEP):
 * 1. Component receives value to display and optional masking props
 * 2. Compute shouldHide using precedence order (local overrides > force props > global)
 * 3. Render either the real value or the masked placeholder
 * 4. Apply optional styling via className and inline props
 *
 * WHY THIS DESIGN:
 * - Single source of truth for all sensitive data display
 * - Centralized logic prevents accidental exposure
 * - Multiple prop aliases support legacy code without breaking changes
 * - Local override enables specific UIs to show/hide regardless of global setting
 *
 * HOW TO EXTEND SAFELY:
 * - Add new props with sensible defaults (optional)
 * - Document any new prop in the interface
 * - Update the shouldHide logic if new control mechanisms are added
 * - Keep backward compatibility by treating new props as optional
 *
 * TESTING / VALIDATION:
 * - pnpm typecheck (ensure no type errors)
 * - Manual: Toggle global privacy in settings, verify component responds
 * - Manual: Pass localOverride="show" and verify value stays visible
 * ============================================================================
 */

'use client';

import type React from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for the SensitiveValue component.
 *
 * WHY SO MANY PROPS:
 * This component evolved over time and different parts of the codebase
 * use different prop names for the same behavior. We support all of them
 * for backward compatibility.
 *
 * PROP GROUPS:
 * 1. Core display: value, masked, className, inline
 * 2. Global hide control: hide (from global state)
 * 3. Local override: localOverride ("show" | "hide" | "default")
 * 4. Force hide aliases: forceHide, isHidden, overrideHide (all legacy patterns)
 * 5. Metadata: type (optional, for categorization, not used in render logic)
 */
export interface SensitiveValueProps {
  /**
   * The actual sensitive value to display (or mask).
   * Required. This is what shows when not hidden.
   */
  value: string;

  /**
   * The masked placeholder to show when hidden.
   * Defaults to "•••••" if not provided.
   * Example: "$•••,•••" for currency, "XXX-XX-XXXX" for SSN
   */
  masked?: string;

  /**
   * Global hide signal, typically from useUserPreferencesStore.
   * When true, the value is hidden (unless localOverride is "show").
   */
  hide?: boolean;

  /**
   * Additional CSS classes to apply to the span.
   */
  className?: string;

  /**
   * If true, renders as inline-block span. Otherwise defaults to inline.
   * Used for layout control in certain contexts.
   */
  inline?: boolean;

  /**
   * Local override for this specific instance.
   * - "show": Always show the real value (ignores global hide)
   * - "hide": Always hide the value (ignores global show)
   * - "default": Use the global hide setting (same as not passing this prop)
   *
   * PRECEDENCE: localOverride takes priority over all other hide signals.
   */
  localOverride?: 'show' | 'hide' | 'default';

  /**
   * LEGACY ALIAS: Force hide this value, regardless of global setting.
   * Same effect as localOverride="hide".
   * Kept for backward compatibility with older code.
   */
  forceHide?: boolean;

  /**
   * LEGACY ALIAS: Indicates the value should be hidden.
   * Same effect as hide=true.
   * Kept for backward compatibility with PCS relocation modal.
   */
  isHidden?: boolean;

  /**
   * LEGACY ALIAS: Override to force hiding.
   * Same effect as forceHide.
   * Kept for backward compatibility with recommendation card.
   */
  overrideHide?: boolean;

  /**
   * Optional metadata type (e.g., "currency", "ssn", "percentage").
   * Not used in render logic, but allows callsites to pass categorization.
   * Useful for future analytics or styling based on data type.
   */
  type?: string;
}

/**
 * SensitiveValue Component
 *
 * Renders a value that can be masked for privacy. The component determines
 * whether to show the real value or a masked placeholder based on a
 * precedence hierarchy of props.
 *
 * HIDE LOGIC PRECEDENCE (highest to lowest):
 * 1. localOverride="hide" -> ALWAYS hide
 * 2. localOverride="show" -> ALWAYS show
 * 3. forceHide || isHidden || overrideHide -> force hide
 * 4. hide (global setting) -> hide if true
 * 5. Default -> show the value
 *
 * @example Basic usage with global hide
 * <SensitiveValue value="$125,000" hide={globalHide} />
 *
 * @example Custom mask
 * <SensitiveValue value="$125,000" masked="$•••,•••" hide={globalHide} />
 *
 * @example Local override to always show
 * <SensitiveValue value="$125,000" localOverride="show" />
 *
 * @example Legacy isHidden prop
 * <SensitiveValue value="$50,000" isHidden={true} />
 */
export function SensitiveValue(props: SensitiveValueProps): React.ReactElement {
  // -------------------------------------------------------------------------
  // STEP 1: Destructure all props with sensible defaults
  // -------------------------------------------------------------------------
  const value = props.value;
  const masked = props.masked;
  const hide = props.hide;
  const className = props.className;
  const inline = props.inline;
  const localOverride = props.localOverride;
  const forceHide = props.forceHide;
  const isHidden = props.isHidden;
  const overrideHide = props.overrideHide;
  // Note: props.type is accepted but not used in render logic (metadata only)

  // -------------------------------------------------------------------------
  // STEP 2: Determine the masked placeholder text
  // -------------------------------------------------------------------------
  // If no custom mask provided, use a generic bullet pattern
  const displayMasked = masked !== undefined ? masked : '•••••';

  // -------------------------------------------------------------------------
  // STEP 3: Compute whether to hide using precedence hierarchy
  // -------------------------------------------------------------------------
  // This is the core privacy logic. We use a clear precedence order:
  //
  // PRECEDENCE ORDER:
  // 1. localOverride="hide" takes absolute priority -> hide
  // 2. localOverride="show" takes absolute priority -> show
  // 3. Any force-hide flag (forceHide, isHidden, overrideHide) -> hide
  // 4. Global hide setting (hide prop) -> hide if true
  // 5. Otherwise -> show
  //
  // WHY THIS ORDER:
  // - Local overrides allow specific UI contexts to deviate from global
  // - Force flags are explicit developer intent for specific instances
  // - Global setting is the default user preference

  let shouldHide = false;

  // Check localOverride first (highest precedence)
  if (localOverride === 'hide') {
    // Explicit local override to hide - always hide
    shouldHide = true;
  } else if (localOverride === 'show') {
    // Explicit local override to show - always show
    shouldHide = false;
  } else {
    // localOverride is "default" or undefined - check other signals

    // Check force-hide flags (legacy aliases for same behavior)
    const hasForceHide = forceHide === true || isHidden === true || overrideHide === true;

    if (hasForceHide) {
      // Any force-hide flag is true - hide the value
      shouldHide = true;
    } else {
      // Fall back to global hide setting
      shouldHide = hide === true;
    }
  }

  // -------------------------------------------------------------------------
  // STEP 4: Determine the displayed value
  // -------------------------------------------------------------------------
  const displayValue = shouldHide ? displayMasked : value;

  // -------------------------------------------------------------------------
  // STEP 5: Render the span with appropriate styling
  // -------------------------------------------------------------------------
  // tabular-nums ensures consistent width for numbers (useful for tables)
  // inline-block is applied if the inline prop is true (for layout control)
  return (
    <span
      className={cn(
        'tabular-nums',
        inline === true ? 'inline-block' : undefined,
        className
      )}
    >
      {displayValue}
    </span>
  );
}
