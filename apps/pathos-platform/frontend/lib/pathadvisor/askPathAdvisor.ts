/**
 * ============================================================================
 * ASK PATHADVISOR GLOBAL FUNCTION (Day 43)
 * ============================================================================
 * 
 * FILE PURPOSE:
 * Single global function to invoke PathAdvisor from any "Ask PathAdvisor" entry point.
 * This is the ONLY API modules should call for Ask actions. Enforces the Day 43 contract:
 * Ask → Anchor → Focus Mode (always opens Focus Mode immediately).
 * 
 * WHERE IT FITS IN ARCHITECTURE:
 * - Orchestration Layer: Coordinates anchor creation, store updates, context injection, Focus Mode opening
 * - Used by: All "Ask PathAdvisor" buttons/CTAs throughout the app
 * - Integrates: PathAdvisor store (anchor), AdvisorContext (context/prompts), Focus Mode (opens via context)
 * 
 * KEY CONCEPTS:
 * - Anchor-first: Always creates and sets anchor before opening Focus Mode
 * - Focus Mode is primary: Always opens Focus Mode (never just sidebar)
 * - Context injection: Uses existing AdvisorContext mechanism for prompts/threads
 * - Sidebar mirroring: Sidebar still receives state updates but is not primary feedback
 * 
 * HOW IT WORKS (STEP BY STEP):
 * 1. User clicks "Ask PathAdvisor" button
 * 2. askPathAdvisor() is called with source, sourceId, sourceLabel, summary, contextPayload
 * 3. Builds PathAdvisorAnchor using buildAnchorId() and normalizeSourceLabel()
 * 4. Sets anchor in PathAdvisor store via setActiveAnchor(anchor)
 * 5. Injects context into AdvisorContext (sets context, pending prompt if provided)
 * 6. Opens Focus Mode immediately via setShouldOpenFocusMode(true)
 * 7. Returns anchor id for tracking/logging
 * 
 * DAY 43 CONTRACT:
 * 1. Set PathAdvisorAnchor (first-class structured object) ✓
 * 2. Inject structured context (existing mechanism OK) ✓
 * 3. Open Focus Mode immediately ✓
 * 4. Focus Mode renders anchored content immediately (anchor header + summary + scoped prompts) ✓
 * 
 * NON-NEGOTIABLE:
 * - Every Ask action MUST call this function (no direct context/store manipulation)
 * - Focus Mode MUST open immediately (never just sidebar update)
 * - Anchor MUST be set before opening Focus Mode
 */

import type { PathAdvisorAnchorSource } from './anchors';
import { buildAnchorId, normalizeSourceLabel, type PathAdvisorAnchor } from './anchors';
import { usePathAdvisorStore } from '@/store/pathAdvisorStore';
import type { AdvisorContextData } from '@/contexts/advisor-context';

/**
 * Context payload for injecting context into AdvisorContext.
 * 
 * PURPOSE:
 * Optional payload for setting AdvisorContext fields (source, jobTitle, etc.)
 * and/or seeding a pending prompt. Uses existing AdvisorContext mechanism.
 * 
 * FIELDS:
 * - source: AdvisorContext source value (maps to AdvisorContextData.source)
 * - prompt: Optional prompt text to seed (sets pendingPrompt)
 * - jobTitle, jobSeries, jobGrade, etc.: Optional job context fields
 * - scenarioId, scenarioName, etc.: Optional scenario context fields
 */
export interface AskPathAdvisorContextPayload {
  /** AdvisorContext source value (maps to AdvisorContextData.source) */
  source?: AdvisorContextData['source'];
  /** Optional prompt text to seed (sets pendingPrompt in AdvisorContext) */
  prompt?: string;
  /** Optional job context fields */
  jobTitle?: string;
  jobSeries?: string;
  jobGrade?: string;
  jobAgency?: string;
  jobLocation?: string;
  /** Optional scenario context fields */
  scenarioId?: string;
  scenarioName?: string;
  scenarioType?: string;
  baselineLabel?: string;
  netMonthlyDelta?: number;
  fiveYearDelta?: number;
  tenYearDelta?: number;
  keyHighlights?: string[];
  isComparison?: boolean;
  comparedScenarios?: string[];
}

/**
 * Preferred surface for PathAdvisor when invoked via askPathAdvisor().
 * 
 * PURPOSE (Day 43 Follow-up):
 * Different contexts benefit from different PathAdvisor surfaces:
 * - 'focus': Full-screen Focus Mode (default, always visible)
 * - 'dock': Side-by-side docked panel within the current page layout
 * 
 * WHY 'dock' EXISTS (Resume Builder UX):
 * Resume Builder users need to view/edit their resume while chatting with
 * PathAdvisor. Full Focus Mode takeover hides the resume, breaking the
 * side-by-side workflow. 'dock' opens a docked panel that coexists with
 * the resume editor.
 * 
 * DAY 43 VISIBILITY CONTRACT:
 * Both surfaces guarantee immediate visibility - the user always sees
 * PathAdvisor open. 'dock' just opens a different surface than 'focus'.
 */
export type PreferredSurface = 'focus' | 'dock';

/**
 * Arguments for askPathAdvisor function.
 * 
 * PURPOSE:
 * Parameters for invoking PathAdvisor from any entry point. Includes anchor
 * parameters (source, sourceId, sourceLabel, summary) and optional context payload.
 * 
 * REQUIRED FIELDS:
 * - source: Anchor source type (job, resume, benefits, etc.)
 * - sourceLabel: User-facing name for the anchor origin
 * - summary: Short reason/context for why the user asked
 * 
 * OPTIONAL FIELDS:
 * - sourceId: Optional identifier for the specific item (e.g., job ID)
 * - contextPayload: Optional context to inject into AdvisorContext
 * - contextFunctions: Required AdvisorContext functions (from useAdvisorContext hook)
 * - preferredSurface: Which PathAdvisor surface to open ('focus' | 'dock', default: 'focus')
 */
export interface AskPathAdvisorParams {
  /** Anchor source type (job, resume, benefits, etc.) */
  source: PathAdvisorAnchorSource;
  /** Optional identifier for the specific item (e.g., job ID, resume ID) */
  sourceId?: string;
  /** User-facing name for the anchor origin (e.g., "GS-14 Program Analyst") */
  sourceLabel: string;
  /** Short reason/context for why the user asked (e.g., "Considering this position") */
  summary: string;
  /** Optional context payload for injecting into AdvisorContext */
  contextPayload?: AskPathAdvisorContextPayload;
  /** Required AdvisorContext functions (from useAdvisorContext hook) */
  contextFunctions: {
    setContext: (context: AdvisorContextData) => void;
    setPendingPrompt: (prompt: string | null) => void;
    setShouldOpenFocusMode: (open: boolean) => void;
    setOnPathAdvisorClose?: (callback: (() => void) | null) => void;
  };
  /** Optional callback to restore focus when PathAdvisor closes */
  onClose?: () => void;
  /**
   * Preferred PathAdvisor surface to open ('focus' | 'dock').
   * 
   * PURPOSE (Day 43 Follow-up):
   * - 'focus' (default): Opens full-screen Focus Mode (existing behavior)
   * - 'dock': Opens docked side-by-side panel (new for Resume Builder)
   * 
   * WHY RESUME BUILDER NEEDS 'dock':
   * Users editing resumes need to see their resume AND PathAdvisor simultaneously.
   * Full Focus Mode hides the resume, breaking the editing workflow.
   * 
   * DAY 43 CONTRACT PRESERVED:
   * Both surfaces guarantee immediate visibility. The anchor is set before
   * opening either surface, and the user always sees PathAdvisor respond.
   */
  preferredSurface?: PreferredSurface;
}

/**
 * Global function to invoke PathAdvisor from any "Ask PathAdvisor" entry point.
 * 
 * PURPOSE:
 * Single canonical API for all Ask actions. Enforces Day 43 contract:
 * 1. Set PathAdvisorAnchor
 * 2. Inject structured context
 * 3. Open Focus Mode immediately
 * 
 * BEHAVIOR:
 * 1. Builds PathAdvisorAnchor from params (using buildAnchorId and normalizeSourceLabel)
 * 2. Sets active anchor in PathAdvisor store
 * 3. Injects context into AdvisorContext (if contextPayload provided)
 * 4. Seeds pending prompt (if contextPayload.prompt provided)
 * 5. Opens Focus Mode immediately via setShouldOpenFocusMode(true)
 * 6. Returns anchor id for tracking
 * 
 * DAY 43 CONTRACT ENFORCEMENT:
 * - Anchor is ALWAYS set before opening Focus Mode
 * - Focus Mode is ALWAYS opened (never just sidebar update)
 * - Context injection uses existing AdvisorContext mechanism (no breaking changes)
 * 
 * USAGE:
 * ```tsx
 * const advisorContext = useAdvisorContext();
 * 
 * function handleAsk() {
 *   askPathAdvisor({
 *     source: 'job',
 *     sourceId: 'job-123',
 *     sourceLabel: 'GS-14 Program Analyst',
 *     summary: 'Considering this position',
 *     contextPayload: {
 *       source: 'job-details',
 *       prompt: 'Tell me about this job',
 *       jobTitle: 'Program Analyst',
 *     },
 *     contextFunctions: advisorContext,
 *   });
 * }
 * ```
 * 
 * @param params - AskPathAdvisorParams with source, sourceLabel, summary, etc.
 * @returns Anchor ID string for tracking/logging
 */
export function askPathAdvisor(params: AskPathAdvisorParams): string {
  const source = params.source;
  const sourceId = params.sourceId;
  const sourceLabel = params.sourceLabel;
  const summary = params.summary;
  const contextPayload = params.contextPayload;
  const contextFunctions = params.contextFunctions;
  const onClose = params.onClose;
  // Day 43 Follow-up: Default to 'focus' if not specified (preserves existing behavior)
  const preferredSurface = params.preferredSurface || 'focus';

  // STEP 1: Build PathAdvisorAnchor
  // Build unique anchor ID using source and optional sourceId
  const anchorId = buildAnchorId(source, sourceId);
  
  // Normalize source label to ensure consistent formatting
  const normalizedLabel = normalizeSourceLabel(sourceLabel, source);
  
  // Create anchor object
  const anchor: PathAdvisorAnchor = {
    id: anchorId,
    source: source,
    sourceId: sourceId,
    sourceLabel: normalizedLabel,
    summary: summary,
    createdAt: Date.now(),
  };

  // STEP 2: Set active anchor in PathAdvisor store
  // Get setActiveAnchor function from store (direct call, no hook - this is a utility function)
  // Note: We need to get the store instance directly since this is not a React component
  const store = usePathAdvisorStore.getState();
  store.setActiveAnchor(anchor);

  // STEP 3: Inject structured context (if contextPayload provided)
  // Uses existing AdvisorContext mechanism - no breaking changes
  if (contextPayload) {
    const contextData: AdvisorContextData = {
      source: contextPayload.source || 'recommendations', // Default to 'recommendations' if not provided
    };

    // Map optional job context fields
    if (contextPayload.jobTitle) contextData.jobTitle = contextPayload.jobTitle;
    if (contextPayload.jobSeries) contextData.jobSeries = contextPayload.jobSeries;
    if (contextPayload.jobGrade) contextData.jobGrade = contextPayload.jobGrade;
    if (contextPayload.jobAgency) contextData.jobAgency = contextPayload.jobAgency;
    if (contextPayload.jobLocation) contextData.jobLocation = contextPayload.jobLocation;

    // Map optional scenario context fields
    if (contextPayload.scenarioId) contextData.scenarioId = contextPayload.scenarioId;
    if (contextPayload.scenarioName) contextData.scenarioName = contextPayload.scenarioName;
    if (contextPayload.scenarioType) contextData.scenarioType = contextPayload.scenarioType;
    if (contextPayload.baselineLabel) contextData.baselineLabel = contextPayload.baselineLabel;
    if (contextPayload.netMonthlyDelta !== undefined) contextData.netMonthlyDelta = contextPayload.netMonthlyDelta;
    if (contextPayload.fiveYearDelta !== undefined) contextData.fiveYearDelta = contextPayload.fiveYearDelta;
    if (contextPayload.tenYearDelta !== undefined) contextData.tenYearDelta = contextPayload.tenYearDelta;
    if (contextPayload.keyHighlights) contextData.keyHighlights = contextPayload.keyHighlights;
    if (contextPayload.isComparison !== undefined) contextData.isComparison = contextPayload.isComparison;
    if (contextPayload.comparedScenarios) contextData.comparedScenarios = contextPayload.comparedScenarios;

    // Set context in AdvisorContext
    contextFunctions.setContext(contextData);

    // Seed pending prompt if provided
    if (contextPayload.prompt) {
      contextFunctions.setPendingPrompt(contextPayload.prompt);
    }
  }

  // Store focus restore callback if provided
  if (onClose && contextFunctions.setOnPathAdvisorClose) {
    contextFunctions.setOnPathAdvisorClose(onClose);
  }

  // ============================================================================
  // STEP 4: OPEN PATHADVISOR SURFACE (Day 43 Follow-up - preferredSurface)
  // ============================================================================
  //
  // DAY 43 CONTRACT (PRESERVED):
  // PathAdvisor MUST open a visible surface immediately. The user always sees
  // the PathAdvisor interface respond to their Ask action.
  //
  // SURFACE SELECTION (Day 43 Follow-up):
  // - 'focus' (default): Opens full-screen Focus Mode (existing behavior)
  // - 'dock': Opens docked side-by-side panel (new for Resume Builder)
  //
  // WHY RESUME BUILDER NEEDS 'dock':
  // Resume editing requires simultaneous view of resume + PathAdvisor guidance.
  // Full Focus Mode hides the resume, breaking the editing workflow.
  // Docked mode shows PathAdvisor in a side panel within the Resume Builder.
  //
  // IMPLEMENTATION:
  // - 'focus': Set shouldOpenFocusMode(true) - existing Focus Mode path
  // - 'dock': Set shouldOpenDockedPanel(true) - new docked panel path
  // Both paths set lastOpenReason('ask') for scroll/highlight behavior.
  // ============================================================================

  if (preferredSurface === 'dock') {
    // Open docked PathAdvisor panel (new Day 43 Follow-up feature)
    // This signals Resume Builder to render the docked panel
    store.setShouldOpenDockedPanel(true);
  } else {
    // Open Focus Mode immediately (default, existing behavior)
    // This is the NON-NEGOTIABLE contract: Focus Mode MUST open immediately
    // Sidebar still receives state updates (threads/context), but Focus Mode is primary feedback
    contextFunctions.setShouldOpenFocusMode(true);
  }

  // STEP 5: Set open reason to 'ask' for Day 43 visibility contract
  // This signals the PathAdvisor surface (Focus Mode OR Docked Panel) to:
  // 1. Auto-scroll to the newest message
  // 2. Highlight the newest assistant message for ~1.2 seconds
  // The surface will clear this after handling the scroll/highlight
  store.setLastOpenReason('ask');

  // Return anchor id for tracking/logging
  return anchorId;
}
