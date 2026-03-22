import { create } from 'zustand';
import {
  initialResumeData,
  type ResumeData,
  type ResumeProfile,
  type TargetRole,
  type WorkExperience,
  type Education,
  type Skills,
  type TargetJob,
} from '@/lib/mock/resume-builder';
import { RESUME_BUILDER_STORAGE_KEY } from '@/lib/storage-keys';

// Helper to merge objects without spread
function mergeObject<T extends object>(base: T, updates: Partial<T>): T {
  const result = Object.assign({}, base);
  const keys = Object.keys(updates) as Array<keyof T>;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (updates[key] !== undefined) {
      (result as Record<string, unknown>)[key as string] = updates[key];
    }
  }
  return result;
}

// Persistence helpers
interface PersistedState {
  resumeData: ResumeData;
  currentStep: number;
  isTailoringMode: boolean;
  activeTargetJob: TargetJob | null;
  savedTargetJobs: TargetJob[];
}

function loadFromStorage(): PersistedState | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = localStorage.getItem(RESUME_BUILDER_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored);
    // Validate shape
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.resumeData &&
      typeof parsed.currentStep === 'number'
    ) {
      return {
        resumeData: parsed.resumeData,
        currentStep: parsed.currentStep,
        isTailoringMode: parsed.isTailoringMode === true,
        activeTargetJob: parsed.activeTargetJob || null,
        savedTargetJobs: Array.isArray(parsed.savedTargetJobs) ? parsed.savedTargetJobs : [],
      };
    }
    return null;
  } catch (e) {
    console.error('Failed to load resume builder state from storage:', e);
    return null;
  }
}

function saveToStorage(state: ResumeBuilderState): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const toSave: PersistedState = {
      resumeData: state.resumeData,
      currentStep: state.currentStep,
      isTailoringMode: state.isTailoringMode,
      activeTargetJob: state.activeTargetJob,
      savedTargetJobs: state.savedTargetJobs,
    };
    localStorage.setItem(RESUME_BUILDER_STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save resume builder state to storage:', e);
  }
}

// Store interface
interface ResumeBuilderState {
  // Resume data
  resumeData: ResumeData;
  currentStep: number;
  sectionVisibility: {
    contact: boolean;
    agency: boolean;
  };

  // Tailoring session
  activeTargetJob: TargetJob | null;
  savedTargetJobs: TargetJob[];
  isTailoringMode: boolean;
}

interface ResumeBuilderActions {
  // Resume actions
  setResumeData: (data: ResumeData) => void;
  updateResumeProfile: (data: Partial<ResumeProfile>) => void;
  updateTargetRoles: (data: TargetRole[]) => void;
  updateWorkExperience: (data: WorkExperience[]) => void;
  updateEducation: (data: Education[]) => void;
  updateSkills: (data: Partial<Skills>) => void;

  // Step navigation
  setCurrentStep: (step: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;

  // Section visibility
  toggleSectionVisibility: (section: 'contact' | 'agency') => void;
  setSectionVisibility: (section: 'contact' | 'agency', visible: boolean) => void;

  // Tailoring session actions
  setActiveTargetJob: (job: TargetJob | null) => void;
  addSavedTargetJob: (job: TargetJob) => void;
  removeSavedTargetJob: (jobId: string) => void;
  getTargetJobById: (jobId: string) => TargetJob | undefined;
  startTailoredResumeSession: (
    job: {
      id: number | string;
      role: string;
      series: string;
      grade: string;
      agency: string;
      location: string;
      matchPercent?: number;
    },
    options?: {
      isEmployee?: boolean;
      currentGrade?: string;
      currentSeries?: string;
      currentAgency?: string;
    },
  ) => TargetJob;
  clearTailoringSession: () => void;

  // Reset
  resetResumeData: () => void;
}

export type ResumeBuilderStore = ResumeBuilderState & ResumeBuilderActions;

// Selectors
export const selectResumeData = function (state: ResumeBuilderStore): ResumeData {
  return state.resumeData;
};

export const selectCurrentStep = function (state: ResumeBuilderStore): number {
  return state.currentStep;
};

export const selectSectionVisibility = function (
  state: ResumeBuilderStore,
): { contact: boolean; agency: boolean } {
  return state.sectionVisibility;
};

export const selectActiveTargetJob = function (state: ResumeBuilderStore): TargetJob | null {
  return state.activeTargetJob;
};

export const selectSavedTargetJobs = function (state: ResumeBuilderStore): TargetJob[] {
  return state.savedTargetJobs;
};

export const selectIsTailoringMode = function (state: ResumeBuilderStore): boolean {
  return state.isTailoringMode;
};

// Load initial state from storage
const hydratedState = loadFromStorage();

// Create the store
export const useResumeBuilderStore = create<ResumeBuilderStore>(function (set, get) {
  // Compute starting state by merging defaults with hydrated values
  const defaultResumeData = JSON.parse(JSON.stringify(initialResumeData)) as ResumeData;

  const startingResumeData = hydratedState ? hydratedState.resumeData : defaultResumeData;
  const startingCurrentStep = hydratedState ? hydratedState.currentStep : 0;
  const startingIsTailoringMode = hydratedState ? hydratedState.isTailoringMode : false;
  const startingActiveTargetJob = hydratedState ? hydratedState.activeTargetJob : null;
  const startingSavedTargetJobs = hydratedState ? hydratedState.savedTargetJobs : [];

  return {
    // Initial state (hydrated from storage if available)
    resumeData: startingResumeData,
    currentStep: startingCurrentStep,
    sectionVisibility: {
      contact: false,
      agency: false,
    },
    activeTargetJob: startingActiveTargetJob,
    savedTargetJobs: startingSavedTargetJobs,
    isTailoringMode: startingIsTailoringMode,

    // Resume actions
    setResumeData: function (data) {
      set({ resumeData: JSON.parse(JSON.stringify(data)) });
      saveToStorage(get());
    },

    updateResumeProfile: function (data) {
      const state = get();
      const newProfile = mergeObject(state.resumeData.profile, data);
      set({
        resumeData: Object.assign({}, state.resumeData, { profile: newProfile }),
      });
      saveToStorage(get());
    },

    updateTargetRoles: function (data) {
      const state = get();
      set({
        resumeData: Object.assign({}, state.resumeData, { targetRoles: data }),
      });
      saveToStorage(get());
    },

    updateWorkExperience: function (data) {
      const state = get();
      set({
        resumeData: Object.assign({}, state.resumeData, { workExperience: data }),
      });
      saveToStorage(get());
    },

    updateEducation: function (data) {
      const state = get();
      set({
        resumeData: Object.assign({}, state.resumeData, { education: data }),
      });
      saveToStorage(get());
    },

    updateSkills: function (data) {
      const state = get();
      const newSkills = mergeObject(state.resumeData.skills, data);
      set({
        resumeData: Object.assign({}, state.resumeData, { skills: newSkills }),
      });
      saveToStorage(get());
    },

    // Step navigation
    setCurrentStep: function (step) {
      set({ currentStep: step });
      saveToStorage(get());
    },

    goToNextStep: function () {
      const state = get();
      set({ currentStep: state.currentStep + 1 });
      saveToStorage(get());
    },

    goToPreviousStep: function () {
      const state = get();
      if (state.currentStep > 0) {
        set({ currentStep: state.currentStep - 1 });
        saveToStorage(get());
      }
    },

    // Section visibility
    toggleSectionVisibility: function (section) {
      const state = get();
      const newVisibility = Object.assign({}, state.sectionVisibility);
      newVisibility[section] = !newVisibility[section];
      set({ sectionVisibility: newVisibility });
    },

    setSectionVisibility: function (section, visible) {
      const state = get();
      const newVisibility = Object.assign({}, state.sectionVisibility);
      newVisibility[section] = visible;
      set({ sectionVisibility: newVisibility });
    },

    // Tailoring session actions
    setActiveTargetJob: function (job) {
      set({
        activeTargetJob: job,
        isTailoringMode: job !== null,
      });
      saveToStorage(get());
    },

    addSavedTargetJob: function (job) {
      const state = get();
      const newJobs: TargetJob[] = [];
      for (let i = 0; i < state.savedTargetJobs.length; i++) {
        newJobs.push(state.savedTargetJobs[i]);
      }
      newJobs.push(job);
      set({ savedTargetJobs: newJobs });
      saveToStorage(get());
    },

    removeSavedTargetJob: function (jobId) {
      const state = get();
      const newJobs: TargetJob[] = [];
      for (let i = 0; i < state.savedTargetJobs.length; i++) {
        if (state.savedTargetJobs[i].jobId !== jobId) {
          newJobs.push(state.savedTargetJobs[i]);
        }
      }
      set({ savedTargetJobs: newJobs });
      saveToStorage(get());
    },

    getTargetJobById: function (jobId) {
      const state = get();
      for (let i = 0; i < state.savedTargetJobs.length; i++) {
        if (state.savedTargetJobs[i].jobId === jobId) {
          return state.savedTargetJobs[i];
        }
      }
      return undefined;
    },

    startTailoredResumeSession: function (job, options) {
      const state = get();

      // Check if matching target exists
      let existingTarget: TargetJob | undefined;
      for (let i = 0; i < state.savedTargetJobs.length; i++) {
        const t = state.savedTargetJobs[i];
        if (
          t.jobId === String(job.id) ||
          (t.series === job.series && t.grade === job.grade && t.agency === job.agency)
        ) {
          existingTarget = t;
          break;
        }
      }

      let moveType: 'promotion' | 'lateral' | 'entry' = 'entry';
      if (options && options.isEmployee && options.currentGrade) {
        const currentGradeNum = parseInt(options.currentGrade.replace(/\D/g, ''), 10);
        const targetGradeNum = parseInt(job.grade.replace(/\D/g, ''), 10);
        if (targetGradeNum > currentGradeNum) {
          moveType = 'promotion';
        } else if (targetGradeNum === currentGradeNum) {
          moveType = 'lateral';
        }
      }

      let targetJob: TargetJob;

      if (existingTarget) {
        targetJob = Object.assign({}, existingTarget, {
          isActiveTarget: true,
          moveType: moveType,
        });

        const updatedJobs: TargetJob[] = [];
        for (let j = 0; j < state.savedTargetJobs.length; j++) {
          const saved = state.savedTargetJobs[j];
          if (saved.id === existingTarget.id) {
            updatedJobs.push(targetJob);
          } else {
            updatedJobs.push(Object.assign({}, saved, { isActiveTarget: false }));
          }
        }
        set({ savedTargetJobs: updatedJobs });
      } else {
        targetJob = {
          id: 'target-' + Date.now(),
          jobId: String(job.id),
          title: job.role,
          series: job.series,
          grade: job.grade,
          agency: job.agency,
          location: job.location,
          isActiveTarget: true,
          matchPercent: job.matchPercent || 0,
          skillsMatch: 85,
          keywordMatch: 72,
          moveType: moveType,
          duties: [],
          ksas: [],
        };

        const newJobs: TargetJob[] = [];
        for (let k = 0; k < state.savedTargetJobs.length; k++) {
          newJobs.push(Object.assign({}, state.savedTargetJobs[k], { isActiveTarget: false }));
        }
        newJobs.push(targetJob);
        set({ savedTargetJobs: newJobs });
      }

      set({
        activeTargetJob: targetJob,
        isTailoringMode: true,
      });

      // Note: Advisor context and panel state are now managed by useAdvisorContext.
      // Calling components should use useAdvisorContext().sendJobPrompt() or
      // set context/prompt/panel separately after calling startTailoredResumeSession.

      saveToStorage(get());
      return targetJob;
    },

    clearTailoringSession: function () {
      const state = get();
      const updatedJobs: TargetJob[] = [];
      for (let i = 0; i < state.savedTargetJobs.length; i++) {
        updatedJobs.push(Object.assign({}, state.savedTargetJobs[i], { isActiveTarget: false }));
      }
      set({
        activeTargetJob: null,
        savedTargetJobs: updatedJobs,
        isTailoringMode: false,
      });
      saveToStorage(get());
    },

    // Reset
    resetResumeData: function () {
      set({
        resumeData: JSON.parse(JSON.stringify(initialResumeData)),
        currentStep: 0,
      });
      saveToStorage(get());
    },
  };
});

// Re-export types
export type {
  ResumeData,
  ResumeProfile,
  TargetRole,
  WorkExperience,
  Education,
  Skills,
  TargetJob,
};

