'use client';

import { FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

// Mock resume completion data
const resumeData = {
  completionScore: 65,
  status: 'in-progress' as 'complete' | 'in-progress',
  sectionsCompleted: ['Contact & Core Info', 'Federal Experience', 'Education'],
  sectionsMissing: ['Certifications & Training', 'Awards & Recognition'],
};

export function ResumeOverviewCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('career.resumeOverview');
  const title = 'Resume Overview';

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <DashboardCardVisibilityToggle cardKey="career.resumeOverview" />
        </div>
        {visible && (
          <p className="text-sm text-muted-foreground">
            Complete each section below so PathAdvisor can help refine your resume for your target
            roles.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {visible ? (
          <>
            {/* Completion Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Completion</span>
                  <Badge
                    variant="outline"
                    className={
                      resumeData.status === 'complete'
                        ? 'bg-green-500/10 text-green-500 border-green-500/30'
                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                    }
                  >
                    <SensitiveValue 
                      value={resumeData.status === 'complete' ? 'Complete' : 'In Progress'} 
                      hide={isSensitiveHidden} 
                      masked="Hidden" 
                    />
                  </Badge>
                </div>
                <span className="text-2xl font-bold">
                  <SensitiveValue value={`${resumeData.completionScore}%`} hide={isSensitiveHidden} masked="••%" />
                </span>
              </div>
              <Progress value={isSensitiveHidden ? 0 : resumeData.completionScore} className="h-2" />
            </div>

            {/* Section Status */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Completed Sections */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sections Completed
                </p>
                {resumeData.sectionsCompleted.map((section, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <SensitiveValue value={section} hide={isSensitiveHidden} masked="Hidden section" />
                  </div>
                ))}
              </div>

              {/* Missing Sections */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sections Needed
                </p>
                {resumeData.sectionsMissing.map((section, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <SensitiveValue value={section} hide={isSensitiveHidden} masked="Hidden section" />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="career.resumeOverview" />
        )}
      </CardContent>
    </Card>
  );
}
