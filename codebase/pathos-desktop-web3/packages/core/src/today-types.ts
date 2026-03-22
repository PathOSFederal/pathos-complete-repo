/**
 * ============================================================================
 * TODAY CHECKLIST DATA MODEL -- Lightweight daily workflow state
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * A simple daily checklist that helps users stay organized.
 * No notifications, no automation. Just a local checklist + persistence.
 */

// ---------------------------------------------------------------------------
// Checklist item
// ---------------------------------------------------------------------------

export interface TodayItem {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export const TODAY_SCHEMA_VERSION = 1;

export interface TodayStore {
  schemaVersion: number;
  items: TodayItem[];
  lastViewedJobId: string | null;
}

// ---------------------------------------------------------------------------
// Default items factory (seeded on first visit)
// ---------------------------------------------------------------------------

export function createDefaultTodayItems(): TodayItem[] {
  const now = new Date().toISOString();
  return [
    { id: 'today-1', title: 'Review saved jobs', done: false, createdAt: now },
    { id: 'today-2', title: 'Continue any open Guided Apply sessions', done: false, createdAt: now },
    { id: 'today-3', title: 'Check USAJOBS for new postings', done: false, createdAt: now },
  ];
}
