'use client';

import type React from 'react';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { NavigationProvider } from '@pathos/adapters';
import { parseThemeVariant } from '@pathos/core';
import { useNextNavAdapter, NextNavLink } from '@/lib/adapters/next-nav-adapter';
import {
  SharedAppShell,
  PathAdvisorRail,
  type PathAdvisorMessage,
} from '@pathos/ui';

const SIMULATED_REPLY =
  'Thanks for your question. This is a local-only preview—PathAdvisor will use your context when connected.';

export function SharedDashboardRouteShell(props: { children: React.ReactNode }) {
  const adapter = useNextNavAdapter();
  const searchParams = useSearchParams();
  const themeVariant = parseThemeVariant(searchParams.get('theme')) ?? undefined;
  const [advisorMessages, setAdvisorMessages] = useState<PathAdvisorMessage[]>([]);

  const handleAdvisorSend = useCallback(function (text: string) {
    const userMessage: PathAdvisorMessage = { role: 'user', content: text };
    setAdvisorMessages(function (prev) {
      const next = [];
      for (let i = 0; i < prev.length; i++) {
        next.push(prev[i]);
      }
      next.push(userMessage);
      return next;
    });

    setTimeout(function () {
      const assistantMessage: PathAdvisorMessage = {
        role: 'assistant',
        content: SIMULATED_REPLY,
      };
      setAdvisorMessages(function (prev) {
        const next = [];
        for (let i = 0; i < prev.length; i++) {
          next.push(prev[i]);
        }
        next.push(assistantMessage);
        return next;
      });
    }, 600);
  }, []);

  return (
    <NavigationProvider adapter={adapter} linkComponent={NextNavLink}>
      <SharedAppShell
        platform="web"
        themeVariant={themeVariant}
        rightRail={
          <PathAdvisorRail
            dock="right"
            messages={advisorMessages}
            onSend={handleAdvisorSend}
          />
        }
        advisorDock="right"
      >
        {props.children}
      </SharedAppShell>
    </NavigationProvider>
  );
}
