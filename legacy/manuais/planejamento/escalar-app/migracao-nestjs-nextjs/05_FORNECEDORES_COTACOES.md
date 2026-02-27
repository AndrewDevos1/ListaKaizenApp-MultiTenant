# Fase 4: Fornecedores + Cotacoes

## Objetivo

Implementar o sistema de fornecedores (com portal proprio), convites, catalogo de itens do fornecedor, historico de precos, e geracao de cotacoes.

**Referencia no app atual:**
- `frontend/src/features/admin/FornecedorManagement.tsx`
- `frontend/src/features/admin/FornecedorDetalhes.tsx`
- `frontend/src/features/admin/GerarCotacao.tsx`
- `frontend/src/features/supplier/` (9 componentes)
- `frontend/src/services/supplierApi.ts`

---

## 4.1 Prisma Schema

```prisma
model Fornecedor {
  id              Int      @id @default(autoincrement())
  nome            String
  cnpj            String?
  email           String?
  telefone        String?
  endereco        String?
  aprovado        Boolean  @default(false)
  ativo           Boolean  @default(true)
  restauranteId   Int?     @map("restaurante_id")
  compartilhado   Boolean  @default(false)
  criadoEm        DateTime @default(now()) @map("criado_em")

  restaurante     Restaurante?          @relation(fields: [restauranteId], references: [id])
  itensCodigo     FornecedorItemCodigo[]
  cotacoes        Cotacao[]
  listas          FornecedorLista[]
  usuarios        Usuario[]             @relation("FornecedorUsuarios")

  @@map("fornecedores")
}

model FornecedorItemCodigo {
  id              Int      @id @default(autoincrement())
  fornecedorId    Int      @map("fornecedor_id")
  nome            String
  codigo          String?
  unidadeMedida   String?  @map("unidade_medida")
  precoUnitario   Float?   @map("preco_unitario")
  ativo           Boolean  @default(true)
  restauranteId   Int      @map("restaurante_id")

  fornecedor      Fornecedor @relation(fields: [fornecedorId], references: [id])
  historico       ItemPrecoHistorico[]

  @@map("fornecedor_item_codigo")
}

model ItemPrecoHistorico {
  id                    Int      @id @default(autoincrement())
  fornecedorItemId      Int      @map("fornecedor_item_id")
  precoAnterior         Float?   @map("preco_anterior")
  precoNovo             Float    @map("preco_novo")
  alteradoPor           Int?     @map("alterado_por")
  criadoEm              DateTime @default(now()) @map("criado_em")

  fornecedorItem        FornecedorItemCodigo @relation(fields: [fornecedorItemId], references: [id])

  @@map("item_preco_historico")
}

model FornecedorLista {
  id              Int @id @default(autoincrement())
  fornecedorId    Int @map("fornecedor_id")
  listaId         Int @map("lista_id")

  fornecedor      Fornecedor @relation(fields: [fornecedorId], references: [id])
  lista           Lista      @relation(fields: [listaId], references: [id])

  @@unique([fornecedorId, listaId])
  @@map("fornecedor_lista")
}

model ConviteFornecedor {
  id              Int       @id @default(autoincrement())
  token           String    @unique @default(uuid())
  descricao       String?
  ativo           Boolean   @default(true)
  limiteUsos      Int?      @map("limite_usos")
  usosAtuais      Int       @default(0) @map("usos_atuais")
  restauranteId   Int       @map("restaurante_id")
  criadoEm        DateTime  @default(now()) @map("criado_em")

  @@map("convite_fornecedor")
}

enum CotacaoStatus {
  PENDENTE
  CONCLUIDA
}

model Cotacao {
  id              Int           @id @default(autoincrement())
  fornecedorId    Int           @map("fornecedor_id")
  status          CotacaoStatus @default(PENDENTE)
  restauranteId   Int           @map("restaurante_id")
  criadoEm        DateTime      @default(now()) @map("criado_em")

  fornecedor      Fornecedor    @relation(fields: [fornecedorId], references: [id])
  itens           CotacaoItem[]

  @@map("cotacoes")
}

model CotacaoItem {
  id              Int    @id @default(autoincrement())
  cotacaoId       Int    @map("cotacao_id")
  itemNome        String @map("item_nome")
  unidade         String
  quantidade      Float
  precoUnitario   Float? @map("preco_unitario")

  cotacao         Cotacao @relation(fields: [cotacaoId], references: [id])

  @@map("cotacao_itens")
}
```

---

## 4.2 NestJS Modules

### Fornecedores Module

```
apps/api/src/modules/fornecedores/
├── fornecedores.module.ts
├── fornecedores.controller.ts          # Admin CRUD
├── fornecedores-supplier.controller.ts # Portal do fornecedor
├── fornecedores.service.ts
├── convites.controller.ts              # Gestao de convites
├── convites.service.ts
└── dto/
    ├── create-fornecedor.dto.ts
    ├── create-item-fornecedor.dto.ts
    ├── create-convite.dto.ts
    └── register-fornecedor.dto.ts
```

#### Endpoints Admin

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/v1/fornecedores` | Listar fornecedores do tenant |
| `GET` | `/v1/fornecedores/:id` | Detalhes |
| `POST` | `/v1/fornecedores` | Criar |
| `PUT` | `/v1/fornecedores/:id` | Atualizar |
| `DELETE` | `/v1/fornecedores/:id` | Deletar |
| `GET` | `/v1/fornecedores/:id/itens` | Itens do fornecedor |
| `POST` | `/v1/fornecedores/:id/itens` | Adicionar item |
| `GET` | `/v1/fornecedores/:id/pedidos-consolidados` | Pedidos agrupados |
| `POST` | `/admin/convites-fornecedor` | Criar convite |
| `GET` | `/admin/convites-fornecedor` | Listar convites |

#### Endpoints Supplier (Portal)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `POST` | `/supplier/auth/register` | Registro com/sem convite |
| `POST` | `/supplier/auth/login` | Login do fornecedor |
| `GET` | `/supplier/profile` | Perfil |
| `PUT` | `/supplier/profile` | Atualizar perfil |
| `GET` | `/supplier/items` | Meus itens |
| `POST` | `/supplier/items` | Criar item |
| `PUT` | `/supplier/items/:id` | Atualizar item/preco |
| `DELETE` | `/supplier/items/:id` | Remover item |
| `GET` | `/supplier/items/:id/historico` | Historico de precos |

### Cotacoes Module

```
apps/api/src/modules/cotacoes/
├── cotacoes.module.ts
├── cotacoes.controller.ts
├── cotacoes.service.ts
└── dto/
    ├── gerar-cotacao.dto.ts
    └── update-cotacao-item.dto.ts
```

#### Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `POST` | `/admin/gerar-cotacao` | Gerar cotacao a partir do estoque |
| `GET` | `/admin/cotacoes` | Listar cotacoes |
| `GET` | `/admin/cotacoes/:id` | Detalhes com itens |
| `PUT` | `/admin/cotacoes/:id/itens/:itemId` | Atualizar preco |
| `POST` | `/admin/cotacoes/:id/concluir` | Marcar como concluida |

---

## 4.3 Next.js Frontend

### Paginas Admin

```
apps/web/src/app/(admin)/
├── fornecedores/
│   ├── page.tsx                    # Lista de fornecedores
│   └── [id]/
│       └── page.tsx                # Detalhes: itens, pedidos, convites
├── cotacoes/
│   ├── page.tsx                    # Lista de cotacoes
│   ├── gerar/page.tsx              # Gerar nova cotacao
│   └── [id]/page.tsx               # Detalhes com precos editaveis
└── convites-fornecedor/
    └── page.tsx                    # Gestao de convites
```

### Paginas Supplier (Portal)

```
apps/web/src/app/(supplier)/
├── layout.tsx                      # Layout proprio do fornecedor
├── login/page.tsx
├── register/page.tsx
├── dashboard/page.tsx
├── profile/page.tsx
└── items/
    ├── page.tsx                    # Meus itens com precos
    ├── new/page.tsx                # Criar item
    └── [id]/
        ├── edit/page.tsx           # Editar item
        └── historico/page.tsx      # Historico de precos (grafico)
```

---

## Verificacao da Fase 4

1. Admin cria fornecedores e associa a listas
2. Admin gera convites com link compartilhavel
3. Fornecedor se registra via convite
4. Fornecedor acessa portal, cadastra itens com precos
5. Historico de precos registrado automaticamente
6. Admin gera cotacao a partir de pedidos pendentes por fornecedor
7. Admin preenche precos na cotacao e conclui

## Proxima Fase

-> `06_FEATURES_AVANCADAS.md`
