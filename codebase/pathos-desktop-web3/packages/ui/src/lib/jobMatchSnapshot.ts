/**
 * ============================================================================
 * JOB MATCH SNAPSHOT V1 — Deterministic mapping: Career Readiness ↔ selected job
 * ============================================================================
 *
 * PURPOSE: Local-only snapshot that maps person intelligence (readiness dimensions,
 * gaps, action plan) to job intelligence (demand profile) and produces a visible
 * Match Breakdown for the Job Search "PathOS Snapshot" panel.
 *
 * RULES: Deterministic heuristics only; no backend; audit.rulesFired for explainability.
 * BOUNDARY: No next/* or electron/*. Uses @pathos/core Job and UI readiness types.
 */

import type { Job } from '@pathos/core';
import type { JobWithOverview } from '../screens/jobSearchMockJobs';
import { getChecklistForJob } from '../screens/jobSearchMockChecklists';

// ---------------------------------------------------------------------------
// Types: Match level, demand profile, dimension, snapshot
// ---------------------------------------------------------------------------

/** Overall match band for this job (Strong / Moderate / Stretch). */
export type MatchLevel = 'Strong' | 'Moderate' | 'Stretch';

/** Dimension key set: exactly 5, consistent order (Target Alignment, Specialized Experience, Resume Evidence, Keywords Coverage, Leadership & Scope). */
export const DIMENSION_KEYS = [
  'Target Alignment',
  'Specialized Experience',
  'Resume Evidence',
  'Keywords Coverage',
  'Leadership & Scope',
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];

/** Weights for the 5 dimensions (each 0–1, sum = 1). */
export interface JobDemandWeights {
  targetAlignment: number;
  specializedExperience: number;
  resumeEvidence: number;
  keywordsCoverage: number;
  leadershipScope: number;
}

/** Demand profile for a job: weights + flags (evidenceHeavy, keywordHeavy, leadershipHeavy). */
export interface JobDemandProfile {
  weights: JobDemandWeights;
  flags: {
    evidenceHeavy: boolean;
    leadershipHeavy: boolean;
    keywordHeavy: boolean;
  };
}

/** Single dimension in the match breakdown: readiness score, demand weight, match score, status, why. */
export interface JobMatchDimension {
  key: DimensionKey;
  label: string;
  readinessScore: number;
  demandWeight: number;
  matchScore: number;
  status: 'Good' | 'Mixed' | 'Weak';
  why: string;
}

/** Top job-relevant gap from readiness (label + impact points). */
export interface TopJobRelevantGap {
  label: string;
  impactPoints: number;
}

/** Missing evidence item (label + optional impact; optional dimension for filtering). */
export interface MissingEvidenceItem {
  label: string;
  impactPoints?: number;
  /** When set, this item is tied to a specific match dimension for dimension briefings. */
  dimensionKey?: DimensionKey;
}

/** Full job match snapshot (local-only; audit.rulesFired for explainability). */
export interface JobMatchSnapshot {
  matchLevel: MatchLevel;
  overallMatchScore: number;
  /** Person overall readiness score (e.g. 74) for summary line. */
  overallReadinessScore: number;
  /** Person overall readiness max (e.g. 100). */
  overallReadinessMax: number;
  primaryBlocker: string;
  topJobRelevantGap: TopJobRelevantGap;
  missingEvidence: MissingEvidenceItem[];
  dimensions: JobMatchDimension[];
  audit: { rulesFired: string[]; localOnly: true };
}

// ---------------------------------------------------------------------------
// Readiness input shape (from Career Readiness mock/summary)
// ---------------------------------------------------------------------------

/** Readiness input: overall score/max + label, 5 dimension scores, top gaps, action plan. */
export interface ReadinessInput {
  overallScore: number;
  overallMax: number;
  label: string;
  /** Dimension scores 0–100 in order: Target Alignment, Specialized Exp, Resume Evidence, Keywords Coverage, Leadership & Scope. */
  dimensionScores: Record<DimensionKey, number>;
  /** Top gaps: name -> impact (we expose as label + impactPoints). */
  topGaps: Array<{ name: string; impact: number }>;
  /** Action plan: label + impact. */
  actionPlan: Array<{ label: string; impact: number }>;
}

/** Job input: minimal shape needed for demand profile (id for checklist; title/summary for text). */
export interface JobInputForSnapshot {
  id: string;
  title?: string;
  summary?: string;
  grade?: string;
}

// ---------------------------------------------------------------------------
// Demo match variety (mock jobs only): deterministic target scores for list variety
// ---------------------------------------------------------------------------

/** True if job id is a mock job (mock-js-<n>). Used to apply demo-only score override. */
export function isMockJob(job: { id: string }): boolean {
  return job.id !== undefined && typeof job.id === 'string' && job.id.indexOf('mock-js-') === 0;
}

/**
 * Deterministic target match score for mock job by index. Cycle covers Strong/Moderate/Stretch.
 * Used only for demo variety; audit-tagged so it is explainable and removable later.
 */
export function getDemoTargetMatchScore(jobId: string): number {
  const cycle = [86, 78, 70, 62, 54, 46];
  const s = jobId.replace('mock-js-', '');
  const n = parseInt(s, 10);
  if (Number.isNaN(n) || n < 1) return 70;
  return cycle[(n - 1) % cycle.length];
}

/** Radar spoke name as in Career Readiness mock (e.g. "Specialized Exp"). */
const RADAR_NAME_TO_DIMENSION: Record<string, DimensionKey> = {
  'Target Alignment': 'Target Alignment',
  'Specialized Exp': 'Specialized Experience',
  'Specialized Experience': 'Specialized Experience',
  'Resume Evidence': 'Resume Evidence',
  'Keywords Coverage': 'Keywords Coverage',
  'Leadership & Scope': 'Leadership & Scope',
};

/**
 * Build ReadinessInput from Career Readiness mock (radarSpokes, gaps, actionPlanItems).
 * Maps radar spoke names (e.g. "Specialized Exp") to DimensionKey.
 */
export function buildReadinessInputFromMock(mock: {
  score: number;
  scoreMax: number;
  badgeLabel: string;
  radarSpokes: Array<{ name: string; value: number }>;
  gaps: Array<{ name: string; impact: number }>;
  actionPlanItems: Array<{ label: string; impact: number }>;
}): ReadinessInput {
  const dimensionScores: Record<DimensionKey, number> = {
    'Target Alignment': 50,
    'Specialized Experience': 50,
    'Resume Evidence': 50,
    'Keywords Coverage': 50,
    'Leadership & Scope': 50,
  };
  for (let i = 0; i < mock.radarSpokes.length; i++) {
    const spoke = mock.radarSpokes[i];
    if (spoke === undefined) continue;
    const key = RADAR_NAME_TO_DIMENSION[spoke.name];
    if (key !== undefined) dimensionScores[key] = spoke.value;
  }
  const topGaps: Array<{ name: string; impact: number }> = [];
  for (let i = 0; i < mock.gaps.length; i++) {
    const g = mock.gaps[i];
    if (g !== undefined) topGaps.push({ name: g.name, impact: g.impact });
  }
  const actionPlan: Array<{ label: string; impact: number }> = [];
  for (let i = 0; i < mock.actionPlanItems.length; i++) {
    const a = mock.actionPlanItems[i];
    if (a !== undefined) actionPlan.push({ label: a.label, impact: a.impact });
  }
  return {
    overallScore: mock.score,
    overallMax: mock.scoreMax,
    label: mock.badgeLabel,
    dimensionScores,
    topGaps,
    actionPlan,
  };
}

// ---------------------------------------------------------------------------
// Helpers: job text length, checklist counts, leadership cue words
// ---------------------------------------------------------------------------

const LEADERSHIP_CUE_WORDS = [
  'lead',
  'manage',
  'supervise',
  'stakeholder',
  'program',
  'portfolio',
  'enterprise',
  'strategy',
  'budget',
  'governance',
];

function jobTextForCues(job: JobInputForSnapshot): string {
  const title = job.title !== undefined ? job.title : '';
  const summary = job.summary !== undefined ? job.summary : '';
  return (title + ' ' + summary).toLowerCase();
}

function hasLeadershipCue(job: JobInputForSnapshot): boolean {
  const text = jobTextForCues(job);
  for (let i = 0; i < LEADERSHIP_CUE_WORDS.length; i++) {
    const word = LEADERSHIP_CUE_WORDS[i];
    if (word !== undefined && text.indexOf(word) !== -1) return true;
  }
  return false;
}

function clamp(x: number, lo: number, hi: number): number {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

/** Renormalize weights so they sum to 1 and each is in [0.10, 0.35]. */
function renormalizeWeights(w: JobDemandWeights): JobDemandWeights {
  let t =
    w.targetAlignment +
    w.specializedExperience +
    w.resumeEvidence +
    w.keywordsCoverage +
    w.leadershipScope;
  if (t <= 0) t = 1;
  const out: JobDemandWeights = {
    targetAlignment: clamp(w.targetAlignment / t, 0.1, 0.35),
    specializedExperience: clamp(w.specializedExperience / t, 0.1, 0.35),
    resumeEvidence: clamp(w.resumeEvidence / t, 0.1, 0.35),
    keywordsCoverage: clamp(w.keywordsCoverage / t, 0.1, 0.35),
    leadershipScope: clamp(w.leadershipScope / t, 0.1, 0.35),
  };
  const sum =
    out.targetAlignment +
    out.specializedExperience +
    out.resumeEvidence +
    out.keywordsCoverage +
    out.leadershipScope;
  if (sum <= 0) return out;
  return {
    targetAlignment: out.targetAlignment / sum,
    specializedExperience: out.specializedExperience / sum,
    resumeEvidence: out.resumeEvidence / sum,
    keywordsCoverage: out.keywordsCoverage / sum,
    leadershipScope: out.leadershipScope / sum,
  };
}

// ---------------------------------------------------------------------------
// buildJobDemandProfile
// ---------------------------------------------------------------------------

/**
 * Build demand profile from job signals (checklist counts, summary length, keywords count, leadership cues).
 * Baseline: equal weights 0.20 each. Then adjust for evidenceHeavy, keywordHeavy, leadershipHeavy.
 * Weights clamped to [0.10, 0.35] and renormalized to sum = 1.
 */
export function buildJobDemandProfile(job: Job | JobWithOverview | JobInputForSnapshot): JobDemandProfile {
  const rulesFired: string[] = [];
  let targetAlignment = 0.2;
  let specializedExperience = 0.2;
  let resumeEvidence = 0.2;
  let keywordsCoverage = 0.2;
  let leadershipScope = 0.2;

  const checklist = getChecklistForJob(job.id);
  const specializedCount = checklist !== null ? checklist.specializedExperience.length : 0;
  const skillsCount = checklist !== null ? checklist.skillsKeywords.length : 0;
  const summaryLength = job.summary !== undefined ? job.summary.length : 0;
  const specializedTextLength = (function (): number {
    if (checklist === null) return 0;
    let len = 0;
    for (let i = 0; i < checklist.specializedExperience.length; i++) {
      const s = checklist.specializedExperience[i];
      if (s !== undefined) len += s.length;
    }
    return len;
  })();

  const evidenceHeavy =
    specializedTextLength > 400 || specializedCount >= 6 || summaryLength > 220;
  if (evidenceHeavy) {
    rulesFired.push('evidenceHeavy');
    specializedExperience += 0.1;
    resumeEvidence += 0.1;
    targetAlignment -= 0.05;
    leadershipScope -= 0.05;
  }

  const keywordHeavy = skillsCount >= 10;
  if (keywordHeavy) {
    rulesFired.push('keywordHeavy');
    keywordsCoverage += 0.1;
    targetAlignment -= 0.025;
    specializedExperience -= 0.025;
    resumeEvidence -= 0.025;
    leadershipScope -= 0.025;
  }

  const leadershipHeavy = hasLeadershipCue(job);
  if (leadershipHeavy) {
    rulesFired.push('leadershipHeavy');
    leadershipScope += 0.1;
    targetAlignment -= 0.025;
    specializedExperience -= 0.025;
    resumeEvidence -= 0.025;
    keywordsCoverage -= 0.025;
  }

  const rawWeights: JobDemandWeights = {
    targetAlignment,
    specializedExperience,
    resumeEvidence,
    keywordsCoverage,
    leadershipScope,
  };
  const weights = renormalizeWeights(rawWeights);

  return {
    weights,
    flags: {
      evidenceHeavy,
      leadershipHeavy: leadershipHeavy,
      keywordHeavy: keywordHeavy,
    },
  };
}

// ---------------------------------------------------------------------------
// buildJobMatchSnapshot
// ---------------------------------------------------------------------------

function getReadinessScoreForKey(
  readiness: ReadinessInput,
  key: DimensionKey
): number {
  const v = readiness.dimensionScores[key];
  return v !== undefined ? v : 50;
}

function demandPenalty(
  profile: JobDemandProfile,
  key: DimensionKey
): number {
  if (profile.flags.evidenceHeavy && (key === 'Resume Evidence' || key === 'Specialized Experience')) {
    return 6;
  }
  if (profile.flags.keywordHeavy && key === 'Keywords Coverage') {
    return 6;
  }
  if (profile.flags.leadershipHeavy && key === 'Leadership & Scope') {
    return 6;
  }
  return 0;
}

function statusFromMatchScore(matchScore: number): 'Good' | 'Mixed' | 'Weak' {
  if (matchScore >= 75) return 'Good';
  if (matchScore >= 55) return 'Mixed';
  return 'Weak';
}

function whySentence(key: DimensionKey, status: string, matchScore: number): string {
  if (status === 'Good') {
    return 'Meets or exceeds this job\'s emphasis for this dimension.';
  }
  if (status === 'Mixed') {
    return 'Moderate alignment; improving this could strengthen your fit.';
  }
  return 'Below job emphasis; consider adding evidence or targeting.';
}

/**
 * Build full JobMatchSnapshot from readiness and job. Deterministic; records rulesFired in audit.
 */
export function buildJobMatchSnapshot(
  readiness: ReadinessInput,
  job: Job | JobWithOverview | JobInputForSnapshot
): JobMatchSnapshot {
  const auditRules: string[] = [];
  const profile = buildJobDemandProfile(job);
  if (profile.flags.evidenceHeavy) auditRules.push('evidenceHeavy');
  if (profile.flags.keywordHeavy) auditRules.push('keywordHeavy');
  if (profile.flags.leadershipHeavy) auditRules.push('leadershipHeavy');

  let dimensions: JobMatchDimension[] = [];
  const w = profile.weights;
  for (let i = 0; i < DIMENSION_KEYS.length; i++) {
    const key = DIMENSION_KEYS[i];
    if (key === undefined) continue;
    const readinessScore = getReadinessScoreForKey(readiness, key);
    const penalty = demandPenalty(profile, key);
    const matchScore = clamp(readinessScore - penalty, 0, 100);
    const status = statusFromMatchScore(matchScore);
    const demandWeight =
      key === 'Target Alignment'
        ? w.targetAlignment
        : key === 'Specialized Experience'
          ? w.specializedExperience
          : key === 'Resume Evidence'
            ? w.resumeEvidence
            : key === 'Keywords Coverage'
              ? w.keywordsCoverage
              : w.leadershipScope;
    if (status === 'Weak') auditRules.push('weakDimension:' + key);
    dimensions.push({
      key,
      label: key,
      readinessScore,
      demandWeight,
      matchScore,
      status,
      why: whySentence(key, status, matchScore),
    });
  }

  let overallMatchScore = 0;
  for (let i = 0; i < dimensions.length; i++) {
    const d = dimensions[i];
    if (d !== undefined) overallMatchScore += d.matchScore * d.demandWeight;
  }
  overallMatchScore = Math.round(clamp(overallMatchScore, 0, 100));

  let matchLevel: MatchLevel =
    overallMatchScore >= 75 ? 'Strong' : overallMatchScore >= 55 ? 'Moderate' : 'Stretch';

  let primaryBlocker: string;
  const noTarget =
    readiness.dimensionScores['Target Alignment'] !== undefined &&
    readiness.dimensionScores['Target Alignment'] < 50;
  if (noTarget) {
    primaryBlocker = 'Primary blocker: Missing readiness inputs. Review Career Readiness.';
    auditRules.push('missingReadinessInputs');
  } else {
    let weakDimension: JobMatchDimension | null = null;
    let maxWeight = 0;
    for (let i = 0; i < dimensions.length; i++) {
      const d = dimensions[i];
      if (d !== undefined && d.status === 'Weak' && d.demandWeight > maxWeight) {
        maxWeight = d.demandWeight;
        weakDimension = d;
      }
    }
    if (weakDimension !== null) {
      primaryBlocker =
        'Primary blocker: ' +
        weakDimension.label +
        ' is limiting competitiveness for this job.';
      auditRules.push('primaryBlocker:' + weakDimension.label);
    } else {
      primaryBlocker =
        'Primary blocker: None detected. Improve the top gap to increase odds.';
    }
  }

  /* MOCK-ONLY: Apply deterministic demo match variety so list shows Strong/Moderate/Stretch range. */
  if (isMockJob(job)) {
    const targetScore = getDemoTargetMatchScore(job.id);
    const delta = targetScore - overallMatchScore;
    const adjusted: JobMatchDimension[] = [];
    for (let i = 0; i < dimensions.length; i++) {
      const d = dimensions[i];
      if (d === undefined) continue;
      const newMatchScore = clamp(d.matchScore + delta, 0, 100);
      const newStatus = statusFromMatchScore(newMatchScore);
      adjusted.push({
        key: d.key,
        label: d.label,
        readinessScore: d.readinessScore,
        demandWeight: d.demandWeight,
        matchScore: newMatchScore,
        status: newStatus,
        why: whySentence(d.key, newStatus, newMatchScore),
      });
    }
    dimensions = adjusted;
    overallMatchScore = 0;
    for (let i = 0; i < dimensions.length; i++) {
      const d = dimensions[i];
      if (d !== undefined) overallMatchScore += d.matchScore * d.demandWeight;
    }
    overallMatchScore = Math.round(clamp(overallMatchScore, 0, 100));
    matchLevel =
      overallMatchScore >= 75 ? 'Strong' : overallMatchScore >= 55 ? 'Moderate' : 'Stretch';
    let weakDim: JobMatchDimension | null = null;
    let maxW = 0;
    for (let i = 0; i < dimensions.length; i++) {
      const d = dimensions[i];
      if (d !== undefined && d.status === 'Weak' && d.demandWeight > maxW) {
        maxW = d.demandWeight;
        weakDim = d;
      }
    }
    if (weakDim !== null) {
      primaryBlocker =
        'Primary blocker: ' +
        weakDim.label +
        ' is limiting competitiveness for this job.';
    } else {
      primaryBlocker =
        'Primary blocker: None detected. Improve the top gap to increase odds.';
    }
    auditRules.push('demoMatchVariety');
    auditRules.push('demoTargetScore:' + String(targetScore));
  }

  const missingEvidence: MissingEvidenceItem[] = [];
  for (let i = 0; i < dimensions.length; i++) {
    const d = dimensions[i];
    if (d === undefined) continue;
    const isWeakOrEvidenceMixed =
      d.status === 'Weak' ||
      (profile.flags.evidenceHeavy && d.key === 'Resume Evidence' && d.status === 'Mixed') ||
      (profile.flags.keywordHeavy && d.key === 'Keywords Coverage' && d.status === 'Mixed') ||
      (profile.flags.leadershipHeavy && d.key === 'Leadership & Scope' && d.status === 'Mixed');
    if (!isWeakOrEvidenceMixed) continue;
    if (d.key === 'Resume Evidence') {
      missingEvidence.push({
        label: 'Add 2–3 quantified outcomes that match the specialized experience language.',
        dimensionKey: d.key,
      });
    } else if (d.key === 'Specialized Experience') {
      missingEvidence.push({
        label: 'Mirror specialized experience phrasing in 2 bullets (what you did + outcome).',
        dimensionKey: d.key,
      });
    } else if (d.key === 'Keywords Coverage') {
      missingEvidence.push({
        label: 'Add 6–10 keywords from the announcement into bullets and skills.',
        dimensionKey: d.key,
      });
    } else if (d.key === 'Leadership & Scope') {
      missingEvidence.push({
        label: 'Add 1–2 leadership examples (scope, stakeholders, decisions).',
        dimensionKey: d.key,
      });
    } else if (d.key === 'Target Alignment') {
      missingEvidence.push({
        label: 'Set a target role so alignment signals are computed for this series and grade.',
        dimensionKey: d.key,
      });
    }
    if (missingEvidence.length >= 5) break;
  }
  const missingEvidenceCapped: MissingEvidenceItem[] = [];
  for (let i = 0; i < missingEvidence.length && i < 5; i++) {
    const m = missingEvidence[i];
    if (m !== undefined) missingEvidenceCapped.push(m);
  }

  let weakLabel: string | null = null;
  for (let i = 0; i < dimensions.length; i++) {
    const d = dimensions[i];
    if (d !== undefined && d.status === 'Weak') {
      weakLabel = d.label;
      break;
    }
  }
  let topJobRelevantGap: TopJobRelevantGap;
  if (weakLabel !== null && readiness.topGaps.length > 0) {
    let found = false;
    for (let g = 0; g < readiness.topGaps.length; g++) {
      const gap = readiness.topGaps[g];
      if (gap !== undefined && gap.name === weakLabel) {
        topJobRelevantGap = { label: gap.name, impactPoints: gap.impact };
        found = true;
        break;
      }
    }
    if (!found && readiness.topGaps[0] !== undefined) {
      const first = readiness.topGaps[0];
      topJobRelevantGap = { label: first.name, impactPoints: first.impact };
    } else if (!found && readiness.actionPlan.length > 0 && readiness.actionPlan[0] !== undefined) {
      const first = readiness.actionPlan[0];
      topJobRelevantGap = { label: first.label, impactPoints: first.impact };
    } else {
      topJobRelevantGap = { label: 'Improve readiness', impactPoints: 0 };
    }
  } else if (readiness.topGaps.length > 0 && readiness.topGaps[0] !== undefined) {
    const first = readiness.topGaps[0];
    topJobRelevantGap = { label: first.name, impactPoints: first.impact };
  } else if (readiness.actionPlan.length > 0 && readiness.actionPlan[0] !== undefined) {
    const first = readiness.actionPlan[0];
    topJobRelevantGap = { label: first.label, impactPoints: first.impact };
  } else {
    topJobRelevantGap = { label: 'Improve readiness', impactPoints: 0 };
  }

  return {
    matchLevel,
    overallMatchScore,
    overallReadinessScore: readiness.overallScore,
    overallReadinessMax: readiness.overallMax,
    primaryBlocker,
    topJobRelevantGap,
    missingEvidence: missingEvidenceCapped,
    dimensions,
    audit: { rulesFired: auditRules, localOnly: true },
  };
}

// ---------------------------------------------------------------------------
// Dimension briefing payload (PathAdvisor rail)
// ---------------------------------------------------------------------------

/** Payload for a dimension briefing: title, source, sections, optional CTA. Caller adds id when opening. */
export interface DimensionBriefingPayload {
  title: string;
  sourceLabel: string;
  sections: Array<{ heading: string; body: string }>;
  primaryCta?: { label: string; route: string };
}

/** Static one-line "what this measures" per dimension (deterministic, auditable). */
const DIMENSION_WHAT_MEASURES: Record<DimensionKey, string> = {
  'Target Alignment':
    'How well your target role (series, grade, location) aligns with this job\'s requirements.',
  'Specialized Experience':
    'Whether your experience matches the job\'s specialized experience statements.',
  'Resume Evidence':
    'Evidence on your resume that matches the job\'s specialized experience and requirements.',
  'Keywords Coverage':
    'How well your resume and profile cover the job\'s key terms and skills.',
  'Leadership & Scope':
    'Leadership, scope of responsibility, and stakeholder impact the job emphasizes.',
};

/** Job emphasis level from demand weight (High >= 0.25, Medium >= 0.18, else Low). */
function jobEmphasisLevel(demandWeight: number): string {
  if (demandWeight >= 0.25) return 'High';
  if (demandWeight >= 0.18) return 'Medium';
  return 'Low';
}

/**
 * Build deterministic dimension briefing payload for PathAdvisor rail.
 * Used when user clicks a Match Breakdown row; actionPlanRoute is the route for the primary CTA (e.g. Career Readiness #action-plan).
 */
export function buildDimensionBriefingPayload(
  dim: JobMatchDimension,
  snapshot: JobMatchSnapshot,
  actionPlanRoute: string
): DimensionBriefingPayload {
  const whatMeasures = DIMENSION_WHAT_MEASURES[dim.key];
  const signalMeaning =
    dim.status === 'Good'
      ? 'Strong alignment with this job\'s emphasis for this dimension.'
      : dim.status === 'Mixed'
        ? 'Moderate alignment; improving this could strengthen your fit.'
        : 'Below job emphasis; consider adding evidence or targeting.';

  const evidenceFoundBullets: string[] = [];
  evidenceFoundBullets.push('Your readiness score: ' + String(dim.readinessScore) + '/100 for this dimension.');
  evidenceFoundBullets.push('Job emphasis: ' + jobEmphasisLevel(dim.demandWeight) + ' (this job weights this dimension ' + (dim.demandWeight >= 0.25 ? 'heavily' : 'moderately') + ').');
  evidenceFoundBullets.push('Status: ' + dim.status + ' — ' + dim.why);

  const evidenceMissingBullets: string[] = [];
  for (let i = 0; i < snapshot.missingEvidence.length; i++) {
    const item = snapshot.missingEvidence[i];
    if (item === undefined) continue;
    if (item.dimensionKey !== undefined && item.dimensionKey === dim.key) {
      const line = item.impactPoints !== undefined ? item.label + ' (+' + String(item.impactPoints) + ')' : item.label;
      evidenceMissingBullets.push(line);
    }
  }
  if (evidenceMissingBullets.length === 0) {
    if (dim.status !== 'Good') {
      evidenceMissingBullets.push('Review the action plan in Career Readiness for this dimension.');
    }
  }

  const isTopGap = snapshot.topJobRelevantGap.label === dim.label;
  const impactForCta = isTopGap ? snapshot.topJobRelevantGap.impactPoints : (dim.status === 'Weak' ? 6 : 0);
  const fastestFixBody =
    isTopGap
      ? snapshot.topJobRelevantGap.label + (snapshot.topJobRelevantGap.impactPoints > 0 ? ' (+' + String(snapshot.topJobRelevantGap.impactPoints) + ')' : '')
      : dim.status === 'Weak'
        ? 'Improve ' + dim.label + ' (see Career Readiness action plan).'
        : 'Improve ' + dim.label + ' to strengthen your match.';

  const sections: Array<{ heading: string; body: string }> = [];
  sections.push({ heading: 'What this measures', body: whatMeasures });
  sections.push({
    heading: 'Your current signal',
    body: dim.status + ' — ' + signalMeaning,
  });
  sections.push({
    heading: 'Evidence found',
    body: evidenceFoundBullets.length > 0 ? evidenceFoundBullets.join(' ') : 'Your score and job emphasis are factored above.',
  });
  sections.push({
    heading: 'Evidence missing',
    body: evidenceMissingBullets.length > 0 ? evidenceMissingBullets.join(' ') : 'None identified for this dimension.',
  });
  sections.push({ heading: 'Fastest fix', body: fastestFixBody });

  let primaryCta: { label: string; route: string } | undefined;
  if (dim.key === 'Resume Evidence') {
    const label = impactForCta > 0 ? 'Fix Resume Evidence (+' + String(impactForCta) + ')' : 'Fix Resume Evidence';
    primaryCta = { label, route: actionPlanRoute };
  } else {
    const label = impactForCta > 0 ? 'Improve ' + dim.label + ' (+' + String(impactForCta) + ')' : 'Improve ' + dim.label;
    primaryCta = { label, route: actionPlanRoute };
  }

  return {
    title: 'Match breakdown: ' + dim.label,
    sourceLabel: 'Job Search',
    sections,
    primaryCta,
  };
}
