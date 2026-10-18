import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next*/**',
      '**/dist/**',
      '**/coverage/**',
      'apps/api/prisma/seed.ts',
      'apps/api/src/main.ts',
      'apps/web/src/app/admin/editar-perfil/page.tsx',
      'apps/web/src/app/admin/estatisticas/page.tsx',
      'apps/web/src/app/colaborador/listas/[id]/page.tsx',
      'apps/web/src/app/collaborator/listas/**',
      'apps/web/src/app/collaborator/perfil/page.tsx',
      'apps/web/src/app/admin/fornecedores/page.tsx',
      'apps/web/src/components/Sidebar.tsx',
      'apps/web/src/components/SwRegister.tsx',
      'apps/web/src/hooks/usePWAInstall.ts',
      'apps/web/src/hooks/usePushNotifications.ts',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      curly: ['error', 'multi-line'],
      eqeqeq: ['error', 'smart'],
      'no-console': 'error',
    },
  },
];
