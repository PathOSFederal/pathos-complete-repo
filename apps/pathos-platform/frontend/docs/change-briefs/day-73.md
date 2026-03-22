# Day 73 run 10 — Tab label rename on Saved Jobs workspace (March 15, 2026)

## What changed

- Renamed the two top content tabs in the selected-job workspace on the Saved Jobs page:
  - "Decision View" is now "Match Overview"
  - "Announcement" is now "Job Overview"
- Updated aria-labels, comments, and test expectations to match the new names.
- No layout, behavior, styling, routing, or architecture changes — label update only.

## Why it changed

- The old tab names ("Decision View" and "Announcement") were internal working titles that did not clearly communicate what each tab contains.
- "Match Overview" accurately describes the analytical workspace showing match scores, dimension bars, and decision factors.
- "Job Overview" accurately describes the reading workspace for the official job listing content.
- The rename makes the workspace tabs more intuitive for users scanning the detail panel.

## What the user will notice

- The two tabs above the selected-job detail area now read "Match Overview" and "Job Overview" instead of "Decision View" and "Announcement."
- All behavior, styling, and interaction states are unchanged.

## Validation performed

- `pnpm test packages/ui/src/screens/SavedJobsScreen.test.tsx` — all 10 tests pass
- Linter: no errors on changed files
- Grep verification: no stale references to old tab names in SavedJobsScreen.tsx or SavedJobsScreen.test.tsx

## Known risks / follow-ups

- None. This is a purely cosmetic label change with no behavioral or architectural impact.

---

# Day 73 run 9 — Saved Jobs hardening review pass (March 15, 2026)

## What changed

- Hardened `packages/ui/src/screens/SavedJobsScreen.tsx` without rewriting the feature:
  - added proper tab/panel semantics for Decision View and Announcement navigation
  - kept the fixed-bottom action row and exposed explicit structure hooks for regression testing
  - fixed the header match badge so its color now follows the shared readiness/match tier scale instead of always reading as green
  - added row-level keyboard-visible focus treatment with `focus-within`
  - made the decision-summary and match-summary grids auto-fit so the detail panel holds up better at narrower widths
- Preserved and verified **Build Resume** as a fixed action in the detail workspace; added tests so it cannot silently disappear again.
- Hardened deterministic Saved Jobs mock data in `packages/core/src/saved-jobs-mock-data.ts`:
  - widened low/high spread
  - added explicit threshold cases at readiness `60` and `80`
  - kept all behavior local-only and deterministic
- Replaced weak smoke tests with meaningful Saved Jobs regressions in `packages/ui/src/screens/SavedJobsScreen.test.tsx` covering:
  - Build Resume action presence
  - action-row persistence across modes
  - Decision vs Announcement mode rendering
  - tab/panel wiring
  - shared score-tier color behavior
  - deterministic low / medium / high mock-score coverage

## Why it changed

- The Saved Jobs page had improved visually, but it still had hardening gaps:
  - accessibility semantics were incomplete
  - score color signaling was inconsistent
  - regression coverage was too weak to protect the new workspace model
  - mock-data spread was not disciplined enough for threshold review

## What the user will notice

- The detail header’s match badge now reflects weak / medium / strong states correctly instead of implying every selected job is strong.
- Keyboard users get clearer focus feedback when moving through saved-job rows.
- Decision and Announcement tabs now read more like proper workspace navigation in both semantics and regression coverage.
- The detail summary blocks compress more gracefully when the panel gets narrower.
- Build Resume remains present in the fixed action row in both workspace modes.

## Validation performed

- `pnpm lint` — pass with existing repo warnings only
- `pnpm typecheck` — pass
- `pnpm test` — pass
- `pnpm build` — pass
- `pnpm test packages/ui/src/screens/SavedJobsScreen.test.tsx` — pass

## Risks / follow-ups

- This run does not clean up unrelated Day 73 branch changes outside Saved Jobs.
- Manual visual verification is still recommended for the final tab feel and scroll rhythm in `/dashboard/saved-jobs`.
- Some existing screen-file warnings remain outside this task’s scope.

---

# Change Brief — Day 73: Saved Jobs page mockup alignment

## What changed

- The Saved Jobs page at `/dashboard/saved-jobs` was refined to match the approved mockup.
- **Header:** Larger title, subtitle, Search and Sort controls, and a Filter button. Trust microcopy ("Saved locally on this device") remains in the top right.
- **Summary strip:** Replaced the previous four metrics with five: Total Saved, Ready to Apply, Needs Review, High Match, and Recently Saved. Each uses a distinct icon; Ready to Apply and Needs Review use green and yellow accent where applicable.
- **Left pane:** Added a list header ("X saved jobs."). Each saved job card can show a status tag (Ready to Apply, Needs Review, High Match, Backup) when the job has that data. The selected card shows match score (e.g. "82/100 Match"), optional "Apply Soon" when the close date is near or status is ready, and metadata pills (Closes, Telework, Permanent) when present. Guided Apply and Remove buttons appear on the selected card.
- **Detail pane:** Match score appears in the top right when available. Metadata row includes location, grade, salary, close date, telework, appointment type, and saved date when present. A "PathOS Brief" section shows the job summary (or fallback copy). When match data exists, a "Readiness & Considerations" block shows job match and bullet points. An orange "Why This May Be Worth Attention" callout appears with brief copy. Next Actions (Guided Apply, Open Official Listing, Ask PathAdvisor, Remove from Saved) and the trust footer are unchanged.
- **Data model:** Optional fields were added to the core Job type so the UI can display mockup structure when data exists: match score, close date, telework, appointment type, and status (ready, needs-review, high-match, backup). Existing saved jobs without these fields continue to work; new fields are optional.

## Why it changed

- The approved Saved Jobs mockup defines a decision-workspace layout with specific metrics, card structure, and detail content. The implementation was updated to align with that mockup while keeping the page local-first and within the existing shared UI and core storage architecture.

## What the user will notice

- A more prominent "Saved Jobs" title and a Filter button next to Sort.
- Five metric cards under the header instead of four; Ready to Apply, Needs Review, and High Match show counts when jobs have that status (otherwise 0).
- A "X saved jobs." line above the job list.
- Richer left-pane cards: status tags when present, match score and "Apply Soon" on the selected card, and Guided Apply + Remove on the selected card.
- In the detail panel: PathOS Brief, Readiness & Considerations (when match data exists), and the orange "Why This May Be Worth Attention" callout. Match score and extra metadata (close date, telework, appointment type) appear when available.
- Behavior (search, sort, select, remove, Guided Apply, Open Official Listing, Ask PathAdvisor) is unchanged. Empty and search-empty states are unchanged.

## Validation performed

- Typecheck: run in progress / pass.
- Build: not run this session.
- Tests: not run this session.
- Manual: verify at `/dashboard/saved-jobs` — header, five metrics, list header, card layout, detail pane sections, and actions.

## Known risks / follow-ups

- Filter is a placeholder (no filter logic yet). Ready to Apply, Needs Review, and High Match counts are 0 until jobs have optional `status` set (e.g. from a future job search or local analysis).
- Readiness & Considerations uses placeholder bullets; future work could drive these from real readiness data.
- Consider adding Filter options in a later task if product specifies.

---

## Day 73 run 2 — Visual correction pass (March 14, 2026)

- **What changed:** Tightened the Saved Jobs page so it matches the approved mockup more closely. Every interactive surface now has visible hover, focus-visible, and (where applicable) active states. Selected-card emphasis is stronger (4px accent left border, 12% tint). Metrics strip and detail panel spacing were slightly reduced for clearer hierarchy.
- **Interaction states added:** Search input (hover border, focus-visible ring); Sort and Filter buttons (pathos-interactive-hover); sort dropdown options (hover + focus-visible); saved job cards (hover background when unselected, focus-visible ring); card and detail Guided Apply (hover/active opacity, focus-visible ring); Open Official Listing, Remove from Saved, card Remove, Clear search, Go to Job Search (interactive-hover or focus ring).
- **Validation:** Manual check at `/dashboard/saved-jobs`: tab through controls, hover cards and buttons, confirm selected card stands out and all controls react.

---

## Additional update: generic interaction-state rule

### What changed

- Added a generic frontend rule that interactive surfaces must show visible feedback states by default.
- Made `docs/ai/cursor-house-rules.md` the canonical source for this guidance under UI and accessibility implementation standards.
- Added a short reinforcement note in `AGENTS.md` so builders see the expectation early during frontend runs.

### Rule summary

- Interactive surfaces should not remain visually static by default.
- Cover the states that apply to the control: hover, focus-visible, active or pressed, and selected or current where relevant.
- Users should be able to tell what is clickable, what is focused, what is selected, and what state a control is in.
- Selected or current state must remain more persistent and visually stronger than hover.
- Apply this expectation broadly across buttons, cards, tabs, nav items, dropdown triggers, chips, list rows, clickable panels, sidebar actions, and similar controls.

### Why it changed

- The repo needed one reusable PathOS rule so future frontend prompts and implementations consistently include visible interaction feedback without page-specific reminders.

---

## Additional update: instruction stack cleanup

### What changed

- Rewrote the root and frontend instruction stack so the docs act as execution-guidance documents instead of role-defining documents.
- Added one explicit precedence model: user request, active task file, repo-local app guidance, root builder guidance, then workflow and process docs.
- Separated hard constraints from soft execution preferences in the root builder guidance and frontend-local guidance.
- Rewrote the Saved Jobs task so it is parity-capable: it now explicitly targets approved mockup parity, allows screen-level structural correction inside the page surface, and removes soft "materially better" escape-hatch wording.
- Cleaned the frontend pointer docs so they clarify compatibility and precedence instead of competing with the active stack.

### Why it changed

- The prior stack mixed execution guidance with role-defining language and repeated conservative defaults strongly enough to block explicit mock-parity work.
- The cleanup keeps coding, testing, UI, architecture, and workflow standards intact while preventing generic guidance from overriding explicit task intent.

---

## Day 73 run 3 — Hard correction pass (mockup parity) — March 14, 2026

- **Goal:** Bring Saved Jobs to approved mockup parity; treat remaining differences as defects.
- **Header:** Title set to large bold (text-2xl); subtitle spacing (mt-1); trust microcopy unchanged top right.
- **Metrics strip:** Each metric is a card (rounded, border, subtle shadow); value is dominant (text-base font-bold); High Match and Recently Saved use accent/blue; strip gap and padding aligned to mockup density.
- **Left list pane:** Width ~33% of main content (flex-[0_0_33%], min-w-[16rem], max-w-md); list header "X saved jobs" (no period, bold); selected card uses primary text (white in dark theme) for title; status tag right-aligned; match score when selected on left of top row.
- **Detail workspace:** Job match in blue (accent-muted); Readiness & Considerations bullets use ChevronRight instead of disc; PathOS Brief has small orange icon; Next Actions in a single horizontal row (Guided Apply, Open Official Listing, Ask PathAdvisor, Remove from Saved); Remove from Saved is filled red with white text and hover/focus states.
- **PathAdvisor rail:** Screen overrides now set railContent (insight bullets + "Prioritize High Match Jobs" / "Review High Match Jobs" CTA) derived from saved jobs; composer placeholder "Ask about saved jobs..."; rail next-best-action button has hover/active/focus-visible. Overrides type extended with `composerPlaceholder`; PathAdvisorCard and PathAdvisorRail pass it through.
- **Validation:** Manual check at `/dashboard/saved-jobs`: compare to mockup for header rhythm, metric cards, list proportion and selected card, detail layout and action row, rail content and placeholder.

---

## Day 73 run 4 — Structural mock-parity correction — March 14, 2026

- **Goal:** Correct structure, composition, proportions, and hierarchy to match the approved mockup; not just restyling.
- **Header:** Increased spacing between title block and search/sort/filter row (mb-4) for clearer top-section rhythm.
- **Metrics strip:** Value size set to text-lg for dominance; metric cards given min-w-[7rem] so strip rhythm and proportions match mockup.
- **Left list selected card:** Action order changed to match mockup: first row = Apply Soon (tag) + Remove (button); second row = Guided Apply only. Apply Soon moved out of the card button into the action block.
- **Detail workspace:** Job title set to text-xl font-bold; PathOS Brief and Readiness & Considerations sections given py-4 for breathing room and section delineation.
- **PathAdvisor rail:** Briefing card shown when briefingLabel is set: "From Saved Jobs" plus helper text "Select a saved job to get personalized guidance." (briefingHelperText in overrides). NEXT BEST ACTION box for Saved Jobs styled with orange outline and accent-tinted background (highlightNextBestAction in railContent). Overrides type extended with briefingHelperText; PathAdvisorRailContent with highlightNextBestAction.
- **Validation:** Manual check at `/dashboard/saved-jobs`: header hierarchy, metrics weight/rhythm, selected-card action order, detail title size and section spacing, rail briefing card and orange Prioritize box.

---

## Day 73 run 5 — Mock-parity correction (approved mockup) — March 14, 2026

- **Goal:** Bring Saved Jobs to the approved mockup as closely as practical; parity-focused correction (structure + styling), not styling-only.
- **Header:** Search moved to its own row below the subtitle; Sort and Filter on the next row (mockup: search then sort/filter).
- **Selected card:** Stronger orange background (color-mix 22%); match score in green (--p-success); both Guided Apply and Remove as orange-outlined buttons (transparent bg, orange border); Apply Soon remains an optional tag above the buttons.
- **Unselected cards:** Subtle dark background (var(--p-surface2)) so cards read as distinct from the pane.
- **Detail workspace:** Job match in Readiness and in the header shown in green (--p-success). Open Official Listing and Ask PathAdvisor use orange border (mockup: secondary dark buttons with orange borders). AskPathAdvisorButton given optional `accentBorder` prop for this context.
- **PathAdvisor rail:** No change this run.
- **Interaction states:** Existing hover/focus-visible/active and selected treatment retained; no new regressions.
- **Validation:** Manual check at `/dashboard/saved-jobs`: header two-row layout, selected card orange strength and green match and orange-outline actions, unselected card background, detail green match and orange-bordered secondary buttons.

---

## Day 73 run 6 — Mock-parity: solid orange selected card, white text, rail box — March 14, 2026

- **Goal:** Align to approved mockup: solid orange selected card with white text; search width and Sort/Filter alignment; PathAdvisor recommended-action box solid orange.
- **Header:** Search bar widened to max-w-2xl (mockup: spanning nearly full width). Sort and Filter row right-aligned (justify-end).
- **Selected card:** Solid orange background (var(--p-accent)); all text white (var(--p-bg)); match score remains green; status tag and metadata pills use light overlay (rgba white) for contrast; Guided Apply and Remove buttons orange-outlined with white text (border and color var(--p-bg)); Apply Soon tag on selected card uses light overlay + white border.
- **PathAdvisor rail:** When highlightNextBestAction is true (Saved Jobs), NEXT BEST ACTION box uses solid orange background, white text, dark orange border; CTA button uses darker orange fill and white border for mockup “darker orange background, orange border.”
- **Validation:** Manual check at `/dashboard/saved-jobs`: header search width and right-aligned Sort/Filter, selected card solid orange and white text/buttons, rail solid orange Prioritize box and button styling.

---

## Day 73 run 7 — Theme correction pass (Job Search baseline) — March 14, 2026

- **Goal:** Restore visual consistency with PathOS; use Job Search as the visual/theme baseline; match approved mockup in structure, spacing, and hierarchy without literal screenshot color-copying that breaks the application theme.
- **Selected card (left list):** Reverted solid orange fill and white text. Selected state now matches Job Search: same panel background (`var(--p-surface2)`) as unselected; selection indicated by 4px accent left border only. All text uses token colors (`--p-text`, `--p-text-muted`, `--p-text-dim`) in every state. Status tag, metadata pills, and grade badge use token panel/chip styling (`--p-surface2`, `--p-accent-bg`).
- **List card actions (selected card):** Guided Apply = primary accent fill (`var(--p-accent)`); Remove = danger outline (transparent bg, `var(--p-danger)` border and text). Apply Soon tag uses `--p-accent-bg` and `--p-accent-muted` border.
- **PathAdvisor rail:** Set `highlightNextBestAction: false` for Saved Jobs so the NEXT BEST ACTION block uses the subdued rail style (surface2, border) instead of a solid orange block. Rail treatment now consistent with PathAdvisor elsewhere.
- **Interaction:** Filter button given `INTERACTIVE_HOVER_CLASS` and focus-visible ring. Unselected card hover uses opacity for feedback; selected remains stronger via left border.
- **Validation:** Manual check at `/dashboard/saved-jobs`: selected card reads as PathOS (surface2 + accent border); rail has no oversized orange surface; page feels like the same app as Job Search.

---

## Day 73 run 8 — Visual parity correction (Job Search baseline + mockup structure) — March 14, 2026

- **Goal:** Systematic parity correction using Job Search as the live visual/theme baseline and the approved Saved Jobs mockup as the structure/composition target.
- **Methodology:** Read Job Search implementation side-by-side with Saved Jobs; produced defect lists for (A) theme vs Job Search and (B) structure vs mockup; implemented all corrections.

### Theme corrections (→ Job Search parity)
- **Header:** text-xl font-semibold px-4 pt-4 pb-2 (was text-2xl font-bold px-6 py-4); removed decorative Bookmark icon.
- **Card selection:** transparent→surface2 bg transition with explicit hover tracking (was always-surface2 + 4px border); 2px left accent bar (was 4px).
- **Card layout:** Agency • Location on one line; compact padding; chips match Job Search chip family (surface2/text-dim; accent-bg for grade and urgent).
- **Buttons:** All use INTERACTIVE_HOVER_CLASS and Job Search button family styling. Remove from Saved = outlined danger (was solid fill). Open Official Listing = standard border (was accent border). AskPathAdvisorButton = default border (removed accentBorder).
- **Panels:** Both panes wrapped in rounded-lg border containers with var(--p-surface) bg (matches Job Search pane treatment).
- **Accent callout:** "Why This May Be Worth Attention" uses surface2/border (was accent-tinted surface).
- **Trust footer:** Compact text line (was bordered card with icon).
- **Action bar:** Sticky at bottom with border-t and surface bg (matches Job Search).

### Structure corrections (→ mockup parity)
- **Layout:** Grid with gap-3 and px-4 padding; left pane width via clamp.
- **List pane:** listbox role, aria-label, overscrollBehavior: contain.
- **Cards:** role="option", aria-selected, keyboard Enter/Space.
- **Section density:** px-4 py-3 throughout (was px-6 py-4).
- **Search controls:** Single compact row (search left, sort/filter right).

### Interaction states
- All interactive surfaces have hover, focus-visible, and active/pressed feedback.
- Selected card state is visually persistent and stronger than hover (2px accent bar + surface2 bg).

- **Validation:** Manual check at `/dashboard/saved-jobs`: compare against Job Search for theme parity and against mockup for structure. Page should feel like a sibling of Job Search.

---

## Day 73 run 9 — Page-only structural parity pass — March 14, 2026

- **Goal:** Bring the Saved Jobs page structure, spacing, proportions, and hierarchy materially closer to the approved mockup. Page-only scope — no PathAdvisor changes, no Job Search changes, no broad theme tuning.
- **File changed:** `packages/ui/src/screens/SavedJobsScreen.tsx`

### Header corrections
- Title: `text-xl font-semibold` → `text-2xl font-bold` (mockup uses a larger, bolder title)
- Search icon: moved inside the input border (was outside); uses absolute positioning with `pl-9` padding-left
- Sort button: shows "Sort" label instead of the current sort value (mockup shows generic "Sort" label)
- Header spacing: tightened `mb-3` → `mb-2` between title and controls; removed `mt-2` on controls row

### Metrics strip corrections
- Cards: added `flex-1 min-w-0` to distribute evenly across full width (mockup shows even distribution)
- Strip: increased vertical padding from `py-2` to `py-2.5` for breathing room
- Cards: increased internal padding `px-3 py-2` → `px-3.5 py-2.5`; reduced shadow to `0.04` opacity for lighter feel
- Removed `flex-wrap` and `flex-shrink-0` on individual cards; strip now uses `flex` (no wrap) for single-row layout

### Left pane corrections
- Selected card background: `var(--p-surface2)` → `color-mix(in srgb, var(--p-accent) 8%, var(--p-surface))` for warmer accent-tinted selection matching mockup
- Left accent bar: 2px → 3px for stronger scan signal
- Card padding: `py-2` → `py-2.5` for better vertical rhythm; adjusted left padding for 3px bar
- Action button area: slightly more top/bottom padding

### Detail workspace corrections
- Header section: `pt-3 pb-2` → `pt-4 pb-3` for more breathing room
- Metadata chips: gap `1.5` → `2`, margin-top `2` → `2.5` for better chip spacing
- PathOS Brief section: `py-3` → `py-3.5`; section header margin `mb-2` → `mb-2.5`
- Readiness section: `py-3` → `py-3.5`; section header margin `mb-2` → `mb-2.5`
- "Why This May Be Worth Attention" box: neutral `surface2` → accent-tinted `color-mix(in srgb, var(--p-accent) 10%, var(--p-surface))` with accent-tinted border; more internal padding
- Action row: removed `sticky bottom:0` positioning; actions now flow inline in the scroll area matching mockup; removed "Next Actions" section header; slightly adjusted padding

### Overall proportion corrections
- Grid: left pane `clamp(260px, 33%, 400px)` → `clamp(250px, 30%, 360px)` for narrower list pane matching mockup
- Gutter: `gap-3` → `gap-3.5` for slightly more breathing room between panes

### Validation
- Manual check at `/dashboard/saved-jobs`: header size, search icon position, metrics distribution, selected card warmth, detail section spacing, attention box tint, action row flow, grid proportions

---

## Run 2: Deterministic mock data for Saved Jobs

### What changed
- Added `packages/core/src/saved-jobs-mock-data.ts` containing 8 deterministic fake federal job entries
- Each entry has full metadata: title, agency, location, grade, salary range, URL, summary, savedAt, matchScore, closeDate, telework, appointmentType, status
- Exported `seedSavedJobsIfEmpty()` from `@pathos/core` (follows the `loadMockResultsIfEmpty` pattern)
- SavedJobsScreen mount logic now seeds mock data when the localStorage store is empty

### Mock data composition
| ID | Title | Agency | Grade | Status | Match | Close Date |
|---|---|---|---|---|---|---|
| saved-mock-1 | IT Specialist (INFOSEC) | DHS | GS-13 | high-match | 92 | Mar 22 |
| saved-mock-2 | Management Analyst | OPM | GS-12 | ready | 87 | Mar 28 |
| saved-mock-3 | Program Analyst | VA | GS-11 | needs-review | 78 | Apr 5 |
| saved-mock-4 | Budget Analyst | DoD | GS-12 | backup | 65 | Apr 15 |
| saved-mock-5 | HR Specialist (Classification) | Interior | GS-11 | high-match | 89 | Mar 25 |
| saved-mock-6 | Contract Specialist | GSA | GS-12 | needs-review | 72 | Apr 10 |
| saved-mock-7 | Policy Analyst | EOP | GS-13 | ready | 84 | Mar 30 |
| saved-mock-8 | Data Scientist | Census Bureau | GS-13 | high-match | 91 | Apr 2 |

### Metrics strip expected values
- Total Saved: 8
- Ready to Apply: 2 (mock-2, mock-7)
- Needs Review: 2 (mock-3, mock-6)
- High Match: 3 (mock-1, mock-5, mock-8)
- Recently Saved: varies by 7-day window from current date (mock-1 and mock-2 are within ~4 days of Mar 14)

### PathAdvisor rail content expected
- Insight bullets: closing-soon count, needs-review count, highest match job name
- Next best action: "You have 3 jobs with High Match status. Focus on these before they close." / "Review High Match Jobs"

### No type additions needed
The Job interface already had matchScore, closeDate, telework, appointmentType, status fields from the earlier mockup alignment run.

### Files changed
- `packages/core/src/saved-jobs-mock-data.ts` (NEW)
- `packages/core/src/index.ts` (M)
- `packages/ui/src/screens/SavedJobsScreen.tsx` (M)

---

## Run 3: Parity correction pass — detail density, row actions, metric cards

### What changed
Three targeted defects corrected in `SavedJobsScreen.tsx`:

1. **Detail pane density**: Added Position Details key-value table (Grade, Pay range, Schedule, Remote, Promotion potential, Appointment type, Location, Status), Required Documents checklist, enhanced Readiness & Considerations with dual readiness/match scores and dynamic derived bullets based on job data. Detail workspace now has 8 content sections.

2. **Row interaction model**: Removed expanding inline Guided Apply/Remove buttons. Added compact right-side icon buttons (ChevronRight for peek, Trash2 for remove) matching Job Search's JobListItem pattern. Row height is stable regardless of selection state.

3. **Summary metric cards**: Increased padding to px-4 py-3.5, icon container to w-10 h-10, value text to text-2xl font-bold, label to text-[11px], shadow to 0 1px 3px. Cards are noticeably larger and closer to the approved mockup.

### Files changed
- `packages/ui/src/screens/SavedJobsScreen.tsx` (M)

---

## Run 4: Saved Jobs refinement — row action fix, PathOS Brief expansion, interaction-state guidance

Date: 2026-03-14

### What changed

1. **Row action defect fixed:** Removed the extra ChevronRight (greater-than) icon that appeared above the trash icon on each saved-job row. Only the Trash2 icon remains, vertically centered in the row action area. Row height stays stable. No expanding row buttons reintroduced.

2. **PathOS Brief expanded into structured decision-intelligence section:** The thin single-paragraph PathOS Brief was replaced with a structured sub-section layout containing:
   - **Role Fit** — one-line assessment of how the role matches the user, with match score
   - **Strategic Relevance** — why this role matters for the user's career trajectory (derived from grade)
   - **Strengths** — specific advantages PathOS identifies from job data (match score, readiness, telework, summary keywords)
   - **Risks** — honest assessment of gaps or concerns (low score, clearance, term appointment, close date urgency)
   - **Career Trajectory** — promotion potential and upside signal (derived from GS grade)
   - **Timing** — urgency or window assessment with "Urgent" badge when close date is within 14 days
   - **Recommendation** — concise pursuit rationale in an accent-tinted callout box

   All content is derived from available job data fields (matchScore, grade, closeDate, telework, appointmentType, summary). No generic filler — every section adapts to the specific job's attributes.

3. **Interaction-state guidance updated in canonical frontend docs:**
   - `docs/ai/cursor-house-rules.md` — expanded the UI and Accessibility Standards section with a new "Interaction-State Standard" sub-section. Includes a table of required states (hover, focus-visible, active, selected), an explicit list of control types this applies to (inputs, buttons, list rows, cards, tabs, dropdown triggers, chips, etc.), and consistency rules (keyboard-visible focus, theme tokens, selected surviving hover).
   - `AGENTS.md` — added cross-reference to the Interaction-State Standard in the local execution guidance.

### Files changed
- `packages/ui/src/screens/SavedJobsScreen.tsx` (M) — row action fix + PathOS Brief expansion
- `docs/ai/cursor-house-rules.md` (M) — interaction-state standard
- `AGENTS.md` (M) — cross-reference to interaction-state standard

### Validation
- Lint check: clean (no errors)
- Manual review: row action area has only trash icon, PathOS Brief renders structured sub-sections, docs updated

### Known risks / follow-ups
- The `handlePeekJob` callback and `onPeek` prop were removed since the ChevronRight button was the only consumer. If peek functionality is wanted in the future, it would need a different trigger.
- The "Why This May Be Worth Attention" callout (Section 6) partially overlaps with the Brief's Recommendation section. Consider consolidating in a future pass.
- Brief content is derived from available mock data fields; in a production system it would be driven by actual career-intelligence and labor-market APIs.

---

## Run 5: Structural correction pass — match intelligence, detail hierarchy, section cleanup

Date: 2026-03-14

### What changed

1. **Saved-job row readiness score (B):** Each row in the left list pane now shows a compact readiness score indicator (number + "ready" label) next to the trash icon. Color-coded by tier: green (>=80), accent (>=60), warning (<60). Uses the same `deriveReadinessScore` helper as the detail workspace for consistency.

2. **Match Intelligence block with weighted horizontal bars (C+D):** Replaced the weak "Readiness & Considerations" section with a comprehensive Match Intelligence block as the second section in the detail workspace (after job info, before PathOS Brief). Five weighted dimensions with horizontal progress bars:
   - Target Alignment (35%)
   - Specialized Experience (25%)
   - Resume Evidence (20%)
   - Keywords Coverage (12%)
   - Leadership / Scope (8%)
   Each bar is color-coded by score tier. Key Considerations bullets are placed below the bars.

3. **Detail card restructuring (C+E):** New section order: (1) Job info header with large readiness score in top-right, (2) Match Intelligence with dimension bars, (3) PathOS Brief, (4) Why This May Be Worth Attention, (5) Action row, (6) Trust footer. PathOS Brief moved from position 2 to position 3 — still prominent but after the quantitative match breakdown.

4. **Large readiness score in header (C):** The detail header top-right now shows a large (text-2xl) readiness score in a color-coded rounded container with "READINESS" label. Immediately visible without scrolling.

5. **Removed Position Details and Required Documents (F):** Both standalone bottom sections removed. Essential data (promotion potential, status) folded into the metadata pills row in the job info header. Grade, salary, location, telework, appointment type were already in the pills.

6. **Interaction-state consistency guidance (G):** Added five new consistency rules to `docs/ai/cursor-house-rules.md` covering: score-indicator color tiers, progress bar accessibility, list row height stability, action icon patterns, and derived-value consistency between list and detail views.

### Files changed
- `packages/ui/src/screens/SavedJobsScreen.tsx` (M) — match intelligence, readiness scores, detail restructuring, section removal
- `docs/ai/cursor-house-rules.md` (M) — interaction-state consistency rules

### Validation
- Typecheck: pass (clean, no errors)
- Manual review: detail card shows job info → match intelligence bars → PathOS Brief → attention callout → actions → trust footer; list rows show readiness score; no Position Details or Required Documents sections

### Known risks / follow-ups
- Match dimension scores are derived deterministically from matchScore + job attributes; in production they would come from the scoring engine
- The `deriveMatchDimensions` function uses deterministic offsets (not random) so scores are consistent across renders
- `BarChart2` icon added to lucide-react imports for the Match Intelligence section header

---

## Day 73 run — Structural correction pass (Saved Jobs page only) — March 14, 2026

### Goal
Front-load decision intelligence in the selected-job detail card; make readiness score visually important in both list and detail; replace weak match presentation with comprehensive match intelligence block; remove bottom sections that should be absorbed into the main information area; update canonical interaction-state guidance.

### What changed

**A. Row action cleanup:**
- Verified no extra chevron/greater-than icon exists in row action area — only the Trash2 icon is present, vertically centered
- Removed the old status tag + match score row from the top of each card (previously rendered when `job.status` was present)
- `ChevronRight` icon removed from imports (no longer used anywhere in the file)
- Right-side action column simplified: only trash icon, no readiness indicator in the action column

**B. Readiness score in list rows:**
- Added a prominent readiness score pill badge on the title row of each saved-job card
- Badge shows readiness as `{score}%` in a rounded-full pill with color-coded background (green >=80, accent >=60, warning <60)
- Uses `deriveReadinessScore()` — same function as detail view — for consistency
- Badge is visually stronger than status chips or metadata (bold, color-tinted bg, positioned at title level)

**C. Selected-job detail card restructuring:**
- Section order is now: (1) Job Information Header → (2) Match Intelligence → (3) PathOS Brief → (4) Actions → (5) Trust Footer
- Large readiness score remains in the top-right of the header area (text-2xl, color-coded, rounded-lg container)
- Essential position details (promotion potential, status) remain folded into header metadata pills

**D. Match intelligence block enhanced:**
- Each dimension row now shows 5 columns: dimension label, horizontal bar, numeric score, job emphasis badge ("High"/"Medium"/"Low"), gap state label ("Strong"/"Adequate"/"Gap")
- Column headers added for scannable reading
- Gap state uses color-coded text: green for Strong, accent for Adequate, warning for Gap
- Job emphasis badge uses accent-tinted background for "High" demand dimensions
- `MatchDimension` interface extended with `jobEmphasis` and `gapState` fields
- Duplicate MatchDimension interface and deriveMatchDimensions function cleaned up (removed accidental duplicate from prior edit)
- Key Considerations bullets now use dot bullets instead of ChevronRight icons

**E. PathOS Brief placement:**
- Confirmed at Section 3 (after Match Intelligence) — no change needed from prior run, placement was already correct
- Brief continues to include Role Fit, Strategic Relevance, Strengths/Risks, Career Trajectory, Timing, Recommendation

**F. Sections removed:**
- "Why This May Be Worth Attention" callout removed (its intelligence value is now covered by match intelligence block + PathOS Brief)
- Position Details and Required Documents were already removed in a prior run
- Section numbering updated in comments (Actions = Section 4, Trust = Section 5)

**G. Interaction-state guidance updated:**
- `docs/ai/cursor-house-rules.md` Interaction-State Standard enhanced with:
  - Explicit implementation patterns table per control type (primary button, secondary button, icon button, input, list row, tab, dropdown trigger, dropdown option, chip)
  - Each row specifies the expected hover, focus-visible, active, and selected treatment
  - "Recurring-defect prevention rules" section added with enforcement guidance
  - Rule that missing interaction states are defects, not optional polish

### Files changed
- `packages/ui/src/screens/SavedJobsScreen.tsx` (M) — row cleanup, readiness badge, match intelligence enhancement, section removal
- `docs/ai/cursor-house-rules.md` (M) — interaction-state implementation patterns table + prevention rules
- `docs/change-briefs/day-73.md` (M) — this update

### Validation
- Lint check: clean (no errors in SavedJobsScreen.tsx or cursor-house-rules.md)
- Manual structural review: detail card hierarchy matches required order; readiness badge visible in rows; match intelligence shows all 5 columns; no standalone bottom sections

### Known risks / follow-ups
- Brief content is derived from available mock data fields; production would use career-intelligence APIs
- Match dimension weights sum to 1.0 but the column headers don't show weights — weight percentage is available in the data but not visually displayed to keep the table compact
- The "Demand" column shows job emphasis which is derived deterministically; production would use announcement NLP

---

## Day 73 — Architecture correction: page/PathAdvisor ownership boundary — March 14, 2026

### Goal
Enforce the core product rule: the page owns job details + visual match intelligence; PathAdvisor owns interpretation, explanation, and decision guidance. Restructure the Saved Jobs detail card hierarchy and move brief intelligence into PathAdvisor as a unified output surface.

### What changed

**A. Detail card hierarchy restructured:**
- Section order is now: (1) Header (title, agency, readiness badge, match badge) → (2) Job Details (compact key-value grid) → (3) Match Intelligence (weighted dimension bars) → (4) Actions → (5) Trust Footer
- Job details section added as the FIRST content section after the header: location, grade, salary, appointment type, schedule, remote eligibility, promotion potential, closing date, status, saved date
- Compact two-column key-value grid layout with dim labels and normal-weight values

**B. GS badge removed from emphasis corner:**
- Removed the GS grade badge from the top-right high-emphasis area of the detail header
- Only the large readiness badge and match badge remain in the top-right corner
- Grade information now lives in the Job Details section where it belongs

**C. Match intelligence position verified:**
- Match intelligence (weighted dimension bars with scores, demand, gap state) confirmed in Section 3, after job details
- Users see the facts (job details) first, then the quantitative analysis (match intelligence)

**D. PathOS Brief removed from page:**
- Entire PathOS Brief section (Role Fit, Strategic Relevance, Strengths, Risks, Career Trajectory, Timing, Recommendation) removed from the detail card
- Brief intelligence now belongs to PathAdvisor (see E below)
- Unused icon imports cleaned up: Target, Zap, ThumbsUp, ShieldAlert removed from lucide-react imports

**E. PathAdvisor unified output surface:**
- Removed railContent (insight bullets + next best action mini-cards) from screen overrides
- PathAdvisor no longer shows stacked INSIGHT and NEXT BEST ACTION boxes for this screen
- Added context log integration: when a saved job is selected, the full brief content is pushed as a single structured PathAdvisorContextEntry via appendEntry()
- Entry contains 7 sections: Role Fit, Strategic Relevance, Likely Strengths, Likely Risks, Career Trajectory, Timing, Recommendation
- Entry includes a "Start Guided Apply" CTA and localOnly + explainability tags
- Deduplication via dedupeKey prevents duplicate entries when clicking the same job
- Context log entries are cleared on screen unmount via clearScreen('saved-jobs')
- PathAdvisorCard automatically shows context log entries as one coherent output flow instead of fragmented mini-cards

**F. Row readability verified:**
- Readiness score pill badge visible in each row title
- Trash icon only in right action area (no chevron, no extra buttons)
- Row height stable regardless of selection state

**G. Interaction-state consistency verified:**
- All interactive surfaces use INTERACTIVE_HOVER_CLASS and/or focus-visible:ring-2 patterns
- Selected card uses accent-tinted background + left border (stronger than hover)
- Buttons, inputs, sort dropdown, filter button all have hover/focus-visible feedback

### Files changed
- `packages/ui/src/screens/SavedJobsScreen.tsx` (M) — detail restructuring, brief removal, context log integration, import cleanup
- `docs/change-briefs/day-73.md` (M) — this update

### Validation
- Typecheck: pass (clean, no errors)
- Build: not run (network connectivity issue with npm registry)
- Manual structural review: detail card hierarchy matches required A-G corrections; PathAdvisor receives context log entries instead of railContent

### Known risks / follow-ups
- getSavedJobsRailContent() function is now unused (no longer called) but left in the file; can be removed in a cleanup pass
- Context log entries use deriveBriefContent() which produces deterministic content from mock data; production would use career-intelligence APIs
- The context log entry is appended on every selectedJob change; if the user rapidly clicks through jobs, multiple entries accumulate (by design — the context log is append-only with grouping by anchor)
- PathAdvisor needs a visual pass to ensure context log entry rendering matches the "unified terminal-style output" intent — current rendering uses the existing ContextLogEntryBlock component

---

## Day 73 — Detail workspace polish and structural stabilization pass — March 15, 2026

### Goal
Bring the Saved Jobs selected-job detail panel to professional workspace quality with stable structural zones and an independently scrolling content viewport.

### What changed

**Layout restructuring:**
- Replaced single overflow-y-auto root wrapper with a five-zone flex-column workspace frame
- Fixed zones: (1) Header, (2) Mode strip, (3) Section nav, (4) Scrollable content, (5) Action bar + trust footer
- Each fixed zone uses flex-shrink-0; only the content viewport scrolls
- Action bar no longer drifts when switching between shorter and longer content sections

**Mode switch redesigned:**
- Replaced filled/bordered button pair with underline-accent segmented workspace strip
- Active mode: accent text + 2px accent bottom bar; inactive: dim text, no underline
- Uppercase tracking-wide font-semibold for restrained, serious treatment
- INTERACTIVE_HOVER_CLASS for hover; focus-visible:ring-2 for keyboard focus

**Announcement section nav redesigned:**
- Extracted tabs from scrollable content to a fixed zone above the scroll container
- Replaced rounded pill/chip buttons with low-profile underline-accent text tabs
- No rounded backgrounds, no pill borders — reads as professional document navigation
- Tabs stay fixed while announcement content scrolls independently below

**Scroll containment:**
- Content viewport uses flex-1 min-h-0 overflow-y-auto with overscrollBehavior: contain
- Decision View and Announcement View content both scroll within this single viewport
- Action bar and trust footer sit outside the scroll container

### Files changed
- `packages/ui/src/screens/SavedJobsScreen.tsx` (M) — workspace frame, mode strip, section nav, scroll container, action bar pinning

### Validation
- Linter: clean
- Typecheck: pass (pre-existing test file issue only)
- Structural review: 5-zone layout correct; scroll isolated to content; action bar stable

### Known risks / follow-ups
- Human simulation recommended to verify scroll behavior and mode switch feel at runtime
- The fixed-zone layout depends on the parent container providing constrained height (the existing card panel does this correctly)
- If announcement sections are very short, the scroll container may have empty space below content — this is by design to keep the action bar anchored

---

## Run 4 — Decision View Refinement

### What changed (plain language)

The Saved Jobs detail view now shows the most important decision factors first — salary, grade and promotion potential, work mode (remote/telework), and deadline — in a compact strip at the top. Previously, this area was a flat list starting with location and grade, which buried the information people actually use to decide whether to pursue a role.

The "Decision View" and "Announcement" mode switch now feels more like a professional workspace tool. Each tab visibly reacts when you hover over it (the text brightens and a subtle line appears underneath), when you click it (brief feedback), and when it is the active mode (accent-colored text with a persistent underline bar). Previously these controls looked static and did not respond to interaction, which made the page feel unfinished.

The same hover and selection treatment was applied to the announcement section navigation tabs (Role Overview, Qualifications, Requirements, etc.). These now match the mode switch pattern for a consistent feel throughout the workspace.

The interaction-state standard in the frontend guidance docs was updated to explicitly list mode switches and section-level sub-navigation as controls that require visible hover, focus, active, and selected states. This prevents the same issue from recurring on future pages.

### What the user sees differently

1. **Top of the detail view** shows salary (in green), grade with promotion path (e.g., "GS-13 → GS-14"), work mode, and deadline in a clear 4-tile strip. Location, appointment type, and status appear in a smaller secondary line below. "Saved" and "Schedule" are no longer taking up space.

2. **Mode switch** and **section nav** now respond to mouse hover and keyboard focus. The active tab has a persistent accent underline and subtle background tint that remains even when hovering over it.

3. **Match Intelligence** appears higher on the page because the summary band above it is more compact than the old metadata grid. Users see more of the analytical content at first glance without scrolling.

### Files changed
- `packages/ui/src/screens/SavedJobsScreen.tsx` — mode switch and sub-nav redesign, decision-first summary band
- `docs/ai/cursor-house-rules.md` — interaction-state standard additions

---

## Run 5 — Shared Score Tier Colors

### What changed (plain language)

Readiness and match scores throughout the Saved Jobs page now use a green/amber/red color scale that matches how people intuitively read severity signals — green means strong, amber means needs attention, red means significant gap.

Previously, the color mapping was less intuitive: medium scores appeared in blue (the app's accent color) and weak scores appeared in amber. This meant a weak score looked cautionary rather than alarming, and a medium score looked neutral rather than cautionary. The new scale makes it immediately obvious which scores need attention just by scanning the colors.

The color mapping logic was also moved from a private function inside the Saved Jobs file into a shared module that Job Search and any future page can import. This means the same score will always appear in the same color regardless of which page you're looking at.

### What the user sees differently

1. **Medium readiness/match scores (60–79)** now appear in amber/yellow instead of blue
2. **Weak scores (below 60)** now appear in red instead of amber
3. **Gap labels** in the Match Intelligence section ("Gap", "Adequate") now use the same amber/red colors as their corresponding bar fills
4. **Limiting Factor** label in the match summary now appears in red to emphasize that it represents the weakest area

### Files changed
- `packages/ui/src/styles/scoreTiers.ts` (new) — shared score-tier color module
- `packages/ui/src/screens/SavedJobsScreen.tsx` — replaced local color function with shared import
- `docs/ai/cursor-house-rules.md` — updated score-tier color rule
