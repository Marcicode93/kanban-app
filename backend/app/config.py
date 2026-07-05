import logging
import os

logger = logging.getLogger(__name__)

DEV_SESSION_SECRET = "pm-mvp-dev-secret"


def is_production() -> bool:
    return os.getenv("ENV", "development") == "production"


def validate_production_config() -> None:
    if not is_production():
        return
    secret = os.getenv("SESSION_SECRET", DEV_SESSION_SECRET)
    if secret == DEV_SESSION_SECRET:
        raise RuntimeError("SESSION_SECRET must be set when ENV=production")


def validate_mail_config() -> None:
    provider = os.getenv("MAIL_PROVIDER", "console").lower()
    logger.info("Mail provider: %s", provider)

    if provider == "resend":
        if not os.getenv("RESEND_API_KEY", "").strip():
            raise RuntimeError("RESEND_API_KEY is required when MAIL_PROVIDER=resend")
        mail_from = os.getenv("MAIL_FROM", "").strip()
        if not mail_from or mail_from.endswith("@example.com"):
            raise RuntimeError(
                "MAIL_FROM must be a verified Resend sender "
                "(e.g. onboarding@resend.dev or your verified domain)"
            )
    elif provider == "smtp":
        if not os.getenv("SMTP_HOST", "").strip():
            raise RuntimeError("SMTP_HOST is required when MAIL_PROVIDER=smtp")
        if not os.getenv("MAIL_FROM", "").strip():
            raise RuntimeError("MAIL_FROM is required when MAIL_PROVIDER=smtp")
    elif provider == "console":
        logger.warning(
            "MAIL_PROVIDER=console — emails are printed to server logs only, not sent"
        )
