# Histórico de Tarefas e Próximos Passos

## Tarefas Concluídas (Fases 5 e 6 e Atualizações Recentes)

- **[CONCLUÍDO] Redesenho do Dashboard (Fase 5):**
  - [x] O dashboard principal foi redesenhado com um layout mais moderno e informativo.
  - [x] Foram criados componentes reutilizáveis como `StatsCard` e `RecentSubmissions`.
  - [x] O layout principal e a barra lateral foram atualizados para melhorar a experiência do usuário.
  - [x] O problema de tela em branco no dashboard foi corrigido.

- **[CONCLUÍDO] Dashboard do Usuário e Melhorias de Usabilidade (Fase 6):**
  - [x] Foi criado um novo dashboard focado no usuário, exibindo estatísticas pessoais e áreas de trabalho.
  - [x] A estrutura de rotas foi refatorada para acomodar os diferentes dashboards (usuário, admin, global).
  - [x] A página de preenchimento de estoque (`EstoqueLista`) foi aprimorada com busca, resumo e melhor feedback visual.
  - [x] Um novo endpoint no backend (`/api/v1/users/stats`) foi criado para fornecer estatísticas do usuário.
  - [x] O banco de dados foi atualizado com um campo `status` na tabela `Pedido` e a migração foi aplicada com sucesso.

- **[CONCLUÍDO] Atualizações de UI e Backend (Após Fase 6):**
  - [x] Implementação do Componente `Widget.tsx` para estatísticas.
  - [x] Atualização do `AdminDashboard.tsx` para usar `Widget.tsx` e exibir estatísticas de cotações.
  - [x] Backend atualizado para fornecer estatísticas de cotações pendentes e concluídas no dashboard admin.
  - [x] Adicionado campo `status` ao modelo `Cotacao` e migrado o banco de dados.
  - [x] Instalação das bibliotecas `react-chartjs-2` e `chart.js`.
  - [x] Criação do componente `ActivityChart.tsx`.
  - [x] Adição da rota `/api/admin/activity-summary` no backend.
  - [x] Implementação da lógica da função `get_activity_summary` em `services.py` para fornecer dados reais para o gráfico de atividade do admin.
  - [x] Atualizado `Dashboard.tsx` (User Dashboard) para usar `Widget.tsx` para estatísticas específicas do usuário.
  - [x] Removido `UserStats.tsx` (funcionalidade integrada ao `Dashboard.tsx`).
  - [x] Adicionada a rota `/api/v1/areas/<int:area_id>/status` no backend.
  - [x] Implementada a lógica da função `get_area_status` em `services.py` para verificar itens pendentes em uma área.
  - [x] Atualizado `WorkAreasList.tsx` para exibir um indicador de status para cada área de trabalho.
  - [x] Criado o componente `RecentUserSubmissions.tsx` para exibir as submissões recentes do usuário.
  - [x] Integrado `RecentUserSubmissions.tsx` no `Dashboard.tsx`.

## Próximos Passos Sugeridos

- **Backend - Finalizando Estatísticas do Usuário:**
  - [ ] Implementar a lógica para `completed_lists` no serviço `get_user_stats`. Isso requer definir o que significa uma "lista concluída" no contexto da aplicação.

- **Frontend - Conectando Estatísticas do Usuário:**
  - [ ] Remover os dados de exemplo de `UserStats.tsx` e conectá-lo ao endpoint `/api/v1/users/stats`.

- **Backend - Fluxo de Status do Pedido:**
  - [ ] Criar a lógica no backend para gerenciar o `status` de um `Pedido` (como ele muda de `PENDENTE` para `APROVADO` ou `REJEITADO`). Isso provavelmente exigirá novas rotas e funcionalidades para o administrador.

- **Frontend - Exibir Status do Pedido:**
  - [ ] Atualizar o componente `MinhasSubmissoes.tsx` para exibir o status de cada pedido/submissão.
  - [ ] Adicionar a possibilidade de filtrar os pedidos por status.

- **Backend - Salvar Rascunho (Colaborador):**
  - [ ] Implementar o endpoint `/v1/estoque/draft` no backend para permitir que o colaborador salve rascunhos de suas listas.

- **Testes e Correção de Bugs:**
  - [ ] Testar de forma completa todas as novas funcionalidades implementadas.
  - [ ] Corrigir quaisquer bugs que sejam encontrados durante os testes.
