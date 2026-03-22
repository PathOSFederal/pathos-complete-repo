# Day 39 — Ask PathAdvisor CTA Standardization

**Date:** December 30, 2025  
**Type:** Feature Enhancement

---

## What Changed

We standardized all "Ask PathAdvisor" buttons across the application to have a consistent look and behavior. This makes PathAdvisor feel more integrated and accessible throughout PathOS.

### Visual Standardization

- **New reusable button component**: All "Ask PathAdvisor" buttons now use the same amber-tinted gradient styling that stands out on dark backgrounds
- **Consistent appearance**: The same button design appears everywhere, making it easy for users to recognize the PathAdvisor feature
- **Better visibility**: The amber color and gradient ensure buttons are clearly visible and don't blend into the background

### Behavior Standardization

- **New helper function**: Created a canonical `openPathAdvisor()` function that all buttons use to open PathAdvisor
- **Consistent opening behavior**: PathAdvisor now opens the same way from all entry points (expanded modal or sidebar, depending on context)
- **Structured context**: All PathAdvisor requests now include structured information (intent, source, object reference) for better tracking and future backend integration

### Where You'll See It

- **Resume Builder Export**: "Ask PathAdvisor for Review Suggestions" button in the export section
- **Job Search Panel**: "Ask PathAdvisor" button when viewing a job
- **Job Details Slideover**: "Ask PathAdvisor about this job" button in job details

---

## Why This Matters

**Before**: Different "Ask PathAdvisor" buttons looked different and behaved inconsistently. Some buttons were hard to see, and the opening behavior varied.

**After**: All "Ask PathAdvisor" buttons have the same distinctive amber styling and open PathAdvisor consistently. Users can easily find and use PathAdvisor from anywhere in the application.

---

## Technical Details

- Created `AskPathAdvisorButton` component with standardized amber-tinted gradient styling
- Created `openPathAdvisor()` helper function for consistent PathAdvisor opening behavior
- Replaced all existing "Ask PathAdvisor" buttons with the new standardized component
- Updated three entry points to use the new helper function

---

## User Impact

- **Easier to find**: The consistent amber styling makes PathAdvisor buttons easy to spot
- **More predictable**: PathAdvisor opens the same way from all entry points
- **Better experience**: Users can get PathAdvisor help from anywhere in the application

---

*This change is frontend-only and does not affect any backend services or data storage.*
