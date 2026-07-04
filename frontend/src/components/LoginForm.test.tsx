import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/LoginForm";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/lib/api", () => ({
  login: vi.fn(),
  register: vi.fn(),
}));

import { login, register } from "@/lib/api";

describe("LoginForm", () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
    vi.mocked(register).mockReset();
  });

  it("shows validation error when fields are empty", async () => {
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText(/username and password are required/i)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("calls onSuccess after a valid login", async () => {
    vi.mocked(login).mockResolvedValue();
    const onSuccess = vi.fn();

    renderWithProviders(<LoginForm onSuccess={onSuccess} />);
    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("user", "password");
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("shows an error for invalid credentials", async () => {
    vi.mocked(login).mockRejectedValue(new Error("Invalid credentials"));

    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
  });

  it("registers a new account", async () => {
    vi.mocked(register).mockResolvedValue();
    const onSuccess = vi.fn();

    renderWithProviders(<LoginForm onSuccess={onSuccess} />);
    await userEvent.click(screen.getByRole("button", { name: /create one/i }));
    await userEvent.type(screen.getByLabelText(/username/i), "newbie");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith("newbie", "secret123");
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("shows an error when username is taken", async () => {
    vi.mocked(register).mockRejectedValue(new Error("Username already taken"));

    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /create one/i }));
    await userEvent.type(screen.getByLabelText(/username/i), "taken");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/username already taken/i)).toBeInTheDocument();
  });
});
