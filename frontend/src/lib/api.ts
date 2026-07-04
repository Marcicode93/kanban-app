import type { BoardData } from "@/lib/kanban";

const API_BASE = "";

async function apiFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return response;
}

export type AuthStatus = {
  authenticated: boolean;
  username: string | null;
};

export async function getAuthStatus(): Promise<AuthStatus> {
  const response = await apiFetch("/api/auth/me");
  if (!response.ok) {
    throw new Error("Failed to check auth status");
  }
  return response.json();
}

export async function login(username: string, password: string): Promise<void> {
  const response = await apiFetch("/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error("Invalid credentials");
  }
}

export async function register(username: string, password: string): Promise<void> {
  const response = await apiFetch("/api/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (response.status === 409) {
    throw new Error("Username already taken");
  }
  if (!response.ok) {
    throw new Error("Registration failed");
  }
}

export async function logout(): Promise<void> {
  const response = await apiFetch("/api/logout", { method: "POST" });
  if (!response.ok) {
    throw new Error("Failed to log out");
  }
}

export async function getBoard(): Promise<BoardData> {
  const response = await apiFetch("/api/board");
  if (!response.ok) {
    throw new Error("Failed to load board");
  }
  return response.json();
}

export async function saveBoard(board: BoardData): Promise<BoardData> {
  const response = await apiFetch("/api/board", {
    method: "PUT",
    body: JSON.stringify(board),
  });
  if (!response.ok) {
    throw new Error("Failed to save board");
  }
  return response.json();
}

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AIChatResponse = {
  message: string;
  board: BoardData | null;
};

export async function sendChatMessage(
  message: string,
  history: ChatMessage[]
): Promise<AIChatResponse> {
  const response = await apiFetch("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      detail?: string;
    };
    throw new Error(body.detail ?? "Failed to send chat message");
  }
  const data = (await response.json()) as {
    message: string;
    board?: BoardData | null;
  };
  return { message: data.message, board: data.board ?? null };
}
