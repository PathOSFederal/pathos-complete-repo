# Day 15 Change Brief: Job Search Redesign + Saved Jobs & Alerts

**For:** Product team, stakeholders, and non-technical readers  
**Date:** December 14, 2025 (Session 10 Update)

---

## What Changed

We redesigned the **Job Search** page and added complete **Saved Jobs** and **Job Alerts** features. Users can now save jobs, create alerts, and manage their job search workflow effectively.

**Session 11 Updates (ESLint Warning Cleanup):**
- Cleaned up all 39 ESLint **warnings** by removing unused code and stabilizing React hook dependencies
- Fixed `react-hooks/exhaustive-deps` warnings using ref patterns for callbacks and module-level constants for stable arrays/objects
- Removed unused imports, variables, and parameters across 25+ files
- Added eslint-disable comments only where suppression is intentional (reserved props, destructure-to-discard patterns)
- Behavior unchanged; this is a warning cleanup refactor

**Session 10 Updates (ESLint Compliance):**
- Fixed all 23 ESLint **errors** to pass `pnpm lint` with 0 errors
- Replaced `any` types with proper types using `setScreenInfo` API
- Fixed React Compiler memoization issues in FEHB comparison modal
- Refactored 7 components to avoid `setState` in effects (derived values pattern)
- Escaped JSX quotes/apostrophes in 5 components
- Moved `DockSelector` component outside render function
- Removed ~12 unused imports/variables
- Applied Geist fonts properly to root layout
- Behavior unchanged; this is a lint/quality refactor

**Session 9 Updates (UX Clarity):**
- Renamed "Job alerts" card to "New matches" for clarity
- Renamed "Saved searches" section to "Saved searches & alerts"
- Added "Manage alerts" button that scrolls to alert management
- Updated empty state copy to be truthful and useful
- Confirmed scoped "seen" behavior (clicking a match marks only that search)

**Session 8 Updates (Polish & Correctness):**
- Tailor button added to Saved Jobs tab (View details, Unsave, Tailor)
- "New" badge now uses real lastSeenAt timestamps instead of mock constants
- 17 new unit tests for frequency transitions, dedupe, and lastSeenAt logic

**Session 7 Updates (Saved Jobs & Alerts):**
- Saved Jobs store with localStorage persistence
- Results/Saved tab toggle on Job Search page
- Save job button with toggle behavior and visual feedback
- "Create alert for similar jobs" action from selected job panel
- One-click "Save this search & enable alerts" in Job Alerts widget
- Deduplication prevents duplicate "similar job" alerts

**Session 5 Updates:**
- Fixed first-render flash in Selected Position panel
- Clear all button now always visible with "No filters applied" placeholder
- Job Alerts use email channel by default (Tier 1 retention strategy)
- Added toast confirmation when deleting saved searches

---

## Why It Matters

Previously, users faced information overload. The page showed too many metrics at once, and it was unclear what to do next. The new design:

- **Reduces confusion**: One clear action at each step
- **Saves time**: Key information is visible at a glance
- **Builds confidence**: Users understand why a job matches their profile
- **Supports power users**: Keyboard navigation for fast browsing

---

## What Users Can Do Now

### 1. See Active Filters at a Glance

A new header shows how many jobs match, which filters are active, and lets users remove filters one-by-one or clear all.

### 2. Search with Easy Clear

The search box now has an inline "X" button to quickly clear the search text and start fresh.

### 3. Scan Jobs Faster

Each job row now shows the essential decision signals: title, agency, grade, location, remote status, pay range, close date, and a single "Match" indicator. No more hunting for information.

### 4. Navigate with Keyboard

Power users can press Tab to focus the job list, then use arrow keys (↑↓) to navigate and Enter to select. This is faster than clicking each job.

### 5. Select and Explore

Clicking a job clearly highlights it and updates the right panel. If nothing is selected, users see a friendly guide explaining what to do.

### 6. Understand Why a Job Matches

The right panel now has an expandable "Why this matches" section with three parts:
- **Qualification match**: How your skills align
- **Competitiveness**: How you stack up against other applicants
- **Salary and relocation signals**: Compensation and location considerations

### 7. Take Clear Actions

The two main actions ("View position details" and "Tailor my resume") are always visible at the top. 

Secondary actions now include:
- **Save job** – Keep track of jobs you're interested in (now with toggle behavior)
- **Create alert** – Get notified when similar jobs are posted
- **Ask PathAdvisor** – Get personalized guidance
- **Open in USAJOBS** – View the official posting

### 8. Save Jobs and Switch to Saved Tab (Session 7)

When you save a job:
- The "Save job" button shows a filled bookmark and "Saved" label
- Switch to the "Saved" tab to see all your saved jobs
- From the Saved tab, you can view details, unsave, or tailor your resume
- Saved jobs persist after page refresh

### 9. Create Alerts for Similar Jobs (Session 7)

From the selected job panel:
- Click "Create alert" to open the alert dialog
- Choose frequency: Daily or Weekly digest
- Optionally constrain to the same agency
- See a summary of what will be tracked (series, title, grade range, work mode)
- The system prevents duplicate alerts for the same criteria

### 10. One-Click "Save this search & enable alerts" (Session 7)

In the Job Alerts widget:
- If you have filters applied, a primary button lets you save the current search and enable alerts in one click
- The button is disabled with a hint if no filters are applied
- Default frequency is weekly; channel is email

### 11. Understand New Matches vs. Alert Management (Session 9)

The widget now has two clearly separated sections:

**"New matches" card** (formerly "Job alerts"):
- Shows job items that matched your saved searches
- Displays since you last checked
- Click a match to view details and mark it as seen

**"Saved searches & alerts" section**:
- This is where you manage your alerts
- Create, edit, or delete saved searches
- Choose frequency: Off, Weekly, or Daily
- Helper text: "Choose Daily/Weekly to enable notifications"

When there are no new matches:
- Message: "No new matches yet. We'll notify you when new jobs match your saved searches."
- "Manage alerts" button scrolls to the saved searches section

### 12. Set Up Job Alerts

The Job Alerts section clearly explains what alerts do:
- Email digest (simulated in Tier 1 UI, delivery enabled later)
- Daily or weekly frequency options
- Badge shows new matches only when alerts are enabled

### 13. Recommended Roles

The "Top Matching Positions" section is now called "Recommended roles based on your profile" and includes actions like "Search roles like this" to quickly find similar jobs.

---

## What Is Saved Jobs?

Saved Jobs is a personal collection of federal job listings you want to track. When you find an interesting job, click "Save job" to add it to your collection.

**Where do saved jobs appear?**

On the Job Search page, use the "Saved" tab (next to "Results") to see all your saved jobs. Each saved job shows:
- Title, agency, grade, location
- Match percentage
- Actions: View details, Unsave

**What happens on refresh?**

Saved jobs persist in your browser's localStorage. They will still be there after you refresh the page or close and reopen your browser.

---

## How Alerts Are Created

Alerts notify you when new jobs match your criteria. There are two ways to create alerts:

### From the Job Alerts Widget (Search-Based)

1. Apply filters to your search (location, grade, keywords, etc.)
2. Click "Save this search & enable alerts"
3. The current search is saved and weekly email alerts are enabled

### From the Selected Job Panel (Job-Based)

1. Select a job you're interested in
2. Click "Create alert"
3. Configure frequency (daily/weekly) and agency preference
4. Click "Create alert" in the dialog

The system automatically derives search criteria from the job:
- Series code (or inferred from title)
- Grade range (one above and below selected grade)
- Work mode (remote/hybrid/on-site)
- Keywords based on job title

---

## What to Expect (Alert Cadence)

- **Daily digest**: If enabled, you would receive an email every day with new matches (simulated in Tier 1)
- **Weekly digest**: If enabled, you would receive an email every week with new matches (simulated in Tier 1)
- **Email delivery**: Currently simulated. Actual email delivery will be enabled in a future tier.

The Job Alerts widget shows "X new" only when:
1. At least one alert is enabled
2. There are new jobs matching your criteria

---

## What Is Next

1. **Compare feature**: Let users compare multiple jobs side-by-side (placeholder added)
2. **Actual email delivery**: Connect alerts to email service
3. **Shareable links**: Save selected job in URL for bookmarking

---

## How to Test

### Basic Flow

1. Go to `/dashboard/job-search`
2. Type something in the search box, then click the X to clear it
3. Apply some filters (location, grade, agency)
4. Tab to the job list and use arrow keys to navigate
5. Press Enter or click to select a job
6. Verify the right panel updates with that job's details

### Selected Position Panel (Session 5)

7. On desktop: "Why this matches" sections should be expanded by default (no flash)
8. Click "Collapse all" — all sections should collapse
9. When collapsed, each section shows compact summary hints (e.g., "Skills aligned • Grade requirements met")
10. Click "Expand all" — all sections should expand
11. On mobile: sections should be collapsed by default

### Clear All Button (Session 5)

11. With no filters applied: "Clear all" button should be visible but disabled
12. A "No filters applied" placeholder text should be visible
13. Hover over disabled Clear all: tooltip says "No filters to clear"
14. Apply a filter: "Clear all" button should become enabled
15. Click "Clear all": all filter chips should disappear, button becomes disabled

### Job Alerts (Session 5)

16. With no saved searches: "Save a search first" button should appear
17. Save a search, then enable alerts with daily/weekly frequency
18. Refresh the page: alert settings should persist (channel defaults to email)
19. With alerts enabled and new matches: "X new" badge should appear
20. With alerts disabled: "X new" badge should NOT appear
21. With alerts disabled: dropdown should show "Off" (not the frequency)
22. Delete a saved search: toast should confirm "Saved search deleted"

### Mobile Drawer (Session 4)

23. On mobile (<1024px): select a job
24. Details should appear in a **bottom sheet** (slides up from bottom)
25. Sheet should have rounded top corners and be ~85% of screen height
26. On desktop: details appear in right slide-over panel

### Save Job and Saved Tab (Session 7)

27. Click "Save job" on a selected job → button should show "Saved" with filled bookmark
28. Click "Saved" tab → saved job should appear in the list
29. Refresh the page → saved jobs should still be there
30. Click "Unsave" on a saved job → job removed from list, toast confirms

### Create Alert for Similar Jobs (Session 7)

31. Select a job and click "Create alert" → dialog opens
32. Change frequency to "Daily", toggle "Prefer same agency" on
33. Click "Create alert" → toast confirms, filters updated to show similar jobs
34. Open Job Alerts widget → new saved search should appear with alerts enabled
35. Click "Create alert" again for same job → toast says "Alert already exists" (dedupe)

### One-Click Save & Enable Alerts (Session 7)

36. Clear all filters → "Save this search & enable alerts" should be disabled
37. Hover over disabled button → tooltip says "Run a search or apply filters first"
38. Apply a filter (e.g., location: DC) → button should become enabled
39. Click the button → toast confirms, new saved search appears in widget

### New Badge Correctness (Session 8)

40. Enable alerts for a saved search → view alerts → "new" badge should show count
41. Click on an alert → alerts marked as seen → badge count should decrease on next refresh
42. If never viewed, all alert items count as "new"
43. Disabled alerts don't contribute to "new" count

### Other Actions

44. Click "Open in USAJOBS" (should open external link)
45. Click "Tailor my resume" to navigate to the Resume Builder
46. From Saved tab, click "Tailor" → navigates to Resume Builder with that job

---

*Questions? Contact the product team.*
