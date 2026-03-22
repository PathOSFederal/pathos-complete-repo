/**
 * ============================================================================
 * PATHADVISOR CAREER GUIDANCE COMPONENT
 * ============================================================================
 *
 * FILE PURPOSE:
 * This component renders structured, scannable guidance content for the
 * PathAdvisor sidebar when on the Career & Resume page. Instead of showing
 * raw markdown or generic prompts, it displays:
 *   1. "Top guidance" (max 3 bullets)
 *   2. "Gaps to address" (max 2 bullets)
 *   3. "Suggested snippet" with a Copy button (clipboard API)
 *   4. "Ask next" quick prompts (2-3 buttons)
 *
 * WHY THIS EXISTS:
 * The PathAdvisor sidebar can show generic content that doesn't feel
 * tailored to the Career page. This component shapes the content specifically
 * for career and resume tasks, making it immediately useful without
 * requiring heavy changes to the assistant engine.
 *
 * HOW IT WORKS:
 * 1. Receives context about the user's current resume state
 * 2. Generates structured guidance based on completion level
 * 3. Renders as formatted blocks with consistent styling
 * 4. Provides copy-to-clipboard for suggested snippets
 * 5. Offers quick prompts that inject into the PathAdvisor chat
 *
 * ARCHITECTURE FIT:
 * - Used within the PathAdvisor sidebar (path-advisor-panel.tsx)
 * - Receives context from useAdvisorContext()
 * - Follows the same styling patterns as the sidebar
 *
 * @version Day 14 - Career & Resume First-Principles Refactor
 */

'use client';

import { useState } from 'react';
import { Check, Copy, Lightbulb, AlertTriangle, FileText, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
// Badge import removed - was unused (lint warning fix)

/**
 * GuidanceContext interface defines the data needed to generate guidance.
 */
interface GuidanceContext {
  /** Resume completion percentage */
  completionPercent: number;
  /** Primary target role title, or null if not set */
  primaryRoleTitle: string | null;
  /** Whether the primary role is complete (all required fields) */
  isPrimaryRoleComplete: boolean;
  /** List of incomplete resume sections */
  incompleteSections: string[];
}

/**
 * Props interface for PathAdvisorCareerGuidance component.
 */
interface PathAdvisorCareerGuidanceProps {
  /** Context about the user's current career/resume state */
  context: GuidanceContext;
  /** Callback to inject a prompt into PathAdvisor chat */
  onSendPrompt: (prompt: string) => void;
}

/**
 * Generate top guidance bullets based on context.
 * Returns up to 3 prioritized tips.
 *
 * @param context - Current user context
 * @returns Array of guidance strings
 *
 * EXAMPLE:
 *   generateTopGuidance({ completionPercent: 40, ... })
 *   -> ["Focus on work experience first", "Add measurable accomplishments", ...]
 */
function generateTopGuidance(context: GuidanceContext): string[] {
  const tips: string[] = [];

  // Priority 1: No primary target role
  if (!context.primaryRoleTitle) {
    tips.push('Set your primary target role to get tailored resume advice');
  }

  // Priority 2: Primary role incomplete
  if (context.primaryRoleTitle && !context.isPrimaryRoleComplete) {
    tips.push('Complete required details for your target role (' + context.primaryRoleTitle + ')');
  }

  // Priority 3-5: Based on completion level
  if (context.completionPercent < 40) {
    tips.push('Focus on adding federal work experience with specific duties');
    tips.push('Include hours per week and supervisor information for each position');
  } else if (context.completionPercent < 70) {
    tips.push('Add certifications relevant to your target series');
    tips.push('Write accomplishment bullets using the STAR method');
  } else {
    tips.push('Review your resume for keyword alignment with job announcements');
    tips.push('Ensure your KSAs clearly demonstrate specialized experience');
  }

  // Return only top 3
  const result: string[] = [];
  for (let i = 0; i < tips.length && i < 3; i++) {
    result.push(tips[i]);
  }
  return result;
}

/**
 * Generate gaps to address based on incomplete sections.
 * Returns up to 2 high-priority gaps.
 *
 * @param context - Current user context
 * @returns Array of gap descriptions
 */
function generateGapsToAddress(context: GuidanceContext): string[] {
  const gaps: string[] = [];

  // Check for missing target role
  if (!context.primaryRoleTitle) {
    gaps.push('No target role defined (PathAdvisor cannot provide tailored guidance)');
  }

  // Check incomplete sections
  for (let i = 0; i < context.incompleteSections.length && gaps.length < 2; i++) {
    const section = context.incompleteSections[i];
    if (section === 'Certifications') {
      gaps.push('Certifications section is empty (many positions require specific certs)');
    } else if (section === 'Work Experience') {
      gaps.push('Work experience needs more detail (duties and accomplishments)');
    } else if (section === 'Education') {
      gaps.push('Education section incomplete (often required for grade qualification)');
    } else {
      gaps.push(section + ' section needs attention');
    }
  }

  // Return only top 2
  const result: string[] = [];
  for (let i = 0; i < gaps.length && i < 2; i++) {
    result.push(gaps[i]);
  }
  return result;
}

/**
 * Generate a suggested snippet based on context.
 * This is example text the user can copy and adapt.
 *
 * @param context - Current user context
 * @returns Suggested snippet string
 */
function generateSuggestedSnippet(context: GuidanceContext): string {
  if (context.completionPercent < 50) {
    return 'Managed IT infrastructure for 500+ users, including server administration, network security monitoring, and help desk escalation. Reduced system downtime by 30% through proactive maintenance and automated monitoring scripts.';
  }

  if (context.primaryRoleTitle) {
    return 'Demonstrated expertise in ' + context.primaryRoleTitle.split(' ')[0].toLowerCase() + ' operations through hands-on management of enterprise systems. Led cross-functional teams to implement security protocols, achieving 99.9% uptime across critical infrastructure.';
  }

  return 'Provided technical leadership for agency-wide IT modernization initiative, coordinating with stakeholders across 5 departments. Developed and implemented policies that improved system reliability by 25% while reducing operational costs.';
}

/**
 * Generate quick prompts for the "Ask next" section.
 *
 * @param context - Current user context
 * @returns Array of prompt strings
 */
function generateQuickPrompts(context: GuidanceContext): string[] {
  const prompts: string[] = [];

  if (!context.primaryRoleTitle) {
    prompts.push('What target role should I focus on?');
    prompts.push('How do I choose between similar job series?');
  } else {
    prompts.push('How can I improve my match score for ' + context.primaryRoleTitle + '?');
    prompts.push('What KSAs are most important for this role?');
  }

  prompts.push('Help me write a strong accomplishment bullet');

  // Return only top 3
  const result: string[] = [];
  for (let i = 0; i < prompts.length && i < 3; i++) {
    result.push(prompts[i]);
  }
  return result;
}

/**
 * PathAdvisorCareerGuidance Component
 *
 * STEP-BY-STEP HOW IT WORKS:
 * 1. Receives context about user's resume state
 * 2. Generates structured content:
 *    a. Top guidance tips
 *    b. Gaps to address
 *    c. Suggested snippet
 *    d. Quick prompts
 * 3. Renders each section with consistent styling
 * 4. Copy button uses navigator.clipboard API
 * 5. Quick prompts call onSendPrompt callback
 *
 * EXAMPLE:
 * User has 40% completion, no certifications:
 *   -> Top guidance shows experience tips
 *   -> Gaps show "Certifications section is empty"
 *   -> Snippet shows a sample accomplishment bullet
 *   -> Quick prompts offer "Help me write a bullet"
 */
export function PathAdvisorCareerGuidance(props: PathAdvisorCareerGuidanceProps) {
  const context = props.context;
  const onSendPrompt = props.onSendPrompt;

  const [copied, setCopied] = useState(false);

  const topGuidance = generateTopGuidance(context);
  const gapsToAddress = generateGapsToAddress(context);
  const suggestedSnippet = generateSuggestedSnippet(context);
  const quickPrompts = generateQuickPrompts(context);

  /**
   * Handle copying snippet to clipboard.
   * Uses the Clipboard API and shows a brief "Copied!" indicator.
   */
  const handleCopySnippet = function () {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(suggestedSnippet).then(function () {
        setCopied(true);
        setTimeout(function () {
          setCopied(false);
        }, 2000);
      });
    }
  };

  /**
   * Handle clicking a quick prompt.
   * Sends the prompt to the PathAdvisor chat input.
   */
  const handleQuickPrompt = function (prompt: string) {
    onSendPrompt(prompt);
  };

  return (
    <div className="space-y-4">
      {/* ================================================================
          TOP GUIDANCE SECTION
          ================================================================
          Shows up to 3 prioritized tips based on current state.
          Uses a lightbulb icon to indicate helpful suggestions.
      ================================================================ */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Lightbulb className="w-3.5 h-3.5 text-accent" />
          <span>Top guidance</span>
        </div>
        <ul className="space-y-1.5">
          {topGuidance.map(function (tip, idx) {
            return (
              <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-accent mt-1">•</span>
                <span>{tip}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ================================================================
          GAPS TO ADDRESS SECTION
          ================================================================
          Shows up to 2 gaps/issues that need attention.
          Uses a warning icon to indicate action needed.
      ================================================================ */}
      {gapsToAddress.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
            <span>Gaps to address</span>
          </div>
          <ul className="space-y-1.5">
            {gapsToAddress.map(function (gap, idx) {
              return (
                <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">•</span>
                  <span>{gap}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ================================================================
          SUGGESTED SNIPPET SECTION
          ================================================================
          Shows an example text snippet the user can copy and adapt.
          Copy button uses the Clipboard API.
      ================================================================ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <FileText className="w-3.5 h-3.5 text-accent" />
            <span>Suggested snippet</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={handleCopySnippet}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span className="text-green-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-xs text-muted-foreground italic">
            {suggestedSnippet}
          </p>
        </div>
      </div>

      {/* ================================================================
          ASK NEXT SECTION
          ================================================================
          Quick prompt buttons that inject into PathAdvisor chat.
          Allows users to quickly ask relevant follow-up questions.
      ================================================================ */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <MessageSquare className="w-3.5 h-3.5 text-accent" />
          <span>Ask next</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map(function (prompt, idx) {
            return (
              <Button
                key={idx}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto py-1.5 px-3 text-xs bg-transparent border-border hover:bg-accent/10"
                onClick={function () {
                  handleQuickPrompt(prompt);
                }}
              >
                {prompt}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Export default context for use when no specific context is available.
 * This ensures the component always has valid data to display.
 */
export const defaultCareerGuidanceContext: GuidanceContext = {
  completionPercent: 50,
  primaryRoleTitle: null,
  isPrimaryRoleComplete: false,
  incompleteSections: ['Certifications', 'Work Experience'],
};
