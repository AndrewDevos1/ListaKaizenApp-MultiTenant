# Plano de Ação: Desenvolvimento do "Kaizen Lists" Web App

## Visão Geral
Este plano de ação estrutura o desenvolvimento do projeto "Kaizen Lists" com base nos seus documentos de planejamento. O objetivo é construir um monolito modular utilizando Flask para o backend e React para o frontend, seguindo as melhores práticas de Domain-Driven Design (DDD) e uma arquitetura limpa que você já definiu.

---

### Fase 0: Configuração do Ambiente e Estrutura do Projeto

O objetivo desta fase é preparar todo o ambiente de desenvolvimento, criar a estrutura de pastas e inicializar as dependências, garantindo uma base sólida para o projeto.

- **Ação 0.1:** Criar a estrutura de diretórios `backend` e `frontend` na raiz do projeto.
- **Ação 0.2:** Dentro de `backend`, criar a estrutura do aplicativo Flask (`kaizen_app`, `tests`, `migrations`) conforme o arquivo `EstruturaDefinida.md`.
- **Ação 0.3:** Inicializar um ambiente virtual Python no diretório `backend` (ex: `python -m venv .venv`).
- **Ação 0.4:** Criar o arquivo `backend/requirements.txt` com as dependências iniciais:
  ```
  Flask
  Flask-SQLAlchemy
  Flask-Migrate
  Flask-JWT-Extended
  Flask-Cors
  python-dotenv
  psycopg2-binary  # Mesmo que comecemos com SQLite, já incluímos para o futuro
  gunicorn         # Para deploy
  ```
- **Ação 0.5:** Instalar as dependências do backend (`pip install -r requirements.txt`).
- **Ação 0.6:** Criar um arquivo `.gitignore` na raiz do projeto para ignorar `__pycache__`, `.venv`, `node_modules`, `.env`, etc.

---

### Fase 1: Backend - Núcleo, Banco de Dados e Autenticação

Foco em construir a fundação do backend: a aplicação Flask, a conexão com o banco de dados e o sistema de autenticação e autorização.

- **Ação 1.1:** Implementar o padrão *Application Factory* em `backend/kaizen_app/__init__.py`.
- **Ação 1.2:** Configurar o `backend/config.py` para carregar variáveis de ambiente. Para simplificar o início, usaremos **SQLite** temporariamente, com a string de conexão preparada para PostgreSQL.
- **Ação 1.3:** Em `backend/kaizen_app/extensions.py`, inicializar as extensões (SQLAlchemy, Migrate, JWT, CORS).
- **Ação 1.4:** Definir todos os modelos de dados em `backend/kaizen_app/models.py` usando SQLAlchemy, com base no seu `PropostaModeloER.md`.
- **Ação 1.5:** Configurar o Flask-Migrate e executar a primeira migração para criar o schema do banco de dados (`flask db init`, `flask db migrate`, `flask db upgrade`).
- **Ação 1.6:** Implementar o `AuthContext`:
    - **Serviço:** Lógica para registro de usuário, validação de senha e geração de token JWT em `services.py`.
    - **Controlador:** Endpoints para `/register`, `/login` e gerenciamento de usuários (aprovação/reprovação) em `controllers.py`.
    - **Segurança:** Adicionar decorators `@jwt_required` e verificações de `role` nos endpoints.

---

### Fase 2: Backend - API do Domínio Principal (CRUDs)

Com a base pronta, o foco é implementar as regras de negócio e os endpoints da API para as funcionalidades principais.

- **Ação 2.1:** Implementar os repositórios em `repositories.py` para cada agregado (Estoque, Pedido, Cotação), abstraindo o acesso aos dados.
- **Ação 2.2:** Implementar os serviços de domínio em `services.py`:
    - `InventoryContext`: Lógica para gerenciar itens, áreas e estoque.
    - `OrderContext`: Lógica para calcular e gerar pedidos (`CalcularPedidoService`).
    - `QuotationContext`: Lógica para registrar preços e calcular cotações.
- **Ação 2.3:** Implementar os controladores em `controllers.py`, criando os endpoints RESTful para todas as operações de CRUD sobre Itens, Áreas, Fornecedores, Estoques, Pedidos e Cotações.
- **Ação 2.4 (Opcional):** Implementar `schemas.py` (com Pydantic ou Marshmallow) para validação e serialização de dados de entrada e saída da API, garantindo robustez.

---

### Fase 3: Frontend - Estrutura, Telas e Autenticação

Iniciar o desenvolvimento da interface do usuário com React.

- **Ação 3.1:** Na pasta `frontend`, inicializar um novo projeto React (ex: `npx create-react-app . --template typescript`).
- **Ação 3.2:** Criar a estrutura de pastas (`components`, `features`, `hooks`, `services`) conforme `EstruturaDefinida.md`.
- **Ação 3.3:** Configurar o React Router para gerenciar a navegação entre as telas definidas no `FluxoTelasFrondEnd.md`.
- **Ação 3.4:** Criar um serviço de API (wrapper Axios ou Fetch) em `services/api.js` para centralizar as chamadas ao backend.
- **Ação 3.5:** Implementar as telas de `Login`, `Solicitação de Cadastro` e `Aguardando Aprovação`.
- **Ação 3.6:** Implementar um `AuthContext` no React para gerenciar o estado de autenticação (token, dados do usuário) e proteger rotas.

---

### Fase 4: Frontend - Funcionalidades (Colaborador e Admin)

Implementar as interfaces específicas para cada perfil de usuário.

- **Ação 4.1 (Colaborador):**
    - Desenvolver o Dashboard do Colaborador.
    - Implementar a tela "Listas Disponíveis".
    - Implementar a tela de "Preenchimento de Lista", conectando os inputs para salvar rascunhos e submeter a lista ao backend.
- **Ação 4.2 (Administrador):**
    - Desenvolver o Dashboard do Administrador.
    - Implementar a tela de "Gestão de Usuários" (aprovar/reprovar).
    - Implementar a tela de "Exportar Pedidos" com o seletor de fornecedor.
    - Implementar a tela de "Cotações e Relatórios".

---

### Fase 5: Testes, Documentação e Deploy

Garantir a qualidade e preparar o projeto para a produção.

- **Ação 5.1:** Escrever testes unitários e de integração para os serviços e controladores do backend usando `pytest`.
- **Ação 5.2:** Escrever testes para os componentes React usando Jest e React Testing Library.
- **Ação 5.3:** Criar/Atualizar o `README.md` principal com instruções claras de como configurar, executar e testar o projeto (backend e frontend).
- **Ação 5.4 (Opcional):** Preparar arquivos de configuração para deploy (ex: `Dockerfile`, `docker-compose.yml`).

---

Com este plano, podemos avançar de forma iterativa e organizada.
