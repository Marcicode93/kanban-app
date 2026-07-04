from fastapi.testclient import TestClient

from app.db.seed import EMPTY_BOARD


def login(client: TestClient, username: str, password: str) -> None:
    response = client.post(
        "/api/login", json={"username": username, "password": password}
    )
    assert response.status_code == 200


def test_register_creates_user_and_board(client: TestClient) -> None:
    response = client.post(
        "/api/register",
        json={"username": "newuser", "password": "secret123"},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

    me = client.get("/api/auth/me")
    assert me.json() == {"authenticated": True, "username": "newuser"}

    board = client.get("/api/board").json()
    assert board == EMPTY_BOARD.model_dump(by_alias=True)


def test_register_duplicate_username_returns_409(client: TestClient) -> None:
    client.post(
        "/api/register",
        json={"username": "taken", "password": "secret123"},
    )
    client.post("/api/logout")

    response = client.post(
        "/api/register",
        json={"username": "taken", "password": "otherpass"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Username already taken"


def test_register_then_login_works(client: TestClient) -> None:
    client.post(
        "/api/register",
        json={"username": "loginuser", "password": "mypassword"},
    )
    client.post("/api/logout")

    login(client, "loginuser", "mypassword")
    assert client.get("/api/auth/me").json()["username"] == "loginuser"


def test_users_have_isolated_boards(client: TestClient) -> None:
    client.post(
        "/api/register",
        json={"username": "alice", "password": "secret123"},
    )
    board = client.get("/api/board").json()
    board["columns"][0]["title"] = "Alice Board"
    client.put("/api/board", json=board)
    client.post("/api/logout")

    client.post(
        "/api/register",
        json={"username": "bob", "password": "secret123"},
    )
    bob_board = client.get("/api/board").json()
    assert bob_board["columns"][0]["title"] == "Backlog"

    client.post("/api/logout")
    login(client, "alice", "secret123")
    alice_board = client.get("/api/board").json()
    assert alice_board["columns"][0]["title"] == "Alice Board"


def test_register_requires_credentials(client: TestClient) -> None:
    response = client.post("/api/register", json={"username": "", "password": ""})
    assert response.status_code == 400
