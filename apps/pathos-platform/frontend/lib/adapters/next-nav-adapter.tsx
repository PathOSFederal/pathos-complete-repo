/**
 * ============================================================================
 * NEXT.JS NAVIGATION ADAPTER
 * ============================================================================
 *
 * Implements the @pathos/adapters NavigationAdapter interface using
 * Next.js useRouter and usePathname. This is the standard adapter
 * used by the web app for normal route navigation.
 *
 * This file lives in apps/web (the root Next.js project) because it
 * imports from next/*, which is forbidden in packages/*.
 */

'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useMemo } from 'react';
import type { NavigationAdapter, NavLinkProps } from '@pathos/adapters';

/**
 * React hook that creates a NavigationAdapter backed by Next.js router.
 */
export function useNextNavAdapter(): NavigationAdapter {
  const router = useRouter();
  const pathname = usePathname();

  return useMemo(function () {
    return {
      push: function (path: string) { router.push(path); },
      replace: function (path: string) { router.replace(path); },
      back: function () { router.back(); },
      pathname: pathname,
    };
  }, [router, pathname]);
}

/**
 * NavLink component backed by Next.js <Link>.
 */
export function NextNavLink(props: NavLinkProps) {
  return (
    <Link
      href={props.href}
      className={props.className}
      onClick={props.onClick}
      data-tour={props['data-tour']}
    >
      {props.children}
    </Link>
  );
}
