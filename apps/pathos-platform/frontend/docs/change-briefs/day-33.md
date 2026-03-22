# Day 33 - PathAdvisor Recommendation v1

**Date:** December 30, 2025  
**Branch:** `feature/day-33-pathadvisor-recommendation-v1`

---

## Objective

Implement "PathAdvisor Recommendation v1" as a frontend-only, local-only, rules-based recommendation system for Job Seeker mode. This is an OPSEC-safe contract for later backend logic, not a backend feature.

---

## What Changed

### New Features

1. **Recommendation Engine** (`lib/recommendations/jobRecommendation.ts`)
   - Pure function that generates job recommendations based on:
     - Currently selected job (if any)
     - User profile signals (grade band, location preference, work arrangement, etc.)
     - Context signals (job search results count, has resume, has saved job)
   - Returns structured recommendation with:
     - Headline (clear, actionable message)
     - Rationale bullets (2-4 items explaining why)
     - Confidence level (Low, Medium, High)
     - Next actions (1-3 actionable steps with routing)
   - Simple, explainable heuristics:
     - No selected job → Recommend selecting a job or running a search
     - Missing key fields (pay range, location) → Recommend verifying details
     - Grade/location/work arrangement mismatch → Recommend targeting closer match
     - Strong match signals → Recommend proceeding with application

2. **Job Recommendation Card** (`components/dashboard/job-recommendation-card.tsx`)
   - New card component for Job Seeker mode
   - Displays PathAdvisor recommendation with:
     - Title: "PathAdvisor Recommendation"
     - Headline from recommendation engine
     - Confidence indicator (simple badge, not flashy)
     - Rationale bullets (2-4 items, rendered as list-disc for safe encoding)
     - Action buttons (1-3 items with helper text)
   - Respects per-card visibility toggles
   - Follows established PathOS card styling and spacing

3. **Job Search Integration** (`app/dashboard/job-search/page.tsx`)
   - Added JobRecommendationCard to Job Search page (full variant)
   - Shows only when a job is selected to avoid recommendation noise
   - Job Search is the single source of truth for full recommendations
   - Dashboard uses Coach Notes nudge only (no duplicate recommendation card)

### Modified Components

- `store/userPreferencesStore.ts`: Added comment noting Day 33 usage of `jobSearch.recommendations` card key

---

## Why

- **Actionable guidance**: Provides specific, contextual recommendations based on user's current job search state
- **OPSEC-safe**: All logic runs locally in the browser, no external API calls or data leakage
- **Explainable**: Each recommendation includes clear rationale bullets explaining why it was made
- **Contract for future**: Frontend-only implementation provides a stable contract for later backend logic integration

---

## User-Facing Behavior Changes

1. **Job Seekers** see "PathAdvisor Recommendation" card in Job Search (when a job is selected)
2. **Dashboard** shows a lightweight Coach Notes nudge when there are search results but no selected job
3. **Recommendations adapt** based on:
   - Whether a job is currently selected
   - Whether the selected job matches user preferences (grade, location, work arrangement)
   - Whether key job details are missing (pay range, location)
4. **Action buttons** route to relevant pages (Job Search, Resume Builder, Saved Jobs)
5. **Card can be hidden** using the visibility toggle (eye icon)

---

## How to See It in the UI

1. Navigate to Job Search as a Job Seeker
2. Select a job from the search results
3. The "PathAdvisor Recommendation" card appears below the selected job panel
4. Card provides specific guidance based on job details and user preferences
5. Click action buttons to navigate to recommended next steps
6. Dashboard shows a Coach Notes nudge (if there are search results but no selected job) that links to Job Search

---

## Limitations

- **Local-only**: All recommendation logic runs in the browser, no backend integration
- **Rules-based**: Uses simple heuristics, not machine learning or advanced matching
- **Limited context**: Does not yet consider resume content, saved jobs, or job alerts (placeholders exist)
- **No external data**: Does not fetch job market data or competitive intelligence

---

## Technical Details

### Recommendation Heuristics (Priority Order)

1. No selected job → Recommend selecting or searching
2. Missing pay range/location → Recommend verifying details
3. Grade level mismatch → Recommend targeting closer match
4. Location mismatch → Recommend checking location
5. Work arrangement mismatch → Recommend verifying arrangement
6. Strong match (2+ signals) → Recommend proceeding with application
7. Partial match → Recommend tailoring approach

### Confidence Levels

- **Low**: Limited data, generic advice
- **Medium**: Some signals present, reasonable advice
- **High**: Strong signals, specific advice

### Action Routing

- `/dashboard/job-search`: Navigate to job search
- `/dashboard/resume`: Navigate to resume builder
- `/dashboard/saved-jobs`: Navigate to saved jobs
- Falls back to job search for unknown intents

---

## Follow-ups

1. **Resume integration**: Wire `hasResume` context signal to resume store when available
2. **Saved jobs integration**: Wire `hasSavedJob` context signal to saved jobs store when available
3. **Job closing dates**: Add heuristic for jobs closing soon (if dates are available)
4. **Backend integration**: Replace rules-based logic with backend API when ready (contract is in place)

---

---

## Merge Readiness Fixes (Day 33 Final)

**Encoding Fixes:**
- Replaced bullet character with list-disc rendering (safe encoding)
- Replaced em dash in grade range text with " to " (safe encoding)
- Updated doc headings to use hyphens instead of dashes

**Recommendation Surface De-duplication:**
- Recommendations live in Job Search only (full variant when job is selected)
- Dashboard uses Coach Notes nudge only (no duplicate recommendation card)
- Visibility key `jobSearch.recommendations` is scoped to Job Search only

*Last updated: December 30, 2025*

