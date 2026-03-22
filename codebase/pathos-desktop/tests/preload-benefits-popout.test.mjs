"use strict";

// =====================================================================
// WHY: Popout preload must expose a narrow, testable IPC surface.
// HOW: Mock Electron and assert intent-only IPC calls.
// =====================================================================
import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerBenefitsPopoutBridge } from "../src/preload-benefits-bridge.js";

const createBridgeMocks = () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    send: vi.fn(),
    on: vi.fn(),
  },
});

const getExposedApi = (contextBridge) => {
  const call = contextBridge.exposeInMainWorld.mock.calls.find(function (item) {
    return item[0] === "benefitsPopout";
  });
  return call ? call[1] : null;
};

describe("preload benefits popout bridge", function () {
  let contextBridge;
  let ipcRenderer;

  beforeEach(function () {
    const mocks = createBridgeMocks();
    contextBridge = mocks.contextBridge;
    ipcRenderer = mocks.ipcRenderer;
    registerBenefitsPopoutBridge({ contextBridge, ipcRenderer });
  });

  it("signals preload readiness", function () {
    expect(ipcRenderer.send).toHaveBeenCalledWith("benefits-popout-preload-ready");
  });

  it("registers info listeners only with functions", function () {
    const api = getExposedApi(contextBridge);
    api.onInfo("nope");
    api.onInfo(function () {});

    expect(ipcRenderer.on).toHaveBeenCalledTimes(1);
    expect(ipcRenderer.on).toHaveBeenCalledWith(
      "benefits-popout-info",
      expect.any(Function)
    );
  });

  it("sends close and request info intents", function () {
    const api = getExposedApi(contextBridge);
    api.close();
    api.requestInfo();

    expect(ipcRenderer.send).toHaveBeenCalledWith("benefits-popout-close");
    expect(ipcRenderer.send).toHaveBeenCalledWith("benefits-popout-request-info");
  });

  it("sends open external intent with payload", function () {
    const api = getExposedApi(contextBridge);
    api.openExternal("https://example.com");

    expect(ipcRenderer.send).toHaveBeenCalledWith(
      "benefits-popout-open-external",
      { url: "https://example.com" }
    );
  });
});
