# 05 — Fase 5: Notificações, Convites, Import/Export, Auditoria

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
  id            String          @id @default(cuid())
  tipo          TipoNotificacao
  titulo        String
  mensagem      String
  lida          Boolean         @default(false)
  usuario       Usuario         @relation(fields: [usuarioId], references: [id])
  usuarioId     String
  restaurante   Restaurante     @relation(fields: [restauranteId], references: [id])
  restauranteId String
  referenciaId  String?         // ID da entidade relacionada
  criadoEm     DateTime        @default(now())
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
PUT  /v1/notificacoes/:id/ler
PUT  /v1/notificacoes/ler-todas
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
  id            String      @id @default(cuid())
  token         String      @unique @default(cuid())
  email         String?
  role          Role        @default(COLLABORATOR)
  usado         Boolean     @default(false)
  limiteUsos    Int         @default(1)
  quantidadeUsos Int        @default(0)
  expiresAt     DateTime?
  restaurante   Restaurante @relation(fields: [restauranteId], references: [id])
  restauranteId String
  criadoPor     Usuario     @relation(fields: [criadoPorId], references: [id])
  criadoPorId   String
  criadoEm     DateTime    @default(now())
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
DELETE /v1/admin/convites/:id          → revogar

# Público — usar convite
GET    /v1/auth/convite/:token         → validar e retornar dados (email pré-preenchido, role)
POST   /v1/auth/register-convite       → registrar via convite
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
# Export
GET /v1/admin/export/fornecedores    → CSV de fornecedores
GET /v1/admin/export/itens           → CSV de itens do catálogo
GET /v1/admin/export/listas/:id/itens → CSV de itens de uma lista

# Import
POST /v1/admin/import/fornecedores/preview → { csv: string } → retorna preview (sem salvar)
POST /v1/admin/import/fornecedores         → executa importação
POST /v1/admin/import/itens/preview
POST /v1/admin/import/itens
```

### Lógica de Import

1. Parsear CSV (papaparse ou lib similar)
2. Validar cada linha (campos obrigatórios, tipos)
3. `/preview` retorna `{ validos: [], invalidos: [{ linha, erro }] }`
4. Import real executa apenas os válidos

### Frontend

- Botão "Exportar CSV" nas telas `/admin/fornecedores` e `/admin/itens`
- Botão "Importar CSV" abre modal:
  - Upload do arquivo
  - Preview da tabela (verdes = OK, vermelhos = erros)
  - Botão "Confirmar Importação"

### Referência Legado

- `legacy/frontend/src/features/inventory/ImportacaoEstoque.tsx`

---

## Tarefa 5.4 — Auditoria / Logs

### Schema Prisma

```prisma
model AppLog {
  id            String      @id @default(cuid())
  acao          String      // ex: "submissao.aprovar", "usuario.desativar"
  entidade      String?     // ex: "Submissao"
  entidadeId    String?
  detalhes      Json?
  usuario       Usuario?    @relation(fields: [usuarioId], references: [id])
  usuarioId     String?
  restaurante   Restaurante? @relation(fields: [restauranteId], references: [id])
  restauranteId String?
  ip            String?
  criadoEm     DateTime    @default(now())
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
GET /v1/super-admin/logs    → listar (filtros: usuarioId, restauranteId, acao, data)
```

### Frontend

- `/super-admin/logs` → tabela somente para `SUPER_ADMIN`
- Filtros: restaurante, usuário, ação, intervalo de datas
- Exportar como CSV

---

## Tarefa 5.5 — Offline / PWA (Opcional)

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
1. Anotar o hash: `git log --oneline -1`
2. Atualizar `PONTEIRO.md`:
   - Status: `MIGRAÇÃO CONCLUÍDA`
   - Última tarefa concluída: `5.4 — Auditoria / Logs`
   - Próximo passo: `(nenhum — migração completa)`
   - Última branch/commit: `<hash>`

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
