# Proposta de Redesign dos Dashboards (Estilo CoreUI)

**Objetivo:** Modernizar a interface, melhorar a visualização de dados e criar uma experiência de usuário mais intuitiva e agradável, usando o template CoreUI como principal referência de design.

---

### **1. Dashboard do Administrador (Foco em Gestão e Dados Globais)**

O dashboard atual do admin é funcional, mas pode ser transformado em um painel de controle mais rico em informações.

*   **Layout Geral:**
    *   Manter a estrutura de **Sidebar (menu lateral) + Header (cabeçalho) + Área de Conteúdo**, mas com o visual do CoreUI (cores mais sóbrias, tipografia limpa e ícones consistentes).

*   **Componentes Propostos:**
    1.  **Widgets de Estatísticas (Topo da Página):**
        *   Substituir os cards atuais por 4 "Widgets" no estilo CoreUI. Cada um teria um ícone, um título, o número em destaque e uma cor de fundo sutil (ex: azul para usuários, verde para listas, amarelo para cotações pendentes).
        *   **Dados:** `Total de Usuários`, `Total de Listas`, `Cotações Pendentes`, `Cotações Concluídas`.

    2.  **Gráfico de Atividade (Centro da Página):**
        *   Adicionar um **gráfico de linhas** grande mostrando a "Atividade do Sistema" (ex: número de listas preenchidas nos últimos 15 dias).
        *   Isso daria ao admin uma visão imediata do engajamento na plataforma.
        *   *Requer um novo endpoint no backend para alimentar o gráfico.*

    3.  **Cards de Acesso Rápido (Abaixo do Gráfico):**
        *   Manter as "Opções de Gerenciamento" (`Gestão de Usuários`, `Gestão de Itens`, etc.), mas com um design mais elegante, com ícones maiores e um efeito de "hover" suave, inspirado nos cards do CoreUI.

---

### **2. Dashboard do Colaborador (Foco em Tarefas e Progresso Pessoal)**

O objetivo aqui é ser direto e funcional, mostrando ao colaborador exatamente o que ele precisa fazer de forma clara.

*   **Layout Geral:**
    *   O mesmo layout (Sidebar + Header + Conteúdo) do admin, para manter a consistência visual em todo o sistema.

*   **Componentes Propostos:**
    1.  **Widgets de Tarefas (Topo da Página):**
        *   Um cabeçalho de boas-vindas ("Bem-vindo, [Nome do Usuário]!") seguido por 2 ou 3 widgets focados nas tarefas dele.
        *   **Dados:** `Minhas Submissões Pendentes`, `Listas Concluídas (no mês)`, `Áreas para Preencher`.
        *   *Utiliza o endpoint de `user/stats` que já foi criado.*

    2.  **Lista de Áreas de Trabalho (Centro da Página):**
        *   Mostrar as "Áreas de Trabalho" em um formato de lista ou cards mais detalhados.
        *   Cada card poderia ter um **indicador de status** (ex: um ícone de "alerta" se a área precisa de preenchimento, ou um "check" se já foi feito).
        *   Clicar no card continuaria levando para a página de preenchimento de estoque.

    3.  **Tabela de Submissões Recentes (Fim da Página):**
        *   Uma tabela simples e limpa, no estilo CoreUI, mostrando as "Minhas 5 Últimas Submissões".
        *   **Colunas:** `Nome da Lista`, `Data de Envio`, `Status` (Pendente, Aprovado, etc.).
        *   *Utiliza o endpoint `/pedidos/me` que já está pronto.*
