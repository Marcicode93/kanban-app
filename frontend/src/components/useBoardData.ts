import { useEffect, useRef, useState } from "react";
import { getBoard, saveBoard } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

type ToastState = {
  message: string;
  variant: "error" | "success";
} | null;

export const useBoardData = () => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const saveQueue = useRef(Promise.resolve());
  const renameTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getBoard()
      .then(setBoard)
      .catch(() => setError("Failed to load board."))
      .finally(() => setIsLoading(false));
  }, []);

  const persistBoard = (next: BoardData, showSuccess = false) => {
    setBoard(next);
    saveQueue.current = saveQueue.current
      .then(() => saveBoard(next))
      .then(setBoard)
      .then(() => {
        if (showSuccess) {
          setToast({ message: "Board saved.", variant: "success" });
        }
      })
      .catch(async (err) => {
        if (err instanceof Error && err.message === "Board has changed") {
          await getBoard().then(setBoard).catch(() => undefined);
        }
        setToast({
          message:
            err instanceof Error && err.message === "Board has changed"
              ? "Board changed elsewhere. Reload to see the latest version."
              : "Failed to save board. Please try again.",
          variant: "error",
        });
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

  return {
    board,
    isLoading,
    error,
    toast,
    setToast,
    persistBoard,
    applyBoardFromAI,
    scheduleRenameSave,
  };
};
