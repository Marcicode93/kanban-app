"use client";

import { useState, type FormEvent } from "react";
import { forgotPassword, resetPassword } from "@/lib/api";

type ForgotPasswordFormProps = {
  onBack: () => void;
};

export const ForgotPasswordForm = ({ onBack }: ForgotPasswordFormProps) => {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setMessage("If an account exists, a reset code was sent.");
      setStep("reset");
    } catch {
      setError("Could not send reset code. Try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(email.trim(), code, password);
      onBack();
    } catch (err) {
      if (err instanceof Error && err.message.includes("8 characters")) {
        setError(err.message);
      } else {
        setError("Invalid or expired code.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <main className="relative w-full max-w-md rounded-[32px] border border-[var(--stroke)] bg-[var(--surface-strong)]/95 p-8 shadow-[var(--shadow)] backdrop-blur">
        <h1 className="font-display text-3xl font-semibold text-[var(--navy-dark)]">
          {step === "email" ? "Forgot password" : "Reset password"}
        </h1>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="forgot-email"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
              >
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]"
              />
            </div>
            {error ? (
              <p className="text-sm font-medium text-[var(--secondary-purple)]">{error}</p>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-[var(--secondary-purple)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-60"
            >
              Send reset code
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="mt-8 space-y-4">
            {message ? <p className="text-sm text-[var(--primary-blue)]">{message}</p> : null}
            <div>
              <label
                htmlFor="reset-code"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
              >
                Code
              </label>
              <input
                id="reset-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]"
              />
            </div>
            <div>
              <label
                htmlFor="reset-password"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
              >
                New password
              </label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]"
              />
            </div>
            {error ? (
              <p className="text-sm font-medium text-[var(--secondary-purple)]">{error}</p>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-[var(--secondary-purple)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-60"
            >
              Reset password
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={onBack}
          className="mt-6 text-sm text-[var(--primary-blue)] hover:underline"
        >
          Back to sign in
        </button>
      </main>
    </div>
  );
};
