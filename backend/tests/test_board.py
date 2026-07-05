import pytest
from fastapi.testclient import TestClient

from app.db.seed import INITIAL_BOARD


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
