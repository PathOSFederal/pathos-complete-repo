/* eslint-disable no-undef */
"use strict";

// ===============================================================
// WHY: Focus mode needs consistent class + toggle handling.
// HOW: Expose small helpers that work in the renderer and tests.
// ===============================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.PathOSFocusMode = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  var FOCUS_MODE_CLASS = "is-focus-mode";

  function normalizeFocusMode(value) {
    if (value === "focus") {
      return "focus";
    }
    return "overview";
  }

  function applyFocusModeState(elements, mode) {
    var nextMode = normalizeFocusMode(mode);
    var isFocus = nextMode === "focus";

    if (elements && elements.root && elements.root.classList) {
      elements.root.classList.toggle(FOCUS_MODE_CLASS, isFocus);
    }

    if (elements && elements.buttons && elements.buttons.length) {
      elements.buttons.forEach(function (button) {
        if (!button) {
          return;
        }
        var dataset = button.dataset || {};
        var buttonMode = normalizeFocusMode(dataset.focusMode);
        var isActive = buttonMode === nextMode;
        if (button.classList) {
          button.classList.toggle("is-active", isActive);
        }
        if (typeof button.setAttribute === "function") {
          button.setAttribute("aria-pressed", isActive ? "true" : "false");
        }
      });
    }

    return nextMode;
  }

  function setupFocusModeToggle(elements) {
    var currentMode = "overview";
    if (!elements || !elements.buttons || !elements.root) {
      return currentMode;
    }
    currentMode = applyFocusModeState(elements, currentMode);
    elements.buttons.forEach(function (button) {
      if (!button || typeof button.addEventListener !== "function") {
        return;
      }
      button.addEventListener("click", function () {
        var dataset = button.dataset || {};
        var nextMode = normalizeFocusMode(dataset.focusMode);
        if (nextMode === currentMode) {
          return;
        }
        currentMode = applyFocusModeState(elements, nextMode);
      });
    });
    return currentMode;
  }

  return {
    FOCUS_MODE_CLASS: FOCUS_MODE_CLASS,
    normalizeFocusMode: normalizeFocusMode,
    applyFocusModeState: applyFocusModeState,
    setupFocusModeToggle: setupFocusModeToggle,
  };
});
