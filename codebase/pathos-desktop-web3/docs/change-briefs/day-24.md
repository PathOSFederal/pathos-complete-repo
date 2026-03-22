# Day 24 — Import Actions & Extraction v1

## What Changed

- **Signal Extraction**: Imported text content is now scanned for actionable signals (dates, URLs, emails, phone numbers, job IDs, announcement numbers, agency names)
- **Import Actions Model**: New action types that can be triggered from extracted signals (open Job Search, start resume tailoring, track deadlines)
- **Extracted Signals Display**: Import item details now show a compact "Extracted from this Import" section with detected signals
- **Suggested Actions**: Based on extracted signals, the UI suggests relevant actions (e.g., "Open Job Search with this URL")
- **Handoff Behavior**: Clicking an action navigates to the appropriate page with seeded data (Job Search pre-filled, Resume Builder in tailoring mode)

## Why It Matters

- **Faster Workflows**: Users can go from imported content to action with one click instead of manually copying/pasting job IDs or URLs
- **Better Organization**: Deadlines and contact info are automatically highlighted, making it easier to track important details
- **Smarter Imports**: The system now "understands" what's in imported content and suggests relevant next steps
- **Reduced Manual Entry**: Phone numbers, emails, and job IDs are automatically extracted for easy reference

## What to Notice

- Import a job posting email → extracted URLs and job IDs appear in the details section
- Extracted deadlines are highlighted in red for visibility
- "Open Job Search" action pre-fills the search with extracted keywords
- "Start resume tailoring" activates the Target Role workflow
- All extracted signals and actions persist across page refresh
- Legacy imports (from Day 22/23) will show empty signals (auto-extraction was not run on historical data)

---

*Day 24 - December 17, 2025*
