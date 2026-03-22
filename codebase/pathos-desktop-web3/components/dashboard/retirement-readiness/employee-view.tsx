'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SensitiveValue } from '@/components/sensitive-value';
import { DetailedRetirementModal } from './detailed-retirement-modal';
import type { User } from '@/contexts/persona-context';

interface EmployeeViewProps {
  user: User;
  isHidden: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- user prop reserved for future personalization
export function EmployeeView({ user: _user, isHidden }: EmployeeViewProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        On Track for MRA+30
      </Badge>

      <div>
        <p className="text-xs text-muted-foreground">Retirement Readiness</p>
        <p className="text-3xl font-bold text-foreground mt-1">78%</p>
      </div>

      <Progress value={78} className="h-2" />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">MRA Date</p>
          <p className="font-medium text-foreground">Age 57 (2037)</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Years to MRA+30</p>
          <p className="font-medium text-foreground">12 years, 4 months</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">FERS Basic</p>
          <p className="font-medium text-foreground">
            <SensitiveValue value="~$48,000/yr" hide={isHidden} />
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">TSP Balance</p>
          <p className="font-medium text-foreground">
            <SensitiveValue value="$487,000" hide={isHidden} />
          </p>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Estimates only. See details for assumptions.
      </p>

      <Button
        className="w-full bg-transparent"
        variant="outline"
        size="sm"
        onClick={() => setModalOpen(true)}
      >
        View retirement details
      </Button>

      <DetailedRetirementModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
