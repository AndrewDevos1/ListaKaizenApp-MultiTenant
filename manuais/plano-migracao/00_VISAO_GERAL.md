# 00 — Visão Geral da Migração

## Objetivo

Portar o fluxo de negócio completo do projeto legado (Flask + React Bootstrap) para o novo projeto multi-tenant (NestJS + Prisma + Next.js 15 + React Bootstrap), mantendo isolamento total por restaurante e suporte a múltiplos roles.

---

## Stack do Projeto Multi-Tenant

| Camada | Tecnologia |
|--------|-----------|
| Backend API | NestJS (TypeScript) |
| ORM / DB | Prisma + PostgreSQL |
| Frontend | Next.js 15 (App Router) + React Bootstrap |
| Auth | JWT (access + refresh tokens) |
| Build/Run | pnpm / node |

---

## O Que Já Existe vs O Que Falta

### Já Implementado

- Auth JWT com refresh token
- RBAC com 4 roles: `SUPER_ADMIN`, `ADMIN`, `COLLABORATOR`, `FORNECEDOR`
- Isolamento por `restauranteId` em todas as entidades
- CRUD de Restaurantes (SUPER_ADMIN)
- CRUD de Listas e `ListaItemRef` (admin)
- CRUD de Itens / Catálogo (admin)
- CRUD de Áreas (admin)
- Navbar responsiva com sidebar
- Estrutura de módulos NestJS consolidada

### A Implementar (por fase)

Ver tabela completa abaixo.

---

## Tabela de Módulos

| Módulo | Backend | Frontend | Prioridade |
|--------|---------|----------|------------|
| Auth + JWT | ✅ | ✅ | — |
| Listas (CRUD admin) | ✅ | ✅ | — |
| Itens / Catálogo | ✅ | ✅ | — |
| Áreas | ✅ | ✅ | — |
| Atualização de estoque (colaborador) | ❌ | ❌ | FASE 1 |
| Submissões + Aprovação | ❌ | ❌ | FASE 1 |
| Gerenciar Usuários (aprovação) | ❌ | ❌ | FASE 1 |
| Fornecedores (CRUD) | ❌ | ❌ | FASE 2 |
| Vínculo Item ↔ Fornecedor | ❌ | ❌ | FASE 2 |
| Cotações | ❌ | ❌ | FASE 3 |
| Merge WhatsApp | ❌ | ❌ | FASE 3 |
| Checklists | ❌ | ❌ | FASE 3 |
| Listas Rápidas | ❌ | ❌ | FASE 4 |
| Sugestões de Itens | ❌ | ❌ | FASE 4 |
| POPs | ❌ | ❌ | FASE 4 |
| Notificações | ❌ | ❌ | FASE 5 |
| Convites | ❌ | ❌ | FASE 5 |
| Import / Export CSV | ❌ | ❌ | FASE 5 |
| Auditoria / Logs | ❌ | ❌ | FASE 5 |
| Offline / PWA | ❌ | ❌ | FASE 5 |

---

## Convenções de Código

### NestJS (Backend)

- Cada domínio vira um módulo: `src/modulo/modulo.module.ts`
- Arquivos por módulo: `controller`, `service`, `dto`, `entity` (opcional — Prisma é a fonte de verdade)
- Guards: `JwtAuthGuard` + `RolesGuard` em todos os endpoints protegidos
- Prefixo global de rotas: `/v1`
- DTOs validados com `class-validator`

### Next.js (Frontend)

- App Router: `app/(auth)/`, `app/(admin)/`, `app/(collaborator)/`
- Componentes de página em `app/.../page.tsx`
- Componentes reutilizáveis em `components/`
- Chamadas de API centralizadas em `lib/api/`
- Estilos: React Bootstrap + CSS Modules onde necessário

### Naming

- Arquivos: `kebab-case`
- Classes/Componentes: `PascalCase`
- Variáveis/funções: `camelCase`
- Enums Prisma: `SCREAMING_SNAKE_CASE`
- Rotas de API: `/v1/admin/...` ou `/v1/collaborator/...`

---

## Como Rodar o Projeto Localmente

```bash
# Backend
cd backend
cp .env.example .env   # configurar DATABASE_URL e JWT secrets
pnpm install
npx prisma migrate dev
pnpm run start:dev

# Frontend
cd frontend
cp .env.example .env.local   # configurar NEXT_PUBLIC_API_URL
pnpm install
pnpm run dev
```

---

## Como Fazer um Checkpoint

```bash
# 1. Verificar o que está pronto
git status

# 2. Commitar tudo relacionado à fase
git add .
git commit -m "feat: <descrição da fase>"

# 3. Anotar o hash curto
git log --oneline -1

# 4. Atualizar PONTEIRO.md com o hash e o próximo passo
```

### Padrão de Branches por Fase

| Fase | Branch sugerida |
|------|----------------|
| Fase 1 | `feat/submissoes-core` |
| Fase 2 | `feat/fornecedores` |
| Fase 3 | `feat/cotacoes-merge` |
| Fase 4 | `feat/modulos-extras` |
| Fase 5 | `feat/infra-avancada` |

---

## Arquivos Críticos de Referência (Legado)

| O que buscar | Onde está no legado |
|---|---|
| Lógica de cálculo de pedido | `legacy/backend/kaizen_app/services.py` |
| Lógica de status de submissão | `legacy/backend/kaizen_app/services.py` |
| Tela de estoque colaborador | `legacy/frontend/src/features/inventory/` |
| Tela de submissões admin | `legacy/frontend/src/features/admin/` |
| Schema completo do BD | `legacy/backend/kaizen_app/models.py` |
| Endpoints de referência | `legacy/manuais/replicando-app/09_ENDPOINTS_REFERENCIA.md` |
