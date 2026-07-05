"use client";

type ToastVariant = "error" | "success";

type ToastProps = {
  message: string;
  variant?: ToastVariant;
  onDismiss: () => void;
};

export const Toast = ({
  message,
  variant = "error",
  onDismiss,
}: ToastProps) => (
  <div
    role="alert"
    data-testid="toast"
    data-variant={variant}
    className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border px-5 py-3 text-sm shadow-[var(--shadow)] ${
      variant === "success"
        ? "border-[var(--primary-blue)] bg-[var(--primary-blue)] text-white"
        : "border-[var(--stroke)] bg-[var(--navy-dark)] text-white"
    }`}
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
