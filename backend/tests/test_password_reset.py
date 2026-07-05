from fastapi.testclient import TestClient

from app.mail import FakeMailSender
from tests.test_register import login, register_and_verify


def test_forgot_and_reset_password(client: TestClient) -> None:
    register_and_verify(client, "resetme@example.com", "oldpassword")
    client.post("/api/logout")

    response = client.post(
        "/api/auth/forgot-password",
        json={"email": "resetme@example.com"},
    )
    assert response.status_code == 200
    code = FakeMailSender.last_code
    assert code is not None

    reset = client.post(
        "/api/auth/reset-password",
        json={
            "email": "resetme@example.com",
            "code": code,
            "new_password": "newpassword",
        },
    )
    assert reset.status_code == 200

    login(client, "resetme@example.com", "newpassword")
    assert client.get("/api/auth/me").json()["authenticated"] is True


def test_demo_user_still_accesses_board(client: TestClient) -> None:
    login(client, "user", "password")
    me = client.get("/api/auth/me").json()
    assert me["email_verified"] is True
    assert client.get("/api/board").status_code == 200
