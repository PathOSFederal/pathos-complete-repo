"use client";

import type React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { StoreInitializer } from "@/components/store-initializer";
import { UserPreferencesProvider } from "@/contexts/user-preferences-context";
import { PrivacyContextProvider } from "@/contexts/privacy-context";
import { ProfileProvider } from "@/contexts/profile-context";
import { PersonaProvider } from "@/contexts/persona-context";
import { JobSearchProvider } from "@/contexts/job-search-context";
import { JobDataProvider } from "@/contexts/job-data-context";
import { AdvisorContextProvider } from "@/contexts/advisor-context";
import { TailoringSessionProvider } from "@/contexts/tailoring-session-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <StoreInitializer>
        <ProfileProvider>
          <PersonaProvider>
            <JobDataProvider>
              <JobSearchProvider>
                <AdvisorContextProvider>
                  <TailoringSessionProvider>
                    <UserPreferencesProvider>
                      <PrivacyContextProvider>{children}</PrivacyContextProvider>
                    </UserPreferencesProvider>
                  </TailoringSessionProvider>
                </AdvisorContextProvider>
              </JobSearchProvider>
            </JobDataProvider>
          </PersonaProvider>
        </ProfileProvider>
      </StoreInitializer>
    </ThemeProvider>
  );
}

export default Providers;
