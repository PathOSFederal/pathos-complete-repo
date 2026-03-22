"use strict";

const { contextBridge, ipcRenderer } = require("electron");

// ===============================================================
// WHY: Keep preload wiring testable without Electron imports.
// HOW: Accept bridge dependencies as injected parameters.
// ===============================================================
const registerWorkbenchBridge = ({ contextBridge, ipcRenderer }) => {
  // ===============================================================
  // WHY: This preload isolates renderer intent from Electron internals.
  // HOW: It exposes scoped IPC helpers that the UI can call safely.
  // ===============================================================

  // WHY: keep the bridge minimal and intent-only for user-initiated actions.
  // WHY: no DOM access or background automation; this is a thin UI toggle only.
  contextBridge.exposeInMainWorld("workbench", {
    setRailCollapsed: (collapsed) => {
      ipcRenderer.send("workbench:setRailCollapsed", Boolean(collapsed));
    },
    onRailCollapsedChanged: (callback) => {
      if (typeof callback !== "function") {
        return;
      }

      ipcRenderer.on("workbench:railCollapsedChanged", (_event, value) => {
        callback(Boolean(value));
      });
    },
  });

  // WHY: Layout changes must explicitly opt into bounds updates.
  // HOW: Send geometry to main so the BrowserView stays within the viewport.
  contextBridge.exposeInMainWorld("workbenchViewport", {
    setBounds(bounds) {
      ipcRenderer.send("workbench-viewport-update", bounds);
    },
    // WHY: Main process needs an explicit workspace signal for BrowserView gating.
    // HOW: Send the active workspace id so main can attach/detach correctly.
    setActiveWorkspace(value) {
      if (typeof value !== "string" || !value.trim()) {
        return;
      }
      ipcRenderer.send("workspace:set-active", value.trim());
    },
    setInsetTop(value) {
      if (typeof value !== "number") {
        return;
      }
      ipcRenderer.send("workbench-viewport-inset", { top: value });
    },
  });

  // WHY: Renderer must react to load failures without touching web contents.
  // HOW: Listen to main-process status broadcasts and notify the UI.
  contextBridge.exposeInMainWorld("usajobsStatus", {
    onStatus(callback) {
      if (typeof callback !== "function") {
        return;
      }
      ipcRenderer.on("usajobs-load-status", (_event, status) => {
        callback(status);
      });
    },
  });

  // WHY: Keep webview navigation control explicit and auditable from renderer.
  // HOW: Send intent-only IPC actions; main process owns navigation.
  contextBridge.exposeInMainWorld("usajobsControls", {
    goBack() {
      ipcRenderer.send("usajobs-nav", "back");
    },
    goForward() {
      ipcRenderer.send("usajobs-nav", "forward");
    },
    refresh() {
      ipcRenderer.send("usajobs-nav", "refresh");
    },
    goHome() {
      ipcRenderer.send("usajobs-nav", "home");
    },
    openExternal() {
      ipcRenderer.send("usajobs-nav", "open-external");
    },
    onNavigate(callback) {
      if (typeof callback !== "function") {
        return;
      }
      ipcRenderer.on("usajobs-navigate", (_event, payload) => {
        callback(payload);
      });
    },
    onLoadState(callback) {
      if (typeof callback !== "function") {
        return;
      }
      ipcRenderer.on("usajobs-load-state", (_event, payload) => {
        callback(payload);
      });
    },
  });

  // ===============================================================
  // WHY: BrowserView does not auto-resize when renderer CSS changes.
  // HOW: Let the renderer report measured bounds for the embedded tool.
  // ===============================================================
  contextBridge.exposeInMainWorld("benefitsToolViewport", {
    reportBounds(bounds) {
      ipcRenderer.send("benefits-tool-viewport-update", bounds);
    },
  });

  // ===============================================================
  // WHY: Renderer must open external tools without direct webContents access.
  // HOW: Send intent-only IPC so main owns the navigation lifecycle.
  // ===============================================================
  contextBridge.exposeInMainWorld("benefitsControls", {
    openTool(payload) {
      ipcRenderer.send("benefits-tool-open", payload);
    },
    onLoadState(callback) {
      if (typeof callback !== "function") {
        return;
      }
      ipcRenderer.on("benefits-load-state", (_event, payload) => {
        callback(payload);
      });
    },
  });

  contextBridge.exposeInMainWorld("benefitsPopout", {
    open(payload) {
      return ipcRenderer.invoke("benefits:openToolPopout", payload);
    },
    close() {
      return ipcRenderer.invoke("benefits:closeToolPopout");
    },
    sendGuidanceToAdvisor(payload) {
      ipcRenderer.send("benefits:sendGuidanceToAdvisor", payload);
    },
    onStateChange(callback) {
      if (typeof callback !== "function") {
        return;
      }
      ipcRenderer.on("benefits:popoutState", (_event, payload) => {
        callback(payload);
      });
    },
    onInfo(callback) {
      if (typeof callback !== "function") {
        return;
      }
      ipcRenderer.on("benefits-popout-info", (_event, payload) => {
        callback(payload);
      });
    },
  });

  // ===============================================================
  // WHY: The main window needs draft guidance from the popout window.
  // HOW: Expose a narrow read-only channel for draft message events.
  // ===============================================================
  contextBridge.exposeInMainWorld("pathadvisorDrafts", {
    onGuidanceDraft(callback) {
      if (typeof callback !== "function") {
        return;
      }
      ipcRenderer.on("pathadvisor:guidanceDraft", (_event, payload) => {
        callback(payload);
      });
    },
  });

  // ===============================================================
  // WHY: PathAdvisor windows must be managed without exposing Electron.
  // HOW: Provide intent-only IPC helpers for open/close/focus actions.
  // ===============================================================
  contextBridge.exposeInMainWorld("pathadvisorWindows", {
    openLiveAdvisorWindow() {
      return ipcRenderer.invoke("pathadvisor:openLiveAdvisorWindow");
    },
    openDecisionViewWindow() {
      return ipcRenderer.invoke("pathadvisor:openDecisionViewWindow");
    },
    closeLiveAdvisorWindow() {
      return ipcRenderer.invoke("pathadvisor:closeLiveAdvisorWindow");
    },
    closeDecisionViewWindow() {
      return ipcRenderer.invoke("pathadvisor:closeDecisionViewWindow");
    },
    focusWindow(type) {
      return ipcRenderer.invoke("pathadvisor:focusWindow", type);
    },
    getWindowStates() {
      return ipcRenderer.invoke("pathadvisor:getWindowStates");
    },
    requestDecisionOverlayOpen() {
      ipcRenderer.send("pathadvisor:decision-overlay-open");
    },
    onWindowState(callback) {
      if (typeof callback !== "function") {
        return;
      }
      ipcRenderer.on("pathadvisor:windowState", (_event, payload) => {
        callback(payload);
      });
    },
    onDecisionOverlayOpen(callback) {
      if (typeof callback !== "function") {
        return;
      }
      ipcRenderer.on("pathadvisor:decisionOverlayOpen", (_event, payload) => {
        callback(payload);
      });
    },
  });

  // ===============================================================
  // WHY: Only one PathAdvisor surface should stay interactive at a time.
  // HOW: Expose owner updates so renderers can hide/show their panels.
  // ===============================================================
  contextBridge.exposeInMainWorld("advisorOwner", {
    getOwner() {
      return ipcRenderer.invoke("advisor:getOwner");
    },
    setOwner(owner) {
      return ipcRenderer.invoke("advisor:setOwner", owner);
    },
    onOwnerChange(callback) {
      if (typeof callback !== "function") {
        return;
      }
      ipcRenderer.on("advisor:ownerChanged", (_event, payload) => {
        callback(payload);
      });
    },
  });

  // ===============================================================
  // WHY: Backend calls must stay in main so renderer never sees secrets.
  // HOW: Expose a minimal invoke-only API for explicitly allowed
  //      backend actions. This keeps the renderer bridge narrow and auditable.
  // ===============================================================
  contextBridge.exposeInMainWorld("pathosBackend", {
    health() {
      return ipcRenderer.invoke("backend:health");
    },
    desktopInfo() {
      return ipcRenderer.invoke("backend:desktopInfo");
    },
    auditRecent(limit) {
      return ipcRenderer.invoke("backend:auditRecent", limit);
    },
    threadRecent(limit) {
      return ipcRenderer.invoke("backend:threadRecent", limit);
    },
    searchJobs(payload) {
      return ipcRenderer.invoke("backend:jobsSearch", payload);
    },
  });

  // ===============================================================
  // WHY: Detached windows must share thread state without persistence.
  // HOW: Keep threads in main and sync via safe IPC handlers.
  // ===============================================================
  contextBridge.exposeInMainWorld("pathadvisorThreads", {
    getLiveThread() {
      return ipcRenderer.invoke("pathadvisor:getLiveThread");
    },
    updateLiveThread(thread) {
      return ipcRenderer.invoke("pathadvisor:updateLiveThread", thread);
    },
    getDecisionThread() {
      return ipcRenderer.invoke("pathadvisor:getDecisionThread");
    },
    updateDecisionThread(thread) {
      return ipcRenderer.invoke("pathadvisor:updateDecisionThread", thread);
    },
    onLiveThreadUpdated(callback) {
      if (typeof callback !== "function") {
        return;
      }
      ipcRenderer.on("pathadvisor:liveThreadUpdated", (_event, payload) => {
        callback(payload);
      });
    },
    onDecisionThreadUpdated(callback) {
      if (typeof callback !== "function") {
        return;
      }
      ipcRenderer.on("pathadvisor:decisionThreadUpdated", (_event, payload) => {
        callback(payload);
      });
    },
  });

  // ===============================================================
  // WHY: Alerts preview must sit above BrowserView content.
  // HOW: Use IPC to toggle a dedicated popover window.
  // ===============================================================
  contextBridge.exposeInMainWorld("alertsPopover", {
    toggle(payload) {
      ipcRenderer.send("alertsPopover:toggle", payload);
    },
    close() {
      ipcRenderer.send("alertsPopover:close");
    },
    viewAll() {
      ipcRenderer.send("alertsPopover:viewAll");
    },
    onOpenAlertCenter(callback) {
      if (typeof callback !== "function") {
        return;
      }
      ipcRenderer.on("alertsPopover:openAlertCenter", (_event, payload) => {
        callback(payload);
      });
    },
  });
};

// ===============================================================
// WHY: This preload isolates renderer intent from Electron internals.
// HOW: It exposes scoped IPC helpers that the UI can call safely.
// ===============================================================

// WHY: keep the bridge minimal and intent-only for user-initiated actions.
// WHY: no DOM access or background automation; this is a thin UI toggle only.
registerWorkbenchBridge({ contextBridge, ipcRenderer });
