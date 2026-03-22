'use client';

import { Upload, FileText, File, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function DocumentsPage() {
  const documents = [
    {
      name: 'Recent Pay Stub (Nov 29)',
      type: 'Pay Stub',
      status: 'Processed',
      uploaded: 'Today',
      size: '245 KB',
    },
    {
      name: 'FEHB Brochure 2024',
      type: 'Reference',
      status: 'Indexed',
      uploaded: 'Yesterday',
      size: '1.2 MB',
    },
    {
      name: 'W-2 2023',
      type: 'Tax Form',
      status: 'Archived',
      uploaded: '3 days ago',
      size: '89 KB',
    },
    {
      name: 'SF-50 Promotion Notice',
      type: 'HR Document',
      status: 'Processed',
      uploaded: '1 week ago',
      size: '156 KB',
    },
    {
      name: 'TSP Account Statement',
      type: 'Investment',
      status: 'Indexed',
      uploaded: '2 weeks ago',
      size: '512 KB',
    },
    {
      name: 'FERS Benefit Statement',
      type: 'Retirement',
      status: 'Archived',
      uploaded: '1 month ago',
      size: '334 KB',
    },
  ];

  const statuses = {
    Processed: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
    Indexed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CheckCircle },
    Archived: {
      color: 'bg-secondary/20 text-secondary-foreground border-secondary/30',
      icon: File,
    },
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Documents</h1>
        <p className="text-muted-foreground">
          Upload, organize, and manage your federal employment documents
        </p>
      </div>

      {/* Upload Card */}
      <Card className="border-accent/50 bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Upload & Ingest Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-accent/50 rounded-lg p-8 text-center hover:bg-accent/5 transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supported: PDF, DOC, XLS, and images
            </p>
          </div>
          <div className="bg-secondary/10 rounded-lg p-4">
            <p className="text-sm font-medium text-foreground mb-2">Email Ingestion</p>
            <p className="text-xs text-muted-foreground">
              Forward documents to{' '}
              <code className="bg-secondary/30 px-1 py-0.5 rounded text-accent">
                inbox@pathgpt.io
              </code>{' '}
              for automatic processing
            </p>
          </div>
          <Button className="w-full">Start Upload</Button>
        </CardContent>
      </Card>

      {/* Document Inbox */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Document Inbox</CardTitle>
            <Badge variant="secondary">{documents.length} documents</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {documents.map((doc, idx) => {
              const statusInfo = statuses[doc.status as keyof typeof statuses] || statuses.Indexed;

              return (
                <div
                  key={idx}
                  className="flex items-start justify-between p-3 rounded-lg border border-border bg-secondary/5 hover:bg-secondary/10 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{doc.type}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{doc.size}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{doc.uploaded}</p>
                    </div>
                  </div>
                  <Badge className={statusInfo.color}>{doc.status}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Document Organization */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pay & Compensation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-accent">12</p>
            <p className="text-xs text-muted-foreground mt-1">Pay stubs and compensation docs</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Benefits & Insurance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-accent">8</p>
            <p className="text-xs text-muted-foreground mt-1">FEHB and health documents</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Retirement & TSP</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-accent">6</p>
            <p className="text-xs text-muted-foreground mt-1">Retirement planning docs</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
