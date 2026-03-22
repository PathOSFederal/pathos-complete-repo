import type { TaskSpecAnalysis } from './types';

const TEMPLATE_PATTERNS = [
  /\[(?:paste|insert|fill|describe|objective|acceptance|steps?|expected|outcome|todo|tbd|placeholder)[^\]]*\]/i,
  /^(?:todo|tbd|placeholder|lorem ipsum)\b/i,
  /^your task\b/i,
  /^replace this\b/i,
];

function normalizeLines(content: string | null): string[] {
  return (content ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('<!--'));
}

export function summarizeTaskSpec(content: string | null): string | null {
  const lines = normalizeLines(content);
  const summaryLine = lines.find((line) => !line.startsWith('#') && !line.startsWith('-') && !line.startsWith('*'));
  if (summaryLine) return summaryLine;
  const bullet = lines.find((line) => line.startsWith('-') || line.startsWith('*'));
  return bullet ? bullet.replace(/^[-*]\s*/, '').trim() : null;
}

export function analyzeTaskSpecContent(content: string | null): TaskSpecAnalysis {
  return analyzeTaskSpecForRun(content);
}

export function analyzeTaskSpecForRun(
  content: string | null,
  args?: { updatedAt?: string | null; runStartedAt?: string | null }
): TaskSpecAnalysis {
  const lines = normalizeLines(content);
  const contentExists = typeof content === 'string';
  const nonHeadingLines = lines.filter((line) => !line.startsWith('#'));
  const contentLines = nonHeadingLines.filter((line) => !/^```/.test(line));
  const meaningfulLines = contentLines.filter(
    (line) => !TEMPLATE_PATTERNS.some((pattern) => pattern.test(line))
  );
  const templateSignals = contentLines.filter((line) =>
    TEMPLATE_PATTERNS.some((pattern) => pattern.test(line))
  );
  const hasBullets = meaningfulLines.some((line) => line.startsWith('-') || line.startsWith('*'));
  const hasParagraph = meaningfulLines.some((line) => line.length >= 40);
  const hasMeaningfulContent = meaningfulLines.length >= 2 && (hasBullets || hasParagraph);
  const updatedAt = args?.updatedAt ?? null;
  const runStartedAt = args?.runStartedAt ?? null;
  const confirmedForRun =
    !!updatedAt &&
    !!runStartedAt &&
    new Date(updatedAt).getTime() >= new Date(runStartedAt).getTime();
  const contentReady = contentExists && hasMeaningfulContent && templateSignals.length === 0;
  const isReady = contentReady && (!runStartedAt || confirmedForRun);

  return {
    exists: contentExists,
    isReady,
    hasMeaningfulContent,
    confirmedForRun: !runStartedAt ? contentReady : confirmedForRun,
    templateSignals,
    blockerReason: isReady
      ? null
      : !contentExists || lines.length === 0
      ? 'Build is unavailable until the task spec is entered and saved.'
      : runStartedAt && !confirmedForRun
      ? 'Build is unavailable until the task spec is explicitly saved for this run.'
      : !hasMeaningfulContent
      ? 'Build is unavailable until the task spec contains real task details, not just a title or empty shell.'
      : 'Build is unavailable until placeholder/template text is removed from the task spec.',
    summary: summarizeTaskSpec(content),
    updatedAt,
  };
}
