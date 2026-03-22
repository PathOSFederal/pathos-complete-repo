'use client';

/**
 * ============================================================================
 * EXPLORE FEDERAL BENEFITS - OVERVIEW PAGE (Day 42)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Lightweight overview page for exploring federal benefits. Provides a
 * high-level summary and routes users to the dedicated Benefits Comparison
 * Workspace for detailed scenario building and comparison.
 *
 * ARCHITECTURE:
 * - Overview page with key benefit highlights
 * - Primary CTA: "Open Benefits Workspace"
 * - Routes to /explore/benefits/workspace for immersive comparison
 *
 * @version Day 42 - Benefits Comparison Workspace v1
 * ============================================================================
 */

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Heart,
  Clock,
  DollarSign,
  Building2,
  TrendingUp,
  ArrowRight,
  Calculator,
} from 'lucide-react';
import { PageShell } from '@/components/layout/page-shell';
import { useAdvisorContext } from '@/contexts/advisor-context';
import { useEffect } from 'react';

/**
 * Benefit category configuration for overview display.
 */
interface BenefitOverviewCard {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  highlights: string[];
}

/**
 * Static configuration for benefit overview cards.
 */
const BENEFIT_OVERVIEW_CARDS: BenefitOverviewCard[] = [
  {
    id: 'fehb',
    title: 'Health Insurance (FEHB)',
    icon: Shield,
    description: 'Access to 200+ health insurance plans with government contribution',
    highlights: [
      'Government pays approximately 72% of premiums',
      'No medical underwriting (guaranteed acceptance)',
      'Pre-tax premium payments reduce taxable income',
    ],
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
  },
];

export default function ExploreBenefitsPage() {
  /**
   * PathAdvisor context for setting screen-specific prompts.
   */
  const { setScreenInfo } = useAdvisorContext();

  /**
   * Update PathAdvisor context when page loads.
   */
  useEffect(function updatePathAdvisorContext() {
    setScreenInfo(
      'Explore Federal Benefits',
      'help the user understand federal benefits and guide them to the Benefits Comparison Workspace for detailed scenario building'
    );
  }, [setScreenInfo]);

  return (
    <PageShell>
      <div className="p-6">
        {/* ================================================================
            HEADER (Full Width)
            ================================================================
            Title, subtitle, and primary CTA. */}
        <header className="mb-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Explore Federal Benefits</h1>
              <p className="text-muted-foreground max-w-2xl text-lg">
                Federal employment offers comprehensive benefits that strengthen your total compensation
                beyond base salary. Compare scenarios, explore trade-offs, and understand the value
                of federal benefits.
              </p>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <Link href="/explore/benefits/workspace">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                  <Calculator className="w-5 h-5" />
                  Open Benefits Workspace
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                Build and compare scenarios with clear cause → effect
              </p>
            </div>
          </div>
        </header>

        {/* ================================================================
            BENEFIT OVERVIEW CARDS
            ================================================================
            High-level summary of key federal benefits. */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Key Federal Benefits</h2>
            <p className="text-muted-foreground mb-6 max-w-3xl">
              Federal employment provides a comprehensive benefits package that includes health insurance,
              retirement savings, paid leave, and more. These benefits are available from your first day
              of employment and grow in value with tenure.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {BENEFIT_OVERVIEW_CARDS.map(function (card) {
              const CardIcon = card.icon;
              return (
                <Card key={card.id} className="border-border">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <CardIcon className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{card.title}</CardTitle>
                        <CardDescription className="mt-1">{card.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {card.highlights.map(function (highlight, index) {
                        return (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-muted-foreground">•</span>
                            <span className="text-foreground">{highlight}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ================================================================
            CTA SECTION
            ================================================================
            Encourage users to enter the workspace. */}
        <div className="mt-12">
          <Card className="border-accent/50 bg-accent/5">
            <CardHeader>
              <CardTitle className="text-xl">Ready to Compare Scenarios?</CardTitle>
              <CardDescription className="text-base">
                Use the Benefits Comparison Workspace to build scenarios, compare federal vs private
                offers, and understand the value of federal benefits with PathAdvisor guidance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/explore/benefits/workspace">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                  <Calculator className="w-5 h-5" />
                  Open Benefits Workspace
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
