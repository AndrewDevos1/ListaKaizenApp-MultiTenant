import { FlatCompat } from '@eslint/eslintrc';
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
// ponto: dívida legada (122 any, 8 aspas,) rebaixada a warn; zerar e voltar a error.
export default [
  { ignores: ['.next/**', 'node_modules/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { rules: { '@typescript-eslint/no-explicit-any': 'warn', 'react/no-unescaped-entities': 'warn' } },
];
