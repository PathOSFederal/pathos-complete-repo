'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardScreen } from '@pathos/ui';
import { SharedDashboardRouteShell } from './_components/SharedDashboardRouteShell';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
const RESUME_BUILDER_ROUTE = '/dashboard/resume-builder';
const TRACKED_APPLICATIONS_ROUTE = '/import';
const GUIDED_APPLY_ROUTE = '/desktop/usajobs-guided';

/**
 * Weekly briefing (60–90s) modal: script preview (6–10 lines), Regenerate script,
 * Edit script, Generate video disabled with tooltip "Coming soon".
 * Styling consistent with existing app dialogs.
 */
function WeeklyBriefingExplainerModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const scriptLines = [
    'This week you have 3 saved jobs and 2 tracked applications.',
    'Your top priority: fix the resume gap for GS-0343 specialized experience.',
    'One application (Program Analyst - HHS) moved to Received.',
    'Resume completeness is at 50%; add quantified accomplishments next.',
    'Referral timelines are typically 2–6 weeks from submission.',
  ];

  function handleRegenerate() {
    // Stub: no-op for mockup parity pass.
  }

  function handleEdit() {
    // Stub: no-op for mockup parity pass.
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Weekly briefing (60–90s)</DialogTitle>
        </DialogHeader>
        <div className="min-h-[120px] rounded-md border border-border p-3 text-sm text-muted-foreground">
          <pre className="whitespace-pre-wrap font-sans text-left text-sm">
            {scriptLines.join('\n')}
          </pre>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={handleRegenerate}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Regenerate script
          </button>
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Edit script
          </button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-50 cursor-not-allowed"
                >
                  Generate video
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-semibold">Generate video</p>
                <p>Coming soon.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast().toast;
  const [explainerOpen, setExplainerOpen] = useState(false);

  function goToRouteOrComingSoon(route: string) {
    if (!route) {
      toast({ title: 'Coming soon' });
      return;
    }
    router.push(route);
  }

  return (
    <SharedDashboardRouteShell>
      <DashboardScreen
        onOpenWeeklyBriefing={function () {
          setExplainerOpen(true);
        }}
        onFixResumeGap={function () {
          goToRouteOrComingSoon(RESUME_BUILDER_ROUTE);
        }}
        onDecodeTrackedApp={function () {
          goToRouteOrComingSoon(TRACKED_APPLICATIONS_ROUTE);
        }}
        onReviewQuestionnaire={function () {
          goToRouteOrComingSoon(GUIDED_APPLY_ROUTE);
        }}
      />
      <WeeklyBriefingExplainerModal
        open={explainerOpen}
        onOpenChange={setExplainerOpen}
      />
    </SharedDashboardRouteShell>
  );
}
