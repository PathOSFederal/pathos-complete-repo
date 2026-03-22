'use client';

import { CheckCircle2, AlertCircle, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useCardVisibility } from '@/store/userPreferencesStore';
import { useAdvisorContext } from '@/contexts/advisor-context';
import { SensitiveValue } from '@/components/sensitive-value';

export type StrengthCheckItem = {
  id: string;
  label: string;
  status: 'success' | 'warning' | 'incomplete';
  tip?: string;
};

export interface ResumeStrengthData {
  score: number;
  label: 'Needs work' | 'Developing' | 'Strong';
  checks: StrengthCheckItem[];
}

interface ResumeStrengthPanelProps {
  data: ResumeStrengthData;
  compact?: boolean;
  title?: string;
  description?: string;
  onCheckItemClick?: (item: StrengthCheckItem) => void;
}

export function ResumeStrengthPanel(props: ResumeStrengthPanelProps) {
  const data = props.data;
  const compact = props.compact !== undefined ? props.compact : false;
  const title = props.title !== undefined ? props.title : 'Resume Strength';
  const description =
    props.description !== undefined
      ? props.description
      : "How competitive your resume looks for federal roles based on what you've entered so far.";
  const onCheckItemClick = props.onCheckItemClick;

  const advisorContextData = useAdvisorContext();
  const setAdvisorContext = advisorContextData.setContext;

  const visibility = useCardVisibility('resume.scoreCard');

  const getScoreColor = function (score: number) {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getLabelColor = function (label: string) {
    if (label === 'Strong') return 'text-green-600';
    if (label === 'Developing') return 'text-amber-600';
    return 'text-red-600';
  };

  const handleCheckClick = function (item: StrengthCheckItem) {
    // Trigger PathAdvisor with context-aware tip
    if (item.tip) {
      setAdvisorContext({
        source: 'recommendations',
        keyHighlights: [item.tip],
      });
    }
    if (onCheckItemClick) {
      onCheckItemClick(item);
    }
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {visibility.visible && (
              <span className={'text-sm font-semibold ' + getLabelColor(data.label)}>
                <SensitiveValue
                  value={data.score + '/100 · ' + data.label}
                  masked="••/100 · ••••"
                  hide={visibility.isSensitiveHidden}
                />
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={visibility.toggle}
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              aria-label={visibility.visible ? 'Hide this card' : 'Show this card'}
            >
              {visibility.visible ? (
                <Eye className="w-3 h-3" />
              ) : (
                <EyeOff className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>
        {!visibility.visible ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-xs mb-2">This card is hidden.</p>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={function () {
                visibility.setVisible(true);
              }}
            >
              Show this card
            </Button>
          </div>
        ) : (
          <>
            <Progress value={data.score} className={'h-2 ' + getScoreColor(data.score)} />
            {data.checks.filter(function (c) { return c.status === 'warning'; }).length > 0 && (
              <p className="text-xs text-muted-foreground">
                {data.checks.filter(function (c) { return c.status === 'warning'; }).length} area(s) could be improved
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              {title}
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {visibility.visible && (
              <div className="text-right">
                <div className={'text-2xl font-bold ' + getLabelColor(data.label)}>
                  <SensitiveValue
                    value={data.score + '/100'}
                    masked="••/100"
                    hide={visibility.isSensitiveHidden}
                  />
                </div>
                <div className={'text-sm font-medium ' + getLabelColor(data.label)}>
                  <SensitiveValue
                    value={data.label}
                    masked="••••"
                    hide={visibility.isSensitiveHidden}
                  />
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={visibility.toggle}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              aria-label={visibility.visible ? 'Hide this card' : 'Show this card'}
            >
              {visibility.visible ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!visibility.visible ? (
          <div className="text-center py-8 text-muted-foreground">
            <EyeOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="mb-4">This card is hidden.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={function () {
                visibility.setVisible(true);
              }}
            >
              Show this card
            </Button>
          </div>
        ) : (
          <>
            {/* Progress Bar */}
            <Progress value={data.score} className="h-3" />

            {/* Checklist */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Strengths & Gaps</p>
              <ul className="space-y-2">
                {data.checks.map(function (item) {
                  return (
                    <li key={item.id}>
                      <button
                        onClick={function () { handleCheckClick(item); }}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                      >
                        {item.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        ) : item.status === 'warning' ? (
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                        )}
                        <span
                          className={
                            'text-sm ' +
                            (item.status === 'success'
                              ? 'text-foreground'
                              : item.status === 'warning'
                                ? 'text-amber-700'
                                : 'text-muted-foreground')
                          }
                        >
                          {item.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
