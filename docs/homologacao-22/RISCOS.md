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

## Rodada 6 (fechamento)
- next build completo apos o seletor de mes: OK (57/57 paginas). Seletor "novembro/2026" sem corte em 390px (select 150px/89px, scrollWidth == clientWidth).
- Teste ignorado: `ponto-noturno.integration.spec.ts` usa `describe.skip` sem `TEST_DATABASE_URL` com `_test` no nome (guard contra banco real). Com o banco de homologacao: 1/1 PASS. Pode permanecer assim: `npm test` fica hermetico e o guard impede escrita em banco nao descartavel. Rodar com TEST_DATABASE_URL antes do merge.
- Riscos npm remanescentes (prod: 0 critical, 6 high, 8 moderate): next/postcss (fix = next 16), CLI prisma (effect, deepmerge-ts), @nestjs/cli/@angular-devkit (ferramentas de build, nao entram no runtime). Para o uso pretendido (homologacao interna, sem exposicao publica) nenhum e critico; reavaliar antes de exposicao publica. Issues separadas abertas (next 16, nest cli 12, prisma 7).
### Procedimento seguro para bancos existentes (nao executado)
1. Backup: `pg_dump -Fc` do banco; restaurar em banco descartavel e ensaiar la.
2. `npx prisma migrate status` (somente leitura): esperado "baseline pendente".
3. Confirmar que o banco ja tem as tabelas da baseline (ex.: `restaurantes`, `escalas_trabalho`).
4. `npx prisma migrate resolve --applied 20260101000000_baseline` (so registra em `_prisma_migrations`, sem SQL).
5. `npx prisma migrate deploy` (aplica so a pendente `20261020000000_fix_schema_drift`, idempotente).
6. `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code` deve dar 0.
Rollback: restaurar o dump. Nunca `db push`, DROP ou CREATE em banco real.
### Cadeia de PRs #23-#27
- Ordem: #14->#15->#16->#17(contador) -> #23 -> #25 -> #26 -> #27; #24 sai de #17 em paralelo.
- CONFLITO REAL: #24 (menu RH) x #27 em `apps/web/src/components/Sidebar.tsx` (merge-tree: conflito de conteudo; Sidebar.module.css auto-merge). #23, #25, #26 sem sobreposicao com #24.
- Plano: integrar #23->#25->#26->#27 e so depois rebasear #24 sobre o resultado, resolvendo Sidebar.tsx manualmente e mantendo: grupo RH do #24 + hooks sem early return, link banco-horas do colaborador e CSS da orelha do #27. Nao mergear #24 antes: perderia as correcoes de rules-of-hooks.
- Migrations: ordem lexical baseline(20260101...) < 20261018... < drift(20261020...); nenhuma duplicada.
