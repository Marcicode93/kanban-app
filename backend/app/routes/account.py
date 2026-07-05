from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import authenticate_user, get_user_record, get_verified_user
from app.db.database import get_db
from app.db.models import User
from app.db.seed import hash_password
from app.mail import send_verification_code
from app.schemas import AccountResponse, ChangeEmailRequest, ChangePasswordRequest
from app.verification import create_verification_token, validate_password

router = APIRouter()


@router.get("/api/account", response_model=AccountResponse)
def get_account(user: User = Depends(get_user_record)) -> AccountResponse:
    return AccountResponse(
        username=user.username,
        email=user.email,
        email_verified=user.email_verified or user.is_demo,
    )


@router.post("/api/account/password")
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if authenticate_user(db, user.username, payload.current_password) is None:
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    try:
        validate_password(payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"status": "ok"}


@router.post("/api/account/email")
def change_email(
    payload: ChangeEmailRequest,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    new_email = payload.new_email.strip().lower()
    if db.scalar(select(User.id).where(User.email == new_email)) is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    code = create_verification_token(db, user, "change_email", target_email=new_email)
    send_verification_code(new_email, code, "change_email")
    user.email_verified = False
    db.commit()
    return {"status": "pending_verification"}
