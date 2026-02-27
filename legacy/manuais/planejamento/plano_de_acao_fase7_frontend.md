# Plano de Ação - Fase 7: Finalização do Frontend e Conexão de Dados

**Objetivo:** Conectar as funcionalidades restantes do frontend aos seus respectivos endpoints no backend, aprimorar a exibição de dados e preparar a aplicação para testes abrangentes.

---

## Fase 1: Conexão das Estatísticas do Usuário

1.  **Atualizar `Dashboard.tsx` (Estatísticas do Colaborador):**
    *   **Arquivo:** `frontend/src/features/dashboard/Dashboard.tsx`
    *   **Ação:** Remover os dados mockados (`pending_submissions: 0`, `completed_lists: 0`) do estado inicial.
    *   **Conexão:** Garantir que a chamada `api.get('/v1/users/stats')` esteja funcionando corretamente e que os dados retornados sejam usados para popular os `Widget`s.
    *   **Backend (Pendência):** Lembre-se que a lógica para `completed_lists` no backend (`services.py`) ainda precisa ser definida.

---

## Fase 2: Exibição e Filtragem de Status de Pedido

1.  **Atualizar `MinhasSubmissoes.tsx`:**
    *   **Arquivo:** `frontend/src/features/inventory/MinhasSubmissoes.tsx`
    *   **Exibição de Status:** Adicionar uma nova coluna na tabela para exibir o `status` de cada pedido, conforme retornado pelo endpoint `/pedidos/me`.
    *   **Estilo:** Estilizar o status (ex: cores diferentes para PENDENTE, APROVADO, REJEITADO) para melhor visualização.
    *   **Filtro de Status (Opcional, mas recomendado):**
        *   Adicionar um dropdown ou botões de filtro acima da tabela para permitir que o usuário visualize pedidos por status.
        *   **Backend (Pendência):** O endpoint `/pedidos/me` pode precisar de um parâmetro de filtro para status, caso a filtragem seja feita no backend.

---

## Fase 3: Implementação de "Salvar Rascunho" (Frontend)

1.  **Atualizar `EstoqueLista.tsx`:**
    *   **Arquivo:** `frontend/src/features/inventory/EstoqueLista.tsx`
    *   **Ação:** Conectar o botão "Salvar Rascunho" ao endpoint `/v1/estoque/draft` no backend.
    *   **Feedback:** Adicionar feedback visual (ex: mensagem de sucesso/erro) após a tentativa de salvar o rascunho.
    *   **Backend (Pendência):** O endpoint `/v1/estoque/draft` ainda precisa ser implementado no backend.

---

## Fase 4: Testes e Refinamentos Finais

1.  **Testes Manuais Abrangentes:**
    *   Realizar testes de ponta a ponta em todas as funcionalidades implementadas e conectadas.
    *   Verificar a navegação, a exibição de dados, a submissão de formulários e a responsividade.
2.  **Testes de Usabilidade:**
    *   Avaliar a experiência do usuário e identificar pontos de melhoria na interface.
3.  **Correção de Bugs:**
    *   Corrigir quaisquer bugs ou inconsistências visuais/funcionais que forem encontrados.

---

**Próximo Passo Imediato:** Iniciar a **Fase 1: Conexão das Estatísticas do Usuário**.
