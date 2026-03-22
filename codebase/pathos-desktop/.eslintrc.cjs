/**
 * This ESLint config exists to give the repo a stable "pnpm lint" baseline.
 * It stays intentionally small so it doesn't change behavior beyond the
 * default "eslint:recommended" safety checks.
 *
 * Why CommonJS? ESLint loads this file with Node, and CommonJS is the most
 * compatible option for Electron projects without any extra setup.
 */
module.exports = {
  /**
   * We lint both the main (Node) process and renderer (browser-like) code,
   * so we enable both environments and ES2022 syntax features.
   */
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  /**
   * Many test files use ES module syntax (`import`), so we opt into modules
   * for parsing across the repo to avoid syntax errors.
   */
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  /**
   * Keep the rules minimal and familiar. "eslint:recommended" already covers
   * common footguns like unused variables and accidental globals.
   */
  extends: ["eslint:recommended"],
  /**
   * The existing codebase has several intentionally unused variables (for
   * readability or future wiring). Turning this off keeps lint focused on
   * syntax and correctness without requiring sweeping refactors.
   */
  rules: {
    "no-unused-vars": "off",
  },
  /**
   * Ignore generated output and dependencies so linting stays fast and
   * focused on source files we control.
   */
  ignorePatterns: ["node_modules/", "release/", "dist/", "out/", "coverage/"],
};
