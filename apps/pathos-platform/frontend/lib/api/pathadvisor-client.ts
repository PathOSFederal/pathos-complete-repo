/**
 * PathAdvisor API Client
 *
 * Thin wrapper for communicating with the PathAdvisor insights endpoint.
 * All business logic and calculations are performed by the backend.
 */

import type {
  PathAdvisorRequest,
  PathAdvisorResponse,
} from '@/types/pathadvisor';

/**
 * PathAdvisor API error class for typed error handling.
 */
export class PathAdvisorError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.name = 'PathAdvisorError';
    this.status = status;
  }
}

/**
 * Fetches PathAdvisor insights from the backend.
 *
 * @param payload - The request payload containing profile and optional scenario
 * @returns Promise resolving to PathAdvisorResponse
 * @throws PathAdvisorError if the request fails
 */
export async function fetchAdvisorInsights(
  payload: PathAdvisorRequest
): Promise<PathAdvisorResponse> {
  const res = await fetch('/api/pathadvisor/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorMessage = 'Failed to fetch PathAdvisor insights';
    
    try {
      const errorData = await res.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Use default error message if response isn't JSON
    }
    
    throw new PathAdvisorError(errorMessage, res.status);
  }

  const data = (await res.json()) as PathAdvisorResponse;
  return data;
}

/**
 * Builds a PathAdvisorRequest from common app state patterns.
 * This helper makes it easier to construct requests from profile stores.
 *
 * @param profile - Profile data from store
 * @param scenario - Optional scenario data
 * @returns Properly formatted PathAdvisorRequest
 */
export function buildAdvisorRequest(
  profile: {
    persona?: 'job_seeker' | 'federal_employee' | string;
    current?: {
      grade?: string;
      agency?: string;
      series?: string;
      dutyLocation?: string;
    } | null;
    location?: {
      currentMetroArea?: string;
    };
    goals?: {
      targetGradeFrom?: string | null;
      targetGradeTo?: string | null;
    };
  },
  scenario?: {
    targetGradeBand?: string | null;
    targetLocation?: string | null;
    targetAgency?: string | null;
    jobId?: string | null;
    jobSeries?: string | null;
    jobTitle?: string | null;
    scenarioType?: 'promotion' | 'lateral' | 'entry' | 'relocation' | null;
  }
): PathAdvisorRequest {
  // Map persona to PathAdvisor format
  let mappedPersona: 'jobSeeker' | 'employee' | 'retiree' = 'jobSeeker';
  if (profile.persona === 'federal_employee') {
    mappedPersona = 'employee';
  }

  const request: PathAdvisorRequest = {
    profile: {
      persona: mappedPersona,
      currentGradeBand: profile.current?.grade || null,
      location: profile.current?.dutyLocation || profile.location?.currentMetroArea || null,
      agency: profile.current?.agency || null,
      series: profile.current?.series || null,
      targetGradeFrom: profile.goals?.targetGradeFrom || null,
      targetGradeTo: profile.goals?.targetGradeTo || null,
    },
  };

  if (scenario) {
    request.scenario = scenario;
  }

  return request;
}














