from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str


class VerifyEmailRequest(BaseModel):
    code: str
    email: str | None = None


class ResendCodeRequest(BaseModel):
    email: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ChangeEmailRequest(BaseModel):
    new_email: str


class AuthStatus(BaseModel):
    authenticated: bool
    username: str | None = None
    email: str | None = None
    email_verified: bool = False


class UserResponse(BaseModel):
    username: str


class AccountResponse(BaseModel):
    username: str
    email: str | None
    email_verified: bool


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

    version: int = 0
    columns: list[ColumnData]
    cards: dict[str, CardData]


class AITestResponse(BaseModel):
    response: str


class ChatMessage(BaseModel):
    role: str
    content: str


class AIChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)


class AIChatResponse(BaseModel):
    message: str
    board: BoardData | None = None
