# Fase 2: Listas + Itens (Primeira Feature Full-Stack)

## Objetivo

Implementar a primeira feature completa de ponta a ponta: CRUD de Itens, Areas e Listas com atribuicao de colaboradores. Isso estabelece o padrao que todas as features seguintes vao usar.

**Referencia no app atual:**
- `backend/kaizen_app/services.py` - funcoes de item, area e lista
- `frontend/src/features/admin/ItemManagement.tsx`
- `frontend/src/features/admin/AreaManagement.tsx`
- `frontend/src/features/admin/ListasCompras.tsx`
- `frontend/src/features/admin/GerenciarItensLista.tsx`

---

## 2.1 Prisma Schema - Modelos da Feature

Adicionar ao `schema.prisma` existente:

```prisma
model Item {
  id              Int      @id @default(autoincrement())
  nome            String
  unidadeMedida   String   @map("unidade_medida")
  ativo           Boolean  @default(true)
  restauranteId   Int      @map("restaurante_id")
  criadoEm        DateTime @default(now()) @map("criado_em")

  restaurante     Restaurante @relation(fields: [restauranteId], references: [id])
  listasRef       ListaItemRef[]

  @@map("itens")
}

model Area {
  id              Int      @id @default(autoincrement())
  nome            String
  restauranteId   Int      @map("restaurante_id")
  criadoEm        DateTime @default(now()) @map("criado_em")

  restaurante     Restaurante @relation(fields: [restauranteId], references: [id])

  @@map("areas")
}

model Lista {
  id              Int       @id @default(autoincrement())
  nome            String
  restauranteId   Int       @map("restaurante_id")
  deletado        Boolean   @default(false)
  dataDelecao     DateTime? @map("data_delecao")
  criadoEm        DateTime  @default(now()) @map("criado_em")

  restaurante     Restaurante @relation(fields: [restauranteId], references: [id])
  colaboradores   ListaColaborador[]
  itensRef        ListaItemRef[]

  @@map("listas")
}

model ListaColaborador {
  id        Int  @id @default(autoincrement())
  listaId   Int  @map("lista_id")
  usuarioId Int  @map("usuario_id")

  lista     Lista   @relation(fields: [listaId], references: [id])
  usuario   Usuario @relation(fields: [usuarioId], references: [id])

  @@unique([listaId, usuarioId])
  @@map("lista_colaborador")
}

model ListaItemRef {
  id                Int    @id @default(autoincrement())
  listaId           Int    @map("lista_id")
  itemId            Int    @map("item_id")
  quantidadeMinima  Float  @default(0) @map("quantidade_minima")
  quantidadeAtual   Float  @default(0) @map("quantidade_atual")

  lista   Lista @relation(fields: [listaId], references: [id])
  item    Item  @relation(fields: [itemId], references: [id])

  @@unique([listaId, itemId])
  @@map("lista_item_ref")
}
```

**Rodar migration:**
```bash
cd apps/api
npx prisma migrate dev --name add-items-areas-listas
```

---

## 2.2 NestJS - Items Module

```
apps/api/src/modules/items/
├── items.module.ts
├── items.controller.ts
├── items.service.ts
└── dto/
    ├── create-item.dto.ts
    └── update-item.dto.ts
```

### DTOs

```typescript
// dto/create-item.dto.ts
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateItemDto {
  @ApiProperty({ example: 'Arroz 5kg' })
  @IsString()
  nome: string;

  @ApiProperty({ example: 'un' })
  @IsString()
  unidadeMedida: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}

// dto/update-item.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateItemDto } from './create-item.dto';

export class UpdateItemDto extends PartialType(CreateItemDto) {}
```

### Service

```typescript
// items.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async findAll(restauranteId: number) {
    return this.prisma.item.findMany({
      where: { restauranteId, ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: number, restauranteId: number) {
    const item = await this.prisma.item.findFirst({
      where: { id, restauranteId },
    });
    if (!item) throw new NotFoundException('Item nao encontrado');
    return item;
  }

  async create(dto: CreateItemDto, restauranteId: number) {
    return this.prisma.item.create({
      data: { ...dto, restauranteId },
    });
  }

  async update(id: number, dto: UpdateItemDto, restauranteId: number) {
    await this.findOne(id, restauranteId); // garante que existe
    return this.prisma.item.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, restauranteId: number) {
    await this.findOne(id, restauranteId);
    return this.prisma.item.update({
      where: { id },
      data: { ativo: false }, // soft delete
    });
  }

  async search(query: string, restauranteId: number) {
    return this.prisma.item.findMany({
      where: {
        restauranteId,
        ativo: true,
        nome: { contains: query, mode: 'insensitive' },
      },
      orderBy: { nome: 'asc' },
      take: 20,
    });
  }
}
```

### Controller

```typescript
// items.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant-id.decorator';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@ApiTags('Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('v1/items')
export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  @Get()
  findAll(@TenantId() tenantId: number) {
    return this.itemsService.findAll(tenantId);
  }

  @Get('search')
  search(@Query('q') query: string, @TenantId() tenantId: number) {
    return this.itemsService.search(query, tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @TenantId() tenantId: number) {
    return this.itemsService.findOne(id, tenantId);
  }

  @Post()
  create(@Body() dto: CreateItemDto, @TenantId() tenantId: number) {
    return this.itemsService.create(dto, tenantId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemDto,
    @TenantId() tenantId: number,
  ) {
    return this.itemsService.update(id, dto, tenantId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @TenantId() tenantId: number) {
    return this.itemsService.remove(id, tenantId);
  }
}
```

### Endpoints

| Metodo | Rota | Descricao | Roles |
|--------|------|-----------|-------|
| `GET` | `/v1/items` | Listar itens do tenant | ADMIN |
| `GET` | `/v1/items/search?q=` | Buscar itens | ADMIN |
| `GET` | `/v1/items/:id` | Detalhes do item | ADMIN |
| `POST` | `/v1/items` | Criar item | ADMIN |
| `PUT` | `/v1/items/:id` | Atualizar item | ADMIN |
| `DELETE` | `/v1/items/:id` | Soft delete | ADMIN |

---

## 2.3 NestJS - Areas Module

Mesma estrutura do Items Module. Endpoints:

| Metodo | Rota | Descricao | Roles |
|--------|------|-----------|-------|
| `GET` | `/v1/areas` | Listar areas | ADMIN |
| `GET` | `/v1/areas/:id` | Detalhes | ADMIN |
| `POST` | `/v1/areas` | Criar | ADMIN |
| `PUT` | `/v1/areas/:id` | Atualizar | ADMIN |
| `DELETE` | `/v1/areas/:id` | Deletar | ADMIN |

---

## 2.4 NestJS - Listas Module

```
apps/api/src/modules/listas/
├── listas.module.ts
├── listas.controller.ts       # Admin endpoints
├── listas-collab.controller.ts # Collaborator endpoints
├── listas.service.ts
└── dto/
    ├── create-lista.dto.ts
    ├── update-lista.dto.ts
    ├── assign-colaboradores.dto.ts
    └── add-item-lista.dto.ts
```

### Endpoints Admin

| Metodo | Rota | Descricao | Roles |
|--------|------|-----------|-------|
| `GET` | `/v1/listas` | Listar listas | ADMIN |
| `GET` | `/v1/listas/:id` | Detalhes + itens | ADMIN |
| `POST` | `/v1/listas` | Criar lista | ADMIN |
| `PUT` | `/v1/listas/:id` | Atualizar | ADMIN |
| `DELETE` | `/v1/listas/:id` | Soft delete | ADMIN |
| `POST` | `/v1/listas/:id/colaboradores` | Atribuir colaboradores | ADMIN |
| `DELETE` | `/v1/listas/:id/colaboradores/:userId` | Remover colaborador | ADMIN |
| `POST` | `/v1/listas/:id/itens` | Adicionar item | ADMIN |
| `DELETE` | `/v1/listas/:id/itens/:itemId` | Remover item | ADMIN |
| `GET` | `/v1/listas/:id/itens` | Listar itens | ADMIN |

### Endpoints Collaborator

| Metodo | Rota | Descricao | Roles |
|--------|------|-----------|-------|
| `GET` | `/collaborator/minhas-listas` | Listas atribuidas | COLLABORATOR |
| `GET` | `/collaborator/listas/:id` | Detalhes da lista | COLLABORATOR |

### Service (principais metodos)

```typescript
// listas.service.ts (estrutura)
@Injectable()
export class ListasService {
  // Admin
  async findAll(restauranteId: number) { /* ... */ }
  async findOne(id: number, restauranteId: number) { /* ... */ }
  async create(dto: CreateListaDto, restauranteId: number) { /* ... */ }
  async update(id: number, dto: UpdateListaDto, restauranteId: number) { /* ... */ }
  async softDelete(id: number, restauranteId: number) { /* ... */ }

  // Colaboradores
  async assignColaboradores(listaId: number, userIds: number[], restauranteId: number) { /* ... */ }
  async removeColaborador(listaId: number, userId: number, restauranteId: number) { /* ... */ }

  // Itens da lista
  async addItem(listaId: number, dto: AddItemListaDto, restauranteId: number) { /* ... */ }
  async removeItem(listaId: number, itemId: number, restauranteId: number) { /* ... */ }
  async getItens(listaId: number, restauranteId: number) { /* ... */ }

  // Collaborator
  async getMinhasListas(userId: number) { /* ... */ }
}
```

---

## 2.5 Next.js Frontend

### Paginas (App Router)

```
apps/web/src/app/
├── layout.tsx                          # Root layout com providers
├── page.tsx                            # Redirect para login ou dashboard
│
├── (auth)/
│   ├── layout.tsx                      # Layout simples (sem sidebar)
│   ├── login/page.tsx
│   └── register/page.tsx
│
├── (admin)/
│   ├── layout.tsx                      # Layout com sidebar admin
│   ├── dashboard/page.tsx
│   ├── items/
│   │   └── page.tsx                    # CRUD de itens (tabela + modal)
│   ├── areas/
│   │   └── page.tsx                    # CRUD de areas
│   ├── listas/
│   │   ├── page.tsx                    # Lista de listas
│   │   └── [id]/
│   │       └── page.tsx               # Detalhes: itens + colaboradores
│   └── users/
│       └── page.tsx                    # Gestao de usuarios
│
└── (collaborator)/
    ├── layout.tsx                      # Layout com sidebar collaborator
    ├── dashboard/page.tsx
    └── listas/
        └── page.tsx                    # Minhas listas
```

### API Client

```typescript
// apps/web/src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

// Interceptor para JWT
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor para erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
```

### Auth Context

```typescript
// apps/web/src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

interface User {
  id: number;
  nome: string;
  email: string;
  role: string;
  restauranteId: number | null;
  restauranteNome: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isCollaborator: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.get('/auth/profile')
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem('accessToken'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, senha: string) => {
    const res = await api.post('/auth/login', { email, senha });
    localStorage.setItem('accessToken', res.data.accessToken);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
      isCollaborator: user?.role === 'COLLABORATOR',
      isSuperAdmin: user?.role === 'SUPER_ADMIN',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### Componentes Reutilizaveis do Projeto Atual

Copiar com minimas alteracoes (ja sao TSX):

| Componente atual | Acao | Notas |
|------------------|------|-------|
| `utils/dateFormatter.ts` | Copiar direto | Nenhuma mudanca necessaria |
| `utils/quantityParser.ts` | Copiar direto | Nenhuma mudanca necessaria |
| `components/Spinner.tsx` | Adaptar | Trocar Bootstrap por Tailwind |
| `components/ResponsiveTable.tsx` | Adaptar | Componente grande, vale reescrever |
| `components/Breadcrumbs.tsx` | Adaptar | Usar Next.js `usePathname` |

### Exemplo de Pagina Admin - Itens

```typescript
// apps/web/src/app/(admin)/items/page.tsx
'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Item {
  id: number;
  nome: string;
  unidadeMedida: string;
  ativo: boolean;
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/v1/items')
      .then((res) => setItems(res.data))
      .finally(() => setLoading(false));
  }, []);

  // ... render tabela, modal de criar/editar, etc.
}
```

---

## Verificacao da Fase 2

1. Admin cria/edita/deleta itens via interface
2. Admin cria/edita/deleta areas
3. Admin cria listas, atribui colaboradores, adiciona itens
4. Collaborator ve suas listas atribuidas
5. Dados isolados por tenant (admin do restaurante A nao ve dados do B)
6. Swagger documenta todos os endpoints
7. Frontend navega entre paginas sem erro
8. Auth guard redireciona nao-autenticados para login

## Proxima Fase

-> `04_ESTOQUE_SUBMISSOES.md` - Core business: estoque e submissoes
