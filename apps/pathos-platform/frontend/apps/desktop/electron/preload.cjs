/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * ============================================================================
 * PATHOS DESKTOP – Preload Bridge
 * ============================================================================
 *
 * Minimal IPC bridge for the desktop renderer. Exposes only the exact
 * actions needed by the shared UI.
 *
 * TRUST BOUNDARY:
 * - No DOM access to external sites.
 * - No credential capture.
 * - External URLs open in the system browser.
 * ============================================================================
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pathosDesktop', {
  ping: function () {
    return ipcRenderer.invoke('pathos:ping');
  },
  getAppInfo: function () {
    return ipcRenderer.invoke('pathos:app-info');
  },
  openExternal: function (url) {
    return ipcRenderer.invoke('pathos:open-external', url);
  },
});
