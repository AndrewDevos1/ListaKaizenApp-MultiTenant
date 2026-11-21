# GO/NO-GO — promoção MVP v1 para develop

Data: 2026-11-21
Candidata homologada: tag local `homologacao-reduzida-20261121` no commit `d6333731fb1d9eb858ac3f872f9bbe612659cf98`.
Código funcional auditado: `470835c76ffcad2bc4a07953d38f2058eeafcb64`.

## Decisão

GO para promoção não destrutiva de `integration/cutover-local-ponto-listas-reduzida` em `origin/develop`, condicionada somente à revisão independente do SHA final deste relatório.

Não é autorização de cutover de runtime, migração de banco local existente, Railway, produção, `develop2` ou `main`.

## Escopo promovido

- Ponto/RH: registros, escalas, espelho, banco de horas, ausências e atestados.
- Listas de compras, submissões, edição administrativa de pendentes, RBAC, isolamento tenant e guardas de módulos.
- Dependências API necessárias a Listas: Items e Areas.

Fora do MVP runtime: EPI/almoxarifado, fornecedores, cotações, POP, checklists, sugestões, listas rápidas, importação/logs de domínios excluídos, Contador runtime e cancelamento `dcba71d6f098096f92e1334fd5dccd7778ae1b0e`.

Compatibilidade de schema: as 13 migrations históricas preservam `modulo_almoxarifado_epi` e permissões EPI/ALMOXARIFADO em lineage anterior; não há migration nova desses domínios nem import, controlador, rota ou UI runtime promovidos. Removê-las alteraria histórico/checksum Prisma e não é permitido.

## Estado remoto e rollback

- `origin/develop` antes da promoção: `1ff1d0d8ad2a88522c5a8d7e5564ad6ad4506f5f`.
- Backup remoto publicado antes da promoção: branch `backup/develop-pre-mvp-v1-20261121` e tag anotada `backup-develop-pre-mvp-v1-20261121`.
- Restauração de código: atualizar `develop` para o SHA da branch/tag de backup por operação Git explícita e autorizada; não há force-push neste plano.
- Dados: migrations são forward-only. Antes de futuro cutover local, gerar novo dump e restaurar em cópia descartável; restauração de banco existente exige autorização humana explícita.

## Evidências

- Aprovação humana: Ponto, entrada/saída, Listas, submissão colaborador, aprovação administrativa e cinco pedidos.
- API: 24 suítes, 108 testes PASS; build PASS.
- Web: lint sem erros (112 avisos legados); build PASS.
- DB descartável final `55469`: 13 migrations, seed e drift PASS; E2E 23/23 PASS.
- Backup do destino atual `4101`: dump read-only restaurado em container descartável `55468` com `--no-owner --no-acl`; contagens iguais `restaurantes=23`, `usuarios=52`, `listas=3`, `_prisma_migrations=29`.
- Exclusões: módulos não importados em `AppModule`; cancelamento `dcba71d` fora da ancestralidade; migrations da candidata permanecem 13 e não incluem EPI/almoxarifado.

## Riscos restantes

- Migrations de bases já existentes são forward-only; rollback de dados é por dump validado, não down SQL automático.
- Avisos ESLint legados permanecem, sem erro de lint/build.
- Runtime humano em `4100/4101` ainda serve worktree anterior; não será alterado por esta promoção.

## Execução autorizada

1. Revisar independentemente o SHA final.
2. Confirmar `origin/develop` ainda em `1ff1d0d` e backup remoto existente.
3. Efetuar push fast-forward somente de `HEAD` para `origin/develop`.
4. Ler de volta o SHA remoto, criar tag oficial MVP v1 e publicar a tag.
5. Atualizar issues com SHA, backup, gates, escopo e rollback.
