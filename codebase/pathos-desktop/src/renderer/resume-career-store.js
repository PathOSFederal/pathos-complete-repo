"use strict";

// ===============================================================
// WHY: Resume & Career needs a local-first store with versioning.
// HOW: Provide a lightweight Zustand-like store with persistence.
// ===============================================================

const RESUME_CAREER_STORAGE_KEY = "pathos.desktop.resumeCareer.v1";

// ===============================================================
// WHY: Types keep the store shape explicit and testable.
// HOW: Use JSDoc typedefs for the renderer + tests.
// ===============================================================
/**
 * @typedef {object} FederalJobRef
 * @property {string} jobId
 * @property {string} announcementNumber
 * @property {string} title
 * @property {string} agency
 * @property {string} grade
 */

/**
 * @typedef {object} WorkExperienceEntry
 * @property {string} id
 * @property {string} positionTitle
 * @property {string} organization
 * @property {string} location
 * @property {string} period
 * @property {string} hoursPerWeek
 * @property {string} salary
 * @property {string} supervisorName
 * @property {string} supervisorPhone
 * @property {string} supervisorContactOk
 * @property {Array<string>} duties
 */

/**
 * @typedef {object} EducationEntry
 * @property {string} id
 * @property {string} degree
 * @property {string} school
 * @property {string} location
 * @property {string} completionDate
 * @property {string} gpa
 * @property {string} creditHours
 * @property {Array<string>} coursework
 */

/**
 * @typedef {object} FederalResume
 * @property {string} id
 * @property {FederalJobRef} job
 * @property {"Draft" | "Applied" | "Archived"} status
 * @property {number} version
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string | null} lastExportedAt
 * @property {string} lastExportedFile
 * @property {Array<WorkExperienceEntry>} workExperience
 * @property {EducationEntry} education
 */

/**
 * @typedef {object} ResumePromptLogEntry
 * @property {string} id
 * @property {string} resumeId
 * @property {string} prompt
 * @property {string} createdAt
 */

/**
 * @typedef {object} ResumeCareerState
 * @property {Array<FederalResume>} resumes
 * @property {string | null} activeResumeId
 * @property {Array<ResumePromptLogEntry>} promptLog
 */

/**
 * @typedef {object} ResumeCareerStore
 * @property {function(): ResumeCareerState} getState
 * @property {function(function(ResumeCareerState, string): void): function(): void} subscribe
 * @property {function(FederalJobRef, { status?: string }=): FederalResume | null} createResumeForJob
 * @property {function(string): void} selectResume
 * @property {function(string): void} archiveResume
 * @property {function(string): void} deleteResume
 * @property {function(string): void} exportResume
 * @property {function(string, string): void} applyPromptUpdate
 */

const buildId = () => {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createDefaultWorkExperience = () => {
  return [
    {
      id: buildId(),
      positionTitle: "Research Assistant",
      organization: "University Research Center",
      location: "Washington, DC",
      period: "06/2024 – Present",
      hoursPerWeek: "40 hours/week",
      salary: "$52,000/year",
      supervisorName: "Dr. Sarah Johnson",
      supervisorPhone: "(202) 555-0123",
      supervisorContactOk: "Yes",
      duties: [
        "Analyzed federal education policy data sets containing over 50,000 data points to identify trends in student achievement across diverse demographic groups.",
        "Collaborated with a cross-functional team of 8 researchers to design and implement qualitative research studies examining the effectiveness of federal education programs.",
        "Developed and maintained complex Excel databases and data visualization dashboards using Tableau to track program outcomes.",
        "Prepared briefing materials, executive summaries, and presentations for senior leadership.",
      ],
    },
    {
      id: buildId(),
      positionTitle: "Policy Intern",
      organization: "Congressional Education Committee",
      location: "Washington, DC",
      period: "01/2024 – 05/2024",
      hoursPerWeek: "30 hours/week",
      salary: "$18/hour",
      supervisorName: "Michael Chen",
      supervisorPhone: "(202) 555-0189",
      supervisorContactOk: "Yes",
      duties: [
        "Supported legislative staff in analyzing proposed education bills and amendments.",
        "Attended Congressional hearings and committee meetings, preparing detailed notes and testimony summaries.",
        "Drafted constituent correspondence and talking points on education policy issues.",
        "Coordinated stakeholder briefings with education advocacy organizations.",
      ],
    },
  ];
};

const createDefaultEducation = () => {
  return {
    id: buildId(),
    degree: "Bachelor of Arts in Public Policy",
    school: "Georgetown University",
    location: "Washington, DC",
    completionDate: "05/2025",
    gpa: "3.7/4.0",
    creditHours: "120 semester hours",
    coursework: [
      "Education Policy Analysis",
      "Public Administration",
      "Quantitative Research Methods",
      "Program Evaluation",
    ],
  };
};

/**
 * Create an empty resume career state.
 * @returns {ResumeCareerState}
 */
function createEmptyResumeCareerState() {
  return {
    resumes: [],
    activeResumeId: null,
    promptLog: [],
  };
}

const buildResumeFromJob = (jobRef, version, status) => {
  const now = new Date().toISOString();
  return {
    id: buildId(),
    job: {
      jobId: jobRef.jobId,
      announcementNumber: jobRef.announcementNumber,
      title: jobRef.title,
      agency: jobRef.agency,
      grade: jobRef.grade,
    },
    status: status === "Applied" || status === "Archived" ? status : "Draft",
    version,
    createdAt: now,
    updatedAt: now,
    lastExportedAt: null,
    lastExportedFile: "",
    workExperience: createDefaultWorkExperience(),
    education: createDefaultEducation(),
  };
};

const buildSeedResumes = () => {
  const samples = [];
  const jobOne = {
    jobId: "ED-2026-0234",
    announcementNumber: "ED-2026-0234",
    title: "Program Analyst",
    agency: "Department of Education",
    grade: "GS-9",
  };
  const jobTwo = {
    jobId: "HHS-2026-1178",
    announcementNumber: "HHS-2026-1178",
    title: "Policy Analyst",
    agency: "Department of Health and Human Services",
    grade: "GS-11",
  };
  samples.push(buildResumeFromJob(jobOne, 1, "Draft"));
  samples.push(buildResumeFromJob(jobTwo, 2, "Applied"));
  return samples;
};

const cloneWorkExperienceEntry = (entry) => {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const duties = [];
  if (Array.isArray(entry.duties)) {
    entry.duties.forEach(function (duty) {
      if (typeof duty === "string") {
        duties.push(duty);
      }
    });
  }
  return {
    id: typeof entry.id === "string" ? entry.id : buildId(),
    positionTitle: typeof entry.positionTitle === "string" ? entry.positionTitle : "",
    organization: typeof entry.organization === "string" ? entry.organization : "",
    location: typeof entry.location === "string" ? entry.location : "",
    period: typeof entry.period === "string" ? entry.period : "",
    hoursPerWeek: typeof entry.hoursPerWeek === "string" ? entry.hoursPerWeek : "",
    salary: typeof entry.salary === "string" ? entry.salary : "",
    supervisorName: typeof entry.supervisorName === "string" ? entry.supervisorName : "",
    supervisorPhone: typeof entry.supervisorPhone === "string" ? entry.supervisorPhone : "",
    supervisorContactOk:
      entry.supervisorContactOk === "Yes" || entry.supervisorContactOk === "No"
        ? entry.supervisorContactOk
        : "Yes",
    duties,
  };
};

const cloneEducationEntry = (entry) => {
  if (!entry || typeof entry !== "object") {
    return createDefaultEducation();
  }
  const coursework = [];
  if (Array.isArray(entry.coursework)) {
    entry.coursework.forEach(function (item) {
      if (typeof item === "string") {
        coursework.push(item);
      }
    });
  }
  return {
    id: typeof entry.id === "string" ? entry.id : buildId(),
    degree: typeof entry.degree === "string" ? entry.degree : "",
    school: typeof entry.school === "string" ? entry.school : "",
    location: typeof entry.location === "string" ? entry.location : "",
    completionDate: typeof entry.completionDate === "string" ? entry.completionDate : "",
    gpa: typeof entry.gpa === "string" ? entry.gpa : "",
    creditHours: typeof entry.creditHours === "string" ? entry.creditHours : "",
    coursework,
  };
};

const cloneResume = (resume) => {
  if (!resume || typeof resume !== "object") {
    return null;
  }
  const workExperience = [];
  if (Array.isArray(resume.workExperience)) {
    resume.workExperience.forEach(function (entry) {
      const safeEntry = cloneWorkExperienceEntry(entry);
      if (safeEntry) {
        workExperience.push(safeEntry);
      }
    });
  }
  return {
    id: typeof resume.id === "string" ? resume.id : buildId(),
    job: {
      jobId:
        resume.job && typeof resume.job.jobId === "string" ? resume.job.jobId : "",
      announcementNumber:
        resume.job && typeof resume.job.announcementNumber === "string"
          ? resume.job.announcementNumber
          : "",
      title: resume.job && typeof resume.job.title === "string" ? resume.job.title : "",
      agency:
        resume.job && typeof resume.job.agency === "string" ? resume.job.agency : "",
      grade: resume.job && typeof resume.job.grade === "string" ? resume.job.grade : "",
    },
    status:
      resume.status === "Applied" || resume.status === "Archived" ? resume.status : "Draft",
    version: typeof resume.version === "number" ? resume.version : 1,
    createdAt: typeof resume.createdAt === "string" ? resume.createdAt : new Date().toISOString(),
    updatedAt: typeof resume.updatedAt === "string" ? resume.updatedAt : new Date().toISOString(),
    lastExportedAt:
      typeof resume.lastExportedAt === "string" ? resume.lastExportedAt : null,
    lastExportedFile:
      typeof resume.lastExportedFile === "string" ? resume.lastExportedFile : "",
    workExperience,
    education: cloneEducationEntry(resume.education),
  };
};

/**
 * Sanitize a full resume career state snapshot.
 * @param {object} state
 * @returns {ResumeCareerState}
 */
function sanitizeResumeCareerState(state) {
  const base = createEmptyResumeCareerState();
  if (!state || typeof state !== "object") {
    return base;
  }
  const resumes = [];
  if (Array.isArray(state.resumes)) {
    state.resumes.forEach(function (resume) {
      const safeResume = cloneResume(resume);
      if (safeResume) {
        resumes.push(safeResume);
      }
    });
  }
  const promptLog = [];
  if (Array.isArray(state.promptLog)) {
    state.promptLog.forEach(function (entry) {
      if (!entry || typeof entry !== "object") {
        return;
      }
      promptLog.push({
        id: typeof entry.id === "string" ? entry.id : buildId(),
        resumeId: typeof entry.resumeId === "string" ? entry.resumeId : "",
        prompt: typeof entry.prompt === "string" ? entry.prompt : "",
        createdAt:
          typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
      });
    });
  }
  const activeResumeId =
    typeof state.activeResumeId === "string" ? state.activeResumeId : null;
  const sanitized = { resumes, activeResumeId, promptLog };
  if (
    sanitized.activeResumeId &&
    !sanitized.resumes.find(function (resume) {
      return resume.id === sanitized.activeResumeId;
    })
  ) {
    sanitized.activeResumeId = sanitized.resumes[0] ? sanitized.resumes[0].id : null;
  }
  return sanitized;
}

/**
 * Load the resume career state from storage.
 * @param {{ getItem: function(string): (string | null) }} storage
 * @param {boolean} seedResumes
 * @returns {ResumeCareerState}
 */
function loadResumeCareerState(storage, seedResumes) {
  try {
    const raw = storage.getItem(RESUME_CAREER_STORAGE_KEY);
    if (!raw) {
      const base = createEmptyResumeCareerState();
      if (seedResumes) {
        base.resumes = buildSeedResumes();
        base.activeResumeId = base.resumes[0] ? base.resumes[0].id : null;
      }
      return sanitizeResumeCareerState(base);
    }
    return sanitizeResumeCareerState(JSON.parse(raw));
  } catch (error) {
    const fallback = createEmptyResumeCareerState();
    if (seedResumes) {
      fallback.resumes = buildSeedResumes();
      fallback.activeResumeId = fallback.resumes[0] ? fallback.resumes[0].id : null;
    }
    return sanitizeResumeCareerState(fallback);
  }
}

/**
 * Persist the resume career state to storage.
 * @param {{ setItem: function(string, string): void }} storage
 * @param {ResumeCareerState} state
 */
function persistResumeCareerState(storage, state) {
  try {
    const snapshot = sanitizeResumeCareerState(state);
    storage.setItem(RESUME_CAREER_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    // Best-effort persistence for local-only state.
  }
}

const findResumeIndex = (state, resumeId) => {
  return state.resumes.findIndex(function (resume) {
    return resume.id === resumeId;
  });
};

const findLatestVersionForJob = (state, jobId) => {
  let maxVersion = 0;
  state.resumes.forEach(function (resume) {
    if (resume.job.jobId === jobId && resume.version > maxVersion) {
      maxVersion = resume.version;
    }
  });
  return maxVersion;
};

/**
 * Create a resume inside the provided state.
 * @param {ResumeCareerState} state
 * @param {FederalJobRef} jobRef
 * @param {{ status?: string }=} options
 * @returns {FederalResume | null}
 */
function createResumeForJobInState(state, jobRef, options) {
  if (!state || !jobRef) {
    return null;
  }
  const jobId =
    typeof jobRef.jobId === "string" && jobRef.jobId.trim()
      ? jobRef.jobId.trim()
      : buildId();
  const normalized = {
    jobId,
    announcementNumber:
      typeof jobRef.announcementNumber === "string" ? jobRef.announcementNumber : "",
    title: typeof jobRef.title === "string" ? jobRef.title : "Untitled Role",
    agency: typeof jobRef.agency === "string" ? jobRef.agency : "Agency",
    grade: typeof jobRef.grade === "string" ? jobRef.grade : "",
  };
  const nextVersion = findLatestVersionForJob(state, normalized.jobId) + 1;
  const resume = buildResumeFromJob(normalized, nextVersion, options && options.status);
  state.resumes.unshift(resume);
  state.activeResumeId = resume.id;
  return resume;
}

/**
 * Select a resume in state.
 * @param {ResumeCareerState} state
 * @param {string} resumeId
 */
function selectResumeInState(state, resumeId) {
  if (
    state.resumes.find(function (resume) {
      return resume.id === resumeId;
    })
  ) {
    state.activeResumeId = resumeId;
  }
}

/**
 * Archive a resume in state.
 * @param {ResumeCareerState} state
 * @param {string} resumeId
 */
function archiveResumeInState(state, resumeId) {
  const index = findResumeIndex(state, resumeId);
  if (index === -1) {
    return;
  }
  state.resumes[index].status = "Archived";
  state.resumes[index].updatedAt = new Date().toISOString();
}

/**
 * Delete a resume in state (Draft only).
 * @param {ResumeCareerState} state
 * @param {string} resumeId
 */
function deleteResumeInState(state, resumeId) {
  const index = findResumeIndex(state, resumeId);
  if (index === -1) {
    return;
  }
  const resume = state.resumes[index];
  if (resume.status !== "Draft") {
    return;
  }
  state.resumes.splice(index, 1);
  if (state.activeResumeId === resumeId) {
    state.activeResumeId = state.resumes[0] ? state.resumes[0].id : null;
  }
}

/**
 * Mark a resume as exported for USAJOBS.
 * @param {ResumeCareerState} state
 * @param {string} resumeId
 * @param {string} fileName
 */
function exportResumeInState(state, resumeId, fileName) {
  const index = findResumeIndex(state, resumeId);
  if (index === -1) {
    return;
  }
  state.resumes[index].lastExportedAt = new Date().toISOString();
  state.resumes[index].lastExportedFile = fileName || "";
  state.resumes[index].updatedAt = new Date().toISOString();
}

const appendPromptLogEntry = (state, resumeId, prompt) => {
  const entry = {
    id: buildId(),
    resumeId,
    prompt,
    createdAt: new Date().toISOString(),
  };
  state.promptLog.unshift(entry);
  return entry;
};

/**
 * Apply a prompt update to a resume.
 * @param {ResumeCareerState} state
 * @param {string} resumeId
 * @param {string} prompt
 * @returns {FederalResume | null}
 */
function applyPromptUpdateInState(state, resumeId, prompt) {
  const index = findResumeIndex(state, resumeId);
  if (index === -1) {
    return null;
  }
  const resume = state.resumes[index];
  const cleanedPrompt = typeof prompt === "string" ? prompt.trim() : "";
  if (!cleanedPrompt) {
    return resume;
  }
  appendPromptLogEntry(state, resumeId, cleanedPrompt);
  if (resume.status === "Applied") {
    const nextVersion = findLatestVersionForJob(state, resume.job.jobId) + 1;
    const nextResume = buildResumeFromJob(resume.job, nextVersion, "Draft");
    nextResume.workExperience = [];
    resume.workExperience.forEach(function (entry) {
      const safeEntry = cloneWorkExperienceEntry(entry);
      if (safeEntry) {
        nextResume.workExperience.push(safeEntry);
      }
    });
    nextResume.education = cloneEducationEntry(resume.education);
    nextResume.updatedAt = new Date().toISOString();
    state.resumes.unshift(nextResume);
    state.activeResumeId = nextResume.id;
    return nextResume;
  }
  resume.updatedAt = new Date().toISOString();
  return resume;
}

/**
 * Create a local resume career store instance.
 * @param {{ getItem: function(string): (string | null), setItem: function(string, string): void }} storage
 * @param {{ seedResumes?: boolean }=} options
 * @returns {ResumeCareerStore}
 */
function createResumeCareerStore(storage, options) {
  const seedResumes = options && options.seedResumes === false ? false : true;
  let state = loadResumeCareerState(storage, seedResumes);
  const listeners = [];

  const notify = (reason) => {
    listeners.forEach(function (listener) {
      listener(state, reason || "");
    });
  };

  const setState = (nextState, reason) => {
    state = sanitizeResumeCareerState(nextState);
    persistResumeCareerState(storage, state);
    notify(reason);
  };

  const updateState = (mutator, reason) => {
    const nextState = sanitizeResumeCareerState(state);
    mutator(nextState);
    setState(nextState, reason);
  };

  return {
    getState: function () {
      return state;
    },
    subscribe: function (listener) {
      listeners.push(listener);
      return function () {
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    },
    createResumeForJob: function (jobRef, optionsOverride) {
      let created = null;
      updateState(function (nextState) {
        created = createResumeForJobInState(nextState, jobRef, optionsOverride);
      }, "create-resume");
      return created;
    },
    selectResume: function (resumeId) {
      updateState(function (nextState) {
        selectResumeInState(nextState, resumeId);
      }, "select-resume");
    },
    archiveResume: function (resumeId) {
      updateState(function (nextState) {
        archiveResumeInState(nextState, resumeId);
      }, "archive-resume");
    },
    deleteResume: function (resumeId) {
      updateState(function (nextState) {
        deleteResumeInState(nextState, resumeId);
      }, "delete-resume");
    },
    exportResume: function (resumeId) {
      const stateSnapshot = sanitizeResumeCareerState(state);
      const resume = stateSnapshot.resumes.find(function (item) {
        return item.id === resumeId;
      });
      const jobTitle = resume && resume.job ? resume.job.title : "Federal Resume";
      const fileName = `${jobTitle.replace(/\s+/g, "-")}-v${
        resume ? resume.version : 1
      }.docx`;
      updateState(function (nextState) {
        exportResumeInState(nextState, resumeId, fileName);
      }, "export-resume");
    },
    applyPromptUpdate: function (resumeId, prompt) {
      updateState(function (nextState) {
        applyPromptUpdateInState(nextState, resumeId, prompt);
      }, "apply-prompt");
    },
  };
}

const PathOSResumeCareerStore = {
  RESUME_CAREER_STORAGE_KEY,
  createEmptyResumeCareerState,
  sanitizeResumeCareerState,
  loadResumeCareerState,
  persistResumeCareerState,
  createResumeForJobInState,
  selectResumeInState,
  archiveResumeInState,
  deleteResumeInState,
  exportResumeInState,
  applyPromptUpdateInState,
  createResumeCareerStore,
  buildSeedResumes,
};

const defaultExport = PathOSResumeCareerStore;
const attachToWindow = (targetWindow) => {
  if (targetWindow) {
    targetWindow.PathOSResumeCareerStore = defaultExport;
  }
};

const windowRef =
  typeof globalThis !== "undefined" && globalThis.window ? globalThis.window : null;

attachToWindow(windowRef);

if (typeof globalThis !== "undefined" && typeof document === "undefined") {
  let currentWindow = windowRef;
  try {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      get() {
        return currentWindow;
      },
      set(nextWindow) {
        currentWindow = nextWindow;
        attachToWindow(nextWindow);
      },
    });
  } catch (error) {
    // ignore
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = defaultExport;
}
