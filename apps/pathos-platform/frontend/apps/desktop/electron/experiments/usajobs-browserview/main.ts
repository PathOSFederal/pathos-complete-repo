/**
 * ============================================================================
 * ELECTRON MAIN PROCESS (Day 45)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Boot the Electron desktop shell, host the PathOS Next.js UI, and render
 * USAJOBS in a BrowserView that is sized to a reserved on-screen region.
 *
 * WHY THIS FILE EXISTS:
 * - We need a native desktop shell to prove the Guided USAJOBS vision.
 * - BrowserView lets us render USAJOBS without iframes or DOM access.
 *
 * TRUST BOUNDARY:
 * - No DOM scraping or script injection.
 * - No credential capture.
 * - We only load the USAJOBS URL and optionally capture pixels for preview.
 * ============================================================================
 */

import path from 'node:path';
import { app, BrowserWindow, BrowserView, ipcMain } from 'electron';
import { fileURLToPath } from "node:url";
// Teaching note: Electron's Node ESM loader resolves exact filenames.
// We include the explicit `.ts` extension so the runtime can find the module
// when running the Electron main process in dev mode.
import { buildDesktopShellLayout } from '../lib/desktop/desktop-shell-layout.ts';
import type { DesktopShellBounds } from '../lib/desktop/desktop-shell-layout.ts';

// Teaching note: ESM modules do not provide __dirname, so we derive it from
// import.meta.url to keep preload resolution stable across environments.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RIGHT_PANEL_WIDTH = 420;
const TOP_BAR_HEIGHT = 64;
const USAJOBS_URL = 'https://www.usajobs.gov/';

let mainWindow: BrowserWindow | null = null;
let usaJobsView: BrowserView | null = null;
let usaJobsVisible = false;

/**
 * Resolve the renderer URL for the PathOS UI.
 * In this spike we default to the local Next.js dev server.
 */
function resolveRendererUrl(): string {
  const overrideUrl = process.env.PATHOS_DESKTOP_URL;
  if (overrideUrl && overrideUrl.length > 0) {
    return overrideUrl;
  }

  return 'http://localhost:3000/desktop/usajobs-guided';
}

/**
 * Create the main application window with safe defaults.
 */
function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0b0f14',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  window.webContents.setWindowOpenHandler(function () {
    return { action: 'deny' };
  });

  window.loadURL(resolveRendererUrl());

  return window;
}

/**
 * Create the USAJOBS BrowserView if it does not exist yet.
 */
function ensureUsaJobsView(): BrowserView {
  if (usaJobsView) {
    return usaJobsView;
  }

  usaJobsView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  usaJobsView.webContents.setWindowOpenHandler(function () {
    return { action: 'deny' };
  });

  return usaJobsView;
}

/**
 * Apply the hard-coded layout so the BrowserView matches the UI placeholder.
 */
function applyBrowserViewLayout(window: BrowserWindow, view: BrowserView): DesktopShellBounds {
  const bounds = window.getBounds();
  const layout = buildDesktopShellLayout({
    windowWidth: bounds.width,
    windowHeight: bounds.height,
    rightPanelWidth: RIGHT_PANEL_WIDTH,
    topBarHeight: TOP_BAR_HEIGHT,
  });

  view.setBounds(layout.browserViewBounds);
  view.setAutoResize({
    width: false,
    height: false,
  });

  return layout.browserViewBounds;
}

/**
 * Show the BrowserView inside the reserved region.
 */
async function showUsaJobsView(window: BrowserWindow): Promise<DesktopShellBounds> {
  const view = ensureUsaJobsView();

  window.setBrowserView(view);
  const browserViewBounds = applyBrowserViewLayout(window, view);
  usaJobsVisible = true;

  if (view.webContents.getURL() !== USAJOBS_URL) {
    await view.webContents.loadURL(USAJOBS_URL);
  }

  return browserViewBounds;
}

/**
 * Hide the BrowserView and clear its contents.
 */
async function clearUsaJobsView(window: BrowserWindow) {
  if (!usaJobsView) {
    usaJobsVisible = false;
    return;
  }

  await usaJobsView.webContents.loadURL('about:blank');
  window.setBrowserView(null);
  usaJobsVisible = false;
}

/**
 * Capture a pixel-only screenshot of the BrowserView.
 */
async function captureUsaJobsView(): Promise<{
  ok: boolean;
  dataUrl: string | null;
  capturedAt: string | null;
  errorMessage?: string;
}> {
  if (!usaJobsView || !usaJobsVisible) {
    return {
      ok: false,
      dataUrl: null,
      capturedAt: null,
      errorMessage: 'USAJOBS view is not active yet.',
    };
  }

  const image = await usaJobsView.webContents.capturePage();
  return {
    ok: true,
    dataUrl: image.toDataURL(),
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Register IPC handlers for the renderer.
 */
function registerIpcHandlers() {
  ipcMain.handle('pathos:ping', function () {
    return { ok: true, ts: Date.now() };
  });

  ipcMain.handle('pathos:load-usajobs', async function () {
    console.log('[pathos] load-usajobs invoked');
    if (!mainWindow) {
      return { ok: false, message: 'Main window not ready.' };
    }

    const browserViewBounds = await showUsaJobsView(mainWindow);
    console.log('[pathos] BrowserView attached', browserViewBounds);
    return { ok: true, message: 'USAJOBS loaded in BrowserView.' };
  });

  ipcMain.handle('pathos:capture-usajobs-screenshot', async function () {
    if (!usaJobsView || !usaJobsVisible) {
      return {
        ok: false,
        dataUrl: null,
        capturedAt: null,
        errorMessage: 'USAJOBS view is not active yet.',
      };
    }

    const image = await usaJobsView.webContents.capturePage();
    const size = image.getSize();
    console.log('[pathos] screenshot captured', { width: size.width, height: size.height });
    return {
      ok: true,
      dataUrl: image.toDataURL(),
      capturedAt: new Date().toISOString(),
      width: size.width,
      height: size.height,
    };
  });

  ipcMain.handle('pathos-desktop:load-usajobs', async function () {
    if (!mainWindow) {
      return { ok: false, message: 'Main window not ready.' };
    }

    await showUsaJobsView(mainWindow);
    return { ok: true, message: 'USAJOBS loaded in BrowserView.' };
  });

  ipcMain.handle('pathos-desktop:clear-usajobs', async function () {
    if (!mainWindow) {
      return { ok: false, message: 'Main window not ready.' };
    }

    await clearUsaJobsView(mainWindow);
    return { ok: true, message: 'USAJOBS view cleared.' };
  });

  ipcMain.handle('pathos-desktop:capture-usajobs', async function () {
    return captureUsaJobsView();
  });

  ipcMain.handle('pathos-desktop:app-info', function () {
    return {
      appName: app.getName(),
      appVersion: app.getVersion(),
    };
  });
}

/**
 * Electron app lifecycle.
 */
app.whenReady().then(function () {
  mainWindow = createMainWindow();
  registerIpcHandlers();

  if (mainWindow) {
    mainWindow.on('resize', function () {
      if (!mainWindow || !usaJobsView || !usaJobsVisible) {
        return;
      }

      applyBrowserViewLayout(mainWindow, usaJobsView);
    });
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});
