'use client';

import { useState } from 'react';
import { TrendingUp, DollarSign, Settings } from 'lucide-react';
import Link from 'next/link';
import { SensitiveValue } from '@/components/sensitive-value';
import { DetailedCompensationModal } from './detailed-compensation-modal';
import { useProfileStore, type User } from '@/store/profileStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmployeeViewProps {
  user: User;
  isHidden: boolean;
}

const gradeOptions = [
  'GS-5',
  'GS-6',
  'GS-7',
  'GS-8',
  'GS-9',
  'GS-10',
  'GS-11',
  'GS-12',
  'GS-13',
  'GS-14',
  'GS-15',
];

export function EmployeeView(props: EmployeeViewProps) {
  const user = props.user;
  const isHidden = props.isHidden;

  const [modalOpen, setModalOpen] = useState(false);

  const profile = useProfileStore(function (state) {
    return state.profile;
  });
  const updateGoals = useProfileStore(function (state) {
    return state.updateGoals;
  });

  // Get target grades from profile
  const targetFrom = profile.goals.targetGradeFrom || 'GS-14';
  const targetTo = profile.goals.targetGradeTo || 'GS-15';

  // Handle grade changes
  const handleFromChange = function (value: string) {
    const toIndex = gradeOptions.indexOf(targetTo);
    const fromIndex = gradeOptions.indexOf(value);
    let newTargetTo = targetTo;
    if (fromIndex > toIndex) {
      newTargetTo = value;
    }
    updateGoals({
      targetGradeFrom: value,
      gradeBand: 'custom',
      targetGradeTo: newTargetTo,
    });
  };

  const handleToChange = function (value: string) {
    updateGoals({
      targetGradeTo: value,
      gradeBand: 'custom',
    });
  };

  // Get available "to" options (must be >= from)
  const fromIndex = gradeOptions.indexOf(targetFrom);
  const toOptions = gradeOptions.slice(fromIndex >= 0 ? fromIndex : 0);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-3xl font-bold text-accent">
          <SensitiveValue value="$138,450" hide={isHidden} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Annual total compensation</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Promotion target grades</p>
        <div className="flex items-center gap-2">
          <Select value={targetFrom} onValueChange={handleFromChange}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {gradeOptions.map(function (grade) {
                return (
                  <SelectItem key={grade} value={grade} className="text-xs">
                    {grade}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">to</span>
          <Select value={targetTo} onValueChange={handleToChange}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {toOptions.map(function (grade) {
                return (
                  <SelectItem key={grade} value={grade} className="text-xs">
                    {grade}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Grade/Step</p>
          <p className="font-medium text-foreground">{user.gradeStep || 'GS-13 Step 5'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Base Pay</p>
          <p className="font-medium text-foreground">
            <SensitiveValue value="$93,456" hide={isHidden} />
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Locality</p>
          <p className="font-medium text-foreground">
            <SensitiveValue value="$28,994" hide={isHidden} />
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Benefits Value</p>
          <p className="font-medium text-foreground">
            <SensitiveValue value="$16,000" hide={isHidden} />
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <TrendingUp className="w-4 h-4 text-green-500" />
        <span className="text-green-500 font-medium">+3.2%</span>
        <span className="text-muted-foreground">from last year</span>
      </div>

      <button
        onClick={function () { setModalOpen(true); }}
        className="inline-flex items-center gap-1 text-accent hover:text-accent/80 text-sm font-medium transition-colors"
      >
        View detailed compensation
        <DollarSign className="w-3 h-3" />
      </button>

      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-4"
      >
        <Settings className="w-3 h-3" />
        Edit in Profile
      </Link>

      <DetailedCompensationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        gradeStep={user.gradeStep || 'GS-13 Step 5'}
      />
    </div>
  );
}
