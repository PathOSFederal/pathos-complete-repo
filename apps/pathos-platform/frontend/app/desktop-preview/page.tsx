/**
 * ============================================================================
 * DESKTOP PREVIEW PAGE
 * ============================================================================
 *
 * Renders the shared AppShell + screens from @pathos/ui inside the
 * PreviewNavigationProvider. This is the primary verification surface
 * for desktop parity in the v0 sandbox.
 *
 * Navigation is in-memory: clicking sidebar items updates the visible
 * screen without triggering Next.js route changes.
 *
 * PathAdvisor rail uses local-only reaction loop: onSend appends user message,
 * then schedules a simulated assistant reply so the rail reacts to input.
 */

'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { PreviewNavigationProvider, usePreviewPathname } from '@/lib/adapters/preview-nav-adapter';
import {
  SharedAppShell,
  DashboardScreen,
  CareerScreen,
  SettingsScreen,
  GuidedApplyScreen,
  JobSearchScreen,
  SavedJobsScreen,
  ResumeBuilderScreen,
  PathAdvisorRail,
  type PathAdvisorMessage,
} from '@pathos/ui';

/** Map ?screen= param to an in-memory pathname */
const SCREEN_MAP: Record<string, string> = {
  career: '/dashboard/career',
  settings: '/settings',
  'guided-apply': '/guided-apply',
  'job-search': '/dashboard/job-search',
  'saved-jobs': '/dashboard/saved-jobs',
  'resume': '/dashboard/resume-builder',
};

// ---------------------------------------------------------------------------
// Screen router -- maps in-memory pathname to shared screen component
// ---------------------------------------------------------------------------

function PreviewScreenRouter() {
  const pathname = usePreviewPathname();

  if (pathname === '/dashboard/career') {
    return <CareerScreen userName="Jordan Rivera" />;
  }
  if (pathname === '/settings') {
    return <SettingsScreen userName="Jordan Rivera" isEmployee={false} />;
  }
  if (pathname === '/guided-apply') {
    return <GuidedApplyScreen jobTitle="IT Specialist (INFOSEC)" controlNumber="825742100" />;
  }
  if (pathname === '/dashboard/job-search') {
    return <JobSearchScreen />;
  }
  if (pathname === '/dashboard/saved-jobs') {
    return <SavedJobsScreen />;
  }
  if (pathname === '/dashboard/resume-builder') {
    return <ResumeBuilderScreen />;
  }
  // Default: dashboard
  return <DashboardScreen isEmployee={false} userName="Jordan Rivera" />;
}

/** Simulated assistant reply for local-only reaction loop (no backend). */
const SIMULATED_REPLY =
  'Thanks for your question. This is a local-only preview—PathAdvisor will use your context when connected.';

// ---------------------------------------------------------------------------
// Preview shell -- wraps shared AppShell with sidebar/topbar config
// ---------------------------------------------------------------------------

function PreviewShell() {
  const [advisorMessages, setAdvisorMessages] = useState<PathAdvisorMessage[]>([]);

  const handleAdvisorSend = useCallback(function (text: string) {
    const userMessage: PathAdvisorMessage = { role: 'user', content: text };
    setAdvisorMessages(function (prev) {
      const next = [];
      for (let i = 0; i < prev.length; i++) {
        next.push(prev[i]);
      }
      next.push(userMessage);
      return next;
    });
    setTimeout(function () {
      const assistantMessage: PathAdvisorMessage = {
        role: 'assistant',
        content: SIMULATED_REPLY,
      };
      setAdvisorMessages(function (prev) {
        const next = [];
        for (let i = 0; i < prev.length; i++) {
          next.push(prev[i]);
        }
        next.push(assistantMessage);
        return next;
      });
    }, 600);
  }, []);

  return (
    <SharedAppShell
      platform="desktop-preview"
      sidebar={{
        isEmployee: false,
        userName: 'Jordan Rivera',
        userSubtitle: 'Federal Applicant',
        alertBadgeCount: 3,
      }}
      topBar={{
        personaLabel: 'Job Seeker',
        isSensitiveHidden: false,
      }}
      rightRail={
        <PathAdvisorRail
          dock="right"
          messages={advisorMessages}
          onSend={handleAdvisorSend}
        />
      }
      advisorDock="right"
    >
      <PreviewScreenRouter />
    </SharedAppShell>
  );
}

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

export default function DesktopPreviewPage() {
  const searchParams = useSearchParams();
  const screenParam = searchParams.get('screen') ?? '';
  const initialPath = SCREEN_MAP[screenParam] ?? '/dashboard';

  return (
    <PreviewNavigationProvider initialPath={initialPath}>
      <PreviewShell />
    </PreviewNavigationProvider>
  );
}
