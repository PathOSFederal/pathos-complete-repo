"use strict";

// ===============================================================
// WHY: Conversations must persist across windows and sessions.
// HOW: Provide a shared, testable store with sanitized state helpers.
// ===============================================================

const CONVERSATION_STORAGE_KEY = "pathadvisor.conversations.v1";
const DEFAULT_THREAD_TITLE_PREFIX = "Conversation";

// ===============================================================
// WHY: Messages need stable ids and timestamps for export + render.
// HOW: Create a normalized message object for every new entry.
// ===============================================================
/**
 * Create a new conversation message object.
 * @param {"user" | "assistant"} role
 * @param {string} content
 * @returns {{ id: string, role: "user" | "assistant", content: string, createdAt: string }}
 */
function createConversationMessage(role, content) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

// ===============================================================
// WHY: Threads group related messages for navigation and export.
// HOW: Seed new threads with metadata and an empty messages array.
// ===============================================================
/**
 * Create a new conversation thread object.
 * @param {string} title
 * @returns {{ id: string, title: string, createdAt: string, updatedAt: string, messages: Array }}
 */
function createConversationThread(title) {
  const timestamp = new Date().toISOString();
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
  };
}

// ===============================================================
// WHY: Persisted content can be corrupted or missing fields.
// HOW: Validate each message and coerce it to safe defaults.
// ===============================================================
/**
 * Sanitize a message from persisted state.
 * @param {object} message
 * @returns {{ id: string, role: "user" | "assistant", content: string, createdAt: string } | null}
 */
function sanitizeConversationMessage(message) {
  if (!message || typeof message !== "object") {
    return null;
  }
  const role =
    message.role === "user" || message.role === "assistant"
      ? message.role
      : "assistant";
  const content = typeof message.content === "string" ? message.content : "";
  const createdAt =
    typeof message.createdAt === "string" ? message.createdAt : new Date().toISOString();
  const id =
    typeof message.id === "string" && message.id.length
      ? message.id
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { id, role, content, createdAt };
}

// ===============================================================
// WHY: Threads must always render with consistent metadata + messages.
// HOW: Normalize fields, sanitize messages, and clone arrays.
// ===============================================================
/**
 * Sanitize a thread from persisted state.
 * @param {object} thread
 * @returns {{ id: string, title: string, createdAt: string, updatedAt: string, messages: Array } | null}
 */
function sanitizeConversationThread(thread) {
  if (!thread || typeof thread !== "object") {
    return null;
  }
  const title = typeof thread.title === "string" ? thread.title : "";
  const createdAt =
    typeof thread.createdAt === "string" ? thread.createdAt : new Date().toISOString();
  const updatedAt =
    typeof thread.updatedAt === "string" ? thread.updatedAt : createdAt;
  const id =
    typeof thread.id === "string" && thread.id.length
      ? thread.id
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const messages = [];
  if (Array.isArray(thread.messages)) {
    thread.messages.forEach(function (message) {
      const safeMessage = sanitizeConversationMessage(message);
      if (safeMessage) {
        messages.push(safeMessage);
      }
    });
  }
  return { id, title, createdAt, updatedAt, messages };
}

// ===============================================================
// WHY: State needs a predictable baseline for migrations + resets.
// HOW: Provide a clean empty state with counters and no threads.
// ===============================================================
/**
 * Create the empty conversation state shape.
 * @returns {{ threads: Array, activeThreadId: string | null, threadCounter: number }}
 */
function createEmptyConversationState() {
  return {
    threads: [],
    activeThreadId: null,
    threadCounter: 1,
  };
}

// ===============================================================
// WHY: Persisted state can drift or lose critical properties.
// HOW: Sanitize threads, repair counters, and ensure active id.
// ===============================================================
/**
 * Sanitize the full conversation state.
 * @param {object} state
 * @returns {{ threads: Array, activeThreadId: string | null, threadCounter: number }}
 */
function sanitizeConversationState(state) {
  const base = createEmptyConversationState();
  if (!state || typeof state !== "object") {
    return base;
  }
  const threads = [];
  if (Array.isArray(state.threads)) {
    state.threads.forEach(function (thread) {
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
  if (!sanitized.threads.find(function (thread) { return thread.id === sanitized.activeThreadId; })) {
    sanitized.activeThreadId = sanitized.threads[0] ? sanitized.threads[0].id : null;
  }
  return sanitized;
}

// ===============================================================
// WHY: Every experience must have a selected thread to render.
// HOW: Seed the first thread and active id when missing.
// ===============================================================
/**
 * Ensure there is always an active thread available.
 * @param {object} state
 */
function ensureActiveThread(state) {
  if (!state.threads.length) {
    createThreadInState(state);
  }
  if (!state.activeThreadId) {
    state.activeThreadId = state.threads[0].id;
  }
  if (!state.threads.find(function (thread) { return thread.id === state.activeThreadId; })) {
    state.activeThreadId = state.threads[0].id;
  }
}

// ===============================================================
// WHY: New threads should be consistently named and positioned.
// HOW: Increment the counter and place the new thread first.
// ===============================================================
/**
 * Create a new thread inside the provided state object.
 * @param {object} state
 * @returns {object} thread
 */
function createThreadInState(state) {
  const title = `${DEFAULT_THREAD_TITLE_PREFIX} ${state.threadCounter}`;
  const thread = createConversationThread(title);
  state.threadCounter += 1;
  state.threads.unshift(thread);
  state.activeThreadId = thread.id;
  return thread;
}

// ===============================================================
// WHY: The newest activity should surface at the top of the list.
// HOW: Move the active thread to the front without rebuilding arrays.
// ===============================================================
/**
 * Move a thread to the front of the list.
 * @param {object} state
 * @param {string} threadId
 */
function promoteThreadToFront(state, threadId) {
  const index = state.threads.findIndex(function (thread) { return thread.id === threadId; });
  if (index <= 0) {
    return;
  }
  const thread = state.threads.splice(index, 1)[0];
  state.threads.unshift(thread);
}

// ===============================================================
// WHY: Thread titles should match the user's first intent.
// HOW: Derive a short title from the first message content.
// ===============================================================
/**
 * Derive a short thread title from a message body.
 * @param {string} content
 * @returns {string}
 */
function deriveThreadTitleFromMessage(content) {
  if (!content || !content.trim()) {
    return "";
  }
  const words = content.trim().split(/\s+/).slice(0, 6);
  return words.join(" ");
}

// ===============================================================
// WHY: Messages are the atomic unit of the chat UI.
// HOW: Append, update timestamps, and adjust titles when needed.
// ===============================================================
/**
 * Add a new message to the active thread.
 * @param {object} state
 * @param {"user" | "assistant"} role
 * @param {string} content
 */
function addMessageToActiveThread(state, role, content) {
  const thread = state.threads.find(function (item) { return item.id === state.activeThreadId; });
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
}

// ===============================================================
// WHY: Thread selection must stay in sync across surfaces.
// HOW: Set the active id only if the thread exists.
// ===============================================================
/**
 * Set the active thread id.
 * @param {object} state
 * @param {string} threadId
 */
function selectThread(state, threadId) {
  if (state.threads.find(function (thread) { return thread.id === threadId; })) {
    state.activeThreadId = threadId;
  }
}

// ===============================================================
// WHY: Titles should be editable for faster scanning.
// HOW: Update title, bump timestamps, and promote thread.
// ===============================================================
/**
 * Rename a thread.
 * @param {object} state
 * @param {string} threadId
 * @param {string} nextTitle
 */
function renameThread(state, threadId, nextTitle) {
  const thread = state.threads.find(function (item) { return item.id === threadId; });
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
}

// ===============================================================
// WHY: Users must be able to remove old threads safely.
// HOW: Remove and fallback to a fresh thread if none remain.
// ===============================================================
/**
 * Delete a thread by id.
 * @param {object} state
 * @param {string} threadId
 */
function deleteThread(state, threadId) {
  const index = state.threads.findIndex(function (thread) { return thread.id === threadId; });
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
}

// ===============================================================
// WHY: Clear should preserve thread metadata for continuity.
// HOW: Reset messages in-place and update timestamps.
// ===============================================================
/**
 * Clear messages from a thread.
 * @param {object} state
 * @param {string} threadId
 */
function clearThread(state, threadId) {
  const thread = state.threads.find(function (item) { return item.id === threadId; });
  if (!thread) {
    return;
  }
  thread.messages = [];
  thread.updatedAt = new Date().toISOString();
  promoteThreadToFront(state, threadId);
}

// ===============================================================
// WHY: Export needs metadata alongside the raw messages.
// HOW: Build a stable JSON payload with identifiers + timestamps.
// ===============================================================
/**
 * Build an export payload for a thread.
 * @param {object} thread
 * @returns {object}
 */
function buildThreadExport(thread) {
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
}

// ===============================================================
// WHY: Markdown export keeps transcripts portable for notes.
// HOW: Emit a simple role-prefixed transcript with the title.
// ===============================================================
/**
 * Create a Markdown transcript for a thread.
 * @param {object} thread
 * @returns {string}
 */
function exportThreadMarkdown(thread) {
  if (!thread) {
    return "";
  }
  const title = thread.title || "Conversation";
  const lines = [`# ${title}`, ""];
  thread.messages.forEach(function (message) {
    const label = message.role === "user" ? "You" : "PathAdvisor";
    lines.push(`**${label}:** ${message.content}`);
    lines.push("");
  });
  return lines.join("\n").trim();
}

// ===============================================================
// WHY: JSON export should support reloads and structured archives.
// HOW: Serialize the export payload with stable formatting.
// ===============================================================
/**
 * Create a JSON export for a thread.
 * @param {object} thread
 * @returns {string}
 */
function exportThreadJson(thread) {
  const payload = buildThreadExport(thread);
  if (!payload) {
    return "";
  }
  return JSON.stringify(payload, null, 2);
}

// ===============================================================
// WHY: Local-only history must survive restarts.
// HOW: Read + write to an injected storage adapter.
// ===============================================================
/**
 * Load persisted conversation state.
 * @param {{ getItem: function(string): (string | null) }} storage
 * @returns {object}
 */
function loadConversationState(storage) {
  try {
    const raw = storage.getItem(CONVERSATION_STORAGE_KEY);
    if (!raw) {
      return createEmptyConversationState();
    }
    return sanitizeConversationState(JSON.parse(raw));
  } catch (error) {
    return createEmptyConversationState();
  }
}

/**
 * Persist conversation state to storage.
 * @param {{ setItem: function(string, string): void }} storage
 * @param {object} state
 */
function persistConversationState(storage, state) {
  try {
    const snapshot = sanitizeConversationState(state);
    storage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    // Best-effort persistence for local-only history.
  }
}

const PathAdvisorConversationStore = {
  CONVERSATION_STORAGE_KEY,
  DEFAULT_THREAD_TITLE_PREFIX,
  createConversationMessage,
  createConversationThread,
  sanitizeConversationMessage,
  sanitizeConversationThread,
  createEmptyConversationState,
  sanitizeConversationState,
  ensureActiveThread,
  createThreadInState,
  promoteThreadToFront,
  deriveThreadTitleFromMessage,
  addMessageToActiveThread,
  selectThread,
  renameThread,
  deleteThread,
  clearThread,
  buildThreadExport,
  exportThreadMarkdown,
  exportThreadJson,
  loadConversationState,
  persistConversationState,
};

if (typeof window !== "undefined") {
  window.PathAdvisorConversationStore = PathAdvisorConversationStore;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = PathAdvisorConversationStore;
}
