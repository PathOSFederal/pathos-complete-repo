/**
 * ============================================================================
 * PATH ADVISOR RAIL — Shared advisor side panel (PathAdvisor AI)
 * ============================================================================
 *
 * Renders a single PathAdvisorCard. All conversation UI (header, context pills,
 * conversation window, suggested prompts, composer) lives inside that card.
 * Trust-first microcopy (Viewing, Privacy) is shown as compact pills in the card.
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 */

'use client';

import type React from 'react';
import { useState, useCallback } from 'react';
import {
  PathAdvisorCard,
  type PathAdvisorMessage,
} from './PathAdvisorCard';
import { usePathAdvisorScreenOverridesStore } from '../stores/pathAdvisorScreenOverridesStore';

/** Stub anchor context for PathAdvisor (e.g. selected application in Confidence Center). */
export interface PathAdvisorAnchorContext {
  /** Optional label for "Viewing" chip when anchored to a specific context. */
  viewingLabel?: string;
  /** Optional application or entity id for future use. */
  applicationId?: string;
}

export interface PathAdvisorRailProps {
  dock?: 'left' | 'right';
  /** Optional: chip label for current view (default "Dashboard") */
  viewingLabel?: string;
  /** Optional: privacy chip value (default "Local only") */
  privacyLabel?: string;
  /**
   * Optional stub anchor context (e.g. selected tracked application in Application Confidence Center).
   * When set, viewingLabel can be derived from context; Pass 1 uses mocked/stub data.
   */
  anchorContext?: PathAdvisorAnchorContext | null;
  /**
   * Optional controlled mode: when both messages and onSend are provided,
   * the rail does not own message state; the app handles send (e.g. append user
   * and schedule a simulated assistant reply).
   */
  messages?: PathAdvisorMessage[];
  /** When provided with messages, app handles send (e.g. append user + simulated reply). */
  onSend?: (text: string) => void;
}

/** Default suggested prompts when no screen overrides (dashboard context). */
const DEFAULT_SUGGESTED_PROMPTS = [
  'What should I focus on first today?',
  'Why did my readiness score change?',
  'When can I expect a referral decision?',
];

/**
 * Rail wrapper that renders only PathAdvisorCard. When messages and onSend
 * are both provided (controlled mode), the app owns message state and send
 * behavior. Otherwise the rail holds message state locally and only appends
 * the user message (no assistant reply).
 */
export function PathAdvisorRail(props: PathAdvisorRailProps) {
  const [internalMessages, setInternalMessages] = useState<PathAdvisorMessage[]>([]);

  const hasMessages = props.messages !== undefined && props.messages !== null;
  const hasOnSend = props.onSend !== undefined && props.onSend !== null;
  const isControlled = hasMessages && hasOnSend;

  const handleSendInternal = useCallback(function (text: string) {
    const userMessage: PathAdvisorMessage = { role: 'user', content: text };
    setInternalMessages(function (prev) {
      const next = [];
      for (let i = 0; i < prev.length; i++) {
        next.push(prev[i]);
      }
      next.push(userMessage);
      return next;
    });
  }, []);

  const messages: PathAdvisorMessage[] =
    isControlled && props.messages !== undefined ? props.messages : internalMessages;
  const onSend: (text: string) => void =
    isControlled && props.onSend !== undefined ? props.onSend : handleSendInternal;

  // Screen overrides (e.g. Career & Resume) provide viewingLabel, suggestedPrompts, briefingLabel.
  const overrides = usePathAdvisorScreenOverridesStore(function (s) {
    return s.overrides;
  });

  // When anchorContext is provided (e.g. from Application Confidence Center), use its viewingLabel for the card.
  // Otherwise use screen overrides or props.
  const viewingLabel =
    props.anchorContext !== undefined && props.anchorContext !== null && props.anchorContext.viewingLabel
      ? props.anchorContext.viewingLabel
      : overrides !== null && overrides !== undefined && overrides.viewingLabel !== ''
        ? overrides.viewingLabel
        : props.viewingLabel !== undefined && props.viewingLabel !== ''
          ? props.viewingLabel
          : 'Dashboard';

  const suggestedPrompts =
    overrides !== null && overrides !== undefined && overrides.suggestedPrompts.length > 0
      ? overrides.suggestedPrompts
      : DEFAULT_SUGGESTED_PROMPTS;

  const briefingLabel =
    overrides !== null && overrides !== undefined && overrides.briefingLabel !== undefined
      ? overrides.briefingLabel
      : undefined;

  const railContent =
    overrides !== null && overrides !== undefined && overrides.railContent !== undefined
      ? overrides.railContent
      : undefined;

  const onRailNextBestActionClick =
    overrides !== null && overrides !== undefined && overrides.onRailNextBestActionClick !== undefined
      ? overrides.onRailNextBestActionClick
      : undefined;

  const currentScreen =
    overrides !== null && overrides !== undefined && overrides.screenId !== undefined && overrides.screenId !== ''
      ? overrides.screenId
      : 'dashboard';

  return (
    <div className="h-full flex flex-col min-h-0">
      <PathAdvisorCard
        messages={messages}
        suggestedPrompts={suggestedPrompts}
        onSend={onSend}
        viewingLabel={viewingLabel}
        currentScreen={currentScreen}
        briefingLabel={briefingLabel}
        railContent={railContent}
        onRailNextBestActionClick={onRailNextBestActionClick}
      />
    </div>
  );
}
