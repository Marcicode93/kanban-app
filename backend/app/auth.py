import os

from fastapi import Depends, HTTPException, Request

MVP_USERNAME = "user"
MVP_PASSWORD = "password"
SESSION_USER_KEY = "user"

SESSION_SECRET = os.getenv("SESSION_SECRET", "pm-mvp-dev-secret")


def validate_credentials(username: str, password: str) -> bool:
    return username == MVP_USERNAME and password == MVP_PASSWORD


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
