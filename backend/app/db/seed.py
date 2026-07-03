import bcrypt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.board import replace_board
from app.db.models import Board, Column, User
from app.schemas import BoardData

MVP_USERNAME = "user"
MVP_PASSWORD = "password"

DEFAULT_COLUMNS = [
    {"id": "col-backlog", "title": "Backlog", "position": 0},
    {"id": "col-discovery", "title": "Discovery", "position": 1},
    {"id": "col-progress", "title": "In Progress", "position": 2},
    {"id": "col-review", "title": "Review", "position": 3},
    {"id": "col-done", "title": "Done", "position": 4},
]

INITIAL_BOARD = BoardData.model_validate(
    {
        "columns": [
            {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
            {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
            {
                "id": "col-progress",
                "title": "In Progress",
                "cardIds": ["card-4", "card-5"],
            },
            {"id": "col-review", "title": "Review", "cardIds": ["card-6"]},
            {"id": "col-done", "title": "Done", "cardIds": ["card-7", "card-8"]},
        ],
        "cards": {
            "card-1": {
                "id": "card-1",
                "title": "Align roadmap themes",
                "details": "Draft quarterly themes with impact statements and metrics.",
            },
            "card-2": {
                "id": "card-2",
                "title": "Gather customer signals",
                "details": "Review support tags, sales notes, and churn feedback.",
            },
            "card-3": {
                "id": "card-3",
                "title": "Prototype analytics view",
                "details": "Sketch initial dashboard layout and key drill-downs.",
            },
            "card-4": {
                "id": "card-4",
                "title": "Refine status language",
                "details": "Standardize column labels and tone across the board.",
            },
            "card-5": {
                "id": "card-5",
                "title": "Design card layout",
                "details": "Add hierarchy and spacing for scanning dense lists.",
            },
            "card-6": {
                "id": "card-6",
                "title": "QA micro-interactions",
                "details": "Verify hover, focus, and loading states.",
            },
            "card-7": {
                "id": "card-7",
                "title": "Ship marketing page",
                "details": "Final copy approved and asset pack delivered.",
            },
            "card-8": {
                "id": "card-8",
                "title": "Close onboarding sprint",
                "details": "Document release notes and share internally.",
            },
        },
    }
)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def seed_if_empty(db: Session) -> None:
    if db.scalar(select(User.id).limit(1)) is not None:
        return

    user = User(
        username=MVP_USERNAME,
        password_hash=hash_password(MVP_PASSWORD),
    )
    db.add(user)
    db.flush()

    board = Board(user_id=user.id)
    db.add(board)
    db.flush()

    for column in DEFAULT_COLUMNS:
        db.add(
            Column(
                id=column["id"],
                board_id=board.id,
                title=column["title"],
                position=column["position"],
            )
        )
    db.flush()

    replace_board(board, INITIAL_BOARD, db)
    db.commit()
