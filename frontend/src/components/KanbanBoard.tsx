"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { ChatSidebar } from "@/components/ChatSidebar";
import { BoardSkeleton } from "@/components/BoardSkeleton";
import { CardEditModal } from "@/components/CardEditModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toast } from "@/components/Toast";
import { getBoard, saveBoard } from "@/lib/api";
import { createId, moveCard, type BoardData } from "@/lib/kanban";

export const KanbanBoard = ({
  username,
  onLogout,
}: {
  username: string;
  onLogout: () => void | Promise<void>;
}) => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const renameTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  useEffect(() => {
    getBoard()
      .then(setBoard)
      .catch(() => setError("Failed to load board."))
      .finally(() => setIsLoading(false));
  }, []);

  const persistBoard = (next: BoardData) => {
    setBoard(next);
    saveQueue.current = saveQueue.current
      .then(() => saveBoard(next))
      .then(setBoard)
      .catch(() => {
        setToastMessage("Failed to save board. Please try again.");
      });
  };

  const applyBoardFromAI = (next: BoardData) => {
    setBoard(next);
    setError(null);
  };

  const scheduleRenameSave = (next: BoardData) => {
    setBoard(next);
    if (renameTimeout.current) {
      clearTimeout(renameTimeout.current);
    }
    renameTimeout.current = setTimeout(() => {
      persistBoard(next);
    }, 400);
  };

  const cardsById = useMemo(() => board?.cards ?? {}, [board]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!board || !over || active.id === over.id) {
      return;
    }

    persistBoard({
      ...board,
      columns: moveCard(board.columns, active.id as string, over.id as string),
    });
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    if (!board) {
      return;
    }

    scheduleRenameSave({
      ...board,
      columns: board.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    });
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    if (!board) {
      return;
    }

    const id = createId("card");
    persistBoard({
      ...board,
      cards: {
        ...board.cards,
        [id]: { id, title, details: details || "No details yet." },
      },
      columns: board.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    });
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    if (!board) {
      return;
    }

    persistBoard({
      ...board,
      cards: Object.fromEntries(
        Object.entries(board.cards).filter(([id]) => id !== cardId)
      ),
      columns: board.columns.map((column) =>
        column.id === columnId
          ? {
              ...column,
              cardIds: column.cardIds.filter((id) => id !== cardId),
            }
          : column
      ),
    });
  };

  const handleEditCard = (cardId: string, title: string, details: string) => {
    if (!board) {
      return;
    }

    persistBoard({
      ...board,
      cards: {
        ...board.cards,
        [cardId]: { ...board.cards[cardId], title, details },
      },
    });
  };

  if (isLoading) {
    return <BoardSkeleton />;
  }

  if (error || !board) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--secondary-purple)]">
        {error ?? "Failed to load board."}
      </div>
    );
  }

  const activeCard = activeCardId ? cardsById[activeCardId] : null;
  const editingCard = editingCardId ? cardsById[editingCardId] : null;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-[1800px] flex-col gap-6 px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10 lg:flex-row lg:items-start">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 lg:gap-8">
        <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-[var(--surface-strong)]/90 p-6 shadow-[var(--shadow)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                Single Board Kanban
              </p>
              <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)] sm:text-4xl">
                Kanban Studio
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
                Keep momentum visible. Rename columns, drag cards between stages,
                and capture quick notes without getting buried in settings.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                  Signed in as
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
                  {username}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => void onLogout()}
                  className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:border-[var(--primary-blue)] hover:text-[var(--navy-dark)]"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
                {column.title}
              </div>
            ))}
          </div>
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <section className="board-columns gap-4 overflow-x-auto pb-2 sm:gap-5 lg:gap-6 board:overflow-x-visible">
            {board.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={column.cardIds.map((cardId) => board.cards[cardId])}
                onRename={handleRenameColumn}
                onAddCard={handleAddCard}
                onDeleteCard={handleDeleteCard}
                onEditCard={setEditingCardId}
              />
            ))}
          </section>
          <DragOverlay>
            {activeCard ? (
              <div className="w-[260px]">
                <KanbanCardPreview card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        </div>

        <ChatSidebar onBoardUpdate={applyBoardFromAI} />
      </main>

      <CardEditModal
        card={editingCard ?? null}
        onClose={() => setEditingCardId(null)}
        onSave={handleEditCard}
      />
      {toastMessage ? (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      ) : null}
    </div>
  );
};
