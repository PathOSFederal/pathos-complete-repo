# Day 53 — USAJOBS BrowserView Guard + DevTools Access

## Ticket metadata
- Day: 53
- Branch: feature/day-53-pathadvisor-chat-and-detach-fix
- Goal: Prevent USAJOBS BrowserView from covering the shell and provide reliable DevTools access.
- Scope: main process BrowserView lifecycle, devtools menu/IPC, diagnostics.

## What changed and why
- Delayed attaching the USAJOBS BrowserView until a valid workbench viewport arrives, preventing full-window overlays when the renderer never reports bounds.
- Added last-known-good viewport guarding plus minimum size checks so invalid sizes never override the shell.
- Added devtools menu + IPC handlers for main window and USAJOBS view to restore reliable debugging paths.
- Expanded USAJOBS failure logging with bounds/attached diagnostics and a one-time initial load log.

## Manual test checklist
- [ ] `pnpm dev` → confirm shell stays clickable before viewport (not verified)
- [ ] `pnpm dev` → confirm USAJOBS renders inside workbench after viewport (not verified)
- [ ] Toggle DevTools via menu accelerators (Ctrl+Shift+I / Ctrl+Shift+U) (not verified)
- [ ] Call IPC `devtools:toggleMain` or `devtools:toggleUsaJobs` from renderer (not verified)

## Testing Evidence
- `pnpm dev`
  - (electron) app started; no additional console output captured before shutdown

## Patch artifact generation
- Command (PowerShell UTF-8):
  - New-Item -ItemType Directory -Force artifacts | Out-Null
  - git diff develop...HEAD | Out-File -FilePath artifacts/day-53.patch -Encoding utf8
  - git diff | Out-File -FilePath artifacts/day-53-this-run.patch -Encoding utf8
- `ls -lh artifacts`
  - Get-ChildItem : A parameter cannot be found that matches parameter name 'lh'.
  - At C:\Users\comps\AppData\Local\Temp\ps-script-fd9d7cef-326d-42f2-bd19-ad090db47da7.ps1:77 char:4
  - + ls -lh artifacts
  - +    ~~~
  - CategoryInfo          : InvalidArgument: (:) [Get-ChildItem], ParameterBindingException
  - FullyQualifiedErrorId : NamedParameterNotFound,Microsoft.PowerShell.Commands.GetChildItemCommand
- `Get-ChildItem artifacts | Format-Table Name,Length,LastWriteTime`
  - Name                                           Length LastWriteTime
  - ----                                           ------ -------------
  - day-49-cumulative.patch                             0 1/26/2026 1:32:08 PM
  - day-50-this-run.patch                           11238 1/24/2026 7:13:19 PM
  - day-50.patch                                        0 1/24/2026 7:13:19 PM
  - day-51-this-run.patch                          101446 1/26/2026 1:32:07 PM
  - day-51.patch                                    90650 1/26/2026 1:32:07 PM
  - day-53-run.patch                               151650 1/27/2026 4:43:17 PM
  - day-53-this-run.patch                          599004 1/28/2026 7:00:32 PM
  - day-53.patch                                        0 1/28/2026 7:00:32 PM
  - pathadvisor-conversation-ux-v1-this-run.patch 1331108 1/28/2026 5:38:04 PM
  - pathadvisor-conversation-ux-v1.patch                0 1/28/2026 5:38:03 PM

# Day 50

## Git state (start of Day 50)
- `git status`
  - On branch feature/day-50-desktop-productionization-v1
  - Untracked files:
    - `docs/merge-notes-day-49.md`
  - nothing added to commit but untracked files present (use "git add" to track)
- `git branch --show-current`
  - feature/day-50-desktop-productionization-v1
- `git diff --name-status develop...HEAD`
  - (no diff)
- `git diff --stat develop...HEAD`
  - (no diff)

## Log
- Day 50 kickoff.
- Patch artifacts (`Get-Item` size listing):
  - day-50.patch — 0 bytes — 1/24/2026 7:02:15 PM
  - day-50-this-run.patch — 11238 bytes — 1/24/2026 7:02:18 PM
- Updated desktop window defaults, minimums, and restore behavior.

# Day 51

## Git state (entrypoint restore)
- `git status`
  - On branch feature/day-51-renderer-foundation-workbench-mount-v1
  - Changes not staged for commit:
    - modified: `src/main.js`
  - Untracked files:
    - `src/renderer/`
  - no changes added to commit (use "git add" and/or "git commit -a")
- `git branch --show-current`
  - feature/day-51-renderer-foundation-workbench-mount-v1
- `git diff --name-status`
  - M `src/main.js`
- `git diff --stat`
  - src/main.js | 60 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++---
  - 1 file changed, 57 insertions(+), 3 deletions(-)

## Root cause
- BrowserWindow entrypoint pointed to USAJOBS directly after renderer shell was removed.

## Git state (webview restore)
- `git status`
  - On branch feature/day-51-renderer-foundation-workbench-mount-v1
  - Changes not staged for commit:
    - modified: `docs/merge-notes.md`
    - modified: `src/main.js`
    - modified: `src/preload.js`
  - Untracked files:
    - `artifacts/day-51-this-run.patch`
    - `artifacts/day-51.patch`
    - `docs/change-briefs/day-51.md`
    - `src/renderer/`
  - no changes added to commit (use "git add" and/or "git commit -a")
- `git branch --show-current`
  - feature/day-51-renderer-foundation-workbench-mount-v1
- `git diff --name-status`
  - M `docs/merge-notes.md`
  - M `src/main.js`
  - M `src/preload.js`
- `git diff --stat`
  - docs/merge-notes.md | 114 ++++++++++++++++++++++++++++++++++++++++++++++
  - src/main.js | 129 +++++++++++++++++++++++++++++++++++++++++++++++++++-
  - src/preload.js | 19 +++++++-
  - 3 files changed, 259 insertions(+), 3 deletions(-)

## Root cause
- Workbench BrowserView wiring and preload bridge were removed, leaving the center panel without a bound USAJOBS viewport.

## Git state (theme sync)
- `git status`
  - On branch feature/day-51-renderer-foundation-workbench-mount-v1
  - Changes not staged for commit:
    - modified: `docs/merge-notes.md`
    - modified: `src/main.js`
    - modified: `src/preload.js`
  - Untracked files:
    - `artifacts/day-51-this-run.patch`
    - `artifacts/day-51.patch`
    - `docs/change-briefs/day-51.md`
    - `src/renderer/`
  - no changes added to commit (use "git add" and/or "git commit -a")
- `git branch --show-current`
  - feature/day-51-renderer-foundation-workbench-mount-v1
- `git diff --name-status`
  - M `docs/merge-notes.md`
  - M `src/main.js`
  - M `src/preload.js`
- `git diff --stat`
  - docs/merge-notes.md | 49 ++++++++++++++++++++
  - src/main.js | 129 +++++++++++++++++++++++++++++++++++++++++++++++++++-
  - src/preload.js | 19 +++++++-
  - 3 files changed, 194 insertions(+), 3 deletions(-)

## Theme tokens + cleanup
- Added canonical renderer tokens (`--bg-app`, `--bg-rail`, `--bg-panel`, `--bg-card`, `--text`, `--text-muted`, `--accent-2`, `--focus`) mapped to the PathOS web theme tokens in `src/renderer/styles/pathos-theme.css`.
- Replaced hardcoded surface/text colors in the nav rail, workbench header, PathAdvisor rail, and Activity Log with the canonical tokens in `src/renderer/styles.css`.

## Git state (workbench scroll alignment)
- `git status`
  - On branch feature/day-51-renderer-foundation-workbench-mount-v1
  - Changes not staged for commit:
    - modified: `docs/merge-notes.md`
    - modified: `src/main.js`
    - modified: `src/preload.js`
  - Untracked files:
    - `artifacts/day-51-this-run.patch`
    - `artifacts/day-51.patch`
    - `docs/change-briefs/day-51.md`
    - `src/renderer/`
  - no changes added to commit (use "git add" and/or "git commit -a")
- `git branch --show-current`
  - feature/day-51-renderer-foundation-workbench-mount-v1
- `git diff --name-status`
  - M `docs/merge-notes.md`
  - M `src/main.js`
  - M `src/preload.js`
- `git diff --stat`
  - docs/merge-notes.md | 78 +++++++++++++++++++++++++++++++
  - src/main.js | 129 +++++++++++++++++++++++++++++++++++++++++++++++++++-
  - src/preload.js | 19 +++++++-
  - 3 files changed, 223 insertions(+), 3 deletions(-)

## Root cause
- The shell scroll container and the BrowserView bounds sync were out of alignment, so the USAJOBS card appeared fixed while the page scrolled.

## Change
- Set the app shell as the primary scroll container and synced BrowserView bounds to its scroll.
- Added an explicit workbench webview height via `--workbench-webview-height`.

## Patch artifacts (Get-Item size listing)
- day-51.patch — 0 bytes — 1/24/2026 11:58:52 PM
- day-51-this-run.patch — 20836 bytes — 1/24/2026 11:58:52 PM

## Patch artifacts (Get-Item size listing)
- day-51.patch — 90650 bytes — 1/25/2026 6:34:13 PM
- day-51-this-run.patch — 101446 bytes — 1/25/2026 6:34:21 PM

# Day 53

## Files changed
- `src/renderer/styles.css`
- `docs/change-briefs/day-53.md`
- `docs/merge-notes/current.md`

## What changed and why
- Increased PathAdvisor input padding, min-height, and line-height to make multi-line writing feel comfortable.
- Strengthened PathAdvisor panel framing and added subtle section dividers so the rail feels anchored in the workspace.
- Tuned type weight and supporting copy line-height for a calmer, more professional reading experience.

## Visual before/after intent
- Before: compact input and light framing made the rail feel chatty and less grounded.
- After: roomier writing surface, clearer hierarchy, and subtle dividers make the panel feel calm and anchored.

## Day 53 Update — PathAdvisor briefing feed

## Files changed
- `src/renderer/index.html`
- `src/renderer/renderer.js`
- `src/renderer/styles.css`
- `docs/pathadvisor/ui-contract.md`

## What changed and why
- Replaced chat-style rendering with briefing cards to reinforce a professional advisor tone.
- Added a briefing feed, follow-up input label/copy, and kept suggested prompts as briefing starters.
- Documented the briefing-first UI contract to preserve credibility and interaction intent.

## How to verify
- Click a suggested prompt → a new briefing card appears in the feed.
- Submit a follow-up → another briefing card appears above the previous one.
- Reload the window → local persistence behavior is unchanged.
- Confirm only the PathAdvisor rail visuals changed.

---

# Day 53 — PathAdvisor Conversation UI Fix

## Root cause
- Detached Live Advisor windows were still emitting `workbench-viewport` bounds, so the hidden viewport in the detached window resized the main BrowserView to zero and made the Workbench disappear.

## Files changed
- `src/main.js`
- `src/renderer/index.html`
- `src/renderer/renderer.js`
- `src/renderer/styles.css`
- `docs/change-briefs/day-53.md`
- `docs/merge-notes/current.md`
- `docs/merge-notes.md`

## What changed and why
- Keep `workbench-viewport` updates scoped to the main window so detaching no longer resizes the Workbench BrowserView.
- Render Live Advisor as a conversation feed with visible user + assistant turns and a “Send” CTA to match the Live Advisor experience.
- Remove Decision Mode from the default sidebar experience to keep focus on the conversation.

## How to verify
- `pnpm run dev`
- Confirm USAJOBS Workbench stays visible on launch and after detaching Live Advisor.
- Send a message and confirm the user message appears, followed by the demo assistant response.
- Confirm the Decision Mode overlay does not appear on launch.

---

# Day 53 — PathAdvisor Chat-First + Detach Stability

## Root cause
- Suggested prompts lived above the conversation feed, shrinking the visible chat area and crowding the primary surface.
- Detached windows were not explicitly parented to the Workbench window, risking lifecycle side effects on the main BrowserView.

## What changed and why
- Moved suggested prompts into a Quick actions popover in the header so the chat stays primary and uncluttered.
- Let the conversation feed flex and auto-scroll, with Enter-to-send and Shift+Enter for line breaks.
- Parented detached windows to the Workbench window to keep the embedded USAJOBS BrowserView mounted.

# Day 53 — PathAdvisor Dual Detach (Live Advisor + Decision View)

## Files changed
- `src/main.js`
- `src/preload.js`
- `src/renderer/index.html`
- `src/renderer/renderer.js`
- `src/renderer/styles.css`
- `docs/change-briefs/day-53.md`
- `docs/merge-notes/current.md`

## What changed and why
- Added dedicated Live Advisor and Decision View windows with separate IPC routing so each surface can detach without swapping roles.
- Introduced in-memory thread syncing in main to keep Live Advisor and Decision View state consistent between attached and detached surfaces.
- Added a Decision Mode overlay in the main window as the gateway to detaching the Decision View workspace.

## Commands run
- `git status --porcelain`
- `git status`
- `git branch --show-current`
- `git diff --name-status develop...HEAD`
- `git diff --stat develop...HEAD`
- `git diff --name-status develop -- . ':(exclude)artifacts'`
- `git diff --stat develop -- . ':(exclude)artifacts'`
- `$env:DAY="53"; pnpm ci:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Known limitations
- Live Advisor and Decision View threads are in-memory only (no persistence).
- Each detached window type is limited to one instance (v1).
- No always-on-top toggle yet for the Live Advisor window.

## How to run & verify
- `pnpm dev`
- Detach Live Advisor from the sidebar and confirm the chat syncs both ways.
- Open Decision Mode, detach Decision View, and confirm the structured fields match.
- Keep both windows open at the same time and confirm focus buttons work.

---

# Day 53 — Decision Overlay Default Closed

## Files changed
- `src/renderer/styles.css`
- `docs/change-briefs/day-53.md`
- `docs/merge-notes.md`
- `docs/merge-notes/current.md`

## Root cause
- The Decision Overlay uses author CSS `display: flex`, which overrides the `hidden` attribute and makes the overlay visible on first paint.

## What changed
- Added a `.decision-overlay[hidden] { display: none; }` rule so the hidden attribute is honored and the overlay stays closed on initial load.
- Updated the Day 53 change brief to note that Decision Mode stays closed by default.

## How to verify
- `pnpm dev`
- On initial load, the Decision Workspace overlay is not visible.
- Click “Open Decision Mode” → overlay appears.
- Click “Return to browsing” → overlay hides.

---

# PathAdvisor Conversation UX hardening v1

## Summary
- Shifted PathAdvisor to a real chat thread model with local-only persistence and thread history management.
- Added Conversations workspace view with thread list, rename/delete, and a one-click handoff to PathAdvisor.
- Improved chat UX: conditional autoscroll, jump-to-latest affordance, and docked/detached control parity.

## Files changed
- `src/renderer/index.html`
- `src/renderer/renderer.js`
- `src/renderer/styles.css`
- `docs/change-briefs/pathadvisor-conversation-ux-v1.md`
- `docs/merge-notes.md`

## Manual test steps
- Open Live Advisor (docked + detached) and send 30+ messages; confirm the feed scrolls and the input stays pinned.
- Scroll up, send a new message, and confirm “Jump to latest” appears and returns to the latest reply.
- Use New/Clear/Export in both docked and detached views; confirm clear prompts, Markdown copies to clipboard, and JSON downloads.
- Restart the app and confirm conversations persist and switching threads updates the active chat.
- Open Conversations from the left nav, select a thread, and confirm PathAdvisor reflects it immediately.

## Follow-ups
- Consider adding an inline rename affordance to avoid the browser prompt UI.
- Add a "Delete all local data" entry that calls `resetAllConversations()`.

## Patch artifacts (ls -lh artifacts)
- day-49-cumulative.patch — 0 bytes — 1/26/2026 1:32:08 PM
- day-50.patch — 0 bytes — 1/24/2026 7:13:19 PM
- day-50-this-run.patch — 11238 bytes — 1/24/2026 7:13:19 PM
- day-51.patch — 90650 bytes — 1/26/2026 1:32:07 PM
- day-51-this-run.patch — 101446 bytes — 1/26/2026 1:32:07 PM
- day-53.patch — 151650 bytes — 1/27/2026 4:43:17 PM
- day-53-run.patch — 151650 bytes — 1/27/2026 4:43:17 PM
- day-53-this-run.patch — 151650 bytes — 1/27/2026 4:43:17 PM
- pathadvisor-conversation-ux-v1.patch — 0 bytes — 1/28/2026 5:38:03 PM
- pathadvisor-conversation-ux-v1-this-run.patch — 1331108 bytes — 1/28/2026 5:38:04 PM

---

# Day 53 — USAJOBS BrowserView Fallback + DevTools Shortcuts

## What changed and why
- Added a fallback BrowserView bounds setter so USAJOBS renders even if viewport IPC is delayed or missing.
- Standardized load-state IPC to `usajobs-load-state`, including failure details from main.
- Added dev-only keyboard shortcuts to toggle DevTools for the shell and USAJOBS BrowserView.

## How to verify
- `pnpm dev`
- Confirm USAJOBS renders on boot even before viewport IPC.
- Confirm nav buttons enable after the USAJOBS view finishes loading.
- Use Ctrl+Shift+I (shell) and Ctrl+Shift+U (USAJOBS view) to open DevTools.
