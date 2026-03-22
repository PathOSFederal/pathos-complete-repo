import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  root: '.',
  // Use relative paths so file:// protocol works in packaged Electron
  base: './',
  resolve: {
    alias: {
      '@pathos/core': path.resolve(__dirname, '../../packages/core/src'),
      '@pathos/adapters': path.resolve(__dirname, '../../packages/adapters/src'),
      '@pathos/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    // Target Electron's Chromium
    target: 'chrome128',
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
