'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ActionFeedbackState } from '@/components/run-detail/action-feedback';

interface RunWorkspaceContextValue {
  /** Last action result for the Next Step card in the main workspace */
  lastActionFeedback: ActionFeedbackState | null;
  setLastActionFeedback: (f: ActionFeedbackState | null) => void;
  /** Task spec draft for Save Task Spec from dock (intake state) */
  taskSpecDraft: string;
  setTaskSpecDraft: (s: string) => void;
}

const RunWorkspaceContext = createContext<RunWorkspaceContextValue | null>(null);

export function useRunWorkspace(): RunWorkspaceContextValue | null {
  return useContext(RunWorkspaceContext);
}

export function RunWorkspaceProvider({
  children,
  initialTaskSpecDraft = '',
}: {
  children: ReactNode;
  initialTaskSpecDraft?: string;
}) {
  const [lastActionFeedback, setLastActionFeedback] = useState<ActionFeedbackState | null>(null);
  const [taskSpecDraft, setTaskSpecDraft] = useState(initialTaskSpecDraft);

  const value: RunWorkspaceContextValue = {
    lastActionFeedback,
    setLastActionFeedback,
    taskSpecDraft,
    setTaskSpecDraft,
  };

  return (
    <RunWorkspaceContext.Provider value={value}>
      {children}
    </RunWorkspaceContext.Provider>
  );
}
