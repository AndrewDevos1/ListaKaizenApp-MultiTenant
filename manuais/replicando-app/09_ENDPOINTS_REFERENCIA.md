# 09 — Referencia de Endpoints (Estado Atual)

> Documento alinhado ao backend NestJS em `apps/api/src/modules`.
> Quando houver divergencia entre manual e codigo, o codigo e a fonte de verdade.

## Base URL

- Local: `http://localhost:3001/v1`
- Prefixo global: `/v1`

## Legenda de auth

- `PUBLIC` — sem autenticacao
- `JWT` — usuario autenticado
- `ADMIN` — role `ADMIN` ou `SUPER_ADMIN`
- `COLLAB` — role `COLLABORATOR`

---

## Auth (`/v1/auth`)

| Metodo | Endpoint | Auth | Observacao |
|--------|----------|------|------------|
| POST | `/v1/auth/register` | PUBLIC | Registrar novo usuario |
| POST | `/v1/auth/login` | PUBLIC | Login |
| GET | `/v1/auth/profile` | JWT | Perfil do usuario logado |
| PUT | `/v1/auth/profile` | JWT | Atualizar perfil |
| PUT | `/v1/auth/avatar` | JWT | Atualizar avatar |
| DELETE | `/v1/auth/avatar` | JWT | Remover avatar |
| POST | `/v1/auth/change-password` | JWT | Trocar senha |

---

## Listas Rapidas

### Colaborador (`/v1/collaborator/listas-rapidas`)

| Metodo | Endpoint | Auth | Observacao |
|--------|----------|------|------------|
| POST | `/v1/collaborator/listas-rapidas` | COLLAB | Criar lista rapida |
| GET | `/v1/collaborator/listas-rapidas` | COLLAB | Listar minhas listas |
| GET | `/v1/collaborator/listas-rapidas/:id` | COLLAB | Detalhe |
| POST | `/v1/collaborator/listas-rapidas/:id/submeter` | COLLAB | Submeter para aprovacao |
| POST | `/v1/collaborator/listas-rapidas/:id/itens` | COLLAB | Adicionar item |

### Admin (`/v1/admin/listas-rapidas`)

| Metodo | Endpoint | Auth | Observacao |
|--------|----------|------|------------|
| GET | `/v1/admin/listas-rapidas` | ADMIN | Listar por status |
| GET | `/v1/admin/listas-rapidas/:id` | ADMIN | Detalhe |
| PUT | `/v1/admin/listas-rapidas/:id/aprovar` | ADMIN | Aprovar lista |
| PUT | `/v1/admin/listas-rapidas/:id/rejeitar` | ADMIN | Rejeitar lista |
| PUT | `/v1/admin/listas-rapidas/:id/arquivar` | ADMIN | Arquivar lista |
| PUT | `/v1/admin/listas-rapidas/itens/:itemId` | ADMIN | Atualizar item |
| PUT | `/v1/admin/listas-rapidas/itens/:itemId/descartar` | ADMIN | Toggle descartado |

---

## Importacao de legado

### Import module (`/v1/admin/import`)

| Metodo | Endpoint | Auth | Observacao |
|--------|----------|------|------------|
| GET | `/v1/admin/import/listas` | ADMIN | Listas disponiveis para import da fase 2 |
| POST | `/v1/admin/import/backup-zip` | ADMIN | Importa ZIP legado (fase 1) |
| POST | `/v1/admin/import/lista-csv/:listaId` | ADMIN | Importa CSV por lista (fase 2) |

### Endpoints relacionados

| Metodo | Endpoint | Auth | Observacao |
|--------|----------|------|------------|
| GET | `/v1/listas/:id/export-csv` | ADMIN | Exportar itens da lista |
| POST | `/v1/listas/:id/import-csv` | ADMIN | Importar itens por texto CSV |
| GET | `/v1/admin/fornecedores/exportar-csv` | ADMIN | Exportar fornecedores |
| GET | `/v1/items/exportar-csv` | ADMIN | Exportar itens |

---

## Push Web (`/v1/push`)

| Metodo | Endpoint | Auth | Observacao |
|--------|----------|------|------------|
| GET | `/v1/push/vapid-public-key` | PUBLIC | Obter chave publica VAPID |
| POST | `/v1/push/subscribe` | JWT | Registrar assinatura de push |
| DELETE | `/v1/push/subscribe` | JWT | Remover assinatura |

---

## Notificacoes (`/v1/notificacoes`)

| Metodo | Endpoint | Auth | Observacao |
|--------|----------|------|------------|
| GET | `/v1/notificacoes` | JWT | Listar notificacoes do usuario |
| GET | `/v1/notificacoes/count` | JWT | Contar nao lidas |
| PUT | `/v1/notificacoes/:id/lida` | JWT | Marcar como lida |
| PUT | `/v1/notificacoes/marcar-todas` | JWT | Marcar todas como lidas |

---

## Convites (`/v1/admin/convites` e `/v1/convites`)

| Metodo | Endpoint | Auth | Observacao |
|--------|----------|------|------------|
| POST | `/v1/admin/convites` | ADMIN | Gerar convite |
| GET | `/v1/admin/convites` | ADMIN | Listar convites |
| PUT | `/v1/admin/convites/:id/revogar` | ADMIN | Revogar convite |
| GET | `/v1/convites/validar?token=...` | PUBLIC | Validar token |

---

## Logs (`/v1/admin/logs`)

| Metodo | Endpoint | Auth | Observacao |
|--------|----------|------|------------|
| GET | `/v1/admin/logs` | SUPER_ADMIN | Listagem paginada de logs |

---

## Snapshot legado

Para o mapeamento historico do backend Flask (`/api/...`), consultar:

- `legacy/manuais/replicando-app/09_ENDPOINTS_REFERENCIA.md`

Esse snapshot e apenas referencia historica.
