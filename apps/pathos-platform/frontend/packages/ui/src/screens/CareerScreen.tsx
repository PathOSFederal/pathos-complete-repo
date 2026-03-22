/**
 * ============================================================================
 * SHARED CAREER & RESUME SCREEN — Executive-grade command center
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * LAYOUT: Matches docs/mockups (careerAndResume_*.png). Two-column layout
 * is provided by SharedAppShell (main scroll + fixed PathAdvisor rail).
 * Sections: title row, Today's Best Move hero, Resume Readiness 4-tile
 * briefing, Your Resumes, Referral Readiness Check, Tailoring Workspace, Career
 * Narrative, Proof Library. All use existing tokens and Dashboard-style
 * SectionHeader, ModuleCard, CardRowList. Demo state toggles drive empty
 * states and disabled CTAs (noResume | incompleteResume | readyResume |
 * tailorReadyWithJob). On mount, sets PathAdvisor rail overrides and hero
 * do-now so the rail shows Career-specific briefing and quick prompts.
 */

'use client';

import type React from 'react';
import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import {
  Lock,
  FileText,
  Copy,
  Download,
  HelpCircle,
  Check,
  Circle,
  Sparkles,
  Plus,
  Upload,
  ChevronDown,
  MoreVertical,
  FolderOpen,
  Archive,
  Trash2,
  X,
} from 'lucide-react';
import { ModuleCard } from '../components/ModuleCard';
import { AskPathAdvisorButton } from '../components/AskPathAdvisorButton';
import { DrawerTooltip } from '../components/DrawerTooltip';
import { Tooltip } from '../components/Tooltip';
import { CardRowList } from './_components/CardRowList';
import { usePathAdvisorBriefingStore } from '../stores/pathAdvisorBriefingStore';
import { usePathAdvisorScreenOverridesStore } from '../stores/pathAdvisorScreenOverridesStore';
import { useDashboardHeroDoNowStore } from '../stores/dashboardHeroDoNowStore';
import {
  useCareerResumeScreenStore,
  formatUpdatedAgo,
  type CareerResumeEntry,
} from '../stores/careerResumeScreenStore';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { useNav } from '@pathos/adapters';
import { RESUME_BUILDER, SAVED_JOBS } from '../routes/routes';
import { OVERLAY_ROOT_ID, Z_DIALOG, Z_POPOVER } from '../styles/zIndex';
import { publishSelectionContext } from '../lib/pathAdvisorPublish';
import { loadSavedJobsStore, listSavedJobs } from '@pathos/core';
import type { Job } from '@pathos/core';

/** Single item in Proof Library (STAR story, bullet, or metric). Local-only mock shape. */
interface ProofLibraryItem {
  title: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Demo state: drives empty states and disabled CTAs. Toggle at top of file
// for fast iteration. No backend; purely local UI state.
// ---------------------------------------------------------------------------

export type CareerDemoState = 'noResume' | 'incompleteResume' | 'readyResume' | 'tailorReadyWithJob';

const CAREER_DEMO_STATE: CareerDemoState = 'incompleteResume';

// ---------------------------------------------------------------------------
// PathAdvisor rail: Career-specific prompts (mockup parity)
// ---------------------------------------------------------------------------

const CAREER_SUGGESTED_PROMPTS = [
  "What's the biggest weakness in my resume right now?",
  'Rewrite this bullet stronger',
  'Do I meet specialized experience for the job?',
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CareerScreenProps {
  userName?: string;
  /** Optional last updated string for title row (e.g. "Feb 28, 2026"). */
  lastUpdated?: string;
  /** Optional override for demo state (for tests and fast iteration). When unset, CAREER_DEMO_STATE constant is used. */
  demoState?: CareerDemoState;
}

// ---------------------------------------------------------------------------
// Section header (same pattern as Dashboard)
// ---------------------------------------------------------------------------

function SectionHeader(props: { title: string; lastUpdated?: string }) {
  const showUpdated =
    props.lastUpdated !== undefined && props.lastUpdated !== null && props.lastUpdated !== '';
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
      <h2
        className="font-semibold uppercase tracking-[var(--p-letter-spacing-section)]"
        style={{ color: 'var(--p-text-dim)', fontSize: 'var(--p-font-size-section)' }}
      >
        {props.title}
      </h2>
      {showUpdated ? (
        <span className="text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
          Last updated: {props.lastUpdated}
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resume chips: Type + Status (token-safe; two chips max)
// Type: Master = neutral/outline; Tailored = accent/secondary.
// Status: Ready = success-like or check icon; In progress/Draft = muted.
// ---------------------------------------------------------------------------

function ResumeTypeChip(props: { type: 'master' | 'tailored' }) {
  const isTailored = props.type === 'tailored';
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0"
      style={
        isTailored
          ? {
              background: 'var(--p-accent-bg)',
              border: '1px solid var(--p-accent-muted)',
              color: 'var(--p-accent)',
            }
          : {
              background: 'var(--p-surface2)',
              border: '1px solid var(--p-border)',
              color: 'var(--p-text-muted)',
            }
      }
    >
      {isTailored ? 'Tailored' : 'Master'}
    </span>
  );
}

function ResumeStatusChip(props: { status: 'ready' | 'draft' | 'inProgress' }) {
  const isReady = props.status === 'ready';
  const label =
    props.status === 'ready'
      ? 'Ready'
      : props.status === 'draft'
        ? 'Draft'
        : 'In progress';
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0 inline-flex items-center gap-0.5"
      style={
        isReady
          ? {
              background: 'var(--p-success-bg)',
              border: '1px solid var(--p-success)',
              color: 'var(--p-success)',
            }
          : {
              background: 'var(--p-surface2)',
              border: '1px solid var(--p-border)',
              color: 'var(--p-text-muted)',
            }
      }
    >
      {isReady ? (
        <>
          <Check className="w-2.5 h-2.5" aria-hidden />
          {label}
        </>
      ) : (
        label
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Job option row: Line 1 title + GS right; Line 2 agency • location • close date (muted)
// ---------------------------------------------------------------------------

function JobOptionRow(props: { job: Job; isSelected?: boolean }) {
  const job = props.job;
  const closeDate = job.savedAt
    ? new Date(job.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  return (
    <div className="text-left w-full">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-medium text-[12px]" style={{ color: 'var(--p-text)' }}>
          {job.title}
        </span>
        <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--p-text-muted)' }}>
          {job.grade !== undefined && job.grade !== '' ? job.grade : '—'}
        </span>
      </div>
      <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--p-text-muted)' }}>
        {job.agency + ' • ' + job.location + ' • ' + closeDate}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tailoring Workspace: Target job searchable dropdown (saved jobs)
// ---------------------------------------------------------------------------

function TailoringTargetJobPicker(props: {
  targetJobIdForTailoring: string | null;
  setTargetJobForTailoring: (id: string | null) => void;
  targetJobSearch: string;
  setTargetJobSearch: (v: string) => void;
  onGoToSavedJobs: () => void;
  /** Optional: called when user selects a job (for context log). */
  onJobSelected?: (job: Job) => void;
}) {
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(
    function () {
      if (!open) return;
      const store = loadSavedJobsStore();
      const list = listSavedJobs(store);
      queueMicrotask(function () { setJobs(list); });
    },
    [open]
  );
  const selectedJob = useMemo(
    function () {
      if (props.targetJobIdForTailoring === null) return undefined;
      for (let i = 0; i < jobs.length; i++) {
        if (jobs[i].id === props.targetJobIdForTailoring) return jobs[i];
      }
      return undefined;
    },
    [jobs, props.targetJobIdForTailoring]
  );
  const searchLower = props.targetJobSearch.trim().toLowerCase();
  const filtered =
    searchLower === ''
      ? jobs
      : jobs.filter(function (j) {
          return (
            j.title.toLowerCase().indexOf(searchLower) >= 0 ||
            (j.agency !== undefined && j.agency.toLowerCase().indexOf(searchLower) >= 0)
          );
        });
  return (
    <div className="relative">
      <button
        type="button"
        onClick={function () { setOpen(!open); }}
        className="w-full text-left rounded-[var(--p-radius)] px-3 py-2 border flex items-center justify-between gap-2"
        style={{
          background: 'var(--p-surface2)',
          borderColor: 'var(--p-border)',
          color: selectedJob !== undefined ? 'var(--p-text)' : 'var(--p-text-muted)',
        }}
      >
        <span className="truncate">
          {selectedJob !== undefined ? selectedJob.title + (selectedJob.grade ? ' — ' + selectedJob.grade : '') : 'Select a saved job…'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
      </button>
      {open ? (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-[var(--p-radius)] border py-2 max-h-48 overflow-y-auto"
          style={{
            background: 'var(--p-surface)',
            borderColor: 'var(--p-border)',
            boxShadow: 'var(--p-shadow-elev-1)',
            zIndex: Z_POPOVER,
          }}
        >
          {jobs.length === 0 ? (
            <div className="px-3 py-3">
              <p className="text-[12px]" style={{ color: 'var(--p-text-muted)' }}>
                No saved jobs. Add jobs from Job Search to tailor your resume against them.
              </p>
              <button
                type="button"
                onClick={props.onGoToSavedJobs}
                className="mt-2 rounded-[var(--p-radius)] px-3 py-1.5 text-sm font-medium"
                style={{
                  background: 'var(--p-accent)',
                  color: 'var(--p-bg)',
                }}
              >
                Go to Saved Jobs
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search saved jobs…"
                value={props.targetJobSearch}
                onChange={function (e) { props.setTargetJobSearch(e.target.value); }}
                className="w-full px-3 py-1.5 text-[12px] border-b"
                style={{
                  background: 'var(--p-surface2)',
                  borderColor: 'var(--p-border)',
                  color: 'var(--p-text)',
                }}
              />
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-[11px]" style={{ color: 'var(--p-text-muted)' }}>
                  No jobs match. Try Saved Jobs to add more.
                </p>
              ) : (
                filtered.map(function (j) {
                  const isSel = j.id === props.targetJobIdForTailoring;
                  return (
                    <button
                      key={j.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:opacity-90"
                      style={{
                        background: isSel ? 'var(--p-accent-bg)' : 'transparent',
                        color: 'var(--p-text)',
                      }}
                      onClick={function () {
                        props.setTargetJobForTailoring(j.id);
                        if (props.onJobSelected !== undefined) {
                          props.onJobSelected(j);
                        }
                        setOpen(false);
                      }}
                    >
                      <JobOptionRow job={j} isSelected={isSel} />
                    </button>
                  );
                })
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resume Readiness briefing tiles (4 tiles). Same card chrome as ModuleCard
// and other cards on this page: border, radius, surface, 1px top accent.
// No left accent bar; emphasis via content only (value text uses --p-accent).
// ---------------------------------------------------------------------------

function ResumeReadinessTile(props: {
  label: string;
  value: string;
  subtext: string;
  showInfoIcon?: boolean;
  /** Optional 0–100 for a thin progress bar under the value (e.g. completeness). */
  progressPercent?: number;
}) {
  const showProgress =
    props.progressPercent !== undefined &&
    props.progressPercent !== null &&
    props.progressPercent >= 0 &&
    props.progressPercent <= 100;
  return (
    <div
      className="rounded-[var(--p-radius-lg)] flex flex-col"
      style={{
        background: 'var(--p-surface)',
        border: '1px solid var(--p-border)',
        borderRadius: 'var(--p-radius-lg)',
        boxShadow: 'var(--p-shadow-elev-1)',
        borderTop: '1px solid var(--p-accent-muted)',
      }}
    >
      <div className="p-3 flex flex-col gap-0.5">
        <span
          className="text-[11px] uppercase tracking-wide"
          style={{ color: 'var(--p-text-dim)' }}
        >
          {props.label}
        </span>
        <div className="flex items-center gap-1.5">
          <p className="font-semibold" style={{ color: 'var(--p-accent)', fontSize: '1rem' }}>
            {props.value}
          </p>
          {props.showInfoIcon === true ? (
            <HelpCircle
              className="w-3.5 h-3.5 flex-shrink-0"
              style={{ color: 'var(--p-text-muted)' }}
              aria-hidden
            />
          ) : null}
        </div>
        {showProgress ? (
          <div
            className="mt-1 h-1 rounded-full overflow-hidden"
            style={{ background: 'var(--p-surface2)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: props.progressPercent + '%',
                background: 'var(--p-accent)',
              }}
            />
          </div>
        ) : null}
        <p className="text-[11px]" style={{ color: 'var(--p-text-muted)' }}>
          {props.subtext}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CareerScreen
// ---------------------------------------------------------------------------

export function CareerScreen(props: CareerScreenProps) {
  const nav = useNav();
  const demoState =
    props.demoState !== undefined && props.demoState !== null
      ? props.demoState
      : CAREER_DEMO_STATE;
  const setOverrides = usePathAdvisorScreenOverridesStore(function (s) {
    return s.setOverrides;
  });
  const setHeroDoNow = useDashboardHeroDoNowStore(function (s) {
    return s.setAction;
  });
  const openBriefing = usePathAdvisorBriefingStore(function (s) {
    return s.openBriefing;
  });

  const resumes = useCareerResumeScreenStore(function (s) { return s.resumes; });
  const activeResumeId = useCareerResumeScreenStore(function (s) { return s.activeResumeId; });
  const targetJobIdForTailoring = useCareerResumeScreenStore(function (s) {
    return s.targetJobIdForTailoring;
  });
  const toastMessage = useCareerResumeScreenStore(function (s) { return s.toastMessage; });
  const seedFromDemoState = useCareerResumeScreenStore(function (s) { return s.seedFromDemoState; });
  const addResume = useCareerResumeScreenStore(function (s) { return s.addResume; });
  const setActiveResumeId = useCareerResumeScreenStore(function (s) { return s.setActiveResumeId; });
  const setTargetJobForTailoring = useCareerResumeScreenStore(function (s) {
    return s.setTargetJobForTailoring;
  });
  const archiveResume = useCareerResumeScreenStore(function (s) { return s.archiveResume; });
  const unarchiveResume = useCareerResumeScreenStore(function (s) { return s.unarchiveResume; });
  const deleteResume = useCareerResumeScreenStore(function (s) { return s.deleteResume; });
  const setToast = useCareerResumeScreenStore(function (s) { return s.setToast; });
  const toastUndoResumeId = useCareerResumeScreenStore(function (s) { return s.toastUndoResumeId; });
  const showArchived = useCareerResumeScreenStore(function (s) { return s.showArchived; });
  const setShowArchived = useCareerResumeScreenStore(function (s) { return s.setShowArchived; });

  const [resumeDropdownOpen, setResumeDropdownOpen] = useState(false);
  const [newVersionMenuOpen, setNewVersionMenuOpen] = useState(false);
  const [allResumesDrawerOpen, setAllResumesDrawerOpen] = useState(false);
  const [deleteConfirmResumeId, setDeleteConfirmResumeId] = useState<string | null>(null);
  const [drawerRowMoreOpenId, setDrawerRowMoreOpenId] = useState<string | null>(null);
  const [createTailoredDrawerOpen, setCreateTailoredDrawerOpen] = useState(false);
  const [createTailoredSelectedJobId, setCreateTailoredSelectedJobId] = useState<string | null>(null);
  const [createTailoredSearch, setCreateTailoredSearch] = useState('');
  const [savedJobsForPicker, setSavedJobsForPicker] = useState<Job[]>([]);
  const [targetJobSearch, setTargetJobSearch] = useState('');
  const tailoringWorkspaceRef = useRef<HTMLDivElement>(null);

  /** Proof Library: counts and items for STAR stories, bullet bank, metrics. Local-only mock state. */
  const [proofLibraryCounts, setProofLibraryCounts] = useState({ starStories: 5, bulletBank: 12, metrics: 8 });
  const [proofLibraryItems, setProofLibraryItems] = useState<{
    starStories: ProofLibraryItem[];
    bulletBank: ProofLibraryItem[];
    metrics: ProofLibraryItem[];
  }>({ starStories: [], bulletBank: [], metrics: [] });
  const [proofLibraryAddModal, setProofLibraryAddModal] = useState<'star' | 'bullet' | 'metric' | null>(null);
  const [proofLibraryViewDrawer, setProofLibraryViewDrawer] = useState<'star' | 'bullet' | 'metric' | null>(null);
  const [proofLibraryAddForm, setProofLibraryAddForm] = useState({ title: '', content: '' });

  const lastUpdated =
    props.lastUpdated !== undefined && props.lastUpdated !== null && props.lastUpdated !== ''
      ? props.lastUpdated
      : 'Feb 28, 2026';

  // Set PathAdvisor rail overrides and hero do-now when Career screen mounts; clear on unmount.
  useEffect(
    function () {
      setOverrides({
        screenId: 'resume-readiness',
        viewingLabel: 'Resume Readiness',
        suggestedPrompts: CAREER_SUGGESTED_PROMPTS,
        briefingLabel: 'From Resume Readiness',
      });
      setHeroDoNow({
        label: 'Complete Resume',
        route: RESUME_BUILDER,
      });
      return function () {
        setOverrides(null);
        setHeroDoNow(null);
      };
    },
    [setOverrides, setHeroDoNow]
  );

  // Seed resume list from demo state once per mount (store remembers _seeded).
  useEffect(
    function () {
      seedFromDemoState(demoState);
    },
    [demoState, seedFromDemoState]
  );

  // Clear toast after delay.
  useEffect(
    function () {
      if (toastMessage === null || toastMessage === '') return;
      const t = setTimeout(function () {
        setToast(null);
      }, 2500);
      return function () { clearTimeout(t); };
    },
    [toastMessage, setToast]
  );

  /** Non-archived resumes for dropdown and default drawer list. */
  const visibleResumes = useMemo(
    function () {
      return resumes.filter(function (r) { return r.archived !== true; });
    },
    [resumes]
  );

  const activeResume: CareerResumeEntry | undefined = useMemo(
    function () {
      if (activeResumeId === null) return undefined;
      for (let i = 0; i < resumes.length; i++) {
        if (resumes[i].id === activeResumeId) return resumes[i];
      }
      return undefined;
    },
    [resumes, activeResumeId]
  );

  const hasResume = resumes.length > 0;
  const isResumeComplete = demoState === 'readyResume' || demoState === 'tailorReadyWithJob';
  const hasTailorJob = targetJobIdForTailoring !== null && targetJobIdForTailoring !== '';

  const handleHeroCta = useCallback(
    function () {
      nav.push(RESUME_BUILDER);
    },
    [nav]
  );

  const handleAskPathAdvisorHero = useCallback(
    function () {
      openBriefing({
        id: 'career-best-move',
        title: "Why this is today's best move",
        sourceLabel: "Resume Readiness",
        sections: [
          {
            heading: 'What PathOS knows',
            body: 'Your resume completeness, missing sections, and last update time.',
          },
          {
            heading: 'What PathOS does not know',
            body: 'Your timeline or preferences; this is a local snapshot only.',
          },
          {
            heading: 'Why this is recommended',
            body: 'Completing all sections increases your chances of getting referred.',
          },
        ],
      });
    },
    [openBriefing]
  );

  // Load saved jobs when Create tailored drawer opens (for picker).
  useEffect(
    function () {
      if (!createTailoredDrawerOpen) return;
      const store = loadSavedJobsStore();
      const list = listSavedJobs(store);
      queueMicrotask(function () { setSavedJobsForPicker(list); });
    },
    [createTailoredDrawerOpen]
  );

  const handleDuplicateActiveResume = useCallback(
    function () {
      if (activeResume === undefined) return;
      setNewVersionMenuOpen(false);
      const baseName = activeResume.name;
      const copyName =
        baseName.indexOf('(Copy)') >= 0
          ? baseName + ' (2)'
          : baseName + ' (Copy)';
      const now = new Date().toISOString();
      addResume({
        id: 'res-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
        name: copyName,
        type: activeResume.type,
        status: 'inProgress',
        updatedAt: now,
      });
      setToast('Resume created and set as active.');
    },
    [activeResume, addResume, setToast]
  );

  const handleCreateTailoredFromJob = useCallback(
    function () {
      if (createTailoredSelectedJobId === null) return;
      const store = loadSavedJobsStore();
      const jobs = listSavedJobs(store);
      let job: Job | undefined;
      for (let i = 0; i < jobs.length; i++) {
        if (jobs[i].id === createTailoredSelectedJobId) {
          job = jobs[i];
          break;
        }
      }
      if (job === undefined) return;
      const gs = job.grade !== undefined && job.grade !== '' ? job.grade : '—';
      const name = job.title + ' – ' + gs;
      const now = new Date().toISOString();
      const newResumeId = 'res-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
      addResume({
        id: newResumeId,
        name: name,
        type: 'tailored',
        status: 'draft',
        updatedAt: now,
        targetJobId: job.id,
        targetJobTitle: job.title + ' — ' + (job.agency || ''),
      });
      setTargetJobForTailoring(job.id);
      setCreateTailoredDrawerOpen(false);
      setCreateTailoredSelectedJobId(null);
      setToast('Tailored resume created and set as active.');
      publishSelectionContext({
        screen: 'resume-readiness',
        anchor: { type: 'resume', id: newResumeId, label: name },
        payload: {
          title: 'Tailored version created: ' + name,
          subtitle: job.title !== undefined ? job.title : undefined,
          lines: ['Target job: ' + (job.title !== undefined ? job.title : job.id) + '. Start tailoring to align with the job.'],
        },
        dedupeKey: 'resume-readiness:tailored-created:' + newResumeId,
      });
      if (tailoringWorkspaceRef.current !== null) {
        tailoringWorkspaceRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [
      createTailoredSelectedJobId,
      addResume,
      setTargetJobForTailoring,
      setToast,
    ]
  );

  // Today's Best Move copy and CTA depend on demo state.
  const heroMessage =
    demoState === 'noResume'
      ? 'Add a resume to get started. Build your master resume so you can tailor it to jobs.'
      : demoState === 'incompleteResume' || demoState === 'readyResume' || demoState === 'tailorReadyWithJob'
        ? 'Your resume is 62% complete. Completing all sections increases your chances of getting referred.'
        : 'Your resume is 62% complete. Completing all sections increases your chances of getting referred.';
  const heroCtaLabel = demoState === 'noResume' ? 'Add resume' : 'Complete Resume';
  const heroContextCopy =
    'Based on your saved jobs, resume completeness, and last update.';

  // Resume sections checklist (mock): same shape as mockup.
  const resumeSections = useMemo(
    function () {
      const list = [
        { label: 'Contact Information', checked: true },
        { label: 'Professional Summary', checked: true },
        { label: 'Work Experience', checked: true },
        { label: 'Education', checked: true },
        { label: 'Federal Details (GS/Series)', checked: true },
        { label: 'Skills', checked: false },
        { label: 'Certifications', checked: false },
        { label: 'References', checked: false },
      ];
      return list;
    },
    []
  );

  /** Referral Readiness Check: issues that could lower referral odds. Severity labels per mockup: Fix first, Improve, Optional. */
  const referralFindings = useMemo(
    function () {
      if (demoState === 'noResume') {
        return [];
      }
      return [
        {
          severity: 'fixFirst' as const,
          title: 'Missing specialized experience language',
          body: 'HR cannot verify GS-0343 qualifications without specific phrasing.',
        },
        {
          severity: 'fixFirst' as const,
          title: 'No quantified accomplishments',
          body: 'Numbers help HR assess impact and scope of your work.',
        },
        {
          severity: 'improve' as const,
          title: 'Summary too generic',
          body: 'Federal resumes benefit from series-specific positioning.',
        },
        {
          severity: 'optional' as const,
          title: 'Consider adding volunteer work',
          body: 'Can demonstrate additional competencies.',
        },
      ];
    },
    [demoState]
  );

  const tailoringChecklist = useMemo(
    function () {
      return [
        { label: 'Keywords coverage', checked: hasTailorJob },
        { label: 'Specialized experience match', checked: hasTailorJob },
        { label: 'Questionnaire alignment hints', checked: false },
        { label: 'Required docs checklist', checked: false },
      ];
    },
    [hasTailorJob]
  );

  const narrativeBullets = useMemo(
    function () {
      if (demoState === 'noResume' || demoState === 'incompleteResume') {
        return [];
      }
      return [
        '10+ years leading cross-functional program evaluation initiatives in federal healthcare settings.',
        'Proven track record of translating complex data into actionable policy recommendations.',
        'Deep expertise in GPRA compliance, performance measurement, and stakeholder engagement.',
      ];
    },
    [demoState]
  );

  const createTailoredFilteredJobs = useMemo(
    function () {
      const q = createTailoredSearch.trim().toLowerCase();
      if (q === '') return savedJobsForPicker;
      return savedJobsForPicker.filter(function (j) {
        return (
          j.title.toLowerCase().indexOf(q) >= 0 ||
          (j.agency !== undefined && j.agency.toLowerCase().indexOf(q) >= 0)
        );
      });
    },
    [savedJobsForPicker, createTailoredSearch]
  );

  const handleProofLibrarySave = useCallback(
    function () {
      if (proofLibraryAddModal === null) return;
      const title = proofLibraryAddForm.title.trim();
      const content = proofLibraryAddForm.content.trim();
      if (title === '' && content === '') return;
      setProofLibraryItems(function (prev) {
        const next: { starStories: ProofLibraryItem[]; bulletBank: ProofLibraryItem[]; metrics: ProofLibraryItem[] } = {
          starStories: [],
          bulletBank: [],
          metrics: [],
        };
        for (let i = 0; i < prev.starStories.length; i++) next.starStories.push(prev.starStories[i]);
        for (let i = 0; i < prev.bulletBank.length; i++) next.bulletBank.push(prev.bulletBank[i]);
        for (let i = 0; i < prev.metrics.length; i++) next.metrics.push(prev.metrics[i]);
        const item: ProofLibraryItem = { title: title !== '' ? title : 'Untitled', content };
        if (proofLibraryAddModal === 'star') next.starStories.push(item);
        else if (proofLibraryAddModal === 'bullet') next.bulletBank.push(item);
        else next.metrics.push(item);
        return next;
      });
      setProofLibraryCounts(function (prev) {
        if (proofLibraryAddModal === 'star') {
          return { starStories: prev.starStories + 1, bulletBank: prev.bulletBank, metrics: prev.metrics };
        }
        if (proofLibraryAddModal === 'bullet') {
          return { starStories: prev.starStories, bulletBank: prev.bulletBank + 1, metrics: prev.metrics };
        }
        return { starStories: prev.starStories, bulletBank: prev.bulletBank, metrics: prev.metrics + 1 };
      });
      setProofLibraryAddModal(null);
      setProofLibraryAddForm({ title: '', content: '' });
    },
    [proofLibraryAddModal, proofLibraryAddForm]
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Title row: Resume Readiness + microcopy + Local-only badge + Last updated */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--p-text)' }}>
            Resume Readiness
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--p-text-muted)' }}>
            Keep your story complete, tailored, and ready to submit.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium"
            style={{
              background: 'var(--p-surface2)',
              border: '1px solid var(--p-border)',
              color: 'var(--p-text-muted)',
            }}
          >
            <Lock className="w-3 h-3" aria-hidden />
            Local only
          </span>
          <span className="text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
            Last updated: {lastUpdated}
          </span>
        </div>
      </div>

      {/* Today's Best Move hero card — primary CTA + Ask PathAdvisor; same card chrome as Dashboard hero. */}
      <ModuleCard title="TODAY'S BEST MOVE" action={null}>
        <p className="font-medium" style={{ color: 'var(--p-text)', fontSize: 'var(--p-font-size-body)' }}>
          {heroMessage}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={handleHeroCta}
            className="rounded-[var(--p-radius)] px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-90"
            style={{
              background: 'var(--p-accent)',
              color: 'var(--p-bg)',
            }}
          >
            {heroCtaLabel}
          </button>
          <AskPathAdvisorButton
            onClick={handleAskPathAdvisorHero}
            size="sm"
            tooltipId="career-hero-ask-pathadvisor-tooltip"
            tooltipText="Opens a PathAdvisor briefing for this recommendation."
          />
        </div>
        <p className="mt-2 text-[11px]" style={{ color: 'var(--p-text-muted)' }}>
          {heroContextCopy}
        </p>
      </ModuleCard>

      {/* Resume Readiness: 4-tile briefing row */}
      <div>
        <SectionHeader title="RESUME READINESS" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ResumeReadinessTile
            label="Completeness"
            value={hasResume ? '62%' : '—'}
            subtext={hasResume ? 'sections complete' : 'No resume'}
            progressPercent={hasResume ? 62 : undefined}
          />
          <ResumeReadinessTile
            label="Missing fields"
            value={hasResume ? '3' : '—'}
            subtext={hasResume ? 'sections need attention' : '—'}
          />
          <ResumeReadinessTile
            label="Tailor-ready"
            value={hasTailorJob ? 'Yes' : 'Low'}
            subtext={hasTailorJob ? 'ready for target job' : 'fix issues first'}
            showInfoIcon={!hasTailorJob}
          />
          <ResumeReadinessTile
            label="Last tailored"
            value={hasTailorJob ? 'Today' : 'Never tailored'}
            subtext={hasTailorJob ? 'against current target job' : 'Never tailored'}
          />
        </div>
      </div>

      {/* Your Resumes card: Active resume label + dropdown, Updated X ago, New version menu, Edit/Duplicate/Export, Sections. */}
      <div>
        <ModuleCard title="YOUR RESUMES" variant="dense">
          {hasResume && activeResume !== undefined ? (
            <>
              <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--p-text-dim)' }}>
                Active resume
              </p>
              <div className="relative">
                <div className="flex flex-nowrap items-center gap-3">
                  <button
                    type="button"
                    onClick={function () {
                      setResumeDropdownOpen(!resumeDropdownOpen);
                      setNewVersionMenuOpen(false);
                    }}
                    className="rounded-[var(--p-radius)] px-2 py-1.5 text-left flex flex-nowrap items-center gap-3 min-w-0 flex-1"
                    style={{
                      background: 'var(--p-surface2)',
                      border: '1px solid var(--p-border)',
                      color: 'var(--p-text)',
                    }}
                    aria-expanded={resumeDropdownOpen}
                    aria-haspopup="listbox"
                  >
                    <span className="font-semibold truncate min-w-0" style={{ color: 'var(--p-text)' }}>
                      {activeResume.name}
                    </span>
                    <div className="flex flex-nowrap items-center gap-1 flex-shrink-0">
                      <ResumeTypeChip type={activeResume.type} />
                      <ResumeStatusChip status={activeResume.status} />
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--p-text-muted)' }} />
                  </button>
                  <div className="relative flex-shrink-0">
                    <DropdownMenuPrimitive.Root open={newVersionMenuOpen} onOpenChange={setNewVersionMenuOpen}>
                      <DropdownMenuPrimitive.Trigger asChild>
                        <button
                          type="button"
                          onClick={function () { setResumeDropdownOpen(false); }}
                          className="rounded-[var(--p-radius)] px-2 py-1.5 text-[12px] font-medium inline-flex items-center gap-1"
                          style={{
                            background: 'var(--p-surface2)',
                            border: '1px solid var(--p-border)',
                            color: 'var(--p-text)',
                          }}
                          aria-label="New version menu"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          New version
                          <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--p-text-muted)' }} />
                        </button>
                      </DropdownMenuPrimitive.Trigger>
                      <DropdownMenuPrimitive.Portal
                        container={
                          typeof document !== 'undefined'
                            ? (document.getElementById(OVERLAY_ROOT_ID) || document.body)
                            : undefined
                        }
                      >
                        {/* Portaled; anchor to trigger, avoid overlapping PathAdvisor rail: bottom + end + collision padding so it can flip left when needed. */}
                        <DropdownMenuPrimitive.Content
                          side="bottom"
                          align="end"
                          sideOffset={8}
                          collisionPadding={14}
                          className="min-w-[12rem] max-w-[16rem] w-56 rounded-[var(--p-radius)] border py-1"
                          style={{
                            backgroundColor: 'var(--p-surface)',
                            borderColor: 'var(--p-border)',
                            boxShadow: 'var(--p-shadow-elev-1)',
                            zIndex: Z_POPOVER,
                          }}
                          onCloseAutoFocus={function (e) { e.preventDefault(); }}
                        >
                          <DropdownMenuPrimitive.Item
                            className="cursor-pointer outline-none rounded-none px-3 py-2 text-[12px] flex items-center gap-2"
                            style={{ color: 'var(--p-text)' }}
                            onSelect={function () {
                              handleDuplicateActiveResume();
                              setNewVersionMenuOpen(false);
                            }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Duplicate active resume
                          </DropdownMenuPrimitive.Item>
                          <DropdownMenuPrimitive.Item
                            className="cursor-pointer outline-none rounded-none px-3 py-2 text-[12px] flex items-center gap-2"
                            style={{ color: 'var(--p-text)' }}
                            onSelect={function () {
                              setNewVersionMenuOpen(false);
                              setCreateTailoredDrawerOpen(true);
                              setCreateTailoredSelectedJobId(null);
                              setCreateTailoredSearch('');
                            }}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Create tailored version from saved job
                          </DropdownMenuPrimitive.Item>
                        </DropdownMenuPrimitive.Content>
                      </DropdownMenuPrimitive.Portal>
                    </DropdownMenuPrimitive.Root>
                  </div>
                </div>
                {resumeDropdownOpen ? (
                  <div
                    className="absolute left-0 top-full mt-1 w-full min-w-[280px] max-w-md rounded-[var(--p-radius)] border py-2 max-h-64 overflow-y-auto"
                    style={{
                      background: 'var(--p-surface)',
                      borderColor: 'var(--p-border)',
                      boxShadow: 'var(--p-shadow-elev-1)',
                      zIndex: Z_POPOVER,
                    }}
                    role="listbox"
                  >
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase" style={{ color: 'var(--p-text-dim)' }}>
                      MASTER
                    </div>
                    {resumes.filter(function (r) { return r.type === 'master' && r.archived !== true; }).map(function (r) {
                      const isActive = r.id === activeResumeId;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          className="w-full text-left px-3 py-2 block"
                          style={{
                            background: isActive ? 'var(--p-accent-bg)' : 'transparent',
                            color: 'var(--p-text)',
                          }}
                          onClick={function () {
                            setActiveResumeId(r.id);
                            setResumeDropdownOpen(false);
                            publishSelectionContext({
                              screen: 'resume-readiness',
                              anchor: { type: 'resume', id: r.id, label: r.name },
                              payload: {
                                title: 'Active resume: ' + r.name,
                                subtitle: r.type === 'tailored' && r.targetJobTitle !== undefined ? r.targetJobTitle : undefined,
                                lines: ['Selected for editing and tailoring.'],
                              },
                              dedupeKey: 'resume-readiness:resume:' + r.id,
                            });
                          }}
                        >
                          {/* Line 1: name left, chip group right (mockup 2-line layout; never 3 columns). */}
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="truncate text-[12px] font-medium min-w-0">{r.name}</span>
                            <div className="flex flex-nowrap items-center gap-1 flex-shrink-0">
                              <ResumeTypeChip type={r.type} />
                              <ResumeStatusChip status={r.status} />
                            </div>
                          </div>
                          {/* Line 2: Updated X ago muted, aligned right; never same line as chips. */}
                          <div className="text-right mt-0.5">
                            <span className="text-[10px]" style={{ color: 'var(--p-text-muted)' }}>
                              {formatUpdatedAgo(r.updatedAt)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    <div className="px-2 py-1 mt-2 text-[10px] font-semibold uppercase" style={{ color: 'var(--p-text-dim)' }}>
                      TAILORED (RECENT)
                    </div>
                    {resumes.filter(function (r) { return r.type === 'tailored' && r.archived !== true; }).map(function (r) {
                      const isActive = r.id === activeResumeId;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          className="w-full text-left px-3 py-2 block"
                          style={{
                            background: isActive ? 'var(--p-accent-bg)' : 'transparent',
                            color: 'var(--p-text)',
                          }}
                          onClick={function () {
                            setActiveResumeId(r.id);
                            setResumeDropdownOpen(false);
                            publishSelectionContext({
                              screen: 'resume-readiness',
                              anchor: { type: 'resume', id: r.id, label: r.name },
                              payload: {
                                title: 'Active resume: ' + r.name,
                                subtitle: r.targetJobTitle !== undefined ? r.targetJobTitle : undefined,
                                lines: ['Selected for editing and tailoring.'],
                              },
                              dedupeKey: 'resume-readiness:resume:' + r.id,
                            });
                          }}
                        >
                          {/* Line 1: name left, chip group right (mockup 2-line layout; never 3 columns). */}
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="truncate text-[12px] font-medium min-w-0">{r.name}</span>
                            <div className="flex flex-nowrap items-center gap-1 flex-shrink-0">
                              <ResumeTypeChip type={r.type} />
                              <ResumeStatusChip status={r.status} />
                            </div>
                          </div>
                          {/* Line 2: Updated X ago muted, aligned right; never same line as chips. */}
                          <div className="text-right mt-0.5">
                            <span className="text-[10px]" style={{ color: 'var(--p-text-muted)' }}>
                              {formatUpdatedAgo(r.updatedAt)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    <div className="border-t mt-2 pt-2" style={{ borderColor: 'var(--p-border)' }}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-[12px] flex items-center gap-2"
                        style={{ color: 'var(--p-accent)' }}
                        onClick={function () {
                          setResumeDropdownOpen(false);
                          setAllResumesDrawerOpen(true);
                        }}
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        Manage resumes…
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <p className="text-[11px] mt-1" style={{ color: 'var(--p-text-muted)' }}>
                {formatUpdatedAgo(activeResume.updatedAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={function () { nav.push(RESUME_BUILDER); }}
                  className="rounded-[var(--p-radius)] px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-90 inline-flex items-center gap-1.5"
                  style={{
                    background: 'var(--p-accent)',
                    color: 'var(--p-bg)',
                  }}
                >
                  <FileText className="w-3.5 h-3.5" aria-hidden />
                  Edit resume
                </button>
                <button
                  type="button"
                  onClick={handleDuplicateActiveResume}
                  className="rounded-[var(--p-radius)] px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5"
                  style={{
                    background: 'var(--p-surface2)',
                    border: '1px solid var(--p-border)',
                    color: 'var(--p-text)',
                  }}
                >
                  <Copy className="w-3.5 h-3.5" aria-hidden />
                  Duplicate
                </button>
                <button
                  type="button"
                  disabled={!isResumeComplete}
                  title={isResumeComplete ? 'Export resume' : 'Complete all sections before exporting.'}
                  className="rounded-[var(--p-radius)] px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: 'var(--p-surface2)',
                    border: '1px solid var(--p-border)',
                    color: 'var(--p-text)',
                  }}
                >
                  <Download className="w-3.5 h-3.5" aria-hidden />
                  Export
                </button>
              </div>
              <p className="text-[11px] mt-2 font-medium" style={{ color: 'var(--p-text-dim)' }}>
                Sections
              </p>
              <CardRowList className="mt-0">
                {resumeSections.map(function (item, i) {
                  return (
                    <div key={i} className="flex items-center gap-2 text-[12px]">
                      {item.checked ? (
                        <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--p-success)' }} aria-hidden />
                      ) : (
                        <Circle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--p-text-muted)' }} aria-hidden />
                      )}
                      <span style={{ color: 'var(--p-text-muted)' }}>{item.label}</span>
                    </div>
                  );
                })}
              </CardRowList>
              {visibleResumes.length > 1 ? (
                <button
                  type="button"
                  className="mt-2 text-[12px] font-medium"
                  style={{ color: 'var(--p-accent)' }}
                  onClick={function () { setAllResumesDrawerOpen(true); }}
                >
                  View all resumes ({visibleResumes.length})
                </button>
              ) : null}
            </>
          ) : (
            <>
              <p style={{ color: 'var(--p-text-muted)', fontSize: 'var(--p-font-size-body)' }}>
                No resume yet. Open the Resume Builder to create your master resume.
              </p>
              <button
                type="button"
                onClick={function () {
                  nav.push(RESUME_BUILDER);
                }}
                className="mt-3 rounded-[var(--p-radius)] px-3 py-1.5 text-sm font-medium"
                style={{
                  background: 'var(--p-accent)',
                  color: 'var(--p-bg)',
                }}
              >
                Open Resume Builder
              </button>
            </>
          )}
        </ModuleCard>
      </div>

      {/* Referral Readiness Check: title + subtitle (for active resume) + severity labels Fix first / Improve / Optional. */}
      <div>
        <ModuleCard
          title="REFERRAL READINESS CHECK"
          subtitle={
            referralFindings.length > 0 && activeResume !== undefined
              ? 'for ' + activeResume.name + ' • ' + referralFindings.length + ' issues'
              : referralFindings.length > 0
                ? referralFindings.length + ' issues'
                : undefined
          }
          variant="dense"
        >
          <p className="text-[11px] mb-2" style={{ color: 'var(--p-text-muted)' }}>
            Quick issues that could lower your referral odds.
          </p>
          {referralFindings.length === 0 ? (
            <p style={{ color: 'var(--p-text-muted)', fontSize: 'var(--p-font-size-body)' }}>
              No issues. Add a resume and run checks to see suggestions here.
            </p>
          ) : (
            <CardRowList>
              {referralFindings.map(function (f, i) {
                const badgeVariant =
                  f.severity === 'fixFirst'
                    ? 'var(--p-warning-bg)'
                    : f.severity === 'improve'
                      ? 'var(--p-accent-muted)'
                      : 'var(--p-surface2)';
                const badgeBorder =
                  f.severity === 'fixFirst'
                    ? 'var(--p-warning)'
                    : f.severity === 'improve'
                      ? 'var(--p-accent-muted)'
                      : 'var(--p-border)';
                const badgeLabel =
                  f.severity === 'fixFirst' ? 'Fix first' : f.severity === 'improve' ? 'Improve' : 'Optional';
                return (
                  <div key={i} className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium mr-2"
                        style={{
                          background: badgeVariant,
                          border: '1px solid ' + badgeBorder,
                          color: 'var(--p-text)',
                        }}
                      >
                        {badgeLabel}
                      </span>
                      <span className="text-[12px]" style={{ color: 'var(--p-text)' }}>
                        {f.title}
                      </span>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--p-text-dim)' }}>
                        {f.body}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-[var(--p-radius)] px-2 py-1 text-[11px] font-medium flex-shrink-0"
                      style={{
                        background: 'var(--p-surface2)',
                        border: '1px solid var(--p-border)',
                        color: 'var(--p-text)',
                      }}
                    >
                      Fix now
                    </button>
                  </div>
                );
              })}
            </CardRowList>
          )}
        </ModuleCard>
      </div>

      {/* Tailoring Workspace card: subtitle "Using: <Active Resume>", Target job picker, checklist, Start Tailoring. */}
      <div ref={tailoringWorkspaceRef}>
        <ModuleCard
          title="TAILORING WORKSPACE"
          subtitle={activeResume !== undefined ? 'Using: ' + activeResume.name : undefined}
          variant="dense"
        >
          <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--p-text-dim)' }}>
            Target job
          </p>
          <TailoringTargetJobPicker
            targetJobIdForTailoring={targetJobIdForTailoring}
            setTargetJobForTailoring={setTargetJobForTailoring}
            targetJobSearch={targetJobSearch}
            setTargetJobSearch={setTargetJobSearch}
            onGoToSavedJobs={function () { nav.push(SAVED_JOBS); }}
            onJobSelected={function (job: Job) {
              publishSelectionContext({
                screen: 'resume-readiness',
                anchor: { type: 'job', id: job.id, label: job.title !== undefined && job.title !== '' ? job.title : job.id },
                payload: {
                  title: 'Target job: ' + (job.title !== undefined && job.title !== '' ? job.title : job.id),
                  subtitle: job.agency !== undefined ? job.agency : undefined,
                  lines: ['Selected for tailoring. Details appear in PathAdvisor.'],
                },
                dedupeKey: 'resume-readiness:target-job:' + job.id,
              });
            }}
          />
          <p className="text-[11px] font-medium mt-3 mb-1" style={{ color: 'var(--p-text-dim)' }}>
            Tailoring Checklist
          </p>
          <CardRowList className="mt-0">
            {tailoringChecklist.map(function (item, i) {
              return (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  {item.checked ? (
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--p-success)' }} aria-hidden />
                  ) : (
                    <Circle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--p-text-muted)' }} aria-hidden />
                  )}
                  <span style={{ color: 'var(--p-text-muted)' }}>{item.label}</span>
                </div>
              );
            })}
          </CardRowList>
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <div className="relative group inline-block">
              {hasTailorJob ? (
                <button
                  type="button"
                  className="rounded-[var(--p-radius)] px-3 py-1.5 text-sm font-medium"
                  style={{
                    background: 'var(--p-surface2)',
                    border: '1px solid var(--p-border)',
                    color: 'var(--p-text)',
                  }}
                >
                  Start Tailoring
                </button>
              ) : (
                <Tooltip
                  side="top"
                  content={
                    <>
                      <p className="font-semibold" style={{ color: 'var(--p-text)' }}>Start Tailoring</p>
                      <p>Select a target job first to enable tailoring.</p>
                    </>
                  }
                >
                  <button
                    type="button"
                    disabled
                    className="rounded-[var(--p-radius)] px-3 py-1.5 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background: 'var(--p-surface2)',
                      border: '1px solid var(--p-border)',
                      color: 'var(--p-text)',
                    }}
                  >
                    Start Tailoring
                  </button>
                </Tooltip>
              )}
            </div>
            <AskPathAdvisorButton
              onClick={function () {
                openBriefing({
                  id: 'tailoring-gaps',
                  title: 'Tailoring gaps',
                  sourceLabel: 'Resume Readiness',
                  sections: [
                    {
                      heading: 'Gap analysis',
                      body: 'PathAdvisor can compare your resume to the job and suggest keyword and experience gaps. Select a target job and run tailoring to see suggestions.',
                    },
                  ],
                });
              }}
              size="sm"
              tooltipText="Ask PathAdvisor for gaps between your resume and the target job."
              tooltipId="career-tailoring-ask-pathadvisor-tooltip"
            />
          </div>
        </ModuleCard>
      </div>

      {/* Career Narrative card: 3 bullets + Update narrative, Generate options (PathAdvisor). */}
      <div>
        <ModuleCard title="CAREER NARRATIVE" variant="dense">
          {narrativeBullets.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--p-text-muted)' }}>
              Your story in 3 bullets. Complete your resume to unlock narrative tools.
            </p>
          ) : (
            <ul className="list-disc pl-4 space-y-1 text-[12px]" style={{ color: 'var(--p-accent)' }}>
              {narrativeBullets.map(function (bullet, i) {
                return (
                  <li key={i} style={{ color: 'var(--p-text)' }}>
                    {bullet}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={narrativeBullets.length === 0}
              className="rounded-[var(--p-radius)] px-3 py-1.5 text-sm font-medium disabled:opacity-60"
              style={{
                background: 'var(--p-accent)',
                color: 'var(--p-bg)',
              }}
            >
              Update narrative
            </button>
            <button
              type="button"
              className="rounded-[var(--p-radius)] px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5"
              style={{
                background: 'var(--p-surface2)',
                border: '1px solid var(--p-border)',
                color: 'var(--p-accent)',
              }}
              onClick={function () {
                openBriefing({
                  id: 'narrative-options',
                  title: 'Generate narrative options',
                  sourceLabel: 'Resume Readiness',
                  sections: [
                    {
                      heading: 'PathAdvisor can help',
                      body: 'Generate options for your career narrative based on your resume. Open PathAdvisor and ask for narrative suggestions.',
                    },
                  ],
                });
              }}
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden />
              Generate options
            </button>
          </div>
        </ModuleCard>
      </div>

      {/* Proof Library: STAR stories, Bullet bank, Metrics — 3 panels with label, count, Add + View. */}
      <div>
        <ModuleCard
          title="PROOF LIBRARY"
          subtitle="Reusable evidence you can drop into bullets and tailoring."
          variant="dense"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              className="rounded-[var(--p-radius)] p-3"
              style={{
                background: 'var(--p-surface2)',
                border: '1px solid var(--p-border)',
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[var(--p-letter-spacing-section)] mb-1" style={{ color: 'var(--p-text-dim)' }}>
                STAR stories
              </p>
              <p className="text-xl font-semibold" style={{ color: 'var(--p-text)' }}>
                {proofLibraryCounts.starStories}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={function () { setProofLibraryAddModal('star'); setProofLibraryAddForm({ title: '', content: '' }); }}
                  className="rounded-[var(--p-radius)] px-2 py-1 text-[12px] font-medium"
                  style={{ background: 'var(--p-accent)', color: 'var(--p-bg)' }}
                >
                  Add STAR story
                </button>
                <button
                  type="button"
                  onClick={function () { setProofLibraryViewDrawer('star'); }}
                  className="rounded-[var(--p-radius)] px-2 py-1 text-[12px] font-medium"
                  style={{
                    background: 'var(--p-surface)',
                    border: '1px solid var(--p-border)',
                    color: 'var(--p-text)',
                  }}
                >
                  View
                </button>
              </div>
            </div>
            <div
              className="rounded-[var(--p-radius)] p-3"
              style={{
                background: 'var(--p-surface2)',
                border: '1px solid var(--p-border)',
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[var(--p-letter-spacing-section)] mb-1" style={{ color: 'var(--p-text-dim)' }}>
                Bullet bank
              </p>
              <p className="text-xl font-semibold" style={{ color: 'var(--p-text)' }}>
                {proofLibraryCounts.bulletBank}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={function () { setProofLibraryAddModal('bullet'); setProofLibraryAddForm({ title: '', content: '' }); }}
                  className="rounded-[var(--p-radius)] px-2 py-1 text-[12px] font-medium"
                  style={{ background: 'var(--p-accent)', color: 'var(--p-bg)' }}
                >
                  Add bullet
                </button>
                <button
                  type="button"
                  onClick={function () { setProofLibraryViewDrawer('bullet'); }}
                  className="rounded-[var(--p-radius)] px-2 py-1 text-[12px] font-medium"
                  style={{
                    background: 'var(--p-surface)',
                    border: '1px solid var(--p-border)',
                    color: 'var(--p-text)',
                  }}
                >
                  View
                </button>
              </div>
            </div>
            <div
              className="rounded-[var(--p-radius)] p-3"
              style={{
                background: 'var(--p-surface2)',
                border: '1px solid var(--p-border)',
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[var(--p-letter-spacing-section)] mb-1" style={{ color: 'var(--p-text-dim)' }}>
                Metrics
              </p>
              <p className="text-xl font-semibold" style={{ color: 'var(--p-text)' }}>
                {proofLibraryCounts.metrics}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={function () { setProofLibraryAddModal('metric'); setProofLibraryAddForm({ title: '', content: '' }); }}
                  className="rounded-[var(--p-radius)] px-2 py-1 text-[12px] font-medium"
                  style={{ background: 'var(--p-accent)', color: 'var(--p-bg)' }}
                >
                  Add metric
                </button>
                <button
                  type="button"
                  onClick={function () { setProofLibraryViewDrawer('metric'); }}
                  className="rounded-[var(--p-radius)] px-2 py-1 text-[12px] font-medium"
                  style={{
                    background: 'var(--p-surface)',
                    border: '1px solid var(--p-border)',
                    color: 'var(--p-text)',
                  }}
                >
                  View
                </button>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--p-border)' }}>
            <Tooltip
              contentId="proof-library-import-tooltip"
              side="top"
              content="Paste notes. PathOS can extract bullets, STAR stories, and metrics."
            >
              <button
                type="button"
                className="rounded-[var(--p-radius)] px-2 py-1 text-[12px] font-medium inline-flex items-center gap-1"
                style={{
                  background: 'var(--p-surface2)',
                  border: '1px solid var(--p-border)',
                  color: 'var(--p-text-muted)',
                }}
              >
                <Upload className="w-3.5 h-3.5" aria-hidden />
                Import from notes (optional)
              </button>
            </Tooltip>
          </div>
        </ModuleCard>
      </div>

      {/* Proof Library Add modal: Title + Content + Save (local-only stub). */}
      {proofLibraryAddModal !== null ? (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: Z_DIALOG }} role="dialog" aria-label="Add to Proof Library">
          <div
            className="absolute inset-0"
            style={{ background: 'var(--p-bg)', opacity: 0.7 }}
            onClick={function () { setProofLibraryAddModal(null); setProofLibraryAddForm({ title: '', content: '' }); }}
          />
          <div
            className="relative rounded-[var(--p-radius-lg)] border p-4 w-full max-w-md"
            style={{
              background: 'var(--p-surface)',
              borderColor: 'var(--p-border)',
              boxShadow: 'var(--p-shadow-elev-1)',
            }}
          >
            <h3 className="font-semibold text-[14px] mb-3" style={{ color: 'var(--p-text)' }}>
              {proofLibraryAddModal === 'star' ? 'Add STAR story' : proofLibraryAddModal === 'bullet' ? 'Add bullet' : 'Add metric'}
            </h3>
            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--p-text-dim)' }}>
              Title
            </label>
            <input
              type="text"
              value={proofLibraryAddForm.title}
              onChange={function (e) { setProofLibraryAddForm(function (p) { return { title: e.target.value, content: p.content }; }); }}
              className="w-full rounded-[var(--p-radius)] px-2 py-1.5 text-[12px] border mb-3"
              style={{
                background: 'var(--p-surface2)',
                borderColor: 'var(--p-border)',
                color: 'var(--p-text)',
              }}
            />
            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--p-text-dim)' }}>
              Content
            </label>
            <textarea
              value={proofLibraryAddForm.content}
              onChange={function (e) { setProofLibraryAddForm(function (p) { return { title: p.title, content: e.target.value }; }); }}
              rows={3}
              className="w-full rounded-[var(--p-radius)] px-2 py-1.5 text-[12px] border mb-3"
              style={{
                background: 'var(--p-surface2)',
                borderColor: 'var(--p-border)',
                color: 'var(--p-text)',
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={function () { setProofLibraryAddModal(null); setProofLibraryAddForm({ title: '', content: '' }); }}
                className="rounded-[var(--p-radius)] px-3 py-1.5 text-[12px] font-medium"
                style={{
                  background: 'var(--p-surface2)',
                  border: '1px solid var(--p-border)',
                  color: 'var(--p-text)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProofLibrarySave}
                className="rounded-[var(--p-radius)] px-3 py-1.5 text-[12px] font-medium"
                style={{ background: 'var(--p-accent)', color: 'var(--p-bg)' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Proof Library View drawer: list stub for STAR stories, bullet bank, or metrics. */}
      {proofLibraryViewDrawer !== null ? (
        <div className="fixed inset-0 flex justify-end" style={{ zIndex: Z_DIALOG }} role="dialog" aria-label="View Proof Library">
          <div
            className="absolute inset-0"
            style={{ background: 'var(--p-bg)', opacity: 0.7 }}
            onClick={function () { setProofLibraryViewDrawer(null); }}
          />
          <div
            className="relative w-full max-w-md flex flex-col"
            style={{
              background: 'var(--p-surface)',
              borderLeft: '1px solid var(--p-border)',
              boxShadow: 'var(--p-shadow-elev-1)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--p-border)' }}>
              <h2 className="font-semibold text-[16px]" style={{ color: 'var(--p-text)' }}>
                {proofLibraryViewDrawer === 'star' ? 'STAR stories' : proofLibraryViewDrawer === 'bullet' ? 'Bullet bank' : 'Metrics'}
              </h2>
              <button
                type="button"
                onClick={function () { setProofLibraryViewDrawer(null); }}
                className="rounded-[var(--p-radius)] size-9 inline-flex items-center justify-center hover:bg-[var(--p-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] focus-visible:ring-offset-2"
                style={{ color: 'var(--p-text-muted)' }}
                aria-label="Close"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {proofLibraryViewDrawer === 'star' && proofLibraryItems.starStories.length === 0 ? (
                <p className="text-[12px]" style={{ color: 'var(--p-text-muted)' }}>No STAR stories yet. Add one from the Proof Library card.</p>
              ) : proofLibraryViewDrawer === 'bullet' && proofLibraryItems.bulletBank.length === 0 ? (
                <p className="text-[12px]" style={{ color: 'var(--p-text-muted)' }}>No bullets yet. Add one from the Proof Library card.</p>
              ) : proofLibraryViewDrawer === 'metric' && proofLibraryItems.metrics.length === 0 ? (
                <p className="text-[12px]" style={{ color: 'var(--p-text-muted)' }}>No metrics yet. Add one from the Proof Library card.</p>
              ) : (
                <CardRowList>
                  {(proofLibraryViewDrawer === 'star' ? proofLibraryItems.starStories : proofLibraryViewDrawer === 'bullet' ? proofLibraryItems.bulletBank : proofLibraryItems.metrics).map(function (item, i) {
                    return (
                      <div key={i} className="py-2">
                        <p className="text-[12px] font-medium" style={{ color: 'var(--p-text)' }}>{item.title}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--p-text-muted)' }}>{item.content}</p>
                      </div>
                    );
                  })}
                </CardRowList>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Toast: subtle confirmation for duplicate / create tailored; with Undo when archiving. */}
      {toastMessage !== null && toastMessage !== '' ? (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-[var(--p-radius)] text-[12px] font-medium flex items-center gap-2"
          style={{
            zIndex: Z_DIALOG,
            background: 'var(--p-surface)',
            border: '1px solid var(--p-border)',
            color: 'var(--p-text)',
            boxShadow: 'var(--p-shadow-elev-1)',
          }}
          role="status"
        >
          <span>{toastMessage}</span>
          {toastUndoResumeId !== null && toastUndoResumeId !== '' ? (
            <button
              type="button"
              className="font-semibold underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded"
              style={{ color: 'var(--p-accent)' }}
              onClick={function () {
                unarchiveResume(toastUndoResumeId as string);
              }}
            >
              Undo
            </button>
          ) : null}
        </div>
      ) : null}

      {/* All Resumes drawer: row layout, chips, Set active / Archive; Active indicator for active row */}
      {allResumesDrawerOpen ? (
        <div
          className="fixed inset-0 flex justify-end"
          style={{ zIndex: Z_DIALOG }}
          role="dialog"
          aria-label="All Resumes"
        >
          <div
            className="absolute inset-0"
            style={{ background: 'var(--p-bg)', opacity: 0.7 }}
            onClick={function () { setAllResumesDrawerOpen(false); }}
            onKeyDown={function () {}}
          />
          <div
            className="relative w-full max-w-md flex flex-col"
            style={{
              background: 'var(--p-surface)',
              borderLeft: '1px solid var(--p-border)',
              boxShadow: 'var(--p-shadow-elev-1)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--p-border)' }}>
              <h2 className="font-semibold text-[16px]" style={{ color: 'var(--p-text)' }}>
                All Resumes
              </h2>
              <button
                type="button"
                onClick={function () { setAllResumesDrawerOpen(false); }}
                className="rounded-[var(--p-radius)] size-9 inline-flex items-center justify-center hover:bg-[var(--p-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] focus-visible:ring-offset-2"
                style={{ color: 'var(--p-text-muted)' }}
                aria-label="Close"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <label className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: 'var(--p-border)' }}>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={function (e) { setShowArchived(e.target.checked); }}
                className="rounded"
              />
              <span className="text-[12px]" style={{ color: 'var(--p-text)' }}>Show archived</span>
            </label>
            <div className="flex-1 overflow-y-auto p-3">
              {(showArchived ? resumes : visibleResumes).map(function (r) {
                const isActive = r.id === activeResumeId;
                const isArchived = r.archived === true;
                const moreOpen = drawerRowMoreOpenId === r.id;
                return (
                  <div
                    key={r.id}
                    className="py-3 border-b last:border-b-0"
                    style={{ borderColor: 'var(--p-border)' }}
                  >
                    {/* Line 1: name (truncate) left, action button right (Set active | disabled Active). */}
                    <div className="flex items-center justify-between gap-2 min-h-0">
                      <span className="font-medium truncate text-[12px] min-w-0" style={{ color: 'var(--p-text)' }}>
                        {r.name}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isActive ? (
                          <button
                            type="button"
                            disabled
                            className="rounded-[var(--p-radius)] px-2 py-1 text-[11px] font-medium opacity-70"
                            style={{
                              background: 'var(--p-surface2)',
                              border: '1px solid var(--p-border)',
                              color: 'var(--p-text-muted)',
                            }}
                          >
                            Active
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={function () {
                              setActiveResumeId(r.id);
                              publishSelectionContext({
                                screen: 'resume-readiness',
                                anchor: { type: 'resume', id: r.id, label: r.name },
                                payload: {
                                  title: 'Active resume: ' + r.name,
                                  subtitle: r.targetJobTitle !== undefined ? r.targetJobTitle : undefined,
                                  lines: ['Selected for editing and tailoring.'],
                                },
                                dedupeKey: 'resume-readiness:resume:' + r.id,
                              });
                            }}
                            className="rounded-[var(--p-radius)] px-2 py-1 text-[11px] font-medium"
                            style={{
                              background: 'var(--p-surface2)',
                              border: '1px solid var(--p-border)',
                              color: 'var(--p-text)',
                            }}
                          >
                            Set active
                          </button>
                        )}
                        {isArchived ? null : (
                          <DrawerTooltip
                            content="Archive resume"
                            contentId={'all-resumes-archive-tooltip-' + r.id}
                            side="left"
                            sideOffset={8}
                            collisionPadding={12}
                          >
                            <button
                              type="button"
                              onClick={function () { archiveResume(r.id); }}
                              className="rounded-[var(--p-radius)] p-1"
                              style={{
                                background: 'var(--p-surface2)',
                                border: '1px solid var(--p-border)',
                                color: 'var(--p-text-muted)',
                              }}
                              aria-label="Archive resume"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </DrawerTooltip>
                        )}
                        <div className="relative inline-block">
                          <DrawerTooltip
                            content="More actions"
                            contentId={'all-resumes-more-tooltip-' + r.id}
                            side="left"
                            sideOffset={8}
                            collisionPadding={12}
                          >
                            <button
                              type="button"
                              onClick={function () { setDrawerRowMoreOpenId(moreOpen ? null : r.id); }}
                              className="rounded-[var(--p-radius)] p-1"
                              style={{
                                background: moreOpen ? 'var(--p-surface2)' : 'transparent',
                                border: '1px solid var(--p-border)',
                                color: 'var(--p-text-muted)',
                              }}
                              aria-label="More actions"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DrawerTooltip>
                          {moreOpen ? (
                            <div
                              className="absolute right-0 top-full mt-1 w-48 rounded-[var(--p-radius)] border py-1"
                              style={{
                                background: 'var(--p-surface)',
                                borderColor: 'var(--p-border)',
                                boxShadow: 'var(--p-shadow-elev-1)',
                                zIndex: Z_POPOVER,
                              }}
                            >
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-[12px] flex items-center gap-2"
                                style={{ color: 'var(--p-danger)' }}
                                onClick={function () {
                                  setDrawerRowMoreOpenId(null);
                                  setDeleteConfirmResumeId(r.id);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete permanently
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {/* Line 2: chips (Type + Status only) left, Updated right; compact, no wrap. */}
                    <div className="flex items-center justify-between gap-2 mt-1 min-h-0">
                      <div className="flex flex-nowrap items-center gap-1 flex-shrink-0 min-w-0">
                        <ResumeTypeChip type={r.type} />
                        <ResumeStatusChip status={r.status} />
                        {isArchived ? (
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0"
                            style={{
                              background: 'var(--p-surface2)',
                              border: '1px solid var(--p-border)',
                              color: 'var(--p-text-muted)',
                            }}
                          >
                            Archived
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--p-text-muted)' }}>
                        Updated {formatUpdatedAgo(r.updatedAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete resume confirm dialog (drawer only). */}
      {deleteConfirmResumeId !== null ? (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: Z_DIALOG }}
          role="dialog"
          aria-labelledby="delete-resume-dialog-title"
          aria-describedby="delete-resume-dialog-desc"
        >
          <div
            className="absolute inset-0"
            style={{ background: 'var(--p-bg)', opacity: 0.7 }}
            onClick={function () { setDeleteConfirmResumeId(null); }}
          />
          <div
            className="relative rounded-[var(--p-radius-lg)] border p-4 w-full max-w-sm"
            style={{
              background: 'var(--p-surface)',
              borderColor: 'var(--p-border)',
              boxShadow: 'var(--p-shadow-elev-1)',
            }}
          >
            <h3 id="delete-resume-dialog-title" className="font-semibold text-[14px] mb-2" style={{ color: 'var(--p-text)' }}>
              Delete resume?
            </h3>
            <p id="delete-resume-dialog-desc" className="text-[12px] mb-4" style={{ color: 'var(--p-text-muted)' }}>
              This removes the resume from this device. This can&apos;t be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={function () { setDeleteConfirmResumeId(null); }}
                className="rounded-[var(--p-radius)] px-3 py-1.5 text-[12px] font-medium"
                style={{
                  background: 'var(--p-surface2)',
                  border: '1px solid var(--p-border)',
                  color: 'var(--p-text)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={function () {
                  deleteResume(deleteConfirmResumeId as string);
                  setDeleteConfirmResumeId(null);
                }}
                className="rounded-[var(--p-radius)] px-3 py-1.5 text-[12px] font-medium"
                style={{
                  background: 'var(--p-danger)',
                  color: 'var(--p-bg)',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Create tailored version drawer: searchable saved job picker */}
      {createTailoredDrawerOpen ? (
        <div
          className="fixed inset-0 flex justify-end"
          style={{ zIndex: Z_DIALOG }}
          role="dialog"
          aria-label="Create tailored version"
        >
          <div
            className="absolute inset-0"
            style={{ background: 'var(--p-bg)', opacity: 0.7 }}
            onClick={function () {
              setCreateTailoredDrawerOpen(false);
              setCreateTailoredSelectedJobId(null);
            }}
          />
          <div
            className="relative w-full max-w-md flex flex-col"
            style={{
              background: 'var(--p-surface)',
              borderLeft: '1px solid var(--p-border)',
              boxShadow: 'var(--p-shadow-elev-1)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--p-border)' }}>
              <h2 className="font-semibold text-[16px]" style={{ color: 'var(--p-text)' }}>
                Create tailored version
              </h2>
              <button
                type="button"
                onClick={function () {
                  setCreateTailoredDrawerOpen(false);
                  setCreateTailoredSelectedJobId(null);
                }}
                className="rounded-[var(--p-radius)] size-9 inline-flex items-center justify-center hover:bg-[var(--p-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] focus-visible:ring-offset-2"
                style={{ color: 'var(--p-text-muted)' }}
                aria-label="Close"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <div className="px-4 py-2 text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
              Step 1: Select saved job
            </div>
            <div className="px-4 pb-2">
              <input
                type="text"
                placeholder="Search saved jobs…"
                value={createTailoredSearch}
                className="w-full rounded-[var(--p-radius)] px-3 py-2 text-[12px] border"
                style={{
                  background: 'var(--p-surface2)',
                  borderColor: 'var(--p-border)',
                  color: 'var(--p-text)',
                }}
                onChange={function (e) { setCreateTailoredSearch(e.target.value); }}
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {createTailoredFilteredJobs.map(function (j) {
                const isSel = j.id === createTailoredSelectedJobId;
                return (
                  <button
                    key={j.id}
                    type="button"
                    className="w-full text-left rounded-[var(--p-radius)] px-3 py-2 mb-1"
                    style={{
                      background: isSel ? 'var(--p-accent-bg)' : 'var(--p-surface2)',
                      border: '1px solid ' + (isSel ? 'var(--p-accent-muted)' : 'var(--p-border)'),
                      color: 'var(--p-text)',
                    }}
                    onClick={function () { setCreateTailoredSelectedJobId(j.id); }}
                  >
                    <JobOptionRow job={j} />
                  </button>
                );
              })}
              {createTailoredFilteredJobs.length === 0 ? (
                <p className="text-[12px]" style={{ color: 'var(--p-text-muted)' }}>
                  {savedJobsForPicker.length === 0 ? 'No saved jobs. Save jobs from Job Search first.' : 'No jobs match your search.'}
                </p>
              ) : null}
            </div>
            <div className="px-4 py-3 border-t flex justify-end" style={{ borderColor: 'var(--p-border)' }}>
              <button
                type="button"
                disabled={createTailoredSelectedJobId === null}
                title={createTailoredSelectedJobId === null ? 'Select a saved job to create a tailored resume.' : 'Create tailored resume'}
                className="rounded-[var(--p-radius)] px-4 py-2 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--p-accent)',
                  color: 'var(--p-bg)',
                }}
                onClick={handleCreateTailoredFromJob}
              >
                Create tailored resume
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
