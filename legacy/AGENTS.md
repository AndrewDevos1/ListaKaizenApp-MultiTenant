# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: Flask API. App code in `backend/kaizen_app/` (controllers, models, services), migrations in `backend/migrations/`, and SQLite files `backend/kaizen_dev.db` / `backend/kaizen_test.db`.
- `backend/tests/`: pytest suite; utility tests also appear as `backend/test_*.py`.
- `frontend/`: React + TypeScript. Main code in `frontend/src/`, feature slices in `frontend/src/features/`, shared UI in `frontend/src/components/`, styles in `*.module.css`, and static assets in `frontend/public/`.
- Root helpers and docs: `run-backend.sh`, `run-frontend.sh`, `start_dev.bat`, and project notes in various `*.md` files.

## Build, Test, and Development Commands
### Backend Commands
- Setup: `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- Run dev server: `FLASK_APP=run.py flask run` (port 5000) or `python run.py`
- Run tests: `pytest` (all tests) or `pytest backend/tests/test_specific.py` (single test file)
- Run specific test: `pytest backend/tests/test_services.py::test_function_name`
- Test with coverage: `pytest --cov=kaizen_app`
- Migrations: `flask db upgrade` (apply) / `flask db migrate -m "message"` (create)

### Frontend Commands  
- Setup: `cd frontend && npm install`
- Dev server: `npm start` (port 3000, auto-opens browser)
- Build: `npm run build`
- Test: `npm test` (Jest watch mode) or `npm test -- --coverage`
- Test single file: `npm test -- src/features/auth/Login.test.tsx`
- E2E tests: `npm run test:e2e` (Playwright)

### Convenience Scripts
- `./run-backend.sh`: Start backend server
- `./run-frontend.sh`: Start frontend dev server  
- `start_dev.bat`: Windows development starter

## Code Style & Guidelines

### Python (Backend)
- **Formatting**: 4-space indents, snake_case for functions/variables
- **Imports**: Group imports: stdlib → third-party → local (with blank lines)
- **File organization**: Routes in `controllers.py`, models in `models.py`, business logic in `services.py`
- **Error handling**: Use Flask's `jsonify()` for API responses, include meaningful error messages
- **Type hints**: Optional but recommended for function signatures
- **Docstrings**: Use triple quotes for function documentation (see `get_user_id_from_jwt()` example)

### TypeScript/React (Frontend)
- **Components**: PascalCase file names (`MyComponent.tsx`), export as default
- **Imports**: React hooks first, then third-party, then local imports
- **File structure**: Feature components in `frontend/src/features/`, shared UI in `frontend/src/components/`
- **CSS**: Use CSS Modules (`ComponentName.module.css`) for scoped styles
- **TypeScript**: Strict mode enabled, prefer interfaces over types for object shapes
- **Error handling**: Use try-catch with user-friendly error messages, proper loading states

### Naming Conventions
- **Python**: snake_case for functions/variables, PascalCase for classes
- **TypeScript**: PascalCase for components/interfaces, camelCase for variables/functions
- **Database**: snake_case for table names, PascalCase for model classes
- **API endpoints**: kebab-case for URL paths (`/api/auth/login`)

### Import Organization Examples
```python
# Python backend
from flask import Blueprint, request, jsonify
from . import services
from .extensions import db
```
```typescript
// TypeScript frontend
import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
```

## Testing Guidelines
- **Backend**: Use pytest, fixtures in `conftest.py`, test files named `test_*.py`
- **Frontend**: Jest + React Testing Library, test files named `*.test.tsx`
- **Coverage**: Aim for 80%+ coverage on critical paths
- **Test structure**: Arrange-Act-Assert pattern, descriptive test names
- **Mocking**: Use pytest fixtures for backend, Jest mocks for frontend API calls

## Configuration & Security
- **Backend config**: `backend/kaizen_app/config.py`, use environment variables
- **Database**: SQLite for development, PostgreSQL for production
- **JWT**: Flask-JWT-Extended for authentication, handle token compatibility
- **CORS**: Properly configured for frontend-backend communication
- **Secrets**: Never commit `.env` files or sensitive data

## Agent-Specific Instructions
- **Language**: Sempre responda em português
- **Timezone**: Considere horário de Brasília (BRT) ao informar datas/horários  
- **Git safety**: Não fazer push/merge na branch main sem autorização explícita; usar develop por padrão
- **Testing**: Sempre executar testes relevantes após alterações
- **Code quality**: Verificar linting e type checking antes de finalizar tarefas
