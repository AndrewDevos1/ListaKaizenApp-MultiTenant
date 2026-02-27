# Fase 5: Features Avancadas

## Objetivo

Migrar as features mais complexas que completam a paridade com o app atual: POP (Procedimentos Operacionais Padrao), Checklists de Compras, Listas Rapidas, Notificacoes e Dashboard Global.

---

## 5.1 POP - Procedimentos Operacionais Padrao

### O que e

Sistema de checklists diarios operacionais (abertura, fechamento, limpeza). Admin cria templates de tarefas, atribui a listas POP, colaboradores executam diariamente.

**Referencia no app atual:**
- `frontend/src/features/admin/POPTemplates.tsx`
- `frontend/src/features/admin/POPListas.tsx`
- `frontend/src/features/admin/POPAuditoria.tsx`
- `frontend/src/features/collaborator/ExecutarPOPChecklist.tsx`
- `frontend/src/features/collaborator/MinhasPOPListas.tsx`

### Prisma Schema

```prisma
enum CriticidadeTarefa {
  BAIXA
  NORMAL
  ALTA
  CRITICA
}

enum TipoVerificacao {
  CHECKBOX
  MEDICAO
  TEMPERATURA
  FOTO
  TEXTO
}

enum RecorrenciaLista {
  DIARIA
  SEMANAL
  MENSAL
  SOB_DEMANDA
}

enum StatusExecucao {
  EM_ANDAMENTO
  CONCLUIDO
  PARCIAL
}

model POPConfiguracao {
  id              Int      @id @default(autoincrement())
  restauranteId   Int      @unique @map("restaurante_id")
  horaLimite      String?  @map("hora_limite")
  autoArquivar    Boolean  @default(true) @map("auto_arquivar")
  diasArquivar    Int      @default(7) @map("dias_arquivar")

  @@map("pop_configuracoes")
}

model POPCategoria {
  id              Int      @id @default(autoincrement())
  nome            String
  descricao       String?
  restauranteId   Int      @map("restaurante_id")

  templates       POPTemplate[]

  @@map("pop_categorias")
}

model POPTemplate {
  id              Int               @id @default(autoincrement())
  nome            String
  descricao       String?
  categoriaId     Int?              @map("categoria_id")
  tipoVerificacao TipoVerificacao   @default(CHECKBOX) @map("tipo_verificacao")
  criticidade     CriticidadeTarefa @default(NORMAL)
  ativo           Boolean           @default(true)
  restauranteId   Int               @map("restaurante_id")

  categoria       POPCategoria?     @relation(fields: [categoriaId], references: [id])
  listaTarefas    POPListaTarefa[]

  @@map("pop_templates")
}

model POPLista {
  id              Int              @id @default(autoincrement())
  nome            String
  descricao       String?
  recorrencia     RecorrenciaLista @default(DIARIA)
  ativo           Boolean          @default(true)
  deletado        Boolean          @default(false)
  restauranteId   Int              @map("restaurante_id")
  criadoEm        DateTime         @default(now()) @map("criado_em")

  tarefas         POPListaTarefa[]
  execucoes       POPExecucao[]
  colaboradores   POPListaColaborador[]

  @@map("pop_listas")
}

model POPListaTarefa {
  id          Int  @id @default(autoincrement())
  listaId     Int  @map("lista_id")
  templateId  Int  @map("template_id")
  ordem       Int  @default(0)

  lista       POPLista    @relation(fields: [listaId], references: [id])
  template    POPTemplate @relation(fields: [templateId], references: [id])

  @@unique([listaId, templateId])
  @@map("pop_lista_tarefas")
}

model POPListaColaborador {
  id          Int @id @default(autoincrement())
  listaId     Int @map("lista_id")
  usuarioId   Int @map("usuario_id")

  lista       POPLista @relation(fields: [listaId], references: [id])
  usuario     Usuario  @relation(fields: [usuarioId], references: [id])

  @@unique([listaId, usuarioId])
  @@map("pop_lista_colaboradores")
}

model POPExecucao {
  id              Int            @id @default(autoincrement())
  listaId         Int            @map("lista_id")
  usuarioId       Int            @map("usuario_id")
  status          StatusExecucao @default(EM_ANDAMENTO)
  arquivada       Boolean        @default(false)
  restauranteId   Int            @map("restaurante_id")
  criadoEm        DateTime       @default(now()) @map("criado_em")
  finalizadoEm    DateTime?      @map("finalizado_em")

  lista           POPLista @relation(fields: [listaId], references: [id])
  usuario         Usuario  @relation(fields: [usuarioId], references: [id])
  itens           POPExecucaoItem[]

  @@map("pop_execucoes")
}

model POPExecucaoItem {
  id              Int      @id @default(autoincrement())
  execucaoId      Int      @map("execucao_id")
  templateId      Int      @map("template_id")
  tarefaNome      String   @map("tarefa_nome")
  concluido       Boolean  @default(false)
  valor           String?
  foto            String?
  observacao      String?
  concluidoEm     DateTime? @map("concluido_em")

  execucao        POPExecucao @relation(fields: [execucaoId], references: [id])

  @@map("pop_execucao_itens")
}
```

### NestJS Module

```
apps/api/src/modules/pop/
├── pop.module.ts
├── pop-admin.controller.ts        # Categorias, templates, listas, auditoria
├── pop-collab.controller.ts       # Execucao pelo colaborador
├── pop.service.ts
└── dto/
```

### Endpoints Resumo

- **Admin**: CRUD categorias, CRUD templates, CRUD listas POP, gestao de execucoes, auditoria
- **Collaborator**: Listar minhas listas POP, iniciar execucao, marcar itens, enviar foto, finalizar

---

## 5.2 Checklists de Compras

### O que e

Checklists gerados automaticamente a partir de submissoes aprovadas, para o comprador usar no mercado/fornecedor.

### Prisma Schema

```prisma
enum ChecklistStatus {
  ATIVO
  FINALIZADO
}

model Checklist {
  id              Int             @id @default(autoincrement())
  submissaoId     Int?            @map("submissao_id")
  titulo          String
  status          ChecklistStatus @default(ATIVO)
  restauranteId   Int             @map("restaurante_id")
  criadoEm        DateTime        @default(now()) @map("criado_em")

  itens           ChecklistItem[]

  @@map("checklists")
}

model ChecklistItem {
  id              Int      @id @default(autoincrement())
  checklistId     Int      @map("checklist_id")
  itemNome        String   @map("item_nome")
  quantidade      Float
  unidade         String
  comprado        Boolean  @default(false)
  compradoEm      DateTime? @map("comprado_em")

  checklist       Checklist @relation(fields: [checklistId], references: [id])

  @@map("checklist_itens")
}
```

### Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/admin/checklists` | Listar checklists |
| `GET` | `/admin/checklists/:id` | Detalhes com itens |
| `POST` | `/admin/checklists/gerar` | Gerar de submissao aprovada |
| `PUT` | `/admin/checklists/:id/itens/:itemId` | Marcar item como comprado |
| `POST` | `/admin/checklists/:id/finalizar` | Finalizar checklist |

---

## 5.3 Listas Rapidas

### O que e

Listas de emergencia que qualquer colaborador pode criar para compras urgentes fora do fluxo normal de estoque.

### Prisma Schema

```prisma
enum StatusListaRapida {
  RASCUNHO
  PENDENTE
  APROVADA
  REJEITADA
}

enum PrioridadeItem {
  PREVENCAO
  PRECISA_COMPRAR
  URGENTE
}

model ListaRapida {
  id              Int               @id @default(autoincrement())
  titulo          String
  descricao       String?
  status          StatusListaRapida @default(RASCUNHO)
  usuarioId       Int               @map("usuario_id")
  restauranteId   Int               @map("restaurante_id")
  criadoEm        DateTime          @default(now()) @map("criado_em")

  usuario         Usuario @relation(fields: [usuarioId], references: [id])
  itens           ListaRapidaItem[]

  @@map("listas_rapidas")
}

model ListaRapidaItem {
  id              Int            @id @default(autoincrement())
  listaRapidaId   Int            @map("lista_rapida_id")
  nome            String
  quantidade      Float
  unidade         String?
  prioridade      PrioridadeItem @default(PRECISA_COMPRAR)

  listaRapida     ListaRapida @relation(fields: [listaRapidaId], references: [id])

  @@map("lista_rapida_itens")
}

enum SugestaoStatus {
  PENDENTE
  APROVADA
  REJEITADA
}

model SugestaoItem {
  id              Int            @id @default(autoincrement())
  nome            String
  descricao       String?
  status          SugestaoStatus @default(PENDENTE)
  usuarioId       Int            @map("usuario_id")
  restauranteId   Int            @map("restaurante_id")
  criadoEm        DateTime       @default(now()) @map("criado_em")

  usuario         Usuario @relation(fields: [usuarioId], references: [id])

  @@map("sugestoes_itens")
}
```

### Endpoints

- **Collaborator**: CRUD listas rapidas, submeter para aprovacao, sugerir itens
- **Admin**: Aprovar/rejeitar listas rapidas, gerenciar sugestoes

---

## 5.4 Notificacoes + Audit Logs

### Prisma Schema

```prisma
enum TipoNotificacao {
  SUBMISSAO_LISTA
  SUBMISSAO_LISTA_RAPIDA
  SUGESTAO_ITEM
  LISTA_APROVADA
  LISTA_REJEITADA
  PEDIDO_APROVADO
  PEDIDO_REJEITADO
}

model Notificacao {
  id              Int              @id @default(autoincrement())
  usuarioId       Int              @map("usuario_id")
  tipo            TipoNotificacao
  titulo          String
  mensagem        String
  lida            Boolean          @default(false)
  recursoId       Int?             @map("recurso_id")
  recursoTipo     String?          @map("recurso_tipo")
  restauranteId   Int?             @map("restaurante_id")
  criadoEm        DateTime         @default(now()) @map("criado_em")

  usuario         Usuario @relation(fields: [usuarioId], references: [id])

  @@map("notificacoes")
}

model AppLog {
  id              Int      @id @default(autoincrement())
  acao            String
  entidade        String
  entidadeId      Int?     @map("entidade_id")
  mensagem        String
  usuarioId       Int?     @map("usuario_id")
  restauranteId   Int?     @map("restaurante_id")
  ip              String?
  metadata        Json?
  criadoEm        DateTime @default(now()) @map("criado_em")

  @@map("app_logs")
}
```

### Endpoints Notificacoes

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/v1/notificacoes` | Minhas notificacoes |
| `GET` | `/v1/notificacoes/count` | Contagem de nao lidas |
| `PUT` | `/v1/notificacoes/:id/lida` | Marcar como lida |
| `PUT` | `/v1/notificacoes/ler-todas` | Marcar todas como lidas |

### Endpoints Logs (Admin)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/admin/logs` | Listar logs (com filtros) |

---

## 5.5 Dashboard Global

### Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/admin/dashboard-summary` | Resumo (total itens, pedidos, submissoes) |
| `GET` | `/admin/recent-activities` | Atividades recentes |
| `GET` | `/admin/activity-summary` | Resumo de atividade (graficos) |
| `GET` | `/collaborator/dashboard-summary` | Dashboard do colaborador |

### Next.js

- Usar Chart.js (mesmo do app atual) ou Recharts para graficos
- Server Components para carregar dados iniciais (SSR)
- Client Components para interatividade dos graficos

---

## Verificacao da Fase 5

1. Admin cria templates POP, monta listas, atribui colaboradores
2. Collaborator ve listas POP do dia, executa checklist, envia fotos
3. Admin audita execucoes POP
4. Checklists de compras gerados automaticamente
5. Collaborator cria listas rapidas, admin aprova/rejeita
6. Notificacoes aparecem em tempo real (ou com polling)
7. Dashboard mostra metricas e graficos atualizados
8. Logs de auditoria registram acoes

## Proxima Fase

-> `07_FEATURES_NOVAS.md`
