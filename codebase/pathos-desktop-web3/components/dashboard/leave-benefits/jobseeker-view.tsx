'use client';

import { Badge } from '@/components/ui/badge';
import { Shield, Heart, Clock } from 'lucide-react';
import { SensitiveValue } from '@/components/sensitive-value';
import type { User } from '@/contexts/persona-context';

interface JobSeekerViewProps {
  user: User;
  isHidden: boolean;
}

export function JobSeekerView({ user, isHidden }: JobSeekerViewProps) {

  return (
    <div className="space-y-4">
      <Badge className="bg-accent/20 text-accent border-accent/30">Federal Benefits Overview</Badge>

      <div>
        <p className="text-xs text-muted-foreground">
          Est. FEHB Premium ({user.targetLocation || 'DC Area'})
        </p>
        <p className="text-2xl font-bold text-foreground mt-1">
          <SensitiveValue value="$350-$600/mo" hide={isHidden} />
        </p>
        <p className="text-xs text-muted-foreground mt-1">Self + Family coverage range</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Shield className="w-4 h-4 text-accent mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Health Insurance (FEHB)</p>
            <p className="text-xs text-muted-foreground">200+ plan options nationwide</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Heart className="w-4 h-4 text-accent mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Life Insurance (FEGLI)</p>
            <p className="text-xs text-muted-foreground">Basic coverage at no cost</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-accent mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Leave Benefits</p>
            <p className="text-xs text-muted-foreground">13-26 days annual + 13 days sick/year</p>
          </div>
        </div>
      </div>

      <a
        href="/explore/benefits"
        className="inline-flex items-center gap-1 text-accent hover:text-accent/80 text-sm font-medium transition-colors"
      >
        Explore all federal benefits
      </a>
    </div>
  );
}
