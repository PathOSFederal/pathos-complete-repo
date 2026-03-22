/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'next/core-web-vitals',
    'plugin:prettier/recommended', // keeps ESLint and Prettier in sync
  ],
  plugins: ['prettier'],
  rules: {
    // Prettier formatting as an ESLint rule
    'prettier/prettier': 'warn',

    // You can customize code-style rules here. Examples:
    'no-unused-vars': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
