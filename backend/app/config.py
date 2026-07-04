import os

DEV_SESSION_SECRET = "pm-mvp-dev-secret"


def is_production() -> bool:
    return os.getenv("ENV", "development") == "production"


def validate_production_config() -> None:
    if not is_production():
        return
    secret = os.getenv("SESSION_SECRET", DEV_SESSION_SECRET)
    if secret == DEV_SESSION_SECRET:
        raise RuntimeError("SESSION_SECRET must be set when ENV=production")
