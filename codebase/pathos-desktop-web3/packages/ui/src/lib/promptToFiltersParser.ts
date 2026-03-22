/**
 * ============================================================================
 * PROMPT TO FILTERS PARSER — Deterministic extraction (no LLM)
 * ============================================================================
 *
 * Parses a free-text prompt into structured filters: GS levels, agencies,
 * remote type, series, location phrase, and remainder as keywords.
 * Used by Job Search "Translate to filters" flow.
 */

import type { JobSearchFilters } from '../stores/jobSearchV1Store';

/** Single piece of evidence (what we extracted and from where). */
export interface ParseEvidence {
  type: string;
  value: string;
  source: string;
}

export interface ParsedPromptResult {
  /** Proposed filters to apply. */
  filters: JobSearchFilters;
  /** Keywords extracted from remainder of prompt. */
  keywords: string;
  /** Evidence for audit/display. */
  evidence: ParseEvidence[];
}

/** Agency code to display name (small dictionary per spec). */
const AGENCY_ALIASES: Record<string, string> = {
  DHS: 'Department of Homeland Security',
  VA: 'Department of Veterans Affairs',
  IRS: 'Internal Revenue Service',
  DoD: 'Department of Defense',
  HHS: 'Department of Health and Human Services',
  SSA: 'Social Security Administration',
  OPM: 'Office of Personnel Management',
  USDA: 'Department of Agriculture',
  DOT: 'Department of Transportation',
  DOJ: 'Department of Justice',
  GSA: 'General Services Administration',
};

/** GS level regex: GS-5..15, GS12, GS-12. */
const GS_REGEX = /GS-?\s*(\d{1,2})\b/gi;

/** 4-digit series when preceded by "series" or space. */
const SERIES_REGEX = /\b(?:series\s+)?(\d{4})\b/i;

/** Location after "near" or "in" (simple phrase). */
const LOCATION_NEAR_REGEX = /\b(?:near|in)\s+([A-Za-z\s,]+?)(?:\s+open|\s+for|$|,)/i;
const LOCATION_IN_REGEX = /\bin\s+([A-Za-z\s,]+?)(?:\s+open|\s+for|$|,)/gi;

/**
 * Parse prompt text into proposed filters and keywords.
 * Deterministic; no LLM. Evidence array documents what was extracted.
 */
export function parsePromptToFilters(promptText: string): ParsedPromptResult {
  const evidence: ParseEvidence[] = [];
  const text = promptText.trim();
  let working = text;
  const filters: JobSearchFilters = {};

  // --- GS levels ---
  let match: RegExpExecArray | null = null;
  const gsLevels: string[] = [];
  GS_REGEX.lastIndex = 0;
  while ((match = GS_REGEX.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    if (num >= 5 && num <= 15) {
      const val = 'GS-' + num;
      if (gsLevels.indexOf(val) === -1) gsLevels.push(val);
      evidence.push({ type: 'grade', value: val, source: match[0] });
    }
  }
  if (gsLevels.length > 0) {
    filters.gradeBand = gsLevels[0];
    if (gsLevels.length > 1) {
      filters.gradeBand = gsLevels.join(', ');
    }
  }

  // --- Agencies (from dictionary) ---
  const agencyMatches: string[] = [];
  const upper = text.toUpperCase();
  const agencyKeys = Object.keys(AGENCY_ALIASES);
  for (let i = 0; i < agencyKeys.length; i++) {
    const key = agencyKeys[i];
    const idx = upper.indexOf(key);
    if (idx !== -1) {
      agencyMatches.push(AGENCY_ALIASES[key]);
      evidence.push({
        type: 'agency',
        value: AGENCY_ALIASES[key],
        source: text.substring(idx, idx + key.length),
      });
    }
  }
  if (agencyMatches.length > 0) {
    filters.agency = agencyMatches[0];
    if (agencyMatches.length > 1) {
      filters.agency = agencyMatches.join(' or ');
    }
  }

  // --- Remote / telework / hybrid ---
  if (/\bremote\b/i.test(text)) {
    filters.remoteType = 'Remote';
    evidence.push({ type: 'remoteType', value: 'Remote', source: 'remote' });
  }
  if (/\btelework\b/i.test(text)) {
    filters.remoteType = filters.remoteType ? filters.remoteType + ', Telework' : 'Telework';
    evidence.push({ type: 'remoteType', value: 'Telework', source: 'telework' });
  }
  if (/\bhybrid\b/i.test(text)) {
    filters.remoteType = filters.remoteType ? filters.remoteType + ', Hybrid' : 'Hybrid';
    evidence.push({ type: 'remoteType', value: 'Hybrid', source: 'hybrid' });
  }

  // --- Series (4-digit) ---
  const seriesMatch = text.match(SERIES_REGEX);
  if (seriesMatch !== null) {
    filters.series = seriesMatch[1];
    evidence.push({ type: 'series', value: seriesMatch[1], source: seriesMatch[0] });
  }

  // --- Location phrase (near X / in X) ---
  const nearMatch = text.match(LOCATION_NEAR_REGEX);
  if (nearMatch !== null) {
    const loc = nearMatch[1].trim();
    if (loc !== '') {
      filters.location = loc;
      evidence.push({ type: 'location', value: loc, source: nearMatch[0].trim() });
    }
  }
  if (filters.location === undefined) {
    const inMatch = text.match(/\bin\s+([A-Za-z\s,]+?)(?:\s+open|\s+for|$|,)/i);
    if (inMatch !== null) {
      const loc = inMatch[1].trim();
      if (loc !== '' && loc.length < 50) {
        filters.location = loc;
        evidence.push({ type: 'location', value: loc, source: inMatch[0].trim() });
      }
    }
  }

  // --- Keywords: remove extracted parts and collapse remainder ---
  working = text
    .replace(GS_REGEX, ' ')
    .replace(SERIES_REGEX, ' ')
    .replace(LOCATION_NEAR_REGEX, ' ')
    .replace(/\b(?:near|in)\s+[A-Za-z\s,]+/gi, ' ');
  for (let i = 0; i < agencyKeys.length; i++) {
    working = working.replace(new RegExp(agencyKeys[i], 'gi'), ' ');
  }
  working = working.replace(/\bremote\b/gi, ' ').replace(/\btelework\b/gi, ' ').replace(/\bhybrid\b/gi, ' ');
  const keywords = working.replace(/\s+/g, ' ').trim();
  if (keywords !== '') {
    evidence.push({ type: 'keywords', value: keywords, source: keywords });
  }

  return {
    filters,
    keywords,
    evidence,
  };
}
