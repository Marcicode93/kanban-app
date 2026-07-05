from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai import AIConfigError, AIParseError, chat, chat_with_board
from app.auth import get_verified_user
from app.board import board_to_data, get_board_for_username, replace_board
from app.config import is_production
from app.db.database import get_db
from app.db.models import User
from app.rate_limit import check_rate_limit
from app.schemas import AIChatRequest, AIChatResponse, AITestResponse

router = APIRouter()


@router.post("/api/ai/test", response_model=AITestResponse)
def ai_test() -> AITestResponse:
    if is_production():
        raise HTTPException(status_code=404, detail="Not found")
    try:
        response = chat("What is 2+2?")
    except AIConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return AITestResponse(response=response)


@router.post("/api/ai/chat", response_model=AIChatResponse)
def ai_chat(
    payload: AIChatRequest,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
) -> AIChatResponse:
    if not check_rate_limit(f"ai-chat:{user.username}", limit=10, db=db):
        raise HTTPException(status_code=429, detail="AI chat rate limit exceeded")

    board = get_board_for_username(db, user.username)
    board_data = board_to_data(board)
    try:
        result = chat_with_board(board_data, payload.history, payload.message)
    except AIConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except AIParseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if result.board is not None:
        replace_board(board, result.board, db)
        updated = board_to_data(get_board_for_username(db, user.username))
        return AIChatResponse(message=result.message, board=updated)

    return AIChatResponse(message=result.message)
