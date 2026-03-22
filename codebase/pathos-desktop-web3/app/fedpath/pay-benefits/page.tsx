'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { MetricCard } from '@/components/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdvisorContext } from '@/contexts/advisor-context';
import { usePrivacy } from '@/contexts/privacy-context';
import { SensitiveValue } from '@/components/sensitive-value';

export default function PayBenefitsPage() {
  const screenName = 'Pay & Benefits';
  /**
   * setScreenInfo is the correct API for updating the PathAdvisor's screen context.
   * We use this instead of setContext because screenName and screenPurpose are
   * managed separately in AdvisorContext (not part of AdvisorContextData).
   */
  const { setScreenInfo } = useAdvisorContext();
  const { globalHide } = usePrivacy();

  const [cardPrivacy, setCardPrivacy] = useState<Record<string, 'hide' | 'show' | 'default'>>({
    metrics: 'default',
    compensation: 'default',
    leave: 'default',
    paystubs: 'default',
  });

  useEffect(function updateScreenContextOnLoad() {
    /**
     * Update PathAdvisor context when page loads.
     * This tells the advisor what screen the user is viewing so it can
     * provide relevant, context-aware assistance.
     */
    setScreenInfo(
      screenName,
      'help the user understand, check, and optimize their pay, leave, and federal or military benefits'
    );
  }, [setScreenInfo, screenName]);

  const toggleCardPrivacy = (cardId: string, setting: 'hide' | 'show' | 'default') => {
    setCardPrivacy((prev) => ({ ...prev, [cardId]: setting }));
  };

  // Helper to determine if values should be hidden for a specific card
  const shouldHide = (cardId: keyof typeof cardPrivacy) => {
    if (cardPrivacy[cardId] === 'hide') return true;
    if (cardPrivacy[cardId] === 'show') return false;
    return globalHide;
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pay & Benefits</h1>
            <p className="text-muted-foreground">
              Current pay breakdown, leave balances, and discrepancy flags
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            {globalHide ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="text-xs">Privacy: {globalHide ? 'Active' : 'Off'}</span>
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Key Metrics</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                {cardPrivacy.metrics === 'hide' ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
                Card privacy
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toggleCardPrivacy('metrics', 'default')}>
                Use global setting
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleCardPrivacy('metrics', 'show')}>
                Always show values
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleCardPrivacy('metrics', 'hide')}>
                Always hide values
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Base Salary"
            value={<SensitiveValue value="$142,500" hide={shouldHide('metrics')} />}
            description="GS-15 Step 5"
          />
          <MetricCard
            title="Locality Pay"
            value={<SensitiveValue value="$31,200" hide={shouldHide('metrics')} />}
            description="Washington-Baltimore-Arlington"
          />
          <MetricCard
            title="Annual Leave"
            value={<SensitiveValue value="187 hours" hide={shouldHide('metrics')} />}
            description="Plus 96 hours sick"
            trend="down"
            trendValue="-12 hours"
          />
          <MetricCard
            title="Net Take Home"
            value={<SensitiveValue value="$8,540" hide={shouldHide('metrics')} />}
            description="Bi-weekly"
          />
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Annual Compensation Breakdown</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                  {cardPrivacy.compensation === 'hide' ? (
                    <EyeOff className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => toggleCardPrivacy('compensation', 'default')}>
                  Use global setting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleCardPrivacy('compensation', 'show')}>
                  Always show values
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleCardPrivacy('compensation', 'hide')}>
                  Always hide values
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-secondary/30">
              <span className="text-sm font-medium">Base Salary (GS-15 Step 5)</span>
              <span className="text-sm font-bold">
                <SensitiveValue value="$142,500" hide={shouldHide('compensation')} />
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-secondary/30">
              <span className="text-sm font-medium">Locality Pay (WBA)</span>
              <span className="text-sm font-bold">
                <SensitiveValue value="$31,200" hide={shouldHide('compensation')} />
              </span>
            </div>
            <div className="border-t border-border pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-foreground">Total Gross Annual</span>
                <span className="text-lg font-bold text-accent">
                  <SensitiveValue value="$173,700" hide={shouldHide('compensation')} />
                </span>
              </div>
            </div>

            {/* Deductions */}
            <div className="space-y-2 pt-4 border-t border-border">
              <p className="text-sm font-medium text-muted-foreground">
                Deductions & Contributions
              </p>
              <div className="flex items-center justify-between p-2 text-sm">
                <span className="text-muted-foreground">Federal Income Tax</span>
                <span className="font-medium">
                  <SensitiveValue value="-$31,240" hide={shouldHide('compensation')} />
                </span>
              </div>
              <div className="flex items-center justify-between p-2 text-sm">
                <span className="text-muted-foreground">FICA (Social Security)</span>
                <span className="font-medium">
                  <SensitiveValue value="-$10,759" hide={shouldHide('compensation')} />
                </span>
              </div>
              <div className="flex items-center justify-between p-2 text-sm">
                <span className="text-muted-foreground">Medicare</span>
                <span className="font-medium">
                  <SensitiveValue value="-$2,517" hide={shouldHide('compensation')} />
                </span>
              </div>
              <div className="flex items-center justify-between p-2 text-sm">
                <span className="text-muted-foreground">FEHB Premium (BCBS)</span>
                <span className="font-medium">
                  <SensitiveValue value="-$5,400" hide={shouldHide('compensation')} />
                </span>
              </div>
              <div className="flex items-center justify-between p-2 text-sm">
                <span className="text-muted-foreground">FSA Contribution</span>
                <span className="font-medium">
                  <SensitiveValue value="-$2,850" hide={shouldHide('compensation')} />
                </span>
              </div>
              <div className="flex items-center justify-between p-2 text-sm">
                <span className="text-muted-foreground">Roth TSP (10%)</span>
                <span className="font-medium">
                  <SensitiveValue value="-$17,370" hide={shouldHide('compensation')} />
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Annual Net (Take Home)</span>
                <span className="text-lg font-bold text-green-500">
                  <SensitiveValue value="$108,564" hide={shouldHide('compensation')} />
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Leave Balances</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                  {cardPrivacy.leave === 'hide' ? (
                    <EyeOff className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => toggleCardPrivacy('leave', 'default')}>
                  Use global setting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleCardPrivacy('leave', 'show')}>
                  Always show values
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleCardPrivacy('leave', 'hide')}>
                  Always hide values
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Annual Leave</span>
              <Badge>
                <SensitiveValue value="187 hours" hide={shouldHide('leave')} />
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">You accrue 8.33 hours per pay period</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Sick Leave</span>
              <Badge variant="secondary">
                <SensitiveValue value="96 hours" hide={shouldHide('leave')} />
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">No maximum limit</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card border-destructive/50">
        <CardHeader className="flex flex-row items-center gap-2">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <CardTitle className="text-lg text-destructive">Discrepancy Flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Leave Balance Discrepancy</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your leave balance differs from pay stub. Last updated 3 days ago.
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Contact HR to reconcile. PathAdvisor can help prepare documentation.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Pay Stubs</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                  {cardPrivacy.paystubs === 'hide' ? (
                    <EyeOff className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => toggleCardPrivacy('paystubs', 'default')}>
                  Use global setting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleCardPrivacy('paystubs', 'show')}>
                  Always show values
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleCardPrivacy('paystubs', 'hide')}>
                  Always hide values
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { date: 'Nov 22, 2024', gross: '$6,673', net: '$4,270' },
              { date: 'Nov 8, 2024', gross: '$6,673', net: '$4,270' },
              { date: 'Oct 25, 2024', gross: '$6,673', net: '$4,270' },
            ].map((stub, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/10 transition-colors border border-border"
              >
                <span className="text-sm font-medium">{stub.date}</span>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    Gross:{' '}
                    <SensitiveValue value={stub.gross} hide={shouldHide('paystubs')} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Net: <SensitiveValue value={stub.net} hide={shouldHide('paystubs')} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
