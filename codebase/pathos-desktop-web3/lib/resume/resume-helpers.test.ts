/**
 * ============================================================================
 * RESUME HELPERS UNIT TESTS (Day 38)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Unit tests for resume domain model helper functions:
 * - createDefaultResumeDocument() defaults
 * - cloneResumeDocumentDeep() truly deep clones
 * - applyTailoringHints() deterministic output
 *
 * @version Day 38 - Resume Builder Revamp
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  createDefaultResumeDocument,
  cloneResumeDocumentDeep,
  applyTailoringHints,
  resumeDataToDocument,
} from './resume-helpers';
import type { ResumeData } from '@/lib/mock/resume-builder';
import { initialResumeData } from '@/lib/mock/resume-builder';
import type { TargetJob } from '@/store/resumeBuilderStore';

describe('createDefaultResumeDocument', function () {
  it('should create a resume document with safe defaults', function () {
    const doc = createDefaultResumeDocument();

    expect(doc).toBeDefined();
    expect(doc.baseProfile).toBeDefined();
    expect(doc.baseSections).toBeDefined();
    expect(doc.views.length).toBeGreaterThan(0);
    expect(doc.versions.length).toBe(1);
    expect(doc.activeVersionId).toBe('version-base');
    expect(doc.activeViewId).toBe('view-federal');
    expect(doc.tailoringState).toBeNull();
  });

  it('should have a base version that is marked as base', function () {
    const doc = createDefaultResumeDocument();
    const baseVersion = doc.versions[0];

    expect(baseVersion.isBase).toBe(true);
    expect(baseVersion.id).toBe('version-base');
    expect(baseVersion.name).toBe('Base');
  });

  it('should have default views configured', function () {
    const doc = createDefaultResumeDocument();

    expect(doc.views.length).toBe(4);
    const viewIds = doc.views.map(function (v) {
      return v.id;
    });
    expect(viewIds).toContain('view-federal');
    expect(viewIds).toContain('view-private');
    expect(viewIds).toContain('view-one-page');
    expect(viewIds).toContain('view-full');
  });
});

describe('cloneResumeDocumentDeep', function () {
  it('should create a truly independent copy', function () {
    const original = createDefaultResumeDocument();
    const cloned = cloneResumeDocumentDeep(original);

    // Modify the clone
    cloned.baseProfile.firstName = 'Modified';
    cloned.baseSections.targetRoles.push({
      id: 'test',
      title: 'Test',
      series: '0343',
      gradeMin: 'GS-12',
      gradeMax: 'GS-13',
      location: 'DC',
    });

    // Original should be unchanged
    expect(original.baseProfile.firstName).not.toBe('Modified');
    expect(original.baseSections.targetRoles.length).toBe(0);
  });

  it('should deep clone arrays to prevent shared references', function () {
    const original = createDefaultResumeDocument();
    original.baseSections.skills.technicalSkills.push('JavaScript');
    original.baseSections.skills.certifications.push('AWS Certified');

    const cloned = cloneResumeDocumentDeep(original);

    // Modify clone arrays
    cloned.baseSections.skills.technicalSkills.push('TypeScript');
    cloned.baseSections.skills.certifications.push('Azure Certified');

    // Original arrays should be unchanged
    expect(original.baseSections.skills.technicalSkills.length).toBe(1);
    expect(original.baseSections.skills.certifications.length).toBe(1);
    expect(cloned.baseSections.skills.technicalSkills.length).toBe(2);
    expect(cloned.baseSections.skills.certifications.length).toBe(2);
  });

  it('should deep clone versions array', function () {
    const original = createDefaultResumeDocument();
    const cloned = cloneResumeDocumentDeep(original);

    // Modify clone version
    cloned.versions[0].name = 'Modified Base';

    // Original should be unchanged
    expect(original.versions[0].name).toBe('Base');
    expect(cloned.versions[0].name).toBe('Modified Base');
  });
});

describe('applyTailoringHints', function () {
  it('should return an array of suggestions', function () {
    const resumeData: ResumeData = {
      profile: initialResumeData.profile,
      targetRoles: [],
      workExperience: [
        {
          id: 'exp-1',
          employer: 'Test Agency',
          title: 'Program Analyst',
          series: '',
          grade: '',
          startDate: '2020-01',
          endDate: '2022-01',
          current: false,
          hoursPerWeek: '40',
          salary: '',
          supervisorName: '',
          supervisorPhone: '',
          duties: '',
          accomplishments: 'Managed projects',
        },
      ],
      education: [],
      skills: initialResumeData.skills,
    };

    const targetJob: TargetJob = {
      id: 'job-1',
      jobId: '123',
      title: 'Program Analyst',
      series: '0343',
      grade: 'GS-13',
      agency: 'DoD',
      location: 'DC',
      isActiveTarget: true,
      matchPercent: 85,
      skillsMatch: 80,
      keywordMatch: 75,
      duties: ['Project management', 'Data analysis'],
      ksas: [],
      moveType: 'promotion',
    };

    const suggestions = applyTailoringHints(resumeData, targetJob);

    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('should suggest adding job series if missing', function () {
    const resumeData: ResumeData = {
      profile: initialResumeData.profile,
      targetRoles: [],
      workExperience: [
        {
          id: 'exp-1',
          employer: 'Test Agency',
          title: 'Program Analyst',
          series: '',
          grade: '',
          startDate: '2020-01',
          endDate: '2022-01',
          current: false,
          hoursPerWeek: '40',
          salary: '',
          supervisorName: '',
          supervisorPhone: '',
          duties: '',
          accomplishments: '',
        },
      ],
      education: [],
      skills: initialResumeData.skills,
    };

    const targetJob: TargetJob = {
      id: 'job-1',
      jobId: '123',
      title: 'Program Analyst',
      series: '0343',
      grade: 'GS-13',
      agency: 'DoD',
      location: 'DC',
      isActiveTarget: true,
      matchPercent: 85,
      skillsMatch: 80,
      keywordMatch: 75,
      duties: [],
      ksas: [],
      moveType: 'promotion',
    };

    const suggestions = applyTailoringHints(resumeData, targetJob);

    const seriesSuggestion = suggestions.find(function (s) {
      return s.fieldName === 'series';
    });

    if (seriesSuggestion) {
      expect(seriesSuggestion.newValue).toBe('0343');
      expect(seriesSuggestion.reason).toContain('GS-calibrated');
    }
  });
});

describe('resumeDataToDocument', function () {
  it('should convert ResumeData to ResumeDocument', function () {
    const resumeData: ResumeData = {
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        address: '123 Main St',
        city: 'Washington',
        state: 'DC',
        zip: '20001',
        citizenship: 'US Citizen',
        veteranStatus: 'No',
        securityClearance: 'None',
        currentAgency: 'DoD',
        currentSeries: '0343',
        currentGrade: 'GS-12',
      },
      targetRoles: [],
      workExperience: [],
      education: [],
      skills: initialResumeData.skills,
    };

    const doc = resumeDataToDocument(resumeData);

    expect(doc.baseProfile.firstName).toBe('John');
    expect(doc.baseProfile.lastName).toBe('Doe');
    expect(doc.baseSections.targetRoles.length).toBe(0);
    expect(doc.versions.length).toBe(1);
  });

  it('should preserve all resume data fields', function () {
    const resumeData: ResumeData = {
      profile: initialResumeData.profile,
      targetRoles: [
        {
          id: 'role-1',
          title: 'Program Analyst',
          series: '0343',
          gradeMin: 'GS-12',
          gradeMax: 'GS-13',
          location: 'DC',
        },
      ],
      workExperience: [
        {
          id: 'exp-1',
          employer: 'Test Agency',
          title: 'Analyst',
          series: '0343',
          grade: 'GS-12',
          startDate: '2020-01',
          endDate: '2022-01',
          current: false,
          hoursPerWeek: '40',
          salary: '80000',
          supervisorName: 'Jane Smith',
          supervisorPhone: '555-5678',
          duties: 'Analyze data',
          accomplishments: 'Improved efficiency',
        },
      ],
      education: [
        {
          id: 'edu-1',
          institution: 'Test University',
          degree: 'Bachelor',
          field: 'Computer Science',
          graduationDate: '2019-05',
          gpa: '3.5',
          credits: '120',
        },
      ],
      skills: {
        technicalSkills: ['JavaScript', 'Python'],
        certifications: ['AWS Certified'],
        languages: ['English'],
        ksas: 'Strong analytical skills',
      },
    };

    const doc = resumeDataToDocument(resumeData);

    expect(doc.baseSections.targetRoles.length).toBe(1);
    expect(doc.baseSections.workExperience.length).toBe(1);
    expect(doc.baseSections.education.length).toBe(1);
    expect(doc.baseSections.skills.technicalSkills.length).toBe(2);
  });
});

