# Studio Barking Dog — Growth Engine (Pass 1 Foundation)

The **Barking Dog Growth Engine** is an internal AI-powered lead-generation intelligence platform designed specifically for **Studio Barking Dog** team members.

Pass 1 establishes the rock-solid application foundation:
- Relational data model for companies, users, activities, agent runs, and evidence
- Full CRUD lifecycle management for companies (create, update, soft-archive, restore)
- Robust search, multi-attribute filtering, and server-side pagination
- Security-first authentication with PBKDF2 password hashing and token-based sessions
- Information-dense, executive B2B SaaS dashboard and company detail views
- Complete audit activity timeline tracking

---

## Canonical Architecture

The application uses a clean, single canonical architecture:

```
Browser
  ↓
React Frontend (Port 3000, Vite)
  ↓ [NEXT_PUBLIC_API_URL=http://localhost:8000]
FastAPI Backend (Port 8000, Python 3.11+)
  ↓
PostgreSQL 16 (pgvector) + Redis 7
```

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0 ORM, Alembic migrations, Pydantic v2 schemas.
- **Database & Cache**: PostgreSQL 16 (`pgvector/pgvector:pg16`), Redis 7 Alpine.

---

## Prerequisites

- **Docker & Docker Compose**: For containerized PostgreSQL 16 (with pgvector) and Redis 7
- **Python**: 3.11 or 3.12
- **Node.js**: 20.x or 22.x+
- **npm**: 9.x or 10.x+

---

## Development Setup & Workflow

Follow these exact steps to set up and run the application locally:

### 1. Start Infrastructure Services (PostgreSQL + Redis)

Launch the containerized PostgreSQL 16 and Redis 7 services:

```bash
docker compose up -d
```

Verify that both containers are running and healthy:

```bash
docker compose ps
```

### 2. Configure Environment Variables

Copy the example environment file to `.env`:

```bash
cp .env.example .env
```

Configure your environment settings in `.env`:
- `DATABASE_URL`: PostgreSQL connection string (defaults to `postgresql://postgres:postgres@localhost:5432/barking_dog_growth`)
- `REDIS_URL`: Redis connection string (defaults to `redis://localhost:6379/0`)
- `NEXT_PUBLIC_API_URL`: Backend API URL (defaults to `http://localhost:8000`)
- `ADMIN_EMAIL`: Email for initial administrator team member
- `ADMIN_PASSWORD`: Secure password for initial administrator team member (never commit plain-text credentials)

### 3. Create Python Virtual Environment & Install Dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### 4. Run Alembic Database Migrations

Apply database schema migrations to PostgreSQL:

```bash
alembic -c backend/migrations/alembic.ini upgrade head
```

This provisions all core tables:
- `users`: Team member authentication accounts and PBKDF2 password hashes
- `companies`: Company profiles, firmographics, pipeline status, and opportunity levels
- `activities`: Audit timeline tracking creation, modification, and archive events
- `agent_runs`: Reserved for future intelligence and crawling agents
- `evidence`: Reserved for future research signals and extracted citations

### 5. Seed Initial Administrator and Demo Data

Execute the seed script to create the administrator account (configured via `ADMIN_EMAIL` and `ADMIN_PASSWORD`) and demo company records:

```bash
python backend/seed.py
```

*Note: Database seeding is performed via this development script only and is never exposed as a public API endpoint.*

### 6. Start the FastAPI Backend

Run the FastAPI backend on port 8000:

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

- API Base URL: `http://localhost:8000`
- Interactive OpenAPI Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

### 7. Start the Frontend Application

In a separate terminal, install npm dependencies and start the Vite frontend on port 3000:

```bash
npm install
npm run dev
```

Open your browser at:
**[http://localhost:3000](http://localhost:3000)**

Log in using the administrator email and password configured in your `.env` file.

---

## Testing

Run the automated backend test suite (utilizing pytest and FastAPI TestClient):

```bash
PYTHONPATH=. pytest backend/tests/ -v
```

---

## API Specification

All API endpoints return JSON. Error responses follow a uniform structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation of error."
  }
}
```

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | System health check (verifies PostgreSQL and Redis connectivity) |
| `POST` | `/api/auth/login` | Authenticate team member and obtain session token |
| `GET` | `/api/auth/me` | Retrieve authenticated team member profile |
| `GET` | `/api/dashboard/stats` | Real-time aggregate count metrics |
| `GET` | `/api/dashboard/recent` | Most recently created company records |
| `GET` | `/api/companies` | List companies with search, filtering, and pagination |
| `POST` | `/api/companies` | Create new company record and log initial activity |
| `GET` | `/api/companies/{id}` | Get company detail with full activity audit timeline |
| `PATCH` | `/api/companies/{id}` | Update company record and log field-level diff |
| `POST` | `/api/companies/{id}/archive` | Soft-archive company record |
| `POST` | `/api/companies/{id}/restore` | Restore archived company record to active directory |

### Health Check Response

`GET /health` or `GET /api/health`:

```json
{
  "status": "ok",
  "database": "ok",
  "redis": "ok",
  "service": "Barking Dog Growth Engine"
}
```
