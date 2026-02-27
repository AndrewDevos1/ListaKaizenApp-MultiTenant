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

### Layout — View Ativa

```
┌──────────────────────────────────────────────────────┐
│ 📦 Gerenciar Submissões              [← Voltar]       │
│ Visualizar e aprovar submissões de listas de reposição│
├──────────────────────────────────────────────────────┤
│ 🔍 [Buscar por lista, colaborador, data ou status...] │
├──────────────────────────────────────────────────────┤
│ FILTROS: [Todos] [⏱ Pendentes] [✓ Aprovados] [✗ Rej]│
├──────────────────────────────────────────────────────┤
│ TABELA:                                               │
│ ┌────┬────────┬──────────────┬──────┬──────┬───────┐ │
│ │ ☐  │ Lista  │ Colaborador  │ Data │Status│ Ações │ │
│ ├────┼────────┼──────────────┼──────┼──────┼───────┤ │
│ │ ☐  │ Óleo   │ João Silva   │15/02 │ ⏱   │ 👁 📦 │ │
│ └────┴────────┴──────────────┴──────┴──────┴───────┘ │
│ [Arquivar Sel.]                      [Arquivadas]    │
└──────────────────────────────────────────────────────┘
```

### Layout — View Arquivadas

```
┌──────────────────────────────────────────────────────┐
│ 📂 Submissões Arquivadas             [← Voltar]       │
│ Submissões arquivadas — não impactam o fluxo ativo    │
├──────────────────────────────────────────────────────┤
│ ⚠ Você está visualizando submissões arquivadas.       │
│   Para voltar às ativas, clique em Ativas abaixo.    │
├──────────────────────────────────────────────────────┤
│ 🔍 [Buscar por lista, colaborador, data ou status...] │
├──────────────────────────────────────────────────────┤
│ FILTROS: [Todos] [⏱ Pendentes] [✓ Aprovados] [✗ Rej]│
├──────────────────────────────────────────────────────┤
│ TABELA (cabeçalho âmbar):                             │
│ ┌────┬────────┬──────────────┬──────┬──────┬───────┐ │
│ │    │ Lista  │ Colaborador  │ Data │Status│ Ações │ │
│ ├────┼────────┼──────────────┼──────┼──────┼───────┤ │
│ │    │ Óleo   │ João Silva   │15/02 │ ✓   │ 👁    │ │
│ └────┴────────┴──────────────┴──────┴──────┴───────┘ │
│ [Selecionar] [Desarquivar (N)] [Excluir (N)] [Ativas]│
└──────────────────────────────────────────────────────┘
```

### Diferenciação Visual — View Arquivadas

Quando `showArchived === true`:
- **Título** muda para "Submissões Arquivadas" (ícone `faBoxOpen`)
- **Subtítulo** muda para "não impactam o fluxo ativo"
- **Banner âmbar** com borda esquerda e texto orientativo
- **Cabeçalho `thead`** da tabela com fundo amarelo-âmbar e texto escuro
- **Cards mobile** com borda esquerda âmbar (`4px solid #ffc107`)

### Busca em Tempo Real

Campo de texto no topo (acima dos filtros de status) que filtra os resultados à medida que o usuário digita:
- Campos pesquisados: `lista_nome`, `usuario_nome`, `status`, `data_submissao` (formatada), `id`
- Funciona nas duas views (ativas e arquivadas)
- Exibe contador de resultados ao lado dos filtros (`N resultado(s)`)
- Botão X para limpar a busca
- "Selecionar todos" opera apenas sobre os itens visíveis no filtro atual
- Mensagem específica quando nenhum resultado bate: *"Nenhuma submissão encontrada para essa busca"*

> **Nota:** busca por nome de item dentro da lista não está implementada pois o endpoint `/admin/submissoes` não retorna itens de cada submissão.

### Status das Submissões
- `PENDENTE` → badge amarelo ⏱
- `APROVADO` → badge verde ✓
- `REJEITADO` → badge vermelho ✗
- `PARCIALMENTE_APROVADO` → badge azul ~

### Filtro por Status

Botões de tab: TODOS | PENDENTE | APROVADO | REJEITADO

O filtro de status é aplicado **server-side** (parâmetro `?status=` na API). A busca textual é aplicada **client-side** sobre os dados já carregados.

### Arquivamento em Lote

1. Na view ativa: checkboxes sempre visíveis; clicar "Arquivar selecionadas"
2. Na view arquivada: clicar "Selecionar" → ativa modo seleção
3. `Promise.allSettled()` para sucesso parcial

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
- Botões usam `FontAwesomeIcon` com texto: **Copiar**, **WhatsApp** (e ícones `faPlus`, `faRightLeft`)

---

## 5. ItemManagement.tsx

**Rota:** `/admin/items`

- Tabela de itens do catálogo global
- Filtro por fornecedor
- CRUD completo (criar, editar, deletar)
- Importar CSV de itens
- Botões de ação usam `FontAwesomeIcon` com texto: **Editar**, **Excluir**, **Adicionar Item**

---

## 6. FornecedorManagement.tsx

**Rota:** `/admin/fornecedores`

- Tabela: Nome | Contato | Cidade | Status | Ações
- CRUD completo
- Ver itens do fornecedor
- Vincular a listas
- Botões de ação com texto explícito: **Detalhes**, **Editar**, **Itens**, **Excluir**

---

## 7. AreaManagement.tsx

**Rota:** `/admin/areas`

- CRUD de áreas de trabalho
- Cada área tem: nome, descrição, responsável
- Áreas são usadas para filtrar itens de estoque e templates POP
- Botões de ação com texto explícito: **Listas**, **Membros**, **Editar**, **Excluir**

> **Nota sobre ícones:** O projeto usa exclusivamente `@fortawesome/react-fontawesome` (SVG). Nunca usar `<i className="fas fa-...">` (sistema CSS) — esses elementos renderizam como caixas coloridas vazias sem o CSS do FontAwesome instalado.

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

## 11. StatisticsDashboard.tsx

**Rota:** `/admin/estatisticas`

Dashboard de visão geral do estoque de todas as listas ativas do restaurante.

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│ [← Voltar ao Dashboard]                    [🔄 Ao vivo: OFF]  │
│ 📊 Estatísticas                            Atualizado às 10:32 │
│ Visão geral de itens e submissões                              │
├─────────────┬──────────────┬──────────────┬────────────────────┤
│ 🔵 Listas   │ 📦 Total     │ ✅ Em ordem  │ ⚠ Faltantes        │
│    Ativas   │   Itens      │              │                    │
│    12       │    87        │    61        │    26              │
├─────────────┴──────────────┴──────────────┴────────────────────┤
│ [Filtro por área ▼]                                            │
│  ┌──────────────────────────┐  ┌──────────────────────────┐   │
│  │ 🍩 Situação do Estoque   │  │ 📊 Por lista (faltantes) │   │
│  │   (doughnut chart)       │  │   (bar chart)            │   │
│  └──────────────────────────┘  └──────────────────────────┘   │
├────────────────────────────────────────────────────────────────┤
│ 📋 Submissões por Status (últimos 30 dias)                     │
│  [Barras horizontais: PENDENTE | APROVADO | REJEITADO | ...]   │
├────────────────────────────────────────────────────────────────┤
│ TABELA DETALHADA DE ITENS                                      │
│ [🔍 Buscar] [Lista ▼] [Área ▼] [Situação ▼]                   │
│ ┌──────────┬──┬───────┬──────┬───────┬──────┬────────────────┐│
│ │ Item     │Un│ Lista │ Área │ Atual │ Mín  │ Situação       ││
│ ├──────────┼──┼───────┼──────┼───────┼──────┼────────────────┤│
│ │ Óleo 5L  │L │ Lubr. │Mec.  │   0   │  10  │ ████░░ ⚠ Falta││
│ │ Filtro Ar│un│ Filtros│ —   │   2   │  10  │ ██░░░░ Quase…  ││
│ │ Pneu     │un│ Pneus │Borr. │  12   │  10  │ ██████ Completo││
│ └──────────┴──┴───────┴──────┴───────┴──────┴────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

### Sistema de 5 Zonas de Situação

A função `getSituacao(atual, minimo)` classifica cada item:

| Zona | Condição | Cor | Badge |
|------|----------|-----|-------|
| `falta` | `atual === 0` | 🔴 `#e55353` vermelho | `⚠ Falta` (bold + pulso no hover) |
| `quase_acabando` | `> 0` e `< 25%` do mín | 🟠 `#fd7e14` laranja | `Quase acabando` |
| `precisa_comprar` | `25–99%` do mín | 🟡 `#ffc107` amarelo | `Precisa comprar` |
| `completo` | `100–149%` do mín | 🟢 `#2eb85c` verde | `Completo` |
| `excesso` | `≥ 150%` do mín (ou mín = 0) | 🔵 `#3b82f6` azul | `Em excesso` |

> **Regra especial:** itens com `quantidade_minima = 0` são ignorados nos cálculos de faltantes (excluídos do filtro no backend) e retornam zona `excesso`.

### Barra Estilo Tanque de Combustível (FuelBar)

- Escala: `0` a `1.5×` o mínimo (150%)
- Preenchimento proporcional; cor igual à zona da situação
- Marcadores (ticks) em `16.7%` (= 25% do mín) e `66.7%` (= 100% do mín) da escala
- Quando `atual === 0`: classe CSS `fuelBarZerado` ativa borda piscante no hover
- Badge com `badgeZerado` para zona `falta`: texto em bold vermelho, animação `pulseOutline`

### Atualização em Tempo Real

Botão no canto superior direito do header:

| Estado | Visual | Comportamento |
|--------|--------|---------------|
| OFF (padrão) | cinza, `Ao vivo: OFF` | Dados carregados uma vez ao montar |
| ON | verde, `Ao vivo: ON` | `setInterval` de 30 s chama a API sem apagar dados existentes |
| Refreshing | ícone girando | `refreshing=true`; tela não pisca, só o ícone |

- Última atualização exibida abaixo do botão: `Atualizado às HH:MM:SS`
- Intervalo cancelado automaticamente no `cleanup` do `useEffect`

### Filtros da Tabela

| Filtro | Tipo | Campo |
|--------|------|-------|
| Busca por nome | input texto | `item_nome` |
| Lista | select | `lista_id` |
| Área | select | `area_id` |
| Situação | select | `falta` / `quase_acabando` / `precisa_comprar` / `completo` / `excesso` |

### Ordenação da Tabela

Colunas clicáveis: Item, Lista, Área, Atual, Mínimo, Situação.
Padrão: ordenação por `situacao` ascendente (piores primeiro).

Ordem das zonas no sort: `falta(0) → quase_acabando(1) → precisa_comprar(2) → completo(3) → excesso(4)`.

### Fonte dos Dados

- `quantidade_minima` vem de `ListaItemRef.quantidade_minima` (por lista, não global)
- Alterar o mínimo na tela de lista mãe (`ListaMaeConsolidada`) reflete nas estatísticas na próxima carga ou no próximo ciclo de 30 s (se ao vivo ativo)
- Backend: `GET /admin/estatisticas` → `services.get_estatisticas()`

### API Calls

| Endpoint | Método | Uso |
|----------|--------|-----|
| `/admin/estatisticas` | GET | Carregar / atualizar todos os dados |

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
| `frontend/src/features/admin/StatisticsDashboard.tsx` | Dashboard de estatísticas de estoque |
