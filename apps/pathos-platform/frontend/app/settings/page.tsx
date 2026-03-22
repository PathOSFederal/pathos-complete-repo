'use client';

/**
 * Settings — current frontend page.
 * Renders SettingsScreen (from @pathos/ui) inside the shared shell so the
 * Settings tab opens the correct modern settings page, not the legacy one.
 */

import { SettingsScreen } from '@pathos/ui';
import { SharedDashboardRouteShell } from '../(shared)/dashboard/_components/SharedDashboardRouteShell';

export default function SettingsPage() {
  return (
    <SharedDashboardRouteShell>
      <SettingsScreen />
    </SharedDashboardRouteShell>
  );
}
