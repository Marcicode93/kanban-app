import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)


class MailSendError(Exception):
    pass


class MailSender:
    def send_code(self, to: str, code: str, purpose: str) -> None:
        raise NotImplementedError


class ConsoleMailSender(MailSender):
    def send_code(self, to: str, code: str, purpose: str) -> None:
        logger.info("Mail [%s] to %s: code %s", purpose, to, code)
        print(f"[mail] {purpose} -> {to}: {code}", flush=True)


class FakeMailSender(MailSender):
    last_to: str | None = None
    last_code: str | None = None
    last_purpose: str | None = None

    def send_code(self, to: str, code: str, purpose: str) -> None:
        FakeMailSender.last_to = to
        FakeMailSender.last_code = code
        FakeMailSender.last_purpose = purpose

    @classmethod
    def reset(cls) -> None:
        cls.last_to = None
        cls.last_code = None
        cls.last_purpose = None


class ResendMailSender(MailSender):
    def __init__(self, api_key: str, mail_from: str) -> None:
        self.api_key = api_key
        self.mail_from = mail_from

    def send_code(self, to: str, code: str, purpose: str) -> None:
        import httpx

        subject = {
            "register": "Verify your Kanban Studio account",
            "reset_password": "Reset your Kanban Studio password",
            "change_email": "Confirm your new email address",
        }.get(purpose, "Kanban Studio verification code")

        body = f"Your verification code is: {code}\n\nIt expires in 15 minutes."

        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": self.mail_from,
                "to": [to],
                "subject": subject,
                "text": body,
            },
            timeout=30,
        )
        if not response.is_success:
            logger.error(
                "Resend API error %s for %s: %s",
                response.status_code,
                to,
                response.text,
            )
            response.raise_for_status()


class SmtpMailSender(MailSender):
    def __init__(
        self,
        host: str,
        port: int,
        user: str,
        password: str,
        mail_from: str,
    ) -> None:
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.mail_from = mail_from

    def send_code(self, to: str, code: str, purpose: str) -> None:
        message = EmailMessage()
        message["From"] = self.mail_from
        message["To"] = to
        message["Subject"] = "Kanban Studio verification code"
        message.set_content(f"Your verification code is: {code}\n\nIt expires in 15 minutes.")

        with smtplib.SMTP(self.host, self.port) as server:
            server.starttls()
            if self.user:
                server.login(self.user, self.password)
            server.send_message(message)


def get_mail_sender() -> MailSender:
    provider = os.getenv("MAIL_PROVIDER", "console").lower()
    mail_from = os.getenv("MAIL_FROM", "noreply@example.com")

    if provider == "fake":
        return FakeMailSender()
    if provider == "resend":
        api_key = os.getenv("RESEND_API_KEY", "")
        if not api_key:
            raise RuntimeError("RESEND_API_KEY is not set")
        return ResendMailSender(api_key, mail_from)
    if provider == "smtp":
        host = os.getenv("SMTP_HOST", "")
        if not host:
            raise RuntimeError("SMTP_HOST is not set")
        return SmtpMailSender(
            host=host,
            port=int(os.getenv("SMTP_PORT", "587")),
            user=os.getenv("SMTP_USER", ""),
            password=os.getenv("SMTP_PASSWORD", ""),
            mail_from=mail_from,
        )
    return ConsoleMailSender()


def send_verification_code(to: str, code: str, purpose: str) -> None:
    provider = os.getenv("MAIL_PROVIDER", "console").lower()
    try:
        get_mail_sender().send_code(to, code, purpose)
        logger.info(
            "Sent %s verification email to %s (provider=%s)",
            purpose,
            to,
            provider,
        )
    except Exception as exc:
        logger.exception(
            "Failed to send %s email to %s (provider=%s)",
            purpose,
            to,
            provider,
        )
        raise MailSendError(f"Could not send verification email: {exc}") from exc
