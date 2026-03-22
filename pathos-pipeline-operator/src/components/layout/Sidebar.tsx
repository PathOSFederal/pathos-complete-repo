'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Play,
  Activity,
  GitBranch,
  Clock,
  Bell,
  FileText,
  Stethoscope,
  Settings,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  disabled?: boolean;
}

interface SidebarProps {
  pendingGates?: number;
  notifications?: number;
}

export function Sidebar({ pendingGates, notifications }: SidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: '/overview', label: 'Overview', icon: LayoutDashboard },
    { href: '/runs', label: 'Active Runs', icon: Play },
    { href: '/worker-health', label: 'Worker Health', icon: Activity, disabled: true },
    { href: '/gates', label: 'Human Gates', icon: GitBranch, badge: pendingGates || undefined },
    { href: '/scheduler', label: 'Scheduler', icon: Clock },
    {
      href: '/notifications',
      label: 'Notifications',
      icon: Bell,
      badge: notifications || undefined,
      disabled: true,
    },
    { href: '/logs', label: 'Logs & Events', icon: FileText, disabled: true },
    { href: '/diagnostics', label: 'Diagnostics', icon: Stethoscope, disabled: true },
  ];

  return (
    <aside className="flex flex-col w-56 shrink-0 bg-[#0a0c10] border-r border-[#1e2430] h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[#1e2430]">
        <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
          <Cpu className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-100 leading-none">PathOS</div>
          <div className="text-xs text-slate-500 mt-0.5">Pipeline v2.4.1</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-2 py-1.5 text-xs font-medium text-slate-600 uppercase tracking-wider">
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/overview' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.disabled ? '#' : item.href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-[#1a2030] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141820]',
                item.disabled && 'opacity-40 cursor-not-allowed'
              )}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-blue-400' : '')} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-blue-600 text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="px-2 py-3 border-t border-[#1e2430]">
        <div className="px-2.5 pb-2 text-[11px] text-slate-600">
          Disabled views are not yet wired to real data.
        </div>
        <Link
          href="#"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-slate-400 hover:text-slate-200 hover:bg-[#141820] transition-colors opacity-40 cursor-not-allowed"
          onClick={(e) => e.preventDefault()}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
