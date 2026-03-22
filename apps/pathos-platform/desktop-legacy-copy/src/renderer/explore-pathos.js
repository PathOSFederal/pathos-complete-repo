/* eslint-disable no-undef */
"use strict";

// ===============================================================
// WHY: Explore (PathOS) needs mock reasoning that is deterministic
//      and testable without a backend dependency.
// HOW: Provide a tiny UMD module so renderer logic and tests share
//      a single source of truth for prompt parsing + mock roles.
// ===============================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.PathOSExplorePathos = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  // ===============================================================
  // WHY: A default prompt keeps the Explore surface from feeling empty.
  // HOW: Provide a sample prompt that mirrors the mockup intent.
  // ===============================================================
  const DEFAULT_PROMPT =
    "I want to move into federal tech roles (2210) at GS-12/13. Open to hybrid or remote work, " +
    "willing to relocate for the right mission, and aiming for faster promotion momentum.";

  const EXAMPLE_PROMPTS = [
    DEFAULT_PROMPT,
    "Looking for program analysis roles (0343) with steady promotion, prefer staying in the Midwest.",
    "Interested in cybersecurity leadership tracks, open to relocation and flexible on agency.",
  ];

  // ===============================================================
  // WHY: Mock roles should always link to valid USAJOBS pages.
  // HOW: Build a stable search URL from the role title + series.
  // ===============================================================
  function buildUsajobsSearchUrl(role) {
    const title = role && typeof role.title === "string" ? role.title.trim() : "";
    const series = role && typeof role.series === "string" ? role.series.trim() : "";
    const keywords = [title, series].filter(Boolean).join(" ");
    const safeKeywords = keywords || "federal jobs";
    const params = [`k=${encodeURIComponent(safeKeywords)}`];
    if (series) {
      params.push(`j=${encodeURIComponent(series)}`);
    }
    return `https://www.usajobs.gov/Search/Results?${params.join("&")}`;
  }

  const MOCK_ROLES = [
    {
      id: "role-2210-cyber",
      title: "IT Cybersecurity Specialist",
      series: "2210",
      gradeBand: "GS-12/13",
      agency: "Department of Homeland Security",
      location: "Washington, DC",
      isRemoteEligible: true,
      usajobsUrl: buildUsajobsSearchUrl({
        title: "IT Cybersecurity Specialist",
        series: "2210",
      }),
    },
    {
      id: "role-2210-cloud",
      title: "Cloud Systems Engineer",
      series: "2210",
      gradeBand: "GS-12",
      agency: "General Services Administration",
      location: "Remote (United States)",
      isRemoteEligible: true,
      usajobsUrl: buildUsajobsSearchUrl({
        title: "Cloud Systems Engineer",
        series: "2210",
      }),
    },
    {
      id: "role-0343-program",
      title: "Program Analyst",
      series: "0343",
      gradeBand: "GS-11/12",
      agency: "Department of Veterans Affairs",
      location: "Chicago, IL",
      isRemoteEligible: false,
      usajobsUrl: buildUsajobsSearchUrl({
        title: "Program Analyst",
        series: "0343",
      }),
    },
    {
      id: "role-1101-lead",
      title: "Supervisory Business Analyst",
      series: "1101",
      gradeBand: "GS-12/13",
      agency: "Department of Commerce",
      location: "Denver, CO",
      isRemoteEligible: false,
      usajobsUrl: buildUsajobsSearchUrl({
        title: "Supervisory Business Analyst",
        series: "1101",
      }),
    },
  ];

  // ===============================================================
  // WHY: Prompt tokens anchor deterministic mock reasoning.
  // HOW: Use simple string matching to derive intent signals.
  // ===============================================================
  function buildIntentTokens(promptText) {
    const text = typeof promptText === "string" ? promptText.toLowerCase() : "";
    const tokens = {
      promotionTimeline: "steady",
      relocationOpenness: "open",
      seriesPreference: "open",
      remotePreference: "open",
    };

    if (
      text.indexOf("fast") !== -1 ||
      text.indexOf("accelerat") !== -1 ||
      text.indexOf("promotion") !== -1
    ) {
      tokens.promotionTimeline = "accelerated";
    }

    if (
      text.indexOf("stay") !== -1 ||
      text.indexOf("local") !== -1 ||
      text.indexOf("no relocation") !== -1
    ) {
      tokens.relocationOpenness = "local";
    }

    if (text.indexOf("remote") !== -1 || text.indexOf("telework") !== -1) {
      tokens.remotePreference = "prefers-remote";
    }

    const seriesMatch = text.match(/\b(\d{4})\b/);
    if (seriesMatch && seriesMatch[1]) {
      tokens.seriesPreference = seriesMatch[1];
    }

    return tokens;
  }

  // ===============================================================
  // WHY: Mock reasoning must feel tied to the prompt and job fields.
  // HOW: Combine intent tokens with job attributes to craft copy.
  // ===============================================================
  function buildRoleReasoning(job, tokens) {
    const summaryParts = [];
    if (tokens.seriesPreference !== "open" && tokens.seriesPreference === job.series) {
      summaryParts.push(`Matches your ${job.series} series focus.`);
    } else {
      summaryParts.push("Adjacent series keeps your options flexible.");
    }
    if (tokens.promotionTimeline === "accelerated") {
      summaryParts.push("Mid-grade band supports near-term growth.");
    } else {
      summaryParts.push("Promotion pace stays steady and structured.");
    }

    const promotionReason =
      tokens.promotionTimeline === "accelerated"
        ? "GS-12/13 band offers visible promotion steps."
        : "Banding supports predictable progression without sudden jumps.";
    const qualificationReason =
      tokens.seriesPreference !== "open" && tokens.seriesPreference === job.series
        ? `Series alignment builds on your ${job.series} preference.`
        : "Role keeps qualifications adjacent to your stated interests.";
    let locationReason = "";
    if (tokens.remotePreference === "prefers-remote" && job.isRemoteEligible) {
      locationReason = "Remote eligibility matches your flexibility goals.";
    } else if (tokens.relocationOpenness === "local" && !job.isRemoteEligible) {
      locationReason = "Local footprint keeps relocation minimal.";
    } else if (job.isRemoteEligible) {
      locationReason = "Remote option supports broader location flexibility.";
    } else {
      locationReason = "On-site location favors consistent collaboration.";
    }
    const benefitsReason =
      "Agency mission aligns with steady federal benefits expectations.";

    let tradeoff = "Role expectations may require a refined leadership narrative.";
    if (job.title.toLowerCase().indexOf("supervisory") !== -1) {
      tradeoff = "Supervisory scope may require a leadership narrative.";
    } else if (job.isRemoteEligible) {
      tradeoff = "Remote roles can be more competitive in qualification reviews.";
    }

    return {
      summary: summaryParts.join(" "),
      reasons: {
        promotion: promotionReason,
        qualification: qualificationReason,
        location: locationReason,
        benefits: benefitsReason,
      },
      tradeoff,
    };
  }

  // ===============================================================
  // WHY: PathAdvisor panel should summarize the current recommendation set.
  // HOW: Build a simple summary and reasoning bullets from tokens.
  // ===============================================================
  function buildAdvisorSummary(tokens, roles) {
    const seriesLabel =
      tokens.seriesPreference !== "open" ? `${tokens.seriesPreference} series` : "multiple series";
    const locationLabel =
      tokens.remotePreference === "prefers-remote"
        ? "remote-friendly roles"
        : tokens.relocationOpenness === "local"
          ? "local-first roles"
          : "flexible locations";
    const countLabel = Array.isArray(roles) ? roles.length : 0;

    return {
      summary: `Shortlisted ${countLabel} roles anchored in ${seriesLabel} with ${locationLabel}.`,
      reasons: {
        promotion:
          tokens.promotionTimeline === "accelerated"
            ? "Favoring bands with visible promotion steps."
            : "Balancing roles with steady growth paths.",
        qualification:
          tokens.seriesPreference !== "open"
            ? "Prioritizing series alignment with your prompt."
            : "Keeping series broad to maximize eligibility.",
        location:
          tokens.remotePreference === "prefers-remote"
            ? "Weighted remote-eligible postings higher."
            : tokens.relocationOpenness === "local"
              ? "Filtered to reduce relocation pressure."
              : "Treating relocation as an acceptable option.",
        benefits: "Federal benefits impact remains directional at this stage.",
      },
    };
  }

  // ===============================================================
  // WHY: Renderer needs a single helper to generate the mock response.
  // HOW: Clone the base mock roles and attach reasoning + advisor data.
  // ===============================================================
  function buildExploreRecommendations(promptText) {
    const tokens = buildIntentTokens(promptText);
    const roles = [];
    for (let i = 0; i < MOCK_ROLES.length; i += 1) {
      const job = MOCK_ROLES[i];
      const reasoning = buildRoleReasoning(job, tokens);
      roles.push(
        Object.assign({}, job, {
          reasoning,
        })
      );
    }

    const advisor = buildAdvisorSummary(tokens, roles);
    return {
      prompt: typeof promptText === "string" ? promptText : "",
      intentTokens: tokens,
      roles,
      advisor,
    };
  }

  function getExamplePrompt(index) {
    if (typeof index !== "number" || index < 0) {
      return EXAMPLE_PROMPTS[0];
    }
    return EXAMPLE_PROMPTS[index % EXAMPLE_PROMPTS.length];
  }

  return {
    DEFAULT_PROMPT,
    EXAMPLE_PROMPTS: EXAMPLE_PROMPTS.slice(0),
    buildIntentTokens,
    buildExploreRecommendations,
    getExamplePrompt,
  };
});
