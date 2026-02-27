# Fluxo de Telas (Wireflow) – Frontend Kaizen Lists

1. Tela de Splash/Loading  
   -  Exibe logo e verifica sessão ativa (token JWT).  
   -  Redireciona para Login ou Dashboard conforme sessão.  

2. Tela de Login  
   -  Campos: Email, Senha  
   -  Botões: “Entrar”, “Solicitar Cadastro”  
   -  Ações:  
     - Autentica via API; em caso de sucesso, salva token e vai para Dashboard;  
     - Em caso de erro, exibe mensagem.  

3. Tela de Solicitação de Cadastro  
   -  Campos: Nome, Email, Senha, Confirma Senha  
   -  Botões: “Enviar Solicitação”, “Voltar ao Login”  
   -  Ações:  
     - Envia dados para API de registro;  
     - Exibe confirmação “Aguardando aprovação do administrador”.  

4. Tela de Aguardando Aprovação  
   -  Mensagem informativa: “Sua conta está pendente de aprovação.”  
   -  Botão: “Sair” (retorna ao Login)  

5. Dashboard Colaborador  
   -  Cabeçalho: Nome do usuário, Botão Logout  
   -  Menu lateral/aba:  
     - Listas Disponíveis  
     - Minhas Submissões  
   -  Painel principal inicial: “Listas Disponíveis”  

6. Tela “Listas Disponíveis”  
   -  Lista de cards ou linhas contendo:  
     - Nome da Lista (ex.: Cozinha, Salão)  
     - Última atualização  
     - Botão “Preencher” (habilitado apenas se aprovada)  
   -  Ação “Preencher” → Tela de Preenchimento  

7. Tela de Preenchimento de Lista  
   -  Cabeçalho: Nome da Lista, Botão “Voltar”  
   -  Tabela: colunas “Item”, “Quantidade Mínima”, “Quantidade Atual (input)”, “Estoque Mínimo”  
   -  Campos de input inline para “Quantidade Atual”  
   -  Botões: “Salvar Rascunho”, “Submeter Lista”  
   -  Ações:  
     - “Salvar Rascunho”: persiste no backend sem alterar lista mestre;  
     - “Submeter Lista”: valida entradas e envia dados, então redireciona para “Minhas Submissões”.  

8. Tela “Minhas Submissões”  
   -  Lista de submissões com status (“Pendente”, “Processado”)  
   -  Cada item: Nome da Lista, Data de Submissão, Status, Ações (“Ver Detalhes”)  

9. Tela de Detalhes de Submissão  
   -  Exibe tabela consolidada de itens e quantidades enviadas  
   -  Botão “Voltar” para “Minhas Submissões”  

10. Dashboard Administrador  
    -  Cabeçalho: Nome do usuário, Botão Logout  
    -  Menu lateral/aba:  
      - Gestão de Usuários  
      - Listas e Submissões  
      - Exportar Pedidos  
      - Cotações e Relatórios  

11. Tela de Gestão de Usuários  
    -  Tabela de usuários: Nome, Email, Role, Status (Aprovado/Pendente)  
    -  Ações por linha: “Aprovar”, “Reprovar”, “Editar Role”, “Remover”  

12. Tela de Listas e Submissões  
    -  Visão unificada de todas as listas submetidas  
    -  Filtros por Lista, Colaborador e Data  
    -  Ação “Visualizar Consolidação” abre tela de detalhes da lista mestre  

13. Tela de Consolidação de Lista Mestre  
    -  Tabela: Item, Quantidade Atual (consolidada), Estoque Mínimo, Pedido Calculado  
    -  Botão “Voltar” para “Listas e Submissões”  

14. Tela de Exportar Pedidos  
    -  Seletor de Fornecedor (dropdown)  
    -  Botão “Gerar Texto”  
    -  Área de texto contendo linhas “Item – Quantidade” para copiar  
    -  Botão “Copiar para Clipboard”  

15. Tela de Cotações e Relatórios  
    -  Seletor de Cotação (lista de datas)  
    -  Tabela de itens com Preço Unitário e Total  
    -  Campos para inserir/editar Preço Unitário  
    -  Totais por Fornecedor e Total Geral exibidos no rodapé  
    -  Botões: “Salvar Cotação”, “Exportar Relatório (CSV/PDF)”  

***

Esta **sequência de telas** garante fluxo coerente para **colaboradores** e **administradores**, desde o acesso inicial até a geração final de pedidos e relatórios de custo.