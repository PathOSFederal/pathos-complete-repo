"use strict";

// ===============================================================
// WHY: Keep main-process logic testable without Electron.
// HOW: Extract pure helpers for sanitization and validation.
// ===============================================================

const createLiveAdvisorThread = () => ({ messages: [] });

const createDecisionThread = () => ({
  title: "",
  context: "",
  keyFactors: "",
  tradeoffs: "",
  recommendation: "",
  nextSteps: "",
});

const sanitizeStringArray = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }
  const cleaned = [];
  items.forEach((value) => {
    if (typeof value === "string") {
      cleaned.push(value);
    }
  });
  return cleaned;
};

// ===============================================================
// WHY: Conversations must be safe to sync across multiple windows.
// HOW: Sanitize message shape before storing it in main process.
// ===============================================================
const sanitizeLiveMessage = (message) => {
  if (!message || typeof message !== "object") {
    return null;
  }
  const id =
    typeof message.id === "string" && message.id.length
      ? message.id
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const role =
    message.role === "user" || message.role === "assistant"
      ? message.role
      : "assistant";
  const content = typeof message.content === "string" ? message.content : "";
  return { id, role, content };
};

const sanitizeLiveAdvisorThread = (thread, fallback) => {
  const base = fallback || createLiveAdvisorThread();
  if (!thread || typeof thread !== "object") {
    return base;
  }
  const messages = [];
  if (Array.isArray(thread.messages)) {
    thread.messages.forEach((item) => {
      const safeMessage = sanitizeLiveMessage(item);
      if (safeMessage) {
        messages.push(safeMessage);
      }
    });
  }
  return { messages };
};

const sanitizeDecisionThread = (thread, fallback) => {
  const base = fallback || createDecisionThread();
  if (!thread || typeof thread !== "object") {
    return base;
  }
  return {
    title: typeof thread.title === "string" ? thread.title : base.title,
    context: typeof thread.context === "string" ? thread.context : base.context,
    keyFactors:
      typeof thread.keyFactors === "string" ? thread.keyFactors : base.keyFactors,
    tradeoffs:
      typeof thread.tradeoffs === "string" ? thread.tradeoffs : base.tradeoffs,
    recommendation:
      typeof thread.recommendation === "string"
        ? thread.recommendation
        : base.recommendation,
    nextSteps:
      typeof thread.nextSteps === "string" ? thread.nextSteps : base.nextSteps,
  };
};

// ===============================================================
// WHY: Avoid multiple live advisors across the main window + popout.
// HOW: Track a single owner and validate changes.
// ===============================================================
const isValidAdvisorSurfaceOwner = (owner) =>
  owner === "main" || owner === "benefits-popout";

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

module.exports = {
  createLiveAdvisorThread,
  createDecisionThread,
  sanitizeStringArray,
  sanitizeLiveMessage,
  sanitizeLiveAdvisorThread,
  sanitizeDecisionThread,
  isValidAdvisorSurfaceOwner,
  isAllowedExternalUrl,
};
