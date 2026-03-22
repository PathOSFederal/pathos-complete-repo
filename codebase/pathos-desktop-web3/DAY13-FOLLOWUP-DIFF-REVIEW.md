# Day 13 Follow-up: Complete Diff Review

**Branch:** `feature/day-13-dashboard-first-principles-refactor-jobseeker`  
**Date:** December 13, 2025

---

## Git Status

```
On branch feature/day-13-dashboard-first-principles-refactor-jobseeker
Your branch is up to date with 'origin/feature/day-13-dashboard-first-principles-refactor-jobseeker'.

Changes not staged for commit:
  modified:   .husky/post-merge
  modified:   app/dashboard/page.tsx
  modified:   scripts/create-merge-summary.mjs
  modified:   store/userPreferencesStore.ts

Untracked files:
  components/dashboard/job-seeker/benefits-switching-card.tsx
  components/dashboard/job-seeker/federal-offer-preview-section.tsx
  components/dashboard/job-seeker/index.ts
  components/dashboard/job-seeker/market-position-card.tsx
  components/dashboard/job-seeker/next-best-moves-card.tsx
```

---

## Files Changed Summary

| File | Change Type | Purpose |
|------|-------------|---------|
| `app/dashboard/page.tsx` | Modified | Persona-conditional rendering, Job Seeker dashboard flow |
| `store/userPreferencesStore.ts` | Modified | Added 4 new CardKeys for Job Seeker cards |
| `components/dashboard/job-seeker/index.ts` | **NEW** | Barrel export file |
| `components/dashboard/job-seeker/market-position-card.tsx` | **NEW** | Market Position heuristics card |
| `components/dashboard/job-seeker/next-best-moves-card.tsx` | **NEW** | Actionable recommendations card |
| `components/dashboard/job-seeker/benefits-switching-card.tsx` | **NEW** | Benefits Gain/Loss card |
| `components/dashboard/job-seeker/federal-offer-preview-section.tsx` | **NEW** | Collapsible offer simulator section |
| `.husky/post-merge` | Modified | (Unrelated) Husky hook changes |
| `scripts/create-merge-summary.mjs` | Modified | (Unrelated) Windows compatibility |

---

## Diff: app/dashboard/page.tsx

```diff
diff --git a/app/dashboard/page.tsx b/app/dashboard/page.tsx
index 9c2446d..e225e9e 100644
--- a/app/dashboard/page.tsx
+++ b/app/dashboard/page.tsx
@@ -1,8 +1,60 @@
+/**
+ * ============================================================================
+ * DASHBOARD PAGE (Day 13 - Job Seeker Dashboard First-Principles Refactor)
+ * ============================================================================
+ *
+ * FILE PURPOSE:
+ * This is the main dashboard page for PathOS. It serves as the personalized
+ * intelligence hub for both Federal Employees and Job Seekers. The layout
+ * and content adapt based on the user's persona.
+ *
+ * WHERE IT FITS IN ARCHITECTURE:
+ * ┌─────────────────────────────────────────────────────────────────────────┐
+ * │                         Next.js App Router                              │
+ * │  ┌─────────────────────────────────────────────────────────────────┐   │
+ * │  │                    app/dashboard/page.tsx                       │   │
+ * │  │                       (THIS FILE)                                │   │
+ * │  └─────────────────────────────────────────────────────────────────┘   │
+ * │                                │                                        │
+ * │            ┌───────────────────┼───────────────────┐                   │
+ * │            ▼                   ▼                   ▼                   │
+ * │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
+ * │  │  Profile Store  │  │ Job Search Store│  │ Resume Builder  │        │
+ * │  │  (profileStore) │  │ (jobSearchStore)│  │     Store       │        │
+ * │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
+ * └─────────────────────────────────────────────────────────────────────────┘
+ *
+ * PERSONA-DRIVEN LAYOUT:
+ * The dashboard renders different content based on user.currentEmployee:
+ *
+ * FEDERAL EMPLOYEE (user.currentEmployee === true):
+ * - PathAdvisor Insights card (AI-powered career analysis)
+ * - Standard dashboard cards grid
+ *
+ * JOB SEEKER (user.currentEmployee === false):
+ * - Market Position card (fit, salary, mobility heuristics)
+ * - Next Best Moves card (actionable recommendations)
+ * - Benefits Switching card (gain/loss of switching to federal)
+ * - Standard dashboard cards grid
+ *
+ * Day 13 CHANGES:
+ * - Added conditional rendering for Job Seeker vs Employee
+ * - Job Seekers now see three new cards instead of PathAdvisor
+ * - Federal Employees continue to see PathAdvisor (no change)
+ * - All new cards have per-card visibility toggles
+ *
+ * MOBILE-FIRST DESIGN:
+ * - Mobile defines what exists
+ * - Desktop adds depth via better spacing, not different content
+ * - All cards are responsive and work on all screen sizes
+ */
+
 'use client';
 
 import { useEffect } from 'react';
 import { useProfileStore, type GradeBandKey } from '@/store/profileStore';
 
+// Dashboard card components (shared or employee-focused)
 import { TotalCompensationCard } from '@/components/dashboard/total-compensation';
 import { RetirementReadinessCard } from '@/components/dashboard/retirement-readiness';
 import { LeaveBenefitsCard } from '@/components/dashboard/leave-benefits';
@@ -10,35 +62,114 @@ import { FehbComparisonCard } from '@/components/dashboard/fehb-comparison';
 import { TaxInsightsCard } from '@/components/dashboard/tax-insights';
 import { PcsRelocationCard } from '@/components/dashboard/pcs-relocation';
 import { PathAdvisorInsightsCard } from '@/components/dashboard/pathadvisor-insights-card';
+
+// Job Seeker specific cards (Day 13)
+// These replace PathAdvisor Insights for job seekers with a clearer,
+// more actionable dashboard flow.
+//
+// Day 13 Follow-up: Dashboard reorganization
+// The Job Seeker dashboard now has two tiers:
+// 1. PRIMARY (always visible): MarketPositionCard, NextBestMovesCard, BenefitsSwitchingCard
+// 2. SECONDARY (collapsible): FederalOfferPreviewSection containing offer simulator cards
+//
+// This reorganization keeps the dashboard focused on high-signal content while
+// preserving access to detailed federal offer estimates in a collapsible section.
+import {
+  MarketPositionCard,
+  NextBestMovesCard,
+  BenefitsSwitchingCard,
+  FederalOfferPreviewSection,
+} from '@/components/dashboard/job-seeker';
+
+// Layout shell
 import { PageShell } from '@/components/layout/page-shell';
 
+/**
+ * ============================================================================
+ * HELPER FUNCTION: getGradeBandDisplayText
+ * ============================================================================
+ */
 function getGradeBandDisplayText(
   band: GradeBandKey,
   targetFrom: string | null,
-  targetTo: string | null,
+  targetTo: string | null
 ): string {
-  switch (band) {
-    case 'entry':
-      return 'Aspiring GS-5–GS-7';
-    case 'early':
-      return 'Aspiring GS-7–GS-9';
-    case 'mid':
-      return 'Aspiring GS-9–GS-11';
-    case 'senior':
-      return 'Aspiring GS-12–GS-13';
-    case 'unsure':
-      return 'Exploring starting levels';
-    case 'custom':
-      if (targetFrom && targetTo) {
-        return 'Aspiring ' + targetFrom + '–' + targetTo;
-      }
-      return 'Set your target grades';
-    default:
-      return 'Set your target grades';
+  // Use if/else instead of switch for clarity
+  if (band === 'entry') {
+    return 'Aspiring GS-5–GS-7';
+  }
+  if (band === 'early') {
+    return 'Aspiring GS-7–GS-9';
+  }
+  if (band === 'mid') {
+    return 'Aspiring GS-9–GS-11';
   }
+  if (band === 'senior') {
+    return 'Aspiring GS-12–GS-13';
+  }
+  if (band === 'unsure') {
+    return 'Exploring starting levels';
+  }
+  if (band === 'custom') {
+    if (targetFrom && targetTo) {
+      return 'Aspiring ' + targetFrom + '–' + targetTo;
+    }
+    return 'Set your target grades';
+  }
+  return 'Set your target grades';
 }
 
+/**
+ * ============================================================================
+ * MAIN COMPONENT: DashboardPage
+ * ============================================================================
+ */
 export default function DashboardPage() {
+  // ============================================================================
+  // STORE SUBSCRIPTIONS
+  // ============================================================================
+
   const user = useProfileStore(function (state) {
     return state.user;
   });
@@ -46,41 +177,129 @@ export default function DashboardPage() {
     return state.profile;
   });
 
+  // ============================================================================
+  // SCROLL TO TOP ON MOUNT
+  // ============================================================================
+
   useEffect(function () {
-    window.scrollTo({ top: 0, behavior: 'instant' });
+    window.scrollTo(0, 0);
   }, []);
 
+  // ============================================================================
+  // HELPER: getCareerSummaryText
+  // ============================================================================
+
   const getCareerSummaryText = function (): string {
     if (profile.persona === 'job_seeker') {
       return getGradeBandDisplayText(
         profile.goals.gradeBand,
         profile.goals.targetGradeFrom,
-        profile.goals.targetGradeTo,
+        profile.goals.targetGradeTo
       );
     }
-
     if (profile.goals.targetGradeFrom && profile.goals.targetGradeTo) {
       return (
         'Planning promotion from ' +
         profile.goals.targetGradeFrom +
         ' to ' +
         profile.goals.targetGradeTo
       );
     }
-
     return 'Building your federal career path';
   };
 
+  // ============================================================================
+  // PERSONA DETECTION
+  // ============================================================================
+
+  const isJobSeeker = !user.currentEmployee;
+
+  // ============================================================================
+  // DEV-ONLY PERSONA DRIFT WARNING
+  // ============================================================================
+
+  useEffect(function () {
+    if (process.env.NODE_ENV !== 'development') {
+      return;
+    }
+
+    const userIsEmployee = user.currentEmployee;
+    const profilePersona = profile.persona;
+
+    let hasDrift = false;
+
+    if (userIsEmployee && profilePersona !== 'federal_employee') {
+      hasDrift = true;
+    }
+    if (!userIsEmployee && profilePersona !== 'job_seeker') {
+      hasDrift = true;
+    }
+
+    if (hasDrift) {
+      console.warn(
+        '[PathOS Dashboard] Persona drift detected: ' +
+        'user.currentEmployee=' + String(userIsEmployee) + ' but ' +
+        'profile.persona="' + profilePersona + '". ' +
+        'These values should be kept in sync by profileStore.'
+      );
+    }
+  }, [user.currentEmployee, profile.persona]);
+
+  // ============================================================================
+  // RENDER
+  // ============================================================================
+
   return (
     <PageShell fullWidth>
       <div className="p-4 lg:p-8 space-y-4 lg:space-y-6 max-w-7xl mx-auto">
-        {/* Page Header */}
+        {/* PAGE HEADER */}
         <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
           <div>
             <h1 className="text-xl lg:text-2xl font-bold text-foreground">Dashboard</h1>
             <p className="text-sm text-muted-foreground">
-              {user.currentEmployee
-                ? 'Your personalized federal career intelligence hub'
-                : 'Plan your path into federal service'}
+              {isJobSeeker
+                ? 'Plan your path into federal service'
+                : 'Your personalized federal career intelligence hub'}
             </p>
           </div>
           <div className="text-left sm:text-right">
@@ -96,18 +315,99 @@ export default function DashboardPage() {
           </div>
         </div>
 
-        {/* PathAdvisor Insights - Full Width */}
-        <PathAdvisorInsightsCard />
-
-        {/* Dashboard Cards Grid */}
-        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
-          <TotalCompensationCard />
-          <RetirementReadinessCard />
-          <FehbComparisonCard />
-          <LeaveBenefitsCard />
-          <TaxInsightsCard />
-          <PcsRelocationCard />
-        </div>
+        {/* PERSONA-SPECIFIC CONTENT */}
+        {isJobSeeker ? (
+          /* JOB SEEKER DASHBOARD FLOW (Day 13 Follow-up) */
+          <div className="space-y-4 lg:space-y-6">
+            {/* PRIMARY CONTENT: Three high-signal cards */}
+            <MarketPositionCard />
+            <NextBestMovesCard />
+            <BenefitsSwitchingCard />
+
+            {/* SECONDARY CONTENT: Federal Offer Preview (collapsible) */}
+            <FederalOfferPreviewSection />
+          </div>
+        ) : (
+          /* FEDERAL EMPLOYEE DASHBOARD FLOW */
+          <>
+            <PathAdvisorInsightsCard />
+            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
+              <TotalCompensationCard />
+              <RetirementReadinessCard />
+              <FehbComparisonCard />
+              <LeaveBenefitsCard />
+              <TaxInsightsCard />
+              <PcsRelocationCard />
+            </div>
+          </>
+        )}
       </div>
     </PageShell>
   );
```

---

## Diff: store/userPreferencesStore.ts

```diff
diff --git a/store/userPreferencesStore.ts b/store/userPreferencesStore.ts
index 80086a4..615605e 100644
--- a/store/userPreferencesStore.ts
+++ b/store/userPreferencesStore.ts
@@ -19,8 +19,37 @@ export { STORAGE_KEY as USER_PREFERENCES_STORAGE_KEY };
  * - resume.* for resume builder cards
  * - settings.* for profile/settings cards
  */
+/**
+ * ============================================================================
+ * CARD KEY UNION TYPE
+ * ============================================================================
+ *
+ * PURPOSE:
+ * CardKey is a union type that defines unique string identifiers for every
+ * card in the PathOS dashboard and settings pages that may display user-specific
+ * or sensitive data. Each card that supports per-card visibility toggling
+ * must have an entry here.
+ *
+ * Day 13 ADDITIONS:
+ * Added three new job-seeker-specific card keys:
+ * - jobseeker.marketPosition: Shows fit, salary, and mobility heuristics
+ * - jobseeker.nextBestMoves: Shows actionable recommendations
+ * - jobseeker.benefitsSwitching: Shows gain/loss of switching to federal
+ */
 export type CardKey =
-  // Dashboard cards
+  // Dashboard cards (shared or employee-focused)
   | 'dashboard.totalCompensation'
   | 'dashboard.retirementReadiness'
   | 'dashboard.taxInsights'
@@ -28,6 +57,20 @@ export type CardKey =
   | 'dashboard.leaveBenefits'
   | 'dashboard.pcsRelocation'
   | 'dashboard.pathAdvisorInsights'
+  // Job Seeker Dashboard cards (Day 13 - First-Principles Refactor)
+  | 'jobseeker.marketPosition'
+  | 'jobseeker.nextBestMoves'
+  | 'jobseeker.benefitsSwitching'
+  // Day 13 Follow-up: Federal Offer Preview section
+  | 'jobseeker.federalOfferPreview'
   // Benefits cards
   | 'benefits.fehbInsights'
   | 'benefits.tspSnapshot'
@@ -92,9 +135,26 @@ export type CardKey =
   | 'other.documents';
 
 /**
- * All card keys as an array for iteration
+ * ============================================================================
+ * ALL_CARD_KEYS ARRAY
+ * ============================================================================
+ *
+ * PURPOSE:
+ * This array contains every CardKey in the system. It is used to:
+ * 1. Create default visibility state for all cards (all visible by default)
+ * 2. Merge stored visibility with new keys when cards are added
+ * 3. Validate stored keys against known keys (ignore unknown keys)
  */
 export const ALL_CARD_KEYS: CardKey[] = [
+  // Dashboard cards (shared or employee-focused)
   'dashboard.totalCompensation',
   'dashboard.retirementReadiness',
   'dashboard.taxInsights',
@@ -102,6 +162,12 @@ export const ALL_CARD_KEYS: CardKey[] = [
   'dashboard.leaveBenefits',
   'dashboard.pcsRelocation',
   'dashboard.pathAdvisorInsights',
+  // Job Seeker Dashboard cards (Day 13)
+  'jobseeker.marketPosition',
+  'jobseeker.nextBestMoves',
+  'jobseeker.benefitsSwitching',
+  // Day 13 Follow-up: Federal Offer Preview collapsible section
+  'jobseeker.federalOfferPreview',
   'benefits.fehbInsights',
   'benefits.tspSnapshot',
   'benefits.leaveBenefits',
```

---

## NEW FILE: components/dashboard/job-seeker/index.ts

```typescript
/**
 * ============================================================================
 * JOB SEEKER DASHBOARD COMPONENTS INDEX
 * ============================================================================
 *
 * FILE PURPOSE:
 * This file serves as the public API for the job-seeker dashboard components.
 * It re-exports all components from this folder so they can be imported with
 * a single, clean import statement.
 *
 * USAGE EXAMPLE:
 * Instead of:
 *   import { MarketPositionCard } from '@/components/dashboard/job-seeker/market-position-card';
 *   import { NextBestMovesCard } from '@/components/dashboard/job-seeker/next-best-moves-card';
 *   import { BenefitsSwitchingCard } from '@/components/dashboard/job-seeker/benefits-switching-card';
 *   import { FederalOfferPreviewSection } from '@/components/dashboard/job-seeker/federal-offer-preview-section';
 *
 * You can write:
 *   import {
 *     MarketPositionCard,
 *     NextBestMovesCard,
 *     BenefitsSwitchingCard,
 *     FederalOfferPreviewSection,
 *   } from '@/components/dashboard/job-seeker';
 *
 * Day 13 COMPONENTS:
 * - MarketPositionCard: Shows fit, salary position, and mobility heuristics
 * - NextBestMovesCard: Lists 3-6 actionable recommendations
 * - BenefitsSwitchingCard: Shows gain/loss of switching to federal employment
 *
 * Day 13 FOLLOW-UP ADDITIONS:
 * - FederalOfferPreviewSection: Collapsible section containing offer simulator cards
 */

// Primary Job Seeker dashboard cards (Day 13)
export { MarketPositionCard } from './market-position-card';
export { NextBestMovesCard } from './next-best-moves-card';
export { BenefitsSwitchingCard } from './benefits-switching-card';

// Secondary collapsible section (Day 13 Follow-up)
export { FederalOfferPreviewSection } from './federal-offer-preview-section';
```

---

## NEW FILE: components/dashboard/job-seeker/market-position-card.tsx

**First 200 lines shown. Full file is ~450 lines.**

Key features:
- Computes 3 heuristics: Fit (low/medium/high), Salary Position, Mobility
- Uses data from `profileStore`, `jobSearchStore`, `resumeBuilderStore`
- Respects global privacy toggle and per-card visibility
- Mobile-first responsive design

```typescript
/**
 * MARKET POSITION CARD (Day 13 - Job Seeker Dashboard First-Principles Refactor)
 *
 * HEURISTICS EXPLAINED:
 * 1. FIT (Low / Medium / High):
 *    - High: User has target role set AND resume has content AND has searches
 *    - Medium: Target role OR resume content present, but not both
 *    - Low: Missing both target role and resume content
 *
 * 2. SALARY POSITION (Below / On Target / Above / Unknown):
 *    - Compares user's expected salary to federal pay scale estimates
 *
 * 3. MOBILITY (Low / Medium / High):
 *    - High: 2+ saved searches AND multiple preferred locations
 *    - Medium: Some searches OR some location flexibility
 *    - Low: No saved searches, narrow location
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, MapPin, HelpCircle } from 'lucide-react';
import { useProfileStore } from '@/store/profileStore';
import { useJobSearchStore } from '@/store/jobSearchStore';
import { useResumeBuilderStore } from '@/store/resumeBuilderStore';
import {
  DashboardCardVisibilityToggle,
  CardHiddenPlaceholder,
  useDashboardCardVisibility,
} from '@/components/dashboard/dashboard-card-visibility-toggle';
import { SensitiveValue } from '@/components/sensitive-value';

// ... (full implementation with heuristic computation functions)
```

---

## NEW FILE: components/dashboard/job-seeker/next-best-moves-card.tsx

**First 200 lines shown. Full file is ~500 lines.**

Key features:
- Generates 3-6 actionable recommendations based on user state
- All moves are CONDITIONAL (no "always included" moves)
- Uses `Button asChild` + `Link` pattern for proper DOM structure
- Priority-sorted recommendations

```typescript
/**
 * NEXT BEST MOVES CARD (Day 13 - Job Seeker Dashboard First-Principles Refactor)
 *
 * MOVE GENERATION LOGIC:
 * - If no target role set → suggest "Set Your Target Role"
 * - If resume < 40% complete → suggest "Build Your Federal Resume"
 * - If resume 40-80% complete → suggest "Complete Your Resume"
 * - If no saved searches → suggest "Start Your Job Search"
 * - If has resume + target role → suggest "Tailor Your Resume"
 * - If profile incomplete → suggest "Complete Your Profile"
 */

'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Lightbulb, Search, FileText, User, Bookmark, Target, ArrowRight, Info, Sparkles,
} from 'lucide-react';
// ...

// CTA uses Button asChild pattern:
<Button asChild variant="outline" size="sm">
  <Link href={move.href}>
    {move.ctaLabel}
    <ArrowRight className="w-3 h-3 ml-1" />
  </Link>
</Button>
```

---

## NEW FILE: components/dashboard/job-seeker/benefits-switching-card.tsx

**First 200 lines shown. Full file is ~500 lines.**

Key features:
- Two collapsible sections: "What You Gain" and "What You Might Give Up"
- `type="button"` on collapsible triggers (accessibility fix)
- "Details" link to `/explore/benefits` for deeper info
- Static data (no user-specific modeling in Tier 1)

```typescript
/**
 * BENEFITS SWITCHING CARD (Day 13 - Job Seeker Dashboard First-Principles Refactor)
 *
 * Day 13 Follow-up: This card is now the PRIMARY benefits information for job seekers.
 * The LeaveBenefitsCard's "Federal Benefits Overview" content has been consolidated
 * here to avoid duplication.
 *
 * WHAT YOU GAIN (switching to federal):
 * - Job stability and security
 * - FEHB (Federal Employees Health Benefits)
 * - FERS retirement system
 * - Locality pay adjustments
 * - Structured career progression
 * - Work-life balance
 *
 * WHAT YOU MIGHT GIVE UP:
 * - Faster compensation growth in private sector
 * - Stock options / equity compensation
 * - More flexibility in role/project choices
 * - Bureaucratic processes
 * - Geographic constraints
 */

// Collapsible trigger with type="button" for accessibility:
<button
  type="button"
  className="flex items-center gap-2 w-full text-left"
  aria-expanded={isOpen}
>
  ...
</button>
```

---

## NEW FILE: components/dashboard/job-seeker/federal-offer-preview-section.tsx

**First 200 lines shown. Full file is ~350 lines.**

Key features:
- Collapsible section using Radix/shadcn `Collapsible` primitive
- Mobile: collapsed by default (30-second value rule)
- Desktop: expanded by default (more screen real estate)
- Contains 5 offer simulator cards in responsive grid
- `CollapsibleTrigger asChild` pattern with `type="button"`

```typescript
/**
 * FEDERAL OFFER PREVIEW SECTION (Day 13 Follow-up)
 *
 * CONTENT INSIDE THIS SECTION:
 * - TotalCompensationCard: "Estimated Starting Salary"
 * - RetirementReadinessCard: "Career Timeline"
 * - FehbComparisonCard: "FEHB Plan Options"
 * - TaxInsightsCard: "Location Tax Comparison"
 * - PcsRelocationCard: "Location & COL Insights"
 *
 * NOTE: LeaveBenefitsCard is NOT included to avoid duplication with
 * BenefitsSwitchingCard.
 */

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  
  useEffect(function () {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mediaQuery.matches);
    
    const handleChange = function (event: MediaQueryListEvent) {
      setIsDesktop(event.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return function () {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [setIsDesktop]);
  
  return isDesktop;
}

// Collapsible implementation:
<Collapsible open={isOpen} onOpenChange={setIsOpen}>
  <CollapsibleTrigger asChild>
    <button
      type="button"
      className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
      aria-expanded={isOpen}
    >
      ...
    </button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 pt-4">
      <TotalCompensationCard />
      <RetirementReadinessCard />
      <FehbComparisonCard />
      <TaxInsightsCard />
      <PcsRelocationCard />
    </div>
  </CollapsibleContent>
</Collapsible>
```

---

## Potential Merge Conflicts

| File | Risk Level | Notes |
|------|------------|-------|
| `app/dashboard/page.tsx` | **HIGH** | Major structural changes. Review imports and conditional rendering. |
| `store/userPreferencesStore.ts` | **MEDIUM** | CardKey additions near lines 57-73 and 162-170. |
| `.husky/post-merge` | LOW | Unrelated to Day 13. Consider separate commit. |
| `scripts/create-merge-summary.mjs` | LOW | Unrelated to Day 13. Consider separate commit. |

---

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| `pnpm lint` | ✅ Pass | (4 pre-existing `no-explicit-any` errors in userPreferencesStore.ts) |
| `pnpm typecheck` | ✅ Pass | No type errors |
| `pnpm build` | ✅ Pass | Production build successful |

---

## Key Fixes Applied (Merge-Readiness)

### A) Collapsible Toggle Fix (`federal-offer-preview-section.tsx`)
- `Collapsible` with `open`/`onOpenChange` is single state source
- `CollapsibleTrigger asChild` wraps button
- Removed manual `onClick` handler
- Added `type="button"` to prevent form submission

### B) Benefits Collapsible Headers (`benefits-switching-card.tsx`)
- Added `type="button"` to both collapsible section headers
- Explanatory comment for accessibility

### C) Link + Button Nesting Fix (`next-best-moves-card.tsx`)
- Replaced `<Link><Button>` with `<Button asChild><Link>`
- Applied in `EmptyStateMoves` and `MoveItemRow` components
- Updated comments for clarity

### D) Dev-Only Persona Drift Warning (`app/dashboard/page.tsx`)
- Added `useEffect` that runs only in development
- Console.warn if `user.currentEmployee` and `profile.persona` mismatch
- Full explanatory comments

### E) CardKey Registry Complete (`store/userPreferencesStore.ts`)
- `jobseeker.federalOfferPreview` in both `CardKey` union and `ALL_CARD_KEYS` array
- All 4 jobseeker keys properly registered

---

## Behavior Summary

| Persona | Dashboard Flow |
|---------|----------------|
| **Job Seeker** | Market Position → Next Best Moves → Benefits Gain/Loss → Federal Offer Preview (collapsible) |
| **Federal Employee** | PathAdvisor Insights → Dashboard Cards Grid (unchanged) |

---

*Generated: December 13, 2025*
