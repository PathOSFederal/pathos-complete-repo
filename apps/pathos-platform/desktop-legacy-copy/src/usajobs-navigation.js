"use strict";

// ============================================
// USAJOBS NAVIGATION HANDLER (MAIN PROCESS)
// ============================================
// WHY: Centralize navigation behavior so main.js stays readable and testable.
// HOW: Provide a pure handler that accepts webContents + shell dependencies.
// ============================================
const HOME_URL = "https://www.usajobs.gov/";

// WHY: Guard against non-http(s) URLs crossing the trust boundary.
// HOW: Only allow explicit http/https schemes, otherwise no-op.
function isSafeExternalUrl(rawUrl) {
  if (typeof rawUrl !== "string") {
    return false;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return false;
  }
  return trimmed.indexOf("https://") === 0 || trimmed.indexOf("http://") === 0;
}

// WHY: Keep IPC actions deterministic and easy to unit test.
// HOW: Switch on the action and call only the allowed webContents APIs.
function handleUsaJobsNavigation(action, contents, shell) {
  if (!contents) {
    return;
  }
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
  if (action === "home") {
    contents.loadURL(HOME_URL);
    return;
  }
  if (action === "open-external") {
    const currentUrl = contents.getURL();
    const fallbackUrl = currentUrl || HOME_URL;
    if (isSafeExternalUrl(fallbackUrl) && shell && shell.openExternal) {
      shell.openExternal(fallbackUrl);
    }
  }
}

module.exports = {
  HOME_URL,
  handleUsaJobsNavigation,
  isSafeExternalUrl,
};
