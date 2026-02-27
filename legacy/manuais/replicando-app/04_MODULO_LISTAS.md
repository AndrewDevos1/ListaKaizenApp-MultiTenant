# 04 — Módulo de Listas de Compras

> Este é o módulo central do sistema. Uma Lista é um conjunto de itens do catálogo global com quantidades mínimas, atribuída a colaboradores que atualizam o estoque periodicamente.

---

## Conceitos Fundamentais

### O que é uma Lista?
- Agrupamento de itens do catálogo (`ListaMaeItem`) com seus limites de estoque
- Atribuída a um ou mais colaboradores que vão atualizar as quantidades
- Pertence a um restaurante específico
- Gera `Submissoes` quando o colaborador envia o estoque atualizado

### O que é um ListaMaeItem (Catálogo Global)?
- Item centralizado do restaurante (ex: "Arroz 5kg", "Cebola Roxa")
- Existe independente das listas
- Um mesmo item pode aparecer em múltiplas listas
- Permite consolidar pedidos de itens iguais de listas diferentes no **merge**

### O que é ListaItemRef?
- Tabela intermediária que liga uma Lista a um ListaMaeItem
- Armazena `quantidade_atual` e `quantidade_minima` específicas para aquela lista
- Calcula automaticamente o pedido: `pedido = qtd_fardo se qtd_atual <= qtd_min else 0`

---

## Fluxo de Criação de uma Lista

### 1. Admin cria o catálogo global (se necessário)

```http
POST /api/admin/lista-mae-itens
Authorization: Bearer {token_admin}

{
  "nome": "Cebola Roxa",
  "unidade": "kg"
}
```

**Resposta:**
```json
{
  "id": 42,
  "restaurante_id": 5,
  "nome": "Cebola Roxa",
  "unidade": "kg"
}
```

### 2. Admin cria a lista

```http
POST /api/admin/listas
Authorization: Bearer {token_admin}

{
  "nome": "Hortifruti - Semana 1",
  "descricao": "Compras de hortifruti da semana",
  "restaurante_id": 5
}
```

**Resposta:**
```json
{
  "id": 10,
  "nome": "Hortifruti - Semana 1",
  "descricao": "...",
  "restaurante_id": 5,
  "data_criacao": "2026-02-24T10:00:00"
}
```

### 3. Admin adiciona itens à lista

```http
POST /api/admin/listas/{lista_id}/itens
Authorization: Bearer {token_admin}

{
  "item_id": 42,
  "quantidade_minima": 10.0,
  "quantidade_atual": 0.0,
  "usa_threshold": false,
  "quantidade_por_fardo": 1.0
}
```

**Resultado no banco:** Cria um registro em `lista_item_ref`

### 4. Admin atribui colaboradores

```http
POST /api/admin/listas/{lista_id}/colaboradores
Authorization: Bearer {token_admin}

{
  "usuario_ids": [3, 7, 12]
}
```

**Resultado no banco:** Cria registros em `lista_colaborador`

---

## Endpoints do Catálogo Global (ListaMaeItem)

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/admin/lista-mae-itens` | ADMIN | Lista todos os itens do catálogo |
| POST | `/api/admin/lista-mae-itens` | ADMIN | Cria item no catálogo |
| PUT | `/api/admin/lista-mae-itens/:id` | ADMIN | Edita item |
| DELETE | `/api/admin/lista-mae-itens/:id` | ADMIN | Remove item |
| GET | `/api/admin/lista-mae-itens/:id` | ADMIN | Detalha item |
| POST | `/api/admin/lista-mae-itens/importar` | ADMIN | Importa itens via CSV/JSON |

**Query params disponíveis em GET `/lista-mae-itens`:**
- `?restaurante_id=N` — filtra por restaurante (SUPER_ADMIN)
- `?q=texto` — busca por nome

---

## Endpoints das Listas

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/admin/listas` | ADMIN | Lista todas as listas do restaurante |
| POST | `/api/admin/listas` | ADMIN | Cria lista |
| GET | `/api/admin/listas/:id` | ADMIN | Detalha lista |
| PUT | `/api/admin/listas/:id` | ADMIN | Edita lista (nome, descrição) |
| DELETE | `/api/admin/listas/:id` | ADMIN | Soft delete (vai para lixeira) |
| GET | `/api/admin/listas/deletadas` | ADMIN | Lista na lixeira |
| POST | `/api/admin/listas/:id/restaurar` | ADMIN | Restaura da lixeira |
| DELETE | `/api/admin/listas/:id/permanente` | ADMIN | Deleta definitivamente |
| POST | `/api/admin/listas/deletar-lote` | ADMIN | Deleta múltiplas permanentemente |
| POST | `/api/admin/listas/:id/colaboradores` | ADMIN | Atribui colaboradores |
| DELETE | `/api/admin/listas/:id/colaboradores/:uid` | ADMIN | Remove colaborador |
| GET | `/api/admin/listas/:id/itens` | ADMIN | Itens da lista (com ListaItemRef) |
| POST | `/api/admin/listas/:id/itens` | ADMIN | Adiciona item à lista |
| PUT | `/api/admin/listas/:id/itens/:item_id` | ADMIN | Edita config do item na lista |
| DELETE | `/api/admin/listas/:id/itens/:item_id` | ADMIN | Remove item da lista |

---

## Endpoints para Colaboradores

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/collaborator/minhas-listas` | COLLABORATOR | Listas atribuídas ao usuário |
| GET | `/api/collaborator/listas/:id` | COLLABORATOR | Detalhe da lista |
| GET | `/api/collaborator/listas/:id/estoque` | COLLABORATOR | Itens com quantidades e pedido calculado |
| PUT | `/api/collaborator/listas/:id/itens/:item_id` | COLLABORATOR | Atualiza quantidade_atual de um item |
| POST | `/api/collaborator/listas/:id/submeter` | COLLABORATOR | Submete a lista (gera Submissao + Pedidos) |

---

## Payload e Respostas Detalhadas

### GET `/api/collaborator/listas/:id/estoque`

**Resposta:**
```json
[
  {
    "lista_id": 10,
    "item_id": 42,
    "quantidade_atual": 3.0,
    "quantidade_minima": 10.0,
    "pedido": 1.0,          // get_pedido() calculado
    "usa_threshold": false,
    "quantidade_por_fardo": 1.0,
    "item": {
      "id": 42,
      "nome": "Cebola Roxa",
      "unidade": "kg"
    }
  },
  {
    "lista_id": 10,
    "item_id": 43,
    "quantidade_atual": 15.0,
    "quantidade_minima": 10.0,
    "pedido": 0.0,          // 15 > 10, não precisa pedir
    "usa_threshold": false,
    "quantidade_por_fardo": 1.0,
    "item": {
      "id": 43,
      "nome": "Batata Doce",
      "unidade": "kg"
    }
  }
]
```

### PUT `/api/collaborator/listas/:id/itens/:item_id`

**Body:**
```json
{
  "quantidade_atual": 5.0
}
```

**Resposta:**
```json
{
  "lista_id": 10,
  "item_id": 42,
  "quantidade_atual": 5.0,
  "quantidade_minima": 10.0,
  "pedido": 1.0
}
```

### POST `/api/collaborator/listas/:id/submeter`

**Body:**
```json
{
  "items": [
    {"item_id": 42, "quantidade_atual": 3.0},
    {"item_id": 43, "quantidade_atual": 15.0},
    {"item_id": 44, "quantidade_atual": 0.0}
  ]
}
```

**Resposta:**
```json
{
  "submissao_id": 123,
  "lista_id": 10,
  "status": "PENDENTE",
  "data_submissao": "2026-02-24T21:00:00-03:00",
  "total_pedidos": 2,
  "pedidos": [
    {
      "id": 501,
      "item_id": 42,
      "item_nome": "Cebola Roxa",
      "quantidade_solicitada": 1.0,
      "status": "PENDENTE"
    },
    {
      "id": 502,
      "item_id": 44,
      "item_nome": "Cenoura",
      "quantidade_solicitada": 1.0,
      "status": "PENDENTE"
    }
  ],
  "resumo": {
    "itens_enviados": 3,
    "itens_com_pedido": 2,
    "itens_sem_pedido": 1
  }
}
```

---

## Tela do Colaborador — Estoque da Lista

**Rota frontend:** `/collaborator/listas/:listaId/estoque`
**Componente:** `features/inventory/EstoqueListaCompras.tsx` (ou similar)

### Elementos da tela:
- **Header**: Nome da lista + data
- **Tabela de itens**: Nome | Unidade | Qtd Mínima | Qtd Atual (editável) | Pedido (calculado)
- **Campo editável**: `quantidade_atual` — input numérico, atualiza em tempo real
- **Destaque visual**: Itens com `pedido > 0` ficam destacados (precisam reposição)
- **Botão "Submeter"**: Aparece quando houver itens alterados ou pelo menos 1 item com pedido

### Validações:
- `quantidade_atual >= 0`
- Não permite submeter lista vazia
- Confirma antes de submeter (modal ou alert)

---

## Tela Admin — Gerenciar Itens da Lista

**Rota:** `/admin/listas/:listaId/gerenciar-itens`
**Componente:** `features/admin/GerenciarItensLista.tsx`

### Elementos:
- **Busca**: Campo de busca no catálogo global
- **Lista de itens já adicionados**: Com opção de remover, editar qtd_min, usa_threshold
- **Botão "Adicionar item"**: Abre modal de busca no catálogo
- **Botão "Novo item"**: Cria item no catálogo e já adiciona na lista

---

## Tela Admin — Listas de Compras

**Rota:** `/admin/listas-compras`
**Componente:** `features/admin/ListasCompras.tsx`

### Elementos:
- **Campo de busca**: Input com ícone de lupa e botão "×" para limpar — filtra por nome da lista **ou** por nome de item contido nela, com normalização de acentos e case
- **Cards de listas**: Nome | Badge de área | Colaboradores | Data criação | Ações
- **Botão "Nova Lista"**: Modal de criação com seleção de colaboradores e área
- **Botão "Importar"**: Importar lista via CSV
- **Botão "Lixeira"**: Ver e restaurar listas deletadas
- **Ações por lista**: Preencher | Ver itens | Editar | Atribuir colaboradores | Vincular área | Deletar
- **Filtro por área**: Botões dinâmicos ("Todas" + uma opção por área cadastrada) — filtragem local no frontend
- Busca textual e filtro de área funcionam em conjunto (AND lógico)

### Modal "Nova Lista":
- Campos: Nome, Descrição, Área (dropdown), Colaboradores (checkboxes)
- Ao selecionar uma Área, os colaboradores dessa área são **pré-marcados automaticamente**
- Admin pode marcar/desmarcar colaboradores livremente antes de criar
- Lista de itens do catálogo pode ser incluída na criação (aba separada)

> Para detalhes completos de área + colaboradores, ver `04.2_Organizar_Listas.md`

---

## Lógica de Negócio Importante

### Cálculo automático do pedido

```python
# models.py - ListaItemRef.get_pedido()
def get_pedido(self) -> float:
    """
    Retorna quantidade a ser pedida.
    Se quantidade_atual < quantidade_minima: pede quantidade_por_fardo
    Senão: não precisa pedir (retorna 0)
    """
    if self.quantidade_atual < self.quantidade_minima:
        return self.quantidade_por_fardo
    return 0
```

### Threshold / Fardo

Quando `usa_threshold=True`:
- `quantidade_por_fardo` define o múltiplo de compra
- Exemplo: Se vendido em caixas de 6, `quantidade_por_fardo=6`
- Pedido sempre retorna 6 (ou múltiplos) quando abaixo do mínimo

### Geração de Pedidos na Submissão

```python
# services.py - lógica simplificada
def submit_lista(lista_id, usuario_id, items_data):
    submissao = Submissao(lista_id=lista_id, usuario_id=usuario_id, status=PENDENTE)
    db.session.add(submissao)

    pedidos_criados = []
    for item_data in items_data:
        ref = ListaItemRef.query.get((lista_id, item_data['item_id']))
        ref.quantidade_atual = item_data['quantidade_atual']

        quantidade_pedido = max(ref.quantidade_minima - ref.quantidade_atual, 0)
        if ref.usa_threshold and quantidade_pedido > 0:
            quantidade_pedido = ref.quantidade_por_fardo

        if quantidade_pedido > 0:
            pedido = Pedido(
                submissao_id=submissao.id,
                lista_mae_item_id=item_data['item_id'],
                quantidade_solicitada=quantidade_pedido,
                usuario_id=usuario_id,
                status=PedidoStatus.PENDENTE
            )
            db.session.add(pedido)
            pedidos_criados.append(pedido)

    submissao.total_pedidos = len(pedidos_criados)
    db.session.commit()
    return submissao
```
