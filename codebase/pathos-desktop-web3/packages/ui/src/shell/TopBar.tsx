/**
 * ============================================================================
 * SHARED TOP BAR — Platform-agnostic top navigation bar
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * The top-left brand row uses BrandLockup so the badge and "PathOS" read as
 * one unit, with status pills (Desktop, LOCAL ONLY) clearly secondary.
 * Brand lockup is clickable to Dashboard when used inside NavigationProvider.
 */

'use client';

import type React from 'react';
import { useState } from 'react';
import { Search, Eye, EyeOff, Users, Info, ShieldCheck, X } from 'lucide-react';
import { useNavLink } from '@pathos/adapters';
import { Z_DIALOG } from '../styles/zIndex';
import type { Platform } from './AppShell';
import { AppBrand } from './AppBrand';
import { BrandLockup } from './BrandLockup';
import { DASHBOARD } from '../routes/routes';

export interface TopBarProps {
  /** Slot rendered at the leading edge (e.g., hamburger menu on mobile) */
  leading?: React.ReactNode;
  /** Slot rendered at the trailing edge (e.g., theme toggle, profile dropdown) */
  trailing?: React.ReactNode;
  /** Whether sensitive data is currently hidden */
  isSensitiveHidden?: boolean;
  /** Toggle sensitive data visibility */
  onToggleSensitive?: () => void;
  /** Current persona label (e.g., "Employee" / "Job Seeker") */
  personaLabel?: string;
  /** Toggle persona callback */
  onTogglePersona?: () => void;
  /** Platform hint passed down from AppShell */
  platform?: Platform;
  /**
   * Base URL for branding assets (e.g. desktop passes import.meta.env.BASE_URL).
   * When not set, "/" is used so /branding/... works on web.
   */
  brandingBaseUrl?: string;
}

export function TopBar(props: TopBarProps) {
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const NavLink = useNavLink();

  /* Desktop/Local-only pills are secondary to the lockup. DESKTOP pill kept for now;
   * can be visually demoted or moved in a follow-up if it creates clutter. */
  const desktopPills: React.ReactNode =
    (props.platform === 'desktop' || props.platform === 'desktop-preview') ? (
      <>
        <span
          className="text-[10px] font-medium uppercase tracking-[var(--p-letter-spacing-section)] px-1.5 py-0.5 rounded"
          style={{
            color: 'var(--p-text-muted)',
            background: 'var(--p-surface2)',
            border: '1px solid var(--p-border)',
          }}
        >
          Desktop
        </span>
        <button
          type="button"
          onClick={function () { setShowInfoPanel(!showInfoPanel); }}
          aria-label="Data privacy info: all data is stored locally"
          aria-expanded={showInfoPanel}
          className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[var(--p-letter-spacing-section)] px-1.5 py-0.5 rounded cursor-pointer"
          style={{
            color: 'var(--p-success)',
            background: 'var(--p-surface2)',
            border: '1px solid var(--p-border)',
          }}
        >
          <ShieldCheck className="w-3 h-3" />
          Local only
          <Info className="w-3 h-3 ml-0.5 opacity-60" />
        </button>
      </>
    ) : (
      <button
        type="button"
        onClick={function () { setShowInfoPanel(!showInfoPanel); }}
        aria-label="Data privacy info: all data is stored locally"
        aria-expanded={showInfoPanel}
        className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[var(--p-letter-spacing-section)] px-1.5 py-0.5 rounded cursor-pointer"
        style={{
          color: 'var(--p-success)',
          background: 'var(--p-surface2)',
          border: '1px solid var(--p-border)',
        }}
      >
        <ShieldCheck className="w-3 h-3" />
        Local only
        <Info className="w-3 h-3 ml-0.5 opacity-60" />
      </button>
    );

  return (
    <header
      className="relative h-12 lg:h-14 px-3 lg:px-4 flex items-center justify-between gap-2"
      style={{
        background: 'var(--p-surface)',
        borderBottom: '1px solid var(--p-border)',
      }}
    >
      <div className="flex items-center gap-2 lg:gap-3 min-w-0">
        {props.leading}
        {/* Mobile: symbol only; desktop: BrandLockup (symbol + PathOS wordmark, pills secondary). */}
        {/* We use the symbol asset so the top shell stays compact; full badge would crowd the row. */}
        <div className="sm:hidden flex-shrink-0">
          <AppBrand asset="symbol" variant="iconOnly" size={28} alt="PathOS" brandingBaseUrl={props.brandingBaseUrl} />
        </div>
        <div className="hidden sm:flex items-center flex-shrink-0 min-w-0">
          <h1 className="flex items-center min-w-0" style={{ margin: 0 }}>
            <BrandLockup
              brand={{
                asset: 'symbol',
                variant: 'iconAndText',
                size: 32,
                className: 'flex-shrink-0',
                alt: 'PathOS',
                brandingBaseUrl: props.brandingBaseUrl,
              }}
              statusPills={desktopPills}
              href={DASHBOARD}
              linkComponent={NavLink}
              className="flex-shrink-0"
            />
          </h1>
        </div>
      </div>

      {/* Info panel overlay */}
      {showInfoPanel && (
        <div
          className="absolute left-4 sm:left-16 top-full mt-1 w-80 p-4 space-y-3"
          style={{
            zIndex: Z_DIALOG,
            background: 'var(--p-surface)',
            border: '1px solid var(--p-border)',
            borderRadius: 'var(--p-radius-lg)',
            boxShadow: 'var(--p-shadow-lg, 0 8px 32px rgba(0,0,0,0.4))',
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--p-success)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>Your Data Stays Local</span>
            </div>
            <button
              type="button"
              onClick={function () { setShowInfoPanel(false); }}
              className="h-6 w-6 flex items-center justify-center"
              style={{ color: 'var(--p-text-dim)', borderRadius: 'var(--p-radius)' }}
            >
              <X className="w-3.5 h-3.5" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          <ul className="space-y-2 text-xs" style={{ color: 'var(--p-text-muted)' }}>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--p-success)' }} />
              All career data and application sessions are stored locally on this device.
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--p-success)' }} />
              PathOS does not access your email or mailbox.
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--p-success)' }} />
              PathOS does not handle your USAJOBS credentials.
            </li>
          </ul>
          <p className="text-[10px]" style={{ color: 'var(--p-text-dim)' }}>
            You can export or delete your data at any time from Settings &gt; Data Controls.
          </p>
        </div>
      )}

      {/* Search bar: integrated into header (same surface, no floating look) */}
      <div className="hidden md:flex flex-1 max-w-sm mx-3 lg:mx-4 min-w-0">
        <div
          className="relative flex-1 flex items-center rounded"
          style={{
            background: 'var(--p-surface2)',
            border: '1px solid var(--p-border)',
          }}
        >
          <Search
            className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 flex-shrink-0"
            style={{ color: 'var(--p-text-dim)' }}
          />
          <input
            type="text"
            placeholder="Search paths, documents, scenarios..."
            className="flex-1 min-w-0 pl-8 pr-3 h-8 bg-transparent focus:outline-none"
            style={{
              color: 'var(--p-text)',
              fontSize: 'var(--p-font-size-body)',
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
        {/* Mobile search */}
        <button
          type="button"
          className="md:hidden h-8 w-8 flex items-center justify-center"
          style={{ color: 'var(--p-text-muted)', borderRadius: 'var(--p-radius)' }}
        >
          <Search className="w-4 h-4" />
          <span className="sr-only">Search</span>
        </button>

        {/* Persona (status-style) */}
        {props.onTogglePersona && (
          <button
            type="button"
            onClick={props.onTogglePersona}
            aria-label={'Switch persona, current: ' + (props.personaLabel ?? 'User')}
            className="hidden md:flex h-8 px-2 items-center gap-1.5"
            style={{
              color: 'var(--p-text-muted)',
              border: '1px solid var(--p-border)',
              borderRadius: 'var(--p-radius)',
              background: 'var(--p-surface2)',
              fontSize: 'var(--p-font-size-section)',
            }}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{props.personaLabel ?? 'User'}</span>
          </button>
        )}

        {/* Privacy toggle (status indicator) */}
        {props.onToggleSensitive && (
          <button
            type="button"
            onClick={props.onToggleSensitive}
            aria-label={props.isSensitiveHidden ? 'Show sensitive data' : 'Hide sensitive data'}
            className="h-8 px-2 flex items-center gap-1.5"
            style={{
              color: 'var(--p-text-muted)',
              borderRadius: 'var(--p-radius)',
              fontSize: 'var(--p-font-size-section)',
            }}
          >
            {props.isSensitiveHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden lg:inline">{props.isSensitiveHidden ? 'Hidden' : 'Visible'}</span>
          </button>
        )}

        {props.trailing}
      </div>
    </header>
  );
}
