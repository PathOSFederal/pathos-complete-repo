"use strict";

// ===============================================================
// WHY: This module is the desktop main-process backend adapter.
// HOW: It centralizes trusted backend HTTP calls so renderer code
//      never performs direct backend fetches or sees secrets.
// ===============================================================

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000/api/v1";
const DEFAULT_API_KEY = "desktop-dev-key";

const normalizeBaseUrl = (rawUrl) => {
  if (typeof rawUrl !== "string") {
    return DEFAULT_BACKEND_URL;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return DEFAULT_BACKEND_URL;
  }
  return trimmed.replace(/\/+$/, "");
};

const normalizeLimit = (limit, fallback = 5) => {
  const parsed = Number.parseInt(String(limit), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, 100);
};

const readBackendConfig = (env = process.env) => ({
  backendUrl: normalizeBaseUrl(env.PATHOS_BACKEND_URL || DEFAULT_BACKEND_URL),
  apiKey:
    typeof env.PATHOS_API_KEY === "string" && env.PATHOS_API_KEY.trim()
      ? env.PATHOS_API_KEY.trim()
      : DEFAULT_API_KEY,
});

const parseResponseBody = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (_error) {
    return text;
  }
};

const isErrorContract = (payload) => {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  if (!payload.error || typeof payload.error !== "object") {
    return false;
  }
  return typeof payload.error.message === "string";
};

const buildBackendError = (response, payload, fallbackText) => {
  const requestIdFromHeader = response.headers.get("X-Request-ID");
  let code = "HTTP_ERROR";
  let message = fallbackText || `Request failed with status ${response.status}`;
  let requestId = requestIdFromHeader || "";

  if (isErrorContract(payload)) {
    if (typeof payload.error.code === "string" && payload.error.code.trim()) {
      code = payload.error.code.trim();
    }
    if (typeof payload.error.message === "string" && payload.error.message.trim()) {
      message = payload.error.message.trim();
    }
    if (typeof payload.error.requestId === "string" && payload.error.requestId.trim()) {
      requestId = payload.error.requestId.trim();
    }
  }

  return {
    status: response.status,
    code,
    message,
    requestId,
  };
};

// ===============================================================
// WHY: Backend search expects a predictable contract that is safe
//      to serialize over IPC from renderer to main.
// HOW: Keep required fields explicit (`keyword`) and normalize
//      optional filters so main sends stable JSON to `/jobs/search`.
// INPUT: `rawPayload` from renderer intent.
// OUTPUT: Sanitized payload object accepted by backend.
// ERROR: Never throws; falls back to defaults.
// ===============================================================
const normalizeJobsSearchPayload = (rawPayload) => {
  const payload = rawPayload && typeof rawPayload === "object" ? rawPayload : {};
  const keyword =
    typeof payload.keyword === "string" && payload.keyword.trim()
      ? payload.keyword.trim()
      : "";
  const location =
    typeof payload.location === "string" && payload.location.trim()
      ? payload.location.trim()
      : "";
  const pageValue = Number.parseInt(String(payload.page), 10);
  const pageSizeValue = Number.parseInt(String(payload.page_size), 10);

  const normalized = {
    keyword,
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
    page_size:
      Number.isFinite(pageSizeValue) && pageSizeValue > 0
        ? Math.min(pageSizeValue, 100)
        : 10,
  };

  if (location) {
    normalized.location = location;
  }
  if (typeof payload.remote_only === "boolean") {
    normalized.remote_only = payload.remote_only;
  }
  return normalized;
};

// ===============================================================
// WHY: Main process needs one request path for GET and POST calls.
// HOW: This helper builds headers, optional JSON body, and returns
//      the backend result envelope used by IPC handlers.
// INPUT: Relative path + request options.
// OUTPUT: `{ ok:true,data }` on success or `{ ok:false,error }`.
// ERROR: Converts HTTP failures into normalized error contracts.
// ===============================================================
const createBackendClient = (options = {}) => {
  const config = options.config || readBackendConfig(options.env);
  const fetchImpl =
    typeof options.fetchImpl === "function" ? options.fetchImpl : fetch;

  const request = async (path, requestOptions = {}) => {
    const includeAuth = requestOptions.includeAuth !== false;
    const method =
      typeof requestOptions.method === "string" && requestOptions.method.trim()
        ? requestOptions.method.trim().toUpperCase()
        : "GET";
    const headers = {
      "Content-Type": "application/json",
    };
    if (includeAuth) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }
    const fetchOptions = {
      method,
      headers,
    };
    if (Object.prototype.hasOwnProperty.call(requestOptions, "body")) {
      fetchOptions.body = JSON.stringify(requestOptions.body);
    }
    const response = await fetchImpl(`${config.backendUrl}${path}`, fetchOptions);
    const payload = await parseResponseBody(response);
    if (!response.ok) {
      const fallbackText =
        typeof payload === "string" ? payload : `Backend request failed (${response.status})`;
      return {
        ok: false,
        error: buildBackendError(response, payload, fallbackText),
      };
    }
    return {
      ok: true,
      data: payload,
    };
  };

  return {
    getHealth() {
      return request("/health", { includeAuth: false });
    },
    getDesktopInfo() {
      return request("/desktop/info");
    },
    getAuditRecent(limit) {
      const safeLimit = normalizeLimit(limit, 5);
      return request(`/audit/recent?limit=${safeLimit}`);
    },
    getThreadRecent(limit) {
      const safeLimit = normalizeLimit(limit, 5);
      return request(`/threads/recent?limit=${safeLimit}`);
    },
    // ===============================================================
    // WHY: Desktop search should call trusted backend search instead of
    //      scraping or direct renderer networking to external sites.
    // HOW: POST a normalized payload to `/jobs/search` and preserve the
    //      same response envelope used by other backend client methods.
    // INPUT: search filters from renderer IPC intent.
    // OUTPUT: `{ ok, data|error }` backend envelope.
    // ERROR: Invalid backend responses are normalized into `error`.
    // ===============================================================
    searchJobs(payload) {
      const normalizedPayload = normalizeJobsSearchPayload(payload);
      return request("/jobs/search", {
        method: "POST",
        body: normalizedPayload,
      });
    },
  };
};

module.exports = {
  DEFAULT_BACKEND_URL,
  DEFAULT_API_KEY,
  createBackendClient,
  normalizeLimit,
  normalizeJobsSearchPayload,
  readBackendConfig,
};
