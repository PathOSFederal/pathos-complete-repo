"use strict";

// ===============================================================
// WHY: Keep Electron imports isolated for test-friendly mocking.
// HOW: Export the Electron bridge dependencies from one module.
// ===============================================================
const { contextBridge, ipcRenderer } = require("electron");

module.exports = { contextBridge, ipcRenderer };
