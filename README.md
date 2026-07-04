# Project Management MVP

Local Kanban board with AI assistant. Runs in Docker.

## Start

Mac / Linux:

```bash
./scripts/start.sh
```

Windows (PowerShell):

```powershell
.\scripts\start.ps1
```

Open http://localhost:8000

Sign in with username `user` and password `password`.

## Stop

Mac / Linux:

```bash
./scripts/stop.sh
```

Windows:

```powershell
.\scripts\stop.ps1
```

## API

- `GET /api/health` — health check

Phase 2 roadmap: [docs/PLAN-PHASE2.md](docs/PLAN-PHASE2.md).

## Environment

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | AI chat (required for `/api/ai/chat`) |
| `SESSION_SECRET` | Session cookie signing; **required** when `ENV=production` |
| `ENV` | Set to `production` on public deploy |
| `DATABASE_URL` | Optional; defaults to `backend/data/pm.db` locally |

Copy `.env.example` to `.env` for local development.
