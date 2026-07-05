from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_verified_user
from app.board import board_to_data, get_board_for_username, replace_board
from app.db.database import get_db
from app.db.models import User
from app.schemas import BoardData

router = APIRouter()


@router.get("/api/board", response_model=BoardData)
def get_board(
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
) -> BoardData:
    board = get_board_for_username(db, user.username)
    return board_to_data(board)


@router.put("/api/board", response_model=BoardData)
def put_board(
    payload: BoardData,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
) -> BoardData:
    board = get_board_for_username(db, user.username)
    replace_board(board, payload, db)
    return board_to_data(get_board_for_username(db, user.username))
