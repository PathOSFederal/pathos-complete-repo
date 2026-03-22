'use client';

import { AlertCircle, CheckCircle, FileText, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePrivacy } from '@/contexts/privacy-context';
import { SensitiveValue } from '@/components/sensitive-value';
import { useState } from 'react';

export default function TaxCompliancePage() {
  const { globalHide } = usePrivacy();

  // Local privacy overrides for each card
  const [overviewPrivacy, setOverviewPrivacy] = useState<'default' | 'show' | 'hide'>('default');
  const [progressPrivacy, setProgressPrivacy] = useState<'default' | 'show' | 'hide'>('default');
  const [withholdingPrivacy, setWithholdingPrivacy] = useState<'default' | 'show' | 'hide'>(
    'default',
  );
  const [datesPrivacy, setDatesPrivacy] = useState<'default' | 'show' | 'hide'>('default');

  const shouldHide = (localOverride: 'default' | 'show' | 'hide') => {
    if (localOverride === 'show') return false;
    if (localOverride === 'hide') return true;
    return globalHide;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">Tax Compliance & Withholding</h1>
          {/* Reactive privacy status badge */}
          <Badge
            variant="outline"
            className={`flex items-center gap-1.5 ${
              globalHide
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-green-500/10 text-green-400 border-green-500/30'
            }`}
          >
            {globalHide ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span className="text-xs font-medium">Privacy: {globalHide ? 'Active' : 'Off'}</span>
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Track tax filing progress, withholding adequacy, and compliance requirements
        </p>
      </div>

      {/* Tax Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Tax Year 2024</CardTitle>
            {/* Privacy dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  {shouldHide(overviewPrivacy) ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setOverviewPrivacy('default')}>
                  Use global setting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOverviewPrivacy('show')}>
                  <Eye className="mr-2 h-4 w-4" />
                  Always show
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOverviewPrivacy('hide')}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Always hide
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Filing Status</p>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">On Track</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Estimated Refund</p>
              <p className="text-2xl font-bold text-green-400">
                <SensitiveValue
                  value="$1,240"
                  type="currency"
                  forceHide={shouldHide(overviewPrivacy)}
                />
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Withholding Adequacy</CardTitle>
            {/* Privacy dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  {shouldHide(progressPrivacy) ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setProgressPrivacy('default')}>
                  Use global setting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setProgressPrivacy('show')}>
                  <Eye className="mr-2 h-4 w-4" />
                  Always show
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setProgressPrivacy('hide')}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Always hide
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Withholding Rate</p>
              <p className="text-2xl font-bold text-accent">92%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recommended: 95%</p>
              <Badge variant="outline" className="mt-1">
                Adjust W-4
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Compliance Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-sm text-foreground">All forms submitted</p>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-sm text-foreground">No outstanding notices</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax Return Filing Progress */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Tax Return Filing Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-foreground">Overall Completion</p>
              <span className="text-sm font-bold text-accent">65%</span>
            </div>
            <Progress value={65} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-border rounded-lg p-4 bg-secondary/5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Income Documentation</p>
                  <p className="text-xs text-muted-foreground mt-1">W-2s and 1099s</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Complete
                </Badge>
              </div>
            </div>

            <div className="border border-border rounded-lg p-4 bg-secondary/5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Deductions & Credits</p>
                  <p className="text-xs text-muted-foreground mt-1">Standard deduction applied</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Complete
                </Badge>
              </div>
            </div>

            <div className="border border-border rounded-lg p-4 bg-secondary/5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Tax Liability Calculation</p>
                  <p className="text-xs text-muted-foreground mt-1">Using live withholding data</p>
                </div>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  In Progress
                </Badge>
              </div>
            </div>

            <div className="border border-border rounded-lg p-4 bg-secondary/5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Return Filing</p>
                  <p className="text-xs text-muted-foreground mt-1">Ready after Apr 1, 2025</p>
                </div>
                <Badge variant="outline">Pending</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withholding Summary */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Withholding Summary</CardTitle>
          {/* Privacy dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {shouldHide(withholdingPrivacy) ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setWithholdingPrivacy('default')}>
                Use global setting
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setWithholdingPrivacy('show')}>
                <Eye className="mr-2 h-4 w-4" />
                Always show
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setWithholdingPrivacy('hide')}>
                <EyeOff className="mr-2 h-4 w-4" />
                Always hide
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Federal Withholding YTD</p>
              <p className="text-2xl font-bold text-foreground">
                <SensitiveValue
                  value="$12,847"
                  type="currency"
                  forceHide={shouldHide(withholdingPrivacy)}
                />
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Estimated Annual Liability</p>
              <p className="text-2xl font-bold text-foreground">
                <SensitiveValue
                  value="$13,600"
                  type="currency"
                  forceHide={shouldHide(withholdingPrivacy)}
                />
              </p>
            </div>
          </div>

          <div className="bg-secondary/10 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Withholding Shortfall Warning</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You may owe{' '}
                  <SensitiveValue
                    value="$753"
                    type="currency"
                    forceHide={shouldHide(withholdingPrivacy)}
                    inline
                  />{' '}
                  if withholding remains unchanged. Consider adjusting your W-4 form.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Notes */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Important Tax Dates & Notes</CardTitle>
          {/* Privacy dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {shouldHide(datesPrivacy) ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDatesPrivacy('default')}>
                Use global setting
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDatesPrivacy('show')}>
                <Eye className="mr-2 h-4 w-4" />
                Always show
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDatesPrivacy('hide')}>
                <EyeOff className="mr-2 h-4 w-4" />
                Always hide
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              date: 'Dec 31, 2024',
              event: 'Tax year ends',
              note: 'Year-end tax planning deadline',
            },
            {
              date: 'Jan 31, 2025',
              event: 'W-2 forms issued',
              note: 'Employers must send W-2s by this date',
            },
            {
              date: 'Apr 15, 2025',
              event: 'Tax return due',
              note: 'File federal return or request extension',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/5"
            >
              <FileText className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.event}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.date}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.note}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
