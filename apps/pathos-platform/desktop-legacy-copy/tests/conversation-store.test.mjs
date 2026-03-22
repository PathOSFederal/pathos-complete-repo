"use strict";

// =====================================================================
// WHY: Conversation store must protect persisted state and mutations.
// HOW: Exercise sanitizers, state helpers, and export formatting.
// =====================================================================
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import conversationStore from "../src/renderer/conversation-store.js";

const {
  DEFAULT_THREAD_TITLE_PREFIX,
  createEmptyConversationState,
  createThreadInState,
  sanitizeConversationMessage,
  sanitizeConversationState,
  ensureActiveThread,
  addMessageToActiveThread,
  deleteThread,
  exportThreadMarkdown,
  exportThreadJson,
} = conversationStore;

describe("conversation-store helpers", function () {
  beforeEach(function () {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });

  afterEach(function () {
    vi.useRealTimers();
  });

  it("sanitizes conversation messages with safe defaults", function () {
    const cases = [
      { input: null, expected: null },
      { input: "nope", expected: null },
      { input: {}, expected: "assistant" },
      { input: { role: "user", content: "Hello" }, expected: "user" },
    ];

    cases.forEach(function (testCase) {
      const result = sanitizeConversationMessage(testCase.input);
      if (testCase.expected === null) {
        expect(result).toBe(null);
        return;
      }
      expect(result).toBeTruthy();
      expect(result.role).toBe(testCase.expected);
      expect(typeof result.id).toBe("string");
      expect(typeof result.createdAt).toBe("string");
    });
  });

  it("repairs invalid state and active thread references", function () {
    const state = sanitizeConversationState({
      threads: [
        {
          id: "thread-1",
          title: "Alpha",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          messages: [],
        },
      ],
      activeThreadId: "missing-thread",
      threadCounter: 0,
    });

    expect(state.activeThreadId).toBe("thread-1");
    expect(state.threadCounter).toBeGreaterThan(0);
    expect(state.threads.length).toBe(1);
  });

  it("ensures an active thread exists", function () {
    const state = createEmptyConversationState();

    ensureActiveThread(state);

    expect(state.threads.length).toBe(1);
    expect(state.activeThreadId).toBe(state.threads[0].id);
  });

  it("updates the default title on first user message", function () {
    const state = createEmptyConversationState();
    const thread = createThreadInState(state);

    expect(thread.title.indexOf(DEFAULT_THREAD_TITLE_PREFIX)).toBe(0);

    addMessageToActiveThread(state, "user", "Hello world from the user prompt");

    const updatedThread = state.threads[0];
    expect(updatedThread.messages.length).toBe(1);
    expect(updatedThread.title).toBe("Hello world from the user prompt");
  });

  it("recreates a thread when the last one is deleted", function () {
    const state = createEmptyConversationState();
    const thread = createThreadInState(state);

    deleteThread(state, thread.id);

    expect(state.threads.length).toBe(1);
    expect(state.activeThreadId).toBe(state.threads[0].id);
  });

  it("exports threads to markdown and json", function () {
    const state = createEmptyConversationState();
    const thread = createThreadInState(state);

    addMessageToActiveThread(state, "user", "First message");

    const markdown = exportThreadMarkdown(thread);
    const json = exportThreadJson(thread);

    expect(markdown).toContain("#");
    expect(markdown).toContain("**You:** First message");
    expect(json).toContain('"conversationId"');
  });
});
