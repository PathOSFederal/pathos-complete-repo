/**
 * Re-export from shared UI package. Mock dashboard data lives in
 * packages/ui/src/screens/dashboard/mockDashboardData.ts so Desktop and Next
 * use the same source. Import from here only for backward compatibility.
 */

export { mockDashboardData } from '@pathos/ui';
