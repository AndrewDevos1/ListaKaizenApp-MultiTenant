# 01 — Arquitetura do Sistema

## Stack Tecnológico

### Backend
| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| Python | 3.12 | Linguagem principal |
| Flask | 3.x | Framework web |
| SQLAlchemy | 2.x | ORM |
| Flask-Migrate | 4.x | Migrações de banco |
| Flask-JWT-Extended | 4.x | Autenticação JWT |
| Flask-CORS | 4.x | Cross-Origin Resource Sharing |
| Werkzeug | 3.x | Hash de senhas |
| PostgreSQL | 15+ | Banco produção (Railway) |
| SQLite | — | Banco desenvolvimento local (fallback) |

### Frontend
| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| React | 19 | Framework UI |
| TypeScript | 5.x | Tipagem estática |
| React Router | v7 | Roteamento SPA |
| React Bootstrap | 2.x | Componentes UI |
| Axios | 1.x | Requisições HTTP |
| Chart.js + react-chartjs-2 | — | Gráficos do dashboard |
| FontAwesome | 6.x | Ícones |
| jwt-decode | — | Decodificar JWT no frontend |

---

## Estrutura de Pastas

### Backend (`backend/`)

```
backend/
├── run.py                    # Ponto de entrada do Flask
├── create_admin_user.py      # Script para criar o primeiro admin
├── requirements.txt
├── .env                      # Variáveis de ambiente (não commitado)
├── migrations/               # Alembic migrations
│   └── versions/             # Arquivos de migração
└── kaizen_app/
    ├── __init__.py            # Application Factory (create_app)
    ├── config.py              # Configurações (dev/test/prod)
    ├── extensions.py          # Inicialização de extensões (db, jwt, cors)
    ├── models.py              # Todos os modelos SQLAlchemy
    ├── controllers.py         # Blueprints + rotas (handlers HTTP)
    ├── services.py            # Lógica de negócio
    └── repositories.py        # Acesso ao banco (thin wrappers)
```

### Frontend (`frontend/`)

```
frontend/
├── package.json
├── .env                      # REACT_APP_API_URL etc.
├── public/
└── src/
    ├── index.tsx              # Entry point React
    ├── App.tsx                # Roteamento principal
    ├── components/
    │   ├── Layout.tsx         # Wrapper com navbar hamburger
    │   ├── ProtectedRoute.tsx # Guard: exige login
    │   ├── AdminRoute.tsx     # Guard: exige role ADMIN ou SUPER_ADMIN
    │   └── CollaboratorRoute.tsx
    ├── context/
    │   ├── AuthContext.tsx    # Estado global de autenticação
    │   └── NotificationContext.tsx
    ├── services/
    │   └── api.ts             # Axios instance com interceptor JWT
    ├── hooks/                 # Custom hooks reutilizáveis
    └── features/
        ├── auth/              # Login, Register, RegisterConvite
        ├── admin/             # Todas as telas de administração
        ├── inventory/         # Telas de colaborador (estoque legado)
        ├── dashboard/         # Dashboards (collaborator + global admin)
        └── supplier/          # Telas do fornecedor
```

---

## Padrões Arquiteturais

### Backend: Layered Architecture

```
Request HTTP
    ↓
[Controller] controllers.py — Recebe requisição, valida, chama service
    ↓
[Service] services.py — Lógica de negócio, regras de domínio
    ↓
[Repository] repositories.py — Queries ao banco (thin wrapper)
    ↓
[Model] models.py — Definições SQLAlchemy, serialize
    ↓
[Database] PostgreSQL
```

### Backend: Blueprints

Existem 4 blueprints principais registrados em `/api`:

| Blueprint | Prefixo | Quem acessa |
|-----------|---------|-------------|
| `auth_bp` | `/api/auth` | Público / qualquer autenticado |
| `admin_bp` | `/api/admin` | ADMIN e SUPER_ADMIN |
| `api_bp` | `/api/v1` | Geral (colaborador + admin) |
| `collaborator_bp` | `/api/collaborator` | COLLABORATOR |

### Frontend: Feature-Based Architecture

Cada feature tem seus próprios componentes, hooks e tipos. Exemplo:

```
features/admin/
├── ListasCompras.tsx          # Tela principal
├── GerenciarItensLista.tsx    # Sub-tela
├── DetalhesSubmissao.tsx      # Sub-tela
├── MergeModal.tsx             # Modal
└── types.ts                  # Tipos TypeScript locais
```

---

## Multi-Tenant

O sistema suporta múltiplos restaurantes isolados:

- Cada `Usuario` tem `restaurante_id` (FK para `restaurantes`)
- Cada `Lista` tem `restaurante_id`
- Cada `ListaMaeItem` tem `restaurante_id`
- Cada `Fornecedor` tem `restaurante_id`
- O `SUPER_ADMIN` pode ver todos os restaurantes (`restaurante_id = None`)
- O `ADMIN` só vê dados do seu restaurante

### Como o backend filtra por restaurante

```python
def get_current_restaurante_id():
    """Retorna restaurante_id do usuário atual."""
    identity = get_jwt_identity()
    user_id = identity if isinstance(identity, int) else identity.get('id')
    usuario = db.session.get(Usuario, user_id)
    return usuario.restaurante_id  # None para SUPER_ADMIN
```

---

## Configuração de Ambiente

### Backend `.env`

```ini
FLASK_ENV=development
FLASK_CONFIG=development
FLASK_APP=run.py
FLASK_DEBUG=1

# Banco de dados
DATABASE_URL=postgresql://user:pass@host:port/db
DEV_DATABASE_URL=postgresql://user:pass@host:port/db

# Segurança
SECRET_KEY=sua_chave_secreta_aqui
JWT_SECRET_KEY=outra_chave_jwt_aqui

# CORS
CORS_ORIGINS=*
```

### Frontend `.env`

```ini
REACT_APP_API_URL=http://127.0.0.1:5000/api
# ou em produção:
# REACT_APP_API_URL=https://seu-dominio.railway.app/api
```

---

## Application Factory

```python
# backend/kaizen_app/__init__.py

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Inicializa extensões
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app)
    migrate.init_app(app, db)

    # Registra blueprints
    with app.app_context():
        from .controllers import auth_bp, admin_bp, api_bp, collaborator_bp
        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.register_blueprint(admin_bp, url_prefix='/api/admin')
        app.register_blueprint(api_bp, url_prefix='/api/v1')
        app.register_blueprint(collaborator_bp, url_prefix='/api/collaborator')

    return app
```

---

## Configurações de Banco por Ambiente

```python
# backend/kaizen_app/config.py

class DevelopmentConfig(Config):
    DEBUG = True
    database_url = os.environ.get('DEV_DATABASE_URL') or os.environ.get('DATABASE_URL')
    SQLALCHEMY_DATABASE_URI = database_url or 'sqlite:///kaizen_dev.db'

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL') or 'sqlite:///kaizen_test.db'

class ProductionConfig(Config):
    database_url = os.environ.get('DATABASE_URL')
    # Fix Railway: postgres:// → postgresql://
    if database_url and database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = database_url
```
