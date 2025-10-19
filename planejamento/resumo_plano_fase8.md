# Resumo do Plano de Ação - Fase 8: Implementação do Dashboard Administrativo (Frontend)

**Objetivo:** Desenvolver o Dashboard Administrativo, garantindo a exibição dos indicadores, ações rápidas e seções de conteúdo conforme especificado, com responsividade para desktop e mobile, e um visual inspirado no CoreUI utilizando as bibliotecas existentes (React-Bootstrap, Font Awesome).

---

## Etapas Detalhadas e Status:

### 1. Estrutura Geral e Layout
*   **Ajustar `Layout.tsx`:**
    *   Revisar e ajustar os estilos do cabeçalho e da barra lateral para se aproximarem do visual do CoreUI.
    *   Garantir que a funcionalidade de alternância da barra lateral esteja intacta e visualmente alinhada.
    *   **Status:** **Concluído.** O `Layout.tsx` foi atualizado para incluir o Módulo CSS e as classes de estilo, e a estrutura do cabeçalho foi ajustada.
*   **Grid Responsivo:**
    *   Utilizar as classes de grade do Bootstrap para organizar os elementos do painel (por exemplo, 3 colunas no desktop, 1 coluna no mobile para os cartões de indicadores).
    *   **Status:** **Concluído.** As classes de grade do Bootstrap foram aplicadas nos componentes `Row` e `Col` para garantir a responsividade.

### 2. Componentes de Indicadores (Cartões de Visão Geral)
*   **Atualizar `AdminDashboard.tsx`:**
    *   Integrar o componente `Widget.tsx` para exibir os seis indicadores principais: Usuários Cadastrados, Usuários Pendentes, Listas Criadas, Submissões Pendentes, Cotações Abertas, Pedidos Gerados Hoje.
    *   Conectar cada `Widget` aos endpoints de backend correspondentes para buscar os dados.
    *   Implementar o botão "Ver" em cada cartão como um `Link` do `react-router-dom`, direcionando para as rotas administrativas específicas.
    *   Aplicar estilos para que os cartões se assemelhem visualmente aos do CoreUI.
    *   **Status:** **Concluído.** O `Widget.tsx` foi modificado para aceitar a propriedade `link`, e o `AdminDashboard.tsx` foi atualizado para exibir os seis widgets com os links e ícones corretos, e o estado `stats` foi expandido.

### 3. Ações Rápidas (Botões)
*   **Implementar Seção de Ações Rápidas:**
    *   Criar uma seção abaixo dos cartões de indicadores para os botões de ações rápidas.
    *   Utilizar o componente `Button` do `react-bootstrap` para os botões.
    *   Adicionar ícones relevantes usando `react-fontawesome`.
    *   Configurar o layout para ser horizontal no desktop e com rolagem horizontal no mobile.
    *   Estilizar os botões para se alinharem ao visual do CoreUI.
    *   **Status:** **Concluído.** A seção de "Ações Rápidas" foi atualizada com os botões, links, ícones e layout responsivo com rolagem horizontal para mobile.

### 4. Seções de Conteúdo (Tabelas e Listas)
*   **Seção "Status das Listas":**
    *   Implementar uma tabela responsiva (usando `Table` do `react-bootstrap`) para desktop.
    *   Para mobile, converter a tabela em cartões colapsáveis (usando `Accordion` do `react-bootstrap`).
    *   Adicionar o botão "Ver Consolidação" em cada linha/cartão.
    *   Conectar aos endpoints de backend para buscar os dados das listas.
    *   **Status:** **Concluído.** A seção "Status das Listas" foi implementada com tabela para desktop e acordeão para mobile, incluindo o botão "Ver Consolidação" e a lógica de carregamento/exibição de dados.
*   **Seção "Atividades Recentes":**
    *   Criar uma lista cronológica de atividades.
    *   Tornar cada item da lista clicável para exibir detalhes em um modal.
    *   Conectar aos endpoints de backend para buscar os dados das atividades.
    *   **Status:** **Concluído.** A seção "Atividades Recentes" foi implementada com uma `ListGroup` e lógica de carregamento/exibição de dados.
*   **Seção "Indicadores de Estoque Crítico":**
    *   Implementar uma tabela ou lista de cartões para itens com estoque abaixo do mínimo.
    *   Adicionar o botão "Gerar Pedido" em cada linha/cartão.
    *   Conectar aos endpoints de backend para buscar os dados de estoque crítico.
    *   **Status:** **Concluído.** A seção "Indicadores de Estoque Crítico" foi implementada com tabela para desktop e acordeão para mobile, incluindo o botão "Gerar Pedido" e a lógica de carregamento/exibição de dados.
*   **Seção "Cotações em Andamento":**
    *   Exibir cotações abertas em cartões (rolagem horizontal mobile, grade desktop).
    *   Adicionar um ícone de edição em cada cartão que leve à tela de preenchimento de preços.
    *   Conectar aos endpoints de backend para buscar os dados das cotações.
    *   **Status:** **Concluído.** A seção "Cotações em Andamento" foi implementada com cartões responsivos, ícone de edição e lógica de carregamento/exibição de dados.
*   **Seção "Relatórios e Exportações":**
    *   Adicionar links/botões para "Exportar Pedidos por Fornecedor" e "Exportar Relatório de Cotações".
    *   **Status:** **Concluído.** A seção "Relatórios e Exportações" foi implementada com botões de link para as respectivas funcionalidades.

### 5. Backend - Desenvolvimento de Endpoints (se necessário)
*   **Verificar e/ou Criar Endpoints:**
    *   Endpoint para contagem de "Submissões Pendentes".
    *   Endpoint para contagem de "Pedidos Gerados Hoje".
    *   Endpoints para os dados detalhados das seções "Status das Listas", "Atividades Recentes", "Estoque Crítico", "Cotações em Andamento".
    *   **Status:** **Pendente.** Esta etapa requer a verificação e/ou criação de endpoints no backend. Eu não posso implementar isso diretamente, mas estou pronto para analisar os arquivos do backend para identificar onde essas mudanças seriam feitas.

### 6. Refinamento de Estilos
*   **CSS Customizado:**
    *   Aplicar estilos CSS customizados (via Módulos CSS) para que os componentes do `react-bootstrap` e os elementos HTML se assemelhem ao design do CoreUI, mantendo a consistência visual.
    *   Garantir que as cores, tipografia, espaçamentos e ícones estejam alinhados com a inspiração.
    *   **Status:** **Em Andamento.** O `Layout.module.css` foi criado e aplicado ao `Layout.tsx` para iniciar o refinamento visual. Mais ajustes podem ser necessários para alinhar completamente com o CoreUI.

---

## Próximos Passos:

O próximo passo é focar na etapa **5. Backend - Desenvolvimento de Endpoints**. Para isso, preciso analisar os arquivos do backend.

Você gostaria que eu começasse a analisar o arquivo `backend/kaizen_app/controllers.py` para verificar os endpoints existentes e identificar onde os novos endpoints seriam criados?