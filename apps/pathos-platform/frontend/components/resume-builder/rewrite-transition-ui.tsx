/**
 * ============================================================================
 * REWRITE TRANSITION UI COMPONENT (Day 38)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Shows a diff-like widget (old bullet -> suggested bullet) with accept/reject per item.
 * When accepted, updates the selected version snapshot.
 * Keeps UI minimal and calm with subtle badges (e.g., "GS-calibrated", "coverage improved").
 *
 * WHERE IT FITS IN PATHOS ARCHITECTURE:
 * - Used in Resume Builder workspace when tailoring suggestions are available
 * - Integrates with applyTailoringHints() from resume-helpers.ts
 * - Updates resume document when suggestions are accepted
 *
 * @version Day 38 - Resume Builder Revamp
 * ============================================================================
 */

'use client';

import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as BadgeComponent } from '@/components/ui/badge';
import type { SuggestedRewrite } from '@/lib/resume/resume-domain-model';

interface RewriteTransitionUIProps {
  suggestions: SuggestedRewrite[];
  onAccept: (suggestionId: string) => void;
  onReject: (suggestionId: string) => void;
}

/**
 * Rewrite Transition UI Component
 *
 * PURPOSE:
 * Displays suggested rewrites in a diff-like format with accept/reject actions.
 * Shows old value -> new value with reason badge.
 */
export function RewriteTransitionUI(props: RewriteTransitionUIProps) {
  const suggestions = props.suggestions;
  const onAccept = props.onAccept;
  const onReject = props.onReject;

  const pendingSuggestions = suggestions.filter(function (s) {
    return s.status === 'pending';
  });

  if (pendingSuggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-accent/20 bg-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Suggested Improvements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingSuggestions.map(function (suggestion) {
          return (
            <div
              key={suggestion.id}
              className="border rounded-lg p-3 bg-background space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <BadgeComponent variant="outline" className="text-xs">
                      {suggestion.reason}
                    </BadgeComponent>
                    <span className="text-xs text-muted-foreground">
                      {suggestion.sectionType} • {suggestion.fieldName}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Current:
                      </p>
                      <p className="text-sm line-through text-muted-foreground">
                        {suggestion.oldValue || '(empty)'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-accent mb-1">Suggested:</p>
                      <p className="text-sm">{suggestion.newValue}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-green-600"
                    onClick={function () {
                      onAccept(suggestion.id);
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive"
                    onClick={function () {
                      onReject(suggestion.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

