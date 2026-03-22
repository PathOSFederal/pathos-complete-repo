"use strict";

// ===============================================================
// WHY: Activity Log needs persisted job selection history + resume targets.
// HOW: Provide a lightweight store with normalization and local storage.
// ===============================================================

/**
 * @typedef {object} ActivityLogEntry
 * @property {string} id
 * @property {string} type
 * @property {string} timestamp
 * @property {string} title
 * @property {string} reason
 * @property {string} source
 * @property {string} status
 * @property {string=} jobId
 * @property {object=} meta
 * @property {string=} postingUrl
 * @property {string=} capturedAt
 * @property {string=} sourceJobId
 * @property {string=} agency
 * @property {string=} location
 * @property {string=} grade
 */

/**
 * @typedef {object} JobSelection
 * @property {string} id
 * @property {string} source
 * @property {string} sourceJobId
 * @property {string} title
 * @property {string} agency
 * @property {string} location
 * @property {string} grade
 * @property {string} postingUrl
 * @property {string} capturedAt
 * @property {string=} rawSource
 * @property {string=} type
 * @property {string=} timestamp
 * @property {string=} status
 * @property {string=} reason
 * @property {string=} jobId
 * @property {object=} meta
 */

/**
 * @typedef {object} ResumeTarget
 * @property {string} id
 * @property {string} source
 * @property {string} sourceJobId
 * @property {string} title
 * @property {string} agency
 * @property {string} location
 * @property {string} grade
 * @property {string} postingUrl
 * @property {string} addedAt
 * @property {string=} selectionId
 * @property {string=} rawSource
 */

/**
 * @typedef {object} JobSelectionState
 * @property {Array<JobSelection>} recentSelections
 * @property {Array<ResumeTarget>} resumeTargets
 * @property {Array<ActivityLogEntry>} activityEvents
 * @property {string | null} lastSeenActivityAt
 * @property {string | null} lastSeenResumeAt
 */

/**
 * @typedef {object} JobSelectionStore
 * @property {function(): JobSelectionState} getState
 * @property {function(function(JobSelectionState, string): void): function(): void} subscribe
 * @property {function(object): JobSelection | null} addRecentSelection
 * @property {function(object): JobSelection | null} logJobViewed
 * @property {function(object): JobSelection | null} logJobSelected
 * @property {function(string | object): ResumeTarget | null} logJobPromoted
 * @property {function(object=): ActivityLogEntry | null} logResumeExported
 * @property {function(string | object): ResumeTarget | null} addToResumeTargets
 * @property {function(string): void} removeFromResumeTargets
 * @property {function(string): JobSelection | null} setSelectedJobFromHistory
 * @property {function(): void} markActivityLogRead
 * @property {function(): void} markResumeTargetsRead
 * @property {function(): void} clearActivityLog
 * @property {function(string=): void} refreshFromStorage
 */

const JOB_SELECTION_STORAGE_KEY = "pathos.jobSelections.v1";
const MAX_RECENT_SELECTIONS = 20;
const MAX_ACTIVITY_EVENTS = 30;
const ACTIVITY_STATUS_ORDER = {
  viewed: 1,
  selected: 2,
  promoted: 3,
  exported: 4,
};
const isDevRenderer =
  typeof window !== "undefined" &&
  window.location &&
  !window.location.pathname.includes("app.asar");

// ===============================================================
// WHY: Activity Log entries must explain why they exist.
// HOW: Map statuses to explicit, human-readable reasons.
// ===============================================================
const buildActivityReasonFromStatus = (status) => {
  const normalized = normalizeActivityStatus(status, "viewed");
  if (normalized === "promoted") {
    return "Added to Resume & Career";
  }
  if (normalized === "selected") {
    return "Selected job for review";
  }
  if (normalized === "exported") {
    return "Exported resume for USAJOBS";
  }
  return "Viewed job posting";
};

// ===============================================================
// WHY: Classic scripts share a global scope across stores.
// HOW: Use a store-specific name to avoid global const collisions.
// ===============================================================
const buildJobSelectionId = () => {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const buildSelectionKey = (selection) => {
  if (!selection || typeof selection !== "object") {
    return "";
  }
  const source =
    typeof selection.source === "string" && selection.source.trim()
      ? selection.source.trim()
      : "Explore";
  const sourceJobId =
    typeof selection.sourceJobId === "string" ? selection.sourceJobId.trim() : "";
  const postingUrl =
    typeof selection.postingUrl === "string" ? selection.postingUrl.trim() : "";
  if (sourceJobId) {
    return `${source}::${sourceJobId}`;
  }
  if (postingUrl) {
    return `${source}::${postingUrl}`;
  }
  return "";
};

// ===============================================================
// WHY: Activity log identity requires a stable posting URL field.
// HOW: Accept alternate URL fields and normalize to postingUrl.
// ===============================================================
const resolveSelectionPostingUrl = (raw) => {
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
};

const normalizeSelection = (raw) => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const postingUrl = resolveSelectionPostingUrl(raw);
  if (!postingUrl) {
    return null;
  }
  const source = typeof raw.source === "string" ? raw.source.trim() : "Explore";
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
    id: typeof raw.id === "string" ? raw.id : buildJobSelectionId(),
    source: source || "Explore",
    sourceJobId,
    title,
    agency,
    location,
    grade,
    postingUrl,
    capturedAt,
  };
  const jobId =
    typeof raw.jobId === "string" && raw.jobId.trim()
      ? raw.jobId.trim()
      : sourceJobId || postingUrl;
  if (jobId) {
    normalized.jobId = jobId;
  }
  const status = normalizeActivityStatus(raw.status, "selected");
  const timestamp =
    typeof raw.timestamp === "string" && raw.timestamp ? raw.timestamp : capturedAt;
  const type =
    typeof raw.type === "string" && raw.type.trim() ? raw.type.trim() : "job_event";
  const reason =
    typeof raw.reason === "string" && raw.reason.trim()
      ? raw.reason.trim()
      : buildActivityReasonFromStatus(status);
  normalized.status = status;
  normalized.type = type;
  normalized.timestamp = timestamp;
  normalized.reason = reason;
  const meta = raw.meta && typeof raw.meta === "object" ? raw.meta : buildActivityMeta(normalized);
  if (meta) {
    normalized.meta = meta;
  }
  if (rawSource) {
    normalized.rawSource = rawSource;
  }
  return normalized;
};

const normalizeResumeTarget = (raw) => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const postingUrl = typeof raw.postingUrl === "string" ? raw.postingUrl.trim() : "";
  if (!postingUrl) {
    return null;
  }
  const source = typeof raw.source === "string" ? raw.source.trim() : "Explore";
  const sourceJobId =
    typeof raw.sourceJobId === "string" ? raw.sourceJobId.trim() : "";
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const agency = typeof raw.agency === "string" ? raw.agency.trim() : "";
  const location = typeof raw.location === "string" ? raw.location.trim() : "";
  const grade = typeof raw.grade === "string" ? raw.grade.trim() : "";
  const addedAt =
    typeof raw.addedAt === "string" ? raw.addedAt : new Date().toISOString();
  const rawSource = typeof raw.rawSource === "string" ? raw.rawSource.trim() : "";
  const normalized = {
    id: typeof raw.id === "string" ? raw.id : buildJobSelectionId(),
    source: source || "Explore",
    sourceJobId,
    title,
    agency,
    location,
    grade,
    postingUrl,
    addedAt,
  };
  if (typeof raw.selectionId === "string") {
    normalized.selectionId = raw.selectionId;
  }
  if (rawSource) {
    normalized.rawSource = rawSource;
  }
  return normalized;
};

// ===============================================================
// WHY: Resume export events must survive reloads without corruption.
// HOW: Normalize fields and reject incomplete entries.
// ===============================================================
const normalizeActivityEvent = (raw) => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const source =
    typeof raw.source === "string" && raw.source.trim()
      ? raw.source.trim()
      : "Resume";
  const timestamp =
    typeof raw.timestamp === "string" && raw.timestamp ? raw.timestamp : "";
  const reason =
    typeof raw.reason === "string" && raw.reason.trim()
      ? raw.reason.trim()
      : title || buildActivityReasonFromStatus(raw.status);
  const safeTitle = title || reason;
  if (!safeTitle || !source || !timestamp || !reason) {
    return null;
  }
  const normalized = {
    id: typeof raw.id === "string" ? raw.id : buildJobSelectionId(),
    type: "resume_event",
    timestamp,
    title: safeTitle,
    source,
    status: normalizeActivityStatus(raw.status, "exported"),
    reason,
  };
  if (typeof raw.jobId === "string" && raw.jobId.trim()) {
    normalized.jobId = raw.jobId.trim();
  }
  if (raw.meta && typeof raw.meta === "object") {
    normalized.meta = raw.meta;
  }
  return normalized;
};

const addActivityEventInState = (state, entry) => {
  const normalized = normalizeActivityEvent(entry);
  if (!normalized) {
    return null;
  }
  state.activityEvents.unshift(normalized);
  if (state.activityEvents.length > MAX_ACTIVITY_EVENTS) {
    state.activityEvents = state.activityEvents.slice(0, MAX_ACTIVITY_EVENTS);
  }
  return normalized;
};

const createEmptyJobSelectionState = () => ({
  recentSelections: [],
  resumeTargets: [],
  activityEvents: [],
  lastSeenActivityAt: null,
  lastSeenResumeAt: null,
});

// ===============================================================
// WHY: Activity Log events must keep a consistent status taxonomy.
// HOW: Normalize incoming values and fall back to safe defaults.
// ===============================================================
const normalizeActivityStatus = (rawStatus, fallback) => {
  if (typeof rawStatus !== "string") {
    return fallback;
  }
  const trimmed = rawStatus.trim();
  if (!trimmed) {
    return fallback;
  }
  const lower = trimmed.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ACTIVITY_STATUS_ORDER, lower)) {
    return lower;
  }
  return fallback;
};

const chooseHigherStatus = (currentStatus, nextStatus) => {
  const normalizedCurrent = normalizeActivityStatus(currentStatus, "viewed");
  const normalizedNext = normalizeActivityStatus(nextStatus, "viewed");
  const currentRank = ACTIVITY_STATUS_ORDER[normalizedCurrent] || 0;
  const nextRank = ACTIVITY_STATUS_ORDER[normalizedNext] || 0;
  return nextRank >= currentRank ? normalizedNext : normalizedCurrent;
};

const buildActivityJobId = (selection) => {
  if (!selection || typeof selection !== "object") {
    return "";
  }
  if (typeof selection.jobId === "string" && selection.jobId.trim()) {
    return selection.jobId.trim();
  }
  if (typeof selection.sourceJobId === "string" && selection.sourceJobId.trim()) {
    return selection.sourceJobId.trim();
  }
  if (typeof selection.postingUrl === "string" && selection.postingUrl.trim()) {
    return selection.postingUrl.trim();
  }
  return "";
};

const buildActivityMeta = (selection) => {
  if (!selection || typeof selection !== "object") {
    return null;
  }
  const meta = {};
  let hasMeta = false;
  if (selection.agency) {
    meta.agency = selection.agency;
    hasMeta = true;
  }
  if (selection.location) {
    meta.location = selection.location;
    hasMeta = true;
  }
  if (selection.grade) {
    meta.grade = selection.grade;
    hasMeta = true;
  }
  return hasMeta ? meta : null;
};

const sanitizeJobSelectionState = (state) => {
  const base = createEmptyJobSelectionState();
  if (!state || typeof state !== "object") {
    return base;
  }
  const recentSelections = [];
  if (Array.isArray(state.recentSelections)) {
    state.recentSelections.forEach((entry) => {
      const safeEntry = normalizeSelection(entry);
      if (safeEntry) {
        recentSelections.push(safeEntry);
      }
    });
  }
  const resumeTargets = [];
  if (Array.isArray(state.resumeTargets)) {
    state.resumeTargets.forEach((entry) => {
      const safeEntry = normalizeResumeTarget(entry);
      if (safeEntry) {
        resumeTargets.push(safeEntry);
      }
    });
  }
  const activityEvents = [];
  if (Array.isArray(state.activityEvents)) {
    state.activityEvents.forEach((entry) => {
      const safeEntry = normalizeActivityEvent(entry);
      if (safeEntry) {
        activityEvents.push(safeEntry);
      }
    });
  }
  const lastSeenActivityAt =
    typeof state.lastSeenActivityAt === "string" ? state.lastSeenActivityAt : null;
  const lastSeenResumeAt =
    typeof state.lastSeenResumeAt === "string" ? state.lastSeenResumeAt : null;
  return {
    recentSelections,
    resumeTargets,
    activityEvents,
    lastSeenActivityAt,
    lastSeenResumeAt,
  };
};

const loadJobSelectionState = (storage) => {
  try {
    const raw = storage.getItem(JOB_SELECTION_STORAGE_KEY);
    if (!raw) {
      return createEmptyJobSelectionState();
    }
    return sanitizeJobSelectionState(JSON.parse(raw));
  } catch (error) {
    return createEmptyJobSelectionState();
  }
};

const persistJobSelectionState = (storage, state) => {
  try {
    const snapshot = sanitizeJobSelectionState(state);
    storage.setItem(JOB_SELECTION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    // Best-effort persistence for local-only state.
  }
};

const resolveActivityTimestamp = (item) => {
  if (!item || typeof item !== "object") {
    return "";
  }
  if (typeof item.timestamp === "string" && item.timestamp) {
    return item.timestamp;
  }
  if (typeof item.capturedAt === "string" && item.capturedAt) {
    return item.capturedAt;
  }
  return "";
};

const calculateUnreadCount = (items, lastSeenActivityAt) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }
  if (!lastSeenActivityAt) {
    return items.length;
  }
  const lastSeen = new Date(lastSeenActivityAt).getTime();
  if (Number.isNaN(lastSeen)) {
    return items.length;
  }
  return items.filter((item) => {
    const captured = new Date(resolveActivityTimestamp(item)).getTime();
    if (Number.isNaN(captured)) {
      return false;
    }
    return captured > lastSeen;
  }).length;
};

// ===============================================================
// WHY: Resume & Career badge tracks new resume targets since last visit.
// HOW: Compare target add timestamps against the last seen marker.
// ===============================================================
const calculateResumeUnreadCount = (items, lastSeenResumeAt) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }
  if (!lastSeenResumeAt) {
    return items.length;
  }
  const lastSeen = new Date(lastSeenResumeAt).getTime();
  if (Number.isNaN(lastSeen)) {
    return items.length;
  }
  return items.filter((item) => {
    const addedAt = new Date(item.addedAt).getTime();
    if (Number.isNaN(addedAt)) {
      return false;
    }
    return addedAt > lastSeen;
  }).length;
};

const buildSelectionDisplayTitle = (selection, isPrivate) => {
  if (isPrivate) {
    return "Job selection hidden";
  }
  if (!selection || typeof selection !== "object") {
    return "Job selection";
  }
  const title = typeof selection.title === "string" ? selection.title.trim() : "";
  if (title) {
    return title;
  }
  return "Job selection";
};

// ===============================================================
// WHY: Recent selections should keep the most specific title seen.
// HOW: Treat placeholder labels as generic so they do not overwrite
//      a real posting title that we already captured.
// ===============================================================
const isGenericSelectionTitle = (rawTitle) => {
  if (typeof rawTitle !== "string") {
    return true;
  }
  const trimmed = rawTitle.trim();
  if (!trimmed) {
    return true;
  }
  const lower = trimmed.toLowerCase();
  if (lower === "job selection") {
    return true;
  }
  if (lower === "selected job") {
    return true;
  }
  if (lower === "selected usajobs posting") {
    return true;
  }
  return false;
};

const buildSelectionDisplayMeta = (selection, isPrivate) => {
  if (isPrivate) {
    return "Details hidden by privacy controls.";
  }
  if (!selection || typeof selection !== "object") {
    return "";
  }
  const meta = [];
  if (selection.agency) {
    meta.push(selection.agency);
  }
  if (selection.location) {
    meta.push(selection.location);
  }
  if (selection.grade) {
    meta.push(selection.grade);
  }
  return meta.length ? meta.join(" · ") : "Posting saved for reference.";
};

// ===============================================================
// WHY: Activity Log must present a single thread per job.
// HOW: Deduplicate on job identity and upgrade statuses in place.
// ===============================================================
const addRecentSelectionInState = (state, selectedJob, status) => {
  const normalized = normalizeSelection(selectedJob);
  if (!normalized) {
    if (isDevRenderer) {
      console.warn("[JobSelectionStore] normalizeSelection rejected", {
        selectedJob,
      });
    }
    return null;
  }
  const nextKey = buildSelectionKey(normalized);
  const existingIndex = state.recentSelections.findIndex((entry) => {
    return buildSelectionKey(entry) === nextKey;
  });
  let baseEntry = normalized;
  if (existingIndex !== -1) {
    const existing = state.recentSelections[existingIndex];
    baseEntry = Object.assign({}, existing, normalized);
    if (
      isGenericSelectionTitle(baseEntry.title) &&
      existing.title &&
      !isGenericSelectionTitle(existing.title)
    ) {
      baseEntry.title = existing.title;
    }
    baseEntry.id = existing.id;
    baseEntry.status = chooseHigherStatus(existing.status, status);
    baseEntry.type = existing.type || "job_event";
    state.recentSelections.splice(existingIndex, 1);
  } else {
    baseEntry.status = normalizeActivityStatus(status, "selected");
    baseEntry.type = "job_event";
  }
  baseEntry.reason = buildActivityReasonFromStatus(baseEntry.status);
  baseEntry.capturedAt = new Date().toISOString();
  baseEntry.timestamp = baseEntry.capturedAt;
  baseEntry.jobId = buildActivityJobId(baseEntry);
  const meta = buildActivityMeta(baseEntry);
  if (meta) {
    baseEntry.meta = meta;
  }
  state.recentSelections.unshift(baseEntry);
  if (state.recentSelections.length > MAX_RECENT_SELECTIONS) {
    state.recentSelections = state.recentSelections.slice(0, MAX_RECENT_SELECTIONS);
  }
  return baseEntry;
};

const addResumeTargetInState = (state, selectionOrId) => {
  let source = null;
  if (typeof selectionOrId === "string") {
    source = state.recentSelections.find((entry) => entry.id === selectionOrId) || null;
  } else if (selectionOrId && typeof selectionOrId === "object") {
    source = normalizeSelection(selectionOrId);
  }
  if (!source) {
    return null;
  }
  const targetCandidate = normalizeResumeTarget(
    Object.assign({}, source, {
      selectionId: source.id,
      addedAt: new Date().toISOString(),
    })
  );
  if (!targetCandidate) {
    return null;
  }
  const nextKey = buildSelectionKey(targetCandidate);
  const existingIndex = state.resumeTargets.findIndex((entry) => {
    return buildSelectionKey(entry) === nextKey;
  });
  if (existingIndex !== -1) {
    const existing = state.resumeTargets[existingIndex];
    state.resumeTargets[existingIndex] = Object.assign({}, existing, targetCandidate, {
      id: existing.id,
    });
    return state.resumeTargets[existingIndex];
  }
  state.resumeTargets.unshift(targetCandidate);
  return targetCandidate;
};

const removeResumeTargetInState = (state, targetId) => {
  const index = state.resumeTargets.findIndex((entry) => entry.id === targetId);
  if (index === -1) {
    return;
  }
  state.resumeTargets.splice(index, 1);
};

const setSelectedJobFromHistoryInState = (state, selectionId) => {
  const entry = state.recentSelections.find((item) => item.id === selectionId);
  if (!entry) {
    return null;
  }
  return normalizeSelection(entry);
};

/**
 * Create a Job Selection store.
 * @param {{ getItem: function(string): (string | null), setItem: function(string, string): void }} storage
 * @returns {JobSelectionStore}
 */
const createJobSelectionStore = (storage) => {
  let state = loadJobSelectionState(storage);
  const listeners = [];

  const notify = (reason) => {
    listeners.forEach(function (listener) {
      listener(state, reason || "");
    });
  };

  // ===============================================================
  // WHY: Storage sync must not rewrite state in a loop.
  // HOW: Allow refreshes that skip persistence writes.
  // ===============================================================
  const applyState = (nextState, reason, shouldPersist) => {
    state = sanitizeJobSelectionState(nextState);
    if (shouldPersist) {
      persistJobSelectionState(storage, state);
    }
    notify(reason);
  };
  const setState = (nextState, reason) => {
    applyState(nextState, reason, true);
  };

  const updateState = (mutator, reason) => {
    const nextState = sanitizeJobSelectionState(state);
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
    addRecentSelection: function (selectedJob) {
      let added = null;
      updateState(function (nextState) {
        added = addRecentSelectionInState(nextState, selectedJob, "selected");
      }, "recent-selection-add");
      return added;
    },
    logJobViewed: function (selectedJob) {
      let added = null;
      updateState(function (nextState) {
        added = addRecentSelectionInState(nextState, selectedJob, "viewed");
      }, "activity-job-viewed");
      return added;
    },
    logJobSelected: function (selectedJob) {
      let added = null;
      updateState(function (nextState) {
        added = addRecentSelectionInState(nextState, selectedJob, "selected");
      }, "activity-job-selected");
      return added;
    },
    logJobPromoted: function (selectionOrId) {
      let added = null;
      updateState(function (nextState) {
        const target = addResumeTargetInState(nextState, selectionOrId);
        if (target) {
          added = addRecentSelectionInState(nextState, target, "promoted");
        }
      }, "activity-job-promoted");
      return added;
    },
    logResumeExported: function (payload) {
      let added = null;
      updateState(function (nextState) {
        const reason =
          payload && typeof payload.reason === "string" && payload.reason.trim()
            ? payload.reason.trim()
            : buildActivityReasonFromStatus("exported");
        const jobId =
          payload && typeof payload.jobId === "string" ? payload.jobId.trim() : "";
        const title =
          payload && typeof payload.title === "string" ? payload.title.trim() : "";
        const source =
          payload && typeof payload.source === "string" && payload.source.trim()
            ? payload.source.trim()
            : "Resume";
        const timestamp = new Date().toISOString();
        added = addActivityEventInState(nextState, {
          id: buildJobSelectionId(),
          type: "resume_event",
          timestamp,
          title: title || "Resume export",
          reason,
          source,
          status: "exported",
          jobId: jobId,
          meta: jobId ? { jobId: jobId } : null,
        });
      }, "activity-resume-exported");
      return added;
    },
    addToResumeTargets: function (selectionOrId) {
      let added = null;
      updateState(function (nextState) {
        added = addResumeTargetInState(nextState, selectionOrId);
      }, "resume-target-add");
      return added;
    },
    removeFromResumeTargets: function (targetId) {
      updateState(function (nextState) {
        removeResumeTargetInState(nextState, targetId);
      }, "resume-target-remove");
    },
    setSelectedJobFromHistory: function (selectionId) {
      const snapshot = sanitizeJobSelectionState(state);
      return setSelectedJobFromHistoryInState(snapshot, selectionId);
    },
    markActivityLogRead: function () {
      updateState(function (nextState) {
        nextState.lastSeenActivityAt = new Date().toISOString();
      }, "activity-log-read");
    },
    markResumeTargetsRead: function () {
      updateState(function (nextState) {
        nextState.lastSeenResumeAt = new Date().toISOString();
      }, "resume-targets-read");
    },
    clearActivityLog: function () {
      updateState(function (nextState) {
        nextState.recentSelections = [];
        nextState.activityEvents = [];
        nextState.lastSeenActivityAt = null;
      }, "activity-log-reset");
    },
    // ===============================================================
    // WHY: Detached windows must rehydrate recent selections quickly.
    // HOW: Pull storage state and notify subscribers without persisting.
    // ===============================================================
    refreshFromStorage: function (reason) {
      const nextState = loadJobSelectionState(storage);
      applyState(nextState, reason || "activity-log-refresh", false);
    },
  };
};

const PathOSJobSelectionStore = {
  JOB_SELECTION_STORAGE_KEY,
  MAX_RECENT_SELECTIONS,
  MAX_ACTIVITY_EVENTS,
  buildSelectionKey,
  createEmptyJobSelectionState,
  sanitizeJobSelectionState,
  loadJobSelectionState,
  persistJobSelectionState,
  calculateUnreadCount,
  calculateResumeUnreadCount,
  buildSelectionDisplayTitle,
  buildSelectionDisplayMeta,
  addRecentSelectionInState,
  addResumeTargetInState,
  removeResumeTargetInState,
  setSelectedJobFromHistoryInState,
  createJobSelectionStore,
};

// ===============================================================
// WHY: Classic scripts share a global scope across stores.
// HOW: Use a store-specific export name to avoid collisions.
// ===============================================================
const jobSelectionStoreExport = PathOSJobSelectionStore;

if (typeof window !== "undefined") {
  window.PathOSJobSelectionStore = jobSelectionStoreExport;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = jobSelectionStoreExport;
}
