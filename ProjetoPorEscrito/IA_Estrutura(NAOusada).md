# Organização de Arquivos para Desenvolvimento Assistido por IA

Para maximizar produtividade e facilitar a colaboração com uma IA de código, recomenda-se adotar uma **estrutura monorepo** clara, segmentada por responsabilidades e padronizada em convenções de nomes. A seguir, um modelo de organização para o projeto Flask+ORM (backend) e React (frontend):

```
kaizen-lists/
├── backend/                           # Código do servidor Flask
│   ├── app/                           # Pacote principal da aplicação
│   │   ├── __init__.py                # Cria e configura a app Flask
│   │   ├── config.py                  # Configurações (dev, prod, test)
│   │   ├── models/                    # Classes ORM (Item, Estoque, Pedido, Cotacao, Usuario)
│   │   │   ├── __init__.py
│   │   │   ├── item.py
│   │   │   └── ...
│   │   ├── repositories/              # Implementações de repositórios (IEstoqueRepo etc.)
│   │   ├── services/                  # Serviços de domínio (CalcularPedido, Autenticacao)
│   │   ├── controllers/               # Rotas e handlers Flask (blueprints)
│   │   └── utils/                     # Módulos utilitários (JWT, validações, logging)
│   ├── migrations/                    # Scripts Alembic para migrações de esquema
│   ├── tests/                         # Testes unitários e de integração (pytest)
│   ├── Dockerfile                     # Imagem do backend
│   ├── requirements.txt               # Dependências Python
│   └── run.py                         # Entry-point (desenvolvimento e produção)
│
├── frontend/                          # Aplicação React
│   ├── public/                        # Arquivos estáticos públicos (index.html, favicon)
│   ├── src/
│   │   ├── components/                # Componentes reutilizáveis (ListForm, Dashboard)
│   │   ├── pages/                     # Páginas (Login, Estoque, Pedidos, Cotacao)
│   │   ├── services/                  # Chamadas HTTP (Axios) aos endpoints Flask
│   │   ├── store/                     # Gerenciamento de estado (Redux slices ou Context)
│   │   ├── utils/                     # Helpers (formatadores de data, validações)
│   │   ├── App.jsx                    # Componente raiz e rotas
│   │   └── index.jsx                  # Ponto de entrada
│   ├── tests/                         # Testes de componentes e snapshots (Jest, React Testing Library)
│   ├── Dockerfile                     # Imagem do frontend
│   └── package.json                   # Dependências JavaScript e scripts (start, build, test)
│
├── infra/                             # Infraestrutura e CI/CD
│   ├── docker-compose.yml             # Orquestração local (backend, frontend, banco)
│   ├── .github/workflows/             # Pipelines (lint, test, build, deploy)
│   └── terraform/                     # (Opcional) infraestrutura cloud como código
│
├── docs/                              # Documentação e diagramas
│   ├── ERD.drawio                     # Modelo ER  
│   ├── DFD.drawio                     # Diagrama de fluxo de dados  
│   └── architecture.md                # Visão geral da arquitetura  
│
├── .env.example                       # Variáveis de ambiente template
├── .gitignore                         # Arquivos e pastas ignorados
└── README.md                          # Instruções de setup, uso e contribuição
```

**Por que essa estrutura?**  
- **Clareza de responsabilidades**: separa backend, frontend, infra e documentação.  
- **Facilidade de navegação**: convenções previsíveis permitem à IA gerar, localizar e editar código rapidamente.  
- **Escalabilidade**: cada módulo possui sua própria pasta de testes, migrações e configurações, simplificando a manutenção.  
- **Automação**: arquivos `Dockerfile` e `docker-compose.yml` suportam ambientes consistentes para CI/CD e desenvolvimento local.  
- **Colaboração com IA**: pacotes bem definidos e scripts padronizados (por exemplo, `run.py`, `npm run test`) ajudam a IA a entender contexto, gerar trechos de código alinhados aos padrões do projeto e executar tarefas automatizadas (testes, lint, builds).

Com esse layout, tanto desenvolvedores humanos quanto sistemas de geração de código auxiliados por IA poderão operar de forma consistente, ágil e escalável.
