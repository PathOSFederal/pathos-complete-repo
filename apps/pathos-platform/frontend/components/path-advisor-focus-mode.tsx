'use client';

import type React from 'react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Minimize2, Maximize2, Sparkles, Briefcase, Send, Target, BarChart3, ChevronDown, FileCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserPreferencesStore } from '@/store/userPreferencesStore';
import { useProfileStore } from '@/store/profileStore';
import { useResumeBuilderStore } from '@/store/resumeBuilderStore';
import { useAdvisorContext } from '@/contexts/advisor-context';
import { SensitiveValue } from '@/components/sensitive-value';
import { usePathAdvisorStore } from '@/store/pathAdvisorStore';
import { getScopedPrompts } from '@/lib/pathadvisor/suggestedPrompts';
// Day 43: Import anchor-aware right rail builder and stores for context
import { buildFocusRightRailModel, type FocusRightRailModel, type FocusRightRailDependencies } from '@/lib/pathadvisor/focusRightRail';
// Day 43 Option A: Import AnchorContextPanel for single-column layout context surface
import { AnchorContextPanel } from '@/components/pathadvisor/AnchorContextPanel';
// Day 43: Import ChangeProposalCard for rendering change proposals in Focus Mode
import { ChangeProposalCard } from '@/components/pathadvisor/ChangeProposalCard';
import { useJobSearchStore } from '@/store/jobSearchStore';
import { useBenefitsWorkspaceStore } from '@/store/benefitsWorkspaceStore';
import { useDashboardStore } from '@/store/dashboardStore';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

interface PathAdvisorFocusModeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  onSendMessage: (message: string) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  /**
   * Day 35: Optional custom sidebar content for dashboard context.
   * When provided, replaces the default "Your Profile", "Active Job", and "Key Metrics" cards.
   */
  customSidebarContent?: React.ReactNode;
}

/**
 * PathAdvisor Focus Mode Component
 * 
 * ARCHITECTURE: Two distinct rendering modes with different layout constraints
 * 
 * 1) ONBOARDING FOCUS MODE (portal overlay):
 *    - Triggered when: advisorContext.source === 'onboarding_pathadvisor' OR 'onboarding_wizard'
 *    - Renders via: React portal to document.body (bypasses parent container constraints)
 *    - Layout constraints: CSS-first approach using viewport units (dvh, vw, calc)
 *      - Fixed width: w-[min(960px,calc(100vw-3rem))] (stable, never grows)
 *      - Fixed height: h-[min(600px,calc(100dvh-80px))] (viewport-bounded, never expands)
 *      - Panel uses: overflow-hidden, flex flex-col, min-h-0 (prevents expansion)
 *      - Grid structure: 3-row grid (header/content/composer) - only message list scrolls
 *    - Expand toggle: Hidden (experience stays in scope)
 *    - Scroll lock: Body/html overflow hidden to prevent backdrop-blur edge bleeding
 *    - NO JS polling: Removed 16ms interval loop and ResizeObserver in favor of CSS constraints
 * 
 * 2) APP FOCUS MODE (Radix Dialog):
 *    - Triggered when: NOT onboarding (normal dashboard, career, job search, resume builder)
 *    - Renders via: Radix Dialog (standard modal behavior)
 *    - Layout constraints: Radix Dialog centering + className-based sizing
 *      - Normal size: sm:w-[95vw] sm:h-[90vh] lg:w-[90vw] lg:max-w-6xl lg:h-[80vh]
 *      - Expanded size: sm:w-[99vw] sm:h-[98vh] lg:w-[98vw] lg:h-[95vh] (no max-width)
 *      - DialogContent uses: overflow-hidden, flex flex-col (prevents expansion)
 *      - Grid structure: Same 3-row grid as onboarding (shared via renderPanelContent)
 *    - Expand toggle: Visible and functional (toggles between normal/expanded sizes)
 *    - No scroll lock: Standard Radix Dialog behavior
 * 
 * SCROLL BEHAVIOR (both modes):
 *    - Header: Never scrolls (grid row 1, shrink-0)
 *    - Message list: ONLY scrollable region (grid row 2, overflow-y-auto, min-h-0)
 *    - Composer: Never scrolls (grid row 3, shrink-0)
 *    - Panel container: overflow-hidden (prevents panel expansion, forces internal scrolling)
 * 
 * WHY NO JS POLLING:
 *    - CSS constraints (overflow-hidden, min-h-0, viewport units) handle layout enforcement
 *    - Grid structure (auto/1fr/auto rows) prevents expansion by design
 *    - JS polling (intervals, ResizeObserver loops) causes jank and is fragile
 *    - CSS-first approach is more performant and regression-proof
 */
export function PathAdvisorFocusMode(props: PathAdvisorFocusModeProps) {
  const open = props.open;
  const onOpenChange = props.onOpenChange;
  const messages = props.messages;
  const onSendMessage = props.onSendMessage;
  const inputValue = props.inputValue;
  const onInputChange = props.onInputChange;
  const customSidebarContent = props.customSidebarContent;

  // Day 35: State for expanded/larger modal size
  const [isExpanded, setIsExpanded] = useState(false);


  const isSensitiveHidden = useUserPreferencesStore(function (state) {
    return state.isSensitiveHidden;
  });

  const profile = useProfileStore(function (state) {
    return state.profile;
  });

  const advisorContextData = useAdvisorContext();
  const advisorContext = advisorContextData.context;

  const activeTargetJob = useResumeBuilderStore(function (state) {
    return state.activeTargetJob;
  });
  const isTailoringMode = useResumeBuilderStore(function (state) {
    return state.isTailoringMode;
  });

  // Day 43: Read active anchor from PathAdvisor store
  // This is the anchor that represents where the user initiated the current Ask action
  // Focus Mode displays anchor header, summary, and scoped prompts when anchor exists
  const activeAnchor = usePathAdvisorStore(function (state) {
    return state.activeAnchor;
  });

  // ============================================================================
  // DAY 43: SCROLL + VISIBILITY STATE (Latest Visibility UX)
  // ============================================================================
  //
  // WHY AUTO-SCROLL EXISTS:
  // When Focus Mode opens due to an "Ask PathAdvisor" action, the user expects to
  // immediately see the newest inquiry/answer. Auto-scrolling to bottom ensures
  // the user sees what changed without manual effort.
  //
  // WHY WE AVOID YANKING THE USER:
  // If the user has scrolled up to read older content, forcing them to the bottom
  // destroys their reading context and trust. We track whether the user is "near
  // bottom" and only auto-scroll when they are. If they're reading older content,
  // we show a "Jump to latest" control instead.
  //
  // HOW "JUMP TO LATEST" PRESERVES TRUST:
  // The "Jump to latest" button gives the user explicit control over navigation.
  // They can finish reading and click when ready. A subtle "New message" indicator
  // lets them know there's new content without interrupting their flow.
  //
  // NEAR-BOTTOM THRESHOLD (120px):
  // A user is considered "near bottom" if they're within 120px of the scroll end.
  // This accounts for minor scroll variations and ensures auto-scroll triggers
  // when the user is essentially at the end.
  // ============================================================================

  // Day 43: Read open reason and timestamp from PathAdvisor store
  // These fields signal when Focus Mode was opened due to an "Ask" action
  const lastOpenReason = usePathAdvisorStore(function (state) {
    return state.lastOpenReason;
  });
  const lastOpenAt = usePathAdvisorStore(function (state) {
    return state.lastOpenAt;
  });
  const clearLastOpenReason = usePathAdvisorStore(function (state) {
    return state.clearLastOpenReason;
  });

  // Day 43: Change proposals for guidance model (non-ChatGPT behavior)
  const proposals = usePathAdvisorStore(function (state) {
    return state.proposals;
  });
  const dismissProposal = usePathAdvisorStore(function (state) {
    return state.dismissProposal;
  });
  const markProposalApplied = usePathAdvisorStore(function (state) {
    return state.markProposalApplied;
  });

  // Day 43: Track whether user is near bottom of message list
  // If true: auto-scroll on new messages
  // If false: show "Jump to latest" instead of forcing scroll
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Day 43: Track whether there are new messages the user hasn't seen
  // Shown when isNearBottom is false and new messages arrive
  const [hasNewMessages, setHasNewMessages] = useState(false);

  // Day 43: Track which message ID should be highlighted (newest assistant message after Ask-open)
  // The highlight fades after ~1.2 seconds to draw attention without being intrusive
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);

  // Day 43: Track previous message count to detect new messages
  const prevMessageCountRef = useRef(messages.length);

  // Day 43: Track the last processed open event to avoid duplicate handling
  const lastProcessedOpenAtRef = useRef<number | null>(null);

  // Day 43: End-of-thread sentinel ref for scrollIntoView
  const endSentinelRef = useRef<HTMLDivElement | null>(null);

  // Day 43: Read from stores needed for anchor-aware right rail context
  // These provide additional context when anchor.sourceId can be used for lookup
  const selectedJob = useJobSearchStore(function (state) {
    return state.selectedJob;
  });
  const benefitsScenarioA = useBenefitsWorkspaceStore(function (state) {
    return state.scenarios.A;
  });
  const activeScenarioId = useBenefitsWorkspaceStore(function (state) {
    return state.activeScenarioId;
  });
  const benefitsScenarioB = useBenefitsWorkspaceStore(function (state) {
    return state.scenarios.B;
  });
  const dashboardCompensation = useDashboardStore(function (state) {
    return state.compensation;
  });

  // Ref for input field to focus when modal opens
  const inputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // DAY 43: SCROLL HELPERS (Latest Visibility UX)
  // ============================================================================

  /**
   * Scrolls to the bottom of the message list.
   * 
   * WHY THIS EXISTS:
   * Provides a consistent way to scroll to the newest message, whether triggered
   * by auto-scroll on Ask-open, auto-scroll on new message (when near bottom),
   * or user clicking "Jump to latest".
   * 
   * BEHAVIOR CHOICE:
   * - 'auto': Instant scroll (used on Ask-open for immediate visibility)
   * - 'smooth': Animated scroll (used on new messages and Jump to latest)
   * 
   * @param behavior - 'auto' for instant, 'smooth' for animated
   */
  const scrollToBottom = useCallback(function (behavior: 'auto' | 'smooth' = 'smooth') {
    if (endSentinelRef.current) {
      endSentinelRef.current.scrollIntoView({ behavior: behavior, block: 'end' });
    }
  }, []);

  /**
   * Handles scroll events in the message list to track near-bottom state.
   * 
   * WHY WE TRACK THIS:
   * Near-bottom tracking is the key to preserving user control. If the user is
   * at/near the bottom, they want to see new messages immediately. If they've
   * scrolled up, they're reading and shouldn't be yanked away.
   * 
   * THRESHOLD (120px):
   * A user is considered "near bottom" if remaining scroll distance is < 120px.
   * This accounts for minor scroll variations while still detecting intentional
   * scroll-up.
   */
  const handleMessageListScroll = useCallback(function (e: React.UIEvent<HTMLDivElement>) {
    const target = e.currentTarget;
    const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
    const nearBottom = remaining < 120;
    setIsNearBottom(nearBottom);
    
    // If user scrolls to bottom manually, clear new messages indicator
    if (nearBottom && hasNewMessages) {
      setHasNewMessages(false);
    }
  }, [hasNewMessages]);

  /**
   * Handles "Jump to latest" button click.
   * 
   * BEHAVIOR:
   * 1. Smooth scroll to bottom (animated for clear feedback)
   * 2. Set isNearBottom to true (enables auto-scroll for subsequent messages)
   * 3. Clear new messages indicator
   */
  const handleJumpToLatest = useCallback(function () {
    scrollToBottom('smooth');
    setIsNearBottom(true);
    setHasNewMessages(false);
  }, [scrollToBottom]);

  // ============================================================================
  // DAY 43: AUTO-SCROLL + HIGHLIGHT EFFECTS (Latest Visibility UX)
  // ============================================================================

  /**
   * Effect: Handle Ask-open event (auto-scroll + highlight).
   * 
   * TRIGGERS WHEN:
   * - lastOpenReason is 'ask'
   * - lastOpenAt has changed since last processed
   * - Focus Mode is open
   * 
   * BEHAVIOR:
   * 1. Scroll to bottom immediately (behavior: 'auto' for instant visibility)
   * 2. Find the newest assistant message and highlight it
   * 3. Clear highlight after 1.2 seconds
   * 4. Clear lastOpenReason to prevent re-triggering
   * 
   * WHY 'auto' BEHAVIOR ON ASK-OPEN:
   * When the user clicks "Ask PathAdvisor", they expect immediate visibility of
   * the new context. Smooth scrolling here would feel sluggish. We use instant
   * scroll ('auto') for snappy UX, then apply highlight for visual confirmation.
   */
  useEffect(function handleAskOpenEvent() {
    // Only process if Focus Mode is open and this is an Ask-open event
    if (!open) {
      return;
    }
    if (lastOpenReason !== 'ask') {
      return;
    }
    if (lastOpenAt === null) {
      return;
    }
    // Skip if we've already processed this open event
    if (lastProcessedOpenAtRef.current === lastOpenAt) {
      return;
    }

    // Mark this event as processed
    lastProcessedOpenAtRef.current = lastOpenAt;

    // Delay scroll slightly to ensure DOM is updated with any new messages
    const scrollTimeoutId = setTimeout(function () {
      scrollToBottom('auto');
    }, 50);

    // Find newest assistant message and highlight it
    const newestAssistantMessage = messages
      .filter(function (m) { return m.role === 'assistant'; })
      .slice(-1)[0];

    if (newestAssistantMessage) {
      setHighlightMessageId(newestAssistantMessage.id);
      // Clear highlight after 1.2 seconds (Day 43 spec: ~1-1.5 seconds)
      const highlightTimeoutId = setTimeout(function () {
        setHighlightMessageId(null);
      }, 1200);

      // Cleanup for highlight timeout
      return function cleanup() {
        clearTimeout(scrollTimeoutId);
        clearTimeout(highlightTimeoutId);
      };
    }

    // Clear the open reason after handling
    clearLastOpenReason();

    return function cleanup() {
      clearTimeout(scrollTimeoutId);
    };
  }, [open, lastOpenReason, lastOpenAt, messages, scrollToBottom, clearLastOpenReason]);

  /**
   * Effect: Handle new messages (auto-scroll or indicator).
   * 
   * TRIGGERS WHEN:
   * - messages array length increases
   * - Focus Mode is open
   * 
   * BEHAVIOR:
   * - If isNearBottom: smooth scroll to bottom (user is following conversation)
   * - If NOT isNearBottom: show "New message" indicator + "Jump to latest" button
   * 
   * WHY 'smooth' BEHAVIOR:
   * For messages arriving during an open session, smooth scrolling provides
   * pleasant feedback without jarring instant jumps.
   */
  useEffect(function handleNewMessages() {
    const prevCount = prevMessageCountRef.current;
    const currentCount = messages.length;

    // Update ref for next comparison
    prevMessageCountRef.current = currentCount;

    // Only process if messages increased and modal is open
    if (!open) {
      return;
    }
    if (currentCount <= prevCount) {
      return;
    }

    // New messages arrived
    if (isNearBottom) {
      // User is at bottom - auto-scroll smoothly
      const timeoutId = setTimeout(function () {
        scrollToBottom('smooth');
      }, 50);
      return function cleanup() {
        clearTimeout(timeoutId);
      };
    } else {
      // User is reading older content - show indicator instead
      setHasNewMessages(true);
    }
  }, [messages.length, open, isNearBottom, scrollToBottom]);

  /**
   * Effect: Reset scroll state when modal closes.
   * 
   * WHY:
   * When the modal closes, we reset isNearBottom to true so the next open
   * starts fresh. We also clear the new messages indicator.
   */
  useEffect(function resetScrollStateOnClose() {
    if (!open) {
      setIsNearBottom(true);
      setHasNewMessages(false);
      setHighlightMessageId(null);
    }
  }, [open]);

  // Focus input when modal opens
  useEffect(
    function focusInputOnOpen() {
      if (open && inputRef.current) {
        // Use setTimeout to ensure the modal is fully rendered before focusing
        const timeoutId = setTimeout(function () {
          if (inputRef.current && typeof inputRef.current.focus === 'function') {
            // preventScroll avoids the browser scrolling the underlying onboarding container
            // when focus is applied. For onboarding focus, also prevent viewport expansion.
            try {
              // TypeScript doesn't recognize preventScroll on HTMLElement.focus, but it's valid
              // Use type assertion to allow this modern browser API
              inputRef.current.focus({ preventScroll: true } as FocusOptions);
            } catch {
              // older browsers fallback - ignore error and use default focus behavior
              inputRef.current.focus();
            }
          }
          

        }, 100);
        return function cleanup() {
          clearTimeout(timeoutId);
        };
      }
    },
    [open],
  );

  const handleKeyDown = function (e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        onSendMessage(inputValue);
        onInputChange('');
      }
    }
  };

  const handleSend = function () {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      onInputChange('');
    }
  };

  // Day 40: Detect if PathAdvisor was opened from onboarding focus context
  // In onboarding focus, the expand toggle should be disabled/hidden to keep experience in scope
  // Check for both onboarding sources: 'onboarding_pathadvisor' (PathAdvisor conversation) and 'onboarding_wizard' (wizard dialog)
  const isOnboardingFocus = advisorContext && (advisorContext.source === 'onboarding_pathadvisor' || advisorContext.source === 'onboarding_wizard');
  
  // Day 40+ (Hardening): Prevent input scroll-into-view behavior in onboarding focus
  // This is the ONLY remaining JS for onboarding layout - minimal and scoped
  // We removed the 16ms interval loop and ResizeObserver in favor of CSS-first constraints
  // This effect only prevents browser scroll-into-view when input is focused (mobile keyboard edge case)
  useEffect(function preventInputScrollIntoView() {
    if (!isOnboardingFocus || !open) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }

    // Prevent browser from scrolling input into view when focused (mobile keyboard)
    // This is safe because it only temporarily overrides scrollIntoView, then restores it
    // Capture ref.current in a variable to avoid stale closure in cleanup
    const inputElement = inputRef.current;
    
    const handleFocus = function () {
      if (inputElement) {
        const originalScrollIntoView = inputElement.scrollIntoView;
        inputElement.scrollIntoView = function () { return; };
        setTimeout(function () {
          if (inputElement) {
            inputElement.scrollIntoView = originalScrollIntoView;
          }
        }, 100);
      }
    };
    
    if (inputElement) {
      inputElement.addEventListener('focus', handleFocus);
    }

    return function cleanup() {
      if (inputElement) {
        inputElement.removeEventListener('focus', handleFocus);
      }
    };
  }, [isOnboardingFocus, open]);

  /**
   * Day 40+ (Hardening): Internal hook to manage onboarding scroll lock
   * 
   * WHY WE SCROLL LOCK IN ONBOARDING:
   * - Backdrop blur edge bleeding: When backdrop-blur is used on the overlay backdrop,
   *   scrolling the page behind the modal causes the blur effect to show at viewport edges,
   *   creating a visual artifact. Locking scroll prevents this.
   * - Scroll-before-open behavior: If the user scrolls the onboarding page before opening
   *   Focus Mode, we need to capture and restore that scroll position to ensure the modal
   *   appears correctly and the page returns to the same position when closed.
   * 
   * WHY THIS REFACTOR IS SAFE:
   * - No behavior change: The hook contains the exact same logic as before, just extracted
   *   for clarity and maintainability. All style captures, restorations, and scroll position
   *   handling remain identical.
   * - Restores all prior styles: The cleanup function restores every style property that was
   *   modified (body overflow/position/width/top/left, html overflow), ensuring no style leaks.
   * - Uses consistent event options: Fixed removeEventListener to use the same options object
   *   as addEventListener (previously used `true` which could cause subtle browser edge cases
   *   or memory leaks if options don't match exactly).
   * 
   * @param opts.enabled - Whether scroll lock should be active (typically isOnboardingFocus && open)
   */
  function useOnboardingScrollLock(opts: { enabled: boolean }): void {
    useEffect(function lockScrollForBackdropBlur() {
      if (!opts.enabled) {
        return;
      }
      if (typeof document === 'undefined' || typeof window === 'undefined') {
        return;
      }

      // Capture current scroll position before locking
      // We need to restore this exact position when cleanup runs
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // Capture all original body styles so we can restore them exactly
      // This prevents any style leaks or side effects when the modal closes
      const originalBodyOverflow = document.body.style.overflow;
      const originalBodyPosition = document.body.style.position;
      const originalBodyWidth = document.body.style.width;
      const originalBodyTop = document.body.style.top;
      const originalBodyLeft = document.body.style.left;
      
      // Capture html element overflow style (we only modify overflow)
      // We only capture what we modify to keep the code minimal and clear
      const originalHtmlOverflow = document.documentElement.style.overflow;

      // Lock body scroll using fixed positioning
      // Fixed positioning with negative top/left offsets prevents scroll while maintaining
      // the visual appearance of the page at the current scroll position
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollTop}px`;
      document.body.style.left = `-${scrollLeft}px`;
      
      // Lock html element scroll
      // Overflow hidden is sufficient for html element - we don't set position fixed
      // because setting position fixed on html can cause viewport issues and cut off backdrop blur
      document.documentElement.style.overflow = 'hidden';

      // Prevent scroll via wheel, touch, and scroll events
      // These event listeners catch any scroll attempts (mouse wheel, trackpad, touch gestures)
      // and prevent them from propagating, ensuring the page behind the modal cannot scroll
      const preventScroll = function (e: Event) {
        e.preventDefault();
        e.stopPropagation();
      };
      
      // Shared options object for both addEventListener and removeEventListener
      // Using the same options object ensures exact matching and prevents memory leaks
      // passive: false allows preventDefault() to work
      // capture: true ensures we catch events in the capture phase before they bubble
      const preventScrollOptions: AddEventListenerOptions & EventListenerOptions = { 
        passive: false, 
        capture: true 
      };
      
      // Add event listeners with the options object
      window.addEventListener('wheel', preventScroll, preventScrollOptions);
      window.addEventListener('touchmove', preventScroll, preventScrollOptions);
      window.addEventListener('scroll', preventScroll, preventScrollOptions);

      return function cleanup() {
        // Restore all body styles to their original values
        // This ensures no style leaks persist after the modal closes
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.position = originalBodyPosition;
        document.body.style.width = originalBodyWidth;
        document.body.style.top = originalBodyTop;
        document.body.style.left = originalBodyLeft;
        
        // Restore html element styles
        document.documentElement.style.overflow = originalHtmlOverflow;
        
        // Restore scroll position using the captured values
        // This ensures the page returns to exactly where it was before the modal opened
        window.scrollTo(scrollLeft, scrollTop);
        
        // Remove event listeners using the SAME options object
        // This is critical: removeEventListener requires the exact same options that were
        // used in addEventListener, otherwise the listener may not be removed (memory leak)
        window.removeEventListener('wheel', preventScroll, preventScrollOptions);
        window.removeEventListener('touchmove', preventScroll, preventScrollOptions);
        window.removeEventListener('scroll', preventScroll, preventScrollOptions);
      };
    }, [opts.enabled]);
  }

  // Day 40+ (Hardening): Use extracted scroll lock hook
  // Only runs when isOnboardingFocus && open (same as before)
  useOnboardingScrollLock({ enabled: isOnboardingFocus && open });

  const getGradeDisplay = function () {
    if (profile.persona === 'job_seeker') {
      if (profile.goals.gradeBand === 'custom') {
        return profile.goals.targetGradeFrom + '–' + profile.goals.targetGradeTo;
      }
      const bandMap: Record<string, string> = {
        entry: 'GS-5–7',
        early: 'GS-7–9',
        mid: 'GS-9–11',
        senior: 'GS-12–13',
        unsure: 'Exploring',
      };
      return bandMap[profile.goals.gradeBand] || 'Not set';
    } else {
      return profile.goals.targetGradeFrom + '–' + profile.goals.targetGradeTo;
    }
  };

  // Day 43: Build right rail model when anchor exists
  // This transforms anchor + store data into a display-ready view model
  // The model drives the right rail UI (title, rows, source icon)
  // NOTE: Must be defined after getGradeDisplay() since we call it here
  const rightRailModel: FocusRightRailModel | null = activeAnchor
    ? buildFocusRightRailModel(activeAnchor, {
        selectedJob: selectedJob,
        benefitsScenario: activeScenarioId === 'A' ? benefitsScenarioA : benefitsScenarioB,
        profile: {
          persona: profile.persona,
          targetGrade: getGradeDisplay(),
          location: profile.location.currentMetroArea || undefined,
        },
        resume: {
          activeTargetJobTitle: activeTargetJob?.title,
          isTailoringMode: isTailoringMode,
        },
        dashboardMetrics: {
          totalComp: dashboardCompensation.totalCompensation,
        },
      } as FocusRightRailDependencies)
    : null;

  let contextTitle = 'Viewing: Dashboard';
  if (advisorContext.source === 'job-details' && advisorContext.jobTitle) {
    contextTitle = 'Viewing: ' + advisorContext.jobTitle;
  }


  // Day 40: SSR guard for portal rendering (onboarding overlay only)
  // Portal requires document.body which is not available during SSR

  // Day 40: Refs for onboarding overlay panel (for diagnostics)
  const messageListRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Day 40: Hard-disable expansion in onboarding focus context
  // Force isExpanded to false when opened from onboarding, even if state persists from previous sessions
  // Use derived state approach: if onboarding focus is active, expansion is always disabled
  // This avoids calling setState synchronously in useEffect (which triggers cascading renders)
  const effectiveIsExpanded = isOnboardingFocus ? false : isExpanded;

  // Day 40: Non-onboarding Focus Mode - restore pre-Day 40 sizing behavior
  // For non-onboarding, use Radix Dialog's default centering (no positioning overrides)
  // Normal size: comfortable but not huge (restored from Day 35 pre-expansion behavior)
  // Expanded size: significantly larger, near full-screen on desktop
  // Both variants: p-0 gap-0 flex flex-col overflow-hidden (required for internal grid layout)
  // NOTE: Onboarding uses portal overlay path (separate rendering logic below), not DialogContent
  const dialogClassNameNormal = effectiveIsExpanded
    ? 'w-full h-full max-w-none rounded-none sm:w-[99vw] sm:h-[98vh] sm:max-h-[98vh] lg:w-[98vw] lg:max-w-none lg:h-[95vh] lg:max-h-[95vh] sm:rounded-lg p-0 gap-0 flex flex-col overflow-hidden'
    : 'w-full h-full max-w-none rounded-none sm:w-[95vw] sm:h-[90vh] sm:max-h-[90vh] lg:w-[90vw] lg:max-w-6xl lg:h-[80vh] lg:max-h-[85vh] sm:rounded-lg p-0 gap-0 flex flex-col overflow-hidden';


  // Day 40+ (Hardening): Extract panel content into reusable function
  // This content is shared between onboarding portal overlay and non-onboarding Radix Dialog
  // Grid Layout: 3-row grid structure (header/content/composer) - CSS-first constraints
  // Row 1: Header (always visible, never scrolls) - auto height
  // Row 2: Main content (chat + optional right cards) - 1fr (takes remaining space)
  // Row 3: Input/composer (always visible, never scrolls) - auto height
  // Only the message list scrolls (overflow-y-auto), and it never forces the panel to grow
  // CSS classes handle all constraints - no inline style calculations needed
  const renderPanelContent = function () {
    return (
      <div 
        className={isOnboardingFocus 
          ? "grid min-h-0 overflow-hidden h-full max-h-full grid-rows-[auto_1fr_auto]"
          : "grid min-h-0 overflow-hidden flex-1 grid-rows-[auto_1fr_auto]"
        }
      >
        {/* Day 40 Grid Layout Row 1: Header - normal header row (no sticky positioning)
            Removed sticky behavior completely to prevent header clipping issues
            Header is always visible as first grid row, never scrolls */}
        <header ref={headerRef} className="flex items-center justify-between p-3 lg:p-4 border-b border-border bg-background">
          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base lg:text-lg font-semibold">PathAdvisor AI</h2>
              <div className="hidden sm:flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs font-normal gap-1">
                  <Briefcase className="w-3 h-3" />
                  {contextTitle}
                </Badge>
                <Badge variant="secondary" className="text-xs font-normal gap-1">
                  <Target className="w-3 h-3" />
                  Target: {getGradeDisplay()}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 lg:gap-2 shrink-0">
            {/* Day 40: Hide expand toggle in onboarding (already desired) */}
            {!isOnboardingFocus && (
              <Button
                variant="ghost"
                size="icon"
                onClick={function () {
                  setIsExpanded(function (prev) {
                    return !prev;
                  });
                }}
                className="h-8 w-8"
                title={effectiveIsExpanded ? 'Make smaller' : 'Make larger'}
              >
                {effectiveIsExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
                <span className="sr-only">{effectiveIsExpanded ? 'Make smaller' : 'Make larger'}</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={function () { onOpenChange(false); }}
              className="hidden sm:flex gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Minimize2 className="w-4 h-4" />
              Exit Focus Mode
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={function () { onOpenChange(false); }}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </header>
        {/* Day 40 Grid Layout Row 2: Main content wrapper (chat + optional right cards)
            This row takes flex-1 (1fr in grid) and contains the scrollable message list
            Outer wrapper has min-h-0 and overflow-hidden to prevent panel expansion
            Inner flex layout handles chat column + optional right sidebar */}
        <div 
          className="min-h-0 overflow-hidden flex flex-col lg:flex-row"
          style={isOnboardingFocus ? {
            // Strictly constrain the middle grid row to prevent expansion
            height: '100%',
            maxHeight: '100%',
            minHeight: 0,
            overflow: 'hidden',
            flexShrink: 1,
            flexGrow: 0,
            boxSizing: 'border-box',
          } : undefined}
        >
          {/* Chat column */}
          {/* Day 40: In onboarding focus, chat takes full width (no right column) */}
          <div className={isOnboardingFocus ? 'flex-1 flex flex-col min-h-0' : 'flex-1 lg:flex-[2] flex flex-col min-h-0 lg:border-r border-border'}>
            {/* Day 40+ (Hardening): Grid Layout - Message list - ONLY scrollable region
                For onboarding: h-full (fills parent grid row) instead of flex-1
                For non-onboarding: flex-1 (takes available space within chat column)
                min-h-0: critical for flex shrinking (allows this to shrink below content size)
                overflow-y-auto: enables vertical scrolling when content exceeds height
                overflow-x-hidden: prevents horizontal overflow
                break-words: ensures long words wrap instead of causing overflow
                This is the ONLY element that scrolls - header and composer never scroll
                CSS classes handle all constraints - no inline style calculations needed */}
            {/* Day 43: Message list with scroll tracking for Latest Visibility UX */}
            <div
              ref={messageListRef}
              onScroll={handleMessageListScroll}
              className={isOnboardingFocus 
                ? 'h-full max-h-full overflow-y-auto overflow-x-hidden min-h-0 p-3 lg:p-4 pb-6 space-y-3 break-words relative'
                : 'flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-3 lg:p-4 pb-6 space-y-3 break-words relative'
              }
            >
              {isSensitiveHidden && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 lg:p-3 text-xs">
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Privacy mode active:</strong> PathAdvisor
                    can still help with high-level guidance without displaying exact amounts.
                  </p>
                </div>
              )}

              {/* Day 43: Anchor Header - shows when activeAnchor exists */}
              {/* Display anchor origin and summary at the top of the message area */}
              {activeAnchor && (
                <div className="mb-4 pb-4 border-b border-border">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Briefcase className="w-3 h-3 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">
                        Asked from: <span className="font-medium text-foreground">{activeAnchor.sourceLabel}</span>
                      </p>
                      <p className="text-sm text-foreground">{activeAnchor.summary}</p>
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Ask from a different card to change this focus.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================
                  Day 43 Option A: Collapsible Context Panel (Single-Column Layouts)
                  ================================================================
                  
                  WHY THIS EXISTS:
                  In single-column layouts (e.g., Resume Builder, mobile/tablet views),
                  there is no right rail to show anchor context cards. Option A adds
                  a COLLAPSIBLE Context panel directly in the thread area.
                  
                  LAYOUT RULES:
                  - lg:hidden: Hidden on large screens where right rail is visible
                  - Visible on smaller screens as the PRIMARY context surface
                  
                  AUTO-EXPAND BEHAVIOR:
                  - When Focus Mode opens via Ask action, panel auto-expands
                  - User can collapse to save space
                  - New Ask action re-expands (Day 43 visibility contract)
                  
                  DEPENDENCIES:
                  We pass the same dependencies used for rightRailModel so the
                  AnchorContextPanel can show enriched context when available.
                  ================================================================ */}
              {!isOnboardingFocus && activeAnchor && (
                <AnchorContextPanel
                  className="lg:hidden"
                  dependencies={{
                    selectedJob: selectedJob,
                    benefitsScenario: activeScenarioId === 'A' ? benefitsScenarioA : benefitsScenarioB,
                    profile: {
                      persona: profile.persona,
                      targetGrade: getGradeDisplay(),
                      location: profile.location.currentMetroArea || undefined,
                    },
                    resume: {
                      activeTargetJobTitle: activeTargetJob?.title,
                      isTailoringMode: isTailoringMode,
                    },
                    dashboardMetrics: {
                      totalComp: dashboardCompensation.totalCompensation,
                    },
                  } as FocusRightRailDependencies}
                />
              )}

              {/* ================================================================
                  Day 43: CHANGE PROPOSALS SECTION (Guidance Model)
                  ================================================================
                  
                  CRITICAL CONTRACT:
                  PathAdvisor is NOT a ChatGPT-style author. Any resume-related
                  suggestion MUST be shown as a Change Proposal with:
                  - WHAT changed (before/after)
                  - WHY it changed (justification)
                  - WHAT it maps to (USAJOBS, GS-norm, etc.)
                  
                  This section renders BEFORE the chat thread so users see
                  suggested changes prominently. The ChangeProposalCard is
                  the ONLY allowed UI for presenting resume rewrites.
                  
                  RENDERING RULES:
                  - Only show proposals for the active anchor
                  - Filter out dismissed proposals from display
                  - Show "Suggested changes" header with count
                  ================================================================ */}
              {activeAnchor && (function () {
                // Filter proposals for current anchor, excluding dismissed
                const anchorProposals = proposals.filter(function (p) {
                  return p.anchorId === activeAnchor.id && p.status !== 'dismissed';
                });

                if (anchorProposals.length === 0) {
                  return null;
                }

                return (
                  <div className="space-y-4 mb-6 pb-6 border-b border-border">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Suggested changes ({anchorProposals.length})
                    </h3>
                    {anchorProposals.map(function (proposal) {
                      return (
                        <ChangeProposalCard
                          key={proposal.id}
                          proposal={proposal}
                          onDismiss={dismissProposal}
                          onApply={function (p) {
                            // Mark as applied (actual resume modification handled elsewhere)
                            markProposalApplied(p.id);
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })()}

              {messages.length > 0 ? (
                <>
                  {messages.map(function (message) {
                    // Day 43: Determine if this message should be highlighted
                    // Highlight is applied to the newest assistant message after an Ask-open
                    // The highlight is a subtle border/glow that fades after ~1.2 seconds
                    //
                    // WHY SUBTLE HIGHLIGHT (trust-first):
                    // A flashy animation would feel aggressive and break trust. The subtle
                    // accent border draws attention without being intrusive. The user sees
                    // what changed without feeling like the UI is shouting at them.
                    const isHighlighted = highlightMessageId === message.id;

                    return (
                      <div
                        key={message.id}
                        className={
                          'rounded-lg p-2.5 lg:p-3 text-sm break-words transition-all duration-300 ' +
                          (message.role === 'user'
                            ? 'bg-accent/20 border border-accent/30 ml-4 lg:ml-8'
                            : 'bg-secondary/20 border mr-4 lg:mr-8 ' +
                              // Day 43: Apply highlight styling to assistant messages
                              // Highlighted: accent border + subtle glow background
                              // Normal: secondary border
                              (isHighlighted
                                ? 'border-accent/60 bg-accent/10 ring-2 ring-accent/20'
                                : 'border-secondary/30'))
                        }
                      >
                        {/* Task 4: break-words and whitespace-pre-wrap ensure long content wraps without overflow */}
                        <p className="text-muted-foreground whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    );
                  })}
                  {/* Day 43: End-of-thread sentinel for scrollIntoView */}
                  {/* This invisible div is used as the scroll target for scrollToBottom() */}
                  <div ref={endSentinelRef} aria-hidden="true" />
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    {activeAnchor ? (
                      <>
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Ready to help with {activeAnchor.sourceLabel.toLowerCase()}</p>
                        <p className="text-xs mt-1">
                          {activeAnchor.summary}
                        </p>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No active focus yet</p>
                        <p className="text-xs mt-1">
                          Ask from a card to begin.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ================================================================
                  Day 43: "Jump to latest" floating control (Latest Visibility UX)
                  ================================================================
                  
                  WHEN SHOWN:
                  - hasNewMessages is true (new messages arrived)
                  - isNearBottom is false (user has scrolled up)
                  
                  WHY THIS EXISTS:
                  When the user is reading older content and new messages arrive,
                  we do NOT force-scroll them to the bottom (that would be rude
                  and destroy their reading context). Instead, we show this subtle
                  floating control that:
                  1. Indicates there are new messages ("New message")
                  2. Provides a CTA to jump to them when ready ("Jump to latest")
                  
                  DESIGN CHOICES (trust-first):
                  - Small, non-intrusive button that doesn't block content
                  - Positioned at bottom of message area for easy access
                  - Uses accent color to draw attention without being aggressive
                  - Smooth scroll on click for pleasant navigation
                  ================================================================ */}
              {hasNewMessages && !isNearBottom && (
                <div className="sticky bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="pointer-events-auto shadow-lg border border-accent/30 bg-background/95 backdrop-blur-sm hover:bg-accent/10 gap-1.5"
                    onClick={handleJumpToLatest}
                  >
                    <span className="text-xs text-muted-foreground">New message</span>
                    <ChevronDown className="w-3 h-3 text-accent" />
                    <span className="text-xs font-medium">Jump to latest</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Context column - hidden on mobile */}
          {/* Day 40: Ensure sidebar scrolls within frame bounds (overflow-y-auto min-h-0) */}
          {/* Day 40: Hide right-side cards in onboarding focus for maximum chat area */}
          {/* Day 43: Right rail is now anchor-aware - shows context based on activeAnchor */}
          {!isOnboardingFocus ? (
            <aside className="hidden lg:flex w-full lg:flex-[1] shrink-0 overflow-y-auto min-h-0 p-4 space-y-4 bg-muted/10 flex-col">
            {/* Day 35: Dashboard context - show Mission Board and Coach Notes */}
            {customSidebarContent ? (
              customSidebarContent
            ) : (
              <>
                {/* Day 43: Anchor Context Card - driven by rightRailModel */}
                {/* When activeAnchor exists, show anchor-scoped context instead of generic cards */}
                {rightRailModel ? (
                  <Card className="border-accent/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {/* Icon based on source type */}
                        {rightRailModel.source === 'job' && <Briefcase className="w-4 h-4 text-accent" />}
                        {rightRailModel.source === 'resume' && <Target className="w-4 h-4 text-accent" />}
                        {rightRailModel.source === 'resume-review' && <FileCheck className="w-4 h-4 text-accent" />}
                        {rightRailModel.source === 'benefits' && <BarChart3 className="w-4 h-4 text-accent" />}
                        {rightRailModel.source === 'dashboard' && <Target className="w-4 h-4 text-accent" />}
                        {rightRailModel.source === 'import' && <Sparkles className="w-4 h-4 text-accent" />}
                        {rightRailModel.source === 'retirement' && <BarChart3 className="w-4 h-4 text-accent" />}
                        {rightRailModel.title}
                      </CardTitle>
                      {rightRailModel.subtitle && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {rightRailModel.subtitle}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      {/* Anchor summary if present */}
                      {rightRailModel.summary && (
                        <div className="pb-2 mb-2 border-b border-border">
                          <p className="text-muted-foreground italic text-xs">
                            &ldquo;{rightRailModel.summary}&rdquo;
                          </p>
                        </div>
                      )}
                      {/* Context rows from model */}
                      {rightRailModel.rows.map(function (row, index) {
                        return (
                          <div key={row.label + '-' + index} className="flex justify-between">
                            <span className="text-muted-foreground">{row.label}</span>
                            {row.isSensitive ? (
                              <SensitiveValue value={row.value} className="font-medium" />
                            ) : (
                              <span className="truncate max-w-[140px]">{row.value}</span>
                            )}
                          </div>
                        );
                      })}
                      {/* Day 43 UX Hint: Reinforce anchor mental model in right rail too */}
                      <p className="text-muted-foreground italic pt-2 border-t border-border mt-2">
                        Ask from another card to change this focus.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Fallback: Show generic Profile + Metrics if no anchor (backward compatibility) */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Target className="w-4 h-4 text-accent" />
                          Your Profile
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type</span>
                          <span>
                            {profile.persona === 'job_seeker' ? 'Job Seeker' : 'Federal Employee'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Target Grade</span>
                          <span>{getGradeDisplay()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Location</span>
                          <span className="truncate max-w-[120px]">
                            {profile.location.currentMetroArea || 'Not set'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Active Job (if tailoring) - only show in fallback mode */}
                    {isTailoringMode && activeTargetJob && (
                      <Card className="border-accent/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-accent" />
                            Active Job
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                          <div className="font-medium">{activeTargetJob.title}</div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Grade</span>
                            <span>{activeTargetJob.grade}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Agency</span>
                            <span className="truncate max-w-[120px]">{activeTargetJob.agency}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Key Metrics - only show in fallback mode */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-accent" />
                          Key Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Est. Total Comp</span>
                          <SensitiveValue value="$142,500" className="font-medium" />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">COL Impact</span>
                          <span className="text-emerald-400">-8% vs current</span>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Day 43: Suggested Prompts - scoped by anchor source */}
                {/* When activeAnchor exists, show source-scoped prompts. Otherwise show generic prompts or hide. */}
                {activeAnchor && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Suggested prompts</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {getScopedPrompts(activeAnchor.source).map(function (prompt) {
                        return (
                          <Badge
                            key={prompt}
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-accent/10"
                            onClick={function () {
                              onInputChange(prompt);
                            }}
                          >
                            {prompt}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Fallback: Show generic suggested topics if no anchor (for backwards compatibility) */}
                {!activeAnchor && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Suggested topics</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {['Salary comparison', 'Retirement impact', 'FEHB options', 'PCS costs'].map(
                        function (topic) {
                          return (
                            <Badge
                              key={topic}
                              variant="outline"
                              className="text-xs cursor-pointer hover:bg-accent/10"
                              onClick={function () { onInputChange('Tell me about ' + topic.toLowerCase()); }}
                            >
                              {topic}
                            </Badge>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </aside>
          ) : null}
        </div>
        {/* Day 40 Grid Layout Row 3: Input/composer (always visible, never scrolls)
            Moved from inside chat column to be the 3rd grid row
            This ensures composer is always visible and never scrolls
            border-t and padding maintain visual separation from content above */}
        <div className="border-t border-border p-3 lg:p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Ask about job impact, PCS, retirement..."
              className="text-sm h-10 bg-background border-border flex-1"
              value={inputValue}
              onChange={function (e) { onInputChange(e.target.value); }}
              onKeyDown={handleKeyDown}
              // Day 40: Prevent viewport expansion on mobile when keyboard appears
              onFocus={function () {
                if (isOnboardingFocus) {
                  // Prevent browser from scrolling input into view
                  if (inputRef.current) {
                    inputRef.current.scrollIntoView = function () { return; };
                  }
                }
              }}
              style={isOnboardingFocus ? { 
                // Prevent mobile browser from resizing viewport
                touchAction: 'manipulation',
              } : undefined}
            />
            <Button
              size="icon"
              className="h-10 w-10 bg-accent text-accent-foreground hover:bg-accent/90 flex-shrink-0"
              onClick={handleSend}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Day 40: For onboarding, render portal overlay instead of Radix Dialog to avoid nested dialog issues
  // For non-onboarding, use Radix Dialog as before (unchanged behavior)
  // Day 40: Portal directly to document.body for deterministic rendering (no delayed mount complexity)
  if (isOnboardingFocus && open) {
    if (typeof document === 'undefined') {
      return null; // SSR guard
    }

    const overlayContent = (
      <div 
        className="fixed inset-0 z-[101] flex items-center justify-center" 
        style={{ 
          pointerEvents: 'auto',
          padding: '2rem',
        }}
      >
        {/* Backdrop - fixed positioning covers full viewport
            Note: backdrop covers entire viewport, blur may extend to edges */}
        <div
          className="fixed inset-0 bg-black/80 z-[100]"
          onClick={function () { onOpenChange(false); }}
          style={{
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
          }}
        />
        {/* Day 40+ (Hardening): Viewport-centered panel with CSS-first height bounds
            Position: relative (centered by parent flex container)
            Fixed width: w-[min(960px,calc(100vw-3rem))] ensures stable width (CSS class)
            Fixed height: h-[min(600px,calc(100dvh-80px))] ensures viewport-bounded height (CSS class)
            max-height: max-h-[calc(100dvh-80px)] as hard bound (CSS class)
            min-h-0: critical for flex shrinking (CSS class)
            overflow-hidden: ensures internal scrolling, not panel expansion (CSS class)
            The parent flex container (items-center justify-center) ensures the panel is always
            centered in the viewport, regardless of scroll position before opening
            Higher z-index and isolation ensure it renders above backdrop blur with solid background
            CSS containment (contain: layout style size) prevents content from affecting panel size
            All constraints are CSS-based - no JS calculations or polling loops */}
        <div
          ref={panelRef}
          className="relative bg-background border shadow-lg rounded-none sm:rounded-lg w-[min(960px,calc(100vw-3rem))] max-w-[960px] h-[min(600px,calc(100dvh-80px))] max-h-[calc(100dvh-80px)] min-h-0 mt-12 flex flex-col overflow-hidden z-[102]"
          style={{
            // CSS containment to prevent content from affecting size (performance optimization)
            contain: 'layout style size',
            // Isolation creates new stacking context (prevents z-index issues)
            isolation: 'isolate',
            // Explicit flex constraints (redundant with classes but ensures no override)
            flexShrink: 0,
            flexGrow: 0,
            boxSizing: 'border-box',
          }}
          onClick={function (e) { e.stopPropagation(); }}
        >
          {renderPanelContent()}
        </div>
      </div>
    );

    return createPortal(overlayContent, document.body);
  }

  // Day 40: Non-onboarding path - use Radix Dialog as before (unchanged)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={dialogClassNameNormal + ' !z-[101]'}
        showCloseButton={false}
      >
        <VisuallyHidden.Root>
          <DialogTitle>PathAdvisor AI Focus Mode</DialogTitle>
          <DialogDescription>
            Chat with PathAdvisor AI to get personalized career guidance and job search advice.
          </DialogDescription>
        </VisuallyHidden.Root>
        {renderPanelContent()}
      </DialogContent>
    </Dialog>
  );
}
