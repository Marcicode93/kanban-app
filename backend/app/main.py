from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session
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
    get_user_record,
    get_verified_user,
)
from app.board import board_to_data, get_board_for_username, replace_board
from app.config import is_production, validate_mail_config, validate_production_config
from app.db.database import get_db, init_db
from app.db.models import User
from app.db.seed import create_user_with_board, hash_password, seed_if_empty
from app.mail import FakeMailSender, MailSendError, send_verification_code
from app.rate_limit import check_rate_limit
from app.schemas import (
    AccountResponse,
    AIChatRequest,
    AIChatResponse,
    AITestResponse,
    AuthStatus,
    BoardData,
    ChangeEmailRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResendCodeRequest,
    ResetPasswordRequest,
    UserResponse,
    VerifyEmailRequest,
)
from app.verification import (
    create_verification_token,
    get_user_by_email,
    is_test_env,
    utc_now,
    validate_password,
    verify_code,
)

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
def auth_me(request: Request, db: Session = Depends(get_db)) -> AuthStatus:
    username = get_session_user(request)
    if not username:
        return AuthStatus(authenticated=False)
    user = db.scalar(select(User).where(User.username == username))
    if user is None:
        return AuthStatus(authenticated=False)
    return AuthStatus(
        authenticated=True,
        username=user.username,
        email=user.email,
        email_verified=user.email_verified or user.is_demo,
    )


@app.get("/api/auth/user", response_model=UserResponse)
def auth_user(username: str = Depends(get_current_user)) -> UserResponse:
    return UserResponse(username=username)


@app.post("/api/login")
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    request.session[SESSION_USER_KEY] = user.username
    return {"status": "ok"}


@app.post("/api/register")
def register(
    payload: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    email = payload.email.strip().lower()
    password = payload.password

    if not email or not password:
        raise HTTPException(
            status_code=400, detail="Email and password are required"
        )

    try:
        validate_password(password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"register:{client_ip}", limit=5):
        raise HTTPException(status_code=429, detail="Too many registration attempts")

    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = create_user_with_board(db, email, password)
    code = create_verification_token(db, user, "register")
    try:
        send_verification_code(email, code, "register")
    except MailSendError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"status": "pending_verification"}


@app.post("/api/auth/verify-email")
def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    username = get_session_user(request)
    user: User | None = None
    rate_key = payload.email or username or "unknown"

    if not check_rate_limit(f"verify:{rate_key}", limit=5):
        raise HTTPException(status_code=429, detail="Too many verification attempts")

    if username:
        user = db.scalar(select(User).where(User.username == username))
    elif payload.email:
        user = get_user_by_email(db, payload.email.strip().lower())

    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    token = verify_code(db, user, "change_email", payload.code)
    if token is None:
        token = verify_code(db, user, "register", payload.code)
    if token is None:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    if token.purpose == "change_email" and token.target_email:
        user.email = token.target_email
    user.email_verified = True
    user.email_verified_at = utc_now()
    db.commit()
    request.session[SESSION_USER_KEY] = user.username
    return {"status": "ok"}


@app.post("/api/auth/resend-code")
def resend_code(
    payload: ResendCodeRequest,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    email = payload.email.strip().lower()
    if not check_rate_limit(f"resend:{email}", limit=3):
        raise HTTPException(status_code=429, detail="Too many resend attempts")

    user = get_user_by_email(db, email)
    if user and not user.email_verified:
        code = create_verification_token(db, user, "register")
        send_verification_code(email, code, "register")
    return {"status": "ok"}


@app.post("/api/auth/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    email = payload.email.strip().lower()
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"forgot:{client_ip}", limit=3):
        raise HTTPException(status_code=429, detail="Too many reset attempts")

    user = get_user_by_email(db, email)
    if user and not user.is_demo:
        code = create_verification_token(db, user, "reset_password")
        send_verification_code(email, code, "reset_password")
    return {"status": "ok"}


@app.post("/api/auth/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    email = payload.email.strip().lower()
    try:
        validate_password(payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    user = get_user_by_email(db, email)
    if user is None or verify_code(db, user, "reset_password", payload.code) is None:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"status": "ok"}


@app.get("/api/account", response_model=AccountResponse)
def get_account(user: User = Depends(get_user_record)) -> AccountResponse:
    return AccountResponse(
        username=user.username,
        email=user.email,
        email_verified=user.email_verified or user.is_demo,
    )


@app.post("/api/account/password")
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if authenticate_user(db, user.username, payload.current_password) is None:
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    try:
        validate_password(payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"status": "ok"}


@app.post("/api/account/email")
def change_email(
    payload: ChangeEmailRequest,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    new_email = payload.new_email.strip().lower()
    if db.scalar(select(User.id).where(User.email == new_email)) is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    code = create_verification_token(db, user, "change_email", target_email=new_email)
    send_verification_code(new_email, code, "change_email")
    user.email_verified = False
    db.commit()
    return {"status": "pending_verification"}


@app.get("/api/auth/test/last-code")
def test_last_code(email: str, db: Session = Depends(get_db)) -> dict[str, str]:
    if not is_test_env():
        raise HTTPException(status_code=404, detail="Not found")
    user = get_user_by_email(db, email.strip().lower())
    if user is None or FakeMailSender.last_code is None:
        raise HTTPException(status_code=404, detail="No code found")
    if FakeMailSender.last_to != user.email:
        raise HTTPException(status_code=404, detail="No code found")
    return {"code": FakeMailSender.last_code}


@app.post("/api/logout")
def logout(request: Request) -> dict[str, str]:
    request.session.clear()
    return {"status": "ok"}


@app.get("/api/board", response_model=BoardData)
def get_board(
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
) -> BoardData:
    board = get_board_for_username(db, user.username)
    return board_to_data(board)


@app.put("/api/board", response_model=BoardData)
def put_board(
    payload: BoardData,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
) -> BoardData:
    board = get_board_for_username(db, user.username)
    replace_board(board, payload, db)
    return board_to_data(get_board_for_username(db, user.username))


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
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
) -> AIChatResponse:
    if not check_rate_limit(f"ai-chat:{user.username}", limit=10):
        raise HTTPException(status_code=429, detail="AI chat rate limit exceeded")

    board = get_board_for_username(db, user.username)
    board_data = board_to_data(board)
    try:
        result = chat_with_board(board_data, payload.history, payload.message)
    except AIConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except AIParseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if result.board is not None:
        replace_board(board, result.board, db)
        updated = board_to_data(get_board_for_username(db, user.username))
        return AIChatResponse(message=result.message, board=updated)

    return AIChatResponse(message=result.message)


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
