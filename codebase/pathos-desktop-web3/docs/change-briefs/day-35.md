# Day 35 - PathAdvisor-First Dashboard

**Date:** December 20, 2025  
**Branch:** `feature/day-35-coach-dashboard-animations`

## What Changed

The Dashboard is now truly PathAdvisor-first, intimate, and guided. PathAdvisor is the center of the dashboard experience, with cards as supporting context. The dashboard also fixes the Job Search Selected Position to automatically select the first result when results exist.

## Why This Is Better

### Before
- Dashboard showed "Your Plan" as a static panel with placeholder messages
- Coach Notes (Evidence) drawer was empty or vague when no evidence card selected
- Dashboard felt narrow on wide screens
- Job Search showed "No position selected" even when results existed
- PathAdvisor was a sidebar, not the primary experience

### After
- **PathAdvisor is primary**: Dashboard shows actual PathAdvisor session with chat history and input
- **Priority Alerts visible**: Coach Notes opens by default showing actionable alerts (profile incomplete, no target role, etc.)
- **Wider layout**: Dashboard uses 9/3 column split (PathAdvisor dominant, cards supporting)
- **Auto-select first job**: Job Search automatically selects first result (no empty Selected Position panel)
- **Focus Mode**: Large workspace overlay for deep-focus PathAdvisor sessions

## Key Features

1. **PathAdvisor Session** (replaces "Your Plan")
   - Actual PathAdvisor chat interface with message history
   - Input box visible immediately (no scrolling needed)
   - Chat history scrolls, input stays pinned at bottom
   - Quick replies and suggested prompts preserved
   - Title: "PathAdvisor" (without "AI" for dashboard context)

2. **Priority Alerts in Coach Notes**
   - Opens by default showing meaningful alerts:
     - Complete your profile (if incomplete)
     - Set your target role (if not set)
     - Save your first search (if no saved searches)
     - Set up job alerts (if no alerts configured)
   - Each alert has clear CTA button that navigates to the right page

3. **PathAdvisor Focus Mode**
   - Large workspace overlay (full width, near full height)
   - Left side: Large PathAdvisor chat + input (dominant)
   - Right side: Pinned Context area with profile, active job, key metrics
   - Smooth animations (fade + scale/slide)
   - Respects prefers-reduced-motion

4. **Wider Dashboard Layout**
   - 9/3 column split (PathAdvisor 9 columns, cards 3 columns)
   - Uses more horizontal space on desktop
   - Less wasted space, feels less like "floating island"

5. **Job Search Auto-Select**
   - First result automatically selected when results exist
   - Never shows empty "No position selected" when results available
   - If zero results: shows clear empty state

## What Users Will Notice

- Dashboard feels more guided and intimate (PathAdvisor-first)
- Priority Alerts visible immediately (actionable items right away)
- Wider layout uses screen space better
- Job Search: Selected Position always shows a job when results exist
- Focus Mode provides deep-focus workspace for PathAdvisor sessions

## Technical Notes

- Only affects Job Seeker dashboard (Federal Employee dashboard unchanged)
- PathAdvisorPanel now accepts `title` prop for customization
- CoachSessionPanel wraps PathAdvisorPanel with height constraints
- Priority Alerts derived from stores (no API calls)
- Job Search auto-select uses existing effect (verified working)
- Route transitions already implemented (verified working)
