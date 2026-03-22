import { beforeEach, describe, expect, it } from 'vitest';
import { useDashboardHeroDoNowStore } from './dashboardHeroDoNowStore';

describe('dashboardHeroDoNowStore', function () {
  beforeEach(function () {
    useDashboardHeroDoNowStore.setState({ action: null });
  });

  it('sets hero do-now action label and route', function () {
    useDashboardHeroDoNowStore.getState().setAction({
      label: 'Fix resume gap',
      route: '/dashboard/resume-builder',
    });

    const action = useDashboardHeroDoNowStore.getState().action;
    expect(action).not.toBeNull();
    expect(action?.label).toBe('Fix resume gap');
    expect(action?.route).toBe('/dashboard/resume-builder');
  });

  it('clears hero do-now action when set to null', function () {
    useDashboardHeroDoNowStore.getState().setAction({
      label: 'Fix resume gap',
      route: '/dashboard/resume-builder',
    });
    useDashboardHeroDoNowStore.getState().setAction(null);

    expect(useDashboardHeroDoNowStore.getState().action).toBeNull();
  });
});
