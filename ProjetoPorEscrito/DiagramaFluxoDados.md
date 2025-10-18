# Relatório de Fluxo de Dados Atualizado

Este diagrama descreve o fluxo de dados entre usuários (Colaboradores e Administradores) e os componentes do sistema para gerenciar inscrição, aprovação, preenchimento de listas e exportação de pedidos.

```mermaid
flowchart TD
  subgraph Usuários
    C[Colaborador]
    A[Administrador]
  end

  subgraph Sistema Web Kaizen
    Auth[Autenticação e Autorização]
    Reg[Registro de Usuário]
    App[Gestão de Acesso]
    ListMgr[Gerenciamento de Listas]
    Preench[Preenchimento de Lista]
    Subm[Submissão de Dados]
    AdminView[Visualização “Dashboard” Administrador]
    Orders[Exportação de Pedidos]
    DB[(Banco de Dados)]
  end

  C -->|1: Inscrição| Reg
  Reg -->|2: Dados de cadastro| DB
  A -->|3: Aprovar/Negar inscrição| App
  App -->|4: Status de acesso| DB
  C -->|5: Login e obtenção de token| Auth
  Auth -->|6: Verificar autorização| DB
  Auth -->|7: Tokens válidos| C

  C -->|8: Solicitar listas disponíveis| ListMgr
  ListMgr -->|9: Consultar disponibilidade| DB
  DB -->|10: Retornar listas liberadas| ListMgr
  ListMgr -->|11: Exibir listas para preenchimento| C

  C -->|12: Preencher quantidades| Preench
  Preench -->|13: Validar e salvar rascunho| DB

  C -->|14: Submeter lista completa| Subm
  Subm -->|15: Atualizar “Lista Mestre”| DB

  A -->|16: Login| Auth
  Auth -->|17: Validar credenciais| DB
  A -->|18: Acessar dashboard administrativo| AdminView
  AdminView -->|19: Ler dados consolidados| DB
  AdminView -->|20: Visualizar listas submetidas| AdminView

  A -->|21: Solicitar exportação de pedidos| Orders
  Orders -->|22: Filtrar pedidos por fornecedor| DB
  DB -->|23: Dados de pedidos| Orders
  Orders -->|24: Gerar texto organizado (item, quantidade, fornecedor)| A

  style DB fill:#f9f,stroke:#333,stroke-width:2px
  style Auth fill:#bbf,stroke:#333
  style Reg fill:#bbf,stroke:#333
  style App fill:#bbf,stroke:#333
  style ListMgr fill:#bfb,stroke:#333
  style Preench fill:#bfb,stroke:#333
  style Subm fill:#bfb,stroke:#333
  style AdminView fill:#bfb,stroke:#333
  style Orders fill:#bfb,stroke:#333
```

**Descrição dos Passos Principais**  
1. Colaborador submete **inscrição**; dados são gravados no banco.  
2. Administrador **aprova ou nega** via módulo de Gestão de Acesso; resultado atualizado no banco.  
3. Colaborador **loga** e recebe token JWT após validação de credenciais.  
4. Ao solicitar listas, o sistema consulta “listas liberadas” no banco e exibe apenas aquelas às quais o colaborador tem acesso.  
5. Durante o **preenchimento**, valores são salvos como rascunho e, após conclusão, **submetidos**, atualizando o registro mestre de quantidades.  
6. Administrador acessa um **dashboard** para visualizar todas as submissões consolidadas.  
7. Ao requisitar exportação, o sistema filtra pedidos positivos por fornecedor e gera um **texto simples e organizado** contendo os itens e quantidades, pronto para copiar e colar.  

Este fluxo garante controle de acesso, separação clara de responsabilidades e um processo fluido de preenchimento e exportação de pedidos sem integração direta a sistemas externos.