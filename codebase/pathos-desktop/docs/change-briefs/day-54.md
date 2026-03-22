# Day-number drift note
Day-number drift occurred during development. All work labeled Day 55–60 in this repo belongs to Day 54, and Day 54 is the canonical source of truth going forward.

# Day 54 Change Brief

## Bug fix (Explore restore after Benefits tools)
- Restored USAJOBS when returning to Explore after opening Benefits external tools.
- Reattached the Explore BrowserView even if it was previously detached.
- Added targeted debug logs to show when Benefits navigation is blocked.

## Summary
- Added a new Benefits & Compensation workspace with guided sections and routing.
- Embedded external reference tools with clear trust banners and guidance mode.
- Popups now include navigation controls like Explore.
- Added Decision Snapshot and Personal Outlook frames with local privacy toggles.
- Removed USAJOBS embeds from Benefits Guide and Benefits & Compensation views.

## Why it matters
People can now compare pay, benefits, and risk structures in one place, with trusted references and clear guardrails that keep the experience read-only.

## What changed
- New left-nav entry and workspace layout for Benefits & Compensation.
- Guided tool overviews plus embedded calculator frames for vetted sources.
- Directional synthesis frames that focus on structure, not guarantees.
- Limited USAJOBS rendering to the Explore workspace only.

## How to verify
- Open Benefits & Compensation from the left nav and click each section.
- Use “Explore (guided)” to open embedded references and confirm the trust banner stays visible.
- Check that Decision Snapshot and Personal Outlook have per-card privacy toggles.

## Risks / limitations
- Placeholder tools use example links and need final sources.
- No automated data capture; all references are read-only.

## Appended from Day 55 (invalid label due to day-number drift; content belongs to Day 54).
Note: Superseded by Day 54 due to day-number drift.

# Day 55 Change Brief

## Bug fix (Explore restore after Benefits tools)
- Restored USAJOBS when returning to Explore after opening Benefits external tools.
- Reattached the Explore BrowserView even if it was previously detached.
- Added targeted debug logs to show when Benefits navigation is blocked.

## Summary
- Added a new Benefits & Compensation workspace with guided sections and routing.
- Embedded external reference tools with clear trust banners and guidance mode.
- Popups now include navigation controls like Explore.
- Added Decision Snapshot and Personal Outlook frames with local privacy toggles.
- Removed USAJOBS embeds from Benefits Guide and Benefits & Compensation views.

## Why it matters
People can now compare pay, benefits, and risk structures in one place, with trusted references and clear guardrails that keep the experience read-only.

## What changed
- New left-nav entry and workspace layout for Benefits & Compensation.
- Guided tool overviews plus embedded calculator frames for vetted sources.
- Directional synthesis frames that focus on structure, not guarantees.
- Limited USAJOBS rendering to the Explore workspace only.

## How to verify
- Open Benefits & Compensation from the left nav and click each section.
- Use “Explore (guided)” to open embedded references and confirm the trust banner stays visible.
- Check that Decision Snapshot and Personal Outlook have per-card privacy toggles.

## Risks / limitations
- Placeholder tools use example links and need final sources.
- No automated data capture; all references are read-only.

## Appended from Day 56 (invalid label due to day-number drift; content belongs to Day 54).
Note: Superseded by Day 54 due to day-number drift.

# Day 56 Change Brief

## Summary
- Expanded the Benefits & Compensation embedded BrowserView to use available vertical space.

## Why it matters
The embedded tools now behave like a first-class internal frame, avoiding cramped layouts and mis-sized bounds.

## What changed
- Made the embedded frame a flex column so the embed surface can flex-grow.

## How to verify
- Open Benefits & Compensation and launch the OPM FEHB Plan Comparison tool.
- Confirm the embed fills the space above the footer buttons and resizes with the window.

## Risks / limitations
- None known; layout-only change.

## Appended from Day 57 (invalid label due to day-number drift; content belongs to Day 54).
Note: Superseded by Day 54 due to day-number drift.

# Day 57 Change Brief

## Summary
- Open Benefits tool references in a dedicated popout window instead of the main workspace.

## Why it matters
Tool references now use a full-size window that resizes reliably, while the main workspace stays focused on PathAdvisor guidance.

## What changed
- Added a Tool Popout window with a compact header and read-only trust line.
- Replaced the embedded tool area with a calm placeholder card and popout controls.
- Disabled the embedded bounds loop when popout mode is active.

## How to verify
- Open Benefits & Compensation → Tools → OPM GS Pay Tables.
- Confirm the tool opens in a separate window and fills the available space.
- Resize the popout window and confirm the tool content resizes with it.
- Close the popout and confirm the main workspace stays stable.

## Risks / limitations
- External tool availability depends on the source site.

## Appended from Day 58 (invalid label due to day-number drift; content belongs to Day 54).
Note: Superseded by Day 54 due to day-number drift.

# Day 58 Change Brief

## Summary
- Added a guidance-only PathAdvisor panel to the Benefits tool popout and a button to send that guidance back to the main chat.

## Why it matters
Users can reference calculator guidance beside the external tool without spawning a second chat, while still sending context back to the main PathAdvisor conversation.

## What changed
- The Benefits popout now renders a two-column layout with the external tool on the left and guidance on the right.
- The popout loads tools inside a webview in the local HTML shell.
- Added a “Send guidance to PathAdvisor” action that pre-fills the main chat input.

## How to verify
- Open Benefits & Compensation → Tools → OPM FEHB Plan Comparison.
- Confirm the popout shows the tool left and guidance right.
- Click “Send guidance to PathAdvisor” and confirm the main window input is prefilled.
- Resize the popout to confirm both columns adapt.

## Risks / limitations
- External tool availability still depends on the upstream source.

## Appended from Day 59 (invalid label due to day-number drift; content belongs to Day 54).
Note: Superseded by Day 54 due to day-number drift.

# Day 59 Change Brief

## Summary
- Replaced the Benefits Tool popout guidance panel with the full PathAdvisor chat UI and added a single-owner model to prevent duplicate advisors.

## Why it matters
Users get full chat history, input, and quick actions inside the popout while ensuring only one live PathAdvisor surface is visible at a time.

## What changed
- The popout now renders the full PathAdvisor header, history, input, and quick actions using the shared conversation store.
- Added an advisor surface ownership channel so the main window hides its PathAdvisor rail when the popout is open.
- Updated the popout webview settings and load listeners to improve external tool reliability.

## How to verify
- Open Benefits & Compensation → Tools and launch a calculator.
- Confirm the popout loads the external tool and shows the full PathAdvisor chat on the right.
- While the popout is open, verify the main PathAdvisor rail is hidden and the workspace expands.
- Close the popout and confirm the main PathAdvisor rail returns.

## Risks / limitations
- External tool availability depends on upstream sources.

## Appended from Day 60 (invalid label due to day-number drift; content belongs to Day 54).
Note: Superseded by Day 54 due to day-number drift.

# Day 60 Change Brief

## Summary
- Stabilized the Benefits Tool popout webview load flow and aligned the popout PathAdvisor layout with the main shell.

## Why it matters
External tools now load reliably in the popout and the PathAdvisor panel matches the main app styling, reducing confusion and layout drift.

## What changed
- Ensured the popout window explicitly enables webview support and devtools for diagnostics.
- Applied a deterministic webview src handoff after DOM ready + metadata, with clearer load-failure reporting.
- Wrapped the popout in the shared shell layout and aligned PathAdvisor rail spacing/width to the main panel.
- Added a direct window-close fallback if the popout IPC bridge is unavailable.

## How to verify
- Open Benefits & Compensation → Tools → OPM FEHB Plan Comparison and OPM GS Pay Tables.
- Confirm the external page loads in the popout and resizing keeps the left pane filled.
- If a load fails, confirm the overlay shows an error code + description.
- Confirm the PathAdvisor panel matches the main app spacing, typography, and chat layout.

## Risks / limitations
- External tool availability and CSP rules can still cause load failures that will now surface in the overlay.
