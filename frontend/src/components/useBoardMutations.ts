import { createId, moveCard, type BoardData } from "@/lib/kanban";

export type PendingDelete = {
  columnId: string;
  cardId: string;
  title: string;
} | null;

export const useBoardMutations = (
  board: BoardData | null,
  persistBoard: (next: BoardData, showSuccess?: boolean) => void,
  scheduleRenameSave: (next: BoardData) => void,
  setPendingDelete: (pendingDelete: PendingDelete) => void,
) => {
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
    persistBoard(
      {
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
      },
      true
    );
  };

  const handleMoveCard = (activeId: string, overId: string) => {
    if (!board) {
      return;
    }

    persistBoard(
      {
        ...board,
        columns: moveCard(board.columns, activeId, overId),
      },
      true
    );
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    if (!board) {
      return;
    }

    persistBoard(
      {
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
      },
      true
    );
    setPendingDelete(null);
  };

  const requestDeleteCard = (columnId: string, cardId: string) => {
    const card = board?.cards[cardId];
    if (!card) {
      return;
    }
    setPendingDelete({ columnId, cardId, title: card.title });
  };

  const handleEditCard = (cardId: string, title: string, details: string) => {
    if (!board) {
      return;
    }

    persistBoard(
      {
        ...board,
        cards: {
          ...board.cards,
          [cardId]: { ...board.cards[cardId], title, details },
        },
      },
      true
    );
  };

  return {
    handleAddCard,
    handleDeleteCard,
    handleEditCard,
    handleMoveCard,
    handleRenameColumn,
    requestDeleteCard,
  };
};
