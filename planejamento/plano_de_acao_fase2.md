# Plano de Ação - Fase 2: Refinamento do Frontend e Experiência do Usuário (UX)

**Objetivo:** Transformar o protótipo funcional em uma aplicação web com interface profissional e intuitiva, utilizando o tema Bootstrap fornecido e melhorando a usabilidade geral.

---

### Fase 1: Integração do Bootstrap e Estilização Global

O foco desta fase é aplicar uma base visual consistente e profissional em toda a aplicação.

- **Ação 1.1:** Instalar as dependências de estilização: `react-bootstrap` e `bootstrap`.
- **Ação 1.2:** Importar o CSS do Bootstrap globalmente no arquivo `frontend/src/index.tsx` para que os estilos estejam disponíveis em todos os componentes.
- **Ação 1.3:** Criar um componente de `Layout.tsx` em `frontend/src/components`. Este componente irá replicar a estrutura principal do seu `dashboard.html`, contendo uma barra de navegação superior e um menu lateral. As outras páginas serão renderizadas dentro deste layout.
- **Ação 1.4:** Refatorar a página `Login.tsx` para utilizar os componentes do `react-bootstrap` (`Form`, `Button`, `Container`), replicando a aparência do arquivo `bootstrap-login-dashboard/login.html`.

---

### Fase 2: Refatoração das Telas de Administração

O objetivo é tornar as ferramentas administrativas mais fáceis e agradáveis de usar.

- **Ação 2.1:** Atualizar o `AdminDashboard.tsx` para usar o novo `Layout` e apresentar as opções de gerenciamento de forma mais visual (ex: usando Cards do Bootstrap).
- **Ação 2.2:** Refatorar as páginas de gerenciamento de CRUD (`ItemManagement.tsx`, `AreaManagement.tsx`, `FornecedorManagement.tsx`):
    - Substituir as tabelas e formulários HTML padrão por componentes `Table`, `Button`, `Form` do `react-bootstrap`.
    - Mover os formulários de criação e edição para dentro de um componente `Modal` do `react-bootstrap`. Isso melhora a experiência, pois o usuário não perde o contexto da lista que está visualizando.
- **Ação 2.3:** Aplicar a estilização do `react-bootstrap` à tela `UserManagement.tsx`.

---

### Fase 3: Refatoração das Telas do Colaborador

O foco é melhorar a usabilidade do fluxo principal do colaborador.

- **Ação 3.1:** Atualizar o `Dashboard.tsx` do colaborador para usar o `Layout` e exibir as áreas disponíveis usando `Cards` do `react-bootstrap` para uma melhor organização visual.
- **Ação 3.2:** Refatorar a tela `EstoqueLista.tsx` para usar uma tabela `react-bootstrap` estilizada. Adicionar feedback visual (ex: `Spinner` do `react-bootstrap`) enquanto os dados são salvos.
- **Ação 3.3:** Refatorar a tela `MinhasSubmissoes.tsx` para usar uma tabela estilizada.

---

### Fase 4: Melhorias Gerais de Experiência do Usuário (UX)

O objetivo é polir a aplicação, tornando-a mais responsiva e informativa.

- **Ação 4.1:** Adicionar componentes de `Spinner` em todas as páginas que fazem chamadas à API para indicar carregamento.
- **Ação 4.2:** Substituir todos os `alert()`s por um sistema de notificação mais elegante, como `Toast` ou `Alert` do `react-bootstrap`, para exibir mensagens de sucesso e erro.
- **Ação 4.3:** Garantir que as mensagens de erro da API sejam exibidas de forma clara e amigável para o usuário final.
