# Issue #6 — estratégia compatível e rollback

## Decisão aplicada
- `PAGAMENTO_HORAS` permanece inalterado no enum e nos registros históricos.
- `ATESTADO` continua categoria distinta disponível no enum do banco de horas, mas este fluxo não cria lançamentos.
- Atestados são registros próprios, auditados e isolados por restaurante.

## Rollback da migration `20261018040000_add_atestados`
Em banco validado e após interromper o uso do endpoint, executar:

```sql
DROP TABLE "atestados";
DROP TYPE "SituacaoAtestado";
```

A migration é aditiva: não altera nem converte `lancamentos_banco_horas`; rollback não toca `PAGAMENTO_HORAS` nem dados históricos.

## Decisão pendente
Definir se dias cobertos por atestado reduzem horas previstas, contam como crédito, ficam neutros, ou usam política por escala. Até aprovação, espelho e banco de horas não sofrem lançamento automático.
