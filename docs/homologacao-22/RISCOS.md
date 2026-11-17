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

## Rodada 5
### Migrações (RESOLVIDO)
- Causa: nenhuma migration criava o schema inicial (a 1ª fazia ALTER em `restaurantes`).
- Correção: `20260101000000_baseline` (schema anterior à 1ª migration, via `migrate diff --from-empty`) + `20261020000000_fix_schema_drift` (FK `atestados_decidido_por_id_fkey` e nome de índice de `contador_funcionarios`, detectados por `migrate diff`).
- Validação: `npm run test:migrations --workspace=apps/api` sobe Postgres 16 descartável novo (label owner=kaizen-mig-test), roda `migrate deploy` (11+1 migrations OK) e `migrate diff --exit-code` = sem drift; container removido ao fim.
- Bancos EXISTENTES (já têm as tabelas): NÃO rodar a baseline. Antes do próximo `migrate deploy`: `npx prisma migrate resolve --applied 20260101000000_baseline`. A migration de drift é idempotente (DROP IF EXISTS / ALTER INDEX IF EXISTS). NÃO executado em nenhum banco nesta missão.
### npm audit (prod): 3 critical/29 high/13 moderate -> 0 critical/6 high/8 moderate
- Corrigido: next 15.5.x (critical), proxy-addr, body-parser, multer, path-to-regexp, lodash, axios, form-data, js-yaml, qs, etc. via `npm audit fix` (sem --force); bcrypt 5->6 (remove node-pre-gyp/tar, critical) com hash/compare verificado; adm-zip 0.5->0.6.1 (único uso: getEntry em import.service.ts).
- Remanescente: next/postcss (fix exige next 16, major); prisma/@prisma/config/effect/deepmerge-ts (cadeia da CLI prisma 6, fix exige major; effect só no CLI, não no runtime da API); @nestjs/cli + @angular-devkit + ajv/glob/minimatch/picomatch (ferramentas de build/schematics, fix exige @nestjs/cli 12 major; fora do runtime). Próximo passo: upgrade next 16 e @nestjs/cli 12 em PR próprio com regressão.
