// ===============================================================
// WHY: The conversation store script must be present for UI wiring.
// HOW: Provide a defensive fallback if the store failed to load.
// ===============================================================
export const buildFallbackConversationStore = () => {
  const CONVERSATION_STORAGE_KEY = "pathadvisor.conversations.v1";
  const DEFAULT_THREAD_TITLE_PREFIX = "Conversation";

  const createConversationMessage = (role, content) => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  });

  const createConversationThread = (title) => {
    const timestamp = new Date().toISOString();
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      createdAt: timestamp,
      updatedAt: timestamp,
      messages: [],
    };
  };

  const sanitizeConversationMessage = (message) => {
    if (!message || typeof message !== "object") {
      return null;
    }
    const role =
      message.role === "user" || message.role === "assistant"
        ? message.role
        : "assistant";
    const content = typeof message.content === "string" ? message.content : "";
    const createdAt =
      typeof message.createdAt === "string"
        ? message.createdAt
        : new Date().toISOString();
    const id =
      typeof message.id === "string" && message.id.length
        ? message.id
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return { id, role, content, createdAt };
  };

  const sanitizeConversationThread = (thread) => {
    if (!thread || typeof thread !== "object") {
      return null;
    }
    const title = typeof thread.title === "string" ? thread.title : "";
    const createdAt =
      typeof thread.createdAt === "string"
        ? thread.createdAt
        : new Date().toISOString();
    const updatedAt =
      typeof thread.updatedAt === "string" ? thread.updatedAt : createdAt;
    const id =
      typeof thread.id === "string" && thread.id.length
        ? thread.id
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const messages = [];
    if (Array.isArray(thread.messages)) {
      thread.messages.forEach((message) => {
        const safeMessage = sanitizeConversationMessage(message);
        if (safeMessage) {
          messages.push(safeMessage);
        }
      });
    }
    return { id, title, createdAt, updatedAt, messages };
  };

  const createEmptyConversationState = () => ({
    threads: [],
    activeThreadId: null,
    threadCounter: 1,
  });

  const sanitizeConversationState = (state) => {
    const base = createEmptyConversationState();
    if (!state || typeof state !== "object") {
      return base;
    }
    const threads = [];
    if (Array.isArray(state.threads)) {
      state.threads.forEach((thread) => {
        const safeThread = sanitizeConversationThread(thread);
        if (safeThread) {
          threads.push(safeThread);
        }
      });
    }
    const threadCounter =
      typeof state.threadCounter === "number" && state.threadCounter > 0
        ? state.threadCounter
        : Math.max(1, threads.length + 1);
    const activeThreadId =
      typeof state.activeThreadId === "string" ? state.activeThreadId : null;
    const sanitized = { threads, activeThreadId, threadCounter };
    if (!sanitized.threads.find((thread) => thread.id === sanitized.activeThreadId)) {
      sanitized.activeThreadId = sanitized.threads[0]
        ? sanitized.threads[0].id
        : null;
    }
    return sanitized;
  };

  const createThreadInState = (state) => {
    const title = `${DEFAULT_THREAD_TITLE_PREFIX} ${state.threadCounter}`;
    const thread = createConversationThread(title);
    state.threadCounter += 1;
    state.threads.unshift(thread);
    state.activeThreadId = thread.id;
    return thread;
  };

  const ensureActiveThread = (state) => {
    if (!state.threads.length) {
      createThreadInState(state);
    }
    if (!state.activeThreadId) {
      state.activeThreadId = state.threads[0].id;
    }
    if (!state.threads.find((thread) => thread.id === state.activeThreadId)) {
      state.activeThreadId = state.threads[0].id;
    }
  };

  const promoteThreadToFront = (state, threadId) => {
    const index = state.threads.findIndex((thread) => thread.id === threadId);
    if (index <= 0) {
      return;
    }
    const thread = state.threads.splice(index, 1)[0];
    state.threads.unshift(thread);
  };

  const deriveThreadTitleFromMessage = (content) => {
    if (!content || !content.trim()) {
      return "";
    }
    const words = content.trim().split(/\s+/).slice(0, 6);
    return words.join(" ");
  };

  const addMessageToActiveThread = (state, role, content) => {
    const thread = state.threads.find((item) => item.id === state.activeThreadId);
    if (!thread) {
      return;
    }
    const isFirstUserMessage =
      role === "user" &&
      thread.messages.length === 0 &&
      thread.title.indexOf(DEFAULT_THREAD_TITLE_PREFIX) === 0;
    thread.messages.push(createConversationMessage(role, content));
    if (isFirstUserMessage) {
      const nextTitle = deriveThreadTitleFromMessage(content);
      if (nextTitle) {
        thread.title = nextTitle;
      }
    }
    thread.updatedAt = new Date().toISOString();
    promoteThreadToFront(state, thread.id);
  };

  const selectThread = (state, threadId) => {
    if (state.threads.find((thread) => thread.id === threadId)) {
      state.activeThreadId = threadId;
    }
  };

  const renameThread = (state, threadId, nextTitle) => {
    const thread = state.threads.find((item) => item.id === threadId);
    if (!thread) {
      return;
    }
    const trimmed = typeof nextTitle === "string" ? nextTitle.trim() : "";
    if (!trimmed) {
      return;
    }
    thread.title = trimmed;
    thread.updatedAt = new Date().toISOString();
    promoteThreadToFront(state, threadId);
  };

  const deleteThread = (state, threadId) => {
    const index = state.threads.findIndex((thread) => thread.id === threadId);
    if (index === -1) {
      return;
    }
    state.threads.splice(index, 1);
    if (state.activeThreadId === threadId) {
      state.activeThreadId = state.threads[0] ? state.threads[0].id : null;
    }
    if (!state.threads.length) {
      createThreadInState(state);
    }
  };

  const clearThread = (state, threadId) => {
    const thread = state.threads.find((item) => item.id === threadId);
    if (!thread) {
      return;
    }
    thread.messages = [];
    thread.updatedAt = new Date().toISOString();
    promoteThreadToFront(state, threadId);
  };

  const buildThreadExport = (thread) => {
    if (!thread) {
      return null;
    }
    return {
      conversationId: thread.id,
      title: thread.title,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      messages: thread.messages,
    };
  };

  const exportThreadMarkdown = (thread) => {
    if (!thread) {
      return "";
    }
    const title = thread.title || "Conversation";
    const lines = [`# ${title}`, ""];
    thread.messages.forEach((message) => {
      const label = message.role === "user" ? "You" : "PathAdvisor";
      lines.push(`**${label}:** ${message.content}`);
      lines.push("");
    });
    return lines.join("\n").trim();
  };

  const exportThreadJson = (thread) => {
    const payload = buildThreadExport(thread);
    if (!payload) {
      return "";
    }
    return JSON.stringify(payload, null, 2);
  };

  const loadConversationState = (storage) => {
    try {
      const raw = storage.getItem(CONVERSATION_STORAGE_KEY);
      if (!raw) {
        return createEmptyConversationState();
      }
      return sanitizeConversationState(JSON.parse(raw));
    } catch (error) {
      return createEmptyConversationState();
    }
  };

  const persistConversationState = (storage, state) => {
    try {
      const snapshot = sanitizeConversationState(state);
      storage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      // Best-effort persistence fallback.
    }
  };

  return {
    CONVERSATION_STORAGE_KEY,
    createEmptyConversationState,
    sanitizeConversationState,
    ensureActiveThread,
    createThreadInState,
    addMessageToActiveThread,
    selectThread,
    renameThread,
    deleteThread,
    clearThread,
    exportThreadMarkdown,
    exportThreadJson,
    loadConversationState,
    persistConversationState,
  };
};

// ===============================================================
// WHY: Resume & Career must stay resilient if its store fails to load.
// HOW: Provide a minimal in-memory store fallback with safe defaults.
// ===============================================================
export const buildFallbackResumeCareerStore = () => {
  const RESUME_CAREER_STORAGE_KEY = "pathos.desktop.resumeCareer.v1";

  const createEmptyResumeCareerState = () => ({
    resumes: [],
    activeResumeId: null,
    promptLog: [],
  });

  const sanitizeResumeCareerState = (state) => {
    if (!state || typeof state !== "object") {
      return createEmptyResumeCareerState();
    }
    return createEmptyResumeCareerState();
  };

  const createResumeCareerStore = (storage) => {
    let state = createEmptyResumeCareerState();
    const listeners = [];
    const notify = (reason) => {
      listeners.forEach(function (listener) {
        listener(state, reason || "");
      });
    };
    return {
      getState: () => state,
      subscribe: (listener) => {
        listeners.push(listener);
        return () => {
          const index = listeners.indexOf(listener);
          if (index !== -1) {
            listeners.splice(index, 1);
          }
        };
      },
      createResumeForJob: () => null,
      selectResume: () => {},
      archiveResume: () => {},
      deleteResume: () => {},
      exportResume: () => {},
      applyPromptUpdate: () => {},
    };
  };

  return {
    RESUME_CAREER_STORAGE_KEY,
    createEmptyResumeCareerState,
    sanitizeResumeCareerState,
    createResumeCareerStore,
  };
};

// ===============================================================
// WHY: Job context must be readable even if its module fails to load.
// HOW: Provide a minimal in-memory ActiveJobContext fallback.
// ===============================================================
export const buildFallbackActiveJobContextStore = () => {
  const createEmptyActiveJobState = () => ({ activeJob: null });

  const createActiveJobContextStore = () => {
    let state = createEmptyActiveJobState();
    const listeners = [];
    const notify = (reason) => {
      listeners.forEach(function (listener) {
        listener(state, reason || "");
      });
    };
    return {
      getState: () => state,
      subscribe: (listener) => {
        listeners.push(listener);
        return () => {
          const index = listeners.indexOf(listener);
          if (index !== -1) {
            listeners.splice(index, 1);
          }
        };
      },
      setActiveJob: () => null,
      clearActiveJob: () => {
        state = createEmptyActiveJobState();
        notify("active-job-clear");
      },
    };
  };

  return {
    createEmptyActiveJobState,
    createActiveJobContextStore,
    buildActiveJobContextFromExploreRole: () => null,
    isActiveJobInRoleList: () => false,
    buildResumeActiveJobStatus: () =>
      "No job selected. Select a job in Job Search first, or link a job below.",
    buildAdvisorActiveJobObservation: () =>
      "PathAdvisor noticed: No active job selection yet.",
  };
};

// ===============================================================
// WHY: Selected job state should fail safely if scripts are missing.
// HOW: Provide a minimal in-memory SelectedJob fallback store.
// ===============================================================
export const buildFallbackSelectedJobStore = () => {
  const SELECTED_JOB_STORAGE_KEY = "pathos.selectedJob.v1";

  const createEmptySelectedJobState = () => ({ selectedJob: null });

  const createSelectedJobStore = () => {
    let state = createEmptySelectedJobState();
    const listeners = [];
    const notify = (reason) => {
      listeners.forEach(function (listener) {
        listener(state, reason || "");
      });
    };
    return {
      getState: () => state,
      subscribe: (listener) => {
        listeners.push(listener);
        return () => {
          const index = listeners.indexOf(listener);
          if (index !== -1) {
            listeners.splice(index, 1);
          }
        };
      },
      setSelectedJob: () => null,
      clearSelectedJob: () => {
        state = createEmptySelectedJobState();
        notify("selected-job-clear");
      },
      refreshFromStorage: () => {
        notify("selected-job-refresh");
      },
    };
  };

  return {
    SELECTED_JOB_STORAGE_KEY,
    createEmptySelectedJobState,
    createSelectedJobStore,
    buildSelectedJobFromExploreRole: () => null,
    buildSelectedJobFromUsaJobsNavigation: () => null,
    isGenericUsaJobsTitle: () => true,
    chooseUsaJobsTitle: (_currentTitle, _candidateTitle, fallbackTitle = "") =>
      typeof fallbackTitle === "string" ? fallbackTitle.trim() : "",
  };
};

// ===============================================================
// WHY: Activity Log must stay resilient if its store fails to load.
// HOW: Provide a minimal in-memory job selection store fallback.
// ===============================================================
export const buildFallbackJobSelectionStore = () => {
  const JOB_SELECTION_STORAGE_KEY = "pathos.jobSelections.v1";

  const createEmptyJobSelectionState = () => ({
    recentSelections: [],
    resumeTargets: [],
    activityEvents: [],
    lastSeenActivityAt: null,
    lastSeenResumeAt: null,
  });

  const createJobSelectionStore = () => {
    let state = createEmptyJobSelectionState();
    const listeners = [];
    const notify = (reason) => {
      listeners.forEach(function (listener) {
        listener(state, reason || "");
      });
    };
    return {
      getState: () => state,
      subscribe: (listener) => {
        listeners.push(listener);
        return () => {
          const index = listeners.indexOf(listener);
          if (index !== -1) {
            listeners.splice(index, 1);
          }
        };
      },
      addRecentSelection: () => null,
      logJobViewed: () => null,
      logJobSelected: () => null,
      logJobPromoted: () => null,
      logResumeExported: () => null,
      addToResumeTargets: () => null,
      removeFromResumeTargets: () => {},
      setSelectedJobFromHistory: () => null,
      markActivityLogRead: () => {
        state = Object.assign({}, state, { lastSeenActivityAt: new Date().toISOString() });
        notify("activity-log-read");
      },
      markResumeTargetsRead: () => {
        state = Object.assign({}, state, { lastSeenResumeAt: new Date().toISOString() });
        notify("resume-targets-read");
      },
      clearActivityLog: () => {
        state = Object.assign({}, state, {
          recentSelections: [],
          activityEvents: [],
          lastSeenActivityAt: null,
        });
        notify("activity-log-reset");
      },
      refreshFromStorage: () => {
        notify("activity-log-refresh");
      },
    };
  };

  return {
    JOB_SELECTION_STORAGE_KEY,
    createEmptyJobSelectionState,
    createJobSelectionStore,
    calculateUnreadCount: () => 0,
    calculateResumeUnreadCount: () => 0,
    buildSelectionDisplayTitle: () => "Job selection",
    buildSelectionDisplayMeta: () => "",
    buildSelectionKey: () => "",
  };
};
