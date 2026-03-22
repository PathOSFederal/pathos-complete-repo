/**
 * ============================================================================
 * VITEST CONFIGURATION (Day 12)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Configuration file for Vitest, our unit testing framework. Vitest is chosen
 * because it's fast, ESM-native, and works seamlessly with TypeScript.
 *
 * WHERE IT FITS:
 * This configuration enables us to run unit tests for:
 * - Job adapters/mappers (lib/jobs/adapters/)
 * - Zod schemas (lib/jobs/schemas.ts)
 * - Pure utility functions
 *
 * WHY VITEST:
 * 1. Fast - Uses Vite under the hood for quick test execution
 * 2. ESM-native - Works with modern ES modules out of the box
 * 3. TypeScript-first - Native TypeScript support without extra config
 * 4. Jest-compatible API - Easy migration if you know Jest
 *
 * USAGE:
 * Run all tests:        pnpm test
 * Watch mode:           pnpm test:watch
 * Run specific file:    pnpm test lib/jobs/adapters/mock/v1Mapper.test.ts
 *
 * @version Day 12 - Job Data Adapter & Canonical Job Model v1
 * ============================================================================
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  // ==========================================================================
  // TEST CONFIGURATION
  // ==========================================================================
  test: {
    /**
     * Use 'node' environment for pure logic tests.
     * We're testing adapter functions, not React components.
     */
    environment: 'node',

    /**
     * Enable global test functions (describe, it, expect) without imports.
     * This matches Jest's behavior and makes tests cleaner.
     */
    globals: false,

    /**
     * Include patterns for test files.
     * Matches *.test.ts and *.test.tsx files anywhere in the project.
     */
    include: ['**/*.test.ts', '**/*.test.tsx'],

    /**
     * Exclude patterns - skip node_modules and build output.
     */
    exclude: [
      'node_modules',
      '.next',
      'dist',
      'out',
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      'artifacts/**',
      '_local_artifacts/**',
    ],

    /**
     * Shared setup loaded before tests execute.
     */
    setupFiles: ['./vitest.setup.ts'],

    /**
     * Coverage configuration (optional, for future use).
     * Run with: pnpm test --coverage
     */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
    },
  },

  // ==========================================================================
  // RESOLVE CONFIGURATION
  // ==========================================================================
  resolve: {
    /**
     * Path aliases to match tsconfig.json.
     * This allows tests to use @/lib/... imports.
     */
    alias: {
      '@': resolve(__dirname, './'),
      '@pathos/core': resolve(__dirname, './packages/core/src/index.ts'),
      '@pathos/adapters': resolve(__dirname, './packages/adapters/src/index.ts'),
      '@pathos/ui': resolve(__dirname, './packages/ui/src/index.ts'),
    },
  },
});
