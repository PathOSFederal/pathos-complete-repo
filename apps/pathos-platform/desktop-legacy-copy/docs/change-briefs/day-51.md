# Day 51 Change Brief

Restored correct desktop shell entrypoint.
# Day 51 Change Brief

Reverted theme changes after regression.
# Day 51 Change Brief

The desktop renderer now maps its own surface tokens to the PathOS palette so the app background, nav rail, panels, and cards lift consistently with the web theme. Local tokens now define `surface-app`, `surface-rail`, `surface-panel`, and `surface-card`, plus a shared hover surface.

Navigation typography now follows the web hierarchy: the PathOS title is bright, subtitles and labels are muted, nav items default to secondary text, and active items use primary text with a thin gold left indicator. Panels and headings now use the same text tokens, removing the last hardcoded colors that drifted from the web UI.

The Activity Log starts collapsed by default, persists user choice, and uses a compact collapsed height. No debug styling remains in the renderer.

Restored the USAJOBS workbench view with the Day 49 BrowserView wiring and added a small load-failure notice in the center panel.

Aligned the desktop renderer theme with the PathOS web dashboard by mapping canonical surface/text tokens to the web theme and swapping all nav, header, PathAdvisor rail, and Activity Log colors to those tokens. Active navigation now uses the same subtle surface highlight and gold indicator bar as the web UI.

Adjusted the Workbench layout so the USAJOBS card scrolls with the page while the webview content continues scrolling inside the panel.
