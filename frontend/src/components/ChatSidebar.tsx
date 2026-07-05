"use client";

import { useRef, useState, type FormEvent } from "react";
import { sendChatMessage, type ChatMessage } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

type ChatSidebarProps = {
  onBoardUpdate: (board: BoardData) => void;
};

export const ChatSidebar = ({ onBoardUpdate }: ChatSidebarProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) {
      return;
    }

    setInput("");
    setError(null);
    const history = messages;
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(trimmed, history);
      setMessages([
        ...nextMessages,
        { role: "assistant", content: response.message },
      ]);
      if (response.board) {
        onBoardUpdate(response.board);
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message.toLowerCase().includes("rate limit")
          ? "AI chat limit reached (10/hour). Try again later."
          : "Failed to get AI response. Please try again.";
      setError(message);
      setMessages(history);
      setInput(trimmed);
    } finally {
      setIsLoading(false);
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }
  };

  return (
    <aside
      data-testid="chat-sidebar"
      className="flex h-[min(42vh,420px)] min-h-[280px] w-full shrink-0 flex-col overflow-hidden rounded-3xl border border-[var(--stroke)] bg-[var(--surface-strong)] shadow-[var(--shadow)] lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:max-h-[calc(100vh-3rem)] lg:w-[300px] lg:min-w-[300px] xl:w-[340px] 2xl:w-[380px] 2xl:max-w-[400px]"
    >
      <div className="flex items-center justify-between border-b border-[var(--stroke)] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
            AI Assistant
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold text-[var(--navy-dark)]">
            Board chat
          </h2>
        </div>
        <button
          type="button"
          data-testid="chat-clear"
          disabled={messages.length === 0 && !error}
          onClick={() => {
            setMessages([]);
            setError(null);
            setInput("");
          }}
          className="rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:border-[var(--primary-blue)] hover:text-[var(--navy-dark)] disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
        data-testid="chat-messages"
      >
        {messages.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--gray-text)]">
            Ask me to add, move, or edit cards and columns on your board.
          </p>
        ) : null}
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            data-testid={
              message.role === "user"
                ? "chat-message-user"
                : "chat-message-assistant"
            }
            className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${
              message.role === "user"
                ? "ml-auto bg-[var(--primary-blue)] text-white"
                : "mr-auto border border-[var(--stroke)] bg-[var(--surface-elevated)] text-[var(--navy-dark)]"
            }`}
          >
            {message.content}
          </div>
        ))}
        {isLoading ? (
          <div
            className="mr-auto max-w-[90%] animate-pulse rounded-2xl border border-[var(--stroke)] bg-[var(--surface-elevated)] px-4 py-3"
            data-testid="chat-loading"
          >
            <div className="h-3 w-24 rounded bg-[var(--stroke)]" />
            <div className="mt-2 h-3 w-40 rounded bg-[var(--stroke)]" />
          </div>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-[var(--stroke)] px-5 py-4"
      >
        {error ? (
          <p className="mb-3 text-sm font-medium text-[var(--secondary-purple)]">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <input
            data-testid="chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about your board..."
            disabled={isLoading}
            className="min-w-0 flex-1 rounded-xl border border-[var(--stroke)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] disabled:opacity-60"
          />
          <button
            type="submit"
            data-testid="chat-submit"
            disabled={isLoading || !input.trim()}
            className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
    </aside>
  );
};
