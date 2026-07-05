"use client";

import { useState, type FormEvent } from "react";
import type { Card } from "@/lib/kanban";

type CardEditModalProps = {
  card: Card | null;
  onClose: () => void;
  onSave: (cardId: string, title: string, details: string) => void;
};

const CardEditForm = ({
  card,
  onClose,
  onSave,
}: {
  card: Card;
  onClose: () => void;
  onSave: (cardId: string, title: string, details: string) => void;
}) => {
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    onSave(card.id, title.trim(), details.trim() || "No details yet.");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] px-6"
      data-testid="card-edit-modal"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-[32px] border border-[var(--stroke)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow)]"
      >
        <h2 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
          Edit card
        </h2>
        <div className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="edit-card-title"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
            >
              Title
            </label>
            <input
              id="edit-card-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
            />
          </div>
          <div>
            <label
              htmlFor="edit-card-details"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
            >
              Details
            </label>
            <textarea
              id="edit-card-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export const CardEditModal = ({ card, onClose, onSave }: CardEditModalProps) => {
  if (!card) {
    return null;
  }

  return <CardEditForm key={card.id} card={card} onClose={onClose} onSave={onSave} />;
};
