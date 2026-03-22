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
 * WHERE IT FITS IN ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     components/dashboard/job-seeker/                    │
 * │  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────┐ │
 * │  │ market-position- │  │ next-best-moves- │  │ benefits-switching-   │ │
 * │  │    card.tsx      │  │    card.tsx      │  │       card.tsx        │ │
 * │  └────────┬─────────┘  └────────┬─────────┘  └───────────┬───────────┘ │
 * │           │                     │                        │             │
 * │  ┌────────┴─────────────────────┴────────────────────────┴───────────┐ │
 * │  │                federal-offer-preview-section.tsx                  │ │
 * │  │  (Day 13 Follow-up: collapsible section for offer estimates)      │ │
 * │  └────────┬──────────────────────────────────────────────────────────┘ │
 * │           │                                                            │
 * │           └─────────────────────────────────────────────────────────── │
 * │                                 │                                      │
 * │                        ┌────────▼────────┐                             │
 * │                        │   THIS FILE     │                             │
 * │                        │   (index.ts)    │                             │
 * │                        └────────┬────────┘                             │
 * └─────────────────────────────────┼──────────────────────────────────────┘
 *                                   │
 *                                   ▼
 *                        ┌─────────────────────┐
 *                        │ app/dashboard/page  │
 *                        │      (.tsx)         │
 *                        └─────────────────────┘
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
 * WHY THIS PATTERN:
 * 1. Cleaner imports - one line instead of four
 * 2. Encapsulation - consumers don't need to know file structure
 * 3. Easier refactoring - can reorganize files without changing imports
 * 4. Explicit public API - only export what should be used externally
 *
 * Day 13 COMPONENTS:
 * - MarketPositionCard: Shows fit, salary position, and mobility heuristics
 * - NextBestMovesCard: Lists 3-6 actionable recommendations
 * - BenefitsSwitchingCard: Shows gain/loss of switching to federal employment
 *
 * Day 13 FOLLOW-UP ADDITIONS:
 * - FederalOfferPreviewSection: Collapsible section containing offer simulator cards
 *   This section is collapsed on mobile by default (30-second value rule) and
 *   expanded on desktop. It contains TotalCompensationCard, RetirementReadinessCard,
 *   FehbComparisonCard, TaxInsightsCard, and PcsRelocationCard.
 */

// ============================================================================
// RE-EXPORTS
// Export each component from its respective file.
// ============================================================================

// Primary Job Seeker dashboard cards (Day 13)
export { MarketPositionCard } from './market-position-card';
export { NextBestMovesCard } from './next-best-moves-card';
export { BenefitsSwitchingCard } from './benefits-switching-card';

// Secondary collapsible section (Day 13 Follow-up)
// Contains offer simulator cards in a collapsible container
export { FederalOfferPreviewSection } from './federal-offer-preview-section';

