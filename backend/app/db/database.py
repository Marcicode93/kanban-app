import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

_engine = None
_SessionLocal = None


class Base(DeclarativeBase):
    pass


def default_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    data_dir = Path(__file__).resolve().parent.parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{data_dir / 'pm.db'}"


def _migrate_schema(engine) -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("users")}
    with engine.begin() as connection:
        if "email" not in columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN email TEXT"))
        if "email_verified" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT 0"
                )
            )
        if "is_demo" not in columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT 0")
            )
        if "email_verified_at" not in columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN email_verified_at DATETIME")
            )
        connection.execute(
            text(
                "UPDATE users SET email_verified = 1, is_demo = 1 "
                "WHERE username = 'user' AND (email IS NULL OR email = '')"
            )
        )

    if "boards" in inspector.get_table_names():
        board_columns = {column["name"] for column in inspector.get_columns("boards")}
        if "version" not in board_columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE boards ADD COLUMN version INTEGER NOT NULL DEFAULT 0")
                )


def init_db(url: str | None = None) -> None:
    global _engine, _SessionLocal
    _engine = create_engine(
        url or default_database_url(),
        connect_args={"check_same_thread": False},
    )
    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    from app.db import models  # noqa: F401

    Base.metadata.create_all(bind=_engine)
    _migrate_schema(_engine)


def get_db() -> Generator[Session, None, None]:
    if _SessionLocal is None:
        init_db()
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
