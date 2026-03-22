"use strict";

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createBackendClient } = require("../src/backend-client.js");

const makeResponse = ({ status, payload, headers }) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: {
    get(name) {
      if (!headers) {
        return null;
      }
      const key = Object.keys(headers).find((entry) => entry.toLowerCase() === String(name).toLowerCase());
      return key ? headers[key] : null;
    },
  },
  async text() {
    if (payload === null || payload === undefined) {
      return "";
    }
    return typeof payload === "string" ? payload : JSON.stringify(payload);
  },
});

describe("backend client result contract", function () {
  it("maps 401 error contract to ok:false with requestId", async function () {
    const fetchImpl = async function () {
      return makeResponse({
        status: 401,
        payload: {
          error: {
            code: "UNAUTHORIZED",
            message: "Missing bearer token",
            requestId: "req-401",
          },
        },
        headers: {
          "X-Request-ID": "req-header-ignored",
        },
      });
    };
    const client = createBackendClient({ fetchImpl });

    const result = await client.getDesktopInfo();

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.status).toBe(401);
    expect(result.error.code).toBe("UNAUTHORIZED");
    expect(result.error.message).toBe("Missing bearer token");
    expect(result.error.requestId).toBe("req-401");
  });

  it("maps 403 with header requestId when body omits it", async function () {
    const fetchImpl = async function () {
      return makeResponse({
        status: 403,
        payload: {
          error: {
            code: "FORBIDDEN",
            message: "Invalid key",
          },
        },
        headers: {
          "X-Request-ID": "req-403",
        },
      });
    };
    const client = createBackendClient({ fetchImpl });

    const result = await client.getAuditRecent(5);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.status).toBe(403);
    expect(result.error.code).toBe("FORBIDDEN");
    expect(result.error.message).toBe("Invalid key");
    expect(result.error.requestId).toBe("req-403");
  });

  it("posts jobs search payload to backend /jobs/search", async function () {
    let capturedUrl = "";
    let capturedOptions = null;
    const fetchImpl = async function (url, options) {
      capturedUrl = url;
      capturedOptions = options;
      return makeResponse({
        status: 200,
        payload: {
          results: [],
        },
      });
    };
    const client = createBackendClient({
      fetchImpl,
      config: {
        backendUrl: "http://127.0.0.1:8000/api/v1",
        apiKey: "abc123",
      },
    });

    const result = await client.searchJobs({
      keyword: "2210",
      page: 1,
      page_size: 10,
      remote_only: true,
    });

    expect(result.ok).toBe(true);
    expect(capturedUrl).toBe("http://127.0.0.1:8000/api/v1/jobs/search");
    expect(capturedOptions).toBeTruthy();
    if (!capturedOptions) {
      return;
    }
    expect(capturedOptions.method).toBe("POST");
    expect(capturedOptions.headers.Authorization).toBe("Bearer abc123");
    expect(capturedOptions.headers["Content-Type"]).toBe("application/json");
    expect(capturedOptions.body).toBe(
      JSON.stringify({
        keyword: "2210",
        page: 1,
        page_size: 10,
        remote_only: true,
      })
    );
  });

  it("normalizes invalid jobs search payload into safe defaults", async function () {
    let capturedOptions = null;
    const fetchImpl = async function (_url, options) {
      capturedOptions = options;
      return makeResponse({
        status: 200,
        payload: {
          results: [],
        },
      });
    };
    const client = createBackendClient({ fetchImpl });

    await client.searchJobs({
      keyword: "  ",
      page: 0,
      page_size: -1,
    });

    expect(capturedOptions).toBeTruthy();
    if (!capturedOptions) {
      return;
    }
    expect(capturedOptions.body).toBe(
      JSON.stringify({
        keyword: "",
        page: 1,
        page_size: 10,
      })
    );
  });
});
