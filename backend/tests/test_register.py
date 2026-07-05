from fastapi.testclient import TestClient

from app.db.seed import EMPTY_BOARD
from app.mail import FakeMailSender


def register_and_verify(
    client: TestClient,
    email: str,
    password: str = "secret123",
) -> None:
    response = client.post(
        "/api/register",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "pending_verification"}

    code = FakeMailSender.last_code
    assert code is not None
    verify = client.post(
        "/api/auth/verify-email",
        json={"code": code, "email": email},
    )
    assert verify.status_code == 200


def login(client: TestClient, login_id: str, password: str) -> None:
    response = client.post(
        "/api/login", json={"email": login_id, "password": password}
    )
    assert response.status_code == 200


def test_register_creates_user_and_board(client: TestClient) -> None:
    register_and_verify(client, "newuser@example.com")

    me = client.get("/api/auth/me")
    assert me.json()["authenticated"] is True
    assert me.json()["email"] == "newuser@example.com"
    assert me.json()["email_verified"] is True

    board = client.get("/api/board").json()
    assert board == EMPTY_BOARD.model_dump(by_alias=True)


def test_register_duplicate_email_returns_409(client: TestClient) -> None:
    register_and_verify(client, "taken@example.com")
    client.post("/api/logout")

    response = client.post(
        "/api/register",
        json={"email": "taken@example.com", "password": "secret123"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Email already registered"


def test_register_then_login_works(client: TestClient) -> None:
    register_and_verify(client, "loginuser@example.com", "mypassword")
    client.post("/api/logout")

    login(client, "loginuser@example.com", "mypassword")
    assert client.get("/api/auth/me").json()["email"] == "loginuser@example.com"


def test_unverified_user_cannot_access_board(client: TestClient) -> None:
    client.post(
        "/api/register",
        json={"email": "pending@example.com", "password": "secret123"},
    )
    login(client, "pending@example.com", "secret123")
    response = client.get("/api/board")
    assert response.status_code == 403


def test_users_have_isolated_boards(client: TestClient) -> None:
    register_and_verify(client, "alice@example.com")
    board = client.get("/api/board").json()
    board["columns"][0]["title"] = "Alice Board"
    client.put("/api/board", json=board)
    client.post("/api/logout")

    register_and_verify(client, "bob@example.com")
    bob_board = client.get("/api/board").json()
    assert bob_board["columns"][0]["title"] == "Backlog"

    client.post("/api/logout")
    login(client, "alice@example.com", "secret123")
    alice_board = client.get("/api/board").json()
    assert alice_board["columns"][0]["title"] == "Alice Board"


def test_register_requires_credentials(client: TestClient) -> None:
    response = client.post(
        "/api/register",
        json={"email": "", "password": ""},
    )
    assert response.status_code == 400


def test_register_requires_password_length(client: TestClient) -> None:
    response = client.post(
        "/api/register",
        json={"email": "short@example.com", "password": "short"},
    )
    assert response.status_code == 400
