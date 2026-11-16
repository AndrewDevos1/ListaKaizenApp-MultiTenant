# Riscos abertos (issue #22)

## Prisma migrate deploy em banco vazio: FALHA
Migration `20261018000000_add_restaurante_modules` faz ALTER em `restaurantes`, que nenhuma migration anterior cria
(P3018 / 42P01). Só 10 migrations, nenhuma baseline. Banco de homologação foi montado com `db push` + seed:
isso NÃO prova que `migrate deploy` funciona. Correção sugerida (fora deste PR): migration baseline do schema base.

## npm audit
Ver `npm-audit.txt`. Não triado nem corrigido neste PR.

## Lint web
Config ESLint criada (`eslint.config.mjs`). 0 erros, 163 warnings; 3 regras rebaixadas a warn (any, aspas, rules-of-hooks em Sidebar/restaurantes). Dívida real.
