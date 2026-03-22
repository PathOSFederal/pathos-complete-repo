# Resume Readiness v1 — Change Brief

**Date:** March 1, 2025  
**Type:** New page / UX (local-only)

---

## What Changed

We added a new **Resume Readiness** experience in the app and made it easy to reach from the sidebar and dashboard.

- **New Resume Readiness page**  
  A dedicated page under Career & Jobs shows how ready your resumes are: completeness, missing fields, tailor-ready status, and when each was last tailored. You can open your resumes, create tailored versions from saved jobs, and see a clear “today’s best move” suggestion.

- **Navigation**  
  “Resume Readiness” appears in the sidebar under Career & Jobs (with Job Search, Saved Jobs, Resume Builder, Application Confidence Center, and Guided Apply). The dashboard Career area links to this page.

- **PathAdvisor and tooltips**  
  The PathAdvisor rail can show prompts tailored to Resume Readiness when you’re on that page. Tooltips were added or updated so icon buttons and controls are clearer.

- **Visual consistency**  
  Resume Readiness tiles and dashboard briefing tiles were aligned to the same card style (neutral borders, subtle top accent, no harsh orange bars) so the app feels consistent.

- **Overlay and route checks**  
  New scripts ensure overlays (modals, tooltips) and routes stay in sync between the web app and desktop build.

---

## Why It Matters

- **User value**  
  You get one place to see resume status, gaps, and the next best action without digging through multiple screens.

- **Trust and UX**  
  Clear labels, tooltips, and a consistent look make the app easier to understand and use. Everything described here runs locally; no backend or account is required for this experience.

---

## What to Test (Quick Manual Checks)

1. **Open Resume Readiness**  
   Go to Career & Jobs in the sidebar and click “Resume Readiness.” The page should load and show the four readiness tiles and resume list (or empty state).

2. **Dashboard link**  
   From the dashboard, use the Career / Resume Readiness link and confirm it opens the Resume Readiness page.

3. **PathAdvisor**  
   On Resume Readiness, open the PathAdvisor rail and confirm prompts feel relevant to resumes and readiness.

4. **Tooltips**  
   Hover or focus key icon buttons (e.g. on resume rows, PathAdvisor) and confirm tooltips appear and read clearly.

5. **Sidebar order**  
   Under Career & Jobs, confirm the order is: Job Search, Saved Jobs, Resume Builder, Resume Readiness, Application Confidence Center, Guided Apply.

---

## What Did Not Change

- **No backend**  
  Resume Readiness uses local data and existing storage; no new servers or APIs.

- **Local-only**  
  All behavior runs in the browser or desktop app. No account or sign-in required for this feature.

- **Existing flows**  
  Job Search, Saved Jobs, Resume Builder, Guided Apply, and Application Confidence Center work as before; only navigation order and the new page were added or adjusted.
