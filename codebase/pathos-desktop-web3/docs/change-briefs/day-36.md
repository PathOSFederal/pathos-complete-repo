# Day 36 – Advisor-led Conversational Onboarding Mode

**Date:** December 29, 2025  
**Branch:** `feature/day-36-advisor-led-onboarding-mode-v1`

---

## Objective

Implement Advisor-led conversational onboarding as a dashboard "mode" led by PathAdvisor (not a separate page). This reduces first-run noise, captures required profile data in a structured way behind the scenes, and delivers a personalized "how to use PathOS" intro after we know a little about the user.

This Day 36 delivery includes:
- (A) Onboarding micro-signal polish: warm, alive, guided experience with restrained accent color, subtle motion, improved copy rhythm, better CTA microcopy, and PathAdvisor presence
- (B) Optional advisor-led Guided Tour Mode with stable data-tour anchors, spotlight highlights, and short explanations of key dashboard areas

---

## What Changed

### New Features

1. **Onboarding Store** (`store/onboardingStore.ts`)
   - Manages onboarding state, step progression, and answer collection
   - Persists state to localStorage with key `pathos-onboarding-state`
   - Maps answers to profile store as user progresses

2. **Onboarding Mode Overlay** (`components/dashboard/OnboardingModeOverlay.tsx`)
   - Dims dashboard cards during onboarding mode
   - Keeps layout stable while emphasizing PathAdvisor conversation

3. **Onboarding Conversation** (`lib/onboarding/conversation.ts`, `components/dashboard/OnboardingPathAdvisorConversation.tsx`)
   - Deterministic conversation flow with 8 steps:
     1. Welcome and framing
     2. Persona selection (Job Seeker vs Federal Employee)
     3. Target grade band or current grade
     4. Location preference and relocation stance
     5. Top priorities (choose up to 3)
     6. Confirm summary
     7. Personalized "how to use PathOS" explanation
     8. Complete onboarding
   - One question at a time with choice chips for fast responses
   - Progress checklist shows onboarding steps

4. **Dashboard Integration**
   - Dashboard checks onboarding state on mount
   - Automatically enters onboarding mode if profile is incomplete
   - PathAdvisor shows onboarding conversation instead of normal chat
   - Cards are dimmed during onboarding mode

5. **Settings Control** (`app/settings/page.tsx`)
   - "Restart onboarding" button in Privacy & Security section
   - Allows users to re-enter onboarding mode to update profile

6. **Onboarding Micro-signal Polish** (Part A)
   - Restrained accent color used sparingly for current step, PathAdvisor panel presence, and primary CTA
   - Subtle motion: fade-in on step changes, CTA hover effects
   - Improved copy rhythm: two-beat conversational cadence, rewritten Welcome step, personalized intro step
   - Step bar feels like progress (not navigation) - dimmed future steps, completed shows check
   - CTA microcopy varies by step: "Let's begin", "Next", "Confirm", "Show me the dashboard", "Finish"
   - PathAdvisor presence: thin accent border around panel and small glyph indicator (no avatar)

7. **Guided Tour Mode** (Part B)
   - GuidedTour store (`store/guidedTourStore.ts`) with state management and localStorage persistence
   - GuidedTourOverlay component (`components/tour/GuidedTourOverlay.tsx`) with spotlight and tooltip
   - Stable data-tour anchors on key UI regions (PathAdvisor panel, Mission card, high-signal card, persona switch, privacy settings, settings entry)
   - 8 tour steps explaining key dashboard areas with short, actionable explanations
   - Tour trigger at end of onboarding (optional, asks permission)
   - Settings replay control: "Replay guided tour" button
   - **Tour Lock Mechanism**: When tour is active, the rest of the app is temporarily locked so users don't accidentally click away:
     - Page cannot scroll (body scroll locked)
     - Clicks on app content do nothing (pointer-events disabled)
     - Keyboard navigation (Tab) stays within tour popover only (focus trap)
     - App content is marked as non-interactive for screen readers (inert/aria-hidden)
     - Focus is saved when tour starts and restored when tour ends
   - **Enhanced Interaction Lock** (Day 36 continued):
     - Stable app root selection using `data-app-root="true"` attribute (replaces brittle class-based logic)
     - Robust click blocking with proper z-index layering (click interceptor above scrim, tooltip above everything)
     - Enhanced event prevention (clicks, wheel, touchmove, touchstart all blocked)
     - Tour behaves like a true modal: clicking anywhere outside tooltip does nothing

### Modified Components

- `app/dashboard/page.tsx`: Added onboarding mode detection and overlay
- `components/dashboard/CoachSessionPanel.tsx`: Added `isOnboardingMode` prop support
- `components/dashboard/JobSeekerCoachDashboardV1.tsx`: Passes onboarding mode to CoachSessionPanel
- `lib/storage-keys.ts`: Added `ONBOARDING_STORAGE_KEY` constant
- `components/app-shell.tsx`: Added `data-app-root="true"` attribute for stable app root selection
- `components/tour/GuidedTourOverlay.tsx`: Enhanced interaction lock with stable selector and improved click blocking

---

## Why

- **Reduces first-run noise**: Instead of showing all dashboard cards immediately, users get a focused onboarding experience
- **Structured data collection**: Profile data is collected in a structured, step-by-step way
- **Personalized intro**: After onboarding, PathAdvisor can explain PathOS features tailored to the user's persona and goals
- **Dashboard mode (not separate page)**: Onboarding happens within the dashboard context, making it feel like a natural part of the app

---

## User-Facing Behavior Changes

1. **First-time users**: Dashboard automatically enters onboarding mode when profile is incomplete
2. **Onboarding experience**: PathAdvisor guides users through 8 steps with one question at a time
3. **Visual feedback**: Dashboard cards are dimmed during onboarding to emphasize PathAdvisor
4. **Completion flow**: After completing onboarding, dashboard unlocks and PathAdvisor provides personalized intro
5. **Restart option**: Users can restart onboarding from Settings to update their profile
6. **Guided Tour lock**: During the guided tour, the rest of the app is temporarily locked so users don't accidentally click away or scroll. Only the tour UI (popover, next/back/skip/close buttons) is interactive. The tour behaves like a true modal - clicking anywhere outside the tooltip does nothing.

---

## Testing Evidence

### Unit Tests
- ✅ 12 tests for onboarding store covering initialization, step transitions, answer storage, completion, and restart
- ✅ All 464 tests pass (including new onboarding store tests)

### Manual Testing Checklist
- [ ] First-time user sees onboarding mode on dashboard load
- [ ] Can progress through all 8 onboarding steps
- [ ] Answers are saved to profile store as user progresses
- [ ] Dashboard cards are dimmed during onboarding
- [ ] Onboarding completes and dashboard unlocks
- [ ] Can restart onboarding from Settings
- [ ] Onboarding state persists after page refresh

---

## Technical Details

### Storage Keys
- `pathos-onboarding-state`: Stores onboarding mode state, current step, answers, and completion status
- `pathos-guided-tour-state`: Stores guided tour completion status (hasSeenTour)

### Store Actions
- `startOnboarding()`: Enters onboarding mode
- `answerCurrentStep(value)`: Stores answer and maps to profile store
- `goNext()` / `goBack()`: Navigate between steps
- `completeOnboarding()`: Exits onboarding mode and marks profile as complete
- `restartOnboarding()`: Clears answers and resets to first step

### Profile Mapping
Answers are immediately mapped to profile store:
- `persona` → `profile.persona`
- `gradeBand` → `profile.goals.gradeBand` and `targetGradeFrom/To`
- `relocationWillingness` → `profile.location.relocationWillingness`
- `priorities` → `profile.preferences.priorities`

---

## Follow-ups

1. **Location step enhancement**: Currently only asks about relocation willingness. Future: also collect current metro area.
2. **Edit flow**: Summary step "edit" option currently just goes back one step. Future: implement proper edit flow to jump to specific step.
3. **Federal employee grade mapping**: Current grade answer is stored but not fully mapped to `profile.current.grade`. Future: complete the mapping.
4. **Personalized intro enhancement**: Intro step is now personalized with persona, location, and priorities context, and includes tour trigger option.
5. **Tour step refinement**: Tour steps are v1 - future iterations can refine microcopy and add/remove steps based on user feedback.

---

*Last updated: December 29, 2025*
