# Day 50 — PathAdvisor composer UX and local reaction loop

**Date:** February 26, 2026  
**Type:** UX / Local-only behavior

---

## What Changed

Improved PathAdvisor composer UX and wired send behavior so the rail reacts to input with a minimal local-only reaction loop.

### 1. Focus highlight on composer

- Composer container (input + send button) now has a clear focus-within ring/border so the whole area highlights when the user focuses the input or button.
- Implemented via `focus-within:ring-2 focus-within:ring-offset-1 focus-within:ring-[var(--p-accent)]` on the composer wrapper.

### 2. Send behavior (Enter and click)

- Composer wrapped in a `<form onSubmit={handleSubmit}>` with `preventDefault`; send button is `type="submit"`.
- Both Enter and button click trigger the same submit path: user message is sent, input is cleared.
- No next/* or electron/* in shared UI; platform logic stays in adapters/app.

### 3. Messages and auto-scroll

- Messages array updates when the user sends (and when the app appends a simulated reply).
- Conversation window uses a ref and `useEffect` on `messages.length` to scroll to bottom when new messages are appended.

### 4. Local-only reaction loop (app-level)

- **Desktop app** (`apps/desktop/src/DesktopApp.tsx`) and **desktop-preview** (`app/desktop-preview/page.tsx`) own message state and pass `messages` + `onSend` to `PathAdvisorRail`.
- On send: append user message immediately, clear input (in card), then `setTimeout(..., 600)` to append a simulated assistant reply so the rail visibly reacts.
- Simulated reply copy preserves trust-first, local-only framing.

### Shared UI

- **PathAdvisorCard** (`packages/ui`): focus-within on composer wrapper, form submit, auto-scroll to bottom; no platform imports.
- **PathAdvisorRail** (`packages/ui`): optional controlled mode via `messages` and `onSend`; when both provided, app owns state and send behavior; otherwise rail uses internal state (unchanged behavior).

---

## Why This Matters

- Users can see where focus is (composer highlight) and get immediate feedback when they send (message appears, then a short delay and assistant reply).
- Interaction rhythm is evaluable without a backend; trust-first and local-only framing preserved.

---

## Technical Details

- No new dependencies.
- No changes to stores or persistence keys.
- Boundary rule: shared UI does not import next/* or electron/*; reaction loop lives in app-level rail usage only.
