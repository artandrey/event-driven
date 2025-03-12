import pluginJs from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['**/dist/**', 'tsup.config.ts', 'vitest.config.mts', 'vitest.config.e2e.mts'],
  },
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'error',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
];
