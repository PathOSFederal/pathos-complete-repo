/**
 * ============================================================================
 * IMPORT INSIGHTS TESTS (Day 29)
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import { generateInsights } from './importInsights';
import type { ImportedDocument } from '@/store/documentImportStore';
import type { ExtractedSignal } from '@/lib/documents';

/**
 * Creates a mock ImportedDocument for testing.
 */
function createMockDocument(
  id: string,
  signals: ExtractedSignal[],
  linkedEntities: Array<{ entityType: 'savedJob' | 'targetRole' | 'jobAlert'; entityId: string; linkedAt: string }>,
  actions: Array<{ id: string; type: string; status: string }>
): ImportedDocument {
  return {
    id: id,
    createdAt: new Date().toISOString(),
    title: 'Test Document',
    type: 'text',
    mimeType: 'text/plain',
    sizeBytes: 100,
    category: 'Other',
    sensitivity: 'Unknown',
    tags: [],
    isHidden: false,
    status: 'new',
    note: '',
    linkedEntities: linkedEntities,
    extractedSignals: signals,
    actions: actions.map(function (a) {
      return {
        id: a.id,
        type: a.type as 'link_to_job' | 'open_job_search' | 'start_resume_tailoring' | 'save_attachment' | 'capture_deadline',
        createdAt: new Date().toISOString(),
        status: a.status as 'queued' | 'applied' | 'failed' | 'canceled',
        sourceSignalId: null,
        payload: {},
        note: '',
        completedAt: null,
      };
    }),
    hasBlobStorage: false,
    textContent: 'Test content',
    classificationKeywords: [],
    classificationConfidence: 0.5,
    duplicateOfId: null,
    duplicateReasons: [],
    duplicateStatus: 'none',
    retentionStatus: 'active',
  };
}

/**
 * Creates a mock ExtractedSignal for testing.
 */
function createMockSignal(
  id: string,
  type: string,
  value: string,
  sourceSnippet: string
): ExtractedSignal {
  return {
    id: id,
    type: type as ExtractedSignal['type'],
    value: value,
    displayValue: value,
    confidence: 'high',
    sourceSnippet: sourceSnippet,
    sourceRange: null,
    metadata: null,
  };
}

describe('generateInsights', function () {
  it('should generate deadline insight when deadline signal exists', function () {
    const deadlineSignal = createMockSignal('sig1', 'deadline', '2025-12-31', 'Apply by 2025-12-31');
    const doc = createMockDocument('doc1', [deadlineSignal], [], []);
    const result = generateInsights(doc);
    expect(result.hasInsights).toBe(true);
    expect(result.insights.length).toBeGreaterThan(0);
    const deadlineInsight = result.insights.find(function (i) {
      return i.type === 'deadline_coming_up';
    });
    expect(deadlineInsight).not.toBeUndefined();
    if (deadlineInsight !== undefined) {
      expect(deadlineInsight.sourceSignalId).toBe('sig1');
      expect(deadlineInsight.sourceSnippet).toBe('Apply by 2025-12-31');
    }
  });

  it('should generate link insight when linked entities exist', function () {
    const linkedEntities: Array<{ entityType: 'savedJob' | 'targetRole' | 'jobAlert'; entityId: string; linkedAt: string }> = [
      { entityType: 'savedJob', entityId: 'job1', linkedAt: new Date().toISOString() },
    ];
    const doc = createMockDocument('doc1', [], linkedEntities, []);
    const result = generateInsights(doc);
    expect(result.hasInsights).toBe(true);
    const linkInsight = result.insights.find(function (i) {
      return i.type === 'top_links';
    });
    expect(linkInsight).not.toBeUndefined();
  });

  it('should generate action insight when queued actions exist', function () {
    const actions = [{ id: 'act1', type: 'link_to_job', status: 'queued' }];
    const doc = createMockDocument('doc1', [], [], actions);
    const result = generateInsights(doc);
    expect(result.hasInsights).toBe(true);
    const actionInsight = result.insights.find(function (i) {
      return i.type === 'next_actions';
    });
    expect(actionInsight).not.toBeUndefined();
  });

  it('should generate missing deadline insight when no deadline found', function () {
    const doc = createMockDocument('doc1', [], [], []);
    const result = generateInsights(doc);
    expect(result.hasInsights).toBe(true);
    const missingInsight = result.insights.find(function (i) {
      return i.type === 'missing_deadline';
    });
    expect(missingInsight).not.toBeUndefined();
  });

  it('should sort insights by priority (high first)', function () {
    const deadlineSignal = createMockSignal('sig1', 'deadline', '2025-01-01', 'Apply by 2025-01-01');
    const doc = createMockDocument('doc1', [deadlineSignal], [], []);
    const result = generateInsights(doc);
    if (result.insights.length > 1) {
      const priorities = result.insights.map(function (i) {
        return i.priority;
      });
      // High priority should come before low priority
      const highIndex = priorities.indexOf('high');
      const lowIndex = priorities.indexOf('low');
      if (highIndex !== -1 && lowIndex !== -1) {
        expect(highIndex).toBeLessThan(lowIndex);
      }
    }
  });
});
