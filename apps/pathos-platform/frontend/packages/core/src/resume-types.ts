/**
 * ============================================================================
 * RESUME BUILDER DATA MODEL -- Local-only resume drafting
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * Federal resume structure. All data local only.
 */

// ---------------------------------------------------------------------------
// Resume section types
// ---------------------------------------------------------------------------

export interface ResumeContact {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  citizenship: string;
  veteranStatus: string;
}

export interface ResumeExperience {
  id: string;
  jobTitle: string;
  employer: string;
  location: string;
  startDate: string;
  endDate: string;
  hoursPerWeek: string;
  grade: string;
  duties: string;
}

export interface ResumeEducation {
  id: string;
  institution: string;
  degree: string;
  field: string;
  graduationDate: string;
  gpa: string;
}

export interface ResumeSkill {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Draft
// ---------------------------------------------------------------------------

export interface ResumeDraft {
  contact: ResumeContact;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: ResumeSkill[];
}

// ---------------------------------------------------------------------------
// Version (snapshot)
// ---------------------------------------------------------------------------

export interface ResumeVersion {
  id: string;
  label: string;
  createdAt: string;
  snapshot: ResumeDraft;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const RESUME_SCHEMA_VERSION = 1;

export interface ResumeStore {
  schemaVersion: number;
  draft: ResumeDraft;
  versions: ResumeVersion[];
}

// ---------------------------------------------------------------------------
// Defaults factory
// ---------------------------------------------------------------------------

export function createDefaultContact(): ResumeContact {
  return {
    fullName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    citizenship: 'United States',
    veteranStatus: 'N/A',
  };
}

export function createDefaultDraft(): ResumeDraft {
  return {
    contact: createDefaultContact(),
    summary: '',
    experience: [],
    education: [],
    skills: [],
  };
}
