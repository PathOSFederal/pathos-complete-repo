/**
 * Canonical helper for opening PathAdvisor with structured context.
 * 
 * PURPOSE:
 * Provides a consistent way to open PathAdvisor from any entry point in the application.
 * Ensures all "Ask PathAdvisor" buttons behave the same way and pass structured context.
 * 
 * USAGE:
 * ```tsx
 * const advisorContext = useAdvisorContext();
 * 
 * function handleClick() {
 *   openPathAdvisor({
 *     intent: 'resume_export_review',
 *     source: 'resume_export_modal',
 *     prompt: 'Review my resume...',
 *     openMode: 'expanded',
 *     contextFunctions: advisorContext,
 *   });
 * }
 * ```
 */

import type { AdvisorContextData } from '@/contexts/advisor-context';

/**
 * Object reference for PathAdvisor context.
 * Used to associate the request with a specific object (job, resume, etc.).
 */
export interface PathAdvisorObjectRef {
  type: string;
  id: string;
}

/**
 * Arguments for openPathAdvisor function.
 */
export interface OpenPathAdvisorArgs {
  /**
   * Intent identifier (snake_case). Examples: "resume_export_review", "job_application_tips"
   */
  intent: string;
  /**
   * Source identifier (snake_case). Examples: "resume_export_modal", "job_details_slideover"
   */
  source: string;
  /**
   * Optional object reference (job, resume, etc.)
   */
  objectRef?: PathAdvisorObjectRef;
  /**
   * Prefill text for PathAdvisor input. Required.
   */
  prompt: string;
  /**
   * How to open PathAdvisor. Defaults to "auto".
   * - "expanded": Opens PathAdvisorFocusMode (full-screen modal)
   * - "sidebar": Opens sidebar panel
   * - "auto": Defaults to expanded for better visibility (no saved preference exists yet)
   */
  openMode?: 'expanded' | 'sidebar' | 'auto';
  /**
   * Whether to close overlays (modals, dialogs) before opening PathAdvisor.
   * Defaults to true. Set to false if you want to keep the current overlay open.
   */
  closeOverlays?: boolean;
  /**
   * AdvisorContext functions. Required for the helper to work.
   * Pass the result of useAdvisorContext() hook.
   */
  contextFunctions: {
    setContext: (context: AdvisorContextData) => void;
    setPendingPrompt: (prompt: string | null) => void;
    setIsPanelOpen: (open: boolean) => void;
    setShouldOpenFocusMode: (open: boolean) => void;
    setOnPathAdvisorClose: (callback: (() => void) | null) => void;
  };
  /**
   * Optional callback to close overlays. Called if closeOverlays is true.
   * Example: () => setIsModalOpen(false)
   */
  onCloseOverlays?: () => void;
  /**
   * Day40: Optional callback to restore focus when PathAdvisor closes.
   * Called when PathAdvisor expanded view closes.
   * Example: () => helpButtonRef.current?.focus()
   */
  onClose?: () => void;
}

/**
 * Opens PathAdvisor with structured context.
 * 
 * BEHAVIOR:
 * 1. Sets advisor context (source, objectRef data)
 * 2. Seeds the prompt
 * 3. Opens PathAdvisor in the requested mode (expanded/sidebar/auto)
 * 4. Optionally closes overlays
 * 5. Focuses PathAdvisor input (handled by PathAdvisorPanel/FocusMode)
 * 
 * OPEN MODE:
 * - "expanded": Opens PathAdvisorFocusMode (full-screen modal) via setShouldOpenFocusMode(true)
 * - "sidebar": Opens sidebar panel via setIsPanelOpen(true)
 * - "auto": Defaults to expanded (no saved preference exists yet)
 * 
 * CONTEXT:
 * The context.source is set to the provided source value.
 * If objectRef is provided, it's mapped to context fields (jobTitle, jobSeries, etc.) if applicable.
 * 
 * NOTE:
 * This is an orchestration function only. It does not create new global state.
 * It reuses existing AdvisorContext mechanisms.
 */
export function openPathAdvisor(args: OpenPathAdvisorArgs): void {
  // Day40: Temporary diagnostic log to verify open call timing
  console.log('[Day40] openPathAdvisor called', { source: args.source });
  // Note: intent is stored in args but not used yet (reserved for future backend integration)
  const source = args.source;
  const objectRef = args.objectRef;
  const prompt = args.prompt;
  const openMode = args.openMode !== undefined ? args.openMode : 'auto';
  const closeOverlays = args.closeOverlays !== false; // Default to true
  const contextFunctions = args.contextFunctions;
  const onCloseOverlays = args.onCloseOverlays;
  const onClose = args.onClose;

  // Build advisor context data
  // Map objectRef to context fields if provided
  const contextData: AdvisorContextData = {
    source: source as AdvisorContextData['source'],
  };

  // If objectRef is provided and is a job, map to job fields
  if (objectRef && objectRef.type === 'job') {
    // Note: objectRef.id is the job ID, but we don't have job details here
    // The caller should pass job details in the prompt or set context separately if needed
    // For now, we just set the source
  }

  // Set the context
  contextFunctions.setContext(contextData);

  // Seed the prompt
  contextFunctions.setPendingPrompt(prompt);

  // Close overlays if requested
  if (closeOverlays && onCloseOverlays) {
    onCloseOverlays();
  }

  // Day40: Store focus restore callback if provided
  if (onClose && contextFunctions.setOnPathAdvisorClose) {
    contextFunctions.setOnPathAdvisorClose(onClose);
  }

  // Open PathAdvisor in the requested mode
  if (openMode === 'expanded') {
    // Open expanded/focus mode
    contextFunctions.setShouldOpenFocusMode(true);
  } else if (openMode === 'sidebar') {
    // Open sidebar panel
    contextFunctions.setIsPanelOpen(true);
  } else {
    // "auto" mode - default to expanded for better visibility
    // (No saved preference exists yet, so we default to expanded)
    contextFunctions.setShouldOpenFocusMode(true);
  }

  // Note: Input focus is handled by PathAdvisorPanel/FocusMode components
  // They focus the input when the panel/modal opens and a pending prompt exists
}

