"use strict";

console.info("[BenefitsPopout] renderer boot", location.href);

const hasBridge = Boolean(
  window.benefitsPopout &&
    window.benefitsPopout.close &&
    window.benefitsPopout.onInfo
);
const isDevPopout = !location.pathname.includes("app.asar");
console.info("[BenefitsPopout] bridge", hasBridge, window.benefitsPopout);

/** @type {HTMLElement|null} */
const titleEl = document.querySelector("[data-benefits-popout-title]");
/** @type {HTMLElement|null} */
const sourceEl = document.querySelector("[data-benefits-popout-source]");
/** @type {HTMLElement|null} */
const trustEl = document.querySelector("[data-benefits-popout-trust]");
/** @type {HTMLElement|null} */
const navTitleEl = document.querySelector("[data-popout-nav-title]");
/** @type {HTMLElement|null} */
const closeLabelEl = document.querySelector("[data-benefits-popout-close-label]");
/** @type {import("electron").WebviewTag|null} */
const webviewEl = document.querySelector("[data-benefits-popout-webview]");
/** @type {HTMLElement|null} */
const emptyEl = document.querySelector("[data-benefits-popout-empty]");
/** @type {HTMLElement|null} */
const emptyTitleEl = document.querySelector(".benefits-popout-empty-title");
/** @type {HTMLElement|null} */
const emptyDetailsEl = document.querySelector(
  "[data-benefits-popout-empty-details]"
);
/** @type {HTMLElement|null} */
const loadingRowEl = document.querySelector("[data-benefits-popout-loading]");
/** @type {HTMLElement|null} */
const usajobsWarningEl = document.querySelector(
  "[data-benefits-popout-usajobs-warning]"
);
/** @type {HTMLElement|null} */
const reloadButtonEl = document.querySelector("[data-benefits-popout-reload]");
/** @type {HTMLElement|null} */
const errorCodeEl = document.querySelector("[data-benefits-popout-error-code]");
/** @type {HTMLElement|null} */
const errorDescriptionEl = document.querySelector(
  "[data-benefits-popout-error-description]"
);
/** @type {HTMLElement|null} */
const guidanceListEl = document.querySelector(
  "[data-benefits-popout-guidance-list]"
);
/** @type {HTMLElement[]} */
const closeButtons = Array.from(
  document.querySelectorAll("[data-benefits-popout-close]")
);
/** @type {HTMLElement|null} */
const advisorRoot = document.querySelector(
  "[data-advisor-surface=\"benefits-popout\"]"
);
/** @type {HTMLElement|null} */
const headerMetaEl = document.querySelector(".benefits-popout-meta");
/** @type {HTMLElement|null} */
const headerActionsEl = document.querySelector(".benefits-popout-actions");
/** @type {HTMLElement|null} */
const navBackButtonEl = document.querySelector(
  "[data-benefits-popout-nav=\"back\"]"
);
/** @type {HTMLElement|null} */
const navForwardButtonEl = document.querySelector(
  "[data-benefits-popout-nav=\"forward\"]"
);
/** @type {HTMLElement|null} */
const navReloadButtonEl = document.querySelector(
  "[data-benefits-popout-nav=\"reload\"]"
);
/** @type {HTMLElement|null} */
const navHomeButtonEl = document.querySelector(
  "[data-benefits-popout-nav=\"home\"]"
);
/** @type {HTMLElement|null} */
const navOpenExternalButtonEl = document.querySelector(
  "[data-benefits-popout-nav=\"open-external\"]"
);

let latestPopoutInfo = null;
let pendingPopoutInfo = null;
let webviewListenersAttached = false;
let isDomReady = false;
let hasPopoutInfo = false;
let infoTimeoutId = null;
let webviewIsInteractive = false;
let webviewIsDomReady = false;
let currentToolState = "idle"; // idle | loading | loaded | error
let toolLoadTimeoutId = null;
let toolLoadSequence = 0;
let pendingWebviewUrl = null;
let popoutNavigation = null;
let usaJobsFallbackTriggered = false;

const toolStateElements = {
  loadingRowEl,
  emptyEl,
  emptyDetailsEl,
  errorCodeEl,
  errorDescriptionEl,
  webviewEl,
};

const BRIDGE_WARNING_MESSAGE =
  "IPC bridge missing (popout preload not loaded)";
const BRIDGE_ERROR_LOG =
  "[BenefitsPopout] IPC bridge missing: preload not loaded.";

const renderBridgeWarning = (message) => {
  if (!headerActionsEl || typeof message !== "string") {
    return;
  }
  if (headerActionsEl.querySelector("[data-benefits-popout-bridge-warning]")) {
    return;
  }
  const warning = document.createElement("div");
  warning.className = "benefits-popout-bridge-warning";
  warning.setAttribute("data-benefits-popout-bridge-warning", "true");
  warning.textContent = message;
  headerActionsEl.appendChild(warning);
};

const showBridgeMissingOverlay = () => {
  if (!emptyEl) {
    return;
  }
  if (emptyTitleEl) {
    emptyTitleEl.textContent =
      "IPC bridge missing (popout preload not loaded)";
  }
  setToolState("error", {
    errorCode: "bridge",
    errorDescription: "IPC bridge missing (popout preload not loaded).",
  });
};

// ===============================================================
// WHY: The popout should only load trusted external URLs.
// HOW: Match the same protocol checks used elsewhere in the app.
// ===============================================================
const isAllowedExternalUrl = (value) => {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.indexOf("https://") === 0) {
    return true;
  }
  if (trimmed.indexOf("http://") === 0) {
    return true;
  }
  return false;
};

// ===============================================================
// WHY: Guidance content must be safe to render and reuse.
// HOW: Filter to non-empty strings and return a clean list.
// ===============================================================
const normalizeGuidance = (guidance) => {
  if (!Array.isArray(guidance)) {
    return [];
  }
  const lines = [];
  guidance.forEach((line) => {
    if (typeof line !== "string") {
      return;
    }
    const trimmed = line.trim();
    if (trimmed) {
      lines.push(trimmed);
    }
  });
  return lines;
};

const setUsaJobsWarningVisible = (shouldShow) => {
  if (!usajobsWarningEl) {
    return;
  }
  usajobsWarningEl.hidden = !shouldShow;
};

const getUsaJobsFallbackUrl = () => {
  if (!latestPopoutInfo || typeof latestPopoutInfo !== "object") {
    return "";
  }
  const fallback =
    typeof latestPopoutInfo.usajobsFallbackUrl === "string"
      ? latestPopoutInfo.usajobsFallbackUrl.trim()
      : "";
  if (!fallback || !isAllowedExternalUrl(fallback)) {
    return "";
  }
  return fallback;
};

const shouldCheckUsaJobsNotFound = () => {
  if (!latestPopoutInfo || typeof latestPopoutInfo !== "object") {
    return false;
  }
  return latestPopoutInfo.toolId === "usajobs-reference";
};

const isUsaJobsNotFoundTitle = (title) => {
  if (typeof title !== "string") {
    return false;
  }
  return /not found/i.test(title);
};

const readUsaJobsNotFoundText = () => {
  if (!webviewEl || typeof webviewEl.executeJavaScript !== "function") {
    return Promise.resolve(false);
  }
  return webviewEl
    .executeJavaScript(
      "document && document.body ? document.body.innerText : ''",
      true
    )
    .then((text) => {
      if (typeof text !== "string") {
        return false;
      }
      return /we can('|’)t find the page/i.test(text);
    })
    .catch(() => false);
};

const maybeFallbackFromUsaJobsNotFound = () => {
  if (!shouldCheckUsaJobsNotFound() || usaJobsFallbackTriggered) {
    return;
  }
  const fallbackUrl = getUsaJobsFallbackUrl();
  if (!fallbackUrl) {
    return;
  }
  let titleMatched = false;
  if (webviewEl && typeof webviewEl.getTitle === "function") {
    try {
      titleMatched = isUsaJobsNotFoundTitle(webviewEl.getTitle());
    } catch (error) {
      titleMatched = false;
    }
  }
  const handleFallback = () => {
    if (usaJobsFallbackTriggered) {
      return;
    }
    usaJobsFallbackTriggered = true;
    setUsaJobsWarningVisible(true);
    console.warn("[BenefitsPopout] USAJOBS listing not found, using fallback.", {
      fallbackUrl,
    });
    runWhenWebviewReady(() => {
      if (webviewEl && typeof webviewEl.loadURL === "function") {
        webviewEl.loadURL(fallbackUrl);
      } else {
        setWebviewUrl(fallbackUrl);
      }
    });
  };
  if (titleMatched) {
    handleFallback();
    return;
  }
  readUsaJobsNotFoundText().then((textMatched) => {
    if (textMatched) {
      handleFallback();
    }
  });
};

const setGuidanceList = (guidance) => {
  if (!guidanceListEl) {
    return;
  }
  guidanceListEl.innerHTML = "";
  if (!guidance.length) {
    const item = document.createElement("li");
    item.textContent = "Open a tool to view guidance statements.";
    guidanceListEl.appendChild(item);
    return;
  }
  guidance.forEach((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    guidanceListEl.appendChild(item);
  });
};

const setToolLoadErrorVisible = (shouldShow, details) => {
  if (!emptyEl) {
    return;
  }
  // ===============================================================
  // WHY: Author CSS can override `hidden` without a matching selector.
  // HOW: Set hidden + aria to guarantee the overlay is removed.
  // ===============================================================
  emptyEl.hidden = !shouldShow;
  emptyEl.setAttribute("aria-hidden", shouldShow ? "false" : "true");
  if (!emptyDetailsEl || !errorCodeEl || !errorDescriptionEl) {
    return;
  }
  if (!shouldShow || !details) {
    emptyDetailsEl.hidden = true;
    errorCodeEl.textContent = "";
    errorDescriptionEl.textContent = "";
    return;
  }
  const code =
    details.code !== null && details.code !== undefined ? String(details.code) : "";
  const description =
    typeof details.description === "string" ? details.description : "";
  if (!code && !description) {
    emptyDetailsEl.hidden = true;
    errorCodeEl.textContent = "";
    errorDescriptionEl.textContent = "";
    return;
  }
  emptyDetailsEl.hidden = false;
  errorCodeEl.textContent = code;
  errorDescriptionEl.textContent = description ? ` ${description}` : "";
};

const setLoadingVisible = (shouldShow) => {
  if (!loadingRowEl) {
    return;
  }
  loadingRowEl.hidden = !shouldShow;
};

const clearToolLoadTimeout = () => {
  if (!toolLoadTimeoutId) {
    return;
  }
  window.clearTimeout(toolLoadTimeoutId);
  toolLoadTimeoutId = null;
};

const startToolLoadTimeout = () => {
  clearToolLoadTimeout();
  const activeSequence = toolLoadSequence;
  toolLoadTimeoutId = window.setTimeout(() => {
    if (currentToolState === "loaded" || activeSequence !== toolLoadSequence) {
      return;
    }
    console.info("[BenefitsPopup] tool load timeout -> error");
    setToolState("error", {
      reason: "timeout",
      errorDescription: "Timed out waiting for page to load.",
    });
  }, 20000);
};

// ===============================================================
// WHY: The popout needs deterministic loading/loaded/error visuals.
// HOW: Centralize UI toggles so handlers can't drift out of sync.
// ===============================================================
const applyToolState = (elements, nextState, details) => {
  if (!elements) {
    return;
  }
  // ===============================================================
  // WHY: The fallback overlay should only appear on load failure/timeout.
  // HOW: Gate the overlay to explicit failure reasons.
  // ===============================================================
  const isOverlayAllowed =
    details &&
    (details.reason === "load-failed" || details.reason === "timeout");
  if (nextState === "loading") {
    setLoadingVisible(true);
    setToolLoadErrorVisible(false);
    setWebviewInteractive(false);
    return;
  }
  if (nextState === "loaded") {
    setLoadingVisible(false);
    setToolLoadErrorVisible(false);
    setWebviewInteractive(true);
    return;
  }
  if (nextState === "error") {
    setLoadingVisible(false);
    setToolLoadErrorVisible(isOverlayAllowed, {
      code: details && details.errorCode ? details.errorCode : "",
      description:
        details && details.errorDescription ? details.errorDescription : "",
    });
    setWebviewInteractive(false);
    return;
  }
  setLoadingVisible(false);
  setToolLoadErrorVisible(false);
  setWebviewInteractive(false);
};

const setToolState = (nextState, details) => {
  if (currentToolState === nextState && !details) {
    return;
  }
  currentToolState = nextState;
  console.info(`[BenefitsPopup] tool state -> ${currentToolState}`);
  applyToolState(toolStateElements, currentToolState, details);
  if (currentToolState === "loading") {
    return;
  }
  clearToolLoadTimeout();
};

const setWebviewInteractive = (value) => {
  if (!webviewEl) {
    return;
  }
  webviewIsInteractive = Boolean(value);
  if (webviewIsInteractive) {
    webviewEl.classList.remove("is-disabled");
  } else {
    webviewEl.classList.add("is-disabled");
  }
};

const runWhenWebviewReady = (fn) => {
  if (!webviewEl) {
    return;
  }
  if (!webviewEl.isConnected) {
    // ===============================================================
    // WHY: Webview APIs throw if the element isn't attached yet.
    // HOW: Defer until the element reports isConnected.
    // ===============================================================
    window.requestAnimationFrame(() => runWhenWebviewReady(fn));
    return;
  }
  if (webviewIsDomReady) {
    try {
      fn();
    } catch (error) {
      console.warn("[BenefitsPopout] webview ready call failed", error);
    }
    return;
  }
  const onReady = () => {
    webviewEl.removeEventListener("dom-ready", onReady);
    webviewIsDomReady = true;
    try {
      fn();
    } catch (error) {
      console.warn("[BenefitsPopout] webview dom-ready call failed", error);
    }
  };
  webviewEl.addEventListener("dom-ready", onReady);
};

// ===============================================================
// WHY: Popouts need Explore-style navigation controls for webview tools.
// HOW: Centralize button wiring + navigation state in a reusable helper.
// ===============================================================
const createPopoutNavigationBar = (options) => {
  if (!options || !options.webviewEl) {
    return null;
  }

  const state = {
    initialUrl: "",
    currentUrl: "",
  };

  const getWebviewUrl = () => {
    if (!options.webviewEl || !options.webviewEl.isConnected) {
      return "";
    }
    if (!options.webviewEl.getURL) {
      return "";
    }
    try {
      return options.webviewEl.getURL();
    } catch (error) {
      return "";
    }
  };

  const getWebviewNavState = () => {
    let canGoBack = false;
    let canGoForward = false;
    if (!options.webviewEl || !options.webviewEl.isConnected) {
      return { canGoBack, canGoForward };
    }
    if (typeof options.webviewEl.canGoBack === "function") {
      try {
        canGoBack = options.webviewEl.canGoBack();
      } catch (error) {
        canGoBack = false;
      }
    }
    if (typeof options.webviewEl.canGoForward === "function") {
      try {
        canGoForward = options.webviewEl.canGoForward();
      } catch (error) {
        canGoForward = false;
      }
    }
    return { canGoBack, canGoForward };
  };

  const setCurrentUrl = (rawUrl) => {
    if (typeof rawUrl !== "string") {
      return;
    }
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return;
    }
    state.currentUrl = trimmed;
  };

  const applyButtonState = (navState) => {
    if (options.backButton) {
      options.backButton.disabled = !navState.canGoBack;
    }
    if (options.forwardButton) {
      options.forwardButton.disabled = !navState.canGoForward;
    }
    if (options.openExternalButton) {
      options.openExternalButton.disabled = !isAllowedExternalUrl(
        navState.currentUrl || state.initialUrl
      );
    }
  };

  const syncFromWebview = (eventUrl) => {
    const navState = getWebviewNavState();
    const nextUrl = typeof eventUrl === "string" ? eventUrl : "";
    if (nextUrl && isAllowedExternalUrl(nextUrl)) {
      setCurrentUrl(nextUrl);
    } else {
      const webviewUrl = getWebviewUrl();
      if (webviewUrl && isAllowedExternalUrl(webviewUrl)) {
        setCurrentUrl(webviewUrl);
      }
    }
    applyButtonState({
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward,
      currentUrl: state.currentUrl,
    });
  };

  const setInitialUrl = (rawUrl) => {
    if (typeof rawUrl !== "string") {
      return;
    }
    const trimmed = rawUrl.trim();
    if (!isAllowedExternalUrl(trimmed)) {
      return;
    }
    state.initialUrl = trimmed;
    if (!state.currentUrl) {
      state.currentUrl = trimmed;
    }
    syncFromWebview(trimmed);
  };

  const runWebviewAction = (action) => {
    if (!options.webviewEl) {
      return;
    }
    runWhenWebviewReady(() => {
      if (!options.webviewEl.isConnected) {
        return;
      }
      action();
    });
  };

  const attachButtonHandlers = () => {
    if (options.backButton) {
      options.backButton.addEventListener("click", () => {
        const navState = getWebviewNavState();
        if (!navState.canGoBack) {
          return;
        }
        runWebviewAction(() => {
          options.webviewEl.goBack();
        });
      });
    }

    if (options.forwardButton) {
      options.forwardButton.addEventListener("click", () => {
        const navState = getWebviewNavState();
        if (!navState.canGoForward) {
          return;
        }
        runWebviewAction(() => {
          options.webviewEl.goForward();
        });
      });
    }

    if (options.reloadButton) {
      options.reloadButton.addEventListener("click", () => {
        runWebviewAction(() => {
          options.webviewEl.reload();
        });
      });
    }

    if (options.homeButton) {
      options.homeButton.addEventListener("click", () => {
        if (!state.initialUrl) {
          return;
        }
        runWebviewAction(() => {
          options.webviewEl.loadURL(state.initialUrl);
        });
      });
    }

    if (options.openExternalButton) {
      options.openExternalButton.addEventListener("click", () => {
        const targetUrl = state.currentUrl || state.initialUrl;
        if (!isAllowedExternalUrl(targetUrl)) {
          return;
        }
        if (window.benefitsPopout && window.benefitsPopout.openExternal) {
          window.benefitsPopout.openExternal(targetUrl);
        }
      });
    }
  };

  const attachWebviewListeners = () => {
    if (!options.webviewEl) {
      return;
    }
    // ===============================================================
    // WHY: Webview navigation state changes outside direct button clicks.
    // HOW: Refresh button state on navigation + load completion events.
    // ===============================================================
    options.webviewEl.addEventListener("did-navigate", (event) => {
      syncFromWebview(event && event.url ? event.url : "");
    });
    options.webviewEl.addEventListener("did-navigate-in-page", (event) => {
      syncFromWebview(event && event.url ? event.url : "");
    });
    options.webviewEl.addEventListener("did-finish-load", () => {
      syncFromWebview("");
    });
  };

  attachButtonHandlers();
  applyButtonState({
    canGoBack: false,
    canGoForward: false,
    currentUrl: "",
  });

  return {
    setInitialUrl,
    syncFromWebview,
    attachWebviewListeners,
  };
};

popoutNavigation = createPopoutNavigationBar({
  webviewEl,
  backButton: navBackButtonEl,
  forwardButton: navForwardButtonEl,
  reloadButton: navReloadButtonEl,
  homeButton: navHomeButtonEl,
  openExternalButton: navOpenExternalButtonEl,
});

const setWebviewUrl = (url) => {
  if (!webviewEl) {
    return;
  }
  if (!hasBridge) {
    return;
  }
  // ===============================================================
  // WHY: Webview src must wait for DOM + metadata to avoid race bugs.
  // HOW: Only set src once both gates are satisfied.
  // ===============================================================
  if (!isDomReady || !hasPopoutInfo) {
    return;
  }
  if (!isAllowedExternalUrl(url)) {
    pendingWebviewUrl = null;
    setToolState("error", {
      errorCode: "blocked",
      errorDescription: "Unsupported or unsafe URL scheme.",
    });
    return;
  }
  pendingWebviewUrl = url;
  if (!webviewEl.isConnected) {
    // ===============================================================
    // WHY: src changes must wait for the element to be in the DOM.
    // HOW: Queue the URL and retry after the next paint.
    // ===============================================================
    window.requestAnimationFrame(() => {
      if (pendingWebviewUrl === url) {
        setWebviewUrl(url);
      }
    });
    return;
  }
  toolLoadSequence += 1;
  setToolState("loading");
  webviewEl.setAttribute("src", pendingWebviewUrl);
  pendingWebviewUrl = null;
  startToolLoadTimeout();
  console.info("[BenefitsPopout] webview src set", url);
};

const getWebviewUrlForLog = () => {
  if (!webviewEl || !webviewEl.isConnected || !webviewEl.getURL) {
    return "";
  }
  try {
    return webviewEl.getURL();
  } catch (error) {
    return "";
  }
};

const logWebviewEvent = (name) => {
  console.info(
    "[BenefitsPopup] webview event:",
    name,
    getWebviewUrlForLog()
  );
};

const ensureWebviewLoadListeners = () => {
  if (!webviewEl || webviewListenersAttached) {
    return;
  }
  if (!webviewEl.isConnected) {
    // ===============================================================
    // WHY: Webview events don't attach reliably before DOM insertion.
    // HOW: Retry once the element is connected to the document.
    // ===============================================================
    window.requestAnimationFrame(ensureWebviewLoadListeners);
    return;
  }
  webviewListenersAttached = true;
  // ===============================================================
  // WHY: Webview loads can fail silently with CSP/network errors.
  // HOW: Surface the failure quickly and log enough detail to debug.
  // ===============================================================
  // WHY: did-start-loading is the first reliable signal for loading UI.
  // HOW: Switch to loading so the empty-state never shows prematurely.
  webviewEl.addEventListener("did-start-loading", () => {
    runWhenWebviewReady(() => {
      // This must not run until dom-ready.
      logWebviewEvent("did-start-loading");
    });
    setToolState("loading");
  });
  // WHY: did-finish-load fires even when dom-ready is skipped.
  // HOW: Treat it as loaded to clear the loading row.
  webviewEl.addEventListener("did-finish-load", () => {
    runWhenWebviewReady(() => {
      logWebviewEvent("did-finish-load");
    });
    setToolState("loaded");
    maybeFallbackFromUsaJobsNotFound();
  });
  // WHY: dom-ready is a good ready-state for UI interaction.
  // HOW: Mark loaded and cancel the timeout guard.
  webviewEl.addEventListener("dom-ready", () => {
    webviewIsDomReady = true;
    logWebviewEvent("dom-ready");
    setToolState("loaded");
    maybeFallbackFromUsaJobsNotFound();
  });
  // WHY: did-stop-loading can fire without finish/load on some pages.
  // HOW: Keep the loading UI unless loaded/error is explicit.
  webviewEl.addEventListener("did-stop-loading", () => {
    runWhenWebviewReady(() => {
      logWebviewEvent("did-stop-loading");
    });
    if (currentToolState !== "loaded") {
      setToolState("loading");
    }
  });
  // WHY: did-fail-load is the only failure signal we can trust.
  // HOW: Show the error overlay with details for debugging.
  webviewEl.addEventListener("did-fail-load", (event) => {
    const webviewEvent = /** @type {any} */ (event);
    logWebviewEvent("did-fail-load");
    if (webviewEvent && webviewEvent.isMainFrame === false) {
      return;
    }
    const errorCode = webviewEvent ? webviewEvent.errorCode : "";
    const errorDescription = webviewEvent ? webviewEvent.errorDescription : "";
    setToolState("error", {
      reason: "load-failed",
      errorCode,
      errorDescription,
    });
  });
  webviewEl.addEventListener("console-message", (event) => {
    const webviewEvent = /** @type {any} */ (event);
    if (!webviewEvent || typeof webviewEvent.message !== "string") {
      return;
    }
    console.info("Benefits popout webview console:", {
      level: webviewEvent.level,
      message: webviewEvent.message,
      line: webviewEvent.line,
      sourceId: webviewEvent.sourceId,
    });
  });
  // ===============================================================
  // WHY: Keep navigation inside the popout for standard web URLs.
  // HOW: Allow http/https, block file/custom protocols explicitly.
  // ===============================================================
  webviewEl.addEventListener("will-navigate", (event) => {
    const webviewEvent = /** @type {any} */ (event);
    if (!webviewEvent || !isAllowedExternalUrl(webviewEvent.url)) {
      // ===============================================================
      // WHY: Blocked navigation can explain blank tool views in dev.
      // HOW: Log the URL and surface name only for local debugging.
      // ===============================================================
      if (isDevPopout) {
        console.info("[BenefitsWebview] navigation blocked", {
          url: webviewEvent ? webviewEvent.url : "",
          reason: "protocol",
          surface: "benefits-popout",
        });
      }
      if (webviewEvent && typeof webviewEvent.preventDefault === "function") {
        webviewEvent.preventDefault();
      }
      return;
    }
  });
  webviewEl.addEventListener("new-window", (event) => {
    const webviewEvent = /** @type {any} */ (event);
    if (!webviewEvent || typeof webviewEvent.preventDefault !== "function") {
      return;
    }
    webviewEvent.preventDefault();
    if (webviewEvent.url && isAllowedExternalUrl(webviewEvent.url)) {
      runWhenWebviewReady(() => {
        webviewEl.loadURL(webviewEvent.url);
      });
      return;
    }
    // ===============================================================
    // WHY: Popout should not spawn blocked URLs in a new BrowserWindow.
    // HOW: Emit a dev-only log so we can trace blocked window requests.
    // ===============================================================
    if (isDevPopout) {
      console.info("[BenefitsWebview] navigation blocked", {
        url: webviewEvent ? webviewEvent.url : "",
        reason: "new-window",
        surface: "benefits-popout",
      });
    }
  });

  if (popoutNavigation && popoutNavigation.attachWebviewListeners) {
    popoutNavigation.attachWebviewListeners();
  }
};

const applyPopoutInfo = (payload) => {
  if (!payload || typeof payload !== "object") {
    return;
  }
  if (!isDomReady) {
    pendingPopoutInfo = payload;
    return;
  }
  latestPopoutInfo = payload;
  hasPopoutInfo = true;
  usaJobsFallbackTriggered = false;
  setUsaJobsWarningVisible(false);
  if (titleEl && typeof payload.title === "string" && payload.title.trim()) {
    titleEl.textContent = payload.title.trim();
  }
  if (navTitleEl) {
    const navTitle =
      typeof payload.navTitle === "string" ? payload.navTitle.trim() : "";
    if (navTitle) {
      navTitleEl.textContent = navTitle;
    } else if (typeof payload.title === "string" && payload.title.trim()) {
      navTitleEl.textContent = payload.title.trim();
    }
  }
  if (closeLabelEl && typeof payload.ctaLabel === "string" && payload.ctaLabel.trim()) {
    closeLabelEl.textContent = payload.ctaLabel.trim();
  }
  if (sourceEl && typeof payload.source === "string" && payload.source.trim()) {
    sourceEl.textContent = payload.source.trim();
  }
  if (trustEl) {
    const trustCopy =
      typeof payload.trust === "string" ? payload.trust.trim() : "";
    if (trustCopy) {
      trustEl.textContent = trustCopy;
    } else if (payload.placeholder) {
      trustEl.textContent =
        "Placeholder source. Use trusted guidance before relying on this reference.";
    } else {
      trustEl.textContent =
        "Read-only external reference. PathOS does not collect or read your entries.";
    }
  }
  setToolState("loading");
  if (popoutNavigation && popoutNavigation.setInitialUrl) {
    popoutNavigation.setInitialUrl(
      typeof payload.url === "string" ? payload.url : ""
    );
  }
  setWebviewUrl(typeof payload.url === "string" ? payload.url : "");
  const guidance = normalizeGuidance(payload.guidance);
  setGuidanceList(guidance);
};

closeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // ===============================================================
    // WHY: The popout should always be dismissible, even if IPC fails.
    // HOW: Prefer the IPC close bridge, then fall back to window.close().
    // ===============================================================
    if (window.benefitsPopout && window.benefitsPopout.close) {
      window.benefitsPopout.close();
      return;
    }
    window.close();
  });
});

if (!hasBridge) {
  console.error(BRIDGE_ERROR_LOG);
  renderBridgeWarning(BRIDGE_WARNING_MESSAGE);
  showBridgeMissingOverlay();
} else {
  console.info("[BenefitsPopout] IPC bridge OK.");
  window.benefitsPopout.onInfo((payload) => {
    console.info("[BenefitsPopout] info received", payload);
    applyPopoutInfo(payload);
  });
}

// ===============================================================
// WHY: Full chat needs the same quick actions behavior as main.
// HOW: Reuse the popover toggle logic for the popout surface.
// ===============================================================
const setupQuickActions = (root) => {
  if (!root) {
    return;
  }
  const containers = Array.from(root.querySelectorAll("[data-quick-actions]"));
  if (!containers.length) {
    return;
  }

  containers.forEach((container) => {
    const toggle = container.querySelector("[data-quick-actions-toggle]");
    const panel = container.querySelector("[data-quick-actions-panel]");
    const close = container.querySelector("[data-quick-actions-close]");
    if (!toggle || !panel) {
      return;
    }

    const setOpen = (isOpen) => {
      panel.hidden = !isOpen;
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    };

    setOpen(false);

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      setOpen(panel.hidden);
    });

    if (close) {
      close.addEventListener("click", (event) => {
        event.preventDefault();
        setOpen(false);
        toggle.focus();
      });
    }

    document.addEventListener("click", (event) => {
      if (!panel.hidden && !container.contains(event.target)) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!panel.hidden && event.key === "Escape") {
        setOpen(false);
        toggle.focus();
      }
    });
  });
};

// ===============================================================
// WHY: The popout needs the full PathAdvisor conversation history.
// HOW: Reuse the shared conversation store and render a single surface.
// ===============================================================
const ASSISTANT_TEMPLATES = {
  "explain-page": {
    summary:
      "I can translate the section into plain language and flag anything that needs confirmation.",
    question: "Which part of the posting is most confusing right now?",
  },
  qualified: {
    summary:
      "I can compare the requirements with your experience highlights and spot gaps.",
    question: "Which requirement feels most borderline today?",
  },
  "prepare-next": {
    summary:
      "I can outline a focused preparation checklist tied to the role requirements.",
    question: "What do you need to prepare first?",
  },
  freeform: {
    summary: "I can help clarify the request and highlight what to verify next.",
    question: "What is the single decision you need to make next?",
  },
};

const buildAssistantResponse = (intent, request) => {
  const template = ASSISTANT_TEMPLATES[intent] || ASSISTANT_TEMPLATES.freeform;
  const parts = [];
  if (template.summary) {
    parts.push(template.summary);
  }
  if (template.question) {
    parts.push(template.question);
  }
  return parts.join(" ");
};

const createMemoryStorage = () => {
  const data = {};
  return {
    getItem: (key) => {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        return data[key];
      }
      return null;
    },
    setItem: (key, value) => {
      data[key] = value;
    },
  };
};

const createSafeStorage = (fallback) => {
  return {
    getItem: (key) => {
      try {
        return fallback.getItem(key);
      } catch (error) {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        fallback.setItem(key, value);
      } catch (error) {
        // Best-effort persistence in popout.
      }
    },
  };
};

let conversationStore = window.PathAdvisorConversationStore;
if (!conversationStore) {
  console.error("PathAdvisorConversationStore missing, popout chat disabled.");
}

let storageCandidate = null;
try {
  storageCandidate =
    typeof localStorage !== "undefined" ? localStorage : createMemoryStorage();
} catch (error) {
  storageCandidate = createMemoryStorage();
}

const conversationStorage = createSafeStorage(storageCandidate);
let conversationState = conversationStore
  ? conversationStore.loadConversationState(conversationStorage)
  : null;

const getActiveThread = () => {
  if (!conversationState || !conversationState.threads) {
    return null;
  }
  if (!conversationState.activeThreadId) {
    return conversationState.threads[0] || null;
  }
  return (
    conversationState.threads.find(
      (thread) => thread.id === conversationState.activeThreadId
    ) || conversationState.threads[0]
  );
};

const updateConversationState = (mutator) => {
  if (!conversationStore || !conversationState) {
    return;
  }
  const nextState = conversationStore.sanitizeConversationState(conversationState);
  mutator(nextState);
  conversationStore.ensureActiveThread(nextState);
  conversationState = nextState;
  conversationStore.persistConversationState(conversationStorage, conversationState);
  renderLiveThread();
};

const addMessageToActiveThreadForPopout = (role, content) => {
  updateConversationState((state) => {
    conversationStore.addMessageToActiveThread(state, role, content);
  });
};

const createThread = () => {
  updateConversationState((state) => {
    conversationStore.createThreadInState(state);
  });
};

const clearThreadForPopout = (threadId) => {
  updateConversationState((state) => {
    conversationStore.clearThread(state, threadId);
  });
};

const exportActiveThread = () => {
  if (!conversationStore) {
    return;
  }
  const thread = getActiveThread();
  const markdown = conversationStore.exportThreadMarkdown(thread);
  if (markdown && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(markdown).catch(() => {});
  }
  const json = conversationStore.exportThreadJson(thread);
  if (json) {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pathadvisor-thread-${thread.id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
};

const applyLiveFeedPadding = (elements) => {
  if (!elements || !elements.briefingFeed || !elements.inputSection) {
    return;
  }
  const composerHeight = elements.inputSection.getBoundingClientRect().height;
  const padding = Math.max(24, Math.round(composerHeight + 12));
  elements.briefingFeed.style.paddingBottom = `${padding}px`;
};

const scrollFeedToBottom = (elements) => {
  if (!elements || !elements.briefingFeed) {
    return;
  }
  elements.briefingFeed.scrollTop = elements.briefingFeed.scrollHeight;
  elements.isPinnedToBottom = true;
  elements.hasUnseenMessages = false;
  if (elements.jumpToLatest) {
    elements.jumpToLatest.hidden = true;
  }
};

const setupAutoGrowTextarea = (textarea, maxRows, onResize) => {
  if (!textarea) {
    return;
  }
  const maxLines = typeof maxRows === "number" && maxRows > 1 ? maxRows : 4;
  const resize = () => {
    const styles = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(styles.lineHeight) || 20;
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    const minHeight = lineHeight + paddingTop + paddingBottom;
    const maxHeight = lineHeight * maxLines + paddingTop + paddingBottom;
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${Math.max(nextHeight, minHeight)}px`;
    if (typeof onResize === "function") {
      onResize();
    }
  };
  resize();
  textarea.addEventListener("input", resize);
  window.addEventListener("resize", resize);
};

const isNearBottom = (feed) => {
  const threshold = 48;
  return (
    feed.scrollHeight - feed.scrollTop - feed.clientHeight <= threshold
  );
};

const renderMessagesForSurface = (elements, thread) => {
  if (!elements || !elements.briefingFeed || !elements.briefingEmpty || !thread) {
    return;
  }
  const feed = elements.briefingFeed;
  const previousScrollTop = feed.scrollTop;
  const previousScrollHeight = feed.scrollHeight;
  const previousCount = elements.lastMessageCount || 0;
  const threadChanged = elements.lastThreadId !== thread.id;
  const wasNearBottom = threadChanged ? true : isNearBottom(feed);

  feed.innerHTML = "";
  thread.messages.forEach((message) => {
    const item = document.createElement("article");
    const isUser = message.role === "user";
    item.className = `conversation-message ${isUser ? "is-user" : "is-assistant"}`;
    item.setAttribute("role", "listitem");

    const meta = document.createElement("div");
    meta.className = "conversation-meta";
    meta.textContent = isUser ? "You" : "PathAdvisor";
    item.appendChild(meta);

    const body = document.createElement("p");
    body.className = "conversation-text";
    body.textContent = message.content;
    item.appendChild(body);

    feed.appendChild(item);
  });

  const hasNewMessages = thread.messages.length > previousCount && !threadChanged;

  if (wasNearBottom) {
    scrollFeedToBottom(elements);
  } else {
    feed.scrollTop = previousScrollTop + (feed.scrollHeight - previousScrollHeight);
    if (hasNewMessages) {
      elements.hasUnseenMessages = true;
    }
  }

  elements.lastMessageCount = thread.messages.length;
  elements.lastThreadId = thread.id;
  elements.briefingEmpty.hidden = thread.messages.length > 0;
  elements.isPinnedToBottom = isNearBottom(feed);
  if (thread.messages.length === 0) {
    elements.hasUnseenMessages = false;
  }

  if (elements.jumpToLatest) {
    elements.jumpToLatest.hidden = !elements.hasUnseenMessages;
  }
};

const renderLiveThread = () => {
  const thread = getActiveThread();
  if (!liveSurfaceElements) {
    return;
  }
  renderMessagesForSurface(liveSurfaceElements, thread);
};

const collectLiveAdvisorElements = (root) => {
  if (!root) {
    return null;
  }
  return {
    briefingFeed: root.querySelector(".briefing-feed"),
    briefingEmpty: root.querySelector(".briefing-empty"),
    jumpToLatest: root.querySelector("[data-jump-latest]"),
    followupForm: root.querySelector("[data-live-followup-form]"),
    followupInput: root.querySelector("[data-live-followup-input]"),
    inputSection: root.querySelector(".advisor-input-section"),
    intentButtons: Array.from(root.querySelectorAll("[data-intent]")),
    newConversation: root.querySelector("[data-conversation-new]"),
    clearConversation: root.querySelector("[data-conversation-clear]"),
    exportConversation: root.querySelector("[data-conversation-export]"),
  };
};

let liveSurfaceElements = null;

const registerLiveAdvisorSurface = (elements) => {
  if (!elements || !conversationStore || !conversationState) {
    return;
  }

  if (elements.briefingFeed) {
    elements.briefingFeed.addEventListener("scroll", () => {
      elements.isPinnedToBottom = isNearBottom(elements.briefingFeed);
      if (elements.isPinnedToBottom) {
        elements.hasUnseenMessages = false;
      }
      if (elements.jumpToLatest) {
        elements.jumpToLatest.hidden = !elements.hasUnseenMessages;
      }
    });
  }

  if (elements.jumpToLatest) {
    elements.jumpToLatest.addEventListener("click", () => {
      scrollFeedToBottom(elements);
    });
  }

  if (elements.newConversation) {
    elements.newConversation.addEventListener("click", () => {
      createThread();
    });
  }

  if (elements.clearConversation) {
    elements.clearConversation.addEventListener("click", () => {
      const thread = getActiveThread();
      if (!thread || !thread.messages.length) {
        return;
      }
      const confirmed = window.confirm("Clear this conversation?");
      if (confirmed) {
        clearThreadForPopout(thread.id);
      }
    });
  }

  if (elements.exportConversation) {
    elements.exportConversation.addEventListener("click", () => {
      exportActiveThread();
    });
  }

  elements.intentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const intent = button.dataset.intent || "freeform";
      const request = button.textContent || "New briefing request";
      const safeRequest = request && request.trim() ? request.trim() : "";
      if (!safeRequest) {
        return;
      }
      addMessageToActiveThreadForPopout("user", safeRequest);
      addMessageToActiveThreadForPopout(
        "assistant",
        buildAssistantResponse(intent, safeRequest)
      );
    });
  });

  if (elements.followupForm && elements.followupInput) {
    const submitFollowupMessage = () => {
      const text = elements.followupInput.value.trim();
      if (!text) {
        return;
      }
      addMessageToActiveThreadForPopout("user", text);
      addMessageToActiveThreadForPopout(
        "assistant",
        buildAssistantResponse("freeform", text)
      );
      elements.followupInput.value = "";
    };

    elements.followupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitFollowupMessage();
    });

    elements.followupInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitFollowupMessage();
      }
    });
  }

  if (elements.followupInput) {
    setupAutoGrowTextarea(elements.followupInput, 5, () => {
      applyLiveFeedPadding(elements);
      if (elements.isPinnedToBottom) {
        scrollFeedToBottom(elements);
      }
    });
  }

  applyLiveFeedPadding(elements);
  window.addEventListener("resize", () => {
    applyLiveFeedPadding(elements);
  });

  renderLiveThread();
};

const hydrateConversationState = () => {
  if (!conversationStore) {
    return;
  }
  if (!conversationState) {
    conversationState = conversationStore.createEmptyConversationState();
  }
  conversationStore.ensureActiveThread(conversationState);
  conversationStore.persistConversationState(conversationStorage, conversationState);
};

document.addEventListener("DOMContentLoaded", () => {
  if (isDevPopout) {
    document.addEventListener(
      "click",
      function (event) {
        const targetEl = /** @type {HTMLElement|null} */ (
          event ? event.target : null
        );
        console.info(
          "[BenefitsPopout] click",
          targetEl && targetEl.tagName
            ? targetEl.tagName
            : "unknown",
          event ? event.target : null
        );
      },
      true
    );
  }

  isDomReady = true;
  ensureWebviewLoadListeners();
  setToolState("idle");
  if (popoutNavigation && popoutNavigation.syncFromWebview) {
    popoutNavigation.syncFromWebview("");
  }
  setupQuickActions(document);
  hydrateConversationState();
  liveSurfaceElements = collectLiveAdvisorElements(advisorRoot || document);
  registerLiveAdvisorSurface(liveSurfaceElements);

  if (pendingPopoutInfo) {
    applyPopoutInfo(pendingPopoutInfo);
    pendingPopoutInfo = null;
  }
  if (hasBridge && window.benefitsPopout && window.benefitsPopout.requestInfo) {
    window.benefitsPopout.requestInfo();
  }
  if (infoTimeoutId) {
    window.clearTimeout(infoTimeoutId);
  }
  if (hasBridge) {
    infoTimeoutId = window.setTimeout(() => {
      if (hasPopoutInfo) {
        return;
      }
      setToolState("error", {
        errorCode: "init",
        errorDescription: "Popout data not received from host window.",
      });
    }, 2000);
  }

  if (window.advisorOwner && window.advisorOwner.setOwner) {
    window.advisorOwner.setOwner("benefits-popout");
  }

  if (reloadButtonEl) {
    reloadButtonEl.addEventListener("click", () => {
      if (!webviewEl || !webviewEl.getAttribute("src")) {
        return;
      }
      if (!webviewEl.isConnected) {
        // ===============================================================
        // WHY: Reload throws if the webview is not attached yet.
        // HOW: Require the element to be connected before calling reload.
        // ===============================================================
        return;
      }
      // ===============================================================
      // WHY: Reload should reset the lifecycle when the user retries.
      // HOW: Force a loading state and restart the timeout guard.
      // ===============================================================
      toolLoadSequence += 1;
      setToolState("loading");
      startToolLoadTimeout();
      runWhenWebviewReady(() => {
        webviewEl.reload();
      });
    });
  }
});
