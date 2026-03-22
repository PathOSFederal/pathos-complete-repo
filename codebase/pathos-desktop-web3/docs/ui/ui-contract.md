# UI Contract

> **Purpose**: Documented UI and layout rules for the PathOS frontend. All shared shells and routes must adhere to these rules.

---

## Scroll Invariant v1

- The app must have exactly one primary vertical scroll container per screen: the main content region (not the window body).
- A scrollbar should appear only when content exceeds viewport height, aligned to the canvas/content width.
- Avoid double scrollbars. Do not add nested `overflow-y-auto` unless explicitly intended.
- Every route/screen must render inside the same main scroll container for consistency.
- Main canvas scrolls; PathAdvisor rail remains fixed. The rail may have its own internal scroll only if needed.

---

## Branding (App Logo)

- **Asset location:** The Voloro PathOS circular badge is stored at `app/web/public/branding/appLogo.png`. A copy at `public/branding/appLogo.png` is served by Next.js at `/branding/appLogo.png`.
- **Component:** Use the shared `AppBrand` component from `@pathos/ui` for top bar, sidebar, and any other in-app branding. It supports `iconOnly` and `iconAndText` variants and configurable size/className.
- **Replacing the logo:** Replace the file(s) above or pass a different `logoUrl` to `AppBrand`. For a symbol-only icon, use a separate asset and `variant="iconOnly"` (or a dedicated symbol URL).
- **Desktop/Electron:** In-app branding uses the same component; installer/app icon formats (e.g. .ico, .icns) are configured in the Electron build and are separate from `AppBrand`.
