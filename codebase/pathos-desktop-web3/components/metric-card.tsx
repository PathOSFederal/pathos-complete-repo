/**
 * ============================================================================
 * METRIC CARD COMPONENT
 * ============================================================================
 *
 * FILE PURPOSE:
 * A reusable card component for displaying key metrics with optional trend
 * indicators and badges. Used throughout the dashboard to show KPIs like
 * compensation totals, retirement projections, and savings rates.
 *
 * WHERE IT FITS IN THE ARCHITECTURE:
 * - UI Layer: Presentation component
 * - Used by: Dashboard pages, summary cards, analytics displays
 * - Dependencies: Card UI component, Lucide icons
 *
 * KEY CONCEPTS:
 * - "Trend" indicates if a metric is going up, down, or staying neutral
 * - Trend is visualized with an arrow icon and color coding
 * - Optional badge provides additional context (e.g., "Target", "Warning")
 *
 * HOW IT WORKS (STEP BY STEP):
 * 1. Receive metric data (title, value, optional trend/badge)
 * 2. Render card with title and value
 * 3. If trend provided, show trend icon and value with color coding
 * 4. If badge provided, show it in the header
 *
 * WHY THIS DESIGN:
 * - Consistent metric display across the application
 * - Trend visualization helps users quickly understand changes
 * - Badge system allows for contextual annotations
 *
 * TESTING / VALIDATION:
 * - pnpm typecheck (ensure no type errors)
 * - Visual: Check dashboard pages for proper rendering
 * ============================================================================
 */

'use client';

import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Props for the MetricCard component.
 */
interface MetricCardProps {
  /** The title/label for the metric */
  title: string;
  /** The main value to display (can be string, number, or JSX) */
  value: ReactNode;
  /** Optional description text shown below the value */
  description?: string;
  /** Optional trend direction for visual indicator */
  trend?: 'up' | 'down' | 'neutral';
  /** Optional trend value/percentage to display next to the trend icon */
  trendValue?: ReactNode;
  /** Optional badge text to show in the header */
  badge?: string;
  /** Optional badge variant for styling */
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

/**
 * MetricCard Component
 *
 * Displays a metric with optional trend indicator and badge.
 *
 * @example Basic usage
 * <MetricCard title="Total Compensation" value="$125,000" />
 *
 * @example With trend
 * <MetricCard
 *   title="Savings Rate"
 *   value="15%"
 *   trend="up"
 *   trendValue="+2%"
 * />
 *
 * @example With badge
 * <MetricCard
 *   title="Retirement Age"
 *   value="62"
 *   badge="On Track"
 *   badgeVariant="secondary"
 * />
 */
export function MetricCard({
  title,
  value,
  description,
  trend,
  trendValue,
  badge,
  badgeVariant = 'default',
}: MetricCardProps) {
  return (
    <Card className="border-border bg-card hover:bg-card/80 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
          {badge && (
            <Badge variant={badgeVariant} className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold text-foreground">{value}</div>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                // Use ternary instead of && to avoid false in className
                trend === 'up' ? 'text-green-500' : undefined,
                trend === 'down' ? 'text-red-500' : undefined,
                trend === 'neutral' ? 'text-muted-foreground' : undefined,
              )}
            >
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" />}
              {trendValue}
            </div>
          )}
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * Local utility to concatenate class names.
 *
 * WHY LOCAL:
 * This component was created before the project had a shared cn utility.
 * It's kept local for backward compatibility and to avoid import changes.
 *
 * ACCEPTS:
 * - Strings: included as-is
 * - undefined: filtered out
 * - false/null: filtered out (allows conditional classes with ternary)
 */
function cn(...classes: (string | undefined | false | null)[]): string {
  const result: string[] = [];
  for (let i = 0; i < classes.length; i++) {
    const cls = classes[i];
    // Only include truthy strings
    if (cls && typeof cls === 'string') {
      result.push(cls);
    }
  }
  return result.join(' ');
}
