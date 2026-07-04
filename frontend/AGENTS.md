# Frontend — Kanban Studio

## Overview

A Next.js 16 App Router app with a persistent Kanban board backed by the FastAPI API.

## Tech stack

- **Next.js 16** with App Router (`src/app/`)
- **React 19**
- **Tailwind CSS 4** via `@import "tailwindcss"` in `globals.css`
- **@dnd-kit** for drag and drop (`core`, `sortable`, `utilities`)
- **Vitest** + **Testing Library** for unit/component tests
- **Playwright** for E2E tests

## Directory layout

```
src/
  app/
    layout.tsx    # Root layout, Google fonts, metadata
    page.tsx      # Renders <KanbanBoard />
    globals.css   # CSS variables (color scheme), Tailwind theme
  components/
    KanbanBoard.tsx       # Main board; owns all state and handlers
    KanbanColumn.tsx      # Single column with droppable + sortable cards
    KanbanCard.tsx        # Sortable card with delete button
    KanbanCardPreview.tsx # Drag overlay preview (no delete button)
    NewCardForm.tsx       # Collapsible add-card form per column
    ChatSidebar.tsx       # AI chat sidebar (always visible in layout)
    CardEditModal.tsx     # Modal to edit card title/details
    Toast.tsx             # Error feedback toast
    BoardSkeleton.tsx     # Loading skeleton for board
    ThemeToggle.tsx       # Light/dark mode toggle
    LoginForm.tsx         # Sign-in and registration form
    App.tsx               # Auth gate; renders LoginForm or KanbanBoard
  lib/
    kanban.ts             # Types, initialData, moveCard, createId
    api.ts                # Auth, board, and AI chat API helpers
    theme.tsx             # ThemeProvider and useTheme (dark mode)
  test/
    setup.ts              # Vitest + jest-dom setup
tests/
  auth.spec.ts            # Login/logout E2E
  register.spec.ts        # Registration and card edit E2E
```

## Data model (`src/lib/kanban.ts`)

```ts
Card     = { id, title, details }
Column   = { id, title, cardIds: string[] }
BoardData = { columns: Column[], cards: Record<string, Card> }
```

Cards are stored in a flat `cards` map; columns reference card IDs in order. This normalized shape keeps drag-and-drop reordering simple.

**`initialData`** — five fixed columns with eight seed cards:

| Column ID       | Default title  |
|-----------------|----------------|
| `col-backlog`   | Backlog        |
| `col-discovery` | Discovery      |
| `col-progress`  | In Progress    |
| `col-review`    | Review         |
| `col-done`      | Done           |

Column count and IDs are fixed; only titles are editable (rename). Cards can be added, deleted, and moved.

**`moveCard(columns, activeId, overId)`** — pure function handling:
- Reorder within the same column (drop on another card or on the column itself)
- Move across columns (drop on a card or empty column)

**`createId(prefix)`** — generates IDs like `card-abc123xyz`.

## Component responsibilities

### `KanbanBoard`

- Holds `board: BoardData` state loaded from `GET /api/board`
- Persists changes via `PUT /api/board` (debounced for column renames)
- Renders `ChatSidebar` alongside the board (side-by-side from `md` up; stacked on small screens with chat always visible)
- Applies AI board updates via `applyBoardFromAI` (no extra save; backend already persisted)
- Wraps columns in `DndContext` with `PointerSensor` (6px activation distance)
- Handlers: `handleDragStart/End`, `handleRenameColumn`, `handleAddCard`, `handleDeleteCard`, `handleEditCard`
- Shows `BoardSkeleton` while loading; `Toast` on save errors
- Renders header with column title pills and a 5-column responsive grid (horizontal scroll on mobile)

### `ChatSidebar`

- Message list with user/assistant bubbles
- Calls `POST /api/ai/chat` on send; maintains local conversation history
- Shows loading state and error messages
- Invokes `onBoardUpdate` when the AI response includes an updated board

### `KanbanColumn`

- `useDroppable` on the column container (`data-testid="column-{id}"`)
- Inline `<input>` for column title rename
- `SortableContext` with `verticalListSortingStrategy` for cards
- Empty-state placeholder ("Drop a card here")
- `NewCardForm` at the bottom

### `KanbanCard`

- `useSortable` for drag handle (entire card is draggable)
- Displays title + details; "Edit" and "Remove" buttons
- `data-testid="card-{id}"`

### `CardEditModal`

- Modal form for editing card title and details
- Save calls `onSave`; cancel closes without persisting

### `LoginForm`

- Toggle between Sign in and Create account
- Registration calls `POST /api/register`; auto sign-in on success

### `NewCardForm`

- Toggle between "Add a card" button and a title/details form
- Title required; details optional (defaults to "No details yet." on the board)

## Styling

CSS variables in `globals.css` match the project color scheme from the root `AGENTS.md`:

| Variable            | Value     | Usage                          |
|---------------------|-----------|--------------------------------|
| `--accent-yellow`   | `#ecad0a` | Accents, column indicators     |
| `--primary-blue`    | `#209dd7` | Links, focus rings             |
| `--secondary-purple`| `#753991` | Submit buttons (Add card)      |
| `--navy-dark`       | `#032147` | Headings, body text              |
| `--gray-text`       | `#888888` | Labels, supporting text        |

Fonts: **Space Grotesk** (display) and **Manrope** (body) via `next/font/google`.

## Scripts

| Command              | Purpose                    |
|----------------------|----------------------------|
| `npm run dev`        | Next.js dev server         |
| `npm run build`      | Production static build    |
| `npm run test:unit`  | Vitest unit/component tests|
| `npm run test:e2e`   | Playwright E2E tests       |
| `npm run test:all`   | Both test suites           |

## Existing tests

**Unit (`src/lib/kanban.test.ts`)** — `moveCard`: same-column reorder, cross-column move, drop to column end.

**Component (`src/components/KanbanBoard.test.tsx`)** — renders 5 columns, renames a column, adds and removes a card, edits a card via modal, renders chat sidebar.

**Component (`src/components/LoginForm.test.tsx`)** — sign-in, registration, validation errors.

**Component (`src/components/ChatSidebar.test.tsx`)** — sends messages, displays AI replies, applies board updates, shows errors.

**E2E (`tests/kanban.spec.ts`)** — loads board, adds a card, drags a card between columns via mouse events.

**E2E (`tests/register.spec.ts`)** — registers a new user with empty board; edits a card title.

**E2E (`tests/auth.spec.ts`)** — login, invalid credentials, logout.

**E2E (`tests/chat.spec.ts`)** — sends a chat message and receives a response; AI adds a card to the board (requires `OPENROUTER_API_KEY`).

## Integration notes for later parts

- `BoardData` is the canonical board shape; the backend schema (Part 5) should align with it.
- `KanbanBoard` state/handlers will need to call API endpoints instead of local `setBoard` (Part 7).
- New UI (login page, AI sidebar) should reuse existing CSS variables and component patterns.
- `output: 'export'` in `next.config.ts` — static build output goes to `out/`, copied into `backend/static/` in Docker.
