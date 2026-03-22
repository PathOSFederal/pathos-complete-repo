'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  TrendingUp,
  MapPin,
  Shield,
  Receipt,
  LineChart,
  FileText,
  Download,
  Share2,
  Flag,
  DollarSign,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAdvisorContext } from '@/contexts/advisor-context';
import { usePrivacy } from '@/contexts/privacy-context';
import { SensitiveValue } from '@/components/sensitive-value';

interface Scenario {
  id: string;
  name: string;
  type: string;
  status: 'Draft' | 'Ready' | 'Archived';
  netMonthly: number;
  fiveYearImpact: number;
  tenYearImpact: number;
  lastUpdated: string;
  isBaseline?: boolean;
}

const scenarios: Scenario[] = [
  {
    id: 'baseline',
    name: 'Current baseline',
    type: 'Baseline',
    status: 'Ready',
    netMonthly: 0,
    fiveYearImpact: 0,
    tenYearImpact: 0,
    lastUpdated: 'Live',
    isBaseline: true,
  },
  {
    id: '1',
    name: 'GS-13 to GS-14 Promotion',
    type: 'Promotion',
    status: 'Ready',
    netMonthly: 847,
    fiveYearImpact: 58200,
    tenYearImpact: 98200,
    lastUpdated: '2 days ago',
  },
  {
    id: '2',
    name: 'Denver Locality Move',
    type: 'Locality change',
    status: 'Ready',
    netMonthly: 1240,
    fiveYearImpact: 82500,
    tenYearImpact: 144000,
    lastUpdated: '1 week ago',
  },
  {
    id: '3',
    name: 'FEHB Plan Switch to BCBS Basic',
    type: 'FEHB change',
    status: 'Draft',
    netMonthly: -180,
    fiveYearImpact: -10800,
    tenYearImpact: -144000,
    lastUpdated: '3 days ago',
  },
  {
    id: '4',
    name: 'Early Retirement at 57',
    type: 'Retirement',
    status: 'Ready',
    netMonthly: -2400,
    fiveYearImpact: -144000,
    tenYearImpact: -288000,
    lastUpdated: '2 weeks ago',
  },
];

export default function FedPathScenariosPage() {
  const [selectedTab, setSelectedTab] = useState<'my' | 'shared'>('my');
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [activeScenario, setActiveScenario] = useState('1');
  const [horizon, setHorizon] = useState('5yr');
  const [scenarioName, setScenarioName] = useState('GS-13 to GS-14 Promotion');

  const { globalHide } = usePrivacy();

  const { setContext } = useAdvisorContext();

  const toggleScenarioSelection = (id: string) => {
    if (id === 'baseline') return;
    setSelectedScenarios((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  };

  const activeScenarioData = scenarios.find((s) => s.id === activeScenario) || scenarios[1];

  useEffect(() => {
    const isComparison = selectedScenarios.length > 1;
    const comparedScenarios = selectedScenarios
      .map((id) => scenarios.find((s) => s.id === id)?.name)
      .filter(Boolean) as string[];

    setContext({
      source: 'scenario',
      scenarioId: activeScenarioData.id,
      scenarioName: activeScenarioData.name,
      scenarioType: activeScenarioData.type,
      baselineLabel: 'Current baseline',
      netMonthlyDelta: activeScenarioData.netMonthly,
      fiveYearDelta: activeScenarioData.fiveYearImpact,
      tenYearDelta: activeScenarioData.tenYearImpact,
      keyHighlights: [
        `Pay: ${activeScenarioData.netMonthly > 0 ? '+' : ''}$${Math.abs(activeScenarioData.netMonthly)} / month`,
        `5-year impact: ${activeScenarioData.fiveYearImpact > 0 ? '+' : ''}$${Math.abs(activeScenarioData.fiveYearImpact).toLocaleString()}`,
        `10-year impact: ${activeScenarioData.tenYearImpact > 0 ? '+' : ''}$${Math.abs(activeScenarioData.tenYearImpact).toLocaleString()}`,
        `Category: ${activeScenarioData.type}`,
      ],
      isComparison,
      comparedScenarios,
    });
  }, [activeScenario, selectedScenarios, activeScenarioData, setContext]);

  useEffect(() => {
    return () => {
      setContext({ source: 'recommendations' });
    };
  }, [setContext]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Card */}
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Scenarios</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Compare multiple decision paths and outcomes
              </p>
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
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="w-4 h-4 mr-2" />
              New scenario
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant={selectedTab === 'my' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTab('my')}
              className={selectedTab === 'my' ? 'bg-accent text-accent-foreground' : ''}
            >
              My scenarios
            </Button>
            <Button
              variant={selectedTab === 'shared' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTab('shared')}
              className={selectedTab === 'shared' ? 'bg-accent text-accent-foreground' : ''}
            >
              Shared with me
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout - Library Left, Detail Center */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Scenario Library - 1/4 width */}
        <div className="lg:col-span-1">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Scenario Library</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search scenarios..."
                  className="pl-9 h-9 text-sm bg-background border-border"
                />
              </div>

              {/* Filter chips */}
              <div className="flex flex-wrap gap-2">
                {['Promotion', 'Locality change', 'FEHB change', 'Retirement', 'Custom'].map(
                  (filter) => (
                    <Badge
                      key={filter}
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-accent/10"
                    >
                      {filter}
                    </Badge>
                  ),
                )}
              </div>

              {/* Scenario list */}
              <div className="space-y-2 max-h-[800px] overflow-y-auto">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    onClick={() => {
                      if (!scenario.isBaseline) {
                        setActiveScenario(scenario.id);
                        setScenarioName(scenario.name);
                      }
                    }}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer transition-all',
                      scenario.isBaseline
                        ? 'bg-accent/10 border-accent cursor-default'
                        : activeScenario === scenario.id
                          ? 'bg-secondary/20 border-secondary'
                          : 'bg-card border-border hover:border-secondary/50',
                    )}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {!scenario.isBaseline && (
                        <Checkbox
                          checked={selectedScenarios.includes(scenario.id)}
                          onCheckedChange={() => toggleScenarioSelection(scenario.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p
                            className={cn(
                              'text-sm font-medium truncate',
                              scenario.isBaseline && 'text-accent',
                            )}
                          >
                            {scenario.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {scenario.type}
                          </Badge>
                          <Badge
                            variant={scenario.status === 'Ready' ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {scenario.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {!scenario.isBaseline && (
                      <>
                        <div className="text-xs space-y-0.5 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Net monthly:</span>
                            <span
                              className={cn(
                                'font-medium',
                                scenario.netMonthly > 0 ? 'text-green-500' : 'text-red-500',
                              )}
                            >
                              {scenario.netMonthly > 0 ? '+' : ''}$
                              {Math.abs(scenario.netMonthly).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">5-year:</span>
                            <span
                              className={cn(
                                'font-medium',
                                scenario.fiveYearImpact > 0 ? 'text-green-500' : 'text-red-500',
                              )}
                            >
                              {scenario.fiveYearImpact > 0 ? '+' : ''}$
                              {Math.abs(scenario.fiveYearImpact).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">10-year:</span>
                            <span
                              className={cn(
                                'font-medium',
                                scenario.tenYearImpact > 0 ? 'text-green-500' : 'text-red-500',
                              )}
                            >
                              {scenario.tenYearImpact > 0 ? '+' : ''}$
                              {Math.abs(scenario.tenYearImpact).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Updated {scenario.lastUpdated}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center: Scenario Detail Canvas - 3/4 width */}
        <div className="lg:col-span-3 space-y-4">
          {/* Scenario Header */}
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Input
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="text-lg font-semibold bg-transparent border-0 p-0 h-auto focus-visible:ring-0 max-w-md"
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary">{activeScenarioData.type}</Badge>
                <div className="flex items-center gap-2">
                  {['1yr', '3yr', '5yr', '10yr'].map((h) => (
                    <Button
                      key={h}
                      variant={horizon === h ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setHorizon(h)}
                      className={cn(
                        'h-7 text-xs',
                        horizon === h && 'bg-accent text-accent-foreground',
                      )}
                    >
                      {h}
                    </Button>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">Comparing vs Current baseline</span>
              </div>
            </CardContent>
          </Card>

          {/* Outcome Snapshot */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">Outcome Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                  <p className="text-xs text-muted-foreground mb-1">Net Monthly</p>
                  <SensitiveValue value="$6,847" className="text-xl font-bold" />
                </div>
                <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">5-Year Gain</p>
                  <SensitiveValue value="$42,400" className="text-xl font-bold" />
                </div>
                <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">10-Year Gain</p>
                  <SensitiveValue value="$98,200" className="text-xl font-bold" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scenario Timeline */}
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Timeline Projection</CardTitle>
                <Tabs defaultValue="net" className="w-auto">
                  <TabsList className="h-8">
                    <TabsTrigger value="net" className="text-xs h-6">
                      Net income
                    </TabsTrigger>
                    <TabsTrigger value="cola" className="text-xs h-6">
                      CoLA adjusted
                    </TabsTrigger>
                    <TabsTrigger value="retirement" className="text-xs h-6">
                      Retirement
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-muted/20 rounded-lg flex items-center justify-center border border-border">
                <LineChart className="w-8 h-8 text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Dual line chart: Baseline vs Scenario
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Scenario Dimensions Grid */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">Dimensions Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  {
                    icon: DollarSign,
                    label: 'Pay',
                    metrics: ['Base: $89,425', 'Locality: 14.4%', 'Total: $102,281'],
                  },
                  {
                    icon: MapPin,
                    label: 'Housing',
                    metrics: ['BAH: N/A', 'Location: DC', 'Market: High'],
                  },
                  {
                    icon: Receipt,
                    label: 'Taxes',
                    metrics: ['Federal: 22%', 'FICA: 7.65%', 'State: 5.75%'],
                  },
                  {
                    icon: TrendingUp,
                    label: 'Retirement',
                    metrics: ['TSP: $487K', 'Match: 5%', 'Age: 42'],
                  },
                  {
                    icon: Shield,
                    label: 'Health',
                    metrics: ['FEHB: BCBS', 'Premium: $298', 'Deductible: $0'],
                  },
                  {
                    icon: FileText,
                    label: 'Other',
                    metrics: ['Life Ins: $50K', 'Leave: 6 hrs/pp', 'Transit: $0'],
                  },
                ].map((dim) => (
                  <div key={dim.label} className="p-4 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center gap-2 mb-3">
                      <dim.icon className="w-4 h-4 text-accent" />
                      <span className="font-medium text-sm">{dim.label}</span>
                    </div>
                    <div className="space-y-1">
                      {dim.metrics.map((metric, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground">
                          {metric}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Scenario Assumptions */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">Scenario Assumptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Position & Grade', value: 'GS-14 Step 1', editable: true },
                { label: 'Location & Locality', value: 'Washington DC (14.4%)', editable: true },
                { label: 'FEHB Plan', value: 'BCBS Standard', editable: true },
                { label: 'TSP Contributions', value: '5% Roth + 5% Match', editable: true },
                { label: 'Tax Profile', value: 'Single, Standard Deduction', editable: true },
              ].map((assumption) => (
                <div
                  key={assumption.label}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10"
                >
                  <div>
                    <p className="text-sm font-medium">{assumption.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{assumption.value}</p>
                  </div>
                  {assumption.editable && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      Edit
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Scenario Actions */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {[
                  'Review promotion eligibility requirements',
                  'Confirm position opening at target grade',
                  'Calculate relocation and moving costs',
                  'Review tax implications with CPA',
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Checkbox />
                    <span className="text-sm">{step}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Mark as decision
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedScenarios.length > 1 && (
        <Card className="border-border bg-card fixed bottom-0 left-64 right-80 mx-auto shadow-lg z-10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <span className="text-sm font-medium flex-shrink-0">
                  Comparing {selectedScenarios.length} scenarios:
                </span>
                <div className="flex gap-2 flex-wrap flex-1 min-w-0">
                  {selectedScenarios.map((id) => {
                    const scenario = scenarios.find((s) => s.id === id);
                    return (
                      scenario && (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="text-xs max-w-[200px] truncate"
                        >
                          {scenario.name}
                        </Badge>
                      )
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-sm">
                  <span className="text-muted-foreground">Highest benefit: </span>
                  <span className="font-medium truncate max-w-[150px] inline-block align-bottom">
                    {
                      scenarios
                        .filter((s) => selectedScenarios.includes(s.id))
                        .reduce((max, s) => (s.netMonthly > max.netMonthly ? s : max)).name
                    }
                  </span>
                </div>
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Open comparison view
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
