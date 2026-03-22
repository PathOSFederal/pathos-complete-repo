# Day 59 – Resume & Career Federal Resume Workspace v1

## Summary
- Added a new Resume & Career workspace focused on USAJOBS-compliant federal resumes.
- Introduced a guided, prompt-first PathAdvisor panel for resume updates.
- Added a job-linked resume library with versioning, status, and export support.
- Tuned the Resume & Career layout to scroll within the app shell and feel lighter.
- Polished resume card spacing and brought Resume & Career back to the global PathAdvisor rail.
- Converted resume actions into a proper kebab menu interaction.
- Hardened resume card menu behavior, link-job validation, and empty-state guidance.
- Added lightweight Resume & Career markup coverage for core headers and microcopy.
- Expanded resume-career store tests for validation, persistence, and edge-case actions.
- Added a per-file coverage gate for the resume-career store module.

## User impact
- Users can create and manage federal resumes tied to specific job announcements.
- Resume details are displayed in a read-only, structured format that matches USAJOBS requirements.
- Exports are presented as a manual upload step for USAJOBS applications.
- The workspace scrolls smoothly without moving the nav, PathAdvisor, or Activity Log.
- Resume cards are easier to scan and actions are tucked into a menu for a cleaner library view.
- Link-job creation now requires a title + announcement number with inline guidance.
- Resume Library shows a clear empty-state when no resumes exist.
- Resume & Career store behaviors now have stronger automated coverage guarantees.
