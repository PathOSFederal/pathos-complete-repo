'use client';

import Link from 'next/link';
import { ClipboardList, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

type SectionStatus = 'complete' | 'in-progress' | 'not-started';

interface ResumeSection {
  id: string;
  label: string;
  status: SectionStatus;
  stepParam: string;
}

// Mock section statuses - in real implementation, this would come from shared resume data
const resumeSections: ResumeSection[] = [
  { id: 'contact', label: 'Contact & Core Info', status: 'complete', stepParam: 'profile' },
  {
    id: 'experience',
    label: 'Federal Experience',
    status: 'in-progress',
    stepParam: 'work-experience',
  },
  { id: 'education', label: 'Education', status: 'complete', stepParam: 'education' },
  {
    id: 'certifications',
    label: 'Certifications & Training',
    status: 'not-started',
    stepParam: 'skills',
  },
  { id: 'awards', label: 'Awards & Recognition', status: 'not-started', stepParam: 'skills' },
];

// Mock resume strength - in real implementation, this would be calculated from shared data
const resumeStrength = {
  score: 45,
  label: 'Developing' as 'Needs work' | 'Developing' | 'Strong',
};

const statusStyles: Record<SectionStatus, { label: string; className: string }> = {
  complete: {
    label: 'Complete',
    className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
  },
  'in-progress': {
    label: 'In progress',
    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  },
  'not-started': {
    label: 'Not started',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

const strengthLabelStyles: Record<string, string> = {
  'Needs work': 'text-red-600 dark:text-red-400',
  Developing: 'text-yellow-600 dark:text-yellow-400',
  Strong: 'text-green-600 dark:text-green-400',
};

export function ResumeStrengthSectionsCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('career.resumeStrength');
  const title = 'Resume Strength & Sections';

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <DashboardCardVisibilityToggle cardKey="career.resumeStrength" />
        </div>
        {visible && (
          <p className="text-sm text-muted-foreground">
            Overview of your federal resume completeness. Click any section to edit in the Resume
            Builder.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {visible ? (
          <>
            {/* Overall Resume Strength */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Overall Resume Strength
                </span>
                <span className={`text-sm font-semibold ${strengthLabelStyles[resumeStrength.label]}`}>
                  <SensitiveValue value={resumeStrength.label} hide={isSensitiveHidden} masked="Hidden" />
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={isSensitiveHidden ? 0 : resumeStrength.score} className="flex-1 h-2" />
                <span className="text-sm font-medium text-foreground w-10 text-right">
                  <SensitiveValue value={`${resumeStrength.score}%`} hide={isSensitiveHidden} masked="••%" />
                </span>
              </div>
            </div>

            {/* Section Status List */}
            <div className="space-y-2">
              {resumeSections.map((section) => (
                <Link
                  key={section.id}
                  href={`/dashboard/resume-builder?step=${section.stepParam}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
                >
                  <span className="text-sm font-medium text-foreground">{section.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${statusStyles[section.status].className}`}
                    >
                      <SensitiveValue value={statusStyles[section.status].label} hide={isSensitiveHidden} masked="Hidden" />
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="career.resumeStrength" />
        )}
      </CardContent>
    </Card>
  );
}
