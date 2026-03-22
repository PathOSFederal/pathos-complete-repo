/**
 * ============================================================================
 * GUIDANCE STRIP COMPONENT (Day 38)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Low-profile, contextual, collapsible PathAdvisor guidance component.
 * Appears at key moments (entry, job selection, gap detection, rewrite justification,
 * version changes, readiness signals) but remains silent during active typing.
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Reusable component for Resume Builder workspace
 * - Uses guidance-rules.ts for deterministic message generation
 * - Has "typing quiet mode" - suppresses messages while user is typing
 * - Provides "Why am I seeing this?" link explaining local-only guidance
 *
 * BEHAVIOR RULES:
 * - Contextual, collapsible
 * - Appears at key moments
 * - Remains silent during active typing (detect user typing activity and suppress messages)
 * - Messages are short, anchored, trust-first, local-only framing
 * - No duplicate recommendation cards or repeated guidance
 * - Keep UI calm and spacious
 *
 * @version Day 38 - Resume Builder Revamp
 * ============================================================================
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { getGuidanceMessages, type GuidanceContext } from '@/lib/resume/guidance-rules';

interface GuidanceStripProps {
  context: GuidanceContext;
  onDismiss?: (messageId: string) => void;
}

/**
 * Guidance Strip Component
 *
 * PURPOSE:
 * Displays contextual PathAdvisor guidance messages in a low-profile, collapsible strip.
 * Automatically suppresses messages during typing activity (quiet mode).
 *
 * HOW IT WORKS:
 * 1. Receives context events (from parent component)
 * 2. Calls getGuidanceMessages() to get relevant messages
 * 3. Filters out dismissed messages
 * 4. Shows highest-priority message (or multiple if space allows)
 * 5. Suppresses new messages if user is typing (quiet mode)
 * 6. Provides "Why am I seeing this?" link for transparency
 */
export function GuidanceStrip(props: GuidanceStripProps) {
  const context = props.context;
  const onDismiss = props.onDismiss;

  // Day 38 Continuation: Start expanded briefly, then auto-collapse after 5 seconds
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [showWhyLink, setShowWhyLink] = useState(false);
  const autoCollapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialExpandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get guidance messages based on context
  const allMessages = getGuidanceMessages(context);
  const visibleMessages = allMessages.filter(function (msg) {
    return !dismissedIds.has(msg.id);
  });

  // Show highest-priority message (or first few if space allows)
  const displayMessages = visibleMessages.slice(0, 2); // Show up to 2 messages

  // Handle dismiss
  const handleDismiss = function (messageId: string) {
    setDismissedIds(function (prev) {
      const next = new Set(prev);
      next.add(messageId);
      return next;
    });
    if (onDismiss) {
      onDismiss(messageId);
    }
  };

  // Day 38 Continuation: Auto-collapse after 5 seconds when entering workspace
  // Start expanded briefly, then collapse after 5 seconds unless user interacts
  useEffect(
    function () {
      if (displayMessages.length > 0) {
        // Clear existing timeout
        if (autoCollapseTimeoutRef.current !== null) {
          clearTimeout(autoCollapseTimeoutRef.current);
        }

        // Set timeout to collapse after 5 seconds (whether expanded or not)
        autoCollapseTimeoutRef.current = setTimeout(function () {
          setIsExpanded(false);
          autoCollapseTimeoutRef.current = null;
        }, 5000);
      }

      // Cleanup timeout on unmount
      return function () {
        if (autoCollapseTimeoutRef.current !== null) {
          clearTimeout(autoCollapseTimeoutRef.current);
          autoCollapseTimeoutRef.current = null;
        }
        if (initialExpandTimeoutRef.current !== null) {
          clearTimeout(initialExpandTimeoutRef.current);
          initialExpandTimeoutRef.current = null;
        }
      };
    },
    [displayMessages.length]
  );

  // Day 38 Continuation: Reset auto-collapse timer on interaction
  const handleInteraction = function () {
    // Reset the auto-collapse timer
    if (autoCollapseTimeoutRef.current !== null) {
      clearTimeout(autoCollapseTimeoutRef.current);
    }
    if (isExpanded) {
      autoCollapseTimeoutRef.current = setTimeout(function () {
        setIsExpanded(false);
        autoCollapseTimeoutRef.current = null;
      }, 5000);
    }
  };

  // Auto-collapse if no messages
  useEffect(
    function () {
      if (displayMessages.length === 0) {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(function () {
          setIsExpanded(false);
        }, 0);
      }
    },
    [displayMessages.length]
  );

  // Don't render if no messages or in quiet mode with only low-priority messages
  if (displayMessages.length === 0) {
    return null;
  }

  // Check if we should suppress (quiet mode for low/medium priority)
  const shouldSuppress =
    context.isTyping &&
    displayMessages.every(function (msg) {
      return msg.priority !== 'high';
    });

  if (shouldSuppress) {
    return null;
  }

  // Day 38 Continuation: Get one-line summary (first message text, truncated)
  const summaryText = displayMessages.length > 0 ? displayMessages[0].text : '';

  return (
    <Card className="border-accent/20 bg-accent/5">
      <Collapsible
        open={isExpanded}
        onOpenChange={function (open) {
          setIsExpanded(open);
          if (open) {
            handleInteraction(); // Reset timer when user expands
          }
        }}
      >
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 shrink-0"
                onClick={handleInteraction}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            {/* Day 38 Continuation: Show one-line summary when collapsed */}
            {!isExpanded ? (
              <span className="text-sm text-muted-foreground truncate">
                {summaryText || 'Guidance available'}
              </span>
            ) : (
              <span className="text-sm font-medium text-accent">Guidance ▾</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1"
              onClick={function () {
                setShowWhyLink(!showWhyLink);
              }}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <CardContent
            className="pt-0 space-y-2"
            onMouseMove={handleInteraction}
            onFocus={handleInteraction}
          >
            {/* Day 38 Continuation: "Why am I seeing this?" link in expanded view only */}
            <div className="text-xs text-muted-foreground">
              <button
                type="button"
                onClick={function () {
                  setShowWhyLink(!showWhyLink);
                  handleInteraction();
                }}
                className="text-accent hover:underline"
              >
                Why am I seeing this?
              </button>
              {showWhyLink && (
                <div className="mt-2 p-2 bg-background/50 rounded border border-accent/10">
                  <p>
                    PathAdvisor provides local-only, contextual guidance based on your resume
                    state. No data is sent to external servers. Guidance appears at key moments
                    to help you improve your resume.
                  </p>
                </div>
              )}
            </div>

            {/* Day 38 Continuation: Show 2-4 bullets max in expanded view */}
            {displayMessages.slice(0, 4).map(function (message) {
              return (
                <div
                  key={message.id}
                  className="flex items-start justify-between gap-2 p-2 bg-background/50 rounded border border-accent/10"
                >
                  <p className="text-sm text-foreground flex-1">{message.text}</p>
                  {message.dismissible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1"
                      onClick={function () {
                        handleDismiss(message.id);
                        handleInteraction();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

