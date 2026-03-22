'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SensitiveValue } from '@/components/sensitive-value';
import { TrendingDown } from 'lucide-react';
import type { User } from '@/contexts/persona-context';
import { ComparePlansModal } from './compare-plans-modal';

interface EmployeeViewProps {
  user: User;
  isHidden: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- user prop reserved for future personalization
export function EmployeeView({ user: _user, isHidden }: EmployeeViewProps) {
  const [showCompareModal, setShowCompareModal] = useState(false);

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm">Current: BCBS Standard</span>
          <SensitiveValue
            value="$412/mo"
            masked="$•••/mo"
            hide={isHidden}
            className="text-sm font-medium"
          />
        </div>
        <div className="flex justify-between items-center text-green-500">
          <span className="text-sm flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            Better option available
          </span>
          <span className="text-sm font-medium">Save $840/yr</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Geisinger HDHP could save you more with similar coverage.
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">
          Estimates only. Final costs come from official FEHB resources.
        </p>

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 bg-transparent"
          onClick={() => setShowCompareModal(true)}
        >
          Compare Plans
        </Button>
      </div>

      <ComparePlansModal open={showCompareModal} onOpenChange={setShowCompareModal} />
    </>
  );
}
