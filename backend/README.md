# SENTINEL Backend — FastAPI + PostgreSQL

This is the backend MVP. It provides health checks, indicator storage, IOC demo analysis, incident management, and dashboard summary endpoints.

## Data integrity notice

The threat records are synthetic demo records. `192.0.2.10` is in the reserved TEST-NET-1 documentation range and `suspicious-demo.example` uses the reserved `.example` domain. This API does not query live threat intelligence providers yet. Unknown indicators return `severity: Unknown` and `risk_score: null`; missing data must never be interpreted as safe.

## Requirements

- Python 3.11+
- Docker Desktop (optional, for PostgreSQL)

## Option A — Local Windows setup with SQLite

Open PowerShell in the `backend` directory:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

If PowerShell blocks activation, run without activating:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs`. SQLite creates `sentinel.db` in this folder.

## Option B — PostgreSQL with Docker Compose

From the project root (where `docker-compose.yml` is located):

```powershell
docker compose up --build
```

API: `http://localhost:8000` · PostgreSQL: `localhost:5432`.

Stop containers with `docker compose down`. `docker compose down -v` also deletes the local development database volume.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | API/database health |
| GET | `/api/v1/dashboard/summary` | Dashboard counters |
| GET | `/api/v1/indicators` | List indicators |
| POST | `/api/v1/indicators` | Add indicator |
| POST | `/api/v1/ioc/analyze` | Analyze against local synthetic demo records |
| GET | `/api/v1/incidents` | List incidents |
| GET | `/api/v1/assets` | List protected assets for incident linking |
| GET | `/api/v1/correlations/graph` | Build evidence-backed IOC/analysis/incident/asset graph |
| POST | `/api/v1/incidents` | Create incident |
| PATCH | `/api/v1/incidents/{id}/status` | Update incident status |

### Test IOC analysis in PowerShell

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://localhost:8000/api/v1/ioc/analyze `
  -ContentType "application/json" `
  -Body '{"value":"192.0.2.10","type":"ipv4"}'
```

Try an unknown documentation IP:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://localhost:8000/api/v1/ioc/analyze `
  -ContentType "application/json" `
  -Body '{"value":"192.0.2.55","type":"ipv4"}'
```

The second result must be `Unknown` with no score, not `Low` or `Safe`.

### Create an incident

```powershell
$body = @{ title = "Investigate suspicious demo indicator"; severity = "High"; status = "New"; owner = "Security Analyst"; description = "Created during local API test." } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/v1/incidents -ContentType "application/json" -Body $body
```

## Tests

From `backend`:

```powershell
pytest -q
```

## Code map

- `app/main.py`: FastAPI app, CORS, startup initialization.
- `app/config.py`: environment settings.
- `app/database.py`: SQLAlchemy engine and DB sessions.
- `app/models.py`: relational database tables.
- `app/schemas.py`: request/response validation.
- `app/services.py`: IOC validation and synthetic demo analysis.
- `app/seed.py`: inserts initial sample assets and incidents.
- `app/routers/`: endpoint groups.
- `tests/`: API tests.

## Correlation and graph (Stages 4–5)

- `GET /api/v1/correlations/graph` returns nodes and edges constructed only from explicit foreign-key relationships.
- Edges include analysis-to-indicator, incident-to-analysis, and incident-to-asset relationships.
- Each edge includes an explanation and a confidence label. The engine does not infer attribution.
- `GET /api/v1/assets` returns the protected asset list used when creating an incident.
- The frontend graph refreshes from this API after analysis and incident creation.

## Next steps

1. Add an authorized threat-intelligence provider adapter.
2. Store provider observations and timestamps as evidence.
3. Add a documented and validated risk model with confidence and missing-data handling.
4. Add authentication, role-based authorization, audit logs, rate limiting, migrations, and security review before any public deployment.

Do not expose this development API publicly without those protections.


## Explainable analysis (MVP)

IOC analysis responses include `reasoning`, `limitations`, and `confidence_label`. These fields are produced deterministically from the stored demo record. This is not a generative AI model, does not ingest telemetry, and does not create evidence. Unknown indicators remain `Unknown` with no risk score.
