# Inventario do Projeto Atual (Referencia)

## Resumo

Este documento serve como referencia completa do estado atual do projeto Flask + React para guiar a migracao.

---

## Backend - Estatisticas

| Metrica | Quantidade |
|---------|-----------|
| Modelos (classes) | 43 |
| Enums | 13 |
| Tabelas junction | 3 |
| Endpoints API | 265 |
| Service functions | 200+ |
| Decorators customizados | 4 |
| Middleware functions | 7 |
| Migrations | 61 |
| Linhas em services.py | 11.403 |
| Linhas em controllers.py | 3.314 |

## Frontend - Estatisticas

| Metrica | Quantidade |
|---------|-----------|
| Rotas | 70+ |
| Componentes de features | 84 |
| Componentes compartilhados | 19 |
| Context providers | 4 |
| Custom hooks | 4 |
| Services | 4 |
| Utils | 2 |

---

## Modelos do Backend (43 total)

### Core
- `Restaurante` - Entidade multi-tenant
- `Usuario` - Usuarios com roles (SUPER_ADMIN, ADMIN, COLLABORATOR, SUPPLIER)

### Enums (13)
- `UserRoles` (SUPER_ADMIN, ADMIN, COLLABORATOR, SUPPLIER)
- `StatusSolicitacaoRestaurante` (PENDENTE, APROVADO, REJEITADO)
- `SubmissaoStatus` (PENDENTE, PARCIALMENTE_APROVADO, APROVADO, REJEITADO)
- `PedidoStatus` (PENDENTE, APROVADO, REJEITADO)
- `CotacaoStatus` (PENDENTE, CONCLUIDA)
- `SugestaoStatus` (PENDENTE, APROVADA, REJEITADA)
- `StatusListaRapida` (RASCUNHO, PENDENTE, APROVADA, REJEITADA)
- `ChecklistStatus` (ATIVO, FINALIZADO)
- `TipoVerificacao` (CHECKBOX, MEDICAO, TEMPERATURA, FOTO, TEXTO)
- `CriticidadeTarefa` (BAIXA, NORMAL, ALTA, CRITICA)
- `RecorrenciaLista` (DIARIA, SEMANAL, MENSAL, SOB_DEMANDA)
- `StatusExecucao` (EM_ANDAMENTO, CONCLUIDO, PARCIAL)
- `TipoNotificacao` (SUBMISSAO_LISTA, SUBMISSAO_LISTA_RAPIDA, SUGESTAO_ITEM, etc.)
- `PrioridadeItem` (PREVENCAO, PRECISA_COMPRAR, URGENTE)

### Inventario
- `Item` - Itens do catalogo
- `Area` - Areas de trabalho
- `Estoque` - Niveis de estoque (item + area + lista)
- `ListaMaeItem` - Catalogo global de itens
- `ListaItemRef` - Juncao Lista-Item com quantidades

### Fornecedores
- `Fornecedor` - Fornecedores
- `FornecedorItemCodigo` - Codigos de itens por fornecedor
- `ConviteFornecedor` - Tokens de convite (multi-uso)
- `ItemPrecoHistorico` - Historico de precos

### Listas de Compras
- `Lista` - Listas de compras (com soft delete)
- `Submissao` - Batches de submissao
- `Pedido` - Pedidos individuais (linkados a submissoes)

### Cotacoes
- `Cotacao` - Cotacoes de fornecedores
- `CotacaoItem` - Itens das cotacoes

### POP
- `POPConfiguracao` - Config global POP por restaurante
- `POPCategoria` - Categorias POP
- `POPTemplate` - Templates de tarefas
- `POPLista` - Listas POP (atribuidas a colaboradores)
- `POPListaTarefa` - Juncao: Lista-Template
- `POPExecucao` - Instancia de execucao
- `POPExecucaoItem` - Itens individuais de execucao

### Checklists
- `Checklist` - Checklists de compras
- `ChecklistItem` - Itens do checklist (dados denormalizados)

### Listas Rapidas
- `ListaRapida` - Listas de emergencia
- `ListaRapidaItem` - Itens com prioridade
- `SugestaoItem` - Sugestoes de novos itens

### Preferencias e Navegacao
- `NavbarPreference` - Preferencias de menu por usuario
- `NavbarLayout` - Configuracao global da navbar
- `NavbarActivity` - Historico de itens acessados

### Autenticacao
- `ConviteToken` - Tokens de convite de usuario
- `ConviteRestaurante` - Tokens de registro de restaurante
- `SolicitacaoRestaurante` - Solicitacoes publicas de restaurante

### Auditoria
- `Notificacao` - Notificacoes do sistema
- `AppLog` - Logs de auditoria

### Tabelas Junction
- `fornecedor_lista` - Fornecedor-Lista (many-to-many)
- `lista_colaborador` - Lista-Usuario (many-to-many)
- `pop_lista_colaboradores` - POP Lista-Usuario (many-to-many)

---

## Endpoints por Blueprint

### auth_bp (/api/auth) - 34 endpoints

Registro, login, perfil, troca de senha, validacao de sessao, auth de fornecedor.

### admin_bp (/api/admin) - 153 endpoints

- Gestao de usuarios (10)
- Gestao de restaurantes (6)
- POP management (33)
- Submissoes e pedidos (20+)
- Listas e itens (15+)
- Fornecedores (15+)
- Cotacoes (5)
- Dashboard e relatorios (6)
- Checklists (5+)
- Listas rapidas (5+)
- Sugestoes (5+)
- Impersonacao (3)
- Logs de auditoria (1)
- Convites (5+)

### api_bp (/api/v1) - 49 endpoints

Items CRUD, Areas CRUD, Fornecedores CRUD, Estoque, Submissoes do colaborador, Notificacoes.

### collaborator_bp (/api/collaborator) - 18 endpoints

POP execucao, estoque por area/lista, minhas listas, dashboard colaborador.

### public_bp (/api/public) - 3 endpoints

Rotas publicas (validacao de convite, etc.)

### supplier_bp (/api/supplier) - 8 endpoints

Portal do fornecedor: perfil, itens, precos.

---

## Frontend - Componentes por Feature

### admin/ (40 componentes)
AdminDashboard, AreaManagement, CatalogoGlobal, Configuracoes, CotacaoDetail, CotacaoList, CriarUsuario, DetalhesChecklist, DetalhesFornecedorCadastrado, DetalhesListaRapida, DetalhesSubmissao, EditarPerfil, FornecedorDetalhes, FornecedorItens, FornecedorManagement, GerarConvite, GerarCotacao, GerenciarChecklists, GerenciarConvitesFornecedor, GerenciarFornecedoresCadastrados, GerenciarItensLista, GerenciarListasRapidas, GerenciarPedidos, GerenciarRestaurantes, GerenciarSubmissoes, GerenciarSugestoes, GerenciarUsuarios, ItemManagement, ItensRegionais, ListaMaeConsolidada, ListasCompras, MudarSenha, POPAuditoria, POPListaDetalhes, POPListas, POPTemplates, SeletorItensUnificado, SolicitacoesRestaurante, UserManagement

### auth/ (4 componentes)
Login, Register, RegisterConvite, RegisterRestaurant

### dashboard/ (9 base + 8 nested)
Dashboard, GlobalDashboard, RecentSubmissions, RecentUserSubmissions, StatsCard, UserDashboard, UserStats, WorkAreasList. Nested: ActivityTimeline, ChecklistsSection, DashboardHeader, ListsSection, SuggestionsSection, SummaryCards, SuppliersSection, TemporalCharts, UsersSection

### collaborator/ (9 componentes)
CollaboratorDashboard, Configuracoes, EstoqueListaCompras, ExecutarPOPChecklist, HistoricoPOPExecucoes, ListaEstoque, MinhasListas, MinhasListasCompras, MinhasPOPListas

### colaborador/ (6 componentes - portugues)
CriarListaRapida, DetalhesListaRapida, EditarListaRapida, MinhasListasRapidas, MinhasSugestoes, VisualizarCatalogo

### inventory/ (4 componentes)
DetalhesSubmissaoColaborador, EstoqueLista, ImportacaoEstoque, MinhasSubmissoes

### supplier/ (9 componentes)
SupplierDashboard, SupplierItemForm, SupplierItemPriceHistory, SupplierItems, SupplierLogin, SupplierProfile, SupplierRegister, SupplierRegisterConvite, SupplierRoute

---

## Padroes Arquiteturais Atuais

### Multi-Tenancy
- Campo `restaurante_id` em todos os modelos
- Filtro no service layer via parametro
- SUPER_ADMIN pode acessar todos os tenants

### Autenticacao
- JWT com `session_token` (single-session enforcement)
- 4 roles: SUPER_ADMIN, ADMIN, COLLABORATOR, SUPPLIER
- 4 decorators de autorizacao

### Soft Delete
- Campos `deletado` + `data_delecao` em listas e restaurantes
- Campos `arquivada` + `arquivada_em` em submissoes e checklists

### Audit Trail
- `AppLog` com acao, entidade, entidade_id, metadata
- `log_event()` chamado em todas as operacoes importantes

### Datetime
- `brasilia_now()` helper para timezone BRT
- ZoneInfo('America/Sao_Paulo')

### Denormalizacao
- ChecklistItem armazena snapshot dos dados do pedido
- POPExecucaoItem armazena snapshot do template
- Permite deletar originais sem quebrar historico
