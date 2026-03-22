/**
 * ============================================================================
 * ELECTRON PRELOAD (Day 45)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Provide a minimal, explicit IPC bridge for the PathOS desktop shell.
 *
 * WHY THIS FILE EXISTS:
 * - We keep `contextIsolation: true` and `nodeIntegration: false`.
 * - The renderer must NOT have full Node access.
 * - This preload exposes only the exact actions we need for the spike.
 *
 * TRUST BOUNDARY:
 * - No DOM access to USAJOBS.
 * - No credential capture.
 * - Only explicit commands to show/clear/capture BrowserView pixels.
 * ============================================================================
 */

import { contextBridge, ipcRenderer } from 'electron';

export interface UsaJobsScreenshotResult {
  /**
   * True when a screenshot was captured.
   */
  ok: boolean;
  /**
   * Base64 data URL (PNG). Null if capture failed.
   */
  dataUrl: string | null;
  /**
   * ISO timestamp of capture. Null if capture failed.
   */
  capturedAt: string | null;
  /**
   * Human-readable error, if any.
   */
  errorMessage?: string;
}

export interface AppInfoResult {
  /**
   * Static info about the desktop shell.
   */
  appName: string;
  appVersion: string;
}

/**
 * Expose the minimum surface needed for the renderer.
 * No generic IPC channel is exposed.
 */
contextBridge.exposeInMainWorld('pathosDesktop', {
  loadUsaJobs: function () {
    return ipcRenderer.invoke('pathos-desktop:load-usajobs');
  },
  clearUsaJobs: function () {
    return ipcRenderer.invoke('pathos-desktop:clear-usajobs');
  },
  captureUsaJobsScreenshot: function (): Promise<UsaJobsScreenshotResult> {
    return ipcRenderer.invoke('pathos-desktop:capture-usajobs');
  },
  getAppInfo: function (): Promise<AppInfoResult> {
    return ipcRenderer.invoke('pathos-desktop:app-info');
  },
});
