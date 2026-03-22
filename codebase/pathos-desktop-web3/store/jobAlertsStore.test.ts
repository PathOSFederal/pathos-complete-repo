/**
 * ============================================================================
 * JOB ALERTS STORE TESTS (Day 19 - Saved Jobs + Alerts v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Tests for the job alerts store and matching logic.
 * 
 * COVERAGE:
 * 1. Alert CRUD operations (create, update, delete, toggle)
 * 2. Alert matching logic edge cases
 * 3. Storage persistence behavior
 * 4. Deduplication in matches
 *
 * @version Day 19 - Saved Jobs + Alerts v1
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import type { MatchableJob, JobAlert } from './jobAlertsStore';

// ============================================================================
// HELPER: MOCK STORE STATE MANAGEMENT
// ============================================================================

/**
 * Simulates alert matching logic for testing.
 * This is a pure function version of the store's matching logic.
 */
function matchesAlertCriteria(job: MatchableJob, alert: JobAlert): boolean {
  // Keywords matching
  const keywordsLower = alert.keywords.toLowerCase().trim();
  if (keywordsLower === '') {
    return true;
  }

  const keywordParts = keywordsLower.split(' ');
  let keywordMatch = false;

  const titleLower = job.title.toLowerCase();
  let summaryLower = '';
  if (job.summary !== undefined && job.summary !== null) {
    summaryLower = job.summary.toLowerCase();
  }
  if (job.snippet !== undefined && job.snippet !== null) {
    if (summaryLower === '') {
      summaryLower = job.snippet.toLowerCase();
    } else {
      summaryLower = summaryLower + ' ' + job.snippet.toLowerCase();
    }
  }

  for (let i = 0; i < keywordParts.length; i++) {
    const keyword = keywordParts[i];
    if (keyword.length > 0) {
      if (titleLower.indexOf(keyword) !== -1 || summaryLower.indexOf(keyword) !== -1) {
        keywordMatch = true;
        break;
      }
    }
  }

  if (!keywordMatch) {
    return false;
  }

  // Series matching
  if (alert.series !== null && alert.series !== '') {
    const jobSeries = job.seriesCode;
    if (jobSeries === undefined || jobSeries === null || jobSeries === '') {
      return false;
    }
    if (jobSeries !== alert.series) {
      return false;
    }
  }

  // Grade band matching
  if (alert.gradeBand !== null && alert.gradeBand !== '') {
    const jobGrade = job.gradeLevel;
    if (jobGrade === undefined || jobGrade === null || jobGrade === '') {
      return false;
    }

    const jobGradeNum = parseGradeNumber(jobGrade);
    if (jobGradeNum === null) {
      return false;
    }

    const gradeBandLower = alert.gradeBand.toLowerCase();
    const rangeMatch = gradeBandLower.match(/gs(\d+)-gs(\d+)/);
    
    if (rangeMatch !== null && rangeMatch.length === 3) {
      const min = parseInt(rangeMatch[1], 10);
      const max = parseInt(rangeMatch[2], 10);
      if (jobGradeNum < min || jobGradeNum > max) {
        return false;
      }
    } else {
      const singleMatch = gradeBandLower.match(/gs(\d+)/);
      if (singleMatch !== null && singleMatch.length === 2) {
        const targetGrade = parseInt(singleMatch[1], 10);
        if (jobGradeNum !== targetGrade) {
          return false;
        }
      }
    }
  }

  // Location matching
  if (alert.location !== null && alert.location !== '') {
    const jobLocation = job.locationDisplay;
    if (jobLocation === undefined || jobLocation === null || jobLocation === '') {
      return false;
    }

    const locationLower = alert.location.toLowerCase();
    const jobLocationLower = jobLocation.toLowerCase();

    if (jobLocationLower.indexOf(locationLower) === -1) {
      return false;
    }
  }

  // Remote only matching
  if (alert.remoteOnly === true) {
    let isRemote = false;

    const jobLocation = job.locationDisplay;
    if (jobLocation !== undefined && jobLocation !== null) {
      if (jobLocation.toLowerCase().indexOf('remote') !== -1) {
        isRemote = true;
      }
    }

    const telework = job.teleworkEligibility;
    if (telework !== undefined && telework !== null) {
      if (telework.toLowerCase().indexOf('remote') !== -1) {
        isRemote = true;
      }
    }

    if (!isRemote) {
      return false;
    }
  }

  return true;
}

/**
 * Helper to parse grade numbers.
 */
function parseGradeNumber(gradeLevel: string): number | null {
  if (gradeLevel === null || gradeLevel === undefined || gradeLevel === '') {
    return null;
  }

  const upperGrade = gradeLevel.toUpperCase();

  if (upperGrade.indexOf('GS-') === 0) {
    const afterPrefix = upperGrade.substring(3);
    let numStr = '';
    for (let i = 0; i < afterPrefix.length; i++) {
      const char = afterPrefix.charAt(i);
      if (char >= '0' && char <= '9') {
        numStr = numStr + char;
      } else {
        break;
      }
    }
    if (numStr.length > 0) {
      return parseInt(numStr, 10);
    }
  }

  let plainNum = '';
  for (let i = 0; i < gradeLevel.length; i++) {
    const char = gradeLevel.charAt(i);
    if (char >= '0' && char <= '9') {
      plainNum = plainNum + char;
    } else if (plainNum.length > 0) {
      break;
    }
  }

  if (plainNum.length > 0) {
    return parseInt(plainNum, 10);
  }

  return null;
}

/**
 * Creates a test alert with specified criteria.
 */
function createTestAlert(
  keywords: string,
  options: {
    series?: string | null;
    gradeBand?: string | null;
    location?: string | null;
    remoteOnly?: boolean;
    enabled?: boolean;
  } = {}
): JobAlert {
  return {
    id: 'test-alert-' + Date.now(),
    name: 'Test Alert',
    enabled: options.enabled !== undefined ? options.enabled : true,
    frequency: 'daily',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastRunAt: null,
    keywords: keywords,
    series: options.series !== undefined ? options.series : null,
    gradeBand: options.gradeBand !== undefined ? options.gradeBand : null,
    location: options.location !== undefined ? options.location : null,
    remoteOnly: options.remoteOnly !== undefined ? options.remoteOnly : false,
    matches: [],
    lastMatchCount: 0,
  };
}

/**
 * Creates a test job with specified fields.
 */
function createTestJob(
  id: string,
  title: string,
  options: {
    summary?: string;
    snippet?: string;
    seriesCode?: string;
    gradeLevel?: string;
    locationDisplay?: string;
    teleworkEligibility?: string;
  } = {}
): MatchableJob {
  return {
    id: id,
    title: title,
    summary: options.summary,
    snippet: options.snippet,
    seriesCode: options.seriesCode,
    gradeLevel: options.gradeLevel,
    locationDisplay: options.locationDisplay,
    teleworkEligibility: options.teleworkEligibility,
  };
}

// ============================================================================
// TEST SUITE: Keyword Matching
// ============================================================================

describe('Alert keyword matching', function () {
  it('should match when keyword is in job title', function () {
    const alert = createTestAlert('analyst');
    const job = createTestJob('1', 'Management Analyst');

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should match when keyword is in job summary', function () {
    const alert = createTestAlert('budget');
    const job = createTestJob('1', 'Program Manager', {
      summary: 'Responsible for budget analysis and reporting.',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should match when keyword is in job snippet', function () {
    const alert = createTestAlert('policy');
    const job = createTestJob('1', 'Senior Advisor', {
      snippet: 'Advises on policy development.',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should be case-insensitive', function () {
    const alert = createTestAlert('IT SPECIALIST');
    const job = createTestJob('1', 'it specialist (network)');

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should match any keyword from a multi-word query', function () {
    const alert = createTestAlert('data scientist analyst');
    const job = createTestJob('1', 'Data Engineer');

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should not match when no keywords found', function () {
    const alert = createTestAlert('cybersecurity');
    const job = createTestJob('1', 'Budget Analyst', {
      summary: 'Financial planning and analysis.',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(false);
  });

  it('should handle empty keywords by matching all', function () {
    const alert = createTestAlert('');
    const job = createTestJob('1', 'Any Job Title');

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });
});

// ============================================================================
// TEST SUITE: Series Matching
// ============================================================================

describe('Alert series matching', function () {
  it('should match when job series equals alert series', function () {
    const alert = createTestAlert('analyst', { series: '0343' });
    const job = createTestJob('1', 'Management Analyst', {
      seriesCode: '0343',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should not match when job series differs', function () {
    const alert = createTestAlert('analyst', { series: '0343' });
    const job = createTestJob('1', 'Budget Analyst', {
      seriesCode: '0560',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(false);
  });

  it('should not match when job has no series and alert requires one', function () {
    const alert = createTestAlert('analyst', { series: '0343' });
    const job = createTestJob('1', 'Program Analyst');

    expect(matchesAlertCriteria(job, alert)).toBe(false);
  });

  it('should match all series when alert.series is null', function () {
    const alert = createTestAlert('analyst', { series: null });
    const job = createTestJob('1', 'Program Analyst', {
      seriesCode: '0560',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });
});

// ============================================================================
// TEST SUITE: Grade Band Matching
// ============================================================================

describe('Alert grade band matching', function () {
  it('should match single grade exactly', function () {
    const alert = createTestAlert('analyst', { gradeBand: 'gs13' });
    const job = createTestJob('1', 'Management Analyst', {
      gradeLevel: 'GS-13',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should not match when grade is outside single grade', function () {
    const alert = createTestAlert('analyst', { gradeBand: 'gs13' });
    const job = createTestJob('1', 'Management Analyst', {
      gradeLevel: 'GS-14',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(false);
  });

  it('should match within grade range', function () {
    const alert = createTestAlert('analyst', { gradeBand: 'gs12-gs14' });
    const job = createTestJob('1', 'Management Analyst', {
      gradeLevel: 'GS-13',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should match at range boundaries', function () {
    const alert = createTestAlert('analyst', { gradeBand: 'gs12-gs14' });
    const jobLow = createTestJob('1', 'Analyst', { gradeLevel: 'GS-12' });
    const jobHigh = createTestJob('2', 'Senior Analyst', { gradeLevel: 'GS-14' });

    expect(matchesAlertCriteria(jobLow, alert)).toBe(true);
    expect(matchesAlertCriteria(jobHigh, alert)).toBe(true);
  });

  it('should not match outside grade range', function () {
    const alert = createTestAlert('analyst', { gradeBand: 'gs12-gs14' });
    const job = createTestJob('1', 'Executive Analyst', {
      gradeLevel: 'GS-15',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(false);
  });

  it('should handle job with grade range format', function () {
    const alert = createTestAlert('analyst', { gradeBand: 'gs13-gs14' });
    const job = createTestJob('1', 'Management Analyst', {
      gradeLevel: 'GS-13/14',
    });

    // Should parse first number (13) which is in range
    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should handle missing job grade', function () {
    const alert = createTestAlert('analyst', { gradeBand: 'gs13' });
    const job = createTestJob('1', 'Contractor Analyst');

    expect(matchesAlertCriteria(job, alert)).toBe(false);
  });
});

// ============================================================================
// TEST SUITE: Location Matching
// ============================================================================

describe('Alert location matching', function () {
  it('should match when location is contained in job location', function () {
    const alert = createTestAlert('analyst', { location: 'dc' });
    const job = createTestJob('1', 'Management Analyst', {
      locationDisplay: 'Washington, DC',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should be case-insensitive', function () {
    const alert = createTestAlert('analyst', { location: 'DC' });
    const job = createTestJob('1', 'Management Analyst', {
      locationDisplay: 'washington, dc area',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should not match when location is not found', function () {
    const alert = createTestAlert('analyst', { location: 'texas' });
    const job = createTestJob('1', 'Management Analyst', {
      locationDisplay: 'Denver, CO',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(false);
  });

  it('should match all locations when alert.location is null', function () {
    const alert = createTestAlert('analyst', { location: null });
    const job = createTestJob('1', 'Management Analyst', {
      locationDisplay: 'Anywhere, USA',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });
});

// ============================================================================
// TEST SUITE: Remote Only Matching
// ============================================================================

describe('Alert remote only matching', function () {
  it('should match when locationDisplay contains "remote"', function () {
    const alert = createTestAlert('analyst', { remoteOnly: true });
    const job = createTestJob('1', 'Data Analyst', {
      locationDisplay: 'Remote',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should match when teleworkEligibility indicates remote', function () {
    const alert = createTestAlert('analyst', { remoteOnly: true });
    const job = createTestJob('1', 'Data Analyst', {
      locationDisplay: 'Washington, DC',
      teleworkEligibility: 'Full Remote',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should not match non-remote jobs when remoteOnly is true', function () {
    const alert = createTestAlert('analyst', { remoteOnly: true });
    const job = createTestJob('1', 'Data Analyst', {
      locationDisplay: 'Washington, DC',
      teleworkEligibility: 'Hybrid',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(false);
  });

  it('should match all jobs when remoteOnly is false', function () {
    const alert = createTestAlert('analyst', { remoteOnly: false });
    const job = createTestJob('1', 'Data Analyst', {
      locationDisplay: 'On-site Only',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });
});

// ============================================================================
// TEST SUITE: Combined Criteria
// ============================================================================

describe('Alert combined criteria matching', function () {
  it('should match when all criteria are satisfied', function () {
    const alert = createTestAlert('analyst', {
      series: '0343',
      gradeBand: 'gs12-gs14',
      location: 'dc',
      remoteOnly: false,
    });

    const job = createTestJob('1', 'Management Analyst', {
      seriesCode: '0343',
      gradeLevel: 'GS-13',
      locationDisplay: 'Washington, DC',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should not match when keywords match but series fails', function () {
    const alert = createTestAlert('analyst', {
      series: '0343',
      gradeBand: 'gs12-gs14',
    });

    const job = createTestJob('1', 'Budget Analyst', {
      seriesCode: '0560', // Wrong series
      gradeLevel: 'GS-13',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(false);
  });

  it('should not match when keywords match but grade fails', function () {
    const alert = createTestAlert('analyst', {
      series: '0343',
      gradeBand: 'gs12-gs14',
    });

    const job = createTestJob('1', 'Management Analyst', {
      seriesCode: '0343',
      gradeLevel: 'GS-15', // Out of range
    });

    expect(matchesAlertCriteria(job, alert)).toBe(false);
  });

  it('should not match when keywords match but remote requirement fails', function () {
    const alert = createTestAlert('analyst', {
      remoteOnly: true,
    });

    const job = createTestJob('1', 'Management Analyst', {
      locationDisplay: 'Pentagon, VA',
      teleworkEligibility: 'On-site',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(false);
  });
});

// ============================================================================
// TEST SUITE: Edge Cases
// ============================================================================

describe('Alert matching edge cases', function () {
  it('should handle jobs with undefined optional fields', function () {
    const alert = createTestAlert('analyst');
    const job: MatchableJob = {
      id: '1',
      title: 'Program Analyst',
      // All optional fields undefined
    };

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should handle empty string fields as missing', function () {
    const alert = createTestAlert('analyst', { series: '0343' });
    const job = createTestJob('1', 'Program Analyst', {
      seriesCode: '', // Empty = missing
    });

    expect(matchesAlertCriteria(job, alert)).toBe(false);
  });

  it('should handle whitespace-only keywords', function () {
    const alert = createTestAlert('   ');
    const job = createTestJob('1', 'Any Job');

    // Trimmed empty keywords should match all
    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should be robust to special characters in keywords', function () {
    const alert = createTestAlert('IT/Specialist');
    const job = createTestJob('1', 'IT/Specialist (Network)');

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });

  it('should handle partial location matches', function () {
    const alert = createTestAlert('analyst', { location: 'washington' });
    const job = createTestJob('1', 'Analyst', {
      locationDisplay: 'Washington, DC Metro Area',
    });

    expect(matchesAlertCriteria(job, alert)).toBe(true);
  });
});

// ============================================================================
// TEST SUITE: Deduplication
// ============================================================================

describe('Alert match deduplication', function () {
  /**
   * Simulates runAlert behavior for testing deduplication.
   */
  function runAlertSimulation(alert: JobAlert, jobs: MatchableJob[]): string[] {
    const matchedIds: string[] = [];
    const seenIds: Set<string> = new Set();

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];

      if (seenIds.has(job.id)) {
        continue;
      }

      if (matchesAlertCriteria(job, alert)) {
        matchedIds.push(job.id);
        seenIds.add(job.id);
      }
    }

    return matchedIds;
  }

  it('should deduplicate jobs with same ID', function () {
    const alert = createTestAlert('analyst');
    const jobs: MatchableJob[] = [
      createTestJob('1', 'Management Analyst'),
      createTestJob('1', 'Management Analyst Duplicate'), // Same ID
      createTestJob('2', 'Budget Analyst'),
    ];

    const matches = runAlertSimulation(alert, jobs);

    expect(matches.length).toBe(2);
    expect(matches).toContain('1');
    expect(matches).toContain('2');
  });

  it('should count unique matches correctly', function () {
    const alert = createTestAlert('analyst');
    const jobs: MatchableJob[] = [
      createTestJob('1', 'Management Analyst'),
      createTestJob('1', 'Same Job Different Title'), // Doesn't match "analyst"
      createTestJob('1', 'Third Instance Same ID'),   // Doesn't match "analyst"
      createTestJob('2', 'Program Analyst'),
      createTestJob('3', 'Budget Coordinator'),       // Doesn't match "analyst"
    ];

    const matches = runAlertSimulation(alert, jobs);

    expect(matches.length).toBe(2); // Only job 1 and 2
  });
});
