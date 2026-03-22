export const formatActivityLogTimestamp = () =>
  new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export const normalizeActivityErrorMessage = (error) => {
  if (!error) {
    return "";
  }
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error.message === "string"
        ? error.message
        : String(error);
  return raw.replace(/\s+/g, " ").trim().slice(0, 160);
};

// WHY: Thread timestamps should read like lightweight activity markers.
// HOW: Fall back gracefully if an ISO timestamp is missing or invalid.
export const formatTimestamp = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Just now";
  }
  return parsed.toLocaleString();
};

// WHY: Activity Log needs a consistent "current job" indicator.
// HOW: Match a selection against the active job id and return display flags.
export const buildActivityCurrentJobIndicator = (activeJobId, selection) => {
  if (!activeJobId || !selection || typeof selection !== "object") {
    return { isCurrent: false, label: "", disableSetCurrent: false };
  }
  const normalizedActive =
    typeof activeJobId === "string" ? activeJobId.trim() : "";
  if (!normalizedActive) {
    return { isCurrent: false, label: "", disableSetCurrent: false };
  }
  const candidates = [];
  if (typeof selection.jobId === "string") {
    candidates.push(selection.jobId.trim());
  }
  if (typeof selection.sourceJobId === "string") {
    candidates.push(selection.sourceJobId.trim());
  }
  if (typeof selection.postingUrl === "string") {
    candidates.push(selection.postingUrl.trim());
  }
  const isCurrent = candidates.some((candidate) => {
    return candidate && candidate === normalizedActive;
  });
  return {
    isCurrent,
    label: isCurrent ? "CURRENT" : "",
    disableSetCurrent: isCurrent,
  };
};

// WHY: User badge increments must always show a toast.
// HOW: Call the increment callback and fire the toast emitter together.
export const incrementBadgeWithToast = (payload) => {
  if (!payload || typeof payload !== "object") {
    return;
  }
  if (typeof payload.incrementBadge === "function") {
    payload.incrementBadge();
  }
  if (typeof payload.toast === "function") {
    payload.toast(payload.toastTitle || "", payload.toastBody || "");
  }
};

// ===============================================================
// WHY: Resume & Career requires consistent labeling across cards.
// HOW: Provide small helpers for agency abbreviations and timestamps.
// ===============================================================
export const formatResumeTimestamp = (value) => {
  if (!value || typeof value !== "string") {
    return "—";
  }
  return formatTimestamp(value);
};

export const deriveAgencyAbbrev = (agency) => {
  if (!agency || typeof agency !== "string") {
    return "";
  }
  const words = agency.replace(/[^a-zA-Z\s]/g, "").split(/\s+/);
  let abbrev = "";
  words.forEach(function (word) {
    if (word) {
      abbrev += word[0].toUpperCase();
    }
  });
  return abbrev || agency.trim().slice(0, 3).toUpperCase();
};

export const buildDecisionSummary = (thread) => {
  const lines = [];
  const title = thread.title && thread.title.trim() ? thread.title.trim() : "Untitled Decision";
  lines.push(title);
  lines.push("");
  lines.push("Context");
  lines.push(thread.context && thread.context.trim() ? thread.context.trim() : "-");
  lines.push("");
  lines.push("Key Factors");
  lines.push(thread.keyFactors && thread.keyFactors.trim() ? thread.keyFactors.trim() : "-");
  lines.push("");
  lines.push("Tradeoffs");
  lines.push(thread.tradeoffs && thread.tradeoffs.trim() ? thread.tradeoffs.trim() : "-");
  lines.push("");
  lines.push("Recommendation");
  lines.push(
    thread.recommendation && thread.recommendation.trim()
      ? thread.recommendation.trim()
      : "-"
  );
  lines.push("");
  lines.push("Next Steps");
  lines.push(thread.nextSteps && thread.nextSteps.trim() ? thread.nextSteps.trim() : "-");
  return lines.join("\n");
};
