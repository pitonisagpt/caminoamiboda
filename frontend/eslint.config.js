import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Only the long-standing, universally-adopted rules — not the full
      // "recommended" preset, which (as of eslint-plugin-react-hooks v6+)
      // bundles React Compiler diagnostics like set-state-in-effect that
      // flag this codebase's standard useEffect(() => { load(); }, [...])
      // data-fetching pattern as an error even though it's correct here.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // tsc (noUnusedLocals/noUnusedParameters, tsconfig.json) already
      // enforces this project-wide — avoid the same violation being
      // reported twice by two different tools.
      '@typescript-eslint/no-unused-vars': 'off',
      // Used deliberately throughout this codebase (axios error shapes,
      // chart callback params, third-party generics without precise
      // types) — not oversights worth blocking commits over.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
