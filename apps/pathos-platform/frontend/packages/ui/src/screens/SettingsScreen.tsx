/**
 * ============================================================================
 * SHARED SETTINGS SCREEN -- Platform-agnostic settings view
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * Phase 9: Consolidated Data Controls for all storage modules.
 */

'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, AlertTriangle, ShieldCheck, Palette, Info } from 'lucide-react';
import { Tooltip } from '../components/Tooltip';
import { useNav } from '@pathos/adapters';
import {
  loadGuidedApplyStore,
  exportGuidedApplyJSON,
  clearGuidedApplyData,
  loadSavedJobsStore,
  exportSavedJobsJSON,
  clearSavedJobs,
  loadResumeStore,
  exportResumeJSON,
  clearResumeData,
  loadTodayStore,
  exportTodayJSON,
  clearTodayData,
  DEFAULT_THEME_VARIANT,
  loadThemeVariantPreference,
  saveThemeVariantPreference,
  clearThemeVariantPreference,
  resolveThemeVariant,
  type ThemeVariant,
} from '@pathos/core';

export interface SettingsScreenProps {
  userName?: string;
  isEmployee?: boolean;
  themeOverride?: ThemeVariant;
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

function downloadJSON(json: string, prefix: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = prefix + '-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Settings section sub-component
// ---------------------------------------------------------------------------

function SettingsSection(props: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="p-5"
      style={{
        background: 'var(--p-surface)',
        border: '1px solid var(--p-border)',
        borderRadius: 'var(--p-radius-lg)',
        boxShadow: 'var(--p-shadow)',
      }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--p-text)' }}>{props.title}</h3>
      {props.children}
    </div>
  );
}

/** Info icon button with portaled tooltip (Overlay Rule v1). */
function InlineTooltip(props: {
  id: string;
  name: string;
  description: string;
  shortcut?: string;
}) {
  const content = (
    <>
      <p className="font-semibold" style={{ color: 'var(--p-text)' }}>{props.name}</p>
      <p>{props.description}</p>
      {props.shortcut !== undefined && props.shortcut !== '' ? <p className="mt-1">Shortcut: {props.shortcut}</p> : null}
    </>
  );
  return (
    <Tooltip contentId={props.id} side="bottom" content={content}>
      <button
        type="button"
        className="h-5 w-5 grid place-items-center rounded-[var(--p-radius)]"
        style={{
          color: 'var(--p-text-muted)',
          border: '1px solid var(--p-border)',
          background: 'var(--p-surface2)',
        }}
        aria-label={props.name}
      >
        <Info className="h-3 w-3" />
      </button>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Data row sub-component
// ---------------------------------------------------------------------------

function DataRow(props: {
  label: string;
  detail: string;
  onExport: () => void;
  onDelete: () => void;
  isEmpty: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between p-3 mb-2"
      style={{
        background: 'var(--p-surface2)',
        borderRadius: 'var(--p-radius)',
        border: '1px solid var(--p-border)',
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>{props.label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--p-text-dim)' }}>{props.detail}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <button
          type="button"
          onClick={props.onExport}
          disabled={props.isEmpty}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-30"
          style={{
            border: '1px solid var(--p-border)',
            borderRadius: 'var(--p-radius)',
            color: 'var(--p-text-muted)',
            background: 'transparent',
          }}
          aria-label={'Export ' + props.label}
        >
          <Download className="w-3 h-3" />
          Export
        </button>
        <button
          type="button"
          onClick={props.onDelete}
          disabled={props.isEmpty}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-30"
          style={{
            border: '1px solid color-mix(in srgb, var(--p-danger, #ef4444) 40%, var(--p-border))',
            borderRadius: 'var(--p-radius)',
            color: 'var(--p-danger, #ef4444)',
            background: 'transparent',
          }}
          aria-label={'Delete ' + props.label}
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function SettingsScreen(props: SettingsScreenProps) {
  const nav = useNav();
  const [savedThemeVariant, setSavedThemeVariant] = useState<ThemeVariant>(DEFAULT_THEME_VARIANT);

  // Counts
  const [gaCount, setGaCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [resumeHasData, setResumeHasData] = useState(false);
  const [todayCount, setTodayCount] = useState(0);

  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refreshCounts = useCallback(function () {
    setGaCount(loadGuidedApplyStore().sessions.length);
    setSavedCount(loadSavedJobsStore().jobs.length);
    const r = loadResumeStore();
    setResumeHasData(r.draft.summary !== '' || r.draft.experience.length > 0 || r.versions.length > 0);
    setTodayCount(loadTodayStore().items.length);
  }, []);

  useEffect(function () {
    queueMicrotask(function () { refreshCounts(); });
  }, [refreshCounts]);
  useEffect(function () {
    const stored = loadThemeVariantPreference();
    const value = stored !== null && stored !== undefined ? stored : DEFAULT_THEME_VARIANT;
    queueMicrotask(function () { setSavedThemeVariant(value); });
  }, []);

  const showFeedback = useCallback(function (msg: string) {
    setFeedback(msg);
    setTimeout(function () { setFeedback(null); }, 3000);
  }, []);

  // Export handlers
  const handleExportGA = function () { downloadJSON(exportGuidedApplyJSON(loadGuidedApplyStore()), 'pathos-guided-apply'); showFeedback('Guided Apply data exported.'); };
  const handleExportSaved = function () { downloadJSON(exportSavedJobsJSON(loadSavedJobsStore()), 'pathos-saved-jobs'); showFeedback('Saved Jobs data exported.'); };
  const handleExportResume = function () { downloadJSON(exportResumeJSON(loadResumeStore()), 'pathos-resume'); showFeedback('Resume data exported.'); };
  const handleExportToday = function () { downloadJSON(exportTodayJSON(loadTodayStore()), 'pathos-today'); showFeedback('Today checklist exported.'); };

  function handleThemeChange(nextTheme: ThemeVariant) {
    setSavedThemeVariant(nextTheme);
    saveThemeVariantPreference(nextTheme);
    showFeedback('Theme preference saved.');
  }

  const resolvedThemeVariant = resolveThemeVariant({
    queryTheme: props.themeOverride,
    persistedTheme: savedThemeVariant,
    defaultTheme: DEFAULT_THEME_VARIANT,
  });

  const themeOptions: Array<{
    id: ThemeVariant;
    label: string;
    description: string;
  }> = [
    {
      id: 'legacy',
      label: 'Classic Blue',
      description: 'Default trust-first theme with classic blue accents and high readability.',
    },
    {
      id: 'shared',
      label: 'Analyst Blue',
      description: 'Cool analytical palette with blue accents for focused planning.',
    },
    {
      id: 'mix',
      label: 'Signal Amber',
      description: 'Blue surfaces with amber accents for stronger action contrast.',
    },
  ];

  // Delete handlers
  const handleDeleteConfirmed = useCallback(function () {
    switch (confirmTarget) {
      case 'guided-apply': clearGuidedApplyData(); break;
      case 'saved-jobs': clearSavedJobs(); break;
      case 'resume': clearResumeData(); break;
      case 'today': clearTodayData(); break;
      case 'all':
        clearGuidedApplyData();
        clearSavedJobs();
        clearResumeData();
        clearTodayData();
        clearThemeVariantPreference();
        setSavedThemeVariant(DEFAULT_THEME_VARIANT);
        break;
    }
    setConfirmTarget(null);
    refreshCounts();
    showFeedback('Data deleted successfully.');
  }, [confirmTarget, refreshCounts, showFeedback]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--p-text)' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--p-text-muted)' }}>
          Manage your profile, preferences, and data.
        </p>
      </div>

      <div className="space-y-4">
        <SettingsSection title="Identity and Profile">
          <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>
            Name: {props.userName ?? 'Not set'}
          </p>
          <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>
            Type: {props.isEmployee ? 'Federal Employee' : 'Job Seeker'}
          </p>
        </SettingsSection>

        <SettingsSection title="Appearance">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4" style={{ color: 'var(--p-accent)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>
              Theme
            </p>
            <InlineTooltip
              id="settings-theme-tooltip"
              name="Theme selector"
              description="Choose a visual token set for shared PathOS screens. This changes style tokens only and does not change routes or screen content."
            />
          </div>

          <div role="radiogroup" aria-label="Theme">
            {themeOptions.map(function (option) {
              const isChecked = savedThemeVariant === option.id;
              return (
                <label
                  key={option.id}
                  className="flex items-start justify-between gap-3 p-3 mb-2 cursor-pointer"
                  style={{
                    background: 'var(--p-surface2)',
                    border: '1px solid var(--p-border)',
                    borderRadius: 'var(--p-radius)',
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="theme-variant"
                        value={option.id}
                        checked={isChecked}
                        onChange={function () { handleThemeChange(option.id); }}
                        className="mt-0.5"
                      />
                      <p className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>
                        {option.label}
                        {option.id === DEFAULT_THEME_VARIANT ? ' (default)' : ''}
                      </p>
                    </div>
                    <p className="text-xs mt-1 ml-6" style={{ color: 'var(--p-text-dim)' }}>
                      {option.description}
                    </p>
                  </div>
                  <InlineTooltip
                    id={'theme-option-tooltip-' + option.id}
                    name={option.label}
                    description={option.description}
                  />
                </label>
              );
            })}
          </div>

          {props.themeOverride ? (
            <p className="text-xs mt-2" style={{ color: 'var(--p-text-muted)' }}>
              Theme override active from query parameter. Saved preference is {savedThemeVariant}. Active theme is {resolvedThemeVariant}.
            </p>
          ) : null}
        </SettingsSection>

        <SettingsSection title="Data Controls">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4" style={{ color: 'var(--p-success)' }} />
            <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>
              All data is stored locally on this device. PathOS does not send your data to any server.
            </p>
          </div>

          <DataRow
            label="Guided Apply Sessions"
            detail={gaCount + ' session' + (gaCount !== 1 ? 's' : '')}
            onExport={handleExportGA}
            onDelete={function () { setConfirmTarget('guided-apply'); }}
            isEmpty={gaCount === 0}
          />
          <DataRow
            label="Saved Jobs"
            detail={savedCount + ' job' + (savedCount !== 1 ? 's' : '')}
            onExport={handleExportSaved}
            onDelete={function () { setConfirmTarget('saved-jobs'); }}
            isEmpty={savedCount === 0}
          />
          <DataRow
            label="Resume Builder"
            detail={resumeHasData ? 'Draft and versions' : 'No data'}
            onExport={handleExportResume}
            onDelete={function () { setConfirmTarget('resume'); }}
            isEmpty={!resumeHasData}
          />
          <DataRow
            label="Today Checklist"
            detail={todayCount + ' item' + (todayCount !== 1 ? 's' : '')}
            onExport={handleExportToday}
            onDelete={function () { setConfirmTarget('today'); }}
            isEmpty={todayCount === 0}
          />

          {/* Delete all */}
          <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--p-border)' }}>
            <button
              type="button"
              onClick={function () { setConfirmTarget('all'); }}
              disabled={gaCount === 0 && savedCount === 0 && !resumeHasData && todayCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-30"
              style={{
                border: '1px solid var(--p-danger, #ef4444)',
                borderRadius: 'var(--p-radius)',
                color: 'var(--p-danger, #ef4444)',
                background: 'transparent',
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete All Local Data
            </button>
          </div>

          {feedback && (
            <p className="text-xs mt-3" style={{ color: 'var(--p-success)' }}>
              {feedback}
            </p>
          )}
        </SettingsSection>
      </div>

      {/* Confirmation dialog */}
      {confirmTarget && (
        <div
          className="p-4 space-y-3"
          style={{
            background: 'color-mix(in srgb, var(--p-danger, #ef4444) 8%, var(--p-surface))',
            border: '1px solid color-mix(in srgb, var(--p-danger, #ef4444) 30%, transparent)',
            borderRadius: 'var(--p-radius-lg)',
          }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--p-danger, #ef4444)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>
                Confirm deletion
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--p-text-muted)' }}>
                {confirmTarget === 'all'
                  ? 'This will permanently delete all local PathOS data. This cannot be undone.'
                  : 'This will permanently delete your ' + confirmTarget.replace('-', ' ') + ' data. This cannot be undone.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 ml-7">
            <button
              type="button"
              onClick={handleDeleteConfirmed}
              className="px-3 py-1.5 text-xs font-medium"
              style={{
                background: 'var(--p-danger, #ef4444)',
                color: '#fff',
                borderRadius: 'var(--p-radius)',
                border: 'none',
              }}
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={function () { setConfirmTarget(null); }}
              className="px-3 py-1.5 text-xs font-medium"
              style={{
                border: '1px solid var(--p-border)',
                borderRadius: 'var(--p-radius)',
                color: 'var(--p-text-muted)',
                background: 'transparent',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={function () { nav.push('/dashboard'); }}
        className="px-4 py-2 text-sm font-medium transition-colors"
        style={{
          border: '1px solid var(--p-border)',
          borderRadius: 'var(--p-radius)',
          color: 'var(--p-text-muted)',
          background: 'transparent',
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
