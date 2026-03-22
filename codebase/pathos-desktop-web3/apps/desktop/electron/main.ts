/**
 * ============================================================================
 * PATHOS DESKTOP -- Electron Main Process
 * ============================================================================
 *
 * Clean Electron shell for the PathOS desktop app. Loads the Vite dev server
 * in development and the built renderer in production.
 *
 * TRUST BOUNDARY:
 * - No BrowserView, no USAJOBS embedding, no credential capture.
 * - The default desktop experience uses the shared AppShell + screens.
 * - Guided Apply Mode opens USAJOBS in the user's external browser.
 * ============================================================================
 */

import path from 'node:path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';

const IS_DEV = !app.isPackaged;
const DEV_SERVER_URL = process.env.PATHOS_DESKTOP_DEV_URL || 'http://localhost:5173';

/**
 * Renderer dist path. Vite builds to apps/desktop/dist/renderer.
 * In packaged builds, resources are relative to app.getAppPath().
 */
const RENDERER_DIR = path.join(app.getAppPath(), 'dist', 'renderer');
const RENDERER_INDEX = path.join(RENDERER_DIR, 'index.html');

let mainWindow: BrowserWindow | null = null;

function log(msg: string, ...args: unknown[]) {
  console.log(`[pathos-desktop] ${msg}`, ...args);
}

function createMainWindow(): BrowserWindow {
  log('Creating main window');

  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0b0f14',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      // --- Security baseline (all enforced) ---
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // In dev, preload.cjs is at electron/preload.cjs (sibling of main.ts source)
      // In prod (built), it should be copied to dist/electron/preload.cjs
      preload: IS_DEV
        ? path.join(app.getAppPath(), 'electron', 'preload.cjs')
        : path.join(__dirname, 'preload.cjs'),
    },
  });

  // --- Trust boundary: open external links in system browser, block all others ---
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      log('Opening external URL:', url);
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Prevent navigation away from the app (blocks phishing/redirect attacks)
  window.webContents.on('will-navigate', (event, url) => {
    // In dev, allow navigating to the Vite dev server
    if (IS_DEV && url.startsWith(DEV_SERVER_URL)) return;
    // In prod, allow file:// for local renderer
    if (!IS_DEV && url.startsWith('file://')) return;
    log('Blocked navigation to:', url);
    event.preventDefault();
  });

  // Log navigation failures
  window.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log('did-fail-load', { code, desc, url });
  });

  if (IS_DEV) {
    log('Loading dev server:', DEV_SERVER_URL);
    window.loadURL(DEV_SERVER_URL);
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    log('Loading production build:', RENDERER_INDEX);
    window.loadFile(RENDERER_INDEX);
  }

  window.on('closed', () => {
    mainWindow = null;
    log('Main window closed');
  });

  return window;
}

function registerIpcHandlers() {
  ipcMain.handle('pathos:ping', () => ({
    ok: true,
    ts: Date.now(),
    runtime: 'electron',
  }));

  ipcMain.handle('pathos:app-info', () => ({
    appName: app.getName(),
    appVersion: app.getVersion(),
    isPackaged: app.isPackaged,
  }));

  // Open a URL in the user's external browser (for Guided Apply)
  ipcMain.handle('pathos:open-external', (_event, url: string) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url);
      return { ok: true };
    }
    return { ok: false, message: 'Invalid URL' };
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(() => {
  log('App ready (dev=%s)', IS_DEV);
  registerIpcHandlers();
  mainWindow = createMainWindow();
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    log('Activate: creating new window');
    mainWindow = createMainWindow();
  }
});
