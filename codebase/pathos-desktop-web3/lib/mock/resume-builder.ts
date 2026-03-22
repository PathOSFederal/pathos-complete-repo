// Mock resume builder data for Zustand stores

export interface ResumeProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  citizenship: string;
  veteranStatus: string;
  securityClearance: string;
  currentAgency: string;
  currentSeries: string;
  currentGrade: string;
}

export interface TargetRole {
  id: string;
  title: string;
  series: string;
  gradeMin: string;
  gradeMax: string;
  location: string;
}

export interface WorkExperience {
  id: string;
  employer: string;
  title: string;
  series: string;
  grade: string;
  startDate: string;
  endDate: string;
  current: boolean;
  hoursPerWeek: string;
  salary: string;
  supervisorName: string;
  supervisorPhone: string;
  duties: string;
  accomplishments: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  graduationDate: string;
  gpa: string;
  credits: string;
}

export interface Skills {
  technicalSkills: string[];
  certifications: string[];
  languages: string[];
  ksas: string;
}

export interface ResumeData {
  profile: ResumeProfile;
  targetRoles: TargetRole[];
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skills;
}

export interface TargetJob {
  id: string;
  jobId: string;
  title: string;
  series: string;
  grade: string;
  agency: string;
  location: string;
  isActiveTarget: boolean;
  matchPercent: number;
  skillsMatch: number;
  keywordMatch: number;
  duties: string[];
  ksas: string[];
  moveType: 'promotion' | 'lateral' | 'entry';
}

export const initialResumeData: ResumeData = {
  profile: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    citizenship: 'US Citizen',
    veteranStatus: 'No',
    securityClearance: 'None',
    currentAgency: '',
    currentSeries: '',
    currentGrade: '',
  },
  targetRoles: [],
  workExperience: [],
  education: [],
  skills: {
    technicalSkills: [],
    certifications: [],
    languages: [],
    ksas: '',
  },
};

