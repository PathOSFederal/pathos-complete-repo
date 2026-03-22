/**
 * ============================================================================
 * SAVED JOBS SCREEN -- Browse and manage saved job listings
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * TRUST-FIRST: No credentials, no scraping, no auto-apply.
 * USAJOBS links open externally in the user's browser.
 */

'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  Bookmark,
  ExternalLink,
  Trash2,
  ClipboardList,
  MapPin,
  Building2,
  DollarSign,
  Briefcase,
  ChevronRight,
} from 'lucide-react';
import { useNav } from '@pathos/adapters';
import {
  loadSavedJobsStore,
  saveSavedJobsStore,
  removeSavedJob,
  selectSavedJob,
  getSelectedSavedJob,
  createSession,
  addSession,
  loadGuidedApplyStore,
  saveGuidedApplyStore,
} from '@pathos/core';
import type { Job, SavedJobsStore } from '@pathos/core';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for SavedJobsScreen; currently no required props. */
export type SavedJobsScreenProps = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Sub-component: Saved job list item
// ---------------------------------------------------------------------------

function SavedJobItem(props: {
  job: Job;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const saved = new Date(props.job.savedAt);
  const dateStr = saved.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <button
      type="button"
      onClick={function () { props.onSelect(props.job.id); }}
      className="w-full text-left px-4 py-3 transition-colors"
      style={{
        background: props.isSelected ? 'var(--p-surface2)' : 'transparent',
        borderLeft: props.isSelected ? '3px solid var(--p-accent)' : '3px solid transparent',
      }}
    >
      <p className="text-sm font-medium truncate" style={{ color: 'var(--p-text)' }}>
        {props.job.title}
      </p>
      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--p-text-muted)' }}>
        {props.job.agency}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
          {props.job.location}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--p-text-dim)' }}>
          Saved {dateStr}
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Details panel
// ---------------------------------------------------------------------------

function SavedJobDetails(props: {
  job: Job | undefined;
  onRemove: () => void;
  onStartGuidedApply: () => void;
}) {
  if (!props.job) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8" style={{ color: 'var(--p-text-dim)' }}>
        <Bookmark className="w-10 h-10 opacity-40" />
        <p className="text-sm">Select a saved job to view details</p>
      </div>
    );
  }

  const job = props.job;
  const usajobsUrl = job.url || 'https://www.usajobs.gov';

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--p-text)' }}>
          {job.title}
        </h2>
        <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: 'var(--p-text-muted)' }}>
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" style={{ color: 'var(--p-accent)' }} />
            {job.agency}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--p-text-dim)' }} />
            {job.location}
          </span>
        </div>
      </div>

      <div
        className="grid gap-3 grid-cols-2 p-4 rounded-lg"
        style={{ background: 'var(--p-surface2)', borderRadius: 'var(--p-radius-lg)' }}
      >
        {job.grade && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--p-text-dim)' }}>Grade</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--p-text)' }}>{job.grade}</p>
          </div>
        )}
        {job.salaryRange && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--p-text-dim)' }}>Salary Range</p>
            <p className="text-sm font-semibold mt-0.5 flex items-center gap-1" style={{ color: 'var(--p-success)' }}>
              <DollarSign className="w-3.5 h-3.5" />
              {job.salaryRange}
            </p>
          </div>
        )}
      </div>

      {job.summary && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--p-text-dim)' }}>Summary</h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--p-text-muted)' }}>{job.summary}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <a
          href={usajobsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
          style={{
            background: 'var(--p-accent)',
            color: 'var(--p-bg)',
            borderRadius: 'var(--p-radius)',
          }}
        >
          <ExternalLink className="w-4 h-4" />
          View on USAJOBS
        </a>

        <button
          type="button"
          onClick={props.onStartGuidedApply}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
          style={{
            background: 'color-mix(in srgb, var(--p-success) 15%, transparent)',
            color: 'var(--p-success)',
            border: '1px solid color-mix(in srgb, var(--p-success) 30%, transparent)',
            borderRadius: 'var(--p-radius)',
          }}
        >
          <ClipboardList className="w-4 h-4" />
          Start Guided Apply
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={props.onRemove}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
          style={{
            color: 'var(--p-danger, #ef4444)',
            border: '1px solid color-mix(in srgb, var(--p-danger, #ef4444) 30%, transparent)',
            borderRadius: 'var(--p-radius)',
            background: 'transparent',
          }}
        >
          <Trash2 className="w-4 h-4" />
          Remove
        </button>
      </div>

      <p className="text-[11px] pt-2" style={{ color: 'var(--p-text-dim)' }}>
        Opens in your browser. PathOS does not access your USAJOBS account.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptySavedJobs(props: { onGoToSearch: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: 'var(--p-surface2)' }}
      >
        <Bookmark className="w-8 h-8" style={{ color: 'var(--p-text-dim)' }} />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>No saved jobs yet</p>
        <p className="text-xs" style={{ color: 'var(--p-text-dim)' }}>
          Save jobs from the Job Search screen to track them here.
        </p>
      </div>
      <button
        type="button"
        onClick={props.onGoToSearch}
        className="px-4 py-2 text-sm font-medium transition-colors"
        style={{
          background: 'var(--p-accent)',
          color: 'var(--p-bg)',
          borderRadius: 'var(--p-radius)',
          border: 'none',
        }}
      >
        Go to Job Search
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function SavedJobsScreen(_props: SavedJobsScreenProps) {
  const nav = useNav();
  const [store, setStore] = useState<SavedJobsStore>({
    schemaVersion: 1,
    jobs: [],
    selectedJobId: null,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(function () {
    const loaded = loadSavedJobsStore();
    queueMicrotask(function () {
      setStore(loaded);
      setMounted(true);
    });
  }, []);

  const persist = useCallback(function (next: SavedJobsStore) {
    setStore(next);
    saveSavedJobsStore(next);
  }, []);

  const selectedJob = getSelectedSavedJob(store);

  const handleSelect = useCallback(function (jobId: string) {
    persist(selectSavedJob(store, jobId));
  }, [store, persist]);

  const handleRemove = useCallback(function () {
    if (!selectedJob) return;
    persist(removeSavedJob(store, selectedJob.id));
  }, [selectedJob, store, persist]);

  const handleStartGuidedApply = useCallback(function () {
    if (!selectedJob) return;
    const gaStore = loadGuidedApplyStore();
    const session = createSession(selectedJob.title, selectedJob.url || '');
    const updatedGaStore = addSession(gaStore, session);
    saveGuidedApplyStore(updatedGaStore);
    nav.push('/guided-apply');
  }, [selectedJob, nav]);

  const handleGoToSearch = useCallback(function () {
    nav.push('/dashboard/job-search');
  }, [nav]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--p-text-dim)' }}>
        <p className="text-sm">Loading saved jobs...</p>
      </div>
    );
  }

  if (store.jobs.length === 0) {
    return <EmptySavedJobs onGoToSearch={handleGoToSearch} />;
  }

  return (
    <div className="flex flex-col h-full" style={{ color: 'var(--p-text)' }}>
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--p-border)' }}
      >
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4" style={{ color: 'var(--p-accent)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>Saved Jobs</h2>
        </div>
        <span className="text-xs tabular-nums" style={{ color: 'var(--p-text-dim)' }}>
          {store.jobs.length} saved
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className="w-72 lg:w-80 flex-shrink-0 overflow-y-auto"
          style={{ borderRight: '1px solid var(--p-border)' }}
        >
          <div className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
            {store.jobs.map(function (job) {
              return (
                <SavedJobItem
                  key={job.id}
                  job={job}
                  isSelected={store.selectedJobId === job.id}
                  onSelect={handleSelect}
                />
              );
            })}
          </div>
        </div>

        <SavedJobDetails
          job={selectedJob}
          onRemove={handleRemove}
          onStartGuidedApply={handleStartGuidedApply}
        />
      </div>
    </div>
  );
}
