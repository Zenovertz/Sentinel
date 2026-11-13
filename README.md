# SENTINEL — Full-stack Hackathon MVP

SENTINEL is a defensive cyber threat intelligence and incident workflow prototype. The Next.js frontend now calls the FastAPI backend for IOC analysis, indicator listing, incident creation/status updates, and dashboard counters.

> **Important:** The bundled intelligence records are synthetic demonstration data only. An unknown IOC is returned as `Unknown` / `insufficient_data`, never assumed safe. Do not present this as a live threat feed or deploy it on a production network.

## Stack
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Recharts, Lucide
- Backend: FastAPI, SQLAlchemy 2, Pydantic Settings
- Database: SQLite by default for the simplest Windows setup; PostgreSQL 16 through Docker Compose
- Tests: pytest + FastAPI TestClient

## Folder structure
```text
sentinel-build/
├── app/                    # Next.js screens and styles
├── lib/                    # frontend data and API client
├── backend/
│   ├── app/                # FastAPI, models, schemas, services, routers
│   └── tests/              # backend API tests
├── docker-compose.yml      # PostgreSQL + API
├── .env.local.example      # frontend API URL
└── README.md
```

## Windows setup (SQLite — easiest)
Requirements: Python 3.11+, Node.js 20.9+, npm.

### 1. Start backend
Open PowerShell in `sentinel-build\backend`:
```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```
If PowerShell blocks activation:
```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### 2. Start frontend
Open a second PowerShell in the project root `sentinel-build`:
```powershell
Copy-Item .env.local.example .env.local
npm install
npm run dev
```
Open http://localhost:3000. Keep both terminals running.

## PostgreSQL with Docker (optional)
Install and start Docker Desktop. From project root:
```powershell
docker compose up --build
```
This starts PostgreSQL and the API. In another terminal, start the frontend with `npm install` and `npm run dev`. Stop services with `docker compose down`. `docker compose down -v` also deletes the local development database volume.

## Verify / test
Backend tests:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest -q
```
Expected: 7 tests pass. IOC analysis responses include explicit reasoning and limitations; known demo matches and unknown indicators are handled differently.

Quick API checks:
- `GET http://localhost:8000/health`
- `GET http://localhost:8000/api/v1/dashboard/summary`
- `GET http://localhost:8000/api/v1/indicators`
- `POST http://localhost:8000/api/v1/ioc/analyze` with `{"value":"192.0.2.10","type":"ipv4"}`

## Frontend ↔ backend integration
- `lib/api.ts` centralizes HTTP calls and API response types.
- `lib/api.ts: mapIndicator/mapIncident` adapts backend snake_case data to the UI's display shape.
- `app/page.tsx` loads indicators, incidents, and dashboard counts on startup.
- IOC Analyzer sends `POST /ioc/analyze`; it renders the returned evidence, confidence, recommendations, and `Unknown` state.
- Create incident sends `POST /incidents` with the analysis ID.
- Incident status changes send `PATCH /incidents/{id}/status`; the backend also writes an incident event.
- CORS allows the local Next.js origin `http://localhost:3000`.

## Current MVP limits
- AI Analysis now renders an explainable, deterministic assessment from the latest IOC analysis, including reasoning, limitations, confidence label, and recommendations. It is not an LLM and does not invent telemetry.
- Activity chart, severity chart, and report previews still contain illustrative/synthetic UI content. Threat Graph now uses the backend correlation endpoint.
- There is no authentication, role-based access control, external reputation provider, live telemetry ingestion, or production hardening.
- SQLite is the default local database; Docker Compose uses PostgreSQL.
- Do not expose the development API publicly. Change development credentials and add authentication, authorization, migrations, rate limits, and audit controls before any real deployment.

## Stage 3–5: Explainable analysis, correlation engine, and dynamic graph

### Stage 3 — Explainable Threat Analysis
- `POST /api/v1/ioc/analyze` returns the result plus `reasoning`, `limitations`, `confidence_label`, and `recommendation`.
- The current engine is deterministic and evidence-based. It is not an LLM and does not claim to have live telemetry.
- Unknown indicators remain `Unknown` with a null risk score.

### Stage 4 — Threat Correlation Engine
- `GET /api/v1/correlations/graph` constructs nodes and edges from persisted database relationships.
- Supported edges: `analysis → indicator`, `incident → analysis`, and `incident → asset`.
- The engine intentionally avoids speculative attribution. Each edge includes an explanation and confidence based on the explicit database relationship.
- `GET /api/v1/assets` supplies the protected assets available to link to a new incident.
- In IOC Analyzer, select an asset before creating an incident. The incident is then linked to both its analysis and the selected asset.

### Stage 5 — Dynamic Threat Graph
- The Threat Graph page fetches the graph API instead of rendering hard-coded example links.
- Nodes are grouped visually by indicator, analysis, incident, and asset.
- The relationship list displays the evidence behind each edge.
- To see a connected chain: analyze an IOC → select a protected asset → create incident → open Threat Graph.

## Latest verification
Backend test suite: **7 passed** (health, demo IOC analysis, unknown IOC handling, invalid IOC validation, incident status update, graph relationship construction, and asset listing).

The frontend source has been updated for the dynamic graph and asset selection. A full Next.js production build was not verified in this environment because `npm install` timed out; run `npm install` and `npm run build` locally after extraction.
