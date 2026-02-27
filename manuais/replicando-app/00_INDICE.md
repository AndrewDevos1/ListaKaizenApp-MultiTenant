# 📚 Documentação para Replicação — Kaizen Lists App

> Esta documentação foi gerada para permitir que outra IA (ou desenvolvedor) replique o sistema Kaizen Lists do zero, com todos os detalhes necessários de banco de dados, endpoints, fluxos, telas e permissões.

---

## 🗂️ Índice dos Documentos

### Fundação e Arquitetura

| Arquivo | Conteúdo |
|---------|----------|
| `01_ARQUITETURA.md` | Stack tecnológico, estrutura de pastas, padrões |
| `02_BANCO_DE_DADOS.md` | Schema completo: modelos, campos, tipos, relacionamentos, enums |
| `03_AUTENTICACAO_PERMISSOES.md` | Roles, JWT, decorators, guards frontend |
| `08_FLUXO_COMPLETO.md` | Fluxo de dados ponta a ponta com diagramas |
| `09_ENDPOINTS_REFERENCIA.md` | Referência completa de todos os endpoints da API |

### Módulos Core

| Arquivo | Conteúdo |
|---------|----------|
| `04_MODULO_LISTAS.md` | Módulo principal de listas de compras (CRUD, itens, colaboradores) |
| `05_MODULO_SUBMISSOES_APROVACAO.md` | Fluxo de submissão pelo colaborador e aprovação pelo admin |
| `06_MODULO_MERGE.md` | Merge de múltiplas submissões aprovadas → WhatsApp |
| `12_MODULO_CHECKLIST.md` | Converter submissão aprovada em checklist marcável, compartilhar via WhatsApp |
| `20_COTACOES.md` | Geração de cotações por fornecedor com preenchimento de preços |

### Módulos Adicionais

| Arquivo | Conteúdo |
|---------|----------|
| `14_MODULO_POP.md` | POPs: templates, listas, execuções, medições, fotos, desvios, auditoria |
| `15_PORTAL_FORNECEDOR.md` | Portal SUPPLIER: cadastro, itens, preços, convites, aprovação |
| `16_LISTAS_RAPIDAS.md` | Listas ad-hoc criadas por colaboradores, workflow de aprovação |
| `17_SUGESTOES_ITENS.md` | Sugestão de novos itens pelo colaborador, aprovação cria item no catálogo |
| `18_CONVITES.md` | Tokens de convite: usuários, restaurantes, fornecedores |
| `19_NOTIFICACOES.md` | Sistema de notificações persistentes + toasts, polling de pendentes |
| `21_IMPORT_EXPORT.md` | Import/Export CSV: fornecedores, itens de fornecedor, itens de lista |
| `22_AUDITORIA_LOGS.md` | AppLog: trilha imutável de auditoria com filtros para SUPER_ADMIN |

### Multi-tenant e Responsividade

| Arquivo | Conteúdo |
|---------|----------|
| `13_SUPER_ADMIN_RESTAURANTES.md` | Cadastro e controle de restaurantes, solicitações, impersonação, dashboard global |
| `10_RESPONSIVIDADE.md` | Sistema responsivo: breakpoints, sidebar adaptativa, swipe, mobile-cards |
| `11_FUNCIONALIDADE_OFFLINE.md` | Service Worker (Workbox), IndexedDB drafts, BackgroundSync, detecção de rede |

### Telas Detalhadas e Padrões Frontend

| Arquivo | Conteúdo |
|---------|----------|
| `07_FRONTEND_ROTAS_TELAS.md` | Todas as rotas, telas e modais do frontend (visão geral) |
| `23_TELAS_COLABORADOR.md` | Telas do colaborador: layout, estados, validações, cálculos, API |
| `24_TELAS_ADMIN.md` | Telas do admin: layout, ações em lote, filtros, modais, API |
| `25_CONTEXTOS_HOOKS.md` | Contextos React, hooks customizados, guards de rota, estrutura de rotas completa |

---

## 🎯 Funcionalidade Principal

O **Kaizen Lists** é um app de **gestão de compras para restaurantes**. O fluxo central é:

```
Admin cria lista → Atribui colaboradores → Colaborador atualiza estoque
→ Colaborador submete → Admin aprova/rejeita pedidos
→ Admin funde múltiplas submissões → Envia pedido ao fornecedor via WhatsApp
```

### Fluxos Secundários

```
Colaborador cria Lista Rápida → Admin aprova → Vira Checklist de compras

Colaborador sugere item → Admin aprova → Item entra no catálogo global

Fornecedor cadastra com convite → Gerencia seus itens e preços

Admin gera Cotação → Preenche preços → Referência para compras

Admin cria POP (checklist operacional) → Colaborador executa → Admin audita
```

---

## 🏗️ Arquitetura em uma linha

- **Backend**: Flask (Python) + SQLAlchemy + JWT + PostgreSQL (SQLite em dev)
- **Frontend**: React 19 + TypeScript + React Bootstrap + React Router v7
- **Multi-tenant**: Cada restaurante tem seus usuários, listas e dados isolados
- **Auth**: JWT armazenado em localStorage, roles SUPER_ADMIN / ADMIN / COLLABORATOR / SUPPLIER
- **Offline**: Service Worker Workbox + IndexedDB (drafts) + BackgroundSync

---

## ⚡ Quick Start para replicar

### Fase 1 — Base

1. Leia `01_ARQUITETURA.md` para entender a estrutura
2. Leia `02_BANCO_DE_DADOS.md` para criar o schema
3. Leia `03_AUTENTICACAO_PERMISSOES.md` para implementar auth
4. Leia `25_CONTEXTOS_HOOKS.md` para entender os guards e providers do frontend

### Fase 2 — Core do Negócio

5. Leia `04_MODULO_LISTAS.md` + `05_MODULO_SUBMISSOES_APROVACAO.md` para o core
6. Leia `06_MODULO_MERGE.md` para fusão de submissões
7. Leia `12_MODULO_CHECKLIST.md` para o checklist de compras
8. Use `09_ENDPOINTS_REFERENCIA.md` como guia de API

### Fase 3 — Telas

9. Leia `23_TELAS_COLABORADOR.md` para telas detalhadas do colaborador
10. Leia `24_TELAS_ADMIN.md` para telas detalhadas do admin
11. Leia `07_FRONTEND_ROTAS_TELAS.md` para visão geral do roteamento
12. Leia `08_FLUXO_COMPLETO.md` para validar a lógica ponta a ponta

### Fase 4 — Módulos Adicionais

13. Leia `14_MODULO_POP.md` para o sistema de POPs
14. Leia `15_PORTAL_FORNECEDOR.md` para o portal do fornecedor
15. Leia `16_LISTAS_RAPIDAS.md` + `17_SUGESTOES_ITENS.md` para módulos colaborativos
16. Leia `18_CONVITES.md` para o sistema de convites
17. Leia `19_NOTIFICACOES.md` para notificações
18. Leia `20_COTACOES.md` para o módulo de cotações
19. Leia `21_IMPORT_EXPORT.md` para importação/exportação CSV
20. Leia `22_AUDITORIA_LOGS.md` para a trilha de auditoria

### Fase 5 — Infraestrutura

21. Leia `10_RESPONSIVIDADE.md` para o sistema responsivo (breakpoints, swipe, mobile-cards)
22. Leia `11_FUNCIONALIDADE_OFFLINE.md` para offline (Service Worker, IndexedDB, BackgroundSync)
23. Leia `13_SUPER_ADMIN_RESTAURANTES.md` para gestão multi-tenant pelo SUPER_ADMIN
