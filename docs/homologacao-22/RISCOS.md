# Riscos abertos (issue #22)

## Prisma migrate deploy em banco vazio: FALHA
Migration `20261018000000_add_restaurante_modules` faz ALTER em `restaurantes`, que nenhuma migration anterior cria
(P3018 / 42P01). Só 10 migrations, nenhuma baseline. Banco de homologação foi montado com `db push` + seed:
isso NÃO prova que `migrate deploy` funciona. Correção sugerida (fora deste PR): migration baseline do schema base.

## npm audit
Ver `npm-audit.txt`. Não triado nem corrigido neste PR.

## Lint web
Config ESLint criada (`eslint.config.mjs`). 0 erros, 163 warnings; 3 regras rebaixadas a warn (any, aspas, rules-of-hooks em Sidebar/restaurantes). Dívida real.

## Rodada 4
- Baseline Prisma: proposta gerada (migrate diff do schema anterior à 1ª migration, 696 linhas) mas NÃO commitada nem validada: o DROP/CREATE do banco descartável exigiu aprovação e expirou. Pendente: criar DB vazio, `migrate deploy`, `migrate diff` vs schema = vazio. Bancos existentes precisam `migrate resolve --applied 20260101000000_baseline` (sem executar SQL).
- npm audit (prod): 3 critical (next, proxy-addr, tar), 29 high, 13 moderate. Diretas: next, @nestjs/*, prisma, axios, bcrypt (major 6), adm-zip (major). Nada corrigido ainda; sem `audit fix --force`.
