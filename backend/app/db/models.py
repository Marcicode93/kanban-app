from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    board: Mapped["Board"] = relationship(back_populates="user", uselist=False)
    verification_tokens: Mapped[list["VerificationToken"]] = relationship(
        back_populates="user"
    )


class VerificationToken(Base):
    __tablename__ = "verification_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    purpose: Mapped[str] = mapped_column(String, nullable=False)
    target_email: Mapped[str | None] = mapped_column(String, nullable=True)
    code_hash: Mapped[str] = mapped_column(String, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped[User] = relationship(back_populates="verification_tokens")


class Board(Base):
    __tablename__ = "boards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)

    user: Mapped[User] = relationship(back_populates="board")
    columns: Mapped[list["Column"]] = relationship(back_populates="board")


class Column(Base):
    __tablename__ = "columns"
    __table_args__ = (
        UniqueConstraint("board_id", "position", name="idx_columns_board_position"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    board: Mapped[Board] = relationship(back_populates="columns")
    cards: Mapped[list["Card"]] = relationship(back_populates="column")


class Card(Base):
    __tablename__ = "cards"
    __table_args__ = (
        UniqueConstraint("column_id", "position", name="idx_cards_column_position"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    column_id: Mapped[str] = mapped_column(ForeignKey("columns.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    details: Mapped[str] = mapped_column(String, nullable=False, default="")
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    column: Mapped[Column] = relationship(back_populates="cards")
