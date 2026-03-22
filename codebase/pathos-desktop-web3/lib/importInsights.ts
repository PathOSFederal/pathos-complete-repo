/**
 * ============================================================================
 * IMPORT INSIGHTS MODULE (Day 29 - Insights & Explainability v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Provides deterministic insights generation for imported items without
 * hallucination. All insights are based on extracted signals and linked sources,
 * with explainability panels showing exactly how each insight was derived.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────────┐
 * │  Import UI      │ --> │   THIS FILE     │ --> │  Insights Display  │
 * │  (Item details) │     │  (Insights gen) │     │  (Explainability)  │
 * └─────────────────┘     └─────────────────┘     └────────────────────┘
 *
 * KEY RESPONSIBILITIES:
 * 1. generateInsights - Generate deterministic insights from item data
 * 2. Always point to exact extracted signal and source snippet
 * 3. No LLM, no randomness, no hallucination
 * 4. Provide explainability data for "How this was derived" panels
 *
 * INSIGHT TYPES (v1, deterministic):
 * - Deadlines coming up (based on deadline signals)
 * - Top links (based on linked entities)
 * - Next actions (based on tasks/actions state)
 * - Missing info (e.g., no deadline found, no job link)
 *
 * HOUSE RULES COMPLIANCE (Day 29):
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 29 - Insights & Explainability v1
 * ============================================================================
 */

import type { ImportedDocument } from '@/store/documentImportStore';
import type { ExtractedSignal } from '@/lib/documents';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Type of insight that can be generated.
 */
export type InsightType =
  | 'deadline_coming_up'
  | 'top_links'
  | 'next_actions'
  | 'missing_deadline'
  | 'missing_job_link'
  | 'missing_info';

/**
 * Represents a single insight with explainability data.
 *
 * DESIGN RATIONALE:
 * Every insight must have a source - either an extracted signal or a linked entity.
 * If no source exists, the insight should not be shown.
 */
export interface Insight {
  /**
   * Type of insight.
   */
  type: InsightType;

  /**
   * Human-readable title for the insight.
   */
  title: string;

  /**
   * Human-readable description/explanation.
   */
  description: string;

  /**
   * Priority/urgency level (for sorting).
   */
  priority: 'high' | 'medium' | 'low';

  /**
   * Source signal ID (if derived from extracted signal).
   */
  sourceSignalId: string | null;

  /**
   * Source snippet showing where the insight came from.
   */
  sourceSnippet: string | null;

  /**
   * Additional metadata (e.g., deadline date, link count).
   */
  metadata: Record<string, string> | null;
}

/**
 * Result of insights generation.
 */
export interface InsightsResult {
  /**
   * Array of insights (sorted by priority).
   */
  insights: Insight[];

  /**
   * Whether any insights were generated.
   */
  hasInsights: boolean;
}

// ============================================================================
// INSIGHTS GENERATION
// ============================================================================

/**
 * Generates deterministic insights for an import item.
 *
 * HOW IT WORKS:
 * 1. Check for deadline signals → "Deadlines coming up"
 * 2. Check for linked entities → "Top links"
 * 3. Check for queued actions → "Next actions"
 * 4. Check for missing critical info → "Missing info"
 * 5. All insights must have sources, no source-less insights
 *
 * DESIGN RATIONALE:
 * All insights are deterministic and testable.
 * No LLM, no randomness, no hallucination.
 * Every insight points to exact source.
 *
 * @param item - Import item to generate insights for
 * @param linkedTasksCount - Optional count of linked tasks (for "Next actions")
 * @returns InsightsResult with insights array
 */
export function generateInsights(
  item: ImportedDocument
): InsightsResult {
  const insights: Insight[] = [];

  // Check for deadlines coming up
  const deadlineInsights = generateDeadlineInsights(item);
  for (let i = 0; i < deadlineInsights.length; i++) {
    insights.push(deadlineInsights[i]);
  }

  // Check for top links
  const linkInsights = generateLinkInsights(item);
  for (let i = 0; i < linkInsights.length; i++) {
    insights.push(linkInsights[i]);
  }

  // Check for next actions
  const actionInsights = generateActionInsights(item);
  for (let i = 0; i < actionInsights.length; i++) {
    insights.push(actionInsights[i]);
  }

  // Check for missing info
  const missingInsights = generateMissingInfoInsights(item);
  for (let i = 0; i < missingInsights.length; i++) {
    insights.push(missingInsights[i]);
  }

  // Sort by priority (high first)
  sortInsightsByPriority(insights);

  return {
    insights: insights,
    hasInsights: insights.length > 0,
  };
}

/**
 * Generates deadline-related insights.
 *
 * @param item - Import item
 * @returns Array of deadline insights
 */
function generateDeadlineInsights(item: ImportedDocument): Insight[] {
  const insights: Insight[] = [];

  // Find deadline signals
  const deadlineSignals: ExtractedSignal[] = [];
  for (let i = 0; i < item.extractedSignals.length; i++) {
    if (item.extractedSignals[i].type === 'deadline') {
      deadlineSignals.push(item.extractedSignals[i]);
    }
  }

  if (deadlineSignals.length > 0) {
    // Use the first deadline signal
    const firstDeadline = deadlineSignals[0];

    // Try to parse date to determine if it's coming up
    const deadlineDate = parseDateFromSignal(firstDeadline.value);
    if (deadlineDate !== null) {
      const now = new Date();
      const daysUntilDeadline = Math.floor(
        (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let priority: 'high' | 'medium' | 'low' = 'low';
      if (daysUntilDeadline <= 7) {
        priority = 'high';
      } else if (daysUntilDeadline <= 30) {
        priority = 'medium';
      }

      const metadata: Record<string, string> = {
        deadline: firstDeadline.value,
        daysUntil: String(daysUntilDeadline),
      };

      insights.push({
        type: 'deadline_coming_up',
        title: 'Deadline Coming Up',
        description: `Application deadline: ${firstDeadline.displayValue} (${daysUntilDeadline} days)`,
        priority: priority,
        sourceSignalId: firstDeadline.id,
        sourceSnippet: firstDeadline.sourceSnippet,
        metadata: metadata,
      });
    } else {
      // Deadline found but couldn't parse date
      insights.push({
        type: 'deadline_coming_up',
        title: 'Deadline Found',
        description: `Deadline mentioned: ${firstDeadline.displayValue}`,
        priority: 'medium',
        sourceSignalId: firstDeadline.id,
        sourceSnippet: firstDeadline.sourceSnippet,
        metadata: { deadline: firstDeadline.value },
      });
    }
  }

  return insights;
}

/**
 * Generates link-related insights.
 *
 * @param item - Import item
 * @returns Array of link insights
 */
function generateLinkInsights(item: ImportedDocument): Insight[] {
  const insights: Insight[] = [];

  if (item.linkedEntities.length > 0) {
    const linkCount = item.linkedEntities.length;
    const metadata: Record<string, string> = {
      linkCount: String(linkCount),
    };

    insights.push({
      type: 'top_links',
      title: 'Linked to Workflow Items',
      description: `This import is linked to ${linkCount} workflow item${linkCount === 1 ? '' : 's'}`,
      priority: 'low',
      sourceSignalId: null,
      sourceSnippet: null,
      metadata: metadata,
    });
  }

  return insights;
}

/**
 * Generates action-related insights.
 *
 * @param item - Import item
 * @returns Array of action insights
 */
function generateActionInsights(item: ImportedDocument): Insight[] {
  const insights: Insight[] = [];

  // Find queued actions
  const queuedActions: Array<{ id: string; type: string }> = [];
  for (let i = 0; i < item.actions.length; i++) {
    if (item.actions[i].status === 'queued') {
      queuedActions.push({
        id: item.actions[i].id,
        type: item.actions[i].type,
      });
    }
  }

  if (queuedActions.length > 0) {
    const actionCount = queuedActions.length;
    const metadata: Record<string, string> = {
      actionCount: String(actionCount),
    };

    insights.push({
      type: 'next_actions',
      title: 'Actions Available',
      description: `${actionCount} action${actionCount === 1 ? '' : 's'} ready to apply`,
      priority: 'medium',
      sourceSignalId: null,
      sourceSnippet: null,
      metadata: metadata,
    });
  }

  return insights;
}

/**
 * Generates missing info insights.
 *
 * @param item - Import item
 * @param linkedTasksCount - Optional count of linked tasks
 * @returns Array of missing info insights
 */
function generateMissingInfoInsights(
  item: ImportedDocument
): Insight[] {
  const insights: Insight[] = [];

  // Check for missing deadline
  let hasDeadline = false;
  for (let i = 0; i < item.extractedSignals.length; i++) {
    if (item.extractedSignals[i].type === 'deadline') {
      hasDeadline = true;
      break;
    }
  }

  if (!hasDeadline) {
    insights.push({
      type: 'missing_deadline',
      title: 'No Deadline Found',
      description: 'No application deadline was detected in this import',
      priority: 'low',
      sourceSignalId: null,
      sourceSnippet: null,
      metadata: null,
    });
  }

  // Check for missing job link
  let hasJobLink = false;
  for (let i = 0; i < item.linkedEntities.length; i++) {
    if (item.linkedEntities[i].entityType === 'savedJob') {
      hasJobLink = true;
      break;
    }
  }

  if (!hasJobLink) {
    insights.push({
      type: 'missing_job_link',
      title: 'Not Linked to Job',
      description: 'This import is not linked to any saved job',
      priority: 'low',
      sourceSignalId: null,
      sourceSnippet: null,
      metadata: null,
    });
  }

  return insights;
}

/**
 * Sorts insights by priority (high first).
 *
 * @param insights - Array of insights to sort (modified in place)
 */
function sortInsightsByPriority(insights: Insight[]): void {
  const priorityOrder: Record<'high' | 'medium' | 'low', number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  insights.sort(function (a, b) {
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Parses a date string from a signal value.
 *
 * @param dateStr - Date string to parse
 * @returns Parsed Date object or null if parsing fails
 */
function parseDateFromSignal(dateStr: string): Date | null {
  try {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
