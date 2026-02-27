# 03 — Fase 3: Cotações, Merge e Checklists

## Objetivo

Adicionar as ferramentas operacionais do dia a dia do admin: consolidar pedidos de múltiplas
submissões em um texto para WhatsApp, gerar cotações por fornecedor e converter submissões
aprovadas em checklists de recebimento.

---

## Tarefa 3.1 — Merge para WhatsApp

### Backend

```
POST /v1/admin/submissoes/merge-preview
  Body: { submissaoIds: string[] }
  Retorna: lista de itens agrupados por itemId com soma de quantidades e breakdown por submissão

POST /v1/admin/submissoes/merge-whatsapp
  Body: { submissaoIds: string[], titulo?: string }
  Retorna: { texto: string } — texto formatado pronto para colar no WhatsApp
```

### Lógica de Agrupamento

```
Para cada submissão selecionada:
  Para cada pedido (status APROVADO ou PENDENTE, conforme configuração):
    Agrupar por Item.nome
    Somar qtdSolicitada
    Guardar breakdown: [{ submissaoId, colaboradorNome, qtd }]

Texto final:
  *Pedido — {data}*
  {titulo}

  • {item}: {qtdTotal} {unidade}
    _(Lista X: 2, Lista Y: 3)_
```

### Frontend

Modal em 3 etapas na tela `/admin/submissoes`:

1. **Selecionar:** checkbox por submissão
2. **Preview:** tabela agrupada com totais e breakdown
3. **Copiar:** textarea com o texto final, botão "Copiar para Área de Transferência"

### Referência Legado

- `legacy/frontend/src/features/admin/GerenciarPedidos.tsx`

---

## Tarefa 3.2 — Modelo Cotação (Schema Prisma)

```prisma
enum StatusCotacao {
  ABERTA
  FECHADA
}

model Cotacao {
  id            String       @id @default(cuid())
  titulo        String?
  status        StatusCotacao @default(ABERTA)
  restaurante   Restaurante  @relation(fields: [restauranteId], references: [id])
  restauranteId String
  itens         CotacaoItem[]
  criadoEm     DateTime     @default(now())
  atualizadoEm DateTime     @updatedAt
}

model CotacaoItem {
  id             String    @id @default(cuid())
  cotacao        Cotacao   @relation(fields: [cotacaoId], references: [id])
  cotacaoId      String
  item           Item      @relation(fields: [itemId], references: [id])
  itemId         String
  fornecedor     Fornecedor? @relation(fields: [fornecedorId], references: [id])
  fornecedorId   String?
  qtdSolicitada  Float
  precoUnitario  Float?
  criadoEm      DateTime  @default(now())
  atualizadoEm  DateTime  @updatedAt
}
```

### Migration

```bash
npx prisma migrate dev --name add-cotacoes
```

---

## Tarefa 3.3 — CRUD de Cotações (Backend e Frontend)

### Backend

```
POST /v1/admin/cotacoes
  Body: { titulo?: string, submissaoIds?: string[] }
  Lógica: agrupa pedidos aprovados por fornecedor; cria CotacaoItem por item

GET  /v1/admin/cotacoes          → listar com filtro de status
GET  /v1/admin/cotacoes/:id      → detalhe com itens e fornecedores
PUT  /v1/admin/cotacao-itens/:id → body: { precoUnitario: number }
PUT  /v1/admin/cotacoes/:id/fechar
```

### Frontend

- `/admin/cotacoes` → tabela de cotações (Título, Data, Status, Total Estimado, Ações)
- `/admin/cotacoes/[id]` → detalhe com tabela de itens; edição inline de preço unitário; total calculado

### Referência Legado

- `legacy/frontend/src/features/admin/CotacaoList.tsx`
- `legacy/frontend/src/features/admin/CotacaoDetail.tsx`

---

## Tarefa 3.4 — Modelo Checklist (Schema Prisma)

```prisma
enum StatusChecklist {
  ABERTO
  FINALIZADO
}

model Checklist {
  id            String          @id @default(cuid())
  submissao     Submissao       @relation(fields: [submissaoId], references: [id])
  submissaoId   String          @unique
  status        StatusChecklist @default(ABERTO)
  restaurante   Restaurante     @relation(fields: [restauranteId], references: [id])
  restauranteId String
  itens         ChecklistItem[]
  criadoEm     DateTime        @default(now())
  atualizadoEm DateTime        @updatedAt
}

model ChecklistItem {
  id          String    @id @default(cuid())
  checklist   Checklist @relation(fields: [checklistId], references: [id])
  checklistId String
  item        Item      @relation(fields: [itemId], references: [id])
  itemId      String
  qtdPedida   Float
  marcado     Boolean   @default(false)
  criadoEm   DateTime  @default(now())
}
```

### Migration

```bash
npx prisma migrate dev --name add-checklists
```

---

## Tarefa 3.5 — CRUD de Checklists (Backend e Frontend)

### Backend

```
POST /v1/admin/checklists
  Body: { submissaoId: string }
  Lógica: copia pedidos APROVADOS da submissão para ChecklistItems

GET  /v1/admin/checklists           → listar
GET  /v1/admin/checklists/:id       → detalhe com itens
PUT  /v1/admin/checklist-itens/:id/marcar   → toggle marcado
PUT  /v1/admin/checklists/:id/finalizar     → status = FINALIZADO
```

### Frontend

- Botão "Converter em Checklist" no detalhe da submissão aprovada (`/admin/submissoes/[id]`)
- `/admin/checklists` → tabela de checklists
- `/admin/checklists/[id]` → lista de itens com checkbox; botão Finalizar

### Referência Legado

- `legacy/frontend/src/features/admin/GerenciarChecklists.tsx`
- `legacy/frontend/src/features/admin/DetalhesChecklist.tsx`

---

## Checkpoint Fase 3

```bash
git add .
git commit -m "feat: merge whatsapp, cotacoes e checklists"
```

Após o commit:
1. Anotar o hash: `git log --oneline -1`
2. Atualizar `PONTEIRO.md`:
   - Status: `FASE 4 — não iniciada`
   - Última tarefa concluída: `3.5 — CRUD de Checklists`
   - Próximo passo: `Iniciar Fase 4 — Tarefa 4.1`
   - Última branch/commit: `<hash>`
