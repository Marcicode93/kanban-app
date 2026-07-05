from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response

from app.auth import SESSION_SECRET
from app.config import is_production, validate_mail_config, validate_production_config
from app.db.database import get_db, init_db
from app.db.seed import seed_if_empty
from app.routes import account, ai, auth, board, health, registration

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(_: FastAPI):
    validate_production_config()
    validate_mail_config()
    init_db()
    db = next(get_db())
    try:
        seed_if_empty(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Project Management MVP", lifespan=lifespan)
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    same_site="lax",
    https_only=is_production(),
)


class NoCacheHtmlMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next) -> Response:
        response = await call_next(request)
        path = request.url.path
        if path == "/" or path.endswith(".html"):
            response.headers["Cache-Control"] = "no-cache"
        return response


app.add_middleware(NoCacheHtmlMiddleware)

for router in (
    health.router,
    auth.router,
    registration.router,
    account.router,
    board.router,
    ai.router,
):
    app.include_router(router)


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
