import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/LoginForm";

vi.mock("@/lib/api", () => ({
  login: vi.fn(),
}));

import { login } from "@/lib/api";

describe("LoginForm", () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
  });

  it("shows validation error when fields are empty", async () => {
    render(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText(/username and password are required/i)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("calls onSuccess after a valid login", async () => {
    vi.mocked(login).mockResolvedValue();
    const onSuccess = vi.fn();

    render(<LoginForm onSuccess={onSuccess} />);
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

    render(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
  });
});
