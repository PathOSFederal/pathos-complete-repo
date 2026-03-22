'use client';

import type React from 'react';
import { forwardRef } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Props for AskPathAdvisorButton component.
 * 
 * PURPOSE:
 * Standardized button component for all "Ask PathAdvisor" CTAs across the application.
 * Ensures consistent visual treatment (amber-tinted gradient) and behavior.
 */
interface AskPathAdvisorButtonProps {
  /**
   * Click handler. Should call openPathAdvisor() or equivalent.
   */
  onClick: () => void;
  /**
   * Optional label override. Defaults to "Ask PathAdvisor for Review Suggestions".
   */
  children?: React.ReactNode;
  /**
   * Optional additional className. Applied LAST to allow overrides.
   */
  className?: string;
  /**
   * Whether button should be full width. Defaults to true.
   */
  fullWidth?: boolean;
}

/**
 * AskPathAdvisorButton - Standardized "Ask PathAdvisor" CTA button.
 * 
 * VISUAL STYLING:
 * - Amber-tinted gradient background (from-amber-500/24 via-amber-500/14 to-amber-500/24)
 * - Amber border (border-amber-400/70)
 * - White text
 * - Hover/active states with increased opacity
 * - Shadow effects for depth
 * - Sparkles icon on the left
 * 
 * WHY THIS STYLING:
 * - Amber color ensures visibility on dark UI backgrounds
 * - Gradient adds visual interest and makes button "pop"
 * - Consistent across all entry points for brand recognition
 * 
 * USAGE:
 * ```tsx
 * <AskPathAdvisorButton onClick={() => openPathAdvisor({...})} />
 * ```
 */
export const AskPathAdvisorButton = forwardRef<HTMLButtonElement, AskPathAdvisorButtonProps>(
  function AskPathAdvisorButton(props, ref) {
    const onClick = props.onClick;
    const children = props.children;
    const className = props.className;
    const fullWidth = props.fullWidth !== false; // Default to true

  // Base className with amber-tinted styling
  // Using !important modifiers sparingly (only for bg/border if needed for specificity)
  const baseClassName =
    'inline-flex items-center justify-center gap-2 font-medium ' +
    'border border-amber-400/70 ' +
    'bg-gradient-to-r from-amber-500/24 via-amber-500/14 to-amber-500/24 ' +
    'text-white ' +
    'shadow-sm shadow-amber-500/10 ' +
    'hover:from-amber-500/34 hover:via-amber-500/22 hover:to-amber-500/34 ' +
    'hover:border-amber-300/80 hover:shadow-md hover:shadow-amber-500/20 ' +
    'active:from-amber-500/40 active:via-amber-500/28 active:to-amber-500/40 ' +
    'focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-0';

  // Add full-width class if needed
  const widthClass = fullWidth ? 'w-full' : '';

  // Merge classes: base + width + caller className (caller wins for overrides)
  const mergedClassName = cn(baseClassName, widthClass, className);

  // Default label if children not provided
  const label = children !== undefined ? children : 'Ask PathAdvisor for Review Suggestions';

    return (
      <Button ref={ref} variant="outline" className={mergedClassName} onClick={onClick} type="button">
        <Sparkles className="h-4 w-4 text-amber-300/90" />
        {label}
      </Button>
    );
  },
);

