# 01 — Fase 1: Fluxo Core de Compras (Historico concluido)

## Objetivo

Com esta fase concluída, o fluxo completo de negócio deve funcionar de ponta a ponta:
colaborador atualiza estoque → submete lista → admin aprova pedidos → admin gerencia usuários.

---

## Tarefa 1.1 — Atualização de Estoque pelo Colaborador

### Backend

- O campo `quantidadeAtual` já existe em `ListaItemRef`
- Adicionar endpoint: `PUT /v1/collaborator/listas/:id/estoque`
- Body: `{ itens: [{ itemRefId: number, quantidadeAtual: number }] }`
- Lógica: atualizar `quantidadeAtual` de cada item; calcular `pedido = max(0, qtdMin - qtdAtual)`
- Guard: `COLLABORATOR` ou `ADMIN`, isolamento por `restauranteId`

### Frontend

- Página: `app/(collaborator)/listas/[id]/page.tsx`
- Transformar de visualização pura para edição com inputs de quantidade
- Salvar rascunho em `localStorage` (chave: `rascunho-lista-{id}`)
- Botão "Submeter Lista" → chama tarefa 1.3
- Exibir `qtdMin` e `qtdAtual` lado a lado; destacar itens abaixo do mínimo

### Referência Legado

- `legacy/frontend/src/features/inventory/EstoqueListaCompras.tsx`
- `legacy/frontend/src/features/collaborator/EstoqueListaCompras.tsx`

---

## Tarefa 1.2 — Modelo de Submissões e Pedidos (Schema Prisma)

### Alterações em `schema.prisma`

```prisma
enum StatusSubmissao {
  PENDENTE
  APROVADO
  REJEITADO
  PARCIAL
  ARQUIVADO
}

enum StatusPedido {
  PENDENTE
  APROVADO
  REJEITADO
}

model Submissao {
  id            Int          @id @default(autoincrement())
  lista         Lista           @relation(fields: [listaId], references: [id])
  listaId       Int
  usuario       Usuario         @relation(fields: [usuarioId], references: [id])
  usuarioId     Int
  restaurante   Restaurante     @relation(fields: [restauranteId], references: [id])
  restauranteId Int
  status        StatusSubmissao @default(PENDENTE)
  arquivada     Boolean         @default(false)
  pedidos       Pedido[]
  criadoEm     DateTime        @default(now())
  atualizadoEm DateTime        @updatedAt
}

model Pedido {
  id            Int       @id @default(autoincrement())
  submissao     Submissao    @relation(fields: [submissaoId], references: [id])
  submissaoId   Int
  item          Item         @relation(fields: [itemId], references: [id])
  itemId        Int
  qtdSolicitada Float
  status        StatusPedido @default(PENDENTE)
  criadoEm     DateTime     @default(now())
  atualizadoEm DateTime     @updatedAt
}
```

### Migration

```bash
npx prisma migrate dev --name add-submissoes-pedidos
```

---

## Tarefa 1.3 — Endpoint de Submissão (Colaborador)

### Backend

- `POST /v1/collaborator/listas/:id/submeter`
- Lógica:
  1. Buscar todos os `ListaItemRef` da lista
  2. Para cada item: `qtdSolicitada = max(0, qtdMin - quantidadeAtual)`
  3. Filtrar apenas itens com `qtdSolicitada > 0`
  4. Criar `Submissao` com status `PENDENTE`
  5. Criar `Pedido` para cada item filtrado
- Retornar submissão criada com pedidos

### Validações

- Lista deve pertencer ao restaurante do colaborador
- Não criar submissão se todos os itens estiverem acima do mínimo (retornar 422)

---

## Tarefa 1.4 — Módulo de Submissões (Admin Backend)

### Endpoints

```
GET    /v1/admin/submissoes                    → lista (filtros: status, arquivada, busca)
GET    /v1/admin/submissoes/:id               → detalhe com pedidos
POST   /v1/admin/submissoes/:id/aprovar       → aprovar todos os pedidos PENDENTE
POST   /v1/admin/submissoes/:id/rejeitar      → rejeitar todos os pedidos PENDENTE
PUT    /v1/admin/pedidos/:id/status           → body: { status: 'APROVADO' | 'REJEITADO' }
PUT    /v1/admin/submissoes/:id/reverter      → volta todos para PENDENTE
PUT    /v1/admin/submissoes/:id/arquivar      → arquivar (soft delete)
```

### Lógica de Status da Submissão

Recalcular após cada mudança de pedido:
- Todos `APROVADO` → `APROVADO`
- Todos `REJEITADO` → `REJEITADO`
- Mix de aprovados e rejeitados (sem pendentes) → `PARCIAL`
- Qualquer `PENDENTE` restante → `PENDENTE`

---

## Tarefa 1.5 — Telas de Submissões (Admin Frontend)

### `/admin/submissoes`

- Tabs: PENDENTE / APROVADO / REJEITADO / PARCIAL / ARQUIVADO
- Tabela com colunas: Lista, Colaborador, Data, Qtd Pedidos, Status, Ações
- Ações: Ver Detalhe, Arquivar

### `/admin/submissoes/[id]`

- Cabeçalho: nome da lista, colaborador, data, status geral
- Tabela de pedidos: Item, Qtd Solicitada, Status, Ações (Aprovar / Rejeitar por linha)
- Botões em lote: Aprovar Todos, Rejeitar Todos, Reverter para Pendente
- Botão Arquivar

### Referência Legado

- `legacy/frontend/src/features/admin/GerenciarSubmissoes.tsx`
- `legacy/frontend/src/features/admin/DetalhesSubmissao.tsx`

---

## Tarefa 1.6 — Telas de Submissões (Colaborador Frontend)

### `/collaborator/submissoes`

- Histórico de submissões do colaborador logado
- Filtro por status
- Colunas: Lista, Data, Qtd Pedidos, Status

### `/collaborator/submissoes/[id]`

- Visualização somente leitura dos pedidos e seus status
- Exibir motivo de rejeição (se houver)

### Referência Legado

- `legacy/frontend/src/features/inventory/MinhasSubmissoes.tsx`
- `legacy/frontend/src/features/inventory/DetalhesSubmissaoColaborador.tsx`

---

## Tarefa 1.7 — Gerenciar Usuários (Admin)

### Backend

```
GET  /v1/admin/usuarios                    → listar (filtros: role, aprovado, busca)
PUT  /v1/admin/usuarios/:id/aprovar        → ativa o usuário
PUT  /v1/admin/usuarios/:id/desativar      → desativa (não deleta)
PUT  /v1/admin/usuarios/:id/role           → body: { role: 'COLLABORATOR' | 'ADMIN' }
```

### Frontend

- `/admin/usuarios` → tabela com colunas: Nome, Email, Role, Status, Ações
- Ações por linha: Aprovar, Desativar, Alterar Role
- Filtros: role, aprovado/pendente

### Referência Legado

- `legacy/frontend/src/features/admin/GerenciarUsuarios.tsx` (e `.module.css`)
- `legacy/frontend/src/features/admin/UserManagement.tsx`

---

## Checkpoint Fase 1

```bash
git add .
git commit -m "feat: fluxo core de submissoes e aprovacoes"
```

Após o commit:
1. Registro historico desta fase: `1e0917d`
2. Entregas principais: submissoes, pedidos e gestao de usuarios.
