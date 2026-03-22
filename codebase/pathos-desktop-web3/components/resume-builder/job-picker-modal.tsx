/**
 * ============================================================================
 * JOB PICKER MODAL COMPONENT (Day 38 Continuation)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Modal dialog for selecting a job to tailor a resume for, directly from
 * Resume Builder. This eliminates the navigation learning curve by allowing
 * users to select a job without leaving the Resume Builder page.
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Used in Resume Builder page when user clicks "Tailor for a Job"
 * - Reuses jobSearchStore results if available
 * - Shows "Recent jobs" or allows simple local search
 * - On job selection, activates tailoring mode and opens tailoring overlay
 *
 * KEY FEATURES:
 * - Shows currently selected job as top option if available
 * - Lists recent jobs from jobSearchStore
 * - Simple search input for filtering locally
 * - Immediately activates tailoring and opens overlay on selection
 *
 * @version Day 38 Continuation - UX Improvements
 * ============================================================================
 */

'use client';

import { useResumeBuilderStore } from '@/store/resumeBuilderStore';
import { JobSearchWorkspaceDialog } from '@/components/dashboard/job-search-workspace-dialog';
import type { JobCardModel } from '@/lib/jobs/model';

interface JobPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobSelected: () => void; // Callback when job is selected (to open tailoring overlay)
}

/**
 * Job Picker Modal Component
 *
 * PURPOSE:
 * Allows user to select a job for tailoring without leaving Resume Builder.
 * Reuses the full Job Search Workspace UI in "picker mode" for consistency.
 */
export function JobPickerModal(props: JobPickerModalProps) {
  const open = props.open;
  const onOpenChange = props.onOpenChange;
  const onJobSelected = props.onJobSelected;

  // Get store actions
  const startTailoredResumeSession = useResumeBuilderStore(function (state) {
    return state.startTailoredResumeSession;
  });

  // Handle job confirmation from picker mode
  const handleConfirm = function (job: JobCardModel) {
    // Convert JobCardModel to TargetJob format
    startTailoredResumeSession(
      {
        id: Number.parseInt(job.id, 10) || 0,
        role: job.title || 'Untitled Position',
        series: job.seriesCode || '',
        grade: job.gradeLevel || '',
        agency: job.organizationName || '',
        location: job.locationDisplay || '',
        matchPercent: job.matchPercent,
      },
      undefined
    );

    // Notify parent to open tailoring overlay
    // The overlay will open automatically when isTailoringMode becomes true
    onJobSelected();
  };

  return (
    <JobSearchWorkspaceDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="resume-tailor-picker"
      onConfirm={handleConfirm}
    />
  );
}

