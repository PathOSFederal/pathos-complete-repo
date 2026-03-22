/**
 * @pathos/adapters — Platform adapter interfaces and React context.
 *
 * BOUNDARY RULE: This package MUST NOT import from next/* or electron/*.
 * Platform implementations live in apps/web and apps/desktop.
 */

// Navigation adapter interface
export type { NavigationAdapter, NavLinkProps } from './navigation';

// Navigation context + hooks
export {
  NavigationProvider,
  useNav,
  useNavLink,
} from './navigation-context';
