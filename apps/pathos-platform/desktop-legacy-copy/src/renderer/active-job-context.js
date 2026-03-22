"use strict";

// ===============================================================
// WHY: Job Search and Resume & Career need a shared, read-only cue.
// HOW: Provide an in-memory ActiveJobContext store with helpers.
// ===============================================================

/**
 * @typedef {object} ActiveJobContext
 * @property {string} jobId
 * @property {string} title
 * @property {string} announcementNumber
 * @property {string} source
 */

/**
 * @typedef {object} ActiveJobState
 * @property {ActiveJobContext | null} activeJob
 */

/**
 * @typedef {object} ActiveJobContextStore
 * @property {function(): ActiveJobState} getState
 * @property {function(function(ActiveJobState, string): void): function(): void} subscribe
 * @property {function(object, string=): ActiveJobContext | null} setActiveJob
 * @property {function(string=): void} clearActiveJob
 */

/**
 * Create an empty active job state.
 * @returns {ActiveJobState}
 */
function createEmptyActiveJobState() {
  return { activeJob: null };
}

/**
 * Normalize the source label into canonical values.
 * @param {string} value
 * @returns {string}
 */
function normalizeActiveJobSource(value) {
  if (typeof value !== "string") {
    return "Explore";
  }
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (lower.indexOf("usa") !== -1) {
    return "USAJOBS";
  }
  if (lower.indexOf("explore") !== -1) {
    return "Explore";
  }
  return "Explore";
}

/**
 * Normalize and validate an ActiveJobContext payload.
 * @param {object} raw
 * @returns {ActiveJobContext | null}
 */
function normalizeActiveJobContext(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  let jobId = typeof raw.jobId === "string" ? raw.jobId.trim() : "";
  const announcementNumber =
    typeof raw.announcementNumber === "string" ? raw.announcementNumber.trim() : "";
  if (!jobId && announcementNumber) {
    jobId = announcementNumber;
  }
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!jobId || !title) {
    return null;
  }
  return {
    jobId,
    title,
    announcementNumber,
    source: normalizeActiveJobSource(raw.source),
  };
}

/**
 * Sanitize a full ActiveJobState snapshot.
 * @param {object} state
 * @returns {ActiveJobState}
 */
function sanitizeActiveJobState(state) {
  const base = createEmptyActiveJobState();
  if (!state || typeof state !== "object") {
    return base;
  }
  const activeJob = normalizeActiveJobContext(state.activeJob);
  return { activeJob: activeJob };
}

/**
 * Build an ActiveJobContext from Explore role data.
 * @param {object} role
 * @returns {ActiveJobContext | null}
 */
function buildActiveJobContextFromExploreRole(role) {
  if (!role || typeof role !== "object") {
    return null;
  }
  const jobId = typeof role.id === "string" ? role.id.trim() : "";
  const title = typeof role.title === "string" ? role.title.trim() : "";
  const announcementNumber =
    typeof role.announcementNumber === "string" ? role.announcementNumber.trim() : "";
  return normalizeActiveJobContext({
    jobId,
    title,
    announcementNumber,
    source: "Explore",
  });
}

/**
 * Check if an active job is included in a role list.
 * @param {ActiveJobContext | null} activeJob
 * @param {Array<object>} roles
 * @returns {boolean}
 */
function isActiveJobInRoleList(activeJob, roles) {
  if (!activeJob || !Array.isArray(roles)) {
    return false;
  }
  for (let i = 0; i < roles.length; i += 1) {
    const role = roles[i];
    if (role && typeof role.id === "string" && role.id === activeJob.jobId) {
      return true;
    }
  }
  return false;
}

/**
 * Build the Resume & Career awareness copy.
 * @param {ActiveJobContext | null} activeJob
 * @returns {string}
 */
function buildResumeActiveJobStatus(activeJob) {
  if (!activeJob) {
    return "No job selected. Select a job in Job Search first, or link a job below.";
  }
  const announcementCopy = activeJob.announcementNumber
    ? ` · Announcement ${activeJob.announcementNumber}`
    : "";
  return (
    `Primed for: ${activeJob.title}${announcementCopy}. ` +
    `Career target: candidate role (${activeJob.source}).`
  );
}

/**
 * Build the PathAdvisor observation copy.
 * @param {ActiveJobContext | null} activeJob
 * @param {{ resumes?: Array<object> } | null} resumeState
 * @returns {string}
 */
function buildAdvisorActiveJobObservation(activeJob, resumeState) {
  if (!activeJob) {
    return (
      "PathAdvisor noticed: No active job selection yet. " +
      "Resume library stays unchanged until you pick a role."
    );
  }
  const resumeCount =
    resumeState && Array.isArray(resumeState.resumes) ? resumeState.resumes.length : 0;
  const resumeLabel = resumeCount === 1 ? "1 resume" : `${resumeCount} resumes`;
  return (
    `PathAdvisor noticed: ${activeJob.title} selected in Job Search. ` +
    `Resume library (${resumeLabel}) stays read-only; career target is a candidate role.`
  );
}

/**
 * Create an ActiveJobContext store.
 * @returns {ActiveJobContextStore}
 */
function createActiveJobContextStore() {
  let state = createEmptyActiveJobState();
  const listeners = [];

  const notify = (reason) => {
    listeners.forEach(function (listener) {
      listener(state, reason || "");
    });
  };

  const setState = (nextState, reason) => {
    state = sanitizeActiveJobState(nextState);
    notify(reason);
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
    setActiveJob: function (payload, reason) {
      const normalized = normalizeActiveJobContext(payload);
      if (!normalized) {
        setState({ activeJob: null }, "active-job-invalid");
        return null;
      }
      setState({ activeJob: normalized }, reason || "active-job-set");
      return normalized;
    },
    clearActiveJob: function (reason) {
      setState({ activeJob: null }, reason || "active-job-clear");
    },
  };
}

const PathOSActiveJobContext = {
  createEmptyActiveJobState,
  normalizeActiveJobContext,
  sanitizeActiveJobState,
  buildActiveJobContextFromExploreRole,
  isActiveJobInRoleList,
  buildResumeActiveJobStatus,
  buildAdvisorActiveJobObservation,
  createActiveJobContextStore,
};

if (typeof window !== "undefined") {
  window.PathOSActiveJobContext = PathOSActiveJobContext;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = PathOSActiveJobContext;
}
