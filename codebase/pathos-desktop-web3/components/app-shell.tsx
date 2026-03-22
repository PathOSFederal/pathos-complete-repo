/**
 * ============================================================================
 * APP SHELL COMPONENT
 * ============================================================================
 *
 * FILE PURPOSE:
 * The main layout wrapper for the PathOS application. It provides the
 * consistent structure around all pages: top bar, sidebar navigation,
 * PathAdvisor panel, and content area.
 *
 * WHERE IT FITS IN THE ARCHITECTURE:
 * - Layout Layer: Wraps all dashboard pages
 * - Consumed by: app/layout.tsx or individual page layouts
 * - Contains: PathOSTopBar, PathOSSidebar, PathAdvisorPanel
 *
 * KEY CONCEPTS:
 * - "Dock" refers to where the PathAdvisor panel is positioned (left or right)
 * - Mobile navigation uses a Sheet component for responsive design
 * - Shows onboarding disclaimer if user has not accepted it
 *
 * HOW IT WORKS (STEP BY STEP):
 * 1. Check if user has accepted the global disclaimer
 * 2. If not, show the onboarding disclaimer step
 * 3. Normalize the dock position (only left or right are valid)
 * 4. Render the layout with sidebar, content, and PathAdvisor panel
 *
 * WHY THIS DESIGN:
 * - Consistent layout across all pages
 * - Flexible dock position for user preference
 * - Mobile-friendly with collapsible navigation
 * - Gating with disclaimer ensures legal compliance
 *
 * HOW TO EXTEND SAFELY:
 * - Add new layout variations by extending the dock logic
 * - Keep the disclaimer check at the top to ensure it always runs
 * - Avoid adding heavy computation here (it runs on every page)
 *
 * TESTING / VALIDATION:
 * - pnpm typecheck (ensure no type errors)
 * - Visual: Check that layout renders correctly on desktop and mobile
 * - Test dock position preference in settings
 * ============================================================================
 */

'use client';

import type React from 'react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { PathOSTopBar } from '@/components/path-os-top-bar';
import { PathOSSidebar } from '@/components/path-os-sidebar';
import { PathAdvisorPanel } from '@/components/path-advisor-panel';
import { OnboardingDisclaimerStep } from '@/components/onboarding-disclaimer-step';
import { RouteTransition } from '@/components/layout/RouteTransition';
import { GuidedTourOverlay } from '@/components/tour/GuidedTourOverlay';
import { useUserPreferencesStore } from '@/store/userPreferencesStore';
import { useProfileStore } from '@/store/profileStore';
import { useResumeBuilderStore } from '@/store/resumeBuilderStore';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
// Day 43: Import anchor route reset hook for navigation cleanup
import { useAnchorRouteReset } from '@/hooks/use-anchor-route-reset';

export function AppShell(props: { children: React.ReactNode }) {
  const children = props.children;

  const hasAcceptedGlobalDisclaimer = useUserPreferencesStore(function (state) {
    return state.hasAcceptedGlobalDisclaimer;
  });

  const profile = useProfileStore(function (state) {
    return state.profile;
  });

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  // Day 35: Hide PathAdvisorPanel on dashboard page
  // The dashboard has its own integrated PathAdvisor experience (CoachSessionPanel)
  // and should not show the separate PathAdvisorPanel to avoid "two advisors" confusion
  const pathname = usePathname();
  const isDashboardPage = pathname === '/dashboard';
  const isSharedDashboardRoute = pathname === '/dashboard';
  const isDesktopShellRoute = pathname === '/desktop/usajobs-guided';
  const isPublicRoute = pathname === '/' || pathname === '/download';
  
  // Day 38 Overlay v1: Hide PathAdvisorPanel when tailoring overlay is active
  // The TailoringWorkspaceOverlay has its own GuidanceStrip and optional PathAdvisor drawer
  // to avoid "two advisors" confusion and keep the workspace focused
  // CRITICAL: Use store state (isTailoringMode) instead of URL params for robust detection
  const isTailoringMode = useResumeBuilderStore(function (state) {
    return state.isTailoringMode;
  });
  
  // Day 42: Hide sidebar and PathAdvisorPanel on Benefits Workspace route for immersive experience
  // The Benefits Workspace should feel like Resume Builder: maximum real estate, no distractions
  const isBenefitsWorkspace = pathname === '/explore/benefits/workspace';
  const shouldHidePathAdvisor = isDashboardPage || isTailoringMode;
  const shouldHideSidebar = isBenefitsWorkspace;

  // ============================================================================
  // DAY 43: ANCHOR ROUTE RESET (Critical Bug Fix)
  // ============================================================================
  //
  // WHY THIS HOOK EXISTS:
  // Before Day 43, PathAdvisor retained stale anchor/card UI when navigating.
  // User would Ask from Job Details, navigate to Resume Builder, and still see
  // job-specific cards in the sidebar. This was confusing and broke UX trust.
  //
  // WHAT THIS HOOK DOES:
  // - On route change: Clears active anchor (and optionally proposals)
  // - Preserves conversation thread history (stored in AdvisorContext)
  // - Allows destination pages to set their own page-level anchor if needed
  //
  // RESULT:
  // Sidebar never shows cards from a previous page's anchor. User sees a clean
  // slate when entering a new page, with context relevant to the current location.
  // ============================================================================
  useAnchorRouteReset();

  // Public routes: skip onboarding and app chrome
  if (isPublicRoute) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // Show onboarding disclaimer if user hasn't accepted it yet
  if (!hasAcceptedGlobalDisclaimer) {
    return <OnboardingDisclaimerStep />;
  }

  // -------------------------------------------------------------------------
  // DAY 45: DESKTOP SHELL ROUTE (Electron)
  // -------------------------------------------------------------------------
  // The desktop shell has its own dedicated top bar and right panel. We skip
  // the standard AppShell chrome (sidebar, PathAdvisor panel, top bar) so the
  // Electron BrowserView can align with a clean, full-bleed layout.
  if (isDesktopShellRoute) {
    return (
      <div className="min-h-screen bg-background">
        <RouteTransition>{children}</RouteTransition>
      </div>
    );
  }

  // Shared /dashboard now renders its own SharedAppShell + rails.
  // Return page content directly here to avoid nested app shells.
  if (isSharedDashboardRoute) {
    return (
      <div className="min-h-screen bg-background">
        <RouteTransition>{children}</RouteTransition>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // PATH ADVISOR DOCK POSITION LOGIC
  // -------------------------------------------------------------------------
  // The user can choose where the PathAdvisor panel appears: left or right.
  // Previously 'bottom' was supported, but it has been deprecated.
  // We normalize any invalid or deprecated value to 'right' (default).
  const storedDock = profile.preferences.pathAdvisorDock;

  // Normalize dock position: only 'left' and 'right' are valid
  // If storedDock is 'bottom', undefined, or any other value, default to 'right'
  let dock: 'left' | 'right' = 'right';
  if (storedDock === 'left') {
    dock = 'left';
  }

  return (
    <div className="flex min-h-screen flex-col bg-background" data-app-root="true">
      {/* Day 36: Guided tour overlay mounted at AppShell root (outside RouteTransition) */}
      {/* This ensures the overlay is not affected by transform animations or nested scroll containers */}
      {/* Day 36: data-app-root attribute enables stable app root selection for tour interaction lock */}
      <GuidedTourOverlay />
      <PathOSTopBar>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden mr-2"
          onClick={function () {
            setMobileNavOpen(true);
          }}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </PathOSTopBar>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <PathOSSidebar
            onNavigate={function () {
              setMobileNavOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Render layout based on dock position (left or right only) */}
      {/* Day 35: Hide PathAdvisorPanel on dashboard page - dashboard has its own integrated experience */}
      {/* Day 38 Overlay v1: Hide PathAdvisorPanel when tailoring overlay is active - TailoringWorkspaceOverlay has GuidanceStrip and optional drawer */}
      {/* Day 42: Hide sidebar on Benefits Workspace route for immersive experience */}
      {/* Day40: Always render PathAdvisorPanel (even when visually hidden) so PathAdvisorFocusMode can mount during onboarding */}
      {dock === 'left' ? (
        <div className="flex flex-1 overflow-hidden">
          {!shouldHideSidebar && (
            <div className="hidden lg:block">
              <PathOSSidebar />
            </div>
          )}
          {/* Day40: Always render PathAdvisorPanel but hide visually when shouldHidePathAdvisor is true */}
          {/* This ensures PathAdvisorFocusMode (rendered inside) can mount even during onboarding */}
          <aside
            className={
              shouldHidePathAdvisor
                ? 'hidden'
                : 'hidden lg:block w-80 border-r border-border bg-background flex-shrink-0'
            }
          >
            <div className="sticky top-8 h-[calc(100vh-5rem)] px-2">
              <PathAdvisorPanel dock="left" />
            </div>
          </aside>
          <main className="flex-1 overflow-y-auto">
            <RouteTransition>{children}</RouteTransition>
          </main>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {!shouldHideSidebar && (
            <div className="hidden lg:block">
              <PathOSSidebar />
            </div>
          )}
          <main className="flex-1 overflow-y-auto">
            <RouteTransition>{children}</RouteTransition>
          </main>
          {/* Day40: Always render PathAdvisorPanel but hide visually when shouldHidePathAdvisor is true */}
          {/* This ensures PathAdvisorFocusMode (rendered inside) can mount even during onboarding */}
          <aside
            className={
              shouldHidePathAdvisor
                ? 'hidden'
                : 'hidden lg:block w-80 border-l border-border bg-background flex-shrink-0'
            }
          >
            <div className="sticky top-2 h-[calc(100vh-5rem)] px-4 pt-6 pb-4">
              <PathAdvisorPanel dock="right" />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
