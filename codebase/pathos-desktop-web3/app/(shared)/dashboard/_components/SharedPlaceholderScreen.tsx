'use client';

import type React from 'react';
import { useNav } from '@pathos/adapters';

export function SharedPlaceholderScreen(props: {
  title: string;
  description: string;
}) {
  const nav = useNav();

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--p-text)' }}>{props.title}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--p-text-muted)' }}>
          {props.description}
        </p>
      </div>

      <div
        className="p-4 text-sm"
        style={{
          background: 'var(--p-surface2)',
          border: '1px solid var(--p-border)',
          borderRadius: 'var(--p-radius)',
          color: 'var(--p-text-muted)',
        }}
      >
        This shared route is active. Content modules are being migrated into shared UI.
      </div>

      <button
        type="button"
        onClick={function () { nav.push('/dashboard'); }}
        className="px-4 py-2 text-sm font-medium transition-colors"
        style={{
          border: '1px solid var(--p-border)',
          borderRadius: 'var(--p-radius)',
          color: 'var(--p-text-muted)',
          background: 'transparent',
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
