from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthStatus(BaseModel):
    authenticated: bool
    username: str | None = None


class UserResponse(BaseModel):
    username: str
