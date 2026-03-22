/**
 * Desktop renderer entry point.
 *
 * Boots a React Router app wrapped with the NavigationProvider from
 * @pathos/adapters, using the reactRouterNavAdapter to wire shared
 * screens to React Router navigation.
 *
 * HashRouter is used instead of BrowserRouter because Electron loads
 * files via file:// protocol in production -- hash routing avoids 404s
 * when navigating to sub-paths.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { DesktopApp } from './DesktopApp';

// Import Tailwind / global styles
import './globals.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <HashRouter>
      <DesktopApp />
    </HashRouter>
  </React.StrictMode>,
);
