'use client';

import { Badge } from '@/components/ui/badge';
import { Clock, Target } from 'lucide-react';
import type { User } from '@/contexts/persona-context';

interface JobSeekerViewProps {
  user: User;
  isHidden: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- props reserved for future personalization
export function JobSeekerView({ user: _user, isHidden: _isHidden }: JobSeekerViewProps) {
  return (
    <div className="space-y-4">
      <Badge className="bg-accent/20 text-accent border-accent/30">Career Timeline Preview</Badge>

      <div>
        <p className="text-xs text-muted-foreground">Estimated GS Progression</p>
        <p className="text-2xl font-bold text-foreground mt-1">GS-11 → GS-14</p>
        <p className="text-xs text-muted-foreground mt-1">Typical 8-10 year path</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Career Progression</span>
          <span className="text-foreground">Entry Level</span>
        </div>
        <div className="flex gap-1">
          <div className="h-2 flex-1 bg-accent rounded-l" />
          <div className="h-2 flex-1 bg-muted" />
          <div className="h-2 flex-1 bg-muted" />
          <div className="h-2 flex-1 bg-muted rounded-r" />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>GS-11</span>
          <span>GS-12</span>
          <span>GS-13</span>
          <span>GS-14</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-accent mt-0.5" />
          <div>
            <p className="text-muted-foreground text-xs">Time to GS-13</p>
            <p className="font-medium text-foreground">~4-6 years</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Target className="w-4 h-4 text-accent mt-0.5" />
          <div>
            <p className="text-muted-foreground text-xs">Retirement Eligibility</p>
            <p className="font-medium text-foreground">After 5 years</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Federal employees become vested in FERS retirement after 5 years of service.
      </p>
    </div>
  );
}
