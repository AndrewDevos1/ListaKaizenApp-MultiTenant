A partir do wireflow de telas apresentado, o fluxo de dados se desenrola em etapas sequenciais que envolvem captura, validação, persistência e apresentação, conforme o perfil do usuário. A seguir, descreve-se o percurso dos dados em cada fase:

1. Autenticação e Autorização  
   - O usuário insere **email** e **senha** na tela de login.  
   - Esses valores são enviados ao endpoint `/api/v1/auth/login`.  
   - O backend consulta a tabela **usuarios**, valida as credenciais e, se válidas, gera um **token JWT**.  
   - O token e o perfil (`role`) retornam ao frontend, que armazena o token em memória segura ou `localStorage` e ajusta a interface (menus e permissões).

2. Solicitação de Cadastro  
   - O colaborador preenche nome, email e senha na tela de solicitação de cadastro.  
   - O formulário envia os dados a `/api/v1/auth/register`, que grava um novo registro com status “PENDENTE” em **usuarios**.  
   - Essa criação dispara um evento interno de notificação para administradores avaliadores.  

3. Aprovação de Usuário  
   - Na tela de gestão de usuários, o administrador consulta **usuarios** filtrando por status.  
   - Ao clicar “Aprovar” ou “Reprovar”, o frontend chama `/api/v1/users/{id}/approve` ou `/deny`, atualizando o campo `status` daquele registro.  
   - O backend persiste essa alteração e, em caso de aprovação, libera acesso do colaborador para consumo de listas.

4. Consulta de Listas Disponíveis  
   - O colaborador autenticado faz requisição GET a `/api/v1/areas` para recuperar todas as áreas autorizadas (Cozinha, Salão).  
   - O serviço de negócios filtra com base em ACLs (roles e permissões) e retorna as listas com seus metadados (nome, última atualização).  

5. Preenchimento e Salvamento de Rascunho  
   - Ao selecionar “Preencher”, o frontend obtém a estrutura de itens e níveis mínimos via GET `/api/v1/areas/{areaId}/items`.  
   - O colaborador insere quantidades atuais nos inputs, e o componente dispara PATCH ou POST a `/api/v1/consumptions/{areaId}` com o payload `{ itemId, quantidadeAtual }`.  
   - O backend atualiza a tabela **estoque** (campo `quantidade_atual`) ou registra em tabela de rascunhos, permitindo retomada futura.

6. Submissão de Lista  
   - Ao clicar “Submeter Lista”, o frontend envia POST a `/api/v1/areas/{areaId}/submit`, marcando o fim da edição.  
   - O backend consolida todos os rascunhos daquele colaborador na **tabela estoque**, recalcula `pedido` para cada item (`max(quant_min–quant_atual,0)`), e grava esses pedidos na tabela **pedido**, associando-os ao respectivo usuário e data.

7. Visualização de Submissões  
   - O colaborador consulta GET `/api/v1/submissions/me` para listar suas submissões.  
   - O backend lê **pedido** filtrando por `usuario_id`, retorna status e timestamp.

8. Consolidação pelo Administrador  
   - O administrador, no dashboard, faz GET `/api/v1/submissions` para obter todas as submissões.  
   - Ao selecionar uma submissão ou área, o frontend solicita GET `/api/v1/areas/{areaId}/consolidation`, e o backend agrega pedidos de todos os colaboradores, retornando uma visão mestra (item, soma de quantidades atuais, estoque mínimo, pedido final).

9. Exportação de Pedidos  
   - Na tela de exportar pedidos, o administrador escolhe um fornecedor e clica “Gerar Texto”.  
   - O frontend invoca GET `/api/v1/orders?fornecedorId={id}`, que faz uma consulta a **pedido** filtrando por `fornecedor_id` e `pedido>0`.  
   - O serviço formata cada registro em linhas “Item – Quantidade” e devolve um texto plano JSON.  
   - O frontend preenche a textarea para que o administrador copie e cole.

10. Gestão de Cotações  
    - O administrador acessa GET `/api/v1/quotations` para listar cotações existentes.  
    - Para criar ou editar, envia POST/PATCH a `/api/v1/quotations/{cotacaoId}`, com payload contendo `fornecedor_id`, `itemId`, `preco_unitario`.  
    - O backend persiste em **cotacao** e **cotacao_item**, calcula `total_item` (quantidade × preço) e atualiza campos de total por bloco e geral; esses valores são retornados via GET para exibição.

Em cada requisição, o **token JWT** é enviado no cabeçalho `Authorization: Bearer <token>`. O backend valida esse token, verifica o `role` associado e permite ou nega o acesso ao recurso solicitado, garantindo segurança e controle de fluxo de dados conforme o papel do usuário.