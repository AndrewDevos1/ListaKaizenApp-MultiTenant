# Evidência smoke RH #22 — banco descartável

- Base: `b88c1be8a6b1c5732458281e95386fff9aeb306e` (branch `chore/cutover-prep-smoke`) + ajustes de hardening nos scripts (este commit).
- Bancos: Postgres 16-alpine novos, nome com `_test`, rótulos `owner=kaizen-smoke|kaizen-mig-test`, 127.0.0.1, senha aleatória em memória (não registrada), removidos ao fim (`docker rm -fv`).
- Sem push/merge/Railway/produção/banco real.

| Gate | Comando | Resultado |
|---|---|---|
| Smoke 2 rodadas | `SMOKE_PASSWORD=<seed> bash apps/api/scripts/smoke-clean-db.sh` | rodada 1 **51/51**, rodada 2 (idempotência) **49/49** (`smoke-rh-22.txt`) |
| Migrations do zero | `npm run test:migrations --workspace=apps/api` | deploy OK, `No difference detected` (`test-migrations.txt`) |
| migrate deploy + seed + diff | `prisma migrate deploy; ts-node prisma/seed.ts; prisma migrate diff --from-url … --to-schema-datamodel … --exit-code` | exit 0 |
| Jest completo (`--runInBand`, `TEST_DATABASE_URL` descartável, após seed) | `npm test` | 21/21 suítes, 97/97 testes (`jest-rh-22.txt`) |
| API | `tsc --noEmit`, `eslint {src,test}`, `npm run build` | 0 / 0 / 0 |
| Web | `tsc --noEmit`, `npm run lint`, `npm run build` | 0 / 0 / 0 |

Nota: `ponto-noturno.integration.spec.ts` exige o seed (usuário id 3); sem seed falha por FK — pré-requisito, não bug.

## Pendente
Aceite visual/browser humano **não executado**; sem declaração de PASS.
