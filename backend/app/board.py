from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Board, Card, Column, User
from app.schemas import BoardData

EXPECTED_COLUMN_IDS = frozenset(
    {"col-backlog", "col-discovery", "col-progress", "col-review", "col-done"}
)


def column_storage_id(board_id: int, logical_id: str) -> str:
    return f"b{board_id}-{logical_id}"


def column_logical_id(column_id: str) -> str:
    if column_id.startswith("b") and "-" in column_id:
        prefix, logical_id = column_id.split("-", 1)
        if prefix[1:].isdigit():
            return logical_id
    return column_id


def get_board_for_username(db: Session, username: str) -> Board:
    board = db.scalar(
        select(Board)
        .join(User)
        .where(User.username == username)
        .options(selectinload(Board.columns).selectinload(Column.cards))
    )
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


def board_to_data(board: Board) -> BoardData:
    columns = sorted(board.columns, key=lambda column: column.position)
    cards_by_column: dict[str, list[str]] = {
        column_logical_id(column.id): [] for column in columns
    }
    cards: dict[str, dict[str, str]] = {}

    for column in columns:
        logical_id = column_logical_id(column.id)
        for card in sorted(column.cards, key=lambda item: item.position):
            cards_by_column[logical_id].append(card.id)
            cards[card.id] = {
                "id": card.id,
                "title": card.title,
                "details": card.details,
            }

    return BoardData.model_validate(
        {
            "columns": [
                {
                    "id": column_logical_id(column.id),
                    "title": column.title,
                    "cardIds": cards_by_column[column_logical_id(column.id)],
                }
                for column in columns
            ],
            "cards": cards,
        }
    )


def replace_board(board: Board, data: BoardData, db: Session) -> None:
    column_ids = {column.id for column in data.columns}
    if len(data.columns) != 5 or column_ids != EXPECTED_COLUMN_IDS:
        raise HTTPException(status_code=400, detail="Invalid board columns")

    for position, column_data in enumerate(data.columns):
        storage_id = column_storage_id(board.id, column_data.id)
        column = db.get(Column, storage_id)
        if column is None or column.board_id != board.id:
            raise HTTPException(status_code=400, detail="Invalid board columns")
        column.title = column_data.title
        column.position = position

        for card_id in column_data.cardIds:
            if card_id not in data.cards:
                raise HTTPException(status_code=400, detail="Missing card data")

    existing_cards = {
        card.id: card
        for card in db.scalars(
            select(Card).join(Column).where(Column.board_id == board.id)
        )
    }
    payload_card_ids = set(data.cards.keys())

    for index, card in enumerate(existing_cards.values()):
        card.position = -(index + 1)
    db.flush()

    for column_data in data.columns:
        storage_id = column_storage_id(board.id, column_data.id)
        for position, card_id in enumerate(column_data.cardIds):
            card_payload = data.cards[card_id]
            if card_id in existing_cards:
                card = existing_cards[card_id]
                card.title = card_payload.title
                card.details = card_payload.details
                card.column_id = storage_id
                card.position = position
            else:
                db.add(
                    Card(
                        id=card_id,
                        column_id=storage_id,
                        title=card_payload.title,
                        details=card_payload.details,
                        position=position,
                    )
                )

    for card_id, card in existing_cards.items():
        if card_id not in payload_card_ids:
            db.delete(card)

    db.commit()
