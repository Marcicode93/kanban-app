import pytest
from fastapi.testclient import TestClient

from app.db.seed import INITIAL_BOARD
from app.mail import FakeMailSender


def login(client: TestClient) -> None:
    response = client.post(
        "/api/login", json={"email": "user", "password": "password"}
    )
    assert response.status_code == 200


def test_database_is_created_on_startup(client: TestClient, tmp_path) -> None:
    assert (tmp_path / "test.db").exists()


def test_seed_matches_initial_board_data(client: TestClient) -> None:
    login(client)
    response = client.get("/api/board")
    assert response.status_code == 200
    assert response.json() == INITIAL_BOARD.model_dump(by_alias=True)


def test_get_board_requires_authentication(client: TestClient) -> None:
    assert client.get("/api/board").status_code == 401


def test_get_board_returns_board_for_authenticated_user(client: TestClient) -> None:
    login(client)
    response = client.get("/api/board")
    assert response.status_code == 200
    assert len(response.json()["columns"]) == 5


def test_put_board_persists_changes(client: TestClient) -> None:
    login(client)
    board = client.get("/api/board").json()
    board["columns"][0]["title"] = "Renamed Backlog"
    board["cards"]["card-1"]["title"] = "Updated card"

    put_response = client.put("/api/board", json=board)
    assert put_response.status_code == 200
    assert put_response.json()["columns"][0]["title"] == "Renamed Backlog"
    assert put_response.json()["cards"]["card-1"]["title"] == "Updated card"

    get_response = client.get("/api/board")
    assert get_response.json()["columns"][0]["title"] == "Renamed Backlog"
    assert get_response.json()["cards"]["card-1"]["title"] == "Updated card"


def test_put_board_rejects_stale_version(client: TestClient) -> None:
    login(client)
    first = client.get("/api/board").json()
    stale = client.get("/api/board").json()

    first["columns"][0]["title"] = "First update"
    assert client.put("/api/board", json=first).status_code == 200

    stale["columns"][0]["title"] = "Stale update"
    response = client.put("/api/board", json=stale)
    assert response.status_code == 409
    assert response.json()["detail"] == "Board has changed"


def test_put_board_rejects_orphan_card_data(client: TestClient) -> None:
    login(client)
    board = client.get("/api/board").json()
    board["cards"]["card-orphan"] = {
        "id": "card-orphan",
        "title": "Orphan",
        "details": "Not referenced by a column",
    }

    response = client.put("/api/board", json=board)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid board cards"


def test_put_board_rejects_duplicate_card_references(client: TestClient) -> None:
    login(client)
    board = client.get("/api/board").json()
    board["columns"][1]["cardIds"].append("card-1")

    response = client.put("/api/board", json=board)
    assert response.status_code == 400
    assert response.json()["detail"] == "Duplicate card references"


def test_put_board_rejects_mismatched_card_id(client: TestClient) -> None:
    login(client)
    board = client.get("/api/board").json()
    board["cards"]["card-1"]["id"] = "different-id"

    response = client.put("/api/board", json=board)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid card id"


def test_put_board_moves_card_between_columns(client: TestClient) -> None:
    login(client)
    board = client.get("/api/board").json()
    review_column = next(
        column for column in board["columns"] if column["id"] == "col-review"
    )
    backlog_column = board["columns"][0]
    backlog_column["cardIds"] = [
        card_id for card_id in backlog_column["cardIds"] if card_id != "card-1"
    ]
    review_column["cardIds"] = ["card-1", *review_column["cardIds"]]

    response = client.put("/api/board", json=board)
    assert response.status_code == 200
    assert "card-1" in next(
        column["cardIds"]
        for column in response.json()["columns"]
        if column["id"] == "col-review"
    )


def test_put_board_requires_authentication(client: TestClient) -> None:
    login(client)
    board = client.get("/api/board").json()
    client.post("/api/logout")
    assert client.put("/api/board", json=board).status_code == 401


def register_and_verify(client: TestClient, email: str) -> None:
    response = client.post(
        "/api/register",
        json={"email": email, "password": "secret123"},
    )
    assert response.status_code == 200
    code = FakeMailSender.last_code
    assert code is not None
    response = client.post(
        "/api/auth/verify-email",
        json={"email": email, "code": code},
    )
    assert response.status_code == 200


def test_same_logical_card_id_can_exist_on_different_boards(
    client: TestClient,
) -> None:
    register_and_verify(client, "alice@example.com")
    alice_board = client.get("/api/board").json()
    alice_board["cards"]["card-shared"] = {
        "id": "card-shared",
        "title": "Shared logical id",
        "details": "Alice card",
    }
    alice_board["columns"][0]["cardIds"].append("card-shared")
    assert client.put("/api/board", json=alice_board).status_code == 200
    client.post("/api/logout")

    register_and_verify(client, "bob@example.com")
    bob_board = client.get("/api/board").json()
    bob_board["cards"]["card-shared"] = {
        "id": "card-shared",
        "title": "Shared logical id",
        "details": "Bob card",
    }
    bob_board["columns"][0]["cardIds"].append("card-shared")
    response = client.put("/api/board", json=bob_board)

    assert response.status_code == 200
    assert response.json()["cards"]["card-shared"]["details"] == "Bob card"
