# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kaizen Lists is a web application for automating inventory management, order generation, and quotation control. The application uses a monolithic modular architecture with Flask on the backend and React with TypeScript on the frontend.

## Technology Stack

**Backend:**
- Flask with SQLAlchemy ORM
- Flask-Migrate for database migrations
- Flask-JWT-Extended for authentication
- SQLite for development, PostgreSQL ready for production
- pytest for testing

**Frontend:**
- React 19 with TypeScript
- React Router v7 for routing
- React Bootstrap for UI components
- Axios for API communication
- Chart.js for data visualization

## Development Commands

### Backend

Navigate to `backend/` directory for all backend operations.

**Environment Setup:**
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux/macOS
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Database Operations:**
```bash
# Run migrations (from backend/ directory)
flask db upgrade

# Create new migration after model changes
flask db migrate -m "description of changes"

# Downgrade migration
flask db downgrade
```

**Running the Backend:**
```bash
# From backend/ directory
flask run --host=0.0.0.0
# Server runs on http://0.0.0.0:5000 and is accessible on your local network.
# IMPORTANT: For local network development, see the guide in README.md 
# to configure the frontend's .env.local file.
```

**Testing:**
```bash
# From project root directory
pytest backend/tests/

# Run specific test file
pytest backend/tests/test_auth.py

# Run with verbose output
pytest backend/tests/ -v
```

**Create Admin User:**
```bash
# From project root (with venv activated)
.venv/Scripts/python.exe backend/create_admin_user.py  # Windows
python backend/create_admin_user.py  # Linux/macOS
```

### Frontend

Navigate to `frontend/` directory for all frontend operations.

**Setup and Running:**
```bash
# Install dependencies
npm install

# Start development server
npm start
# App runs on http://localhost:3000

# Build for production
npm build

# Run tests
npm test
```

## Architecture

### Backend Architecture (Monolithic Modular)

The backend follows a layered architecture pattern:

```
backend/kaizen_app/
├── __init__.py          # Application factory (create_app)
├── config.py            # Environment configurations (dev, test, prod)
├── extensions.py        # Flask extension initialization (db, jwt, cors, migrate)
├── models.py            # SQLAlchemy models with SerializerMixin
├── controllers.py       # Flask Blueprints and route handlers
├── services.py          # Business logic layer
└── repositories.py      # Database access layer (thin wrapper)
```

**Key Architectural Patterns:**

1. **Application Factory Pattern**: `create_app()` in `__init__.py` creates the Flask app with configuration
2. **Blueprint Organization**: Three main blueprints
   - `auth_bp` - Authentication endpoints (`/api/auth/*`)
   - `admin_bp` - Admin-only endpoints (`/api/admin/*`)
   - `api_bp` - Main API endpoints (`/api/v1/*`)
3. **Layered Architecture**:
   - Controllers handle HTTP requests/responses
   - Services contain business logic
   - Repositories handle database queries
   - Models define data structures

**Authentication & Authorization:**
- JWT tokens stored in localStorage on frontend
- `@jwt_required()` decorator for protected routes
- `@admin_required()` custom decorator for admin-only routes (in controllers.py:12)
- User roles: ADMIN and COLLABORATOR (enum in models.py:24)
- Users require admin approval after registration (aprovado field)

**Database Models:**
- Usuario (User with role-based access)
- Item (inventory items with foreign key to Fornecedor)
- Area (work areas)
- Fornecedor (suppliers)
- Estoque (stock levels per area/item with min/current quantities)
- Pedido (orders with status: PENDENTE, APROVADO, REJEITADO)
- Cotacao (quotations with status: PENDENTE, CONCLUIDA)
- CotacaoItem (items within quotations)
- Lista (shopping lists with many-to-many relationship to users)

### Frontend Architecture

```
frontend/src/
├── App.tsx              # Main routing configuration
├── components/          # Reusable components (Layout, ProtectedRoute, AdminRoute)
├── features/            # Feature-based modules
│   ├── auth/           # Login, Register
│   ├── dashboard/      # User and Global dashboards
│   ├── inventory/      # Stock management, submissions
│   └── admin/          # Admin features (users, items, areas, suppliers, quotations)
├── services/           # API client (axios instance with JWT interceptor)
├── context/            # React context for global state
├── hooks/              # Custom React hooks
└── pages/              # Page components (HomePage)
```

**Routing Structure:**
- Public: `/`, `/login`, `/register`
- Collaborator (Protected): `/dashboard`, `/dashboard/submissions`, `/dashboard/area/:areaId/estoque`
- Admin: `/dashboardadm`, `/admin/users`, `/admin/listas`, `/admin/items`, `/admin/areas`, `/admin/fornecedores`, `/admin/gerar-cotacao`, `/admin/cotacoes`, `/admin/global`

**Key Components:**
- `Layout.tsx` - Main layout wrapper with navigation (hamburger menu)
- `ProtectedRoute.tsx` - Route guard for authenticated users
- `AdminRoute.tsx` - Route guard for admin users only
- API calls use axios interceptor (services/api.ts:11) to automatically attach JWT tokens

### Data Flow

1. **Stock Management Flow:**
   - Collaborators view their assigned areas
   - Update current stock quantities
   - System detects items below minimum threshold
   - Collaborators submit orders (creates Pedido records)

2. **Quotation Flow:**
   - Admin generates quotations from stock needs by supplier
   - System aggregates items below minimum per supplier
   - Admin fills in unit prices for quotation items
   - Quotations track status (PENDENTE/CONCLUIDA)

3. **List Assignment Flow:**
   - Admin creates Lista (shopping lists)
   - Admin assigns collaborators to lists
   - Many-to-many relationship via lista_colaborador table

## Important Notes

**Branch Policy:**
- Nao fazer push/merge na branch main sem autorizacao explicita do usuario; usar develop por padrao.

**Configuration:**
- Backend uses environment-based config in config.py (development/testing/production)
- Set `FLASK_CONFIG` environment variable to change config (defaults to 'development')
- JWT secret key should be set via `SECRET_KEY` environment variable in production

**CORS:**
- Configured to allow all origins for `/api/*` endpoints (extensions.py:16)
- Update CORS settings before production deployment

**Database:**
- Development uses SQLite: `backend/kaizen_dev.db`
- Testing uses separate SQLite: `backend/kaizen_test.db`
- Production expects PostgreSQL via `DATABASE_URL` environment variable

**Frontend API Integration:**
- Backend runs on `http://127.0.0.1:5000`
- Frontend proxy/API base URL configured in services/api.ts:4
- JWT token stored in localStorage with key 'accessToken'

**Testing:**
- Backend tests use pytest with fixtures in conftest.py
- Test database is automatically created and cleaned up
- Frontend tests use React Testing Library with Jest

**User Roles:**
- First admin must be created via create_admin_user.py script
- New users register as COLLABORATOR by default
- Require admin approval (aprovado=False initially)
- Role field is an enum (models.py:24-26)

**Database Design Best Practices:**
- **Many-to-Many Relationships:** SEMPRE usar tabelas auxiliares (junção) em vez de adicionar campos denormalizados
  - Exemplo: `fornecedor_lista` table para relacionamento entre Fornecedor e Lista
  - Vantagens: Escalável, normalizável, flexível para adicionar metadata futura, segue padrão SQL
  - Nunca adicionar campos tipo `listas_ids` em tabelas existentes
- Tabelas auxiliares devem ter apenas: `id`, chaves estrangeiras, e opcionalmente `criado_em`

## Common Workflows

**Adding a New Model:**
1. Define model in `backend/kaizen_app/models.py` with SerializerMixin
2. Create migration: `flask db migrate -m "add model_name"`
3. Review generated migration in `backend/migrations/versions/`
4. Apply migration: `flask db upgrade`
5. Add repository functions if needed in repositories.py
6. Add service functions in services.py
7. Add controller routes in controllers.py

**Adding a New API Endpoint:**
1. Add business logic in services.py
2. Add route handler in controllers.py (choose appropriate blueprint)
3. Use decorators: `@jwt_required()` or `@admin_required()`
4. Create corresponding frontend API call in features/

**Authentication Flow:**
1. User registers via `/api/auth/register` (awaits admin approval)
2. Admin approves via `/api/admin/users/{id}/approve`
3. User logs in via `/api/auth/login` (receives JWT token)
4. Frontend stores token in localStorage
5. Axios interceptor adds token to all subsequent requests
