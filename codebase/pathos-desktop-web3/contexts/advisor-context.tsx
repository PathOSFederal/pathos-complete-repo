'use client';

import type React from 'react';
import { createContext, useContext, useState, useCallback } from 'react';

export type AdvisorContextData = {
  source: 'recommendations' | 'scenario' | 'job-details' | 'screen' | 'onboarding_pathadvisor' | 'onboarding_wizard';
  scenarioId?: string;
  scenarioName?: string;
  scenarioType?: string;
  baselineLabel?: string;
  netMonthlyDelta?: number;
  fiveYearDelta?: number;
  tenYearDelta?: number;
  keyHighlights?: string[];
  isComparison?: boolean;
  comparedScenarios?: string[];
  jobTitle?: string;
  jobSeries?: string;
  jobGrade?: string;
  jobAgency?: string;
  jobLocation?: string;
};

type AdvisorContextType = {
  context: AdvisorContextData;
  setContext: (context: AdvisorContextData) => void;
  pendingPrompt: string | null;
  setPendingPrompt: (prompt: string | null) => void;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  shouldOpenFocusMode: boolean;
  setShouldOpenFocusMode: (open: boolean) => void;
  sendJobPrompt: (job: {
    title: string;
    series: string;
    grade: string;
    agency: string;
    location: string;
    matchPercent?: number;
  }) => void;
  screenName: string;
  screenPurpose: string;
  setScreenInfo: (name: string, purpose: string) => void;
  // Day40: Focus restore callback for when PathAdvisor closes
  onPathAdvisorClose: (() => void) | null;
  setOnPathAdvisorClose: (callback: (() => void) | null) => void;
};

const AdvisorContext = createContext<AdvisorContextType | undefined>(undefined);

export function AdvisorContextProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<AdvisorContextData>({
    source: 'recommendations',
  });
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [shouldOpenFocusMode, setShouldOpenFocusMode] = useState(false);
  const [screenName, setScreenName] = useState('Dashboard');
  const [screenPurpose, setScreenPurpose] = useState(
    'View your federal career overview and key metrics.',
  );
  // Day40: Focus restore callback for when PathAdvisor closes
  const [onPathAdvisorClose, setOnPathAdvisorClose] = useState<(() => void) | null>(null);

  const sendJobPrompt = useCallback(
    (job: {
      title: string;
      series: string;
      grade: string;
      agency: string;
      location: string;
      matchPercent?: number;
    }) => {
      const prompt = `I'm considering this position: ${job.title}, ${job.series} ${job.grade}, ${job.agency}, ${job.location}. Based on my profile and your match analysis${job.matchPercent ? ` (${job.matchPercent}% match)` : ''}, what are your top tips for my application? What should I emphasize in my resume and KSAs, and are there any risks or gaps I should address?`;

      setContext({
        source: 'job-details',
        jobTitle: job.title,
        jobSeries: job.series,
        jobGrade: job.grade,
        jobAgency: job.agency,
        jobLocation: job.location,
      });
      setPendingPrompt(prompt);
      setIsPanelOpen(true);
    },
    [],
  );

  const setScreenInfo = useCallback((name: string, purpose: string) => {
    setScreenName(name);
    setScreenPurpose(purpose);
  }, []);

  return (
    <AdvisorContext.Provider
      value={{
        context,
        setContext,
        pendingPrompt,
        setPendingPrompt,
        isPanelOpen,
        setIsPanelOpen,
        shouldOpenFocusMode,
        setShouldOpenFocusMode,
        sendJobPrompt,
        screenName,
        screenPurpose,
        setScreenInfo,
        onPathAdvisorClose,
        setOnPathAdvisorClose,
      }}
    >
      {children}
    </AdvisorContext.Provider>
  );
}

export function useAdvisorContext() {
  const context = useContext(AdvisorContext);
  if (!context) {
    throw new Error('useAdvisorContext must be used within AdvisorContextProvider');
  }
  return context;
}
