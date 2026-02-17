# Plano de Ação: Próximos Passos - Funcionalidades do Admin

**Objetivo:** Continuar e concluir a implementação das funcionalidades avançadas do administrador, com foco na finalização do backend e na construção das interfaces no frontend.

---

### **Pré-requisito (Sua Tarefa)**

- **Ação 0.1:** Aplicar a migração do banco de dados para criar as novas tabelas. Conforme discutido, execute os seguintes comandos no seu terminal, na raiz do projeto:
  ```shell
  # 1. Ative o ambiente virtual
  backend\.venv\Scripts\activate

  # 2. Navegue até a pasta do backend
  cd backend

  # 3. Crie o arquivo de migração
  flask db migrate -m "feat: Add Lista model and relationship"

  # 4. Aplique a migração
  flask db upgrade
  ```

---

### **Parte 1: Finalização do Backend**

- **Ação 1.1: API de Gerenciamento de Listas**
    - **Tarefa:** Implementar os endpoints em `controllers.py` para gerenciar listas e atribuições.
    - **Endpoints:**
        - `POST /api/v1/listas` (para criar uma nova lista)
        - `GET /api/v1/listas` (para obter todas as listas)
        - `POST /api/v1/listas/<id>/assign` (para atribuir colaboradores)
    - **Lógica:** Implementar as funções de serviço correspondentes em `services.py`.

- **Ação 1.2: API de Resumo do Dashboard**
    - **Tarefa:** Implementar o endpoint `GET /api/admin/dashboard-summary` em `controllers.py`.
    - **Lógica:** Criar a função de serviço em `services.py` para agregar e retornar dados como total de usuários, listas ativas, etc.

---

### **Parte 2: Implementação do Frontend**

- **Ação 2.1: Funcionalidade de Criação de Usuário**
    - **Tarefa:** Implementar o modal de criação de usuário na página `UserManagement.tsx`.
    - **Lógica:** Conectar o formulário do modal ao endpoint `POST /api/admin/create_user` que já preparamos.

- **Ação 2.2: Página de Gestão de Listas**
    - **Tarefa 1:** Criar a nova página `ListManagement.tsx`.
    - **Tarefa 2:** Adicionar o link "Gestão de Listas" no menu lateral em `Layout.tsx`.
    - **Tarefa 3:** Na nova página, implementar a tabela para exibir as listas e o modal para atribuir colaboradores.
    - **Lógica:** Conectar toda a funcionalidade aos endpoints da API de listas (`/api/v1/listas`).

- **Ação 2.3: Conectar Dashboard do Admin**
    - **Tarefa:** Fazer com que os `Cards` de resumo no `AdminDashboard.tsx` consumam os dados do novo endpoint `GET /api/admin/dashboard-summary`.
