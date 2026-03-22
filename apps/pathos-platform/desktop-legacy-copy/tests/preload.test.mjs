"use strict";

// =====================================================================
// WHY: Preload bridges must only expose intent-only IPC helpers.
// HOW: Mock Electron and assert IPC wiring without real Electron modules.
// =====================================================================
import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerWorkbenchBridge } from "../src/preload-bridge.js";

const createBridgeMocks = () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    send: vi.fn(),
    on: vi.fn(),
    invoke: vi.fn(),
  },
});

const getExposedApis = (contextBridge) => {
  const exposures = {};
  contextBridge.exposeInMainWorld.mock.calls.forEach(function (call) {
    exposures[call[0]] = call[1];
  });
  return exposures;
};

describe("preload IPC bridge", function () {
  let contextBridge;
  let ipcRenderer;

  beforeEach(function () {
    const mocks = createBridgeMocks();
    contextBridge = mocks.contextBridge;
    ipcRenderer = mocks.ipcRenderer;
    registerWorkbenchBridge({ contextBridge, ipcRenderer });
  });

  it("wires workbench rail collapse intent", function () {
    const apis = getExposedApis(contextBridge);
    apis.workbench.setRailCollapsed("truthy");

    expect(ipcRenderer.send).toHaveBeenCalledWith(
      "workbench:setRailCollapsed",
      true
    );
  });

  it("registers rail collapse listeners only for functions", function () {
    const apis = getExposedApis(contextBridge);
    apis.workbench.onRailCollapsedChanged("nope");
    apis.workbench.onRailCollapsedChanged(function () {});

    expect(ipcRenderer.on).toHaveBeenCalledTimes(1);
    expect(ipcRenderer.on).toHaveBeenCalledWith(
      "workbench:railCollapsedChanged",
      expect.any(Function)
    );
  });

  it("guards workbench viewport workspace updates", function () {
    const apis = getExposedApis(contextBridge);
    apis.workbenchViewport.setActiveWorkspace(" ");
    apis.workbenchViewport.setActiveWorkspace("explore");

    expect(ipcRenderer.send).toHaveBeenCalledTimes(1);
    expect(ipcRenderer.send).toHaveBeenCalledWith(
      "workspace:set-active",
      "explore"
    );
  });

  it("sends navigation intent for USAJOBS controls", function () {
    const apis = getExposedApis(contextBridge);
    apis.usajobsControls.goBack();

    expect(ipcRenderer.send).toHaveBeenCalledWith("usajobs-nav", "back");
  });

  it("uses invoke for benefits popout requests", async function () {
    const apis = getExposedApis(contextBridge);
    const payload = { url: "https://example.com" };

    await apis.benefitsPopout.open(payload);
    await apis.benefitsPopout.close();

    expect(ipcRenderer.invoke).toHaveBeenCalledWith(
      "benefits:openToolPopout",
      payload
    );
    expect(ipcRenderer.invoke).toHaveBeenCalledWith("benefits:closeToolPopout");
  });

  it("routes pathadvisor thread updates through invoke", async function () {
    const apis = getExposedApis(contextBridge);
    const thread = { messages: [] };

    await apis.pathadvisorThreads.updateLiveThread(thread);

    expect(ipcRenderer.invoke).toHaveBeenCalledWith(
      "pathadvisor:updateLiveThread",
      thread
    );
  });

  it("sends alerts popover intents", function () {
    const apis = getExposedApis(contextBridge);
    apis.alertsPopover.viewAll();

    expect(ipcRenderer.send).toHaveBeenCalledWith("alertsPopover:viewAll");
  });

  it("routes backend requests through invoke", async function () {
    const apis = getExposedApis(contextBridge);

    await apis.pathosBackend.health();
    await apis.pathosBackend.desktopInfo();
    await apis.pathosBackend.auditRecent(5);
    await apis.pathosBackend.threadRecent(3);

    expect(ipcRenderer.invoke).toHaveBeenCalledWith("backend:health");
    expect(ipcRenderer.invoke).toHaveBeenCalledWith("backend:desktopInfo");
    expect(ipcRenderer.invoke).toHaveBeenCalledWith("backend:auditRecent", 5);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith("backend:threadRecent", 3);
  });
});
