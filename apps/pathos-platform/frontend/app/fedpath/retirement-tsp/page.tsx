'use client';

import { Zap, Eye, EyeOff } from 'lucide-react';
import { MetricCard } from '@/components/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { usePrivacy } from '@/contexts/privacy-context';
import { SensitiveValue } from '@/components/sensitive-value';

export default function RetirementTSPPage() {
  const { globalHide } = usePrivacy();

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Retirement & TSP Planning</h1>
          <p className="text-muted-foreground">Projections and optimization strategies</p>
        </div>
        <Badge
          variant="outline"
          className={`flex items-center gap-1.5 ${
            globalHide
              ? 'border-accent/50 text-accent'
              : 'border-muted-foreground/30 text-muted-foreground'
          }`}
        >
          {globalHide ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          Privacy: {globalHide ? 'Active' : 'Off'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="TSP Balance"
          value={<SensitiveValue value="$487,200" />}
          description="Current investment value"
          trend="up"
          trendValue={<SensitiveValue value="+$18,400" />}
        />
        <MetricCard
          title="Time to MRA+10"
          value="12.5 years"
          description="Full retirement eligible"
        />
        <MetricCard
          title="Projected at 65"
          value={<SensitiveValue value="$1.2M" />}
          description="Estimated TSP value"
        />
        <MetricCard
          title="Annual Contribution"
          value={<SensitiveValue value="$17,370" />}
          description="10% of salary (Roth)"
        />
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">TSP Fund Allocation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { fund: 'C Fund (Stocks)', value: '$195,000', percent: 40 },
            { fund: 'S Fund (Small Cap)', value: '$97,000', percent: 20 },
            { fund: 'I Fund (International)', value: '$73,000', percent: 15 },
            { fund: 'F Fund (Bonds)', value: '$97,000', percent: 20 },
            { fund: 'G Fund (Stable Value)', value: '$25,200', percent: 5 },
          ].map((item, idx) => (
            <div key={idx} className="p-3 rounded-lg border border-border bg-background">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{item.fund}</span>
                <SensitiveValue value={item.value} className="text-sm font-bold" />
              </div>
              <div className="w-full bg-secondary/30 rounded-full h-2">
                <div className="bg-accent h-2 rounded-full" style={{ width: `${item.percent}%` }} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{item.percent}% of portfolio</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Retirement Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="at-65" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="at-60">Age 60</TabsTrigger>
              <TabsTrigger value="at-65">Age 65</TabsTrigger>
              <TabsTrigger value="mra-10">MRA+10</TabsTrigger>
            </TabsList>

            <TabsContent value="at-60" className="space-y-4 mt-4">
              <div className="p-4 rounded-lg border border-border bg-background">
                <p className="text-sm font-medium mb-2">Retirement at Age 60 (In 3 years)</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FERS Annuity:</span>
                    <span className="font-medium">$52,400/year</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TSP Balance:</span>
                    <span className="font-medium">$612,000 (est.)</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between">
                    <span className="font-medium">Total Year 1 Income:</span>
                    <span className="font-bold text-accent">$64,900</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Note: Reduced FERS annuity due to early retirement penalty
              </p>
            </TabsContent>

            <TabsContent value="at-65" className="space-y-4 mt-4">
              <div className="p-4 rounded-lg border border-border bg-background">
                <p className="text-sm font-medium mb-2">Retirement at Age 65 (In 8 years)</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FERS Annuity:</span>
                    <span className="font-medium">$78,200/year</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TSP Balance:</span>
                    <span className="font-medium">$942,000 (est.)</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between">
                    <span className="font-medium">Total Year 1 Income:</span>
                    <span className="font-bold text-green-500">$109,400</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Recommended for maximum benefits
              </p>
            </TabsContent>

            <TabsContent value="mra-10" className="space-y-4 mt-4">
              <div className="p-4 rounded-lg border border-border bg-background">
                <p className="text-sm font-medium mb-2">Retirement at MRA+10 (In 12.5 years)</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FERS Annuity:</span>
                    <span className="font-medium">$98,500/year</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TSP Balance:</span>
                    <span className="font-medium">$1,240,000 (est.)</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between">
                    <span className="font-medium">Total Year 1 Income:</span>
                    <span className="font-bold text-accent">$140,200</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Maximum FERS and TSP accumulation
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">TSP Contribution Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
            <div className="flex items-start gap-2 mb-2">
              <Zap className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Current Strategy: Aggressive</p>
                <p className="text-xs text-muted-foreground mt-1">
                  10% Roth TSP, 60% C Fund, 20% S Fund, 15% I Fund, 5% G Fund
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-foreground">Recommended Actions:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1">•</span>
                <span>Increase contribution to 15% to maximize tax advantages</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1">•</span>
                <span>Rebalance to 50% stocks, 30% international, 20% bonds at age 60</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1">•</span>
                <span>Begin TSP withdrawal planning 2 years before retirement</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
