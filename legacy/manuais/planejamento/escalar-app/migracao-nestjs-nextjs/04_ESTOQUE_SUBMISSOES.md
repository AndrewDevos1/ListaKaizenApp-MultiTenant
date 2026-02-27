# Fase 3: Estoque + Submissoes

## Objetivo

Implementar o fluxo principal do sistema: colaborador preenche quantidades de estoque, submete a lista, admin revisa e aprova/rejeita pedidos individuais.

**Referencia no app atual:**
- `frontend/src/features/inventory/EstoqueLista.tsx` - Preenchimento de estoque
- `frontend/src/features/admin/GerenciarSubmissoes.tsx` - Lista de submissoes
- `frontend/src/features/admin/DetalhesSubmissao.tsx` - Revisao com aprovar/rejeitar
- `frontend/src/features/inventory/MinhasSubmissoes.tsx` - Submissoes do colaborador
- `frontend/src/services/offlineDrafts.ts` - Rascunhos offline

---

## 3.1 Prisma Schema

```prisma
enum SubmissaoStatus {
  PENDENTE
  PARCIALMENTE_APROVADO
  APROVADO
  REJEITADO
}

enum PedidoStatus {
  PENDENTE
  APROVADO
  REJEITADO
}

model Estoque {
  id                Int    @id @default(autoincrement())
  itemId            Int    @map("item_id")
  areaId            Int    @map("area_id")
  listaId           Int    @map("lista_id")
  quantidadeAtual   Float  @default(0) @map("quantidade_atual")
  quantidadeMinima  Float  @default(0) @map("quantidade_minima")
  restauranteId     Int    @map("restaurante_id")

  item              Item   @relation(fields: [itemId], references: [id])
  area              Area   @relation(fields: [areaId], references: [id])
  lista             Lista  @relation(fields: [listaId], references: [id])

  @@unique([itemId, areaId, listaId])
  @@map("estoque")
}

model Submissao {
  id              Int              @id @default(autoincrement())
  listaId         Int              @map("lista_id")
  usuarioId       Int              @map("usuario_id")
  status          SubmissaoStatus  @default(PENDENTE)
  arquivada       Boolean          @default(false)
  arquivadaEm     DateTime?        @map("arquivada_em")
  restauranteId   Int              @map("restaurante_id")
  criadoEm        DateTime         @default(now()) @map("criado_em")

  lista           Lista    @relation(fields: [listaId], references: [id])
  usuario         Usuario  @relation(fields: [usuarioId], references: [id])
  pedidos         Pedido[]

  @@map("submissoes")
}

model Pedido {
  id                     Int           @id @default(autoincrement())
  submissaoId            Int           @map("submissao_id")
  estoqueId              Int           @map("estoque_id")
  itemNome               String        @map("item_nome")
  unidade                String
  quantidadeSolicitada   Float         @map("quantidade_solicitada")
  status                 PedidoStatus  @default(PENDENTE)
  restauranteId          Int           @map("restaurante_id")
  criadoEm               DateTime      @default(now()) @map("criado_em")

  submissao              Submissao @relation(fields: [submissaoId], references: [id])

  @@map("pedidos")
}
```

---

## 3.2 NestJS Modules

### Estoque Module

```
apps/api/src/modules/estoque/
├── estoque.module.ts
├── estoque.controller.ts       # Endpoints collaborator
├── estoque-admin.controller.ts # Endpoints admin
├── estoque.service.ts
└── dto/
    ├── update-quantidade.dto.ts
    └── save-draft.dto.ts
```

#### Endpoints Collaborator

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/collaborator/areas/:areaId/estoque` | Itens da area do colaborador |
| `GET` | `/collaborator/listas/:listaId/estoque` | Itens da lista |
| `POST` | `/v1/estoque/draft` | Salvar rascunho de quantidades |

#### Endpoints Admin

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/admin/estoque/area/:areaId` | Ver estoque de uma area |
| `PUT` | `/admin/estoque/:id` | Editar estoque manualmente |

### Submissoes Module

```
apps/api/src/modules/submissoes/
├── submissoes.module.ts
├── submissoes.controller.ts         # Admin endpoints
├── submissoes-collab.controller.ts  # Collaborator endpoints
├── submissoes.service.ts
└── dto/
    ├── submit-lista.dto.ts
    └── edit-submissao.dto.ts
```

#### Endpoints Admin

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/admin/submissoes` | Listar todas (com filtro de status) |
| `GET` | `/admin/submissoes/:id` | Detalhes com pedidos |
| `POST` | `/admin/submissoes/:id/aprovar` | Aprovar submissao inteira |
| `POST` | `/admin/submissoes/:id/rejeitar` | Rejeitar submissao inteira |
| `POST` | `/admin/submissoes/:id/arquivar` | Arquivar |
| `POST` | `/admin/submissoes/:id/desarquivar` | Desarquivar |
| `PUT` | `/admin/submissoes/:id/editar` | Editar quantidades (admin) |

#### Endpoints Pedidos (dentro de submissoes)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `POST` | `/admin/pedidos/:id/aprovar` | Aprovar pedido individual |
| `POST` | `/admin/pedidos/:id/rejeitar` | Rejeitar pedido individual |
| `POST` | `/admin/pedidos/aprovar-lote` | Aprovar varios de uma vez |
| `POST` | `/admin/pedidos/rejeitar-lote` | Rejeitar varios |
| `PUT` | `/admin/pedidos/:id` | Editar pedido |

#### Endpoints Collaborator

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `POST` | `/v1/pedidos/submit` | Submeter lista (cria submissao + pedidos) |
| `GET` | `/v1/submissoes/me` | Minhas submissoes |
| `PUT` | `/v1/submissoes/:id` | Editar submissao pendente |

### Logica Principal - Submit

```typescript
// submissoes.service.ts - metodo submit (logica core)
async submitLista(listaId: number, userId: number, items: SubmitItemDto[]) {
  // 1. Atualizar quantidades no estoque
  for (const item of items) {
    await this.prisma.estoque.update({
      where: { id: item.estoqueId },
      data: { quantidadeAtual: item.quantidadeAtual },
    });
  }

  // 2. Calcular quais itens precisam de pedido (qtd_atual < qtd_minima)
  const estoqueItems = await this.prisma.estoque.findMany({
    where: { listaId },
    include: { item: true },
  });

  const pedidosData = estoqueItems
    .filter((e) => e.quantidadeAtual < e.quantidadeMinima)
    .map((e) => ({
      estoqueId: e.id,
      itemNome: e.item.nome,
      unidade: e.item.unidadeMedida,
      quantidadeSolicitada: e.quantidadeMinima - e.quantidadeAtual,
      restauranteId: e.restauranteId,
    }));

  // 3. Criar submissao com pedidos
  const submissao = await this.prisma.submissao.create({
    data: {
      listaId,
      usuarioId: userId,
      restauranteId: estoqueItems[0]?.restauranteId,
      pedidos: {
        create: pedidosData,
      },
    },
    include: { pedidos: true },
  });

  return {
    message: 'Lista submetida com sucesso',
    submissaoId: submissao.id,
    pedidosCriados: submissao.pedidos.length,
  };
}
```

---

## 3.3 Next.js Frontend

### Paginas

```
apps/web/src/app/
├── (admin)/
│   ├── submissoes/
│   │   ├── page.tsx              # Lista de submissoes (filtros por status)
│   │   └── [id]/
│   │       └── page.tsx          # Detalhes: aprovar/rejeitar pedidos
│   └── pedidos/
│       └── page.tsx              # Todos os pedidos (visao consolidada)
│
└── (collaborator)/
    ├── areas/
    │   └── [areaId]/
    │       └── estoque/
    │           └── page.tsx      # Preenchimento de estoque (inputs)
    ├── listas/
    │   └── [listaId]/
    │       └── estoque/
    │           └── page.tsx      # Preenchimento por lista
    └── submissions/
        ├── page.tsx              # Minhas submissoes
        └── [id]/
            └── page.tsx          # Detalhes da minha submissao
```

### Feature de Offline Drafts

Portar `services/offlineDrafts.ts` do projeto atual sem mudancas (ja e TypeScript puro, nao depende de React):

```typescript
// apps/web/src/lib/offlineDrafts.ts
// Copiar direto de frontend/src/services/offlineDrafts.ts
// Funcoes: saveOfflineDraft, getOfflineDraft, removeOfflineDraft, mergeDraftItems, isOfflineError
```

---

## Verificacao da Fase 3

1. Collaborator entra na area, ve itens do estoque com inputs de quantidade
2. Collaborator preenche quantidades e salva rascunho (online e offline)
3. Collaborator submete lista -> cria submissao com pedidos automaticos
4. Admin ve submissoes pendentes na lista
5. Admin abre submissao -> ve tabela de pedidos com botoes aprovar/rejeitar
6. Admin aprova/rejeita pedidos individuais -> status da submissao atualiza
7. Itens rejeitados aparecem em secao separada (como implementado no app atual)
8. Collaborator ve status das suas submissoes

## Proxima Fase

-> `05_FORNECEDORES_COTACOES.md`
