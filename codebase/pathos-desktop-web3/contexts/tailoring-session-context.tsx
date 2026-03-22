'use client';

import type React from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdvisorContext } from './advisor-context';
// Day 43: Import anchor system for setting resume anchor (right rail context)
import { usePathAdvisorStore } from '@/store/pathAdvisorStore';
import { buildAnchorId, normalizeSourceLabel, type PathAdvisorAnchor } from '@/lib/pathadvisor/anchors';

export type TargetJob = {
  id: string;
  jobId: string;
  title: string;
  series: string;
  grade: string;
  agency: string;
  location: string;
  isActiveTarget: boolean;
  matchPercent?: number;
  skillsMatch?: number;
  keywordMatch?: number;
  duties?: string[];
  ksas?: string[];
  moveType?: 'promotion' | 'lateral' | 'entry';
};

type TailoringSessionContextType = {
  activeTargetJob: TargetJob | null;
  savedTargetJobs: TargetJob[];
  isTailoringMode: boolean;
  startTailoredResumeSession: (
    job: {
      id: number;
      role: string;
      series: string;
      grade: string;
      agency: string;
      location: string;
      matchPercent?: number;
    },
    options?: {
      isEmployee?: boolean;
      currentGrade?: string;
      currentSeries?: string;
      currentAgency?: string;
    },
  ) => void;
  clearTailoringSession: () => void;
  getTargetJobById: (jobId: string) => TargetJob | undefined;
};

const TailoringSessionContext = createContext<TailoringSessionContextType | undefined>(undefined);

export function TailoringSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setContext, setPendingPrompt, setIsPanelOpen } = useAdvisorContext();
  const [activeTargetJob, setActiveTargetJob] = useState<TargetJob | null>(null);
  const [savedTargetJobs, setSavedTargetJobs] = useState<TargetJob[]>([]);

  const getTargetJobById = useCallback(
    (jobId: string) => {
      return savedTargetJobs.find((j) => j.jobId === jobId);
    },
    [savedTargetJobs],
  );

  const startTailoredResumeSession = useCallback(
    (
      job: {
        id: number;
        role: string;
        series: string;
        grade: string;
        agency: string;
        location: string;
        matchPercent?: number;
      },
      options?: {
        isEmployee?: boolean;
        currentGrade?: string;
        currentSeries?: string;
        currentAgency?: string;
      },
    ) => {
      // Check if a matching target role already exists
      const existingTarget = savedTargetJobs.find(
        (t) =>
          t.jobId === String(job.id) ||
          (t.series === job.series && t.grade === job.grade && t.agency === job.agency),
      );

      let moveType: 'promotion' | 'lateral' | 'entry' = 'entry';
      if (options?.isEmployee && options.currentGrade) {
        const currentGradeNum = Number.parseInt(options.currentGrade.replace(/\D/g, ''), 10);
        const targetGradeNum = Number.parseInt(job.grade.replace(/\D/g, ''), 10);
        if (targetGradeNum > currentGradeNum) {
          moveType = 'promotion';
        } else if (targetGradeNum === currentGradeNum) {
          moveType = 'lateral';
        }
      }

      let targetJob: TargetJob;

      if (existingTarget) {
        // Reuse existing target role, mark as active
        targetJob = { ...existingTarget, isActiveTarget: true, moveType };
        setSavedTargetJobs((prev) =>
          prev.map((t) =>
            t.id === existingTarget.id ? targetJob : { ...t, isActiveTarget: false },
          ),
        );
      } else {
        // Create a new target role
        targetJob = {
          id: `target-${Date.now()}`,
          jobId: String(job.id),
          title: job.role,
          series: job.series,
          grade: job.grade,
          agency: job.agency,
          location: job.location,
          isActiveTarget: true,
          matchPercent: job.matchPercent,
          skillsMatch: 85, // Mock data
          keywordMatch: 72, // Mock data
          moveType,
        };
        setSavedTargetJobs((prev) => [
          ...prev.map((t) => ({ ...t, isActiveTarget: false })),
          targetJob,
        ]);
      }

      setActiveTargetJob(targetJob);

      // Day 43: Set resume anchor for Focus Mode right rail context
      const resumeLabel = 'Resume for ' + job.role + (job.series ? ', ' + job.series : '') + (job.grade ? ' ' + job.grade : '');
      const anchorId = buildAnchorId('resume', targetJob.id);
      const normalizedLabel = normalizeSourceLabel(resumeLabel, 'resume');
      const anchor: PathAdvisorAnchor = {
        id: anchorId,
        source: 'resume',
        sourceId: targetJob.id,
        sourceLabel: normalizedLabel,
        summary: 'Tailoring resume for target position',
        createdAt: Date.now(),
      };
      usePathAdvisorStore.getState().setActiveAnchor(anchor);

      // Set advisor context for tailoring mode
      setContext({
        source: 'job-details',
        jobTitle: job.role,
        jobSeries: job.series,
        jobGrade: job.grade,
        jobAgency: job.agency,
        jobLocation: job.location,
      });

      let tailoringPrompt: string;
      if (options?.isEmployee && options.currentGrade && options.currentAgency) {
        const moveLabel =
          moveType === 'promotion'
            ? 'promotion'
            : moveType === 'lateral'
              ? 'lateral move'
              : 'position';
        tailoringPrompt = `I'm a current ${options.currentGrade}${options.currentSeries ? ` (${options.currentSeries})` : ''} at ${options.currentAgency}. I'm considering this ${job.role}, ${job.series} ${job.grade} position at ${job.agency}. Help me tailor my resume and highlight my specialized experience so I'm competitive for this ${moveLabel}.`;
      } else {
        tailoringPrompt = `I just selected this job: ${job.role}, ${job.series} ${job.grade}, ${job.agency}, ${job.location}. I'm a job seeker. Help me tailor my resume for this position. Which sections should I update first, and what should I emphasize based on the posting and my current profile?`;
      }

      setPendingPrompt(tailoringPrompt);
      setIsPanelOpen(true);

      // Navigate to Resume Builder with the target job context
      router.push(`/dashboard/resume-builder?targetJobId=${targetJob.id}`);
    },
    [savedTargetJobs, setContext, setPendingPrompt, setIsPanelOpen, router],
  );

  const clearTailoringSession = useCallback(() => {
    setActiveTargetJob(null);
    setSavedTargetJobs((prev) => prev.map((t) => ({ ...t, isActiveTarget: false })));
  }, []);

  const isTailoringMode = activeTargetJob !== null;

  return (
    <TailoringSessionContext.Provider
      value={{
        activeTargetJob,
        savedTargetJobs,
        isTailoringMode,
        startTailoredResumeSession,
        clearTailoringSession,
        getTargetJobById,
      }}
    >
      {children}
    </TailoringSessionContext.Provider>
  );
}

export function useTailoringSession() {
  const context = useContext(TailoringSessionContext);
  if (!context) {
    throw new Error('useTailoringSession must be used within TailoringSessionProvider');
  }
  return context;
}
