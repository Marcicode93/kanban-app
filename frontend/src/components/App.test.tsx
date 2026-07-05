import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@/components/App";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/lib/api", () => ({
  getAuthStatus: vi.fn(),
  logout: vi.fn(),
  getBoard: vi.fn(),
  saveBoard: vi.fn(),
  sendChatMessage: vi.fn(),
}));

import { getAuthStatus, getBoard, logout } from "@/lib/api";
import { initialData } from "@/lib/kanban";

describe("App", () => {
  beforeEach(() => {
    vi.mocked(getAuthStatus).mockReset();
    vi.mocked(logout).mockReset();
    vi.mocked(getBoard).mockResolvedValue(initialData);
  });

  it("shows the login form when unauthenticated", async () => {
    vi.mocked(getAuthStatus).mockResolvedValue({
      authenticated: false,
      username: null,
      email: null,
      email_verified: false,
    });

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows the kanban board when authenticated and verified", async () => {
    vi.mocked(getAuthStatus).mockResolvedValue({
      authenticated: true,
      username: "user",
      email: null,
      email_verified: true,
    });

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: /kanban studio/i })).toBeInTheDocument();
    expect(screen.getByText(/signed in as/i)).toBeInTheDocument();
  });

  it("shows verify screen when authenticated but unverified", async () => {
    vi.mocked(getAuthStatus).mockResolvedValue({
      authenticated: true,
      username: "newbie",
      email: "newbie@example.com",
      email_verified: false,
    });

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: /verify your email/i })).toBeInTheDocument();
  });

  it("returns to login after logout", async () => {
    vi.mocked(getAuthStatus)
      .mockResolvedValueOnce({
        authenticated: true,
        username: "user",
        email: null,
        email_verified: true,
      })
      .mockResolvedValueOnce({
        authenticated: true,
        username: "user",
        email: null,
        email_verified: true,
      });
    vi.mocked(logout).mockResolvedValue();

    renderWithProviders(<App />);
    await screen.findByRole("heading", { name: /kanban studio/i });

    await userEvent.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
    });
  });
});
