# 04 — Fase 4: Listas Rápidas, Sugestões e POPs

## Objetivo

Implementar os módulos auxiliares: listas rápidas (compras avulsas fora do ciclo normal),
sugestões de novos itens pelos colaboradores e POPs (Procedimentos Operacionais Padrão).

---

## Tarefa 4.1 — Listas Rápidas

### Schema Prisma

```prisma
enum StatusListaRapida {
  RASCUNHO
  PENDENTE
  APROVADO
  REJEITADO
  ARQUIVADO
}

model ListaRapida {
  id            String            @id @default(cuid())
  titulo        String
  status        StatusListaRapida @default(RASCUNHO)
  usuario       Usuario           @relation(fields: [usuarioId], references: [id])
  usuarioId     String
  restaurante   Restaurante       @relation(fields: [restauranteId], references: [id])
  restauranteId String
  itens         ListaRapidaItem[]
  criadoEm     DateTime          @default(now())
  atualizadoEm DateTime          @updatedAt
}

model ListaRapidaItem {
  id            String      @id @default(cuid())
  listaRapida   ListaRapida @relation(fields: [listaRapidaId], references: [id])
  listaRapidaId String
  nomeItem      String
  quantidade    Float
  unidade       String?
  marcado       Boolean     @default(false)
  criadoEm     DateTime    @default(now())
}
```

### Migration

```bash
npx prisma migrate dev --name add-listas-rapidas
```

### Backend

```
# Colaborador
POST   /v1/collaborator/listas-rapidas           → criar rascunho
GET    /v1/collaborator/listas-rapidas           → minhas listas
GET    /v1/collaborator/listas-rapidas/:id       → detalhe
PUT    /v1/collaborator/listas-rapidas/:id       → atualizar rascunho
POST   /v1/collaborator/listas-rapidas/:id/submeter → status = PENDENTE
DELETE /v1/collaborator/listas-rapidas/:id       → deletar rascunho

# Admin
GET    /v1/admin/listas-rapidas                  → todas (filtro por status)
GET    /v1/admin/listas-rapidas/:id              → detalhe
POST   /v1/admin/listas-rapidas/:id/aprovar
POST   /v1/admin/listas-rapidas/:id/rejeitar
PUT    /v1/admin/listas-rapidas/:id/arquivar
PUT    /v1/admin/lista-rapida-itens/:id/marcar   → toggle marcado
```

### Frontend (Colaborador)

- `/collaborator/listas-rapidas` → histórico + botão "Nova Lista Rápida"
- `/collaborator/listas-rapidas/criar` → form: título + adicionar itens dinamicamente
- `/collaborator/listas-rapidas/[id]` → editar rascunho ou visualizar submetida

### Frontend (Admin)

- `/admin/listas-rapidas` → tabela com tabs por status
- `/admin/listas-rapidas/[id]` → detalhe com ações de aprovação e marcação de itens

### Referência Legado

- `legacy/frontend/src/features/colaborador/MinhasListasRapidas.tsx`
- `legacy/frontend/src/features/colaborador/CriarListaRapida.tsx`
- `legacy/frontend/src/features/admin/GerenciarListasRapidas.tsx`
- `legacy/frontend/src/features/admin/DetalhesListaRapida.tsx`

### Checkpoint Inline

```bash
git add .
git commit -m "feat: listas rapidas"
```

---

## Tarefa 4.2 — Sugestões de Itens

### Schema Prisma

```prisma
enum StatusSugestao {
  PENDENTE
  APROVADO
  REJEITADO
}

model SugestaoItem {
  id            String        @id @default(cuid())
  nomeItem      String
  descricao     String?
  unidade       String?
  motivacao     String?
  status        StatusSugestao @default(PENDENTE)
  usuario       Usuario       @relation(fields: [usuarioId], references: [id])
  usuarioId     String
  restaurante   Restaurante   @relation(fields: [restauranteId], references: [id])
  restauranteId String
  itemCriado    Item?         @relation(fields: [itemCriadoId], references: [id])
  itemCriadoId  String?
  criadoEm     DateTime      @default(now())
  atualizadoEm DateTime      @updatedAt
}
```

### Migration

```bash
npx prisma migrate dev --name add-sugestoes-itens
```

### Backend

```
# Colaborador
POST /v1/collaborator/sugestoes           → criar sugestão
GET  /v1/collaborator/sugestoes           → minhas sugestões

# Admin
GET  /v1/admin/sugestoes                  → todas (filtro por status)
POST /v1/admin/sugestoes/:id/aprovar
  Body: { areaId?: string, fornecedorId?: string }
  Lógica: cria Item a partir da sugestão; vincula itemCriadoId; status = APROVADO
POST /v1/admin/sugestoes/:id/rejeitar
  Body: { motivo?: string }
```

### Frontend (Colaborador)

- `/collaborator/sugestoes` → histórico de sugestões enviadas
- Modal ou formulário para criar nova sugestão (acessível do catálogo ou menu)

### Frontend (Admin)

- `/admin/sugestoes` → lista com tabs PENDENTE / APROVADO / REJEITADO
- Ações: Aprovar (com opção de selecionar área e fornecedor) / Rejeitar

### Referência Legado

- `legacy/frontend/src/features/colaborador/MinhasSugestoes.tsx`
- `legacy/frontend/src/features/admin/GerenciarSugestoes.tsx`

### Checkpoint Inline

```bash
git add .
git commit -m "feat: sugestoes de itens"
```

---

## Tarefa 4.3 — POPs (Procedimentos Operacionais Padrão)

Este é o módulo mais complexo desta fase.

### Schema Prisma

```prisma
enum TipoPOP {
  ABERTURA
  FECHAMENTO
  LIMPEZA
  OPERACIONAL
  PERSONALIZADO
}

enum StatusPOPExecucao {
  EM_ANDAMENTO
  CONCLUIDO
  CANCELADO
}

model POPTemplate {
  id            String      @id @default(cuid())
  nome          String
  tipo          TipoPOP
  descricao     String?
  restaurante   Restaurante @relation(fields: [restauranteId], references: [id])
  restauranteId String
  listas        POPLista[]
  criadoEm     DateTime    @default(now())
  atualizadoEm DateTime    @updatedAt
}

model POPLista {
  id          String          @id @default(cuid())
  template    POPTemplate     @relation(fields: [templateId], references: [id])
  templateId  String
  titulo      String
  ordem       Int             @default(0)
  itens       POPListaItem[]
  execucoes   POPExecucao[]
  criadoEm   DateTime        @default(now())
  atualizadoEm DateTime      @updatedAt
}

model POPListaItem {
  id        String   @id @default(cuid())
  lista     POPLista @relation(fields: [listaId], references: [id])
  listaId   String
  descricao String
  ordem     Int      @default(0)
}

model POPExecucao {
  id        String            @id @default(cuid())
  lista     POPLista          @relation(fields: [listaId], references: [id])
  listaId   String
  usuario   Usuario           @relation(fields: [usuarioId], references: [id])
  usuarioId String
  status    StatusPOPExecucao @default(EM_ANDAMENTO)
  itens     POPExecucaoItem[]
  criadoEm DateTime           @default(now())
  concluidoEm DateTime?
}

model POPExecucaoItem {
  id          String      @id @default(cuid())
  execucao    POPExecucao @relation(fields: [execucaoId], references: [id])
  execucaoId  String
  itemRef     POPListaItem @relation(fields: [itemRefId], references: [id])
  itemRefId   String
  marcado     Boolean     @default(false)
  marcadoEm  DateTime?
}
```

### Migration

```bash
npx prisma migrate dev --name add-pops
```

### Backend

```
# Admin — Templates
GET    /v1/admin/pop-templates           → listar
POST   /v1/admin/pop-templates           → criar
PUT    /v1/admin/pop-templates/:id       → editar
DELETE /v1/admin/pop-templates/:id       → deletar

# Admin — Listas de POP
GET    /v1/admin/pop-listas              → listar (filtro por templateId)
POST   /v1/admin/pop-listas              → criar (dentro de um template)
PUT    /v1/admin/pop-listas/:id          → editar
DELETE /v1/admin/pop-listas/:id          → deletar

# Admin — Auditoria de Execuções
GET    /v1/admin/pop-execucoes           → histórico de execuções

# Colaborador — Execução
GET    /v1/collaborator/pop-listas       → listas disponíveis para executar
POST   /v1/collaborator/pop-execucoes
  Body: { listaId: string }
  Lógica: cria execução com POPExecucaoItem para cada item da lista
GET    /v1/collaborator/pop-execucoes/:id     → detalhe
PUT    /v1/collaborator/pop-execucao-itens/:id/marcar → toggle marcado
POST   /v1/collaborator/pop-execucoes/:id/concluir    → status = CONCLUIDO
```

### Frontend (Admin)

- `/admin/pop-templates` → listar templates, criar, editar (com sub-listas e itens)
- `/admin/pop-execucoes` → histórico de execuções com filtros por lista, colaborador, data

### Frontend (Colaborador)

- `/collaborator/pop-listas` → listas disponíveis, botão "Executar"
- `/collaborator/pop-execucoes/[id]` → checklist interativo; botão Concluir
- `/collaborator/pop-execucoes` → histórico de execuções

### Referência Legado

- `legacy/frontend/src/features/admin/POPTemplates.tsx`
- `legacy/frontend/src/features/admin/POPListas.tsx`
- `legacy/frontend/src/features/admin/POPAuditoria.tsx`
- `legacy/frontend/src/features/collaborator/MinhasPOPListas.tsx`
- `legacy/frontend/src/features/collaborator/ExecutarPOPChecklist.tsx`

---

## Checkpoint Fase 4

```bash
git add .
git commit -m "feat: listas rapidas, sugestoes e POPs"
```

Após o commit:
1. Anotar o hash: `git log --oneline -1`
2. Atualizar `PONTEIRO.md`:
   - Status: `FASE 5 — não iniciada`
   - Última tarefa concluída: `4.3 — POPs`
   - Próximo passo: `Iniciar Fase 5 — Tarefa 5.1`
   - Última branch/commit: `<hash>`
