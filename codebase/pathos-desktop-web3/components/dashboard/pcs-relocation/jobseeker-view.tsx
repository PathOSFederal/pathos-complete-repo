'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2 } from 'lucide-react';
import { ExploreLocationsModal } from './explore-locations-modal';
import type { User } from '@/contexts/persona-context';

interface JobSeekerViewProps {
  user: User;
  isHidden: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- props reserved for future personalization
export function JobSeekerView({ user: _user, isHidden: _isHidden }: JobSeekerViewProps) {
  const [showExploreModal, setShowExploreModal] = useState(false);

  const topMatches = [
    { location: 'San Antonio, TX', col: '-18%', agencies: 12 },
    { location: 'Denver, CO', col: '+5%', agencies: 8 },
  ];

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">Top COL matches for your target agencies</div>

      {topMatches.map((match) => (
        <div key={match.location} className="p-2 bg-muted/30 rounded space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-accent" />
              <span className="text-sm font-medium">{match.location}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {match.col.startsWith('-') ? (
                <span className="text-green-500">{match.col} COL</span>
              ) : (
                <span>{match.col} COL</span>
              )}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3" />
            <span>{match.agencies} agencies hiring</span>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="w-full bg-transparent"
        onClick={() => setShowExploreModal(true)}
      >
        Explore Locations
      </Button>

      <ExploreLocationsModal open={showExploreModal} onOpenChange={setShowExploreModal} />
    </div>
  );
}
