"use strict";

// ===============================================================
// WHY: Keep popout preload wiring testable without Electron imports.
// HOW: Accept bridge dependencies as injected parameters.
// ===============================================================

const registerBenefitsPopoutBridge = ({ contextBridge, ipcRenderer }) => {
  // ===============================================================
  // WHY: The popout renderer needs a narrow IPC bridge only.
  // HOW: Expose intent-only helpers without direct Electron access.
  // ===============================================================
  ipcRenderer.send("benefits-popout-preload-ready");

  contextBridge.exposeInMainWorld("benefitsPopout", {
    onInfo(callback) {
      if (typeof callback !== "function") {
        return;
      }
      ipcRenderer.on("benefits-popout-info", (_event, payload) => {
        callback(payload);
      });
    },
    close() {
      ipcRenderer.send("benefits-popout-close");
    },
    requestInfo() {
      ipcRenderer.send("benefits-popout-request-info");
    },
    // ===============================================================
    // WHY: Popouts must open links externally without direct shell access.
    // HOW: Send an intent-only IPC message to the main process.
    // ===============================================================
    openExternal(url) {
      ipcRenderer.send("benefits-popout-open-external", { url });
    },
  });
};

module.exports = { registerBenefitsPopoutBridge };
