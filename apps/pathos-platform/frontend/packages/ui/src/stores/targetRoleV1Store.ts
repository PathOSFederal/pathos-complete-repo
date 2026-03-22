/**
 * ============================================================================
 * TARGET ROLE V1 STORE — Local-only target role for fit scoring
 * ============================================================================
 *
 * PURPOSE: Persist user's target role (series, gsTarget, location, remotePreference)
 * for deterministic fit assessment on JobCard and Decision Brief.
 * Storage key: pathos_target_role_v1. Empty state + "Set target role" CTA in UI.
 *
 * BOUNDARY: No next/* or electron/*. Uses @pathos/core storage helpers.
 */

import { create } from 'zustand';
import { storageGetJSON, storageSetJSON } from '@pathos/core';

const TARGET_ROLE_V1_STORAGE_KEY = 'pathos_target_role_v1';

export interface TargetRoleState {
  series?: string;
  gsTarget?: string;
  location?: string;
  remotePreference?: string;
}

export interface TargetRoleV1Actions {
  setTargetRole: (r: TargetRoleState) => void;
  loadFromStorage: () => void;
  persist: () => void;
}

function cloneState(s: TargetRoleState): TargetRoleState {
  const out: TargetRoleState = {};
  if (s.series !== undefined) out.series = s.series;
  if (s.gsTarget !== undefined) out.gsTarget = s.gsTarget;
  if (s.location !== undefined) out.location = s.location;
  if (s.remotePreference !== undefined) out.remotePreference = s.remotePreference;
  return out;
}

function loadPersisted(): TargetRoleState {
  const raw = storageGetJSON<Record<string, unknown>>(TARGET_ROLE_V1_STORAGE_KEY, {});
  if (raw === null || typeof raw !== 'object') return {};
  const out: TargetRoleState = {};
  if (typeof raw.series === 'string') out.series = raw.series;
  if (typeof raw.gsTarget === 'string') out.gsTarget = raw.gsTarget;
  if (typeof raw.location === 'string') out.location = raw.location;
  if (typeof raw.remotePreference === 'string') out.remotePreference = raw.remotePreference;
  return out;
}

export const useTargetRoleV1Store = create<TargetRoleState & TargetRoleV1Actions>(function (
  set,
  get
) {
  return {
    setTargetRole: function (r) {
      set(cloneState(r));
      get().persist();
    },
    loadFromStorage: function () {
      set(loadPersisted());
    },
    persist: function () {
      const s = get();
      storageSetJSON(TARGET_ROLE_V1_STORAGE_KEY, {
        series: s.series,
        gsTarget: s.gsTarget,
        location: s.location,
        remotePreference: s.remotePreference,
      });
    },
  };
});
