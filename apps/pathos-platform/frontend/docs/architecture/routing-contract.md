# Routing contract (Next 3000 vs Desktop 5173)

> **Purpose**: Permanent rule so Cursor/Codex never duplicate screens or break Sidebar nav. Single source of truth for route paths and screen ownership.

---

## Rules

1. **Next routes are wrappers only.**  
   App route files under `app/**` must only wrap shared screens from `packages/ui/src/screens/*`. No business logic or data injection that is not also available in Desktop.

2. **Desktop routes are wrappers only.**  
   `apps/desktop/src/DesktopApp.tsx` routes must render shared screens from `@pathos/ui` (or placeholders). No desktop-only screen logic that duplicates a shared screen.

3. **All Sidebar hrefs must resolve in both Next and Desktop.**  
   Every link in the shared Sidebar must have a matching route in both environments. Stub/placeholder screens are allowed (e.g. `PlaceholderScreen` from `@pathos/ui`).

4. **Guided Apply path.**  
   - **Canonical:** `/desktop/usajobs-guided` — Sidebar links here; both Next and Desktop serve this path.  
   - **Alias:** `/guided-apply` — redirect only (redirect to canonical); not used by Sidebar.

5. **Shared screens live in `packages/ui/src/screens/*`.**  
   New screen implementations go in the UI package. Next and Desktop import and render them; they do not duplicate the implementation.

6. **Shared route constants live in `packages/ui/src/routes/routes.ts`.**  
   Sidebar and any cross-platform nav use these constants. No string duplication for hrefs.

---

## Reference

- **Route constants:** `packages/ui/src/routes/routes.ts`  
- **Shared screens:** `packages/ui/src/screens/*`  
- **Desktop route table:** `apps/desktop/src/DesktopApp.tsx`  
- **Next app routes:** `app/**`
