/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * ============================================================================
 * ELECTRON PRELOAD BRIDGE (Day 45 - Minimal)
 * ============================================================================
 *
 * WHY THIS FILE EXISTS:
 * - Electron loads preload scripts as plain Node CommonJS by default.
 * - This spike avoids TypeScript preloads because Electron does NOT transpile
 *   them, and we want a reliable, zero-build bridge for the renderer.
 *
 * TRUST BOUNDARY (TEACHING NOTE):
 * - We expose ONLY two explicit IPC methods.
 * - No DOM access, no credential capture, no generic IPC.
 * - Renderer code can request actions, but the main process owns execution.
 * ============================================================================
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose the minimal surface area required for the Day 45 spike.
 * The renderer cannot access Node APIs directly, only these safe commands.
 */
contextBridge.exposeInMainWorld('pathosDesktop', {
  ping: function () {
    return ipcRenderer.invoke('pathos:ping');
  },
  loadUsajobs: function () {
    return ipcRenderer.invoke('pathos:load-usajobs');
  },
  captureUsajobsScreenshot: function () {
    return ipcRenderer.invoke('pathos:capture-usajobs-screenshot');
  },
});
