"use strict";

// ===============================================================
// WHY: Workspace Focus Mode is a pure layout variant (nav icon-only, main expanded).
// HOW: Lightweight store with localStorage persistence; state = workspaceMode.
// Day 64 Slice A – Nav + Grid only. No PathAdvisor/Activity changes.
// ===============================================================

const WORKSPACE_MODE_STORAGE_KEY = "pathos-workspace-mode";

/** @type {"standard" | "focus"} */
const DEFAULT_MODE = "standard";

/** @type {"standard" | "focus"} */
let workspaceMode = DEFAULT_MODE;
let listeners = [];

/**
 * Load workspaceMode from localStorage on init.
 * @returns {"standard" | "focus"}
 */
function loadFromStorage() {
  if (typeof localStorage === "undefined") {
    return DEFAULT_MODE;
  }
  try {
    const raw = localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY);
    if (raw === "focus" || raw === "standard") {
      return raw;
    }
  } catch (e) {
    // Ignore storage errors; use default.
  }
  return DEFAULT_MODE;
}

/**
 * Persist workspaceMode to localStorage.
 * @param {"standard" | "focus"} mode
 */
function saveToStorage(mode) {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, mode);
  } catch (e) {
    // Ignore storage errors.
  }
}

/**
 * Notify subscribers of mode change.
 */
function notifyListeners() {
  for (let i = 0; i < listeners.length; i++) {
    try {
      listeners[i](workspaceMode);
    } catch (e) {
      // Do not let one listener break others.
    }
  }
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Get current workspace mode.
 * @returns {"standard" | "focus"}
 */
function getWorkspaceMode() {
  return workspaceMode;
}

/**
 * Set workspace mode and persist.
 * @param {"standard" | "focus"} mode
 */
function setWorkspaceMode(mode) {
  if (mode !== "standard" && mode !== "focus") {
    return;
  }
  if (workspaceMode === mode) {
    return;
  }
  workspaceMode = mode;
  saveToStorage(mode);
  notifyListeners();
}

/**
 * Toggle between standard and focus.
 * @returns {"standard" | "focus"} New mode after toggle
 */
function toggleWorkspaceMode() {
  const next = workspaceMode === "focus" ? "standard" : "focus";
  setWorkspaceMode(next);
  return next;
}

/**
 * Subscribe to mode changes.
 * @param {function("standard" | "focus"): void} fn
 * @returns {function(): void} Unsubscribe
 */
function subscribe(fn) {
  listeners.push(fn);
  return function unsubscribe() {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) {
      listeners.splice(idx, 1);
    }
  };
}

/**
 * Remove workspace mode from localStorage (for Delete All Local Data).
 * Does not change in-memory state; caller should reload or setWorkspaceMode("standard").
 */
function clearWorkspaceModeFromStorage() {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(WORKSPACE_MODE_STORAGE_KEY);
  } catch (e) {
    // Ignore.
  }
}

/**
 * Initialize store from localStorage. Call once at boot.
 */
function initWorkspaceFocusStore() {
  workspaceMode = loadFromStorage();
}

// Export for tests and renderer
export {
  WORKSPACE_MODE_STORAGE_KEY,
  getWorkspaceMode,
  setWorkspaceMode,
  toggleWorkspaceMode,
  subscribe,
  clearWorkspaceModeFromStorage,
  initWorkspaceFocusStore,
};
