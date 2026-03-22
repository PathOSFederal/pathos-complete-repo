'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, CheckCircle2, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useUserPreferencesStore } from '@/store/userPreferencesStore';

export function OnboardingDisclaimerStep() {
  const [hasAccepted, setHasAccepted] = useState(false);
  const setHasAcceptedGlobalDisclaimer = useUserPreferencesStore(function (state) {
    return state.setHasAcceptedGlobalDisclaimer;
  });

  const handleContinue = function () {
    if (hasAccepted) {
      setHasAcceptedGlobalDisclaimer(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/placeholder-logo.svg"
              alt="PathOS Logo"
              width={64}
              height={64}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to PathOS</h1>
          <p className="text-muted-foreground">
            Your federal career decision intelligence platform
          </p>
        </div>

        {/* Main Disclaimer Card */}
        <Card className="border-amber-500/30 bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Important Disclaimer</CardTitle>
                <CardDescription>Please read before continuing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                PathOS is an{' '}
                <span className="font-medium text-foreground">
                  unofficial decision-support tool
                </span>{' '}
                designed to help federal employees and job seekers explore career scenarios, compare
                compensation packages, and plan their federal journey.
              </p>

              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <p>
                    <span className="font-medium text-foreground">Not Official Guidance:</span> This
                    tool is not affiliated with OPM, GSA, or any federal agency. All estimates are
                    for planning purposes only.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <p>
                    <span className="font-medium text-foreground">Data Privacy:</span> Your data is
                    stored locally in your browser. We do not transmit or store personal information
                    on external servers.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <p>
                    <span className="font-medium text-foreground">Always Verify:</span> Consult
                    official sources (OPM.gov, your HR office, TSP.gov) for authoritative
                    information before making career or financial decisions.
                  </p>
                </div>
              </div>
            </div>

            {/* Acceptance Checkbox */}
            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                id="accept-disclaimer"
                checked={hasAccepted}
                onCheckedChange={function (checked) {
                  setHasAccepted(checked === true);
                }}
                className="mt-1"
              />
              <label htmlFor="accept-disclaimer" className="text-sm cursor-pointer">
                I understand that PathOS provides unofficial estimates for planning purposes only,
                and I will verify all information with official sources before making decisions.
              </label>
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={!hasAccepted}
              className="w-full mt-4"
              size="lg"
            >
              Continue to PathOS
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to use this tool responsibly and understand its limitations.
        </p>
      </div>
    </div>
  );
}
