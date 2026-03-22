"use strict";

const fs = require("fs");
const path = require("path");
const {
  app,
  BrowserWindow,
  BrowserView,
  globalShortcut,
  ipcMain,
  Menu,
  screen,
  shell,
} = require("electron");
const {
  createLiveAdvisorThread,
  createDecisionThread,
  sanitizeLiveMessage,
  sanitizeLiveAdvisorThread,
  sanitizeDecisionThread,
  isValidAdvisorSurfaceOwner,
  isAllowedExternalUrl,
} = require("./main-helpers");
const { createBackendClient } = require("./backend-client");

// ===============================================================
// WHY: This file drives the Electron main process lifecycle.
// HOW: It builds windows, BrowserViews, and IPC bridges for renderer UI.
// ===============================================================

// WHY: Avoid cache lock conflicts in dev by using a dedicated user data dir.
const userDataSuffix = app.isPackaged
  ? "PathOS Desktop"
  : "PathOS Desktop Dev";
app.setPath("userData", path.join(app.getPath("appData"), userDataSuffix));
// WHY: Ensure cache path stays under our userData, avoiding locked defaults.
app.setPath("cache", path.join(app.getPath("userData"), "Cache"));
// WHY: Guard against GPU cache failures on locked disks.
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
app.commandLine.appendSwitch("disable-gpu-cache");
app.commandLine.appendSwitch(
  "disk-cache-dir",
  path.join(app.getPath("userData"), "Cache")
);

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception in main process:", error);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection in main process:", reason);
});
let HOME_URL = "https://www.usajobs.gov/";
let handleUsaJobsNavigation = (_action, _contents, _shell) => {};
try {
  const navPath = path.join(__dirname, "usajobs-navigation.js");
  const navModule = require(navPath);
  if (navModule && typeof navModule.HOME_URL === "string") {
    HOME_URL = navModule.HOME_URL;
  }
  if (navModule && typeof navModule.handleUsaJobsNavigation === "function") {
    handleUsaJobsNavigation = navModule.handleUsaJobsNavigation;
  }
} catch (error) {
  // WHY: Allow the app shell to boot even if the helper module is missing.
  console.error("Failed to load usajobs-navigation module:", error);
}

const MIN_WINDOW_WIDTH = 1100;
const MIN_WINDOW_HEIGHT = 720;
const DEFAULT_WINDOW_WIDTH = 1280;
const DEFAULT_WINDOW_HEIGHT = 840;
const MIN_VIEWPORT_DIMENSION = 100;
const ALERTS_POPOVER_WIDTH = 392;
const ALERTS_POPOVER_HEIGHT = 360;
const ALERTS_POPOVER_PADDING = 10;
const BENEFITS_BROWSER_VIEW_ENABLED = false;
const BENEFITS_POPOUT_WINDOW_WIDTH = 1200;
const BENEFITS_POPOUT_WINDOW_HEIGHT = 800;
const BENEFITS_POPOUT_WINDOW_MIN_WIDTH = 960;
const BENEFITS_POPOUT_WINDOW_MIN_HEIGHT = 640;
const BENEFITS_POPOUT_WINDOW_TITLE = "PathOS – Benefits Tool";

const resolvePreloadPath = (filename) => {
  // app.getAppPath() points to the packaged app root (often inside app.asar)
  // __dirname varies depending on bundling/layout
  const candidateA = path.join(__dirname, filename);
  const candidateB = path.join(app.getAppPath(), filename);
  const candidateC = path.join(process.resourcesPath, filename);
  if (fs.existsSync(candidateA)) return candidateA;
  if (fs.existsSync(candidateB)) return candidateB;
  if (fs.existsSync(candidateC)) return candidateC;
  return candidateA; // fallback for logging
};

const getDefaultWindowBounds = () => {
  const display = screen.getPrimaryDisplay();
  const area = display ? display.workArea : null;
  const width = area && typeof area.width === "number" ? area.width : 0;
  const height = area && typeof area.height === "number" ? area.height : 0;
  const x = area && typeof area.x === "number" ? area.x : 0;
  const y = area && typeof area.y === "number" ? area.y : 0;

  const targetWidth = Math.max(
    MIN_WINDOW_WIDTH,
    Math.min(DEFAULT_WINDOW_WIDTH, width)
  );
  const targetHeight = Math.max(
    MIN_WINDOW_HEIGHT,
    Math.min(DEFAULT_WINDOW_HEIGHT, height)
  );

  return {
    width: targetWidth,
    height: targetHeight,
    x: Math.round(x + (width - targetWidth) / 2),
    y: Math.round(y + (height - targetHeight) / 2),
  };
};

const isBoundsVisible = (bounds) =>
  screen.getAllDisplays().some((display) => {
    const area = display.workArea;
    const xOverlap = Math.max(
      0,
      Math.min(bounds.x + bounds.width, area.x + area.width) -
        Math.max(bounds.x, area.x)
    );
    const yOverlap = Math.max(
      0,
      Math.min(bounds.y + bounds.height, area.y + area.height) -
        Math.max(bounds.y, area.y)
    );

    return xOverlap > 80 && yOverlap > 80;
  });

const getWindowStatePath = () =>
  path.join(app.getPath("userData"), "window-state.json");

const readWindowState = () => {
  try {
    const raw = fs.readFileSync(getWindowStatePath(), "utf8");
    const parsed = JSON.parse(raw);
    const bounds = parsed ? parsed.bounds : null;
    const isMaximized = Boolean(parsed && parsed.isMaximized);

    if (
      !bounds ||
      typeof bounds.width !== "number" ||
      typeof bounds.height !== "number" ||
      typeof bounds.x !== "number" ||
      typeof bounds.y !== "number"
    ) {
      return null;
    }

    if (
      bounds.width < MIN_WINDOW_WIDTH ||
      bounds.height < MIN_WINDOW_HEIGHT ||
      !isBoundsVisible(bounds)
    ) {
      return null;
    }

    return { bounds, isMaximized };
  } catch (error) {
    return null;
  }
};

const saveWindowState = (win) => {
  if (!win || win.isDestroyed()) {
    return;
  }

  const isMaximized = win.isMaximized();
  const bounds = isMaximized ? win.getNormalBounds() : win.getBounds();

  try {
    fs.writeFileSync(
      getWindowStatePath(),
      JSON.stringify({ bounds, isMaximized }, null, 2),
      "utf8"
    );
  } catch (error) {
    // Best-effort persistence only.
  }
};

let mainWindow = null;
let usaJobsView = null;
let benefitsView = null;
let latestViewportBounds = null;
let lastGoodViewportBounds = null;
let lastAppliedViewportBounds = null;
let lastBenefitsViewportBounds = null;
let lastAppliedBenefitsBounds = null;
let viewportInsetTop = 0;
let usaJobsViewAttached = false;
let usaJobsInitialLoadStarted = false;
let benefitsViewAttached = false;
let activeWorkspace = "explore";
let liveAdvisorWindow = null;
let decisionViewWindow = null;
let alertsPopoverWindow = null;
let benefitsPopoutWindow = null;
let benefitsPopoutInfo = null;
let advisorSurfaceOwner = "main";

const shouldEnableDevToolsShortcuts =
  !app.isPackaged || process.env.PATHOS_DEVTOOLS === "1";

const backendClient = createBackendClient({ env: process.env });

const toBackendFailureResult = (error) => {
  const message =
    error && typeof error.message === "string" && error.message.trim()
      ? error.message.trim()
      : "Backend request failed";
  return {
    ok: false,
    error: {
      status: 0,
      code: "BACKEND_CLIENT_ERROR",
      message,
      requestId: "",
    },
  };
};

const invokeBackend = (handler) => {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return toBackendFailureResult(error);
    }
  };
};


const LIVE_ADVISOR_WINDOW_TITLE = "PathOS – Live Advisor";
const DECISION_VIEW_WINDOW_TITLE = "PathOS – Decision View";

let liveAdvisorThread = createLiveAdvisorThread();
let decisionThread = createDecisionThread();

const isWindowAvailable = (win) => Boolean(win && !win.isDestroyed());

const getWindowStateSnapshot = () => ({
  liveAdvisorOpen: isWindowAvailable(liveAdvisorWindow),
  decisionViewOpen: isWindowAvailable(decisionViewWindow),
});

const broadcastWindowState = () => {
  const payload = getWindowStateSnapshot();
  BrowserWindow.getAllWindows().forEach((win) => {
    if (isWindowAvailable(win)) {
      win.webContents.send("pathadvisor:windowState", payload);
    }
  });
};

const broadcastLiveThread = () => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (isWindowAvailable(win)) {
      win.webContents.send("pathadvisor:liveThreadUpdated", liveAdvisorThread);
    }
  });
};

const broadcastDecisionThread = () => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (isWindowAvailable(win)) {
      win.webContents.send("pathadvisor:decisionThreadUpdated", decisionThread);
    }
  });
};

const createLiveAdvisorWindow = () => {
  if (isWindowAvailable(liveAdvisorWindow)) {
    liveAdvisorWindow.focus();
    return liveAdvisorWindow;
  }
  // ===============================================================
  // WHY: Detaching must not mutate or reload the Workbench webview.
  // HOW: Open a separate BrowserWindow, optionally parented to main.
  // ===============================================================
  const windowOptions = {
    width: 420,
    height: 640,
    minWidth: 360,
    minHeight: 520,
    autoHideMenuBar: true,
    backgroundColor: "#0f1115",
    title: LIVE_ADVISOR_WINDOW_TITLE,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  };
  if (isWindowAvailable(mainWindow)) {
    windowOptions.parent = mainWindow;
  }
  const win = new BrowserWindow(windowOptions);
  liveAdvisorWindow = win;
  win.on("closed", () => {
    liveAdvisorWindow = null;
    broadcastWindowState();
  });
  if (fs.existsSync(RENDERER_ENTRY_FILE)) {
    win.loadFile(RENDERER_ENTRY_FILE, { query: { mode: "live" } });
  } else {
    win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        getRendererFallbackHtml()
      )}`
    );
  }
  broadcastWindowState();
  return win;
};

const createDecisionViewWindow = () => {
  if (isWindowAvailable(decisionViewWindow)) {
    decisionViewWindow.focus();
    return decisionViewWindow;
  }
  // ===============================================================
  // WHY: Detached decision view should not interfere with Workbench.
  // HOW: Create a separate BrowserWindow tied to main when present.
  // ===============================================================
  const windowOptions = {
    width: 960,
    height: 720,
    minWidth: 720,
    minHeight: 560,
    autoHideMenuBar: true,
    backgroundColor: "#0f1115",
    title: DECISION_VIEW_WINDOW_TITLE,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  };
  if (isWindowAvailable(mainWindow)) {
    windowOptions.parent = mainWindow;
  }
  const win = new BrowserWindow(windowOptions);
  decisionViewWindow = win;
  win.on("closed", () => {
    decisionViewWindow = null;
    broadcastWindowState();
  });
  if (fs.existsSync(RENDERER_ENTRY_FILE)) {
    win.loadFile(RENDERER_ENTRY_FILE, { query: { mode: "decision" } });
  } else {
    win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        getRendererFallbackHtml()
      )}`
    );
  }
  broadcastWindowState();
  return win;
};

const closeAlertsPopover = () => {
  if (isWindowAvailable(alertsPopoverWindow)) {
    alertsPopoverWindow.close();
  }
};

const getPopoverDisplayBounds = (anchorBounds) => {
  const defaultDisplay = screen.getPrimaryDisplay();
  if (!anchorBounds) {
    return defaultDisplay ? defaultDisplay.workArea : null;
  }
  const display = screen.getDisplayMatching(anchorBounds);
  return display ? display.workArea : defaultDisplay.workArea;
};

const positionAlertsPopover = (payload) => {
  if (!alertsPopoverWindow || !mainWindow) {
    return;
  }
  const rect = payload && payload.rect ? payload.rect : null;
  if (
    !rect ||
    typeof rect.left !== "number" ||
    typeof rect.bottom !== "number" ||
    typeof rect.width !== "number" ||
    typeof rect.height !== "number"
  ) {
    return;
  }
  const contentBounds = mainWindow.getContentBounds();
  const anchorBounds = {
    x: Math.round(contentBounds.x + rect.left),
    y: Math.round(contentBounds.y + rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
  const workArea = getPopoverDisplayBounds(anchorBounds);
  if (!workArea) {
    return;
  }
  const targetX = Math.round(contentBounds.x + rect.left);
  const targetY = Math.round(contentBounds.y + rect.bottom + 8);
  const maxX =
    workArea.x + workArea.width - ALERTS_POPOVER_WIDTH - ALERTS_POPOVER_PADDING;
  const maxY =
    workArea.y + workArea.height - ALERTS_POPOVER_HEIGHT - ALERTS_POPOVER_PADDING;
  const x = Math.min(
    Math.max(targetX, workArea.x + ALERTS_POPOVER_PADDING),
    maxX
  );
  const y = Math.min(
    Math.max(targetY, workArea.y + ALERTS_POPOVER_PADDING),
    maxY
  );
  alertsPopoverWindow.setBounds({
    x: Math.round(x),
    y: Math.round(y),
    width: ALERTS_POPOVER_WIDTH,
    height: ALERTS_POPOVER_HEIGHT,
  });
};

const createAlertsPopoverWindow = () => {
  if (isWindowAvailable(alertsPopoverWindow)) {
    return alertsPopoverWindow;
  }
  const windowOptions = {
    width: ALERTS_POPOVER_WIDTH,
    height: ALERTS_POPOVER_HEIGHT,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    movable: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#0f1115",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  };
  if (isWindowAvailable(mainWindow)) {
    windowOptions.parent = mainWindow;
  }
  const win = new BrowserWindow(windowOptions);
  alertsPopoverWindow = win;
  win.on("blur", () => {
    closeAlertsPopover();
  });
  win.on("closed", () => {
    alertsPopoverWindow = null;
  });
  if (fs.existsSync(ALERTS_POPOVER_ENTRY_FILE)) {
    win.loadFile(ALERTS_POPOVER_ENTRY_FILE);
  } else {
    win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        "<!doctype html><title>Alerts</title>"
      )}`
    );
  }
  win.setAlwaysOnTop(true, "pop-up-menu");
  return win;
};

const toggleAlertsPopover = (payload) => {
  if (isWindowAvailable(alertsPopoverWindow)) {
    closeAlertsPopover();
    return;
  }
  const win = createAlertsPopoverWindow();
  if (!win) {
    return;
  }
  positionAlertsPopover(payload);
  win.show();
  win.focus();
};

// WHY: Centralize renderer notifications so BrowserView events stay consistent.
const sendToRenderer = (channel, payload) => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channel, payload);
};

const broadcastAdvisorSurfaceOwner = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send("advisor:ownerChanged", {
    owner: advisorSurfaceOwner,
  });
};

const setAdvisorSurfaceOwner = (nextOwner) => {
  if (!isValidAdvisorSurfaceOwner(nextOwner)) {
    return false;
  }
  if (advisorSurfaceOwner === nextOwner) {
    return false;
  }
  advisorSurfaceOwner = nextOwner;
  broadcastAdvisorSurfaceOwner();
  return true;
};

const sendBenefitsPopoutState = (isOpen) => {
  sendToRenderer("benefits:popoutState", { isOpen: Boolean(isOpen) });
};

const sendBenefitsPopoutInfo = (payload) => {
  benefitsPopoutInfo = payload;
  if (!benefitsPopoutWindow || benefitsPopoutWindow.isDestroyed()) {
    return;
  }
  const nextUrl = payload && typeof payload.url === "string" ? payload.url : "";
  console.info("[BenefitsPopout] sending payload URL:", nextUrl);
  benefitsPopoutWindow.webContents.send("benefits-popout-info", payload);
};

const ensureBenefitsPopoutWindow = () => {
  if (isWindowAvailable(benefitsPopoutWindow)) {
    benefitsPopoutWindow.show();
    benefitsPopoutWindow.focus();
    return benefitsPopoutWindow;
  }

  const preloadPath = resolvePreloadPath("preload-benefits-popout.js");
  console.info(
    "[BenefitsPopout] preload path:",
    preloadPath,
    "exists:",
    fs.existsSync(preloadPath)
  );
  benefitsPopoutWindow = new BrowserWindow({
    width: BENEFITS_POPOUT_WINDOW_WIDTH,
    height: BENEFITS_POPOUT_WINDOW_HEIGHT,
    minWidth: BENEFITS_POPOUT_WINDOW_MIN_WIDTH,
    minHeight: BENEFITS_POPOUT_WINDOW_MIN_HEIGHT,
    autoHideMenuBar: true,
    backgroundColor: "#0f1115",
    title: BENEFITS_POPOUT_WINDOW_TITLE,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
      devTools: true,
      // NOTE: Dedicated preload to keep the popout IPC scope minimal.
      preload: preloadPath,
    },
  });

  benefitsPopoutWindow.loadFile(
    path.join(__dirname, "renderer", "benefits-popout.html")
  );
  if (!app.isPackaged) {
    benefitsPopoutWindow.webContents.openDevTools({ mode: "detach" });
  }
  console.info("[BenefitsPopout] created", benefitsPopoutWindow.id);

  benefitsPopoutWindow.webContents.setWindowOpenHandler((details) => {
    if (details && isAllowedExternalUrl(details.url)) {
      shell.openExternal(details.url);
    }
    return { action: "deny" };
  });

  benefitsPopoutWindow.webContents.on("did-finish-load", () => {
    if (benefitsPopoutInfo) {
      sendBenefitsPopoutInfo(benefitsPopoutInfo);
    }
  });

  benefitsPopoutWindow.on("closed", () => {
    benefitsPopoutWindow = null;
    sendBenefitsPopoutState(false);
    setAdvisorSurfaceOwner("main");
  });

  return benefitsPopoutWindow;
};

const isGenericUsaJobsTitle = (rawTitle) => {
  if (typeof rawTitle !== "string") {
    return true;
  }
  const trimmed = rawTitle.trim();
  if (!trimmed) {
    return true;
  }
  const lower = trimmed.toLowerCase();
  if (lower === "usajobs" || lower === "usajobs.gov") {
    return true;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return true;
  }
  if (/usajobs\.gov\/job\/\d+/i.test(trimmed)) {
    return true;
  }
  if (/^usajobs\s*[\u2013-]\s*job announcement$/i.test(trimmed)) {
    return true;
  }
  if (/^usajobs\s*[\u2013-]\s*search/i.test(trimmed)) {
    return true;
  }
  if (/^usajobs\s*[\u2013-]\s*home/i.test(trimmed)) {
    return true;
  }
  return false;
};

// ===============================================================
// WHY: Title extraction should only run on true job postings.
// HOW: Look for the stable /job/{id} segment in the URL.
// ===============================================================
const isUsaJobsJobPostingUrl = (rawUrl) => {
  if (typeof rawUrl !== "string") {
    return false;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return false;
  }
  return /\/job\/\d+/i.test(trimmed);
};

// ===============================================================
// WHY: USAJOBS pages expose titles in multiple DOM structures.
// HOW: Query a short selector list in the BrowserView safely.
// ===============================================================
const USAJOBS_TITLE_SELECTORS = [
  ".usajobs-job-preview__title",
  ".usajobs-job-header__title",
  "[data-automation='jobTitle']",
  ".usajobs-job-info__title",
  ".usajobs-job-title",
  "h1",
];

// ===============================================================
// WHY: Agency context helps build a usable fallback title.
// HOW: Query common agency selectors without leaving the page.
// ===============================================================
const USAJOBS_AGENCY_SELECTORS = [
  "[data-automation='agencyName']",
  ".usajobs-job-organizations__agency",
  ".usajobs-job-organizations__org-name",
  ".usajobs-job-header__agency",
];

// ===============================================================
// WHY: BrowserView needs a safe, serializable script to run.
// HOW: Return title/agency/docTitle in a plain object.
// ===============================================================
const USAJOBS_CONTEXT_SCRIPT = `(function () {
  const titleSelectors = ${JSON.stringify(USAJOBS_TITLE_SELECTORS)};
  const agencySelectors = ${JSON.stringify(USAJOBS_AGENCY_SELECTORS)};
  const findText = function (selectors) {
    if (!Array.isArray(selectors)) {
      return "";
    }
    for (let i = 0; i < selectors.length; i += 1) {
      const selector = selectors[i];
      if (typeof selector !== "string" || !selector) {
        continue;
      }
      const node = document.querySelector(selector);
      if (node && typeof node.textContent === "string") {
        const text = node.textContent.trim();
        if (text) {
          return text;
        }
      }
    }
    return "";
  };
  const title = findText(titleSelectors);
  const agency = findText(agencySelectors);
  const docTitle =
    typeof document !== "undefined" && typeof document.title === "string"
      ? document.title.trim()
      : "";
  return { title: title, agency: agency, docTitle: docTitle };
})()`;

const sendNavigationState = () => {
  if (!usaJobsView) {
    return;
  }

  const contents = usaJobsView.webContents;
  const payload = {
    url: contents.getURL(),
    title: contents.getTitle(),
    canGoBack: contents.canGoBack(),
    canGoForward: contents.canGoForward(),
  };
  sendToRenderer("usajobs-navigate", payload);

  if (!isUsaJobsJobPostingUrl(payload.url)) {
    return;
  }
  if (typeof contents.executeJavaScript !== "function") {
    return;
  }
  contents
    .executeJavaScript(USAJOBS_CONTEXT_SCRIPT, true)
    .then((context) => {
      if (!context || typeof context !== "object") {
        return;
      }
      const pageTitle =
        typeof context.title === "string" ? context.title.trim() : "";
      const agency =
        typeof context.agency === "string" ? context.agency.trim() : "";
      const docTitle =
        typeof context.docTitle === "string" ? context.docTitle.trim() : "";

      // ===============================================================
      // WHY: Prefer in-page titles over document title metadata.
      // HOW: Fall back only when the candidate title is generic.
      // ===============================================================
      let nextTitle = "";
      if (pageTitle && !isGenericUsaJobsTitle(pageTitle)) {
        nextTitle = pageTitle;
      } else if (docTitle && !isGenericUsaJobsTitle(docTitle)) {
        nextTitle = docTitle;
      } else if (payload.title && !isGenericUsaJobsTitle(payload.title)) {
        nextTitle = payload.title;
      }

      const nextPayload = Object.assign({}, payload);
      let shouldSend = false;
      if (nextTitle && nextTitle !== (payload.title || "")) {
        nextPayload.title = nextTitle;
        shouldSend = true;
      }
      if (agency && agency !== payload.agency) {
        nextPayload.agency = agency;
        shouldSend = true;
      }
      if (shouldSend) {
        sendToRenderer("usajobs-navigate", nextPayload);
      }
    })
    .catch(() => {});
};

// WHY: Avoid stealing input before the workbench viewport is known.
// HOW: Keep the BrowserView at 0x0 until valid bounds arrive.
const setBrowserViewSafeBounds = () => {
  if (!usaJobsView) {
    return;
  }
  usaJobsView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
};

// ===============================================================
// WHY: Benefits BrowserView should also stay hidden until sized.
// HOW: Default to 0x0 bounds until a valid viewport arrives.
// ===============================================================
const setBenefitsViewSafeBounds = () => {
  if (!benefitsView) {
    return;
  }
  benefitsView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
};

// WHY: Protect the shell if the renderer never reports a viewport.
// HOW: Only accept bounds that are large enough to be a real workspace.
const getBoundedViewport = (viewport) => {
  if (!mainWindow || !viewport) {
    return null;
  }
  const [windowWidth, windowHeight] = mainWindow.getContentSize();
  const boundedX = Math.max(0, viewport.x);
  const boundedY = Math.max(0, viewport.y);
  const boundedWidth = Math.min(
    Math.max(0, viewport.width),
    Math.max(0, windowWidth - boundedX)
  );
  const boundedHeight = Math.min(
    Math.max(0, viewport.height),
    Math.max(0, windowHeight - boundedY)
  );

  if (
    boundedWidth < MIN_VIEWPORT_DIMENSION ||
    boundedHeight < MIN_VIEWPORT_DIMENSION
  ) {
    return null;
  }

  return {
    x: boundedX,
    y: boundedY,
    width: boundedWidth,
    height: boundedHeight,
  };
};

// WHY: Attach only after a verified viewport to prevent overlay regressions.
// HOW: Gate setBrowserView behind the first valid viewport update.
const attachUsaJobsViewIfNeeded = () => {
  if (!mainWindow || !usaJobsView || usaJobsViewAttached) {
    return;
  }
  mainWindow.addBrowserView(usaJobsView);
  usaJobsViewAttached = true;
};

// WHY: USAJOBS must fully detach outside the Explore workspace.
// HOW: Remove the BrowserView and reset its attached flag.
const detachUsaJobsViewIfNeeded = () => {
  if (!mainWindow || !usaJobsView || !usaJobsViewAttached) {
    return;
  }
  mainWindow.removeBrowserView(usaJobsView);
  usaJobsViewAttached = false;
};

// ===============================================================
// WHY: Benefits tools run in their own BrowserView for isolation.
// HOW: Attach once and keep it available for later tool loads.
// ===============================================================
const attachBenefitsViewIfNeeded = () => {
  if (!mainWindow || !benefitsView || benefitsViewAttached) {
    return;
  }
  mainWindow.addBrowserView(benefitsView);
  benefitsViewAttached = true;
};

// WHY: Avoid hidden loads before the workbench viewport is ready.
// HOW: Kick off the initial load exactly once after attach.
const ensureUsaJobsInitialLoad = () => {
  if (!usaJobsView || !usaJobsViewAttached) {
    return;
  }
  const contents = usaJobsView.webContents;
  if (contents.isLoading()) {
    return;
  }
  const currentUrl = contents.getURL();
  const hasUrl = Boolean(currentUrl && currentUrl !== "about:blank");
  if (!hasUrl) {
    // ===============================================================
    // WHY: Returning to Explore can leave the BrowserView detached/blank.
    // HOW: Restore the home URL when the view reports no current location.
    // ===============================================================
    console.info("[ExploreWebview] src missing; restoring to USAJOBS");
    usaJobsInitialLoadStarted = true;
    contents.loadURL(HOME_URL);
    return;
  }
  if (usaJobsInitialLoadStarted) {
    return;
  }
  // ===============================================================
  // WHY: Once a valid URL is present we can lock in the initial state.
  // HOW: Mark the initial load complete without forcing a reload.
  // ===============================================================
  usaJobsInitialLoadStarted = true;
};

// WHY: Provide extra diagnostics when USAJOBS fails to load.
// HOW: Capture attached state plus last-applied bounds for logging.
const getUsaJobsDiagnostics = () => ({
  attached: usaJobsViewAttached,
  bounds:
    lastAppliedViewportBounds ||
    (usaJobsView ? usaJobsView.getBounds() : null),
});

const applyViewportBounds = () => {
  if (!mainWindow || !usaJobsView) {
    return;
  }
  if (!usaJobsViewAttached || !lastGoodViewportBounds) {
    return;
  }
  const boundedViewport = getBoundedViewport(lastGoodViewportBounds);
  if (!boundedViewport) {
    return;
  }

  // WHY: Constrain USAJOBS to the workbench surface only.
  const safeInset = Math.max(0, Math.round(viewportInsetTop || 0));
  const maxInset = Math.max(0, boundedViewport.height - MIN_VIEWPORT_DIMENSION);
  const appliedInset = Math.min(safeInset, maxInset);
  const adjustedViewport = {
    x: boundedViewport.x,
    y: boundedViewport.y + appliedInset,
    width: boundedViewport.width,
    height: Math.max(0, boundedViewport.height - appliedInset),
  };

  usaJobsView.setBounds(adjustedViewport);
  lastAppliedViewportBounds = adjustedViewport;
};

// ===============================================================
// WHY: Benefits embeds need to stay within their calculator frame.
// HOW: Apply bounded viewport geometry or hide when invalid.
// ===============================================================
const applyBenefitsViewportBounds = () => {
  if (!mainWindow || !benefitsView) {
    return;
  }
  if (!benefitsViewAttached || !lastBenefitsViewportBounds) {
    return;
  }
  const boundedViewport = getBoundedViewport(lastBenefitsViewportBounds);
  if (!boundedViewport) {
    return;
  }
  benefitsView.setBounds(boundedViewport);
  lastAppliedBenefitsBounds = boundedViewport;
};

// ===============================================================
// WHY: Multiple BrowserViews need to respond to the same resize events.
// HOW: Fan out the resize handler to each viewport updater.
// ===============================================================
const applyAllViewportBounds = () => {
  applyViewportBounds();
  applyBenefitsViewportBounds();
};

const toggleDevToolsForContents = (contents) => {
  if (!contents) {
    return;
  }
  if (contents.isDevToolsOpened()) {
    contents.closeDevTools();
    return;
  }
  contents.openDevTools({ mode: "detach" });
};

// WHY: Some debugging flows need an explicit "open" path, not just toggle.
// HOW: Only open if devtools are closed so we don't collapse them.
const openDevToolsForContents = (contents) => {
  if (!contents || contents.isDevToolsOpened()) {
    return;
  }
  contents.openDevTools({ mode: "detach" });
};

// WHY: AutoHideMenuBar hides the menu UI, so we still need a menu for shortcuts.
// HOW: Provide a developer menu only in dev or with PATHOS_DEVTOOLS=1.
const registerDevToolsMenu = () => {
  if (!shouldEnableDevToolsShortcuts) {
    return;
  }
  const template = [
    {
      label: "Developer",
      submenu: [
        {
          label: "Toggle DevTools (Main Window)",
          accelerator: "Ctrl+Shift+I",
          click: () => {
            if (isWindowAvailable(mainWindow)) {
              toggleDevToolsForContents(mainWindow.webContents);
            }
          },
        },
        {
          label: "Toggle DevTools (USAJOBS View)",
          accelerator: "Ctrl+Shift+U",
          click: () => {
            if (usaJobsView) {
              toggleDevToolsForContents(usaJobsView.webContents);
            }
          },
        },
        {
          label: "Reload Main Window",
          accelerator: "Ctrl+R",
          click: () => {
            if (isWindowAvailable(mainWindow)) {
              mainWindow.webContents.reload();
            }
          },
        },
        {
          label: "Reload USAJOBS View",
          accelerator: "Ctrl+Shift+R",
          click: () => {
            if (usaJobsView) {
              usaJobsView.webContents.reload();
            }
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

const registerDevToolsShortcuts = () => {
  if (!shouldEnableDevToolsShortcuts) {
    return;
  }
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      toggleDevToolsForContents(mainWindow.webContents);
    }
  });
  globalShortcut.register("CommandOrControl+Shift+U", () => {
    if (usaJobsView) {
      toggleDevToolsForContents(usaJobsView.webContents);
    }
  });
};

// DO NOT load USAJOBS directly in BrowserWindow. It must only be loaded in the webview inside Workbench.
const RENDERER_ENTRY_FILE = path.join(__dirname, "renderer", "index.html");
const ALERTS_POPOVER_ENTRY_FILE = path.join(
  __dirname,
  "renderer",
  "alerts-popover.html"
);

const getRendererFallbackHtml = () => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>PathOS Desktop</title>
      <style>
        body {
          margin: 0;
          font-family: "Inter", "Segoe UI", system-ui, sans-serif;
          background: #05080f;
          color: #e8eefb;
          display: grid;
          place-items: center;
          height: 100vh;
        }
        .panel {
          max-width: 520px;
          padding: 24px;
          border-radius: 16px;
          background: #0e172b;
          border: 1px solid #1a2336;
          box-shadow: 0 18px 40px rgba(3, 6, 14, 0.7);
        }
        h1 {
          margin: 0 0 8px;
          font-size: 20px;
        }
        p {
          margin: 0;
          color: #a9b6cf;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="panel">
        <h1>Renderer not available</h1>
        <p>PathOS Desktop could not load the Workbench shell. Please restart the app.</p>
      </div>
    </body>
  </html>
`;

const createWindow = () => {
  const savedState = readWindowState();
  const defaultBounds = getDefaultWindowBounds();
  const startBounds =
    savedState && savedState.bounds ? savedState.bounds : defaultBounds;

  const win = new BrowserWindow({
    width: startBounds.width,
    height: startBounds.height,
    x: startBounds.x,
    y: startBounds.y,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    autoHideMenuBar: true,
    backgroundColor: "#0f1115",
    show: false,
    title: "PathOS Desktop",
    ...(process.platform === "darwin"
      ? {
          titleBarStyle: "hiddenInset",
          trafficLightPosition: { x: 16, y: 14 },
        }
      : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow = win;
  broadcastWindowState();

  win.once("ready-to-show", () => {
    if (savedState && savedState.isMaximized) {
      win.maximize();
    }
    win.show();
  });

  win.on("close", () => {
    saveWindowState(win);
  });
  win.on("closed", () => {
    closeAlertsPopover();
    mainWindow = null;
  });

  if (fs.existsSync(RENDERER_ENTRY_FILE)) {
    win.loadFile(RENDERER_ENTRY_FILE);
  } else {
    win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        getRendererFallbackHtml()
      )}`
    );
  }

  usaJobsView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  setBrowserViewSafeBounds();
  usaJobsView.webContents.on("did-start-loading", () => {
    sendToRenderer("usajobs-load-state", { state: "loading" });
  });
  usaJobsView.webContents.on("did-stop-loading", () => {
    sendToRenderer("usajobs-load-state", { state: "loaded" });
    sendNavigationState();
  });
  usaJobsView.webContents.on("did-navigate", () => {
    sendNavigationState();
  });
  usaJobsView.webContents.on("did-navigate-in-page", () => {
    sendNavigationState();
  });
  usaJobsView.webContents.on("page-title-updated", () => {
    sendNavigationState();
  });
  usaJobsView.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      const payload = {
        state: "failed",
        errorCode,
        errorDescription,
        validatedURL,
      };
      console.error("USAJOBS load failed:", {
        ...payload,
        diagnostics: getUsaJobsDiagnostics(),
      });
      sendToRenderer("usajobs-load-state", payload);
    }
  );
  usaJobsView.webContents.on("did-finish-load", () => {
    sendToRenderer("usajobs-load-state", { state: "loaded" });
    sendNavigationState();
  });

  if (BENEFITS_BROWSER_VIEW_ENABLED) {
    benefitsView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    setBenefitsViewSafeBounds();
    benefitsView.webContents.on("did-start-loading", () => {
      sendToRenderer("benefits-load-state", { state: "loading" });
    });
    benefitsView.webContents.on("did-stop-loading", () => {
      sendToRenderer("benefits-load-state", { state: "loaded" });
    });
    benefitsView.webContents.on(
      "did-fail-load",
      (_event, errorCode, errorDescription, validatedURL) => {
        const payload = {
          state: "failed",
          errorCode,
          errorDescription,
          validatedURL,
        };
        console.error("Benefits tool load failed:", payload);
        sendToRenderer("benefits-load-state", payload);
      }
    );
    benefitsView.webContents.on("did-finish-load", () => {
      sendToRenderer("benefits-load-state", { state: "loaded" });
    });
  } else {
    benefitsView = null;
  }

  applyAllViewportBounds();
  win.on("resize", applyAllViewportBounds);
};

app.whenReady().then(() => {
  createWindow();
  const benefitsPreloadPath = resolvePreloadPath("preload-benefits-popout.js");
  if (!fs.existsSync(benefitsPreloadPath)) {
    console.error(
      "[BenefitsPopout] preload-benefits-popout.js missing from packaged output."
    );
  }
  registerDevToolsMenu();
  registerDevToolsShortcuts();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// WHY: Main process must know the active workspace for BrowserView gating.
// HOW: Track the latest workspace selection from the renderer.
ipcMain.on("workspace:set-active", (_event, payload) => {
  if (typeof payload !== "string" || !payload.trim()) {
    return;
  }
  activeWorkspace = payload.trim();
  if (activeWorkspace !== "explore") {
    detachUsaJobsViewIfNeeded();
    if (usaJobsView) {
      usaJobsView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    }
  }
});

ipcMain.on("workbench-viewport-update", (_event, payload) => {
  if (
    !payload ||
    typeof payload.x !== "number" ||
    typeof payload.y !== "number" ||
    typeof payload.width !== "number" ||
    typeof payload.height !== "number"
  ) {
    return;
  }
  if (!mainWindow) {
    return;
  }
  latestViewportBounds = payload;
  const boundedViewport = getBoundedViewport(payload);
  if (!boundedViewport) {
    return;
  }
  if (activeWorkspace !== "explore") {
    detachUsaJobsViewIfNeeded();
    if (usaJobsView) {
      usaJobsView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    }
    return;
  }
  const isFirstViewport = !lastGoodViewportBounds;
  lastGoodViewportBounds = boundedViewport;
  const needsReattach = !usaJobsViewAttached;
  if (isFirstViewport || needsReattach) {
    // ===============================================================
    // WHY: Detaching the BrowserView on other workspaces drops the attach flag.
    // HOW: Reattach whenever we re-enter Explore with a valid viewport.
    // ===============================================================
    attachUsaJobsViewIfNeeded();
  }
  ensureUsaJobsInitialLoad();
  applyAllViewportBounds();
});

ipcMain.on("workbench-viewport-inset", (_event, payload) => {
  if (!payload || typeof payload.top !== "number") {
    return;
  }
  viewportInsetTop = Math.max(0, payload.top);
  applyViewportBounds();
});

// ===============================================================
// WHY: BrowserView does not auto-resize from renderer CSS alone.
// HOW: Apply renderer-measured bounds only in the Benefits workspace.
// ===============================================================
ipcMain.on("benefits-tool-viewport-update", (_event, payload) => {
  if (!BENEFITS_BROWSER_VIEW_ENABLED) {
    return;
  }
  if (
    !payload ||
    typeof payload.x !== "number" ||
    typeof payload.y !== "number" ||
    typeof payload.width !== "number" ||
    typeof payload.height !== "number"
  ) {
    return;
  }
  if (!mainWindow || !benefitsView) {
    return;
  }
  // WHY: Keep the Benefits BrowserView scoped to its own workspace.
  if (activeWorkspace !== "benefits-compensation") {
    lastBenefitsViewportBounds = null;
    lastAppliedBenefitsBounds = null;
    benefitsView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    return;
  }
  if (payload.width <= 0 || payload.height <= 0) {
    lastBenefitsViewportBounds = null;
    lastAppliedBenefitsBounds = null;
    benefitsView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    return;
  }
  lastBenefitsViewportBounds = payload;
  attachBenefitsViewIfNeeded();
  applyBenefitsViewportBounds();
});

// ===============================================================
// WHY: Renderer should request tool loads without direct webContents access.
// HOW: Validate payload and instruct the BrowserView to load the URL.
// ===============================================================
ipcMain.on("benefits-tool-open", (_event, payload) => {
  if (!BENEFITS_BROWSER_VIEW_ENABLED) {
    return;
  }
  if (!benefitsView || !payload || typeof payload.url !== "string") {
    return;
  }
  const nextUrl = payload.url.trim();
  if (!nextUrl) {
    return;
  }
  attachBenefitsViewIfNeeded();
  benefitsView.webContents.loadURL(nextUrl);
  applyBenefitsViewportBounds();
});

// ===============================================================
// WHY: Only one live PathAdvisor surface can be active at a time.
// HOW: Allow renderers to request ownership and read the current owner.
// ===============================================================
ipcMain.handle("advisor:getOwner", () => ({
  owner: advisorSurfaceOwner,
}));

ipcMain.handle("advisor:setOwner", (_event, nextOwner) => {
  setAdvisorSurfaceOwner(nextOwner);
  return { owner: advisorSurfaceOwner };
});

ipcMain.handle("backend:health", invokeBackend(() => backendClient.getHealth()));

ipcMain.handle("backend:desktopInfo", invokeBackend(() => backendClient.getDesktopInfo()));

ipcMain.handle(
  "backend:auditRecent",
  async (_event, limit) => invokeBackend((nextLimit) => backendClient.getAuditRecent(nextLimit))(limit)
);

ipcMain.handle(
  "backend:threadRecent",
  async (_event, limit) => invokeBackend((nextLimit) => backendClient.getThreadRecent(nextLimit))(limit)
);

// ===============================================================
// WHY: The main process is the desktop network boundary for backend
//      access, so renderer intent must cross IPC before any request.
// HOW: Handle a narrow `backend:jobsSearch` channel and proxy the
//      payload into the main-owned backend client.
// INPUT: `payload` search contract from renderer via preload bridge.
// OUTPUT: Standard backend envelope `{ ok, data|error }`.
// ERROR: `invokeBackend` catches thrown failures and returns safe
//        `ok:false` contracts to renderer without exposing secrets.
// ===============================================================
ipcMain.handle(
  "backend:jobsSearch",
  async (_event, payload) =>
    invokeBackend((nextPayload) => backendClient.searchJobs(nextPayload))(payload)
);

ipcMain.handle("benefits:openToolPopout", (_event, payload) => {
  if (!payload || typeof payload.url !== "string") {
    return { ok: false };
  }
  const nextUrl = payload.url.trim();
  if (!isAllowedExternalUrl(nextUrl)) {
    return { ok: false };
  }
  const popout = ensureBenefitsPopoutWindow();
  if (!popout) {
    return { ok: false };
  }
  const title =
    typeof payload.title === "string" ? payload.title.trim() : "";
  const source =
    typeof payload.source === "string" ? payload.source.trim() : "";
  const isPlaceholder = Boolean(payload.isPlaceholder);
  const headerTitle = title || "Tool reference";
  const headerSource = source || "External source";
  const trust =
    typeof payload.trust === "string" ? payload.trust.trim() : "";
  const ctaLabel =
    typeof payload.ctaLabel === "string" ? payload.ctaLabel.trim() : "";
  const navTitle =
    typeof payload.navTitle === "string" ? payload.navTitle.trim() : "";
  const guidance = Array.isArray(payload.guidance)
    ? payload.guidance.filter((line) => typeof line === "string")
    : [];
  popout.setTitle(title ? `PathOS – ${title}` : BENEFITS_POPOUT_WINDOW_TITLE);
  sendBenefitsPopoutInfo({
    toolId: typeof payload.toolId === "string" ? payload.toolId : "",
    url: nextUrl,
    title: headerTitle,
    source: headerSource,
    placeholder: isPlaceholder,
    guidance,
    trust,
    ctaLabel,
    navTitle,
  });
  sendBenefitsPopoutState(true);
  setAdvisorSurfaceOwner("benefits-popout");
  return { ok: true };
});

ipcMain.handle("benefits:closeToolPopout", () => {
  if (benefitsPopoutWindow && !benefitsPopoutWindow.isDestroyed()) {
    benefitsPopoutWindow.close();
    return { ok: true };
  }
  sendBenefitsPopoutState(false);
  setAdvisorSurfaceOwner("main");
  return { ok: false };
});

ipcMain.on("benefits-popout-preload-ready", (event) => {
  console.info("Benefits popout preload ready.");
  if (!benefitsPopoutInfo || !event || !event.sender) {
    return;
  }
  event.sender.send("benefits-popout-info", benefitsPopoutInfo);
});

// WHY: The popout renderer cannot access Electron directly.
// HOW: Provide intent-only IPC helpers for close + info refresh.
ipcMain.on("benefits-popout-close", () => {
  if (benefitsPopoutWindow && !benefitsPopoutWindow.isDestroyed()) {
    benefitsPopoutWindow.close();
    return;
  }
  sendBenefitsPopoutState(false);
  setAdvisorSurfaceOwner("main");
});

ipcMain.on("benefits-popout-request-info", (event) => {
  console.info("[BenefitsPopout] request-info received.");
  if (!benefitsPopoutInfo || !event || !event.sender) {
    return;
  }
  const url =
    benefitsPopoutInfo && typeof benefitsPopoutInfo.url === "string"
      ? benefitsPopoutInfo.url
      : "";
  console.info("[BenefitsPopout] sending payload url=", url);
  event.sender.send("benefits-popout-info", benefitsPopoutInfo);
});

// ===============================================================
// WHY: Popout navigation needs an external escape hatch for tool URLs.
// HOW: Validate the URL and let the shell open the default browser.
// ===============================================================
ipcMain.on("benefits-popout-open-external", (_event, payload) => {
  const url = payload && typeof payload.url === "string" ? payload.url : "";
  if (!isAllowedExternalUrl(url)) {
    return;
  }
  shell.openExternal(url);
});

// ===============================================================
// WHY: Popout guidance should flow back into the main PathAdvisor chat.
// HOW: Relay a sanitized draft message to the main renderer only.
// ===============================================================
ipcMain.on("benefits:sendGuidanceToAdvisor", (_event, payload) => {
  if (!payload || typeof payload.message !== "string") {
    return;
  }
  const message = payload.message.trim();
  if (!message) {
    return;
  }
  sendToRenderer("pathadvisor:guidanceDraft", {
    message,
    toolId: typeof payload.toolId === "string" ? payload.toolId : "",
    title: typeof payload.title === "string" ? payload.title : "",
  });
});

// WHY: Offer renderer-controlled DevTools for reliable debugging access.
// HOW: Handlers no-op safely when the window or view is unavailable.
ipcMain.handle("devtools:toggleMain", () => {
  if (isWindowAvailable(mainWindow)) {
    toggleDevToolsForContents(mainWindow.webContents);
  }
});

ipcMain.handle("devtools:toggleUsaJobs", () => {
  if (usaJobsView) {
    toggleDevToolsForContents(usaJobsView.webContents);
  }
});

ipcMain.handle("devtools:openMain", () => {
  if (isWindowAvailable(mainWindow)) {
    openDevToolsForContents(mainWindow.webContents);
  }
});

ipcMain.handle("devtools:openUsaJobs", () => {
  if (usaJobsView) {
    openDevToolsForContents(usaJobsView.webContents);
  }
});

ipcMain.on("usajobs-nav", (_event, action) => {
  if (!usaJobsView) {
    return;
  }

  const contents = usaJobsView.webContents;
  if (action === "back") {
    if (contents.canGoBack()) {
      contents.goBack();
    }
    return;
  }
  if (action === "forward") {
    if (contents.canGoForward()) {
      contents.goForward();
    }
    return;
  }
  if (action === "refresh") {
    contents.reload();
    return;
  }
  handleUsaJobsNavigation(action, contents, shell);
});

// ===============================================================
// WHY: Detached PathAdvisor windows must be controlled from main.
// HOW: IPC handlers open, close, focus, and sync thread state.
// ===============================================================
ipcMain.handle("pathadvisor:openLiveAdvisorWindow", () => {
  createLiveAdvisorWindow();
  return getWindowStateSnapshot();
});

ipcMain.handle("pathadvisor:openDecisionViewWindow", () => {
  createDecisionViewWindow();
  return getWindowStateSnapshot();
});

ipcMain.handle("pathadvisor:closeLiveAdvisorWindow", () => {
  if (isWindowAvailable(liveAdvisorWindow)) {
    liveAdvisorWindow.close();
  }
  return getWindowStateSnapshot();
});

ipcMain.handle("pathadvisor:closeDecisionViewWindow", () => {
  if (isWindowAvailable(decisionViewWindow)) {
    decisionViewWindow.close();
  }
  return getWindowStateSnapshot();
});

ipcMain.handle("pathadvisor:focusWindow", (_event, type) => {
  if (type === "live" && isWindowAvailable(liveAdvisorWindow)) {
    liveAdvisorWindow.focus();
  }
  if (type === "decision" && isWindowAvailable(decisionViewWindow)) {
    decisionViewWindow.focus();
  }
  if (type === "main" && isWindowAvailable(mainWindow)) {
    mainWindow.focus();
  }
  return getWindowStateSnapshot();
});

ipcMain.handle("pathadvisor:getWindowStates", () => getWindowStateSnapshot());

ipcMain.handle("pathadvisor:getLiveThread", () => liveAdvisorThread);
ipcMain.handle("pathadvisor:getDecisionThread", () => decisionThread);

ipcMain.handle("pathadvisor:updateLiveThread", (_event, nextThread) => {
  liveAdvisorThread = sanitizeLiveAdvisorThread(nextThread, liveAdvisorThread);
  broadcastLiveThread();
  return liveAdvisorThread;
});

ipcMain.handle("pathadvisor:updateDecisionThread", (_event, nextThread) => {
  decisionThread = sanitizeDecisionThread(nextThread, decisionThread);
  broadcastDecisionThread();
  return decisionThread;
});

ipcMain.on("pathadvisor:decision-overlay-open", () => {
  if (isWindowAvailable(decisionViewWindow)) {
    decisionViewWindow.close();
  }
  sendToRenderer("pathadvisor:decisionOverlayOpen", { open: true });
});

// ===============================================================
// WHY: Alerts popover must render above the embedded BrowserView.
// HOW: Toggle a lightweight popover BrowserWindow from renderer IPC.
// ===============================================================
ipcMain.on("alertsPopover:toggle", (_event, payload) => {
  if (!isWindowAvailable(mainWindow)) {
    return;
  }
  toggleAlertsPopover(payload);
});

ipcMain.on("alertsPopover:close", () => {
  closeAlertsPopover();
});

ipcMain.on("alertsPopover:viewAll", () => {
  closeAlertsPopover();
  sendToRenderer("alertsPopover:openAlertCenter", { source: "alertsPopover" });
  if (isWindowAvailable(mainWindow)) {
    mainWindow.focus();
  }
});
