import { defineConfig } from "vitest/config";

// =====================================================================
// WHY: Provide a stable Vitest baseline for the Electron desktop repo.
// HOW: Run tests in a Node environment by default and scope test globs.
// =====================================================================
export default defineConfig({
  test: {
    // WHY: Keep the baseline focused on safe Node tests by default.
    // HOW: Use tests/ for now and allow opt-in renderer-safe tests via *.vitest.js.
    include: ["tests/**/*.test.{js,mjs,ts}"],
    exclude: ["node_modules", "dist", "build"],
    environment: "node",
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: [
        "src/renderer/renderer-diagnostics.js",
        "src/renderer/lib/**/*.js",
        "src/renderer/resume-career-store.js",
      ],
      thresholds: {
        perFile: true,
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
