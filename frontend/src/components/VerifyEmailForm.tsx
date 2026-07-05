"use client";

import { useState, type FormEvent } from "react";
import { resendVerificationCode, verifyEmail } from "@/lib/api";

type VerifyEmailFormProps = {
  email?: string;
  onVerified: () => void;
  onBack?: () => void;
};

export const VerifyEmailForm = ({
  email: initialEmail = "",
  onVerified,
  onBack,
}: VerifyEmailFormProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyEmail(code, email.trim() || undefined);
      onVerified();
    } catch {
      setError("Invalid or expired code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError("Email is required to resend a code.");
      return;
    }
    setError(null);
    try {
      await resendVerificationCode(email.trim());
      setMessage("A new code was sent if the account exists.");
    } catch {
      setError("Could not resend code. Try again later.");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <main className="relative w-full max-w-md rounded-[32px] border border-[var(--stroke)] bg-[var(--surface-strong)]/95 p-8 shadow-[var(--shadow)] backdrop-blur">
        <h1 className="font-display text-3xl font-semibold text-[var(--navy-dark)]">
          Verify your email
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--gray-text)]">
          Enter the 6-digit code we sent to your email.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {!initialEmail ? (
            <div>
              <label
                htmlFor="verify-email"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
              >
                Email
              </label>
              <input
                id="verify-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]"
              />
            </div>
          ) : null}
          <div>
            <label
              htmlFor="verify-code"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
            >
              Code
            </label>
            <input
              id="verify-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </div>

          {error ? (
            <p className="text-sm font-medium text-[var(--secondary-purple)]">{error}</p>
          ) : null}
          {message ? (
            <p className="text-sm text-[var(--primary-blue)]">{message}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-[var(--secondary-purple)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-60"
          >
            {isSubmitting ? "Verifying..." : "Verify"}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-2 text-sm">
          <button
            type="button"
            onClick={() => void handleResend()}
            className="text-left text-[var(--primary-blue)] hover:underline"
          >
            Resend code
          </button>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="text-left text-[var(--gray-text)] hover:underline"
            >
              Back to sign in
            </button>
          ) : null}
        </div>
      </main>
    </div>
  );
};
