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

export async function logout(): Promise<void> {
  const response = await apiFetch("/api/logout", { method: "POST" });
  if (!response.ok) {
    throw new Error("Failed to log out");
  }
}
