'use client';

import type React from 'react';
import { createContext, useContext } from 'react';
import { useUserPreferencesStore } from '@/store/userPreferencesStore';

type PrivacyContextType = {
  isSensitiveHidden: boolean;
  toggleSensitiveData: () => void;
  setSensitiveHidden: (hidden: boolean) => void;
  globalHide: boolean;
};

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyContextProvider(props: { children: React.ReactNode }) {
  const children = props.children;

  // Read state and actions from userPreferencesStore
  const isSensitiveHidden = useUserPreferencesStore(function (state) {
    return state.isSensitiveHidden;
  });

  const toggleSensitiveDataFromStore = useUserPreferencesStore(function (state) {
    return state.toggleSensitiveData;
  });

  const setSensitiveHiddenFromStore = useUserPreferencesStore(function (state) {
    return state.setSensitiveHidden;
  });

  return (
    <PrivacyContext.Provider
      value={{
        isSensitiveHidden: isSensitiveHidden,
        toggleSensitiveData: toggleSensitiveDataFromStore,
        setSensitiveHidden: setSensitiveHiddenFromStore,
        globalHide: isSensitiveHidden,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy must be used within PrivacyContextProvider');
  }
  return {
    isSensitiveHidden: context.isSensitiveHidden,
    toggleSensitiveData: context.toggleSensitiveData,
    setSensitiveHidden: context.setSensitiveHidden,
    globalHide: context.isSensitiveHidden,
  };
}
