# Plano de Ação - Fase 3: Funcionalidades Avançadas do Administrador

**Objetivo:** Evoluir o dashboard do admin para ser um verdadeiro centro de controle, permitindo o gerenciamento completo de usuários e das novas "Listas de Compras", com uma interface inspirada no `dashboard.html`.

---

### **Parte 1: Backend - Preparando a API**

O foco é construir os endpoints necessários para dar suporte às novas funcionalidades do frontend.

- **Ação 1.1: Melhorar o Gerenciamento de Usuários**
    - **Tarefa:** Criar um novo endpoint `POST /admin/create_user`.
    - **Detalhes:** Este endpoint, acessível apenas por admins, receberá `nome`, `email`, `senha` e `role` (`admin` ou `colaborador`). O usuário já será criado como "aprovado".

- **Ação 1.2: Implementar a Lógica de Listas de Compras**
    - **Tarefa 1:** Criar um novo modelo `Lista` no `models.py` com os campos `id`, `nome`, `data_criacao`.
    - **Tarefa 2:** Criar uma tabela de associação `lista_colaborador` para registrar a relação muitos-para-muitos entre `Lista` e `User` (colaboradores).
    - **Tarefa 3:** Desenvolver os endpoints da API para gerenciar as listas e suas atribuições:
        - `POST /listas`: Criar uma nova lista.
        - `GET /listas`: Listar todas as listas.
        - `GET /listas/<id>`: Obter detalhes de uma lista e os colaboradores atribuídos.
        - `POST /listas/<id>/assign`: Atribuir um ou mais colaboradores a uma lista.
        - `DELETE /listas/<id>/unassign`: Desatribuir um colaborador.

- **Ação 1.3: Criar Endpoints de Resumo para o Dashboard**
    - **Tarefa:** Criar um endpoint `GET /admin/dashboard-summary`.
    - **Detalhes:** Este endpoint retornará dados agregados para os `Cards` do dashboard, como: `total_usuarios`, `usuarios_pendentes`, `total_listas`, etc.

---

### **Parte 2: Frontend - Construindo a Interface**

Com a API pronta, o foco é implementar a interface do usuário para essas novas funcionalidades.

- **Ação 2.1: Evoluir o Dashboard do Admin (`AdminDashboard.tsx`)**
    - **Tarefa 1:** Inspirado no `dashboard.html`, adicionar `Cards` de resumo no topo da página para exibir os dados do novo endpoint `dashboard-summary`.
    - **Tarefa 2:** Adicionar botões de "Ação Rápida", como "Criar Usuário" e "Criar Lista", que abrirão modais de criação.

- **Ação 2.2: Melhorar a Gestão de Usuários (`UserManagement.tsx`)**
    - **Tarefa:** Adicionar um botão "Criar Novo Usuário" na tela de gestão.
    - **Detalhes:** Este botão abrirá um `Modal` com um formulário para `nome`, `email`, `senha` e um seletor de `role` (Admin/Colaborador), que consumirá o endpoint `POST /admin/create_user`.

- **Ação 2.3: Criar a Gestão de Listas (`ListManagement.tsx`)**
    - **Tarefa 1:** Criar uma nova página, acessível pelo menu lateral, para listar todas as listas de compras em uma `Table`.
    - **Tarefa 2:** Na tabela, cada lista terá um botão "Atribuir Colaboradores".
    - **Tarefa 3:** Este botão abrirá um `Modal` que listará todos os colaboradores com checkboxes, permitindo ao admin atribuir ou desatribuir múltiplos usuários a uma lista de forma intuitiva.

- **Ação 2.4: Atualizar a Navegação**
    - **Tarefa:** Adicionar o link "Gestão de Listas" no menu lateral do `Layout.tsx`.
