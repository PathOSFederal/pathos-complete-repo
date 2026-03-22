// components/layout/page-shell.tsx
'use client';

import type React from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;

  /**
   * If true, the content spans full width.
   * If false, it is centered with a max width.
   */
  fullWidth?: boolean;
}

/**
 * ============================================================================
 * PAGE SHELL COMPONENT (Day 35 - Wider Layout)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Wraps page content with consistent max-width and centering for desktop.
 * Day 35: Updated to use max-w-screen-2xl for wider desktop layout.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - Layout Layer: Applied to main content areas across the app
 * - Used by: Dashboard pages, Job Search, Resume Builder, etc.
 *
 * DAY 35 CHANGES:
 * - Changed max-width from max-w-6xl to max-w-screen-2xl
 * - This makes the app feel wider on desktop, reducing "floating island" feel
 * - Responsive padding and mobile behavior unchanged
 *
 * HOW IT WORKS:
 * - If fullWidth=true: Content spans full width (no max-width constraint)
 * - If fullWidth=false: Content is centered with max-w-screen-2xl (1536px)
 * - Mobile: max-width constraint still applies but responsive padding handles spacing
 */
export function PageShell({ children, className, fullWidth }: PageShellProps) {
  return (
    <div className={cn(fullWidth ? 'w-full' : 'max-w-screen-2xl mx-auto', className)}>{children}</div>
  );
}
