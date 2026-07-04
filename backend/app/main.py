from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import is_production, validate_production_config
from app.db.seed import create_user_with_board
from app.db.models import User
from app.rate_limit import check_rate_limit
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response

from app.ai import AIConfigError, AIParseError, chat, chat_with_board
from app.auth import (
    SESSION_SECRET,
    SESSION_USER_KEY,
    authenticate_user,
    get_current_user,
    get_session_user,
)
from app.board import board_to_data, get_board_for_username, replace_board
from app.db.database import get_db, init_db
from app.db.seed import seed_if_empty
from app.schemas import (
    AIChatRequest,
    AIChatResponse,
    AITestResponse,
    AuthStatus,
    BoardData,
    LoginRequest,
    UserResponse,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(_: FastAPI):
    validate_production_config()
    init_db()
    db = next(get_db())
    try:
        seed_if_empty(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Project Management MVP", lifespan=lifespan)
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET, same_site="lax")


class NoCacheHtmlMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next) -> Response:
        response = await call_next(request)
        path = request.url.path
        if path == "/" or path.endswith(".html"):
            response.headers["Cache-Control"] = "no-cache"
        return response


app.add_middleware(NoCacheHtmlMiddleware)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/auth/me", response_model=AuthStatus)
def auth_me(request: Request) -> AuthStatus:
    user = get_session_user(request)
    if user:
        return AuthStatus(authenticated=True, username=user)
    return AuthStatus(authenticated=False)


@app.get("/api/auth/user", response_model=UserResponse)
def auth_user(username: str = Depends(get_current_user)) -> UserResponse:
    return UserResponse(username=username)


@app.post("/api/login")
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = authenticate_user(db, payload.username, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    request.session[SESSION_USER_KEY] = user.username
    return {"status": "ok"}


@app.post("/api/register")
def register(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    username = payload.username.strip()
    password = payload.password

    if not username or not password:
        raise HTTPException(
            status_code=400, detail="Username and password are required"
        )

    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"register:{client_ip}", limit=5):
        raise HTTPException(status_code=429, detail="Too many registration attempts")

    if db.scalar(select(User.id).where(User.username == username)) is not None:
        raise HTTPException(status_code=409, detail="Username already taken")

    user = create_user_with_board(db, username, password)
    request.session[SESSION_USER_KEY] = user.username
    return {"status": "ok"}


@app.post("/api/logout")
def logout(request: Request) -> dict[str, str]:
    request.session.clear()
    return {"status": "ok"}


@app.get("/api/board", response_model=BoardData)
def get_board(
    username: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BoardData:
    board = get_board_for_username(db, username)
    return board_to_data(board)


@app.put("/api/board", response_model=BoardData)
def put_board(
    payload: BoardData,
    username: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BoardData:
    board = get_board_for_username(db, username)
    replace_board(board, payload, db)
    return board_to_data(get_board_for_username(db, username))


@app.post("/api/ai/test", response_model=AITestResponse)
def ai_test() -> AITestResponse:
    if is_production():
        raise HTTPException(status_code=404, detail="Not found")
    try:
        response = chat("What is 2+2?")
    except AIConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return AITestResponse(response=response)


@app.post("/api/ai/chat", response_model=AIChatResponse)
def ai_chat(
    payload: AIChatRequest,
    request: Request,
    username: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AIChatResponse:
    if not check_rate_limit(f"ai-chat:{username}", limit=10):
        raise HTTPException(status_code=429, detail="AI chat rate limit exceeded")

    board = get_board_for_username(db, username)
    board_data = board_to_data(board)
    try:
        result = chat_with_board(board_data, payload.history, payload.message)
    except AIConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except AIParseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if result.board is not None:
        replace_board(board, result.board, db)
        updated = board_to_data(get_board_for_username(db, username))
        return AIChatResponse(message=result.message, board=updated)

    return AIChatResponse(message=result.message)


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
