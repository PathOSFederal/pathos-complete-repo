'use client';

/**
 * ============================================================================
 * ANCHOR CONTEXT PANEL (Day 43 - Option A Implementation)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Collapsible context panel that displays anchor-aware context in Focus Mode.
 * This is the primary solution for showing context in single-column layouts
 * (e.g., Resume Builder) where the right-rail cards are not available.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * - Rendered in PathAdvisorFocusMode, below the anchor header, above the thread
 * - In 2-column layouts: Can appear in right rail (or this panel may be hidden)
 * - In single-column layouts: This IS the context surface (replaces missing cards)
 *
 * ============================================================================
 * DAY 43 VISIBILITY CONTRACT
 * ============================================================================
 *
 * WHY THIS COMPONENT EXISTS:
 * Day 43 requires that Focus Mode ALWAYS has an anchor-aware context surface.
 * In layouts with a right rail (Dashboard, Benefits), context shows there.
 * In single-column layouts (Resume Builder), there IS no right rail.
 *
 * Option A (LOCKED DECISION):
 * Instead of forcing a right rail into single-column layouts, we render a
 * COLLAPSIBLE "Context" panel at the top of the thread (below anchor header).
 * This gives users the same context visibility without disrupting the layout.
 *
 * GUARANTEED VISIBILITY:
 * When Focus Mode opens via an "Ask" action, this panel auto-expands.
 * Users can collapse it to save space, but any new Ask action re-expands it.
 * This ensures the Day 43 contract: "Ask = anchor-aware context immediately visible."
 *
 * ============================================================================
 * COLLAPSE BEHAVIOR
 * ============================================================================
 *
 * DEFAULT EXPANSION:
 * - When Focus Mode opens due to an Ask action (lastOpenReason === 'ask'),
 *   this panel auto-expands to show full context.
 * - User can collapse it at any time.
 * - New Ask action -> panel re-expands (visibility contract).
 *
 * WHEN COLLAPSED:
 * - Shows single-line summary: sourceLabel + truncated summary
 * - Click chevron or header to expand
 *
 * WHEN EXPANDED:
 * - Shows full context rows and optional CTA chips
 * - Hint text: "Ask from another card to change this focus."
 *
 * ============================================================================
 * DETERMINISM + SIDEBAR-ONLY AVOIDANCE
 * ============================================================================
 *
 * This component only reads from the PathAdvisor store (activeAnchor) and
 * optional dependencies passed as props. It does NOT trigger sidebar-only
 * updates. Any context changes flow through the anchor system:
 * 
 * User clicks Ask -> askPathAdvisor() -> setActiveAnchor() -> Focus Mode re-renders
 *
 * This is deterministic: given the same anchor and deps, the panel renders
 * the same content. No hidden state, no sidebar-only mutations.
 *
 * @version Day 43 - Anchor Focus Architecture (Option A)
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Briefcase, Target, BarChart3, Sparkles, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SensitiveValue } from '@/components/sensitive-value';
import { usePathAdvisorStore } from '@/store/pathAdvisorStore';
import { buildFocusRightRailModel, type FocusRightRailModel, type FocusRightRailDependencies } from '@/lib/pathadvisor/focusRightRail';
import type { PathAdvisorAnchorSource } from '@/lib/pathadvisor/anchors';
import { cn } from '@/lib/utils';

/**
 * Props for AnchorContextPanel.
 *
 * DEPENDENCIES:
 * Optional store snapshots passed from parent Focus Mode component.
 * These are used to enrich context display beyond anchor-only data.
 */
export interface AnchorContextPanelProps {
  /**
   * Dependencies for building context model (optional store snapshots).
   * If provided, enables richer context display via store lookups.
   */
  dependencies?: FocusRightRailDependencies;
  /**
   * Optional custom class for styling overrides.
   */
  className?: string;
}

/**
 * Returns the icon component for a given anchor source type.
 *
 * WHY THIS EXISTS:
 * Different anchor sources (job, resume, benefits) have different semantic
 * meaning. Using source-specific icons helps users quickly identify context.
 */
function getSourceIcon(source: PathAdvisorAnchorSource): React.ReactNode {
  switch (source) {
    case 'job':
      return <Briefcase className="w-4 h-4 text-accent" />;
    case 'resume':
      return <FileText className="w-4 h-4 text-accent" />;
    case 'benefits':
      return <BarChart3 className="w-4 h-4 text-accent" />;
    case 'retirement':
      return <BarChart3 className="w-4 h-4 text-accent" />;
    case 'dashboard':
      return <Target className="w-4 h-4 text-accent" />;
    case 'import':
      return <Sparkles className="w-4 h-4 text-accent" />;
    default:
      return <Target className="w-4 h-4 text-accent" />;
  }
}

/**
 * AnchorContextPanel - Collapsible context panel for Focus Mode.
 *
 * PURPOSE:
 * Shows anchor-aware context in Focus Mode. In single-column layouts,
 * this is the PRIMARY context surface. In 2-column layouts, this may
 * be shown in the right rail or as a supplementary inline panel.
 *
 * RENDERS:
 * - Header row: "Context" title + collapse chevron
 * - When expanded: context rows (label/value) + hint text
 * - When collapsed: single-line summary (sourceLabel + summary)
 *
 * AUTO-EXPAND BEHAVIOR:
 * Listens to lastOpenReason and lastOpenAt from PathAdvisor store.
 * When lastOpenReason === 'ask' and timestamp changes, expands panel.
 */
export function AnchorContextPanel(props: AnchorContextPanelProps) {
  const dependencies = props.dependencies;
  const className = props.className;

  // ============================================================================
  // STORE SUBSCRIPTIONS
  // ============================================================================

  // Read active anchor from PathAdvisor store
  // This drives what context we display
  const activeAnchor = usePathAdvisorStore(function (state) {
    return state.activeAnchor;
  });

  // Read open reason and timestamp for auto-expand detection
  const lastOpenReason = usePathAdvisorStore(function (state) {
    return state.lastOpenReason;
  });
  const lastOpenAt = usePathAdvisorStore(function (state) {
    return state.lastOpenAt;
  });

  // ============================================================================
  // COLLAPSE STATE
  // ============================================================================

  // Local collapse state
  // Default: expanded (true) when there's an activeAnchor
  const [isExpanded, setIsExpanded] = useState(true);

  // Track last processed Ask-open event to avoid duplicate expansions
  const lastProcessedOpenAtRef = useRef<number | null>(null);

  // ============================================================================
  // AUTO-EXPAND ON ASK-OPEN
  // ============================================================================
  //
  // DAY 43 VISIBILITY CONTRACT:
  // When Focus Mode opens due to an Ask action, the Context panel MUST expand.
  // This ensures users immediately see the anchor context.
  //
  // HOW IT WORKS:
  // We detect Ask-open events by watching lastOpenAt timestamp changes.
  // When timestamp changes and reason is 'ask', we expand.
  //
  // NOTE: We perform all ref access inside the effect to avoid lint errors
  // about accessing refs during render.
  // ============================================================================

  useEffect(function handleAskOpenAutoExpand() {
    // Only process if this is an Ask-open event
    if (lastOpenReason !== 'ask') {
      return;
    }
    if (lastOpenAt === null) {
      return;
    }
    // Skip if we've already processed this event (ref access inside effect is fine)
    if (lastProcessedOpenAtRef.current === lastOpenAt) {
      return;
    }

    // Mark as processed
    lastProcessedOpenAtRef.current = lastOpenAt;

    // Auto-expand the panel (Day 43 visibility contract)
    // This is intentional: we're synchronizing local UI state with external store state.
    // The store signals an Ask-open event, and we respond by expanding the panel.
    // This is the correct pattern per React docs for "subscribing to external state changes."
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsExpanded(true);
  }, [lastOpenReason, lastOpenAt]);

  // ============================================================================
  // BUILD CONTEXT MODEL
  // ============================================================================

  // Build the view model using existing helper
  // Returns null if no activeAnchor
  const contextModel: FocusRightRailModel | null = activeAnchor
    ? buildFocusRightRailModel(activeAnchor, dependencies || {})
    : null;

  // ============================================================================
  // RENDER: No anchor = no panel
  // ============================================================================

  if (!activeAnchor || !contextModel) {
    return null;
  }

  // ============================================================================
  // RENDER: Collapsible Context Panel
  // ============================================================================

  const toggleExpanded = function () {
    setIsExpanded(function (prev) {
      return !prev;
    });
  };

  return (
    <div className={cn('mb-4', className)}>
      <Card className="border-accent/30 bg-accent/5">
        {/* Header row - always visible */}
        <CardHeader
          className="pb-2 cursor-pointer hover:bg-accent/10 transition-colors"
          onClick={toggleExpanded}
        >
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getSourceIcon(contextModel.source)}
              <span>Context</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Collapsed summary shown inline when collapsed */}
              {!isExpanded && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {contextModel.subtitle || activeAnchor.sourceLabel}
                </span>
              )}
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </CardTitle>
        </CardHeader>

        {/* Expanded content */}
        {isExpanded && (
          <CardContent className="pt-0 space-y-3">
            {/* Subtitle (source label) */}
            {contextModel.subtitle && (
              <p className="text-sm font-medium text-foreground">
                {contextModel.subtitle}
              </p>
            )}

            {/* Summary (anchor.summary) */}
            {contextModel.summary && (
              <div className="pb-2 border-b border-border">
                <p className="text-xs text-muted-foreground italic">
                  &ldquo;{contextModel.summary}&rdquo;
                </p>
              </div>
            )}

            {/* Context rows */}
            <div className="space-y-1.5">
              {contextModel.rows.map(function (row, index) {
                return (
                  <div key={row.label + '-' + index} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    {row.isSensitive ? (
                      <SensitiveValue value={row.value} className="font-medium" />
                    ) : (
                      <span className="truncate max-w-[160px] text-foreground">{row.value}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Optional CTA chips (non-functional placeholders for now) */}
            {contextModel.ctas && contextModel.ctas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {contextModel.ctas.map(function (cta) {
                  return (
                    <Badge
                      key={cta}
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-accent/10"
                    >
                      {cta}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* ============================================================
                DAY 43 UX HINT - Anchor Mental Model Reinforcement
                ============================================================
                
                WHY THIS TEXT MATTERS:
                Users need to understand that the Context panel reflects
                WHERE they asked from. To change the focus, they need to
                ask from a different card/location in the app.
                
                This subtle hint reinforces the anchor mental model without
                being intrusive. It appears in muted text below the content.
                ============================================================ */}
            <p className="text-xs text-muted-foreground pt-2 italic">
              Ask from another card to change this focus.
            </p>
          </CardContent>
        )}

        {/* Collapsed hint - shown below header when collapsed */}
        {!isExpanded && (
          <CardContent className="pt-0 pb-2">
            <p className="text-xs text-muted-foreground italic">
              Ask from another card to change this focus.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
