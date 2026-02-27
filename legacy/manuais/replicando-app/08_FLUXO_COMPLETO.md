# 08 — Fluxo Completo de Dados

> Documento que descreve o fluxo de ponta a ponta, desde o cadastro até o pedido ao fornecedor.

---

## Visão Geral em Uma Página

```
┌──────────────────────────────────────────────────────────────────────┐
│                        SETUP (Admin)                                  │
│  1. Cria restaurante  →  2. Cadastra colaboradores                   │
│  3. Cria catálogo (ListaMaeItem)  →  4. Cria listas                  │
│  5. Adiciona itens às listas  →  6. Atribui colaboradores            │
└───────────────────────────────┬──────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────┐
│                     OPERAÇÃO SEMANAL (Colaborador)                    │
│  1. Acessa "Minhas Listas"                                           │
│  2. Entra em "Estoque" da lista                                      │
│  3. Atualiza quantidade_atual de cada item                           │
│  4. Clica "Submeter"  →  Submissao criada (PENDENTE) + Pedidos       │
└───────────────────────────────┬──────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────┐
│                      APROVAÇÃO (Admin)                                │
│  1. Vê notificação de nova submissão                                 │
│  2. Acessa submissão  →  Analisa pedidos                             │
│  3. Aprova / Rejeita (todo ou parcialmente)                          │
│  Submissão → APROVADO / REJEITADO / PARCIALMENTE_APROVADO            │
└───────────────────────────────┬──────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    CONSOLIDAÇÃO (Admin)                               │
│  1. Seleciona 2+ submissões APROVADAS                                │
│  2. Preview de merge (itens somados por lista_mae_item_id)           │
│  3. Gera texto WhatsApp                                              │
│  4. Copia / Envia ao fornecedor via WhatsApp                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Fluxo 1: Cadastro e Setup Inicial

### 1.1 Criação do Restaurante (SUPER_ADMIN)

```
POST /api/admin/restaurantes
{
  "nome": "Restaurante Kaizen",
  "slug": "kaizen-centro"
}
→ Cria registro em restaurantes
```

### 1.2 Criação do Admin do Restaurante (SUPER_ADMIN ou Script)

```bash
# Via script
python backend/create_admin_user.py
```

```
Ou via POST /api/admin/users
{
  "nome": "Admin",
  "email": "admin@kaizen.com",
  "senha": "senha123",
  "role": "ADMIN",
  "restaurante_id": 1
}
→ Cria usuario com aprovado=True
```

### 1.3 Cadastro do Catálogo Global

```
POST /api/admin/lista-mae-itens (repetido para cada item)
{
  "nome": "Cebola Roxa",
  "unidade": "kg"
}
→ Cria ListaMaeItem (restaurante_id do admin logado)
```

### 1.4 Criação das Listas

```
POST /api/admin/listas
{
  "nome": "Hortifruti - Semana",
  "descricao": "Compras semanais de hortifruti"
}
→ Cria Lista (restaurante_id do admin logado)
```

### 1.5 Adicionar Itens às Listas

```
POST /api/admin/listas/1/itens
{
  "item_id": 42,        ← ListaMaeItem.id
  "quantidade_minima": 10.0,
  "usa_threshold": false,
  "quantidade_por_fardo": 1.0
}
→ Cria ListaItemRef (lista_id=1, item_id=42)
→ quantidade_atual inicia em 0
```

### 1.6 Cadastrar e Atribuir Colaboradores

```
# Colaborador se registra
POST /api/auth/register
{
  "nome": "Maria Silva",
  "email": "maria@kaizen.com",
  "senha": "senha123"
}
→ Cria usuario com aprovado=False, role=COLLABORATOR

# Admin aprova
POST /api/admin/users/3/approve
→ aprovado=True

# Admin atribui lista
POST /api/admin/listas/1/colaboradores
{
  "usuario_ids": [3]
}
→ Cria entrada em lista_colaborador (lista_id=1, usuario_id=3)
```

---

## Fluxo 2: Operação Semanal (Colaborador)

### 2.1 Colaborador faz login

```
POST /api/auth/login
{
  "email": "maria@kaizen.com",
  "senha": "senha123"
}
→ Retorna { access_token: "eyJ..." }
→ Frontend salva em localStorage('accessToken')
→ AuthContext.setUser() com dados do token
→ React Router direciona para /collaborator/
```

### 2.2 Acessa listas atribuídas

```
GET /api/collaborator/minhas-listas
Authorization: Bearer {token}

→ Retorna listas onde usuario está em lista_colaborador
[
  {
    "id": 1,
    "nome": "Hortifruti - Semana",
    "total_itens": 18
  }
]
→ Frontend renderiza /collaborator/listas
```

### 2.3 Abre estoque de uma lista

```
GET /api/collaborator/listas/1/estoque
Authorization: Bearer {token}

→ Retorna todos ListaItemRef da lista
[
  {
    "item_id": 42,
    "item_nome": "Cebola Roxa",
    "quantidade_atual": 3.0,
    "quantidade_minima": 10.0,
    "pedido": 1.0          ← calculado: 3 <= 10, retorna 1
  },
  {
    "item_id": 43,
    "item_nome": "Batata",
    "quantidade_atual": 15.0,
    "quantidade_minima": 10.0,
    "pedido": 0.0          ← calculado: 15 > 10, não precisa
  }
]
→ Frontend renderiza /collaborator/listas/1/estoque
→ Inputs para cada quantidade_atual
→ Destaque visual: itens com pedido > 0
```

### 2.4 Atualiza quantidades

```
PUT /api/collaborator/listas/1/itens/42
{
  "quantidade_atual": 5.0
}
→ Atualiza ListaItemRef.quantidade_atual
→ Retorna novo pedido calculado
→ Frontend atualiza campo "Pedido" em tempo real
```

### 2.5 Submete a lista

```
POST /api/collaborator/listas/1/submeter
{
  "items": [
    {"item_id": 42, "quantidade_atual": 5.0},
    {"item_id": 43, "quantidade_atual": 15.0},
    {"item_id": 44, "quantidade_atual": 0.0}
  ]
}

Backend (services.submit_lista):
  1. Cria Submissao(lista_id=1, usuario_id=3, status=PENDENTE)
  2. Para item_id=42: pedido = max(10 - 5, 0) = 5 → Cria Pedido(qtd=5)
  3. Para item_id=43: pedido = max(10 - 15, 0) = 0 → NÃO cria pedido
  4. Para item_id=44: pedido = max(10 - 0, 0) = 10 → Cria Pedido(qtd=10)
  5. submissao.total_pedidos = 2
  6. Atualiza ListaItemRef.quantidade_atual para todos
  7. Cria Notificacao para admin

→ Retorna { submissao_id: 123, total_pedidos: 2, ... }
→ Frontend redireciona para /collaborator/submissoes
```

---

## Fluxo 3: Aprovação (Admin)

### 3.1 Admin recebe notificação

```
GET /api/auth/notificacoes
→ [
    {
      "id": 50,
      "tipo": "SUBMISSAO_LISTA",
      "titulo": "Nova submissão: Hortifruti - Semana",
      "mensagem": "Maria Silva submeteu a lista",
      "lida": false,
      "dados_extra": {"submissao_id": 123}
    }
  ]
→ Frontend exibe badge na navbar
```

### 3.2 Admin lista submissões pendentes

```
GET /api/admin/submissoes?status=PENDENTE
→ Lista de submissoes com status PENDENTE
→ Frontend: /admin/submissoes com tab "Pendentes"
```

### 3.3 Admin abre detalhes

```
GET /api/admin/submissoes/123
→ {
    id: 123,
    lista_nome: "Hortifruti - Semana",
    usuario_nome: "Maria Silva",
    status: "PENDENTE",
    pedidos: [
      {id: 501, item_nome: "Cebola Roxa", quantidade_solicitada: 5, status: "PENDENTE"},
      {id: 502, item_nome: "Cenoura", quantidade_solicitada: 10, status: "PENDENTE"}
    ]
  }
→ Frontend: /admin/submissoes/123
```

### 3.4a Aprova tudo

```
POST /api/admin/submissoes/123/aprovar

Backend:
  1. Pedido 501: PENDENTE → APROVADO
  2. Pedido 502: PENDENTE → APROVADO
  3. Submissao.status = APROVADO (recalculado)
  4. Cria Notificacao para colaborador (LISTA_APROVADA)

→ { status: "APROVADO", pedidos_aprovados: 2 }
```

### 3.4b Aprovação parcial (pedido a pedido)

```
# Aprova item 1
POST /api/admin/pedidos/501/aprovar
→ Pedido 501: PENDENTE → APROVADO
→ Submissao recalcula: tem APROVADO + PENDENTE → status = PENDENTE

# Rejeita item 2
POST /api/admin/pedidos/502/rejeitar
→ Pedido 502: PENDENTE → REJEITADO
→ Submissao recalcula: tem APROVADO + REJEITADO → status = PARCIALMENTE_APROVADO
```

### 3.4c Admin edita quantidade antes de aprovar

```
PUT /api/admin/submissoes/123/editar
{
  "items": [
    {"pedido_id": 501, "quantidade_solicitada": 3.0}  ← Admin reduz de 5 para 3
  ]
}
→ Atualiza Pedido.quantidade_solicitada

# Depois aprova
POST /api/admin/submissoes/123/aprovar
```

---

## Fluxo 4: Merge e WhatsApp

### 4.1 Admin seleciona submissões aprovadas

```
# Admin está em /admin/submissoes/123 (APROVADA)
# Clica "Fundir com outras listas"
# MergeModal abre (step 1)

# Frontend busca outras submissões APROVADAS
GET /api/admin/submissoes?status=APROVADO
→ [123 (atual), 124, 125, 126]
```

### 4.2 Seleciona e obtém preview

```
# Admin seleciona submissões 123, 124, 125 (checkbox)
# Clica "Próximo"

POST /api/admin/submissoes/merge-preview
{
  "submissao_ids": [123, 124, 125]
}

Backend (services.merge_submissoes_preview):
  1. Valida: todas existem, todas APROVADO, mesmo restaurante
  2. Para cada submissao:
     - Pega pedidos com status=APROVADO
     - Agrupa por lista_mae_item_id
     - Soma quantidade_solicitada
  3. Ordena alfabeticamente
  4. Retorna preview

→ {
    listas: [
      {lista_nome: "Hortifruti A"},
      {lista_nome: "Hortifruti B"},
      {lista_nome: "Hortifruti C"}
    ],
    itens: [
      {item_nome: "Cebola Roxa", quantidade_total: 15, item_unidade: "kg"},
      {item_nome: "Cenoura", quantidade_total: 27, item_unidade: "kg"}
    ],
    total_itens: 18
  }

→ Frontend: MergeModal step 2 (preview)
```

### 4.3 Gera texto WhatsApp

```
# Admin clica "Gerar WhatsApp"

POST /api/admin/submissoes/merge-whatsapp
{
  "submissao_ids": [123, 124, 125]
}

→ {
    "texto": "*📋 PEDIDO FUNDIDO*\n*Listas:* Hortifruti A + Hortifruti B + Hortifruti C\n*Data:* 24/02/2026 21:18\n\n*Itens:*\n• Cebola Roxa — *15 kg*\n• Cenoura — *27 kg*\n...\n\n*Total: 18 itens*\n---\nSistema Kaizen"
  }

→ Frontend: MergeModal step 3 (share)
→ Admin copia e envia via WhatsApp ao fornecedor
```

---

## Diagrama de Tabelas por Fluxo

```
SETUP:
restaurantes
    └── usuarios (ADMIN, COLLABORATOR)
    └── lista_mae_itens (catálogo)
    └── listas
            └── lista_item_ref (liga lista ↔ item)
            └── lista_colaborador (liga lista ↔ colaborador)

SUBMISSÃO:
submissoes (lista_id, usuario_id, status=PENDENTE)
    └── pedidos (lista_mae_item_id, quantidade_solicitada, status=PENDENTE)

APROVAÇÃO:
pedidos.status → APROVADO / REJEITADO
submissoes.status → recalculado automaticamente

MERGE:
POST /merge-preview → agrupa pedidos APROVADOS por lista_mae_item_id
POST /merge-whatsapp → formata texto
```

---

## Pontos Críticos de Implementação

### 1. Cálculo de quantidade no momento da submissão
```python
# A quantidade_solicitada é calculada NO MOMENTO da submissão
# Não é recalculada depois — preserva o estado original
quantidade_pedido = max(qtd_minima - qtd_atual, 0)
if usa_threshold:
    quantidade_pedido = quantidade_por_fardo  # sempre pede um fardo inteiro
```

### 2. Recálculo de status da submissão
```python
# Chamado após CADA alteração de pedido
def _recalcular_status_submissao(submissao_id):
    submissao = Submissao.query.get(submissao_id)
    pedidos = submissao.pedidos
    statuses = {p.status for p in pedidos}

    if PedidoStatus.PENDENTE in statuses:
        submissao.status = SubmissaoStatus.PENDENTE
    elif len(statuses) > 1:  # mix de APROVADO + REJEITADO
        submissao.status = SubmissaoStatus.PARCIALMENTE_APROVADO
    elif statuses == {PedidoStatus.APROVADO}:
        submissao.status = SubmissaoStatus.APROVADO
    else:
        submissao.status = SubmissaoStatus.REJEITADO
    db.session.commit()
```

### 3. Isolamento multi-tenant
```python
# Sempre filtrar por restaurante_id do usuário logado
def get_current_restaurante_id():
    user_id = get_jwt_identity()
    usuario = db.session.get(Usuario, user_id)
    return usuario.restaurante_id  # None para SUPER_ADMIN

# Uso nas queries:
restaurante_id = get_current_restaurante_id()
if restaurante_id:
    query = query.filter(Lista.restaurante_id == restaurante_id)
# SUPER_ADMIN: restaurante_id=None → query sem filtro → vê tudo
```

### 4. Token JWT — campo "msg" vs "error"
```typescript
// Erros JWT retornam { msg: "..." } não { error: "..." }
// Frontend deve tratar assim:
error: err.response?.data?.error || err.response?.data?.msg || 'Erro desconhecido'
```
