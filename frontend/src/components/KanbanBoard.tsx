"use client";

import { useMemo, useState } from "react";
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
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { CardEditModal } from "@/components/CardEditModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { KanbanHeader } from "@/components/KanbanHeader";
import { Toast } from "@/components/Toast";
import { useBoardData } from "@/components/useBoardData";
import {
  type PendingDelete,
  useBoardMutations,
} from "@/components/useBoardMutations";

export const KanbanBoard = ({
  displayName,
  onLogout,
  onOpenSettings,
}: {
  displayName: string;
  onLogout: () => void | Promise<void>;
  onOpenSettings: () => void;
}) => {
  const {
    board,
    isLoading,
    error,
    toast,
    setToast,
    persistBoard,
    applyBoardFromAI,
    scheduleRenameSave,
  } = useBoardData();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("pm-onboarding-dismissed") !== "true"
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const {
    handleAddCard,
    handleDeleteCard,
    handleEditCard,
    handleMoveCard,
    handleRenameColumn,
    requestDeleteCard,
  } = useBoardMutations(
    board,
    persistBoard,
    scheduleRenameSave,
    setPendingDelete
  );

  const cardsById = useMemo(() => board?.cards ?? {}, [board]);

  const displayBoard = useMemo(() => {
    if (!board) {
      return null;
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return board;
    }

    const matchingIds = new Set(
      Object.values(board.cards)
        .filter(
          (card) =>
            card.title.toLowerCase().includes(query) ||
            card.details.toLowerCase().includes(query)
        )
        .map((card) => card.id)
    );

    return {
      ...board,
      columns: board.columns.map((column) => ({
        ...column,
        cardIds: column.cardIds.filter((id) => matchingIds.has(id)),
      })),
    };
  }, [board, searchQuery]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!board || !over || active.id === over.id) {
      return;
    }

    handleMoveCard(active.id as string, over.id as string);
  };

  if (isLoading) {
    return <BoardSkeleton />;
  }

  if (error || !board || !displayBoard) {
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
          <KanbanHeader
            board={board}
            displayName={displayName}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onLogout={onLogout}
            onOpenSettings={onOpenSettings}
          />

          {showOnboarding ? (
            <OnboardingBanner
              onDismiss={() => {
                localStorage.setItem("pm-onboarding-dismissed", "true");
                setShowOnboarding(false);
              }}
            />
          ) : null}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <section className="board-columns gap-4 overflow-x-auto pb-2 sm:gap-5 lg:gap-6 board:overflow-x-visible">
              {displayBoard.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={column.cardIds.map((cardId) => board.cards[cardId])}
                  onRename={handleRenameColumn}
                  onAddCard={handleAddCard}
                  onDeleteCard={requestDeleteCard}
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
      {pendingDelete ? (
        <ConfirmModal
          title="Delete card"
          message={`Remove "${pendingDelete.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() =>
            handleDeleteCard(pendingDelete.columnId, pendingDelete.cardId)
          }
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  );
};
