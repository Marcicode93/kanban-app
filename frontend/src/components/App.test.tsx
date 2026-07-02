import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@/components/App";

vi.mock("@/lib/api", () => ({
  getAuthStatus: vi.fn(),
  logout: vi.fn(),
}));

import { getAuthStatus, logout } from "@/lib/api";

describe("App", () => {
  beforeEach(() => {
    vi.mocked(getAuthStatus).mockReset();
    vi.mocked(logout).mockReset();
  });

  it("shows the login form when unauthenticated", async () => {
    vi.mocked(getAuthStatus).mockResolvedValue({
      authenticated: false,
      username: null,
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows the kanban board when authenticated", async () => {
    vi.mocked(getAuthStatus).mockResolvedValue({
      authenticated: true,
      username: "user",
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: /kanban studio/i })).toBeInTheDocument();
    expect(screen.getByText(/signed in as/i)).toBeInTheDocument();
  });

  it("returns to login after logout", async () => {
    vi.mocked(getAuthStatus)
      .mockResolvedValueOnce({ authenticated: true, username: "user" })
      .mockResolvedValueOnce({ authenticated: true, username: "user" });
    vi.mocked(logout).mockResolvedValue();

    render(<App />);
    await screen.findByRole("heading", { name: /kanban studio/i });

    await userEvent.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
    });
    expect(screen.queryByRole("heading", { name: /kanban studio/i })).not.toBeInTheDocument();
  });
});
