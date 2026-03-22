# Day 20 — Job Alerts Email Digest v1

**Date:** December 14, 2025  
**Feature:** Email digest for job alerts (local-only simulation)

---

## What Changed

Day 20 adds a complete **Email Digest** feature for job alerts:

1. **Alerts Center** — A new dedicated page to manage all your job alerts in one place
2. **Email Digest Settings** — Configure how and when you want to receive digest emails
3. **Digest Preview** — See exactly what your digest email will look like before sending
4. **Test Matching** — Run alert matching on demand to see which jobs match your criteria

---

## Why It Matters

Job seekers often miss new job postings because they don't check USAJOBS regularly. With email digests:

- **Never miss a match** — Get a summary of new jobs that match your saved search criteria
- **Control your inbox** — Choose daily or weekly digest frequency
- **Privacy first** — Decide whether to include salary and location in emails
- **Local-only** — In Tier 1, emails are composed locally and opened in your email client

---

## How to Use It

### Accessing Alerts Center

1. Click **"Alerts"** in the left sidebar navigation
2. You'll see all your job alerts listed with their match counts

### Setting Up Email Digest

1. In the Alerts Center, find the **Email Digest Settings** section
2. Enter your email address
3. Choose frequency: **Daily** or **Weekly**
4. Toggle options:
   - "Only send when new matches" — Skip digest if no new jobs
   - "Include salary info" — Add salary ranges to digest
   - "Include location" — Add location details
5. Check the consent box to enable digest generation
6. Click **"Generate Digest Preview"** to see your digest

### Sending a Test Email

1. Generate a digest preview first
2. Click **"Send Test Email"** — This opens your default email client
3. The email is pre-filled with subject and body
4. Review and send from your email client

### Privacy Mode

- If **global privacy hide** is enabled in Settings, sensitive data (salary, location) will be redacted from the digest
- The email digest respects your privacy settings

### Managing Alert Matches

1. Each alert shows how many jobs currently match
2. Click **"Run Test"** on an alert to refresh matches against current job listings
3. View matched jobs directly from the Alerts Center
4. The sidebar badge shows total new matches across all alerts

---

## Important Notes

- **No actual emails are sent** — Tier 1 is local-only. Emails are composed and handed off to your email client (mailto:)
- **Data stays on your device** — All settings persist in your browser's localStorage
- **"Delete All Local Data"** in Settings clears all alert and digest settings

---

## Screenshots / Key UI Elements

- **Alerts Center page**: `/alerts`
- **Sidebar badge**: Shows count of new matches (red dot with number)
- **Digest preview**: Plain text preview matching what the email will contain
- **Event log**: Shows history of test runs and digest generations

---

## Bug Fixes (Day 20 Session 3)

### PathAdvisor Insights Effect

Fixed a potential stale data issue where PathAdvisor insights might not refresh when you switch between job seeker and employee modes:

- **Before:** Insights could show stale scenario type if you toggled your employment status
- **After:** Insights correctly refresh with the right scenario type ("promotion" for employees, "entry" for job seekers)

### Alert Creation Persistence

Verified that alerts created from any entrypoint persist correctly:

- Alerts appear in the Alerts tab on Job Search page
- Alerts appear in the Alerts Center (/alerts)
- Alerts survive browser refresh
- Alert data is stored in localStorage under `pathos-job-alerts`

### Dialog Accessibility Fix (Day 20 Sessions 9 & 10)

Fixed missing accessibility descriptions in several modal dialogs:

- **Before:** Console warning "Missing 'Description' or 'aria-describedby' for {DialogContent}" appeared
- **After:** All dialogs have proper `DialogTitle` and `DialogDescription` for screen reader accessibility
- **Verified:** Zero occurrences of the warning in browser console after fix

Affected dialogs:
- Advanced Filters modal
- PathAdvisor AI Focus Mode
- Onboarding Wizard
- Explore Locations modal
- Job Search Workspace Dialog (Session 10)

---

## Learning Layer Infrastructure (Day 20 Session 5)

Day 20 also adds a **Learning Layer** to improve maintainability and reduce recurring bugs:

### What's New

1. **Owner Map** (`docs/owner-map.md`)
   - Human-maintained reference of routes, stores, persistence keys
   - Quick lookup: "Where do I change X?"
   - Lists critical flows like "Create Alert" and "Save Job"

2. **Auto-Generated Owner Map** (`docs/owner-map.generated.md`)
   - Script scans codebase for routes, stores, localStorage keys
   - Always in sync with actual code
   - CI fails if generated file is out of date

3. **SSR-Safe Storage Wrapper** (`lib/storage.ts`)
   - Safe localStorage access that works with Next.js SSR
   - Helpers: `storageGet()`, `storageSet()`, `storageRemove()`, `storageGetJSON()`, `storageSetJSON()`
   - Infrastructure for future migration (existing stores not changed)

4. **Failure Drills** (`docs/failure-drills.md`)
   - Bug training artifact
   - Every bug fix must add an entry documenting the trigger path
   - Prevents same class of bugs from recurring

5. **AI Acceptance Checklist** (in `docs/ai/cursor-house-rules.md`)
   - Required documentation for merge-notes
   - Must explain: flow, stores, storage keys, failure mode, how tested
   - Hard rule: test create → appears → refresh → persists

### Why This Matters

- **Faster onboarding**: New developers can quickly understand the codebase
- **Fewer persistence bugs**: Checklist catches missing localStorage wiring
- **Better reviews**: Owner map makes it easy to verify changes are complete
- **Institutional memory**: Failure drills document past bugs and how to prevent them

### How to Use

1. **Before making changes**: Check `docs/owner-map.md` to understand where code lives
2. **After making changes**: Run `pnpm docs:owner-map` to update generated map
3. **When fixing bugs**: Add entry to `docs/failure-drills.md`
4. **Before completing features**: Fill out AI Acceptance Checklist in merge-notes

---

*This is a Tier 1 feature (frontend-only, local persistence).*
