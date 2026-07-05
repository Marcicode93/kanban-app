"use client";

type OnboardingBannerProps = {
  onDismiss: () => void;
};

export const OnboardingBanner = ({ onDismiss }: OnboardingBannerProps) => (
  <div
    className="rounded-2xl border border-[var(--primary-blue)] bg-[var(--surface-elevated)] px-5 py-4"
    data-testid="onboarding-banner"
  >
    <p className="text-sm leading-6 text-[var(--navy-dark)]">
      Drag cards between columns, rename columns, add cards, and ask the AI to
      update your board.
    </p>
    <button
      type="button"
      onClick={onDismiss}
      className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--primary-blue)]"
    >
      Got it
    </button>
  </div>
);
