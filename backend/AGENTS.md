# Backend

FastAPI application serving the PM MVP.

## Structure

```
backend/
  app/
    auth.py       # Session auth helpers and MVP credentials
    main.py       # FastAPI app, routes, static file mount
    schemas.py    # Request/response models
  static/         # Populated by Next.js static export during Docker build
  tests/          # pytest suite
  pyproject.toml  # Python dependencies (managed with uv)
```

## Endpoints

| Method | Path             | Auth     | Description |
|--------|------------------|----------|-------------|
| GET    | `/api/health`    | No       | Returns `{"status": "ok"}` |
| GET    | `/api/auth/me`   | No       | Returns `{authenticated, username?}` |
| GET    | `/api/auth/user` | Yes      | Returns `{username}` |
| POST   | `/api/login`     | No       | Body: `{username, password}` |
| POST   | `/api/logout`    | No       | Clears session |
| GET    | `/`              | No*      | Serves static frontend |

\*The frontend gates the Kanban UI; API routes for board data will require auth from Part 6 onward.

## MVP credentials

- Username: `user`
- Password: `password`

## Local development (without Docker)

```bash
cd backend
uv sync --all-groups
uv run uvicorn app.main:app --reload --port 8000
```

Run tests:

```bash
cd backend
uv run pytest
```

## Docker

Built and run via the root `Dockerfile` and `scripts/start.sh`.
