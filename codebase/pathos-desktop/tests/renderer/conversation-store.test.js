"use strict";

import { describe, it, expect } from "vitest";
import store from "../../src/renderer/conversation-store.js";

const createMemoryStorage = function () {
  const data = {};
  return {
    getItem: function (key) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        return data[key];
      }
      return null;
    },
    setItem: function (key, value) {
      data[key] = value;
    },
  };
};

describe("conversation store persistence", function () {
  it("createThreadInState sets the active thread id", function () {
    const state = store.createEmptyConversationState();
    const thread = store.createThreadInState(state);

    expect(state.activeThreadId).toBeTruthy();
    expect(state.activeThreadId).toBe(thread.id);
    expect(state.threads.length).toBe(1);
  });

  it("addMessageToActiveThread persists and restores messages", function () {
    const storage = createMemoryStorage();
    const state = store.createEmptyConversationState();

    store.createThreadInState(state);
    store.addMessageToActiveThread(state, "user", "Hello PathAdvisor");
    store.persistConversationState(storage, state);

    const restored = store.loadConversationState(storage);
    store.ensureActiveThread(restored);

    expect(restored.threads.length).toBe(1);
    expect(restored.threads[0].messages.length).toBe(1);
    expect(restored.threads[0].messages[0].role).toBe("user");
    expect(restored.threads[0].messages[0].content).toBe("Hello PathAdvisor");
  });
});
