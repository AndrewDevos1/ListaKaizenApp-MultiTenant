# Plano de Ação - Fase 4: Finalização do Admin e Testes
**Data de Geração:** 18 de outubro de 2025, 03:35

**Objetivo:** Sincronizar o banco de dados, concluir a implementação das funcionalidades de gerenciamento de listas e do dashboard do admin, e iniciar a fase de testes para garantir a robustez da aplicação.

---

### **Passo 1 (Pré-requisito): Sincronizar o Banco de Dados**

**Justificativa:** Esta é a tarefa mais crítica. O modelo de dados no código Python foi atualizado para incluir as "Listas de Compras", mas o banco de dados ainda não reflete essa mudança. Sem isso, qualquer nova funcionalidade que dependa das listas falhará.

*   **Ação (Sua Execução):** Você precisará executar o seguinte comando no seu terminal, na pasta `backend`, para aplicar a migração pendente:
    ```shell
    # Dentro da pasta backend e com o ambiente virtual ativado
    flask db upgrade
    ```

---

### **Passo 2: Finalizar a API de Gestão de Listas (Backend)**

**Justificativa:** Com o banco de dados atualizado, precisamos criar os endpoints da API para que o frontend possa gerenciar as listas.

*   **Ação:** Implementar os seguintes endpoints no arquivo `backend/kaizen_app/controllers.py` e a lógica de serviço correspondente em `backend/kaizen_app/services.py`:
    *   `POST /api/v1/listas`: Para criar uma nova lista de compras.
    *   `GET /api/v1/listas`: Para listar todas as listas existentes.
    *   `POST /api/v1/listas/<id>/assign`: Para atribuir um ou mais colaboradores a uma lista específica.

---

### **Passo 3: Implementar a Interface de Gestão de Listas (Frontend)**

**Justificativa:** Com a API pronta, podemos construir a interface para que o administrador possa usar essas funcionalidades.

*   **Ação 1:** Criar o novo arquivo de página `frontend/src/features/admin/ListManagement.tsx`.
*   **Ação 2:** Adicionar o link "Gestão de Listas" no menu lateral do administrador, dentro do arquivo `frontend/src/components/Layout.tsx`.
*   **Ação 3:** Na nova página `ListManagement.tsx`, desenvolver a interface que consumirá a API:
    *   Uma tabela (`react-bootstrap`) para exibir as listas.
    *   Um botão "Criar Nova Lista" que abrirá um `Modal` com um formulário para criação.
    *   Um botão "Atribuir Colaboradores" em cada linha da tabela, que abrirá um segundo `Modal` para selecionar os usuários.

---

### **Passo 4: Concluir o Dashboard do Administrador**

**Justificativa:** Finalizar o painel principal do admin para fornecer uma visão geral e ações rápidas.

*   **Ação 1 (Backend):** Implementar o endpoint `GET /api/admin/dashboard-summary` que retorna dados agregados (ex: total de usuários, total de listas ativas).
*   **Ação 2 (Frontend):** No arquivo `AdminDashboard.tsx`, fazer com que os `Cards` de resumo consumam os dados do novo endpoint.
*   **Ação 3 (Frontend):** Na página `UserManagement.tsx`, implementar a funcionalidade do botão "Criar Novo Usuário" para que ele abra um `Modal` com o formulário, consumindo o endpoint `POST /api/admin/create_user` que já existe no backend.

---
