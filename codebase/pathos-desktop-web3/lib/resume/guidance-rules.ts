/**
 * ============================================================================
 * GUIDANCE RULES (Day 38)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Deterministic, frontend-only rules that output guidance messages based on context.
 * Used by GuidanceStrip component to show contextual PathAdvisor guidance.
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Frontend-only, local-only
 * - No AI calls, no backend
 * - Deterministic output based on context events
 * - Small and focused - keep it simple
 *
 * CONTEXT EVENTS:
 * - entered resume builder
 * - selected version
 * - selected view
 * - tailoring enabled
 * - detected gaps
 * - rewrite suggestions produced
 * - version changes
 * - readiness signals
 *
 * @version Day 38 - Resume Builder Revamp
 * ============================================================================
 */

/**
 * Guidance Message
 *
 * PURPOSE:
 * Represents a single guidance message to display in the Guidance Strip.
 */
export interface GuidanceMessage {
  id: string;
  text: string;
  priority: 'low' | 'medium' | 'high';
  context: string; // What triggered this message (e.g., 'entry', 'version-change', 'tailoring-enabled')
  dismissible: boolean; // Can user dismiss this message?
}

/**
 * Guidance Context
 *
 * PURPOSE:
 * Context information passed to guidance rules to determine what messages to show.
 */
export interface GuidanceContext {
  // Entry state
  isFirstEntry: boolean; // Is this the first time entering resume builder?
  hasResumeData: boolean; // Does the user have any resume data?

  // Version state
  activeVersionId: string;
  versionCount: number;
  isNewVersion: boolean; // Did user just create/switch to a new version?

  // View state
  activeViewType: 'federal' | 'private' | 'one-page' | 'full';
  isViewChange: boolean; // Did user just change views?

  // Tailoring state
  isTailoringMode: boolean;
  tailoringJobTitle: string | null;
  hasTailoringSuggestions: boolean; // Are there pending rewrite suggestions?

  // Resume completeness
  hasWorkExperience: boolean;
  hasEducation: boolean;
  hasSkills: boolean;
  completenessScore: number; // 0-100

  // User activity
  isTyping: boolean; // Is user currently typing? (suppresses new messages)
  lastTypingTime: number; // Timestamp of last typing activity
}

/**
 * Get Guidance Messages
 *
 * PURPOSE:
 * Deterministic function that returns guidance messages based on context.
 * Messages are short, anchored, trust-first, local-only framing.
 *
 * TYPING QUIET MODE:
 * If user typed in the last ~2 seconds, suppress new guidance unless critical (priority: 'high').
 *
 * RETURNS:
 * Array of GuidanceMessage objects to display.
 */
export function getGuidanceMessages(context: GuidanceContext): GuidanceMessage[] {
  const messages: GuidanceMessage[] = [];
  const now = Date.now();
  const timeSinceTyping = now - context.lastTypingTime;
  const isQuietMode = context.isTyping || timeSinceTyping < 2000; // 2 seconds quiet mode

  // High-priority messages (always show, even in quiet mode)
  if (context.isFirstEntry && !context.hasResumeData) {
    messages.push({
      id: 'guidance-entry',
      text: 'Welcome to Resume Builder. Start by adding your profile information and work experience.',
      priority: 'high',
      context: 'entry',
      dismissible: true,
    });
  }

  // Medium-priority messages (suppress in quiet mode)
  if (!isQuietMode) {
    if (context.isNewVersion) {
      messages.push({
        id: 'guidance-version-new',
        text: 'New version created. You can now tailor this version independently.',
        priority: 'medium',
        context: 'version-change',
        dismissible: true,
      });
    }

    if (context.isViewChange) {
      const viewHint =
        context.activeViewType === 'federal'
          ? 'Federal format includes all sections required for USAJOBS applications.'
          : context.activeViewType === 'one-page'
            ? 'One-page format condenses your resume for quick scanning.'
            : 'This view format is optimized for ' + context.activeViewType + ' applications.';
      messages.push({
        id: 'guidance-view-change',
        text: viewHint,
        priority: 'medium',
        context: 'view-change',
        dismissible: true,
      });
    }

    if (context.isTailoringMode && context.tailoringJobTitle) {
      messages.push({
        id: 'guidance-tailoring-enabled',
        text:
          'Tailoring mode active for ' +
          context.tailoringJobTitle +
          '. Review suggested changes to improve keyword coverage.',
        priority: 'medium',
        context: 'tailoring-enabled',
        dismissible: true,
      });
    }

    if (context.hasTailoringSuggestions) {
      messages.push({
        id: 'guidance-suggestions-available',
        text: 'New suggestions available. Review and accept changes to improve your resume alignment.',
        priority: 'medium',
        context: 'suggestions-available',
        dismissible: true,
      });
    }

    if (context.completenessScore < 50) {
      messages.push({
        id: 'guidance-completeness-low',
        text: 'Your resume is incomplete. Add work experience and education to improve your profile.',
        priority: 'medium',
        context: 'completeness',
        dismissible: true,
      });
    }
  }

  // Low-priority messages (only show when not typing and resume is fairly complete)
  if (!isQuietMode && context.completenessScore >= 50) {
    if (!context.hasWorkExperience) {
      messages.push({
        id: 'guidance-no-experience',
        text: 'Add your work experience to make your resume more competitive.',
        priority: 'low',
        context: 'completeness',
        dismissible: true,
      });
    }

    if (context.versionCount === 1) {
      messages.push({
        id: 'guidance-version-suggestion',
        text: 'Create a new version to tailor your resume for different job applications.',
        priority: 'low',
        context: 'version-suggestion',
        dismissible: true,
      });
    }
  }

  return messages;
}

