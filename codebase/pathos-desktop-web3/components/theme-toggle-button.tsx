'use client';

import { Monitor, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useProfileStore, type ThemePreference } from '@/store/profileStore';

const THEME_ORDER: ThemePreference[] = ['system', 'light', 'dark'];

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

export function ThemeToggleButton() {
  const themePreference = useProfileStore(function (state) {
    return state.profile.preferences.theme;
  });
  const updatePreferences = useProfileStore(function (state) {
    return state.updatePreferences;
  });

  // Read current theme defensively
  const rawTheme = themePreference;
  let current: ThemePreference = 'system';
  if (rawTheme === 'light' || rawTheme === 'dark' || rawTheme === 'system') {
    current = rawTheme;
  }

  // Cycle to next theme
  const handleClick = function () {
    const currentIndex = THEME_ORDER.indexOf(current);
    const next = THEME_ORDER[(currentIndex + 1) % THEME_ORDER.length];
    updatePreferences({ theme: next });
  };

  // Pick icon based on current theme
  let Icon = Monitor;
  if (current === 'light') {
    Icon = Sun;
  } else if (current === 'dark') {
    Icon = Moon;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8 lg:h-9 lg:w-9"
            onClick={handleClick}
          >
            <Icon className="w-4 h-4" />
            <span className="sr-only">Theme: {THEME_LABELS[current]}. Click to switch.</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center">
          <p className="font-medium">Theme: {THEME_LABELS[current]}</p>
          <p className="text-xs text-muted-foreground">Click to switch</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
