import {
  buildDecisionSummary,
  buildActivityCurrentJobIndicator,
  incrementBadgeWithToast,
  deriveAgencyAbbrev,
  formatActivityLogTimestamp,
  formatResumeTimestamp,
  formatTimestamp,
  normalizeActivityErrorMessage,
} from "./lib/renderer-helpers.js";
import {
  buildResumeCurrentJobActionOutput,
  buildResumeCurrentJobActionState,
  buildResumeCurrentJobViewModel,
  RESUME_CURRENT_JOB_ACTIONS,
} from "./resume-current-job.js";
import {
  buildFallbackActiveJobContextStore,
  buildFallbackConversationStore,
  buildFallbackJobSelectionStore,
  buildFallbackResumeCareerStore,
  buildFallbackSelectedJobStore,
} from "./stores/fallback-stores.js";
import { createMemoryStorage, createSafeStorage } from "./stores/renderer-storage.js";
import {
  initWorkspaceFocusStore,
  getWorkspaceMode,
  setWorkspaceMode,
  toggleWorkspaceMode,
  subscribe,
  clearWorkspaceModeFromStorage,
} from "./workspace-focus-store.js";

export const wireRendererReloadButton = (targetDocument, deps = {}) => {
  const doc = targetDocument || document;
  const button = deps.button || doc.getElementById("renderer-reload-btn");
  if (!button) {
    return;
  }
  const workbench =
    Object.prototype.hasOwnProperty.call(deps, "workbench") ? deps.workbench : window.workbench;
  const locationRef = deps.location || location;
  button.addEventListener("click", () => {
    if (workbench && typeof workbench.reload === "function") {
      workbench.reload();
      return;
    }
    locationRef.reload();
  });
};

export const mergeUsaJobsSelection = (current, selection, chooseTitle) => {
  if (!selection) {
    return null;
  }
  const isSamePosting =
    current && current.postingUrl && current.postingUrl === selection.postingUrl;
  const hasPriorTitle =
    Boolean(isSamePosting && current && typeof current.title === "string" && current.title.trim());
  const fallbackTitle = hasPriorTitle ? "" : "Selected USAJOBS posting";
  const nextTitle = chooseTitle
    ? chooseTitle(isSamePosting && current ? current.title : "", selection.title, fallbackTitle)
    : selection.title || (hasPriorTitle ? current.title : fallbackTitle);
  return Object.assign({}, selection, {
    title: nextTitle,
    agency: selection.agency || (isSamePosting && current && current.agency ? current.agency : ""),
    location: isSamePosting && current && current.location ? current.location : selection.location,
    grade: isSamePosting && current && current.grade ? current.grade : selection.grade,
  });
};

export const bootstrapRenderer = () => {
  window.__PATHOS_RENDERER_READY__ = false;

// ===============================================================
// WHY: Prevent silent renderer failures that break navigation.
// HOW: Surface top-level errors with a visible degraded banner.
// ===============================================================
const hideRendererBanner = (bannerId) => {
  const banner = document.getElementById(bannerId);
  if (!banner) {
    return;
  }
  banner.hidden = true;
  banner.style.display = "none";
};

const hideAllRendererBanners = () => {
  hideRendererBanner("renderer-fatal-banner");
  hideRendererBanner("renderer-error-banner");
};

hideAllRendererBanners();

const showRendererFatalBanner = (message) => {
  const banner = document.getElementById("renderer-fatal-banner");
  if (!banner) {
    return;
  }
  hideRendererBanner("renderer-error-banner");
  if (typeof message === "string" && message.trim()) {
    banner.textContent = message.trim();
  }
  banner.hidden = false;
  banner.style.display = "flex";
};

const appendActivityLogEntry = (message, options = {}) => {
  const list = document.querySelector("[data-activity-system-list]");
  const empty = /** @type {HTMLElement | null} */ (
    document.querySelector("[data-activity-system-empty]")
  );
  if (!list || typeof message !== "string" || !message.trim()) {
    return;
  }
  const item = document.createElement("li");
  const timestamp = document.createElement("span");
  timestamp.className = "activity-time";
  timestamp.textContent = options.timestamp || formatActivityLogTimestamp();
  item.appendChild(timestamp);
  item.appendChild(document.createTextNode(" "));
  if (options.level) {
    const level = document.createElement("span");
    level.className = "activity-level";
    level.dataset.level = options.level;
    level.textContent = options.level;
    item.appendChild(level);
    item.appendChild(document.createTextNode(" "));
  }
  item.appendChild(document.createTextNode(message.trim()));
  list.insertBefore(item, list.firstChild);
  if (empty) {
    empty.hidden = list.children.length > 0;
  }
};

const rendererDiagnostics =
  window.PathOSRendererDiagnostics &&
  typeof window.PathOSRendererDiagnostics.createRendererDiagnostics === "function"
    ? window.PathOSRendererDiagnostics.createRendererDiagnostics({
        getBannerById: (bannerId) => document.getElementById(bannerId),
        appendActivityLogEntry,
        normalizeActivityErrorMessage,
        isReady: () => Boolean(window.__PATHOS_RENDERER_READY__),
        onConsoleError: (label, error) => console.error(label, error),
      })
    : null;

const handleRendererError = (label, error) => {
  if (rendererDiagnostics) {
    rendererDiagnostics.handleRendererError(label, error);
    return;
  }
  console.error(label, error);
  const errorDetail = normalizeActivityErrorMessage(error);
  const errorSuffix = errorDetail ? ` (${errorDetail})` : "";
  if (!window.__PATHOS_RENDERER_READY__) {
    showRendererFatalBanner(
      "PathOS UI failed to initialize (renderer error). Open DevTools to view details."
    );
    appendActivityLogEntry(
      `UI failed to initialize (renderer error). Open DevTools.${errorSuffix}`,
      {
        level: "error",
      }
    );
    return;
  }
  hideAllRendererBanners();
  appendActivityLogEntry(`Renderer runtime error${errorSuffix}`, {
    level: "error",
  });
};

const markRendererReady = () => {
  window.__PATHOS_RENDERER_READY__ = true;
  if (rendererDiagnostics) {
    rendererDiagnostics.markRendererReady();
    return;
  }
  hideAllRendererBanners();
  appendActivityLogEntry("UI initialized successfully", { level: "info" });
};

window.addEventListener("error", (event) => {
  const error = event && event.error ? event.error : event;
  handleRendererError("[Renderer] Unhandled error", error);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event && event.reason ? event.reason : event;
  handleRendererError("[Renderer] Unhandled rejection", reason);
});

// ===============================================================
// WHY: This renderer script owns the PathOS Desktop UI behavior.
// HOW: It binds UI events, syncs local state, and renders surfaces.
// ===============================================================

const ACTIVITY_LOG_STORAGE_KEY = "pathos.activityLogCollapsed";
// ===============================================================
// WHY: Explore recovery should always return to the same trusted home URL.
// HOW: Centralize the USAJOBS home target for reuse in restore flows.
// ===============================================================
const USAJOBS_HOME_URL = "https://www.usajobs.gov/";
// ===============================================================
// WHY: Blocked-navigation logs are only useful during local debugging.
// HOW: Detect dev builds by checking for the packaged app path marker.
// ===============================================================
const isDevRenderer = !location.pathname.includes("app.asar");
// ===============================================================
// WHY: USAJOBS URL helpers are shared with tests and the renderer.
// HOW: Load the shared helper module before wiring popouts and guards.
// ===============================================================
const usaJobsHelpers = /** @type {any} */ (window.PathOSUsaJobsHelpers);
const USAJOBS_ALLOWED_PREFIX = "https://www.usajobs.gov/";
const USAJOBS_SEARCH_URL = "https://www.usajobs.gov/Search/Results";
const isValidUsaJobsUrl =
  usaJobsHelpers && typeof usaJobsHelpers.isValidUsaJobsUrl === "function"
    ? usaJobsHelpers.isValidUsaJobsUrl
    : (rawUrl) => {
        if (typeof rawUrl !== "string") {
          return false;
        }
        const trimmed = rawUrl.trim();
        if (!trimmed) {
          return false;
        }
        return trimmed.indexOf(USAJOBS_ALLOWED_PREFIX) === 0;
      };
const buildUsaJobsFallbackUrl =
  usaJobsHelpers && typeof usaJobsHelpers.buildUsaJobsFallbackUrl === "function"
    ? usaJobsHelpers.buildUsaJobsFallbackUrl
    : (role) => {
        const title =
          role && typeof role.title === "string" ? role.title.trim() : "";
        const series =
          role && typeof role.series === "string" ? role.series.trim() : "";
        const keywords = [title, series].filter(Boolean).join(" ");
        const safeKeywords = keywords || "federal jobs";
        const params = [`k=${encodeURIComponent(safeKeywords)}`];
        if (series) {
          params.push(`j=${encodeURIComponent(series)}`);
        }
        return `${USAJOBS_SEARCH_URL}?${params.join("&")}`;
      };
const resolveUsaJobsReferenceUrl =
  usaJobsHelpers && typeof usaJobsHelpers.resolveUsaJobsReferenceUrl === "function"
    ? usaJobsHelpers.resolveUsaJobsReferenceUrl
    : (role) => {
        const rawUrl =
          role && typeof role.usajobsUrl === "string" ? role.usajobsUrl.trim() : "";
        if (isValidUsaJobsUrl(rawUrl)) {
          return rawUrl;
        }
        const fallbackUrl = buildUsaJobsFallbackUrl(role);
        console.warn("[ExplorePathOS] USAJOBS URL invalid; using fallback.", {
          roleId: role && role.id ? role.id : "",
          url: rawUrl,
          fallbackUrl,
        });
        return fallbackUrl;
      };
const isAllowedBenefitsUrl =
  usaJobsHelpers && typeof usaJobsHelpers.isAllowedBenefitsUrl === "function"
    ? usaJobsHelpers.isAllowedBenefitsUrl
    : (rawUrl) => {
        if (typeof rawUrl !== "string") {
          return false;
        }
        const trimmed = rawUrl.trim();
        if (!trimmed) {
          return false;
        }
        if (trimmed.indexOf("https://") === 0) {
          return true;
        }
        if (trimmed.indexOf("http://") === 0) {
          return true;
        }
        return false;
      };

let conversationStore = /** @type {any} */ (window.PathAdvisorConversationStore);
if (!conversationStore) {
  console.error("PathAdvisorConversationStore missing, using fallback store.");
  conversationStore = buildFallbackConversationStore();
}
const CONVERSATION_STORAGE_KEY = conversationStore.CONVERSATION_STORAGE_KEY;

let storageCandidate = null;
try {
  storageCandidate =
    typeof localStorage !== "undefined" ? localStorage : createMemoryStorage();
} catch (error) {
  storageCandidate = createMemoryStorage();
}

const conversationStorage = createSafeStorage(storageCandidate);
const activityStorage = createSafeStorage(storageCandidate);
const hasNativeLocalStorage =
  typeof localStorage !== "undefined" && storageCandidate === localStorage;

let resumeCareerStoreApi = /** @type {any} */ (window.PathOSResumeCareerStore);
if (!resumeCareerStoreApi) {
  console.error("PathOSResumeCareerStore missing, using fallback store.");
  resumeCareerStoreApi = buildFallbackResumeCareerStore();
}
const resumeCareerStorage = createSafeStorage(storageCandidate);
const resumeCareerStore = resumeCareerStoreApi.createResumeCareerStore(
  resumeCareerStorage,
  { seedResumes: false }
);

let activeJobContextApi = /** @type {any} */ (window.PathOSActiveJobContext);
if (!activeJobContextApi) {
  console.error("PathOSActiveJobContext missing, using fallback store.");
  activeJobContextApi = buildFallbackActiveJobContextStore();
}
const activeJobContextStore = activeJobContextApi.createActiveJobContextStore();

let selectedJobStoreApi = /** @type {any} */ (window.PathOSSelectedJobStore);
if (!selectedJobStoreApi) {
  console.error("PathOSSelectedJobStore missing, using fallback store.");
  selectedJobStoreApi = buildFallbackSelectedJobStore();
}
const selectedJobStorage = createSafeStorage(storageCandidate);
const selectedJobStore = selectedJobStoreApi.createSelectedJobStore(selectedJobStorage);

let jobSelectionStoreApi = /** @type {any} */ (window.PathOSJobSelectionStore);
if (!jobSelectionStoreApi) {
  console.error("PathOSJobSelectionStore missing, using fallback store.");
  jobSelectionStoreApi = buildFallbackJobSelectionStore();
}
const jobSelectionStorage = createSafeStorage(storageCandidate);
const jobSelectionStore = jobSelectionStoreApi.createJobSelectionStore(jobSelectionStorage);

// ===============================================================
// WHY: Selection pipelines should log Activity entries immediately.
// HOW: Record once per selection and skip the follow-up subscriber.
// ===============================================================
let skipNextRecentSelectionAdd = false;
const resolveSelectionPostingUrl = (selection) => {
  if (!selection || typeof selection !== "object") {
    return "";
  }
  // Priority order mirrors the selection pipeline (e.g. USAJOBS uses usajobsUrl).
  const candidates = [
    selection.postingUrl,
    selection.announcementUrl,
    selection.usajobsUrl,
    selection.url,
    selection.postingUri,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "";
};
const ensureSelectionPostingUrl = (selection) => {
  if (!selection || typeof selection !== "object") {
    return selection;
  }
  const postingUrl = resolveSelectionPostingUrl(selection);
  if (!postingUrl) {
    return selection;
  }
  if (typeof selection.postingUrl === "string" && selection.postingUrl.trim()) {
    return selection;
  }
  return Object.assign({}, selection, { postingUrl });
};
const recordRecentSelection = (selectedJob) => {
  if (!selectedJob) {
    return null;
  }
  // job-selection-store drops selections without a postingUrl, so normalize here.
  const normalizedSelection = ensureSelectionPostingUrl(selectedJob);
  const added = jobSelectionStore.logJobSelected(normalizedSelection);
  if (isDevRenderer && !added) {
    console.warn("[ActivityLog] addRecentSelection rejected", {
      selection: normalizedSelection,
      postingUrl: resolveSelectionPostingUrl(normalizedSelection),
      reason: "recordRecentSelection",
    });
  }
  if (added) {
    skipNextRecentSelectionAdd = true;
  }
  return added;
};

// ===============================================================
// WHY: Detached windows must mirror job context in real time.
// HOW: Listen for storage updates and refresh in-memory stores.
// ===============================================================
const selectedJobStorageKey = selectedJobStoreApi.SELECTED_JOB_STORAGE_KEY;
const jobSelectionStorageKey = jobSelectionStoreApi.JOB_SELECTION_STORAGE_KEY;
const refreshSelectedJobFromStorage = (reason) => {
  if (selectedJobStore && typeof selectedJobStore.refreshFromStorage === "function") {
    selectedJobStore.refreshFromStorage(reason || "selected-job-storage-sync");
  }
};
const refreshJobSelectionFromStorage = (reason) => {
  if (jobSelectionStore && typeof jobSelectionStore.refreshFromStorage === "function") {
    jobSelectionStore.refreshFromStorage(reason || "activity-log-storage-sync");
  }
};
if (hasNativeLocalStorage) {
  window.addEventListener("storage", (event) => {
    if (!event || !event.key) {
      return;
    }
    if (event.key === selectedJobStorageKey) {
      refreshSelectedJobFromStorage("selected-job-storage-sync");
    }
    if (event.key === jobSelectionStorageKey) {
      refreshJobSelectionFromStorage("activity-log-storage-sync");
    }
  });
}

// ===============================================================
// WHY: Provide a clean, professional demo response for each prompt.
// HOW: Build a short assistant reply without any automation promises.
// ===============================================================
const ASSISTANT_TEMPLATES = {
  "explain-page": {
    summary:
      "I can translate the section into plain language and flag anything that needs confirmation.",
    question: "Which part of the posting is most confusing right now?",
  },
  qualified: {
    summary:
      "I can compare the requirements with your experience highlights and spot gaps.",
    question: "Which requirement feels most borderline today?",
  },
  "prepare-next": {
    summary:
      "I can outline a focused preparation checklist tied to the role requirements.",
    question: "What do you need to prepare first?",
  },
  freeform: {
    summary: "I can help clarify the request and highlight what to verify next.",
    question: "What is the single decision you need to make next?",
  },
};

const DEFAULT_DECISION_THREAD = {
  title: "",
  context: "",
  keyFactors: "",
  tradeoffs: "",
  recommendation: "",
  nextSteps: "",
};

// ===============================================================
// WHY: Decision Mode is not part of the default PathAdvisor experience.
// HOW: Keep the scaffolding but disable it behind a single toggle.
// ===============================================================
const DECISION_MODE_ENABLED = false;

const pathAdvisorState = {
  decisionThread: Object.assign({}, DEFAULT_DECISION_THREAD),
  liveWindowOpen: false,
  decisionWindowOpen: false,
  decisionOverlayOpen: false,
  alertFocusId: null,
  mode: "main",
};

// ===============================================================
// WHY: The popout must own the live advisor when it is open.
// HOW: Track the current owner and hide the main rail when needed.
// ===============================================================
const advisorSurfaceOwnerState = {
  owner: "main",
};

const isValidAdvisorSurfaceOwner = (owner) =>
  owner === "main" || owner === "benefits-popout";

const applyAdvisorSurfaceOwner = (elements, owner) => {
  if (!isValidAdvisorSurfaceOwner(owner)) {
    return;
  }
  advisorSurfaceOwnerState.owner = owner;
  document.body.classList.toggle(
    "advisor-owner-popout",
    owner === "benefits-popout"
  );
  if (elements && elements.liveSurfaceSidebar) {
    elements.liveSurfaceSidebar.hidden = owner !== "main";
  }
  if (elements && elements.liveSurfaceWindow) {
    elements.liveSurfaceWindow.hidden = owner !== "main";
  }
};

const liveSurfaces = [];
const decisionSurfaces = [];
let applyingRemoteDecisionThread = false;

// Read-only: missing/null => collapsed; "false" => expanded; else => collapsed. Does not write.
const getStoredActivityLogCollapsed = () => {
  const stored = activityStorage.getItem(ACTIVITY_LOG_STORAGE_KEY);
  if (stored === "false") return false;
  return true;
};

const resizeUsajobsViewportForTray = () => {
  if (activeWorkspaceView !== "explore") {
    return;
  }
  const wl = /** @type {HTMLElement | null} */ (document.querySelector(".workspace-left"));
  const clip = /** @type {HTMLElement | null} */ (
    document.querySelector(".usajobs-viewport-clip")
  );
  const tray = /** @type {HTMLElement | null} */ (
    document.querySelector(".activity-tray-container")
  );
  if (!wl || !clip || !tray) {
    return;
  }
  const wlRect = wl.getBoundingClientRect();
  const clipRect = clip.getBoundingClientRect();
  const trayRect = tray.getBoundingClientRect();
  const headerOffset = clipRect.top - wlRect.top;
  const available = wlRect.height - headerOffset - trayRect.height;
  const nextH = Math.max(200, Math.floor(available));
  clip.style.height = `${nextH}px`;
  clip.style.maxHeight = `${nextH}px`;
  const usaJobsViewport = document.getElementById("usajobs-viewport");
  if (usaJobsViewport) {
    usaJobsViewport.style.height = "100%";
    usaJobsViewport.style.maxHeight = "100%";
  }
  const usaJobsWebview = /** @type {HTMLElement | null} */ (clip.querySelector("webview"));
  if (usaJobsWebview) {
    usaJobsWebview.style.height = "100%";
    usaJobsWebview.style.maxHeight = "100%";
  }
};

// WHY: Day 65 – Tray container wraps .activity-log; collapsed state must sync so overlay height is correct.
// HOW: Toggle is-collapsed and data-collapsed on both log and its parent .activity-tray-container (if any).
const syncWorkspaceLeftTrayState = (log, isCollapsed) => {
  const workspaceLeft =
    log && typeof log.closest === "function"
      ? log.closest(".workspace-left")
      : document.querySelector(".workspace-left");
  if (!workspaceLeft) {
    return;
  }
  const collapsed =
    typeof isCollapsed === "boolean"
      ? isCollapsed
      : !log || log.dataset.collapsed !== "false";
  workspaceLeft.classList.toggle("activity-tray-open", !collapsed);
  workspaceLeft.classList.toggle(
    "activity-tray-route-explore",
    activeWorkspaceView === "explore"
  );
};

const setCollapsedState = (log, toggle, isCollapsed) => {
  log.classList.toggle("is-collapsed", isCollapsed);
  log.dataset.collapsed = isCollapsed ? "true" : "false";
  const tray = log.parentElement && log.parentElement.classList.contains("activity-tray-container")
    ? log.parentElement
    : null;
  if (tray) {
    tray.classList.toggle("is-collapsed", isCollapsed);
    tray.classList.toggle("activity-tray--collapsed", isCollapsed);
    tray.classList.toggle("activity-tray--open", !isCollapsed);
    tray.dataset.collapsed = isCollapsed ? "true" : "false";
  }
  if (toggle) {
    toggle.textContent = isCollapsed ? "Expand" : "Collapse";
    toggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
  }
  syncWorkspaceLeftTrayState(log, isCollapsed);
  resizeUsajobsViewportForTray();
  window.requestAnimationFrame(() => {
    resizeUsajobsViewportForTray();
  });
};

// ===============================================================
// WHY: Detached windows share a single renderer bundle.
// HOW: Use the query param to choose the active surface.
// ===============================================================
const getModeFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  if (mode === "live") {
    return "live";
  }
  if (mode === "decision") {
    return "decision";
  }
  return "main";
};

const applyModeLayout = (mode) => {
  pathAdvisorState.mode = mode;
  document.body.classList.remove("mode-main", "mode-live", "mode-decision");
  document.body.classList.add(`mode-${mode}`);
  const appShell = document.getElementById("app-shell");
  const liveWindow = document.getElementById("live-advisor-window");
  const decisionWindow = document.getElementById("decision-view-window");
  if (appShell) {
    appShell.hidden = mode !== "main";
  }
  if (liveWindow) {
    liveWindow.hidden = mode !== "live";
  }
  if (decisionWindow) {
    decisionWindow.hidden = mode !== "decision";
  }
};

// ===============================================================
// WHY: Conversations must persist locally and sync across windows.
// HOW: Use the shared conversation store helpers for all mutations.
// ===============================================================
const createEmptyConversationState = conversationStore.createEmptyConversationState;
const sanitizeConversationState = conversationStore.sanitizeConversationState;
const ensureActiveThread = conversationStore.ensureActiveThread;
const createThreadInState = conversationStore.createThreadInState;
const addMessageToActiveThreadInState =
  conversationStore.addMessageToActiveThread;
const selectThreadInState = conversationStore.selectThread;
const renameThreadInState = conversationStore.renameThread;
const deleteThreadInState = conversationStore.deleteThread;
const clearThreadInState = conversationStore.clearThread;
const exportThreadMarkdown = conversationStore.exportThreadMarkdown;
const exportThreadJson = conversationStore.exportThreadJson;
const loadConversationState = conversationStore.loadConversationState;
const persistConversationState = conversationStore.persistConversationState;

let conversationState = loadConversationState(conversationStorage);
ensureActiveThread(conversationState);
persistConversationState(conversationStorage, conversationState);

// WHY: Rendering relies on a single active thread reference.
// HOW: Resolve the active id to a thread object, falling back safely.
const getActiveThread = () => {
  ensureActiveThread(conversationState);
  return (
    conversationState.threads.find(
      (thread) => thread.id === conversationState.activeThreadId
    ) || conversationState.threads[0]
  );
};

const getDecisionThread = () => {
  if (!pathAdvisorState.decisionThread) {
    pathAdvisorState.decisionThread = Object.assign({}, DEFAULT_DECISION_THREAD);
  }
  return pathAdvisorState.decisionThread;
};

const setDecisionThread = (thread) => {
  const base = Object.assign({}, DEFAULT_DECISION_THREAD);
  if (thread && typeof thread === "object") {
    pathAdvisorState.decisionThread = {
      title: typeof thread.title === "string" ? thread.title : base.title,
      context: typeof thread.context === "string" ? thread.context : base.context,
      keyFactors:
        typeof thread.keyFactors === "string" ? thread.keyFactors : base.keyFactors,
      tradeoffs:
        typeof thread.tradeoffs === "string" ? thread.tradeoffs : base.tradeoffs,
      recommendation:
        typeof thread.recommendation === "string"
          ? thread.recommendation
          : base.recommendation,
      nextSteps:
        typeof thread.nextSteps === "string" ? thread.nextSteps : base.nextSteps,
    };
  } else {
    pathAdvisorState.decisionThread = base;
  }
  renderDecisionThread();
};

const publishDecisionThreadUpdate = (thread) => {
  setDecisionThread(thread);
  if (applyingRemoteDecisionThread) {
    return;
  }
  if (
    window.pathadvisorThreads &&
    window.pathadvisorThreads.updateDecisionThread
  ) {
    window.pathadvisorThreads.updateDecisionThread(thread);
  }
};

// ===============================================================
// WHY: Each user message should appear as a visible conversation turn.
// HOW: Append a user message and a demo assistant response together.
// ===============================================================
const buildAssistantResponse = (intent, request) => {
  const template = ASSISTANT_TEMPLATES[intent] || ASSISTANT_TEMPLATES.freeform;
  const parts = [];
  if (template.summary) {
    parts.push(template.summary);
  }
  if (template.question) {
    parts.push(template.question);
  }
  return parts.join(" ");
};

const appendConversationTurn = (intent, request) => {
  const safeRequest = request && request.trim() ? request.trim() : "";
  if (!safeRequest) {
    return;
  }
  addMessageToActiveThread("user", safeRequest);
  addMessageToActiveThread("assistant", buildAssistantResponse(intent, safeRequest));
};

// ===============================================================
// WHY: Conversation actions must be reused across docked and detached UIs.
// HOW: Centralize thread mutations and re-render the shared surfaces.
// ===============================================================
// WHY: All conversation mutations must re-render every open surface.
// HOW: Centralize the render fan-out in a single helper.
const syncConversationUi = () => {
  renderLiveThread();
  renderConversationsView();
};

// WHY: Storage-backed state needs consistent validation and persistence.
// HOW: Sanitize, mutate, save, and then notify the UI in one path.
const updateConversationState = (mutator) => {
  const nextState = sanitizeConversationState(conversationState);
  mutator(nextState);
  ensureActiveThread(nextState);
  conversationState = nextState;
  persistConversationState(conversationStorage, conversationState);
  syncConversationUi();
};

// WHY: The newest activity should surface at the top of the list.
// HOW: Move the active thread to the front without rebuilding arrays.
// WHY: Thread selection needs to update every surface immediately.
// HOW: Persist the active thread id and re-render in one mutation.
const selectThread = (threadId) => {
  updateConversationState((state) => {
    selectThreadInState(state, threadId);
  });
};

// WHY: New threads must be created from any surface control.
// HOW: Delegate to the shared state helper that seeds defaults.
const createThread = () => {
  updateConversationState((state) => {
    createThreadInState(state);
  });
};

// WHY: Renaming is a lightweight way to keep history scannable.
// HOW: Update the title, bump updatedAt, and promote it.
const renameThread = (threadId, nextTitle) => {
  updateConversationState((state) => {
    renameThreadInState(state, threadId, nextTitle);
  });
};

// WHY: Users must be able to remove old threads safely.
// HOW: Confirm in the UI, then remove and fall back to a new thread.
const deleteThread = (threadId) => {
  updateConversationState((state) => {
    deleteThreadInState(state, threadId);
  });
};

// WHY: Clear should keep the thread shell without deleting history metadata.
// HOW: Reset messages and update timestamps in place.
const clearThread = (threadId) => {
  updateConversationState((state) => {
    clearThreadInState(state, threadId);
  });
};

// WHY: Messages are the atomic unit of the chat UI.
// HOW: Append, update timestamps, and derive titles on the first user turn.
const addMessageToActiveThread = (role, content) => {
  updateConversationState((state) => {
    addMessageToActiveThreadInState(state, role, content);
  });
};

// WHY: Export is a single user action that yields two artifacts.
// HOW: Copy Markdown to clipboard and trigger a JSON download.
const exportActiveThread = () => {
  const thread = getActiveThread();
  const markdown = exportThreadMarkdown(thread);
  if (markdown && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(markdown).catch(() => {});
  }
  const json = exportThreadJson(thread);
  if (json) {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pathadvisor-thread-${thread.id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
};

// WHY: Future privacy controls need a single "nuke local data" entry point.
// HOW: Reset store state and seed the first thread again.
const resetAllConversations = () => {
  updateConversationState((state) => {
    const nextState = createEmptyConversationState();
    createThreadInState(nextState);
    state.threads = nextState.threads;
    state.activeThreadId = nextState.activeThreadId;
    state.threadCounter = nextState.threadCounter;
  });
  if (jobSelectionStore && typeof jobSelectionStore.clearActivityLog === "function") {
    jobSelectionStore.clearActivityLog();
  }
  // Day 64: Delete All Local Data must wipe workspace focus preference.
  clearWorkspaceModeFromStorage();
  setWorkspaceMode("standard");
};

// ===============================================================
// WHY: Scroll + composer layout should stay reliable as input grows.
// HOW: Measure the composer, pad the feed, and auto-grow the textarea.
// ===============================================================
const applyLiveFeedPadding = (elements) => {
  if (!elements || !elements.briefingFeed || !elements.inputSection) {
    return;
  }
  const composerHeight = elements.inputSection.getBoundingClientRect().height;
  const padding = Math.max(24, Math.round(composerHeight + 12));
  elements.briefingFeed.style.paddingBottom = `${padding}px`;
};

const scrollFeedToBottom = (elements) => {
  if (!elements || !elements.briefingFeed) {
    return;
  }
  elements.briefingFeed.scrollTop = elements.briefingFeed.scrollHeight;
  elements.isPinnedToBottom = true;
  elements.hasUnseenMessages = false;
  if (elements.jumpToLatest) {
    elements.jumpToLatest.hidden = true;
  }
};

const setupAutoGrowTextarea = (textarea, maxRows, onResize) => {
  if (!textarea) {
    return;
  }
  const maxLines = typeof maxRows === "number" && maxRows > 1 ? maxRows : 4;
  const resize = () => {
    const styles = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(styles.lineHeight) || 20;
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    const minHeight = lineHeight + paddingTop + paddingBottom;
    const maxHeight = lineHeight * maxLines + paddingTop + paddingBottom;
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${Math.max(nextHeight, minHeight)}px`;
    if (typeof onResize === "function") {
      onResize();
    }
  };
  resize();
  textarea.addEventListener("input", resize);
  window.addEventListener("resize", resize);
};

const isNearBottom = (feed) => {
  const threshold = 48;
  return (
    feed.scrollHeight - feed.scrollTop - feed.clientHeight <= threshold
  );
};

const renderMessagesForSurface = (elements, thread) => {
  if (!elements || !elements.briefingFeed || !elements.briefingEmpty) {
    return;
  }
  const feed = elements.briefingFeed;
  const previousScrollTop = feed.scrollTop;
  const previousScrollHeight = feed.scrollHeight;
  const previousCount = elements.lastMessageCount || 0;
  const threadChanged = elements.lastThreadId !== thread.id;
  const wasNearBottom = threadChanged ? true : isNearBottom(feed);

  feed.innerHTML = "";
  for (let i = 0; i < thread.messages.length; i++) {
    const message = thread.messages[i];
    const item = document.createElement("article");
    const isUser = message.role === "user";
    item.className = `conversation-message ${isUser ? "is-user" : "is-assistant"}`;
    item.setAttribute("role", "listitem");

    const meta = document.createElement("div");
    meta.className = "conversation-meta";
    meta.textContent = isUser ? "You" : "PathAdvisor";
    item.appendChild(meta);

    const body = document.createElement("p");
    body.className = "conversation-text";
    body.textContent = message.content;
    item.appendChild(body);

    feed.appendChild(item);
  }

  const hasNewMessages =
    thread.messages.length > previousCount && !threadChanged;

  if (wasNearBottom) {
    scrollFeedToBottom(elements);
  } else {
    feed.scrollTop = previousScrollTop + (feed.scrollHeight - previousScrollHeight);
    if (hasNewMessages) {
      elements.hasUnseenMessages = true;
    }
  }

  elements.lastMessageCount = thread.messages.length;
  elements.lastThreadId = thread.id;
  elements.briefingEmpty.hidden = thread.messages.length > 0;
  elements.isPinnedToBottom = isNearBottom(feed);
  if (thread.messages.length === 0) {
    elements.hasUnseenMessages = false;
  }

  if (elements.jumpToLatest) {
    elements.jumpToLatest.hidden = !elements.hasUnseenMessages;
  }
};

const renderLiveThread = () => {
  // WHY: Only the active owner should render the live advisor surface.
  // HOW: Skip rendering when the popout owns PathAdvisor.
  if (advisorSurfaceOwnerState.owner !== "main") {
    return;
  }
  const thread = getActiveThread();
  liveSurfaces.forEach((surface) => {
    renderMessagesForSurface(surface, thread);
  });
};

// ===============================================================
// WHY: Conversations view is a dedicated workspace for thread management.
// HOW: Render a lightweight list + detail panel without routing libraries.
// ===============================================================
let conversationViewElements = null;
let workspaceViewElements = null;
let benefitsViewElements = null;
let explorePathosElements = null;
let advisorModeElements = null;
let resumeCareerElements = null;
let advisorObservationElement = null;
let selectedJobContextSurfaces = [];
let lastSelectedJobKey = "";
let activityLogLayoutElements = null;
// ===============================================================
// WHY: Resume card menus need a single source of truth for open/close.
// HOW: Track the open menu by resume id in a tiny local UI state object.
// ===============================================================
const resumeCareerUiState = {
  openMenuResumeId: null,
};
let jobContextPrivacyHidden = false;
let activeWorkspaceView = "saved-jobs";
let lastNavWorkspaceView = "saved-jobs";
let lastNonActivityWorkspaceView = "saved-jobs";
let scheduleWorkspaceViewportSync = null;
const BACKEND_AUDIT_GROUP_TITLE = "System Audit";
const backendAuditState = {
  records: [],
  loading: false,
  controlsBound: false,
};
const backendStatusState = {
  loading: false,
  connected: false,
  info: null,
  errorMessage: "",
  errorRequestId: "",
};

// ===============================================================
// WHY: Benefits workspace needs its own internal frame/router state.
// HOW: Track the active frame, routing focus, and embedded tool selection.
// ===============================================================
const benefitsWorkspaceState = {
  activeFrame: "overview",
  internalRailSelection: "overview",
  toolsFrame: "tsp-chooser",
  activeToolId: null,
  activeToolGroup: null,
  toolPopoutOpen: false,
};

// ===============================================================
// WHY: Explore (PathOS) needs a small UI state tracker for loading.
// HOW: Maintain local flags + last prompt to inform rendering steps.
// ===============================================================
const explorePathosState = {
  isLoading: false,
  exampleIndex: 0,
  lastPrompt: "",
};

const WORKSPACE_ROUTES = [
  { id: "explore", viewKey: "exploreView", navKey: "navExplore" },
  { id: "explore-pathos", viewKey: "explorePathosView", navKey: "navExplorePathos" },
  { id: "saved-jobs", viewKey: "savedJobsView", navKey: "navSavedJobs" },
  { id: "activity-log", viewKey: "activityLogView", navKey: "navActivityLog" },
  { id: "resume-assets", viewKey: "resumeAssetsView", navKey: "navResumeAssets" },
  { id: "benefits-guide", viewKey: "benefitsGuideView", navKey: "navBenefitsGuide" },
  { id: "benefits-comp", viewKey: "benefitsCompView", navKey: "navBenefitsComp" },
  { id: "profile", viewKey: "profileView", navKey: "navProfile" },
  { id: "settings", viewKey: "settingsView", navKey: "navSettings" },
  { id: "alert-center", viewKey: "alertCenterView", navKey: "navAlertCenter" },
  { id: "conversations", viewKey: "conversationsView", navKey: "navConversations" },
];

// WHY: Day 64 – Global bar shows one status label per workspace view.
// HOW: setActiveWorkspaceView updates workbenchGlobalStatus text from this map.
const WORKSPACE_STATUS_LABELS = {
  "saved-jobs": "Local list",
  explore: "Official listings",
  "explore-pathos": "Local mock",
  "activity-log": "Activity Log",
  "resume-assets": "Federal Resume – USAJOBS Format",
  "benefits-guide": "Learning",
  "benefits-comp": "Benefits reference",
  profile: "Local only",
  settings: "Local only",
  "alert-center": "Alerts on standby",
  conversations: "Local only",
};

// WHY: Focus Mode shows page title only in the center banner (single line, no subtitle).
// HOW: Same keys as WORKSPACE_STATUS_LABELS; used when getWorkspaceMode() === "focus".
const WORKSPACE_PAGE_TITLES = {
  "saved-jobs": "Dashboard",
  explore: "USAJOBS (Official Listings)",
  "explore-pathos": "Explore Careers (Guided by PathOS)",
  "activity-log": "Activity Log",
  "resume-assets": "Resume & Career",
  "benefits-guide": "Benefits Guide",
  "benefits-comp": "Benefits & Compensation",
  profile: "Profile",
  settings: "Settings",
  "alert-center": "Alert Center",
  conversations: "Conversations",
};

const ALERT_PREVIEW_ITEMS = [
  {
    id: "alert-role-match",
    title: "New role match: Data Analyst Intern",
    recommendation: "Apply",
    reason: "Your Python + SQL coursework is a strong match.",
    timestamp: "Just now",
    isNew: true,
    read: false,
  },
  {
    id: "alert-role-compare",
    title: "Resume gap check for Budget Analyst",
    recommendation: "Consider",
    reason: "One requirement needs stronger examples.",
    timestamp: "5m ago",
    isNew: false,
    read: false,
  },
  {
    id: "alert-role-salary",
    title: "Shortlist update: Program Support",
    recommendation: "Apply",
    reason: "Location + schedule align with your preferences.",
    timestamp: "25m ago",
    isNew: false,
    read: true,
  },
  {
    id: "alert-role-focus",
    title: "Heads up: Two roles expire this week",
    recommendation: "Consider",
    reason: "Deadlines are within 4 days.",
    timestamp: "Today",
    isNew: false,
    read: false,
  },
  {
    id: "alert-role-skip",
    title: "Long-shot role: Senior Data Scientist",
    recommendation: "Skip",
    reason: "Role expects 7+ years of experience.",
    timestamp: "Yesterday",
    isNew: false,
    read: true,
  },
];

const alertPreviewState = {
  items: ALERT_PREVIEW_ITEMS.map((item) => Object.assign({}, item)),
  selectedAlertId: null,
};

const getAlertUnreadCount = () =>
  alertPreviewState.items.filter((item) => !item.read).length;

// ===============================================================
// WHY: Resume view needs grouped DOM references for fast rendering.
// HOW: Capture all required nodes with data attributes.
// ===============================================================
const collectResumeCareerElements = (root) => {
  if (!root) {
    return null;
  }
  return {
    root,
    resumeScroll: root.querySelector("[data-testid='resume-career-scroll']"),
    overviewCreated: root.querySelector("[data-resume-overview-created]"),
    overviewLinked: root.querySelector("[data-resume-overview-linked]"),
    overviewModified: root.querySelector("[data-resume-overview-modified]"),
    activeJobStatus: root.querySelector("[data-resume-selected-empty]"),
    selectedStatus: root.querySelector("[data-resume-selected-status]"),
    selectedCreateButton: root.querySelector("[data-resume-selected-create]"),
    currentJobCard: root.querySelector("[data-resume-current-job-card]"),
    currentJobTitle: root.querySelector("[data-resume-current-job-title]"),
    currentJobSummary: root.querySelector("[data-resume-current-job-summary]"),
    currentJobMeta: root.querySelector("[data-resume-current-job-meta]"),
    currentJobSource: root.querySelector("[data-resume-current-job-source]"),
    currentJobEmpty: root.querySelector("[data-resume-current-job-empty]"),
    currentJobContent: root.querySelector("[data-resume-current-job-content]"),
    currentJobViewPosting: root.querySelector("[data-resume-current-job-view]"),
    currentJobClear: root.querySelector("[data-resume-current-job-clear]"),
    resumeTargetList: root.querySelector("[data-resume-target-list]"),
    resumeTargetEmpty: root.querySelector("[data-resume-target-empty]"),
    resumeTargetCount: root.querySelector("[data-resume-target-count]"),
    resumeList: root.querySelector("[data-resume-list]"),
    resumeEmpty: root.querySelector("[data-resume-empty]"),
    resumeLibraryCount: root.querySelector("[data-resume-library-count]"),
    detailEmpty: root.querySelector("[data-resume-detail-empty]"),
    detailBody: root.querySelector("[data-resume-detail-body]"),
    targetTitle: root.querySelector("[data-resume-target-title]"),
    targetAgency: root.querySelector("[data-resume-target-agency]"),
    targetGrade: root.querySelector("[data-resume-target-grade]"),
    targetAnnouncement: root.querySelector("[data-resume-target-announcement]"),
    workList: root.querySelector("[data-resume-work-list]"),
    education: root.querySelector("[data-resume-education]"),
    exportButton: root.querySelector("[data-resume-export]"),
    exportNote: root.querySelector("[data-resume-export-note]"),
    exportToast:
      root.querySelector("[data-resume-export-toast]") ||
      document.querySelector("[data-resume-export-toast]"),
    linkToggle: root.querySelector("[data-resume-link-toggle]"),
    linkDialog: root.querySelector("[data-resume-link-dialog]"),
    linkCancel: root.querySelector("[data-resume-link-cancel]"),
    linkSubmit: root.querySelector("[data-resume-link-submit]"),
    linkError: root.querySelector("[data-resume-link-error]"),
    jobTitleInput: root.querySelector("[data-resume-job-title]"),
    jobAgencyInput: root.querySelector("[data-resume-job-agency]"),
    jobGradeInput: root.querySelector("[data-resume-job-grade]"),
    jobAnnouncementInput: root.querySelector("[data-resume-job-announcement]"),
    advisorPanel: document.querySelector("[data-resume-advisor-panel]"),
    advisorStatus: document.querySelector("[data-resume-advisor-status]"),
    promptForm: document.querySelector("[data-resume-prompt-form]"),
    promptInput: document.querySelector("[data-resume-prompt-input]"),
    promptSubmit: document.querySelector("[data-resume-prompt-submit]"),
    privacyCards: Array.from(root.querySelectorAll("[data-privacy-card]")),
    activeMenu: null,
    eventsBound: false,
  };
};

// ===============================================================
// WHY: Resume actions can be removed from markup during refactors.
// HOW: Recreate the expected buttons so renderer wiring still works.
// ===============================================================
const ensureResumeCurrentJobActions = (elements) => {
  if (!elements || !elements.currentJobCard) {
    return;
  }

  let actions = elements.currentJobCard.querySelector("[data-resume-current-job-actions]");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "resume-create-actions";
    actions.setAttribute("data-resume-current-job-actions", "");
  }

  const ensureButton = (selector, config) => {
    let button = elements.currentJobCard.querySelector(selector);
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = config.className;
      button.textContent = config.label;
      button.setAttribute(config.dataAttribute, "");
      if (config.hidden) {
        button.hidden = true;
      }
      actions.appendChild(button);
    }
    return button;
  };

  const viewPosting = ensureButton("[data-resume-current-job-view]", {
    className: "resume-action is-outline",
    label: "View posting",
    dataAttribute: "data-resume-current-job-view",
    hidden: true,
  });
  const clearSelection = ensureButton("[data-resume-current-job-clear]", {
    className: "resume-action is-ghost",
    label: "Clear selection",
    dataAttribute: "data-resume-current-job-clear",
    hidden: true,
  });

  if (!actions.parentElement) {
    const insertTarget = elements.selectedStatus;
    if (insertTarget && insertTarget.parentElement === elements.currentJobCard) {
      elements.currentJobCard.insertBefore(actions, insertTarget);
    } else {
      elements.currentJobCard.appendChild(actions);
    }
  }

  elements.currentJobViewPosting = viewPosting;
  elements.currentJobClear = clearSelection;
};

const getActiveResume = (state) => {
  if (!state || !state.activeResumeId) {
    return null;
  }
  return state.resumes.find(function (resume) {
    return resume.id === state.activeResumeId;
  });
};

const closeResumeMenu = (elements) => {
  if (elements && elements.activeMenu) {
    elements.activeMenu.hidden = true;
    elements.activeMenu = null;
  }
  resumeCareerUiState.openMenuResumeId = null;
};

const buildResumeMenuButton = (label, onClick, disabled) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (disabled) {
    button.disabled = true;
  }
  if (typeof onClick === "function" && !disabled) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
  }
  return button;
};

const renderResumeOverview = (state, elements) => {
  if (!elements) {
    return;
  }
  const totalResumes = state.resumes.length;
  const jobMap = {};
  let linkedJobs = 0;
  let lastModified = "";
  state.resumes.forEach(function (resume) {
    if (resume.job && resume.job.jobId) {
      if (!jobMap[resume.job.jobId]) {
        jobMap[resume.job.jobId] = true;
        linkedJobs += 1;
      }
    }
    if (!lastModified) {
      lastModified = resume.updatedAt;
    } else if (new Date(resume.updatedAt).getTime() > new Date(lastModified).getTime()) {
      lastModified = resume.updatedAt;
    }
  });
  if (elements.overviewCreated) {
    elements.overviewCreated.textContent = String(totalResumes);
  }
  if (elements.overviewLinked) {
    elements.overviewLinked.textContent = String(linkedJobs);
  }
  if (elements.overviewModified) {
    elements.overviewModified.textContent = lastModified
      ? formatResumeTimestamp(lastModified)
      : "--";
  }
};

const renderResumeList = (state, elements) => {
  if (!elements || !elements.resumeList) {
    return;
  }
  const list = elements.resumeList;
  list.innerHTML = "";
  elements.activeMenu = null;
  if (elements.resumeEmpty) {
    elements.resumeEmpty.hidden = state.resumes.length > 0;
  }
  if (elements.resumeLibraryCount) {
    const label = state.resumes.length === 1 ? "resume" : "resumes";
    elements.resumeLibraryCount.textContent = `${state.resumes.length} ${label}`;
  }
  if (resumeCareerUiState.openMenuResumeId) {
    const hasOpenMenu = state.resumes.some(function (resume) {
      return resume.id === resumeCareerUiState.openMenuResumeId;
    });
    if (!hasOpenMenu) {
      resumeCareerUiState.openMenuResumeId = null;
    }
  }

  state.resumes.forEach(function (resume) {
    const card = document.createElement("article");
    card.className = "resume-card";
    card.setAttribute("data-resume-card", "");
    if (resume.id === state.activeResumeId) {
      card.classList.add("is-active");
    }
    card.addEventListener("click", () => {
      resumeCareerStore.selectResume(resume.id);
    });

    const header = document.createElement("div");
    header.className = "resume-card-header";
    const titleWrap = document.createElement("div");
    const title = document.createElement("div");
    title.className = "resume-card-title";
    title.textContent = resume.job.title;
    const subtitle = document.createElement("div");
    subtitle.className = "resume-card-subtitle";
    subtitle.textContent = `${resume.job.agency} · ${resume.job.grade}`;
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);

    const status = document.createElement("span");
    status.className = "resume-status-pill";
    status.textContent = resume.status;
    if (resume.status === "Applied") {
      status.classList.add("is-applied");
    } else if (resume.status === "Archived") {
      status.classList.add("is-archived");
    } else {
      status.classList.add("is-draft");
    }
    header.appendChild(titleWrap);
    header.appendChild(status);

    const versionLabel = document.createElement("div");
    versionLabel.className = "resume-card-meta";
    const agencyAbbrev = deriveAgencyAbbrev(resume.job.agency);
    versionLabel.textContent = `${resume.job.title} – ${agencyAbbrev} – v${resume.version}`;

    const announcement = document.createElement("div");
    announcement.className = "resume-card-meta";
    announcement.textContent = `Announcement: ${resume.job.announcementNumber}`;

    const foot = document.createElement("div");
    foot.className = "resume-card-foot";
    const generated = document.createElement("div");
    generated.className = "resume-card-generated";
    generated.textContent = `Generated by PathAdvisor · Updated ${formatResumeTimestamp(
      resume.updatedAt
    )}`;
    const actions = document.createElement("div");
    actions.className = "resume-card-actions";
    actions.style.position = "relative";

    const kebab = document.createElement("button");
    kebab.className = "resume-kebab";
    kebab.type = "button";
    kebab.textContent = "⋯";

    const menu = document.createElement("div");
    menu.className = "resume-card-menu";
    menu.hidden = resumeCareerUiState.openMenuResumeId !== resume.id;
    if (!menu.hidden) {
      elements.activeMenu = menu;
    }

    const onView = () => {
      closeResumeMenu(elements);
      resumeCareerStore.selectResume(resume.id);
    };
    const onArchive = () => {
      closeResumeMenu(elements);
      resumeCareerStore.archiveResume(resume.id);
    };
    const onDelete = () => {
      closeResumeMenu(elements);
      const confirmed = window.confirm(
        "Delete this resume? Applied resumes cannot be deleted."
      );
      if (confirmed) {
        resumeCareerStore.deleteResume(resume.id);
      }
    };
    menu.appendChild(buildResumeMenuButton("View", onView, false));
    menu.appendChild(buildResumeMenuButton("Archive", onArchive, false));
    menu.appendChild(
      buildResumeMenuButton("Delete", onDelete, resume.status !== "Draft")
    );

    kebab.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (resumeCareerUiState.openMenuResumeId === resume.id) {
        closeResumeMenu(elements);
        return;
      }
      closeResumeMenu(elements);
      resumeCareerUiState.openMenuResumeId = resume.id;
      menu.hidden = false;
      elements.activeMenu = menu;
    });

    actions.appendChild(kebab);
    actions.appendChild(menu);
    foot.appendChild(generated);
    foot.appendChild(actions);

    card.appendChild(header);
    card.appendChild(versionLabel);
    card.appendChild(announcement);
    card.appendChild(foot);
    list.appendChild(card);
  });
};

const buildResumeWorkCard = (entry) => {
  const card = document.createElement("div");
  card.className = "resume-work-card";
  const header = document.createElement("div");
  header.className = "resume-work-header";
  const titleWrap = document.createElement("div");
  const title = document.createElement("div");
  title.className = "resume-work-title";
  title.textContent = entry.positionTitle;
  const org = document.createElement("div");
  org.className = "resume-work-org";
  org.textContent = entry.organization;
  titleWrap.appendChild(title);
  titleWrap.appendChild(org);
  const period = document.createElement("div");
  period.className = "resume-work-period";
  period.textContent = entry.period;
  header.appendChild(titleWrap);
  header.appendChild(period);

  const grid = document.createElement("div");
  grid.className = "resume-work-grid";
  const addField = (label, value) => {
    const wrapper = document.createElement("div");
    const fieldLabel = document.createElement("div");
    fieldLabel.className = "resume-field-label";
    fieldLabel.textContent = label;
    const fieldValue = document.createElement("div");
    fieldValue.textContent = value || "Not provided";
    wrapper.appendChild(fieldLabel);
    wrapper.appendChild(fieldValue);
    grid.appendChild(wrapper);
  };
  addField("Location", entry.location);
  addField("Hours per week", entry.hoursPerWeek);
  addField("Salary", entry.salary);
  addField("Supervisor", entry.supervisorName);
  addField("Supervisor Phone", entry.supervisorPhone || "Not provided");
  addField("May we contact this supervisor?", entry.supervisorContactOk);

  const duties = document.createElement("div");
  duties.className = "resume-work-duties";
  const dutiesLabel = document.createElement("div");
  dutiesLabel.className = "resume-field-label";
  dutiesLabel.textContent = "Duties and Accomplishments";
  const list = document.createElement("ul");
  entry.duties.forEach(function (duty) {
    const item = document.createElement("li");
    item.textContent = duty;
    list.appendChild(item);
  });
  duties.appendChild(dutiesLabel);
  duties.appendChild(list);

  card.appendChild(header);
  card.appendChild(grid);
  card.appendChild(duties);
  return card;
};

const buildResumeEducationCard = (education) => {
  const card = document.createElement("div");
  card.className = "resume-education-card";
  const title = document.createElement("div");
  title.className = "resume-education-title";
  title.textContent = education.degree;
  const meta = document.createElement("div");
  meta.className = "resume-education-meta";
  meta.textContent = `${education.school} · ${education.location}`;

  const grid = document.createElement("div");
  grid.className = "resume-education-grid";
  const addField = (label, value) => {
    const wrapper = document.createElement("div");
    const fieldLabel = document.createElement("div");
    fieldLabel.className = "resume-field-label";
    fieldLabel.textContent = label;
    const fieldValue = document.createElement("div");
    fieldValue.textContent = value || "—";
    wrapper.appendChild(fieldLabel);
    wrapper.appendChild(fieldValue);
    grid.appendChild(wrapper);
  };
  addField("Completion Date", education.completionDate);
  addField("GPA", education.gpa);
  addField("Credit Hours", education.creditHours);

  const coursework = document.createElement("div");
  coursework.className = "resume-coursework";
  const label = document.createElement("div");
  label.className = "resume-field-label";
  label.textContent = "Relevant Coursework";
  const tags = document.createElement("div");
  tags.className = "resume-tag-row";
  education.coursework.forEach(function (item) {
    const tag = document.createElement("span");
    tag.className = "resume-tag";
    tag.textContent = item;
    tags.appendChild(tag);
  });
  coursework.appendChild(label);
  coursework.appendChild(tags);

  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(grid);
  card.appendChild(coursework);
  return card;
};

const renderResumeDetail = (state, elements) => {
  if (!elements) {
    return;
  }
  const resume = getActiveResume(state);
  if (!resume) {
    if (elements.detailEmpty) {
      elements.detailEmpty.hidden = false;
    }
    if (elements.detailBody) {
      elements.detailBody.hidden = true;
    }
    if (elements.exportButton) {
      elements.exportButton.disabled = true;
    }
    return;
  }
  if (elements.detailEmpty) {
    elements.detailEmpty.hidden = true;
  }
  if (elements.detailBody) {
    elements.detailBody.hidden = false;
  }
  if (elements.exportButton) {
    elements.exportButton.disabled = false;
  }
  if (elements.targetTitle) {
    elements.targetTitle.textContent = resume.job.title;
  }
  if (elements.targetAgency) {
    elements.targetAgency.textContent = resume.job.agency;
  }
  if (elements.targetGrade) {
    elements.targetGrade.textContent = resume.job.grade;
  }
  if (elements.targetAnnouncement) {
    elements.targetAnnouncement.textContent = resume.job.announcementNumber;
  }
  if (elements.workList) {
    elements.workList.innerHTML = "";
    resume.workExperience.forEach(function (entry) {
      elements.workList.appendChild(buildResumeWorkCard(entry));
    });
  }
  if (elements.education) {
    elements.education.innerHTML = "";
    elements.education.appendChild(buildResumeEducationCard(resume.education));
  }
  if (elements.exportNote) {
    if (resume.lastExportedAt) {
      elements.exportNote.textContent = `Last export: ${formatResumeTimestamp(
        resume.lastExportedAt
      )} · ${resume.lastExportedFile}`;
    } else {
      elements.exportNote.textContent =
        "Export generates a file for manual upload during your USAJOBS application.";
    }
  }
};

const renderResumeAdvisorStatus = (state, elements) => {
  if (!elements || !elements.advisorStatus) {
    return;
  }
  const resume = getActiveResume(state);
  if (!resume) {
    elements.advisorStatus.textContent = "Select a resume to start a guided update.";
    return;
  }
  elements.advisorStatus.textContent = `Active resume: ${resume.job.title} · v${resume.version}`;
};

// ===============================================================
// WHY: Resume & Career needs awareness of Job Search selection.
// HOW: Pull ActiveJobContext and update the inline status copy.
// ===============================================================
const renderResumeActiveJobAwareness = (elements) => {
  if (!elements || !elements.activeJobStatus) {
    return;
  }
  const activeJobState = activeJobContextStore.getState();
  const copy = activeJobContextApi.buildResumeActiveJobStatus(
    activeJobState ? activeJobState.activeJob : null
  );
  elements.activeJobStatus.textContent = copy;
};

// ===============================================================
// WHY: Current selection is read-only context in Resume & Career.
// HOW: Hide legacy resume CTAs and helper copy when present.
// ===============================================================
const renderResumeSelectedCreateCta = (elements) => {
  if (!elements) {
    return;
  }
  if (elements.selectedCreateButton) {
    elements.selectedCreateButton.hidden = true;
    elements.selectedCreateButton.disabled = true;
  }
  if (elements.selectedStatus) {
    elements.selectedStatus.hidden = true;
    elements.selectedStatus.textContent = "";
  }
};

// ===============================================================
// WHY: Resume & Career should surface the SelectedJob context.
// HOW: Map SelectedJob state into the Current Job card UI.
// ===============================================================
const renderResumeCurrentJobCard = (elements) => {
  if (!elements || !elements.currentJobCard) {
    return;
  }
  const selectedJobState = selectedJobStore.getState();
  const selectedJob = selectedJobState ? selectedJobState.selectedJob : null;
  const viewModel = buildResumeCurrentJobViewModel(selectedJob);
  const actions = buildResumeCurrentJobActionState(selectedJob);
  const actionMap = {};
  actions.forEach((action) => {
    actionMap[action.id] = action;
  });
  if (elements.currentJobTitle) {
    elements.currentJobTitle.textContent = viewModel.title;
  }
  if (elements.currentJobSummary) {
    elements.currentJobSummary.textContent = viewModel.summary;
  }
  if (elements.currentJobMeta) {
    elements.currentJobMeta.textContent = viewModel.meta;
  }
  if (elements.currentJobSource) {
    elements.currentJobSource.textContent = viewModel.sourceBadge;
    elements.currentJobSource.hidden = !viewModel.hasSelection;
  }
  if (elements.currentJobEmpty) {
    elements.currentJobEmpty.hidden = viewModel.hasSelection;
  }
  if (elements.currentJobContent) {
    elements.currentJobContent.hidden = !viewModel.hasSelection;
  }

  const applyActionState = (element, actionId) => {
    if (!element) {
      return;
    }
    const action = actionMap[actionId];
    if (!action) {
      element.hidden = true;
      return;
    }
    element.hidden = !action.isVisible;
    element.disabled = !action.isEnabled;
  };

  applyActionState(
    elements.currentJobViewPosting,
    RESUME_CURRENT_JOB_ACTIONS.VIEW_POSTING
  );
  applyActionState(
    elements.currentJobClear,
    RESUME_CURRENT_JOB_ACTIONS.CLEAR_SELECTION
  );
  renderResumeSelectedCreateCta(elements);
};

// ===============================================================
// WHY: PathAdvisor should explain the job-to-resume relationship.
// HOW: Compose an observation string from job + resume context.
// ===============================================================
const renderAdvisorActiveJobObservation = () => {
  const activeJobState = activeJobContextStore.getState();
  const resumeState = resumeCareerStore.getState();
  const copy = activeJobContextApi.buildAdvisorActiveJobObservation(
    activeJobState ? activeJobState.activeJob : null,
    resumeState
  );
  if (advisorObservationElement) {
    advisorObservationElement.textContent = copy;
  }
  // Day 65: Context capsule one-line next instruction; keep in sync with observation.
  const nextInstructionEl = document.querySelector("[data-advisor-next-instruction]");
  if (nextInstructionEl) {
    nextInstructionEl.textContent =
      activeJobState && activeJobState.activeJob
        ? `Next: ${copy}`
        : "Next: Pick a target job to get a readiness score.";
  }
};

// ===============================================================
// WHY: PathAdvisor should display the selected job context inline.
// HOW: Render the SelectedJob snapshot into the advisor card.
// ===============================================================
const renderSelectedJobContextForElements = (selectedJob, elements) => {
  if (!elements) {
    return;
  }
  const titleEl = elements.title;
  const summaryEl = elements.summary;
  const metaEl = elements.meta;
  const sourceEl = elements.source;
  const clearButton = elements.clearButton;
  const privacyToggle = elements.privacyToggle;

  if (!selectedJob) {
    if (titleEl) {
      titleEl.textContent = "None selected";
    }
    if (summaryEl) {
      summaryEl.textContent = "Select a job card or USAJOBS posting to set context.";
    }
    if (metaEl) {
      metaEl.textContent = "";
    }
    if (sourceEl) {
      sourceEl.textContent = "";
    }
    if (clearButton) {
      clearButton.hidden = true;
    }
    if (privacyToggle) {
      privacyToggle.hidden = true;
    }
    if (elements.chatTargetJob) {
      elements.chatTargetJob.textContent = "None";
    }
    if (elements.chatReadiness) {
      elements.chatReadiness.textContent = "—";
    }
    return;
  }

  const titleCopy =
    selectedJob.title ||
    (selectedJob.source === "USAJOBS" ? "Selected USAJOBS posting" : "Selected job");
  if (titleEl) {
    titleEl.textContent = titleCopy;
  }
  const summaryParts = [];
  if (selectedJob.agency) {
    summaryParts.push(selectedJob.agency);
  }
  if (selectedJob.location) {
    summaryParts.push(selectedJob.location);
  }
  if (selectedJob.grade) {
    summaryParts.push(selectedJob.grade);
  }
  if (summaryEl) {
    summaryEl.textContent = summaryParts.length
      ? summaryParts.join(" · ")
      : "Posting link saved for reference.";
  }
  if (metaEl) {
    metaEl.textContent = selectedJob.postingUrl || "";
  }
  if (sourceEl) {
    const sourceParts = [`Source: ${selectedJob.source}`];
    if (selectedJob.sourceJobId) {
      sourceParts.push(`Job ID: ${selectedJob.sourceJobId}`);
    }
    sourceEl.textContent = sourceParts.join(" · ");
  }
  if (clearButton) {
    clearButton.hidden = false;
  }
  if (privacyToggle) {
    privacyToggle.hidden = false;
  }
  if (elements.chatTargetJob) {
    elements.chatTargetJob.textContent = titleCopy;
  }
  if (elements.chatReadiness) {
    elements.chatReadiness.textContent = "—";
  }
};

const renderSelectedJobContext = () => {
  const selectedJobState = selectedJobStore.getState();
  const selectedJob = selectedJobState ? selectedJobState.selectedJob : null;
  selectedJobContextSurfaces.forEach((surface) => {
    renderSelectedJobContextForElements(selectedJob, surface);
  });
};

const buildSelectedJobKey = (selectedJob) => {
  if (!selectedJob || !selectedJob.postingUrl) {
    return "";
  }
  return selectedJob.postingUrl;
};

const maybeNotifySelectedJobChange = (selectedJob, elements) => {
  const nextKey = buildSelectedJobKey(selectedJob);
  if (nextKey === lastSelectedJobKey) {
    return;
  }
  if (!elements) {
    lastSelectedJobKey = nextKey;
    return;
  }
  if (lastSelectedJobKey && !nextKey) {
    showResumeToast(elements, "Current job cleared");
  } else if (nextKey) {
    showResumeToast(elements, "Current job updated");
  }
  lastSelectedJobKey = nextKey;
};

const renderResumeCareerView = (state, elements) => {
  renderResumeOverview(state, elements);
  renderResumeCurrentJobCard(elements);
  renderResumeTargets(elements);
  renderResumeList(state, elements);
  renderResumeDetail(state, elements);
  renderResumeAdvisorStatus(state, elements);
  renderResumeActiveJobAwareness(elements);
};

const getTopCenterToast = (elements) => {
  if (elements && elements.exportToast) {
    return elements.exportToast;
  }
  return document.querySelector("[data-resume-export-toast]");
};

const buildToastMessage = (title, body) => {
  const safeTitle = typeof title === "string" ? title.trim() : "";
  const safeBody = typeof body === "string" ? body.trim() : "";
  if (safeTitle && safeBody) {
    return `${safeTitle} - ${safeBody}`;
  }
  return safeTitle || safeBody;
};

const showResumeToast = (elements, message) => {
  const toast = getTopCenterToast(elements);
  if (!toast || !message) {
    return;
  }
  toast.textContent = message;
  toast.hidden = false;
  window.setTimeout(() => {
    toast.hidden = true;
  }, 3200);
};

const showResumeExportToast = (elements, message) => {
  showResumeToast(elements, message);
};

const emitTopCenterToast = (title, body) => {
  const message = buildToastMessage(title, body);
  if (!message) {
    return;
  }
  showResumeToast(resumeCareerElements, message);
};

// ===============================================================
// WHY: The link-job form needs a lightweight, inline validation cue.
// HOW: Toggle a small helper message without blocking other inputs.
// ===============================================================
const setResumeLinkError = (elements, message) => {
  if (!elements || !elements.linkError) {
    return;
  }
  if (message) {
    elements.linkError.textContent = message;
    elements.linkError.hidden = false;
    return;
  }
  elements.linkError.hidden = true;
  elements.linkError.textContent = "";
};

// ===============================================================
// WHY: Resume Builder needs pre-filled context from SelectedJob.
// HOW: Populate the link dialog with the selected job fields.
// ===============================================================
const applySelectedJobToResumeLinkDialog = (selectedJob, elements) => {
  if (!selectedJob || !elements) {
    return;
  }
  if (elements.linkDialog) {
    elements.linkDialog.hidden = false;
  }
  if (elements.jobTitleInput) {
    elements.jobTitleInput.value = selectedJob.title || "";
  }
  if (elements.jobAgencyInput) {
    elements.jobAgencyInput.value = selectedJob.agency || "";
  }
  if (elements.jobGradeInput) {
    elements.jobGradeInput.value = selectedJob.grade || "";
  }
  if (elements.jobAnnouncementInput) {
    const announcement =
      selectedJob.source === "USAJOBS" ? selectedJob.sourceJobId : "";
    elements.jobAnnouncementInput.value = announcement || "";
  }
  setResumeLinkError(elements, "");
};

const handleResumeCurrentJobAction = (actionId, elements) => {
  const selectedJobState = selectedJobStore.getState();
  const selectedJob = selectedJobState ? selectedJobState.selectedJob : null;
  const output = buildResumeCurrentJobActionOutput(actionId, selectedJob);
  if (!output) {
    return;
  }
  if (output.type === "navigate") {
    setActiveWorkspaceView(output.target);
    return;
  }
  if (output.type === "open-posting") {
    const role = {
      title: selectedJob ? selectedJob.title : "",
      series: "",
      usajobsUrl: output.url,
    };
    if (selectedJob) {
      jobSelectionStore.logJobViewed(selectedJob);
    }
    const targetUrl = resolveUsaJobsReferenceUrl(role);
    openUsaJobsReferencePopout(role, targetUrl);
    return;
  }
  if (output.type === "clear-selection") {
    selectedJobStore.clearSelectedJob("resume-current-job-clear");
  }
};

const setupResumeCareerView = (elements) => {
  if (!elements || elements.eventsBound) {
    return;
  }
  elements.eventsBound = true;

  ensureResumeCurrentJobActions(elements);

  setupPrivacyCards({
    privacyCards: elements.privacyCards,
  });

  if (elements.currentJobViewPosting) {
    elements.currentJobViewPosting.addEventListener("click", (event) => {
      event.preventDefault();
      handleResumeCurrentJobAction(
        RESUME_CURRENT_JOB_ACTIONS.VIEW_POSTING,
        elements
      );
    });
  }
  if (elements.currentJobClear) {
    elements.currentJobClear.addEventListener("click", (event) => {
      event.preventDefault();
      handleResumeCurrentJobAction(
        RESUME_CURRENT_JOB_ACTIONS.CLEAR_SELECTION,
        elements
      );
    });
  }

  if (elements.selectedCreateButton) {
    elements.selectedCreateButton.addEventListener("click", (event) => {
      event.preventDefault();
      if (jobContextPrivacyHidden) {
        return;
      }
      const selectedJobState = selectedJobStore.getState();
      const selectedJob = selectedJobState ? selectedJobState.selectedJob : null;
      if (!selectedJob) {
        return;
      }
      applySelectedJobToResumeLinkDialog(selectedJob, elements);
    });
  }

  if (elements.linkToggle && elements.linkDialog) {
    elements.linkToggle.addEventListener("click", (event) => {
      event.preventDefault();
      elements.linkDialog.hidden = false;
    });
  }

  if (elements.linkCancel && elements.linkDialog) {
    elements.linkCancel.addEventListener("click", (event) => {
      event.preventDefault();
      elements.linkDialog.hidden = true;
      setResumeLinkError(elements, "");
    });
  }

  if (elements.linkSubmit) {
    elements.linkSubmit.addEventListener("click", (event) => {
      event.preventDefault();
      const title =
        elements.jobTitleInput && elements.jobTitleInput.value
          ? elements.jobTitleInput.value.trim()
          : "";
      const agency =
        elements.jobAgencyInput && elements.jobAgencyInput.value
          ? elements.jobAgencyInput.value.trim()
          : "";
      const grade =
        elements.jobGradeInput && elements.jobGradeInput.value
          ? elements.jobGradeInput.value.trim()
          : "";
      const announcement =
        elements.jobAnnouncementInput && elements.jobAnnouncementInput.value
          ? elements.jobAnnouncementInput.value.trim()
          : "";
      const hasTitle = title.length >= 2;
      const hasAnnouncement = announcement.length >= 2;
      if (!hasTitle || !hasAnnouncement) {
        setResumeLinkError(
          elements,
          "Enter a job title and announcement # (2+ characters)."
        );
        return;
      }
      setResumeLinkError(elements, "");
      const jobRef = {
        jobId: announcement,
        announcementNumber: announcement,
        title,
        agency: agency || "TBD",
        grade: grade || "TBD",
      };
      resumeCareerStore.createResumeForJob(jobRef);
      if (elements.linkDialog) {
        elements.linkDialog.hidden = true;
      }
      if (elements.jobTitleInput) {
        elements.jobTitleInput.value = "";
      }
      if (elements.jobAgencyInput) {
        elements.jobAgencyInput.value = "";
      }
      if (elements.jobGradeInput) {
        elements.jobGradeInput.value = "";
      }
      if (elements.jobAnnouncementInput) {
        elements.jobAnnouncementInput.value = "";
      }
      setResumeLinkError(elements, "");
    });
  }
  if (elements.jobTitleInput && elements.jobAnnouncementInput) {
    const validateLinkInputs = () => {
      const title =
        elements.jobTitleInput && elements.jobTitleInput.value
          ? elements.jobTitleInput.value.trim()
          : "";
      const announcement =
        elements.jobAnnouncementInput && elements.jobAnnouncementInput.value
          ? elements.jobAnnouncementInput.value.trim()
          : "";
      if (title.length >= 2 && announcement.length >= 2) {
        setResumeLinkError(elements, "");
      }
    };
    elements.jobTitleInput.addEventListener("input", validateLinkInputs);
    elements.jobAnnouncementInput.addEventListener("input", validateLinkInputs);
  }

  if (elements.exportButton) {
    elements.exportButton.addEventListener("click", (event) => {
      event.preventDefault();
      const state = resumeCareerStore.getState();
      const resume = getActiveResume(state);
      if (!resume) {
        return;
      }
      resumeCareerStore.exportResume(resume.id);
      const resumeJobId =
        resume && resume.job
          ? resume.job.jobId || resume.job.announcementNumber || ""
          : "";
      const resumeTitle =
        resume && resume.job && typeof resume.job.title === "string"
          ? resume.job.title.trim()
          : "";
      jobSelectionStore.logResumeExported({
        jobId: resumeJobId,
        title: resumeTitle,
        reason: "Exported resume for USAJOBS",
        source: "Resume",
      });
      const nextState = resumeCareerStore.getState();
      const updatedResume = getActiveResume(nextState);
      const toastBody =
        updatedResume && updatedResume.lastExportedFile
          ? updatedResume.lastExportedFile
          : resumeTitle;
      incrementBadgeWithToast({
        incrementBadge: () => {
          renderActivityLog(elements);
          updateResumeNavBadge(elements);
        },
        toast: emitTopCenterToast,
        toastTitle: "Exported for USAJOBS",
        toastBody,
      });
      renderResumeCareerView(nextState, elements);
    });
  }

  if (elements.promptForm && elements.promptInput) {
    elements.promptForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const prompt = elements.promptInput.value.trim();
      if (!prompt) {
        return;
      }
      const state = resumeCareerStore.getState();
      const resume = getActiveResume(state);
      if (!resume) {
        if (elements.advisorStatus) {
          elements.advisorStatus.textContent =
            "Select a resume before submitting a prompt.";
        }
        return;
      }
      resumeCareerStore.applyPromptUpdate(resume.id, prompt);
      elements.promptInput.value = "";
      renderResumeCareerView(resumeCareerStore.getState(), elements);
    });
  }

  document.addEventListener("click", () => {
    closeResumeMenu(elements);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeResumeMenu(elements);
    }
  });

  if (elements.resumeScroll) {
    elements.resumeScroll.addEventListener("scroll", () => {
      closeResumeMenu(elements);
    });
  }
};

const buildResumeJobId = (title, agency) => {
  const baseTitle = title.replace(/\s+/g, "-");
  const baseAgency = deriveAgencyAbbrev(agency);
  return `${baseAgency}-${baseTitle}-${Date.now()}`;
};

// WHY: Conversations view must show a scannable list of threads.
// HOW: Filter, sort, and render rows with inline actions.
const renderConversationList = () => {
  if (!conversationViewElements || !conversationViewElements.conversationList) {
    return;
  }
  const list = conversationViewElements.conversationList;
  const searchValue = conversationViewElements.conversationSearch
    ? conversationViewElements.conversationSearch.value.trim().toLowerCase()
    : "";
  const threads = conversationState.threads.slice(0).sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt).getTime();
    return bTime - aTime;
  });
  const filtered = searchValue
    ? threads.filter((thread) =>
        thread.title.toLowerCase().includes(searchValue)
      )
    : threads;

  list.innerHTML = "";
  if (conversationViewElements.conversationEmpty) {
    conversationViewElements.conversationEmpty.hidden = filtered.length > 0;
  }

  filtered.forEach((thread) => {
    const row = document.createElement("div");
    row.className = "conversation-row";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "conversation-item";
    button.classList.toggle(
      "is-active",
      thread.id === conversationState.activeThreadId
    );
    button.addEventListener("click", () => {
      selectThread(thread.id);
    });

    const title = document.createElement("div");
    title.className = "conversation-title";
    title.textContent = thread.title || "Conversation";
    button.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "conversation-time";
    meta.textContent = formatTimestamp(thread.updatedAt || thread.createdAt);
    button.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "conversation-actions";

    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "conversation-action";
    rename.textContent = "Rename";
    rename.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextTitle = window.prompt("Rename conversation", thread.title);
      if (nextTitle) {
        renameThread(thread.id, nextTitle);
      }
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "conversation-action";
    remove.textContent = "Delete";
    remove.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const confirmed = window.confirm("Delete this conversation?");
      if (confirmed) {
        deleteThread(thread.id);
      }
    });

    actions.appendChild(rename);
    actions.appendChild(remove);

    row.appendChild(button);
    row.appendChild(actions);
    list.appendChild(row);
  });
};

// WHY: The detail panel provides the current thread context and CTA.
// HOW: Populate title, updated time, and message count.
const renderConversationDetail = () => {
  if (!conversationViewElements) {
    return;
  }
  const thread = getActiveThread();
  if (conversationViewElements.conversationDetailTitle) {
    conversationViewElements.conversationDetailTitle.textContent =
      thread.title || "Conversation";
  }
  if (conversationViewElements.conversationDetailMeta) {
    conversationViewElements.conversationDetailMeta.textContent = `Updated ${formatTimestamp(
      thread.updatedAt || thread.createdAt
    )} · ${thread.messages.length} messages`;
  }
};

// WHY: The list and detail must stay in sync.
// HOW: Re-render both panels together.
const renderConversationsView = () => {
  renderConversationList();
  renderConversationDetail();
};

// WHY: Navigation needs to behave like a simple route switch.
// HOW: Toggle the active view and nav styling without a router.
const getWorkspaceRoute = (viewId) => {
  return (
    WORKSPACE_ROUTES.find((route) => route.id === viewId) ||
    WORKSPACE_ROUTES.find((route) => route.id === "saved-jobs")
  );
};

// ===============================================================
// WHY: Benefits tooling metadata lives in a dedicated shared module.
// HOW: Resolve the module defensively so renderer does not hard-crash.
// ===============================================================
const getBenefitsToolsApi = () => {
  const api = window.PathOSBenefitsTools;
  if (!api || typeof api.getBenefitsToolById !== "function") {
    return null;
  }
  return api;
};

// ===============================================================
// WHY: Benefits workspace needs grouped DOM references for fast updates.
// HOW: Collect every relevant element once during startup.
// ===============================================================
const collectBenefitsWorkspaceElements = (root) => {
  if (!root) {
    return null;
  }
  const frames = {};
  Array.from(root.querySelectorAll("[data-benefits-frame]")).forEach((frame) => {
    const key = frame.dataset.benefitsFrame;
    if (key) {
      frames[key] = frame;
    }
  });
  return {
    root,
    frames,
    railButtons: Array.from(root.querySelectorAll("[data-benefits-rail]")),
    routeButtons: Array.from(root.querySelectorAll("[data-benefits-route]")),
    overviewSections: Array.from(root.querySelectorAll("[data-benefits-section]")),
    openToolButtons: Array.from(root.querySelectorAll("[data-benefits-open-tool]")),
    openOverviewButtons: Array.from(
      root.querySelectorAll("[data-benefits-open-overview]")
    ),
    toolTitle: root.querySelector("[data-benefits-tool-title]"),
    toolSource: root.querySelector("[data-benefits-tool-source]"),
    toolWarning: root.querySelector("[data-benefits-tool-warning]"),
    toolWebview: root.querySelector("#benefits-webview"),
    webviewWarning: root.querySelector("[data-benefits-webview-warning]"),
    toolFallback: root.querySelector("#benefits-webview-fallback"),
    toolLoading: root.querySelector("#benefits-webview-loading"),
    popoutCloseButton: root.querySelector("[data-benefits-popout-close]"),
    returnButton: root.querySelector("[data-benefits-return]"),
    openChooserButton: root.querySelector("[data-benefits-open-chooser]"),
    backSearchButton: root.querySelector("[data-benefits-back-search]"),
    privacyCards: Array.from(root.querySelectorAll("[data-privacy-card]")),
  };
};

// ===============================================================
// WHY: PathAdvisor must swap to a guidance-only mode for calculators.
// HOW: Toggle visibility for all elements tagged with advisor modes.
// ===============================================================
const applyAdvisorMode = (elements, mode) => {
  if (!elements || !elements.advisorModeSections) {
    return;
  }
  elements.advisorModeSections.forEach((section) => {
    const sectionMode = section.dataset.advisorMode || "live";
    section.hidden = sectionMode !== mode;
  });
};

// ===============================================================
// WHY: The internal rail should reflect the active Benefits frame.
// HOW: Toggle the active class based on the selected frame id.
// ===============================================================
const applyBenefitsRailSelection = (elements, selectionId) => {
  if (!elements || !elements.railButtons) {
    return;
  }
  elements.railButtons.forEach((button) => {
    const target = button.dataset.benefitsRail;
    button.classList.toggle("is-active", target === selectionId);
  });
};

// ===============================================================
// WHY: Routing control needs to expand the right section first.
// HOW: Open the matching details block and collapse others.
// ===============================================================
const applyBenefitsOverviewRouting = (elements, routeId) => {
  if (!elements || !elements.overviewSections) {
    return;
  }
  elements.overviewSections.forEach((section) => {
    const key = section.dataset.benefitsSection;
    const shouldOpen = routeId === "all" || key === routeId;
    section.open = shouldOpen;
  });
  if (elements.routeButtons) {
    elements.routeButtons.forEach((button) => {
      const target = button.dataset.benefitsRoute;
      button.classList.toggle("is-active", target === routeId);
      button.setAttribute("aria-pressed", target === routeId ? "true" : "false");
    });
  }
};

// ===============================================================
// WHY: Embedded tool frames must show consistent title/source text.
// HOW: Pull metadata from the tool catalog and update the UI.
// ===============================================================
const applyBenefitsToolDetails = (elements, tool) => {
  if (!elements || !tool) {
    return;
  }
  if (elements.toolTitle) {
    elements.toolTitle.textContent = tool.title || "Tool reference";
  }
  if (elements.toolSource) {
    elements.toolSource.textContent = tool.sourceName || "External source";
  }
  if (elements.toolWarning) {
    elements.toolWarning.hidden = !tool.placeholder;
  }
  if (elements.guidanceTitle) {
    elements.guidanceTitle.textContent = tool.title || "PathAdvisor";
  }
  if (elements.guidanceList && Array.isArray(tool.guidance)) {
    elements.guidanceList.innerHTML = "";
    tool.guidance.forEach((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      elements.guidanceList.appendChild(item);
    });
  }
};

const setBenefitsPopoutState = (elements, isOpen) => {
  const nextState = Boolean(isOpen);
  benefitsWorkspaceState.toolPopoutOpen = nextState;
  if (elements && elements.popoutCloseButton) {
    elements.popoutCloseButton.disabled = !nextState;
  }
};

const requestBenefitsPopoutClose = () => {
  if (window.benefitsPopout && window.benefitsPopout.close) {
    window.benefitsPopout.close();
  }
};

const BENEFITS_TAB_IDS = [
  "overview",
  "salary",
  "retirement",
  "health",
  "risk",
  "tools",
  "decision",
  "outlook",
];

const BENEFITS_TOOL_FRAMES = ["calculator", "tsp-chooser", "pay-chooser"];

const getBenefitsTabSelectionForFrame = (frameId) => {
  if (BENEFITS_TOOL_FRAMES.includes(frameId)) {
    return "tools";
  }
  return frameId;
};

const resolveBenefitsFrameId = (frameId) => {
  if (frameId === "tools") {
    return benefitsWorkspaceState.toolsFrame;
  }
  return frameId;
};

// ===============================================================
// WHY: Privacy toggles must mask sensitive content on demand.
// HOW: Bind per-card buttons that toggle a masked class and text.
// ===============================================================
const setupPrivacyCards = (elements) => {
  if (!elements || !elements.privacyCards) {
    return;
  }
  elements.privacyCards.forEach((card) => {
    const toggle = card.querySelector("[data-privacy-toggle]");
    const body = card.querySelector("[data-privacy-body]");
    const mask = card.querySelector("[data-privacy-mask]");
    if (!toggle || !body || !mask) {
      return;
    }
    const setMasked = (isMasked) => {
      body.classList.toggle("is-masked", isMasked);
      mask.hidden = !isMasked;
      toggle.textContent = isMasked ? "Show details" : "Hide details";
      toggle.setAttribute("aria-pressed", isMasked ? "true" : "false");
    };
    setMasked(false);
    toggle.addEventListener("click", () => {
      const nextMasked = !body.classList.contains("is-masked");
      setMasked(nextMasked);
    });
  });
};

// ===============================================================
// WHY: Explore (PathOS) relies on a shared mock data module.
// HOW: Guard access so the UI fails softly when the script is missing.
// ===============================================================
const getExplorePathosApi = () => {
  const api = window.PathOSExplorePathos;
  if (!api || typeof api.buildExploreRecommendations !== "function") {
    return null;
  }
  return api;
};

// ===============================================================
// WHY: Explore (PathOS) needs a simple DOM wiring bundle.
// HOW: Collect prompt, results, and advisor panel references once.
// ===============================================================
const collectExplorePathosElements = (root) => {
  if (!root) {
    return null;
  }
  return {
    promptInput: root.querySelector("[data-explore-prompt]"),
    exampleButton: root.querySelector("[data-explore-example]"),
    submitButton: root.querySelector("[data-explore-submit]"),
    submitLabel: root.querySelector("[data-explore-submit-label]"),
    submitSpinner: root.querySelector("[data-explore-submit-spinner]"),
    resultsRoot: root.querySelector("[data-explore-results]"),
    resultsMeta: root.querySelector("[data-explore-results-meta]"),
    emptyState: root.querySelector("[data-explore-empty]"),
  };
};

// ===============================================================
// WHY: Explore reasoning must render inside the PathAdvisor sidebar.
// HOW: Collect the sidebar summary and reasoning list elements.
// ===============================================================
const collectExploreAdvisorElements = (root) => {
  if (!root) {
    return null;
  }
  return {
    advisorSummary: root.querySelector("[data-explore-advisor-summary]"),
    advisorReasons: Array.from(root.querySelectorAll("[data-explore-advisor-reason]")),
  };
};

// ===============================================================
// WHY: The Explore button needs visible feedback during mock loading.
// HOW: Toggle disabled state, label, and spinner visibility.
// ===============================================================
const setExplorePathosLoading = (elements, isLoading) => {
  if (!elements || !elements.submitButton) {
    return;
  }
  elements.submitButton.disabled = isLoading;
  elements.submitButton.classList.toggle("is-loading", isLoading);
  if (elements.submitLabel) {
    elements.submitLabel.textContent = isLoading ? "Exploring…" : "Explore Roles";
  }
  if (elements.submitSpinner) {
    elements.submitSpinner.hidden = !isLoading;
  }
};

// ===============================================================
// WHY: Explore results should render fresh after each mock run.
// HOW: Clear the container before adding new role cards.
// ===============================================================
const clearExploreResults = (root) => {
  if (!root) {
    return;
  }
  while (root.firstChild) {
    root.removeChild(root.firstChild);
  }
};

// ===============================================================
// WHY: Explore cards need consistent reasoning formatting.
// HOW: Build list items that pair a label with its reasoning text.
// ===============================================================
const buildExploreReasonItem = (label, text) => {
  const item = document.createElement("li");
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  item.appendChild(strong);
  item.appendChild(document.createTextNode(text));
  return item;
};

// ===============================================================
// WHY: USAJOBS popouts must only open trusted, non-broken URLs.
// HOW: Validate URLs and fall back to a safe search query when needed.
// ===============================================================
const USAJOBS_REFERENCE_TITLE = "USAJOBS (Reference)";

const openUsaJobsReferencePopout = (role, url) => {
  if (!window.benefitsPopout || !window.benefitsPopout.open) {
    return;
  }
  const guidance = [
    "Confirm the series, grade, and location match your target path.",
    "Review closing date, requirements, and required documents before applying.",
    "Treat USAJOBS as the source of truth; PathOS guidance stays advisory.",
  ];
  window.benefitsPopout.open({
    toolId: "usajobs-reference",
    url,
    title: USAJOBS_REFERENCE_TITLE,
    source: "USAJOBS.gov",
    isPlaceholder: false,
    guidance,
    trust: "Sourced from USAJOBS, guided by PathOS.",
    ctaLabel: "Back to Explore",
    navTitle: "USAJOBS",
    // Even if the primary URL is valid, USAJOBS pages can expire; fallback prevents demo-breaking 404 states.
    usajobsFallbackUrl: buildUsaJobsFallbackUrl(role),
  });
};

// ===============================================================
// WHY: The Explore role cards should be created from structured data.
// HOW: Build DOM nodes with textContent to avoid HTML injection.
// ===============================================================
const renderExploreRoleCards = (elements, roles) => {
  if (!elements || !elements.resultsRoot) {
    return;
  }
  clearExploreResults(elements.resultsRoot);

  const setActiveJobFromRole = (role) => {
    const context = activeJobContextApi.buildActiveJobContextFromExploreRole(role);
    if (!context) {
      activeJobContextStore.clearActiveJob("explore-role-invalid");
      return;
    }
    activeJobContextStore.setActiveJob(context, "explore-role-selected");
  };

const setSelectedJobFromRole = (role) => {
  const postingUrl = resolveUsaJobsReferenceUrl(role);
  const selection = selectedJobStoreApi.buildSelectedJobFromExploreRole(
    Object.assign({}, role, { usajobsUrl: postingUrl })
  );
  if (!selection) {
    return;
  }
  recordRecentSelection(selection);
  selectedJobStore.setSelectedJob(selection, "explore-role-selected");
};

  if (!Array.isArray(roles) || roles.length === 0) {
    activeJobContextStore.clearActiveJob("explore-roles-empty");
    if (elements.emptyState) {
      elements.emptyState.hidden = false;
    }
    if (elements.resultsMeta) {
      elements.resultsMeta.textContent = "0 roles";
    }
    return;
  }

  if (elements.emptyState) {
    elements.emptyState.hidden = true;
  }
  if (elements.resultsMeta) {
    elements.resultsMeta.textContent = `${roles.length} roles`;
  }

  roles.forEach((role) => {
    const card = document.createElement("article");
    card.className = "pathos-explore-card pathos-explore-role-card";
    card.addEventListener("click", () => {
      setActiveJobFromRole(role);
      setSelectedJobFromRole(role);
    });

    const header = document.createElement("div");
    header.className = "pathos-explore-role-header";

    const title = document.createElement("h3");
    title.className = "pathos-explore-role-title";
    title.textContent = role.title || "Role";

    const badge = document.createElement("span");
    badge.className = "pathos-explore-pill";
    badge.textContent = "Sourced from USAJOBS";

    header.appendChild(title);
    header.appendChild(badge);

    const meta = document.createElement("div");
    meta.className = "pathos-explore-role-meta";
    meta.textContent = `${role.series || "—"} • ${role.gradeBand || "—"}`;

    const agency = document.createElement("div");
    agency.className = "pathos-explore-role-agency";
    agency.textContent = `${role.agency || "Agency"} · ${role.location || "Location"}`;

    const actions = document.createElement("div");
    actions.className = "pathos-explore-role-actions";

    const whyButton = document.createElement("button");
    whyButton.className = "benefits-action is-outline";
    whyButton.type = "button";
    whyButton.textContent = "Why this matches me";
    whyButton.setAttribute("aria-expanded", "false");

    const viewButton = document.createElement("button");
    viewButton.className = "benefits-action is-outline";
    viewButton.type = "button";
    const viewLabel = document.createElement("span");
    viewLabel.textContent = "View in USAJOBS";
    viewButton.appendChild(viewLabel);

    const externalIcon = document.createElement("span");
    externalIcon.className = "pathos-explore-external-icon";
    externalIcon.setAttribute("aria-hidden", "true");
    externalIcon.textContent = "↗";
    viewButton.appendChild(externalIcon);

    actions.appendChild(whyButton);
    actions.appendChild(viewButton);

    const whyPanel = document.createElement("div");
    whyPanel.className = "pathos-explore-why";
    whyPanel.hidden = true;

    const whyCard = document.createElement("div");
    whyCard.className = "pathos-explore-why-card privacy-card";
    whyCard.setAttribute("data-privacy-card", "");

    const whyHeader = document.createElement("div");
    whyHeader.className = "privacy-card-header";

    const whyTitle = document.createElement("div");
    whyTitle.className = "pathos-explore-why-title";
    whyTitle.textContent = "Why this matches me";

    const privacyToggle = document.createElement("button");
    privacyToggle.className = "privacy-toggle";
    privacyToggle.type = "button";
    privacyToggle.setAttribute("data-privacy-toggle", "");
    privacyToggle.setAttribute("aria-pressed", "false");
    privacyToggle.textContent = "Hide details";

    whyHeader.appendChild(whyTitle);
    whyHeader.appendChild(privacyToggle);

    const whyBody = document.createElement("div");
    whyBody.className = "privacy-card-body";
    whyBody.setAttribute("data-privacy-body", "");

    const summary = document.createElement("div");
    summary.className = "pathos-explore-why-summary";
    summary.textContent = role.reasoning
      ? `Match summary: ${role.reasoning.summary}`
      : "Match summary: Pending details.";

    const reasonsList = document.createElement("ul");
    reasonsList.className = "pathos-explore-why-list";
    const reasons = role.reasoning ? role.reasoning.reasons : null;
    reasonsList.appendChild(
      buildExploreReasonItem(
        "Promotion trajectory",
        reasons && reasons.promotion ? reasons.promotion : "Promotion details pending."
      )
    );
    reasonsList.appendChild(
      buildExploreReasonItem(
        "Qualification proximity",
        reasons && reasons.qualification ? reasons.qualification : "Qualification details pending."
      )
    );
    reasonsList.appendChild(
      buildExploreReasonItem(
        "Location flexibility",
        reasons && reasons.location ? reasons.location : "Location details pending."
      )
    );
    reasonsList.appendChild(
      buildExploreReasonItem(
        "Benefits impact",
        reasons && reasons.benefits ? reasons.benefits : "Benefits details pending."
      )
    );

    const tradeoff = document.createElement("div");
    tradeoff.className = "pathos-explore-why-tradeoff";
    const tradeoffLabel = document.createElement("strong");
    tradeoffLabel.textContent = "Tradeoff / Watchout: ";
    tradeoff.appendChild(tradeoffLabel);
    tradeoff.appendChild(
      document.createTextNode(
        role.reasoning && role.reasoning.tradeoff
          ? role.reasoning.tradeoff
          : "Tradeoff details pending."
      )
    );

    whyBody.appendChild(summary);
    whyBody.appendChild(reasonsList);
    whyBody.appendChild(tradeoff);

    const whyMask = document.createElement("div");
    whyMask.className = "privacy-card-mask";
    whyMask.setAttribute("data-privacy-mask", "");
    whyMask.hidden = true;
    whyMask.textContent = "Details hidden. Toggle to view.";

    whyCard.appendChild(whyHeader);
    whyCard.appendChild(whyBody);
    whyCard.appendChild(whyMask);
    whyPanel.appendChild(whyCard);

    whyButton.addEventListener("click", () => {
      const isExpanded = whyPanel.hidden;
      whyPanel.hidden = !isExpanded;
      whyButton.setAttribute("aria-expanded", isExpanded ? "true" : "false");
      whyButton.textContent = isExpanded ? "Hide match details" : "Why this matches me";
    });

    viewButton.addEventListener("click", () => {
      setActiveJobFromRole(role);
      setSelectedJobFromRole(role);
      const targetUrl = resolveUsaJobsReferenceUrl(role);
      openUsaJobsReferencePopout(role, targetUrl);
    });

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(agency);
    card.appendChild(actions);
    card.appendChild(whyPanel);

    elements.resultsRoot.appendChild(card);
  });

  setupPrivacyCards({
    privacyCards: Array.from(elements.resultsRoot.querySelectorAll("[data-privacy-card]")),
  });

  const activeJobState = activeJobContextStore.getState();
  if (
    activeJobState &&
    activeJobState.activeJob &&
    activeJobState.activeJob.source === "Explore" &&
    !activeJobContextApi.isActiveJobInRoleList(activeJobState.activeJob, roles)
  ) {
    activeJobContextStore.clearActiveJob("explore-role-missing");
  }
};

// ===============================================================
// WHY: The PathAdvisor panel needs fresh reasoning cues after each run.
// HOW: Update summary copy and each reasoning bullet in place.
// ===============================================================
const renderExploreAdvisorPanel = (elements, advisor) => {
  if (!elements) {
    return;
  }
  if (elements.advisorSummary) {
    elements.advisorSummary.textContent =
      advisor && advisor.summary ? advisor.summary : "Share a prompt to see a snapshot.";
  }
  if (!elements.advisorReasons) {
    return;
  }
  elements.advisorReasons.forEach((item) => {
    const key = item.dataset.exploreAdvisorReason || "";
    if (advisor && advisor.reasons && advisor.reasons[key]) {
      item.textContent = advisor.reasons[key];
      return;
    }
    item.textContent = "Prompt details will refine this signal.";
  });
};

// ===============================================================
// WHY: Explore prompt input must become a stable backend search request.
// HOW: Normalize UI text and keep contract fields explicit so renderer
//      sends predictable intent through preload/main IPC.
// INPUT: Prompt text from the Explore textarea.
// OUTPUT: Search payload for `window.pathosBackend.searchJobs`.
// ERROR: Never throws; falls back to safe defaults.
// ===============================================================
const buildExploreSearchPayload = (promptValue) => {
  const keyword =
    typeof promptValue === "string" && promptValue.trim()
      ? promptValue.trim()
      : "";
  return {
    keyword,
    page: 1,
    page_size: 10,
  };
};

// ===============================================================
// WHY: Backend response envelopes can evolve while UI cards stay stable.
// HOW: Read the first known list field and return an array only.
// INPUT: Backend success `data` payload.
// OUTPUT: Array of backend job records.
// ERROR: Never throws; returns empty array on unknown shape.
// ===============================================================
const extractBackendSearchResults = (data) => {
  if (Array.isArray(data)) {
    return data;
  }
  if (!data || typeof data !== "object") {
    return [];
  }
  if (Array.isArray(data.results)) {
    return data.results;
  }
  if (Array.isArray(data.items)) {
    return data.items;
  }
  if (Array.isArray(data.data)) {
    return data.data;
  }
  return [];
};

// ===============================================================
// WHY: Explore cards need one consistent role shape even when backend
//      fields differ from local mock field names.
// HOW: Map common backend keys into the existing Explore card contract.
// INPUT: One backend job record + originating prompt.
// OUTPUT: Role object consumable by `renderExploreRoleCards`.
// ERROR: Never throws; missing fields degrade to user-safe defaults.
// ===============================================================
const mapBackendJobToExploreRole = (record, promptValue, index) => {
  const item = record && typeof record === "object" ? record : {};
  const title =
    typeof item.title === "string" && item.title.trim()
      ? item.title.trim()
      : typeof item.job_title === "string" && item.job_title.trim()
        ? item.job_title.trim()
        : typeof item.position_title === "string" && item.position_title.trim()
          ? item.position_title.trim()
          : "Federal role";
  const series =
    typeof item.series === "string" && item.series.trim()
      ? item.series.trim()
      : typeof item.series_code === "string" && item.series_code.trim()
        ? item.series_code.trim()
        : "";
  const gradeBand =
    typeof item.grade_band === "string" && item.grade_band.trim()
      ? item.grade_band.trim()
      : typeof item.grade === "string" && item.grade.trim()
        ? item.grade.trim()
        : typeof item.pay_grade === "string" && item.pay_grade.trim()
          ? item.pay_grade.trim()
          : "GS range unavailable";
  const agency =
    typeof item.agency === "string" && item.agency.trim()
      ? item.agency.trim()
      : typeof item.company === "string" && item.company.trim()
        ? item.company.trim()
        : typeof item.department === "string" && item.department.trim()
          ? item.department.trim()
          : "Federal agency";
  const location =
    typeof item.location === "string" && item.location.trim()
      ? item.location.trim()
      : typeof item.city_state === "string" && item.city_state.trim()
        ? item.city_state.trim()
        : typeof item.location_text === "string" && item.location_text.trim()
          ? item.location_text.trim()
          : "Location unavailable";
  const remoteEligible =
    item.remote_only === true ||
    item.is_remote === true ||
    item.remote === true ||
    item.remote_eligible === true;
  const url =
    typeof item.usajobs_url === "string" && item.usajobs_url.trim()
      ? item.usajobs_url.trim()
      : typeof item.posting_url === "string" && item.posting_url.trim()
        ? item.posting_url.trim()
        : typeof item.url === "string" && item.url.trim()
          ? item.url.trim()
          : buildUsaJobsFallbackUrl({
              title,
              series,
            });
  const promptHint =
    typeof promptValue === "string" && promptValue.trim()
      ? promptValue.trim()
      : "your search prompt";

  return {
    id:
      typeof item.id === "string" && item.id.trim()
        ? item.id.trim()
        : `backend-role-${index}`,
    title,
    series,
    gradeBand,
    agency,
    location,
    isRemoteEligible: remoteEligible,
    usajobsUrl: url,
    reasoning: {
      summary: `Matched from backend search for ${promptHint}.`,
      reasons: {
        promotion: "Review grade progression against your timeline goals.",
        qualification: "Confirm qualifications against the official posting.",
        location: remoteEligible
          ? "Remote eligibility appears available."
          : "Location appears tied to an on-site footprint.",
        benefits: "Use Benefits & Compensation tools for deeper comparisons.",
      },
      tradeoff: "Backend relevance is directional; verify details in USAJOBS.",
    },
  };
};

// ===============================================================
// WHY: Renderer should show a calm, safe failure message when backend
//      search fails instead of throwing or spamming notifications.
// HOW: Reuse the existing inline results meta area for one message.
// INPUT: Explore element bundle + backend error object.
// OUTPUT: Updates UI text only.
// ERROR: Never throws.
// ===============================================================
const showExploreSearchError = (elements, error) => {
  if (!elements || !elements.resultsMeta) {
    return;
  }
  const message = buildBackendErrorConfirmation(error);
  elements.resultsMeta.textContent = message;
  console.error("[ExplorePathOS] backend jobs search failed", error);
};

// ===============================================================
// WHY: Explore submit should route search intent through desktop IPC.
// HOW: Bind example + submit handlers once and call the trusted
//      flow: renderer -> preload -> main -> backend client -> backend.
// ===============================================================
const setupExplorePathos = (elements) => {
  if (!elements) {
    return;
  }
  const api = getExplorePathosApi();
  if (!api) {
    return;
  }

  if (elements.promptInput && typeof api.DEFAULT_PROMPT === "string") {
    elements.promptInput.value = api.DEFAULT_PROMPT;
    explorePathosState.lastPrompt = api.DEFAULT_PROMPT;
  }

  if (elements.exampleButton && elements.promptInput) {
    elements.exampleButton.addEventListener("click", () => {
      explorePathosState.exampleIndex += 1;
      const nextPrompt = api.getExamplePrompt(explorePathosState.exampleIndex);
      elements.promptInput.value = nextPrompt;
      explorePathosState.lastPrompt = nextPrompt;
    });
  }

  if (elements.submitButton && elements.promptInput) {
    elements.submitButton.addEventListener("click", async () => {
      if (explorePathosState.isLoading) {
        return;
      }
      const promptValue = elements.promptInput.value || "";
      explorePathosState.isLoading = true;
      setExplorePathosLoading(elements, true);
      try {
        const mockPayload = api.buildExploreRecommendations(promptValue);
        if (!window.pathosBackend || typeof window.pathosBackend.searchJobs !== "function") {
          renderExploreRoleCards(elements, mockPayload.roles);
          renderExploreAdvisorPanel(elements, mockPayload.advisor);
          if (elements.resultsMeta) {
            elements.resultsMeta.textContent = "Backend bridge unavailable. Showing local data.";
          }
          explorePathosState.lastPrompt = promptValue;
          return;
        }

        const requestPayload = buildExploreSearchPayload(promptValue);
        const backendResult = unwrapBackendResult(
          await window.pathosBackend.searchJobs(requestPayload),
          "Unable to search roles right now."
        );

        if (!backendResult.ok) {
          showExploreSearchError(elements, backendResult.error);
          return;
        }

        const backendRows = extractBackendSearchResults(backendResult.data);
        const roles = backendRows.map((row, index) =>
          mapBackendJobToExploreRole(row, promptValue, index)
        );
        explorePathosState.lastPrompt = promptValue;
        renderExploreRoleCards(elements, roles);
        renderExploreAdvisorPanel(elements, mockPayload.advisor);
        if (elements.resultsMeta) {
          elements.resultsMeta.textContent = `${roles.length} roles`;
        }
      } finally {
        explorePathosState.isLoading = false;
        setExplorePathosLoading(elements, false);
      }
    });
  }

  setExplorePathosLoading(elements, false);
  renderExploreAdvisorPanel(elements, null);
};

const setBenefitsWebviewWarning = (elements, message) => {
  if (!elements || !elements.webviewWarning) {
    return;
  }
  if (typeof message === "string" && message.trim()) {
    elements.webviewWarning.textContent = message;
    elements.webviewWarning.hidden = false;
    return;
  }
  elements.webviewWarning.hidden = true;
};

// ===============================================================
// WHY: Webview activity should pause when tools are not visible.
// HOW: Clear the src and hide the node when leaving embedded mode.
// ===============================================================
const clearBenefitsWebview = (elements) => {
  if (!elements || !elements.toolWebview) {
    return;
  }
  elements.toolWebview.removeAttribute("src");
  elements.toolWebview.hidden = true;
  setBenefitsWebviewWarning(elements, "");
};

// ===============================================================
// WHY: Tool selection must drive the embedded webview navigation.
// HOW: Apply the new URL and unhide the webview for the calculator view.
// ===============================================================
const applyBenefitsWebviewNavigation = (elements, nextUrl) => {
  if (!elements || !elements.toolWebview) {
    return;
  }
  if (!isAllowedBenefitsUrl(nextUrl)) {
    clearBenefitsWebview(elements);
    setBenefitsWebviewWarning(
      elements,
      "Navigation blocked. Only http/https destinations are allowed."
    );
    return;
  }
  elements.toolWebview.hidden = false;
  elements.toolWebview.setAttribute("src", nextUrl);
  setBenefitsWebviewWarning(elements, "");
};

// ===============================================================
// WHY: Internal frames are the primary navigation within this workspace.
// HOW: Hide non-active frames, update rail selection, and adjust advisor mode.
// ===============================================================
const setBenefitsActiveFrame = (elements, frameId) => {
  if (!elements || !elements.frames) {
    return;
  }
  const previousFrame = benefitsWorkspaceState.activeFrame;
  const resolvedFrameId = resolveBenefitsFrameId(frameId);
  benefitsWorkspaceState.activeFrame = resolvedFrameId;
  if (resolvedFrameId === "pay-chooser" || resolvedFrameId === "tsp-chooser") {
    benefitsWorkspaceState.toolsFrame = resolvedFrameId;
  }
  const selectionId = getBenefitsTabSelectionForFrame(resolvedFrameId);
  if (BENEFITS_TAB_IDS.includes(selectionId)) {
    benefitsWorkspaceState.internalRailSelection = selectionId;
  }
  Object.keys(elements.frames).forEach((key) => {
    elements.frames[key].hidden = key !== resolvedFrameId;
  });
  applyBenefitsRailSelection(elements, benefitsWorkspaceState.internalRailSelection);
  const advisorMode = resolvedFrameId === "calculator" ? "calculator" : "live";
  applyAdvisorMode(elements, advisorMode);
  if (resolvedFrameId !== "calculator") {
    clearBenefitsWebview(elements);
  }
  if (typeof scheduleWorkspaceViewportSync === "function") {
    // WHY: BrowserView bounds only update from explicit syncs.
    // HOW: Resync after any tab swap, with a second tick when calculator flips.
    scheduleWorkspaceViewportSync();
    if (resolvedFrameId === "calculator" || previousFrame === "calculator") {
      window.requestAnimationFrame(() => {
        scheduleWorkspaceViewportSync();
      });
    }
  }
};

// ===============================================================
// WHY: Embedded tools need a single entry point for opening a URL.
// HOW: Resolve tool metadata, update UI, and point the webview at the URL.
// ===============================================================
const openBenefitsTool = (elements, toolId) => {
  const api = getBenefitsToolsApi();
  if (!elements || !api) {
    return;
  }
  const tool = api.getBenefitsToolById(toolId);
  if (!tool) {
    return;
  }
  benefitsWorkspaceState.activeToolId = tool.id;
  benefitsWorkspaceState.activeToolGroup = tool.type;
  const chooserFrame = getBenefitsChooserFrameForTool(tool.id);
  if (chooserFrame === "pay-chooser" || chooserFrame === "tsp-chooser") {
    benefitsWorkspaceState.toolsFrame = chooserFrame;
  }
  applyBenefitsToolDetails(elements, tool);
  if (elements.toolFallback) {
    elements.toolFallback.hidden = true;
  }
  if (elements.toolLoading) {
    elements.toolLoading.classList.add("is-loading");
    elements.toolLoading.setAttribute("aria-hidden", "false");
  }
  setBenefitsActiveFrame(elements, "calculator");
  clearBenefitsWebview(elements);
  if (window.benefitsPopout && window.benefitsPopout.open) {
    window.benefitsPopout.open({
      toolId: tool.id,
      url: tool.url,
      title: tool.title,
      source: tool.sourceName,
      isPlaceholder: tool.placeholder,
      guidance: Array.isArray(tool.guidance) ? tool.guidance.slice() : [],
      ctaLabel: "Back to Benefits & Compensation",
      navTitle: tool.title,
    });
  }
};

// ===============================================================
// WHY: "Open another calculator" should return to the right chooser.
// HOW: Map tools to the appropriate chooser or section frame.
// ===============================================================
const getBenefitsChooserFrameForTool = (toolId) => {
  if (toolId === "opm-fehb-compare") {
    return "health";
  }
  if (toolId === "opm-gs-pay-tables" || toolId === "private-salary-estimates") {
    return "pay-chooser";
  }
  return "tsp-chooser";
};

// ===============================================================
// WHY: Benefits workspace needs reliable event wiring on startup.
// HOW: Bind rail, routing, tool, and footer actions once.
// ===============================================================
const setupBenefitsWorkspace = (elements) => {
  if (!elements) {
    return;
  }
  setupPrivacyCards(elements);
  if (elements.railButtons) {
    elements.railButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.benefitsRail || "overview";
        benefitsWorkspaceState.internalRailSelection = target;
        setBenefitsActiveFrame(elements, target);
      });
    });
  }
  if (elements.routeButtons) {
    elements.routeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const route = button.dataset.benefitsRoute || "all";
        benefitsWorkspaceState.internalRailSelection = "overview";
        applyBenefitsOverviewRouting(elements, route);
        if (typeof scheduleWorkspaceViewportSync === "function") {
          scheduleWorkspaceViewportSync();
        }
      });
    });
  }
  if (elements.openToolButtons) {
    elements.openToolButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const toolId = button.dataset.benefitsOpenTool;
        if (toolId) {
          openBenefitsTool(elements, toolId);
        }
      });
    });
  }
  if (elements.popoutCloseButton) {
    elements.popoutCloseButton.addEventListener("click", () => {
      requestBenefitsPopoutClose();
    });
  }
  if (window.benefitsPopout && window.benefitsPopout.onStateChange) {
    window.benefitsPopout.onStateChange((payload) => {
      const isOpen = Boolean(payload && payload.isOpen);
      setBenefitsPopoutState(elements, isOpen);
    });
  }
  if (elements.openOverviewButtons) {
    elements.openOverviewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.benefitsOpenOverview;
        const frameId = target === "federal-pay" ? "pay-chooser" : "tsp-chooser";
        setBenefitsActiveFrame(elements, frameId);
      });
    });
  }
  if (elements.returnButton) {
    elements.returnButton.addEventListener("click", () => {
      setBenefitsActiveFrame(elements, "overview");
    });
  }
  if (elements.openChooserButton) {
    elements.openChooserButton.addEventListener("click", () => {
      const toolId = benefitsWorkspaceState.activeToolId;
      const frame = getBenefitsChooserFrameForTool(toolId);
      setBenefitsActiveFrame(elements, frame);
    });
  }
  if (elements.backSearchButton) {
    elements.backSearchButton.addEventListener("click", () => {
      setActiveWorkspaceView("explore");
    });
  }
  setBenefitsPopoutState(elements, benefitsWorkspaceState.toolPopoutOpen);
  applyBenefitsOverviewRouting(elements, "salary");
  setBenefitsActiveFrame(elements, benefitsWorkspaceState.activeFrame);
};

// ===============================================================
// WHY: Workspace switches can leave the Explore webview without a source URL.
// HOW: Re-apply the USAJOBS home URL when the explore webview is blank.
// ===============================================================
const restoreExploreWebviewIfNeeded = (workspaceElements) => {
  if (!workspaceElements || !workspaceElements.views) {
    return;
  }
  const exploreView = workspaceElements.views.explore;
  if (!exploreView) {
    return;
  }
  const exploreWebview = exploreView.querySelector("webview");
  if (!exploreWebview) {
    return;
  }
  let currentUrl = "";
  if (typeof exploreWebview.getURL === "function") {
    try {
      currentUrl = exploreWebview.getURL();
    } catch (error) {
      currentUrl = "";
    }
  }
  const srcAttribute = exploreWebview.getAttribute("src");
  if (!currentUrl || !srcAttribute) {
    console.info("[ExploreWebview] src missing; restoring to USAJOBS");
    exploreWebview.setAttribute("src", USAJOBS_HOME_URL);
  }
};

const setActiveWorkspaceView = (viewId) => {
  const route = getWorkspaceRoute(viewId);
  activeWorkspaceView = route ? route.id : "saved-jobs";
  if (activeWorkspaceView !== "activity-log") {
    lastNonActivityWorkspaceView = activeWorkspaceView;
  }
  // WHY: Main process must know the active workspace for BrowserView gating.
  // HOW: Send the active workspace id through the preload bridge.
  if (
    window.workbenchViewport &&
    typeof window.workbenchViewport.setActiveWorkspace === "function"
  ) {
    const workspaceForMain =
      activeWorkspaceView === "benefits-comp"
        ? "benefits-compensation"
        : activeWorkspaceView;
    window.workbenchViewport.setActiveWorkspace(workspaceForMain);
  }
  if (route && route.navKey) {
    lastNavWorkspaceView = route.id;
  }
  if (!workspaceViewElements) {
    return;
  }
  WORKSPACE_ROUTES.forEach((entry) => {
    const view = workspaceViewElements.views[entry.id];
    if (view) {
      view.hidden = entry.id !== activeWorkspaceView;
    }
    const navItem = workspaceViewElements.navItems[entry.id];
    if (navItem) {
      const isActive = entry.id === lastNavWorkspaceView;
      navItem.classList.toggle("is-active", isActive);
      if (isActive) {
        navItem.setAttribute("aria-current", "page");
      } else {
        navItem.removeAttribute("aria-current");
      }
    }
  });
  const isResumeView = activeWorkspaceView === "resume-assets";
  document.body.classList.toggle("is-resume-career-view", isResumeView);
  if (resumeCareerElements && resumeCareerElements.advisorPanel) {
    resumeCareerElements.advisorPanel.hidden = !isResumeView;
  }
  if (isResumeView) {
    // WHY: Resume badge represents new targets since last visit.
    // HOW: Mark the resume targets as read when the tab opens.
    jobSelectionStore.markResumeTargetsRead();
  }
  if (isResumeView && resumeCareerElements) {
    renderResumeCareerView(resumeCareerStore.getState(), resumeCareerElements);
  }
  if (activeWorkspaceView === "conversations") {
    renderConversationsView();
  }
  if (activeWorkspaceView === "activity-log") {
    refreshBackendAuditLog(activityLogLayoutElements, { force: true });
    refreshBackendStatusCard(activityLogLayoutElements);
  }
  if (activeWorkspaceView === "explore") {
    restoreExploreWebviewIfNeeded(workspaceViewElements);
  }
  if (activeWorkspaceView === "explore-pathos" && advisorModeElements) {
    applyAdvisorMode(advisorModeElements, "explore");
  }
  if (activeWorkspaceView === "benefits-comp" && benefitsViewElements) {
    setBenefitsActiveFrame(benefitsViewElements, benefitsWorkspaceState.activeFrame);
  }
  if (activeWorkspaceView !== "benefits-comp" && advisorModeElements) {
    if (activeWorkspaceView !== "explore-pathos") {
      applyAdvisorMode(advisorModeElements, "live");
    }
  }
  if (activeWorkspaceView !== "benefits-comp" && benefitsViewElements) {
    clearBenefitsWebview(benefitsViewElements);
  }
  applyActivityLogLayoutMode(activityLogLayoutElements);
  if (activityLogLayoutElements && activityLogLayoutElements.activityLog) {
    syncWorkspaceLeftTrayState(activityLogLayoutElements.activityLog);
  }
  if (activeWorkspaceView === "explore") {
    window.requestAnimationFrame(() => {
      resizeUsajobsViewportForTray();
    });
  }
  if (typeof scheduleWorkspaceViewportSync === "function") {
    scheduleWorkspaceViewportSync();
  }
  // WHY: Day 64 – Token in title banner row always equals active nav label (Focus and non-Focus).
  // HOW: updateWorkbenchGlobalBarLeft sets token from getActiveNavLabelFromDOM() then WORKSPACE_PAGE_TITLES fallback.
  updateWorkbenchGlobalBarLeft(activeWorkspaceView);
};

// WHY: Option A – token label derived from active nav item (DOM); no label mapping tables for Focus Mode.
// HOW: Find the nav item marked current, then read its label from [data-nav-label], .nav-item-text, or textContent.
function getActiveNavLabelFromDOM() {
  const nav = document.querySelector("nav");
  if (!nav) {
    return null;
  }
  let active =
    nav.querySelector('[aria-current="page"]') ||
    nav.querySelector(".is-active") ||
    nav.querySelector('[data-active="true"]');
  if (!active) {
    return null;
  }
  const explicitLabel = active.querySelector("[data-nav-label]");
  if (explicitLabel && explicitLabel.textContent !== undefined) {
    const t = String(explicitLabel.textContent).trim();
    return t.length > 0 ? t : null;
  }
  const textSpan = active.querySelector(".nav-item-text");
  if (textSpan && textSpan.textContent !== undefined) {
    const t = String(textSpan.textContent).trim();
    return t.length > 0 ? t : null;
  }
  const raw = active.textContent;
  if (raw !== undefined && raw !== null) {
    const t = String(raw).trim();
    return t.length > 0 ? t : null;
  }
  return null;
}

// WHY: Token in title banner row must ALWAYS match active nav label (Focus and non-Focus).
// HOW: (1) label = getActiveNavLabelFromDOM(); (2) if not found, label = WORKSPACE_PAGE_TITLES[viewId]; (3) if still not found, do not change token.
// No Focus-only branching; single path for both modes.
function updateWorkbenchGlobalBarLeft(viewId) {
  const statusEl = document.getElementById("workbench-global-status");
  if (!statusEl) {
    return;
  }
  let label = getActiveNavLabelFromDOM();
  if (label === null || label.length === 0) {
    const fallback = WORKSPACE_PAGE_TITLES[viewId];
    if (fallback !== undefined) {
      label = fallback;
    }
  }
  if (label !== null && label.length > 0) {
    statusEl.textContent = label;
  }
}

// ===============================================================
// WHY: Popout guidance should land in the main PathAdvisor composer.
// HOW: Focus the main chat input and insert a draft message.
// ===============================================================
const applyGuidanceDraftToAdvisor = (elements, payload) => {
  if (!elements || !elements.followupInput) {
    return;
  }
  if (!payload || typeof payload.message !== "string") {
    return;
  }
  const message = payload.message.trim();
  if (!message) {
    return;
  }
  setActiveWorkspaceView("explore");
  elements.followupInput.value = message;
  elements.followupInput.focus();
  const inputEvent = new Event("input", { bubbles: true });
  elements.followupInput.dispatchEvent(inputEvent);
};

const buildActivityActionButton = (label, className, onClick, disabled) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `activity-action${className ? ` ${className}` : ""}`;
  button.textContent = label;
  if (disabled) {
    button.disabled = true;
  }
  if (typeof onClick === "function" && !disabled) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
  }
  return button;
};

const buildResumeActionButton = (label, className, onClick, disabled) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `resume-action${className ? ` ${className}` : ""}`;
  button.textContent = label;
  if (disabled) {
    button.disabled = true;
  }
  if (typeof onClick === "function" && !disabled) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
  }
  return button;
};

// ===============================================================
// WHY: Resume targets should surface existing resumes when available.
// HOW: Match a target's stable job identity to stored resumes.
// ===============================================================
const findResumeForSelection = (selection, resumeState) => {
  if (!selection || !resumeState || !Array.isArray(resumeState.resumes)) {
    return null;
  }
  const jobId =
    (typeof selection.sourceJobId === "string" && selection.sourceJobId.trim()) ||
    (typeof selection.postingUrl === "string" && selection.postingUrl.trim()) ||
    "";
  if (!jobId) {
    return null;
  }
  return (
    resumeState.resumes.find((resume) => resume && resume.job && resume.job.jobId === jobId) ||
    null
  );
};

// ===============================================================
// WHY: Resume actions should live on explicitly added job targets.
// HOW: Map targets to resume actions and labels at render time.
// ===============================================================
const buildResumeTargetCard = (selection, isPrivate, resumeElements) => {
  const card = document.createElement("article");
  card.className = "resume-target-card";
  const title = document.createElement("div");
  title.className = "resume-target-title";
  title.textContent = jobSelectionStoreApi.buildSelectionDisplayTitle(selection, isPrivate);
  const subtitle = document.createElement("div");
  subtitle.className = "resume-target-subtitle";
  subtitle.textContent = "Saved for resume";
  const meta = document.createElement("div");
  meta.className = "resume-target-meta";
  meta.textContent = jobSelectionStoreApi.buildSelectionDisplayMeta(selection, isPrivate);
  const actions = document.createElement("div");
  actions.className = "resume-target-actions";

  const resumeState = resumeCareerStore.getState();
  const resumeMatch = findResumeForSelection(selection, resumeState);

  const onViewPosting = () => {
    if (!selection || !selection.postingUrl) {
      return;
    }
    jobSelectionStore.logJobViewed(selection);
    const role = {
      title: selection.title || "",
      series: "",
      usajobsUrl: selection.postingUrl,
    };
    const targetUrl = resolveUsaJobsReferenceUrl(role);
    openUsaJobsReferencePopout(role, targetUrl);
  };

  const onPrimaryAction = () => {
    if (!selection) {
      return;
    }
    if (resumeMatch) {
      resumeCareerStore.selectResume(resumeMatch.id);
      setActiveWorkspaceView("resume-assets");
      return;
    }
    selectedJobStore.setSelectedJob(selection, "resume-target-create");
    if (resumeElements) {
      applySelectedJobToResumeLinkDialog(selection, resumeElements);
    }
    setActiveWorkspaceView("resume-assets");
  };

  const onRemove = () => {
    if (!selection || !selection.id) {
      return;
    }
    jobSelectionStore.removeFromResumeTargets(selection.id);
  };

  const primaryLabel = resumeMatch ? "Open resume" : "Create resume";
  actions.appendChild(buildResumeActionButton(primaryLabel, "is-primary", onPrimaryAction));
  actions.appendChild(buildResumeActionButton("View posting", "is-outline", onViewPosting));
  actions.appendChild(buildResumeActionButton("Remove", "is-ghost", onRemove));

  card.appendChild(title);
  card.appendChild(subtitle);
  card.appendChild(meta);
  card.appendChild(actions);
  return card;
};

const renderResumeTargets = (elements) => {
  if (!elements || !elements.resumeTargetList) {
    return;
  }
  const state = jobSelectionStore.getState();
  const targets = Array.isArray(state.resumeTargets) ? state.resumeTargets : [];
  const list = elements.resumeTargetList;
  list.innerHTML = "";
  targets.forEach((target) => {
    list.appendChild(buildResumeTargetCard(target, jobContextPrivacyHidden, elements));
  });
  if (elements.resumeTargetEmpty) {
    elements.resumeTargetEmpty.hidden = targets.length > 0;
  }
  if (elements.resumeTargetCount) {
    const label = targets.length === 1 ? "job" : "jobs";
    elements.resumeTargetCount.textContent = `${targets.length} ${label}`;
  }
};

const renderActivityCompactChips = (elements, selections) => {
  if (!elements || !elements.activityCompact) {
    return;
  }
  const chips = elements.activityCompact;
  chips.innerHTML = "";
  selections.slice(0, 3).forEach((selection) => {
    const chip = document.createElement("div");
    chip.className = "activity-chip";
    chip.textContent = jobSelectionStoreApi.buildSelectionDisplayTitle(
      selection,
      jobContextPrivacyHidden
    );
    chips.appendChild(chip);
  });
};

const buildActivityUnreadEntries = (selections, activityEvents) => {
  const combined = [];
  if (Array.isArray(selections)) {
    selections.forEach(function (entry) {
      combined.push(entry);
    });
  }
  if (Array.isArray(activityEvents)) {
    activityEvents.forEach(function (entry) {
      combined.push(entry);
    });
  }
  return combined;
};

const updateActivityUnreadBadges = (elements, unreadCount) => {
  if (!elements) {
    return;
  }
  const updateBadge = (badge) => {
    if (!badge) {
      return;
    }
    badge.textContent = String(unreadCount);
    badge.classList.toggle("is-hidden", unreadCount === 0);
  };
  updateBadge(elements.activityUnreadBadge);
  updateBadge(elements.activityUnreadBadgeCompact);
  updateBadge(elements.activityNavBadge);
};

// ===============================================================
// WHY: Resume & Career nav should show new targets since last visit.
// HOW: Render a persisted unread count badge in the nav entry.
// ===============================================================
const updateResumeNavBadge = (elements) => {
  if (!elements || !elements.navResumeBadge) {
    return;
  }
  const state = jobSelectionStore.getState();
  const unreadCount = jobSelectionStoreApi.calculateResumeUnreadCount(
    state.resumeTargets,
    state.lastSeenResumeAt
  );
  elements.navResumeBadge.textContent = String(unreadCount);
  elements.navResumeBadge.classList.toggle("is-hidden", unreadCount === 0);
};

const showActivityConfirmation = (elements, message) => {
  if (!elements || !elements.activityConfirmation) {
    return;
  }
  elements.activityConfirmation.textContent = message;
  elements.activityConfirmation.hidden = false;
  window.setTimeout(() => {
    elements.activityConfirmation.hidden = true;
  }, 2400);
};

const readCollectionCount = (payload) => {
  if (Array.isArray(payload)) {
    return payload.length;
  }
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const candidates = ["items", "results", "data", "audits", "threads"];
  for (const key of candidates) {
    if (Array.isArray(payload[key])) {
      return payload[key].length;
    }
  }
  return null;
};

const buildBackendErrorConfirmation = (error) => {
  const message = normalizeActivityErrorMessage(
    error && typeof error.message === "string" ? error.message : error
  ) || "Request failed";
  const requestId =
    error && typeof error.requestId === "string" && error.requestId.trim()
      ? error.requestId.trim()
      : "";
  if (requestId) {
    return `Backend error: ${message}\nRequest ID: ${requestId}`;
  }
  return `Backend error: ${message}`;
};

const toBackendResultError = (fallbackMessage, result) => {
  if (result && typeof result === "object" && result.error && typeof result.error === "object") {
    const message =
      typeof result.error.message === "string" && result.error.message.trim()
        ? result.error.message.trim()
        : fallbackMessage;
    const requestId =
      typeof result.error.requestId === "string" && result.error.requestId.trim()
        ? result.error.requestId.trim()
        : "";
    const code =
      typeof result.error.code === "string" && result.error.code.trim()
        ? result.error.code.trim()
        : "BACKEND_ERROR";
    const status = Number.isFinite(result.error.status) ? Number(result.error.status) : 0;
    return { status, code, message, requestId };
  }
  return { status: 0, code: "BACKEND_ERROR", message: fallbackMessage, requestId: "" };
};

const unwrapBackendResult = (result, fallbackMessage) => {
  if (result && typeof result === "object" && result.ok === true) {
    return { ok: true, data: result.data };
  }
  return { ok: false, error: toBackendResultError(fallbackMessage, result) };
};

const normalizeBackendAuditRecords = (payload) => {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      trace_id:
        typeof entry.trace_id === "string" && entry.trace_id.trim()
          ? entry.trace_id.trim()
          : "",
      created_at:
        typeof entry.created_at === "string" && entry.created_at.trim()
          ? entry.created_at.trim()
          : "",
      recommendation:
        typeof entry.recommendation === "string" && entry.recommendation.trim()
          ? entry.recommendation.trim()
          : "",
      confidence_band:
        typeof entry.confidence_band === "string" && entry.confidence_band.trim()
          ? entry.confidence_band.trim()
          : "",
      job_title:
        typeof entry.job_title === "string" && entry.job_title.trim()
          ? entry.job_title.trim()
          : "",
      company:
        typeof entry.company === "string" && entry.company.trim()
          ? entry.company.trim()
          : "",
    }))
    .filter((entry) => entry.trace_id);
};

const setBackendAuditLoadingState = (elements, isLoading, text) => {
  const statusNode = elements && elements.activityAuditStatus;
  if (!statusNode) {
    return;
  }
  statusNode.textContent = text || "";
  statusNode.hidden = !isLoading && !text;
  statusNode.classList.toggle("is-loading", Boolean(isLoading));
};

const refreshBackendAuditLog = async (elements, options = {}) => {
  if (!elements || !window.pathosBackend || typeof window.pathosBackend.auditRecent !== "function") {
    return;
  }
  const force = Boolean(options.force);
  if (backendAuditState.loading) {
    return;
  }
  if (!force && backendAuditState.records.length > 0) {
    return;
  }
  backendAuditState.loading = true;
  setBackendAuditLoadingState(elements, true, "Loading audits…");
  const result = unwrapBackendResult(
    await window.pathosBackend.auditRecent(20),
    "Unable to load audit records."
  );
  if (result.ok) {
    backendAuditState.records = normalizeBackendAuditRecords(result.data);
    renderActivityLog(elements);
    setBackendAuditLoadingState(elements, false, "");
  } else {
    const message = buildBackendErrorConfirmation(result.error);
    showActivityConfirmation(elements, message);
    setBackendAuditLoadingState(elements, false, "Audit refresh failed.");
    console.error("[ActivityLog] audit hydration failed", result.error);
  }
  backendAuditState.loading = false;
};

const ensureBackendAuditControls = (elements) => {
  if (backendAuditState.controlsBound) {
    return;
  }
  if (!elements || !elements.activitySystemList) {
    return;
  }
  const section = elements.activitySystemList.closest(".activity-section");
  if (!section) {
    return;
  }
  const header = section.querySelector(".activity-section-header");
  if (!header) {
    return;
  }
  const controls = document.createElement("div");
  controls.className = "activity-inline-controls";

  const status = document.createElement("span");
  status.className = "activity-inline-status";
  status.hidden = true;
  controls.appendChild(status);

  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.className = "activity-action is-ghost";
  refresh.textContent = "Refresh";
  refresh.addEventListener("click", () => {
    refreshBackendAuditLog(elements, { force: true });
  });
  controls.appendChild(refresh);

  header.appendChild(controls);
  elements.activityAuditStatus = status;
  backendAuditState.controlsBound = true;
};

const renderBackendStatusCard = (elements) => {
  if (!elements || !elements.backendStatusCardBody) {
    return;
  }
  if (backendStatusState.loading) {
    elements.backendStatusCardState.textContent = "Checking connection…";
    elements.backendStatusCardState.dataset.status = "loading";
    elements.backendStatusCardBody.textContent = "Requesting backend desktop contract.";
    return;
  }
  if (!backendStatusState.connected || !backendStatusState.info) {
    elements.backendStatusCardState.textContent = "Disconnected";
    elements.backendStatusCardState.dataset.status = "disconnected";
    let message = backendStatusState.errorMessage || "Unable to reach backend.";
    if (backendStatusState.errorRequestId) {
      message = `${message} Request ID: ${backendStatusState.errorRequestId}`;
    }
    elements.backendStatusCardBody.textContent = message;
    return;
  }

  const info = backendStatusState.info;
  elements.backendStatusCardState.textContent = "Connected";
  elements.backendStatusCardState.dataset.status = "connected";
  elements.backendStatusCardBody.textContent =
    `Env: ${info.env} · Version: ${info.version} · Auth required: ${info.authRequired ? "Yes" : "No"} · Server time: ${info.serverTime}`;
};

const refreshBackendStatusCard = async (elements) => {
  if (!isDevRenderer) {
    return;
  }
  if (!window.pathosBackend || typeof window.pathosBackend.desktopInfo !== "function") {
    return;
  }
  if (!elements || !elements.backendStatusCardBody) {
    return;
  }
  if (backendStatusState.loading) {
    return;
  }

  backendStatusState.loading = true;
  renderBackendStatusCard(elements);
  const result = unwrapBackendResult(
    await window.pathosBackend.desktopInfo(),
    "Backend unavailable"
  );
  if (result.ok) {
    const info = result.data;
    backendStatusState.connected = true;
    backendStatusState.info = info;
    backendStatusState.errorMessage = "";
    backendStatusState.errorRequestId = "";
  } else {
    const error = result.error;
    backendStatusState.connected = false;
    backendStatusState.info = null;
    backendStatusState.errorMessage = normalizeActivityErrorMessage(
      error && typeof error.message === "string" ? error.message : "Backend unavailable"
    );
    backendStatusState.errorRequestId =
      error && typeof error.requestId === "string" ? error.requestId : "";
  }
  backendStatusState.loading = false;
  renderBackendStatusCard(elements);
};

const setupBackendStatusCard = (elements) => {
  if (!isDevRenderer) {
    return;
  }
  if (!elements || !elements.activityLogView) {
    return;
  }
  if (elements.backendStatusCardBody) {
    return;
  }
  const container = elements.activityLogView.querySelector(".workbench-surface");
  if (!container) {
    return;
  }
  const card = document.createElement("section");
  card.className = "backend-status-card";

  const row = document.createElement("div");
  row.className = "backend-status-row";
  const title = document.createElement("div");
  title.className = "backend-status-title";
  title.textContent = "Backend Status (Dev)";
  const state = document.createElement("span");
  state.className = "backend-status-state";
  row.appendChild(title);
  row.appendChild(state);

  const body = document.createElement("div");
  body.className = "backend-status-body";

  const actions = document.createElement("div");
  actions.className = "backend-status-actions";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "activity-action is-ghost";
  retry.textContent = "Retry";
  retry.addEventListener("click", () => {
    refreshBackendStatusCard(elements);
  });
  actions.appendChild(retry);

  card.appendChild(row);
  card.appendChild(body);
  card.appendChild(actions);
  container.insertBefore(card, container.firstChild);
  elements.backendStatusCardBody = body;
  elements.backendStatusCardState = state;
  if (activityLogLayoutElements) {
    activityLogLayoutElements.backendStatusCardBody = body;
    activityLogLayoutElements.backendStatusCardState = state;
  }
  refreshBackendStatusCard(elements);
};

const setupBackendDevProbe = (elements) => {
  if (!isDevRenderer) {
    return;
  }
  if (!window.pathosBackend || typeof window.pathosBackend.health !== "function") {
    return;
  }
  if (!elements || !elements.activitySystemList) {
    return;
  }
  const section = elements.activitySystemList.closest(".activity-section");
  if (!section) {
    return;
  }
  const header = section.querySelector(".activity-section-header");
  if (!header) {
    return;
  }
  const button = document.createElement("button");
  button.type = "button";
  button.className = "activity-action is-ghost";
  button.textContent = "Backend probe";
  let isRunning = false;
  button.addEventListener("click", async () => {
    if (isRunning) {
      return;
    }
    isRunning = true;
    button.disabled = true;
    const healthResult = unwrapBackendResult(
      await window.pathosBackend.health(),
      "Health check failed."
    );
    if (!healthResult.ok) {
      showActivityConfirmation(elements, buildBackendErrorConfirmation(healthResult.error));
      console.error("[BackendProbe] health request failed", healthResult.error);
      isRunning = false;
      button.disabled = false;
      return;
    }
    const auditResult = unwrapBackendResult(
      await window.pathosBackend.auditRecent(5),
      "Audit listing failed."
    );
    if (!auditResult.ok) {
      showActivityConfirmation(elements, buildBackendErrorConfirmation(auditResult.error));
      console.error("[BackendProbe] audit request failed", auditResult.error);
      isRunning = false;
      button.disabled = false;
      return;
    }
    try {
      const auditCount = readCollectionCount(auditResult.data);
      const healthPayload = healthResult.data;
      const isHealthOk =
        healthPayload && typeof healthPayload === "object"
          ? true
          : typeof healthPayload === "string"
            ? Boolean(healthPayload.trim())
            : healthPayload !== null && healthPayload !== undefined;
      if (!isHealthOk) {
        throw new Error("Health check returned an empty response.");
      }
      const suffix = auditCount === null ? "entries unavailable" : `${auditCount} entries`;
      showActivityConfirmation(elements, `Backend probe passed: ${suffix}.`);
    } catch (error) {
      showActivityConfirmation(elements, buildBackendErrorConfirmation(error));
      console.error("[BackendProbe] request failed", error);
    } finally {
      isRunning = false;
      button.disabled = false;
    }
  });
  header.appendChild(button);

  // ===============================================================
  // WHY: Dev validation needs a one-click smoke test for the new
  //      backend jobs search channel without changing production UI.
  // HOW: Add a dev-only action in existing backend controls that
  //      calls `pathosBackend.searchJobs` and reports one message.
  // ===============================================================
  if (!window.pathosBackend || typeof window.pathosBackend.searchJobs !== "function") {
    return;
  }
  const jobsButton = document.createElement("button");
  jobsButton.type = "button";
  jobsButton.className = "activity-action is-ghost";
  jobsButton.textContent = "Test Backend Job Search";
  let isJobsRunning = false;
  jobsButton.addEventListener("click", async () => {
    if (isJobsRunning) {
      return;
    }
    isJobsRunning = true;
    jobsButton.disabled = true;
    try {
      const result = unwrapBackendResult(
        await window.pathosBackend.searchJobs({
          keyword: "2210",
          page: 1,
          page_size: 10,
        }),
        "Job search smoke test failed."
      );
      if (!result.ok) {
        showActivityConfirmation(elements, buildBackendErrorConfirmation(result.error));
        console.error("[BackendProbe] jobs search failed", result.error);
        return;
      }
      const rows = extractBackendSearchResults(result.data);
      showActivityConfirmation(elements, `Job search smoke test passed: ${rows.length} rows.`);
      console.info("[BackendProbe] jobs search payload", result.data);
    } finally {
      isJobsRunning = false;
      jobsButton.disabled = false;
    }
  });
  header.appendChild(jobsButton);
};

// ===============================================================
// WHY: Activity Log titles must explain why the entry exists.
// HOW: Prefer stored reasons and fall back to status mapping.
// ===============================================================
const buildActivityReasonLabel = (entry) => {
  if (!entry || typeof entry !== "object") {
    return "Activity update";
  }
  if (typeof entry.reason === "string" && entry.reason.trim()) {
    return entry.reason.trim();
  }
  if (typeof entry.status !== "string") {
    return "Activity update";
  }
  const normalized = entry.status.trim().toLowerCase();
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

const buildActivityMetaCopy = (selection) => {
  if (jobContextPrivacyHidden) {
    return "Details hidden by privacy controls.";
  }
  if (!selection || typeof selection !== "object") {
    return "";
  }
  const meta = [];
  if (typeof selection.title === "string" && selection.title.trim()) {
    meta.push(selection.title.trim());
  }
  if (selection.source) {
    meta.push(selection.source);
  }
  if (selection.agency) {
    meta.push(selection.agency);
  }
  if (selection.location) {
    meta.push(selection.location);
  }
  if (selection.grade) {
    meta.push(selection.grade);
  }
  if (meta.length) {
    return meta.join(" · ");
  }
  if (selection.postingUrl) {
    return selection.postingUrl;
  }
  return "Posting saved for reference.";
};

const buildActivityStatusLabel = (status) => {
  if (typeof status !== "string") {
    return "Viewed";
  }
  const normalized = status.trim().toLowerCase();
  if (normalized === "promoted") {
    return "Saved";
  }
  if (normalized === "selected") {
    return "Selected";
  }
  if (normalized === "exported") {
    return "Exported";
  }
  return "Viewed";
};

const renderActivitySystemLog = (elements, activityEvents) => {
  if (!elements || !elements.activitySystemList) {
    return;
  }
  const list = elements.activitySystemList;
  const existingEntries = Array.from(
    list.querySelectorAll("[data-activity-system-entry='store'], [data-activity-system-entry='audit'], [data-activity-system-entry='audit-group']")
  );
  existingEntries.forEach(function (entry) {
    entry.remove();
  });
  const events = Array.isArray(activityEvents) ? activityEvents : [];
  events.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "activity-entry";
    item.setAttribute("data-activity-system-entry", "store");

    const row = document.createElement("div");
    row.className = "activity-entry-row";
    const info = document.createElement("div");
    const titleRow = document.createElement("div");
    titleRow.className = "activity-entry-title-row";
    const title = document.createElement("div");
    title.className = "activity-entry-title";
    const reasonLabel = buildActivityReasonLabel(entry);
    title.textContent = reasonLabel;
    const statusPill = document.createElement("span");
    statusPill.className = "activity-status-pill";
    statusPill.dataset.status = entry.status || "viewed";
    statusPill.textContent = buildActivityStatusLabel(entry.status);
    titleRow.appendChild(title);
    titleRow.appendChild(statusPill);

    const meta = document.createElement("div");
    meta.className = "activity-entry-meta";
    const metaParts = [];
    const timeCopy = formatTimestamp(entry.timestamp);
    if (timeCopy) {
      metaParts.push(timeCopy);
    }
    if (entry.title && entry.title !== reasonLabel) {
      metaParts.push(entry.title);
    }
    if (entry.jobId) {
      metaParts.push(`Job ID: ${entry.jobId}`);
    } else if (entry.source) {
      metaParts.push(entry.source);
    }
    meta.textContent = metaParts.join(" · ");

    info.appendChild(titleRow);
    info.appendChild(meta);
    row.appendChild(info);
    item.appendChild(row);
    list.appendChild(item);
  });
  if (backendAuditState.records.length > 0) {
    const groupItem = document.createElement("li");
    groupItem.className = "activity-entry";
    groupItem.setAttribute("data-activity-system-entry", "audit-group");
    const groupTitle = document.createElement("div");
    groupTitle.className = "activity-entry-title";
    groupTitle.textContent = BACKEND_AUDIT_GROUP_TITLE;
    const groupMeta = document.createElement("div");
    groupMeta.className = "activity-entry-meta";
    groupMeta.textContent = `${backendAuditState.records.length} records`;
    groupItem.appendChild(groupTitle);
    groupItem.appendChild(groupMeta);
    list.appendChild(groupItem);

    backendAuditState.records.forEach((entry) => {
      const item = document.createElement("li");
      item.className = "activity-entry";
      item.setAttribute("data-activity-system-entry", "audit");

      const row = document.createElement("div");
      row.className = "activity-entry-row";
      const info = document.createElement("div");
      const titleRow = document.createElement("div");
      titleRow.className = "activity-entry-title-row";
      const title = document.createElement("div");
      title.className = "activity-entry-title";
      const jobLabel = entry.job_title || "Audit record";
      title.textContent = jobLabel;
      const statusPill = document.createElement("span");
      statusPill.className = "activity-status-pill";
      statusPill.dataset.status = "audit";
      statusPill.textContent = "Audit";
      titleRow.appendChild(title);
      titleRow.appendChild(statusPill);

      const meta = document.createElement("div");
      meta.className = "activity-entry-meta";
      const metaParts = [];
      const timestamp = formatTimestamp(entry.created_at);
      if (timestamp) {
        metaParts.push(timestamp);
      }
      if (entry.recommendation) {
        metaParts.push(`Rec: ${entry.recommendation}`);
      }
      if (entry.confidence_band) {
        metaParts.push(`Conf: ${entry.confidence_band}`);
      }
      if (entry.company) {
        metaParts.push(entry.company);
      }
      metaParts.push(`Trace: ${entry.trace_id}`);
      meta.textContent = metaParts.join(" · ");

      info.appendChild(titleRow);
      info.appendChild(meta);
      row.appendChild(info);
      item.appendChild(row);
      list.appendChild(item);
    });
  }
  if (elements.activitySystemEmpty) {
    elements.activitySystemEmpty.hidden = list.children.length > 0;
  }
};

const renderActivityLog = (elements) => {
  if (!elements || !elements.activityRecentList) {
    return;
  }
  const state = jobSelectionStore.getState();
  const selections = Array.isArray(state.recentSelections) ? state.recentSelections : [];
  const activeJobState = activeJobContextStore.getState();
  const activeJobId =
    activeJobState && activeJobState.activeJob ? activeJobState.activeJob.jobId : "";
  renderActivitySystemLog(elements, state.activityEvents);
  const resumeTargets = Array.isArray(state.resumeTargets) ? state.resumeTargets : [];
  const list = elements.activityRecentList;
  list.innerHTML = "";
  selections.forEach((selection) => {
    const entry = document.createElement("li");
    entry.className = "activity-entry";

    const row = document.createElement("div");
    row.className = "activity-entry-row";
    const info = document.createElement("div");
    const titleRow = document.createElement("div");
    titleRow.className = "activity-entry-title-row";
    const title = document.createElement("div");
    title.className = "activity-entry-title";
    const reasonLabel = buildActivityReasonLabel(selection);
    title.textContent = reasonLabel;
    const statusPill = document.createElement("span");
    statusPill.className = "activity-status-pill";
    statusPill.dataset.status = selection.status || "viewed";
    statusPill.textContent = buildActivityStatusLabel(selection.status);
    const meta = document.createElement("div");
    meta.className = "activity-entry-meta";
    const metaCopy = buildActivityMetaCopy(selection);
    const timeCopy = formatTimestamp(selection.capturedAt);
    meta.textContent = metaCopy ? `${timeCopy} · ${metaCopy}` : timeCopy;
    titleRow.appendChild(title);
    titleRow.appendChild(statusPill);
    const currentIndicator = buildActivityCurrentJobIndicator(activeJobId, selection);
    if (currentIndicator.isCurrent) {
      const currentPill = document.createElement("span");
      currentPill.className = "activity-status-pill is-current";
      currentPill.textContent = currentIndicator.label;
      titleRow.appendChild(currentPill);
    }
    info.appendChild(titleRow);
    info.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "activity-entry-actions";
    const buildActionSlot = (button) => {
      const slot = document.createElement("div");
      slot.className = "activity-entry-action-slot";
      if (button) {
        slot.appendChild(button);
      }
      return slot;
    };
    const onView = () => {
      if (!selection || !selection.postingUrl) {
        return;
      }
      jobSelectionStore.logJobViewed(selection);
      const role = {
        title: selection.title || "",
        series: "",
        usajobsUrl: selection.postingUrl,
      };
      const targetUrl = resolveUsaJobsReferenceUrl(role);
      openUsaJobsReferencePopout(role, targetUrl);
    };
    const onSetAsCurrent = () => {
      const stored = jobSelectionStore.setSelectedJobFromHistory(selection.id);
      if (!stored) {
        return;
      }
      selectedJobStore.setSelectedJob(stored, "activity-set-current");
      const activeContext = activeJobContextApi.normalizeActiveJobContext
        ? activeJobContextApi.normalizeActiveJobContext({
            jobId: stored.jobId || stored.sourceJobId || stored.postingUrl,
            title: stored.title || "Selected job",
            announcementNumber: stored.sourceJobId || "",
            source: stored.source,
          })
        : null;
      if (activeContext) {
        activeJobContextStore.setActiveJob(activeContext, "activity-set-current");
      }
      showActivityConfirmation(elements, "Current selection updated.");
      incrementBadgeWithToast({
        incrementBadge: () => {
          renderActivityLog(elements);
          updateResumeNavBadge(elements);
        },
        toast: emitTopCenterToast,
        toastTitle: "Current job updated",
        toastBody: selection && selection.title ? selection.title : "",
      });
    };
    const onAddResume = () => {
      const added = jobSelectionStore.logJobPromoted(selection.id);
      if (added) {
        showActivityConfirmation(elements, "Added to Resume & Career.");
        incrementBadgeWithToast({
          incrementBadge: () => {
            renderActivityLog(elements);
            updateResumeNavBadge(elements);
          },
          toast: emitTopCenterToast,
          toastTitle: "Added to Resume & Career",
          toastBody: selection && selection.title ? selection.title : "",
        });
      }
    };

    const resumeKey = jobSelectionStoreApi.buildSelectionKey(selection);
    const isInResumeTargets = resumeTargets.some((target) => {
      return jobSelectionStoreApi.buildSelectionKey(target) === resumeKey;
    });

    const viewButton = buildActivityActionButton("View", "is-outline", onView);
    actions.appendChild(buildActionSlot(viewButton));
    if (isInResumeTargets) {
      const resumeButton = buildActivityActionButton(
        "In Resume & Career",
        "is-ghost",
        null,
        true
      );
      actions.appendChild(buildActionSlot(resumeButton));
    } else {
      const resumeButton = buildActivityActionButton(
        "Add to Resume & Career",
        "is-primary",
        onAddResume
      );
      actions.appendChild(buildActionSlot(resumeButton));
    }
    const currentButton = buildActivityActionButton(
      "Set as current",
      "is-outline",
      onSetAsCurrent,
      currentIndicator.disableSetCurrent
    );
    actions.appendChild(buildActionSlot(currentButton));

    row.appendChild(info);
    row.appendChild(actions);
    entry.appendChild(row);
    list.appendChild(entry);
  });

  if (elements.activityRecentEmpty) {
    elements.activityRecentEmpty.hidden = selections.length > 0;
  }

  renderActivityCompactChips(elements, selections);
  const unreadEntries = buildActivityUnreadEntries(selections, state.activityEvents);
  const unreadCount = jobSelectionStoreApi.calculateUnreadCount(
    unreadEntries,
    state.lastSeenActivityAt
  );
  updateActivityUnreadBadges(elements, unreadCount);
};

const updateJobContextPrivacyState = (toggles, elements, resumeElements) => {
  if (!Array.isArray(toggles) || toggles.length === 0) {
    jobContextPrivacyHidden = false;
  } else {
    jobContextPrivacyHidden = toggles.some(
      (toggle) => toggle.getAttribute("aria-pressed") === "true"
    );
  }
  renderActivityLog(elements);
  renderResumeTargets(resumeElements);
  renderResumeSelectedCreateCta(resumeElements);
};

const applyActivityLogLayoutMode = (elements) => {
  const isActivityLogView = activeWorkspaceView === "activity-log";
  document.body.classList.toggle("is-activity-log-view", isActivityLogView);
  if (!elements || !elements.activityLog || !elements.activityToggle) {
    return;
  }
  // Route changes should not repurpose tray UI into a full-page surface.
  setCollapsedState(
    elements.activityLog,
    elements.activityToggle,
    getStoredActivityLogCollapsed()
  );
};

const setupActivityLog = (elements, scheduleViewportSync) => {
  if (!elements.activityLog || !elements.activityToggle) {
    return;
  }
  ensureBackendAuditControls(elements);

  const stored = activityStorage.getItem(ACTIVITY_LOG_STORAGE_KEY);
  // ===============================================================
  // WHY: Recent Activity should start collapsed for first-time users.
  // HOW: Default to collapsed unless storage explicitly says "false".
  // ===============================================================
  const initialCollapsed = stored === "false" ? false : true;
  setCollapsedState(elements.activityLog, elements.activityToggle, initialCollapsed);
  if (!initialCollapsed) {
    jobSelectionStore.markActivityLogRead();
    renderActivityLog(elements);
    refreshBackendAuditLog(elements, { force: true });
  }

  elements.activityToggle.addEventListener("click", () => {
    const nextCollapsed = elements.activityLog.dataset.collapsed !== "true";
    setCollapsedState(elements.activityLog, elements.activityToggle, nextCollapsed);
    activityStorage.setItem(ACTIVITY_LOG_STORAGE_KEY, String(nextCollapsed));
    scheduleViewportSync();
    if (!nextCollapsed) {
      jobSelectionStore.markActivityLogRead();
      renderActivityLog(elements);
      refreshBackendAuditLog(elements, { force: true });
    }
  });
  if (elements.activityCollapsedExpand) {
    elements.activityCollapsedExpand.addEventListener("click", () => {
      setCollapsedState(elements.activityLog, elements.activityToggle, false);
      activityStorage.setItem(ACTIVITY_LOG_STORAGE_KEY, "false");
      scheduleViewportSync();
      jobSelectionStore.markActivityLogRead();
      renderActivityLog(elements);
      refreshBackendAuditLog(elements, { force: true });
    });
  }
};

const openActivityLogFromNav = (elements, scheduleViewportSync) => {
  if (!elements || !elements.activityLog || !elements.activityToggle) {
    return;
  }
  setActiveWorkspaceView("activity-log");
  setCollapsedState(elements.activityLog, elements.activityToggle, true);
  scheduleViewportSync();
  jobSelectionStore.markActivityLogRead();
  renderActivityLog(elements);
  refreshBackendAuditLog(elements, { force: true });
};

const resolveActivityLogExitTarget = () => {
  if (lastNonActivityWorkspaceView && lastNonActivityWorkspaceView !== "activity-log") {
    return lastNonActivityWorkspaceView;
  }
  return "saved-jobs";
};

// ===============================================================
// WHY: Day 65 – PathAdvisor sidebar collapse sections and primary CTA.
// HOW: Wire Suggested prompts, Details, Why this? toggles and Choose target CTA.
// ===============================================================
const setupPathAdvisorSidebarCollapses = (root) => {
  if (!root) {
    return;
  }
  const toggleCollapse = (trigger, body) => {
    if (!trigger || !body) {
      return;
    }
    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      const isExpanded = body.hidden;
      body.hidden = !isExpanded;
      trigger.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    });
  };
  const suggestedToggle = root.querySelector("[data-advisor-suggested-prompts-toggle]");
  const suggestedBody = root.querySelector("[data-advisor-suggested-prompts-body]");
  toggleCollapse(suggestedToggle, suggestedBody);
  const detailsToggle = root.querySelector("[data-advisor-details-toggle]");
  const detailsBody = root.querySelector("[data-advisor-details-body]");
  toggleCollapse(detailsToggle, detailsBody);
  const whyToggle = root.querySelector("[data-advisor-why-disclosure]");
  const whyContent = root.querySelector("[data-advisor-why-content]");
  if (whyToggle && whyContent) {
    whyToggle.addEventListener("click", function (event) {
      event.preventDefault();
      const isExpanded = whyContent.hidden;
      whyContent.hidden = !isExpanded;
      whyToggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    });
  }
  const ctaChooseJob = root.querySelector("[data-advisor-cta-choose-job]");
  if (ctaChooseJob) {
    ctaChooseJob.addEventListener("click", function (event) {
      event.preventDefault();
      setActiveWorkspaceView("explore");
    });
  }
  // Day 65 v2: idle CTA does the same as card CTA (navigate to Explore).
  const ctaChooseJobIdle = root.querySelector("[data-advisor-cta-choose-job-idle]");
  if (ctaChooseJobIdle) {
    ctaChooseJobIdle.addEventListener("click", function (event) {
      event.preventDefault();
      setActiveWorkspaceView("explore");
    });
  }
  const setTargetLink = root.querySelector("[data-advisor-set-target]");
  if (setTargetLink) {
    setTargetLink.addEventListener("click", function (event) {
      event.preventDefault();
      setActiveWorkspaceView("explore");
    });
  }
  const chatChangeLink = root.querySelector("[data-advisor-chat-change]");
  if (chatChangeLink) {
    chatChangeLink.addEventListener("click", function (event) {
      event.preventDefault();
      setActiveWorkspaceView("explore");
    });
  }
};

// ===============================================================
// WHY: Day 65 v2 – PathAdvisor Idle Compact default; "Show guidance" toggles expanded.
// HOW: Toggle data-pathadvisor-ui on the rail and update link text; minimal local state.
// ===============================================================
function setupPathAdvisorGuidanceToggle(root) {
  if (!root) {
    return;
  }
  const rail = root.getElementById
    ? root.getElementById("pathadvisor-rail")
    : root.querySelector("#pathadvisor-rail");
  if (!rail) {
    return;
  }
  // Day 65 lock: single fixed rail layout; remove legacy mode state if present.
  rail.removeAttribute("data-pathadvisor-ui");
  rail.classList.remove("advisor--chat");
}

// ===============================================================
// WHY: Day 65 – Expand/Collapse header button toggles Guidance vs Conversation mode.
// HOW: When live window is closed, click toggles data-pathadvisor-ui idle/expanded <-> chat and advisor--chat class; button label reflects mode.
// ===============================================================
function syncPathAdvisorExpandCollapseLabel(elements, liveWindowOpen) {
  if (!elements || !elements.rail || !elements.liveAdvisorDetach) {
    return;
  }
  // Day 65 lock: no expand/collapse control in fixed rail layout.
}

function setupPathAdvisorModeToggle(elements) {
  if (!elements || !elements.rail || !elements.liveAdvisorDetach) {
    return;
  }
  // Day 65 lock: no rail mode toggle in fixed layout.
}

// ===============================================================
// WHY: Keep suggested prompts available but visually unobtrusive.
// HOW: Toggle a compact popover from the header quick actions button.
// ===============================================================
const setupQuickActions = (root) => {
  if (!root) {
    return;
  }
  const containers = Array.from(root.querySelectorAll("[data-quick-actions]"));
  if (!containers.length) {
    return;
  }

  containers.forEach((container) => {
    const toggle = container.querySelector("[data-quick-actions-toggle]");
    const panel = container.querySelector("[data-quick-actions-panel]");
    const close = container.querySelector("[data-quick-actions-close]");
    if (!toggle || !panel) {
      return;
    }

    const setOpen = (isOpen) => {
      panel.hidden = !isOpen;
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    };

    setOpen(false);

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      setOpen(panel.hidden);
    });

    if (close) {
      close.addEventListener("click", (event) => {
        event.preventDefault();
        setOpen(false);
        toggle.focus();
      });
    }

    document.addEventListener("click", (event) => {
      if (!panel.hidden && !container.contains(event.target)) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!panel.hidden && event.key === "Escape") {
        setOpen(false);
        toggle.focus();
      }
    });
  });
};

let alertsPopoverEventsBound = false;

const buildAlertsPopoverPayload = (toggle) => {
  if (!toggle || typeof toggle.getBoundingClientRect !== "function") {
    return null;
  }
  const rect = toggle.getBoundingClientRect();
  return {
    rect: {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    },
    windowBounds: {
      screenX: window.screenX,
      screenY: window.screenY,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
    },
  };
};

const setupAlertsPopover = (root) => {
  if (!root) {
    return;
  }
  const containers = Array.from(root.querySelectorAll("[data-alert-popover]"));
  if (!containers.length) {
    return;
  }
  const popoverApi = window.alertsPopover;

  const updateBadges = () => {
    const unreadCount = getAlertUnreadCount();
    containers.forEach((container) => {
      const badge = container.querySelector("[data-alert-preview-badge]");
      if (badge) {
        badge.textContent = String(unreadCount);
        badge.classList.toggle("is-hidden", unreadCount === 0);
      }
    });
  };

  containers.forEach((container) => {
    const toggle = container.querySelector("[data-alert-popover-toggle]");
    if (!toggle) {
      return;
    }
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      if (popoverApi && popoverApi.toggle) {
        const payload = buildAlertsPopoverPayload(toggle);
        popoverApi.toggle(payload);
      }
    });
  });

  updateBadges();

  if (!alertsPopoverEventsBound) {
    alertsPopoverEventsBound = true;
    if (popoverApi && popoverApi.onOpenAlertCenter) {
      popoverApi.onOpenAlertCenter(() => {
        setActiveWorkspaceView("alert-center");
      });
    }
  }
};

const setupUsaJobsFallback = () => {
  const fallback = /** @type {HTMLElement | null} */ (
    document.querySelector(".webview-fallback")
  );
  const setFallbackVisible = (isVisible) => {
    if (!fallback) {
      return;
    }
    fallback.hidden = !isVisible;
  };

  setFallbackVisible(false);
  if (window.usajobsStatus && window.usajobsStatus.onStatus) {
    window.usajobsStatus.onStatus((status) => {
      setFallbackVisible(status === "failed");
    });
  }
};

// ===============================================================
// WHY: Embedded benefits tools need visible loading/failure feedback.
// HOW: Mirror the USAJOBS pattern with a lightweight status handler.
// ===============================================================
const setupBenefitsEmbedStatus = (elements) => {
  if (!elements) {
    return;
  }
  const fallback = elements.toolFallback;
  const loading = elements.toolLoading;
  const webview = elements.toolWebview;
  const setFallbackVisible = (isVisible) => {
    if (!fallback) {
      return;
    }
    fallback.hidden = !isVisible;
  };
  const setLoadingVisible = (isLoading) => {
    if (!loading) {
      return;
    }
    loading.classList.toggle("is-loading", isLoading);
    loading.setAttribute("aria-hidden", isLoading ? "false" : "true");
  };

  setFallbackVisible(false);
  setLoadingVisible(false);
  if (webview) {
    webview.addEventListener("did-start-loading", () => {
      setLoadingVisible(true);
    });
    webview.addEventListener("did-stop-loading", () => {
      setLoadingVisible(false);
      setFallbackVisible(false);
    });
    webview.addEventListener("did-fail-load", (event) => {
      if (!event || event.errorCode === -3) {
        return;
      }
      setLoadingVisible(false);
      setFallbackVisible(true);
    });
    webview.addEventListener("will-navigate", (event) => {
      const targetUrl = event && event.url ? event.url : "";
      if (!isAllowedBenefitsUrl(targetUrl)) {
        // ===============================================================
        // WHY: Debugging blocked navigation needs URL + surface context.
        // HOW: Log only in dev to avoid noisy production consoles.
        // ===============================================================
        if (isDevRenderer) {
          console.info("[BenefitsWebview] navigation blocked", {
            url: targetUrl,
            reason: "protocol",
            surface: "benefits-embed",
          });
        }
        if (event && typeof event.preventDefault === "function") {
          event.preventDefault();
        }
        setBenefitsWebviewWarning(
          elements,
          "Navigation blocked. Only http/https destinations are allowed."
        );
      } else {
        setBenefitsWebviewWarning(elements, "");
      }
    });
  }
};

const handleUsaJobsSelectedJobNavigation = (payload) => {
  const selection = selectedJobStoreApi.buildSelectedJobFromUsaJobsNavigation(payload);
  const current = selectedJobStore.getState().selectedJob;

  if (!selection) {
    if (current && current.source === "USAJOBS") {
      selectedJobStore.clearSelectedJob("usajobs-non-posting");
    }
    return;
  }

  const isSamePosting =
    current && current.postingUrl && current.postingUrl === selection.postingUrl;
  const mergedSelection = mergeUsaJobsSelection(
    current,
    selection,
    selectedJobStoreApi.chooseUsaJobsTitle
  );

  recordRecentSelection(mergedSelection);
  selectedJobStore.setSelectedJob(
    mergedSelection,
    isSamePosting ? "usajobs-title-refresh" : "usajobs-navigation"
  );
};

// ===============================================================
// WHY: Day 64 – Workspace Focus Mode. Single global toggle; nav icon-only when on.
// HOW: Init store from localStorage, bind toggle click, sync body class and badge.
// ===============================================================
const setupWorkspaceFocusToggle = (elements) => {
  initWorkspaceFocusStore();
  const root = document.body;
  const toggle = elements.workspaceFocusToggle;
  const badge = elements.workspaceFocusBadge;
  const activityLog = elements.activityLog;

  const applyWorkspaceFocusState = () => {
    const mode = getWorkspaceMode();
    const isFocus = mode === "focus";
    root.classList.toggle("is-workspace-focus-mode", isFocus);
    if (toggle) {
      toggle.setAttribute("aria-pressed", isFocus ? "true" : "false");
    }
    if (badge) {
      badge.classList.toggle("is-hidden", !isFocus);
      badge.hidden = !isFocus;
    }
    // WHY: Banner left must show page title in Focus Mode, status in standard.
    // HOW: Re-run bar-left update so it uses current mode.
    updateWorkbenchGlobalBarLeft(activeWorkspaceView);
    // WHY: Do not force Recent Activity collapsed in Focus Mode; let user toggle control it.
    // HOW: Only CSS applies thin strip when .is-collapsed; expand/collapse state stays in sync with storage.
  };

  applyWorkspaceFocusState();

  if (toggle) {
    toggle.addEventListener("click", () => {
      toggleWorkspaceMode();
      applyWorkspaceFocusState();
    });
  }

  subscribe(applyWorkspaceFocusState);
};

const setupEmbeddedBrowserBar = (elements) => {
  if (!elements.embeddedBar) {
    return;
  }

  const bar = elements.embeddedBar;
  const controls = window.usajobsControls;
  const loadingIndicator = elements.usaJobsLoading;

  // ===============================================================
  // WHY: Option 3 keeps the toolbar persistent while staying compact.
  // HOW: Use simple helpers to track URL, loading, and nav state.
  // ===============================================================
  const embeddedBarApi = window.PathOSEmbeddedBar;
  const storeCurrentUrl =
    embeddedBarApi && embeddedBarApi.storeCurrentUrl
      ? embeddedBarApi.storeCurrentUrl
      : null;
  const updateNavButtons =
    embeddedBarApi && embeddedBarApi.updateNavButtons
      ? embeddedBarApi.updateNavButtons
      : null;
  const setLoadingState =
    embeddedBarApi && embeddedBarApi.setLoadingState
      ? embeddedBarApi.setLoadingState
      : null;
  const fallbackUrl =
    embeddedBarApi && embeddedBarApi.HOME_URL
      ? embeddedBarApi.HOME_URL
      : "https://www.usajobs.gov/";

  const recordCurrentUrl = (rawUrl) => {
    if (storeCurrentUrl) {
      storeCurrentUrl(bar, rawUrl);
      return;
    }
    if (bar && bar.dataset) {
      bar.dataset.currentUrl = rawUrl || fallbackUrl;
    }
  };

  const applyNavButtons = (canGoBack, canGoForward) => {
    if (updateNavButtons) {
      updateNavButtons(
        { backButton: elements.usaJobsBack, forwardButton: elements.usaJobsForward },
        canGoBack,
        canGoForward
      );
      return;
    }
    if (elements.usaJobsBack) {
      elements.usaJobsBack.disabled = !canGoBack;
    }
    if (elements.usaJobsForward) {
      elements.usaJobsForward.disabled = !canGoForward;
    }
  };

  const applyLoadingState = (isLoading) => {
    if (setLoadingState) {
      setLoadingState(bar, loadingIndicator, isLoading);
      return;
    }
    bar.classList.toggle("is-loading", isLoading);
    if (loadingIndicator) {
      loadingIndicator.setAttribute("aria-hidden", isLoading ? "false" : "true");
    }
  };

  if (controls && controls.onLoadState) {
    controls.onLoadState((payload) => {
      if (!payload || !payload.state) {
        return;
      }

      if (payload.state === "loading") {
        applyLoadingState(true);
      }

      if (payload.state === "loaded") {
        applyLoadingState(false);
      }
    });
  }

  if (controls && controls.onNavigate) {
    controls.onNavigate((payload) => {
      if (!payload) {
        return;
      }

      recordCurrentUrl(payload.url);
      applyNavButtons(payload.canGoBack, payload.canGoForward);
      handleUsaJobsSelectedJobNavigation(payload);
    });
  }

  if (elements.usaJobsBack) {
    elements.usaJobsBack.addEventListener("click", () => {
      if (controls && controls.goBack) {
        controls.goBack();
      }
    });
  }

  if (elements.usaJobsForward) {
    elements.usaJobsForward.addEventListener("click", () => {
      if (controls && controls.goForward) {
        controls.goForward();
      }
    });
  }

  if (elements.usaJobsRefresh) {
    elements.usaJobsRefresh.addEventListener("click", () => {
      if (controls && controls.refresh) {
        controls.refresh();
      }
    });
  }

  if (elements.usaJobsHome) {
    elements.usaJobsHome.addEventListener("click", () => {
      if (controls && controls.goHome) {
        controls.goHome();
      }
    });
  }

  if (elements.usaJobsOpenExternal) {
    elements.usaJobsOpenExternal.addEventListener("click", () => {
      if (controls && controls.openExternal) {
        controls.openExternal();
      }
    });
  }

  recordCurrentUrl(fallbackUrl);
  applyNavButtons(false, false);
  applyLoadingState(false);
};

const updateViewportBounds = (elements) => {
  // ===============================================================
  // WHY: Detached PathAdvisor windows must not resize the Workbench view.
  // HOW: Only the main Workbench window sends BrowserView bounds to main.
  // ===============================================================
  if (pathAdvisorState.mode !== "main") {
    return;
  }
  if (
    !elements.usaJobsViewport ||
    !window.workbenchViewport ||
    !window.workbenchViewport.setBounds
  ) {
    return;
  }

  // ===============================================================
  // WHY: USAJOBS should only render inside the Explore workspace.
  // HOW: Zero the BrowserView bounds when other workspaces are active.
  // ===============================================================
  if (activeWorkspaceView !== "explore") {
    window.workbenchViewport.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    return;
  }

  const rect = elements.usaJobsViewport.getBoundingClientRect();
  const bounds = {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  };

  // WHY: BrowserView bounds are geometry-only to preserve trust boundaries.
  window.workbenchViewport.setBounds(bounds);
};

// ===============================================================
// WHY: Benefits embeds use a separate BrowserView from USAJOBS.
// HOW: Report bounds only when the calculator frame is active.
// ===============================================================
const updateBenefitsViewportBounds = (elements) => {
  if (benefitsWorkspaceState.toolPopoutOpen) {
    if (
      window.benefitsToolViewport &&
      window.benefitsToolViewport.reportBounds
    ) {
      window.benefitsToolViewport.reportBounds({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
    }
    return;
  }
  if (pathAdvisorState.mode !== "main") {
    return;
  }
  if (
    !elements ||
    !window.benefitsToolViewport ||
    !window.benefitsToolViewport.reportBounds
  ) {
    return;
  }
  // ===============================================================
  // WHY: Match Explore sizing by measuring the real viewport element.
  // HOW: Read the viewport rect so BrowserView bounds align 1:1 with it.
  // ===============================================================
  const viewport = elements.benefitsViewport || null;
  if (!viewport) {
    return;
  }
  const shouldShowBenefits =
    activeWorkspaceView === "benefits-comp" &&
    benefitsWorkspaceState.activeFrame === "calculator";
  // WHY: Benefits embeds must be workspace-scoped to avoid cross-view overlays.
  if (!shouldShowBenefits) {
    window.benefitsToolViewport.reportBounds({ x: 0, y: 0, width: 0, height: 0 });
    return;
  }
  // ===============================================================
  // WHY: BrowserView bounds never auto-resize from renderer CSS alone.
  // HOW: Measure the visible container after layout and send height to main.
  // ===============================================================
  // WHY: The webview needs the true inner frame bounds, not the viewport stub.
  // HOW: Measure the container and subtract padding for the real embed area.
  const rect = viewport.getBoundingClientRect();
  const bounds = {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  };
  window.benefitsToolViewport.reportBounds(bounds);
};

const createViewportScheduler = (updateFn) => {
  let pending = false;
  return () => {
    if (pending) {
      return;
    }
    pending = true;
    window.requestAnimationFrame(() => {
      pending = false;
      updateFn();
    });
  };
};

// ===============================================================
// WHY: Live Advisor surfaces share the same conversation thread.
// HOW: Register each surface once and render from the shared state.
// ===============================================================
const collectLiveAdvisorElements = (root) => {
  if (!root) {
    return null;
  }
  const guidanceForm = root.querySelector("[data-advisor-guidance-form]");
  const chatForm = root.querySelector("[data-advisor-chat-form]");
  return {
    briefingFeed: root.querySelector(".briefing-feed"),
    briefingEmpty: root.querySelector(".briefing-empty"),
    jumpToLatest: root.querySelector("[data-jump-latest]"),
    followupForm: guidanceForm || root.querySelector("[data-live-followup-form]"),
    followupInput: guidanceForm
      ? root.querySelector("#followup-input")
      : root.querySelector("[data-live-followup-input]"),
    chatForm: chatForm,
    chatInput: root.querySelector("[data-advisor-chat-input]"),
    inputSection: root.querySelector(".advisor-input-section"),
    intentButtons: Array.from(root.querySelectorAll("[data-intent]")),
    newConversation: root.querySelector("[data-conversation-new]"),
    clearConversation: root.querySelector("[data-conversation-clear]"),
    exportConversation: root.querySelector("[data-conversation-export]"),
  };
};

// ===============================================================
// WHY: Selected job context needs targeted DOM refs for rendering.
// HOW: Collect the PathAdvisor context card elements once.
// ===============================================================
const collectSelectedJobContextElements = (root) => {
  if (!root) {
    return null;
  }
  return {
    title: root.querySelector("[data-selected-job-title]"),
    summary: root.querySelector("[data-selected-job-summary]"),
    meta: root.querySelector("[data-selected-job-meta]"),
    source: root.querySelector("[data-selected-job-source]"),
    clearButton: root.querySelector("[data-selected-job-clear]"),
    privacyToggle: root.querySelector("[data-selected-job-privacy-toggle]"),
    privacyCards: Array.from(root.querySelectorAll("[data-advisor-privacy-card]")),
    chatTargetJob: root.querySelector("[data-advisor-chat-target-job]"),
    chatReadiness: root.querySelector("[data-advisor-chat-readiness]"),
  };
};

const registerLiveAdvisorSurface = (elements) => {
  if (!elements) {
    return;
  }
  liveSurfaces.push(elements);
  if (elements.briefingFeed) {
    elements.briefingFeed.addEventListener("scroll", () => {
      elements.isPinnedToBottom = isNearBottom(elements.briefingFeed);
      if (elements.isPinnedToBottom) {
        elements.hasUnseenMessages = false;
      }
      if (elements.jumpToLatest) {
        elements.jumpToLatest.hidden = !elements.hasUnseenMessages;
      }
    });
  }
  if (elements.jumpToLatest) {
    elements.jumpToLatest.addEventListener("click", () => {
      scrollFeedToBottom(elements);
    });
  }
  if (elements.newConversation) {
    elements.newConversation.addEventListener("click", () => {
      createThread();
    });
  }
  if (elements.clearConversation) {
    elements.clearConversation.addEventListener("click", () => {
      const thread = getActiveThread();
      if (!thread || !thread.messages.length) {
        return;
      }
      const confirmed = window.confirm("Clear this conversation?");
      if (confirmed) {
        clearThread(thread.id);
      }
    });
  }
  if (elements.exportConversation) {
    elements.exportConversation.addEventListener("click", () => {
      exportActiveThread();
    });
  }
  elements.intentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const intent = button.dataset.intent || "freeform";
      const request = button.textContent || "New briefing request";
      appendConversationTurn(intent, request);
    });
  });

  if (elements.followupForm && elements.followupInput) {
    const submitFollowupMessage = () => {
      const text = elements.followupInput.value.trim();
      if (!text) {
        return;
      }
      appendConversationTurn("freeform", text);
      elements.followupInput.value = "";
    };

    elements.followupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitFollowupMessage();
    });

    elements.followupInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitFollowupMessage();
      }
    });
  }

  // Day 65: Conversation mode composer – same submit logic; Enter sends, Shift+Enter newline.
  if (elements.chatForm && elements.chatInput) {
    const submitChatMessage = () => {
      const text = elements.chatInput.value.trim();
      if (!text) {
        return;
      }
      appendConversationTurn("freeform", text);
      elements.chatInput.value = "";
      if (typeof elements.chatInput.style !== "undefined") {
        elements.chatInput.style.height = "";
      }
    };

    elements.chatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitChatMessage();
    });

    elements.chatInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitChatMessage();
      }
    });

    // Day 65: Auto-grow chat textarea up to 160px.
    elements.chatInput.addEventListener("input", function () {
      const el = elements.chatInput;
      el.style.height = "";
      const next = Math.min(160, Math.max(64, el.scrollHeight));
      el.style.height = next + "px";
    });
  }

  if (elements.followupInput) {
    setupAutoGrowTextarea(elements.followupInput, 5, () => {
      applyLiveFeedPadding(elements);
      if (elements.isPinnedToBottom) {
        scrollFeedToBottom(elements);
      }
    });
  }

  applyLiveFeedPadding(elements);
  window.addEventListener("resize", () => {
    applyLiveFeedPadding(elements);
  });

  renderLiveThread();
};

// ===============================================================
// WHY: Decision View fields must stay consistent across surfaces.
// HOW: Map each surface to a shared field set and sync changes.
// ===============================================================
const collectDecisionSurfaceElements = (root) => {
  if (!root) {
    return null;
  }
  return {
    root,
    titleInput: root.querySelector("[data-decision-field=\"title\"]"),
    context: root.querySelector("[data-decision-field=\"context\"]"),
    keyFactors: root.querySelector("[data-decision-field=\"keyFactors\"]"),
    tradeoffs: root.querySelector("[data-decision-field=\"tradeoffs\"]"),
    recommendation: root.querySelector("[data-decision-field=\"recommendation\"]"),
    nextSteps: root.querySelector("[data-decision-field=\"nextSteps\"]"),
  };
};

const readDecisionSurfaceValue = (element, fallback) => {
  if (!element) {
    return fallback;
  }
  return typeof element.value === "string" ? element.value : fallback;
};

const updateDecisionThreadFromSurface = (surface) => {
  const current = getDecisionThread();
  const nextThread = {
    title: readDecisionSurfaceValue(surface.titleInput, current.title),
    context: readDecisionSurfaceValue(surface.context, current.context),
    keyFactors: readDecisionSurfaceValue(surface.keyFactors, current.keyFactors),
    tradeoffs: readDecisionSurfaceValue(surface.tradeoffs, current.tradeoffs),
    recommendation: readDecisionSurfaceValue(
      surface.recommendation,
      current.recommendation
    ),
    nextSteps: readDecisionSurfaceValue(surface.nextSteps, current.nextSteps),
  };
  publishDecisionThreadUpdate(nextThread);
};

const registerDecisionSurface = (surface) => {
  if (!surface) {
    return;
  }
  decisionSurfaces.push(surface);
  const handlers = [
    surface.titleInput,
    surface.context,
    surface.keyFactors,
    surface.tradeoffs,
    surface.recommendation,
    surface.nextSteps,
  ];
  handlers.forEach((field) => {
    if (!field) {
      return;
    }
    field.addEventListener("input", () => updateDecisionThreadFromSurface(surface));
  });
  renderDecisionThread();
};

const renderDecisionSurface = (surface, thread) => {
  if (!surface) {
    return;
  }
  if (surface.titleInput && surface.titleInput.value !== thread.title) {
    surface.titleInput.value = thread.title;
  }
  if (surface.context && surface.context.value !== thread.context) {
    surface.context.value = thread.context;
  }
  if (surface.keyFactors && surface.keyFactors.value !== thread.keyFactors) {
    surface.keyFactors.value = thread.keyFactors;
  }
  if (surface.tradeoffs && surface.tradeoffs.value !== thread.tradeoffs) {
    surface.tradeoffs.value = thread.tradeoffs;
  }
  if (
    surface.recommendation &&
    surface.recommendation.value !== thread.recommendation
  ) {
    surface.recommendation.value = thread.recommendation;
  }
  if (surface.nextSteps && surface.nextSteps.value !== thread.nextSteps) {
    surface.nextSteps.value = thread.nextSteps;
  }
};

const renderDecisionThread = () => {
  const thread = getDecisionThread();
  decisionSurfaces.forEach((surface) => {
    renderDecisionSurface(surface, thread);
  });
};

// ===============================================================
// WHY: Decision Mode is intentionally hidden from the default UI.
// HOW: Force-hide the Decision surfaces and skip their event wiring.
// ===============================================================
const hideDecisionModeUi = (elements) => {
  if (!elements) {
    return;
  }
  if (elements.decisionOverlay) {
    elements.decisionOverlay.hidden = true;
  }
  if (elements.decisionViewWindow) {
    elements.decisionViewWindow.hidden = true;
  }
};

const setDecisionOverlayOpen = (elements, isOpen) => {
  pathAdvisorState.decisionOverlayOpen = Boolean(isOpen);
  if (!elements.decisionOverlay) {
    return;
  }
  elements.decisionOverlay.hidden = !pathAdvisorState.decisionOverlayOpen;
  document.body.classList.toggle(
    "is-decision-overlay-open",
    pathAdvisorState.decisionOverlayOpen
  );
};

const copyDecisionSummary = () => {
  const thread = getDecisionThread();
  const summary = buildDecisionSummary(thread);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(summary).catch(() => {});
  }
};

const onReady = () => {
  const elements = {
    rendererReloadButton: document.getElementById("renderer-reload-btn"),
    navBrand: document.getElementById("nav-brand"),
    rail: document.getElementById("pathadvisor-rail"),
    briefingFeed: document.getElementById("briefing-feed"),
    briefingEmpty: document.getElementById("briefing-empty"),
    followupForm: document.getElementById("followup-form"),
    followupInput: document.getElementById("followup-input"),
    usaJobsViewport: document.getElementById("usajobs-viewport"),
    embeddedBar: document.querySelector(".embedded-browser-bar"),
    usaJobsBack: document.getElementById("usajobs-back"),
    usaJobsForward: document.getElementById("usajobs-forward"),
    usaJobsRefresh: document.getElementById("usajobs-refresh"),
    usaJobsHome: document.getElementById("usajobs-home"),
    usaJobsOpenExternal: document.getElementById("usajobs-open-external"),
    usaJobsLoading: document.getElementById("usajobs-loading"),
    workspace: document.getElementById("workspace"),
    leftNav: document.getElementById("left-nav"),
    appShell: document.querySelector(".app-shell"),
    workbench: document.querySelector(".workbench"),
    workbenchHeader: document.querySelector(".workbench-header"),
    activityLog: document.querySelector(".activity-log"),
    activityLogView: document.getElementById("activity-log-view"),
    activityLogSurface: document.querySelector("[data-activity-log-surface]"),
    activityToggle: document.querySelector(".activity-toggle"),
    activityLogBack: document.getElementById("activity-log-back"),
    activityUnreadBadge: document.querySelector("[data-activity-unread-badge]"),
    activityUnreadBadgeCompact: document.querySelector("[data-activity-unread-badge-compact]"),
    activityRecentList: document.querySelector("[data-activity-recent-list]"),
    activityRecentEmpty: document.querySelector("[data-activity-recent-empty]"),
    activitySystemList: document.querySelector("[data-activity-system-list]"),
    activitySystemEmpty: document.querySelector("[data-activity-system-empty]"),
    activityCompact: document.querySelector("[data-activity-compact]"),
    activityCollapsedExpand: document.querySelector("[data-activity-collapsed-expand]"),
    activityConfirmation: document.querySelector("[data-activity-confirmation]"),
    activityAuditStatus: null,
    backendStatusCardBody: null,
    backendStatusCardState: null,
    workspaceFocusToggle: document.getElementById("workspace-focus-toggle"),
    workspaceFocusBadge: document.getElementById("workspace-focus-badge"),
    liveAdvisorDetach: document.getElementById("live-advisor-detach"),
    advisorObservation: document.querySelector("[data-advisor-observation]"),
    navExplore: document.getElementById("nav-explore"),
    navExplorePathos: document.getElementById("nav-explore-pathos"),
    navSavedJobs: document.getElementById("nav-saved-jobs"),
    navResumeAssets: document.getElementById("nav-resume-assets"),
    navResumeBadge: document.querySelector("[data-resume-nav-badge]"),
    navActivityLog: document.getElementById("nav-activity-log"),
    activityNavBadge: document.querySelector("[data-activity-nav-badge]"),
    navBenefitsGuide: document.getElementById("nav-benefits-guide"),
    navBenefitsComp: document.getElementById("nav-benefits-comp"),
    navProfile: document.getElementById("nav-profile"),
    navSettings: document.getElementById("nav-settings"),
    navConversations: document.getElementById("nav-conversations"),
    navAlertCenter: document.getElementById("nav-alert-center"),
    savedJobsView: document.getElementById("saved-jobs-view"),
    exploreView: document.getElementById("explore-view"),
    explorePathosView: document.getElementById("explore-pathos-view"),
    resumeAssetsView: document.getElementById("resume-assets-view"),
    benefitsGuideView: document.getElementById("benefits-guide-view"),
    benefitsCompView: document.getElementById("benefits-comp-view"),
    profileView: document.getElementById("profile-view"),
    settingsView: document.getElementById("settings-view"),
    alertCenterView: document.getElementById("alert-center-view"),
    conversationsView: document.getElementById("conversations-view"),
    conversationList: document.getElementById("conversation-list"),
    conversationSearch: document.getElementById("conversation-search"),
    conversationNew: document.getElementById("conversation-new"),
    conversationDetailTitle: document.getElementById("conversation-detail-title"),
    conversationDetailMeta: document.getElementById("conversation-detail-meta"),
    conversationDetailClear: document.getElementById("conversation-clear-thread"),
    conversationDetailExport: document.getElementById("conversation-export-thread"),
    conversationDetailAction: document.getElementById("conversation-open-pathadvisor"),
    conversationEmpty: document.getElementById("conversation-empty"),
    decisionOverlayOpen: document.getElementById("decision-overlay-open"),
    decisionOverlay: document.getElementById("decision-overlay"),
    decisionDetach: document.getElementById("decision-detach"),
    decisionClose: document.getElementById("decision-close"),
    decisionViewFocus: document.getElementById("decision-view-focus"),
    decisionViewStatus: document.getElementById("decision-view-status"),
    decisionReattach: document.getElementById("decision-reattach"),
    decisionCopySummary: document.getElementById("decision-copy-summary"),
    decisionCloseWindow: document.getElementById("decision-close-window"),
    decisionViewWindow: document.getElementById("decision-view-window"),
    liveSurfaceSidebar: document.querySelector("[data-live-surface=\"sidebar\"]"),
    liveSurfaceWindow: document.querySelector("[data-live-surface=\"window\"]"),
    decisionSurfaceOverlay: document.querySelector(
      "[data-decision-surface=\"overlay\"]"
    ),
    decisionSurfaceWindow: document.querySelector(
      "[data-decision-surface=\"window\"]"
    ),
    benefitsEmbedSurface: document.getElementById("benefits-embed-surface"),
    benefitsViewport: document.getElementById("benefits-viewport"),
    benefitsWebviewFrame: document.getElementById("benefits-webview-frame"),
  };

  activityLogLayoutElements = {
    activityLog: elements.activityLog,
    activityToggle: elements.activityToggle,
    activityLogSurface: elements.activityLogSurface,
    activitySystemList: elements.activitySystemList,
    activitySystemEmpty: elements.activitySystemEmpty,
    activityRecentList: elements.activityRecentList,
    activityAuditStatus: elements.activityAuditStatus,
    activityConfirmation: elements.activityConfirmation,
    backendStatusCardBody: elements.backendStatusCardBody,
    backendStatusCardState: elements.backendStatusCardState,
  };

  advisorObservationElement = elements.advisorObservation;
  selectedJobContextSurfaces = [
    collectSelectedJobContextElements(document),
    collectSelectedJobContextElements(elements.liveSurfaceWindow),
  ].filter(Boolean);

  selectedJobContextSurfaces.forEach((surface) => {
    setupPrivacyCards({
      privacyCards: surface.privacyCards,
    });
    if (surface.clearButton) {
      surface.clearButton.addEventListener("click", () => {
        selectedJobStore.clearSelectedJob("selected-job-clear");
      });
    }
  });

  wireRendererReloadButton(document, {
    button: elements.rendererReloadButton,
    workbench: window.workbench,
    location: window.location,
  });

  // ===============================================================
  // WHY: The main window must hide PathAdvisor when the popout owns it.
  // HOW: Apply owner updates from the main process to the layout.
  // ===============================================================
  applyAdvisorSurfaceOwner(elements, "main");
  if (window.advisorOwner) {
    const applyOwnerPayload = (payload) => {
      const nextOwner =
        payload && typeof payload.owner === "string" ? payload.owner : "main";
      applyAdvisorSurfaceOwner(elements, nextOwner);
    };
    if (window.advisorOwner.onOwnerChange) {
      window.advisorOwner.onOwnerChange((payload) => {
        applyOwnerPayload(payload);
      });
    }
    if (window.advisorOwner.getOwner) {
      window.advisorOwner
        .getOwner()
        .then((payload) => {
          applyOwnerPayload(payload);
        })
        .catch(() => {});
    }
  }

  const scheduleViewportSync = createViewportScheduler(() => {
    updateViewportBounds(elements);
    updateBenefitsViewportBounds(elements);
  });
  let usajobsViewportResizeTimer = null;
  const scheduleUsajobsViewportResize = () => {
    if (usajobsViewportResizeTimer !== null) {
      window.clearTimeout(usajobsViewportResizeTimer);
    }
    usajobsViewportResizeTimer = window.setTimeout(() => {
      usajobsViewportResizeTimer = null;
      resizeUsajobsViewportForTray();
    }, 100);
  };
  scheduleWorkspaceViewportSync = scheduleViewportSync;

  conversationViewElements = {
    conversationList: elements.conversationList,
    conversationSearch: elements.conversationSearch,
    conversationNew: elements.conversationNew,
    conversationDetailTitle: elements.conversationDetailTitle,
    conversationDetailMeta: elements.conversationDetailMeta,
    conversationDetailClear: elements.conversationDetailClear,
    conversationDetailExport: elements.conversationDetailExport,
    conversationDetailAction: elements.conversationDetailAction,
    conversationEmpty: elements.conversationEmpty,
  };

  workspaceViewElements = {
    views: {
      explore: elements.exploreView,
      "explore-pathos": elements.explorePathosView,
      "saved-jobs": elements.savedJobsView,
      "activity-log": elements.activityLogView,
      "resume-assets": elements.resumeAssetsView,
      "benefits-guide": elements.benefitsGuideView,
      "benefits-comp": elements.benefitsCompView,
      profile: elements.profileView,
      settings: elements.settingsView,
      "alert-center": elements.alertCenterView,
      conversations: elements.conversationsView,
    },
    navItems: {
      explore: elements.navExplore,
      "explore-pathos": elements.navExplorePathos,
      "saved-jobs": elements.navSavedJobs,
      "activity-log": elements.navActivityLog,
      "resume-assets": elements.navResumeAssets,
      "benefits-guide": elements.navBenefitsGuide,
      "benefits-comp": elements.navBenefitsComp,
      profile: elements.navProfile,
      settings: elements.navSettings,
      "alert-center": elements.navAlertCenter,
      conversations: elements.navConversations,
    },
  };

  // ===============================================================
  // WHY: Benefits workspace needs its own wiring and guidance state.
  // HOW: Collect DOM refs, advisor sections, and attach handlers once.
  // ===============================================================
  benefitsViewElements = collectBenefitsWorkspaceElements(elements.benefitsCompView);
  if (benefitsViewElements) {
    benefitsViewElements.advisorModeSections = Array.from(
      document.querySelectorAll("[data-advisor-mode]")
    );
    benefitsViewElements.guidanceTitle = document.querySelector(
      "[data-benefits-guidance-title]"
    );
    benefitsViewElements.guidanceList = document.querySelector(
      "[data-benefits-guidance-list]"
    );
    setupBenefitsWorkspace(benefitsViewElements);
    setupBenefitsEmbedStatus(benefitsViewElements);
  }

  advisorModeElements = {
    advisorModeSections: Array.from(document.querySelectorAll("[data-advisor-mode]")),
  };

  // ===============================================================
  // WHY: Explore (PathOS) needs prompt + results wiring after load.
  // HOW: Collect references and bind the mock explore flow once.
  // ===============================================================
  explorePathosElements = collectExplorePathosElements(elements.explorePathosView);
  if (explorePathosElements) {
    const exploreAdvisorElements = collectExploreAdvisorElements(document);
    if (exploreAdvisorElements) {
      explorePathosElements.advisorSummary = exploreAdvisorElements.advisorSummary;
      explorePathosElements.advisorReasons = exploreAdvisorElements.advisorReasons;
    }
    setupExplorePathos(explorePathosElements);
  }

  // ===============================================================
  // WHY: Resume & Career view requires store-driven rendering.
  // HOW: Collect elements, bind actions, and subscribe to updates.
  // ===============================================================
  resumeCareerElements = collectResumeCareerElements(elements.resumeAssetsView);
  if (resumeCareerElements) {
    setupResumeCareerView(resumeCareerElements);
    renderResumeCareerView(resumeCareerStore.getState(), resumeCareerElements);
    resumeCareerStore.subscribe(function (state) {
      renderResumeCareerView(state, resumeCareerElements);
      renderResumeTargets(resumeCareerElements);
      renderAdvisorActiveJobObservation();
    });
    renderAdvisorActiveJobObservation();
  }

  const jobPrivacyToggles = Array.from(
    document.querySelectorAll("[data-selected-job-privacy-toggle]")
  );
  jobPrivacyToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      // Day 65: Header privacy icon has no card body; toggle aria-pressed so state updates.
      const current = toggle.getAttribute("aria-pressed");
      const next = current === "true" ? "false" : "true";
      toggle.setAttribute("aria-pressed", next);
      updateJobContextPrivacyState(jobPrivacyToggles, elements, resumeCareerElements);
    });
  });
  updateJobContextPrivacyState(jobPrivacyToggles, elements, resumeCareerElements);

  renderActivityLog(elements);
  updateResumeNavBadge(elements);
  jobSelectionStore.subscribe(function () {
    renderActivityLog(elements);
    renderResumeTargets(resumeCareerElements);
    updateResumeNavBadge(elements);
  });

  const renderActiveJobContext = () => {
    renderResumeActiveJobAwareness(resumeCareerElements);
    renderAdvisorActiveJobObservation();
  };
  renderActiveJobContext();
  activeJobContextStore.subscribe(function () {
    renderActiveJobContext();
  });

  const initialSelectedJob = selectedJobStore.getState().selectedJob;
  lastSelectedJobKey = buildSelectedJobKey(initialSelectedJob);
  renderSelectedJobContext();
  // ===============================================================
  // WHY: Early selections can occur before subscriptions are wired.
  // HOW: Seed the Activity Log if the current selection is not tracked.
  // ===============================================================
  if (initialSelectedJob) {
    const normalizedInitialSelection = ensureSelectionPostingUrl(initialSelectedJob);
    const recentState = jobSelectionStore.getState();
    const recentSelections = Array.isArray(recentState.recentSelections)
      ? recentState.recentSelections
      : [];
    const initialKey = jobSelectionStoreApi.buildSelectionKey(normalizedInitialSelection);
    const alreadyTracked = recentSelections.some((entry) => {
      return jobSelectionStoreApi.buildSelectionKey(entry) === initialKey;
    });
    if (!alreadyTracked) {
      // job-selection-store drops selections without a postingUrl, so normalize here.
      jobSelectionStore.addRecentSelection(normalizedInitialSelection);
    }
  }
  // ===============================================================
  // WHY: Selection changes should update job context and activity.
  // HOW: Skip activity writes for storage sync to avoid ping-pong.
  // ===============================================================
  selectedJobStore.subscribe(function (state, reason) {
    renderSelectedJobContext();
    if (state.selectedJob && reason !== "selected-job-storage-sync") {
      if (skipNextRecentSelectionAdd) {
        skipNextRecentSelectionAdd = false;
      } else {
        // job-selection-store drops selections without a postingUrl, so normalize here.
        const normalizedSelection = ensureSelectionPostingUrl(state.selectedJob);
        const added = jobSelectionStore.logJobSelected(normalizedSelection);
        if (isDevRenderer && !added) {
          console.warn("[ActivityLog] addRecentSelection rejected", {
            selection: normalizedSelection,
            postingUrl: resolveSelectionPostingUrl(normalizedSelection),
            reason: "selectedJobStore.subscribe",
          });
        }
      }
    } else if (skipNextRecentSelectionAdd) {
      skipNextRecentSelectionAdd = false;
    }
    if (resumeCareerElements) {
      renderResumeCurrentJobCard(resumeCareerElements);
      maybeNotifySelectedJobChange(state.selectedJob, resumeCareerElements);
    } else {
      maybeNotifySelectedJobChange(state.selectedJob, null);
    }
  });

  if (elements.navBrand) {
    elements.navBrand.addEventListener("click", () => {
      setActiveWorkspaceView("saved-jobs");
    });
  }
  if (elements.navActivityLog) {
    elements.navActivityLog.addEventListener("click", () => {
      openActivityLogFromNav(elements, scheduleViewportSync);
    });
  }
  if (elements.activityLogBack) {
    elements.activityLogBack.addEventListener("click", () => {
      setActiveWorkspaceView(resolveActivityLogExitTarget());
    });
  }

  [
    { nav: elements.navExplore, view: "explore" },
    { nav: elements.navExplorePathos, view: "explore-pathos" },
    { nav: elements.navSavedJobs, view: "saved-jobs" },
    { nav: elements.navResumeAssets, view: "resume-assets" },
    { nav: elements.navBenefitsGuide, view: "benefits-guide" },
    { nav: elements.navBenefitsComp, view: "benefits-comp" },
    { nav: elements.navProfile, view: "profile" },
    { nav: elements.navAlertCenter, view: "alert-center" },
    { nav: elements.navSettings, view: "settings" },
  ].forEach(({ nav, view }) => {
    if (!nav) {
      return;
    }
    nav.addEventListener("click", () => {
      setActiveWorkspaceView(view);
    });
  });
  Array.from(document.querySelectorAll("[data-nav-link]")).forEach((button) => {
    if (!(button instanceof HTMLElement)) {
      return;
    }
    button.addEventListener("click", () => {
      const target = button.dataset.navLink;
      if (target) {
        setActiveWorkspaceView(target);
      }
    });
  });
  if (elements.conversationNew) {
    elements.conversationNew.addEventListener("click", () => {
      createThread();
    });
  }
  if (elements.conversationSearch) {
    elements.conversationSearch.addEventListener("input", () => {
      renderConversationsView();
    });
  }
  if (elements.conversationDetailAction) {
    elements.conversationDetailAction.addEventListener("click", () => {
      setActiveWorkspaceView("explore");
      if (elements.followupInput) {
        elements.followupInput.focus();
      }
    });
  }
  if (elements.conversationDetailClear) {
    elements.conversationDetailClear.addEventListener("click", () => {
      const thread = getActiveThread();
      if (!thread || !thread.messages.length) {
        return;
      }
      const confirmed = window.confirm("Clear this conversation?");
      if (confirmed) {
        clearThread(thread.id);
      }
    });
  }
  if (elements.conversationDetailExport) {
    elements.conversationDetailExport.addEventListener("click", () => {
      exportActiveThread();
    });
  }

  const decisionEnabled = DECISION_MODE_ENABLED;
  if (!decisionEnabled) {
    hideDecisionModeUi(elements);
  }

  const mode = getModeFromUrl();
  applyModeLayout(mode);
  if (mode === "live") {
    document.title = "PathOS – Live Advisor";
  }
  if (mode === "decision") {
    document.title = "PathOS – Decision View";
  }

  setupActivityLog(elements, scheduleViewportSync);
  setupBackendStatusCard(elements);
  setupBackendDevProbe(elements);
  setupAlertsPopover(document);
  setupQuickActions(document);
  setupPathAdvisorSidebarCollapses(document);
  setupPathAdvisorGuidanceToggle(document);
  // WHY: Day 64 – PathAdvisor Overview/Focus toggle removed; no setupFocusModeToggle.
  setupWorkspaceFocusToggle(elements);
  setupEmbeddedBrowserBar(elements);
  setupUsaJobsFallback();

  const sidebarSurface = collectLiveAdvisorElements(elements.liveSurfaceSidebar);
  const windowSurface = collectLiveAdvisorElements(elements.liveSurfaceWindow);
  registerLiveAdvisorSurface(sidebarSurface);
  registerLiveAdvisorSurface(windowSurface);
  renderConversationsView();
  setActiveWorkspaceView(activeWorkspaceView);
  scheduleUsajobsViewportResize();

  if (hasNativeLocalStorage) {
    window.addEventListener("storage", (event) => {
      if (event.key !== CONVERSATION_STORAGE_KEY) {
        return;
      }
      const nextState = loadConversationState(conversationStorage);
      ensureActiveThread(nextState);
      conversationState = nextState;
      syncConversationUi();
    });
  }

  if (decisionEnabled) {
    const decisionOverlaySurface = collectDecisionSurfaceElements(
      elements.decisionSurfaceOverlay
    );
    const decisionWindowSurface = collectDecisionSurfaceElements(
      elements.decisionSurfaceWindow
    );
    registerDecisionSurface(decisionOverlaySurface);
    registerDecisionSurface(decisionWindowSurface);

    if (elements.decisionOverlay) {
      setDecisionOverlayOpen(elements, false);
    }
  }

  const applyWindowState = (payload) => {
    const liveOpen = Boolean(payload && payload.liveAdvisorOpen);
    const decisionOpen = decisionEnabled
      ? Boolean(payload && payload.decisionViewOpen)
      : false;
    pathAdvisorState.liveWindowOpen = liveOpen;
    pathAdvisorState.decisionWindowOpen = decisionOpen;
    syncPathAdvisorExpandCollapseLabel(elements, liveOpen);
    if (decisionEnabled) {
      if (elements.decisionViewStatus) {
        elements.decisionViewStatus.hidden = !decisionOpen;
      }
      if (elements.decisionViewFocus) {
        elements.decisionViewFocus.hidden = !decisionOpen;
      }
      if (elements.decisionOverlayOpen) {
        elements.decisionOverlayOpen.hidden = decisionOpen;
      }
    }
  };

  if (window.pathadvisorWindows && window.pathadvisorWindows.getWindowStates) {
    window.pathadvisorWindows
      .getWindowStates()
      .then((payload) => applyWindowState(payload))
      .catch(() => {});
  }

  if (window.pathadvisorWindows && window.pathadvisorWindows.onWindowState) {
    window.pathadvisorWindows.onWindowState((payload) => {
      applyWindowState(payload);
    });
  }

  // ===============================================================
  // WHY: Popout guidance should reach the main chat without extra windows.
  // HOW: Listen for draft events and inject them into the main composer.
  // ===============================================================
  if (window.pathadvisorDrafts && window.pathadvisorDrafts.onGuidanceDraft) {
    window.pathadvisorDrafts.onGuidanceDraft((payload) => {
      applyGuidanceDraftToAdvisor(elements, payload);
    });
  }

  if (
    decisionEnabled &&
    window.pathadvisorWindows &&
    window.pathadvisorWindows.onDecisionOverlayOpen
  ) {
    window.pathadvisorWindows.onDecisionOverlayOpen((payload) => {
      if (pathAdvisorState.mode === "main" && payload && payload.open) {
        setDecisionOverlayOpen(elements, true);
      }
    });
  }

  if (elements.liveAdvisorDetach) {
    syncPathAdvisorExpandCollapseLabel(elements, pathAdvisorState.liveWindowOpen);
    setupPathAdvisorModeToggle(elements);
  }

  if (decisionEnabled) {
    if (elements.decisionOverlayOpen) {
      elements.decisionOverlayOpen.addEventListener("click", () => {
        if (pathAdvisorState.decisionWindowOpen) {
          return;
        }
        setDecisionOverlayOpen(elements, true);
      });
    }

    if (elements.decisionDetach) {
      elements.decisionDetach.addEventListener("click", () => {
        if (
          window.pathadvisorWindows &&
          window.pathadvisorWindows.openDecisionViewWindow
        ) {
          window.pathadvisorWindows.openDecisionViewWindow();
          setDecisionOverlayOpen(elements, false);
        }
      });
    }

    if (elements.decisionClose) {
      elements.decisionClose.addEventListener("click", () => {
        setDecisionOverlayOpen(elements, false);
      });
    }

    if (elements.decisionViewFocus) {
      elements.decisionViewFocus.addEventListener("click", () => {
        if (window.pathadvisorWindows && window.pathadvisorWindows.focusWindow) {
          window.pathadvisorWindows.focusWindow("decision");
        }
      });
    }

    if (elements.decisionReattach) {
      elements.decisionReattach.addEventListener("click", () => {
        if (
          window.pathadvisorWindows &&
          window.pathadvisorWindows.requestDecisionOverlayOpen
        ) {
          window.pathadvisorWindows.requestDecisionOverlayOpen();
        }
        if (window.pathadvisorWindows && window.pathadvisorWindows.focusWindow) {
          window.pathadvisorWindows.focusWindow("main");
        }
      });
    }

    if (elements.decisionCopySummary) {
      elements.decisionCopySummary.addEventListener("click", () => {
        copyDecisionSummary();
      });
    }

    if (elements.decisionCloseWindow) {
      elements.decisionCloseWindow.addEventListener("click", () => {
        if (
          window.pathadvisorWindows &&
          window.pathadvisorWindows.closeDecisionViewWindow
        ) {
          window.pathadvisorWindows.closeDecisionViewWindow();
        }
      });
    }
  }

  if (decisionEnabled) {
    if (window.pathadvisorThreads && window.pathadvisorThreads.getDecisionThread) {
      window.pathadvisorThreads
        .getDecisionThread()
        .then((thread) => {
          applyingRemoteDecisionThread = true;
          setDecisionThread(thread);
          applyingRemoteDecisionThread = false;
        })
        .catch(() => {});
    }

    if (
      window.pathadvisorThreads &&
      window.pathadvisorThreads.onDecisionThreadUpdated
    ) {
      window.pathadvisorThreads.onDecisionThreadUpdated((thread) => {
        applyingRemoteDecisionThread = true;
        setDecisionThread(thread);
        applyingRemoteDecisionThread = false;
      });
    }
  }

  if (window.workbenchViewport && window.workbenchViewport.setBounds) {
    scheduleViewportSync();
    scheduleUsajobsViewportResize();
    window.addEventListener("resize", scheduleViewportSync);
    window.addEventListener("resize", scheduleUsajobsViewportResize);

    [
      elements.appShell,
      elements.leftNav,
      elements.workbench,
      elements.workbenchHeader,
      elements.activityLog,
    ]
      .filter(Boolean)
      .forEach((target) => {
        target.addEventListener("transitionend", scheduleViewportSync);
        target.addEventListener("transitionend", scheduleUsajobsViewportResize);
      });

    if (window.ResizeObserver) {
      const viewportObserver = new ResizeObserver(() => {
        scheduleViewportSync();
        scheduleUsajobsViewportResize();
      });
      if (elements.usaJobsViewport) {
        viewportObserver.observe(elements.usaJobsViewport);
      }
      if (elements.workbench) {
        viewportObserver.observe(elements.workbench);
      }
      if (elements.leftNav) {
        viewportObserver.observe(elements.leftNav);
      }
      if (elements.activityLog) {
        viewportObserver.observe(elements.activityLog);
      }
      const trayContainer =
        elements.activityLog &&
        elements.activityLog.parentElement &&
        elements.activityLog.parentElement.classList.contains(
          "activity-tray-container"
        )
          ? elements.activityLog.parentElement
          : null;
      if (trayContainer) {
        viewportObserver.observe(trayContainer);
      }
      if (elements.workbenchHeader) {
        viewportObserver.observe(elements.workbenchHeader);
      }
      if (elements.benefitsViewport) {
        // ===============================================================
        // WHY: Benefits BrowserView bounds must track the real viewport size.
        // HOW: Observe the same viewport element that we measure for bounds.
        // ===============================================================
        viewportObserver.observe(elements.benefitsViewport);
      }
      if (elements.benefitsCompView) {
        viewportObserver.observe(elements.benefitsCompView);
      }
    }
  }

  // ===============================================================
  // WHY: The boot watchdog needs a positive ready signal.
  // HOW: Flip the ready flag after init finishes successfully.
  // ===============================================================
  markRendererReady();
};

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
};
