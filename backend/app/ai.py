import json
import os

from openai import OpenAI
from pydantic import BaseModel

from app.schemas import BoardData, ChatMessage

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
AI_MODEL = "openai/gpt-oss-120b"

SYSTEM_PROMPT = """You are a helpful project management assistant for a Kanban board.

The board has exactly 5 columns with fixed IDs:
- col-backlog (Backlog)
- col-discovery (Discovery)
- col-progress (In Progress)
- col-review (Review)
- col-done (Done)

Current board state (JSON):
{board_json}

You can help the user manage cards and columns. You may:
- Rename columns (change title only; keep column IDs unchanged)
- Add, edit, move, or delete cards
- When adding cards, use new unique IDs like card-9, card-10, etc.
- Each card must appear in exactly one column's cardIds list
- All cards referenced in cardIds must exist in the cards object

Respond with JSON only in this shape:
{{
  "message": "your reply to the user",
  "board": null
}}

Set "board" to the complete updated board object (same shape as the current board) only when you are making changes. When making changes, return the FULL board state, not a partial update."""


class AIConfigError(Exception):
    pass


class AIParseError(Exception):
    pass


class AIChatResult(BaseModel):
    message: str
    board: BoardData | None = None


def get_api_key() -> str | None:
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    return key or None


def build_chat_messages(
    board: BoardData,
    history: list[ChatMessage],
    message: str,
) -> list[dict[str, str]]:
    system = SYSTEM_PROMPT.format(board_json=board.model_dump_json())
    messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    for item in history:
        messages.append({"role": item.role, "content": item.content})
    messages.append({"role": "user", "content": message})
    return messages


def parse_chat_response(raw: str) -> AIChatResult:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AIParseError("AI response was not valid JSON") from exc

    if not isinstance(data, dict) or "message" not in data:
        raise AIParseError("AI response missing message field")

    board = None
    if data.get("board") is not None:
        board = BoardData.model_validate(data["board"])

    return AIChatResult(message=str(data["message"]), board=board)


def chat_completion(messages: list[dict[str, str]], *, json_mode: bool = False) -> str:
    api_key = get_api_key()
    if not api_key:
        raise AIConfigError("OPENROUTER_API_KEY is not set")

    client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=api_key)
    kwargs: dict = {"model": AI_MODEL, "messages": messages}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    completion = client.chat.completions.create(**kwargs)
    content = completion.choices[0].message.content
    return content or ""


def chat(prompt: str) -> str:
    return chat_completion([{"role": "user", "content": prompt}])


def chat_with_board(
    board: BoardData,
    history: list[ChatMessage],
    message: str,
) -> AIChatResult:
    messages = build_chat_messages(board, history, message)
    raw = chat_completion(messages, json_mode=True)
    return parse_chat_response(raw)
