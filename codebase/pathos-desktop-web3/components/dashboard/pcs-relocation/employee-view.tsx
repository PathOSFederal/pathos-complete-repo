'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SensitiveValue } from '@/components/sensitive-value';
import type { User } from '@/contexts/persona-context';
import { EstimatePcsCostsModal } from './estimate-pcs-costs-modal';

interface EmployeeViewProps {
  user: User;
  isHidden: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- user prop reserved for future personalization
export function EmployeeView({ user: _user, isHidden }: EmployeeViewProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-sm">No active PCS orders</p>
      <div className="text-xs text-muted-foreground">Last PCS: Fort Belvoir → DC (2022)</div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Est. next PCS cost</span>
          <span className="font-medium">
            <SensitiveValue value="~$12,500" hide={isHidden} />
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Govt. coverage</span>
          <span className="font-medium">
            <SensitiveValue value="Up to $8,000" hide={isHidden} />
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-2 bg-transparent"
        onClick={() => setShowModal(true)}
      >
        Estimate PCS Costs
      </Button>

      <EstimatePcsCostsModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}
