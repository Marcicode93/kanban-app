from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthStatus(BaseModel):
    authenticated: bool
    username: str | None = None


class UserResponse(BaseModel):
    username: str


class CardData(BaseModel):
    id: str
    title: str
    details: str


class ColumnData(BaseModel):
    id: str
    title: str
    cardIds: list[str]


class BoardData(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    columns: list[ColumnData]
    cards: dict[str, CardData]


class AITestResponse(BaseModel):
    response: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AIChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)


class AIChatResponse(BaseModel):
    message: str
    board: BoardData | None = None
