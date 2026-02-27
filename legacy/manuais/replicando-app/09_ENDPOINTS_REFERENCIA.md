# 09 — Referência Completa de Endpoints

> Todos os endpoints da API organizados por blueprint. Base URL: `http://localhost:5000/api`

**Legenda de Auth:**
- `PUBLIC` — Sem autenticação
- `JWT` — Qualquer usuário autenticado
- `ADMIN` — Role ADMIN ou SUPER_ADMIN
- `COLLAB` — Role COLLABORATOR
- `SUPPLIER` — Role SUPPLIER

---

## `/api/auth` — Autenticação

| Método | Endpoint | Auth | Payload / Params | Resposta |
|--------|----------|------|------------------|----------|
| POST | `/auth/register` | PUBLIC | `{nome, email, senha}` | `{message, user}` |
| POST | `/auth/login` | PUBLIC | `{email, senha}` | `{access_token, user}` |
| GET | `/auth/profile` | JWT | — | `{user}` |
| PUT | `/auth/profile` | JWT | `{nome}` | `{user}` |
| POST | `/auth/change-password` | JWT | `{senha_atual, nova_senha, confirmar_senha}` | `{message}` |
| GET | `/auth/session` | JWT | — | `{valid, user}` |
| PATCH | `/auth/profile/wizard` | JWT | `{wizard_status}` | `{wizard_status}` |
| GET | `/auth/notificacoes` | JWT | `?lidas=false&limit=20` | `[notificacao]` |
| POST | `/auth/notificacoes/:id/lida` | JWT | — | `{message}` |
| POST | `/auth/notificacoes/todas-lidas` | JWT | — | `{message}` |
| GET | `/auth/navbar-preferences` | JWT | — | `{categorias_estado}` |
| POST | `/auth/navbar-preferences` | JWT | `{categorias_estado}` | `{message}` |
| GET | `/auth/navbar-layout` | JWT | `?role=ADMIN` | `{layout}` |
| POST | `/auth/navbar-layout` | SUPER_ADMIN | `{layout, role?}` | `{layout}` |
| GET | `/auth/navbar-activity` | JWT | — | `[atividade]` |
| POST | `/auth/logout` | JWT | — | `{message}` |

---

## `/api/admin` — Administração

### Usuários

| Método | Endpoint | Auth | Payload | Resposta |
|--------|----------|------|---------|----------|
| GET | `/admin/users` | ADMIN | `?restaurante_id=N&aprovado=false` | `[usuario]` |
| POST | `/admin/users` | ADMIN | `{nome, email, senha, role, restaurante_id?}` | `{user}` |
| GET | `/admin/users/:id` | ADMIN | — | `{user}` |
| PUT | `/admin/users/:id` | ADMIN | `{nome, email, role, aprovado}` | `{user}` |
| DELETE | `/admin/users/:id` | ADMIN | — | `{message}` |
| POST | `/admin/users/:id/approve` | ADMIN | — | `{message}` |
| POST | `/admin/users/:id/deactivate` | ADMIN | — | `{message}` |
| POST | `/admin/users/:id/reset-password` | ADMIN | `{nova_senha}` | `{message}` |

### Restaurantes (SUPER_ADMIN)

| Método | Endpoint | Auth | Payload | Resposta |
|--------|----------|------|---------|----------|
| GET | `/admin/restaurantes` | ADMIN | — | `[restaurante]` |
| POST | `/admin/restaurantes` | ADMIN | `{nome, slug}` | `{restaurante}` |
| GET | `/admin/restaurantes/:id` | ADMIN | — | `{restaurante}` |
| PUT | `/admin/restaurantes/:id` | ADMIN | `{nome, ativo}` | `{restaurante}` |
| DELETE | `/admin/restaurantes/:id` | ADMIN | — | `{message}` |

### Listas ⭐

| Método | Endpoint | Auth | Payload | Resposta |
|--------|----------|------|---------|----------|
| GET | `/admin/listas` | ADMIN | `?restaurante_id=N&deletado=false` | `[lista]` |
| POST | `/admin/listas` | ADMIN | `{nome, descricao}` | `{lista}` |
| GET | `/admin/listas/:id` | ADMIN | — | `{lista}` |
| PUT | `/admin/listas/:id` | ADMIN | `{nome, descricao}` | `{lista}` |
| DELETE | `/admin/listas/:id` | ADMIN | — | `{message}` (soft delete) |
| GET | `/admin/listas/deletadas` | ADMIN | — | `[lista]` |
| POST | `/admin/listas/:id/restaurar` | ADMIN | — | `{lista}` |
| DELETE | `/admin/listas/:id/permanente` | ADMIN | — | `{message}` |
| POST | `/admin/listas/deletar-lote` | ADMIN | `{lista_ids: [...]}` | `{message}` |
| POST | `/admin/listas/:id/colaboradores` | ADMIN | `{usuario_ids: [...]}` | `{message}` |
| DELETE | `/admin/listas/:id/colaboradores/:uid` | ADMIN | — | `{message}` |
| GET | `/admin/listas/:id/colaboradores` | ADMIN | — | `[usuario]` |

### Itens da Lista (ListaItemRef) ⭐

| Método | Endpoint | Auth | Payload | Resposta |
|--------|----------|------|---------|----------|
| GET | `/admin/listas/:id/itens` | ADMIN | — | `[lista_item_ref]` |
| POST | `/admin/listas/:id/itens` | ADMIN | `{item_id, quantidade_minima, usa_threshold?, quantidade_por_fardo?}` | `{item_ref}` |
| PUT | `/admin/listas/:id/itens/:item_id` | ADMIN | `{quantidade_minima, usa_threshold, quantidade_por_fardo}` | `{item_ref}` |
| DELETE | `/admin/listas/:id/itens/:item_id` | ADMIN | — | `{message}` |

### Catálogo Global (ListaMaeItem) ⭐

| Método | Endpoint | Auth | Payload | Resposta |
|--------|----------|------|---------|----------|
| GET | `/admin/lista-mae-itens` | ADMIN | `?q=texto&restaurante_id=N` | `[item]` |
| POST | `/admin/lista-mae-itens` | ADMIN | `{nome, unidade}` | `{item}` |
| GET | `/admin/lista-mae-itens/:id` | ADMIN | — | `{item}` |
| PUT | `/admin/lista-mae-itens/:id` | ADMIN | `{nome, unidade}` | `{item}` |
| DELETE | `/admin/lista-mae-itens/:id` | ADMIN | — | `{message}` |
| POST | `/admin/lista-mae-itens/importar` | ADMIN | `{itens: [{nome, unidade}]}` | `{criados, ignorados}` |

### Submissões ⭐

| Método | Endpoint | Auth | Payload | Resposta |
|--------|----------|------|---------|----------|
| GET | `/admin/submissoes` | ADMIN | `?status=PENDENTE&arquivadas=false&lista_id=N` | `[submissao]` |
| GET | `/admin/submissoes/:id` | ADMIN | — | `{submissao + pedidos}` |
| POST | `/admin/submissoes/:id/aprovar` | ADMIN | — | `{status, pedidos_aprovados}` |
| POST | `/admin/submissoes/:id/rejeitar` | ADMIN | — | `{status, pedidos_rejeitados}` |
| POST | `/admin/submissoes/:id/reverter` | ADMIN | — | `{status}` |
| POST | `/admin/submissoes/:id/arquivar` | ADMIN | — | `{message}` |
| POST | `/admin/submissoes/:id/desarquivar` | ADMIN | — | `{message}` |
| PUT | `/admin/submissoes/:id/editar` | ADMIN | `{items: [{pedido_id, quantidade_solicitada}]}` | `{submissao}` |
| POST | `/admin/submissoes/merge-preview` | ADMIN | `{submissao_ids: [...]}` | `{listas, itens, total_itens}` |
| POST | `/admin/submissoes/merge-whatsapp` | ADMIN | `{submissao_ids: [...]}` | `{texto}` |

### Pedidos ⭐

| Método | Endpoint | Auth | Payload | Resposta |
|--------|----------|------|---------|----------|
| GET | `/admin/pedidos` | ADMIN | `?status=PENDENTE&lista_id=N` | `[pedido]` |
| GET | `/admin/pedidos/:id` | ADMIN | — | `{pedido}` |
| POST | `/admin/pedidos/:id/aprovar` | ADMIN | — | `{pedido, submissao_status}` |
| POST | `/admin/pedidos/:id/rejeitar` | ADMIN | `{motivo?}` | `{pedido, submissao_status}` |
| POST | `/admin/pedidos/:id/reverter` | ADMIN | — | `{pedido}` |
| PUT | `/admin/pedidos/:id/editar` | ADMIN | `{quantidade_solicitada}` | `{pedido}` |
| POST | `/admin/pedidos/aprovar-lote` | ADMIN | `{pedido_ids: [...]}` | `{aprovados, erros}` |
| POST | `/admin/pedidos/rejeitar-lote` | ADMIN | `{pedido_ids: [...]}` | `{rejeitados, erros}` |

### Fornecedores

| Método | Endpoint | Auth | Payload | Resposta |
|--------|----------|------|---------|----------|
| GET | `/admin/fornecedores` | ADMIN | `?aprovado=true` | `[fornecedor]` |
| POST | `/admin/fornecedores` | ADMIN | `{nome, cnpj?, telefone?, ...}` | `{fornecedor}` |
| GET | `/admin/fornecedores/:id` | ADMIN | — | `{fornecedor}` |
| PUT | `/admin/fornecedores/:id` | ADMIN | `{nome, telefone, ...}` | `{fornecedor}` |
| DELETE | `/admin/fornecedores/:id` | ADMIN | — | `{message}` |
| POST | `/admin/fornecedores/:id/approve` | ADMIN | — | `{message}` |
| GET | `/admin/fornecedores/:id/pedidos-por-lista` | ADMIN | — | `{por_lista}` |
| GET | `/admin/fornecedores/:id/pedidos-consolidados` | ADMIN | — | `{consolidado}` |

### Cotações

| Método | Endpoint | Auth | Payload | Resposta |
|--------|----------|------|---------|----------|
| GET | `/admin/cotacoes` | ADMIN | `?status=PENDENTE` | `[cotacao]` |
| POST | `/admin/cotacoes` | ADMIN | `{fornecedor_id, itens: [{item_id, quantidade, preco_unitario}]}` | `{cotacao}` |
| GET | `/admin/cotacoes/:id` | ADMIN | — | `{cotacao + itens}` |
| PUT | `/admin/cotacoes/:id` | ADMIN | `{status, itens?}` | `{cotacao}` |
| DELETE | `/admin/cotacoes/:id` | ADMIN | — | `{message}` |
| POST | `/admin/gerar-cotacao` | ADMIN | `{fornecedor_id}` | `{cotacao}` (auto-gera itens) |

### Convites

| Método | Endpoint | Auth | Payload | Resposta |
|--------|----------|------|---------|----------|
| GET | `/admin/convites` | ADMIN | — | `[convite]` |
| POST | `/admin/convites` | ADMIN | `{email?, restaurante_id?}` | `{token, link}` |
| DELETE | `/admin/convites/:token` | ADMIN | — | `{message}` |
| GET | `/admin/convites-fornecedor` | ADMIN | — | `[convite]` |
| POST | `/admin/convites-fornecedor` | ADMIN | `{fornecedor_id}` | `{token, link}` |

### Dashboard Global

| Método | Endpoint | Auth | Params | Resposta |
|--------|----------|------|--------|----------|
| GET | `/admin/super-dashboard` | ADMIN | `?restaurante_id=N&period=30` | `{summary, temporal, lists, users, suppliers, ...}` |
| GET | `/admin/super-dashboard/export/pdf` | ADMIN | `?restaurante_id=N` | PDF binary |
| GET | `/admin/super-dashboard/export/excel` | ADMIN | `?restaurante_id=N` | Excel binary |

### Sugestões de Itens

| Método | Endpoint | Auth | Payload | Resposta |
|--------|----------|------|---------|----------|
| GET | `/admin/sugestoes` | ADMIN | `?status=PENDENTE` | `[sugestao]` |
| POST | `/admin/sugestoes/:id/aprovar` | ADMIN | `{item_id?}` | `{message}` |
| POST | `/admin/sugestoes/:id/rejeitar` | ADMIN | `{motivo?}` | `{message}` |
| GET | `/admin/sugestoes/pendentes/count` | ADMIN | — | `{count}` |

### Outros Admin

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/admin/areas` | ADMIN | Lista áreas |
| POST | `/admin/areas` | ADMIN | Cria área |
| GET | `/admin/itens` | ADMIN | Catálogo legado |
| POST | `/admin/itens` | ADMIN | Cria item legado |
| GET | `/admin/checklists` | ADMIN | Lista checklists |
| POST | `/admin/checklists` | ADMIN | Cria checklist |
| GET | `/admin/listas-rapidas` | ADMIN | Lista listas rápidas |
| GET | `/admin/listas-rapidas/pendentes/count` | ADMIN | Contagem pendentes |

---

## `/api/collaborator` — Colaborador

| Método | Endpoint | Auth | Payload | Resposta |
|--------|----------|------|---------|----------|
| GET | `/collaborator/minhas-listas` | COLLAB | — | `[lista]` |
| GET | `/collaborator/listas/:id` | COLLAB | — | `{lista}` |
| GET | `/collaborator/listas/:id/estoque` | COLLAB | — | `[lista_item_ref]` |
| PUT | `/collaborator/listas/:id/itens/:item_id` | COLLAB | `{quantidade_atual}` | `{item_ref}` |
| POST | `/collaborator/listas/:id/submeter` | COLLAB | `{items: [{item_id, quantidade_atual}]}` | `{submissao}` |
| GET | `/collaborator/submissoes` | COLLAB | `?lista_id=N&arquivadas=false` | `[submissao]` |
| GET | `/collaborator/submissoes/:id` | COLLAB | — | `{submissao + pedidos}` |
| GET | `/collaborator/minhas-listas-status` | COLLAB | — | Status resumido |
| POST | `/collaborator/sugestoes` | COLLAB | `{nome_item, descricao?, lista_id?}` | `{sugestao}` |
| GET | `/collaborator/sugestoes` | COLLAB | — | `[sugestao]` |
| GET | `/collaborator/minhas-areas` | COLLAB | — | Áreas legado |
| GET | `/collaborator/areas/:id/estoque` | COLLAB | — | Estoque legado |
| POST | `/collaborator/areas/:id/estoque/submit` | COLLAB | `{items: [...]}` | `{submissao}` legado |
| GET | `/collaborator/pop-listas` | COLLAB | — | POPs atribuídos |
| POST | `/collaborator/pop-listas/:id/iniciar` | COLLAB | — | `{execucao}` |
| PUT | `/collaborator/pop-execucoes/:id/item/:item_id` | COLLAB | `{concluido}` | `{item}` |
| POST | `/collaborator/pop-execucoes/:id/finalizar` | COLLAB | — | `{execucao}` |

---

## `/api/v1` — API Geral

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/v1/health` | PUBLIC | Health check: `{status: "ok", database: "connected"}` |
| GET | `/v1/pedidos` | JWT | Lista pedidos (legado) |
| POST | `/v1/pedidos/submit` | JWT | Submete pedidos (legado) |
| GET | `/v1/listas` | JWT | Listas com acesso (legado) |

---

## Códigos de Status HTTP

| Código | Significado | Quando ocorre |
|--------|-------------|---------------|
| 200 | OK | Sucesso |
| 201 | Created | Recurso criado |
| 400 | Bad Request | Dados inválidos ou faltando |
| 401 | Unauthorized | Token ausente |
| 403 | Forbidden | Role insuficiente ou acesso negado |
| 404 | Not Found | Recurso não encontrado |
| 422 | Unprocessable | Erro JWT (token inválido/expirado) — retorna `{msg: "..."}` |
| 500 | Server Error | Erro interno — retorna `{error: "Erro interno", message: "..."}` |

---

## Padrão de Resposta de Erro

```json
// Erro de negócio (400, 403, 404)
{
  "error": "Mensagem legível do erro"
}

// Erro JWT (422)
{
  "msg": "Signature verification failed"
}

// Erro interno (500)
{
  "error": "Erro interno do servidor",
  "message": "detalhes do erro Python",
  "type": "ExceptionType"
}
```

---

## Padrão de Paginação (onde aplicável)

```
GET /api/admin/submissoes?page=1&per_page=20

Resposta:
{
  "items": [...],
  "total": 150,
  "page": 1,
  "per_page": 20,
  "pages": 8
}
```
