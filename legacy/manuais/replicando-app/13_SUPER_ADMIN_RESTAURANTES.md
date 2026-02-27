# 13 — Super Admin: Gerenciamento de Restaurantes

> O SUPER_ADMIN controla todos os restaurantes da plataforma: criação direta, aprovação de solicitações públicas, monitoramento global, impersonação de usuários e exportação de relatórios.

---

## Visão Geral

```
┌──────────────────────────────────────────────────────────────┐
│                     SUPER_ADMIN                               │
│  restaurante_id = NULL → acesso a TUDO sem filtro de tenant   │
└──────────────────────┬───────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   Restaurante A  Restaurante B  Restaurante C
   (ADMIN + COLLs) (ADMIN + COLLs) (ADMIN + COLLs)
```

**Diferença de acesso:**
- `ADMIN` → vê apenas dados do seu `restaurante_id`
- `SUPER_ADMIN` → `restaurante_id = NULL` → sem filtro → vê todos os restaurantes

---

## Modelos do Banco

### Restaurante

```python
class Restaurante(db.Model, SerializerMixin):
    __tablename__ = 'restaurantes'

    id            = db.Column(db.Integer, primary_key=True)
    nome          = db.Column(db.String(200), nullable=False, unique=True)
    slug          = db.Column(db.String(100), nullable=False, unique=True, index=True)
    ativo         = db.Column(db.Boolean, default=True, nullable=False)
    criado_em     = db.Column(db.DateTime, default=brasilia_now)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now)
    deletado      = db.Column(db.Boolean, default=False, nullable=False)

    usuarios = db.relationship('Usuario', back_populates='restaurante', lazy='dynamic')
```

- `slug` é gerado automaticamente a partir do `nome` (via `slugify`)
- `deletado=True` é soft-delete — o registro permanece no banco
- `ativo=False` desativa o restaurante sem excluir

### SolicitacaoRestaurante

```python
class StatusSolicitacaoRestaurante(enum.Enum):
    PENDENTE   = "PENDENTE"
    APROVADO   = "APROVADO"
    REJEITADO  = "REJEITADO"

class SolicitacaoRestaurante(db.Model, SerializerMixin):
    __tablename__ = 'solicitacoes_restaurante'

    id = db.Column(db.Integer, primary_key=True)

    # Dados do restaurante
    nome_restaurante     = db.Column(db.String(200), nullable=False)
    endereco_restaurante = db.Column(db.String(400), nullable=False)
    telefone_restaurante = db.Column(db.String(20), nullable=False)
    email_restaurante    = db.Column(db.String(120), nullable=False)
    cnpj                 = db.Column(db.String(18), nullable=True)
    razao_social         = db.Column(db.String(200), nullable=True)

    # Dados do responsável
    nome_responsavel     = db.Column(db.String(100), nullable=False)
    email_responsavel    = db.Column(db.String(120), nullable=False)
    telefone_responsavel = db.Column(db.String(20), nullable=False)

    # Controle
    status           = db.Column(db.Enum(StatusSolicitacaoRestaurante), default=StatusSolicitacaoRestaurante.PENDENTE)
    criado_em        = db.Column(db.DateTime, default=brasilia_now)
    processado_em    = db.Column(db.DateTime, nullable=True)
    processado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)

    # Resultado após aprovação
    motivo_rejeicao          = db.Column(db.Text, nullable=True)
    restaurante_criado_id    = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='SET NULL'), nullable=True)
    usuario_admin_criado_id  = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    senha_gerada             = db.Column(db.String(20), nullable=True)
```

---

## Fluxo 1: Solicitação Pública de Cadastro

```
Interessado preenche formulário público
        ↓
POST /api/auth/solicitacoes-restaurante (SEM autenticação)
        ↓
SolicitacaoRestaurante criada (status=PENDENTE)
        ↓
Todos SUPER_ADMINs recebem notificação
        ↓
SUPER_ADMIN revisa em /admin/solicitacoes-restaurante
        ↓
┌──── Aprovar ─────────────────────────────────────────┐
│  1. Cria Restaurante (nome + slug auto)               │
│  2. Cria Usuario (ADMIN, aprovado=True)               │
│  3. Gera senha aleatória de 12 chars                  │
│  4. Armazena senha em SolicitacaoRestaurante          │
│  5. Exibe credenciais para o SUPER_ADMIN copiar       │
└──────────────────────────────────────────────────────┘
        OU
┌──── Rejeitar ────────────────────────────────────────┐
│  status=REJEITADO + motivo_rejeicao                   │
└──────────────────────────────────────────────────────┘
```

### Endpoint público (sem auth)

```
POST /api/auth/solicitacoes-restaurante
{
  "nome_restaurante":     "Pizzaria Kaizen",
  "endereco_restaurante": "Rua A, 123 - SP",
  "telefone_restaurante": "(11) 99999-9999",
  "email_restaurante":    "contato@pizzaria.com",
  "cnpj":                 "12.345.678/0001-90",  ← opcional
  "razao_social":         "Pizzaria X LTDA",      ← opcional
  "nome_responsavel":     "João Silva",
  "email_responsavel":    "joao@pizzaria.com",
  "telefone_responsavel": "(11) 98888-8888"
}
→ 201: { "solicitacao_id": 42, "message": "Solicitação enviada com sucesso!" }
→ 409: se já existe PENDENTE com mesmo email_responsavel
```

### Aprovação (SUPER_ADMIN)

```python
def aprovar_solicitacao_restaurante(solicitacao_id, admin_id):
    # 1. Cria Restaurante
    restaurante = Restaurante(
        nome=solicitacao.nome_restaurante.strip(),
        slug=gerar_slug_unico(solicitacao.nome_restaurante),  # "pizzaria-kaizen", "pizzaria-kaizen-2"...
        ativo=True
    )
    db.session.add(restaurante)
    db.session.flush()  # obter ID

    # 2. Gera senha aleatória
    senha_gerada = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

    # 3. Cria usuario ADMIN
    usuario_admin = Usuario(
        nome=solicitacao.nome_responsavel,
        email=solicitacao.email_responsavel,
        senha_hash=generate_password_hash(senha_gerada),
        senha_texto_puro=senha_gerada,      # ← guardado para exibir ao SUPER_ADMIN
        role=UserRoles.ADMIN,
        restaurante_id=restaurante.id,
        aprovado=True,
        ativo=True
    )
    db.session.add(usuario_admin)

    # 4. Atualiza solicitacao
    solicitacao.status = StatusSolicitacaoRestaurante.APROVADO
    solicitacao.processado_por_id = admin_id
    solicitacao.restaurante_criado_id = restaurante.id
    solicitacao.usuario_admin_criado_id = usuario_admin.id
    solicitacao.senha_gerada = senha_gerada

    db.session.commit()
```

**Resposta 200:**
```json
{
  "restaurante": { "id": 6, "nome": "Pizzaria Kaizen", "slug": "pizzaria-kaizen", "ativo": true },
  "usuario_admin": {
    "id": 12,
    "nome": "João Silva",
    "email": "joao@pizzaria.com",
    "senha_gerada": "aB3xYzQ9kLmN"
  },
  "observacao": "IMPORTANTE: Copie a senha gerada e envie ao responsável. Ela não será exibida novamente."
}
```

---

## Fluxo 2: Criação Direta de Restaurante (SUPER_ADMIN)

```
POST /api/admin/restaurantes
{ "nome": "Restaurante Novo" }
→ Cria Restaurante com slug auto-gerado
→ Não cria usuário — admin cria manualmente depois
```

---

## Endpoints Completos

### Restaurantes (todos `@super_admin_required`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/restaurantes` | Lista todos os restaurantes (com credenciais do admin) |
| POST | `/api/admin/restaurantes` | Cria restaurante direto |
| GET | `/api/admin/restaurantes/:id` | Detalhe de um restaurante |
| PUT | `/api/admin/restaurantes/:id` | Atualiza nome ou `ativo` |
| DELETE | `/api/admin/restaurantes/:id` | Deleta com todos os dados em cascata |
| GET | `/api/admin/restaurantes/:id/usuarios` | Lista usuários do restaurante (com senhas) |

### Solicitações (`@super_admin_required` exceto POST)

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/api/auth/solicitacoes-restaurante` | Público | Envia solicitação |
| GET | `/api/admin/solicitacoes-restaurante` | SUPER_ADMIN | Lista (`?status=PENDENTE\|APROVADO\|REJEITADO`) |
| GET | `/api/admin/solicitacoes-restaurante/:id` | SUPER_ADMIN | Detalhes |
| PUT | `/api/admin/solicitacoes-restaurante/:id/aprovar` | SUPER_ADMIN | Aprova → cria restaurante + admin |
| PUT | `/api/admin/solicitacoes-restaurante/:id/rejeitar` | SUPER_ADMIN | Rejeita com motivo |

### Usuários por restaurante

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/admin/users/criar-admin-restaurante` | Cria admin para um restaurante |
| PUT | `/api/admin/users/:id/atribuir-restaurante` | Move usuário para outro restaurante |

---

## Impersonação (Acessar como outro usuário)

O SUPER_ADMIN pode entrar na conta de qualquer usuário de qualquer restaurante para diagnóstico ou suporte.

### Como funciona

```
SUPER_ADMIN clica "Impersonar" em um usuário
        ↓
POST /api/admin/impersonar
{ "usuario_id": 5 }
        ↓
Backend cria JWT para o usuário-alvo com claim especial:
{
  "sub": "5",                          ← ID do usuário alvo
  "role": "ADMIN",                     ← role do alvo
  "restaurante_id": 3,                 ← restaurante do alvo
  "impersonated_by": 1,                ← ID do SUPER_ADMIN
  "impersonated_by_nome": "Super",
  "impersonated_by_email": "super@k.com"
}
        ↓
Frontend recebe token e faz login com ele
Frontend exibe banner "Você está visualizando como [nome]"
        ↓
SUPER_ADMIN vê tudo como se fosse o usuário alvo
        ↓
Clica "Encerrar Impersonação"
        ↓
POST /api/admin/impersonar/encerrar
        ↓
Backend lê "impersonated_by" do JWT atual
Cria novo JWT para o SUPER_ADMIN original
Frontend restaura sessão do SUPER_ADMIN
```

### Endpoints

```
POST /api/admin/impersonar
Body: { "usuario_id": 5 }
→ { "access_token": "eyJ..." }

POST /api/admin/impersonar/encerrar
(sem body — usa o JWT atual para saber quem é o SUPER_ADMIN)
→ { "access_token": "eyJ..." }  ← token do SUPER_ADMIN original
```

### Frontend — detecção de impersonação

O `AuthContext` lê o campo `impersonated_by` do token decodificado:

```typescript
// AuthContext.tsx
setUser({
    id: decodedUser.sub,
    role: decodedUser.role,
    restaurante_id: decodedUser.restaurante_id,
    impersonated_by: decodedUser.impersonated_by ?? null,           // ← presente = impersonando
    impersonated_by_nome: decodedUser.impersonated_by_nome ?? null,
    impersonated_by_email: decodedUser.impersonated_by_email ?? null
});
```

```typescript
// Layout.tsx — banner de impersonação
const impersonationActive = Boolean(user?.impersonated_by);
// Exibe faixa "Acessando como [nome]" no topo quando true
```

### Proteção contra sessão simultânea

O backend também escuta o evento `SESSION_SUPERSEDED`:
```typescript
// api.ts
if (error.response?.status === 401 && error.response?.data?.code === 'SESSION_SUPERSEDED') {
    window.dispatchEvent(new CustomEvent('kaizen-session-superseded'));
}
```

---

## Super Dashboard (Monitoramento Global)

**Rota:** `/admin/global`
**Componente:** `GlobalDashboard.tsx`

### Endpoint

```
GET /api/admin/super-dashboard?restaurante_id=6&period=30
```

- `restaurante_id` opcional — sem ele, traz dados de **todos** os restaurantes
- `period` = janela de dias (7, 30, 90)
- **Cache de 60 segundos** no backend para queries pesadas

### Resposta

```json
{
  "summary": {
    "total_restaurantes": 5,
    "total_users": 42,
    "users_by_role": { "super_admin": 2, "admin": 5, "collaborator": 35 },
    "pending_approvals": 3,
    "total_listas": 18,
    "total_itens": 250,
    "total_submissoes": 156,
    "submissoes_hoje": 12,
    "pending_cotacoes": 8,
    "completed_cotacoes": 24
  },
  "submissions_per_day": {
    "labels": ["01/02", "02/02", "..."],
    "data": [2, 5, 3]
  },
  "submissions_per_week": { "labels": [...], "data": [...] },
  "users_created_per_month": { "labels": [...], "data": [...] },
  "submission_status_distribution": { "APROVADO": 80, "PENDENTE": 15, "REJEITADO": 5 },
  "top_usuarios": [...],
  "top_fornecedores": [...],
  "top_listas": [...]
}
```

### Exportações

```
GET /api/admin/super-dashboard/export/pdf?restaurante_id=6&period=30
→ Arquivo PDF binário

GET /api/admin/super-dashboard/export/excel?restaurante_id=6&period=30
→ Arquivo XLSX binário
```

### Seções do dashboard (GlobalDashboard.tsx)

- **SummaryCards** — KPIs principais (totais, pendências)
- **TemporalCharts** — Gráficos diários/semanais/mensais (Chart.js)
- **ListsSection** — Listas mais ativas
- **ChecklistsSection** — Status dos checklists
- **UsersSection** — Usuários por role, aprovações pendentes
- **SuppliersSection** — Fornecedores cadastrados
- **SuggestionsSection** — Sugestões de novos itens
- **ActivityTimeline** — Log de atividades recentes

As seções são reordenáveis via **drag-and-drop** (DnD Kit).

---

## Gerenciar Restaurantes — Tela

**Rota:** `/admin/restaurantes`
**Componente:** `GerenciarRestaurantes.tsx`

**Funcionalidades:**
- Tabela com todos os restaurantes (nome, slug, status ativo, data criação)
- Botão "Criar restaurante" (modal com campo nome)
- Editar nome / toggle ativo
- Exclusão com modal de dupla confirmação
- Ver usuários do restaurante (com e-mail + senha gerada)
- Criar admin para o restaurante
- Trocar senha de usuários
- Gerar convites
- Ver logs de auditoria por restaurante
- **Botão "Impersonar"** por usuário (abre sessão como aquele usuário)

---

## Solicitações — Tela

**Rota:** `/admin/solicitacoes-restaurante`
**Componente:** `SolicitacoesRestaurante.tsx`

**Funcionalidades:**
- Tabs: `Pendentes | Aprovadas | Rejeitadas`
- Tabela: Nome do restaurante | Responsável | E-mail | Data | Status
- Modal de detalhes (todos os campos da solicitação)
- Modal de aprovação: exibe credenciais geradas + botão copiar
- Modal de rejeição: campo de motivo obrigatório
- Badge de status colorido
- Botões de ação com texto explícito: **Detalhes**, **Aprovar**, **Rejeitar** (usando `FontAwesomeIcon`)

---

## Personalização da Navbar por Perfil

O SUPER_ADMIN pode personalizar a navbar para cada tipo de usuário, definindo quais itens aparecem, a ordem dos grupos e itens, e quais botões ficam ocultos.

### Seletor de Perfil (sempre visível)

```
┌─────────────────────────────────────┐
│  Perfil: [SUPER_ADMIN ▾]           │  ← Dropdown sempre visível no topo da sidebar
│  [✏️ Editar]                        │  ← Aparece apenas em desktop, sidebar expandida
├─────────────────────────────────────┤
│  ▸ VISÃO GERAL                      │
│    Dashboard Admin                   │
│    Dashboard Global                  │
│  ▸ GESTÃO                           │
│    Submissões                       │
│    ...                              │
└─────────────────────────────────────┘
```

**Opções do dropdown:** SUPER_ADMIN, ADMIN, COLLABORATOR, SUPPLIER
- Ao trocar o perfil, a navbar carrega o layout salvo para aquele perfil (`GET /auth/navbar-layout?role=ADMIN`)
- Cada perfil mostra apenas os itens de menu permitidos para aquela role

### Modo de Edição

Ao clicar "Editar" (somente desktop + sidebar expandida):

```
┌─────────────────────────────────────┐
│  Editando: ADMIN                    │
│  [💾 Salvar]  [✖ Cancelar]         │
├─────────────────────────────────────┤
│  ≡ VISÃO GERAL          [👁 Ocultar grupo]│
│    ≡ Dashboard Admin     [👁]  [✏️]  │  ← Drag handle, visibilidade, renomear
│    ≡ Estatísticas        [👁]  [✏️]  │
│  ≡ GESTÃO               [👁 Ocultar grupo]│
│    ≡ Submissões          [🚫] [✏️]  │  ← Item oculto (olho cortado)
│                                     │
│  [+ Novo Grupo]                     │
└─────────────────────────────────────┘
```

**Funcionalidades do modo de edição:**
- **Drag-and-drop de itens** entre grupos (arrastar pelo ≡ handle)
- **Drag-and-drop de grupos** para reordenar categorias
- **Ocultar/exibir item** individual (botão olho/olho-cortado)
- **Ocultar/exibir categoria inteira** — oculta todos os itens do grupo em cascata
- **Renomear item** (label customizado, não altera o item original)
- **Criar novo grupo** com nome personalizado
- **Remover grupo** (itens migram para "OUTROS")

### Persistência

```
POST /api/auth/navbar-layout
{
  "layout": {
    "groups": [
      { "id": "visao_geral", "title": "VISÃO GERAL", "items": ["admin_dashboard", "admin_estatisticas"] },
      { "id": "gestao", "title": "GESTÃO", "items": ["admin_submissoes", "admin_checklists"] }
    ],
    "hidden_items": ["admin_catalogo_global"],
    "item_labels": { "admin_dashboard": "Painel Principal" }
  },
  "role": "ADMIN"
}
```

- O backend armazena layouts por role em `navbar_layouts.layout` (campo JSON com estrutura `by_role`)
- **Importante (SQLAlchemy):** usar `flag_modified(layout, 'layout')` antes do `commit()` porque a função `_upsert_navbar_layout_for_role` muta o dicionário in-place (mesma referência Python), e SQLAlchemy não detecta a mudança sem o flag

### Itens de Menu Disponíveis

Cada item tem um `key` único e `roles` que definem em quais perfis ele pode aparecer:

| Key | Label Padrão | Roles |
|-----|-------------|-------|
| `admin_dashboard` | Dashboard Admin | ADMIN, SUPER_ADMIN |
| `admin_global` | Dashboard Global | SUPER_ADMIN |
| `admin_lista_rapida` | Lista Rápida | ADMIN, SUPER_ADMIN |
| `admin_listas_compras` | Listas de Compras | ADMIN, SUPER_ADMIN |
| `admin_catalogo_global` | Itens Cadastrados | ADMIN, SUPER_ADMIN |
| `admin_submissoes` | Submissões | ADMIN, SUPER_ADMIN |
| `admin_checklists` | Checklists de Compras | ADMIN, SUPER_ADMIN |
| `admin_sugestoes` | Sugestões de Itens | ADMIN, SUPER_ADMIN |
| `admin_restaurantes` | Restaurantes | SUPER_ADMIN |
| `admin_areas` | Áreas | ADMIN, SUPER_ADMIN |
| `admin_users` | Gerenciar Usuários | ADMIN, SUPER_ADMIN |
| `admin_fornecedores` | Fornecedores | ADMIN, SUPER_ADMIN |
| `admin_cotacoes` | Cotações | ADMIN, SUPER_ADMIN |
| `admin_estatisticas` | Estatísticas | ADMIN, SUPER_ADMIN |
| `collab_dashboard` | Minhas Listas | COLLABORATOR |
| `supplier_dashboard` | Portal Fornecedor | SUPPLIER |

### Fluxo Completo

```
SUPER_ADMIN seleciona perfil "ADMIN" no dropdown
        ↓
GET /auth/navbar-layout?role=ADMIN
        ↓
Frontend carrega e exibe navbar como ADMIN veria
        ↓
SUPER_ADMIN clica "Editar"
        ↓
Modo edição ativado: drag-and-drop, ocultar, renomear
        ↓
SUPER_ADMIN move "Estatísticas" para grupo "VISÃO GERAL"
        ↓
Clica "Salvar"
        ↓
POST /auth/navbar-layout { layout: {...}, role: "ADMIN" }
        ↓
Backend: flag_modified + commit → persistido
        ↓
Todos os ADMINs verão a nova navbar na próxima carga
```

---

## Regras de Negócio

1. `SUPER_ADMIN` tem `restaurante_id = NULL` — as queries de listagem devem verificar isso para não filtrar
2. Slug é gerado automaticamente: `slugify(nome)`. Se já existir, adiciona sufixo `-2`, `-3`, etc.
3. Ao aprovar solicitação: operação atômica — se qualquer etapa falhar, nada é criado
4. Senha gerada tem 12 caracteres (`string.ascii_letters + string.digits`), armazenada em `senha_texto_puro` e exibida **uma única vez** — o SUPER_ADMIN deve copiar antes de fechar o modal
5. Impersonação gera JWT com `impersonated_by` — o backend usa esse claim para restaurar a sessão original ao encerrar
6. Delete de restaurante é **hard delete** em cascata — remove pedidos, fornecedores, itens, usuários e tudo relacionado
7. Ao criar solicitação duplicada (mesmo `email_responsavel` com status PENDENTE), retorna 409
8. Todos os SUPER_ADMINs ativos recebem notificação quando nova solicitação chega
9. **Criação de recursos com escopo de restaurante:** como o SUPER_ADMIN não tem `restaurante_id` no JWT, ao criar recursos vinculados a um restaurante (ex: Listas de Compras via `ListasCompras.tsx`), o frontend deve exibir um seletor de restaurante e enviar `restaurante_id` no body da requisição. O backend valida e usa esse campo quando o criador é SUPER_ADMIN.

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/kaizen_app/models.py` | Modelos `Restaurante`, `SolicitacaoRestaurante`, enum `StatusSolicitacaoRestaurante` |
| `backend/kaizen_app/services.py` | `criar_restaurante`, `aprovar_solicitacao_restaurante`, `iniciar_impersonacao`, `get_super_dashboard_data` |
| `backend/kaizen_app/controllers.py` | Endpoints `/admin/restaurantes/*`, `/admin/solicitacoes-restaurante/*`, `/admin/impersonar`, `/admin/super-dashboard` |
| `frontend/src/features/admin/GerenciarRestaurantes.tsx` | CRUD de restaurantes, impersonar usuários |
| `frontend/src/features/admin/SolicitacoesRestaurante.tsx` | Revisar, aprovar, rejeitar solicitações |
| `frontend/src/features/dashboard/GlobalDashboard.tsx` | Dashboard global com filtro por restaurante |
| `frontend/src/pages/RegisterRestaurante.tsx` | Formulário público de solicitação |
| `frontend/src/context/AuthContext.tsx` | Detecta `impersonated_by` no JWT |
| `frontend/src/components/Layout.tsx` | Banner de impersonação, seletor de perfil, modo edição navbar, drag-and-drop |
| `frontend/src/components/Layout.module.css` | Estilos da navbar: grupos, edição, itens ocultos (`.menuGroupHidden`) |
| `backend/kaizen_app/models.py` | Modelo `NavbarLayout` (tabela singleton com JSON por role) |
| `backend/kaizen_app/services.py` | `save_navbar_layout`, `get_navbar_layout`, `_upsert_navbar_layout_for_role` |
