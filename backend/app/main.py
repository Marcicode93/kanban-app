from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response

from app.auth import (
    SESSION_SECRET,
    SESSION_USER_KEY,
    get_current_user,
    get_session_user,
    validate_credentials,
)
from app.schemas import AuthStatus, LoginRequest, UserResponse

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

app = FastAPI(title="Project Management MVP")
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
def login(payload: LoginRequest, request: Request) -> dict[str, str]:
    if not validate_credentials(payload.username, payload.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    request.session[SESSION_USER_KEY] = payload.username
    return {"status": "ok"}


@app.post("/api/logout")
def logout(request: Request) -> dict[str, str]:
    request.session.clear()
    return {"status": "ok"}


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
