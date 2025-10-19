# Plano de Ação - Fase 6: Dashboard do Usuário e Melhorias de Usabilidade

**Objetivo:** Criar um dashboard focado no usuário, que seja mais intuitivo e informativo, e melhorar a experiência de preenchimento de listas.

## Fase 1: Componentes do Dashboard do Usuário

1.  **Componente `UserStats.tsx`:**
    *   **Arquivo:** `frontend/src/features/dashboard/UserStats.tsx`
    *   **Descrição:** Exibirá estatísticas relevantes para o usuário logado, como "Minhas Submissões Pendentes", "Listas Concluídas", etc.
    *   **Dados:** Consumirá um novo endpoint da API: `/api/v1/users/stats`.

2.  **Componente `WorkAreasList.tsx`:**
    *   **Arquivo:** `frontend/src/features/dashboard/WorkAreasList.tsx`
    *   **Descrição:** Exibirá a lista de "Áreas de Trabalho" (como no dashboard antigo), mas com um design mais moderno, usando cards.
    *   **Funcionalidade:** Permitirá que o usuário navegue para a página de preenchimento de lista (`EstoqueLista.tsx`).

## Fase 2: Novo Dashboard do Usuário

1.  **Criar `UserDashboard.tsx`:**
    *   **Arquivo:** `frontend/src/features/dashboard/UserDashboard.tsx`
    *   **Descrição:** Este será o novo dashboard para usuários não-admin.
    *   **Layout:** Organizará os componentes `UserStats.tsx` and `WorkAreasList.tsx`.

## Fase 3: Refatoração das Rotas e Dashboards

1.  **Renomear `Dashboard.tsx` para `GlobalDashboard.tsx`:**
    *   **Arquivo:** `frontend/src/features/dashboard/Dashboard.tsx` -> `frontend/src/features/dashboard/GlobalDashboard.tsx`
    *   **Descrição:** O dashboard de estatísticas globais criado na Fase 5 será renomeado para evitar confusão.

2.  **Atualizar `App.tsx`:**
    *   **Ação:** As rotas serão ajustadas para a nova estrutura.
    *   A rota de admin (`/admin`) renderizará o `AdminDashboard.tsx` (o antigo, com as opções de gestão).
    *   A rota de usuário (`/`) renderizará o `UserDashboard.tsx`.
    *   Uma nova rota (`/dashboard`) pode ser criada para o `GlobalDashboard.tsx`.

3.  **Atualizar `AdminDashboard.tsx`:**
    *   **Ação:** O `AdminDashboard.tsx` (o antigo) será atualizado para incluir o `GlobalDashboard.tsx` como um componente, para que o admin possa ver as estatísticas globais e as opções de gestão na mesma página.

## Fase 4: Melhorias na Experiência de Preenchimento de Lista

1.  **Atualizar `EstoqueLista.tsx`:**
    *   **Arquivo:** `frontend/src/features/inventory/EstoqueLista.tsx`
    *   **Descrição:** Melhorar a usabilidade da página de preenchimento de lista.
    *   **Funcionalidades:**
        *   Adicionar um campo de busca para filtrar itens da lista.
        *   Melhorar o feedback visual ao adicionar/remover itens.
        *   Adicionar um resumo da lista (total de itens, etc.).

## Fase 5: Backend - Novas Rotas

1.  **Criar endpoint `/api/v1/users/stats`:**
    *   **Arquivo:** `backend/kaizen_app/controllers.py`
    *   **Descrição:** Retornará estatísticas para o usuário logado.
    *   **Dados:** "Minhas Submissões Pendentes", "Listas Concluídas", etc.
