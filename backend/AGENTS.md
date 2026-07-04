# Backend

FastAPI application serving the PM MVP.

## Structure

```
backend/
  app/
    ai.py         # OpenRouter client (OpenAI-compatible)
    auth.py       # Session auth helpers
    board.py      # BoardData <-> database mapping
    main.py       # FastAPI app, routes, static file mount
    schemas.py    # Request/response models
    db/
      database.py # SQLAlchemy engine and session
      models.py   # ORM models
      seed.py     # Initial user and board seed data
  data/           # SQLite database file (created at runtime)
  static/         # Populated by Next.js static export during Docker build
  tests/          # pytest suite
  pyproject.toml  # Python dependencies (managed with uv)
```

## Endpoints

| Method | Path             | Auth | Description |
|--------|------------------|------|-------------|
| GET    | `/api/health`    | No   | Returns `{"status": "ok"}` |
| GET    | `/api/auth/me`   | No   | Returns `{authenticated, username?}` |
| GET    | `/api/auth/user` | Yes  | Returns `{username}` |
| POST   | `/api/login`     | No   | Body: `{username, password}` |
| POST   | `/api/register`  | No   | Body: `{username, password}`; creates user + empty board; signs in |
| POST   | `/api/logout`    | No   | Clears session |
| GET    | `/api/board`     | Yes  | Returns `BoardData` JSON |
| PUT    | `/api/board`     | Yes  | Replaces board with `BoardData` JSON |
| POST   | `/api/ai/test`   | No   | Sends "What is 2+2?" to OpenRouter; returns `{response}` |
| POST   | `/api/ai/chat`   | Yes  | Body: `{message, history?}`; returns `{message, board?}` |
| GET    | `/`              | No*  | Serves static frontend |

\*The frontend gates the Kanban UI; board API routes require a session.

## BoardData shape

```json
{
  "columns": [{ "id": "col-backlog", "title": "Backlog", "cardIds": ["card-1"] }],
  "cards": {
    "card-1": { "id": "card-1", "title": "...", "details": "..." }
  }
}
```

## Database

SQLite at `backend/data/pm.db`. Auto-created and seeded on startup. See [docs/DATABASE.md](../docs/DATABASE.md).

## AI (OpenRouter)

- API key: `OPENROUTER_API_KEY` in project root `.env` (loaded at startup; Docker passes it via `--env-file`)
- Model: `openai/gpt-oss-120b`
- Client: OpenAI Python SDK pointed at `https://openrouter.ai/api/v1`
- Missing key: `POST /api/ai/test` returns 503 with `"OPENROUTER_API_KEY is not set"`
- Chat: `POST /api/ai/chat` (auth required) sends board JSON + conversation history to the model; response is structured JSON `{message, board?}`. When `board` is present, it is persisted. History is passed by the client on each request (no server-side chat storage for MVP).

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

Built and run via the root `Dockerfile` and `scripts/start.sh`. Database persists in the `pm-kanban-data` Docker volume.
