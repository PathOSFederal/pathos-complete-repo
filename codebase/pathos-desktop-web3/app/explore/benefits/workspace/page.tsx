'use client';

/**
 * ============================================================================
 * BENEFITS COMPARISON WORKSPACE (Day 42 - Benefits Comparison Workspace v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * This workspace allows users to create and compare benefit scenarios,
 * safely "play" with numbers and assumptions, and understand trade-offs
 * between federal and private employment. Users can ask PathAdvisor contextual
 * questions ("Why did this change?").
 *
 * ARCHITECTURE:
 * - Uses benefitsWorkspaceStore for local persistence of scenario A/B
 * - Uses benefits-estimator utilities for calculations
 * - Updates PathAdvisor context for benefits-specific prompts
 *
 * WORKSPACE LAYOUT:
 * - LEFT SIDE: Scenario Builder (inputs only)
 * - RIGHT SIDE: Comparison Canvas (outputs only)
 * - Follows Resume Builder workspace patterns for immersive feel
 *
 * @version Day 42 - Benefits Comparison Workspace v1
 * ============================================================================
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Shield,
  Heart,
  Clock,
  DollarSign,
  Building2,
  TrendingUp,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Info,
  RotateCcw,
  Calculator,
  Calendar,
  ArrowRight,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { useAdvisorContext } from '@/contexts/advisor-context';
import {
  useBenefitsWorkspaceStore,
} from '@/store/benefitsWorkspaceStore';
import type { CoverageType, TenureCategory } from '@/store/benefitsAssumptionsStore';
import {
  calculateAnnualValue,
  calculateLongTermValue,
  calculateBreakEvenSalary,
  getRankedBenefitCategories,
  formatDollarValue,
  getValueRange,
} from '@/lib/benefits';
import { Copy } from 'lucide-react';
import { PageShell } from '@/components/layout/page-shell';
import { AskPathAdvisorButton } from '@/components/pathadvisor/AskPathAdvisorButton';
// Day 43: Use askPathAdvisor() for all Ask CTAs to enforce Focus Mode opens immediately
import { askPathAdvisor } from '@/lib/pathadvisor/askPathAdvisor';

/**
 * Benefit category configuration for display.
 */
interface BenefitCardConfig {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  highlights: string[];
  isLongTerm: boolean;
}

/**
 * Static configuration for benefit category cards.
 * These provide the display text while values are calculated dynamically.
 */
const BENEFIT_CARDS: BenefitCardConfig[] = [
  {
    id: 'fehb',
    title: 'Health Insurance (FEHB)',
    icon: Shield,
    description: 'Access to 200+ health insurance plans with government contribution',
    highlights: [
      'Government pays approximately 72% of premiums',
      'Pre-tax premium payments reduce taxable income',
      'No medical underwriting (guaranteed acceptance)',
    ],
    isLongTerm: false,
  },
  {
    id: 'tsp',
    title: 'TSP Retirement Savings',
    icon: DollarSign,
    description: '401(k)-style retirement savings with government match',
    highlights: [
      '5% agency matching contribution (with your 5%)',
      '1% automatic contribution (even if you contribute $0)',
      'Industry-lowest expense ratios (0.055%)',
    ],
    isLongTerm: false,
  },
  {
    id: 'fers',
    title: 'FERS Pension',
    icon: TrendingUp,
    description: 'Guaranteed retirement income after 5 years of service',
    highlights: [
      'Pension = 1% × high-3 salary × years of service',
      'Fully vested after 5 years',
      'Inflation-adjusted with COLA increases',
    ],
    isLongTerm: true,
  },
  {
    id: 'leave',
    title: 'Paid Leave',
    icon: Clock,
    description: 'Generous paid time off that grows with tenure',
    highlights: [
      '13-26 days annual leave (based on service years)',
      '13 days sick leave per year (accrues indefinitely)',
      '11 paid federal holidays',
    ],
    isLongTerm: false,
  },
  {
    id: 'fegli',
    title: 'Life Insurance (FEGLI)',
    icon: Heart,
    description: 'Basic life insurance at no cost, plus optional coverage',
    highlights: [
      'Basic coverage equals annual salary (free)',
      'Optional additional coverage available',
      'Portable upon leaving federal service',
    ],
    isLongTerm: false,
  },
  {
    id: 'fsa',
    title: 'Flexible Spending Accounts',
    icon: Building2,
    description: 'Pre-tax savings for health and dependent care',
    highlights: [
      'Health Care FSA up to $3,050/year',
      'Dependent Care FSA up to $5,000/year',
      'Reduce taxable income by contribution amount',
    ],
    isLongTerm: false,
  },
];

/**
 * Timeline milestones for benefits.
 */
const TIMELINE_MILESTONES = [
  {
    period: 'Day 1',
    title: 'Immediate Benefits',
    description: 'Health insurance, TSP, life insurance, leave accrual begins',
  },
  {
    period: 'First 90 days',
    title: 'Probation Period',
    description: 'Benefits active, performance evaluated, FSA enrollment window',
  },
  {
    period: 'Year 1',
    title: 'Full Integration',
    description: 'Annual leave increases, TSP contributions compounding',
  },
  {
    period: 'Year 5',
    title: 'Vesting Milestone',
    description: 'FERS pension vests, retiree health benefits eligibility begins',
  },
];

export default function BenefitsWorkspacePage() {
  /**
   * PathAdvisor context for setting screen-specific prompts and context.
   * Day 42 Close-out: Get all context functions needed for openPathAdvisor helper.
   */
  const advisorContext = useAdvisorContext();
  const { setScreenInfo, setContext } = advisorContext;

  /**
   * Benefits workspace store (persisted to localStorage).
   * Manages Scenario A/B with independent state.
   */
  const activeScenarioId = useBenefitsWorkspaceStore(function (state) {
    return state.activeScenarioId;
  });
  const activeScenario = useBenefitsWorkspaceStore(function (state) {
    return state.scenarios[state.activeScenarioId];
  });
  const setActiveScenario = useBenefitsWorkspaceStore(function (state) {
    return state.setActiveScenario;
  });
  const updateScenario = useBenefitsWorkspaceStore(function (state) {
    return state.updateScenario;
  });
  const duplicateScenario = useBenefitsWorkspaceStore(function (state) {
    return state.duplicateScenario;
  });
  const resetScenario = useBenefitsWorkspaceStore(function (state) {
    return state.resetScenario;
  });

  /**
   * Extract values from active scenario for calculations.
   */
  const salary = activeScenario.salary;
  const coverage = activeScenario.coverage;
  const tenure = activeScenario.tenure;
  const mode = activeScenario.mode;
  const privateOffer = activeScenario.privateOffer;

  /**
   * Local state for UI (not persisted).
   */
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [showHowWeEstimate, setShowHowWeEstimate] = useState(false);

  /**
   * Update PathAdvisor context when page loads.
   * This puts the advisor in "Benefits Workspace Mode" with relevant prompts.
   * Day 42: Set context source to 'scenario' and Benefits context for proper advisor behavior.
   */
  useEffect(function updatePathAdvisorContext() {
    setScreenInfo(
      'Benefits Comparison Workspace',
      'help the user understand and compare federal benefits scenarios, explore trade-offs, and answer contextual questions about benefit calculations'
    );
    // Day 42: Set advisor context to Benefits mode (not Job Search)
    setContext({
      source: 'scenario',
      scenarioType: 'benefits',
    });
  }, [setScreenInfo, setContext]);

  /**
   * Calculate values based on active scenario.
   */
  const annualValue = calculateAnnualValue(salary, coverage, tenure);
  const longTermValue = calculateLongTermValue(salary, tenure);
  const breakEvenSalary = calculateBreakEvenSalary(salary, coverage, tenure);
  const rankedBenefits = getRankedBenefitCategories(salary, coverage, tenure, 3);

  /**
   * Calculate break-even range (low to high estimate).
   * Returns a range of ±10% around the calculated break-even to show uncertainty.
   *
   * @param baseBreakEven - Base break-even salary from calculation
   * @returns Object with min and max range values
   */
  function calculateBreakEvenRange(baseBreakEven: number): { min: number; max: number } {
    const rangePercent = 0.1; // ±10% range
    const min = Math.round(baseBreakEven * (1 - rangePercent));
    const max = Math.round(baseBreakEven * (1 + rangePercent));
    return { min, max };
  }

  /**
   * Get key drivers for break-even calculation.
   * Returns top 3 benefit categories that drive the break-even value.
   */
  function getBreakEvenKeyDrivers(): string[] {
    const drivers: string[] = [];
    if (annualValue.fehbEmployerContribution > 0) {
      drivers.push('Healthcare');
    }
    if (annualValue.tspMatch + annualValue.tspAutomatic > 0) {
      drivers.push('Match');
    }
    if (annualValue.leaveValue > 0) {
      drivers.push('Leave');
    }
    if (tenure !== 'short') {
      drivers.push('Tenure');
    }
    return drivers.slice(0, 3);
  }

  const breakEvenRange = calculateBreakEvenRange(breakEvenSalary);
  const keyDrivers = getBreakEvenKeyDrivers();

  /**
   * Toggle expanded state for a benefit card.
   */
  function toggleCardExpanded(cardId: string) {
    setExpandedCards(function (prev) {
      const newState: Record<string, boolean> = {};
      const keys = Object.keys(prev);
      for (let i = 0; i < keys.length; i++) {
        newState[keys[i]] = prev[keys[i]];
      }
      newState[cardId] = !prev[cardId];
      return newState;
    });
  }

  /**
   * Build context string for Benefits Workspace Ask PathAdvisor prompts.
   * 
   * Creates a consistent, structured context string that includes:
   * - Module: Benefits
   * - Page: Benefits Comparison Workspace
   * - Scenario: A or B (whichever is active)
   * - Comparison mode: federal-only vs federal vs private
   * - Key user inputs (salary, coverage, tenure, private salary, 401k match, private premium, PTO days)
   * - Which card triggered the request (e.g., "Annual Value (Today)" / "Break-even Private Salary")
   * 
   * @param cardName - Name of the card/section that triggered the request (e.g., "Annual Value (Today)")
   * @returns Formatted context string
   */
  function buildBenefitsAskContext(cardName: string): string {
    const modeText = mode === 'comparePrivate' ? 'Federal vs Private comparison' : 'Federal-only';
    const tenureText = tenure === 'short' ? '1-2' : tenure === 'medium' ? '3-5' : '5+';
    const coverageText = coverage === 'self' ? 'Self Only' : coverage === 'self-plus-one' ? 'Self+One' : 'Family';
    
    let context = `Module: Benefits | Page: Benefits Comparison Workspace | Scenario: ${activeScenarioId} (${modeText}) | `;
    context += `Federal: $${salary.toLocaleString()} salary, ${coverageText} coverage, ${tenureText} year tenure`;
    
    if (mode === 'comparePrivate') {
      context += ` | Private: $${privateOffer.salary.toLocaleString()} salary, ${privateOffer.matchPercent}% 401k match, `;
      context += `$${privateOffer.monthlyHealthPremium}/month health premium, ${privateOffer.ptoDays || 15} PTO days`;
    }
    
    context += ` | Card: ${cardName}`;
    
    return context;
  }

  /**
   * Handle suggested prompt click.
   * Day 43 Fix: Use askPathAdvisor() to enforce Focus Mode opens immediately.
   * 
   * Day 43 Contract:
   * 1. Set PathAdvisorAnchor (via askPathAdvisor)
   * 2. Inject structured context (via askPathAdvisor)
   * 3. Open Focus Mode immediately (via askPathAdvisor → setShouldOpenFocusMode)
   * 
   * @param prompt - The contextual prompt text to inject into PathAdvisor
   * @param intent - Optional intent identifier (for logging/tracking)
   * @param cardName - Optional name of the card that triggered this request (for context)
   */
  function handleSuggestedPrompt(prompt: string, intent?: string, cardName?: string) {
    // Build enhanced prompt with benefits context
    let enhancedPrompt = prompt;
    if (cardName) {
      const context = buildBenefitsAskContext(cardName);
      enhancedPrompt = `${context}\n\n${prompt}`;
    }
    
    // Build summary based on context
    const modeText = mode === 'comparePrivate' ? 'federal vs private comparison' : 'federal benefits';
    const summary = cardName 
      ? `Asking about ${cardName} in ${modeText}` 
      : `Exploring ${modeText}`;
    
    // Day 43: Call askPathAdvisor() to enforce anchor → context → Focus Mode contract
    askPathAdvisor({
      source: 'benefits',
      sourceId: activeScenarioId,
      sourceLabel: cardName || 'Benefits Workspace',
      summary: summary,
      contextPayload: {
        source: 'scenario',
        prompt: enhancedPrompt,
        scenarioId: activeScenarioId,
        scenarioType: 'benefits',
      },
      contextFunctions: {
        setContext: advisorContext.setContext,
        setPendingPrompt: advisorContext.setPendingPrompt,
        setShouldOpenFocusMode: advisorContext.setShouldOpenFocusMode,
      },
    });
    
    console.log('[Day 43] askPathAdvisor called for Benefits:', {
      intent: intent || 'benefits_workspace_question',
      cardName: cardName || 'N/A',
      scenarioId: activeScenarioId,
      promptPreview: enhancedPrompt.substring(0, 100),
    });
  }

  /**
   * Get the value for a specific benefit card based on calculations.
   */
  function getCardValue(cardId: string): number {
    switch (cardId) {
      case 'fehb':
        return annualValue.fehbEmployerContribution;
      case 'tsp':
        return annualValue.tspMatch + annualValue.tspAutomatic;
      case 'leave':
        return annualValue.leaveValue;
      case 'fegli':
        return annualValue.fegliBasicValue;
      case 'fsa':
        return annualValue.fsaTaxSavings;
      case 'fers':
        return longTermValue.fersPensionAnnual;
      default:
        return 0;
    }
  }

  /**
   * Generate scenario summary text based on current scenario state.
   * This provides orientation for the user about what the scenario implies.
   */
  function getScenarioSummary(): string[] {
    const summary: string[] = [];
    
    if (mode === 'comparePrivate') {
      const federalTotal = salary + annualValue.total;
      const privateTotal = privateOffer.salary;
      if (federalTotal > privateTotal) {
        summary.push('Federal benefits materially strengthen total compensation');
      } else {
        summary.push('Private offer may be competitive with federal package');
      }
      
      if (annualValue.fehbEmployerContribution > 0 || annualValue.leaveValue > 0) {
        summary.push('Healthcare and paid leave are the largest drivers');
      }
      
      summary.push(`Estimated private break-even: ${formatDollarValue(breakEvenRange.min)}–${formatDollarValue(breakEvenRange.max)}`);
    } else {
      summary.push('Federal benefits provide substantial value beyond base salary');
      if (tenure === 'long') {
        summary.push('Long-term benefits (pension, retiree health) become significant');
      }
      summary.push(`Total annual value: ${getValueRange(annualValue.total)}`);
    }
    
    return summary;
  }

  return (
    <PageShell>
      <div className="p-6">
        {/* ================================================================
            WORKSPACE HEADER (Full Width)
            ================================================================
            Title, subtitle, and Exit button at top of workspace.
            Day 42 Close-out: Added Exit button to navigate back to /explore/benefits */}
        <header className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <h1 className="text-2xl font-bold text-foreground">Benefits Comparison Workspace</h1>
              <p className="text-muted-foreground max-w-2xl">
                Test scenarios, explore trade-offs, and ask PathAdvisor for clarity.
              </p>
            </div>
            {/* Day 42 Close-out: Exit button to return to benefits overview */}
            <Link href="/explore/benefits">
              <Button variant="ghost" size="sm" className="gap-2 text-xs shrink-0">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Exit</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* ================================================================
            TWO-COLUMN WORKSPACE LAYOUT
            ================================================================
            LEFT: Scenario Builder (inputs only)
            RIGHT: Comparison Canvas (outputs only)
            Mobile: Stacked columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ============================================================
              LEFT COLUMN: SCENARIO BUILDER (INPUTS ONLY)
              ============================================================
              Sticky on desktop, scrollable on mobile.
              Contains ALL interactive controls. */}
          <div className="lg:col-span-5 space-y-6">
            {/* Scenario Selector */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Scenario Builder</CardTitle>
                <CardDescription>Configure your assumptions and compare scenarios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Active Scenario</Label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Tabs
                      value={activeScenarioId}
                      onValueChange={function (value) {
                        if (value === 'A' || value === 'B') {
                          setActiveScenario(value);
                        }
                      }}
                    >
                      <TabsList>
                        <TabsTrigger value="A">Scenario A</TabsTrigger>
                        <TabsTrigger value="B">Scenario B</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={function () {
                        duplicateScenario(activeScenarioId, activeScenarioId === 'A' ? 'B' : 'A');
                      }}
                    >
                      <Copy className="w-3 h-3" />
                      Duplicate {activeScenarioId} → {activeScenarioId === 'A' ? 'B' : 'A'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={function () {
                        resetScenario(activeScenarioId);
                      }}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </Button>
                  </div>
                </div>

                {/* Mode Toggle (First-Class) */}
                <div className="space-y-2 pt-4 border-t border-border">
                  <Label className="text-sm font-medium">Comparison Mode</Label>
                  <RadioGroup
                    value={mode}
                    onValueChange={function (value) {
                      if (value === 'federalOnly' || value === 'comparePrivate') {
                        updateScenario(activeScenarioId, { mode: value });
                      }
                    }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="federalOnly" id="mode-federal-only" />
                      <Label htmlFor="mode-federal-only" className="font-normal cursor-pointer">
                        Federal-only
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="comparePrivate" id="mode-compare" />
                      <Label htmlFor="mode-compare" className="font-normal cursor-pointer">
                        Federal vs Private
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Federal Assumptions */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <Label className="text-sm font-medium">Federal Assumptions</Label>
                  <div className="grid gap-4">
                    {/* Salary Input */}
                    <div className="space-y-2">
                      <Label htmlFor="salary" className="text-sm">Expected Salary</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="salary"
                          type="number"
                          value={salary}
                          onChange={function (e) {
                            updateScenario(activeScenarioId, { salary: Number(e.target.value) });
                          }}
                          className="pl-7"
                          min={0}
                          step={1000}
                        />
                      </div>
                    </div>

                    {/* Coverage Select */}
                    <div className="space-y-2">
                      <Label htmlFor="coverage" className="text-sm">Health Coverage</Label>
                      <Select
                        value={coverage}
                        onValueChange={function (value) {
                          updateScenario(activeScenarioId, { coverage: value as CoverageType });
                        }}
                      >
                        <SelectTrigger id="coverage">
                          <SelectValue placeholder="Select coverage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self">Self Only</SelectItem>
                          <SelectItem value="self-plus-one">Self + One</SelectItem>
                          <SelectItem value="family">Family</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tenure Select */}
                    <div className="space-y-2">
                      <Label htmlFor="tenure" className="text-sm">Expected Tenure</Label>
                      <Select
                        value={tenure}
                        onValueChange={function (value) {
                          updateScenario(activeScenarioId, { tenure: value as TenureCategory });
                        }}
                      >
                        <SelectTrigger id="tenure">
                          <SelectValue placeholder="Select tenure" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">1-2 years</SelectItem>
                          <SelectItem value="medium">3-5 years</SelectItem>
                          <SelectItem value="long">5+ years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Private Offer Inputs (Only shown when mode is comparePrivate) */}
                {mode === 'comparePrivate' && (
                  <div className="pt-4 border-t border-border space-y-4">
                    <Label className="text-sm font-medium">Private Offer Assumptions</Label>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="private-salary" className="text-sm">Private Salary</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="private-salary"
                            type="number"
                            value={privateOffer.salary}
                            onChange={function (e) {
                              updateScenario(activeScenarioId, {
                                privateOffer: {
                                  salary: Number(e.target.value),
                                  matchPercent: privateOffer.matchPercent,
                                  monthlyHealthPremium: privateOffer.monthlyHealthPremium,
                                  ptoDays: privateOffer.ptoDays,
                                },
                              });
                            }}
                            className="pl-7"
                            min={0}
                            step={1000}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="private-match" className="text-sm">401k Match %</Label>
                        <div className="relative">
                          <Input
                            id="private-match"
                            type="number"
                            value={privateOffer.matchPercent}
                            onChange={function (e) {
                              updateScenario(activeScenarioId, {
                                privateOffer: {
                                  salary: privateOffer.salary,
                                  matchPercent: Number(e.target.value),
                                  monthlyHealthPremium: privateOffer.monthlyHealthPremium,
                                  ptoDays: privateOffer.ptoDays,
                                },
                              });
                            }}
                            className="pr-7"
                            min={0}
                            max={10}
                            step={0.5}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="private-health" className="text-sm">Monthly Health Premium</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="private-health"
                            type="number"
                            value={privateOffer.monthlyHealthPremium}
                            onChange={function (e) {
                              updateScenario(activeScenarioId, {
                                privateOffer: {
                                  salary: privateOffer.salary,
                                  matchPercent: privateOffer.matchPercent,
                                  monthlyHealthPremium: Number(e.target.value),
                                  ptoDays: privateOffer.ptoDays,
                                },
                              });
                            }}
                            className="pl-7"
                            min={0}
                            step={50}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="private-pto" className="text-sm">PTO Days</Label>
                        <Input
                          id="private-pto"
                          type="number"
                          value={privateOffer.ptoDays || 15}
                          onChange={function (e) {
                            updateScenario(activeScenarioId, {
                              privateOffer: {
                                salary: privateOffer.salary,
                                matchPercent: privateOffer.matchPercent,
                                monthlyHealthPremium: privateOffer.monthlyHealthPremium,
                                ptoDays: Number(e.target.value),
                              },
                            });
                          }}
                          min={0}
                          max={30}
                          step={1}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ============================================================
              RIGHT COLUMN: COMPARISON CANVAS (OUTPUTS ONLY)
              ============================================================
              Scrollable results that update based on left-side inputs.
              Structure: Summary → Core Results → Side-by-Side → Drivers → Timeline */}
          <div className="lg:col-span-7 space-y-6">

            {/* ============================================================
                1) SCENARIO SUMMARY (REQUIRED)
                ============================================================
                A concise, human-readable summary for the active scenario.
                This is NOT a recommendation. This is orientation. */}
            <Card className="border-border bg-muted/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Scenario {activeScenarioId} Summary</CardTitle>
                  <AskPathAdvisorButton
                    onClick={function () {
                      const summaryPoints = getScenarioSummary();
                      const prompt =
                        `Explain my Scenario ${activeScenarioId} benefits summary in plain English. ` +
                        `My scenario: ${mode === 'comparePrivate' ? 'Federal vs Private comparison' : 'Federal-only'}, ` +
                        `salary $${salary.toLocaleString()}, ${coverage} coverage, ${tenure === 'short' ? '1-2' : tenure === 'medium' ? '3-5' : '5+'} year tenure. ` +
                        `Summary points: ${summaryPoints.join('; ')}. ` +
                        `What is driving these results and what should I watch for?`;
                      handleSuggestedPrompt(prompt, 'benefits_scenario_summary', 'Scenario Summary');
                    }}
                    fullWidth={false}
                    className="text-xs h-8 px-3"
                  >
                    Ask PathAdvisor
                  </AskPathAdvisorButton>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {getScenarioSummary().map(function (point, index) {
                    return (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground">•</span>
                        <span className="text-foreground">{point}</span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>

            {/* ============================================================
                2) CORE COMPARISON RESULTS
                ============================================================
                Annual Value, Long-term Value, Break-even (when applicable).
                Each includes an "Ask PathAdvisor" CTA with contextual prompts. */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">Core Comparison Results</h2>
                <Dialog open={showHowWeEstimate} onOpenChange={setShowHowWeEstimate}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      <Info className="w-3 h-3" />
                      How we estimate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>How We Estimate Benefits Value</DialogTitle>
                      <DialogDescription asChild>
                        <div className="space-y-3 pt-2 text-muted-foreground text-sm">
                          <p>
                            Our estimates are based on publicly available OPM data and
                            conservative assumptions:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li><strong>FEHB:</strong> Average employer contribution across popular plans</li>
                            <li><strong>TSP:</strong> 5% match is statutory (assuming you contribute 5%+)</li>
                            <li><strong>Leave:</strong> Days converted to dollars using your hourly rate</li>
                            <li><strong>FERS:</strong> 1% × years × salary (simplified formula)</li>
                            <li><strong>Growth:</strong> 5% real return for TSP projections</li>
                          </ul>
                          <p className="text-xs text-muted-foreground italic">
                            Actual values vary by plan selection, market conditions, and career path.
                            These estimates are for comparison purposes only.
                          </p>
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Annual Value Bucket */}
                <Card className="border-accent/50 bg-accent/5">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-accent/20 rounded-lg">
                          <DollarSign className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Annual Value (Today)</CardTitle>
                          <CardDescription>Immediate cash-equivalent benefits per year</CardDescription>
                        </div>
                      </div>
                      <AskPathAdvisorButton
                        onClick={function () {
                          const prompt =
                            `Explain Annual Value (Today): what's included and what assumptions matter most? ` +
                            `For Scenario ${activeScenarioId}: salary $${salary.toLocaleString()}, ${coverage} coverage, ${tenure === 'short' ? '1-2' : tenure === 'medium' ? '3-5' : '5+'} year tenure. ` +
                            `Annual Value shows $${getValueRange(annualValue.total)}. ` +
                            `Breakdown: FEHB employer contribution $${formatDollarValue(annualValue.fehbEmployerContribution)}, ` +
                            `TSP match + automatic $${formatDollarValue(annualValue.tspMatch + annualValue.tspAutomatic)}, ` +
                            `paid leave value $${formatDollarValue(annualValue.leaveValue)}. ` +
                            `What drives this total and which assumptions are most important?`;
                          handleSuggestedPrompt(prompt, 'benefits_annual_value_explanation', 'Annual Value (Today)');
                        }}
                        fullWidth={false}
                        className="text-xs h-8 px-3"
                      >
                        Ask PathAdvisor
                      </AskPathAdvisorButton>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-accent">{getValueRange(annualValue.total)}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Includes FEHB, TSP match, paid leave, FEGLI basic, and FSA tax savings.
                    </p>
                  </CardContent>
                </Card>

                {/* Long-term Value Bucket */}
                <Card className="border-blue-500/30 bg-blue-500/5">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Long-term Value (Retirement)</CardTitle>
                          <CardDescription>Future benefits based on your tenure</CardDescription>
                        </div>
                      </div>
                      <AskPathAdvisorButton
                        onClick={function () {
                          const prompt =
                            `Explain Long-term Value: what does this mean and what should I watch for? ` +
                            `For Scenario ${activeScenarioId}: salary $${salary.toLocaleString()}, ${tenure === 'short' ? '1-2' : tenure === 'medium' ? '3-5' : '5+'} year tenure. ` +
                            `Long-term Value shows FERS pension $${formatDollarValue(longTermValue.fersPensionAnnual)}/year at retirement ` +
                            `and projected TSP balance $${formatDollarValue(longTermValue.tspRetirementBalance)}. ` +
                            `What assumptions drive these projections and what factors could change them?`;
                          handleSuggestedPrompt(prompt, 'benefits_longterm_value_explanation', 'Long-term Value (Retirement)');
                        }}
                        fullWidth={false}
                        className="text-xs h-8 px-3"
                      >
                        Ask PathAdvisor
                      </AskPathAdvisorButton>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">
                      {formatDollarValue(longTermValue.fersPensionAnnual)}/year
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      FERS pension at retirement + projected TSP balance of {formatDollarValue(longTermValue.tspRetirementBalance)}.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Break-Even Private Salary (Only in compare mode) */}
              {mode === 'comparePrivate' && (
                <Card className="border-border bg-muted/20">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-500/20 rounded-lg">
                          <Calculator className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Break-Even Private Salary</CardTitle>
                          <CardDescription>
                            Private sector salary needed to match this federal package
                          </CardDescription>
                        </div>
                      </div>
                      <AskPathAdvisorButton
                        onClick={function () {
                          const prompt =
                            `Explain my Scenario ${activeScenarioId} break-even salary and what is driving it. ` +
                            `My scenario: Federal vs Private comparison, federal salary $${salary.toLocaleString()}, ${coverage} coverage, ${tenure === 'short' ? '1-2' : tenure === 'medium' ? '3-5' : '5+'} year tenure. ` +
                            `Break-even range: $${formatDollarValue(breakEvenRange.min)}–${formatDollarValue(breakEvenRange.max)}. ` +
                            `Key drivers: ${keyDrivers.join(', ')}. ` +
                            `What factors make this break-even what it is and what should I consider?`;
                          handleSuggestedPrompt(prompt, 'benefits_breakeven_explanation', 'Break-even Private Salary');
                        }}
                        fullWidth={false}
                        className="text-xs h-8 px-3"
                      >
                        Ask PathAdvisor
                      </AskPathAdvisorButton>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-3xl font-bold text-foreground">
                        {formatDollarValue(breakEvenRange.min)} – {formatDollarValue(breakEvenRange.max)} <span className="text-lg font-normal text-muted-foreground">(estimate)</span>
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Key drivers:</span>
                        {keyDrivers.map(function (driver) {
                          return (
                            <Badge key={driver} variant="secondary" className="text-xs">
                              {driver}
                            </Badge>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        Estimate, not a guarantee. Actual break-even depends on individual circumstances and market conditions.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ============================================================
                3) SIDE-BY-SIDE COMPARISON BLOCK
                ============================================================
                Present a clear, explicit comparison table.
                Only shown when in compare mode. */}
            {mode === 'comparePrivate' && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Side-by-Side Comparison</CardTitle>
                  <CardDescription>Federal benefits vs private offer in this scenario</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-medium text-foreground">Category</th>
                          <th className="text-left py-2 px-3 font-medium text-foreground">Federal</th>
                          <th className="text-left py-2 px-3 font-medium text-foreground">Private (this scenario)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="py-2 px-3 font-medium text-foreground">Healthcare</td>
                          <td className="py-2 px-3 text-muted-foreground">Stable, subsidized</td>
                          <td className="py-2 px-3 text-muted-foreground">Employer-dependent</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-2 px-3 font-medium text-foreground">Retirement</td>
                          <td className="py-2 px-3 text-muted-foreground">Pension + TSP match</td>
                          <td className="py-2 px-3 text-muted-foreground">Match only ({privateOffer.matchPercent}%)</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-2 px-3 font-medium text-foreground">Paid Leave</td>
                          <td className="py-2 px-3 text-muted-foreground">
                            {tenure === 'short' ? '26' : tenure === 'medium' ? '20' : '26'} days + sick leave
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">{privateOffer.ptoDays || 15} days</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-foreground">Risk Profile</td>
                          <td className="py-2 px-3 text-muted-foreground">Low</td>
                          <td className="py-2 px-3 text-muted-foreground">Medium</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ============================================================
                4) TOP DECISION DRIVERS
                ============================================================
                Show the top 3 drivers for THIS scenario.
                Make it obvious why these matter. */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Top Decision Drivers</h2>
              <div className="grid gap-3 md:grid-cols-3">
                {rankedBenefits.map(function (benefit, index) {
                  return (
                    <Card key={benefit.id} className="border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 text-accent font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{benefit.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{benefit.description}</p>
                            <p className="text-lg font-bold text-accent mt-2">
                              {formatDollarValue(benefit.annualValue)}
                              {benefit.isLongTerm ? '/year at retirement' : '/year'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* ============================================================
                5) BENEFITS TIMELINE (OPTIONAL / DE-EMPHASIZED)
                ============================================================
                Keep it below the core comparison so it does not compete for attention. */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Benefits Timeline</h2>
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    {TIMELINE_MILESTONES.map(function (milestone, index) {
                      return (
                        <div key={milestone.period} className="relative">
                          {index < TIMELINE_MILESTONES.length - 1 && (
                            <div className="hidden md:block absolute top-4 left-full w-full h-0.5 bg-border -z-10" />
                          )}
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 shrink-0">
                              <Calendar className="w-4 h-4 text-accent" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{milestone.period}</p>
                              <p className="text-sm font-medium text-accent">{milestone.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{milestone.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ============================================================
                BENEFIT DETAILS CARDS
                ============================================================
                Collapsible cards with key bullets and expandable details. */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Benefit Details</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {BENEFIT_CARDS.map(function (card) {
                  const CardIcon = card.icon;
                  const isExpanded = expandedCards[card.id] === true;
                  const cardValue = getCardValue(card.id);

                  return (
                    <Card key={card.id} className="border-border">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="p-2 bg-muted rounded-lg shrink-0">
                              <CardIcon className="w-5 h-5 text-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base">{card.title}</CardTitle>
                              <CardDescription className="mt-1">{card.description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 shrink-0">
                            <Badge variant={card.isLongTerm ? 'secondary' : 'default'} className="text-xs">
                              {card.isLongTerm ? 'Long-term' : formatDollarValue(cardValue) + '/yr'}
                            </Badge>
                            {/* Day 42 Close-out: Add Ask PathAdvisor button to each benefit detail card header */}
                            <AskPathAdvisorButton
                              onClick={function () {
                                // Generate benefit-specific prompt based on card type
                                let prompt = '';
                                if (card.id === 'fehb') {
                                  prompt =
                                    `Explain FEHB for my coverage tier (${coverage === 'self' ? 'Self' : coverage === 'self-plus-one' ? 'Self+One' : 'Family'}). ` +
                                    `What would my monthly premium likely be in a typical mid-cost plan, and what features should I care about (telehealth, therapy, deductibles, out-of-network)? ` +
                                    `In my Scenario ${activeScenarioId}: employer contribution is $${formatDollarValue(annualValue.fehbEmployerContribution)}/year.`;
                                } else if (card.id === 'tsp') {
                                  const tspTotal = annualValue.tspMatch + annualValue.tspAutomatic;
                                  prompt =
                                    `Explain TSP contributions, match rules, and what 5% means. ` +
                                    `In my Scenario ${activeScenarioId}: TSP provides $${formatDollarValue(tspTotal)}/year (5% match + 1% automatic). ` +
                                    `How does this compare to a typical 401(k) match?`;
                                } else if (card.id === 'fers') {
                                  prompt =
                                    `Explain FERS pension vesting, the high-3 concept, and what 1% means. ` +
                                    `In my Scenario ${activeScenarioId}: ${tenure === 'short' ? '1-2' : tenure === 'medium' ? '3-5' : '5+'} year tenure, ` +
                                    `projected FERS pension $${formatDollarValue(longTermValue.fersPensionAnnual)}/year at retirement. ` +
                                    `What does 'vested after 5 years' actually get me?`;
                                } else if (card.id === 'leave') {
                                  const federalDays = tenure === 'short' ? 37 : tenure === 'medium' ? 44 : 50;
                                  prompt =
                                    `Explain annual leave tiers and sick leave accrual. ` +
                                    `In my Scenario ${activeScenarioId}: ${tenure === 'short' ? '1-2' : tenure === 'medium' ? '3-5' : '5+'} year tenure, ` +
                                    `${federalDays} total days/year (${tenure === 'short' ? '13' : tenure === 'medium' ? '20' : '26'} annual + 13 sick + 11 holidays), ` +
                                    `valued at $${formatDollarValue(annualValue.leaveValue)}/year. ` +
                                    `What's the practical value vs typical private PTO?`;
                                } else if (card.id === 'fegli') {
                                  prompt =
                                    `Explain FEGLI basic vs optional and when it matters. ` +
                                    `In my Scenario ${activeScenarioId}: basic coverage is $${formatDollarValue(annualValue.fegliBasicValue)}/year (free). ` +
                                    `What should I know about FEGLI coverage?`;
                                } else if (card.id === 'fsa') {
                                  prompt =
                                    `Explain health FSA vs dependent care FSA and who benefits most. ` +
                                    `In my Scenario ${activeScenarioId}: FSA tax savings $${formatDollarValue(annualValue.fsaTaxSavings)}/year. ` +
                                    `What are the key differences and limits?`;
                                }
                                handleSuggestedPrompt(prompt, 'benefits_detail_' + card.id, card.title);
                              }}
                              fullWidth={false}
                              className="text-xs h-8 px-2"
                            >
                              Ask
                            </AskPathAdvisorButton>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Key bullets (always visible) */}
                        <div className="space-y-2">
                          {card.highlights.slice(0, 2).map(function (highlight) {
                            return (
                              <div key={highlight} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-foreground">{highlight}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Workspace-aware comparison content (only in compare mode) */}
                        {mode === 'comparePrivate' && card.id === 'fehb' && (
                          <div className="pt-2 border-t border-border space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Compared to typical private plans:</p>
                            <p className="text-xs text-muted-foreground">
                              FEHB offers guaranteed acceptance, no medical underwriting, and government-subsidized premiums
                              that typically exceed private sector employer contributions.
                            </p>
                            <AskPathAdvisorButton
                              onClick={function () {
                                const prompt =
                                  `Explain FEHB compared to a typical private employer plan. ` +
                                  `In my Scenario ${activeScenarioId}: ${coverage} coverage, ` +
                                  `FEHB employer contribution is $${formatDollarValue(annualValue.fehbEmployerContribution)}/year. ` +
                                  `What are the key differences in coverage, cost, and portability?`;
                                handleSuggestedPrompt(prompt, 'benefits_fehb_comparison', 'FEHB Comparison');
                              }}
                              fullWidth={false}
                              className="text-xs h-8 px-3 mt-2"
                            >
                              Ask PathAdvisor
                            </AskPathAdvisorButton>
                          </div>
                        )}

                        {mode === 'comparePrivate' && card.id === 'tsp' && (
                          <div className="pt-2 border-t border-border space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">TSP vs Private 401k:</p>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>
                                <strong>TSP:</strong> 5% match + 1% automatic = {formatDollarValue(annualValue.tspMatch + annualValue.tspAutomatic)}/year
                              </p>
                              <p>
                                <strong>Private 401k:</strong> {privateOffer.matchPercent}% match = {formatDollarValue(Math.round(privateOffer.salary * (privateOffer.matchPercent / 100)))}/year
                              </p>
                              <p className="text-accent font-medium">
                                Federal advantage: {formatDollarValue((annualValue.tspMatch + annualValue.tspAutomatic) - Math.round(privateOffer.salary * (privateOffer.matchPercent / 100)))}/year
                              </p>
                            </div>
                            <AskPathAdvisorButton
                              onClick={function () {
                                const tspTotal = annualValue.tspMatch + annualValue.tspAutomatic;
                                const privateMatch = Math.round(privateOffer.salary * (privateOffer.matchPercent / 100));
                                const prompt =
                                  `Explain TSP compared to a typical private 401k plan. ` +
                                  `In my Scenario ${activeScenarioId}: TSP provides $${formatDollarValue(tspTotal)}/year (5% match + 1% automatic), ` +
                                  `while the private offer provides $${formatDollarValue(privateMatch)}/year (${privateOffer.matchPercent}% match only). ` +
                                  `What are the key differences in matching, fees, and investment options?`;
                                handleSuggestedPrompt(prompt, 'benefits_tsp_comparison', 'TSP Comparison');
                              }}
                              fullWidth={false}
                              className="text-xs h-8 px-3 mt-2"
                            >
                              Ask PathAdvisor
                            </AskPathAdvisorButton>
                          </div>
                        )}

                        {mode === 'comparePrivate' && card.id === 'leave' && (
                          <div className="pt-2 border-t border-border space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Federal vs Private Leave:</p>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>
                                <strong>Federal:</strong> {tenure === 'short' ? '13' : tenure === 'medium' ? '20' : '26'} annual + 13 sick + 11 holidays = {tenure === 'short' ? '37' : tenure === 'medium' ? '44' : '50'} total days
                              </p>
                              <p>
                                <strong>Private:</strong> {privateOffer.ptoDays || 15} PTO days
                              </p>
                              <p className="text-accent font-medium">
                                Federal advantage: {tenure === 'short' ? 37 - (privateOffer.ptoDays || 15) : tenure === 'medium' ? 44 - (privateOffer.ptoDays || 15) : 50 - (privateOffer.ptoDays || 15)} more days/year
                              </p>
                            </div>
                            <AskPathAdvisorButton
                              onClick={function () {
                                const federalDays = tenure === 'short' ? 37 : tenure === 'medium' ? 44 : 50;
                                const prompt =
                                  `Explain federal paid leave compared to typical private PTO. ` +
                                  `In my Scenario ${activeScenarioId}: Federal provides ${federalDays} total days/year ` +
                                  `(${tenure === 'short' ? '13' : tenure === 'medium' ? '20' : '26'} annual + 13 sick + 11 holidays), ` +
                                  `valued at $${formatDollarValue(annualValue.leaveValue)}/year. ` +
                                  `Private offer provides ${privateOffer.ptoDays || 15} PTO days. ` +
                                  `What are the key differences in accrual, carryover, and usage?`;
                                handleSuggestedPrompt(prompt, 'benefits_leave_comparison', 'Paid Leave Comparison');
                              }}
                              fullWidth={false}
                              className="text-xs h-8 px-3 mt-2"
                            >
                              Ask PathAdvisor
                            </AskPathAdvisorButton>
                          </div>
                        )}

                        {/* Expandable details */}
                        <Collapsible open={isExpanded}>
                          <CollapsibleContent className="space-y-2 pt-2">
                            {card.highlights.slice(2).map(function (highlight) {
                              return (
                                <div key={highlight} className="flex items-start gap-2 text-sm">
                                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-foreground">{highlight}</span>
                                </div>
                              );
                            })}
                            {card.isLongTerm && (
                              <p className="text-sm text-muted-foreground pt-2 border-t border-border">
                                Estimated annual value at retirement: <strong>{formatDollarValue(cardValue)}</strong>
                              </p>
                            )}
                          </CollapsibleContent>
                          <div className="pt-2 border-t border-border flex items-center justify-between">
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-xs"
                                type="button"
                                onClick={function () {
                                  toggleCardExpanded(card.id);
                                }}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-3 h-3" />
                                    Show less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3" />
                                    Expand details
                                  </>
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </Collapsible>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* ============================================================
                PATH ADVISOR SUGGESTED PROMPTS
                ============================================================
                Context-aware prompts for the benefits page. */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Ask PathAdvisor</h2>
              <Card className="border-border bg-muted/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <p className="text-sm font-medium text-foreground">Suggested questions for your situation</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mode === 'comparePrivate' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs bg-transparent hover:bg-accent/10"
                        onClick={function () {
                          const prompt =
                            `Compare federal benefits to a $${privateOffer.salary.toLocaleString()} private offer. ` +
                            `Federal: salary $${salary.toLocaleString()}, ${coverage} coverage, ${tenure === 'short' ? '1-2' : tenure === 'medium' ? '3-5' : '5+'} year tenure. ` +
                            `Private: salary $${privateOffer.salary.toLocaleString()}, ${privateOffer.matchPercent}% 401k match, ` +
                            `$${privateOffer.monthlyHealthPremium}/month health premium, ${privateOffer.ptoDays || 15} PTO days. ` +
                            `What are the key trade-offs and which package is stronger?`;
                          handleSuggestedPrompt(prompt, 'benefits_private_comparison', 'Suggested: Compare to Private Offer');
                        }}
                      >
                        Compare to ${privateOffer.salary.toLocaleString()} private offer
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-transparent hover:bg-accent/10"
                      onClick={function () {
                        const tenureYears = tenure === 'short' ? '1-2' : tenure === 'medium' ? '3-5' : '5+';
                        const prompt =
                          `What benefits matter most if I only plan to stay ${tenureYears} years? ` +
                          `My scenario: salary $${salary.toLocaleString()}, ${coverage} coverage. ` +
                          `Which benefits provide immediate value vs long-term value, and what should I prioritize?`;
                        handleSuggestedPrompt(prompt, 'benefits_short_tenure_guidance', 'Suggested: Short Tenure Guidance');
                      }}
                    >
                      What matters for {tenure === 'short' ? '1-2' : tenure === 'medium' ? '3-5' : '5+'} year stay?
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-transparent hover:bg-accent/10"
                      onClick={function () {
                        const prompt =
                          `Explain FEHB like I am new to insurance. ` +
                          `In my Scenario ${activeScenarioId}: ${coverage} coverage, ` +
                          `employer contribution $${formatDollarValue(annualValue.fehbEmployerContribution)}/year. ` +
                          `What is FEHB, how does it work, and what should I know as a beginner?`;
                        handleSuggestedPrompt(prompt, 'benefits_fehb_basics', 'Suggested: FEHB Basics');
                      }}
                    >
                      Explain FEHB like I&apos;m new to insurance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ============================================================
                BOTTOM CTAs
                ============================================================
                Primary actions for the job seeker. */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Ready to Start Your Federal Career?</CardTitle>
                <CardDescription>
                  These benefits become available on your first day of federal employment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Link href="/dashboard/job-search">
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                      Browse Open Positions
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  {mode === 'federalOnly' && (
                    <Button
                      variant="outline"
                      className="bg-transparent gap-2"
                      onClick={function () {
                        updateScenario(activeScenarioId, { mode: 'comparePrivate' });
                      }}
                    >
                      <Calculator className="w-4 h-4" />
                      Compare to a Private Offer
                    </Button>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="bg-transparent">
                        See Benefits by Grade
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Benefits by Grade</DialogTitle>
                        <DialogDescription asChild>
                          <div className="pt-2 text-muted-foreground text-sm">
                            <p className="mb-3">
                              This feature is coming soon! When complete, you&apos;ll be able to see
                              how benefits values change across GS grades and pay scales.
                            </p>
                            <p className="text-sm text-muted-foreground">
                              For now, adjust the salary in the assumptions bar above to see
                              how your estimates change at different pay levels.
                            </p>
                          </div>
                        </DialogDescription>
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
