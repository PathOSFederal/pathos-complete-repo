/**
 * ============================================================================
 * BRAND LOCKUP — Shell brand row: logo + title as one unit, optional pills
 * ============================================================================
 *
 * WHY THIS COMPONENT EXISTS:
 * The original top-left row rendered the badge and "PathOS" with the same
 * flex gap as status pills (e.g. "Desktop", "LOCAL ONLY"). That made the
 * badge feel like a small favicon and the pills compete with the product
 * name. A single visual unit (lockup) plus clearly secondary metadata
 * (pills) fixes the hierarchy and reads as a premium app identity.
 *
 * WHAT IT DOES:
 * Renders a horizontal row: [optional link wrapper + AppBrand] [spacer]
 * [optional status pills]. The lockup (badge + product name) uses tight
 * spacing; pills are separated by a deliberate gap so they read as
 * secondary metadata. Supports optional click-to-dashboard via href +
 * LinkComponent from the navigation adapter.
 *
 * MAINTAINABILITY:
 * One shared component keeps web and desktop shells consistent. Icon size,
 * gap between lockup and pills, and pill styling are centralized here.
 * To support symbol-only or full circular badge later, keep using AppBrand
 * with variant/size; BrandLockup only composes layout.
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 * LinkComponent is passed from the host (Next or React Router adapter).
 */

'use client';

import type React from 'react';
import type { ComponentType } from 'react';
import type { NavLinkProps } from '@pathos/adapters';
import { AppBrand } from './AppBrand';
import type { AppBrandProps } from './AppBrand';

export interface BrandLockupProps {
  /** AppBrand props (logoUrl, variant, productName, size, textClassName, alt). */
  brand: AppBrandProps;
  /**
   * Optional status pills or metadata (e.g. "Desktop", "LOCAL ONLY").
   * Rendered after a spacer so they are clearly secondary to the lockup.
   */
  statusPills?: React.ReactNode;
  /**
   * When provided with linkComponent, the lockup (AppBrand) is wrapped
   * in a link to this href (e.g. /dashboard for click-to-dashboard).
   */
  href?: string;
  /**
   * Platform link component (from useNavLink()). Required when href is set.
   */
  linkComponent?: ComponentType<NavLinkProps>;
  /** Optional class for the outer row container. */
  className?: string;
}

/**
 * Renders the shell brand row: lockup (badge + title) as one unit,
 * optional status pills spaced as secondary metadata, optional link wrapper.
 */
export function BrandLockup(props: BrandLockupProps) {
  const brand = props.brand;
  const statusPills = props.statusPills;
  const href = props.href;
  const LinkComponent = props.linkComponent;
  const hasLink =
    href !== undefined && href !== null && href !== '' &&
    LinkComponent !== undefined && LinkComponent !== null;

  const lockupContent = <AppBrand {...brand} />;

  const lockupNode = hasLink ? (
    <LinkComponent href={href} className="flex items-center flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] focus-visible:ring-offset-2 rounded">
      {lockupContent}
    </LinkComponent>
  ) : (
    <div className="flex items-center flex-shrink-0">
      {lockupContent}
    </div>
  );

  return (
    <div
      className={props.className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        minWidth: 0,
      }}
    >
      {lockupNode}
      {statusPills !== undefined && statusPills !== null ? (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {statusPills}
        </div>
      ) : null}
    </div>
  );
}
