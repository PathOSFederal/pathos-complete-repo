/**
 * @pathos/ui — Shared AppShell, screens, and components.
 *
 * BOUNDARY RULE: This package MUST NOT import from next/* or electron/*.
 * Run `pnpm check:boundaries` to verify.
 */

// Shared components
export { ModuleCard, type ModuleCardProps } from './components/ModuleCard';
export {
  AskPathAdvisorButton,
  type AskPathAdvisorButtonProps,
} from './components/AskPathAdvisorButton';

// Shell components
export { SharedAppShell, type AppShellProps, type Platform, type ThemeVariant } from './shell/AppShell';
export { Sidebar, type SidebarProps } from './shell/Sidebar';
export { TopBar, type TopBarProps } from './shell/TopBar';
export { PathAdvisorCard, type PathAdvisorCardProps, type PathAdvisorMessage } from './shell/PathAdvisorCard';
export { PathAdvisorRail, type PathAdvisorRailProps, type PathAdvisorAnchorContext } from './shell/PathAdvisorRail';
export {
  usePathAdvisorBriefingStore,
  type PathAdvisorBriefing,
  type BriefingSection,
} from './stores/pathAdvisorBriefingStore';
export {
  usePathAdvisorScreenOverridesStore,
  type PathAdvisorScreenOverrides,
  type PathAdvisorRailContent,
} from './stores/pathAdvisorScreenOverridesStore';

// Screens
export {
  DashboardScreen,
  type DashboardScreenProps,
  type DashboardData,
} from './screens/DashboardScreen';
export { CareerReadinessScreen } from './screens/CareerReadinessScreen';
export { CareerScreen, type CareerScreenProps } from './screens/CareerScreen';
export { SettingsScreen, type SettingsScreenProps } from './screens/SettingsScreen';
export { GuidedApplyScreen, type GuidedApplyScreenProps } from './screens/GuidedApplyScreen';
export { JobSearchScreen, type JobSearchScreenProps } from './screens/JobSearchScreen';
export { SavedJobsScreen, type SavedJobsScreenProps } from './screens/SavedJobsScreen';
export { ResumeBuilderScreen, type ResumeBuilderScreenProps } from './screens/ResumeBuilderScreen';
export { PlaceholderScreen, type PlaceholderScreenProps } from './screens/PlaceholderScreen';
export { mockDashboardData } from './screens/dashboard/mockDashboardData';
export type { DashboardViewModel, FocusItem, ActiveTrack, SignalItem } from './screens/dashboard/dashboardModel';
export { buildDashboardViewModel } from './screens/dashboard/buildDashboardViewModel';
export { useDashboardSnapshot } from './screens/dashboard/useDashboardSnapshot';
export type { DashboardChanges, DashboardSnapshot } from './screens/dashboard/useDashboardSnapshot';
export {
  ApplicationConfidenceCenterScreen,
  type ApplicationConfidenceCenterScreenProps,
  type ApplicationConfidenceAnchorContext,
} from './screens/ApplicationConfidenceCenterScreen';
