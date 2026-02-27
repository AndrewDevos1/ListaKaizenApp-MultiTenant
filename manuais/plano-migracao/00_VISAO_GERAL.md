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

| Módulo | Backend | Frontend | Status |
|--------|---------|----------|--------|
| Auth + JWT | ✅ | ✅ | Concluído |
| Listas (CRUD admin) | ✅ | ✅ | Concluído |
| Itens / Catálogo | ✅ | ✅ | Concluído |
| Áreas | ✅ | ✅ | Concluído |
| Atualização de estoque (colaborador) | ✅ | ✅ | Fase 1 |
| Submissões + Aprovação | ✅ | ✅ | Fase 1 |
| Gerenciar Usuários (aprovação) | ✅ | ✅ | Fase 1 |
| Fornecedores (CRUD) | ✅ | ✅ | Fase 2 |
| Vínculo Item ↔ Fornecedor | ✅ | ✅ | Fase 2 |
| Cotações | ✅ | ✅ | Fase 3 |
| Merge WhatsApp | ✅ | ✅ | Fase 3 |
| Checklists | ✅ | ✅ | Fase 3 |
| Listas Rápidas | ✅ | ✅ | Fase 4 |
| Sugestões de Itens | ✅ | ✅ | Fase 4 |
| POPs | ✅ | ✅ | Fase 4 |
| Notificações | ✅ | ✅ | Fase 5 |
| Convites | ✅ | ✅ | Fase 5 |
| Export CSV | ✅ | ✅ | Fase 5 |
| Auditoria / Logs | ✅ | ✅ | Fase 5 |
| Editar Perfil + Mudar Senha | ✅ | ✅ | Pós-migração |
| Dashboard Global (SUPER_ADMIN) | ✅ | ✅ | Pós-migração |
| Catálogo Global | ✅ | ✅ | Pós-migração |
| Estatísticas de Estoque | ✅ | ✅ | Pós-migração |
| Toast global (UX) | — | ✅ | Melhoria UX |
| Import CSV | ✅ | ⏳ | Pendente |
| Offline / PWA | — | ⏳ | Planejado |

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
# Na raiz do monorepo — roda API (porta 3001) e Web (porta 3000) juntos
npm run dev

# Apenas Backend
cd apps/api
npm run start:dev

# Apenas Frontend
cd apps/web
npm run dev

# Популando o banco com dados de teste
npx ts-node apps/api/prisma/seed.ts

# Aplicar mudanças de schema no banco (sem migrations)
cd apps/api && npx prisma db push
```

### Credenciais de Teste

| Usuário | Email | Senha | Role |
|---------|-------|-------|------|
| Super Admin | `superadmin@kaizen.com` | `admin123` | SUPER_ADMIN |
| Admin Demo | `admin@demo.com` | `admin123` | ADMIN |
| Colaborador 1 | `colab1@demo.com` | `admin123` | COLLABORATOR |
| Colaborador 2 | `colab2@demo.com` | `admin123` | COLLABORATOR |

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
