from pydantic import BaseModel, ConfigDict


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
