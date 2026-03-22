/**
 * ============================================================================
 * Z-INDEX SCALE — Overlay Rule v1
 * ============================================================================
 *
 * Centralized stacking order so dropdowns, tooltips, and sheets layer consistently.
 * Use these constants instead of magic numbers or one-off z-[...] classes.
 *
 * Order (low to high):
 * - layout: Fixed rails (e.g. PathAdvisor). Must be lower than popovers so
 *   dropdowns and tooltips always render on top.
 * - popover: DropdownMenuContent, popovers. Renders above layout (e.g. above
 *   PathAdvisor rail when "New version" is opened near the right edge).
 * - dialog: Modals, sheets, drawers. Above popovers so dialogs can contain
 *   dropdowns that still stack correctly.
 * - tooltip: Tooltip content (e.g. DrawerTooltip). Same layer as popover so
 *   tooltips and dropdowns coexist; use popover value for both when portaled.
 * - overlayRoot: Single global host for all portaled overlays (tooltips, dropdowns,
 *   dialogs). Above all other layers so overlays never render behind rails.
 */

/** DOM id for the global overlay host rendered by AppShell. Portals target this. */
export const OVERLAY_ROOT_ID = 'pathos-overlay-root';

export const Z_LAYOUT = 10;
export const Z_POPOVER = 50;
export const Z_DIALOG = 100;
export const Z_TOOLTIP = 50;
/** Global overlay host: above all layout/dialog so portaled content is never behind rails. */
export const Z_OVERLAY_ROOT = 1000;
