# Day 54 – Desktop Explorer Parity v1 + Benefits & PathAdvisor Consolidation

## Correction note
- Day 54 is the canonical day for this work.
- Prior Day 55+ labels were created in error due to day-number drift.
- Day 54 naming supersedes those references.

## Consolidation note
- Consolidated Day 55–60 invalid change briefs into `docs/change-briefs/day-54.md`.
- Preserved the original invalid files for traceability, without relabeling or deletion.

## Day 54 scope summary
- Benefits & Compensation workspace with guided sections and routing.
- External tools popout window with embedded webview + trust framing.
- Explore (USAJOBS) restore fix when returning from Benefits tools.
- Popup navigation controls aligned with Explore.
- PathAdvisor single-owner surface rule between main window and popout.
- PathAdvisor Conversation UX v1 rendered inside the popout rail.

## Files touched and purpose
- `src/main.js`
  - Added an alerts popover BrowserWindow, IPC handlers, and positioning logic.
- `src/preload.js`
  - Exposed alerts popover IPC helpers to renderer and popover windows.
- `src/renderer/index.html`
  - Removed in-DOM alert preview panels and wired bell toggles to popover IPC.
- `src/renderer/renderer.js`
  - Swapped alert preview toggles for popover IPC + Alert Center routing.
- `src/renderer/alerts-popover.html`
  - New popover window markup for the alerts preview list.
- `src/renderer/alerts-popover.css`
  - Dark UI styling for the popover window.
- `src/renderer/alerts-popover.js`
  - Static mock alert rendering plus View all / ESC behavior.

## Why these changes were made
- HTML/CSS dropdowns render behind the embedded BrowserView; a dedicated popover window avoids webview layering issues while preserving the alerts entry point.

## Correctness assessment
- Bell toggles a small alerts popover window anchored under the bell.
- Popover closes on blur and ESC.
- “View all” closes the popover and routes to Alert Center in the main window.

## What to check and how
- Click the bell in each workspace header and confirm the popover appears above USAJOBS.
- Click the bell again, click outside, or press Escape to close the popover.
- Click “View all” and confirm Alert Center opens in the main window.
- Resize/move the main window and confirm popover placement stays near the bell.

## Remaining risks / follow-ups
- Popover placement may need fine-tuning on multi-monitor or extreme window sizes.
- Focus/blur timing could feel jumpy depending on OS window manager behavior.

## Merge readiness
- Not ready for merge until manual Smart Alerts checks are complete.

## Documentation hygiene
- Updated `docs/change-briefs/day-54.md` with consolidated Day 55–60 content.
- Day 54 patch artifacts generated (see command outputs below).

## Command outputs
git status:
```
## feature/day-54-desktop-explorer-parity-v1...origin/feature/day-54-desktop-explorer-parity-v1
 D artifacts/day-55-this-run.patch
 D artifacts/day-55.patch
 A artifacts/day-56-run.patch
 A artifacts/day-56.patch
 A artifacts/day-57-benefits-popout-this-run.patch
 A artifacts/day-58-run.patch
 A artifacts/day-58.patch
 A artifacts/day-59-run.patch
 A artifacts/day-59.patch
 A artifacts/day-60-run.patch
 A artifacts/day-60.patch
 D docs/change-briefs/day-55.md
 D docs/change-briefs/day-56.md
 D docs/change-briefs/day-57.md
 D docs/change-briefs/day-58.md
 D docs/change-briefs/day-59.md
 D docs/change-briefs/day-60.md
 M docs/merge-notes.md
 M docs/merge-notes/current.md
 M package.json
 M src/main.js
 M src/preload.js
 A src/renderer/benefits-popout.html
 A src/renderer/benefits-popout.js
 A src/renderer/benefits-tools.js
 A src/renderer/benefits.markup.test.js
 M src/renderer/index.html
 M src/renderer/renderer.js
 M src/renderer/styles.css
?? artifacts/day-54-this-run.patch
?? artifacts/day-54.patch
?? artifacts/day-55-invalid.patch
?? artifacts/day-55-this-run-invalid.patch
?? docs/change-briefs/day-54.md
?? docs/change-briefs/day-55-invalid.md
?? docs/change-briefs/day-56-invalid.md
?? docs/change-briefs/day-57-invalid.md
?? docs/change-briefs/day-58-invalid.md
?? docs/change-briefs/day-59-invalid.md
?? docs/change-briefs/day-60-invalid.md
?? docs/merge-notes-day-55-invalid-archive.md
?? docs/merge-notes-day-55-invalid.md
?? src/preload-benefits-popout.js
```

git branch --show-current:
```
feature/day-54-desktop-explorer-parity-v1
```

git diff --name-status develop...HEAD:
```
M	docs/merge-notes.md
M	src/main.js
M	src/preload.js
A	src/renderer/alerts-popover.css
A	src/renderer/alerts-popover.html
A	src/renderer/alerts-popover.js
M	src/renderer/index.html
M	src/renderer/renderer.js
M	src/renderer/styles.css
```

git diff --stat develop...HEAD:
```
 docs/merge-notes.md              |  42 ++++
 src/main.js                      | 184 +++++++++++++++-
 src/preload.js                   |  30 +++
 src/renderer/alerts-popover.css  | 148 +++++++++++++
 src/renderer/alerts-popover.html |  31 +++
 src/renderer/alerts-popover.js   | 109 ++++++++++
 src/renderer/index.html          | 438 +++++++++++++++++++++++++++++++++++++--
 src/renderer/renderer.js         | 263 +++++++++++++++++++----
 src/renderer/styles.css          | 381 ++++++++++++++++++++++++++++++++++
 9 files changed, 1564 insertions(+), 62 deletions(-)
```

ls -lh artifacts/:
```
Mode   LastWriteTime          Length Name                                         
----   -------------          ------ ----                                         
-a---- 1/26/2026 1:32:08 PM        0 day-49-cumulative.patch                      
-a---- 1/24/2026 7:13:19 PM    11238 day-50-this-run.patch                        
-a---- 1/24/2026 7:13:19 PM        0 day-50.patch                                 
-a---- 1/26/2026 1:32:07 PM   101446 day-51-this-run.patch                        
-a---- 1/26/2026 1:32:07 PM    90650 day-51.patch                                 
-a---- 1/28/2026 10:19:06 PM  151650 day-53-run.patch                             
-a---- 1/28/2026 10:19:06 PM  914990 day-53-this-run.patch                        
-a---- 1/28/2026 10:19:06 PM       0 day-53.patch                                 
-a---- 1/31/2026 5:36:26 AM  4288636 day-54-this-run.patch                        
-a---- 1/31/2026 5:36:22 AM   119068 day-54.patch                                 
-a---- 1/31/2026 5:35:12 AM       98 day-55-invalid.patch                         
-a---- 1/31/2026 5:35:12 AM       98 day-55-this-run-invalid.patch                
-a---- 1/30/2026 1:06:58 PM   116744 day-56-run.patch                             
-a---- 1/30/2026 1:06:58 PM   174649 day-56.patch                                 
-a---- 1/30/2026 3:05:10 PM   148959 day-57-benefits-popout-this-run.patch        
-a---- 1/30/2026 3:21:03 PM   170404 day-58-run.patch                             
-a---- 1/30/2026 3:21:03 PM   227218 day-58.patch                                 
-a---- 1/30/2026 3:51:22 PM   207546 day-59-run.patch                             
-a---- 1/30/2026 3:51:21 PM   264288 day-59.patch                                 
-a---- 1/30/2026 4:15:28 PM   234220 day-60-run.patch                             
-a---- 1/30/2026 4:15:27 PM   282875 day-60.patch                                 
-a---- 1/28/2026 10:19:06 PM 1331108 pathadvisor-conversation-ux-v1-this-run.patch
-a---- 1/28/2026 10:19:06 PM       0 pathadvisor-conversation-ux-v1.patch         
```
# Day 54 – Desktop Explorer Parity v1 + Benefits & PathAdvisor Consolidation

## Correction note
- Day 54 is the canonical day for this work.
- Prior Day 55+ labels were created in error due to day-number drift.
- Day 54 naming supersedes those references.

## Consolidation note
- Consolidated Day 55–60 invalid change briefs into `docs/change-briefs/day-54.md`.
- Preserved the original invalid files for traceability, without relabeling or deletion.

## Day 54 scope summary
- Benefits & Compensation workspace with guided sections and routing.
- External tools popout window with embedded webview + trust framing.
- Explore (USAJOBS) restore fix when returning from Benefits tools.
- Popup navigation controls aligned with Explore.
- PathAdvisor single-owner surface rule between main window and popout.
- PathAdvisor Conversation UX v1 rendered inside the popout rail.

## Files touched and purpose
- `src/main.js`
  - Added an alerts popover BrowserWindow, IPC handlers, and positioning logic.
- `src/preload.js`
  - Exposed alerts popover IPC helpers to renderer and popover windows.
- `src/renderer/index.html`
  - Removed in-DOM alert preview panels and wired bell toggles to popover IPC.
- `src/renderer/renderer.js`
  - Swapped alert preview toggles for popover IPC + Alert Center routing.
- `src/renderer/alerts-popover.html`
  - New popover window markup for the alerts preview list.
- `src/renderer/alerts-popover.css`
  - Dark UI styling for the popover window.
- `src/renderer/alerts-popover.js`
  - Static mock alert rendering plus View all / ESC behavior.

## Why these changes were made
- HTML/CSS dropdowns render behind the embedded BrowserView; a dedicated popover window avoids webview layering issues while preserving the alerts entry point.

## Correctness assessment
- Bell toggles a small alerts popover window anchored under the bell.
- Popover closes on blur and ESC.
- “View all” closes the popover and routes to Alert Center in the main window.

## What to check and how
- Click the bell in each workspace header and confirm the popover appears above USAJOBS.
- Click the bell again, click outside, or press Escape to close the popover.
- Click “View all” and confirm Alert Center opens in the main window.
- Resize/move the main window and confirm popover placement stays near the bell.

## Remaining risks / follow-ups
- Popover placement may need fine-tuning on multi-monitor or extreme window sizes.
- Focus/blur timing could feel jumpy depending on OS window manager behavior.

## Merge readiness
- Not ready for merge until manual Smart Alerts checks are complete.

## Documentation hygiene
- Updated `docs/change-briefs/day-54.md` with consolidated Day 55–60 content.
- Day 54 patch artifacts generated (see command outputs below).

## Command outputs
git status:
```
## feature/day-54-desktop-explorer-parity-v1...origin/feature/day-54-desktop-explorer-parity-v1
 D artifacts/day-55-this-run.patch
 D artifacts/day-55.patch
 A artifacts/day-56-run.patch
 A artifacts/day-56.patch
 A artifacts/day-57-benefits-popout-this-run.patch
 A artifacts/day-58-run.patch
 A artifacts/day-58.patch
 A artifacts/day-59-run.patch
 A artifacts/day-59.patch
 A artifacts/day-60-run.patch
 A artifacts/day-60.patch
 D docs/change-briefs/day-55.md
 D docs/change-briefs/day-56.md
 D docs/change-briefs/day-57.md
 D docs/change-briefs/day-58.md
 D docs/change-briefs/day-59.md
 D docs/change-briefs/day-60.md
 M docs/merge-notes.md
 M docs/merge-notes/current.md
 M package.json
 M src/main.js
 M src/preload.js
 A src/renderer/benefits-popout.html
 A src/renderer/benefits-popout.js
 A src/renderer/benefits-tools.js
 A src/renderer/benefits.markup.test.js
 M src/renderer/index.html
 M src/renderer/renderer.js
 M src/renderer/styles.css
?? artifacts/day-54-this-run.patch
?? artifacts/day-54.patch
?? artifacts/day-55-invalid.patch
?? artifacts/day-55-this-run-invalid.patch
?? docs/change-briefs/day-54.md
?? docs/change-briefs/day-55-invalid.md
?? docs/change-briefs/day-56-invalid.md
?? docs/change-briefs/day-57-invalid.md
?? docs/change-briefs/day-58-invalid.md
?? docs/change-briefs/day-59-invalid.md
?? docs/change-briefs/day-60-invalid.md
?? docs/merge-notes-day-55-invalid-archive.md
?? docs/merge-notes-day-55-invalid.md
?? src/preload-benefits-popout.js
```

git branch --show-current:
```
feature/day-54-desktop-explorer-parity-v1
```

git diff --name-status develop...HEAD:
```
M	docs/merge-notes.md
M	src/main.js
M	src/preload.js
A	src/renderer/alerts-popover.css
A	src/renderer/alerts-popover.html
A	src/renderer/alerts-popover.js
M	src/renderer/index.html
M	src/renderer/renderer.js
M	src/renderer/styles.css
```

git diff --stat develop...HEAD:
```
 docs/merge-notes.md              |  42 ++++
 src/main.js                      | 184 +++++++++++++++-
 src/preload.js                   |  30 +++
 src/renderer/alerts-popover.css  | 148 +++++++++++++
 src/renderer/alerts-popover.html |  31 +++
 src/renderer/alerts-popover.js   | 109 ++++++++++
 src/renderer/index.html          | 438 +++++++++++++++++++++++++++++++++++++--
 src/renderer/renderer.js         | 263 +++++++++++++++++++----
 src/renderer/styles.css          | 381 ++++++++++++++++++++++++++++++++++
 9 files changed, 1564 insertions(+), 62 deletions(-)
```

ls -lh artifacts/:
```
Mode   LastWriteTime          Length Name                                         
----   -------------          ------ ----                                         
-a---- 1/26/2026 1:32:08 PM        0 day-49-cumulative.patch                      
-a---- 1/24/2026 7:13:19 PM    11238 day-50-this-run.patch                        
-a---- 1/24/2026 7:13:19 PM        0 day-50.patch                                 
-a---- 1/26/2026 1:32:07 PM   101446 day-51-this-run.patch                        
-a---- 1/26/2026 1:32:07 PM    90650 day-51.patch                                 
-a---- 1/28/2026 10:19:06 PM  151650 day-53-run.patch                             
-a---- 1/28/2026 10:19:06 PM  914990 day-53-this-run.patch                        
-a---- 1/28/2026 10:19:06 PM       0 day-53.patch                                 
-a---- 1/31/2026 5:36:26 AM  4288636 day-54-this-run.patch                        
-a---- 1/31/2026 5:36:22 AM   119068 day-54.patch                                 
-a---- 1/31/2026 5:35:12 AM       98 day-55-invalid.patch                         
-a---- 1/31/2026 5:35:12 AM       98 day-55-this-run-invalid.patch                
-a---- 1/30/2026 1:06:58 PM   116744 day-56-run.patch                             
-a---- 1/30/2026 1:06:58 PM   174649 day-56.patch                                 
-a---- 1/30/2026 3:05:10 PM   148959 day-57-benefits-popout-this-run.patch        
-a---- 1/30/2026 3:21:03 PM   170404 day-58-run.patch                             
-a---- 1/30/2026 3:21:03 PM   227218 day-58.patch                                 
-a---- 1/30/2026 3:51:22 PM   207546 day-59-run.patch                             
-a---- 1/30/2026 3:51:21 PM   264288 day-59.patch                                 
-a---- 1/30/2026 4:15:28 PM   234220 day-60-run.patch                             
-a---- 1/30/2026 4:15:27 PM   282875 day-60.patch                                 
-a---- 1/28/2026 10:19:06 PM 1331108 pathadvisor-conversation-ux-v1-this-run.patch
-a---- 1/28/2026 10:19:06 PM       0 pathadvisor-conversation-ux-v1.patch         
```
