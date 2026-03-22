# Archived Merge Notes — Day 13

> **Archive Notice:** This file was archived on December 13, 2025 as part of the Day 14 docs protocol initialization.
> It preserves the historical record of Day 13 changes.

---

# Merge Notes: Day 13 — Job Seeker Dashboard Refactor

**Branch:** `feature/day-13-dashboard-first-principles-refactor-jobseeker`  
**Date:** December 13, 2025  
**Status:** ✅ Merged

---

## Summary

- **Job Seeker dashboard reorganized** into PRIMARY (3 high-signal cards) and SECONDARY (collapsible Federal Offer Preview) tiers
- **Federal Offer Preview section** is collapsed on mobile (30-second value rule), expanded on desktop
- **CTA buttons** use correct `Button asChild` + `Link` pattern (no invalid DOM nesting)
- **Collapsible triggers** use Radix-controlled state with `type="button"` (no double-toggle)
- **Dev-only persona drift warning** added for development debugging

---

## Merge-Blocker Fixes Applied

### A) Collapsible Toggle Fix — `federal-offer-preview-section.tsx`

- `Collapsible` uses controlled mode: `open={isOpen}` + `onOpenChange={setIsOpen}`
- `CollapsibleTrigger asChild` wraps a `<button>` with NO manual `onClick` handler
- Added `type="button"` to prevent form submission if embedded in a form

### B) Benefits Collapsible Headers — `benefits-switching-card.tsx`

- `CollapsibleSection` component header button has `type="button"`

### C) Link + Button Nesting — `next-best-moves-card.tsx`

- Uses `<Button asChild><Link>...</Link></Button>` pattern for proper DOM semantics

### D) Dev-Only Persona Drift Warning — `app/dashboard/page.tsx`

- `useEffect` runs only when `process.env.NODE_ENV === 'development'`
- Warns if `user.currentEmployee` and `profile.persona` are out of sync

### E) CardKey Registry — `store/userPreferencesStore.ts`

- `'jobseeker.federalOfferPreview'` exists in `CardKey` union type
- `'jobseeker.federalOfferPreview'` exists in `ALL_CARD_KEYS` array

---

## Files Changed

| File | Change | Purpose |
|------|--------|---------|
| `app/dashboard/page.tsx` | M | Job Seeker dashboard flow, persona drift warning |
| `store/userPreferencesStore.ts` | M | Added CardKeys + fixed `any` types |
| `components/dashboard/job-seeker/index.ts` | A | Barrel export |
| `components/dashboard/job-seeker/market-position-card.tsx` | A | Market Position heuristics card |
| `components/dashboard/job-seeker/next-best-moves-card.tsx` | A | Actionable recommendations card |
| `components/dashboard/job-seeker/benefits-switching-card.tsx` | A | Benefits gain/loss card |
| `components/dashboard/job-seeker/federal-offer-preview-section.tsx` | A | Collapsible offer preview section |

---

## Behavior Changes

### Collapsible Behavior

| Component | Trigger | State Management |
|-----------|---------|------------------|
| `FederalOfferPreviewSection` | `CollapsibleTrigger asChild` + `<button type="button">` | Radix `onOpenChange` updates local `isOpen` state |
| `BenefitsSwitchingCard` (CollapsibleSection) | `<button type="button" onClick={toggle}>` | Local `useState` |

### CTA Semantics

| Component | Pattern | Result |
|-----------|---------|--------|
| `NextBestMovesCard` (EmptyStateMoves) | `<Button asChild><Link>` | Renders as `<a>` with button styling |
| `NextBestMovesCard` (MoveItemRow) | `<Button asChild><Link>` | Renders as `<a>` with button styling |

### Persona-Driven Rendering

| `user.currentEmployee` | Dashboard Flow |
|------------------------|----------------|
| `false` (Job Seeker) | MarketPosition, NextBestMoves, BenefitsSwitching, FederalOfferPreview (collapsible) |
| `true` (Federal Employee) | PathAdvisorInsights, Dashboard Cards Grid (unchanged) |

---

## Verification

- [x] `pnpm lint` passes
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes

---

*Archived from Day 13 work completed December 13, 2025*
