"use client";

type ConfirmModalProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmModal = ({
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: ConfirmModalProps) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] px-6"
    data-testid="confirm-modal"
  >
    <div className="w-full max-w-md rounded-[32px] border border-[var(--stroke)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow)]">
      <h2 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--gray-text)]">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);
