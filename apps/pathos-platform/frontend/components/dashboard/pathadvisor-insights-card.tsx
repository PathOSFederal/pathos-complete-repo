'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  TrendingUp,
  Target,
  MapPin,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { usePathAdvisorInsights } from '@/hooks/use-pathadvisor-insights';
import { useProfileStore } from '@/store/profileStore';
import { SensitiveValue } from '@/components/sensitive-value';
import { useUserPreferencesStore } from '@/store/userPreferencesStore';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function PathAdvisorInsightsCard() {
  const user = useProfileStore(function (state) {
    return state.user;
  });

  const globalHide = useUserPreferencesStore(function (state) {
    return state.isSensitiveHidden;
  });

  const { visible, isSensitiveHidden } = useDashboardCardVisibility('dashboard.pathAdvisorInsights');

  const { insights, isLoading, error, fetchInsights } = usePathAdvisorInsights({
    autoFetch: true,
  });

  // Refetch on profile changes
  const profile = useProfileStore(function (state) {
    return state.profile;
  });

  useEffect(
    function () {
      // Only refetch if we already have insights (indicating user may have changed profile)
      if (insights && !isLoading) {
        // Debounce profile changes
        const timeout = setTimeout(function () {
          fetchInsights();
        }, 500);
        return function () {
          clearTimeout(timeout);
        };
      }
    },
    // Only trigger on profile persona or goals changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile.persona, profile.goals.targetGradeFrom, profile.goals.targetGradeTo]
  );

  const title = 'PathAdvisor Insights';
  const hideValues = globalHide || isSensitiveHidden;

  const handleRefresh = function () {
    fetchInsights();
  };

  const formatCurrency = function (value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    const sign = value >= 0 ? '+' : '';
    return sign + '$' + Math.abs(value).toLocaleString();
  };

  const formatScore = function (value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return value + '%';
  };

  const getScoreColor = function (score: number | null | undefined): string {
    if (score === null || score === undefined) {
      return 'text-muted-foreground';
    }
    if (score >= 80) {
      return 'text-green-500';
    }
    if (score >= 60) {
      return 'text-accent';
    }
    return 'text-yellow-500';
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Refresh insights"
            >
              <RefreshCw className={'w-4 h-4' + (isLoading ? ' animate-spin' : '')} />
            </Button>
            <DashboardCardVisibilityToggle cardKey="dashboard.pathAdvisorInsights" />
          </div>
        </div>
        <CardDescription>
          {user.currentEmployee
            ? 'AI-powered analysis of your career trajectory'
            : 'Personalized insights for your federal career goals'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!visible ? (
          <CardHiddenPlaceholder title={title} cardKey="dashboard.pathAdvisorInsights" />
        ) : isLoading && !insights ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 text-accent animate-spin" />
              <p className="text-sm text-muted-foreground">Loading insights...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="mt-2 text-xs"
              >
                Try again
              </Button>
            </div>
          </div>
        ) : insights ? (
          <div className="space-y-4">
            {/* Qualification & Competitiveness Scores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Qualification Match</div>
                <div className="flex items-center gap-2">
                  <Target className={'w-4 h-4 ' + getScoreColor(insights.qualificationMatch)} />
                  <SensitiveValue
                    value={formatScore(insights.qualificationMatch)}
                    masked="••%"
                    hide={hideValues}
                    className={'text-lg font-bold ' + getScoreColor(insights.qualificationMatch)}
                  />
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Competitiveness</div>
                <div className="flex items-center gap-2">
                  <Target className={'w-4 h-4 ' + getScoreColor(insights.competitivenessScore)} />
                  <SensitiveValue
                    value={formatScore(insights.competitivenessScore)}
                    masked="••%"
                    hide={hideValues}
                    className={'text-lg font-bold ' + getScoreColor(insights.competitivenessScore)}
                  />
                </div>
              </div>
            </div>

            {/* Salary Projection */}
            {insights.salaryProjection && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Salary Projection</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <SensitiveValue
                      value={formatCurrency(insights.salaryProjection.estimatedIncrease)}
                      masked="+$••,•••"
                      hide={hideValues}
                      className="text-lg font-bold text-green-500"
                    />
                  </div>
                  {insights.salaryProjection.estimatedNewSalary && (
                    <Badge variant="secondary" className="text-xs">
                      <SensitiveValue
                        value={'New: $' + insights.salaryProjection.estimatedNewSalary.toLocaleString()}
                        masked="New: $••,•••"
                        hide={hideValues}
                      />
                    </Badge>
                  )}
                </div>
                {insights.salaryProjection.notes && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {insights.salaryProjection.notes}
                  </p>
                )}
              </div>
            )}

            {/* Retirement Impact */}
            {insights.retirementImpact && user.currentEmployee && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Retirement Readiness</div>
                <div className="flex items-center justify-between">
                  <SensitiveValue
                    value={formatScore(insights.retirementImpact.retirementReadinessScore)}
                    masked="••%"
                    hide={hideValues}
                    className={'text-lg font-bold ' + getScoreColor(insights.retirementImpact.retirementReadinessScore)}
                  />
                  {insights.retirementImpact.tspDelta !== null && insights.retirementImpact.tspDelta !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      <SensitiveValue
                        value={'TSP ' + formatCurrency(insights.retirementImpact.tspDelta) + '/mo'}
                        masked="TSP +$•••/mo"
                        hide={hideValues}
                      />
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Relocation Insights */}
            {insights.relocationInsights && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Relocation Impact</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-accent" />
                    <SensitiveValue
                      value={formatCurrency(insights.relocationInsights.costAdjustment)}
                      masked="$••,•••"
                      hide={hideValues}
                      className="text-lg font-bold"
                    />
                  </div>
                  {insights.relocationInsights.riskLevel && (
                    <Badge
                      variant="secondary"
                      className={
                        insights.relocationInsights.riskLevel === 'low'
                          ? 'bg-green-500/20 text-green-400'
                          : insights.relocationInsights.riskLevel === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                      }
                    >
                      {insights.relocationInsights.riskLevel.charAt(0).toUpperCase() +
                        insights.relocationInsights.riskLevel.slice(1)}{' '}
                      risk
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Note about mock data */}
            <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
              Insights powered by PathAdvisor
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No insights available yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-4"
            >
              Load Insights
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}














