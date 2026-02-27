❯ leia esses documentos e tentenda mais oque precisamos trazer do projeto legado adaptado para esta tecnologia principal daqui manuais/replicando-app             
  compare oque foi e oque nao foi implementado e apresente um relatorio claro para trabalharmos em sima dele como um norte                                       
                                                                                                                                                                  
● 2 Explore agents finished (ctrl+o to expand)                                                                                                                    
   ├─ Explore manuais/replicando-app docs · 28 tool uses · 115.0k tokens                                                                                          
   │  ⎿  Done                                                                                                                                                     
   └─ Explore current app implementation · 49 tool uses · 62.8k tokens
      ⎿  Done                                                                                                                                                     
                                                        
● Agora vou compilar o relatório completo comparando os documentos com a implementação atual.                                                                     
                                                                                                                                                                  
● Recalled 1 memory (ctrl+o to expand)                                                                                                                            
                                                                                                                                                                  
● Updated plan                                                                                                                                                    
  ⎿  /plan to preview                                                                                                                                             
                                                                                                                                                                  
● Aqui está o relatório completo que compilei comparando os 26 documentos de replicação com o que está implementado:
                                                                                                                                                                  
  ---                                                                                                                                                             
  Relatório de Status — Replicação do Projeto Legado                                                                                                              
                                                                                                                                                                  
  ✅ O QUE JÁ ESTÁ IMPLEMENTADO                         

  ┌───────────────────────────────────────────────────────────────┬─────────────┐
  │                             Área                              │   Status    │
  ├───────────────────────────────────────────────────────────────┼─────────────┤
  │ Autenticação JWT (login, register, profile, change-password)  │ ✅ Completo │
  ├───────────────────────────────────────────────────────────────┼─────────────┤
  │ Sistema de roles (SUPER_ADMIN, ADMIN, COLLABORATOR, SUPPLIER) │ ✅ Completo │
  ├───────────────────────────────────────────────────────────────┼─────────────┤
  │ Multi-tenant por restauranteId                                │ ✅ Completo │
  ├───────────────────────────────────────────────────────────────┼─────────────┤
  │ Guards NestJS (Auth, Roles, Tenant)                           │ ✅ Completo │
  ├───────────────────────────────────────────────────────────────┼─────────────┤
  │ CRUD de Listas + colaboradores + itens (Admin)                │ ✅ Completo │
  ├───────────────────────────────────────────────────────────────┼─────────────┤
  │ CRUD de Itens (catálogo global)                               │ ✅ Completo │
  ├───────────────────────────────────────────────────────────────┼─────────────┤
  │ CRUD de Áreas                                                 │ ✅ Completo │
  ├───────────────────────────────────────────────────────────────┼─────────────┤
  │ Dashboard Admin e Colaborador (básico)                        │ ✅ Completo │
  ├───────────────────────────────────────────────────────────────┼─────────────┤
  │ Sidebar responsiva (mobile/desktop, dark/light, busca)        │ ✅ Completo │
  ├───────────────────────────────────────────────────────────────┼─────────────┤
  │ Visualização de listas pelo colaborador                       │ ✅ Completo │
  └───────────────────────────────────────────────────────────────┴─────────────┘

  ---
  ❌ O QUE FALTA — Por Prioridade

  🔴 Prioridade Alta (fluxo core de negócio)

  1. Tela de Estoque — colaborador preenche quantidadeAtual, sistema calcula o pedido, botão submeter
  2. Módulo de Submissões — schema Prisma (Submissao, Pedido), endpoints de submissão e aprovação
  3. Tela de Aprovação Admin — aprovar/rejeitar pedidos individuais ou em lote, modo edição
  4. Gerenciamento de Usuários — admin aprova cadastros, ativa/desativa usuários

  🟡 Prioridade Média

  5. Sistema de Notificações — sino com badge, toasts, polling a cada 30s
  6. Merge de Submissões — consolidar pedidos aprovados → texto WhatsApp
  7. Checklist de Compras — converter submissão aprovada em checklist marcável
  8. Listas Rápidas — ad-hoc urgentes pelo colaborador
  9. Sugestões de Itens — colaborador sugere, admin aprova criando o item
  10. Super Admin funcional — dashboard global, gestão de restaurantes, impersonação

  🟠 Prioridade Baixa

  11. Portal Fornecedor (role SUPPLIER completo)
  12. Sistema de Convites (tokens UUID)
  13. Cotações automáticas
  14. Import/Export CSV/ZIP
  15. Auditoria e Logs (AppLog imutável)
  16. Módulo POP (checklists operacionais recorrentes)
  17. Funcionalidade Offline (Service Worker + BackgroundSync)

  ---
  Gap Principal no Schema Prisma

  O schema atual só tem entidades base. Faltam 10+ tabelas: Submissao, Pedido, Notificacao, ListaRapida, SugestaoItem, Checklist, Fornecedor, Cotacao,
  POPTemplate, AppLog entre outras.

  ---
  O plano detalhado com todos os arquivos críticos, endpoints faltantes e roadmap de sprints foi salvo. Podemos agora priorizar por onde começar.

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 Ready to code?
                                                                                                                                                                  
 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Relatório de Status: Replicação do Projeto Legado      

 Objetivo: Comparar o que foi documentado nos manuais (manuais/replicando-app/) com o que está efetivamente implementado no projeto atual (Next.js + NestJS +
 Prisma), para servir como norte de desenvolvimento.

 ---
 STACK

 ┌────────────────────────────────┬──────────────────────────────┐
 │   Legado (Flask + React SPA)   │   Atual (Next.js + NestJS)   │
 ├────────────────────────────────┼──────────────────────────────┤
 │ Python Flask + SQLAlchemy      │ NestJS + Prisma + PostgreSQL │
 ├────────────────────────────────┼──────────────────────────────┤
 │ React 19 SPA (React Router v7) │ Next.js 15.2 (App Router)    │
 ├────────────────────────────────┼──────────────────────────────┤
 │ React Bootstrap 2.x            │ Bootstrap 5.3 + React Icons  │
 ├────────────────────────────────┼──────────────────────────────┤
 │ Chart.js                       │ A definir                    │
 ├────────────────────────────────┼──────────────────────────────┤
 │ Axios                          │ Axios                        │
 └────────────────────────────────┴──────────────────────────────┘

 ---
 ✅ IMPLEMENTADO

 Infraestrutura Base

 - Autenticação JWT (login, register, perfil, change-password)
 - 4 roles: SUPER_ADMIN, ADMIN, COLLABORATOR, SUPPLIER
 - Multi-tenant por restauranteId
 - Guards: RolesGuard, TenantGuard, AuthGuard
 - Decorators: @CurrentUser, @Roles, @TenantId
 - Interceptor Axios (Bearer token, logout em 401)
 - Proteção de rotas frontend (ProtectedRoute por role)

 UI/UX

 - Sidebar responsiva (mobile overlay, desktop recolhível)
 - Dark/light mode com persistência em localStorage
 - Busca na sidebar (atalho "/")
 - Breadcrumbs
 - UserAvatar
 - Swipe gesture para abrir/fechar sidebar no mobile
 - Layout diferenciado por role (Admin vs Colaborador)

 Módulo de Listas (CRUD Básico)

 - Criar/editar/deletar lista (soft delete) — Admin
 - Listar listas do restaurante — Admin
 - Adicionar/remover colaboradores em lista — Admin
 - Adicionar/remover itens em lista com quantidadeMinima — Admin
 - Visualizar listas atribuídas — Colaborador
 - Detalhe de lista — Colaborador (parcial)

 Módulo de Itens (Catálogo Global)

 - CRUD de itens (nome, unidadeMedida, soft delete)
 - Busca/filtro por nome

 Módulo de Áreas

 - CRUD de áreas

 Dashboards

 - Dashboard Admin (widgets: Itens, Áreas, Listas, Usuários, listas recentes)
 - Dashboard Colaborador (widgets: Listas Disponíveis, Concluídas, Em Progresso, Atenção)

 Restaurantes

 - Criar/editar restaurante (básico)

 ---
 ❌ NÃO IMPLEMENTADO (por módulo, ordem de prioridade)

 🔴 PRIORIDADE ALTA — Fluxo Core de Negócio

 1. Tela de Estoque do Colaborador (/collaborator/listas/[id]/estoque)

 - Tabela: Item | Unidade | Qtd.Mín | Qtd.Atual (input editável) | Pedido (calculado)
 - Inputs aceitam expressões aritméticas (10+5)
 - Feedback visual: amarelo (alterado), vermelho (inválido)
 - Rascunho salvo offline com debounce de 400ms
 - Botão "Salvar Rascunho" e "Submeter Lista"
 - Endpoint necessário: PUT /collaborator/listas/:id/itens/:itemId (atualizar quantidadeAtual)

 2. Módulo de Submissões — Banco de dados

 - Schema Prisma faltando: Submissao, Pedido
 - Enums: SubmissaoStatus (PENDENTE, PARCIALMENTE_APROVADO, APROVADO, REJEITADO), PedidoStatus
 - Lógica de cálculo: pedido = qtdMin - qtdAtual (ou qtdFardo se threshold)
 - Endpoint colaborador: POST /collaborator/listas/:id/submeter

 3. Tela de Aprovação Admin (/admin/submissoes/:id)

 - Badge de status da submissão
 - Tabela de pedidos com ações individuais (Aprovar/Rejeitar por linha)
 - Aprovação em lote
 - Modo Edição (alterar quantidades antes de aprovar)
 - Status recalcula automaticamente
 - Endpoints: POST /admin/submissoes/:id/aprovar, POST /admin/pedidos/:id/rejeitar

 4. Gerenciamento de Submissões Admin (/admin/submissoes)

 - Tabs: TODOS | PENDENTE | APROVADO | REJEITADO | PARCIALMENTE_APROVADO
 - Tabela com filtros
 - Seleção em lote para arquivamento

 🔴 PRIORIDADE ALTA — Gestão de Usuários

 5. Gerenciamento de Usuários pelo Admin (/admin/gerenciar-usuarios)

 - CRUD de usuários
 - Aprovação de novos registros (aprovado: false → true)
 - Ativar/desativar usuário
 - Filtro por role
 - Vinculação de usuário a restaurante

 🟡 PRIORIDADE MÉDIA — Módulos de Produtividade

 6. Módulo de Merge (/admin/submissoes/merge)

 - Modal 3 etapas:
   a. Selecionar 2+ submissões APROVADAS
   b. Preview consolidado (agrupa por item, soma quantidades)
   c. Copiar texto formatado / enviar WhatsApp
 - Endpoints: POST /admin/submissoes/merge-preview, POST /admin/submissoes/merge-whatsapp

 7. Checklist de Compras (/admin/checklists/:id)

 - Converter submissão APROVADA em checklist marcável
 - Barra de progresso
 - Checkbox por item (strikethrough ao marcar)
 - Botão compartilhar WhatsApp com itens pendentes/concluídos
 - Endpoints: POST /admin/submissoes/:id/converter-checklist, PUT /admin/checklists/:id/itens/:itemId/marcar
 - Schema Prisma faltando: Checklist, ChecklistItem, enum ChecklistStatus

 8. Sistema de Notificações

 - Modelo Notificacao no Prisma (usuario_id, titulo, mensagem, tipo, lida)
 - NotificationContext no frontend (persistentes + toasts 5s)
 - Sino com badge de não-lidas no layout
 - Polling a cada 30s para submissões e listas rápidas
 - Tipos: SUBMISSAO_LISTA, LISTA_APROVADA, ITEM_SUGERIDO_APROVADO, etc.

 9. Listas Rápidas (/collaborator/lista-rapida/criar)

 - Lista ad-hoc criada por colaborador para itens urgentes
 - Status: RASCUNHO → PENDENTE → APROVADA/REJEITADA
 - Prioridades: PREVENCAO, PRECISA_COMPRAR, URGENTE
 - Admin aprova em /admin/listas-rapidas
 - Schema Prisma faltando: ListaRapida, ListaRapidaItem

 10. Sugestões de Itens (/collaborator/sugestoes)

 - Colaborador sugere novo item → Admin aprova (cria Item) ou rejeita
 - Status: PENDENTE → APROVADA/REJEITADA
 - Notificação ao sugestor
 - Schema Prisma faltando: SugestaoItem

 🟡 PRIORIDADE MÉDIA — Super Admin

 11. Super Admin Funcional (/admin/global)

 - Dashboard global: KPIs de todos os restaurantes
 - Gestão de restaurantes (criar, aprovar solicitações)
 - Impersonação: SUPER_ADMIN acessa conta de outro usuário
   - Banner de impersonação no layout
   - JWT com claim impersonatedBy
 - Solicitações públicas de novo restaurante (/register-restaurante)

 🟠 PRIORIDADE BAIXA — Módulos Avançados

 12. Módulo POP (/collaborator/pop-execucoes/:id)

 - Templates de checklist operacional recorrente
 - Tipos de verificação: CHECKBOX, MEDICAO, TEMPERATURA, FOTO, TEXTO
 - Recorrência: DIARIA, SEMANAL, MENSAL, SOB_DEMANDA
 - Assinatura digital (canvas base64)
 - Auto-arquivamento de execuções antigas (> 7 dias)
 - Schema Prisma faltando: POPTemplate, POPLista, POPExecucao, POPExecucaoItem

 13. Portal Fornecedor (/supplier/*)

 - Login separado para role SUPPLIER
 - Catálogo próprio de itens com histórico de preços
 - 3 fluxos de cadastro: convite, auto-cadastro, criado pelo admin
 - Schema Prisma faltando: Fornecedor, FornecedorItem, ItemPrecoHistorico

 14. Sistema de Convites

 - 3 tipos: usuário (COLLABORATOR/ADMIN/SUPPLIER), restaurante, fornecedor
 - Tokens UUID únicos com expiração
 - Rotas públicas: /register-com-convite?token=X
 - Schema Prisma faltando: ConviteToken, ConviteRestaurante, ConviteFornecedor

 15. Cotações

 - Detecta itens com qtdAtual < qtdMinima
 - Gera cotação automática para fornecedor
 - Admin preenche preços manualmente
 - Schema Prisma faltando: Cotacao, CotacaoItem

 16. Import/Export (CSV/ZIP)

 - Export CSV: fornecedores, itens, listas
 - Import CSV: com validação, preview e transação

 17. Auditoria e Logs

 - AppLog imutável (ação, entidade, entidade_id, meta JSON, IP)
 - Acesso apenas SUPER_ADMIN
 - Rastreia impersonação com impersonatorId
 - Schema Prisma faltando: AppLog

 18. Funcionalidade Offline (Service Worker)

 - Workbox: CacheFirst + NetworkFirst + BackgroundSync
 - IndexedDB para rascunhos (draft:lista:42)
 - Banner "Você está offline"
 - Sincronização automática ao reconectar

 ---
 GAPS NO SCHEMA PRISMA ATUAL

 O schema atual tem apenas as entidades base. Precisam ser adicionadas:

 ┌───────────────────────────────────┬────────────────┬────────────┐
 │              Tabela               │     Módulo     │ Prioridade │
 ├───────────────────────────────────┼────────────────┼────────────┤
 │ Submissao + Pedido (enums status) │ Submissões     │ 🔴 Alta    │
 ├───────────────────────────────────┼────────────────┼────────────┤
 │ Notificacao                       │ Notificações   │ 🟡 Média   │
 ├───────────────────────────────────┼────────────────┼────────────┤
 │ ListaRapida + ListaRapidaItem     │ Listas Rápidas │ 🟡 Média   │
 ├───────────────────────────────────┼────────────────┼────────────┤
 │ SugestaoItem                      │ Sugestões      │ 🟡 Média   │
 ├───────────────────────────────────┼────────────────┼────────────┤
 │ Checklist + ChecklistItem         │ Checklist      │ 🟡 Média   │
 ├───────────────────────────────────┼────────────────┼────────────┤
 │ Fornecedor + itens + preços       │ Fornecedor     │ 🟠 Baixa   │
 ├───────────────────────────────────┼────────────────┼────────────┤
 │ ConviteToken (3 tipos)            │ Convites       │ 🟠 Baixa   │
 ├───────────────────────────────────┼────────────────┼────────────┤
 │ Cotacao + CotacaoItem             │ Cotações       │ 🟠 Baixa   │
 ├───────────────────────────────────┼────────────────┼────────────┤
 │ POPTemplate + 3 tabelas POP       │ POP            │ 🟠 Baixa   │
 ├───────────────────────────────────┼────────────────┼────────────┤
 │ AppLog                            │ Auditoria      │ 🟠 Baixa   │
 └───────────────────────────────────┴────────────────┴────────────┘

 ---
 GAPS DE ENDPOINTS NestJS

 ┌────────────────────────────────────────────────┬────────────────┬────────────┐
 │                    Endpoint                    │     Módulo     │ Prioridade │
 ├────────────────────────────────────────────────┼────────────────┼────────────┤
 │ GET/PUT /collaborator/listas/:id/estoque       │ Estoque        │ 🔴 Alta    │
 ├────────────────────────────────────────────────┼────────────────┼────────────┤
 │ POST /collaborator/listas/:id/submeter         │ Submissões     │ 🔴 Alta    │
 ├────────────────────────────────────────────────┼────────────────┼────────────┤
 │ GET/PUT /admin/submissoes + /submissoes/:id    │ Aprovação      │ 🔴 Alta    │
 ├────────────────────────────────────────────────┼────────────────┼────────────┤
 │ PUT /admin/usuarios/:id/aprovar                │ Usuários       │ 🔴 Alta    │
 ├────────────────────────────────────────────────┼────────────────┼────────────┤
 │ POST /admin/submissoes/merge-*                 │ Merge          │ 🟡 Média   │
 ├────────────────────────────────────────────────┼────────────────┼────────────┤
 │ POST /admin/submissoes/:id/converter-checklist │ Checklist      │ 🟡 Média   │
 ├────────────────────────────────────────────────┼────────────────┼────────────┤
 │ GET/POST /auth/notificacoes                    │ Notificações   │ 🟡 Média   │
 ├────────────────────────────────────────────────┼────────────────┼────────────┤
 │ POST/GET /auth/listas-rapidas                  │ Listas Rápidas │ 🟡 Média   │
 ├────────────────────────────────────────────────┼────────────────┼────────────┤
 │ POST/GET /auth/sugestoes                       │ Sugestões      │ 🟡 Média   │
 ├────────────────────────────────────────────────┼────────────────┼────────────┤
 │ POST /admin/impersonar                         │ Super Admin    │ 🟡 Média   │
 └────────────────────────────────────────────────┴────────────────┴────────────┘

 ---
 PRÓXIMOS PASSOS SUGERIDOS (Roadmap)

 Sprint 1 — Completar Fluxo Core

 1. Adicionar Submissao e Pedido ao schema Prisma
 2. Implementar tela de estoque do colaborador (preencher quantidades + submeter)
 3. Implementar tela de gerenciamento de submissões do admin
 4. Implementar tela de detalhes de submissão com aprovação/rejeição
 5. Implementar gerenciamento de usuários pelo admin

 Sprint 2 — Notificações + Produtividade

 6. Adicionar Notificacao ao schema + NotificationContext no frontend
 7. Implementar sino com badge e toasts
 8. Implementar Merge (modal 3 etapas) + texto WhatsApp
 9. Implementar Checklist de compras

 Sprint 3 — Super Admin + Módulos Adicionais

 10. Listas Rápidas
 11. Sugestões de Itens
 12. Super Admin dashboard global + impersonação

 Sprint 4 — Módulos Avançados

 13. Portal Fornecedor
 14. Sistema de Convites
 15. Cotações
 16. Import/Export
 17. Auditoria e Logs
 18. POP (se necessário)
 19. Funcionalidade Offline

 ---
 ARQUIVOS CRÍTICOS ATUAIS

 ┌────────────────────────────────────────────────────────┬────────────────────────────────────────────┐
 │                        Arquivo                         │                 Descrição                  │
 ├────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
 │ apps/api/prisma/schema.prisma                          │ Schema do banco — principal gap a resolver │
 ├────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
 │ apps/web/src/contexts/AuthContext.tsx                  │ Context de autenticação                    │
 ├────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
 │ apps/web/src/components/Sidebar.tsx                    │ Navegação principal com itens "em breve"   │
 ├────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
 │ apps/api/src/auth/                                     │ Módulo de autenticação NestJS              │
 ├────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
 │ apps/web/src/app/(protected)/collaborator/listas/[id]/ │ Tela de detalhe de lista (colaborador)     │
 ├────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
 │ apps/web/src/app/(protected)/admin/                    │ Telas admin                                │
 └────────────────────────────────────────────────────────┴────────────────────────────────────────────┘