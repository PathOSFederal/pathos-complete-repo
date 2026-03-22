"use strict";

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, it, expect } from "vitest";
import focusMode from "../../src/renderer/focus-mode.js";

function createClassList() {
  const items = new Set();
  return {
    add: function (value) {
      items.add(value);
    },
    remove: function (value) {
      items.delete(value);
    },
    toggle: function (value, force) {
      let shouldAdd = force;
      if (typeof force !== "boolean") {
        shouldAdd = !items.has(value);
      }
      if (shouldAdd) {
        items.add(value);
      } else {
        items.delete(value);
      }
      return items.has(value);
    },
    contains: function (value) {
      return items.has(value);
    },
  };
}

function createButton(mode) {
  const attributes = {};
  return {
    dataset: { focusMode: mode },
    classList: createClassList(),
    setAttribute: function (name, value) {
      attributes[name] = value;
    },
    getAttribute: function (name) {
      return attributes[name];
    },
    addEventListener: function (_event, handler) {
      this._handler = handler;
    },
    click: function () {
      if (this._handler) {
        this._handler();
      }
    },
  };
}

describe("focus mode helpers", function () {
  it("exposes a window helper when modules are unavailable", function () {
    const scriptPath = path.join(
      __dirname,
      "../../src/renderer/focus-mode.js"
    );
    const script = fs.readFileSync(scriptPath, "utf8");
    const sandbox = { window: {}, global: {} };
    vm.runInNewContext(script, sandbox);
    expect(typeof sandbox.window.PathOSFocusMode).toBe("object");
  });

  it("normalizes focus mode values", function () {
    expect(focusMode.normalizeFocusMode("focus")).toBe("focus");
    expect(focusMode.normalizeFocusMode("overview")).toBe("overview");
    expect(focusMode.normalizeFocusMode("unknown")).toBe("overview");
  });

  it("applies focus mode state to classes and aria", function () {
    const root = { classList: createClassList() };
    const overviewButton = createButton("overview");
    const focusButton = createButton("focus");
    const elements = {
      root: root,
      buttons: [overviewButton, focusButton],
    };

    const nextMode = focusMode.applyFocusModeState(elements, "focus");
    expect(nextMode).toBe("focus");
    expect(root.classList.contains(focusMode.FOCUS_MODE_CLASS)).toBe(true);
    expect(focusButton.classList.contains("is-active")).toBe(true);
    expect(overviewButton.classList.contains("is-active")).toBe(false);
    expect(focusButton.getAttribute("aria-pressed")).toBe("true");
    expect(overviewButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("returns overview when focus mode elements are missing", function () {
    const nextMode = focusMode.setupFocusModeToggle(null);
    expect(nextMode).toBe("overview");
  });

  it("ignores null buttons during updates", function () {
    const root = { classList: createClassList() };
    const elements = {
      root: root,
      buttons: [null],
    };
    const nextMode = focusMode.applyFocusModeState(elements, "focus");
    expect(nextMode).toBe("focus");
    expect(root.classList.contains(focusMode.FOCUS_MODE_CLASS)).toBe(true);
  });

  it("skips buttons without event handlers", function () {
    const root = { classList: createClassList() };
    const elements = {
      root: root,
      buttons: [{ dataset: { focusMode: "focus" } }],
    };
    const nextMode = focusMode.setupFocusModeToggle(elements);
    expect(nextMode).toBe("overview");
  });

  it("toggles focus mode when buttons are clicked", function () {
    const root = { classList: createClassList() };
    const overviewButton = createButton("overview");
    const focusButton = createButton("focus");
    const elements = {
      root: root,
      buttons: [overviewButton, focusButton],
    };

    const initialMode = focusMode.setupFocusModeToggle(elements);
    expect(initialMode).toBe("overview");
    expect(root.classList.contains(focusMode.FOCUS_MODE_CLASS)).toBe(false);

    focusButton.click();
    expect(root.classList.contains(focusMode.FOCUS_MODE_CLASS)).toBe(true);

    overviewButton.click();
    expect(root.classList.contains(focusMode.FOCUS_MODE_CLASS)).toBe(false);
  });

  it("keeps focus mode when clicking the active button", function () {
    const root = { classList: createClassList() };
    const overviewButton = createButton("overview");
    const elements = {
      root: root,
      buttons: [overviewButton],
    };

    focusMode.setupFocusModeToggle(elements);
    overviewButton.click();
    expect(root.classList.contains(focusMode.FOCUS_MODE_CLASS)).toBe(false);
    expect(overviewButton.getAttribute("aria-pressed")).toBe("true");
  });
});
