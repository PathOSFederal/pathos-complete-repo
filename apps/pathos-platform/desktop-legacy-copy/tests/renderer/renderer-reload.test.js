/* @vitest-environment jsdom */
"use strict";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const buildDom = ({ includeButton } = {}) => {
  document.body.innerHTML = `
    <div id="renderer-error-banner" hidden>
      <span class="renderer-error-banner__message"></span>
      ${
        includeButton
          ? '<button id="renderer-reload-btn" type="button">Reload</button>'
          : ""
      }
    </div>
  `;
};

let originalLocation = null;
let locationOverridden = false;

const ensureLocationReloadSpyable = () => {
  const locationProto = Object.getPrototypeOf(window.location);
  if (!locationProto.reload) {
    Object.defineProperty(locationProto, "reload", {
      value: () => {},
      configurable: true,
      writable: true,
    });
  }
  const locationDescriptor = Object.getOwnPropertyDescriptor(window, "location");
  if (locationDescriptor && locationDescriptor.configurable && !locationOverridden) {
    originalLocation = window.location;
    const proxyLocation = Object.create(locationProto);
    Object.defineProperties(proxyLocation, {
      pathname: { get: () => originalLocation.pathname },
      search: { get: () => originalLocation.search },
      href: { get: () => originalLocation.href },
    });
    Object.defineProperty(window, "location", {
      value: proxyLocation,
      configurable: true,
      writable: true,
    });
    locationOverridden = true;
  }
  return locationProto;
};

const loadRenderer = async () => {
  return import("../../src/renderer/renderer.js");
};

const resetRendererGlobals = () => {
  delete window.__PATHOS_RENDERER_BOOTED__;
  delete window.__PATHOS_RENDERER_READY__;
};

describe("renderer reload button", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    vi.resetModules();
    resetRendererGlobals();
    delete window.workbench;
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete window.workbench;
    resetRendererGlobals();
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
    }
    if (locationOverridden) {
      const locationDescriptor = Object.getOwnPropertyDescriptor(window, "location");
      if (locationDescriptor && locationDescriptor.configurable && originalLocation) {
        Object.defineProperty(window, "location", {
          value: originalLocation,
          configurable: true,
          writable: true,
        });
      }
      locationOverridden = false;
      originalLocation = null;
    }
  });

  it("uses the workbench reload helper when available", async () => {
    buildDom({ includeButton: true });
    const workbenchReload = vi.fn();
    window.workbench = { reload: workbenchReload };
    const locationProto = ensureLocationReloadSpyable();
    const reloadSpy = vi.spyOn(locationProto, "reload").mockImplementation(() => {});

    const { wireRendererReloadButton } = await loadRenderer();
    wireRendererReloadButton(document, {
      workbench: window.workbench,
      location: window.location,
    });

    document.getElementById("renderer-reload-btn").click();

    expect(workbenchReload).toHaveBeenCalledTimes(1);
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("falls back to location.reload when no helper is available", async () => {
    buildDom({ includeButton: true });
    window.workbench = {};
    const locationProto = ensureLocationReloadSpyable();
    const reloadSpy = vi.spyOn(locationProto, "reload").mockImplementation(() => {});

    const { wireRendererReloadButton } = await loadRenderer();
    wireRendererReloadButton(document, {
      workbench: window.workbench,
      location: window.location,
    });

    document.getElementById("renderer-reload-btn").click();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the reload button is missing", async () => {
    buildDom({ includeButton: false });
    const locationProto = ensureLocationReloadSpyable();
    const reloadSpy = vi.spyOn(locationProto, "reload").mockImplementation(() => {});

    const { wireRendererReloadButton } = await loadRenderer();
    wireRendererReloadButton(document, {
      workbench: window.workbench,
      location: window.location,
    });

    expect(document.getElementById("renderer-reload-btn")).toBeNull();
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
