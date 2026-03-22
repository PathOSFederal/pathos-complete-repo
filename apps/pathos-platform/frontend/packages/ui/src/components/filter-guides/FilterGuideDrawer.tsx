/**
 * ============================================================================
 * FILTER GUIDE DRAWER — Right-side portaled drawer for Series / Agency / Location guides
 * ============================================================================
 *
 * Overlay Rule v1: Renders via Radix Dialog portaled to OverlayRoot so the drawer
 * is never clipped by scroll panes or the PathAdvisor rail. Uses shared zIndex
 * constants; do not use Tailwind zIndex utilities. Token-only styling (var(--p-*)).
 *
 * Modes: series, agency, location (all full UI + data). Row hover highlight and
 * full-row click apply filter and close drawer. Scrollbar styled via data-scroll-container.
 */

'use client';

import type React from 'react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, X } from 'lucide-react';
import { OVERLAY_ROOT_ID, Z_DIALOG } from '../../styles/zIndex';
import type { FilterGuideKind } from './filterGuideTypes';
import type { AgencyGuideEntry } from './filterGuideTypes';
import type { LocationGuideEntry } from './filterGuideTypes';
import {
  SERIES_GUIDE_DATA,
  SERIES_CATEGORIES,
  filterSeriesGuide,
  type SeriesGuideEntry,
} from './seriesGuideData';
import {
  AGENCY_GUIDE_DATA,
  AGENCY_CATEGORIES,
  filterAgencyGuide,
} from './agencyGuideData';
import {
  LOCATION_GUIDE_DATA,
  filterLocationGuide,
} from './locationGuideData';

// ---------------------------------------------------------------------------
// Overlay container (SSR-safe)
// ---------------------------------------------------------------------------

function getOverlayContainer(): HTMLElement | undefined {
  if (typeof document === 'undefined') return undefined;
  const el = document.getElementById(OVERLAY_ROOT_ID);
  return el !== null ? el : document.body;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FilterGuideDrawerProps {
  /** Which guide is shown: series, agency, or location. */
  kind: FilterGuideKind;
  /** Controlled open state. */
  open: boolean;
  /** Called when open state should change (e.g. close). */
  onOpenChange: (open: boolean) => void;
  /**
   * When user selects a series (kind === 'series'), called with that series code.
   * Caller should apply to filters and close drawer; optional runSearch after.
   */
  onApplySeries?: (seriesCode: string) => void;
  /**
   * When user selects an agency (kind === 'agency'), called with canonical agency name.
   * Caller should set filters.agency and close drawer; optional runSearch after.
   */
  onApplyAgency?: (agencyName: string) => void;
  /**
   * When user selects a location (kind === 'location'), called with value to set in store
   * (entry.applyValue or entry.label). Caller should set filters.location and close drawer.
   */
  onApplyLocation?: (locationValue: string) => void;
}

// ---------------------------------------------------------------------------
// Drawer content by kind
// ---------------------------------------------------------------------------

const FOOTER_HELPER = 'Click a row to apply to filters.';

/** Title per kind. */
function getTitle(kind: FilterGuideKind): string {
  if (kind === 'series') return 'Series & role guide';
  if (kind === 'agency') return 'Agency guide';
  return 'Location picker';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FilterGuideDrawer(props: FilterGuideDrawerProps): React.ReactElement {
  const kind = props.kind;
  const open = props.open;
  const onOpenChange = props.onOpenChange;
  const onApplySeries = props.onApplySeries;
  const onApplyAgency = props.onApplyAgency;
  const onApplyLocation = props.onApplyLocation;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Reset local state when drawer opens (so each open starts fresh).
  // Deferred to avoid react-hooks/set-state-in-effect (setState in effect callback, not sync).
  useEffect(
    function () {
      if (!open) return;
      const t = setTimeout(function () {
        setSearchQuery('');
        setSelectedCategory('All');
      }, 0);
      return function () {
        clearTimeout(t);
      };
    },
    [open]
  );

  const handleClose = useCallback(
    function () {
      onOpenChange(false);
    },
    [onOpenChange]
  );

  // Series: filtered list (pure; no spread).
  const filteredSeries = useMemo(
    function () {
      if (kind !== 'series') return [];
      return filterSeriesGuide(SERIES_GUIDE_DATA, searchQuery, selectedCategory);
    },
    [kind, searchQuery, selectedCategory]
  );

  const filteredAgency = useMemo(
    function () {
      if (kind !== 'agency') return [];
      return filterAgencyGuide(AGENCY_GUIDE_DATA, searchQuery, selectedCategory);
    },
    [kind, searchQuery, selectedCategory]
  );

  const filteredLocation = useMemo(
    function () {
      if (kind !== 'location') return [];
      return filterLocationGuide(LOCATION_GUIDE_DATA, searchQuery);
    },
    [kind, searchQuery]
  );

  const handleSelectSeries = useCallback(
    function (entry: SeriesGuideEntry) {
      if (onApplySeries !== undefined) {
        onApplySeries(entry.seriesCode);
      }
      onOpenChange(false);
    },
    [onApplySeries, onOpenChange]
  );

  const handleSelectAgency = useCallback(
    function (entry: AgencyGuideEntry) {
      if (onApplyAgency !== undefined) {
        onApplyAgency(entry.name);
      }
      onOpenChange(false);
    },
    [onApplyAgency, onOpenChange]
  );

  const handleSelectLocation = useCallback(
    function (entry: LocationGuideEntry) {
      if (onApplyLocation !== undefined) {
        const value = entry.applyValue !== undefined ? entry.applyValue : entry.label;
        onApplyLocation(value);
      }
      onOpenChange(false);
    },
    [onApplyLocation, onOpenChange]
  );

  const container = getOverlayContainer();
  const title = getTitle(kind);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        {/* Overlay: token dimming; zIndex from shared scale (Overlay Rule v1). */}
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--p-overlay-bg, rgba(0,0,0,0.5))',
            zIndex: Z_DIALOG,
          }}
        />
        {/* Panel: right-side drawer; token background/border; pointer-events auto so it receives focus. */}
        <Dialog.Content
          aria-describedby="filter-guide-drawer-desc"
          style={{
            position: 'fixed',
            inset: 0,
            left: 'auto',
            width: 'min(90vw, 28rem)',
            maxWidth: '28rem',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--p-surface)',
            borderLeft: '1px solid var(--p-border)',
            boxShadow: 'var(--p-shadow-elev-1)',
            zIndex: Z_DIALOG,
            pointerEvents: 'auto',
          }}
          onEscapeKeyDown={handleClose}
          onPointerDownOutside={handleClose}
        >
          <Dialog.Title className="sr-only">
            {title}
          </Dialog.Title>
          {/* Header: stronger typography, consistent padding (token-only). */}
          <div
            className="flex items-start justify-between gap-4 flex-shrink-0 px-4 py-3 border-b"
            style={{ borderColor: 'var(--p-border)' }}
          >
            <h2
              className="text-base font-semibold tracking-tight"
              style={{ color: 'var(--p-text)', lineHeight: 'var(--p-line-height-heading)' }}
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="rounded p-1.5 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2"
              style={{ color: 'var(--p-text-muted)', background: 'transparent' }}
              aria-label="Close"
            >
              <X className="w-5 h-5" aria-hidden />
            </button>
          </div>

          {kind === 'series' ? (
            /* Series: search, categories, results list */
            <>
              <p id="filter-guide-drawer-desc" className="sr-only">
                Browse federal series codes and typical roles, then apply a series to your search.
              </p>
              <div className="px-4 pt-2 pb-2 flex-shrink-0 space-y-2">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--p-text-muted)' }}
                    aria-hidden
                  />
                  <input
                    type="search"
                    placeholder="Search by series (0343) or keyword (Program Analyst, IT, HR)..."
                    value={searchQuery}
                    onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                      setSearchQuery(e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded border outline-none focus:ring-2"
                    style={{
                      borderColor: 'var(--p-border)',
                      background: 'var(--p-bg)',
                      color: 'var(--p-text)',
                      borderRadius: 'var(--p-radius)',
                    }}
                    aria-label="Search series by code or keyword"
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {SERIES_CATEGORIES.map(function (cat) {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={function () {
                          setSelectedCategory(cat);
                        }}
                        className="text-xs px-2.5 py-1.5 rounded border"
                        style={{
                          borderColor: 'var(--p-border)',
                          background: isSelected ? 'var(--p-surface2)' : 'var(--p-surface)',
                          color: 'var(--p-text)',
                          borderRadius: 'var(--p-radius)',
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Results: scrollable list — flex-1 min-h-0 so it uses full height above footer (no clipping). */}
              <div
                className="flex-1 min-h-0 mx-4 rounded border overflow-hidden flex flex-col"
                style={{
                  borderColor: 'var(--p-border)',
                  background: 'var(--p-surface2)',
                  borderRadius: 'var(--p-radius)',
                }}
              >
                <div
                  className="flex-1 min-h-0 overflow-y-auto text-sm"
                  data-scroll-container="filter-guide-drawer"
                >
                  <div
                    className="grid grid-cols-[0.6fr_1.5fr_1.4fr_0.7fr] px-4 py-2 border-b text-xs font-medium sticky top-0"
                    style={{
                      borderColor: 'var(--p-border)',
                      color: 'var(--p-text-muted)',
                      background: 'var(--p-surface2)',
                    }}
                  >
                    <span>Series</span>
                    <span>Title</span>
                    <span>Typical roles</span>
                    <span>Common grades</span>
                  </div>
                  {filteredSeries.length > 0 ? (
                    filteredSeries.map(function (row) {
                      return (
                        <button
                          key={row.seriesCode}
                          type="button"
                          className="w-full grid grid-cols-[0.6fr_1.5fr_1.4fr_0.7fr] px-4 py-2.5 text-left border-b last:border-b-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--p-accent)]"
                          style={{
                            borderColor: 'var(--p-border)',
                            color: 'var(--p-text)',
                            background: 'transparent',
                          }}
                          onMouseEnter={function (e: React.MouseEvent<HTMLButtonElement>) {
                            e.currentTarget.style.background = 'var(--p-surface)';
                          }}
                          onMouseLeave={function (e: React.MouseEvent<HTMLButtonElement>) {
                            e.currentTarget.style.background = 'transparent';
                          }}
                          onClick={function () {
                            handleSelectSeries(row);
                          }}
                        >
                          <span className="font-mono text-xs" style={{ color: 'var(--p-accent)' }}>
                            {row.seriesCode}
                          </span>
                          <span className="font-medium">{row.title}</span>
                          <span className="text-xs" style={{ color: 'var(--p-text-muted)' }}>
                            {row.typicalRoles}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--p-text-muted)' }}>
                            {row.commonGrades}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--p-text-muted)' }}>
                      No series found matching your search.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : kind === 'agency' ? (
            /* Agency: search, optional category chips, results list */
            <>
              <p id="filter-guide-drawer-desc" className="sr-only">
                Browse agencies and apply one to your search.
              </p>
              <div className="px-4 pt-2 pb-2 flex-shrink-0 space-y-2">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--p-text-muted)' }}
                    aria-hidden
                  />
                  <input
                    type="search"
                    placeholder="Search by acronym (VA, DHS) or name..."
                    value={searchQuery}
                    onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                      setSearchQuery(e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded border outline-none focus:ring-2"
                    style={{
                      borderColor: 'var(--p-border)',
                      background: 'var(--p-bg)',
                      color: 'var(--p-text)',
                      borderRadius: 'var(--p-radius)',
                    }}
                    aria-label="Search agencies by acronym or name"
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {AGENCY_CATEGORIES.map(function (cat) {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={function () {
                          setSelectedCategory(cat);
                        }}
                        className="text-xs px-2.5 py-1.5 rounded border"
                        style={{
                          borderColor: 'var(--p-border)',
                          background: isSelected ? 'var(--p-surface2)' : 'var(--p-surface)',
                          color: 'var(--p-text)',
                          borderRadius: 'var(--p-radius)',
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div
                className="flex-1 min-h-0 mx-4 rounded border overflow-hidden flex flex-col"
                style={{
                  borderColor: 'var(--p-border)',
                  background: 'var(--p-surface2)',
                  borderRadius: 'var(--p-radius)',
                }}
              >
                <div
                  className="flex-1 min-h-0 overflow-y-auto text-sm"
                  data-scroll-container="filter-guide-drawer"
                >
                  <div
                    className="grid grid-cols-[1fr_auto_0.8fr] px-4 py-2 border-b text-xs font-medium sticky top-0"
                    style={{
                      borderColor: 'var(--p-border)',
                      color: 'var(--p-text-muted)',
                      background: 'var(--p-surface2)',
                    }}
                  >
                    <span>Agency</span>
                    <span>Acronym</span>
                    <span>Notes</span>
                  </div>
                  {filteredAgency.length > 0 ? (
                    filteredAgency.map(function (row) {
                      const acronym = row.aliases !== undefined && row.aliases.length > 0 ? row.aliases[0] : '';
                      const notes = row.tags !== undefined && row.tags.length > 0 ? row.tags.join(', ') : '';
                      return (
                        <button
                          key={row.id}
                          type="button"
                          className="w-full grid grid-cols-[1fr_auto_0.8fr] px-4 py-2.5 text-left border-b last:border-b-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--p-accent)]"
                          style={{
                            borderColor: 'var(--p-border)',
                            color: 'var(--p-text)',
                            background: 'transparent',
                          }}
                          onMouseEnter={function (e: React.MouseEvent<HTMLButtonElement>) {
                            e.currentTarget.style.background = 'var(--p-surface)';
                          }}
                          onMouseLeave={function (e: React.MouseEvent<HTMLButtonElement>) {
                            e.currentTarget.style.background = 'transparent';
                          }}
                          onClick={function () {
                            handleSelectAgency(row);
                          }}
                        >
                          <span className="font-medium truncate">{row.name}</span>
                          <span className="text-xs font-mono pl-2" style={{ color: 'var(--p-accent)' }}>
                            {acronym}
                          </span>
                          <span className="text-xs truncate pl-2" style={{ color: 'var(--p-text-muted)' }}>
                            {notes}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--p-text-muted)' }}>
                      No agencies found matching your search.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Location: search, optional quick chips, results list */
            <>
              <p id="filter-guide-drawer-desc" className="sr-only">
                Browse locations and apply one to your search.
              </p>
              <div className="px-4 pt-2 pb-2 flex-shrink-0 space-y-2">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--p-text-muted)' }}
                    aria-hidden
                  />
                  <input
                    type="search"
                    placeholder="Search by location or alias (e.g. DMV, DC)..."
                    value={searchQuery}
                    onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                      setSearchQuery(e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded border outline-none focus:ring-2"
                    style={{
                      borderColor: 'var(--p-border)',
                      background: 'var(--p-bg)',
                      color: 'var(--p-text)',
                      borderRadius: 'var(--p-radius)',
                    }}
                    aria-label="Search locations by label or alias"
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {['Remote', 'DC/DMV', 'Florida', 'Texas'].map(function (chip) {
                    const q = chip === 'DC/DMV' ? 'dmv' : chip.toLowerCase();
                    const isSelected = searchQuery.trim().toLowerCase() === q;
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={function () {
                          setSearchQuery(q);
                        }}
                        className="text-xs px-2.5 py-1.5 rounded border"
                        style={{
                          borderColor: 'var(--p-border)',
                          background: isSelected ? 'var(--p-surface2)' : 'var(--p-surface)',
                          color: 'var(--p-text)',
                          borderRadius: 'var(--p-radius)',
                        }}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div
                className="flex-1 min-h-0 mx-4 rounded border overflow-hidden flex flex-col"
                style={{
                  borderColor: 'var(--p-border)',
                  background: 'var(--p-surface2)',
                  borderRadius: 'var(--p-radius)',
                }}
              >
                <div
                  className="flex-1 min-h-0 overflow-y-auto text-sm"
                  data-scroll-container="filter-guide-drawer"
                >
                  <div
                    className="grid grid-cols-[1fr_auto] px-4 py-2 border-b text-xs font-medium sticky top-0"
                    style={{
                      borderColor: 'var(--p-border)',
                      color: 'var(--p-text-muted)',
                      background: 'var(--p-surface2)',
                    }}
                  >
                    <span>Location</span>
                    <span>Type</span>
                  </div>
                  {filteredLocation.length > 0 ? (
                    filteredLocation.map(function (row) {
                      const typeLabel = row.type !== undefined ? row.type : 'other';
                      return (
                        <button
                          key={row.id}
                          type="button"
                          className="w-full grid grid-cols-[1fr_auto] px-4 py-2.5 text-left border-b last:border-b-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--p-accent)]"
                          style={{
                            borderColor: 'var(--p-border)',
                            color: 'var(--p-text)',
                            background: 'transparent',
                          }}
                          onMouseEnter={function (e: React.MouseEvent<HTMLButtonElement>) {
                            e.currentTarget.style.background = 'var(--p-surface)';
                          }}
                          onMouseLeave={function (e: React.MouseEvent<HTMLButtonElement>) {
                            e.currentTarget.style.background = 'transparent';
                          }}
                          onClick={function () {
                            handleSelectLocation(row);
                          }}
                        >
                          <span className="font-medium truncate">{row.label}</span>
                          <span className="text-xs pl-2 capitalize" style={{ color: 'var(--p-text-muted)' }}>
                            {typeLabel}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--p-text-muted)' }}>
                      No locations found matching your search.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Footer: helper text + Close button */}
          <div
            className="flex-shrink-0 p-4 border-t flex flex-col gap-2"
            style={{ borderColor: 'var(--p-border)' }}
          >
            <p className="text-xs" style={{ color: 'var(--p-text-muted)' }}>
              {FOOTER_HELPER}
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="self-start px-4 py-2 text-sm font-medium rounded border"
              style={{
                borderColor: 'var(--p-border)',
                background: 'var(--p-surface2)',
                color: 'var(--p-text)',
                borderRadius: 'var(--p-radius)',
              }}
            >
              Close
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
