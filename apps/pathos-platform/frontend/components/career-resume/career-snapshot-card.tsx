'use client';

import { Briefcase, MapPin, Building2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';
import { SensitiveValue } from '@/components/sensitive-value';

// Mock career data
const mockCareerData = {
  grade: 'GS-12',
  step: 4,
  series: '2210',
  seriesTitle: 'Information Technology Specialist',
  agency: 'Department of Defense',
  organization: 'Defense Information Systems Agency',
  location: 'Fort Meade, MD',
  locality: 'Washington-Baltimore-Arlington',
  timeInGrade: '1 year 8 months',
  serviceComputationDate: 'March 15, 2019',
};

export function CareerSnapshotCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('career.snapshot');
  const title = 'Career Snapshot';

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <DashboardCardVisibilityToggle cardKey="career.snapshot" />
        </div>
        <p className="text-sm text-muted-foreground">
          Your current federal job profile and position details.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {visible ? (
          <>
            {/* Grade and Series */}
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm font-semibold px-3 py-1">
                <SensitiveValue
                  value={`${mockCareerData.grade} Step ${mockCareerData.step}`}
                  hide={isSensitiveHidden}
                  masked="GS-•• Step •"
                />
              </Badge>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm text-muted-foreground">
                <SensitiveValue
                  value={`${mockCareerData.series} – ${mockCareerData.seriesTitle}`}
                  hide={isSensitiveHidden}
                  masked="•••• – ••••••••••"
                />
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid gap-3">
              {/* Agency */}
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Agency / Organization</p>
                  <p className="text-sm font-medium">
                    <SensitiveValue
                      value={mockCareerData.agency}
                      hide={isSensitiveHidden}
                      masked="••••••••••••••"
                    />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <SensitiveValue
                      value={mockCareerData.organization}
                      hide={isSensitiveHidden}
                      masked="••••••••••••••"
                    />
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Location / Locality</p>
                  <p className="text-sm font-medium">
                    <SensitiveValue
                      value={mockCareerData.location}
                      hide={isSensitiveHidden}
                      masked="••••••••••"
                    />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <SensitiveValue
                      value={mockCareerData.locality}
                      hide={isSensitiveHidden}
                      masked="••••••••••••••"
                    />
                  </p>
                </div>
              </div>

              {/* Time in Grade */}
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Time in Grade</p>
                  <p className="text-sm font-medium">
                    <SensitiveValue
                      value={mockCareerData.timeInGrade}
                      hide={isSensitiveHidden}
                      masked="• year • months"
                    />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    SCD:{' '}
                    <SensitiveValue
                      value={mockCareerData.serviceComputationDate}
                      hide={isSensitiveHidden}
                      masked="••••••••••"
                    />
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="career.snapshot" />
        )}
      </CardContent>
    </Card>
  );
}
