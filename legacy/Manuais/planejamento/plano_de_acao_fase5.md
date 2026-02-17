# Plano de Ação - Fase 5: Redesenho do Dashboard e Correção de Bugs

**Objetivo:** Redesenhar o dashboard para ser mais moderno e informativo, usando como referência o `bootstrap-login-dashboard`, e corrigir o problema atual da tela em branco.

## Fase 1: Criar Componentes Reutilizáveis

1.  **Componente `StatsCard.tsx`:**
    *   **Arquivo:** `frontend/src/features/dashboard/StatsCard.tsx`
    *   **Descrição:** Este será um componente de apresentação que receberá `title`, `value`, `icon`, e `color` como propriedades.
    *   **Estilo:** Será estilizado para se assemelhar aos cartões do design de referência (com sombra, cantos arredondados, etc.).
    *   **Ícone:** Utilizará ícones do Font Awesome para uma melhor representação visual.

2.  **Componente `RecentSubmissions.tsx`:**
    *   **Arquivo:** `frontend/src/features/dashboard/RecentSubmissions.tsx`
    *   **Descrição:** Este componente será responsável por buscar e exibir as submissões recentes.
    *   **Estrutura:** Conterá uma tabela com as colunas: `#`, `Lista`, `Colaborador`, `Data`, `Status`.
    *   **Funcionalidade:** Irá gerenciar os estados de carregamento (`loading`) e erro (`error`) durante a busca dos dados.

## Fase 2: Redesenhar o Dashboard

1.  **Atualizar `Dashboard.tsx`:**
    *   **Arquivo:** `frontend/src/features/dashboard/Dashboard.tsx`
    *   **Ação:** O conteúdo atual do arquivo será substituído pelo novo layout.
    *   **Layout:** Será implementado um layout de grade para organizar os `StatsCard`.
    *   **Componentes:** O `Dashboard.tsx` irá utilizar os novos componentes `StatsCard.tsx` e `RecentSubmissions.tsx`.
    *   **Dados:** Serão adicionadas as chamadas de API necessárias para buscar os dados para os cartões de estatísticas e para a tabela de submissões.

## Fase 3: Refinar Layout e Estilo

1.  **Atualizar `Layout.tsx`:**
    *   **Arquivo:** `frontend/src/components/Layout.tsx`
    *   **Ação:** A barra lateral (sidebar) será ajustada para corresponder ao design de referência (cores, ícones, estado ativo dos links).
    *   **Responsividade:** Garantir que o layout seja responsivo e se adapte a diferentes tamanhos de tela.

2.  **Criar `Dashboard.css`:**
    *   **Arquivo:** `frontend/src/features/dashboard/Dashboard.css`
    *   **Ação:** Os estilos personalizados do arquivo `bootstrap-login-dashboard/style.css` serão migrados para este novo arquivo.
    *   **Importação:** O `Dashboard.css` será importado no componente `Dashboard.tsx`.

## Fase 4: Revisão Final e Testes

1.  **Revisão do Novo Dashboard:**
    *   Verificar se o novo design corresponde ao design de referência.
    *   Confirmar que todos os dados dinâmicos estão sendo exibidos corretamente.
    *   Testar a responsividade do dashboard em diferentes dispositivos.
2.  **Teste Manual:**
    *   Realizar o login e navegar até o dashboard.
    *   Verificar se o problema da tela em branco foi resolvido.
    *   Inspecionar o console do navegador para garantir que não há erros.
