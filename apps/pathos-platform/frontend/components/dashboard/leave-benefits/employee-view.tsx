'use client';

import { Badge } from '@/components/ui/badge';
import { SensitiveValue } from '@/components/sensitive-value';
import type { User } from '@/contexts/persona-context';

interface EmployeeViewProps {
  user: User;
  isHidden: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- user prop reserved for future personalization
export function EmployeeView({ user: _user, isHidden }: EmployeeViewProps) {

  const leaves = [
    { type: 'Annual Leave', hours: 156 },
    { type: 'Sick Leave', hours: 68 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-foreground">156</span>
        <span className="text-sm text-muted-foreground">hrs annual leave</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {leaves.map((leave) => (
          <div key={leave.type}>
            <p className="text-muted-foreground text-xs">{leave.type}</p>
            <p className="font-medium text-foreground">
              <SensitiveValue value={`${leave.hours} hrs`} hide={isHidden} />
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">FEHB: Blue Cross Blue Shield</p>
        <p className="text-xs text-muted-foreground">Standard Option - Self + Family</p>
      </div>

      <Badge variant="secondary" className="text-xs">
        Open Season: 42 days left
      </Badge>

      <p className="text-xs text-muted-foreground">
        Update leave balances from your latest LES statement.
      </p>
    </div>
  );
}
