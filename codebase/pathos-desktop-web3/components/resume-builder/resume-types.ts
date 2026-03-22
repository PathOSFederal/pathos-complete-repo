import type {
  ResumeData as MockResumeData,
  WorkExperience as MockWorkExperience,
  Education as MockEducation,
  TargetRole,
  ResumeProfile as MockResumeProfile,
  Skills,
} from '@/lib/mock/resume-builder';

export type { TargetRole, Skills };

export type ResumeProfile = Omit<MockResumeProfile, 'currentAgency' | 'currentSeries' | 'currentGrade'> & {
  currentAgency?: string;
  currentSeries?: string;
  currentGrade?: string;
};

export type ResumeExperience = Omit<
  MockWorkExperience,
  'series' | 'grade' | 'salary' | 'supervisorName' | 'supervisorPhone'
> & {
  series?: string;
  grade?: string;
  salary?: string;
  supervisorName?: string;
  supervisorPhone?: string;
};

export type ResumeEducation = Omit<MockEducation, 'gpa' | 'credits'> & {
  gpa?: string;
  credits?: string;
};

export interface ResumeData {
  profile: ResumeProfile;
  targetRoles: TargetRole[];
  workExperience: ResumeExperience[];
  education: ResumeEducation[];
  skills: Skills;
}

export type Resume = ResumeData;
export type ResumeRecord = ResumeData;
export type ResumeSkills = Skills;
export type ResumeTargetRole = TargetRole;
export type WorkExperienceItem = ResumeExperience;
export type EducationItem = ResumeEducation;
export type WorkExperience = ResumeExperience;
export type Education = ResumeEducation;
export type LegacyResumeData = MockResumeData;
