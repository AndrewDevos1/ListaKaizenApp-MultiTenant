import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['**/node_modules/**', '**/.next*/**', '**/dist/**', '**/coverage/**'],
    linterOptions: { noInlineConfig: true },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      curly: ['warn', 'multi-line'],
      eqeqeq: ['warn', 'always'],
      'no-console': 'warn',
    },
  },
];
