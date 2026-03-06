# 00 — Visao Geral da Migracao

## Objetivo

Portar o fluxo de negocio completo do projeto legado (Flask + React Bootstrap) para o projeto multi-tenant atual (NestJS + Prisma + Next.js 15), mantendo isolamento por restaurante e controle por roles.

---

## Estado Atual (2026-03-05)

A migracao funcional foi concluida e o projeto esta em pos-migracao (melhorias continuas + alinhamento de documentacao).

---

## Stack do Projeto Multi-Tenant

| Camada | Tecnologia |
|--------|-----------|
| Backend API | NestJS (TypeScript) |
| ORM / DB | Prisma + PostgreSQL |
| Frontend | Next.js 15 (App Router) + React Bootstrap |
| Auth | JWT Bearer (sem refresh token) |
| Build/Run | npm workspaces + Turborepo |

---

## Modulos e Status Consolidado

| Modulo | Backend | Frontend | Status |
|--------|---------|----------|--------|
| Auth + JWT | ✅ | ✅ | Concluido |
| Listas (CRUD admin) | ✅ | ✅ | Concluido |
| Itens / Catalogo | ✅ | ✅ | Concluido |
| Areas | ✅ | ✅ | Concluido |
| Atualizacao de estoque (colaborador) | ✅ | ✅ | Concluido |
| Submissoes + Aprovacao | ✅ | ✅ | Concluido |
| Gerenciar Usuarios | ✅ | ✅ | Concluido |
| Fornecedores (CRUD) | ✅ | ✅ | Concluido |
| Vinculo Item ↔ Fornecedor | ✅ | ✅ | Concluido |
| Cotacoes | ✅ | ✅ | Concluido |
| Merge WhatsApp | ✅ | ✅ | Concluido |
| Checklists | ✅ | ✅ | Concluido |
| Listas Rapidas | ✅ | ✅ | Concluido |
| Sugestoes de Itens | ✅ | ✅ | Concluido |
| POPs | ✅ | ✅ | Concluido |
| Notificacoes | ✅ | ✅ | Concluido |
| Convites | ✅ | ✅ | Concluido |
| Export CSV | ✅ | ✅ | Concluido |
| Import legado (ZIP + CSV por lista) | ✅ | ✅ | Concluido |
| Auditoria / Logs | ✅ | ✅ | Concluido |
| Editar Perfil + Mudar Senha | ✅ | ✅ | Pos-migracao |
| Dashboard Global (SUPER_ADMIN) | ✅ | ✅ | Pos-migracao |
| Catalogo Global | ✅ | ✅ | Pos-migracao |
| Estatisticas de Estoque | ✅ | ✅ | Pos-migracao |
| Offline / PWA + Push | ✅ | ✅ | Pos-migracao |
| Toast global (UX) | — | ✅ | Pos-migracao |

---

## Convencoes de Codigo

### NestJS (Backend)

- Cada dominio em modulo dedicado (`src/modules/...`)
- Arquivos por modulo: `controller`, `service`, `dto`
- Guards em rotas protegidas: `AuthGuard('jwt')`, `RolesGuard`, `TenantGuard`
- Prefixo global: `/v1`
- DTOs validados com `class-validator`

### Next.js (Frontend)

- App Router em `apps/web/src/app/...`
- Componentes reutilizaveis em `apps/web/src/components/`
- Cliente HTTP centralizado em `apps/web/src/lib/`
- UI: React Bootstrap + CSS Modules

### Naming

- Arquivos: `kebab-case`
- Classes/Componentes: `PascalCase`
- Variaveis/funcoes: `camelCase`
- Enums Prisma: `SCREAMING_SNAKE_CASE`

---

## Como Rodar Localmente

```bash
# Na raiz do monorepo (API + WEB)
npm run dev

# Apenas backend
npm run dev:api

# Apenas frontend
npm run dev:web

# Seed de dados
npm run db:seed --workspace=apps/api

# Aplicar schema no banco
npm run db:push --workspace=apps/api
```

### Credenciais de teste

| Usuario | Email | Senha | Role |
|---------|-------|-------|------|
| Super Admin | `superadmin@kaizen.com` | `admin123` | SUPER_ADMIN |
| Admin Demo | `admin@demo.com` | `admin123` | ADMIN |
| Colaborador 1 | `colab1@demo.com` | `admin123` | COLLABORATOR |
| Colaborador 2 | `colab2@demo.com` | `admin123` | COLLABORATOR |

---

## Referencias Importantes

| Contexto | Arquivo |
|---|---|
| Estado consolidado da migracao | `manuais/plano-migracao/RELATORIO_FINAL.md` |
| Ponteiro de progresso | `manuais/plano-migracao/PONTEIRO.md` |
| Checklist operacional Codex | `manuais/plano-migracao-codex/CHECKLIST_ATUALIZACAO_DOCS.md` |
| Progresso por checkpoint | `manuais/plano-migracao-codex/PROGRESSO_MIGRACAO_DOCS.md` |

Observacao: `legacy/` e referencia historica; nao editar arquivos dentro dessa pasta neste fluxo.
