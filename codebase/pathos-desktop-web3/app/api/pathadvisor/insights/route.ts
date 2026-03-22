/**
 * PathAdvisor Insights Stub API Route
 *
 * TEMPORARY: This is a stub route that returns mocked but structurally correct
 * PathAdvisorResponse data. It will be replaced/rewired to call the actual
 * FastAPI backend once that service is implemented.
 *
 * Purpose: Unblock frontend wiring and development.
 */

import { NextResponse } from 'next/server';
import type { PathAdvisorResponse } from '@/types/pathadvisor';

export async function POST(): Promise<NextResponse<PathAdvisorResponse>> {
  // In the future, this route will:
  // 1. Parse and validate the incoming PathAdvisorRequest
  // 2. Forward the request to the FastAPI backend
  // 3. Return the real calculated response
  //
  // For now, we return mocked data to enable frontend development.

  const mockResponse: PathAdvisorResponse = {
    salaryProjection: {
      estimatedIncrease: 4200,
      estimatedNewSalary: 92000,
      localityAdjustment: 2100,
      notes: 'Mocked estimate: promotion with small locality gain.',
    },
    retirementImpact: {
      tspDelta: 320,
      retirementReadinessScore: 72,
      yearsToEligibility: 18,
      annuityImpact: 1200,
      notes: 'Mocked estimate: slightly improved retirement readiness.',
    },
    qualificationMatch: 82,
    competitivenessScore: 64,
    relocationInsights: {
      costAdjustment: -14000,
      riskLevel: 'medium',
      pcsAllowance: 8500,
      housingDelta: -400,
      notes: 'Mocked estimate: higher housing costs, offset by salary.',
    },
    timestamp: new Date().toISOString(),
    error: null,
  };

  return NextResponse.json(mockResponse);
}














