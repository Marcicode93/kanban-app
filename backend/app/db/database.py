import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
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


def init_db(url: str | None = None) -> None:
    global _engine, _SessionLocal
    _engine = create_engine(
        url or default_database_url(),
        connect_args={"check_same_thread": False},
    )
    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    from app.db import models  # noqa: F401

    Base.metadata.create_all(bind=_engine)


def get_db() -> Generator[Session, None, None]:
    if _SessionLocal is None:
        init_db()
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
