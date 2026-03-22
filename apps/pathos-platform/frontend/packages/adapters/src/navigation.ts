/**
 * ============================================================================
 * NAVIGATION ADAPTER — Platform-agnostic navigation interface
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 * Platform-specific implementations live in apps/web and apps/desktop.
 *
 * WHY:
 * Shared UI components (packages/ui) need to navigate between screens
 * without knowing whether they run in Next.js, React Router, or Electron.
 * This adapter provides a stable interface that each platform implements.
 *
 * IMPLEMENTATIONS:
 * - apps/web: nextNavAdapter (wraps Next.js useRouter / Link)
 * - apps/web: previewNavAdapter (in-memory routing for desktop preview)
 * - apps/desktop: reactRouterNavAdapter (wraps React Router)
 */

/**
 * Platform-agnostic navigation adapter.
 *
 * Every method corresponds to a common navigation action that shared
 * components may need. Platform implementations translate these to
 * the underlying router.
 */
export interface NavigationAdapter {
  /**
   * Navigate to a path. Equivalent to router.push() or navigate().
   * @param path - The path to navigate to (e.g., '/dashboard')
   */
  push(path: string): void;

  /**
   * Replace the current entry in the history stack.
   * @param path - The path to navigate to
   */
  replace(path: string): void;

  /**
   * Go back one step in the history stack.
   */
  back(): void;

  /**
   * The current pathname (e.g., '/dashboard/career').
   */
  pathname: string;
}

/**
 * Props for a platform-agnostic link component.
 * Shared UI renders <NavLink> instead of <a> or Next <Link>.
 */
export interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  'data-tour'?: string;
}
