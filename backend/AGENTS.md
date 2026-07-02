# Backend

FastAPI application serving the PM MVP.

## Structure

```
backend/
  app/
    main.py       # FastAPI app, routes, static file mount
  static/         # Populated by Next.js static export during Docker build
  pyproject.toml  # Python dependencies (managed with uv)
```

## Endpoints

| Method | Path          | Description        |
|--------|---------------|--------------------|
| GET    | `/api/health` | Returns `{"status": "ok"}` |
| GET    | `/`           | Serves static files from `static/` |

## Local development (without Docker)

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

## Docker

Built and run via the root `Dockerfile` and `scripts/start.sh`.
