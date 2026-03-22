/**
 * ============================================================================
 * TAILORING WORKSPACE STORE (Day 38 Polish)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This Zustand store provides a communication channel between components
 * (like Job Details) and the Tailoring Workspace's PathAdvisor panel.
 * When Job Details is opened from within the workspace, clicking "Ask PathAdvisor"
 * should open the workspace's PathAdvisor (not the global one).
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
 * │  Job Details    │ --> │   THIS FILE     │ --> │ Tailoring      │
 * │  SlideOver      │     │  (Zustand Store)│     │ Workspace      │
 * │  ("Ask PathAdvisor")  │                 │     │ (PathAdvisor)  │
 * └─────────────────┘     └─────────────────┘     └────────────────┘
 *
 * KEY RESPONSIBILITIES:
 * 1. Request workspace PathAdvisor to open (from Job Details)
 * 2. Optional payload (job title/agency/grade) for pre-seeding prompt
 * 3. Workspace listens and opens its PathAdvisor when requested
 *
 * HOUSE RULES COMPLIANCE:
 * - No `var` - uses `const` and `let` only
 * - No `?.` or `??` - uses explicit null/undefined checks
 * - No `...` spread - uses Object.assign and explicit loops
 * - Over-commented for teaching-level clarity
 *
 * @version Day 38 - Tailoring Workspace Polish
 * ============================================================================
 */

import { create } from 'zustand';

/**
 * Payload for requesting workspace PathAdvisor to open.
 * Contains job information to pre-seed a helpful prompt.
 */
export interface WorkspacePathAdvisorRequest {
  /**
   * Job title to include in the prompt.
   */
  jobTitle?: string;
  
  /**
   * Agency/organization name to include in the prompt.
   */
  agency?: string;
  
  /**
   * Grade level to include in the prompt.
   */
  grade?: string;
}

/**
 * Store state interface.
 */
interface TailoringWorkspaceState {
  /**
   * Current request to open workspace PathAdvisor.
   * When set, the workspace should open its PathAdvisor.
   * When null, no request is pending.
   */
  pathAdvisorRequest: WorkspacePathAdvisorRequest | null;
}

/**
 * Store actions interface.
 */
interface TailoringWorkspaceActions {
  /**
   * Request the workspace PathAdvisor to open.
   * 
   * HOW IT WORKS:
   * 1. Sets pathAdvisorRequest with the payload
   * 2. Workspace component listens to this state change
   * 3. Workspace opens its PathAdvisor panel/sheet
   * 4. Workspace clears the request after handling
   * 
   * @param payload - Optional job information for pre-seeding prompt
   */
  requestOpenWorkspacePathAdvisor: (payload?: WorkspacePathAdvisorRequest) => void;
  
  /**
   * Clear the current PathAdvisor request.
   * Called by the workspace after handling the request.
   */
  clearPathAdvisorRequest: () => void;
}

/**
 * Combined store interface.
 */
type TailoringWorkspaceStore = TailoringWorkspaceState & TailoringWorkspaceActions;

/**
 * Create the store.
 * 
 * INITIAL STATE:
 * - pathAdvisorRequest: null (no request pending)
 * 
 * ACTIONS:
 * - requestOpenWorkspacePathAdvisor: Sets the request payload
 * - clearPathAdvisorRequest: Clears the request
 */
export const useTailoringWorkspaceStore = create<TailoringWorkspaceStore>(function (set) {
  return {
    // Initial state
    pathAdvisorRequest: null,
    
    // Actions
    requestOpenWorkspacePathAdvisor: function (payload) {
      // Set the request payload (even if undefined, set it to indicate a request)
      const request: WorkspacePathAdvisorRequest = payload || {};
      set({ pathAdvisorRequest: request });
    },
    
    clearPathAdvisorRequest: function () {
      set({ pathAdvisorRequest: null });
    },
  };
});


