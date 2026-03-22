/**
 * ============================================================================
 * DECISION BRIEFS V1 STORE — Local-only persisted decision briefs per job
 * ============================================================================
 *
 * PURPOSE: On Save (Save + Start Tailoring), create/update a DecisionBrief record
 * keyed by jobId. Persisted to pathos_decision_briefs_v1. Deterministic artifact;
 * no LLM. Used by details panel Decision Brief tab.
 *
 * BOUNDARY: No next/* or electron/*. Uses @pathos/core storage helpers.
 */

import { create } from 'zustand';
import { storageGetJSON, storageSetJSON } from '@pathos/core';
import type { FitAssessment } from '../lib/fitScoring';
import {
  buildFitAssessment,
  effortEstimate as calcEffort,
  strategicValue as calcStrategic,
  effortToReward as calcEffortToReward,
} from '../lib/fitScoring';
import type { Job } from '@pathos/core';
import type { JobWithOverview } from '../screens/jobSearchMockJobs';
import type { TargetRoleInput } from '../lib/fitScoring';
import { getChecklistForJob } from '../screens/jobSearchMockChecklists';

const DECISION_BRIEFS_V1_STORAGE_KEY = 'pathos_decision_briefs_v1';

export interface DecisionBriefRecord {
  jobId: string;
  createdAt: string;
  fitAssessment: FitAssessment;
  effortEstimate: string;
  strategicValue: string;
  effortToReward: string;
  keyFactsSummary: string[];
  risks: string[];
  nextActions: string[];
  /** 1–2 bullets for "Recommended resume emphasis" (deterministic). */
  resumeEmphasis: string[];
}

/** Map jobId -> DecisionBriefRecord. */
export interface DecisionBriefsState {
  briefs: Record<string, DecisionBriefRecord>;
}

export interface DecisionBriefsV1Actions {
  getBrief: (jobId: string) => DecisionBriefRecord | null;
  saveBrief: (record: DecisionBriefRecord) => void;
  loadFromStorage: () => void;
  persist: () => void;
  hasBrief: (jobId: string) => boolean;
}

function loadPersisted(): Record<string, DecisionBriefRecord> {
  const raw = storageGetJSON<Record<string, unknown>>(DECISION_BRIEFS_V1_STORAGE_KEY, {});
  if (raw === null || typeof raw !== 'object') return {};
  const briefs: Record<string, DecisionBriefRecord> = {};
  const keys = Object.keys(raw);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = raw[k];
    if (k === undefined || v === null || typeof v !== 'object') continue;
    const obj = v as Record<string, unknown>;
    if (
      typeof obj.jobId === 'string' &&
      typeof obj.createdAt === 'string' &&
      obj.fitAssessment !== null &&
      typeof obj.fitAssessment === 'object' &&
      typeof obj.effortEstimate === 'string' &&
      typeof obj.strategicValue === 'string' &&
      typeof obj.effortToReward === 'string' &&
      Array.isArray(obj.keyFactsSummary) &&
      Array.isArray(obj.risks) &&
      Array.isArray(obj.nextActions)
    ) {
      const fa = obj.fitAssessment as unknown;
      const resumeEmphasis = Array.isArray(obj.resumeEmphasis) ? (obj.resumeEmphasis as string[]) : [];
      briefs[k] = {
        jobId: obj.jobId as string,
        createdAt: obj.createdAt as string,
        fitAssessment: fa as FitAssessment,
        effortEstimate: obj.effortEstimate as string,
        strategicValue: obj.strategicValue as string,
        effortToReward: obj.effortToReward as string,
        keyFactsSummary: obj.keyFactsSummary as string[],
        risks: obj.risks as string[],
        nextActions: obj.nextActions as string[],
        resumeEmphasis,
      };
    }
  }
  return briefs;
}

/**
 * Build a DecisionBriefRecord from job, target role, and optional profile (deterministic).
 * Used when user clicks Save + Start Tailoring. Key facts and risks from job.overview when present.
 */
export function buildDecisionBriefRecord(
  jobId: string,
  job: Job | JobWithOverview,
  targetRole: TargetRoleInput,
  profile?: { skillsKeywords?: string[] }
): DecisionBriefRecord {
  const fit = buildFitAssessment({
    job,
    targetRole,
    profile,
    checklistCounts: (function () {
      const c = getChecklistForJob(jobId);
      if (c === null) return undefined;
      return {
        specialized: c.specializedExperience.length,
        skills: c.skillsKeywords.length,
        documents: c.documentsNeeded.length,
      };
    })(),
  });
  const effort = calcEffort(fit, (function () {
    const c = getChecklistForJob(jobId);
    if (c === null) return undefined;
    return {
      specialized: c.specializedExperience.length,
      skills: c.skillsKeywords.length,
      documents: c.documentsNeeded.length,
    };
  })());
  const strategic = calcStrategic(job, fit);
  const effortToRewardLevel = calcEffortToReward(job, effort, strategic);

  const keyFactsSummary: string[] = [];
  const ov = 'overview' in job && job.overview !== undefined ? job.overview : undefined;
  if (ov !== undefined) {
    if (job.grade !== undefined && job.grade !== '') keyFactsSummary.push('Grade: ' + job.grade);
    if (ov.payRange !== undefined && ov.payRange !== '') keyFactsSummary.push('Pay: ' + ov.payRange);
    if (ov.workSchedule !== undefined && ov.workSchedule !== '') keyFactsSummary.push('Schedule: ' + ov.workSchedule);
    if (ov.remoteJob !== undefined && ov.remoteJob !== '') keyFactsSummary.push('Remote: ' + ov.remoteJob);
    if (ov.promotionPotential !== undefined && ov.promotionPotential !== '') keyFactsSummary.push('Promotion: ' + ov.promotionPotential);
  }
  if (keyFactsSummary.length === 0) {
    if (job.grade) keyFactsSummary.push('Grade: ' + job.grade);
    keyFactsSummary.push('Location: ' + (job.location !== undefined ? job.location : '—'));
  }

  const risks: string[] = [];
  if (ov !== undefined) {
    if (ov.travelRequired !== undefined && ov.travelRequired !== '' && ov.travelRequired.toLowerCase() !== 'no') {
      risks.push('Travel: ' + ov.travelRequired);
    }
    if (ov.drugTest === 'Yes') risks.push('Drug test required');
    if (ov.securityClearance !== undefined && ov.securityClearance !== '' && ov.securityClearance.toLowerCase() !== 'none' && ov.securityClearance.toLowerCase() !== 'unknown') {
      risks.push('Clearance: ' + ov.securityClearance);
    }
    if (ov.financialDisclosure === 'Yes') risks.push('Financial disclosure');
  }

  const resumeEmphasis: string[] = [];
  if (fit.reasons.length > 0) resumeEmphasis.push('Emphasize ' + fit.reasons[0].toLowerCase());
  const checklistForEmphasis = getChecklistForJob(jobId);
  if (checklistForEmphasis !== null && checklistForEmphasis.skillsKeywords.length > 0) {
    const kw = checklistForEmphasis.skillsKeywords;
    const part: string[] = [];
    for (let i = 0; i < kw.length && i < 3; i++) {
      if (kw[i] !== undefined) part.push(kw[i]);
    }
    resumeEmphasis.push('Highlight: ' + part.join(', '));
  }
  if (resumeEmphasis.length === 0) resumeEmphasis.push('Align resume with job keywords and specialized experience.');

  const nextActions: string[] = [
    'Review specialized experience and tailor bullet points.',
    'Gather required documents (see Overview & Docs).',
    'Save job and open Tailoring Workspace when ready.',
  ];

  return {
    jobId,
    createdAt: new Date().toISOString(),
    fitAssessment: fit,
    effortEstimate: effort,
    strategicValue: strategic,
    effortToReward: effortToRewardLevel,
    keyFactsSummary,
    risks,
    nextActions,
    resumeEmphasis,
  };
}

export const useDecisionBriefsV1Store = create<
  DecisionBriefsState & DecisionBriefsV1Actions
>(function (set, get) {
  return {
    briefs: {},

    getBrief: function (jobId) {
      const b = get().briefs[jobId];
      return b !== undefined ? b : null;
    },

    hasBrief: function (jobId) {
      return get().briefs[jobId] !== undefined;
    },

    saveBrief: function (record) {
      const briefs = get().briefs;
      const next: Record<string, DecisionBriefRecord> = {};
      const ids = Object.keys(briefs);
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (id !== undefined) next[id] = briefs[id];
      }
      next[record.jobId] = record;
      set({ briefs: next });
      get().persist();
    },

    loadFromStorage: function () {
      set({ briefs: loadPersisted() });
    },

    persist: function () {
      storageSetJSON(DECISION_BRIEFS_V1_STORAGE_KEY, get().briefs);
    },
  };
});
