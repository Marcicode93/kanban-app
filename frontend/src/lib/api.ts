import type { BoardData } from "@/lib/kanban";

const API_BASE = "";

async function parseError(response: Response, fallback: string): Promise<Error> {
  const body = (await response.json().catch(() => ({}))) as { detail?: string };
  return new Error(body.detail ?? fallback);
}

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
  email: string | null;
  email_verified: boolean;
};

export type AccountInfo = {
  username: string;
  email: string | null;
  email_verified: boolean;
};

export async function getAuthStatus(): Promise<AuthStatus> {
  const response = await apiFetch("/api/auth/me");
  if (!response.ok) {
    throw new Error("Failed to check auth status");
  }
  return response.json();
}

export async function login(email: string, password: string): Promise<void> {
  const response = await apiFetch("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error("Invalid credentials");
  }
}

export type RegisterResult =
  | { status: "pending_verification" }
  | { status: "ok" };

export async function register(
  email: string,
  password: string
): Promise<RegisterResult> {
  const response = await apiFetch("/api/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (response.status === 409) {
    const body = (await response.json()) as { detail?: string };
    throw new Error(body.detail ?? "Registration failed");
  }
  if (response.status === 400) {
    throw await parseError(response, "Registration failed");
  }
  if (response.status === 503) {
    throw await parseError(response, "Could not send verification email");
  }
  if (!response.ok) {
    throw new Error("Registration failed");
  }
  return response.json();
}

export async function verifyEmail(
  code: string,
  email?: string
): Promise<void> {
  const response = await apiFetch("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ code, email }),
  });
  if (!response.ok) {
    throw new Error("Verification failed");
  }
}

export async function resendVerificationCode(email: string): Promise<void> {
  const response = await apiFetch("/api/auth/resend-code", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    throw new Error("Resend failed");
  }
}

export async function forgotPassword(email: string): Promise<void> {
  const response = await apiFetch("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    throw new Error("Forgot password failed");
  }
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  const response = await apiFetch("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, code, new_password: newPassword }),
  });
  if (!response.ok) {
    throw await parseError(response, "Reset failed");
  }
}

export async function getAccount(): Promise<AccountInfo> {
  const response = await apiFetch("/api/account");
  if (!response.ok) {
    throw new Error("Failed to load account");
  }
  return response.json();
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const response = await apiFetch("/api/account/password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!response.ok) {
    throw await parseError(response, "Password change failed");
  }
}

export async function changeEmail(newEmail: string): Promise<void> {
  const response = await apiFetch("/api/account/email", {
    method: "POST",
    body: JSON.stringify({ new_email: newEmail }),
  });
  if (!response.ok) {
    throw await parseError(response, "Email change failed");
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
  if (response.status === 429) {
    throw new Error("AI chat rate limit exceeded");
  }
  if (!response.ok) {
    throw await parseError(response, "Failed to send chat message");
  }
  const data = (await response.json()) as {
    message: string;
    board?: BoardData | null;
  };
  return { message: data.message, board: data.board ?? null };
}
