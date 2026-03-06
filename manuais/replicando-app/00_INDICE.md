# Documentacao para Replicacao — Kaizen Lists App

## Fonte de verdade

1. Implementacao atual: codigo em `apps/api` (NestJS + Prisma) e `apps/web` (Next.js).
2. Documentacao funcional atual: arquivos deste diretorio `manuais/replicando-app/`.
3. Referencia historica: `legacy/` (somente leitura; nao editar).

---

## Indice dos Documentos

### Fundacao e Arquitetura

| Arquivo | Conteudo |
|---------|----------|
| `01_ARQUITETURA.md` | Stack tecnologico, estrutura de pastas, padroes |
| `02_BANCO_DE_DADOS.md` | Schema completo: modelos, campos, tipos, relacionamentos, enums |
| `03_AUTENTICACAO_PERMISSOES.md` | Roles, JWT, decorators, guards frontend |
| `08_FLUXO_COMPLETO.md` | Fluxo de dados ponta a ponta |
| `09_ENDPOINTS_REFERENCIA.md` | Referencia de endpoints (estado atual NestJS) |

### Modulos Core

| Arquivo | Conteudo |
|---------|----------|
| `04_MODULO_LISTAS.md` | Modulo principal de listas de compras (CRUD, itens, colaboradores) |
| `05_MODULO_SUBMISSOES_APROVACAO.md` | Fluxo de submissao pelo colaborador e aprovacao pelo admin |
| `06_MODULO_MERGE.md` | Merge de multiplas submissoes aprovadas para WhatsApp |
| `12_MODULO_CHECKLIST.md` | Converter submissao aprovada em checklist marcavel |
| `20_COTACOES.md` | Geracao de cotacoes por fornecedor |

### Modulos Adicionais

| Arquivo | Conteudo |
|---------|----------|
| `14_MODULO_POP.md` | POPs: templates, passos, execucoes e auditoria |
| `15_PORTAL_FORNECEDOR.md` | Portal SUPPLIER |
| `16_LISTAS_RAPIDAS.md` | Workflow de listas rapidas |
| `17_SUGESTOES_ITENS.md` | Sugestao e aprovacao de itens |
| `18_CONVITES.md` | Tokens de convite |
| `19_NOTIFICACOES.md` | Notificacoes persistentes |
| `21_IMPORT_EXPORT.md` | Import/Export de dados |
| `22_AUDITORIA_LOGS.md` | Trilha de auditoria |

### Multi-tenant e Responsividade

| Arquivo | Conteudo |
|---------|----------|
| `13_SUPER_ADMIN_RESTAURANTES.md` | Gestao de restaurantes e visao global |
| `10_RESPONSIVIDADE.md` | Regras de responsividade |
| `11_FUNCIONALIDADE_OFFLINE.md` | Offline/PWA, drafts e sync |

### Telas e Padroes Frontend

| Arquivo | Conteudo |
|---------|----------|
| `07_FRONTEND_ROTAS_TELAS.md` | Rotas, telas e modais do frontend |
| `23_TELAS_COLABORADOR.md` | Telas do colaborador |
| `24_TELAS_ADMIN.md` | Telas do admin |
| `25_CONTEXTOS_HOOKS.md` | Contextos React, hooks e guards de rota |

---

## Arquitetura em uma linha (estado atual)

- Backend: NestJS + Prisma + PostgreSQL
- Frontend: Next.js 15 + React 19 + React Bootstrap
- Auth: JWT Bearer com roles e guards
- Multi-tenant: isolamento por `restauranteId`
- Offline/PWA: Service Worker + drafts locais + push web

---

## Quick Start de leitura

### Fase 1 — Base

1. `01_ARQUITETURA.md`
2. `02_BANCO_DE_DADOS.md`
3. `03_AUTENTICACAO_PERMISSOES.md`
4. `25_CONTEXTOS_HOOKS.md`

### Fase 2 — Core de negocio

5. `04_MODULO_LISTAS.md`
6. `05_MODULO_SUBMISSOES_APROVACAO.md`
7. `06_MODULO_MERGE.md`
8. `12_MODULO_CHECKLIST.md`
9. `09_ENDPOINTS_REFERENCIA.md`

### Fase 3 — Telas

10. `23_TELAS_COLABORADOR.md`
11. `24_TELAS_ADMIN.md`
12. `07_FRONTEND_ROTAS_TELAS.md`
13. `08_FLUXO_COMPLETO.md`

### Fase 4 — Modulos adicionais

14. `14_MODULO_POP.md`
15. `15_PORTAL_FORNECEDOR.md`
16. `16_LISTAS_RAPIDAS.md`
17. `17_SUGESTOES_ITENS.md`
18. `18_CONVITES.md`
19. `19_NOTIFICACOES.md`
20. `20_COTACOES.md`
21. `21_IMPORT_EXPORT.md`
22. `22_AUDITORIA_LOGS.md`

### Fase 5 — Infra

23. `10_RESPONSIVIDADE.md`
24. `11_FUNCIONALIDADE_OFFLINE.md`
25. `13_SUPER_ADMIN_RESTAURANTES.md`

---

## Referencias historicas complementares (read-only)

- `legacy/manuais/replicando-app/04.2_Organizar_Listas.md` (material adicional da fase de organizacao de listas)
- `legacy/manuais/replicando-app/09_ENDPOINTS_REFERENCIA.md` (snapshot legado Flask)

---

## Fora do fluxo oficial

Os arquivos abaixo sao anotacoes de conversa e nao fazem parte da trilha oficial de replicacao:

- `manuais/replicando-app/ANOTACOES_NAO_OFICIAIS.md` (indice das anotacoes)
- `manuais/replicando-app/CHAT.md`
- `manuais/replicando-app/Chat2.md`
- `manuais/replicando-app/chat-checklistdecompras.md`
- `manuais/chatbackup.md`
