# 05 — Módulo de Submissões e Aprovação

---

## Conceito

Uma **Submissão** representa um único envio de lista pelo colaborador.

- Agrupa todos os **Pedidos** gerados naquele envio
- Tem um `status` calculado automaticamente com base nos pedidos filhos
- O admin analisa pedido a pedido (ou aprova/rejeita tudo de uma vez)

---

## Status da Submissão

```
PENDENTE  →  APROVADO
         →  REJEITADO
         →  PARCIALMENTE_APROVADO
```

**Lógica de recálculo automático:**
```python
def _recalcular_status_submissao(submissao):
    pedidos = submissao.pedidos
    statuses = {p.status for p in pedidos}

    if PedidoStatus.PENDENTE in statuses:
        return SubmissaoStatus.PENDENTE
    if PedidoStatus.APROVADO in statuses and PedidoStatus.REJEITADO in statuses:
        return SubmissaoStatus.PARCIALMENTE_APROVADO
    if statuses == {PedidoStatus.APROVADO}:
        return SubmissaoStatus.APROVADO
    if statuses == {PedidoStatus.REJEITADO}:
        return SubmissaoStatus.REJEITADO
    return SubmissaoStatus.PENDENTE
```

---

## Endpoints de Submissões (Admin)

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/admin/submissoes` | ADMIN | Lista submissões do restaurante |
| GET | `/api/admin/submissoes/:id` | ADMIN | Detalhe completo da submissão |
| POST | `/api/admin/submissoes/:id/aprovar` | ADMIN | Aprova TODOS os pedidos |
| POST | `/api/admin/submissoes/:id/rejeitar` | ADMIN | Rejeita TODOS os pedidos |
| POST | `/api/admin/submissoes/:id/reverter` | ADMIN | Reverte para PENDENTE |
| POST | `/api/admin/submissoes/:id/arquivar` | ADMIN | Arquiva (oculta da lista) |
| POST | `/api/admin/submissoes/:id/desarquivar` | ADMIN | Restaura arquivada |
| PUT | `/api/admin/submissoes/:id/editar` | ADMIN | Edita quantidades dos pedidos |
| POST | `/api/admin/submissoes/merge-preview` | ADMIN | Preview de merge (ver doc 06) |
| POST | `/api/admin/submissoes/merge-whatsapp` | ADMIN | Gera texto WhatsApp (ver doc 06) |

**Query params de GET `/submissoes`:**
- `?status=PENDENTE` — filtra por status
- `?arquivadas=false` — oculta arquivadas (default)
- `?lista_id=N` — filtra por lista
- `?usuario_id=N` — filtra por colaborador

---

## Endpoints de Pedidos (Admin)

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/admin/pedidos` | ADMIN | Lista todos os pedidos |
| GET | `/api/admin/pedidos/:id` | ADMIN | Detalhe do pedido |
| POST | `/api/admin/pedidos/:id/aprovar` | ADMIN | Aprova pedido individual |
| POST | `/api/admin/pedidos/:id/rejeitar` | ADMIN | Rejeita pedido individual |
| POST | `/api/admin/pedidos/:id/reverter` | ADMIN | Reverte para PENDENTE |
| PUT | `/api/admin/pedidos/:id/editar` | ADMIN | Edita quantidade_solicitada |
| POST | `/api/admin/pedidos/aprovar-lote` | ADMIN | Aprova múltiplos de uma vez |
| POST | `/api/admin/pedidos/rejeitar-lote` | ADMIN | Rejeita múltiplos de uma vez |

---

## Endpoints para Colaborador

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/collaborator/submissoes` | COLLABORATOR | Minhas submissões |
| GET | `/api/collaborator/submissoes/:id` | COLLABORATOR | Detalhe da minha submissão |

---

## Payload e Respostas

### GET `/api/admin/submissoes/:id`

```json
{
  "id": 123,
  "lista_id": 10,
  "lista_nome": "Hortifruti - Semana 1",
  "usuario_id": 3,
  "usuario_nome": "Maria Silva",
  "data_submissao": "2026-02-24T21:00:00-03:00",
  "status": "PENDENTE",
  "arquivada": false,
  "total_pedidos": 5,
  "pedidos": [
    {
      "id": 501,
      "lista_mae_item_id": 42,
      "item_nome": "Cebola Roxa",
      "item_unidade": "kg",
      "quantidade_solicitada": 7.0,
      "status": "PENDENTE",
      "fornecedor_id": null,
      "fornecedor_nome": null
    },
    {
      "id": 502,
      "lista_mae_item_id": 43,
      "item_nome": "Batata Doce",
      "item_unidade": "kg",
      "quantidade_solicitada": 3.0,
      "status": "APROVADO"
    }
  ]
}
```

### POST `/api/admin/submissoes/:id/aprovar`

Sem body. Aprova todos os pedidos da submissão.

**Resposta:**
```json
{
  "message": "Submissão aprovada com sucesso",
  "submissao_id": 123,
  "status": "APROVADO",
  "pedidos_aprovados": 5
}
```

### POST `/api/admin/pedidos/:id/rejeitar`

```json
// Body opcional:
{
  "motivo": "Sem budget esta semana"
}
```

**Resposta:**
```json
{
  "message": "Pedido rejeitado",
  "pedido_id": 501,
  "status": "REJEITADO",
  "submissao_status": "PARCIALMENTE_APROVADO"
}
```

### PUT `/api/admin/submissoes/:id/editar`

O admin pode editar as quantidades antes de aprovar:

```json
{
  "items": [
    {"pedido_id": 501, "quantidade_solicitada": 5.0},
    {"pedido_id": 502, "quantidade_solicitada": 2.0}
  ]
}
```

### POST `/api/admin/pedidos/aprovar-lote`

```json
{
  "pedido_ids": [501, 502, 503]
}
```

---

## Telas do Admin

### Tela de Gerenciar Submissões

**Rota:** `/admin/submissoes`
**Componente:** `features/admin/GerenciarSubmissoes.tsx`

**Elementos:**
- Tabs: `Pendentes | Aprovadas | Rejeitadas | Arquivadas`
- Tabela: Lista | Colaborador | Data | Total Pedidos | Status | Ações
- Ações rápidas na linha: Aprovar Tudo | Rejeitar Tudo | Ver Detalhes
- Filtros: Por lista, por colaborador, por data

### Tela de Detalhe da Submissão

**Rota:** `/admin/submissoes/:id`
**Componente:** `features/admin/DetalhesSubmissao.tsx`

**Elementos:**
- **Card de informações**: Lista, colaborador, data, status geral
- **Badge de status**: colorido (verde=APROVADO, vermelho=REJEITADO, amarelo=PENDENTE, azul=PARCIAL)
- **Botões de ação global**:
  - `Aprovar Tudo` (visível se status=PENDENTE)
  - `Rejeitar Tudo` (visível se status=PENDENTE)
  - `Reverter para Pendente` (visível se status≠PENDENTE)
  - `Arquivar` (sempre visível se não arquivada)
  - `Fundir com outras listas` (visível se status=APROVADO)
- **Tabela de pedidos**: Item | Unidade | Quantidade | Status | Ações
  - Por pedido: `Aprovar` | `Rejeitar` | `Editar quantidade`
- **Seção de itens rejeitados**: Separada dos aprovados/pendentes

### Tela de Minhas Submissões (Colaborador)

**Rota:** `/collaborator/submissoes`
**Componente:** `features/inventory/MinhasSubmissoes.tsx`

**Elementos:**
- Lista das próprias submissões com status
- Badge de status colorido
- Link para ver detalhes de cada submissão

---

## Notificações

Quando uma submissão é criada ou seu status muda, o sistema cria notificações:

```python
# Ao submeter lista → notifica o admin
Notificacao(
    usuario_id=admin_id,
    tipo=TipoNotificacao.SUBMISSAO_LISTA,
    titulo=f"Nova submissão: {lista_nome}",
    mensagem=f"{usuario_nome} submeteu a lista {lista_nome}",
    dados_extra={"submissao_id": submissao.id}
)

# Ao aprovar → notifica o colaborador
Notificacao(
    usuario_id=colaborador_id,
    tipo=TipoNotificacao.LISTA_APROVADA,
    titulo=f"Lista aprovada: {lista_nome}",
    mensagem="Sua submissão foi aprovada",
    dados_extra={"submissao_id": submissao.id}
)
```

---

## Regras de Negócio Importantes

1. **Apenas submissões APROVADAS** podem participar do merge
2. **Reverter** uma submissão APROVADO/REJEITADO volta para PENDENTE (todos os pedidos voltam para PENDENTE)
3. **Arquivar** não deleta — apenas oculta da listagem padrão
4. **Editar quantidade** pelo admin não muda o status — só a quantidade
5. **Aprovação/rejeição individual** de pedidos recalcula automaticamente o status da submissão mãe
6. Se a lista for deletada permanentemente (cascata), todas as submissões são deletadas
