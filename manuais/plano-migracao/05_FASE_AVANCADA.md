# 05 — Fase 5: Notificacoes, Convites, Import/Export, Auditoria (Historico concluido)

## Objetivo

Fechar a migração com infraestrutura transversal: notificações persistentes, sistema de convites
para onboarding, importação/exportação de dados, auditoria de ações e suporte offline/PWA.

---

## Tarefa 5.1 — Notificações

### Schema Prisma

```prisma
enum TipoNotificacao {
  SUBMISSAO_CRIADA
  SUBMISSAO_APROVADA
  SUBMISSAO_REJEITADA
  SUGESTAO_APROVADA
  SUGESTAO_REJEITADA
  LISTA_RAPIDA_APROVADA
  LISTA_RAPIDA_REJEITADA
  USUARIO_APROVADO
}

model Notificacao {
  id            Int          @id @default(autoincrement())
  tipo          TipoNotificacao
  mensagem      String
  lida          Boolean      @default(false)
  usuario       Usuario      @relation(fields: [usuarioId], references: [id])
  usuarioId     Int
  restaurante   Restaurante  @relation(fields: [restauranteId], references: [id])
  restauranteId Int
  criadoEm      DateTime     @default(now())
}
```

### Migration

```bash
npx prisma migrate dev --name add-notificacoes
```

### Backend

- Criar `NotificacoesService` com método `criar(usuarioId, tipo, dados)`
- Injetar e chamar nos serviços existentes:
  - `SubmissoesService.aprovar/rejeitar` → notifica o colaborador
  - `SugestoesService.aprovar/rejeitar` → notifica o colaborador
  - `ListasRapidasService.aprovar/rejeitar` → notifica o colaborador
  - `UsuariosService.aprovar` → notifica o novo usuário

```
GET  /v1/notificacoes         → lista (não lidas primeiro; paginação)
PUT  /v1/notificacoes/:id/lida
PUT  /v1/notificacoes/marcar-todas
GET  /v1/notificacoes/count   → { total: number, naoLidas: number }
```

### Frontend

- Ícone de sino na navbar com badge de contagem não lidas
- Dropdown ou painel lateral com lista de notificações
- Marcar como lida ao clicar; botão "Marcar todas como lidas"
- Polling simples a cada 30s ou WebSocket (opcional)

### Referência Legado

- `legacy/frontend/src/components/NotificationToasts.tsx`
- `legacy/frontend/src/context/NotificationContext.tsx`

---

## Tarefa 5.2 — Convites

### Schema Prisma

```prisma
model ConviteToken {
  id            Int      @id @default(autoincrement())
  token         String   @unique
  email         String?
  restauranteId Int?
  role          UserRole @default(COLLABORATOR)
  usado         Boolean  @default(false)
  expiresAt     DateTime @map("expires_at")
  criadoEm      DateTime @default(now())

  restaurante Restaurante? @relation(fields: [restauranteId], references: [id])
}
```

### Migration

```bash
npx prisma migrate dev --name add-convites
```

### Backend

```
# Admin — gerar e gerenciar convites
GET    /v1/admin/convites              → listar convites do restaurante
POST   /v1/admin/convites              → gerar novo token
PUT    /v1/admin/convites/:id/revogar  → revogar

# Público — usar convite
GET    /v1/convites/validar?token=...  → validar token e metadados do convite
```

### Frontend

- `/admin/convites` → tabela de tokens (token, email, role, usos/limite, validade, ações)
- Botão "Copiar link" para cada token
- Página pública: `/convite?token=` → form de cadastro pré-preenchido com email e role

### Referência Legado

- `legacy/frontend/src/features/admin/GerarConvite.tsx`
- `legacy/frontend/src/features/auth/RegisterConvite.tsx`

---

## Tarefa 5.3 — Import / Export CSV

### Backend

```
# Export (estado atual)
GET  /v1/admin/fornecedores/exportar-csv  → CSV de fornecedores
GET  /v1/items/exportar-csv               → CSV de itens do catálogo
GET  /v1/listas/:id/export-csv            → CSV de itens de uma lista

# Import de legado (estado atual)
GET  /v1/admin/import/listas              → listas disponiveis para fase 2
POST /v1/admin/import/backup-zip          → importa ZIP legado (fase 1)
POST /v1/admin/import/lista-csv/:listaId  → importa CSV de itens na lista (fase 2)
POST /v1/listas/:id/import-csv            → importa itens de lista via texto CSV
```

### Lógica de Import

1. Fase 1: importar backup ZIP (fornecedores, areas, itens, listas)
2. Fase 2: importar CSV por lista para criar `ListaItemRef`
3. Operacao idempotente para registros ja existentes
4. Retornar resumo de criados/ignorados/avisos ao final

### Frontend

- Botao "Exportar CSV" nas telas `/admin/fornecedores`, `/admin/items` e listas
- Tela de importacao do legado em configuracoes:
  - Upload do ZIP de backup (fase 1)
  - Upload do CSV por lista (fase 2)
  - Retorno com resumo de criados/ignorados/avisos

### Referência Legado

- `legacy/frontend/src/features/inventory/ImportacaoEstoque.tsx`

---

## Tarefa 5.4 — Push Web (PWA)

### Backend

```
GET    /v1/push/vapid-public-key   → chave publica VAPID (publico)
POST   /v1/push/subscribe          → registrar assinatura push (JWT)
DELETE /v1/push/subscribe          → remover assinatura push (JWT)
```

### Frontend

- Solicitar permissao de notificacao no navegador
- Registrar/remover assinatura por usuario autenticado
- Receber notificacoes push via Service Worker

---

## Tarefa 5.5 — Auditoria / Logs

### Schema Prisma

```prisma
model AppLog {
  id            Int      @id @default(autoincrement())
  acao          String      // ex: "submissao.aprovar", "usuario.desativar"
  entidade      String?     // ex: "Submissao"
  entidadeId    Int?
  detalhes      Json?
  usuarioId     Int?
  restauranteId Int?
  criadoEm      DateTime @default(now())
}
```

**Nota:** `AppLog` é imutável — nunca atualizar ou deletar registros.

### Migration

```bash
npx prisma migrate dev --name add-app-logs
```

### Backend

- Criar `AuditoriaService.registrar(dto)` injetável
- Chamar nos services críticos: aprovações, rejeições, criação de usuários, convites
- Alternativa: interceptor `AuditoriaInterceptor` com decorator `@Audit('acao')`

```
GET /v1/admin/logs    → listar (somente SUPER_ADMIN; filtros por restaurante e paginação)
```

### Frontend

- `/super-admin/logs` → tabela somente para `SUPER_ADMIN`
- Filtros: restaurante, usuário, ação, intervalo de datas
- Exportar como CSV

---

## Tarefa 5.6 — Offline / PWA (Opcional)

> Implementar somente se houver demanda real de uso em locais sem internet confiável.

### Escopo

- Service Worker com Workbox (cache de assets e API)
- Cache do catálogo de itens para uso offline
- Rascunhos de atualização de estoque em IndexedDB
- BackgroundSync: submeter lista quando voltar online

### Arquivos de Referência

- `legacy/frontend/src/service-worker.ts`
- `legacy/frontend/src/serviceWorkerRegistration.ts`
- `legacy/frontend/src/services/offlineDrafts.ts`

### Como Implementar

1. Configurar `next-pwa` ou Workbox manualmente
2. Criar `lib/offline/draftsStore.ts` (IndexedDB via `idb`)
3. Modificar `EstoqueLista` para usar rascunho offline antes de chamar a API
4. Registrar sync tag no service worker

---

## Checkpoint Fase 5

```bash
git add .
git commit -m "feat: notificacoes, convites, import-export e auditoria"
```

Após o commit:
1. Registro historico desta fase: `9680bfd`
2. Entregas principais: notificacoes, convites, import/export e auditoria.

---

## Verificação Final da Migração

Antes de marcar como concluída, confirmar:

- [ ] Fluxo colaborador → submissão → aprovação admin funciona de ponta a ponta
- [ ] Isolamento multi-tenant: dados de um restaurante não aparecem em outro
- [ ] Todos os roles funcionam corretamente (SUPER_ADMIN, ADMIN, COLLABORATOR)
- [ ] Merge para WhatsApp gera texto correto
- [ ] Cotações calculam total com preços preenchidos
- [ ] Checklists refletem pedidos aprovados
- [ ] Listas rápidas passam pelo fluxo completo
- [ ] Sugestões aprovadas criam itens no catálogo
- [ ] POPs podem ser criados e executados
- [ ] Notificações chegam aos usuários corretos
- [ ] Convites permitem cadastro com role pré-definido
- [ ] Import CSV valida e rejeita linhas inválidas
- [ ] Logs de auditoria registram ações críticas
