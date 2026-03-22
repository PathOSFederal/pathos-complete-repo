"use strict";

const { contextBridge, ipcRenderer } = require("./electron-bridge");
const { registerBenefitsPopoutBridge } = require("./preload-benefits-bridge");

// ===============================================================
// WHY: The popout renderer needs a narrow IPC bridge only.
// HOW: Expose intent-only helpers without direct Electron access.
// ===============================================================
registerBenefitsPopoutBridge({ contextBridge, ipcRenderer });
