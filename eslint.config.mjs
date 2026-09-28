import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'releases/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['dist/sw.js', 'dist/precache-manifest.js'],
    languageOptions: { globals: globals.serviceworker },
  },
];
