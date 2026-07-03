import os

import bcrypt
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User

SESSION_USER_KEY = "user"
SESSION_SECRET = os.getenv("SESSION_SECRET", "pm-mvp-dev-secret")


def get_session_user(request: Request) -> str | None:
    user = request.session.get(SESSION_USER_KEY)
    return user if isinstance(user, str) else None


def require_user(request: Request) -> str:
    user = get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def get_current_user(user: str = Depends(require_user)) -> str:
    return user


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.username == username))
    if user is None:
        return None
    if not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        return None
    return user
