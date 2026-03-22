/**
 * ============================================================================
 * FILTER DROPDOWN ΓÇö Token-styled, portaled single-select for filters bar
 * ============================================================================
 *
 * Overlay Rule v1: Content is portaled to OverlayRoot (or document.body) so
 * the menu is not clipped by the rail. Uses zIndex from shared module; do not
 * use Tailwind z index utilities. Token-only styling (--p-surface, --p-border, etc.).
 *
 * Used by JobSearchScreen for Grades, Series, Agencies, Location, Types.
 */

'use client';

import type React from 'react';
import { useState } from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Info } from 'lucide-react';
import { OVERLAY_ROOT_ID, Z_POPOVER } from '../../styles/zIndex';
import { INTERACTIVE_HOVER_CLASS } from '../../styles/interactiveHover';
import { Tooltip } from '../../components/Tooltip';

/** Class for dropdown items; hover/highlight uses token --p-surface2 via inline style below. */
const ITEM_HIGHLIGHT_CLASS = 'pathos-filter-dropdown-item';

export interface FilterDropdownOption {
  value: string;
  label: string;
}

export interface FilterDropdownProps {
  /** Current selected value (empty string = "All" / default). */
  value: string;
  /** Label for the trigger (e.g. "Grades"). */
  label: string;
  /** Options; first is typically the "All" option with value "". */
  options: FilterDropdownOption[];
  /** Called when user selects an option. */
  onSelect: (value: string) => void;
  /** Optional tooltip for filter group; when set, an info icon is shown next to trigger. */
  tooltip?: string;
}

/**
 * Resolve portal container: OverlayRoot when available, else body (SSR-safe).
 * Matches Tooltip.tsx pattern so dropdowns and tooltips share the same stack.
 */
function getOverlayContainer(): HTMLElement | undefined {
  if (typeof document === 'undefined') return undefined;
  const el = document.getElementById(OVERLAY_ROOT_ID);
  return el !== null ? el : document.body;
}

/**
 * Token-styled dropdown: trigger shows current label; content is portaled
 * with var(--p-surface), var(--p-border), var(--p-shadow-elev-1), hover
 * var(--p-surface2). No hardcoded colors; do not use Tailwind z index utilities.
 */
export function FilterDropdown(props: FilterDropdownProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const options = props.options;
  let currentOption = options[0];
  for (let i = 0; i < options.length; i++) {
    if (options[i].value === props.value) {
      currentOption = options[i];
      break;
    }
  }
  const displayLabel = currentOption !== undefined ? currentOption.label : props.label;

  const container = getOverlayContainer();

  return (
    <>
      <style>
        {'.' + ITEM_HIGHLIGHT_CLASS + '[data-highlighted]{ background: var(--p-surface2); }'}
      </style>
      <div className="inline-flex items-center gap-1">
      <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen}>
      <DropdownMenuPrimitive.Trigger asChild>
          <button
            type="button"
            className={INTERACTIVE_HOVER_CLASS + ' inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border bg-transparent outline-none min-w-[7rem] justify-between'}
            style={{
              borderColor: 'var(--p-border)',
              color: 'var(--p-text)',
              borderRadius: 'var(--p-radius)',
            }}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="truncate">{displayLabel}</span>
            <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--p-text-muted)' }} aria-hidden />
          </button>
      </DropdownMenuPrimitive.Trigger>
      {props.tooltip !== undefined && props.tooltip !== '' ? (
        <Tooltip content={props.tooltip} contentId="filter-dropdown-info-tooltip">
          <span className="inline-flex items-center" aria-label="What this filter means">
            <Info className="w-3.5 h-3.5" style={{ color: 'var(--p-text-dim)' }} aria-hidden />
          </span>
        </Tooltip>
      ) : null}
      <DropdownMenuPrimitive.Portal container={container}>
        <DropdownMenuPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={12}
          className="min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-[16rem] overflow-y-auto rounded border py-1"
          style={{
            backgroundColor: 'var(--p-surface)',
            borderColor: 'var(--p-border)',
            boxShadow: 'var(--p-shadow-elev-1)',
            zIndex: Z_POPOVER,
          }}
          onCloseAutoFocus={function (e) {
            e.preventDefault();
          }}
        >
          {options.map(function (opt) {
            const isSelected = opt.value === props.value;
            return (
              <DropdownMenuPrimitive.Item
                key={opt.value}
                className={ITEM_HIGHLIGHT_CLASS + ' cursor-pointer outline-none rounded-none px-3 py-2 text-sm flex items-center gap-2'}
                style={{
                  color: 'var(--p-text)',
                }}
                onSelect={function () {
                  props.onSelect(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
                {isSelected ? (
                  <span className="ml-auto text-[10px]" style={{ color: 'var(--p-accent)' }}>
                    Γ£ô
                  </span>
                ) : null}
              </DropdownMenuPrimitive.Item>
            );
          })}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
    </div>
    </>
  );
}
