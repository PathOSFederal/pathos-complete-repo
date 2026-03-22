'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SensitiveValue } from '@/components/sensitive-value';
import { MapPin, Star } from 'lucide-react';
import type { User } from '@/contexts/persona-context';
import { ExploreFehbPlansModal } from './explore-fehb-plans-modal';

interface JobSeekerViewProps {
  user: User;
  isHidden: boolean;
}

export function JobSeekerView({ user, isHidden }: JobSeekerViewProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const recommendedPlans = [
    { name: 'BCBS Basic', premium: '$285/mo', rating: 4.5 },
    { name: 'Kaiser HMO', premium: '$310/mo', rating: 4.8 },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3" />
        <span>Recommended for {user.targetLocation || 'Washington, DC'}</span>
      </div>

      <div className="space-y-2">
        {recommendedPlans.map((plan) => (
          <div
            key={plan.name}
            className="flex justify-between items-center p-2 bg-muted/30 rounded"
          >
            <div>
              <p className="text-sm font-medium">{plan.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="w-3 h-3 text-accent fill-accent" />
                <span>{plan.rating}</span>
              </div>
            </div>
            <SensitiveValue
              value={plan.premium}
              hide={isHidden}
              className="text-sm font-medium"
            />
          </div>
        ))}
      </div>

      <Badge variant="outline" className="text-xs">
        200+ FEHB plans available nationwide
      </Badge>

      <Button
        variant="outline"
        size="sm"
        className="w-full bg-transparent"
        onClick={() => setModalOpen(true)}
      >
        Explore FEHB Plans
      </Button>

      <ExploreFehbPlansModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        targetLocation={user.targetLocation || 'Washington, DC'}
        targetGrade={user.targetGrade || 'GS-7'}
      />
    </div>
  );
}
