# Day 19 – Saved Jobs + Alerts v1

**Date:** December 14, 2025

---

## What Changed

Day 19 introduces a complete local workflow for saving jobs and managing job alerts:

1. **Save Jobs** – Users can now save any job they're interested in with a single click
2. **Saved Jobs View** – A dedicated section to view all saved jobs, search through them, and remove ones no longer needed
3. **Job Alerts** – Create alerts based on a job's criteria to find similar positions
4. **Alert Management** – Enable/disable alerts, change notification frequency, edit criteria, or delete alerts

---

## Why It Matters

Finding the right federal job takes time. These features help users:

- **Stay organized** – Keep track of interesting positions without losing them
- **Save time** – Get notified when similar jobs are posted instead of manually searching
- **Stay focused** – See only the jobs that match what you're looking for

---

## How Users Experience It

### Saving Jobs

1. Browse job listings as usual
2. Click the **bookmark icon** on any job card to save it
3. In the Job Details panel, click **"Save job"** to save while reviewing details
4. A toast notification confirms the save

### Viewing Saved Jobs

1. Navigate to the **"Saved Jobs"** section in the job search area
2. See all saved jobs in a list with key details (title, agency, grade, location)
3. Use the search bar to find a specific saved job
4. Click any job to open its full details
5. Click the remove button to unsave a job you're no longer interested in

### Creating Alerts

1. Open any job's details
2. Click **"Create alert from this job"**
3. A dialog opens with fields pre-filled based on the job (series, grade range, location, work mode)
4. Choose how often you want to be notified (daily or weekly)
5. Optionally, toggle "Prefer same agency" to only see jobs at that agency
6. Click **"Create alert"** to start tracking similar jobs

### Managing Alerts

1. Navigate to the **"Alerts"** section
2. See all your alerts with their current status (enabled/disabled, frequency, match count)
3. Toggle alerts on/off with the enable switch
4. Change frequency using the dropdown (Daily, Weekly, or Off)
5. Click **"Edit"** to modify alert criteria
6. Click **"Delete"** to remove an alert you no longer need
7. See how many jobs currently match each alert

---

## Day 19 Session 2 Fixes

The following improvements were made in this session:

### 1. Workspace Modal "Create Alert" Visibility
- Added a **Create Alert** button (bell icon) in the job details panel header of the Job Search Workspace modal
- Users can now create alerts directly from the workspace without scrolling
- The "new alerts" pill is now clickable and closes the modal to show the Alerts tab

### 2. Hydration Error Fix (Nested Buttons)
- Fixed a React hydration error where job row `<button>` elements contained nested `<button>` elements for Save
- Job rows now use `<div role="option">` with proper keyboard accessibility

### 3. Dependency Warning Fix
- Fixed a missing dependency warning in the PathAdvisor insights effect
- Replaced optional chaining (`?.`) with explicit null checks per house rules

### 4. Work Type Dropdown Width
- Fixed truncation of "Work Type" label in the filter dropdown
- Increased minimum width from 120px to 140px

---

## Day 19 Session 3 Fixes

### 1. ESLint Dependency Warnings (Real Fix)
- Removed `eslint-disable-next-line` from `runAlertsOnJobsChange` effect
- Wrapped `buildMatchableJobs` in `useCallback` for stable reference
- Computed `scenarioType` outside the PathAdvisor insights effect

### 2. React Compiler Optimization
- Wrapped `jobs` array conversion in `useMemo` for stable reference
- Wrapped `sortedJobs` in `useMemo` for proper dependency tracking
- Fixed `handleJobListKeyDown` memoization issues

### 3. Work Type Dropdown (Enhanced)
- Added `whitespace-nowrap` to prevent text clipping
- Made SelectContent match trigger width with CSS variable

---

## Technical Notes

- All data is stored locally in your browser (no account required)
- Alert matching happens client-side using job metadata
- "Clear saved jobs" and "Clear all alerts" options are available for resetting data
- This integrates with the existing "Delete All Local Data" feature in Settings

---

## Limitations

- No email or push notifications (local-only for now)
- Alert matches are evaluated from currently loaded jobs only
- No sync across devices (data stays in this browser)

---

*This is a local-only, client-side feature. Your saved jobs and alerts are stored in your browser and will persist until you clear them or use "Delete All Local Data."*
