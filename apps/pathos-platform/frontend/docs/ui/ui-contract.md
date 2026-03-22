# UI Contract

> **Purpose**: Documented UI and layout rules for the PathOS frontend. All shared shells and routes must adhere to these rules.

---

## Scroll Invariant v1

- The app must have exactly one primary vertical scroll container per screen: the main content region (not the window body).
- A scrollbar should appear only when content exceeds viewport height, aligned to the canvas/content width.
- Avoid double scrollbars. Do not add nested `overflow-y-auto` unless explicitly intended.
- Every route/screen must render inside the same main scroll container for consistency.
- Main canvas scrolls; PathAdvisor rail remains fixed. The rail may have its own internal scroll only if needed.
