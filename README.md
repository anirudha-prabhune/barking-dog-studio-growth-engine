# Studio Barking Dog — Growth Engine (Pass 1 Foundation)

The **Barking Dog Growth Engine** is an internal AI-powered lead-generation intelligence platform designed specifically for **Studio Barking Dog** operatives.

Pass 1 establishes the rock-solid application foundation:
- Relational data model for companies, users, activities, agent runs, and evidence
- Full CRUD lifecycle management for companies (create, update, soft-archive, restore)
- Robust search, multi-attribute filtering, and pagination
- Security-first authentication with PBKDF2 password hashing and token-based sessions
- Information-dense, executive B2B SaaS dashboard and detail views
- Complete audit activity timeline tracking

---

## Architecture Overview

The system supports two complementary local workflows:

1. **Integrated Full-Stack Mode (Node.js / Express + Vite SPA)**:
   - Zero-dependency local runtime using Node.js built-in relational SQLite storage (`node:sqlite`).
   - Serves the high-performance Vite React UI and REST API simultaneously on `http://localhost:3000`.
   - Ideal for instant developer onboarding, UI reviews, and container deployment.

2. **Distributed Microservice Mode (Python FastAPI + PostgreSQL + Docker Compose)**:
   - Python 3.11+ FastAPI service with SQLAlchemy 2.0 ORM, Alembic migrations, and Pydantic v2 schemas.
   - Backed by containerized PostgreSQL 16 and Redis 7 via Docker Compose.
   - Includes isolated Pytest API test suites.

Both workflows share identical REST API contracts, validation logic, demo seeds, and UI integration.

---

## Default Credentials & Demo Data

The database initializes with a pre-configured studio administrator account:

| Attribute | Value |
|---|---|
| **Studio Email** | `admin@barkingdog.studio` |
| **Password** | `BarkingDog2026!` |

*(Note: In the login screen, click **"Auto-fill"** to automatically populate these credentials.)*

### Seed Data
The database includes 5 explicitly fictional demo companies for verification:
- `Demo Engineering Ltd` (Industrial & Manufacturing — High Opportunity)
- `Demo Healthcare Ltd` (Healthcare & Life Sciences — Needs Review)
- `Demo Furniture Ltd` (Retail & E-Commerce — Researching)
- `Demo Logistics Solutions Ltd` (Transportation & Logistics — Low Opportunity)
- `Demo Retail Labs Ltd` (Retail & E-Commerce — New)

---

## Option 1: Quickstart (Integrated Node.js Full-Stack)

This is the fastest way to run the entire application with zero external database dependencies.

### Prerequisites
- **Node.js**: v20.x or v22.x+
- **npm**: v9.x or v10.x+

### Setup Instructions

1. **Clone and enter the workspace**:
   ```bash
   cd barking-dog-growth-engine
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   - Web Application & API: [http://localhost:3000](http://localhost:3000)
   - Health Check: [http://localhost:3000/health](http://localhost:3000/health)

6. **Production Build & Execution**:
   ```bash
   npm run build
   npm start
   ```

---

## Option 2: Python FastAPI & PostgreSQL Backend

If developing against the Python backend with PostgreSQL and Redis:

### Prerequisites
- **Docker & Docker Compose**
- **Python**: 3.11 or 3.12
- **Node.js**: 20+ (for frontend)

### Setup Instructions

1. **Start PostgreSQL and Redis services**:
   ```bash
   docker compose up -d
   ```
   *Verify containers are healthy with `docker compose ps`.*

2. **Create Python Virtual Environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   pip install -r backend/requirements.txt
   ```

3. **Run Database Migrations (Alembic)**:
   ```bash
   alembic -c backend/migrations/alembic.ini upgrade head
   ```

4. **Seed Administrator & Demo Data**:
   ```bash
   python3 backend/seed.py
   ```

5. **Start the FastAPI Server**:
   ```bash
   uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   - Interactive OpenAPI Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
   - API Health Check: [http://localhost:8000/health](http://localhost:8000/health)

6. **Run Backend Test Suite**:
   ```bash
   pytest backend/tests/ -v
   ```

7. **Start the Frontend Client**:
   In `.env` or your environment, ensure `NEXT_PUBLIC_API_URL=http://localhost:8000`, then:
   ```bash
   npm run dev
   ```

---

## Key Features & Endpoints

### Core Endpoints

- `GET /health` — Service health & database connectivity
- `POST /api/auth/login` — Authenticate operative session token
- `GET /api/auth/me` — Retrieve authenticated user profile
- `GET /api/companies` — List companies (query parameters: `page`, `page_size`, `search`, `status`, `industry`, `include_archived`)
- `POST /api/companies` — Create company record with domain auto-parsing & activity logging
- `GET /api/companies/{id}` — Get detailed company record with full activity log
- `PATCH /api/companies/{id}` — Update company firmographics & status
- `POST /api/companies/{id}/archive` — Soft archive company
- `POST /api/companies/{id}/restore` — Restore archived company
- `GET /api/dashboard/stats` — Real-time aggregate count metrics
- `POST /api/seed` — Quick-seed demo company records into active database

### Database Schema Specification
- `users`: Operative authentication accounts & password hashes
- `companies`: Core firmographic profiles, status, and opportunity tiers
- `activities`: Timestamped audit trail for creations, updates, and archives
- `agent_runs`: Reserved for Pass 3 autonomous research agents
- `evidence`: Reserved for Pass 3 data ingestion artifacts & signals
