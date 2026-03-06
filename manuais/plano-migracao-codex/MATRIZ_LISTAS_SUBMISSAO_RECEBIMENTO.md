# Matriz Legado x Atual x Falta — Listas, Submissoes e Recebimento

## Escopo
Este documento compara o comportamento do legado (Flask/React) com o estado atual do multi-tenant (Nest/Next) para o fluxo:
1. colaborador preenche estoque;
2. colaborador submete lista;
3. admin aprova/rejeita;
4. colaborador/admin confirma recebimento.

## Matriz de Paridade

| Tema | Legado (referencia) | Multi-tenant atual (codigo real) | Gap | Prioridade |
|---|---|---|---|---|
| Preencher estoque da lista | Colaborador atualiza quantidade atual e visualiza pedido em tempo real com threshold/fardo | Implementado em `apps/web/src/app/collaborator/listas/[id]/page.tsx` + `PUT /v1/collaborator/listas/:id/estoque` | Falta travar acesso por atribuicao da lista (hoje valida tenant, nao vinculo colaborador-lista) | P0 |
| Submeter lista | Cria submissao PENDENTE com pedidos > 0 | Implementado em `POST /v1/collaborator/listas/:id/submeter` | Regra de calculo no backend nao aplica `qtdFardo` quando `usaThreshold=true` (frontend aplica) | P0 |
| Historico de minhas submissoes | Lista com filtros e status | Implementado (`/collaborator/submissoes`, `GET /v1/collaborator/submissoes`) | Nao traz status de recebimento, nem listas rapidas integradas na mesma visao | P1 |
| Detalhe submissao colaborador | Visualizacao + edicao/resubmissao quando pendente | Visualizacao implementada (`GET /v1/collaborator/submissoes/:id`) | Falta modo edicao/resubmissao (`PUT /v1/submissoes/:id`) | P1 |
| Detalhe submissao admin | Aprovar/rejeitar em lote e por item | Implementado no backend e tela | Contrato de payload divergente na tela admin: frontend usa `pedido.itemRef.item` e `quantidadeSolicitada`, backend retorna `pedido.item` e `qtdSolicitada` | P0 |
| Acoes de submissao (admin) | Aprovar, rejeitar, reverter, arquivar, desarquivar, excluir | Aprovar/rejeitar/reverter/arquivar implementados | Falta desarquivar e excluir permanente de submissao arquivada | P1 |
| Acoes por pedido (admin) | Aprovar, rejeitar, reverter, editar quantidade, lotes | Aprovar/rejeitar por item implementados (`PUT /v1/admin/pedidos/:id/status`) | Falta reverter item individual; falta editar quantidade; falta aprovar/rejeitar em lote por `pedido_ids` | P1 |
| Converter submissao para checklist | Disponivel para APROVADO/PARCIAL | Implementado (`POST /v1/admin/checklists`) | Sem gap critico no fluxo principal | OK |
| Merge WhatsApp | Preview + texto consolidado | Implementado (`merge-preview`, `merge-whatsapp`) | Sem gap critico no fluxo principal | OK |
| Recebimento (colaborador) | Confirmar itens recebidos apos aprovacao/parcial | Nao implementado | Falta modelo de dados, endpoints e telas | P1 |
| Recebimento (admin) | Confirmacao administrativa e desfazer | Nao implementado | Falta modelo de dados, endpoints e telas | P1 |
| Lotes consolidados | Aprovar lotes de sublistas com status de lote | Nao implementado no schema/API/web | Falta modelagem + modulo completo | P2 |
| Notificacoes do fluxo | Notifica admin em submissao e colaborador em aprovacao/rejeicao/recebimento | Infra de notificacao existe | Fluxo de submissoes nao dispara notificacoes equivalentes ao legado | P1 |

## Plano de Acao Detalhado (Execucao Paralela)

### Frente A — API/Regra de Negocio (Nest)
Objetivo: fechar regras de fluxo criticas e contratos.

1. P0-A1: corrigir calculo de submissao em `ListasService.submeterLista` para respeitar `usaThreshold/qtdFardo`.
2. P0-A2: garantir permissao de colaborador por atribuicao da lista em:
   - visualizar lista de estoque;
   - atualizar estoque;
   - submeter lista.
3. P1-A3: implementar `desarquivar` e `delete` de submissao arquivada.
4. P1-A4: implementar acoes de pedido faltantes (`reverter`, `editar quantidade`, lote por `pedido_ids`).
5. P1-A5: implementar modulo de recebimento (modelos, service, controller colaborador/admin).
6. P1-A6: disparar notificacoes de submissao/aprovacao/rejeicao/recebimento.

### Frente B — Web/UX Funcional (Next)
Objetivo: garantir que as telas operem com o contrato real da API e o fluxo legado.

1. P0-B1: corrigir tela `admin/submissoes/[id]` para ler `pedido.item` + `pedido.qtdSolicitada`.
2. P1-B2: adicionar acoes faltantes de submissao (desarquivar/excluir) e de pedido (reverter/editar/lote).
3. P1-B3: adicionar edicao/resubmissao em `collaborator/submissoes/[id]`.
4. P1-B4: implementar telas de recebimento:
   - colaborador: confirmar recebimento;
   - admin: confirmar/desfazer recebimento e visualizacao do registro.
5. P1-B5: ajustar listagem de colaborador para exibir estado de recebimento.

### Frente C — Banco/Migracoes (Prisma)
Objetivo: suportar recebimento e recursos faltantes.

1. P1-C1: adicionar modelos `Recebimento` e `RecebimentoItem` no `schema.prisma`.
2. P1-C2: criar migration + ajuste de relacionamentos com `Submissao`/`Pedido`.
3. P2-C3: modelar lotes consolidados (`SubmissaoConsolidadaLote`, `Participante`) quando iniciar Fase P2.

### Frente D — Qualidade (Unit + E2E)
Objetivo: garantir que paridade funcional nao quebre em evolucoes.

1. P0-D1: teste unitario para calculo com `usaThreshold/qtdFardo` em `submeterLista`.
2. P0-D2: E2E cobrindo bloqueio de colaborador nao atribuido em lista.
3. P1-D3: E2E de recebimento completo (aprovado -> confirmar -> admin visualizar/desfazer).
4. P1-D4: E2E de resubmissao pendente e recalculo de pedidos.

## Sequencia Recomendada de Checkpoints

1. CP-LS-001 (P0): contrato admin + calculo threshold/fardo + permissao colaborador por lista.
2. CP-LS-002 (P1): acoes faltantes de submissao/pedido (desarquivar, delete, reverter/editar pedido, lote).
3. CP-LS-003 (P1): recebimento (schema + API + telas + testes).
4. CP-LS-004 (P1): resubmissao colaborador + ajustes finais de notificacoes.
5. CP-LS-005 (P2): lotes consolidados.

## Definicao de Conclusao
Considerar "paridade funcional suficiente" quando:
- colaborador consegue preencher, submeter e (se pendente) resubmeter;
- admin consegue aprovar/rejeitar por submissao e por item;
- recebimento existe para colaborador/admin;
- fluxo completo esta coberto por E2E.
