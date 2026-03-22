/* eslint-disable no-undef */
"use strict";

// =====================================================================
// WHY: USAJOBS helpers must stay deterministic and shareable in tests.
// HOW: Provide a tiny UMD module for URL validation and fallbacks.
// =====================================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.PathOSUsaJobsHelpers = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  // Origin gating happens here so popouts only receive trusted USAJOBS URLs.
  // Popout only renders the provided URL and handles runtime 404 fallback as a last-resort UX guard.
  const USAJOBS_ALLOWED_PREFIX = "https://www.usajobs.gov/";
  const USAJOBS_SEARCH_URL = "https://www.usajobs.gov/Search/Results";

  const isValidUsaJobsUrl = (rawUrl) => {
    if (typeof rawUrl !== "string") {
      return false;
    }
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return false;
    }
    return trimmed.indexOf(USAJOBS_ALLOWED_PREFIX) === 0;
  };

  const buildUsaJobsFallbackUrl = (role) => {
    const title = role && typeof role.title === "string" ? role.title.trim() : "";
    const series = role && typeof role.series === "string" ? role.series.trim() : "";
    const keywords = [title, series].filter(Boolean).join(" ");
    const safeKeywords = keywords || "federal jobs";
    const params = [`k=${encodeURIComponent(safeKeywords)}`];
    if (series) {
      params.push(`j=${encodeURIComponent(series)}`);
    }
    return `${USAJOBS_SEARCH_URL}?${params.join("&")}`;
  };

  const resolveUsaJobsReferenceUrl = (role) => {
    const rawUrl =
      role && typeof role.usajobsUrl === "string" ? role.usajobsUrl.trim() : "";
    if (isValidUsaJobsUrl(rawUrl)) {
      return rawUrl;
    }
    const fallbackUrl = buildUsaJobsFallbackUrl(role);
    console.warn("[ExplorePathOS] USAJOBS URL invalid; using fallback.", {
      roleId: role && role.id ? role.id : "",
      url: rawUrl,
      fallbackUrl,
    });
    return fallbackUrl;
  };

  const isAllowedBenefitsUrl = (rawUrl) => {
    if (typeof rawUrl !== "string") {
      return false;
    }
    const trimmed = rawUrl.trim();
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

  return {
    isValidUsaJobsUrl,
    buildUsaJobsFallbackUrl,
    resolveUsaJobsReferenceUrl,
    isAllowedBenefitsUrl,
  };
});
