import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/LoginForm";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/lib/api", () => ({
  login: vi.fn(),
  register: vi.fn(),
}));

import { login, register } from "@/lib/api";

const defaultProps = {
  onSuccess: vi.fn(),
  onPendingVerification: vi.fn(),
  onForgotPassword: vi.fn(),
};

describe("LoginForm", () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
    vi.mocked(register).mockReset();
  });

  it("shows validation error when fields are empty", async () => {
    renderWithProviders(<LoginForm {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText(/email and password are required/i)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("calls onSuccess after a valid login", async () => {
    vi.mocked(login).mockResolvedValue();
    const onSuccess = vi.fn();

    renderWithProviders(<LoginForm {...defaultProps} onSuccess={onSuccess} />);
    await userEvent.type(screen.getByLabelText(/email/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("user", "password");
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("shows an error for invalid credentials", async () => {
    vi.mocked(login).mockRejectedValue(new Error("Invalid credentials"));

    renderWithProviders(<LoginForm {...defaultProps} />);
    await userEvent.type(screen.getByLabelText(/email/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it("registers a new account and triggers verification", async () => {
    vi.mocked(register).mockResolvedValue({ status: "pending_verification" });
    const onPendingVerification = vi.fn();

    renderWithProviders(
      <LoginForm
        {...defaultProps}
        onPendingVerification={onPendingVerification}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /create one/i }));
    await userEvent.type(screen.getByLabelText(/email/i), "newbie@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith("newbie@example.com", "secret123");
      expect(onPendingVerification).toHaveBeenCalledWith("newbie@example.com");
    });
  });

  it("shows an error when email is already registered", async () => {
    vi.mocked(register).mockRejectedValue(new Error("Email already registered"));

    renderWithProviders(<LoginForm {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /create one/i }));
    await userEvent.type(screen.getByLabelText(/email/i), "taken@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
  });
});
