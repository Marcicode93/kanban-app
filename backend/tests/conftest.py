import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.rate_limit import reset_rate_limits


@pytest.fixture(autouse=True)
def _reset_rate_limits() -> None:
    reset_rate_limits()


@pytest.fixture
def client(tmp_path, monkeypatch) -> TestClient:
    db_file = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file}")
    with TestClient(app) as test_client:
        yield test_client
