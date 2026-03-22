'use client';

import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

export function DocumentsCard() {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('other.documents');
  const title = 'Documents';

  const docs = [
    { name: 'Recent Pay Stub (Nov 29)', status: 'Ingested', date: 'Today' },
    { name: 'FEHB Brochure 2024', status: 'Reviewed', date: 'Yesterday' },
    { name: 'W-2 2023', status: 'Archived', date: '3 days ago' },
  ];

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <DashboardCardVisibilityToggle cardKey="other.documents" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible ? (
          <>
            {docs.map((doc, i) => (
              <div key={i} className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    <SensitiveValue
                      value={doc.name}
                      masked="••••••••••••••"
                      hide={isSensitiveHidden}
                    />
                  </p>
                  <p className="text-xs text-muted-foreground">{doc.date}</p>
                </div>
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  {doc.status}
                </Badge>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-3">Forward documents by email to ingest</p>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="other.documents" />
        )}
      </CardContent>
    </Card>
  );
}
