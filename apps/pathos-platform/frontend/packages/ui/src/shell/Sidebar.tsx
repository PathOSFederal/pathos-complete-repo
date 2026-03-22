/**
 * ============================================================================
 * SHARED SIDEBAR — Platform-agnostic sidebar navigation
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 * Navigation is handled via @pathos/adapters (useNav / useNavLink).
 *
 * This is the shared version of the PathOS sidebar. It mirrors the structure
 * of components/path-os-sidebar.tsx but uses the NavigationAdapter pattern
 * so it can render in Next.js, Electron, or any other React host.
 */

'use client';

import type React from 'react';
import { useState } from 'react';
import {
  Home,
  Cog,
  DollarSign,
  TrendingUp,
  Shield,
  FileText,
  Settings,
  ChevronRight,
  Briefcase,
  Search,
  Bookmark,
  BookOpen,
  Bell,
  Inbox,
  ClipboardList,
  Target,
  Calculator,
} from 'lucide-react';
import { cn } from '@pathos/core';
import { useNav, useNavLink } from '@pathos/adapters';
import {
  DASHBOARD,
  CAREER_READINESS,
  COMPENSATION,
  BENEFITS,
  RETIREMENT,
  RESUME_READINESS,
  CAREER,
  RESUME_BUILDER,
  JOB_SEARCH,
  SAVED_JOBS,
  GUIDED_APPLY_CANON,
  APPLICATION_CONFIDENCE_CENTER,
  EXPLORE_BENEFITS,
  BENEFITS_WORKSPACE,
  ALERTS,
  IMPORT,
  SETTINGS,
} from '../routes/routes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavSection {
  title: string;
  items: NavItem[];
  employeeOnly?: boolean;
  jobSeekerOnly?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: NavItem[];
  badgeCount?: number;
}

export interface SidebarProps {
  /** Callback when a navigation item is clicked (e.g., close mobile sheet) */
  onNavigate?: () => void;
  /** Whether the current user is a federal employee */
  isEmployee?: boolean;
  /** Display name of the user */
  userName?: string;
  /** Grade+step and agency text for employees */
  userSubtitle?: string;
  /** Total count of new alert matches (badge on Alerts item) */
  alertBadgeCount?: number;
}

// ---------------------------------------------------------------------------
// Static nav definition
// ---------------------------------------------------------------------------

const navSections: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: DASHBOARD, icon: <Home className="w-4 h-4" /> },
      { label: 'Career Readiness', href: CAREER_READINESS, icon: <Cog className="w-4 h-4" /> },
    ],
  },
  {
    title: 'MONEY & PAY',
    items: [
      { label: 'Compensation', href: COMPENSATION, icon: <DollarSign className="w-4 h-4" /> },
    ],
    employeeOnly: true,
  },
  {
    title: 'BENEFITS',
    items: [
      { label: 'Benefits', href: BENEFITS, icon: <Shield className="w-4 h-4" /> },
    ],
    employeeOnly: true,
  },
  {
    title: 'RETIREMENT',
    items: [
      { label: 'Retirement', href: RETIREMENT, icon: <TrendingUp className="w-4 h-4" /> },
    ],
    employeeOnly: true,
  },
  {
    title: 'CAREER & JOBS',
    items: [
      { label: 'Job Search', href: JOB_SEARCH, icon: <Search className="w-4 h-4" /> },
      { label: 'Saved Jobs', href: SAVED_JOBS, icon: <Bookmark className="w-4 h-4" /> },
      { label: 'Resume Builder', href: RESUME_BUILDER, icon: <FileText className="w-4 h-4" /> },
      { label: 'Resume Readiness', href: RESUME_READINESS, icon: <Briefcase className="w-4 h-4" /> },
      { label: 'Application Confidence Center', href: APPLICATION_CONFIDENCE_CENTER, icon: <Target className="w-4 h-4" /> },
      { label: 'Guided Apply', href: GUIDED_APPLY_CANON, icon: <ClipboardList className="w-4 h-4" /> },
    ],
  },
  {
    title: 'EXPLORE',
    items: [
      { label: 'Explore Federal Benefits', href: EXPLORE_BENEFITS, icon: <BookOpen className="w-4 h-4" /> },
      { label: 'Benefits Workspace', href: BENEFITS_WORKSPACE, icon: <Calculator className="w-4 h-4" /> },
    ],
    jobSeekerOnly: true,
  },
  {
    title: 'ALERTS',
    items: [
      { label: 'Alerts Center', href: ALERTS, icon: <Bell className="w-4 h-4" /> },
    ],
  },
  {
    title: 'IMPORT',
    items: [
      { label: 'Import Center', href: IMPORT, icon: <Inbox className="w-4 h-4" /> },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      { label: 'Settings', href: SETTINGS, icon: <Settings className="w-4 h-4" /> },
    ],
  },
];

// ---------------------------------------------------------------------------
// NavItemRow sub-component
// ---------------------------------------------------------------------------

function NavItemRow(props: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
  dataTourId?: string;
  NavLink: ReturnType<typeof useNavLink>;
}) {
  const NavLink = props.NavLink;
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = props.item.children && props.item.children.length > 0;
  const hasBadge = props.item.badgeCount !== undefined && props.item.badgeCount > 0;

  const handleClick = function (e: React.MouseEvent) {
    if (hasChildren) {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    } else if (props.onNavigate) {
      props.onNavigate();
    }
  };

  return (
    <div>
      <NavLink
        href={props.item.href}
        onClick={handleClick}
        data-tour={props.dataTourId}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors relative group',
          props.isActive ? 'font-medium' : '',
        )}
      >
        {/* Active indicator bar (restrained accent) */}
        {props.isActive && (
          <div
            className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r"
            style={{ background: 'var(--p-accent)' }}
          />
        )}
        {/* Row background */}
        <div
          className="absolute inset-0 rounded-md transition-colors"
          style={{
            background: props.isActive ? 'var(--p-accent-bg)' : 'transparent',
          }}
        />
        <span className="flex-shrink-0 relative" style={{ color: props.isActive ? 'var(--p-accent)' : 'var(--p-text-dim)', zIndex: 1 }}>{props.item.icon}</span>
        <span className="flex-1 relative" style={{ color: props.isActive ? 'var(--p-text)' : 'var(--p-text-muted)', zIndex: 1 }}>{props.item.label}</span>
        {hasBadge && (
          <span
            className="flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center relative"
            style={{ zIndex: 1, background: 'var(--p-danger)', color: '#fff' }}
          >
            {props.item.badgeCount}
          </span>
        )}
        {hasChildren && (
          <ChevronRight className={cn('w-4 h-4 transition-transform relative', isExpanded && 'rotate-90')} style={{ color: 'var(--p-text-dim)', zIndex: 1 }} />
        )}
      </NavLink>
      {hasChildren && isExpanded && props.item.children && (
        <div className="ml-6 mt-1 space-y-1">
          {props.item.children.map(function (child) {
            return (
              <NavLink
                key={child.href}
                href={child.href}
                onClick={props.onNavigate}
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors"
              >
                <span className="flex-shrink-0" style={{ color: 'var(--p-text-dim)' }}>{child.icon}</span>
                <span className="flex-1" style={{ color: 'var(--p-text-muted)' }}>{child.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Sidebar
// ---------------------------------------------------------------------------

export function Sidebar(props: SidebarProps) {
  const nav = useNav();
  const NavLink = useNavLink();
  const pathname = nav.pathname;
  const isEmployee = props.isEmployee ?? false;
  const userName = props.userName ?? 'User';
  const alertBadgeCount = props.alertBadgeCount ?? 0;

  // Build visible sections with optional badge injection
  const visibleSections: NavSection[] = [];
  for (let i = 0; i < navSections.length; i++) {
    const section = navSections[i];
    if (section.employeeOnly && !isEmployee) continue;
    if (section.jobSeekerOnly && isEmployee) continue;

    if (section.title === 'ALERTS' && alertBadgeCount > 0) {
      const itemsWithBadge: NavItem[] = [];
      for (let j = 0; j < section.items.length; j++) {
        const item = section.items[j];
        if (item.href === ALERTS) {
          itemsWithBadge.push(Object.assign({}, item, { badgeCount: alertBadgeCount }));
        } else {
          itemsWithBadge.push(item);
        }
      }
      visibleSections.push(Object.assign({}, section, { items: itemsWithBadge }));
    } else {
      visibleSections.push(section);
    }
  }

  const isItemActive = function (itemHref: string): boolean {
    if (itemHref === DASHBOARD) {
      return pathname === DASHBOARD;
    }
    if (itemHref === CAREER_READINESS) {
      return pathname === CAREER_READINESS;
    }
    if (itemHref === RESUME_READINESS) {
      return pathname === RESUME_READINESS || pathname === CAREER;
    }
    if (itemHref === EXPLORE_BENEFITS) {
      return pathname === EXPLORE_BENEFITS;
    }
    return pathname === itemHref || pathname.indexOf(itemHref + '/') === 0;
  };

  // Tour data attributes (hrefs from route constants)
  const tourMap: Record<string, string> = {
    [CAREER_READINESS]: 'nav-career-readiness',
    [RESUME_READINESS]: 'nav-resume-readiness',
    [RESUME_BUILDER]: 'nav-resume-builder',
    [JOB_SEARCH]: 'nav-job-search',
    [EXPLORE_BENEFITS]: 'nav-benefits',
    [ALERTS]: 'nav-alerts',
    [IMPORT]: 'nav-import',
  };

  // User initials
  const initials = userName
    .split(' ')
    .map(function (n) { return n[0]; })
    .join('');

  return (
    <aside
      className="w-64 flex flex-col overflow-auto h-full"
      role="navigation"
      aria-label="Main sidebar navigation"
      style={{ background: 'var(--p-surface)', borderRight: '1px solid var(--p-border)' }}
    >
      <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--p-border)' }}>
        <h2 className="text-base font-semibold" style={{ color: 'var(--p-text)' }}>PathOS</h2>
        <p className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--p-accent-muted)' }}>Career Intelligence Dashboard</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--p-text-dim)' }}>
          {isEmployee ? 'For federal employees' : 'For federal job seekers'}
        </p>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {visibleSections.map(function (section) {
          return (
            <div key={section.title}>
              <h3
                className="text-[11px] font-semibold uppercase tracking-[var(--p-letter-spacing-section)] px-3 mb-1"
                style={{ color: 'var(--p-text-dim)' }}
              >
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map(function (item) {
                  return (
                    <NavItemRow
                      key={item.href}
                      item={item}
                      isActive={isItemActive(item.href)}
                      onNavigate={props.onNavigate}
                      dataTourId={tourMap[item.href]}
                      NavLink={NavLink}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-2" style={{ borderTop: '1px solid var(--p-border)' }}>
        <div
          className="flex items-center gap-2.5 px-3 py-2"
          style={{ background: 'var(--p-surface2)', borderRadius: 'var(--p-radius)' }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--p-accent-bg)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--p-accent)' }}>{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--p-text)' }}>{userName}</p>
            <p className="text-xs truncate" style={{ color: 'var(--p-text-dim)' }}>
              {isEmployee ? (props.userSubtitle ?? 'Federal Employee') : 'Federal Applicant'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
