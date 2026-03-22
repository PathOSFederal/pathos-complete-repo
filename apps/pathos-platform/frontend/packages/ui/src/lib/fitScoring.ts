/**
 * ============================================================================
 * FIT SCORING — Deterministic fit assessment for Career Intelligence layer
 * ============================================================================
 *
 * PURPOSE: Produce Strong/Moderate/Stretch badge, confidence, 2–3 reasons, and
 * inputsUsed/missingInputs. All scoring is deterministic and explainable (no black box).
 * Used by JobCard and Decision Brief.
 *
 * RULES (v1):
 * - Inputs: targetRole (series, gsTarget, location, remotePreference) + lightweight
 *   profile (skills keywords, optional current gs/series).
 * - Score components (weights): series match, grade alignment, location/remote alignment,
 *   keyword overlap (simple intersection count).
 * - Confidence band from missing inputs (e.g. no target role => Medium/Low).
 * - effortEstimate, strategicValue, effortToReward derived deterministically from
 *   checklist sizes, mismatch signals, promotionPotential, payRange.
 */

import type { Job } from '@pathos/core';
import type { JobWithOverview } from '../screens/jobSearchMockJobs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FitBadge = 'Strong' | 'Moderate' | 'Stretch';
export type FitConfidence = 'Low' | 'Medium' | 'High';
export type EffortLevel = 'Low' | 'Medium' | 'High';
export type StrategicLevel = 'Low' | 'Medium' | 'High';

/** Target role from store (user-set or defaults). */
export interface TargetRoleInput {
  series?: string;
  gsTarget?: string;
  location?: string;
  remotePreference?: string;
}

/** Lightweight profile for keyword/series/grade comparison. */
export interface FitProfileInput {
  /** Skills/keywords (e.g. from resume or user). */
  skillsKeywords?: string[];
  /** Current or target GS (optional). */
  currentGs?: string;
  /** Current or target series (optional). */
  currentSeries?: string;
}

export interface FitAssessment {
  score: number;
  badge: FitBadge;
  confidence: FitConfidence;
  reasons: string[];
  inputsUsed: string[];
  missingInputs?: string[];
}

/** Args for buildFitAssessment. Job may be Job or JobWithOverview. */
export interface BuildFitAssessmentArgs {
  job: Job | JobWithOverview;
  targetRole: TargetRoleInput;
  profile?: FitProfileInput;
  /** Checklist item counts for effort estimate (specialized + skills + docs). */
  checklistCounts?: { specialized: number; skills: number; documents: number };
}

// ---------------------------------------------------------------------------
// Helpers: parse GS number from string (e.g. "GS-12" -> 12)
// ---------------------------------------------------------------------------

/**
 * Parse numeric grade from "GS-N" or "N". Returns null if unparseable.
 * Used for deterministic grade alignment scoring.
 */
function parseGradeLevel(grade: string | undefined): number | null {
  if (grade === undefined || grade === null || grade === '') return null;
  const s = grade.trim();
  if (s.indexOf('GS-') === 0) {
    const n = parseInt(s.slice(3), 10);
    return isNaN(n) ? null : n;
  }
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

/**
 * Extract series code from job (summary text "Series 2210" or similar).
 * Returns first 4-digit sequence if present; otherwise null.
 */
function seriesFromJob(job: Job | JobWithOverview): string | null {
  if (job.summary) {
    const m = job.summary.match(/\bSeries\s+(\d{4})\b/);
    if (m && m[1]) return m[1];
  }
  return null;
}

/**
 * Count keyword overlap: how many profile keywords appear in job title + summary (case-insensitive).
 * Deterministic: simple substring presence per keyword.
 */
function countKeywordOverlap(
  job: Job | JobWithOverview,
  keywords: string[] | undefined
): number {
  if (keywords === undefined || keywords.length === 0) return 0;
  const title = (job.title !== undefined ? job.title : '').toLowerCase();
  const summary = (job.summary !== undefined ? job.summary : '').toLowerCase();
  const combined = title + ' ' + summary;
  let count = 0;
  for (let i = 0; i < keywords.length; i++) {
    const k = keywords[i];
    if (k !== undefined && k.trim() !== '' && combined.indexOf(k.trim().toLowerCase()) !== -1) {
      count = count + 1;
    }
  }
  return count;
}

/**
 * Determine if job is remote (location or summary contains "remote").
 */
function jobIsRemote(job: Job | JobWithOverview): boolean {
  const loc = (job.location !== undefined ? job.location : '').toLowerCase();
  const sum = (job.summary !== undefined ? job.summary : '').toLowerCase();
  return loc.indexOf('remote') !== -1 || sum.indexOf('remote') !== -1;
}

// ---------------------------------------------------------------------------
// buildFitAssessment: main deterministic fit scoring
// ---------------------------------------------------------------------------

/**
 * Build a deterministic FitAssessment for a job given target role and optional profile.
 * Score in 0–100; badge from score bands; confidence from missing inputs; reasons from components.
 */
export function buildFitAssessment(args: BuildFitAssessmentArgs): FitAssessment {
  const job = args.job;
  const target = args.targetRole;
  const profile = args.profile !== undefined ? args.profile : {};

  const inputsUsed: string[] = [];
  const missingInputs: string[] = [];
  if (target.series !== undefined && target.series !== '') {
    inputsUsed.push('target series');
  } else {
    missingInputs.push('target series');
  }
  if (target.gsTarget !== undefined && target.gsTarget !== '') {
    inputsUsed.push('target grade');
  } else {
    missingInputs.push('target grade');
  }
  if (target.location !== undefined && target.location !== '') {
    inputsUsed.push('location');
  } else {
    missingInputs.push('location');
  }
  if (target.remotePreference !== undefined && target.remotePreference !== '') {
    inputsUsed.push('remote preference');
  } else {
    missingInputs.push('remote preference');
  }
  if (profile.skillsKeywords !== undefined && profile.skillsKeywords.length > 0) {
    inputsUsed.push('skills keywords');
  } else {
    missingInputs.push('skills keywords');
  }

  // Component scores (0–1 each), then weighted sum -> 0–100
  let seriesScore = 0.5; // default neutral when no target series
  const jobSeries = seriesFromJob(job);
  const wantSeries = target.series !== undefined && target.series !== '' ? target.series.trim() : null;
  if (wantSeries !== null && jobSeries !== null) {
    seriesScore = jobSeries === wantSeries ? 1 : 0;
  } else if (wantSeries !== null) {
    seriesScore = 0; // want series but job has none
  }

  let gradeScore = 0.5;
  const jobGrade = parseGradeLevel(job.grade);
  const wantGrade = parseGradeLevel(target.gsTarget);
  if (wantGrade !== null && jobGrade !== null) {
    const diff = Math.abs(jobGrade - wantGrade);
    if (diff === 0) gradeScore = 1;
    else if (diff === 1) gradeScore = 0.7;
    else if (diff === 2) gradeScore = 0.4;
    else gradeScore = 0.1;
  }

  let locationScore = 0.5;
  const remote = jobIsRemote(job);
  const wantRemote =
    target.remotePreference !== undefined &&
    target.remotePreference !== '' &&
    target.remotePreference.toLowerCase().indexOf('remote') !== -1;
  if (wantRemote) {
    locationScore = remote ? 1 : 0.3;
  } else if (
    target.location !== undefined &&
    target.location !== '' &&
    job.location !== undefined
  ) {
    const locMatch =
      job.location.toLowerCase().indexOf(target.location.toLowerCase().trim()) !== -1;
    locationScore = locMatch ? 1 : 0.3;
  }

  const keywordCount = countKeywordOverlap(job, profile.skillsKeywords);
  const maxKeywords = profile.skillsKeywords !== undefined ? profile.skillsKeywords.length : 0;
  let keywordScore = 0.5;
  if (maxKeywords > 0) {
    keywordScore = Math.min(1, 0.3 + (keywordCount / maxKeywords) * 0.7);
  }

  // Weights: series 30%, grade 25%, location 25%, keyword 20%
  const raw =
    seriesScore * 30 + gradeScore * 25 + locationScore * 25 + keywordScore * 20;
  const score = Math.round(Math.min(100, Math.max(0, raw)));

  // Badge bands: Strong >= 70, Moderate 40–69, Stretch < 40
  let badge: FitBadge = 'Stretch';
  if (score >= 70) badge = 'Strong';
  else if (score >= 40) badge = 'Moderate';

  // Confidence: High if 4+ inputs, Medium if 2–3, Low if 0–1
  const usedCount = inputsUsed.length;
  let confidence: FitConfidence = 'Low';
  if (usedCount >= 4) confidence = 'High';
  else if (usedCount >= 2) confidence = 'Medium';

  // Reasons: top 2–3 contributing factors (plain English)
  const reasons: string[] = [];
  if (seriesScore === 1 && jobSeries !== null) {
    reasons.push('Series matches your target ('.concat(jobSeries, ')'));
  } else if (wantSeries !== null && jobSeries !== null && seriesScore === 0) {
    reasons.push('Different series than target (job: '.concat(jobSeries, ')'));
  }
  if (gradeScore >= 0.7 && jobGrade !== null) {
    reasons.push('Grade aligned with target ('.concat(job.grade !== undefined ? job.grade : String(jobGrade), ')'));
  } else if (gradeScore <= 0.4 && jobGrade !== null) {
    reasons.push('Grade gap vs target ('.concat(job.grade !== undefined ? job.grade : String(jobGrade), ')'));
  }
  if (locationScore === 1 && remote) {
    reasons.push('Remote role matches preference');
  } else if (locationScore === 1 && !remote) {
    reasons.push('Location matches your search area');
  } else if (locationScore < 0.5 && wantRemote) {
    reasons.push('Not remote; may not match preference');
  }
  if (keywordCount > 0 && maxKeywords > 0) {
    reasons.push(
      keywordCount +
        ' of your keywords match ('.concat(
          String(keywordCount),
          '/',
          String(maxKeywords),
          ')'
        )
    );
  }
  // Cap at 3 reasons
  const reasonsOut: string[] = [];
  for (let i = 0; i < reasons.length && i < 3; i++) {
    if (reasons[i] !== undefined) reasonsOut.push(reasons[i]);
  }
  if (reasonsOut.length === 0) {
    reasonsOut.push('Set target role and skills for personalized fit reasons');
  }

  return {
    score,
    badge,
    confidence,
    reasons: reasonsOut,
    inputsUsed,
    missingInputs: missingInputs.length > 0 ? missingInputs : undefined,
  };
}

// ---------------------------------------------------------------------------
// primaryBlocker: single best mismatch for Snapshot "Primary blocker" line
// ---------------------------------------------------------------------------

/**
 * Deterministic primary blocker from fit assessment and job/target.
 * Used by Job Details Snapshot panel. Priority: no target role > series mismatch >
 * grade gap > location/remote mismatch > none (no single blocker).
 */
export function primaryBlocker(
  job: Job | JobWithOverview,
  targetRole: TargetRoleInput,
  fitAssessment: FitAssessment
): string {
  const wantSeries = targetRole.series !== undefined && targetRole.series !== '' ? targetRole.series.trim() : null;
  const jobSeries = seriesFromJob(job);
  const jobGradeNum = parseGradeLevel(job.grade);
  const wantGradeNum = parseGradeLevel(targetRole.gsTarget);
  const jobGradeLabel = job.grade !== undefined && job.grade !== '' ? job.grade : (jobGradeNum !== null ? 'GS-' + jobGradeNum : null);
  const wantGradeLabel = targetRole.gsTarget !== undefined && targetRole.gsTarget !== '' ? targetRole.gsTarget : (wantGradeNum !== null ? 'GS-' + wantGradeNum : null);

  if (wantSeries === null && (targetRole.gsTarget === undefined || targetRole.gsTarget === '')) {
    return 'Set a Target Role to get alignment signals.';
  }
  if (wantSeries !== null && jobSeries !== null && jobSeries !== wantSeries) {
    return 'Target series mismatch (your target: ' + wantSeries + ', job: ' + jobSeries + ')';
  }
  if (wantGradeNum !== null && jobGradeNum !== null && jobGradeNum !== wantGradeNum) {
    const targetStr = wantGradeLabel !== null ? wantGradeLabel : 'target GS-' + wantGradeNum;
    const jobStr = jobGradeLabel !== null ? jobGradeLabel : 'job GS-' + jobGradeNum;
    return 'Grade gap (target ' + targetStr + ', job ' + jobStr + ')';
  }
  const remote = jobIsRemote(job);
  const wantRemote =
    targetRole.remotePreference !== undefined &&
    targetRole.remotePreference !== '' &&
    targetRole.remotePreference.toLowerCase().indexOf('remote') !== -1;
  if (wantRemote && !remote) {
    return 'Job is not remote; may not match your preference.';
  }
  if (
    targetRole.location !== undefined &&
    targetRole.location !== '' &&
    (job.location === undefined || job.location.toLowerCase().indexOf(targetRole.location.toLowerCase().trim()) === -1)
  ) {
    return 'Location may not match your search area.';
  }
  return '';
}

// ---------------------------------------------------------------------------
// fitScoreToStars: deterministic 0–100 → 1–5 stars (for display)
// ---------------------------------------------------------------------------

/**
 * Map fit score (0–100) to star count (1–5). Deterministic bands:
 * 80–100 → 5, 60–79 → 4, 40–59 → 3, 20–39 → 2, 0–19 → 1.
 * Used for inline "Fit: ★★★★☆" display; confidence shown separately.
 */
export function fitScoreToStars(score: number): number {
  const s = Math.min(100, Math.max(0, Math.round(score)));
  if (s >= 80) return 5;
  if (s >= 60) return 4;
  if (s >= 40) return 3;
  if (s >= 20) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// effortEstimate: Low/Medium/High from checklist sizes + mismatch signals
// ---------------------------------------------------------------------------

/**
 * Deterministic effort: more checklist items and more mismatches => higher effort.
 * Low: few items, good fit. High: many items or stretch fit.
 */
export function effortEstimate(
  fitAssessment: FitAssessment,
  checklistCounts?: { specialized: number; skills: number; documents: number }
): EffortLevel {
  const total =
    checklistCounts !== undefined
      ? checklistCounts.specialized + checklistCounts.skills + checklistCounts.documents
      : 0;
  const stretch = fitAssessment.badge === 'Stretch';
  const moderate = fitAssessment.badge === 'Moderate';
  if (stretch && total >= 10) return 'High';
  if (stretch || total >= 12) return 'High';
  if (moderate && total >= 8) return 'Medium';
  if (total >= 6) return 'Medium';
  return 'Low';
}

// ---------------------------------------------------------------------------
// strategicValue: Low/Medium/High from promotionPotential + series alignment
// ---------------------------------------------------------------------------

/**
 * Deterministic strategic value: promotion potential and series match.
 * Uses job overview if available (JobWithOverview), else fallback from summary.
 */
export function strategicValue(
  job: Job | JobWithOverview,
  fitAssessment: FitAssessment
): StrategicLevel {
  const ov = 'overview' in job && job.overview !== undefined ? job.overview : undefined;
  const promoS = ov !== undefined && ov.promotionPotential !== undefined ? ov.promotionPotential : '';
  const hasPromo =
    promoS !== '' &&
    promoS.toLowerCase() !== 'unknown' &&
    (/\d+/.test(promoS) || promoS.indexOf('GS') !== -1);
  const seriesMatch = fitAssessment.reasons.some(function (r) {
    return r.indexOf('Series matches') !== -1;
  });
  if (hasPromo && seriesMatch) return 'High';
  if (hasPromo || seriesMatch) return 'Medium';
  return 'Low';
}

// ---------------------------------------------------------------------------
// effortToReward: Low/Medium/High from pay/promotion vs effort
// ---------------------------------------------------------------------------

/**
 * Deterministic effort-to-reward: higher reward (pay, promotion) vs effort => better.
 * Mock-friendly: use payRange/promotionPotential when present.
 */
export function effortToReward(
  job: Job | JobWithOverview,
  effort: EffortLevel,
  strategic: StrategicLevel
): EffortLevel {
  const ov = 'overview' in job && job.overview !== undefined ? job.overview : undefined;
  const hasPay = ov !== undefined && ov.payRange !== undefined && ov.payRange !== '';
  const highStrategic = strategic === 'High';
  const lowEffort = effort === 'Low';
  if (highStrategic && lowEffort) return 'High';
  if (highStrategic || (hasPay && lowEffort)) return 'Medium';
  if (effort === 'High') return 'Low';
  return 'Medium';
}
