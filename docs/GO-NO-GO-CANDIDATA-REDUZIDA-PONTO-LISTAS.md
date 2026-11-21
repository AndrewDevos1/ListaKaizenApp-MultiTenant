# GO/NO-GO — candidata reduzida local Ponto/RH e Listas

Data: 2026-11-21
Base de integração: `b1456a8728a53fda6ba6c2c4577f39954b71b0ae`
Referência homologada: `48b062e95545658abd12ca2ce843d72a4b377d0b`
SHA final: `3234e3119d75b772be34b1d667e39dfdadb41432`.
Decisão desta etapa: GO técnico para homologação local isolada. Não autoriza cutover.

## Escopo

Inclui:

- Ponto, escalas, espelho, banco de horas, ausências e atestados.
- Listas de compras, submissões e edição administrativa de submissão PENDENTE.
- Isolamento tenant, RBAC e flag `moduloFuncionarios` em listas, grupos e submissões.
- Correções de segurança: SUPER_ADMIN precisa de `restauranteId` em recursos guardados por módulo; alteração de flag é auditada na mesma transação.

Exclui:

- Migrations e módulos de catálogo por fornecedor, almoxarifado e EPI.
- Interfaces e rotas EPI/almoxarifado.
- Cancelamento de submissão `dcba71d6f098096f92e1334fd5dccd7778ae1b0e`.
- Módulo, rotas e UI de Contador.

Compatibilidade preservada:

- A migration histórica `20261019120000_contador_links` e modelos Prisma Contador permanecem para não quebrar histórico/checksum de Prisma. Não representam ativação de funcionalidade na onda. Não há import de `ContadorModule`, rota `/contador` nem página `/contador` nesta candidata.
- `moduloAlmoxarifadoEpi` permanece apenas no contrato histórico de tenant; esta candidata não importa módulos EPI/almoxarifado nem adiciona migrations deles.

## Migrations incluídas

1. `20260101000000_baseline`
2. `20261018000000_add_restaurante_modules`
3. `20261018010000_add_registros_ponto`
4. `20261018020000_add_classificacoes_ausencia`
5. `20261018020000_add_escalas_trabalho`
6. `20261018030000_add_lancamentos_banco_horas`
7. `20261018040000_add_atestados`
8. `20261019050000_approve_atestados`
9. `20261019050100_default_pending_atestados`
10. `20261019050300_atestado_idempotency`
11. `20261019120000_contador_links` — compatibilidade de lineage, sem runtime Contador
12. `20261020000000_fix_schema_drift`
13. `20261117000000_escala_permite_jornada_noturna`

Não há migrations `20261117120000+` de catálogo/almoxarifado/EPI nesta candidata.

## Evidência executada

PostgreSQL descartável: `kaizen-cutover-reduzida-test`, `127.0.0.1:55466`, banco `kaizen_cutover_reduzida_test`.

- `prisma migrate reset --force --skip-generate`: PASS, 13 migrations.
- `npm run db:seed`: PASS, somente dados sintéticos.
- `prisma migrate diff --exit-code`: PASS, sem diferença.
- API unitários: 23 suítes PASS, 1 skip pré-existente, 107 testes PASS.
- E2E: Ponto/RH 6/6 e Listas/RBAC/MultiTenant 6/6 PASS, contra PostgreSQL descartável.
- API lint e build: PASS.
- Web lint e build: PASS; warnings ESLint pré-existentes, sem erro.
- `git diff --check`: PASS.
- Escopo: base ancestral PASS; cancelamento `dcba71d6f098096f92e1334fd5dccd7778ae1b0e` fora da ancestralidade; 0 migrations alteradas após a base.

Backup/restauração descartável:

- Dump custom PostgreSQL: `/home/devos/.hermes/cache/scratch/cutover-reduzida-evidence/kaizen-cutover.dump`.
- SHA-256: registrado em `backup.sha256` no mesmo diretório.
- Origem/restauração: contagens idênticas para `restaurantes`, `usuarios`, `listas`, `registros_ponto` e `_prisma_migrations`.
- Restauração executada somente no banco descartável `kaizen_cutover_reduzida_test` do container `kaizen-cutover-reduzida-test`.

## Procedimento de futuro cutover local

Pré-requisitos obrigatórios:

1. Definir explicitamente o banco local alvo, launcher, janela e responsável.
2. Parar apenas processos comprovadamente pertencentes ao launcher alvo.
3. Criar backup `pg_dump -Fc` do alvo e restaurar em cópia descartável; comparar contagens/migrations críticas.
4. Confirmar `prisma migrate status` e executar `prisma migrate deploy` somente após backup validado.
5. Gerar API e Web do SHA aprovado, iniciar em portas dedicadas, validar login/RBAC/Ponto/Listas.
6. Registrar PID, CWD, SHA e health checks do runtime novo antes de trocar qualquer endpoint local.

## Rollback

- Código/runtime: iniciar o launcher do SHA anterior conhecido, sem editar dados.
- Dados: migrations são forward-only. Não executar down SQL automático.
- Se houver necessidade de recuperar dados, parar o launcher alvo e restaurar o dump validado sob autorização humana explícita.
- EPI, almoxarifado e cancelamento não pertencem a este rollback porque não pertencem ao runtime promovido.

## Bloqueios restantes

- Homologação humana de regressão desta nova candidata ainda pendente.
- Revisão independente final do SHA congelado ainda pendente.
- URL/credenciais fictícias dependem do runtime isolado, ainda não iniciado nesta etapa.
- Alvo local/launcher/janela de cutover não foram definidos; nenhum banco local existente foi inspecionado ou alterado.
- Cutover, merge em `develop2`/`main`, push, Railway e produção permanecem proibidos.
