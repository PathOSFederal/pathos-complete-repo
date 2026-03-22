# Day 53 Change Brief

## Summary
- USAJOBS stays inside the Workbench after viewport bounds are received.
- DevTools can be opened for the shell and the USAJOBS view via menu and hotkeys.
- PathAdvisor supports multi-thread conversation history with clear and export actions.
- Docked and detached PathAdvisor views stay in sync with consistent scroll behavior.

## Why it matters
The Workbench stays interactive and stable while USAJOBS loads, developers have reliable debugging access, and PathAdvisor conversations remain consistent across windows.

## What changed
- Guarded BrowserView attach and viewport updates to prevent overlay and click-blocking.
- Added DevTools entry points for the shell and the embedded USAJOBS view.
- Expanded PathAdvisor conversation UX with threads, history, and action parity.

## How to verify
- Launch the app and confirm USAJOBS renders inside the Workbench without covering the shell.
- Use the DevTools menu or hotkeys to open DevTools for the shell and USAJOBS.
- Send messages in PathAdvisor, switch threads, and confirm clear and export work.

## Risks / limitations
- Conversation history is local-only and has no cloud sync.
- Detached scroll and conversation pane sizing still need review.
