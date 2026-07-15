# Camino a mi Boda

Operations platform for **Camino a mi Boda** — a wedding and special events transportation company in Medellín, Colombia. Reservations, logistics, calendar, finance, and customer communications, replacing spreadsheets and chat threads.

Full product spec, business rules, and roadmap: [`CLAUDE.md`](./CLAUDE.md).

## Stack

- **Backend:** Python / FastAPI, SQLAlchemy, Alembic — `backend/`
- **Frontend:** React / TypeScript / Tailwind (Vite) — `frontend/`
- **Database:** PostgreSQL
- **Dev environment:** Docker Compose

## Running locally

```bash
cp .env.example .env   # fill in SECRET_KEY, INITIAL_ADMIN_PASSWORD, Google Calendar creds, etc.
docker compose up
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8080 (mapped from container port 8000)
- Alembic migrations run automatically on backend startup.

## Dev tooling setup (git hooks)

A pre-commit hook (`husky` + `lint-staged`) type-checks and lints staged files before every commit — `tsc` + ESLint for the frontend, `ruff` for the backend. It runs on your machine, not inside Docker, so it needs a one-time setup per clone:

```bash
npm install                                    # repo root — installs husky + lint-staged
cd frontend && npm install                     # ESLint + TypeScript
pip install -r backend/requirements-dev.txt    # ruff
```

After that, `git commit` runs the checks automatically. To run them manually:

```bash
cd frontend && npm run lint && npx tsc --noEmit
python3 -m ruff check --config backend/ruff.toml backend/
```

`alembic/` and `scripts/` (one-off data/import scripts) are excluded from `ruff` — see `backend/ruff.toml`.
