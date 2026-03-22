/**
 * ============================================================================
 * PATHADVISOR STORE (Day 43 - Anchor System)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Manages global PathAdvisor state, specifically the active anchor that
 * represents where the user initiated the current "Ask PathAdvisor" action.
 * 
 * WHERE IT FITS IN ARCHITECTURE:
 * - State Layer: Zustand store for PathAdvisor anchor state
 * - Persistence: No persistence (anchor is session-scoped, cleared on refresh)
 * - Integration: Used by askPathAdvisor() to set active anchor, Focus Mode to read it
 * - SSR Safety: No SSR guards needed (client-only state, Zustand handles hydration)
 * 
 * KEY CONCEPTS:
 * - Active Anchor: The current PathAdvisorAnchor representing where user asked
 * - Anchor Lifecycle: Created on Ask → Set as active → Displayed in Focus Mode → Cleared on new Ask
 * - Last Anchor Source: Optional diagnostic field to track source type of last anchor
 * 
 * HOW IT WORKS (STEP BY STEP):
 * 1. User clicks "Ask PathAdvisor" from any entry point
 * 2. askPathAdvisor() builds anchor and calls setActiveAnchor(anchor)
 * 3. Store updates activeAnchor state
 * 4. Focus Mode reads activeAnchor via usePathAdvisorStore()
 * 5. Focus Mode displays anchor header + summary + scoped prompts
 * 6. User clicks another Ask → new anchor replaces old one
 * 7. clearActiveAnchor() can be called to reset (typically not needed - new anchor replaces)
 * 
 * DAY 43 CONTRACT:
 * - Every "Ask PathAdvisor" action MUST call setActiveAnchor() before opening Focus Mode
 * - Focus Mode MUST read activeAnchor to display anchor-aware UI
 * - Sidebar still receives state updates (threads/context) but is not primary feedback surface
 * 
 * SSR SAFETY:
 * - Zustand stores are client-only by default (no SSR issues)
 * - Initial state is null (no hydration mismatches)
 * - No localStorage persistence (session-scoped only)
 */

import { create } from 'zustand';
import type { PathAdvisorAnchor } from '@/lib/pathadvisor/anchors';
import type { PathAdvisorChangeProposal } from '@/lib/pathadvisor/changeProposals';

/**
 * Reason why Focus Mode was opened.
 * 
 * PURPOSE:
 * Tracks how Focus Mode was opened for determining scroll/highlight behavior.
 * 
 * VALUES:
 * - 'ask': Opened due to an "Ask PathAdvisor" action (should auto-scroll + highlight)
 * - 'manual': Opened manually via sidebar toggle or other non-Ask action
 * - null: Initial state or unknown
 */
export type FocusOpenReason = 'ask' | 'manual' | null;

/**
 * State interface for PathAdvisor store.
 * 
 * FIELDS:
 * - activeAnchor: Current PathAdvisorAnchor (null if no active anchor)
 * - lastAnchorSource: Optional diagnostic field tracking source type of last anchor
 * - lastOpenReason: Why Focus Mode was last opened ('ask' | 'manual' | null)
 * - lastOpenAt: Timestamp when Focus Mode was last opened (for detecting Ask-open events)
 * - shouldOpenDockedPanel: Whether a docked PathAdvisor panel should open (Day 43 Follow-up)
 * 
 * DAY 43 VISIBILITY CONTRACT:
 * lastOpenReason + lastOpenAt enable Focus Mode to detect Ask-open events and
 * auto-scroll to the newest message while preserving user control when they're
 * reading older content.
 * 
 * DAY 43 FOLLOW-UP - DOCKED PANEL:
 * shouldOpenDockedPanel enables a side-by-side PathAdvisor surface for contexts
 * like Resume Builder where full Focus Mode takeover is not ideal. The docked
 * panel coexists with the main content (e.g., resume editor).
 */
interface PathAdvisorState {
  /** Current active anchor (null if no anchor is active) */
  activeAnchor: PathAdvisorAnchor | null;
  /** Optional diagnostic field: source type of the last anchor (for tracking/debugging) */
  lastAnchorSource?: PathAdvisorAnchor['source'];
  /** Why Focus Mode was last opened ('ask' | 'manual' | null) */
  lastOpenReason: FocusOpenReason;
  /** Timestamp when Focus Mode was last opened (milliseconds since epoch) */
  lastOpenAt: number | null;
  /**
   * Whether a docked PathAdvisor panel should open (Day 43 Follow-up).
   * 
   * PURPOSE:
   * Signals to components (e.g., Resume Builder) that a docked side-by-side
   * PathAdvisor panel should be rendered. This is an alternative to Focus Mode
   * for contexts where users need to see both their content AND PathAdvisor.
   * 
   * WHY THIS EXISTS:
   * Resume Builder users need to edit their resume while receiving PathAdvisor
   * guidance. Full Focus Mode hides the resume, breaking the workflow.
   * Docked mode shows PathAdvisor alongside the resume editor.
   * 
   * LIFECYCLE:
   * 1. askPathAdvisor() sets this to true when preferredSurface === 'dock'
   * 2. Resume Builder reads this and renders DockedPathAdvisorPanel
   * 3. User closes panel or navigates away → clearShouldOpenDockedPanel()
   */
  shouldOpenDockedPanel: boolean;
  /**
   * Change proposals for the current anchor (Day 43 - Guidance Model).
   * 
   * ============================================================================
   * WHY PROPOSALS EXIST (NON-CHATGPT BEHAVIOR CONTRACT)
   * ============================================================================
   * 
   * PathAdvisor is NOT a ChatGPT-style author that silently rewrites content.
   * PathAdvisor MUST:
   * - Guide the user
   * - Explain changes
   * - Justify recommendations
   * - Review user content
   * 
   * PathAdvisor MUST NOT:
   * - Silently rewrite user content
   * - Apply changes without explanation
   * - Behave like a generic chat interface
   * 
   * Any resume-related suggestion MUST show:
   * 1. WHAT changed (before/after)
   * 2. WHY it changed (explicit justification)
   * 3. WHAT it maps to (job requirement, USAJOBS guidance, GS-level norm)
   * 
   * This is enforced by UI + data model, not developer discipline.
   * The ChangeProposalCard component is the ONLY allowed way to present rewrites.
   * 
   * ============================================================================
   * LIFECYCLE
   * ============================================================================
   * 
   * 1. User triggers resume review (via "Review my resume" or PathAdvisor Ask)
   * 2. PathAdvisor generates proposals and calls addProposal() for each
   * 3. Proposals are stored here with status: 'shown'
   * 4. UI renders ChangeProposalCards showing before/after/why/mapsTo
   * 5. User can:
   *    - Apply: markProposalApplied(id) → status becomes 'applied'
   *    - Dismiss: dismissProposal(id) → status becomes 'dismissed'
   *    - Copy: User copies afterText manually (no state change)
   * 6. On new anchor, proposals for old anchor remain (historical record)
   * 7. clearProposalsForAnchor(anchorId) can clean up if needed
   */
  proposals: PathAdvisorChangeProposal[];
}

/**
 * Actions interface for PathAdvisor store.
 * 
 * METHODS:
 * - setActiveAnchor: Sets the active anchor (replaces any existing anchor)
 * - clearActiveAnchor: Clears the active anchor (sets to null)
 * - setLastOpenReason: Sets why Focus Mode was opened (for scroll/highlight behavior)
 * - clearLastOpenReason: Clears the open reason (after scroll/highlight is handled)
 * - setShouldOpenDockedPanel: Sets whether docked panel should open (Day 43 Follow-up)
 * - clearShouldOpenDockedPanel: Clears the docked panel flag (Day 43 Follow-up)
 */
interface PathAdvisorActions {
  /** Sets the active anchor (replaces any existing anchor) */
  setActiveAnchor: (anchor: PathAdvisorAnchor) => void;
  /** Clears the active anchor (sets to null) */
  clearActiveAnchor: () => void;
  /**
   * Sets why Focus Mode was opened (for scroll/highlight behavior).
   * 
   * DAY 43 VISIBILITY CONTRACT:
   * Called by askPathAdvisor() with 'ask' to signal Focus Mode should
   * auto-scroll to newest message and highlight the newest assistant message.
   * 
   * @param reason - 'ask' | 'manual' | null
   */
  setLastOpenReason: (reason: FocusOpenReason) => void;
  /**
   * Clears the open reason after scroll/highlight behavior is handled.
   * Focus Mode calls this after processing the Ask-open event.
   */
  clearLastOpenReason: () => void;
  /**
   * Sets whether a docked PathAdvisor panel should open (Day 43 Follow-up).
   * 
   * PURPOSE:
   * Called by askPathAdvisor() when preferredSurface === 'dock' to signal
   * that a docked side-by-side panel should be rendered instead of Focus Mode.
   * 
   * WHY THIS EXISTS:
   * Resume Builder needs side-by-side PathAdvisor that doesn't hide the resume.
   * 
   * @param shouldOpen - true to request docked panel open, false to close
   */
  setShouldOpenDockedPanel: (shouldOpen: boolean) => void;
  /**
   * Clears the docked panel flag after the panel opens or is dismissed.
   * Components call this after handling the shouldOpenDockedPanel signal.
   */
  clearShouldOpenDockedPanel: () => void;

  // ============================================================================
  // CHANGE PROPOSAL ACTIONS (Day 43 - Guidance Model)
  // ============================================================================
  //
  // These actions manage the proposals array for enforcing non-ChatGPT behavior.
  // Proposals are the ONLY way PathAdvisor can suggest resume changes.
  // ============================================================================

  /**
   * Adds a change proposal to the store.
   * 
   * PURPOSE:
   * Called when PathAdvisor generates a suggestion for resume improvement.
   * The proposal captures before/after/why/mapsTo for user review.
   * 
   * CONTRACT:
   * - PathAdvisor MUST NOT directly modify user content
   * - PathAdvisor MUST create a proposal for any suggested change
   * - UI MUST render proposals via ChangeProposalCard (never inline)
   * 
   * @param proposal - The change proposal to add
   */
  addProposal: (proposal: PathAdvisorChangeProposal) => void;

  /**
   * Dismisses a proposal (user chose not to apply it).
   * 
   * PURPOSE:
   * Called when user clicks "Dismiss" on a ChangeProposalCard.
   * Sets status to 'dismissed' to track user decision.
   * 
   * @param proposalId - ID of the proposal to dismiss
   */
  dismissProposal: (proposalId: string) => void;

  /**
   * Marks a proposal as applied (user accepted the change).
   * 
   * PURPOSE:
   * Called when user clicks "Apply" on a ChangeProposalCard.
   * Sets status to 'applied' to track user decision.
   * 
   * NOTE:
   * The actual resume modification is handled by the calling component,
   * not by this store action. This action only updates proposal status.
   * 
   * @param proposalId - ID of the proposal that was applied
   */
  markProposalApplied: (proposalId: string) => void;

  /**
   * Clears all proposals for a specific anchor.
   * 
   * PURPOSE:
   * Called when anchor changes or user wants to clear historical proposals.
   * Removes proposals where anchorId matches the provided ID.
   * 
   * USE CASES:
   * - Switching to a new resume review session
   * - User explicitly clears proposal history
   * - Navigation away from resume context
   * 
   * @param anchorId - ID of the anchor whose proposals should be cleared
   */
  clearProposalsForAnchor: (anchorId: string) => void;

  /**
   * Gets proposals for the currently active anchor.
   * 
   * PURPOSE:
   * Helper to filter proposals by active anchor for UI rendering.
   * Returns empty array if no active anchor.
   * 
   * @returns Array of proposals for active anchor
   */
  getProposalsForActiveAnchor: () => PathAdvisorChangeProposal[];
}

/**
 * Combined store type (state + actions).
 */
type PathAdvisorStore = PathAdvisorState & PathAdvisorActions;

/**
 * PathAdvisor Zustand store.
 * 
 * PURPOSE:
 * Global store for PathAdvisor anchor state. Provides setActiveAnchor() and
 * clearActiveAnchor() methods, and activeAnchor state for Focus Mode to read.
 * 
 * INITIAL STATE:
 * - activeAnchor: null (no anchor active initially)
 * - lastAnchorSource: undefined (no previous anchor)
 * 
 * USAGE:
 * ```tsx
 * // Set anchor (from askPathAdvisor)
 * const setActiveAnchor = usePathAdvisorStore(state => state.setActiveAnchor);
 * setActiveAnchor(anchor);
 * 
 * // Read anchor (from Focus Mode)
 * const activeAnchor = usePathAdvisorStore(state => state.activeAnchor);
 * ```
 * 
 * SSR SAFETY:
 * Zustand stores are client-only by default. Initial state is null, so no
 * hydration mismatches. No localStorage persistence (session-scoped only).
 */
export const usePathAdvisorStore = create<PathAdvisorStore>(function (set, get) {
  return {
    // Initial state: no active anchor, no open reason, no docked panel request, no proposals
    activeAnchor: null,
    lastAnchorSource: undefined,
    lastOpenReason: null,
    lastOpenAt: null,
    shouldOpenDockedPanel: false,
    proposals: [],

    /**
     * Sets the active anchor (replaces any existing anchor).
     * 
     * PURPOSE:
     * Called by askPathAdvisor() to set the anchor before opening Focus Mode.
     * Replaces any existing anchor (new Ask always creates new anchor).
     * 
     * HOW IT WORKS:
     * 1. Sets activeAnchor to the provided anchor
     * 2. Sets lastAnchorSource to anchor.source for diagnostics
     * 3. This triggers re-render in components subscribed to activeAnchor
     * 
     * DAY 43 CONTRACT:
     * This MUST be called before opening Focus Mode in askPathAdvisor().
     * 
     * @param anchor - The PathAdvisorAnchor to set as active
     */
    setActiveAnchor: function (anchor: PathAdvisorAnchor) {
      set({
        activeAnchor: anchor,
        lastAnchorSource: anchor.source,
      });
    },

    /**
     * Clears the active anchor (sets to null).
     * 
     * PURPOSE:
     * Resets the anchor state. Typically not needed because new Ask actions
     * replace the anchor via setActiveAnchor(). This is available for edge cases
     * where anchor should be cleared without a new anchor being set.
     * 
     * HOW IT WORKS:
     * 1. Sets activeAnchor to null
     * 2. Keeps lastAnchorSource unchanged (diagnostic field, preserves history)
     * 
     * @returns void
     */
    clearActiveAnchor: function () {
      set({
        activeAnchor: null,
        // Keep lastAnchorSource unchanged (diagnostic field)
      });
    },

    /**
     * Sets why Focus Mode was opened.
     * 
     * DAY 43 VISIBILITY CONTRACT:
     * Called by askPathAdvisor() with 'ask' to signal Focus Mode should:
     * 1. Auto-scroll to newest message
     * 2. Highlight newest assistant message for ~1.2 seconds
     * 
     * HOW IT WORKS:
     * 1. Sets lastOpenReason to the provided reason
     * 2. Sets lastOpenAt to current timestamp
     * 3. Focus Mode watches these fields and responds accordingly
     * 
     * @param reason - 'ask' | 'manual' | null
     */
    setLastOpenReason: function (reason: FocusOpenReason) {
      set({
        lastOpenReason: reason,
        lastOpenAt: Date.now(),
      });
    },

    /**
     * Clears the open reason after Focus Mode handles the scroll/highlight.
     * 
     * PURPOSE:
     * Focus Mode calls this after processing the Ask-open event to prevent
     * re-triggering scroll/highlight on subsequent re-renders.
     */
    clearLastOpenReason: function () {
      set({
        lastOpenReason: null,
        // Keep lastOpenAt for diagnostics
      });
    },

    /**
     * Sets whether a docked PathAdvisor panel should open (Day 43 Follow-up).
     * 
     * PURPOSE:
     * Called by askPathAdvisor() when preferredSurface === 'dock' to signal
     * that a docked side-by-side panel should be rendered. Components like
     * Resume Builder watch this state and render DockedPathAdvisorPanel.
     * 
     * WHY THIS EXISTS:
     * Resume Builder users need to see their resume while editing with
     * PathAdvisor guidance. Full Focus Mode hides the resume, which breaks
     * the side-by-side workflow. Docked mode coexists with the editor.
     * 
     * HOW IT WORKS:
     * 1. askPathAdvisor() sets this to true (via preferredSurface: 'dock')
     * 2. Resume Builder reads this and renders DockedPathAdvisorPanel
     * 3. User closes panel or component unmounts → clearShouldOpenDockedPanel()
     * 
     * @param shouldOpen - true to request docked panel open
     */
    setShouldOpenDockedPanel: function (shouldOpen: boolean) {
      set({
        shouldOpenDockedPanel: shouldOpen,
      });
    },

    /**
     * Clears the docked panel flag after handling (Day 43 Follow-up).
     * 
     * PURPOSE:
     * Called by components after they've handled the shouldOpenDockedPanel signal.
     * This prevents re-opening the panel on re-renders.
     * 
     * CALLED BY:
     * - Resume Builder when docked panel successfully opens
     * - Resume Builder when user closes the docked panel
     * - Resume Builder when component unmounts
     */
    clearShouldOpenDockedPanel: function () {
      set({
        shouldOpenDockedPanel: false,
      });
    },

    // ============================================================================
    // CHANGE PROPOSAL ACTION IMPLEMENTATIONS (Day 43 - Guidance Model)
    // ============================================================================

    /**
     * Adds a change proposal to the store.
     * 
     * HOW IT WORKS:
     * 1. Takes the new proposal
     * 2. Appends it to the proposals array
     * 3. Does NOT modify any existing proposals
     * 
     * WHY APPEND-ONLY:
     * Proposals are a historical record of PathAdvisor suggestions.
     * Even if user dismisses or applies, we keep the proposal for reference.
     * This enables potential undo functionality and analytics.
     */
    addProposal: function (proposal: PathAdvisorChangeProposal) {
      set(function (state) {
        return {
          proposals: state.proposals.concat([proposal]),
        };
      });
    },

    /**
     * Dismisses a proposal by setting its status to 'dismissed'.
     * 
     * HOW IT WORKS:
     * 1. Finds proposal by ID
     * 2. Updates its status to 'dismissed'
     * 3. Keeps all other proposals unchanged
     * 
     * WHY NOT REMOVE:
     * We keep dismissed proposals for the session so users can see
     * what was suggested even if they chose not to apply it.
     */
    dismissProposal: function (proposalId: string) {
      set(function (state) {
        const updatedProposals = state.proposals.map(function (proposal) {
          if (proposal.id === proposalId) {
            return Object.assign({}, proposal, { status: 'dismissed' as const });
          }
          return proposal;
        });
        return { proposals: updatedProposals };
      });
    },

    /**
     * Marks a proposal as applied by setting its status to 'applied'.
     * 
     * HOW IT WORKS:
     * 1. Finds proposal by ID
     * 2. Updates its status to 'applied'
     * 3. Keeps all other proposals unchanged
     * 
     * NOTE:
     * The actual resume modification happens in the calling component.
     * This action only tracks that the user accepted the suggestion.
     */
    markProposalApplied: function (proposalId: string) {
      set(function (state) {
        const updatedProposals = state.proposals.map(function (proposal) {
          if (proposal.id === proposalId) {
            return Object.assign({}, proposal, { status: 'applied' as const });
          }
          return proposal;
        });
        return { proposals: updatedProposals };
      });
    },

    /**
     * Clears all proposals for a specific anchor.
     * 
     * HOW IT WORKS:
     * 1. Filters out proposals where anchorId matches
     * 2. Keeps proposals for other anchors
     * 
     * USE CASES:
     * - Starting a fresh review session
     * - Cleaning up after navigation
     */
    clearProposalsForAnchor: function (anchorId: string) {
      set(function (state) {
        const filteredProposals = state.proposals.filter(function (proposal) {
          return proposal.anchorId !== anchorId;
        });
        return { proposals: filteredProposals };
      });
    },

    /**
     * Gets proposals for the currently active anchor.
     * 
     * HOW IT WORKS:
     * 1. Reads activeAnchor from state
     * 2. If no active anchor, returns empty array
     * 3. Filters proposals by activeAnchor.id
     * 
     * WHY GETTER IN STORE:
     * Centralizes filtering logic so UI components don't need to
     * implement their own filtering. Ensures consistency.
     */
    getProposalsForActiveAnchor: function () {
      const state = get();
      if (!state.activeAnchor) {
        return [];
      }
      const anchorId = state.activeAnchor.id;
      return state.proposals.filter(function (proposal) {
        return proposal.anchorId === anchorId;
      });
    },
  };
});
