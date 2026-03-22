/**
 * ============================================================================
 * DASHBOARD HERO DO-NOW STORE — Current hero focus action for PathAdvisor
 * ============================================================================
 *
 * PURPOSE: DashboardScreen sets the current hero focus "Do now" (label + route)
 * so PathAdvisor rail can show a matching quick action inside the card without
 * prop drilling. Platform-neutral; no next/electron.
 */

import { create } from 'zustand';

export interface HeroDoNowAction {
  label: string;
  route: string;
}

interface DashboardHeroDoNowState {
  action: HeroDoNowAction | null;
  setAction: (action: HeroDoNowAction | null) => void;
}

export const useDashboardHeroDoNowStore = create<DashboardHeroDoNowState>(function (set) {
  return {
    action: null,
    setAction: function (action) {
      set({ action });
    },
  };
});
