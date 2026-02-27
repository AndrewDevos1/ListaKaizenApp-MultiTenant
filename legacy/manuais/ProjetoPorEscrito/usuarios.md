Para suportar **dois papéis de usuário** (“Administrador” e “Colaborador”), ajuste os artefatos de domínio e requisitos da seguinte forma:

1. Autorização & Perfis  
   - **Administrador**  
     -  Permissões: CRUD completo em Itens, Áreas, Fornecedores, Estoques, Pedidos e Cotações; gerenciamento de usuários.  
   - **Colaborador**  
     -  Permissões: inserir e atualizar consumo em Estoque; visualizar e exportar pedidos e cotações; sem acesso a CRUD de configurações ou usuários.

2. Dicionário de Dados (na entidade **Usuario**)  
   - Atributo adicional:  
     -  `Role` (String, valores possíveis “ADMIN”, “COLLABORATOR”)  

3. Requisito Funcional Adicional  
   - **RF11 – Gestão de Usuários**  
     -  Apenas Administradores podem criar, editar, inativar ou remover contas de usuário e atribuir papéis.

4. Ajuste no DTE de “Pedido”  
   - A transição **Criado → Enviado** só pode ser acionada por um Colaborador autenticado.  
   - A transição **Cotado → Aprovado/Rejeitado** só pode ser executada por um Administrador.

5. Segurança & UI  
   - Tela de login direciona ao dashboard com menus e botões habilitados conforme o `Role`.  
   - Verificações de autorização no backend (middleware) checam `Role` antes de cada endpoint sensível.

Dessa forma, garante-se separação clara de responsabilidades, controlando quem pode alterar configurações centrais versus quem opera o fluxo diário de consumo e pedidos.