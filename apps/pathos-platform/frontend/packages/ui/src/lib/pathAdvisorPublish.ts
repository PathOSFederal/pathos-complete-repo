/**
 * ============================================================================
 * PATH ADVISOR PUBLISH — Standardized helpers to append context log entries
 * ============================================================================
 *
 * PURPOSE: Screens and components call these helpers to append deterministic,
 * short entries to the PathAdvisor Context Log. Keeps lines/bullets short;
 * "local-only" is a line inside the entry (tag localOnly), not a rail pill.
 *
 * RULES: Short deterministic content; keep lines/bullets short.
 * BOUNDARY: No next/* or electron/*. Uses const/let only; no ?. or ?? or spread.
 */

import {
  usePathAdvisorContextLogStore,
  type PathAdvisorAnchor,
  type PathAdvisorContextEntry,
  type PathAdvisorContextSection,
  type PathAdvisorContextCta,
  type PathAdvisorContextTag,
} from '../stores/pathAdvisorContextLogStore';

// ---------------------------------------------------------------------------
// Id and timestamp (SSR-safe)
// ---------------------------------------------------------------------------

function nextEntryId(): string {
  if (typeof window !== 'undefined' && window.crypto !== undefined && window.crypto.randomUUID !== undefined) {
    return window.crypto.randomUUID();
  }
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return 'ctx-' + t + '-' + r;
}

function nowISO(): string {
  const now = typeof window !== 'undefined' ? new Date() : new Date(0);
  return now.toISOString();
}

function buildEntry(
  screen: string,
  anchor: PathAdvisorAnchor,
  payload: {
    title: string;
    subtitle?: string;
    sections: PathAdvisorContextSection[];
    ctas?: PathAdvisorContextCta[];
    tags?: PathAdvisorContextTag[];
  }
): PathAdvisorContextEntry {
  return {
    id: nextEntryId(),
    createdAtISO: nowISO(),
    screen,
    anchor,
    title: payload.title,
    subtitle: payload.subtitle,
    sections: payload.sections,
    ctas: payload.ctas,
    tags: payload.tags,
  };
}

// ---------------------------------------------------------------------------
// Publish helpers
// ---------------------------------------------------------------------------

/**
 * Append a screen-context entry (e.g. job match summary, selection explanation).
 * Use dedupeKey to avoid duplicate entries for the same logical action.
 */
export function publishScreenContext(params: {
  screen: string;
  anchor: PathAdvisorAnchor;
  title: string;
  subtitle?: string;
  sections: PathAdvisorContextSection[];
  ctas?: PathAdvisorContextCta[];
  tags?: PathAdvisorContextTag[];
  dedupeKey?: string;
}): void {
  const entry = buildEntry(params.screen, params.anchor, {
    title: params.title,
    subtitle: params.subtitle,
    sections: params.sections,
    ctas: params.ctas,
    tags: params.tags,
  });
  usePathAdvisorContextLogStore.getState().appendEntry(entry, {
    dedupeKey: params.dedupeKey,
    makeActive: true,
  });
}

/**
 * Append a "selection" context (e.g. selected job, selected resume).
 * Payload is a generic object; we normalize to sections/lines.
 */
export function publishSelectionContext(params: {
  screen: string;
  anchor: PathAdvisorAnchor;
  payload: { title: string; subtitle?: string; lines?: string[]; bullets?: string[] };
  dedupeKey?: string;
}): void {
  const sections: PathAdvisorContextSection[] = [];
  if (params.payload.lines !== undefined && params.payload.lines.length > 0) {
    sections.push({ lines: params.payload.lines });
  }
  if (params.payload.bullets !== undefined && params.payload.bullets.length > 0) {
    sections.push({ bullets: params.payload.bullets });
  }
  if (sections.length === 0) {
    sections.push({ lines: ['Selection context.'] });
  }
  publishScreenContext({
    screen: params.screen,
    anchor: params.anchor,
    title: params.payload.title,
    subtitle: params.payload.subtitle,
    sections,
    dedupeKey: params.dedupeKey,
  });
}

/**
 * Append a dimension-explanation entry (e.g. Match breakdown: Specialized Experience).
 * Used when user clicks a match breakdown row; payload has what this measures,
 * your signal, evidence found/missing, fastest fix.
 */
export function publishDimensionExplainContext(params: {
  screen: string;
  anchor: PathAdvisorAnchor;
  dimension: string;
  payload: {
    whatMeasures?: string[];
    yourSignal?: string;
    evidenceFound?: string[];
    evidenceMissing?: string[];
    fastestFix?: string;
    ctaLabel?: string;
    ctaRoute?: string;
  };
  dedupeKey?: string;
}): void {
  const sections: PathAdvisorContextSection[] = [];
  if (params.payload.whatMeasures !== undefined && params.payload.whatMeasures.length > 0) {
    sections.push({ title: 'What this measures', lines: params.payload.whatMeasures });
  }
  if (params.payload.yourSignal !== undefined && params.payload.yourSignal !== '') {
    sections.push({ title: 'Your current signal', lines: [params.payload.yourSignal] });
  }
  if (params.payload.evidenceFound !== undefined && params.payload.evidenceFound.length > 0) {
    sections.push({ title: 'Evidence found', bullets: params.payload.evidenceFound });
  }
  if (params.payload.evidenceMissing !== undefined && params.payload.evidenceMissing.length > 0) {
    sections.push({ title: 'Evidence missing', bullets: params.payload.evidenceMissing });
  }
  if (params.payload.fastestFix !== undefined && params.payload.fastestFix !== '') {
    sections.push({ title: 'Fastest fix', lines: [params.payload.fastestFix] });
  }
  const ctas: PathAdvisorContextCta[] = [];
  if (params.payload.ctaLabel !== undefined && params.payload.ctaLabel !== '') {
    ctas.push({
      label: params.payload.ctaLabel,
      action: params.payload.ctaRoute !== undefined && params.payload.ctaRoute !== '' ? 'nav' : 'noop',
      route: params.payload.ctaRoute,
    });
  }
  publishScreenContext({
    screen: params.screen,
    anchor: params.anchor,
    title: 'Match breakdown: ' + params.dimension,
    sections,
    ctas: ctas.length > 0 ? ctas : undefined,
    tags: ['localOnly' as PathAdvisorContextTag],
    dedupeKey: params.dedupeKey,
  });
}
