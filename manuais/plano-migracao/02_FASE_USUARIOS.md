# 02 — Fase 2: Fornecedores e Catálogo

## Objetivo

Adicionar gestão de fornecedores e vincular itens do catálogo a eles. Também configurar
campos avançados de lista (threshold e quantidade por fardo).

---

## Tarefa 2.1 — Modelo Fornecedor (Schema Prisma)

### Alterações em `schema.prisma`

```prisma
model Fornecedor {
  id            String      @id @default(cuid())
  nome          String
  cnpj          String?
  telefone      String?
  email         String?
  ativo         Boolean     @default(true)
  restaurante   Restaurante @relation(fields: [restauranteId], references: [id])
  restauranteId String
  itens         Item[]
  criadoEm     DateTime    @default(now())
  atualizadoEm DateTime    @updatedAt
}
```

Atualizar `Item` para incluir relação opcional com fornecedor:

```prisma
model Item {
  // campos existentes...
  fornecedor   Fornecedor? @relation(fields: [fornecedorId], references: [id])
  fornecedorId String?
}
```

### Migration

```bash
npx prisma migrate dev --name add-fornecedores
```

---

## Tarefa 2.2 — CRUD de Fornecedores (Backend)

### Módulo NestJS

Criar `src/fornecedores/` com:
- `fornecedores.module.ts`
- `fornecedores.controller.ts`
- `fornecedores.service.ts`
- `dto/create-fornecedor.dto.ts`
- `dto/update-fornecedor.dto.ts`

### Endpoints

```
GET    /v1/admin/fornecedores            → listar (filtros: ativo, busca por nome/cnpj)
GET    /v1/admin/fornecedores/:id        → detalhe com itens vinculados
POST   /v1/admin/fornecedores            → criar
PUT    /v1/admin/fornecedores/:id        → atualizar
DELETE /v1/admin/fornecedores/:id        → desativar (soft delete: ativo = false)
```

### Isolamento

- Todos os endpoints filtram por `restauranteId` do admin logado
- Fornecedores de outros restaurantes são invisíveis

### Referência Legado

- `legacy/backend/kaizen_app/models.py` (modelo `Fornecedor`)
- `legacy/backend/kaizen_app/services.py` (serviço de fornecedores)

---

## Tarefa 2.2 — CRUD de Fornecedores (Frontend)

### `/admin/fornecedores`

- Tabela com colunas: Nome, CNPJ, Telefone, Email, Qtd Itens, Status, Ações
- Ações: Editar, Desativar/Reativar, Ver Itens
- Botão "Novo Fornecedor" → modal ou página de criação

### `/admin/fornecedores/[id]`

- Detalhe do fornecedor
- Lista de itens vinculados

### Referência Legado

- `legacy/frontend/src/features/admin/FornecedorManagement.tsx`
- `legacy/frontend/src/features/admin/FornecedorDetalhes.tsx`

---

## Tarefa 2.3 — Vínculo Item ↔ Fornecedor no Catálogo

### Backend

- Atualizar `PUT /v1/admin/itens/:id` para aceitar `fornecedorId` (opcional)
- Atualizar `GET /v1/admin/itens` para incluir `fornecedor` na resposta
- Adicionar filtro `?fornecedorId=` na listagem de itens

### Frontend

- Atualizar form de criação/edição de item para incluir select de fornecedor
- Adicionar filtro por fornecedor na tela `/admin/itens` (ou `/admin/catalogo`)
- Exibir nome do fornecedor na tabela de itens

---

## Tarefa 2.4 — Configurações de Lista (Threshold e Fardo)

### Schema

Atualizar `ListaItemRef`:

```prisma
model ListaItemRef {
  // campos existentes...
  usaThreshold Boolean @default(true)
  qtdFardo     Float?
}
```

### Migration

```bash
npx prisma migrate dev --name add-lista-item-config
```

### Backend

- Atualizar `PUT /v1/admin/listas/:id/itens/:itemRefId` para aceitar `usaThreshold` e `qtdFardo`
- Lógica de submissão (tarefa 1.3): respeitar `usaThreshold` — se `false`, não gerar pedido para esse item

### Frontend

- Edição inline na tela de gerenciar itens da lista (`/admin/listas/[id]`)
- Colunas adicionais: "Usa Threshold" (toggle) e "Qtd/Fardo" (input numérico)
- Salvar ao sair do campo (blur) ou com botão explícito

---

## Checkpoint Fase 2

```bash
git add .
git commit -m "feat: fornecedores e configuracao de threshold em listas"
```

Após o commit:
1. Anotar o hash: `git log --oneline -1`
2. Atualizar `PONTEIRO.md`:
   - Status: `FASE 3 — não iniciada`
   - Última tarefa concluída: `2.4 — Configurações de Lista`
   - Próximo passo: `Iniciar Fase 3 — Tarefa 3.1`
   - Última branch/commit: `<hash>`
