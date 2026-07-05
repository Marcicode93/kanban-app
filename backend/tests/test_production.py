import pytest
from fastapi.testclient import TestClient

from app.rate_limit import check_rate_limit


def test_rate_limit_blocks_after_threshold() -> None:
    key = "test-key-unique"
    for _ in range(3):
        assert check_rate_limit(key, limit=3, window_seconds=3600)
    assert not check_rate_limit(key, limit=3, window_seconds=3600)


def test_ai_chat_rate_limit(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.ai import AIChatResult
    from app.rate_limit import reset_rate_limits

    reset_rate_limits()
    monkeypatch.setattr(
        "app.routes.ai.chat_with_board",
        lambda board, history, message: AIChatResult(message="ok"),
    )

    client.post("/api/login", json={"email": "user", "password": "password"})

    for _ in range(10):
        assert (
            client.post(
                "/api/ai/chat",
                json={"message": "hi", "history": []},
            ).status_code
            == 200
        )

    response = client.post("/api/ai/chat", json={"message": "hi", "history": []})
    assert response.status_code == 429


def test_production_rejects_default_session_secret(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.config import validate_production_config

    monkeypatch.setenv("ENV", "production")
    monkeypatch.delenv("SESSION_SECRET", raising=False)

    with pytest.raises(RuntimeError, match="SESSION_SECRET"):
        validate_production_config()


def test_production_rejects_console_mail_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.config import validate_mail_config

    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("MAIL_PROVIDER", "console")

    with pytest.raises(RuntimeError, match="console"):
        validate_mail_config()


def test_fake_mail_provider_requires_test_env(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.config import validate_mail_config

    monkeypatch.setenv("ENV", "development")
    monkeypatch.setenv("MAIL_PROVIDER", "fake")

    with pytest.raises(RuntimeError, match="fake"):
        validate_mail_config()


def test_ai_test_disabled_in_production(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("app.routes.ai.is_production", lambda: True)
    response = client.post("/api/ai/test")
    assert response.status_code == 404
