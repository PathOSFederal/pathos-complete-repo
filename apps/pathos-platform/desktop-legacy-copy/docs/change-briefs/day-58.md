# Day 58 – Job Search Mental Model Clarification (Explicit Hierarchy)

## Scope expanded
Day 58 started as a mental model clarification between USAJOBS and Explore. During implementation we hit a renderer boot failure that caused UI unresponsiveness. The day expanded to include renderer trust hardening and diagnostics.

Note: Part B content was originally mislabeled as Day sixty one and is now corrected under Day 58.

## Part A: Mental Model Clarification (UX only)

### Why we did this now
People need immediate clarity on what is official versus what is advisory when they are comparing roles. This update anchors USAJOBS as the trusted source of truth and explains how PathOS guides exploration without replacing it.

### What this enables next
- Easier trust-building when the product introduces more guidance layers
- Clearer mental model for why there are two complementary job-search views
- A stronger foundation for advisory language in upcoming UX iterations

### What changed
- Renamed navigation labels to make the USAJOBS and PathOS hierarchy explicit
- Added short helper lines in the USAJOBS and Explore Careers views to explain their roles
- Added one dashboard line reinforcing PathOS analysis of USAJOBS listings

### What did not change
- No routes, features, or data sources changed
- No onboarding flows, tutorials, or modals were added
- USAJOBS functionality remains fully accessible and unchanged


---

## Part B: Renderer Trust Hardening and Diagnostics (infrastructure)

### Why we did this now
Recent renderer edits highlighted how a parse failure can leave the UI unresponsive without a clear signal. This adds explicit boot visibility and a degraded-state banner so failures are obvious and diagnosable.

### What this enables next
- Faster diagnosis when renderer scripts fail to load or initialize
- Clear guidance for users to open DevTools when the UI is stuck
- Safer UI changes with a boot readiness marker

### What changed
- Added a fatal banner that appears when the renderer fails to boot
- Registered window-level error handlers to surface early failures
- Added a boot-ready marker and a timeout check for parse errors

### What did not change
- No store logic, persistence, or data flows were modified
- No new views, routes, or navigation labels were introduced
- No runtime behavior changes beyond the safety banner and error handlers
