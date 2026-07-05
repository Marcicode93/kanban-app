"use client";

import { useState, type FormEvent } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";

type AuthFormProps = {
  onSuccess: () => void;
  onPendingVerification: (email: string) => void;
  onForgotPassword: () => void;
};

type Mode = "login" | "register";

const MIN_PASSWORD_LENGTH = 8;

export const LoginForm = ({
  onSuccess,
  onPendingVerification,
  onForgotPassword,
}: AuthFormProps) => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    if (mode === "register" && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const api = await import("@/lib/api");
      if (mode === "login") {
        await api.login(email.trim(), password);
        onSuccess();
      } else {
        const result = await api.register(email.trim(), password);
        if (result.status === "pending_verification") {
          onPendingVerification(email.trim().toLowerCase());
        } else {
          onSuccess();
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("Email already registered")) {
          setError("Email already registered.");
        } else if (err.message.includes("8 characters")) {
          setError(err.message);
        } else if (err.message.includes("Could not send verification email")) {
          setError(err.message);
        } else if (mode === "login") {
          setError("Invalid email or password.");
        } else {
          setError(err.message || "Registration failed. Please try again.");
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </div>
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative w-full max-w-md rounded-[32px] border border-[var(--stroke)] bg-[var(--surface-strong)]/95 p-8 shadow-[var(--shadow)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
          Project Management
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)]">
          {mode === "login" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--gray-text)]">
          {mode === "login"
            ? "Sign in with your email and password. Demo account: user / password."
            : "Register with email verification to get your own Kanban board."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
            >
              Email
            </label>
            <input
              id="email"
              type={mode === "register" ? "email" : "text"}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
              autoComplete="email"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error ? (
            <p className="text-sm font-medium text-[var(--secondary-purple)]">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-[var(--secondary-purple)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {isSubmitting
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-2 text-sm">
          <button
            type="button"
            onClick={toggleMode}
            className="text-left text-[var(--primary-blue)] transition hover:underline"
          >
            {mode === "login"
              ? "Need an account? Create one"
              : "Already have an account? Sign in"}
          </button>
          {mode === "login" ? (
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-left text-[var(--gray-text)] transition hover:underline"
            >
              Forgot password?
            </button>
          ) : null}
        </div>
      </main>
    </div>
  );
};
