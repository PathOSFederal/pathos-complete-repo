'use client';

import { MapPin, TrendingUp, Settings } from 'lucide-react';
import Link from 'next/link';
import { SensitiveValue } from '@/components/sensitive-value';
import { useProfileStore, type GradeBandKey, type User } from '@/store/profileStore';
import { cn } from '@/lib/utils';

interface JobSeekerViewProps {
  user: User;
  isHidden: boolean;
}

// Grade band options with salary ranges
const gradeBandOptions: {
  key: GradeBandKey;
  label: string;
  shortLabel: string;
  from: string;
  to: string;
  salaryRange: string;
}[] = [
  {
    key: 'entry',
    label: 'Entry (GS-5–7)',
    shortLabel: 'Entry',
    from: 'GS-5',
    to: 'GS-7',
    salaryRange: '$39,000 - $58,000',
  },
  {
    key: 'early',
    label: 'Early (GS-7–9)',
    shortLabel: 'Early',
    from: 'GS-7',
    to: 'GS-9',
    salaryRange: '$48,000 - $72,000',
  },
  {
    key: 'mid',
    label: 'Mid (GS-9–11)',
    shortLabel: 'Mid',
    from: 'GS-9',
    to: 'GS-11',
    salaryRange: '$59,000 - $88,000',
  },
  {
    key: 'senior',
    label: 'Senior (GS-12–13)',
    shortLabel: 'Senior',
    from: 'GS-12',
    to: 'GS-13',
    salaryRange: '$78,000 - $120,000',
  },
  {
    key: 'unsure',
    label: 'Not sure',
    shortLabel: 'Not sure',
    from: '',
    to: '',
    salaryRange: '$39,000 - $120,000',
  },
];

export function JobSeekerView(props: JobSeekerViewProps) {
  const user = props.user;
  const isHidden = props.isHidden;

  const profile = useProfileStore(function (state) {
    return state.profile;
  });
  const updateGoals = useProfileStore(function (state) {
    return state.updateGoals;
  });


  // Get current selection from profile
  const currentBand = profile.goals.gradeBand || 'early';
  let selectedBandOption = gradeBandOptions[1]; // default to 'early'
  for (let i = 0; i < gradeBandOptions.length; i++) {
    if (gradeBandOptions[i].key === currentBand) {
      selectedBandOption = gradeBandOptions[i];
      break;
    }
  }

  // Handle band selection
  const handleBandSelect = function (band: GradeBandKey) {
    let option = null;
    for (let j = 0; j < gradeBandOptions.length; j++) {
      if (gradeBandOptions[j].key === band) {
        option = gradeBandOptions[j];
        break;
      }
    }
    if (option) {
      updateGoals({
        gradeBand: band,
        targetGradeFrom: option.from || undefined,
        targetGradeTo: option.to || undefined,
      });
    }
  };

  // Compute display values
  let displayGrade = 'Exploring';
  if (selectedBandOption.from && selectedBandOption.to) {
    displayGrade = selectedBandOption.from + '–' + selectedBandOption.to;
  }
  const displaySalary = selectedBandOption.salaryRange;
  const displayLocation =
    profile.location.currentMetroArea || user.targetLocation || 'Washington, DC';

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Estimated Starting Range</p>
        <div className="text-3xl font-bold text-accent">
          <SensitiveValue value={displaySalary} hide={isHidden} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Based on {displayGrade} target</p>
      </div>

      {/* Target level pill selector */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Target level</p>
        <div className="flex flex-wrap gap-1.5">
          {gradeBandOptions.map(function (band) {
            return (
              <button
                key={band.key}
                onClick={function () { handleBandSelect(band.key); }}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-full border transition-colors',
                  currentBand === band.key
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground',
                )}
              >
                {band.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Target Grade</p>
          <p className="font-medium text-foreground">{displayGrade}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Target Location</p>
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <p className="font-medium text-foreground truncate">{displayLocation.split(',')[0]}</p>
          </div>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Locality Adj.</p>
          <p className="font-medium text-foreground">
            <SensitiveValue value="+32.49%" hide={isHidden} />
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Avg. Benefits</p>
          <p className="font-medium text-foreground">
            <SensitiveValue value="~$14,000" hide={isHidden} />
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <TrendingUp className="w-4 h-4 text-accent" />
        <span className="text-muted-foreground">Annual step increases of ~3%</span>
      </div>

      {/* Link to full profile */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Settings className="w-3 h-3" />
        Edit full career goals in Profile
      </Link>
    </div>
  );
}
