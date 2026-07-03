from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)

    board: Mapped["Board"] = relationship(back_populates="user", uselist=False)


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
