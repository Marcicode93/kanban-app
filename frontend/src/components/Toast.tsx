"use client";

type ToastProps = {
  message: string;
  onDismiss: () => void;
};

export const Toast = ({ message, onDismiss }: ToastProps) => (
  <div
    role="alert"
    data-testid="toast"
    className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border border-[var(--stroke)] bg-[var(--navy-dark)] px-5 py-3 text-sm text-white shadow-[var(--shadow)]"
  >
    <span>{message}</span>
    <button
      type="button"
      onClick={onDismiss}
      className="text-xs font-semibold uppercase tracking-wide text-white/80 hover:text-white"
    >
      Dismiss
    </button>
  </div>
);
