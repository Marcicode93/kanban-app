from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response

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
from app.schemas import AuthStatus, BoardData, LoginRequest, UserResponse

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(_: FastAPI):
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


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
