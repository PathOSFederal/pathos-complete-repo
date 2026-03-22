'use client';

import type React from 'react';
import { Search, Eye, EyeOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserPreferencesStore } from '@/store/userPreferencesStore';
import { useProfileStore } from '@/store/profileStore';
import { Badge } from '@/components/ui/badge';
import { UserProfileDropdown } from '@/components/user-profile-dropdown';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { NotificationCenter } from '@/components/notification-center';
import { HelpMenu } from '@/components/help-menu';

interface PathOSTopBarProps {
  children?: React.ReactNode;
}

export function PathOSTopBar(props: PathOSTopBarProps) {
  const children = props.children;

  const isSensitiveHidden = useUserPreferencesStore(function (state) {
    return state.isSensitiveHidden;
  });
  const toggleSensitiveData = useUserPreferencesStore(function (state) {
    return state.toggleSensitiveData;
  });

  const user = useProfileStore(function (state) {
    return state.user;
  });
  const toggleUserType = useProfileStore(function (state) {
    return state.toggleUserType;
  });

  return (
    <header className="border-b border-slate-800 bg-slate-950 h-14 lg:h-16 px-3 lg:px-6 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 lg:gap-3">
        {children}
        <div className="w-7 h-7 lg:w-8 lg:h-8 bg-accent rounded-lg flex items-center justify-center text-accent-foreground font-bold text-xs lg:text-sm">
          P
        </div>
        <div className="hidden sm:block">
          <h1 className="text-base lg:text-lg font-bold text-white">PathOS</h1>
        </div>
      </div>

      <div className="hidden md:block flex-1 max-w-md mx-4 lg:mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search paths, documents, scenarios..."
            className="pl-10 h-9 bg-white/10 border-slate-700 text-white placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 lg:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <Search className="w-4 h-4" />
          <span className="sr-only">Search</span>
        </Button>

        <NotificationCenter />

        <HelpMenu />

        <Button
          variant="outline"
          size="sm"
          onClick={toggleUserType}
          className="hidden md:flex h-8 lg:h-9 px-2 lg:px-3 items-center gap-1.5 text-xs bg-transparent border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <Users className="w-4 h-4" />
          <span className="hidden lg:inline">
            {user.currentEmployee ? 'Employee' : 'Job Seeker'}
          </span>
        </Button>

        {/* Environment Label - hide on mobile */}
        <Badge
          variant="outline"
          className="hidden lg:flex text-xs font-normal border-slate-700 text-slate-400"
        >
          {user.currentEmployee ? 'Prod | Fed Employee' : 'Prod | Job Seeker'}
        </Badge>

        {/* Privacy Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSensitiveData}
          className="h-8 lg:h-9 px-2 flex items-center gap-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800"
        >
          {isSensitiveHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="hidden lg:inline">{isSensitiveHidden ? 'Hidden' : 'Visible'}</span>
        </Button>

        {/* Theme Toggle Button */}
        <ThemeToggleButton />

        <UserProfileDropdown />
      </div>
    </header>
  );
}
