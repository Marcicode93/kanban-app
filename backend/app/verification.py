import hashlib
import os
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.models import User, VerificationToken

CODE_TTL_MINUTES = 15
MIN_PASSWORD_LENGTH = 8


def utc_now() -> datetime:
    """Naive UTC datetime for SQLite storage."""
    return datetime.now(UTC).replace(tzinfo=None)


def validate_password(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")


def hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def create_verification_token(
    db: Session,
    user: User,
    purpose: str,
    target_email: str | None = None,
) -> str:
    code = generate_code()
    db.execute(
        delete(VerificationToken).where(
            VerificationToken.user_id == user.id,
            VerificationToken.purpose == purpose,
            VerificationToken.used_at.is_(None),
        )
    )

    token = VerificationToken(
        user_id=user.id,
        purpose=purpose,
        target_email=target_email,
        code_hash=hash_code(code),
        expires_at=utc_now() + timedelta(minutes=CODE_TTL_MINUTES),
    )
    db.add(token)
    db.commit()
    return code


def verify_code(
    db: Session,
    user: User,
    purpose: str,
    code: str,
) -> VerificationToken | None:
    token = db.scalar(
        select(VerificationToken)
        .where(
            VerificationToken.user_id == user.id,
            VerificationToken.purpose == purpose,
            VerificationToken.used_at.is_(None),
        )
        .order_by(VerificationToken.id.desc())
    )
    if token is None:
        return None
    if token.expires_at < utc_now():
        return None
    if token.code_hash != hash_code(code.strip()):
        return None

    token.used_at = utc_now()
    db.commit()
    return token


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.strip().lower()))


def is_test_env() -> bool:
    return os.getenv("ENV", "development") == "test"
