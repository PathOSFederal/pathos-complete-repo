"use strict";

// ===============================================================
// WHY: Resume & Career needs a consistent current job view model.
// HOW: Map SelectedJob data into UI-ready fields and actions.
// ===============================================================

export const RESUME_CURRENT_JOB_ACTIONS = {
  VIEW_POSTING: "resume-current-job-view-posting",
  CLEAR_SELECTION: "resume-current-job-clear-selection",
};

export const buildResumeCurrentJobViewModel = (selectedJob) => {
  const hasSelection = Boolean(selectedJob && selectedJob.postingUrl);
  if (!hasSelection) {
    return {
      hasSelection: false,
      title: "No job selected yet",
      summary: "Select a job in Job Search to set context.",
      meta: "",
      sourceBadge: "",
      postingUrl: "",
    };
  }

  const summaryParts = [];
  if (selectedJob.agency) {
    summaryParts.push(selectedJob.agency);
  }
  if (selectedJob.location) {
    summaryParts.push(selectedJob.location);
  }
  if (selectedJob.grade) {
    summaryParts.push(selectedJob.grade);
  }

  const titleCopy =
    selectedJob.title ||
    (selectedJob.source === "USAJOBS" ? "Selected USAJOBS posting" : "Selected job");

  return {
    hasSelection: true,
    title: titleCopy,
    summary: summaryParts.length
      ? summaryParts.join(" · ")
      : "Posting link saved for reference.",
    meta: selectedJob.postingUrl || "",
    sourceBadge: selectedJob.source || "USAJOBS",
    postingUrl: selectedJob.postingUrl || "",
  };
};

export const buildResumeCurrentJobActionState = (selectedJob) => {
  const hasSelection = Boolean(selectedJob && selectedJob.postingUrl);
  return [
    {
      id: RESUME_CURRENT_JOB_ACTIONS.VIEW_POSTING,
      label: "View Posting",
      isVisible: hasSelection,
      isEnabled: Boolean(selectedJob && selectedJob.postingUrl),
    },
    {
      id: RESUME_CURRENT_JOB_ACTIONS.CLEAR_SELECTION,
      label: "Clear selection",
      isVisible: hasSelection,
      isEnabled: true,
    },
  ];
};

export const buildResumeCurrentJobActionOutput = (actionId, selectedJob) => {
  if (actionId === RESUME_CURRENT_JOB_ACTIONS.VIEW_POSTING) {
    if (!selectedJob || !selectedJob.postingUrl) {
      return null;
    }
    return { type: "open-posting", url: selectedJob.postingUrl };
  }
  if (actionId === RESUME_CURRENT_JOB_ACTIONS.CLEAR_SELECTION) {
    return { type: "clear-selection" };
  }
  return null;
};
