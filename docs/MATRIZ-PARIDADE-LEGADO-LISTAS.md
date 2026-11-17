# Matriz de paridade — listas e estoque

Base auditada: legado `legacy/backend/kaizen_app/controllers.py` e `services.py`; novo `apps/api/src` e `apps/web/src`, base `develop2@c27c6c2`.

| Domínio | Legado | Novo | Status | Evidência / próximo passo |
|---|---|---|---|---|
| Listas CRUD, lixeira, restauração e exclusão permanente | rotas `/listas` | `v1/listas`, `deletadas`, `restaurar`, `permanente`, `batch-permanente` | COMPLETA | Controllers e serviço novos registram todas as operações. |
| Itens de lista, mínimos, atual, fardo e threshold | `/listas/:id/itens`, estoque | `ListaItemRef`; `v1/listas/:id/itens`; `v1/collaborator/listas/:id/estoque` | COMPLETA | `ListasService.atualizarEstoque` valida pertencimento à lista. |
| Cálculo de pedido | mínimo-atual; lote condicional | `submeterLista` | COMPLETA | Novo usa `qtdFardo` quando `usaThreshold`, senão mínimo-atual. |
| Submissão do colaborador e pedidos | `/listas/:id/estoque/submit` | `v1/collaborator/listas/:id/submeter` | COMPLETA | Cria submissão e pedidos em transação lógica. |
| Aprovar, rejeitar, reverter pedidos / submissões | rotas de pedido e submissão | `v1/admin/pedidos/:id/status`, `submissoes/:id/{aprovar,rejeitar,reverter}` | COMPLETA | Estado e lote consolidado são recalculados no serviço. |
| Aprovação em lote | `/pedidos/aprovar-lote`, `/pedidos/rejeitar-lote` | UI seleciona e atualiza pedidos individualmente | PARCIAL | Fluxo visual existe, mas não há endpoint transacional de lote. Avaliar após telemetria; não duplicar sem necessidade comprovada. |
| Edição administrativa de submissão pendente | `PUT /submissoes/:id/editar`: atualiza estoque e recria pedidos | PR desta branch: `PUT /v1/admin/submissoes/:id/editar` e modal | PARCIAL | P0 em entrega: testes de tenant, estado, fardo, duplicidade e rollback lógico. |
| Recebimento e desfazer recebimento | rotas de recebimento | GET/POST/DELETE admin e collaborator | COMPLETA | Controllers `submissoes` novos. |
| Merge / WhatsApp | merge preview e WhatsApp | `merge-preview`, `merge-whatsapp` | COMPLETA | Rotas e página admin existentes. |
| Estoque por área | `/areas/:id/estoque`, status | `v1/areas/:id/{estoque,status}`, colaborador atualiza/submete | COMPLETA | API e telas de áreas presentes. |
| Almoxarifado | CRUD `/almoxarifado/itens` | sem módulo/tela equivalente | AUSENTE | Modelos/rotas de almoxarifado não existem no novo. P1, depende de definição do domínio atual. |
| Itens CRUD, busca e exportação | `/items`, `/itens/buscar` | `v1/items` CRUD, `search`, `exportar-csv`, `estatisticas` | COMPLETA | APIs e páginas admin existem. |
| Histórico de preços | `/itens/:id/historico-precos` | sem rota/modelo equivalente | AUSENTE | P1: requer modelo de preços/auditoria e critérios de retenção. |
| Fornecedores e importação de itens | CRUD, itens, CSV/texto | CRUD, exportação; sem rota equivalente de itens por fornecedor | PARCIAL | Novo tem fornecedores/cotações, não o catálogo por fornecedor comprovável pelas rotas. |
| Cotações | criar de estoque, preços, fechar | `v1/admin/cotacoes`, `cotacao-itens`, fechar | COMPLETA | Rotas e telas admin. |
| Usuários, aprovação, roles, senha | CRUD, aprovar, permissões | `v1/admin/usuarios` CRUD, role, aprovar, desativar, senhas | COMPLETA | SUPER_ADMIN/ADMIN/COLLABORATOR/CONTADOR no schema. |
| Perfis especiais do legado | supplier, admissão, EPI, impersonação | SUPPLIER existe no schema; não há módulos/telas admissão, EPI, impersonação | AUSENTE / PARCIAL | P2; exigir decisão de produto antes de migrar. |
| Configuração de restaurante e módulos | restaurantes, módulos | `restaurantes/:id/modulos`, usuários, backup/restore | COMPLETA | Módulos e isolamento por tenant implementados. |
| Notificações | rotas e preferências | `v1/notificacoes`, contador, lida, limpar, marcar todas | COMPLETA | Histórico detalhado de notificações não confirmado. |
| Histórico / auditoria | histórico de lista, logs, atividades | logs administrativos; sem rota de histórico por lista | PARCIAL | P1: confirmar necessidade de trilha de lista antes de implementação. |
| Relatórios / dashboards | dashboard summary, activity summary, estatísticas | estatísticas e dashboard web; não há equivalência API comprovada para summaries | PARCIAL | P2: auditoria funcional/UX dedicada. |

## Prioridade comprovada

- P0: edição administrativa de submissão PENDENTE. Entregue nesta branch; bloqueada de aprovação automática quando há pedido decidido, preservando integridade.
- P1: almoxarifado; histórico de preços; histórico por lista; catálogo de itens por fornecedor.
- P2: admissão/EPI/impersonação; dashboards e relatórios legados especializados.

## Regras de evidência

Uma ausência acima significa ausência de rota, modelo e referência encontrada no novo durante a auditoria; não significa que o produto deva ser reimplementado sem critérios de aceite.
