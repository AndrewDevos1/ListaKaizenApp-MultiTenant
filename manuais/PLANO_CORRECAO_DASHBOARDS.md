# PLANO DE CORREÇÃO: Dashboards Admin e Colaborador

## 📋 RESUMO EXECUTIVO

Este documento contém o plano completo para corrigir **4 problemas críticos** identificados nos dashboards de Admin e Colaborador.

**Problemas identificados:**
1. 🔴 **Admin:** Card "Itens e Insumos" exibe valor errado
2. 🔴 **Admin:** Card "Solicitações" está duplicado
3. 🔴 **Colaborador:** Card "Minhas Compras" não funciona
4. 🔴 **Colaborador:** Card "Submissões Concluídas" fica em branco

**Tempo estimado:** 30-45 minutos
**Arquivos a modificar:** 5 arquivos
**Complexidade:** BAIXA (apenas correções de configuração)

---

## 🔴 PROBLEMA #1: Card "Itens e Insumos" - Valor Errado

### Descrição do Problema
O card mostra o número de **listas** quando deveria mostrar o número de **itens**.

**Localização:** `frontend/src/features/admin/AdminDashboard.tsx`

### Diagnóstico
- Card funciona ✓
- Link está correto (`/admin/items`) ✓
- Componente `ItemManagement.tsx` existe e funciona ✓
- **PROBLEMA:** Linha 317 usa `stats.total_lists` ao invés de `stats.total_items`

### Solução

#### PASSO 1.1: Adicionar campo à interface DashboardStats

**Arquivo:** `frontend/src/features/admin/AdminDashboard.tsx`

**Localização:** Linha 70 (interface DashboardStats)

**PROCURAR POR:**
```typescript
interface DashboardStats {
    total_users: number;
    pending_users: number;
    total_lists: number;
    pending_submissions: number;
    pending_cotacoes: number;
    orders_today: number;
}
```

**ADICIONAR campo `total_items`:**
```typescript
interface DashboardStats {
    total_users: number;
    pending_users: number;
    total_lists: number;
    total_items: number;        // ← ADICIONAR ESTA LINHA
    pending_submissions: number;
    pending_cotacoes: number;
    orders_today: number;
}
```

#### PASSO 1.2: Corrigir valor do widget

**Arquivo:** `frontend/src/features/admin/AdminDashboard.tsx`

**Localização:** Linha 317 (widget de Itens e Insumos)

**PROCURAR POR:**
```typescript
{
    id: 'widget-items',
    title: 'Itens e Insumos',
    value: stats.total_lists,     // ← ERRADO
    icon: faBox,
    color: styles.widgetBlue,
    link: '/admin/items',
    trend: '+12',
    trendType: 'positive',
},
```

**SUBSTITUIR POR:**
```typescript
{
    id: 'widget-items',
    title: 'Itens e Insumos',
    value: stats.total_items,     // ← CORRETO
    icon: faBox,
    color: styles.widgetBlue,
    link: '/admin/items',
    trend: '+12',
    trendType: 'positive',
},
```

#### PASSO 1.3: Atualizar backend para retornar total_items

**Arquivo:** `backend/kaizen_app/services.py`

**Localização:** Procurar pela função `get_dashboard_summary()` (aproximadamente linha 1100-1150)

**PROCURAR POR:**
```python
def get_dashboard_summary():
    # ... código existente ...

    return {
        'total_users': total_users,
        'pending_users': pending_users,
        'total_lists': total_lists,
        'pending_submissions': pending_submissions,
        'pending_cotacoes': pending_cotacoes,
        'orders_today': orders_today
    }, 200
```

**ADICIONAR cálculo de total_items:**
```python
def get_dashboard_summary():
    # ... código existente ...

    # Contar total de itens
    total_items = Item.query.count()

    return {
        'total_users': total_users,
        'pending_users': pending_users,
        'total_lists': total_lists,
        'total_items': total_items,      # ← ADICIONAR ESTA LINHA
        'pending_submissions': pending_submissions,
        'pending_cotacoes': pending_cotacoes,
        'orders_today': orders_today
    }, 200
```

---

## 🔴 PROBLEMA #2: Card "Solicitações" - Duplicado

### Descrição do Problema
O card "Solicitações" aponta para a mesma página que "Gerenciar Listas", quando deveria apontar para "Gerenciar Pedidos".

**Localização:** `frontend/src/features/admin/AdminDashboard.tsx`

### Diagnóstico
- Ambos os cards apontam para `/admin/listas-compras`
- Componente `GerenciarPedidos.tsx` existe e funciona ✓
- Rota `/admin/gerenciar-pedidos` existe ✓
- **PROBLEMA:** Link do card está errado

### Solução

#### PASSO 2.1: Corrigir link do card Solicitações

**Arquivo:** `frontend/src/features/admin/AdminDashboard.tsx`

**Localização:** Linha 330 (widget de Solicitações)

**PROCURAR POR:**
```typescript
{
    id: 'widget-orders',
    title: 'Solicitações',
    value: stats.orders_today,
    icon: faClipboardList,
    color: styles.widgetRed,
    link: '/admin/listas-compras',    // ← ERRADO (duplicado)
    trend: '+7',
    trendType: 'positive',
},
```

**SUBSTITUIR POR:**
```typescript
{
    id: 'widget-orders',
    title: 'Solicitações',
    value: stats.orders_today,
    icon: faClipboardList,
    color: styles.widgetRed,
    link: '/admin/gerenciar-pedidos', // ← CORRETO
    trend: '+7',
    trendType: 'positive',
},
```

**RESULTADO:**
- Card "Gerenciar Listas" → `/admin/listas-compras` (ListasCompras.tsx)
- Card "Solicitações" → `/admin/gerenciar-pedidos` (GerenciarPedidos.tsx)

---

## 🔴 PROBLEMA #3: Card "Minhas Compras" - Não Funciona

### Descrição do Problema
Ao clicar em uma lista em "Minhas Compras", a navegação falha porque a rota está errada.

**Localização:** `frontend/src/features/collaborator/MinhasListas.tsx`

### Diagnóstico
- Card "Minhas Compras" leva para `/collaborator/listas` ✓
- `MinhasListasCompras.tsx` carrega corretamente ✓
- **PROBLEMA:** `MinhasListas.tsx` usa rota singular `/lista/` quando deveria ser plural `/listas/`

### Solução

#### PASSO 3.1: Corrigir rota em MinhasListas.tsx (primeira ocorrência)

**Arquivo:** `frontend/src/features/collaborator/MinhasListas.tsx`

**Localização:** Linha 82

**PROCURAR POR:**
```typescript
onClick={() => navigate(`/collaborator/lista/${lista.id}/estoque`)}
```

**SUBSTITUIR POR:**
```typescript
onClick={() => navigate(`/collaborator/listas/${lista.id}/estoque`)}
```

#### PASSO 3.2: Corrigir rota em MinhasListas.tsx (segunda ocorrência)

**Arquivo:** `frontend/src/features/collaborator/MinhasListas.tsx`

**Localização:** Linha 102

**PROCURAR POR:**
```typescript
navigate(`/collaborator/lista/${lista.id}/estoque`);
```

**SUBSTITUIR POR:**
```typescript
navigate(`/collaborator/listas/${lista.id}/estoque`);
```

**NOTA:** A mudança é de `lista` (singular) para `listas` (plural) para corresponder à rota definida em App.tsx.

---

## 🔴 PROBLEMA #4: Card "Submissões Concluídas" - Fica em Branco

### Descrição do Problema
Ao clicar no card, a tela carrega mas fica em branco sem mostrar pedidos.

**Localização:** `frontend/src/features/inventory/MinhasSubmissoes.tsx`

### Diagnóstico
- Card leva para `/collaborator/submissions` ✓
- Rota carrega `MinhasSubmissoes.tsx` ✓
- Componente está importado ✓
- **PROBLEMA:** Endpoint chamado está errado (`/pedidos/me` ao invés de `/v1/pedidos/me`)

### Solução

#### PASSO 4.1: Corrigir endpoint da API

**Arquivo:** `frontend/src/features/inventory/MinhasSubmissoes.tsx`

**Localização:** Linha 31

**PROCURAR POR:**
```typescript
const response = await api.get('/pedidos/me');
```

**SUBSTITUIR POR:**
```typescript
const response = await api.get('/v1/pedidos/me');
```

**EXPLICAÇÃO:**
- O blueprint `api_bp` tem prefixo `/api/v1`
- A rota completa é `/api/v1/pedidos/me`
- Como `api.baseURL` já é `/api`, precisamos chamar `/v1/pedidos/me`

---

## 📁 RESUMO DE ARQUIVOS A MODIFICAR

### Frontend (4 arquivos):

1. **`frontend/src/features/admin/AdminDashboard.tsx`**
   - Linha 70: Adicionar `total_items: number;` na interface
   - Linha 317: Mudar `stats.total_lists` para `stats.total_items`
   - Linha 330: Mudar link de `/admin/listas-compras` para `/admin/gerenciar-pedidos`

2. **`frontend/src/features/collaborator/MinhasListas.tsx`**
   - Linha 82: Mudar `/collaborator/lista/` para `/collaborator/listas/`
   - Linha 102: Mudar `/collaborator/lista/` para `/collaborator/listas/`

3. **`frontend/src/features/inventory/MinhasSubmissoes.tsx`**
   - Linha 31: Mudar `/pedidos/me` para `/v1/pedidos/me`

### Backend (1 arquivo):

4. **`backend/kaizen_app/services.py`**
   - Função `get_dashboard_summary()`: Adicionar contagem de `total_items`

---

## ✅ CHECKLIST DE EXECUÇÃO

### Problema #1: Card "Itens e Insumos"
- [ ] Adicionar `total_items: number;` na interface DashboardStats (linha 70)
- [ ] Mudar `stats.total_lists` para `stats.total_items` no widget (linha 317)
- [ ] Adicionar `total_items = Item.query.count()` no backend
- [ ] Adicionar `'total_items': total_items` no retorno do backend

### Problema #2: Card "Solicitações"
- [ ] Mudar link de `/admin/listas-compras` para `/admin/gerenciar-pedidos` (linha 330)

### Problema #3: Card "Minhas Compras"
- [ ] Corrigir rota na linha 82: `lista` → `listas`
- [ ] Corrigir rota na linha 102: `lista` → `listas`

### Problema #4: Card "Submissões Concluídas"
- [ ] Adicionar `/v1` no endpoint (linha 31): `/pedidos/me` → `/v1/pedidos/me`

---

## 🧪 TESTES RECOMENDADOS

### Testes Admin:

1. **Card "Itens e Insumos":**
   - Login como admin
   - Dashboard deve mostrar número correto de itens (não de listas)
   - Clicar no card deve levar a `/admin/items`
   - Página de itens deve carregar corretamente

2. **Card "Solicitações":**
   - Login como admin
   - Clicar no card "Solicitações" deve levar a `/admin/gerenciar-pedidos`
   - Página deve mostrar lista de pedidos com filtros
   - Botões de aprovar/rejeitar devem funcionar

### Testes Colaborador:

3. **Card "Minhas Compras":**
   - Login como colaborador
   - Clicar no card "Minhas Compras"
   - Ver lista de listas atribuídas
   - Clicar em "Preencher" de uma lista
   - Deve carregar página de preenchimento de estoque
   - Tabela com itens deve aparecer

4. **Card "Submissões Concluídas":**
   - Login como colaborador
   - Clicar no card "Submissões Concluídas"
   - Deve mostrar tabela com histórico de pedidos
   - Filtro por status (PENDENTE, APROVADO, REJEITADO) deve funcionar
   - Se não há pedidos, deve mostrar "Nenhum pedido encontrado"

---

## 📊 TABELA COMPARATIVA: ANTES vs DEPOIS

| Problema | Antes | Depois |
|----------|-------|--------|
| **Itens e Insumos** | Mostra total de listas | Mostra total de itens ✓ |
| **Solicitações** | Vai para `/admin/listas-compras` | Vai para `/admin/gerenciar-pedidos` ✓ |
| **Minhas Compras** | Navegação quebrada (404) | Navega para estoque da lista ✓ |
| **Submissões Concluídas** | Tela em branco (404) | Mostra histórico de pedidos ✓ |

---

## 🚀 ORDEM DE EXECUÇÃO RECOMENDADA

Execute as correções nesta ordem para minimizar problemas:

1. **Backend primeiro** (Problema #1):
   - Adicionar `total_items` em `services.py`
   - Reiniciar backend
   - Testar endpoint `/admin/dashboard-summary`

2. **Frontend Admin** (Problemas #1 e #2):
   - Modificar `AdminDashboard.tsx`
   - Testar ambos os cards

3. **Frontend Colaborador** (Problemas #3 e #4):
   - Modificar `MinhasListas.tsx`
   - Modificar `MinhasSubmissoes.tsx`
   - Testar ambos os cards

---

## 📝 OBSERVAÇÕES IMPORTANTES

### Sobre o Problema #1:
- O card sempre funcionou, apenas exibia o número errado
- Isso pode ter passado despercebido se não houvesse muitos items cadastrados
- A correção é simples: trocar a variável usada

### Sobre o Problema #2:
- O componente `GerenciarPedidos.tsx` já existe e está completo
- Foi criado no commit `e4ea740` (26/11/2025)
- Apenas o link do card estava errado

### Sobre o Problema #3:
- `MinhasListasCompras.tsx` funciona perfeitamente
- `MinhasListas.tsx` é um componente extra com bugs
- Apenas corrigir as rotas ou remover o componente se não for usado

### Sobre o Problema #4:
- O endpoint backend `/api/v1/pedidos/me` existe e funciona
- Frontend estava chamando URL errada sem o `/v1`
- Correção de 1 caractere resolve o problema

---

## 🎯 RESULTADO ESPERADO

Após implementar todas as correções:

### Admin Dashboard:
- ✅ Card "Itens e Insumos" mostra quantidade correta
- ✅ Card "Solicitações" leva para página de pedidos
- ✅ Card "Gerenciar Listas" continua funcionando
- ✅ Todos os cards levam para páginas diferentes

### Colaborador Dashboard:
- ✅ Card "Minhas Compras" permite acessar e editar listas
- ✅ Card "Submissões Concluídas" mostra histórico de pedidos
- ✅ Navegação funciona sem erros 404
- ✅ Dados carregam corretamente

---

## 📌 CAMINHOS ABSOLUTOS DOS ARQUIVOS

```
/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/features/admin/AdminDashboard.tsx
/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/features/collaborator/MinhasListas.tsx
/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/features/inventory/MinhasSubmissoes.tsx
/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/services.py
```

---

## ✨ CONCLUSÃO

Todos os 4 problemas são **correções simples** de configuração:
- Trocar variáveis
- Corrigir URLs
- Adicionar prefixos

Nenhum problema requer refatoração complexa ou mudanças de arquitetura.

**Tempo total estimado:** 30-45 minutos

**Data do plano:** 25/12/2025
**Autor:** Claude Code (Investigação e Planejamento)
