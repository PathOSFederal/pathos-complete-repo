'use client';

import type React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  DollarSign,
  TrendingUp,
  Shield,
  FileText,
  Settings,
  ChevronRight,
  Briefcase,
  Search,
  BookOpen,
  Bell,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { SensitiveValue } from '@/components/sensitive-value';
import { useUserPreferencesStore } from '@/store/userPreferencesStore';
import { useProfileStore } from '@/store/profileStore';
import { useJobAlertsStore, selectTotalNewMatches, selectAlertsIsLoaded } from '@/store';

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
  /**
   * Day 20: Optional badge count to show next to the nav item.
   * Used for Alerts to show new match count.
   */
  badgeCount?: number;
}

interface PathOSSidebarProps {
  onNavigate?: () => void;
}

const navSections: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: <Home className="w-4 h-4" /> }],
  },
  {
    title: 'MONEY & PAY',
    items: [
      {
        label: 'Compensation',
        href: '/dashboard/compensation',
        icon: <DollarSign className="w-4 h-4" />,
      },
    ],
    employeeOnly: true,
  },
  {
    title: 'BENEFITS',
    items: [
      { label: 'Benefits', href: '/dashboard/benefits', icon: <Shield className="w-4 h-4" /> },
    ],
    employeeOnly: true,
  },
  {
    title: 'RETIREMENT',
    items: [
      {
        label: 'Retirement',
        href: '/dashboard/retirement',
        icon: <TrendingUp className="w-4 h-4" />,
      },
    ],
    employeeOnly: true,
  },
  {
    title: 'CAREER & JOBS',
    items: [
      {
        label: 'Career & Resume',
        href: '/dashboard/career',
        icon: <Briefcase className="w-4 h-4" />,
      },
      {
        label: 'Resume Builder',
        href: '/dashboard/resume-builder',
        icon: <FileText className="w-4 h-4" />,
      },
      { label: 'Job Search', href: '/dashboard/job-search', icon: <Search className="w-4 h-4" /> },
    ],
  },
  {
    title: 'EXPLORE',
    items: [
      {
        label: 'Explore Federal Benefits',
        href: '/explore/benefits',
        icon: <BookOpen className="w-4 h-4" />,
      },
    ],
    jobSeekerOnly: true,
  },
  {
    /**
     * Day 20: Alerts section for managing job alerts and email digest.
     * Badge count is injected dynamically based on new match count.
     */
    title: 'ALERTS',
    items: [
      {
        label: 'Alerts Center',
        href: '/alerts',
        icon: <Bell className="w-4 h-4" />,
      },
    ],
  },
  {
    /**
     * Day 22: Import Center with unified document import.
     * Replaces the Day 21 Email Import link with Import Center.
     * UI copy uses "Import" - never "ingest/ingestion".
     */
    title: 'IMPORT',
    items: [
      {
        label: 'Import Center',
        href: '/import',
        icon: <Inbox className="w-4 h-4" />,
      },
    ],
  },
  {
    title: 'SETTINGS',
    items: [{ label: 'Settings', href: '/settings', icon: <Settings className="w-4 h-4" /> }],
  },
];

function NavItemWithCallback(props: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
  dataTourId?: string;
}) {
  const item = props.item;
  const isActive = props.isActive;
  const onNavigate = props.onNavigate;
  const dataTourId = props.dataTourId;

  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  /**
   * Day 20: Check if item has a badge to display.
   */
  const hasBadge = item.badgeCount !== undefined && item.badgeCount !== null && item.badgeCount > 0;

  const handleClick = function (e: React.MouseEvent) {
    if (hasChildren) {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    } else if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <div>
      <Link
        href={item.href}
        onClick={handleClick}
        data-tour={dataTourId}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors relative group',
          isActive
            ? 'text-slate-100 bg-slate-800/50 font-medium border-l-3 border-amber-600'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30',
        )}
      >
        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-600 rounded-r" />}
        <span className="flex-shrink-0">{item.icon}</span>
        <span className="flex-1">{item.label}</span>
        {/* Day 20: Badge for new matches */}
        {hasBadge && (
          <span className="flex-shrink-0 bg-red-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {item.badgeCount}
          </span>
        )}
        {hasChildren && (
          <ChevronRight className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-90')} />
        )}
      </Link>
      {hasChildren && isExpanded && item.children && (
        <div className="ml-6 mt-1 space-y-1">
          {item.children.map(function (child) {
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
              >
                <span className="flex-shrink-0">{child.icon}</span>
                <span className="flex-1">{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PathOSSidebar(props: PathOSSidebarProps) {
  const onNavigate = props.onNavigate;
  const pathname = usePathname();

  const globalHide = useUserPreferencesStore(function (state) {
    return state.isSensitiveHidden;
  });

  const user = useProfileStore(function (state) {
    return state.user;
  });

  /**
   * Day 20: Get new matches count for the Alerts badge.
   * Also load alerts from storage if not already loaded.
   */
  const totalNewMatches = useJobAlertsStore(selectTotalNewMatches);
  const isAlertsLoaded = useJobAlertsStore(selectAlertsIsLoaded);
  const loadFromStorage = useJobAlertsStore(function (state) {
    return state.loadFromStorage;
  });

  // Load alerts on mount if not already loaded
  useEffect(function () {
    if (!isAlertsLoaded) {
      loadFromStorage();
    }
  }, [isAlertsLoaded, loadFromStorage]);

  /**
   * Build visible sections and inject badge count for Alerts.
   * Day 20: We iterate through sections and inject badgeCount
   * for the Alerts Center item when there are new matches.
   */
  const visibleSections: NavSection[] = [];
  for (let i = 0; i < navSections.length; i++) {
    const section = navSections[i];
    if (section.employeeOnly && !user.currentEmployee) {
      continue;
    }
    if (section.jobSeekerOnly && user.currentEmployee) {
      continue;
    }

    // Day 20: Inject badge count for ALERTS section
    if (section.title === 'ALERTS' && totalNewMatches > 0) {
      const itemsWithBadge: NavItem[] = [];
      for (let j = 0; j < section.items.length; j++) {
        const item = section.items[j];
        if (item.href === '/alerts') {
          // Create new item object with badge count (no spread, use Object.assign)
          const itemWithBadge = Object.assign({}, item, { badgeCount: totalNewMatches });
          itemsWithBadge.push(itemWithBadge);
        } else {
          itemsWithBadge.push(item);
        }
      }
      const sectionWithBadge = Object.assign({}, section, { items: itemsWithBadge });
      visibleSections.push(sectionWithBadge);
    } else {
      visibleSections.push(section);
    }
  }

  const handleLinkClick = function () {
    if (onNavigate) {
      onNavigate();
    }
  };

  // Dashboard (/dashboard) should only be active on exact match
  // Other items can match their path or any sub-paths
  const isItemActive = function (itemHref: string): boolean {
    if (itemHref === '/dashboard') {
      // Dashboard is only active on exact match
      return pathname === '/dashboard';
    }
    // Other items are active if pathname matches exactly or starts with the href
    return pathname === itemHref || pathname.indexOf(itemHref + '/') === 0;
  };

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col overflow-auto h-full">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-slate-100">PathOS</h2>
        <p className="text-xs text-amber-600 font-medium mt-0.5">Career Intelligence Dashboard</p>
        <p className="text-xs text-slate-500 mt-1">
          {user.currentEmployee ? 'For federal employees' : 'For federal job seekers'}
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {visibleSections.map(function (section) {
          return (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider px-3 mb-2">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map(function (item) {
                  // data-tour anchors used by GuidedTourOverlay - on clickable items
                  let dataTourId: string | undefined;
                  if (item.href === '/dashboard/career') {
                    dataTourId = 'nav-career-resume';
                  } else if (item.href === '/dashboard/resume-builder') {
                    dataTourId = 'nav-resume-builder';
                  } else if (item.href === '/dashboard/job-search') {
                    dataTourId = 'nav-job-search';
                  } else if (item.href === '/explore/benefits') {
                    dataTourId = 'nav-benefits';
                  } else if (item.href === '/alerts') {
                    dataTourId = 'nav-alerts';
                  } else if (item.href === '/import') {
                    dataTourId = 'nav-import';
                  }

                  return (
                    <NavItemWithCallback
                      key={item.href}
                      item={item}
                      isActive={isItemActive(item.href)}
                      onNavigate={handleLinkClick}
                      dataTourId={dataTourId}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900/50">
          <div className="w-9 h-9 rounded-full bg-amber-900/30 flex items-center justify-center">
            <span className="text-sm font-semibold text-amber-600">
              {user.name
                .split(' ')
                .map(function (n) {
                  return n[0];
                })
                .join('')}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user.name}</p>
            {user.currentEmployee ? (
              <SensitiveValue
                value={user.gradeStep + ', ' + user.agency}
                masked="GS-••, ••••"
                hide={globalHide}
                className="text-xs text-slate-500 truncate"
              />
            ) : (
              <p className="text-xs text-slate-500 truncate">Federal Applicant</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
