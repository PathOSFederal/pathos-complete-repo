/**
 * Desktop application root.
 *
 * Uses React Router for routing and wraps the shared AppShell from
 * @pathos/ui with the reactRouterNavAdapter from @pathos/adapters.
 *
 * Route table matches the screens verified in /desktop-preview:
 *   /dashboard, /dashboard/career, /dashboard/job-search, /dashboard/saved-jobs,
 *   /dashboard/resume-builder, /desktop/usajobs-guided, /application-confidence-center, /settings
 *
 * PathAdvisor rail uses local-only reaction loop: onSend appends user message,
 * then schedules a simulated assistant reply so the rail reacts to input.
 */

import { useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { NavigationProvider } from '@pathos/adapters';
import {
  SharedAppShell,
  DashboardScreen,
  CareerReadinessScreen,
  CareerScreen,
  SettingsScreen,
  GuidedApplyScreen,
  JobSearchScreen,
  SavedJobsScreen,
  ResumeBuilderScreen,
  PlaceholderScreen,
  ApplicationConfidenceCenterScreen,
  PathAdvisorRail,
  type PathAdvisorMessage,
  type PathAdvisorAnchorContext,
  type ApplicationConfidenceAnchorContext,
} from '@pathos/ui';
import { useReactRouterNavAdapter } from './adapters/react-router-nav-adapter';
import { RouterNavLink } from './adapters/RouterNavLink';

/** Simulated assistant reply for local-only reaction loop (no backend). */
const SIMULATED_REPLY =
  'Thanks for your question. This is a local-only preview—PathAdvisor will use your context when connected.';

export function DesktopApp() {
  const adapter = useReactRouterNavAdapter();
  const [advisorMessages, setAdvisorMessages] = useState<PathAdvisorMessage[]>([]);
  const [pathAdvisorAnchorContext, setPathAdvisorAnchorContext] = useState<PathAdvisorAnchorContext | null>(null);

  const handleAnchorContextChange = useCallback(function (context: ApplicationConfidenceAnchorContext | null) {
    if (context === null) {
      setPathAdvisorAnchorContext(null);
      return;
    }
    setPathAdvisorAnchorContext({
      viewingLabel: context.title ? 'Application: ' + context.title : 'Application Confidence Center',
      applicationId: context.applicationId,
    });
  }, []);

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
    <NavigationProvider adapter={adapter} linkComponent={RouterNavLink}>
      <SharedAppShell
        platform="desktop"
        rightRail={
          <PathAdvisorRail
            messages={advisorMessages}
            onSend={handleAdvisorSend}
            anchorContext={pathAdvisorAnchorContext}
          />
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/dashboard/career-readiness" element={<CareerReadinessScreen />} />
          <Route path="/dashboard/resume-readiness" element={<CareerScreen />} />
          <Route path="/dashboard/career" element={<Navigate to="/dashboard/resume-readiness" replace />} />
          <Route path="/dashboard/compensation" element={<PlaceholderScreen />} />
          <Route path="/dashboard/benefits" element={<PlaceholderScreen />} />
          <Route path="/dashboard/retirement" element={<PlaceholderScreen />} />
          <Route path="/dashboard/job-search" element={<JobSearchScreen />} />
          <Route path="/dashboard/saved-jobs" element={<SavedJobsScreen />} />
          <Route path="/dashboard/resume-builder" element={<ResumeBuilderScreen />} />
          <Route path="/desktop/usajobs-guided" element={<GuidedApplyScreen />} />
          <Route path="/guided-apply" element={<Navigate to="/desktop/usajobs-guided" replace />} />
          <Route path="/explore/benefits" element={<PlaceholderScreen />} />
          <Route path="/alerts" element={<PlaceholderScreen />} />
          <Route path="/import" element={<PlaceholderScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route
            path="/application-confidence-center"
            element={
              <ApplicationConfidenceCenterScreen onAnchorContextChange={handleAnchorContextChange} />
            }
          />
        </Routes>
      </SharedAppShell>
    </NavigationProvider>
  );
}
