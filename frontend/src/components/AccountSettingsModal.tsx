"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  changeEmail,
  changePassword,
  getAccount,
  type AccountInfo,
} from "@/lib/api";

type AccountSettingsModalProps = {
  onClose: () => void;
  onNeedsVerification: () => void;
};

export const AccountSettingsModal = ({
  onClose,
  onNeedsVerification,
}: AccountSettingsModalProps) => {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getAccount()
      .then(setAccount)
      .catch(() => setError("Failed to load account."));
  }, []);

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
      setMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update password."
      );
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await changeEmail(newEmail.trim());
      onNeedsVerification();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update email.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] px-6"
      data-testid="account-settings-modal"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[32px] border border-[var(--stroke)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow)]">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
            Account settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
          >
            Close
          </button>
        </div>

        {account ? (
          <p className="mt-2 text-sm text-[var(--gray-text)]">
            {account.email ?? account.username}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm font-medium text-[var(--secondary-purple)]">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 text-sm text-[var(--primary-blue)]">{message}</p>
        ) : null}

        <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            Change password
          </h3>
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]"
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]"
          />
          <button
            type="submit"
            className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Update password
          </button>
        </form>

        <form onSubmit={handleEmailSubmit} className="mt-8 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            Change email
          </h3>
          <input
            type="email"
            placeholder="New email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]"
          />
          <button
            type="submit"
            className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--navy-dark)]"
          >
            Send verification to new email
          </button>
        </form>
      </div>
    </div>
  );
};
