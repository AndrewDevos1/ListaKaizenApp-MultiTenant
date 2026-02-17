# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: Flask API. App code in `backend/kaizen_app/` (controllers, models, services), migrations in `backend/migrations/`, and SQLite files `backend/kaizen_dev.db` / `backend/kaizen_test.db`.
- `backend/tests/`: pytest suite; utility tests also appear as `backend/test_*.py`.
- `frontend/`: React + TypeScript. Main code in `frontend/src/`, feature slices in `frontend/src/features/`, shared UI in `frontend/src/components/`, styles in `*.module.css`, and static assets in `frontend/public/`.
- Root helpers and docs: `run-backend.sh`, `run-frontend.sh`, `start_dev.bat`, and project notes in various `*.md` files.

## Build, Test, and Development Commands
- Backend setup/run: `cd backend`, `python -m venv .venv`, `source .venv/bin/activate`, `pip install -r requirements.txt`, then `FLASK_APP=run.py flask run` (or `python run.py`).
- Backend migrations: `flask db upgrade`.
- Frontend dev server: `cd frontend`, `npm install`, `npm start`.
- Frontend build: `npm run build`.
- Convenience scripts: `./run-backend.sh`, `./run-frontend.sh`, or `start_dev.bat`.

## Coding Style & Naming Conventions
- Python: 4-space indents, snake_case for functions/modules; keep API routes in `backend/kaizen_app/controllers.py` and models in `backend/kaizen_app/models.py`.
- TypeScript/React: components in PascalCase (`MyComponent.tsx`), routes/feature views under `frontend/src/features/`, shared UI in `frontend/src/components/`.
- CSS: use CSS Modules naming (`ComponentName.module.css`) for scoped styles; global styles in `frontend/src/App.css` and `frontend/src/index.css`.
- Linting: ESLint rules from `react-scripts` in `frontend/package.json`; no repo-wide formatter for Python.

## Testing Guidelines
- Backend: `pytest` (or `pytest backend/tests/`), tests named `test_*.py`.
- Frontend: `npm test` (Jest + React Testing Library); tests live in `frontend/src/**/*.test.tsx`.
- Add tests for new API endpoints and UI behavior when changing features.

## Commit & Pull Request Guidelines
- Commit messages follow conventional prefixes seen in history: `feat:`, `fix:`, `chore:`; keep a short description (history uses Portuguese, which is acceptable).
- PRs should include a short summary, test evidence (commands run and results), linked issues if any, and screenshots/GIFs for UI changes. Mention database or migration steps when applicable.

## Configuration & Security Notes
- Backend config is in `backend/kaizen_app/config.py`. Use `FLASK_CONFIG` to switch envs, and set `SECRET_KEY`, `DEV_DATABASE_URL`, `TEST_DATABASE_URL`, or `DATABASE_URL` as needed.
- Development uses SQLite by default; avoid committing local data changes unless required.

## Agent-Specific Instructions
- Sempre responda em portugues e considere o horario de Brasilia (BRT) ao informar datas ou horarios.
- Nao fazer push/merge na branch main sem autorizacao explicita do usuario; usar develop por padrao.
