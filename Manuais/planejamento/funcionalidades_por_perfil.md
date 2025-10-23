# Funcionalidades por Perfil de Usuário

Este documento detalha as funcionalidades disponíveis para cada perfil de usuário no sistema Kaizen Lista App.

---

## Perfil: Administrador (Admin)

O administrador tem acesso total ao sistema, com foco na configuração, gerenciamento e visualização de dados globais.

### Dashboard e Visualização de Dados
- **Dashboard de Administrador:** Acesso a uma visão geral com atalhos para todas as áreas de gerenciamento.
- **Dashboard Global:** Visualização de estatísticas globais do sistema, como número de listas, usuários e cotações.

### Gerenciamento de Usuários
- **Aprovar/Reprovar Novos Usuários:** Aceita ou recusa o cadastro de novos colaboradores.
- **Criar Novos Usuários:** Cadastra novos usuários, definindo seu perfil (Admin ou Colaborador).
- **Listar e Visualizar Usuários:** Vê a lista de todos os usuários cadastrados no sistema.

### Gerenciamento do Inventário e Catálogo
- **Gerenciar Itens:** Cria, edita e remove os itens que podem ser solicitados.
- **Gerenciar Áreas:** Cria, edita e remove as áreas/setores que farão os pedidos (ex: Cozinha, Limpeza).
- **Gerenciar Fornecedores:** Cadastra e mantém as informações dos fornecedores.

### Gerenciamento de Listas e Cotações
- **Gerenciar Listas:** Cria novas listas de compras e as associa a colaboradores.
- **Gerar Cotações:** Inicia um processo de cotação com base nos itens que precisam de reposição.
- **Acompanhar Cotações:** Visualiza todas as cotações, seus itens e preenche os preços.

---

## Perfil: Colaborador

O colaborador é o usuário padrão do sistema, focado em realizar as tarefas de preenchimento de listas e acompanhamento de seus pedidos.

### Dashboard e Acompanhamento
- **Dashboard do Colaborador:** Apresenta uma visão geral com estatísticas pessoais (ex: submissões pendentes) e acesso rápido às suas áreas de trabalho.
- **Minhas Submissões:** Permite que o usuário veja o histórico de todas as listas que ele já submeteu.

### Preenchimento de Listas
- **Acessar Áreas de Trabalho:** Visualiza as áreas de trabalho às quais foi atribuído.
- **Preencher Lista de Estoque:** Informa a quantidade atual dos itens em uma determinada área. A página oferece busca e um resumo para facilitar o preenchimento.
- **Salvar Rascunho:** Salva o progresso do preenchimento de uma lista para continuar depois.
- **Submeter Lista:** Envia a lista preenchida para o sistema, gerando os pedidos de reposição necessários.



  ✅ Funcionalidades Prontas para Conexão

  A grande maioria das funcionalidades de backend já está implementada e pronta para ser usada pelo frontend.

  Administrador:
   * Gerenciamento de Usuários:
       * ✅ Aprovar/Reprovar Novos Usuários
       * ✅ Criar Novos Usuários
       * ✅ Listar e Visualizar Usuários
   * Gerenciamento do Inventário e Catálogo:
       * ✅ Gerenciar Itens (CRUD completo)
       * ✅ Gerenciar Áreas (CRUD completo)
       * ✅ Gerenciar Fornecedores (CRUD completo)
   * Gerenciamento de Listas e Cotações:
       * ✅ Gerenciar Listas (CRUD e associação)
       * ✅ Gerar Cotações
       * ✅ Acompanhar Cotações

  Colaborador:
   * Acompanhamento:
       * ✅ Minhas Submissões (Histórico de Pedidos)
   * Preenchimento de Listas:
       * ✅ Acessar Áreas de Trabalho
       * ✅ Preencher Lista de Estoque
       * ✅ Submeter Lista (Gerar Pedidos)

  ---

  ⚠️ Funcionalidades com Pendências

  Estas são as funcionalidades que precisam de ajustes no backend antes que o frontend possa consumi-las
  completamente.

   * Dashboard Global (Admin):
       * ⚠️ **Não está pronto.** O frontend (GlobalDashboard.tsx) está tentando acessar uma rota (/stats/dashboard)
         que não existe. A rota correta é /api/admin/dashboard-summary. Além disso, os dados que o backend envia
         (total_usuarios, usuarios_pendentes) não são os mesmos que o frontend espera (total_users,
         pending_cotacoes, etc.). É preciso padronizar isso.

   * Estatísticas Pessoais (Colaborador):
       * ⚠️ **Parcialmente pronto.** A rota /api/v1/users/stats existe, mas a métrica de "Listas Concluídas" está
         com um valor fixo (0). A lógica para calcular isso precisa ser implementada no backend.

   * Salvar Rascunho (Colaborador):
       * ❌ **Não está implementado.** O frontend (EstoqueLista.tsx) tenta fazer uma chamada para /v1/estoque/draft,
         mas essa rota não existe no backend. É preciso criá-la para que a funcionalidade de salvar rascunho
         funcione.

  ---

  Em resumo, o "coração" da aplicação (CRUDs, submissão de listas, etc.) está pronto. Os principais pontos a serem
  trabalhados são os dashboards (ajustar os dados) e a funcionalidade de salvar rascunho.
