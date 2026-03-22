"use strict";

// ===============================================================
// WHY: Selected jobs need a canonical, persistent shape for guidance.
// HOW: Provide a tiny store with normalization and storage helpers.
// ===============================================================

/**
 * @typedef {object} SelectedJob
 * @property {string} source
 * @property {string} sourceJobId
 * @property {string} title
 * @property {string} agency
 * @property {string} location
 * @property {string} grade
 * @property {string} postingUrl
 * @property {string} capturedAt
 * @property {string=} rawSource
 */

/**
 * @typedef {object} SelectedJobState
 * @property {SelectedJob | null} selectedJob
 */

/**
 * @typedef {object} SelectedJobStore
 * @property {function(): SelectedJobState} getState
 * @property {function(function(SelectedJobState, string): void): function(): void} subscribe
 * @property {function(object, string=): SelectedJob | null} setSelectedJob
 * @property {function(string=): void} clearSelectedJob
 * @property {function(string=): void} refreshFromStorage
 */

const SELECTED_JOB_STORAGE_KEY = "pathos.selectedJob.v1";

/**
 * Create an empty selected job state.
 * @returns {SelectedJobState}
 */
function createEmptySelectedJobState() {
  return { selectedJob: null };
}

/**
 * Normalize the source label into canonical values.
 * @param {string} value
 * @returns {string}
 */
function normalizeSelectedJobSource(value) {
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
 * Extract a USAJOBS job id from a posting URL.
 * @param {string} rawUrl
 * @returns {string}
 */
function extractUsaJobsJobId(rawUrl) {
  if (typeof rawUrl !== "string") {
    return "";
  }
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.indexOf("https://www.usajobs.gov/") !== 0) {
    return "";
  }
  const match = trimmed.match(/\/job\/(\d+)/i);
  if (match && match[1]) {
    return match[1];
  }
  return "";
}

/**
 * Check if a URL looks like a USAJOBS job posting.
 * @param {string} rawUrl
 * @returns {boolean}
 */
function isUsaJobsJobPostingUrl(rawUrl) {
  return Boolean(extractUsaJobsJobId(rawUrl));
}

// ===============================================================
// WHY: Selected jobs need a stable posting URL for identity + history.
// HOW: Accept alternate URL fields and normalize to postingUrl.
// ===============================================================
function resolveSelectedJobPostingUrl(raw) {
  if (!raw || typeof raw !== "object") {
    return "";
  }
  const candidates = [
    raw.postingUrl,
    raw.announcementUrl,
    raw.usajobsUrl,
    raw.url,
    raw.postingUri,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "";
}

/**
 * Identify generic USAJOBS titles that should be ignored.
 * @param {string} rawTitle
 * @returns {boolean}
 */
function isGenericUsaJobsTitle(rawTitle) {
  if (typeof rawTitle !== "string") {
    return true;
  }
  const trimmed = rawTitle.trim();
  if (!trimmed) {
    return true;
  }
  const lower = trimmed.toLowerCase();
  if (lower === "usajobs" || lower === "usajobs.gov") {
    return true;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return true;
  }
  if (/usajobs\.gov\/job\/\d+/i.test(trimmed)) {
    return true;
  }
  if (/^usajobs\s*[\u2013-]\s*job announcement$/i.test(trimmed)) {
    return true;
  }
  if (/^usajobs\s*[\u2013-]\s*search/i.test(trimmed)) {
    return true;
  }
  if (/^usajobs\s*[\u2013-]\s*home/i.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Normalize USAJOBS titles to avoid generic placeholders.
 * @param {string} rawTitle
 * @returns {string}
 */
function normalizeUsaJobsTitle(rawTitle) {
  if (typeof rawTitle !== "string") {
    return "";
  }
  const trimmed = rawTitle.trim();
  if (isGenericUsaJobsTitle(trimmed)) {
    return "";
  }
  return trimmed;
}

/**
 * Prefer a non-generic USAJOBS title, falling back as needed.
 * @param {string} currentTitle
 * @param {string} candidateTitle
 * @param {string} fallbackTitle
 * @returns {string}
 */
function chooseUsaJobsTitle(currentTitle, candidateTitle, fallbackTitle) {
  const normalizedCurrent =
    typeof currentTitle === "string" ? currentTitle.trim() : "";
  const normalizedCandidate =
    typeof candidateTitle === "string" ? candidateTitle.trim() : "";
  const normalizedFallback =
    typeof fallbackTitle === "string" ? fallbackTitle.trim() : "";
  if (normalizedCandidate && !isGenericUsaJobsTitle(normalizedCandidate)) {
    return normalizedCandidate;
  }
  if (normalizedCurrent && !isGenericUsaJobsTitle(normalizedCurrent)) {
    return normalizedCurrent;
  }
  return normalizedFallback || "";
}

/**
 * Normalize and validate a SelectedJob payload.
 * @param {object} raw
 * @returns {SelectedJob | null}
 */
function normalizeSelectedJob(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const postingUrl = resolveSelectedJobPostingUrl(raw);
  if (!postingUrl) {
    return null;
  }
  const source = normalizeSelectedJobSource(raw.source);
  const sourceJobId =
    typeof raw.sourceJobId === "string" ? raw.sourceJobId.trim() : "";
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const agency = typeof raw.agency === "string" ? raw.agency.trim() : "";
  const location = typeof raw.location === "string" ? raw.location.trim() : "";
  const grade = typeof raw.grade === "string" ? raw.grade.trim() : "";
  const capturedAt =
    typeof raw.capturedAt === "string" ? raw.capturedAt : new Date().toISOString();
  const rawSource = typeof raw.rawSource === "string" ? raw.rawSource.trim() : "";
  const normalized = {
    source,
    sourceJobId,
    title,
    agency,
    location,
    grade,
    postingUrl,
    capturedAt,
  };
  if (rawSource) {
    normalized.rawSource = rawSource;
  }
  return normalized;
}

/**
 * Sanitize a full SelectedJobState snapshot.
 * @param {object} state
 * @returns {SelectedJobState}
 */
function sanitizeSelectedJobState(state) {
  const base = createEmptySelectedJobState();
  if (!state || typeof state !== "object") {
    return base;
  }
  const selectedJob = normalizeSelectedJob(state.selectedJob);
  return { selectedJob: selectedJob };
}

/**
 * Build a SelectedJob from Explore role data.
 * @param {object} role
 * @returns {SelectedJob | null}
 */
function buildSelectedJobFromExploreRole(role) {
  if (!role || typeof role !== "object") {
    return null;
  }
  return normalizeSelectedJob({
    source: "Explore",
    sourceJobId: typeof role.id === "string" ? role.id.trim() : "",
    title: role.title,
    agency: role.agency,
    location: role.location,
    grade: role.gradeBand,
    postingUrl: role.usajobsUrl,
    capturedAt: new Date().toISOString(),
    rawSource: "Explore",
  });
}

/**
 * Build a SelectedJob from USAJOBS navigation data.
 * @param {{ url?: string, title?: string, docTitle?: string, agency?: string } | null} payload
 * @returns {SelectedJob | null}
 */
function buildSelectedJobFromUsaJobsNavigation(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const postingUrl = typeof payload.url === "string" ? payload.url.trim() : "";
  if (!isUsaJobsJobPostingUrl(postingUrl)) {
    return null;
  }
  // ===============================================================
  // WHY: USAJOBS can surface generic titles before the posting loads.
  // HOW: Prefer the payload title, then a safe document title fallback.
  // ===============================================================
  const title =
    (payload.title && typeof payload.title === "string"
      ? normalizeUsaJobsTitle(payload.title)
      : "") ||
    (payload.docTitle && typeof payload.docTitle === "string"
      ? normalizeUsaJobsTitle(payload.docTitle)
      : "");
  const agency =
    payload.agency && typeof payload.agency === "string" ? payload.agency.trim() : "";
  return normalizeSelectedJob({
    source: "USAJOBS",
    sourceJobId: extractUsaJobsJobId(postingUrl),
    title,
    agency,
    location: "",
    grade: "",
    postingUrl,
    capturedAt: new Date().toISOString(),
    rawSource: "USAJOBS",
  });
}

/**
 * Load persisted SelectedJob state.
 * @param {{ getItem: function(string): (string | null) }} storage
 * @returns {SelectedJobState}
 */
function loadSelectedJobState(storage) {
  try {
    const raw = storage.getItem(SELECTED_JOB_STORAGE_KEY);
    if (!raw) {
      return createEmptySelectedJobState();
    }
    return sanitizeSelectedJobState(JSON.parse(raw));
  } catch (error) {
    return createEmptySelectedJobState();
  }
}

/**
 * Persist SelectedJob state to storage.
 * @param {{ setItem: function(string, string): void }} storage
 * @param {SelectedJobState} state
 */
function persistSelectedJobState(storage, state) {
  try {
    const snapshot = sanitizeSelectedJobState(state);
    storage.setItem(SELECTED_JOB_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    // Best-effort persistence for local-only state.
  }
}

/**
 * Create a SelectedJob store.
 * @param {{ getItem: function(string): (string | null), setItem: function(string, string): void }} storage
 * @returns {SelectedJobStore}
 */
function createSelectedJobStore(storage) {
  let state = loadSelectedJobState(storage);
  const listeners = [];

  const notify = (reason) => {
    listeners.forEach(function (listener) {
      listener(state, reason || "");
    });
  };

  // ===============================================================
  // WHY: Detached windows need state updates without rewriting storage.
  // HOW: Toggle persistence so storage sync cannot cause ping-pong.
  // ===============================================================
  const applyState = (nextState, reason, shouldPersist) => {
    state = sanitizeSelectedJobState(nextState);
    if (shouldPersist) {
      persistSelectedJobState(storage, state);
    }
    notify(reason);
  };
  const setState = (nextState, reason) => {
    applyState(nextState, reason, true);
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
    setSelectedJob: function (payload, reason) {
      const normalized = normalizeSelectedJob(payload);
      if (!normalized) {
        setState({ selectedJob: null }, "selected-job-invalid");
        return null;
      }
      setState({ selectedJob: normalized }, reason || "selected-job-set");
      return normalized;
    },
    clearSelectedJob: function (reason) {
      setState({ selectedJob: null }, reason || "selected-job-clear");
    },
    // ===============================================================
    // WHY: localStorage updates in another window must refresh this view.
    // HOW: Reload from storage and notify without persisting again.
    // ===============================================================
    refreshFromStorage: function (reason) {
      const nextState = loadSelectedJobState(storage);
      applyState(nextState, reason || "selected-job-refresh", false);
    },
  };
}

const PathOSSelectedJobStore = {
  SELECTED_JOB_STORAGE_KEY,
  createEmptySelectedJobState,
  normalizeSelectedJobSource,
  extractUsaJobsJobId,
  isUsaJobsJobPostingUrl,
  isGenericUsaJobsTitle,
  normalizeUsaJobsTitle,
  chooseUsaJobsTitle,
  normalizeSelectedJob,
  sanitizeSelectedJobState,
  buildSelectedJobFromExploreRole,
  buildSelectedJobFromUsaJobsNavigation,
  loadSelectedJobState,
  persistSelectedJobState,
  createSelectedJobStore,
};

if (typeof window !== "undefined") {
  window.PathOSSelectedJobStore = PathOSSelectedJobStore;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = PathOSSelectedJobStore;
}
