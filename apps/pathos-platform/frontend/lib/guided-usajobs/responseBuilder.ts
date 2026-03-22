/**
 * ============================================================================
 * GUIDED USAJOBS RESPONSE BUILDER (Day 44)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Produces structured PathAdvisor responses for Guided USAJOBS Mode.
 * Responses are deterministic, federal-specific, and grounded in the user's
 * selected topic + local goal context.
 *
 * IMPORTANT CONSTRAINTS:
 * - Uses visual selection as context only (no DOM reading).
 * - Does NOT claim to read the page.
 * - Avoids directive language ("click here").
 *
 * @version Day 44 - Guided USAJOBS Click-to-Explain v1
 * ============================================================================
 */

import type { GuidedUsaJobsContextState, GuidedUsaJobsGoalContext } from '@/lib/guided-usajobs/types';

/**
 * Supported explanation topics for USAJOBS sections.
 */
export type GuidedUsaJobsTopic =
  | 'generic'
  | 'who-may-apply'
  | 'qualifications'
  | 'how-evaluated'
  | 'required-documents'
  | 'questionnaire'
  | 'application-status'
  | 'pay-grade'
  | 'location-travel'
  | 'how-to-apply';

/**
 * Response section for structured guidance.
 */
export interface GuidedUsaJobsResponseSection {
  /** Section label (e.g., "Why it matters") */
  label: string;
  /** Section content text */
  content: string;
}

/**
 * Structured response shape used by Guided USAJOBS Panel.
 */
export interface GuidedUsaJobsResponse {
  /** Response title */
  title: string;
  /** Topic associated with the response */
  topic: GuidedUsaJobsTopic;
  /** Generated timestamp (local) */
  generatedAt: string;
  /** Structured response sections */
  sections: GuidedUsaJobsResponseSection[];
}

interface TopicDefinition {
  label: string;
  what: string;
  why: string;
  mistakes: string;
  next: string;
}

const CONTEXT_LABELS: Record<GuidedUsaJobsContextState, string> = {
  SEARCH_RESULTS: 'Search results list',
  JOB_ANNOUNCEMENT: 'Job announcement overview',
  QUALIFICATIONS: 'Qualifications section',
  WHO_MAY_APPLY: 'Who May Apply section',
  HOW_YOU_WILL_BE_EVALUATED: 'How You Will Be Evaluated section',
  REQUIRED_DOCUMENTS: 'Required Documents section',
  QUESTIONNAIRE: 'Questionnaire section',
  APPLICATION_STATUS: 'Application Status section',
  UNKNOWN: 'Unknown context',
};

const TOPIC_DEFINITIONS: Record<GuidedUsaJobsTopic, TopicDefinition> = {
  generic: {
    label: 'Unlabeled USAJOBS section',
    what:
      'I will frame guidance around common federal job listing sections without claiming to read page text.',
    why:
      'Federal hiring is rule-bound and elimination-based. Small misunderstandings can remove an otherwise qualified candidate.',
    mistakes:
      'Assuming HR will infer details, overlooking eligibility rules, and treating USAJOBS like a private-sector posting.',
    next:
      'Identify which section this appears to be (eligibility, qualifications, evaluation, or documents) and confirm the gate it represents.',
  },
  'who-may-apply': {
    label: 'Who May Apply',
    what:
      'You labeled this as “Who May Apply,” which sets the legal eligibility gate for who HR can consider.',
    why:
      'This section determines whether HR is legally allowed to consider you. Many strong candidates are excluded here before qualifications are reviewed.',
    mistakes:
      'Assuming “public” means anyone, ignoring special authority limits, and missing interchange or veteran-only restrictions.',
    next:
      'Confirm your hiring path matches the listed authorities and whether your service preference aligns with the announcement.',
  },
  qualifications: {
    label: 'Qualifications',
    what:
      'You labeled this as “Qualifications,” which defines the minimum and specialized experience HR must verify.',
    why:
      'Federal HR does not infer experience. If a skill is not explicitly documented, it is treated as absent.',
    mistakes:
      'Relying on titles alone, omitting hours/weeks of experience, and failing to mirror specialized experience language.',
    next:
      'Verify your resume explicitly documents the specialized experience and that the grade level aligns with your target GS.',
  },
  'how-evaluated': {
    label: 'How You Will Be Evaluated',
    what:
      'You labeled this as “How You Will Be Evaluated,” which explains the elimination steps and scoring method.',
    why:
      'This process is elimination-based. Overstating proficiency without resume evidence often results in rejection.',
    mistakes:
      'Treating self-ratings as informal, ignoring category rating thresholds, and assuming interviews are guaranteed.',
    next:
      'Compare your resume evidence to the stated competencies and ensure your self-assessment matches documented proof.',
  },
  'required-documents': {
    label: 'Required Documents',
    what:
      'You labeled this as “Required Documents,” which lists mandatory proof HR must receive to consider the application.',
    why:
      'Missing documents do not trigger clarification. The application is simply marked incomplete.',
    mistakes:
      'Uploading the wrong format, forgetting SF-50 or transcripts, and assuming optional documents are truly optional.',
    next:
      'Confirm each required document is present and named clearly, and verify any eligibility document is current.',
  },
  questionnaire: {
    label: 'Questionnaire',
    what:
      'You labeled this as the “Questionnaire,” which drives initial scoring and category placement.',
    why:
      'Self-ratings here are cross-checked against your resume. Inconsistencies are a common disqualification reason.',
    mistakes:
      'Inflating proficiency without evidence, misunderstanding “expert” definitions, and skipping narrative questions.',
    next:
      'Match each rating to concrete resume evidence and ensure your documented duties align with the stated KSAs.',
  },
  'application-status': {
    label: 'Application Status',
    what:
      'You labeled this as “Application Status,” which reflects the workflow stage inside USAJOBS.',
    why:
      'Status updates are delayed and non-linear. A long pause does not imply rejection.',
    mistakes:
      'Assuming “received” means qualified, misreading referral statuses, and abandoning follow-up too early.',
    next:
      'Track the posted close date and timeline, and use the agency contact information if status remains unclear.',
  },
  'pay-grade': {
    label: 'Pay / Grade',
    what:
      'You labeled this as “Pay / Grade,” which indicates the grade range and pay plan for the role.',
    why:
      'The grade range dictates eligibility and future promotion potential. Entering at the wrong grade can reset your timeline.',
    mistakes:
      'Assuming higher pay equals higher grade, ignoring ladder potential, and missing locality differences.',
    next:
      'Confirm the grade aligns with your target GS level and check whether the ladder matches your timeline goal.',
  },
  'location-travel': {
    label: 'Location / Travel',
    what:
      'You labeled this as “Location / Travel,” which defines duty station and mobility expectations.',
    why:
      'Relocation and travel requirements affect eligibility and long-term fit. Agencies rarely waive posted travel or relocation.',
    mistakes:
      'Assuming remote work is implied, underestimating travel frequency, and missing multi-location announcements.',
    next:
      'Compare the duty location to your relocation tolerance and verify any travel percentage is feasible.',
  },
  'how-to-apply': {
    label: 'How to Apply',
    what:
      'You labeled this as “How to Apply,” which defines the submission sequence and required steps.',
    why:
      'Federal applications are strict about sequence and timing. Missing a step typically results in disqualification.',
    mistakes:
      'Submitting after close time, missing supplemental steps, and assuming auto-save means submitted.',
    next:
      'Confirm every step is completed before the deadline and keep a record of submission confirmation.',
  },
};

/**
 * Build a structured, federal-specific response for a given topic.
 */
export function buildGuidedUsaJobsResponse(params: {
  topic: GuidedUsaJobsTopic;
  goals: GuidedUsaJobsGoalContext;
  contextState: GuidedUsaJobsContextState;
}): GuidedUsaJobsResponse {
  const topic = params.topic;
  const goals = params.goals;
  const contextState = params.contextState;

  const definition = TOPIC_DEFINITIONS[topic];
  const contextLabel = CONTEXT_LABELS[contextState];

  const goalLine = buildGoalTailoringLine(goals);
  const warnings = buildGuidedUsaJobsWarnings({
    topic: topic,
    goals: goals,
    contextState: contextState,
  });
  const whatLine =
    'Based on what you selected and the context you chose (' + contextLabel + '), ' + definition.what;

  const sections: GuidedUsaJobsResponseSection[] = [
    {
      label: 'What you selected',
      content: whatLine,
    },
    {
      label: 'Why this matters in federal hiring',
      content: definition.why,
    },
    {
      label: 'Common mistakes here',
      content: definition.mistakes,
    },
    {
      label: 'What to check next (based on your goals)',
      content: definition.next + ' ' + goalLine,
    },
  ];

  if (warnings.length > 0) {
    sections.push({
      label: 'Warnings',
      content: warnings.join(' '),
    });
  }

  return {
    title: definition.label,
    topic: topic,
    generatedAt: new Date().toISOString(),
    sections: sections,
  };
}

/**
 * Build a short goal-tailoring line for the "What to check next" section.
 */
function buildGoalTailoringLine(goals: GuidedUsaJobsGoalContext): string {
  const targetGs = goals.targetGsLevel;
  const timeline = goals.timelineGoal;
  const relocation = goals.relocationTolerance;
  const servicePreference = goals.servicePreference;

  let relocationLine = '';
  if (relocation === 'low') {
    relocationLine = 'Your relocation tolerance is low, so prioritize duty stations that do not require moves.';
  } else if (relocation === 'medium') {
    relocationLine = 'Your relocation tolerance is medium, so weigh travel and relocation expectations carefully.';
  } else {
    relocationLine = 'Your relocation tolerance is high, so consider a wider set of duty stations if the role fits.';
  }

  const serviceLine =
    servicePreference === 'competitive'
      ? 'You prefer Competitive service, so confirm the appointment type aligns with that track.'
      : servicePreference === 'excepted'
        ? 'You prefer Excepted service, so verify the hiring authority reflects that path.'
        : 'You have no service preference, so focus on eligibility rules over appointment type.';

  return (
    'Target GS: ' +
    targetGs +
    '. Timeline: ' +
    timeline +
    '. ' +
    relocationLine +
    ' ' +
    serviceLine
  );
}

/**
 * Build warning lines based on topic + context + goals.
 */
function buildGuidedUsaJobsWarnings(params: {
  topic: GuidedUsaJobsTopic;
  goals: GuidedUsaJobsGoalContext;
  contextState: GuidedUsaJobsContextState;
}): string[] {
  const warnings: string[] = [];

  const topic = params.topic;
  const goals = params.goals;
  const contextState = params.contextState;

  const addWarning = function (value: string) {
    if (warnings.indexOf(value) === -1) {
      warnings.push(value);
    }
  };

  if (contextState === 'QUESTIONNAIRE' || topic === 'questionnaire') {
    addWarning('This questionnaire is elimination-based. Selecting “expert” without resume support often results in disqualification.');
  }

  if (contextState === 'REQUIRED_DOCUMENTS' || topic === 'required-documents') {
    addWarning('Missing documents do not trigger clarification. The application is simply marked incomplete.');
  }

  if (contextState === 'APPLICATION_STATUS' || topic === 'application-status') {
    addWarning('Status updates are delayed and non-linear. A long pause does not imply rejection.');
  }

  if (contextState === 'QUALIFICATIONS' || topic === 'qualifications') {
    addWarning('Federal HR will not infer experience. If it is not explicitly written, it is treated as absent.');
  }

  if (topic === 'pay-grade' || contextState === 'JOB_ANNOUNCEMENT') {
    const gsLevel = parseGsLevel(goals.targetGsLevel);
    if (gsLevel !== null && gsLevel > 12) {
      addWarning('This posting caps at GS-12. If your stated goal is GS-13 within two years, this role may slow that trajectory.');
    }
  }

  return warnings;
}

/**
 * Parse a GS level from a user-provided string.
 */
function parseGsLevel(value: string): number | null {
  const match = value.match(/\d+/);
  if (!match) {
    return null;
  }
  const parsed = Number.parseInt(match[0], 10);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}
