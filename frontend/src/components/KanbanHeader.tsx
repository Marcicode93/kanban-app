import { ThemeToggle } from "@/components/ThemeToggle";
import type { BoardData } from "@/lib/kanban";

type KanbanHeaderProps = {
  board: BoardData;
  displayName: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLogout: () => void | Promise<void>;
  onOpenSettings: () => void;
};

export const KanbanHeader = ({
  board,
  displayName,
  searchQuery,
  onSearchChange,
  onLogout,
  onOpenSettings,
}: KanbanHeaderProps) => (
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
          Keep momentum visible. Rename columns, drag cards between stages, and
          capture quick notes without getting buried in settings.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
            Signed in as
          </p>
          <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
            {displayName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:border-[var(--primary-blue)] hover:text-[var(--navy-dark)]"
          >
            Account
          </button>
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search cards..."
        aria-label="Search cards"
        data-testid="card-search"
        className="w-full rounded-full border border-[var(--stroke)] bg-[var(--surface-elevated)] px-4 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] sm:max-w-xs"
      />
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
    </div>
  </header>
);
