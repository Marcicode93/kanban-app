import json
import os
from pathlib import Path

import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient

from app.ai import build_chat_messages, parse_chat_response
from app.db.seed import INITIAL_BOARD
from app.schemas import BoardData, ChatMessage

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")


def login(client: TestClient) -> None:
    response = client.post(
        "/api/login", json={"username": "user", "password": "password"}
    )
    assert response.status_code == 200


def test_ai_test_missing_api_key(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    response = client.post("/api/ai/test")
    assert response.status_code == 503
    assert response.json()["detail"] == "OPENROUTER_API_KEY is not set"


@pytest.mark.skipif(
    not os.environ.get("OPENROUTER_API_KEY", "").strip(),
    reason="OPENROUTER_API_KEY not set",
)
def test_ai_test_openrouter_integration(client: TestClient) -> None:
    response = client.post("/api/ai/test")
    assert response.status_code == 200
    body = response.json()
    assert "response" in body
    assert "4" in body["response"]


def test_build_chat_messages_includes_board_and_user_message() -> None:
    board = INITIAL_BOARD
    messages = build_chat_messages(board, [], "Add a card called X to Backlog")

    assert messages[0]["role"] == "system"
    assert board.model_dump_json() in messages[0]["content"]
    assert messages[-1] == {
        "role": "user",
        "content": "Add a card called X to Backlog",
    }


def test_build_chat_messages_includes_history() -> None:
    history = [
        ChatMessage(role="user", content="Hi"),
        ChatMessage(role="assistant", content="Hello"),
    ]
    messages = build_chat_messages(INITIAL_BOARD, history, "Move card Y to Done")

    assert messages[1:] == [
        {"role": "user", "content": "Hi"},
        {"role": "assistant", "content": "Hello"},
        {"role": "user", "content": "Move card Y to Done"},
    ]


def test_parse_chat_response_without_board() -> None:
    result = parse_chat_response(
        json.dumps({"message": "No changes needed", "board": None})
    )
    assert result.message == "No changes needed"
    assert result.board is None


def test_parse_chat_response_with_board() -> None:
    board = INITIAL_BOARD.model_copy(deep=True)
    result = parse_chat_response(
        json.dumps({"message": "Added card", "board": board.model_dump(by_alias=True)})
    )
    assert result.message == "Added card"
    assert result.board == board


def test_ai_chat_requires_authentication(client: TestClient) -> None:
    response = client.post(
        "/api/ai/chat",
        json={"message": "Hello", "history": []},
    )
    assert response.status_code == 401


def test_ai_chat_prompt_includes_board_and_message(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    captured: dict[str, list[dict[str, str]]] = {}

    def fake_chat_with_board(board, history, message):
        from app.ai import AIChatResult

        captured["messages"] = build_chat_messages(board, history, message)
        return AIChatResult(message="OK")

    monkeypatch.setattr("app.main.chat_with_board", fake_chat_with_board)
    login(client)
    board = client.get("/api/board").json()

    response = client.post(
        "/api/ai/chat",
        json={"message": "What is on the board?", "history": []},
    )
    assert response.status_code == 200
    assert response.json() == {"message": "OK", "board": None}

    system = captured["messages"][0]["content"]
    assert BoardData.model_validate(board).model_dump_json() in system
    assert captured["messages"][-1]["content"] == "What is on the board?"


def test_ai_chat_board_update_persists(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def fake_chat_with_board(board, history, message):
        from app.ai import AIChatResult

        data = board.model_dump(by_alias=True)
        data["cards"]["card-9"] = {
            "id": "card-9",
            "title": "New task",
            "details": "Added by AI",
        }
        data["columns"][0]["cardIds"] = ["card-9", *data["columns"][0]["cardIds"]]
        updated = BoardData.model_validate(data)
        return AIChatResult(message="Added card-9 to Backlog", board=updated)

    monkeypatch.setattr("app.main.chat_with_board", fake_chat_with_board)
    login(client)

    response = client.post(
        "/api/ai/chat",
        json={"message": "Add a card called New task to Backlog", "history": []},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Added card-9 to Backlog"
    assert "card-9" in response.json()["board"]["cards"]

    board = client.get("/api/board").json()
    assert "card-9" in board["cards"]
    assert board["cards"]["card-9"]["title"] == "New task"


def test_ai_chat_without_board_update_leaves_db_unchanged(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def fake_chat_with_board(board, history, message):
        from app.ai import AIChatResult

        return AIChatResult(message="Just chatting")

    monkeypatch.setattr("app.main.chat_with_board", fake_chat_with_board)
    login(client)
    before = client.get("/api/board").json()

    response = client.post(
        "/api/ai/chat",
        json={"message": "How are you?", "history": []},
    )
    assert response.status_code == 200
    assert response.json() == {"message": "Just chatting", "board": None}
    assert client.get("/api/board").json() == before


def test_ai_chat_includes_multi_turn_history(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    captured: dict[str, list[dict[str, str]]] = {}

    def fake_chat_with_board(board, history, message):
        from app.ai import AIChatResult

        captured["messages"] = build_chat_messages(board, history, message)
        return AIChatResult(message="Done")

    monkeypatch.setattr("app.main.chat_with_board", fake_chat_with_board)
    login(client)
    history = [
        {"role": "user", "content": "Add a card called X to Backlog"},
        {"role": "assistant", "content": "Added card X to Backlog."},
    ]

    response = client.post(
        "/api/ai/chat",
        json={"message": "Move card Y to Done", "history": history},
    )
    assert response.status_code == 200
    assert captured["messages"][1:3] == history
    assert captured["messages"][-1]["content"] == "Move card Y to Done"
