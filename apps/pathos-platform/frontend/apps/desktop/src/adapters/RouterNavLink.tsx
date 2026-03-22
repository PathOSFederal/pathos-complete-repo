/**
 * React Router NavLink component for the desktop app.
 *
 * Implements the NavLinkProps interface from @pathos/adapters
 * so shared UI components render React Router <Link> elements
 * instead of plain <a> tags or Next.js <Link>.
 *
 * BOUNDARY: This file lives in apps/desktop and MAY import
 * react-router-dom. It MUST NOT import next/*.
 */

import { Link } from 'react-router-dom';
import type { NavLinkProps } from '@pathos/adapters';

export function RouterNavLink(props: NavLinkProps) {
  return (
    <Link
      to={props.href}
      className={props.className}
      onClick={props.onClick}
      data-tour={props['data-tour']}
    >
      {props.children}
    </Link>
  );
}
