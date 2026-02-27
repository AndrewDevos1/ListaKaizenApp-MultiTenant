# Plano: Dashboard Global Completo para Super Admin

## Objetivo
Criar um dashboard completo em `/admin/global` com estatísticas, gráficos, filtros por restaurante, exportação em PDF/Excel, e auto-refresh.

---

## Configurações Definidas

| Configuração | Valor |
|--------------|-------|
| **Escopo** | Filtro por restaurante (com opção "Todos") |
| **Período padrão** | Últimos 30 dias |
| **Exportação** | PDF + Excel |
| **Atualização** | Auto-refresh 5min + botão manual |

---

## Arquivos a Modificar/Criar

### Backend
| Arquivo | Ação |
|---------|------|
| `backend/kaizen_app/controllers.py` | Adicionar 3 rotas |
| `backend/kaizen_app/services.py` | Adicionar 3 funções |
| `backend/requirements.txt` | Adicionar openpyxl, reportlab |

### Frontend
| Arquivo | Ação |
|---------|------|
| `frontend/src/features/dashboard/GlobalDashboard.tsx` | Refatorar completamente |
| `frontend/src/features/dashboard/GlobalDashboard.module.css` | Criar (CSS Module) |
| `frontend/src/features/dashboard/components/` | Criar pasta com componentes |
| `frontend/src/features/dashboard/hooks/useDashboardData.ts` | Criar hook |
| `frontend/src/features/dashboard/types.ts` | Criar interfaces |

---

## Seções do Dashboard

### 1. Header com Controles
- Título "Dashboard Global"
- Dropdown filtro de restaurante
- Dropdown período (7/30/60/90 dias)
- Botão refresh manual
- Botões exportar PDF/Excel
- Indicador "Última atualização"

### 2. Cards de Resumo (8 cards)
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Restaurantes    │ Usuários        │ Aguardando      │ Listas          │
│ Total ativos    │ Por role        │ Aprovação       │ Total ativas    │
├─────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ Itens           │ Pedidos Hoje    │ Cotações        │ Cotações        │
│ No catálogo     │ Criados hoje    │ Pendentes       │ Concluídas      │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### 3. Gráficos Temporais (4 gráficos)
```
┌────────────────────────────────┬────────────────────────────────┐
│ Pedidos por Dia (Line)         │ Submissões por Semana (Bar)    │
│ Últimos 30 dias                │ Últimas 4-5 semanas            │
├────────────────────────────────┼────────────────────────────────┤
│ Usuários Criados (Line)        │ Status de Pedidos (Doughnut)   │
│ Por mês                        │ Pendente/Aprovado/Rejeitado    │
└────────────────────────────────┴────────────────────────────────┘
```

### 4. Listas e Listas Rápidas
- Status de listas semanais (submissões, última atualização)
- Listas rápidas por prioridade:
  - PREVENÇÃO (verde)
  - PRECISA_COMPRAR (amarelo)
  - URGENTE (vermelho)
- Taxa de aprovação (%)

### 5. Checklists
- Ativos vs Finalizados
- Taxa de conclusão de itens
- Tempo médio para finalizar
- Últimos checklists

### 6. Movimentação de Usuários
- Timeline de novos usuários
- Top 5 usuários mais ativos
- Tempo médio de resposta dos admins

### 7. Fornecedores e Cotações
- Fornecedores por restaurante
- Status de cotações (pendentes/concluídas)
- Valor médio de cotações

### 8. Sugestões de Itens
- Pendentes
- Taxa de aprovação
- Itens mais sugeridos

### 9. Notificações
- Taxa de leitura
- Distribuição por tipo

### 10. Timeline de Atividade Recente
- Últimas submissões
- Últimas cotações
- Novos usuários
- Checklists finalizados

---

## API Backend

### Endpoint Principal
```
GET /api/admin/super-dashboard
Query params:
  - restaurante_id (int, opcional)
  - period (int, default=30)
```

### Response Structure
```json
{
  "summary": {
    "total_restaurantes": 5,
    "total_users": 120,
    "users_by_role": {"super_admin": 2, "admin": 15, "collaborator": 103},
    "pending_approvals": 3,
    "total_listas": 45,
    "total_pedidos": 890,
    "pending_cotacoes": 12,
    "completed_cotacoes": 156
  },
  "temporal": {
    "orders_per_day": {"labels": [...], "data": [...]},
    "submissions_per_week": {"labels": [...], "data": [...]},
    "users_per_month": {"labels": [...], "data": [...]},
    "order_status_distribution": {"labels": [...], "data": [...]}
  },
  "lists": {...},
  "checklists": {...},
  "users": {...},
  "suppliers": {...},
  "suggestions": {...},
  "notifications": {...},
  "recent_activities": [...],
  "meta": {"generated_at": "...", "period_days": 30}
}
```

### Endpoints de Exportação
```
GET /api/admin/super-dashboard/export/pdf
GET /api/admin/super-dashboard/export/excel
```

---

## Estrutura de Componentes Frontend

```
frontend/src/features/dashboard/
├── GlobalDashboard.tsx              # Container principal
├── GlobalDashboard.module.css       # Estilos
├── types.ts                         # Interfaces TypeScript
├── hooks/
│   └── useDashboardData.ts          # Fetch + auto-refresh
└── components/
    ├── DashboardHeader.tsx          # Filtros + exportação
    ├── SummaryCards.tsx             # 8 cards de resumo
    ├── TemporalCharts.tsx           # 4 gráficos Chart.js
    ├── ListsSection.tsx             # Listas semanais/rápidas
    ├── ChecklistsSection.tsx        # Métricas de checklists
    ├── UsersSection.tsx             # Movimentação de usuários
    ├── SuppliersSection.tsx         # Fornecedores e cotações
    ├── SuggestionsSection.tsx       # Sugestões de itens
    ├── NotificationsSection.tsx     # Métricas de notificações
    └── ActivityTimeline.tsx         # Atividade recente
```

---

## Ordem de Implementação

### Fase 1: Backend
1. Adicionar dependências (openpyxl, reportlab)
2. Criar função `get_super_dashboard_data()` em services.py
3. Criar rota `/api/admin/super-dashboard`
4. Criar funções e rotas de exportação

### Fase 2: Frontend Base
5. Criar estrutura de pastas e tipos
6. Criar hook `useDashboardData` com auto-refresh
7. Refatorar GlobalDashboard.tsx com layout base
8. Implementar DashboardHeader com filtros

### Fase 3: Componentes de Dados
9. Implementar SummaryCards (8 cards)
10. Implementar TemporalCharts (4 gráficos)
11. Implementar seções restantes

### Fase 4: Exportação e Polimento
12. Conectar exportação PDF/Excel
13. Ajustes responsivos
14. Suporte dark mode
15. Testes

---

## Paleta de Cores (seguir AdminDashboard)

| Uso | Cor |
|-----|-----|
| Azul (Usuários) | `#667eea` |
| Verde (Listas) | `#2eb85c` |
| Amarelo (Submissões) | `#ffc107` |
| Vermelho (Pedidos) | `#e55353` |
| Roxo (Cotações) | `#6f42c1` |
| Laranja (Aprovações) | `#f9b115` |
| Ciano (Info) | `#36b9cc` |

---

## Verificação

1. Acessar `http://localhost:3000/admin/global` como SUPER_ADMIN
2. Verificar filtro de restaurante funciona
3. Verificar todos os cards mostram dados
4. Verificar gráficos renderizam corretamente
5. Verificar exportação PDF gera arquivo válido
6. Verificar exportação Excel gera arquivo válido
7. Verificar auto-refresh a cada 5 minutos
8. Verificar responsividade em mobile
9. Verificar modo escuro
10. Executar `pytest backend/tests/`












