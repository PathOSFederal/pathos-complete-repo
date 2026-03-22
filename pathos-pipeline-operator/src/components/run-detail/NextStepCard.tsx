'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { ActionFeedbackState } from '@/components/run-detail/action-feedback';
import { cn } from '@/lib/utils';

interface NextStepCardProps {
  feedback: ActionFeedbackState | null;
}

/**
 * Shown in the main workspace after an action. Tells the user what just happened
 * and what the next step is (no generic toasts).
 */
export function NextStepCard({ feedback }: NextStepCardProps) {
  if (!feedback) return null;

  const isSuccess = feedback.tone === 'success';

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        isSuccess
          ? 'border-emerald-800/40 bg-emerald-900/10'
          : 'border-red-800/40 bg-red-900/10',
      )}
    >
      <div className="flex items-start gap-3">
        {isSuccess ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'text-sm font-semibold',
              isSuccess ? 'text-emerald-200' : 'text-red-200',
            )}
          >
            {feedback.title}
          </div>
          <div className="mt-1 text-sm text-slate-300">{feedback.detail}</div>
          {feedback.nextStep && (
            <div className="mt-2 text-sm text-slate-400">
              <span className="text-slate-500">Next step: </span>
              {feedback.nextStep}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
