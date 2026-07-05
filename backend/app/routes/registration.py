from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import SESSION_USER_KEY, get_session_user
from app.db.database import get_db
from app.db.models import User
from app.db.seed import create_user_with_board, hash_password
from app.mail import FakeMailSender, MailSendError, send_verification_code
from app.rate_limit import check_rate_limit
from app.schemas import (
    ForgotPasswordRequest,
    RegisterRequest,
    ResendCodeRequest,
    ResetPasswordRequest,
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

router = APIRouter()


@router.post("/api/register")
def register(
    payload: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    email = payload.email.strip().lower()
    password = payload.password

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    try:
        validate_password(password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"register:{client_ip}", limit=5, db=db):
        raise HTTPException(status_code=429, detail="Too many registration attempts")

    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = create_user_with_board(db, email, password)
    code = create_verification_token(db, user, "register")
    try:
        send_verification_code(email, code, "register")
    except MailSendError as exc:
        db.delete(user)
        db.commit()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"status": "pending_verification"}


@router.post("/api/auth/verify-email")
def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    username = get_session_user(request)
    user: User | None = None
    rate_key = payload.email or username or "unknown"

    if not check_rate_limit(f"verify:{rate_key}", limit=5, db=db):
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
        existing_user_id = db.scalar(
            select(User.id).where(
                User.email == token.target_email,
                User.id != user.id,
            )
        )
        if existing_user_id is not None:
            raise HTTPException(status_code=409, detail="Email already registered")
        user.email = token.target_email
    user.email_verified = True
    user.email_verified_at = utc_now()
    db.commit()
    request.session[SESSION_USER_KEY] = user.username
    return {"status": "ok"}


@router.post("/api/auth/resend-code")
def resend_code(
    payload: ResendCodeRequest,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    email = payload.email.strip().lower()
    if not check_rate_limit(f"resend:{email}", limit=3, db=db):
        raise HTTPException(status_code=429, detail="Too many resend attempts")

    user = get_user_by_email(db, email)
    if user and not user.email_verified:
        code = create_verification_token(db, user, "register")
        send_verification_code(email, code, "register")
    return {"status": "ok"}


@router.post("/api/auth/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    email = payload.email.strip().lower()
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"forgot:{client_ip}", limit=3, db=db):
        raise HTTPException(status_code=429, detail="Too many reset attempts")

    user = get_user_by_email(db, email)
    if user and not user.is_demo:
        code = create_verification_token(db, user, "reset_password")
        send_verification_code(email, code, "reset_password")
    return {"status": "ok"}


@router.post("/api/auth/reset-password")
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


@router.get("/api/auth/test/last-code")
def test_last_code(email: str, db: Session = Depends(get_db)) -> dict[str, str]:
    if not is_test_env():
        raise HTTPException(status_code=404, detail="Not found")
    user = get_user_by_email(db, email.strip().lower())
    if user is None or FakeMailSender.last_code is None:
        raise HTTPException(status_code=404, detail="No code found")
    if FakeMailSender.last_to != user.email:
        raise HTTPException(status_code=404, detail="No code found")
    return {"code": FakeMailSender.last_code}
