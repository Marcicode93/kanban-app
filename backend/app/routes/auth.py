from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import (
    SESSION_USER_KEY,
    authenticate_user,
    get_current_user,
    get_session_user,
)
from app.db.database import get_db
from app.db.models import User
from app.schemas import AuthStatus, LoginRequest, UserResponse

router = APIRouter()


@router.get("/api/auth/me", response_model=AuthStatus)
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


@router.get("/api/auth/user", response_model=UserResponse)
def auth_user(username: str = Depends(get_current_user)) -> UserResponse:
    return UserResponse(username=username)


@router.post("/api/login")
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


@router.post("/api/logout")
def logout(request: Request) -> dict[str, str]:
    request.session.clear()
    return {"status": "ok"}
