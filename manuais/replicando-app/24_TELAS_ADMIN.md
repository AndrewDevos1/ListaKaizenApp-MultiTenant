# 24 — Telas do Admin (Detalhadas)

> Descrição detalhada das principais telas do admin: layout, estados, lógica de formulários, ações em lote, filtros e integração com a API.

---

## Rota Base: `/admin`

Protegida por `AdminRoute.tsx` (role ADMIN ou SUPER_ADMIN).

---

## 1. ListasCompras.tsx

**Rota:** `/admin/listas-compras`

### Layout

```
┌──────────────────────────────────────────────────────────┐
│ 🛒 Listas de Compras                   [← Voltar]        │
│ Gerenciar listas de compras                               │
├──────────────────────────────────────────────────────────┤
│ [+ Nova Lista] [📥 Importar] [🗑 Lixeira (3)]           │
├──────────────────────────────────────────────────────────┤
│ GRID DE CARDS (lg=3, md=2)                               │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │ 📋 Óleo Motor    │  │ 📋 Filtros       │             │
│  │ Lubrificantes    │  │ Ar, óleo, cabine │             │
│  │ Itens: 12        │  │ Itens: 8         │             │
│  │ Colabs: 3        │  │ Colabs: 2        │             │
│  │ Criada: 15/02    │  │ Criada: 14/02    │             │
│  │ [👁 Visualizar]  │  │ [👁 Visualizar]  │             │
│  │ [✏️ Editar ▼]    │  │ [✏️ Editar ▼]    │             │
│  │  ├ Deletar        │  │  ├ Deletar        │             │
│  │  ├ Atribuir Colabs│  │  ├ Atribuir Colabs│             │
│  │  └ [...]          │  │  └ [...]          │             │
│  └──────────────────┘  └──────────────────┘             │
└──────────────────────────────────────────────────────────┘
```

### Modal Criar/Editar Lista

Campos:
1. Nome (obrigatório)
2. Descrição (textarea)
3. Fornecedor (dropdown)
4. Categoria (texto)
5. Telefone WhatsApp (para envio de pedido)
6. Botão "Selecionar Itens" → abre `SeletorItensUnificado`

### Modal Atribuir Colaboradores

- Nome da lista no topo
- Checkbox por colaborador (todos os usuários do restaurante)
- Botão "Salvar Atribuição"
- `POST /admin/listas/{id}/atribuir` com IDs selecionados

### Modal Importar Lista

- Opção 1: Upload de arquivo CSV
- Opção 2: Colar texto (itens por linha)
- `POST /admin/listas/importar`

### Lixeira (Restaurar/Deletar Permanente)

- Botão "🗑 Lixeira (N)" abre modal com listas deletadas
- Checkbox para selecionar
- Restaurar: `POST /admin/listas/{id}/restaurar`
- Deletar permanente: `DELETE /admin/listas/{id}`

### API Calls

| Endpoint | Método | Uso |
|----------|--------|-----|
| `/admin/listas` | GET | Carregar todas |
| `/admin/listas` | POST | Criar |
| `/admin/listas/{id}` | PUT | Atualizar |
| `/admin/listas/{id}/deletar` | POST | Soft delete |
| `/admin/listas/{id}/atribuir` | POST | Atribuir colaboradores |
| `/admin/listas/{id}/restaurar` | POST | Restaurar da lixeira |
| `/admin/listas/importar` | POST | Importar |
| `/admin/users` | GET | Buscar colaboradores |

---

## 2. GerenciarSubmissoes.tsx

**Rota:** `/admin/submissoes`

### Layout

```
┌──────────────────────────────────────────────────────┐
│ 📦 Gerenciar Submissões              [← Voltar]       │
├──────────────────────────────────────────────────────┤
│ FILTROS: [Todos] [⏱ Pendentes] [✓ Aprovados] [✗ Rej]│
├──────────────────────────────────────────────────────┤
│ TABELA:                                               │
│ ┌────┬────────┬──────────────┬──────┬──────┬───────┐ │
│ │ ☐  │ Lista  │ Colaborador  │ Data │Status│ Ações │ │
│ ├────┼────────┼──────────────┼──────┼──────┼───────┤ │
│ │ ☐  │ Óleo   │ João Silva   │15/02 │ ⏱   │ 👁 📦 │ │
│ └────┴────────┴──────────────┴──────┴──────┴───────┘ │
│ [Toggle Arquivadas] [Modo Seleção] [Arquivar Sel.]   │
└──────────────────────────────────────────────────────┘
```

### Status das Submissões
- `PENDENTE` → badge amarelo ⏱
- `APROVADO` → badge verde ✓
- `REJEITADO` → badge vermelho ✗
- `PARCIALMENTE_APROVADO` → badge azul ~

### Filtro por Status

Botões de tab: TODOS | PENDENTE | APROVADO | REJEITADO

### Arquivamento em Lote

1. Ativar "Modo Seleção" → aparece coluna de checkbox
2. Selecionar submissões
3. Clicar "Arquivar Selecionadas"
4. `Promise.allSettled()` para sucesso parcial
5. Aviso: PENDENTE não pode ser arquivada (precisa aprovação/rejeição antes)

### Navegação para Detalhe

Por `tipo_lista`:
- `LISTA_RAPIDA` → `/admin/listas-rapidas/{id}`
- `LISTA_TRADICIONAL` → `/admin/submissoes/{id}`

### API Calls

| Endpoint | Método | Params |
|----------|--------|--------|
| `/admin/submissoes` | GET | `status=&arquivadas=false` |
| `/admin/submissoes/{id}/arquivar` | POST | — |
| `/admin/listas-rapidas/{id}/arquivar` | POST | — |

---

## 3. DetalhesSubmissao.tsx

**Rota:** `/admin/submissoes/:id`

Esta é a tela mais importante do admin — onde aprova e rejeita pedidos.

### Layout

```
┌───────────────────────────────────────────────────────────┐
│ [← Voltar]                                                 │
│ 📋 Submissão #123 — Lista: Hortifruti Semana              │
│ Colaborador: João Silva | Data: 15/02/2026 10:30           │
├───────────────────────────────────────────────────────────┤
│ [✓ Sucesso] [! Erro]                                      │
├───────────────────────────────────────────────────────────┤
│ Status: PENDENTE | Total: 5 pedidos                       │
│ [🔧 Modo Edição] [Selecionar Todos] [Converter Checklist] │
├───────────────────────────────────────────────────────────┤
│ TABELA DE PEDIDOS                                         │
│ ┌──┬──────────┬─────┬──┬────┬──────────┬───────────────┐ │
│ │☐ │ Item     │ Qtd │Un│Min │ Pedido   │ Ações         │ │
│ ├──┼──────────┼─────┼──┼────┼──────────┼───────────────┤ │
│ │☑ │ Óleo 5L  │ 10  │L │ 25 │ 15      │ [✓] [✗] [↩] │ │
│ │☐ │ Filtro   │  8  │un│ 20 │ 12      │ [✓] [✗] [↩] │ │
│ └──┴──────────┴─────┴──┴────┴──────────┴───────────────┘ │
│                                                            │
│ [Aprovar Selecionados] [Rejeitar Selecionados]            │
│ [Reverter para PENDENTE] [📋 WhatsApp] [Converter...   ]  │
└───────────────────────────────────────────────────────────┘
```

### Cores das Linhas por Status
- PENDENTE → fundo amarelo
- APROVADO → fundo verde
- REJEITADO → fundo vermelho com texto riscado

### Ações por Linha
- **✓ Aprovar:** `POST /admin/pedidos/aprovar-lote` (item único)
- **✗ Rejeitar:** confirmação → `POST /admin/pedidos/{id}/rejeitar`
- **↩ Desfazer Rejeição:** `POST /admin/pedidos/{id}/reverter` → volta a PENDENTE

### Ações em Lote
- **Selecionar Todos:** seleciona todos com status PENDENTE
- **Aprovar Selecionados:** `POST /admin/pedidos/aprovar-lote` com todos os IDs
- **Rejeitar Selecionados:** rejeita em sequência

### Modo Edição

Quando admin clica "🔧 Modo Edição":
- Coluna "Qtd. Atual" vira campo editável
- Admin insere quantidade atual observada
- Sistema recalcula pedido em tempo real:
  ```
  Pedido = Max(0, Qtd.Mín - Qtd.Atual)
  ```
- `PUT /admin/submissoes/{id}/editar` com todas as edições

### Modal Converter para Checklist

Opções:
- [✓] Incluir nome do fornecedor
- [✓] Incluir observações

`POST /admin/submissoes/{id}/converter-checklist`
→ Redireciona para `/admin/checklists/{id}`

### Mensagem WhatsApp

Formato gerado:
```
📋 *Solicitação Aprovada — Lista Hortifruti Semana*

*Lista:* Hortifruti Semana
*Solicitante:* João Silva
*Data:* 15 de fevereiro de 2026

*Itens Aprovados:*

• Óleo 5L - *Pedido: 15 L*
• Filtro Ar - *Pedido: 12 un*

*Total:* 2 itens
```

Apenas pedidos APROVADOS são incluídos. Copiado com `navigator.clipboard.writeText()`.

### API Calls

| Endpoint | Método | Uso |
|----------|--------|-----|
| `/admin/submissoes/{id}` | GET | Carregar submissão |
| `/admin/listas/{id}/estoque` | GET | Carregar itens para edição |
| `/admin/pedidos/aprovar-lote` | POST | Aprovar (lote ou único) |
| `/admin/pedidos/{id}/rejeitar` | POST | Rejeitar único |
| `/admin/pedidos/{id}/reverter` | POST | Desfazer rejeição |
| `/admin/submissoes/{id}/editar` | PUT | Salvar edições de quantidade |
| `/admin/submissoes/{id}/reverter` | POST | Reverter toda a submissão |
| `/admin/submissoes/{id}/converter-checklist` | POST | Criar checklist |

---

## 4. GerenciarUsuarios.tsx

**Rota:** `/admin/gerenciar-usuarios`

- Tabela: Nome | Email | Role | Status (Aprovado/Pendente) | Ações
- Filtro por role
- Ações: Aprovar/Rejeitar | Mudar role | Resetar senha | Deletar
- Modal de criação de usuário (admin-level)

---

## 5. ItemManagement.tsx

**Rota:** `/admin/items`

- Tabela de itens do catálogo global
- Filtro por fornecedor
- CRUD completo (criar, editar, deletar)
- Importar CSV de itens

---

## 6. FornecedorManagement.tsx

**Rota:** `/admin/fornecedores`

- Tabela: Nome | Contato | Cidade | Status | Ações
- CRUD completo
- Ver itens do fornecedor
- Vincular a listas

---

## 7. AreaManagement.tsx

**Rota:** `/admin/areas`

- CRUD de áreas de trabalho
- Cada área tem: nome, descrição, responsável
- Áreas são usadas para filtrar itens de estoque e templates POP

---

## 8. GerenciarItensLista.tsx

**Rota:** `/admin/listas/:id/estoque`

- Tabela de itens da lista com: nome, unidade, qtd mínima, qtd atual
- Configurar threshold por item (quantidade_minima, quantidade_por_fardo)
- Editar quantidades in-line
- Import CSV / Export CSV
- Botão "Salvar Configurações"

---

## 9. AdminDashboard.tsx

**Rota:** `/admin`

### Layout

```
┌──────────────────────────────────────────────────────┐
│ Dashboard Administrativo                             │
├──────────────────────────────────────────────────────┤
│ CARDS DE RESUMO:                                     │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│ │ Submissões  │ │ Listas      │ │ Usuários    │    │
│ │ Pendentes   │ │ Ativas      │ │ Ativos      │    │
│ │ 5           │ │ 12          │ │ 8           │    │
│ └─────────────┘ └─────────────┘ └─────────────┘    │
├──────────────────────────────────────────────────────┤
│ GRÁFICOS (Chart.js):                                 │
│ - Submissões por status (pizza)                      │
│ - Itens mais solicitados (barras)                    │
│ - Histórico de submissões (linha)                    │
└──────────────────────────────────────────────────────┘
```

---

## 10. Telas de Merge de Submissões

**Rota:** `/admin/merge` (ver `06_MODULO_MERGE.md`)

- Selecionar múltiplas submissões aprovadas
- Fundir pedidos duplicados
- Gerar mensagem WhatsApp agrupada por fornecedor

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `frontend/src/features/admin/ListasCompras.tsx` | Gestão de listas |
| `frontend/src/features/admin/GerenciarSubmissoes.tsx` | Listagem de submissões |
| `frontend/src/features/admin/DetalhesSubmissao.tsx` | Aprovação detalhada |
| `frontend/src/features/admin/GerenciarUsuarios.tsx` | Gestão de usuários |
| `frontend/src/features/admin/ItemManagement.tsx` | Catálogo de itens |
| `frontend/src/features/admin/FornecedorManagement.tsx` | Gestão de fornecedores |
| `frontend/src/features/admin/AreaManagement.tsx` | Gestão de áreas |
| `frontend/src/features/admin/GerenciarItensLista.tsx` | Itens e threshold por lista |
| `frontend/src/features/dashboard/AdminDashboard.tsx` | Dashboard do admin |
