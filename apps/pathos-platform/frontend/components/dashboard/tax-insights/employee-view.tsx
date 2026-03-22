'use client';

import { Badge } from '@/components/ui/badge';
import { SensitiveValue } from '@/components/sensitive-value';
import type { User } from '@/store/profileStore';

interface EmployeeViewProps {
  user: User;
  isHidden: boolean;
}

export function EmployeeView(props: EmployeeViewProps) {
  const isHidden = props.isHidden;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm">Effective Rate</span>
        <span className="text-sm font-medium">
          <SensitiveValue value="22.4%" hide={isHidden} />
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm">State Tax (VA)</span>
        <span className="text-sm font-medium">
          <SensitiveValue value="5.75%" hide={isHidden} />
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm">FICA</span>
        <span className="text-sm font-medium">
          <SensitiveValue value="7.65%" hide={isHidden} />
        </span>
      </div>
      <Badge variant="outline" className="text-xs">
        {isHidden ? '•••••' : 'Optimize W-4 to save ~$1,200'}
      </Badge>
      <p className="text-xs text-muted-foreground">
        Consider adjusting withholdings for a larger paycheck.
      </p>
    </div>
  );
}
