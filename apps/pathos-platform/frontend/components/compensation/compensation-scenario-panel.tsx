'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SensitiveValue } from '@/components/sensitive-value';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';

// Mock GS pay tables (simplified for demonstration)
const GS_BASE_PAY: Record<string, Record<number, number>> = {
  'GS-9': {
    1: 54728,
    2: 56552,
    3: 58376,
    4: 60200,
    5: 62024,
    6: 63848,
    7: 65672,
    8: 67496,
    9: 69320,
    10: 71144,
  },
  'GS-10': {
    1: 60246,
    2: 62254,
    3: 64262,
    4: 66270,
    5: 68278,
    6: 70286,
    7: 72294,
    8: 74302,
    9: 76310,
    10: 78318,
  },
  'GS-11': {
    1: 66214,
    2: 68421,
    3: 70628,
    4: 72835,
    5: 75042,
    6: 77249,
    7: 79456,
    8: 81663,
    9: 83870,
    10: 86077,
  },
  'GS-12': {
    1: 79370,
    2: 82016,
    3: 84662,
    4: 87308,
    5: 89954,
    6: 92600,
    7: 95246,
    8: 97892,
    9: 100538,
    10: 103184,
  },
  'GS-13': {
    1: 94373,
    2: 97519,
    3: 100665,
    4: 103811,
    5: 106957,
    6: 110103,
    7: 113249,
    8: 116395,
    9: 119541,
    10: 122687,
  },
  'GS-14': {
    1: 111521,
    2: 115238,
    3: 118955,
    4: 122672,
    5: 126389,
    6: 130106,
    7: 133823,
    8: 137540,
    9: 141257,
    10: 144974,
  },
  'GS-15': {
    1: 131200,
    2: 135573,
    3: 139946,
    4: 144319,
    5: 148692,
    6: 153065,
    7: 157438,
    8: 161811,
    9: 166184,
    10: 170557,
  },
};

const LOCALITY_RATES: Record<string, { rate: number; label: string }> = {
  DC: { rate: 0.3294, label: 'Washington-Baltimore-Arlington' },
  SF: { rate: 0.4497, label: 'San Francisco-Oakland' },
  NY: { rate: 0.3664, label: 'New York-Newark' },
  LA: { rate: 0.3428, label: 'Los Angeles-Long Beach' },
  Orlando: { rate: 0.2052, label: 'Orlando-Kissimmee' },
  'San Diego': { rate: 0.3158, label: 'San Diego-Chula Vista' },
  Denver: { rate: 0.2826, label: 'Denver-Aurora' },
  RUS: { rate: 0.1728, label: 'Rest of US' },
};

interface CompensationScenarioPanelProps {
  currentGrade: string;
  currentStep: number;
  currentLocality: string;
  onScenarioChange?: (scenario: {
    grade: string;
    step: number;
    locality: string;
    basePay: number;
    localityPay: number;
    totalPay: number;
  }) => void;
}

export function CompensationScenarioPanel({
  currentGrade,
  currentStep,
  currentLocality,
  onScenarioChange,
}: CompensationScenarioPanelProps) {
  const { visible, isSensitiveHidden } = useDashboardCardVisibility('compensation.scenarioPanel');
  const title = 'Quick Scenario: Change Grade, Step, or Location';

  const [scenarioGrade, setScenarioGrade] = useState(currentGrade);
  const [scenarioStep, setScenarioStep] = useState(currentStep);
  const [scenarioLocality, setScenarioLocality] = useState(currentLocality);

  const calculatePay = (grade: string, step: number, locality: string) => {
    const basePay = GS_BASE_PAY[grade]?.[step] || 0;
    const localityRate = LOCALITY_RATES[locality]?.rate || 0.1728;
    const localityPay = Math.round(basePay * localityRate);
    return { basePay, localityPay, totalPay: basePay + localityPay };
  };

  const currentPay = calculatePay(currentGrade, currentStep, currentLocality);
  const scenarioPay = calculatePay(scenarioGrade, scenarioStep, scenarioLocality);

  const baseDiff = scenarioPay.basePay - currentPay.basePay;
  const localityDiff = scenarioPay.localityPay - currentPay.localityPay;
  const totalDiff = scenarioPay.totalPay - currentPay.totalPay;

  /**
   * REF PATTERN FOR CALLBACK PROP:
   * onScenarioChange may be unstable (recreated each render in parent).
   * Storing the latest reference in a ref allows the effect below to call
   * it without re-running when the reference changes.
   */
  const onScenarioChangeRef = useRef(onScenarioChange);
  useEffect(() => {
    onScenarioChangeRef.current = onScenarioChange;
  }, [onScenarioChange]);

  /**
   * NOTIFY PARENT OF SCENARIO CHANGES:
   * Fires whenever the user changes grade, step, or locality.
   * Dependencies include the derived pay values since we spread them.
   */
  useEffect(() => {
    const callback = onScenarioChangeRef.current;
    if (callback) {
      callback({
        grade: scenarioGrade,
        step: scenarioStep,
        locality: scenarioLocality,
        basePay: scenarioPay.basePay,
        localityPay: scenarioPay.localityPay,
        totalPay: scenarioPay.totalPay,
      });
    }
  }, [scenarioGrade, scenarioStep, scenarioLocality, scenarioPay.basePay, scenarioPay.localityPay, scenarioPay.totalPay]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDiff = (value: number) => {
    const prefix = value > 0 ? '+' : '';
    return prefix + formatCurrency(value);
  };

  const getDiffIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getDiffClass = (value: number) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <DashboardCardVisibilityToggle cardKey="compensation.scenarioPanel" />
        </div>
        {visible && (
          <p className="text-sm text-muted-foreground">
            Explore how changes to your position would affect your compensation
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {visible ? (
          <>
            {/* Scenario Controls */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Grade</label>
                <Select value={scenarioGrade} onValueChange={setScenarioGrade}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(GS_BASE_PAY).map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Step</label>
                <Select
                  value={scenarioStep.toString()}
                  onValueChange={(v) => setScenarioStep(Number.parseInt(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((step) => (
                      <SelectItem key={step} value={step.toString()}>
                        Step {step}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Locality</label>
                <Select value={scenarioLocality} onValueChange={setScenarioLocality}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LOCALITY_RATES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {key} - {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Comparison */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Current */}
              <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary">Current</Badge>
                  <span className="text-sm text-muted-foreground">
                    {currentGrade} Step {currentStep} – {currentLocality}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Pay</span>
                    <SensitiveValue
                      value={formatCurrency(currentPay.basePay)}
                      hide={isSensitiveHidden}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Locality Pay</span>
                    <SensitiveValue
                      value={formatCurrency(currentPay.localityPay)}
                      hide={isSensitiveHidden}
                    />
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                    <span>Total</span>
                    <SensitiveValue
                      value={formatCurrency(currentPay.totalPay)}
                      hide={isSensitiveHidden}
                    />
                  </div>
                </div>
              </div>

              {/* Scenario */}
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-accent text-accent-foreground">Scenario</Badge>
                  <span className="text-sm text-muted-foreground">
                    {scenarioGrade} Step {scenarioStep} – {scenarioLocality}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Pay</span>
                    <SensitiveValue
                      value={formatCurrency(scenarioPay.basePay)}
                      hide={isSensitiveHidden}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Locality Pay</span>
                    <SensitiveValue
                      value={formatCurrency(scenarioPay.localityPay)}
                      hide={isSensitiveHidden}
                    />
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                    <span>Total</span>
                    <span className="text-accent">
                      <SensitiveValue
                        value={formatCurrency(scenarioPay.totalPay)}
                        hide={isSensitiveHidden}
                      />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Summary */}
            <div className="p-4 rounded-lg bg-background border border-border">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-accent" />
                Impact Summary
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Base Pay Change</p>
                  <div
                    className={`flex items-center justify-center gap-1 font-semibold ${getDiffClass(baseDiff)}`}
                  >
                    {getDiffIcon(baseDiff)}
                    <SensitiveValue value={formatDiff(baseDiff)} hide={isSensitiveHidden} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Locality Change</p>
                  <div
                    className={`flex items-center justify-center gap-1 font-semibold ${getDiffClass(localityDiff)}`}
                  >
                    {getDiffIcon(localityDiff)}
                    <SensitiveValue value={formatDiff(localityDiff)} hide={isSensitiveHidden} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Impact</p>
                  <div
                    className={`flex items-center justify-center gap-1 font-bold text-lg ${getDiffClass(totalDiff)}`}
                  >
                    {getDiffIcon(totalDiff)}
                    <SensitiveValue value={formatDiff(totalDiff)} hide={isSensitiveHidden} />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <CardHiddenPlaceholder title={title} cardKey="compensation.scenarioPanel" />
        )}
      </CardContent>
    </Card>
  );
}
