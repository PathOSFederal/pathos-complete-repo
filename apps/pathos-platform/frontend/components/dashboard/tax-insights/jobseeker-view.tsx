'use client';

import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { SensitiveValue } from '@/components/sensitive-value';
import type { User } from '@/store/profileStore';

interface JobSeekerViewProps {
  user: User;
  isHidden: boolean;
}

export function JobSeekerView(props: JobSeekerViewProps) {
  const user = props.user;
  const isHidden = props.isHidden;

  const locationComparisons = [
    { location: 'DC Metro', stateTax: '5.75%', netPay: '$72,500' },
    { location: 'Texas', stateTax: '0%', netPay: '$78,200' },
  ];

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground mb-2">Compare take-home pay by location</div>

      {locationComparisons.map(function (loc) {
        return (
          <div key={loc.location} className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm">{loc.location}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium">
                <SensitiveValue value={loc.netPay} hide={isHidden} />
              </span>
              <p className="text-xs text-muted-foreground">{loc.stateTax} state tax</p>
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-1 text-xs text-accent">
        <span>Texas saves you</span>
        <span className="font-medium">
          <SensitiveValue value="~$5,700/yr" hide={isHidden} />
        </span>
      </div>

      <Badge variant="outline" className="text-xs">
        Based on {user.targetGrade || 'GS-11'} salary estimate
      </Badge>
    </div>
  );
}
