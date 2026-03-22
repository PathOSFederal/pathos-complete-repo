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
