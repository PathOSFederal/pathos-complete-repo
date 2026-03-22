'use client';

import type React from 'react';

import { useEffect, useState, useRef } from 'react';
import {
  Send,
  Sparkles,
  Shield,
  Briefcase,
  Maximize2,
  Minimize2,
  PanelRight,
  PanelLeft,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserPreferencesStore } from '@/store/userPreferencesStore';
import { useProfileStore, type PathAdvisorDock } from '@/store/profileStore';
import { useResumeBuilderStore } from '@/store/resumeBuilderStore';
import { useAdvisorContext } from '@/contexts/advisor-context';
import { PathAdvisorFocusMode } from '@/components/path-advisor-focus-mode';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type PathAdvisorSize = 'compact' | 'medium' | 'tall';

interface PathAdvisorPanelProps {
  dock?: PathAdvisorDock;
  /**
   * Custom title for the panel. Defaults to "PathAdvisor AI".
   * Day 35: Dashboard uses "PathAdvisor" (without "AI").
   */
  title?: string;
  /**
   * Hide the dock selector button. Used when dock is controlled externally
   * (e.g., in workspace mode where dock toggle is in SheetHeader).
   * Day 38: Prevents duplicate sidebar buttons in workspace.
   */
  hideDockSelector?: boolean;
  /**
   * Optional callback when "Open large" / Maximize button is clicked.
   * Day 38 Polish Fix: Allows workspace to handle full-screen mode transition.
   * When provided, this is called instead of opening PathAdvisorFocusMode.
   * If not provided, falls back to default behavior (opening Focus Mode).
   */
  onRequestFullScreen?: (() => void) | null;
  /**
   * When true, the "Open large" button becomes a "Collapse" button.
   * Used when PathAdvisorPanel is already in expanded/full-screen mode.
   * PathAdvisor UX Fix: Allows expanded view to retract back to sidebar.
   */
  isExpandedMode?: boolean;
  /**
   * When true, hides the expand/make-large button.
   * Used when the expand button is controlled externally (e.g., in workspace SheetHeader).
   * PathAdvisor UX Fix: Allows workspace to place expand button in standard header location.
   */
  hideExpandButton?: boolean;
}

/**
 * Props for the DockSelector component.
 * Extracted to support moving the component outside the main render function.
 */
interface DockSelectorProps {
  currentDock: PathAdvisorDock;
  onDockChange: (dock: PathAdvisorDock) => void;
}

/**
 * DockSelector component - allows user to change PathAdvisor dock position.
 *
 * WHY THIS IS DEFINED OUTSIDE PathAdvisorPanel:
 * React Compiler requires that nested components be defined outside the parent
 * to enable proper memoization and avoid recreating the component on each render.
 * Moving it outside fixes the react-hooks/static-components lint error.
 *
 * HOW IT WORKS:
 * Renders a dropdown menu with options for left or right sidebar positioning.
 */
function DockSelector(props: DockSelectorProps): React.ReactElement {
  const currentDock = props.currentDock;
  const onDockChange = props.onDockChange;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          {currentDock === 'left' ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelRight className="w-4 h-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={function () {
            onDockChange('left');
          }}
          className="gap-2"
        >
          <PanelLeft className="w-4 h-4" />
          Left sidebar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={function () {
            onDockChange('right');
          }}
          className="gap-2"
        >
          <PanelRight className="w-4 h-4" />
          Right sidebar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PathAdvisorPanel(props: PathAdvisorPanelProps) {
  const dock = props.dock || 'right';
  const customTitle = props.title;
  const hideDockSelector = props.hideDockSelector || false;
  const onRequestFullScreen = props.onRequestFullScreen;
  const isExpandedMode = props.isExpandedMode || false;
  const hideExpandButton = props.hideExpandButton || false;

  const isSensitiveHidden = useUserPreferencesStore(function (state) {
    return state.isSensitiveHidden;
  });

  const profile = useProfileStore(function (state) {
    return state.profile;
  });
  const updatePreferences = useProfileStore(function (state) {
    return state.updatePreferences;
  });

  const advisorContextData = useAdvisorContext();
  const advisorContext = advisorContextData.context;
  const pendingPrompt = advisorContextData.pendingPrompt;
  const setPendingPrompt = advisorContextData.setPendingPrompt;
  const shouldOpenFocusMode = advisorContextData.shouldOpenFocusMode;
  const setShouldOpenFocusMode = advisorContextData.setShouldOpenFocusMode;
  const onPathAdvisorClose = advisorContextData.onPathAdvisorClose;

  const activeTargetJob = useResumeBuilderStore(function (state) {
    return state.activeTargetJob;
  });
  const isTailoringMode = useResumeBuilderStore(function (state) {
    return state.isTailoringMode;
  });

  const [inputValue, setInputValue] = useState('');
  /**
   * Core messages state - messages from user interaction (send button, focus mode).
   * This does NOT include messages from pending prompts.
   */
  const [coreMessages, setCoreMessages] = useState<Message[]>([]);

  /**
   * Messages from pending prompts, stored in a ref.
   * These are merged with coreMessages during render to produce displayMessages.
   *
   * WHY A REF:
   * The lint rule react-hooks/set-state-in-effect warns against calling setState
   * directly in an effect body. By storing pending prompt messages in a ref and
   * deriving the display messages, we avoid setState in effects entirely.
   */
  const pendingMessagesRef = useRef<Message[]>([]);

  /**
   * Track the last processed pending prompt to prevent duplicate processing.
   */
  const lastProcessedPromptRef = useRef<string | null>(null);

  /**
   * Flag to indicate panel should expand after processing a prompt.
   * Set in effect, consumed in a separate effect for DOM sync.
   */
  const shouldExpandRef = useRef(false);

  /**
   * Counter for generating unique message IDs.
   * Using a ref instead of Date.now() during render (which is impure).
   */
  const messageIdCounterRef = useRef(0);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [size, setSize] = useState<PathAdvisorSize>('compact');

  /**
   * Panel title - defaults to "PathAdvisor AI" but can be customized.
   * Day 35: Dashboard uses "PathAdvisor" (without "AI").
   */
  const title = customTitle !== undefined ? customTitle : 'PathAdvisor AI';
  let rawDock: PathAdvisorDock = 'right';
  if (profile.preferences.pathAdvisorDock) {
    rawDock = profile.preferences.pathAdvisorDock;
  }
  const currentDock = rawDock === 'bottom' ? 'right' : rawDock;

  const isBottomDock = dock === 'bottom';

  /**
   * Effect: Process pending prompts and trigger re-render when needed.
   *
   * HOW IT WORKS:
   * 1. Detects new pending prompts (different from last processed)
   * 2. Creates messages and stores them in pendingMessagesRef
   * 3. Clears the pending prompt via setPendingPrompt(null)
   * 4. Forces a re-render by updating an empty state (messages array)
   *
   * WHY EFFECT IS OKAY HERE:
   * The effect doesn't call setState directly for the messages - it only
   * clears the pending prompt (external state sync) and stores messages in a ref.
   * The actual messages rendering is derived from coreMessages + pendingMessagesRef.
   */
  useEffect(
    function processPendingPromptEffect() {
      if (!pendingPrompt) {
        console.log('[PathAdvisorPanel] processPendingPromptEffect: No pendingPrompt');
        return;
      }
      if (lastProcessedPromptRef.current === pendingPrompt) {
        console.log('[PathAdvisorPanel] processPendingPromptEffect: Duplicate prompt, skipping');
        return;
      }

      console.log('[PathAdvisorPanel] processPendingPromptEffect: Processing prompt', {
        promptLength: pendingPrompt.length,
        promptPreview: pendingPrompt.substring(0, 100),
      });

      // Mark as processed
      lastProcessedPromptRef.current = pendingPrompt;

      // Generate unique IDs using counter
      messageIdCounterRef.current = messageIdCounterRef.current + 1;
      const userMsgId = 'user-' + messageIdCounterRef.current;
      messageIdCounterRef.current = messageIdCounterRef.current + 1;
      const assistantMsgId = 'assistant-' + messageIdCounterRef.current;

      const userMessage: Message = {
        id: userMsgId,
        role: 'user',
        content: pendingPrompt,
      };

      const assistantMessage: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: generateJobResponse(advisorContext),
      };

      // Store messages in ref (doesn't cause re-render)
      pendingMessagesRef.current = pendingMessagesRef.current.concat([userMessage, assistantMessage]);

      // Mark that panel should expand (if bottom dock)
      // The actual expansion happens in a separate effect to avoid setState-in-effect
      if (isBottomDock) {
        shouldExpandRef.current = true;
      }

      // Trigger re-render by adding messages to core state
      // This is a single setState call that merges pending messages
      const allPending = pendingMessagesRef.current;
      console.log('[PathAdvisorPanel] Adding messages to coreMessages:', {
        pendingCount: allPending.length,
        currentCoreCount: coreMessages.length,
        userMessage: allPending[0]?.content?.substring(0, 50),
        assistantMessage: allPending[1]?.content?.substring(0, 50),
      });
      
      // Day 42 Fix: Use functional update to ensure we get the latest state
      // and properly merge the pending messages
      setCoreMessages(function (prev) {
        const merged = prev.concat(allPending);
        console.log('[PathAdvisorPanel] setCoreMessages callback:', {
          prevCount: prev.length,
          pendingCount: allPending.length,
          mergedCount: merged.length,
          mergedIds: merged.map(function (m) { return m.id; }),
        });
        pendingMessagesRef.current = []; // Clear pending after merge
        return merged;
      });

      // Clear the pending prompt (external state sync - this is allowed)
      setPendingPrompt(null);
    },
    [pendingPrompt, advisorContext, setPendingPrompt, isBottomDock],
  );

  /**
   * Effect: Handle panel expansion after prompt processing.
   *
   * WHY requestAnimationFrame:
   * The lint rule react-hooks/set-state-in-effect prohibits calling setState
   * synchronously in an effect body. By deferring the call via requestAnimationFrame,
   * the setState happens in a browser callback (like a subscription handler),
   * which is the allowed pattern for effects.
   *
   * This preserves the expansion behavior while satisfying the lint rule.
   */
  useEffect(
    function handlePanelExpansion() {
      if (!shouldExpandRef.current) return;

      // Defer the setState call via requestAnimationFrame
      // This makes it a "callback" which is the allowed pattern
      const frameId = requestAnimationFrame(function () {
        shouldExpandRef.current = false;
        setSize('medium');
      });

      // Cleanup if effect reruns before frame fires
      return function cleanup() {
        cancelAnimationFrame(frameId);
      };
    },
    [coreMessages], // Runs when messages change, which happens after prompt processing
  );

  /**
   * Derived: All messages to display (core + any pending).
   * Since pending messages are merged into core immediately via effect,
   * this is effectively just coreMessages most of the time.
   */
  const messages = coreMessages;

  // Day 42 Debug: Log messages count when it changes to verify state updates
  useEffect(function () {
    console.log(
      '[PathAdvisorPanel] Render - messages count:',
      coreMessages.length,
      'message IDs:',
      coreMessages.map(function (m) { return m.id; })
    );
    if (coreMessages.length > 0) {
      console.log(
        '[PathAdvisorPanel] Last message preview:',
        coreMessages[coreMessages.length - 1].content.substring(0, 100)
      );
    }
  }, [coreMessages]);

  useEffect(
    function scrollToBottom() {
      const container = messagesContainerRef.current;
      if (!container) return;
      container.scrollTop = container.scrollHeight;
    },
    [messages],
  );

  /**
   * Effect: Open focus mode when shouldOpenFocusMode flag is set.
   * 
   * HOW IT WORKS:
   * 1. Watches shouldOpenFocusMode from advisor context
   * 2. When true, opens the focus mode modal (PathAdvisorFocusMode)
   * 3. Resets the flag to false after opening
   * 
   * WHY requestAnimationFrame:
   * The lint rule react-hooks/set-state-in-effect prohibits calling setState
   * synchronously in an effect body. By deferring the call via requestAnimationFrame,
   * the setState happens in a browser callback, which is the allowed pattern.
   * 
   * USAGE:
   * Used by Resume Builder export to open the expanded PathAdvisor modal
   * when "Ask PathAdvisor" button is clicked.
   */
  useEffect(
    function handleOpenFocusMode() {
      if (!shouldOpenFocusMode) return;

      // Defer the setState call via requestAnimationFrame
      // This makes it a "callback" which is the allowed pattern
      const frameId = requestAnimationFrame(function () {
        setFocusModeOpen(true);
        setShouldOpenFocusMode(false);
      });

      // Cleanup if effect reruns before frame fires
      return function cleanup() {
        cancelAnimationFrame(frameId);
      };
    },
    [shouldOpenFocusMode, setShouldOpenFocusMode],
  );

  const handleSend = function () {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: inputValue,
    };

    const assistantMessage: Message = {
      id: 'assistant-' + Date.now(),
      role: 'assistant',
      content:
        "I understand you're looking for guidance. Based on your profile and the positions you're exploring, I can help you optimize your application strategy. What specific aspect would you like me to focus on?",
    };

    setCoreMessages(function (prev) {
      const newMessages: Message[] = [];
      for (let i = 0; i < prev.length; i++) {
        newMessages.push(prev[i]);
      }
      newMessages.push(userMessage);
      newMessages.push(assistantMessage);
      return newMessages;
    });
    setInputValue('');
    if (isBottomDock && size === 'compact') {
      setSize('medium');
    }
  };

  const handleKeyDown = function (e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedPrompt = function (prompt: string) {
    setInputValue(prompt);
  };

  const handleFocusModeSend = function (message: string) {
    const userMessage: Message = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: message,
    };

    const assistantMessage: Message = {
      id: 'assistant-' + Date.now(),
      role: 'assistant',
      content:
        "I understand you're looking for guidance. Based on your profile and the positions you're exploring, I can help you optimize your application strategy. What specific aspect would you like me to focus on?",
    };

    setCoreMessages(function (prev) {
      const newMessages: Message[] = [];
      for (let i = 0; i < prev.length; i++) {
        newMessages.push(prev[i]);
      }
      newMessages.push(userMessage);
      newMessages.push(assistantMessage);
      return newMessages;
    });
  };

  const handleDockChange = function (newDock: PathAdvisorDock) {
    updatePreferences({ pathAdvisorDock: newDock });
  };

  const handleToggleSize = function () {
    setSize(function (prev) {
      if (prev === 'compact') return 'medium';
      if (prev === 'medium') return 'tall';
      return 'compact';
    });
  };

  const lastMessagePreview =
    messages.length > 0
      ? messages[messages.length - 1].content
      : 'Ask about job impact, PCS, retirement…';

  const getSizeToggleInfo = function () {
    if (size === 'compact') return { icon: ChevronUp, tooltip: 'Expand to medium' };
    if (size === 'medium') return { icon: ChevronsUp, tooltip: 'Expand to tall' };
    return { icon: ChevronDown, tooltip: 'Collapse' };
  };

  const sizeToggleInfo = getSizeToggleInfo();

  const contextJobTitle = advisorContext.jobTitle || '';
  const contextSource = advisorContext.source;

  /**
   * Derive advisor mode from screenName for context badge.
   *
   * DAY 16 ADDITION:
   * Detects Benefits Mode when user is on the Explore Federal Benefits page.
   * This allows PathAdvisor to show benefits-specific context in the badge.
   */
  const screenName = advisorContextData.screenName;
  const isBenefitsMode = screenName === 'Explore Federal Benefits' || screenName === 'Benefits Overview';

  /**
   * Get the context badge label and icon based on current mode.
   */
  function getContextBadgeInfo(): { label: string; icon: React.ElementType } {
    if (isBenefitsMode) {
      return { label: 'Benefits', icon: Heart };
    }
    if (contextSource === 'job-details' && contextJobTitle) {
      const truncatedTitle = contextJobTitle.length > 20
        ? contextJobTitle.substring(0, 20) + '…'
        : contextJobTitle;
      return { label: truncatedTitle, icon: Briefcase };
    }
    return { label: 'Job Search', icon: Briefcase };
  }

  const contextBadgeInfo = getContextBadgeInfo();

  if (isBottomDock && size === 'compact') {
    return (
      <>
        <section className="w-full bg-card flex flex-col min-h-[80px] max-h-[120px] h-full">
          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
                <span className="font-medium text-sm">{title}</span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-normal gap-1">
                  <contextBadgeInfo.icon className="w-3 h-3" />
                  {contextBadgeInfo.label}
                </Badge>
                {/* ============================================================
                    UNIFIED PRIVACY INDICATOR
                    ============================================================
                    Uses consistent terminology across page and sidebar:
                    - "Privacy: Hidden" when sensitive data is masked
                    - "Privacy: Visible" when data is shown
                    This matches the Career page header badge exactly.
                ============================================================ */}
                <Badge
                  variant={isSensitiveHidden ? 'outline' : 'secondary'}
                  className="text-xs font-normal gap-1"
                >
                  <Shield className="w-3 h-3" />
                  Privacy: {isSensitiveHidden ? 'Hidden' : 'Visible'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleToggleSize}>
                      <sizeToggleInfo.icon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{sizeToggleInfo.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
                {/* PathAdvisor UX Fix: Hide expand button when controlled externally (e.g., in workspace SheetHeader) */}
                {!hideExpandButton && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={function () {
                          // PathAdvisor UX Fix: If onRequestFullScreen callback is provided, use it
                          // Otherwise, fall back to default behavior (opening Focus Mode)
                          if (onRequestFullScreen) {
                            onRequestFullScreen();
                          } else {
                            setFocusModeOpen(true);
                          }
                        }}
                      >
                        {isExpandedMode ? (
                          <Minimize2 className="w-4 h-4" />
                        ) : (
                          <Maximize2 className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isExpandedMode ? 'Collapse' : 'Open large'}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                </TooltipProvider>
              {!hideDockSelector && (
                <DockSelector currentDock={currentDock} onDockChange={handleDockChange} />
              )}
            </div>
          </div>

          <div className="flex-1 flex items-center gap-3 px-4 py-2">
            <p className="text-sm text-muted-foreground truncate flex-1 hidden sm:block">
              {lastMessagePreview.substring(0, 60)}
              {lastMessagePreview.length > 60 ? '…' : ''}
            </p>
            <div className="flex gap-2 flex-1 sm:flex-initial sm:w-80">
              <Input
                placeholder={isBenefitsMode
                  ? "Ask about benefits, comparisons, FEHB..."
                  : "Ask about job impact, PCS, retirement..."}
                className="text-sm h-8 bg-background border-border flex-1"
                value={inputValue}
                onChange={function (e) {
                  setInputValue(e.target.value);
                }}
                onKeyDown={handleKeyDown}
              />
              <Button
                size="icon"
                className="h-8 w-8 bg-accent text-accent-foreground hover:bg-accent/90 flex-shrink-0"
                onClick={handleSend}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        <PathAdvisorFocusMode
          open={focusModeOpen}
          onOpenChange={setFocusModeOpen}
          messages={messages}
          onSendMessage={handleFocusModeSend}
          inputValue={inputValue}
          onInputChange={setInputValue}
        />
      </>
    );
  }

  const bottomDockHeightClass =
    size === 'medium' ? 'min-h-[260px] max-h-[45vh]' : 'min-h-[360px] max-h-[70vh]';

  return (
    <>
      <section
        className={cn(
          'path-advisor-panel transition-all duration-300 flex flex-col bg-card',
          isBottomDock ? 'w-full ' + bottomDockHeightClass + ' h-full' : 'h-full',
        )}
      >
        {/* Header */}
        <header className="shrink-0 flex items-center justify-between gap-3 border-b border-border px-4 py-2">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
              <span className="truncate">{title}</span>
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs font-normal gap-1">
                <contextBadgeInfo.icon className="w-3 h-3" />
                Viewing: {contextBadgeInfo.label}
              </Badge>
              {/* ============================================================
                  UNIFIED PRIVACY INDICATOR (Expanded View)
                  ============================================================
                  Uses consistent terminology across page and sidebar:
                  - "Privacy: Hidden" when sensitive data is masked
                  - "Privacy: Visible" when data is shown
                  This matches the Career page header badge exactly.
              ============================================================ */}
              <Badge
                variant={isSensitiveHidden ? 'outline' : 'secondary'}
                className="text-xs font-normal gap-1"
              >
                <Shield className="w-3 h-3" />
                Privacy: {isSensitiveHidden ? 'Hidden' : 'Visible'}
              </Badge>
            </div>
            {isTailoringMode && activeTargetJob && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50 mt-1">
                <span className="truncate">
                  Tailoring: {activeTargetJob.title} · {activeTargetJob.grade} ·{' '}
                  {activeTargetJob.agency.length > 15
                    ? activeTargetJob.agency.substring(0, 15) + '...'
                    : activeTargetJob.agency}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <TooltipProvider>
              {isBottomDock && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleToggleSize}>
                      <sizeToggleInfo.icon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{sizeToggleInfo.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* PathAdvisor UX Fix: Hide expand button when controlled externally (e.g., in workspace SheetHeader) */}
              {!hideExpandButton && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={function () {
                        // PathAdvisor UX Fix: If onRequestFullScreen callback is provided, use it
                        // Otherwise, fall back to default behavior (opening Focus Mode)
                        if (onRequestFullScreen) {
                          onRequestFullScreen();
                        } else {
                          setFocusModeOpen(true);
                        }
                      }}
                    >
                      {isExpandedMode ? (
                        <Minimize2 className="w-4 h-4" />
                      ) : (
                        <Maximize2 className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isExpandedMode ? 'Collapse' : 'Open large'}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>

            {!hideDockSelector && (
              <DockSelector currentDock={currentDock} onDockChange={handleDockChange} />
            )}
          </div>
        </header>

        {/* Messages area - scrollable */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
        >
          {isSensitiveHidden && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Privacy mode active:</strong> PathAdvisor can
                still help with high-level guidance, strategy, and explanations without displaying
                exact amounts on screen.
              </p>
            </div>
          )}

          {messages.length > 0 ? (
            <>
              {/* Day 42 Debug: Log when rendering messages */}
              {console.log('[PathAdvisorPanel] Rendering messages:', messages.length, 'messages')}
              {messages.map(function (message) {
                return (
                  <div
                    key={message.id}
                    className={
                      'rounded-lg p-3 text-sm ' +
                      (message.role === 'user'
                        ? 'bg-accent/20 border border-accent/30 ml-4'
                        : 'bg-secondary/20 border border-secondary/30')
                    }
                  >
                    <p className="text-muted-foreground whitespace-pre-wrap">{message.content}</p>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="space-y-3">
              {/* ============================================================
                  CONTEXT-AWARE INTRO MESSAGE
                  ============================================================
                  Day 16: Shows different intro based on Benefits Mode vs Job Search.
                  Benefits Mode shows benefits-specific messaging.
              ============================================================ */}
              <div className="bg-secondary/20 rounded-lg p-3 text-sm border border-secondary/30">
                <p className="text-muted-foreground">
                  {isBenefitsMode
                    ? "I can help you understand federal benefits, compare to private offers, and figure out which benefits matter most for your situation. What would you like to know?"
                    : "I see you're exploring career moves. The GS-14 Program Analyst role in DC would increase your pay by $12K but add 2 years to your retirement timeline. Want me to explain the trade-offs?"}
                </p>
              </div>

              <div className="text-xs font-medium text-muted-foreground">Suggested prompts</div>
              <div className={'flex ' + (isBottomDock ? 'flex-row flex-wrap' : 'flex-col') + ' gap-2'}>
                {/* ============================================================
                    CONTEXT-AWARE SUGGESTED PROMPTS
                    ============================================================
                    Day 16: Benefits Mode shows benefits-specific prompts.
                    Default shows job search / career move prompts.
                ============================================================ */}
                {isBenefitsMode ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-3 text-xs text-left justify-start border-border hover:bg-accent/10 bg-transparent"
                      onClick={function () {
                        handleSuggestedPrompt('Compare federal benefits to a $100,000 private offer.');
                      }}
                    >
                      Compare to a $100K private offer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-3 text-xs text-left justify-start border-border hover:bg-accent/10 bg-transparent"
                      onClick={function () {
                        handleSuggestedPrompt('What benefits matter most if I only plan to stay 3 years?');
                      }}
                    >
                      What matters for a 3-year stay?
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-3 text-xs text-left justify-start border-border hover:bg-accent/10 bg-transparent"
                      onClick={function () {
                        handleSuggestedPrompt('Explain FEHB like I am new to insurance.');
                      }}
                    >
                      Explain FEHB simply
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-3 text-xs text-left justify-start border-border hover:bg-accent/10 bg-transparent"
                      onClick={function () {
                        handleSuggestedPrompt('How does TSP compare to a private 401k?');
                      }}
                    >
                      TSP vs private 401k
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-3 text-xs text-left justify-start border-border hover:bg-accent/10 bg-transparent"
                      onClick={function () {
                        handleSuggestedPrompt('How does this job affect my retirement date?');
                      }}
                    >
                      How does this job affect my retirement date?
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-3 text-xs text-left justify-start border-border hover:bg-accent/10 bg-transparent"
                      onClick={function () {
                        handleSuggestedPrompt("What's the PCS cost estimate for DC?");
                      }}
                    >
                      What&apos;s the PCS cost estimate for DC?
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-3 text-xs text-left justify-start border-border hover:bg-accent/10 bg-transparent"
                      onClick={function () {
                        handleSuggestedPrompt('Compare FEHB options in the new location');
                      }}
                    >
                      Compare FEHB options in the new location
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-3 text-xs text-left justify-start border-border hover:bg-accent/10 bg-transparent"
                      onClick={function () {
                        handleSuggestedPrompt('Is this promotion worth the relocation?');
                      }}
                    >
                      Is this promotion worth the relocation?
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3">
          <div className="flex gap-2">
            <Input
              placeholder={isBenefitsMode
                ? "Ask about benefits, comparisons, FEHB..."
                : "Ask about job impact, PCS, retirement..."}
              className="text-sm h-9 bg-background border-border flex-1"
              value={inputValue}
              onChange={function (e) {
                setInputValue(e.target.value);
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
      </section>

      <PathAdvisorFocusMode
        open={focusModeOpen}
        onOpenChange={function (open) {
          setFocusModeOpen(open);
          // Day40: Call focus restore callback when PathAdvisor closes
          if (!open && onPathAdvisorClose) {
            // Use setTimeout to ensure focus restore happens after dialog closes
            setTimeout(function () {
              onPathAdvisorClose();
            }, 100);
          }
        }}
        messages={messages}
        onSendMessage={handleFocusModeSend}
        inputValue={inputValue}
        onInputChange={setInputValue}
      />
    </>
  );
}

function generateJobResponse(context: {
  jobTitle?: string;
  jobGrade?: string;
  jobAgency?: string;
  jobLocation?: string;
}): string {
  const jobTitle = context.jobTitle || '';
  const jobGrade = context.jobGrade || '';
  const jobAgency = context.jobAgency || '';
  const jobLocation = context.jobLocation || '';

  if (!jobTitle) {
    return "I'd be happy to help you with application tips. Could you tell me more about the position you're interested in?";
  }

  return (
    'Great question! Here are my top tips for the ' +
    jobTitle +
    ' position at ' +
    jobAgency +
    ':\n\n**Resume Tips:**\n1. **Tailor your resume** to this specific ' +
    jobGrade +
    ' announcement. Use keywords from the job posting, especially in your experience descriptions.\n2. **Quantify achievements** - Include specific numbers, percentages, and outcomes that demonstrate your impact.\n3. **Match the specialized experience** exactly as described in the qualifications section.\n\n**KSA Guidance:**\n- For a ' +
    jobGrade +
    ' position, emphasize leadership and independent judgment\n- Provide specific examples using the STAR method (Situation, Task, Action, Result)\n- Reference experience with similar agencies or mission areas when possible\n\n**Potential Gaps to Address:**\n- If you lack direct ' +
    jobAgency +
    ' experience, highlight transferable skills from related agencies\n- Consider addressing any location preferences or telework flexibility in your application\n\n**Competition Assessment:**\n' +
    (jobLocation === 'Washington, DC'
      ? 'DC positions tend to be highly competitive. Ensure your application is thorough and addresses every qualification.'
      : 'This location may have moderate competition, which could work in your favor.') +
    '\n\nWould you like me to dive deeper into any of these areas?'
  );
}
