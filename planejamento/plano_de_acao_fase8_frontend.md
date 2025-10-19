# Plano de Ação - Fase 8: Implementação do Dashboard Administrativo (Frontend)

Este plano detalha as próximas etapas para a implementação do Dashboard Administrativo no frontend, com base nas especificações de `dashboardADM.md` e nas decisões de arquitetura e tecnologia de `relatorioFrontADM.md`.

## Objetivo
Desenvolver o Dashboard Administrativo, garantindo a exibição dos indicadores, ações rápidas e seções de conteúdo conforme especificado, com responsividade para desktop e mobile, e um visual inspirado no CoreUI utilizando as bibliotecas existentes (React-Bootstrap, Font Awesome).

## Etapas Detalhadas

### 1. Estrutura Geral e Layout
*   **Ajustar `Layout.tsx`:**
    *   Revisar e ajustar os estilos do cabeçalho e da sidebar para se aproximarem do visual do CoreUI.
    *   Garantir que a funcionalidade de toggle da sidebar esteja intacta e visualmente alinhada.
*   **Grid Responsivo:**
    *   Utilizar as classes de grid do Bootstrap para organizar os elementos da dashboard (e.g., 3 colunas no desktop, 1 coluna no mobile para os cards de indicadores).

### 2. Componentes de Indicadores (Cards de Visão Geral)
*   **Atualizar `AdminDashboard.tsx`:**
    *   Integrar o componente `Widget.tsx` para exibir os seis indicadores principais:
        *   Usuários Cadastrados
        *   Usuários Pendentes
        *   Listas Criadas
        *   Submissões Pendentes
        *   Cotações Abertas
        *   Pedidos Gerados Hoje
    *   Conectar cada `Widget` aos endpoints de backend correspondentes para buscar os dados.
    *   Implementar o botão "Ver" em cada card como um `Link` do `react-router-dom`, direcionando para as rotas administrativas específicas (e.g., `/admin/users`, `/admin/quotations?status=open`).
    *   Aplicar estilos para que os cards se assemelhem visualmente aos do CoreUI.

### 3. Ações Rápidas (Botões)
*   **Implementar Seção de Ações Rápidas:**
    *   Criar uma seção abaixo dos cards de indicadores para os botões de ações rápidas.
    *   Utilizar o componente `Button` do `react-bootstrap` para os botões:
        *   Gerenciar Usuários (`/admin/users`)
        *   Criar Lista de Estoque (`/admin/lists/new`)
        *   Iniciar Cotação (`/admin/quotations/new`)
        *   Exportar Pedidos (`/admin/orders/export`)
    *   Adicionar ícones relevantes usando `react-fontawesome`.
    *   Configurar o layout para ser horizontal no desktop e com scroll horizontal no mobile (utilizando classes Flexbox do Bootstrap).
    *   Estilizar os botões para se alinharem ao visual do CoreUI.

### 4. Seções de Conteúdo (Tabelas e Listas)
*   **Seção "Status das Listas":**
    *   Implementar uma tabela responsiva (usando `Table` do `react-bootstrap`) para desktop.
    *   Para mobile, converter a tabela em cards colapsáveis (usando `Accordion` do `react-bootstrap`).
    *   Adicionar o botão "Ver Consolidação" em cada linha/card.
    *   Conectar aos endpoints de backend para buscar os dados das listas.
*   **Seção "Atividades Recentes":**
    *   Criar uma lista cronológica de atividades.
    *   Tornar cada item da lista clicável para exibir detalhes em um modal.
    *   Conectar aos endpoints de backend para buscar os dados das atividades.
*   **Seção "Indicadores de Estoque Crítico":**
    *   Implementar uma tabela ou lista de cards para itens com estoque abaixo do mínimo.
    *   Adicionar o botão "Gerar Pedido" em cada linha/card.
    *   Conectar aos endpoints de backend para buscar os dados de estoque crítico.
*   **Seção "Cotações em Andamento":**
    *   Exibir cotações abertas em cards (horizontais roláveis no mobile, grid no desktop).
    *   Adicionar um ícone de edição em cada card que leve à tela de preenchimento de preços.
    *   Conectar aos endpoints de backend para buscar os dados das cotações.
*   **Seção "Relatórios e Exportações":**
    *   Adicionar links/botões para "Exportar Pedidos por Fornecedor" e "Exportar Relatório de Cotações".

### 5. Backend - Desenvolvimento de Endpoints (se necessário)
*   **Verificar e/ou Criar Endpoints:**
    *   Endpoint para contagem de "Submissões Pendentes".
    *   Endpoint para contagem de "Pedidos Gerados Hoje".
    *   Endpoints para os dados detalhados das seções "Status das Listas", "Atividades Recentes", "Estoque Crítico", "Cotações em Andamento".

### 6. Refinamento de Estilos
*   **CSS Customizado:**
    *   Aplicar estilos CSS customizados (via CSS Modules) para que os componentes do `react-bootstrap` e os elementos HTML se assemelhem ao design do CoreUI, mantendo a consistência visual.
    *   Garantir que as cores, tipografia, espaçamentos e ícones estejam alinhados com a inspiração.

## Tecnologias Utilizadas
*   **Frontend:** React, TypeScript
*   **UI Framework:** React-Bootstrap
*   **Estilização:** Bootstrap (classes), CSS Modules
*   **Ícones:** React-Fontawesome
*   **Roteamento:** React-Router-DOM

## Critérios de Sucesso
*   Dashboard Administrativo funcional e responsivo em desktop e mobile.
*   Todos os indicadores e seções de conteúdo exibidos corretamente.
*   Navegação entre as seções e ações rápidas funcionando.
*   Estilo visual alinhado com a inspiração do CoreUI, utilizando as bibliotecas existentes.
*   Integração bem-sucedida com os endpoints de backend.
