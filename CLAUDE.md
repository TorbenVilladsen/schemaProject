# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (from `backend/`)
```bash
source .venv/bin/activate            # Activate Python 3.12 venv
pip install -e ".[dev]"              # Install all dependencies (including test deps)
uvicorn app.main:app --reload        # Run dev server on :8000
pytest                               # Run all tests
pytest tests/test_solver/            # Run solver tests only
pytest tests/test_api/test_crud.py   # Run API tests only
pytest tests/test_solver/test_model.py::test_simple_schedule  # Single test
alembic revision --autogenerate -m "description"  # Generate migration
alembic upgrade head                 # Apply migrations
```

### Frontend (from `frontend/`)
```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"  # Node 22 required
npm install                          # Install dependencies
npm run dev                          # Vite dev server on :5173
npm run build                        # Type-check + production build
npm run lint                         # ESLint
```

### Database
PostgreSQL 16 via Homebrew (`brew services start postgresql@16`). Database: `scheduler`, user: local macOS user, no password. Config in `backend/.env`.

## Architecture

This is a **teacher scheduling system** that uses constraint solving to auto-generate weekly timetables.

### Three-layer backend
- **API layer** (`backend/app/api/`) — FastAPI routers, one file per resource. All routes prefixed `/api/v1/`. Dependency injection via `deps.py` provides DB session and tenant.
- **Service layer** (`backend/app/services/`) — Business logic. `schedule_service.py` orchestrates data loading → solver invocation → result persistence.
- **Solver layer** (`backend/app/solver/`) — Pure computational module with no web/DB dependencies. Uses Google OR-Tools CP-SAT. `model.py` contains `build_model()` which constructs decision variables, adds constraints, solves, and returns a `SolverResult`.

### Solver design
Decision variables: `x[teacher_idx, subject_idx, day, period_idx]` (boolean) and `r[subject_idx, day, period_idx, room_idx]` (boolean for room assignment). Feasibility is pruned at variable creation time (unqualified teacher-subject pairs and incompatible room types never get variables). Hard constraints enforce: no teacher double-booking, exact hours per subject, no room conflicts, room-teaching linkage. The solver returns entries mapping (teacher, subject, room, day, timeslot).

### Multi-tenancy
Every table has a `tenant_id` FK. Phase 1 uses a single auto-created "default" tenant (see `deps.py:get_tenant`). This will be replaced by auth-derived tenant in Phase 3.

### Frontend
React + TypeScript + Vite. TanStack Query for server state, React Router for navigation. API client in `src/api/client.ts` wraps all backend endpoints. The `TimetableGrid` component renders the weekly schedule as a days×periods grid with color-coded subject cards.

### Test setup
`tests/conftest.py` overrides the DB dependency with a temporary SQLite database per test, so API tests run without PostgreSQL. Solver tests are pure unit tests with no DB dependency.

## Key conventions
- Pydantic schemas in `backend/app/schemas/` mirror but are separate from SQLAlchemy models in `backend/app/models/`.
- Teacher qualifications use `subject_name` (string) to match against `Subject.name`, not foreign keys — this is intentional for flexibility.
- All commits must be pushed to GitHub (`origin main`). Keep commits atomic and descriptive.
