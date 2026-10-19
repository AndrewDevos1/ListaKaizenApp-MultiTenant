# Issue #6 — abono de atestados e rollback

## Regra aplicada
- `PAGAMENTO_HORAS` e todos os lançamentos históricos permanecem inalterados.
- Atestado nasce `PENDENTE`; somente `APROVADO` abona no espelho mensal.
- O abono é a interseção entre escala vigente, período do atestado e horário parcial informado.
- Batidas reais são preservadas; o abono só cobre minutos previstos, limitado ao turno. Não cria crédito positivo artificial.
- Rejeitado ou cancelado não abona. Consulta do espelho não grava lançamentos nem altera dados.

## Migração
`20261019050000_approve_atestados` é aditiva: novos estados, campos de período parcial e decisão/auditoria. Não altera `lancamentos_banco_horas`.

`20261019050300_atestado_idempotency` adiciona `solicitacao_hash` e unicidade. O backfill usa a mesma composição do runtime; aborta se houver duplicatas históricas.

## Rollback
Não execute rollback seletivo em banco compartilhado sem backup e validação. Para ambiente descartável, após interromper o endpoint:

```sql
ALTER TABLE "atestados" DROP CONSTRAINT IF EXISTS "atestados_solicitacao_hash_key";
ALTER TABLE "atestados" DROP COLUMN IF EXISTS "solicitacao_hash";
ALTER TABLE "atestados" DROP CONSTRAINT IF EXISTS "atestados_horas_check";
ALTER TABLE "atestados" DROP CONSTRAINT IF EXISTS "atestados_decidido_por_id_fkey";
ALTER TABLE "atestados" ALTER COLUMN "situacao" SET DEFAULT 'ATIVO';
ALTER TABLE "atestados"
  DROP COLUMN IF EXISTS "hora_inicio",
  DROP COLUMN IF EXISTS "hora_fim",
  DROP COLUMN IF EXISTS "decidido_por_id",
  DROP COLUMN IF EXISTS "decidido_em",
  DROP COLUMN IF EXISTS "observacao_decisao";
```

Valores adicionados a enum PostgreSQL não são removidos em rollback operacional. Não tocar em `PAGAMENTO_HORAS`, `ATESTADO`, nem histórico.

## Conformidade
A implementação é parametrizada pela política aprovada; validação jurídica, convenção coletiva e regras locais permanecem gate de produção. Referência legal: CLT, art. 473, Lei 605/1949 e regras de banco de horas aplicáveis ao contrato.
