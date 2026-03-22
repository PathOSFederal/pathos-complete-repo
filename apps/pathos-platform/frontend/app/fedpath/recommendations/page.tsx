'use client';

import { useState } from 'react';
import { usePrivacy } from '@/contexts/privacy-context';
import { RecommendationCard } from '@/components/recommendation-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { SensitiveValue } from '@/components/sensitive-value';

export default function FedPathRecommendationsPage() {
  const { globalHide } = usePrivacy();

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortBy, setSortBy] = useState('impact');

  const categories = ['Pay', 'FEHB', 'Retirement', 'Tax', 'Leave', 'Other'];
  const activeRecommendations = 12;
  const estimatedImpact = '$8,500';
  const completedActions = 5;

  const highPriorityRecommendations = [
    {
      id: '1',
      category: 'Retirement' as const,
      impact: 'High' as const,
      effort: 'Low' as const,
      title: 'Increase TSP contribution from 5% to 7%',
      description:
        'Based on your current pay grade and retirement timeline, increasing contributions will significantly boost your retirement readiness.',
      annualImpact: '+$3,200',
      additionalInfo: 'Gain 8 years in retirement savings',
      status: 'New' as const,
      primaryAction: 'Review details',
      secondaryActions: ['Compare scenarios'],
    },
    {
      id: '2',
      category: 'Tax' as const,
      impact: 'High' as const,
      effort: 'Medium' as const,
      title: 'Adjust W-4 withholding to reduce overpayment',
      description:
        'Current withholding is higher than needed. Adjustment will increase monthly take-home pay.',
      annualImpact: '+$1,800',
      additionalInfo: 'Align with tax liability',
      status: 'In review' as const,
      primaryAction: 'Open tax & withholding',
      secondaryActions: ['See calculation'],
    },
    {
      id: '3',
      category: 'FEHB' as const,
      impact: 'Medium' as const,
      effort: 'Low' as const,
      title: 'Switch FEHB plan during Open Season',
      description:
        'Your current plan has higher out-of-pocket costs. Self Plus One Blue Cross offers better coverage for your family.',
      annualImpact: '+$1,200',
      additionalInfo: 'Open Season ends Dec 31',
      status: 'New' as const,
      primaryAction: 'Compare in FEHB Optimizer',
      secondaryActions: ['View details'],
    },
    {
      id: '4',
      category: 'Leave' as const,
      impact: 'Medium' as const,
      effort: 'Low' as const,
      title: 'Use remaining annual leave before year-end',
      description:
        'You have 18 days of unused leave that will be forfeited. Plan usage before December 31.',
      annualImpact: 'Preserve $2,100',
      additionalInfo: '18 days at risk',
      status: 'New' as const,
      primaryAction: 'Review leave calendar',
      secondaryActions: ['Plan schedule'],
    },
  ];

  const additionalOpportunities = [
    {
      id: '5',
      category: 'Pay' as const,
      impact: 'Low' as const,
      effort: 'Medium' as const,
      title: 'Update your locality pay for next fiscal year',
      description: 'Verify your duty station and locality pay band are correct in the system.',
      annualImpact: '+$400',
      status: 'New' as const,
      primaryAction: 'Verify',
    },
    {
      id: '6',
      category: 'Other' as const,
      impact: 'Low' as const,
      effort: 'Low' as const,
      title: 'Enable two-factor authentication',
      description: 'Secure your PathOS account with an additional security layer.',
      annualImpact: 'Security improvement',
      status: 'New' as const,
      primaryAction: 'Enable',
    },
  ];

  const completedActionsList = [
    { title: 'Enrolled in TSP emergency savings program', date: 'Nov 15, 2024' },
    { title: 'Updated life insurance beneficiary', date: 'Nov 10, 2024' },
    { title: 'Completed FEHB plan comparison', date: 'Nov 5, 2024' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Card */}
      <Card className="border-slate-700/50 bg-gradient-to-r from-slate-800/60 to-slate-800/30">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Privacy Status Badge */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-50">FedPath recommendations</h1>
                <p className="text-slate-400 mt-2">
                  AI-prioritized actions to optimize your benefits and career path
                </p>
              </div>
              <Badge
                variant="outline"
                className={`${
                  globalHide
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-slate-700/50 text-slate-400 border-slate-600'
                } shrink-0`}
              >
                {globalHide ? (
                  <EyeOff className="w-3 h-3 mr-1.5" />
                ) : (
                  <Eye className="w-3 h-3 mr-1.5" />
                )}
                Privacy: {globalHide ? 'Active' : 'Off'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="bg-slate-700/40 border border-slate-600 rounded-lg px-4 py-2">
                <p className="text-xs text-slate-400">Active recommendations</p>
                <p className="text-2xl font-bold text-slate-100">{activeRecommendations}</p>
              </div>
              <div className="bg-slate-700/40 border border-slate-600 rounded-lg px-4 py-2">
                <p className="text-xs text-slate-400">Est. annual impact</p>
                <SensitiveValue
                  value={estimatedImpact}
                  className="text-2xl font-bold text-amber-500"
                />
              </div>
              <div className="bg-slate-700/40 border border-slate-600 rounded-lg px-4 py-2">
                <p className="text-xs text-slate-400">Completed actions</p>
                <p className="text-2xl font-bold text-green-400">{completedActions}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Bar */}
      <Card className="border-slate-700/50 bg-slate-800/40">
        <CardContent className="pt-4">
          <div className="space-y-4">
            {/* Segmented Control */}
            <div className="flex gap-2">
              {['All', 'High impact', 'Time sensitive'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter.toLowerCase().replace(' ', '-'))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFilter === filter.toLowerCase().replace(' ', '-')
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Category Chips and Controls Row */}
            <div className="flex flex-wrap items-center gap-3 pb-2 border-t border-slate-700/50 pt-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() =>
                      setSelectedCategories((prev) =>
                        prev.includes(category)
                          ? prev.filter((c) => c !== category)
                          : [...prev, category],
                      )
                    }
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedCategories.includes(category)
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-3">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32 h-8 text-xs border-slate-600 bg-slate-700/50">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="impact">Impact</SelectItem>
                    <SelectItem value="due-soon">Due soon</SelectItem>
                    <SelectItem value="effort">Effort</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                  </SelectContent>
                </Select>

                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    showCompleted
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-slate-700/50 text-slate-300'
                  }`}
                >
                  {showCompleted ? 'Hide' : 'Show'} completed
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500">Last updated: Today at 2:34 PM</p>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-8">
          {/* High Priority Actions */}
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-50">High priority actions</h2>
              <p className="text-sm text-slate-400">
                These have the largest impact or nearby deadlines
              </p>
            </div>
            <div className="space-y-4">
              {highPriorityRecommendations.map((rec) => (
                <RecommendationCard key={rec.id} {...rec} />
              ))}
            </div>
          </div>

          {/* Additional Opportunities */}
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-50">Additional opportunities</h2>
              <p className="text-sm text-slate-400">Lower urgency actions to consider</p>
            </div>
            <div className="space-y-3">
              {additionalOpportunities.map((rec) => (
                <RecommendationCard key={rec.id} {...rec} compact />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Estimated Impact Card */}
          <Card className="border-slate-700/50 bg-slate-800/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                Estimated impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4 border-b border-slate-700/50">
                <p className="text-xs text-slate-400">Total potential annual impact</p>
                <SensitiveValue
                  value="$8,500"
                  className="text-3xl font-bold text-amber-500 mt-2 block"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Pay & Benefits</span>
                    <SensitiveValue value="$4,000" className="text-amber-400 font-medium" />
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '47%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">FEHB</span>
                    <SensitiveValue value="$1,200" className="text-amber-400 font-medium" />
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '14%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Retirement</span>
                    <SensitiveValue value="$3,200" className="text-amber-400 font-medium" />
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full"
                      style={{ width: '38%' }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Tax</span>
                    <SensitiveValue value="$1,800" className="text-amber-400 font-medium" />
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                    <div
                      className="bg-orange-500 h-1.5 rounded-full"
                      style={{ width: '21%' }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What Triggered These Card */}
          <Card className="border-slate-700/50 bg-slate-800/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">What triggered these</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-slate-400">• New pay stubs received</p>
                <p className="text-slate-400">• FEHB Open Season started</p>
                <p className="text-slate-400">• Locality rate changes updated</p>
                <p className="text-slate-400">• Year-end leave deadline approaching</p>
              </div>
            </CardContent>
          </Card>

          {/* Completed Actions Card */}
          <Card className="border-slate-700/50 bg-slate-800/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Completed actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {completedActionsList.map((action, idx) => (
                <div
                  key={idx}
                  className="flex gap-2 text-sm pb-2 border-b border-slate-700/50 last:border-0 last:pb-0"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-200">{action.title}</p>
                    <p className="text-xs text-slate-500">{action.date}</p>
                  </div>
                </div>
              ))}
              <button className="text-xs text-amber-500 hover:text-amber-400 mt-2 font-medium">
                View all completed actions →
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
