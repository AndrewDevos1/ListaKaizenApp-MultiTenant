# Estrutura de Arquivos para Monolito Modular (MVP Preparado para Escalonamento)

```
kaizen-lists/
├── backend/                            
│   ├── kaizen_app/                     # Módulo principal da aplicação Flask
│   │   ├── __init__.py                 # Cria app, carrega blueprints e configurações
│   │   ├── config.py                   # Configurações (development, production, testing)
│   │   ├── models.py                   # Definições ORM (SQLAlchemy): Item, Estoque, Pedido, Cotacao, Usuario
│   │   ├── repositories.py             # Classes de acesso a dados (repos padrão para cada modelo)
│   │   ├── services.py                 # Lógica de negócio (calcular pedidos, gerar cotação, autenticação)
│   │   ├── controllers.py              # Rotas Flask agrupadas por área funcional
│   │   ├── schemas.py                  # Serialização/validação (Marshmallow ou Pydantic)
│   │   ├── utils.py                    # Funções utilitárias (JWT, validações genéricas, formatação)
│   │   └── extensions.py               # Inicialização de extensões (DB, Migrate, JWT, CORS)
│   ├── migrations/                      # Scripts Alembic para versionamento do esquema
│   ├── tests/                          # Testes unitários e de integração (pytest)
│   │   ├── conftest.py                 # Fixtures compartilhadas
│   │   ├── test_models.py
│   │   └── test_services.py
│   ├── run.py                          # Ponto de entrada para desenvolvimento e production
│   └── requirements.txt                # Dependências Python
│
├── frontend/                          
│   ├── public/                        
│   │   └── index.html                 
│   ├── src/
│   │   ├── components/                 # Componentes React genéricos (Button, Input, Table)
│   │   ├── features/                   # Funcionalidades MVC-like
│   │   │   ├── auth/                   # Login, registro, contexto de usuário
│   │   │   ├── inventory/              # Listagem e edição de estoque
│   │   │   ├── orders/                 # Visualização e exportação de pedidos
│   │   │   └── quotations/             # Cadastro e relatórios de cotações
│   │   ├── hooks/                      # Hooks customizados (useAuth, useApi)
│   │   ├── services/                   # Chamadas à API (fetch/Axios wrappers)
│   │   ├── App.jsx                     # Componente raiz e rotas (React Router)
│   │   └── index.jsx                   # Ponto de entrada React
│   ├── tests/                          # Testes de componentes e integração (Jest, RTL)
│   └── package.json                    # Dependências e scripts npm
│
├── docs/                             
│   ├── architecture.md                # Documentação da arquitetura monolito modular
│   └── api_spec.md                    # Especificação de endpoints RESTful
│
├── .env.example                       # Variáveis de ambiente para configuração local
├── .gitignore                         # Ignorar venv, __pycache__, node_modules etc.
└── README.md                          # Instruções de setup, execução e contribuição
```

**Principais Características**  
- Monolito modular: **backend/kaizen_app** contém todos os módulos organizados por responsabilidade, mas roda como única aplicação Flask.  
- Preparado para escalonamento futuro: camadas bem definidas (models, services, controllers, schemas) permitem extração de componentes em microsserviços quando necessário.  
- MVP simples: sem contêineres, uso direto de `run.py` e `npm start` para iniciar localmente.  
- Testes integrados: cobertura desde modelo, serviços até interface, garantindo confiança em entregas iniciais.  
- Configuração centralizada: `config.py` com suporte a múltiplos ambientes.  
- Frontend organizado por *features*, facilitando manutenção e expansão de funcionalidades.