╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Plano: Documentar Checklist de Compras                 

 Contexto

 O módulo de Checklist de Compras nunca foi documentado em 24_TELAS_ADMIN.md. Ele é um módulo independente com dois
 componentes de tela (GerenciarChecklists.tsx e DetalhesChecklist.tsx), dois modelos de dados (Checklist e ChecklistItem) e
 8 endpoints. O ponto de entrada é a tela DetalhesSubmissao.tsx (já documentada na seção 3 — que menciona o modal de
 conversão e o endpoint POST), mas as telas de listagem e detalhe do checklist em si não existem no documento.

 O objetivo é inserir duas novas seções 3.1 e 3.2 entre a seção 3 (DetalhesSubmissao) e a seção 4 (GerenciarUsuarios), no
 mesmo padrão das demais seções.

 Arquivo a modificar

 manuais/replicando-app/24_TELAS_ADMIN.md — inserir seções 3.1 e 3.2 antes da ## 4. GerenciarUsuarios.tsx.

 Estrutura de rotas (2 componentes novos)

 ┌───────────────────────┬─────────────────────────┬─────────────────────────────────┐
 │         Rota          │       Componente        │              Papel              │
 ├───────────────────────┼─────────────────────────┼─────────────────────────────────┤
 │ /admin/checklists     │ GerenciarChecklists.tsx │ Listagem de todos os checklists │
 ├───────────────────────┼─────────────────────────┼─────────────────────────────────┤
 │ /admin/checklists/:id │ DetalhesChecklist.tsx   │ Detalhes + marcação + ações     │
 └───────────────────────┴─────────────────────────┴─────────────────────────────────┘

 Modelos de dados

 Checklist

 id, submissao_id (FK nullable), nome, status (ATIVO/FINALIZADO),
 criado_em, finalizado_em (nullable)
 → relacionamentos: submissao (opcional), itens (cascade delete)

 ChecklistItem

 id, checklist_id (FK), pedido_id (FK nullable),
 item_nome, quantidade, unidade, fornecedor_nome, observacao  ← dados desnormalizados (snapshot)
 marcado (bool), marcado_em (nullable)

 Por que desnormalizado: snapshot histórico imutável das compras, mesmo se Pedido/Item for alterado depois.

 O que adicionar

 3.1 GerenciarChecklists.tsx (Listagem)

 - Rota: /admin/checklists
 - Arquivo: frontend/src/features/admin/GerenciarChecklists.tsx
 - Layout ASCII: tabela com colunas Nome, Lista origem, Progresso (barra visual), Status (badge), Data, Ações
 - Filtro por tabs: TODOS / ATIVO / FINALIZADO
 - Botão "Ver Detalhes" por linha → navega para /admin/checklists/:id
 - Interface TypeScript (Checklist)
 - Endpoint: GET /admin/checklists?status=...

 3.2 DetalhesChecklist.tsx (Detalhe + Marcação)

 - Rota: /admin/checklists/:id
 - Arquivo: frontend/src/features/admin/DetalhesChecklist.tsx
 - Layout ASCII completo:
   - Header: nome, barra de progresso, botões de ação
   - Tabela de itens com checkbox, nome, quantidade, unidade, fornecedor (condicional), observação (condicional)
 - Estados condicionais dos botões:
   - Status ATIVO: [Finalizar Checklist]
   - Status FINALIZADO: [Reabrir Checklist]
   - Sempre disponíveis: [Compartilhar WhatsApp] [Copiar Texto]
 - Comportamento de marcação: PUT por item, atualiza marcado_em e recalcula progresso local
 - Suporte offline: detecta isOfflineError(), usa fallback local
 - WhatsApp: GET → texto formatado → clipboard → abre wa.me/?text=...
 - Fallback clipboard: modal com textarea para cópia manual
 - Interfaces TypeScript (ChecklistItem, Checklist com itens)
 - Todos os endpoints

 Endpoints consolidados

 ┌────────┬────────────────────────────────────────────────┬─────────────────────────────────────────────────┐
 │ Método │                    Endpoint                    │                    Descrição                    │
 ├────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
 │ POST   │ /admin/submissoes/{id}/converter-checklist     │ Converter submissão → checklist (já em seção 3) │
 ├────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
 │ POST   │ /admin/listas-rapidas/{id}/converter-checklist │ Converter lista rápida → checklist              │
 ├────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
 │ GET    │ /admin/checklists                              │ Listar checklists (query: status)               │
 ├────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
 │ GET    │ /admin/checklists/{id}                         │ Obter checklist com itens                       │
 ├────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
 │ PUT    │ /admin/checklists/{id}/itens/{item_id}/marcar  │ Marcar/desmarcar item                           │
 ├────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
 │ POST   │ /admin/checklists/{id}/finalizar               │ Finalizar checklist                             │
 ├────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
 │ POST   │ /admin/checklists/{id}/reabrir                 │ Reabrir checklist                               │
 ├────────┼────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
 │ GET    │ /admin/checklists/{id}/whatsapp                │ Gerar texto para WhatsApp                       │
 └────────┴────────────────────────────────────────────────┴─────────────────────────────────────────────────┘

 Formato do texto WhatsApp (gerado pelo backend)

 *CHECKLIST DE COMPRAS*
 *{nome}*
 Data: {criado_em formatada}

 *📋 ITENS PENDENTES*
 [ ] {item_nome} - {quantidade}{unidade} ({fornecedor_nome})

 *✅ ITENS CONCLUÍDOS*
 [x] ~{item_nome} - {quantidade}{unidade}~

 *Progresso: {marcados}/{total} itens ({percentual}%)*

 Fluxo de Conversão (dois caminhos)

 1. Submissão aprovada → modal "Converter para Checklist" (flags: incluir_fornecedor, incluir_observacoes) → POST → redirect
  para /admin/checklists/{id}
 2. Lista rápida aprovada → modal com nome editável + tabela de quantidades + flags → POST → redirect

 Lógica de negócio (services.py)

 - converter_submissao_para_checklist(submissao_id, data) — valida status APROVADO, busca pedidos APROVADOS, cria Checklist
 + ChecklistItems desnormalizados
 - marcar_item_checklist(item_id, marcado) — atualiza marcado_em = brasilia_now() se marcado=True, else None
 - finalizar_checklist(checklist_id) — ATIVO → FINALIZADO + seta finalizado_em
 - reabrir_checklist(checklist_id) — FINALIZADO → ATIVO + limpa finalizado_em
 - compartilhar_checklist_whatsapp(checklist_id) — separa pendentes/concluídos, risca concluídos com ~texto~

 Resumo de Arquivos (atualizar)

 Adicionar GerenciarChecklists.tsx e DetalhesChecklist.tsx na seção de resumo.

 Arquivos críticos

 - frontend/src/features/admin/GerenciarChecklists.tsx
 - frontend/src/features/admin/DetalhesChecklist.tsx
 - backend/kaizen_app/models.py (Checklist, ChecklistItem, ChecklistStatus)
 - backend/kaizen_app/services.py (funções converter_*, marcar_item_checklist, etc.)
 - backend/kaizen_app/controllers.py (rotas /checklists e /converter-checklist)
 - manuais/replicando-app/24_TELAS_ADMIN.md (inserir antes da seção 4)

 Verificação

 - Confirmar que seções 3.1 e 3.2 estão inseridas entre seção 3 e seção 4 (sem renumerar 4+)
 - Confirmar que seção 3 já menciona o modal de conversão (não duplicar)
 - Confirmar que Resumo de Arquivos inclui os 2 novos componentes