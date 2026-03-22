# PathAdvisor Context Log — UX contract

**Purpose:** Defines how PathAdvisor behaves as a global, append-only "Context Log" across PathOS. Main canvas stays interactive; PathAdvisor holds the longer explanation payload.

---

## Main canvas vs PathAdvisor responsibilities

| Responsibility | Main canvas | PathAdvisor Context Log |
|----------------|-------------|--------------------------|
| Interactive controls | Yes: buttons, list selection, breakdown rows, filters | No: log is read-only; Clear screen / Clear thread only |
| Short labels and scores | Yes: e.g. Readiness 74/100, Job match 46/100 (Stretch) | Shown in entry title/subtitle when relevant |
| Long explanation | No | Yes: "What you're missing", rationale, blocker narrative, evidence bullets |
| Next best action CTA | Yes: one primary CTA when obvious (e.g. Open Career Readiness) | Yes: per-entry CTAs (nav or noop) |
| Privacy / local-only | Not as a persistent pill | As a tag or line inside the entry (tag `localOnly`) |

**Rule:** On meaningful clicks (job select, dimension click, Today's Focus hero, etc.), the app **appends** an entry to the Context Log. The log is grouped by anchor and stays premium via dedupe and clear controls.

---

## Entry schema

- **Anchor:** `{ type: 'job'|'resume'|'card'|'screen'|'other'; id: string; label: string }` — grouping key; e.g. job id + job title as label.
- **Entry:** `id`, `createdAtISO`, `screen`, `anchor`, `title`, `subtitle?`, `sections[]`, `ctas?`, `tags?`.
- **Section:** `title?`, `lines?`, `bullets?`, `meta?` (optional key-value).
- **CTA:** `{ label: string; action: 'nav'|'noop'; route?: string }`.
- **Tags:** `'localOnly' | 'demo' | 'explainability'` (for audit/display; e.g. "Local only" as a line in the entry, not a rail pill).

**Dedupe key:** Callers may pass `dedupeKey` when appending. If the latest entry for that anchor has the same `dedupeKey`, the store does **not** append a duplicate; it only sets that anchor active.

---

## Dedupe rule

- In `appendEntry(entry, options?)`, if `options.dedupeKey` is set and the **latest** entry for that anchor has the same `dedupeKey`, do **not** append.
- Instead: set that anchor as active (and optionally return). This keeps the log from filling with repeated identical clicks.

---

## Grouping rule

- Entries are grouped by **anchor key**: `screen:anchor.type:anchor.id`.
- In the UI (PathAdvisorCard), anchors are shown as collapsible sections.
- **Only the active anchor is expanded by default.** When a new entry is appended, that anchor becomes active and expands.
- Each anchor header shows: label, entry count, collapse toggle. Optional: "Clear this thread" to remove only that anchor’s entries.

---

## Clear behavior

- **Clear screen:** Removes all entries for the **current screen** only (e.g. `job-search`). Other screens’ entries are unchanged.
- **Clear this thread:** Removes all entries for **one anchor** (one anchorKey). Other anchors and screens unchanged.
- **Clear all:** (If exposed) removes every entry and clears active anchor.

---

## Accessibility expectations

- Anchor headers are buttons with `aria-expanded` and an accessible label (e.g. "Expand …" / "Collapse …").
- Entry content uses semantic structure (headings, lists, buttons for CTAs).
- Focus order: header actions (Clear screen, Clear chat, Settings) → anchor headers → entries → Quick questions → composer.
- No information conveyed by color alone; use text/labels and icons.

---

*Last updated: Day 62 — PathAdvisor Context Log global v1*
