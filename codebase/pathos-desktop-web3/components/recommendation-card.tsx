'use client';

import { useState } from 'react';
import { usePrivacy } from '@/contexts/privacy-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DollarSign, AlertCircle, Eye, EyeOff, MoreVertical } from 'lucide-react';
import { SensitiveValue } from '@/components/sensitive-value';

interface RecommendationCardProps {
  id: string;
  category: 'Pay' | 'FEHB' | 'Retirement' | 'Tax' | 'Leave' | 'Other';
  impact: 'High' | 'Medium' | 'Low';
  effort: 'Low' | 'Medium' | 'High';
  title: string;
  description: string;
  annualImpact: string;
  additionalInfo?: string;
  status: 'New' | 'In review' | 'Completed';
  primaryAction?: string;
  secondaryActions?: string[];
  compact?: boolean;
}

const categoryColors: Record<string, string> = {
  Pay: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  FEHB: 'bg-green-500/20 text-green-300 border-green-500/30',
  Retirement: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Tax: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  Leave: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  Other: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const impactColors = {
  High: 'bg-red-500/20 text-red-300',
  Medium: 'bg-yellow-500/20 text-yellow-300',
  Low: 'bg-gray-500/20 text-gray-300',
};

const effortColors = {
  Low: 'bg-green-500/20 text-green-300',
  Medium: 'bg-yellow-500/20 text-yellow-300',
  High: 'bg-red-500/20 text-red-300',
};

const statusColors = {
  New: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'In review': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  Completed: 'bg-green-500/20 text-green-300 border-green-500/30',
};

export function RecommendationCard({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- id required by interface, reserved for future use
  id: _id,
  category,
  impact,
  effort,
  title,
  description,
  annualImpact,
  additionalInfo,
  status,
  primaryAction = 'Review details',
  secondaryActions = [],
  compact = false,
}: RecommendationCardProps) {
  const { globalHide } = usePrivacy();
  const [localOverride, setLocalOverride] = useState<boolean | null>(null);
  const shouldHide = localOverride !== null ? localOverride : globalHide;

  return (
    <Card className="border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
      <CardContent className={compact ? 'p-4' : 'p-6'}>
        <div className="space-y-4">
          {/* Header with badges */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className={`${categoryColors[category]} border`}>
                {category}
              </Badge>
              <Badge variant="outline" className={`${impactColors[impact]} border-0 text-xs`}>
                {impact} impact
              </Badge>
              <Badge variant="outline" className={`${effortColors[effort]} border-0 text-xs`}>
                {effort} effort
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${statusColors[status]} border shrink-0`}>
                {status}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                    {shouldHide ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setLocalOverride(null)}>
                    <MoreVertical className="w-4 h-4 mr-2" />
                    Use global setting
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocalOverride(false)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Show sensitive data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocalOverride(true)}>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide sensitive data
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Title and description */}
          <div>
            <h3
              className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-slate-100 leading-tight`}
            >
              {title}
            </h3>
            <p className="text-sm text-slate-400 mt-1">{description}</p>
          </div>

          {/* Impact row */}
          <div className="flex items-center gap-4 pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-600" />
              <SensitiveValue
                value={annualImpact}
                className="text-sm font-medium text-slate-200"
                overrideHide={shouldHide}
              />
              <span className="text-xs text-slate-400">/year</span>
            </div>
            {additionalInfo && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <AlertCircle className="w-4 h-4" />
                {additionalInfo}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className={`flex gap-2 pt-2 ${compact ? 'flex-wrap' : ''}`}>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 border-slate-600 hover:bg-slate-700/50 bg-transparent"
            >
              {primaryAction}
            </Button>
            {secondaryActions.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="ghost"
                className="text-xs h-8 text-slate-400 hover:text-slate-200"
              >
                {action}
              </Button>
            ))}
            <button className="text-xs text-slate-500 hover:text-slate-300 ml-auto underline self-center">
              Ignore
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
