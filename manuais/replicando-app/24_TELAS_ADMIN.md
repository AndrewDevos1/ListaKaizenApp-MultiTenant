# 24 — Telas do Admin (Detalhadas)

> Descrição detalhada das principais telas do admin: layout, estados, lógica de formulários, ações em lote, filtros e integração com a API.

---

## Rota Base: `/admin`

Protegida por `AdminRoute.tsx` (role ADMIN ou SUPER_ADMIN).

---

## 1. ListasCompras.tsx

**Rota:** `/admin/listas-compras`

### Layout

```
┌──────────────────────────────────────────────────────────┐
│ 🛒 Listas de Compras                   [← Voltar]        │
│ Gerenciar listas de compras                               │
├──────────────────────────────────────────────────────────┤
│ [+ Nova Lista] [📥 Importar] [🗑 Lixeira (3)]           │
├──────────────────────────────────────────────────────────┤
│ GRID DE CARDS (lg=3, md=2)                               │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │ 📋 Óleo Motor    │  │ 📋 Filtros       │             │
│  │ Lubrificantes    │  │ Ar, óleo, cabine │             │
│  │ Itens: 12        │  │ Itens: 8         │             │
│  │ Colabs: 3        │  │ Colabs: 2        │             │
│  │ Criada: 15/02    │  │ Criada: 14/02    │             │
│  │ [👁 Visualizar]  │  │ [👁 Visualizar]  │             │
│  │ [✏️ Editar ▼]    │  │ [✏️ Editar ▼]    │             │
│  │  ├ Deletar        │  │  ├ Deletar        │             │
│  │  ├ Atribuir Colabs│  │  ├ Atribuir Colabs│             │
│  │  └ [...]          │  │  └ [...]          │             │
│  └──────────────────┘  └──────────────────┘             │
└──────────────────────────────────────────────────────────┘
```

### Modal Criar/Editar Lista

Campos:
1. Nome (obrigatório)
2. Descrição (textarea)
3. Fornecedor (dropdown)
4. Categoria (texto)
5. Telefone WhatsApp (para envio de pedido)
6. Botão "Selecionar Itens" → abre `SeletorItensUnificado`

### Modal Atribuir Colaboradores

- Nome da lista no topo
- Checkbox por colaborador (todos os usuários do restaurante)
- Botão "Salvar Atribuição"
- `POST /admin/listas/{id}/atribuir` com IDs selecionados

### Modal Importar Lista

- Opção 1: Upload de arquivo CSV
- Opção 2: Colar texto (itens por linha)
- `POST /admin/listas/importar`

### Lixeira (Restaurar/Deletar Permanente)

- Botão "🗑 Lixeira (N)" abre modal com listas deletadas
- Checkbox para selecionar
- Restaurar: `POST /admin/listas/{id}/restaurar`
- Deletar permanente: `DELETE /admin/listas/{id}`

### API Calls

| Endpoint | Método | Uso |
|----------|--------|-----|
| `/admin/listas` | GET | Carregar todas |
| `/admin/listas` | POST | Criar |
| `/admin/listas/{id}` | PUT | Atualizar |
| `/admin/listas/{id}/deletar` | POST | Soft delete |
| `/admin/listas/{id}/atribuir` | POST | Atribuir colaboradores |
| `/admin/listas/{id}/restaurar` | POST | Restaurar da lixeira |
| `/admin/listas/importar` | POST | Importar |
| `/admin/users` | GET | Buscar colaboradores |

---

## 2. GerenciarSubmissoes.tsx

**Rota:** `/admin/submissoes`

### Layout

```
┌──────────────────────────────────────────────────────┐
│ 📦 Gerenciar Submissões              [← Voltar]       │
├──────────────────────────────────────────────────────┤
│ FILTROS: [Todos] [⏱ Pendentes] [✓ Aprovados] [✗ Rej]│
├──────────────────────────────────────────────────────┤
│ TABELA:                                               │
│ ┌────┬────────┬──────────────┬──────┬──────┬───────┐ │
│ │ ☐  │ Lista  │ Colaborador  │ Data │Status│ Ações │ │
│ ├────┼────────┼──────────────┼──────┼──────┼───────┤ │
│ │ ☐  │ Óleo   │ João Silva   │15/02 │ ⏱   │ 👁 📦 │ │
│ └────┴────────┴──────────────┴──────┴──────┴───────┘ │
│ [Toggle Arquivadas] [Modo Seleção] [Arquivar Sel.]   │
└──────────────────────────────────────────────────────┘
```

### Status das Submissões
- `PENDENTE` → badge amarelo ⏱
- `APROVADO` → badge verde ✓
- `REJEITADO` → badge vermelho ✗
- `PARCIALMENTE_APROVADO` → badge azul ~

### Filtro por Status

Botões de tab: TODOS | PENDENTE | APROVADO | REJEITADO

### Arquivamento em Lote

1. Ativar "Modo Seleção" → aparece coluna de checkbox
2. Selecionar submissões
3. Clicar "Arquivar Selecionadas"
4. `Promise.allSettled()` para sucesso parcial
5. Aviso: PENDENTE não pode ser arquivada (precisa aprovação/rejeição antes)

### Navegação para Detalhe

Por `tipo_lista`:
- `LISTA_RAPIDA` → `/admin/listas-rapidas/{id}`
- `LISTA_TRADICIONAL` → `/admin/submissoes/{id}`

### API Calls

| Endpoint | Método | Params |
|----------|--------|--------|
| `/admin/submissoes` | GET | `status=&arquivadas=false` |
| `/admin/submissoes/{id}/arquivar` | POST | — |
| `/admin/listas-rapidas/{id}/arquivar` | POST | — |

---

## 3. DetalhesSubmissao.tsx

**Rota:** `/admin/submissoes/:id`

Esta é a tela mais importante do admin — onde aprova e rejeita pedidos.

### Layout

```
┌───────────────────────────────────────────────────────────┐
│ [← Voltar]                                                 │
│ 📋 Submissão #123 — Lista: Hortifruti Semana              │
│ Colaborador: João Silva | Data: 15/02/2026 10:30           │
├───────────────────────────────────────────────────────────┤
│ [✓ Sucesso] [! Erro]                                      │
├───────────────────────────────────────────────────────────┤
│ Status: PENDENTE | Total: 5 pedidos                       │
│ [🔧 Modo Edição] [Selecionar Todos] [Converter Checklist] │
├───────────────────────────────────────────────────────────┤
│ TABELA DE PEDIDOS                                         │
│ ┌──┬──────────┬─────┬──┬────┬──────────┬───────────────┐ │
│ │☐ │ Item     │ Qtd │Un│Min │ Pedido   │ Ações         │ │
│ ├──┼──────────┼─────┼──┼────┼──────────┼───────────────┤ │
│ │☑ │ Óleo 5L  │ 10  │L │ 25 │ 15      │ [✓] [✗] [↩] │ │
│ │☐ │ Filtro   │  8  │un│ 20 │ 12      │ [✓] [✗] [↩] │ │
│ └──┴──────────┴─────┴──┴────┴──────────┴───────────────┘ │
│                                                            │
│ [Aprovar Selecionados] [Rejeitar Selecionados]            │
│ [Reverter para PENDENTE] [📋 WhatsApp] [Converter...   ]  │
└───────────────────────────────────────────────────────────┘
```

### Cores das Linhas por Status
- PENDENTE → fundo amarelo
- APROVADO → fundo verde
- REJEITADO → fundo vermelho com texto riscado

### Ações por Linha
- **✓ Aprovar:** `POST /admin/pedidos/aprovar-lote` (item único)
- **✗ Rejeitar:** confirmação → `POST /admin/pedidos/{id}/rejeitar`
- **↩ Desfazer Rejeição:** `POST /admin/pedidos/{id}/reverter` → volta a PENDENTE

### Ações em Lote
- **Selecionar Todos:** seleciona todos com status PENDENTE
- **Aprovar Selecionados:** `POST /admin/pedidos/aprovar-lote` com todos os IDs
- **Rejeitar Selecionados:** rejeita em sequência

### Modo Edição

Quando admin clica "🔧 Modo Edição":
- Coluna "Qtd. Atual" vira campo editável
- Admin insere quantidade atual observada
- Sistema recalcula pedido em tempo real:
  ```
  Pedido = Max(0, Qtd.Mín - Qtd.Atual)
  ```
- `PUT /admin/submissoes/{id}/editar` com todas as edições

### Modal Converter para Checklist

Opções:
- [✓] Incluir nome do fornecedor
- [✓] Incluir observações

`POST /admin/submissoes/{id}/converter-checklist`
→ Redireciona para `/admin/checklists/{id}`

### Mensagem WhatsApp

Formato gerado:
```
📋 *Solicitação Aprovada — Lista Hortifruti Semana*

*Lista:* Hortifruti Semana
*Solicitante:* João Silva
*Data:* 15 de fevereiro de 2026

*Itens Aprovados:*

• Óleo 5L - *Pedido: 15 L*
• Filtro Ar - *Pedido: 12 un*

*Total:* 2 itens
```

Apenas pedidos APROVADOS são incluídos. Copiado com `navigator.clipboard.writeText()`.

### API Calls

| Endpoint | Método | Uso |
|----------|--------|-----|
| `/admin/submissoes/{id}` | GET | Carregar submissão |
| `/admin/listas/{id}/estoque` | GET | Carregar itens para edição |
| `/admin/pedidos/aprovar-lote` | POST | Aprovar (lote ou único) |
| `/admin/pedidos/{id}/rejeitar` | POST | Rejeitar único |
| `/admin/pedidos/{id}/reverter` | POST | Desfazer rejeição |
| `/admin/submissoes/{id}/editar` | PUT | Salvar edições de quantidade |
| `/admin/submissoes/{id}/reverter` | POST | Reverter toda a submissão |
| `/admin/submissoes/{id}/converter-checklist` | POST | Criar checklist |

---

## 4. GerenciarUsuarios.tsx (Hub de Navegação)

**Rota:** `/admin/gerenciar-usuarios`
**Arquivo:** `frontend/src/features/admin/GerenciarUsuarios.tsx`
**Auth:** ADMIN ou SUPER_ADMIN
**Sem estado próprio** — apenas 3 cards de navegação.

### Layout

```
┌──────────────────────────────────────────────────────────┐
│ [← Voltar ao Dashboard]                                  │
│ 👥 Gerenciar Usuários                                    │
│ "Escolha uma opção para gerenciar os usuários do sistema"│
├──────────────────────────────────────────────────────────┤
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ 👥 Cadastrados   │ │ ⏳ Pendentes     │ │ ➕ Criar         │ │
│  │   125 usuários   │ │   8 usuários     │ │   + novo         │ │
│  │  [Acessar →]     │ │  [Acessar →]     │ │  [Acessar →]     │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Cards

| Card | Cor | Destino |
|------|-----|---------|
| Usuários Cadastrados | Azul | `/admin/users` |
| Usuários Pendentes | Amarelo | `/admin/users?status=pending` |
| Criar Usuário | Verde | `/admin/users/new` |

---

## 4.1 UserManagement.tsx (Tabela Principal)

**Rota:** `/admin/users`
**Arquivo:** `frontend/src/features/admin/UserManagement.tsx`
**Auth:** ADMIN ou SUPER_ADMIN

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [← Voltar]                                                   │
│ Gerenciamento de Usuários                                    │
│ (SUPER_ADMIN) Filtrar por restaurante: [Todos ▼]            │
│                                         [+ Criar Novo Usuário]│
├──────────────────────────────────────────────────────────────┤
│ CARD: [🔗 Convidar Usuário — gera link de convite]          │
├──────────────────────────────────────────────────────────────┤
│ [✓ Sucesso] [! Erro]                                         │
├──────────────────────────────────────────────────────────────┤
│ TABELA (ResponsiveTable)                                     │
│ ┌───┬──────────┬─────────────┬────────────┬──────────┬───────┬───────┬────────────────────────────────────┐ │
│ │ # │ Nome     │ Email       │ Perfil     │Restaurante│Aprov.│Status │ Ações                              │ │
│ ├───┼──────────┼─────────────┼────────────┼──────────┼───────┼───────┼────────────────────────────────────┤ │
│ │ 1 │ João     │ j@email.com │COLLABORATOR│ Sede     │ ✓ Ap │ Ativo │[Alterar][Copiar][WhatsApp][Editar]  │ │
│ │   │          │             │            │          │       │       │[Desativar][Deletar]                 │ │
│ │ 2 │ Maria    │ m@email.com │COLLABORATOR│ Sede     │ ⏳Pend│ Ativo │[Aprovar][Copiar][WhatsApp][Editar]  │ │
│ │   │          │             │            │          │       │       │[Desativar][Deletar]                 │ │
│ └───┴──────────┴─────────────┴────────────┴──────────┴───────┴───────┴────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

> Coluna **Restaurante** visível apenas para SUPER_ADMIN.

### Colunas da Tabela

| Coluna | Tipo | Notas |
|--------|------|-------|
| # | número | ID do usuário |
| Nome | texto | — |
| Email | texto | — |
| Perfil | texto | COLLABORATOR / ADMIN / SUPER_ADMIN |
| Restaurante | texto | Apenas SUPER_ADMIN; `restaurante_nome` ou `-` |
| Aprovação | badge | 🟢 Aprovado / 🟡 Pendente |
| Status | badge | 🟢 Ativo / 🔴 Inativo |

### Ações por Linha

| Botão | Condição | Ação |
|-------|----------|------|
| Aprovar | `!aprovado` | `POST /admin/users/{id}/approve` |
| Alterar | SUPER_ADMIN + `role !== SUPER_ADMIN` | Abre Modal Atribuir Restaurante |
| Copiar | sempre | `GET /admin/users/{id}/compartilhar-whatsapp` → copia para clipboard |
| WhatsApp | sempre | mesmo endpoint → abre `wa.me/?text=...` |
| Editar | sempre | Abre Modal Editar Usuário |
| Desativar | `ativo = true` | `POST /admin/users/{id}/deactivate` |
| Reativar | `ativo = false` | `POST /admin/users/{id}/reactivate` |
| Deletar | sempre | confirm → `DELETE /admin/users/{id}` (hard delete) |

### Filtro por Restaurante (SUPER_ADMIN)

- Select com todos os restaurantes + opção "Todos"
- `GET /admin/users?restaurante_id={id}` ao mudar seleção

### Modais

#### a. Modal Criar Usuário

Campos:
- Nome (obrigatório)
- Email (obrigatório)
- Senha (obrigatório)
- Tipo de Conta — select: `COLLABORATOR` (ADMIN) ou `COLLABORATOR / ADMIN` (SUPER_ADMIN)
- Restaurante — select, obrigatório para SUPER_ADMIN

Endpoint: SUPER_ADMIN + role ADMIN → `POST /admin/users/criar-admin-restaurante`; demais → `POST /admin/create_user`

#### b. Modal Editar Usuário

Campos editáveis: Nome, Email, Role, Restaurante (SUPER_ADMIN)
Botões extras dentro do modal:
- **Alterar Senha** → abre Modal Alterar Senha (sub-modal)
- **Resetar Senha** → confirm → `POST /admin/usuarios/{id}/resetar-senha` → exibe nova senha gerada no toast

Endpoint de atualização: `PUT /admin/users/{id}` com `{ nome, email, role, restaurante_id? }`

#### c. Modal Atribuir Restaurante (SUPER_ADMIN)

- Select com lista de restaurantes
- Salva com `PUT /admin/users/{id}/atribuir-restaurante { restaurante_id }`

#### d. Modal Alterar Senha

- Campo "Nova Senha" (mínimo 6 caracteres)
- Endpoint: `PUT /admin/usuarios/{id}/alterar-senha { nova_senha }`

#### e. Modal Copiar Credenciais

- Aparece quando `navigator.clipboard` falha
- `<textarea>` com o texto gerado pelo endpoint de WhatsApp
- Botão "Copiar" tenta `execCommand('copy')` como fallback
- Usuário pode selecionar e copiar manualmente

### Fluxo de Aprovação

```
Usuário se registra (aprovado = false)
        │
        ▼
Admin vê badge "Pendente" → clica [Aprovar]
        │
        ▼
POST /admin/users/{id}/approve → aprovado = true
        │
        ▼
Usuário pode fazer login
```

> Usuários criados via modal ou `CriarUsuario.tsx` são **auto-aprovados** (aprovado = true).

### Regras de Papel

| Criador | Pode criar |
|---------|------------|
| ADMIN | COLLABORATOR apenas |
| SUPER_ADMIN | COLLABORATOR ou ADMIN |
| Qualquer | Ninguém cria SUPER_ADMIN via API |

### Soft Delete vs Hard Delete

- **Desativar** (`ativo = false`): usuário não consegue logar, mas permanece no banco
- **Deletar** (`DELETE`): remoção permanente — requer confirmação via `window.confirm`

### Todos os Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/admin/users` | Listar usuários (filtro `restaurante_id`, `status`) |
| POST | `/admin/users/{id}/approve` | Aprovar usuário pendente |
| PUT | `/admin/users/{id}` | Editar nome / email / role |
| DELETE | `/admin/users/{id}` | Deletar permanentemente |
| POST | `/admin/users/{id}/deactivate` | Desativar (ativo=false) |
| POST | `/admin/users/{id}/reactivate` | Reativar |
| GET | `/admin/users/{id}/compartilhar-whatsapp` | Gerar texto formatado com credenciais |
| POST | `/admin/create_user` | Criar colaborador (autenticado) |
| PUT | `/admin/users/{id}/atribuir-restaurante` | Alterar restaurante (SUPER_ADMIN) |
| POST | `/admin/users/criar-admin-restaurante` | Criar ADMIN em restaurante (SUPER_ADMIN) |
| PUT | `/admin/usuarios/{id}/alterar-senha` | Alterar senha manualmente |
| POST | `/admin/usuarios/{id}/resetar-senha` | Resetar senha (gera aleatória) |

---

## 4.2 CriarUsuario.tsx (Formulário Standalone)

**Rota:** `/admin/users/new`
**Arquivo:** `frontend/src/features/admin/CriarUsuario.tsx`
**Auth:** ADMIN ou SUPER_ADMIN
**Acesso:** via card "Criar Usuário" em `/admin/gerenciar-usuarios`

### Layout

```
┌──────────────────────────────────────────────────────────┐
│ [← Voltar]                                               │
│ ➕ Criar Novo Usuário                                    │
│ "Adicione um novo usuário ao sistema (já aprovado)"      │
├──────────────────────────────────────────────────────────┤
│ [! Erro] [✓ Usuário criado com sucesso! Redirecionando...]│
├──────────────────────────────────────────────────────────┤
│ Nome Completo *                                          │
│ [__________________________]                             │
│                                                          │
│ Nome de Usuário (opcional)                               │
│ [__________________________]                             │
│ "Pode ser usado para login no lugar do email"            │
│                                                          │
│ Email *                                                  │
│ [__________________________]                             │
│                                                          │
│ (SUPER_ADMIN) Restaurante *                              │
│ [Selecione um restaurante ▼]                             │
│                                                          │
│ Tipo de Conta *                                          │
│ (ADMIN) [Colaborador — fixo, desabilitado]               │
│ (SUPER_ADMIN) [Colaborador ▼ / Administrador ▼]         │
│                                                          │
│ Senha *   [________] 👁                                  │
│ "Mínimo 6 caracteres"                                    │
│                                                          │
│ Confirmar Senha *  [________] 👁                         │
├──────────────────────────────────────────────────────────┤
│              [Cancelar]  [💾 Criar Usuário]              │
└──────────────────────────────────────────────────────────┘
```

### Campos

| Campo | Obrigatório | Notas |
|-------|-------------|-------|
| Nome Completo | sim | — |
| Nome de Usuário | não | alternativa ao email para login |
| Email | sim | regex de validação |
| Restaurante | SUPER_ADMIN | select carregado de `GET /admin/restaurantes` |
| Tipo de Conta | sim | ADMIN vê campo desabilitado "Colaborador"; SUPER_ADMIN vê select |
| Senha | sim | mínimo 6 caracteres |
| Confirmar Senha | sim | deve ser igual à senha |

### Validações (ordem de execução)

1. Nome não vazio
2. Email não vazio + regex válido
3. Senha não vazia + mínimo 6 chars
4. Confirmação igual à senha
5. SUPER_ADMIN: restaurante selecionado

### Toggle de Visibilidade de Senha

Botão 👁/👁‍🗨 ao lado dos campos Senha e Confirmar Senha — alterna `type="password"` ↔ `type="text"`.

### Fluxo de Sucesso

1. `POST` retorna 200 → `setSuccess(true)` → exibe alert verde
2. Limpa o formulário
3. `setTimeout 1500ms` → `navigate('/admin/gerenciar-usuarios', { replace: true })`

### Endpoints

| Método | Endpoint | Condição |
|--------|----------|----------|
| POST | `/admin/create_user` | ADMIN ou SUPER_ADMIN criando COLLABORATOR |
| POST | `/admin/users/criar-admin-restaurante` | SUPER_ADMIN criando ADMIN |
| GET | `/admin/restaurantes` | Apenas SUPER_ADMIN, para popular o select |

---

## 5. ItemManagement.tsx

**Rota:** `/admin/items`

- Tabela de itens do catálogo global
- Filtro por fornecedor
- CRUD completo (criar, editar, deletar)
- Importar CSV de itens

---

## 6. FornecedorManagement.tsx

**Rota:** `/admin/fornecedores`

- Tabela: Nome | Contato | Cidade | Status | Ações
- CRUD completo
- Ver itens do fornecedor
- Vincular a listas

---

## 7. AreaManagement.tsx

**Rota:** `/admin/areas`

- CRUD de áreas de trabalho
- Cada área tem: nome, descrição, responsável
- Áreas são usadas para filtrar itens de estoque e templates POP

---

## 8. Módulo de Itens por Lista

### 8.1 GerenciarItensLista.tsx

**Rota:** `/admin/listas/:id/estoque`

- Tabela de itens da lista com: nome, unidade, qtd mínima, qtd atual
- Configurar threshold por item (quantidade_minima, quantidade_por_fardo)
- Editar quantidades in-line
- Import CSV / Export CSV
- Botão "Salvar Configurações"

---

### 8.2 ListaMaeConsolidada.tsx (Lista Mãe)

**Rota:** `/admin/listas/:id/lista-mae`
**Arquivo:** `apps/web/src/app/admin/listas/[id]/lista-mae/page.tsx`
**CSS:** `apps/web/src/app/admin/listas/[id]/lista-mae/ListaMae.module.css`
**Auth:** ADMIN, SUPER_ADMIN
**Acesso:** via botão "Gerenciar" no card em `/admin/listas`

#### Objetivo

Interface avançada de gestão do catálogo de itens de uma lista. Combina edição inline, modo lote, filtros, seção de inativos, importação em lote, busca no catálogo global, copiar/mover itens entre listas e configuração de threshold/fardo. Mapeia o componente legado `ListaMaeConsolidada.tsx`.

#### Layout

```
┌──────────────────────────────────────────────────────────┐
│ [← Voltar às Listas]                                     │
│ Lista Mãe — {Nome da Lista}                              │
├──────────────────────────────────────────────────────────┤
│ FORNECEDORES (cards, se houver itens com fornecedor):    │
│ [🚚 Fornecedor A  tel] [🚚 Fornecedor B  email]          │
├──────────────────────────────────────────────────────────┤
│ STATS: [Ativos: N] [Inativos: N] [Selecionados: N] [Data]│
├──────────────────────────────────────────────────────────┤
│ FILTROS: [🔍 Buscar nome] [Todas unidades ▼]             │
│          Pedido: [min] – [max]           [✕ Limpar]      │
├──────────────────────────────────────────────────────────┤
│ TOOLS: [📥 Importar em Lote] [🔍 Buscar no Catálogo]     │
│ (quando selecionados > 0):                               │
│ [📋 Copiar para Lista] [→ Mover para Lista]              │
│ [🚚 Atribuir Fornecedor] [✕ Limpar Seleção (N)]         │
├──────────────────────────────────────────────────────────┤
│ TABELA PRINCIPAL                                         │
│ ┌──┬──────────────────┬──────┬────────┬──────────┬──────┬────────┐│
│ │☐ │ Nome ▲           │ Un.  │QtdAtual│ QtdMín ✏ │Pedido│ Ações ││
│ ├──┼──────────────────┼──────┼────────┼──────────┼──────┼────────┤│
│ │  │ [Nome novo...]   │[Un▼] │   0    │  [___]   │      │  [+]  ││ ← add row
│ │☐ │ Cebola Roxa      │  Kg  │   3    │    5     │ 🔴 1 │ ⚙ 🗑 ││ ← warning
│ │☑ │ Alho             │  Kg  │   4    │    2     │ 🟢ok │ ⚙ 🗑 ││ ← selected
│ └──┴──────────────────┴──────┴────────┴──────────┴──────┴────────┘│
├──────────────────────────────────────────────────────────┤
│ ▶ Inativos (N) — QtdMín = 0         [colapsar/expandir] │
└──────────────────────────────────────────────────────────┘
```

#### Linha de Adição (add row)

Primeira linha da tabela, sempre visível:
- Campo `nome` (text) + select `unidade` (Un/Kg/g/L/ml/Cx/Pc/Fd) + campo `qtdMin` (number)
- `[+]` ou `Enter` → `POST /v1/listas/:id/mae-itens` → refetch

#### Edição Inline — Nome (duplo clique)

- Duplo clique na célula nome → input text
- `Enter` ou `blur` → `PUT /v1/listas/:id/mae-itens/:itemRefId { nome }`
- `Escape` → cancela sem salvar

#### Modo Lote — QtdMín (ícone ✏️ no cabeçalho)

- Ícone `FaEdit` no `<th>` de QtdMín
- Clique → todos os campos QtdMín viram `<input>` simultaneamente (`batchValues: Record<id, string>`)
- `Enter` em um campo → foca o próximo (via `useRef` array)
- `✓` → `PUT` em paralelo apenas dos campos alterados (`Promise.all`)
- `✕` → cancela sem salvar

#### Cálculo do Pedido

```typescript
calcPedido(ref) = ref.qtdFardo ?? 1   // quando qtdAtual < qtdMinima
calcPedido(ref) = 0                    // quando qtdAtual >= qtdMinima
```

Badge **vermelho** `badgePedido` quando pedido > 0; badge **verde** `badgeOk` quando = 0.
Linha recebe classe `rowWarning` (amarelo) quando pedido > 0.
Linha recebe classe `rowSelected` (azul) quando checkbox marcado.

#### Seção Inativos (colapsável)

- `quantidadeMinima <= 0`
- Tabela separada: Nome | Unidade | QtdMín | Ações
- Duplo clique na coluna QtdMín → `prompt()` → `PUT` → item migra para ativos
- Dica exibida: *"Duplo clique na qtdMin para reativar"*

#### Filtros (client-side)

| Filtro | Tipo | Lógica |
|--------|------|--------|
| Buscar nome | text | `normalize().includes()` |
| Unidade | select | exato, valores únicos dos itens |
| Pedido Mín | number | `calcPedido(r) >= N` |
| Pedido Máx | number | `calcPedido(r) <= N` |

Botão "✕ Limpar" aparece quando qualquer filtro está ativo.

#### Ordenação

Colunas clicáveis: Nome, Unidade, QtdAtual, QtdMín, Pedido. Toggle asc/desc.
Ícones: `FaSort` (neutro), `FaSortUp` (asc), `FaSortDown` (desc).

#### Modal ⚙️ Config (threshold / fardo)

- Campos: `quantidadeMinima` + `qtdFardo`
- Preview: *"Quando estoque ≤ X, pedir Y"*
- `PUT /v1/listas/:id/mae-itens/:itemRefId { quantidadeMinima, qtdFardo }`

#### Modal Importar em Lote

- `<textarea>` com nomes, um por linha
- Limpeza automática no backend: remove padrões `6x5kg`, parênteses, emojis, barras
- `POST /v1/listas/:id/items-import { nomes: string[] }`
- Retorna `{ items_criados, items_duplicados }` com alerta de sucesso

#### Modal Buscar no Catálogo

- Input de busca → `GET /v1/items?nome=...`
- Checkbox por item com badge do fornecedor vinculado
- Campo `qtdMin` individual ao selecionar
- `POST /v1/listas/:id/mae-itens` para cada selecionado (erros de duplicata ignorados)

#### Modal Copiar / Mover para Lista

- Radio: **Lista existente** (dropdown excluindo a lista atual) **OU** **Nova lista** (nome + área opcional)
- Copiar → `POST /v1/listas/:id/itens/copiar`
- Mover → `POST /v1/listas/:id/itens/mover` (copia + deleta origem)
- Abre Modal Resultado com `itens_ignorados_lista`

#### Modal Resultado

Após copiar/mover: exibe mensagem de sucesso + lista de itens ignorados (já existiam no destino).

#### Modal Atribuir Fornecedor

- Lista dos itens selecionados com qtd calculada (`qtdFardo ?? qtdMinima`)
- Dropdown com fornecedores do restaurante
- `POST /v1/listas/:id/atribuir-fornecedor { itemRefIds, fornecedorId }`
- Cria uma `Submissao` (status PENDENTE) com um `Pedido` por item
- Retorna `{ total_pedidos, submissaoId }`

#### Endpoints Utilizados

| Método | Endpoint | Uso |
|--------|----------|-----|
| GET | `/v1/listas/:id/lista-mae` | Carregar lista + itensRef + fornecedores derivados |
| POST | `/v1/listas/:id/mae-itens` | Adicionar item pelo nome |
| PUT | `/v1/listas/:id/mae-itens/:itemRefId` | Editar nome / qtds / fardo |
| DELETE | `/v1/listas/:id/mae-itens/:itemRefId` | Remover item da lista |
| POST | `/v1/listas/:id/items-import` | Importar nomes em lote |
| POST | `/v1/listas/:id/itens/copiar` | Copiar selecionados para outra lista |
| POST | `/v1/listas/:id/itens/mover` | Mover selecionados para outra lista |
| POST | `/v1/listas/:id/atribuir-fornecedor` | Gerar submissão de pedido por fornecedor |
| GET | `/v1/items` | Busca no catálogo global |
| GET | `/v1/listas` | Lista de listas para modal copiar/mover |
| GET | `/v1/areas` | Áreas para criar nova lista destino |
| GET | `/v1/fornecedores` | Fornecedores para modal atribuir |

---

### 8.3 EstoqueListaCompras.tsx

**Rota:** `/collaborator/listas/:listaId/estoque`
**Arquivo:** `frontend/src/features/collaborator/EstoqueListaCompras.tsx`
**Auth:** qualquer usuário autenticado (COLLABORATOR **ou** ADMIN)
**Acesso admin:** via botão "✏️ Preencher" no dropdown do card em `/admin/listas-compras`

#### Objetivo

Tela **compartilhada** entre admin e colaborador. Permite que qualquer pessoa autorizada atualize as quantidades atuais de cada item de uma lista e depois submeta — gerando uma `Submissao` com os pedidos de reposição calculados automaticamente. O admin acessa para preencher manualmente quando necessário; o colaborador acessa como parte do fluxo regular.

#### Layout

```
┌──────────────────────────────────────────────────────────┐
│ [← Voltar]                        [💡 Sugerir Novo Item] │
│ 🛒 Preenchimento: {Nome da Lista}                        │
│ "Atualize as quantidades atuais de cada item e clique    │
│  em 'Submeter Lista'"                                    │
├──────────────────────────────────────────────────────────┤
│ [✓ Sucesso] [! Erro]  ← alertas dismiss                  │
├──────────────────────────────────────────────────────────┤
│ [🔍 Buscar item...]  🔴 Em Falta: N  🟡 Alterados: N  🔵 Total: N │
├──────────────────────────────────────────────────────────┤
│ TABELA DE ITENS                                          │
│ ┌──────────────────┬──────┬────────┬──────────┬────────┐ │
│ │ Item ▲           │ Un.  │ Qtd.Mín│ Qtd.Atual │ Pedido │ │
│ ├──────────────────┼──────┼────────┼──────────┼────────┤ │
│ │ Cebola Roxa      │  Kg  │   5    │ [___3___] │ 1 🔴  │ │
│ │ Alho             │  Kg  │   2    │ [___2___] │ 0 🟢  │ │
│ │ Batata           │  Kg  │   0    │ [_______] │  —    │ │ ← inativo
│ └──────────────────┴──────┴────────┴──────────┴────────┘ │
├──────────────────────────────────────────────────────────┤
│  [Salvar Rascunho]              [Submeter Lista]          │
└──────────────────────────────────────────────────────────┘
```

#### Tabela de Itens

| Coluna | Tipo | Notas |
|--------|------|-------|
| Item | texto | Clicável para ordenar; itens inativos (qtdMin = 0) exibem `—` no pedido |
| Unidade | texto | Exibição apenas |
| Qtd. Mín | número | Exibição apenas; referência visual |
| Qtd. Atual | input | Editável — ver detalhes abaixo |
| Pedido | calculado | Badge colorido (🔴 > 0 / 🟢 = 0) |

**Destaque visual de linhas:**
- Linha **modificada** (valor diferente do servidor): borda ou fundo amarelo claro
- Linha **inválida** (valor negativo): borda vermelha
- Linha **inativo** (qtdMin = 0): opacidade reduzida, campo desabilitado opcionalmente

**Ordenação:** clique no cabeçalho de qualquer coluna → toggle asc/desc.

#### Campo Qtd. Atual

- Tipo `text` (não `number`) para aceitar expressões matemáticas
- **Suporte a expressões:** `5+3+2` → avaliado como `10` no blur/Enter
- **Vírgula → ponto:** `3,5` convertido para `3.5` automaticamente
- **Android keyup:** evento `keyup` (além de `change`) para capturar valores em teclados virtuais que não disparam `change` corretamente
- Valor mínimo: `0` — valores negativos mostram erro de validação
- Atualização do resumo em tempo real a cada alteração

#### Cálculo do Pedido

```typescript
// Lógica base
pedido = max(0, qtdMinima - qtdAtual)

// Com threshold/fardo
if (usaThreshold && pedido > 0) {
  pedido = quantidadePorFardo   // sempre pede um fardo completo
}

// Itens inativos (qtdMin = 0)
pedido = 0  // não gera pedido
```

#### Resumo em Tempo Real (badges no topo)

| Badge | Cor | Lógica |
|-------|-----|--------|
| Em Falta | 🔴 vermelho | `count(pedido > 0)` |
| Alterados | 🟡 amarelo | `count(qtdAtual !== valorOriginalServidor)` |
| Total | 🔵 azul | `count(todosItens)` |

Recalculados a cada keystroke sem chamada à API.

#### Busca e Ordenação

- **Campo de busca:** filtra itens pelo nome em tempo real (client-side, normalize NFD)
- **Ordenação:** por Nome, Unidade, QtdMín, QtdAtual, Pedido — toggle asc/desc

#### Sistema de Rascunho Offline

**Armazenamento primário — IndexedDB:**
```
store: "rascunhos"
key: `lista-${listaId}`
value: { listaId, itens: { [itemId]: qtdAtual }, timestamp }
```

**Fallback — localStorage:**
```
key: `rascunho-lista-${listaId}`
value: JSON.stringify({ itens, timestamp })
```

**Auto-save:** debounce de 400ms após cada alteração → salva silenciosamente.

**Merge com servidor ao carregar:**
1. Busca dados do servidor (`GET /collaborator/listas/:id/estoque`)
2. Busca rascunho local
3. Se rascunho existe e tem timestamp mais recente → aplica sobre os dados do servidor
4. Banner amarelo: *"Rascunho local restaurado — verifique os valores antes de submeter"*
5. Botão "Descartar Rascunho" limpa o storage

#### Ações: Salvar Rascunho

1. Validar todos os campos (sem negativos, sem NaN)
2. Se válido: `PUT /collaborator/listas/:id/itens/:itemId` para cada item **alterado** (em paralelo)
3. Atualiza rascunho local com os novos valores do servidor
4. Mensagem de sucesso: *"Rascunho salvo com sucesso"* (auto-dismiss 3s)
5. Erro parcial: lista os itens que falharam

#### Ações: Submeter Lista

1. Validar: pelo menos 1 item com `pedido > 0`
2. Se nenhum item precisar reposição → aviso *"Todos os itens estão acima do mínimo"*
3. `POST /collaborator/listas/:id/submeter` com todos os `{ itemId, quantidadeAtual }`
4. **Modal de sucesso animado:**
   - Ícone ✓ animado (CSS keyframes)
   - *"Lista submetida! X pedidos criados."*
   - Contagem regressiva: *"Redirecionando em 5... 4..."*
5. Após 5s → redirect para `/collaborator/minhas-listas`
6. Limpa rascunho local (IndexedDB + localStorage)

#### Modal: Sugerir Novo Item

Aberto pelo botão "💡 Sugerir Novo Item" no header.

**Campos:**
| Campo | Obrigatório | Notas |
|-------|-------------|-------|
| Nome do item | sim | min 2 chars |
| Unidade de medida | sim | select: Un/Kg/g/L/ml |
| Observação | não | textarea |

**Comportamento:**
- `POST /auth/sugestoes { nome, unidadeMedida, observacao }`
- Sucesso → fecha modal + toast *"Sugestão enviada!"* (auto-dismiss 5s)
- Erro → alerta dentro do modal

#### Todos os Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/collaborator/listas/:id/estoque` | Carregar itens com qtds e pedido calculado |
| PUT | `/collaborator/listas/:id/itens/:itemId` | Salvar qtd. atual de um item (rascunho) |
| POST | `/collaborator/listas/:id/submeter` | Submeter lista → cria Submissao + Pedidos |
| POST | `/auth/sugestoes` | Enviar sugestão de novo item |

#### Fluxo Completo

```
Admin / Colaborador
        │
        ▼
Acessa /collaborator/listas/:id/estoque
        │
        ├── Carrega itens do servidor (GET estoque)
        ├── Mescla com rascunho local (IndexedDB/localStorage)
        │
        ▼
Usuário preenche Qtd. Atual de cada item
        │
        ├── Expressões avaliadas (5+3+2 → 10)
        ├── Resumo atualizado em tempo real
        ├── Auto-save rascunho (400ms debounce)
        │
        ├── [Salvar Rascunho] ──► PUT por item alterado
        │                          └─► Rascunho atualizado
        │
        └── [Submeter Lista]
                │
                ▼
          Validação: pedido > 0?
                │
          POST /submeter
                │
                ▼
          Submissao criada (PENDENTE)
          + Pedidos por item com pedido > 0
                │
                ▼
          Modal de sucesso animado
          → 5s → /collaborator/minhas-listas
                │
                ▼
          Admin vê em /admin/submissoes → aprova/rejeita
```

---

## 9. AdminDashboard.tsx

**Rota:** `/admin`

### Layout

```
┌──────────────────────────────────────────────────────┐
│ Dashboard Administrativo                             │
├──────────────────────────────────────────────────────┤
│ CARDS DE RESUMO:                                     │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│ │ Submissões  │ │ Listas      │ │ Usuários    │    │
│ │ Pendentes   │ │ Ativas      │ │ Ativos      │    │
│ │ 5           │ │ 12          │ │ 8           │    │
│ └─────────────┘ └─────────────┘ └─────────────┘    │
├──────────────────────────────────────────────────────┤
│ GRÁFICOS (Chart.js):                                 │
│ - Submissões por status (pizza)                      │
│ - Itens mais solicitados (barras)                    │
│ - Histórico de submissões (linha)                    │
└──────────────────────────────────────────────────────┘
```

---

## 10. Telas de Merge de Submissões

**Rota:** `/admin/merge` (ver `06_MODULO_MERGE.md`)

- Selecionar múltiplas submissões aprovadas
- Fundir pedidos duplicados
- Gerar mensagem WhatsApp agrupada por fornecedor

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `frontend/src/features/admin/ListasCompras.tsx` | Gestão de listas |
| `frontend/src/features/admin/GerenciarSubmissoes.tsx` | Listagem de submissões |
| `frontend/src/features/admin/DetalhesSubmissao.tsx` | Aprovação detalhada |
| `frontend/src/features/admin/GerenciarUsuarios.tsx` | Hub de navegação — 3 cards (Cadastrados, Pendentes, Criar) |
| `frontend/src/features/admin/UserManagement.tsx` | Tabela principal de usuários — CRUD, aprovação, senha, WhatsApp, soft/hard delete |
| `frontend/src/features/admin/CriarUsuario.tsx` | Formulário standalone de criação de usuário (auto-aprovado, redirect 1.5s) |
| `frontend/src/features/admin/ItemManagement.tsx` | Catálogo de itens |
| `frontend/src/features/admin/FornecedorManagement.tsx` | Gestão de fornecedores |
| `frontend/src/features/admin/AreaManagement.tsx` | Gestão de áreas |
| `frontend/src/features/admin/GerenciarItensLista.tsx` | Itens e threshold por lista (visão básica) |
| `apps/web/src/app/admin/listas/[id]/lista-mae/page.tsx` | Lista Mãe — catálogo avançado de itens (edição inline, modo lote, copiar/mover, importação, fornecedor) |
| `frontend/src/features/collaborator/EstoqueListaCompras.tsx` | Preenchimento de estoque — compartilhado admin/colaborador; suporte a expressões, rascunho offline, submit animado |
| `frontend/src/features/dashboard/AdminDashboard.tsx` | Dashboard do admin |
