# Database design

SQLite database for the PM MVP. Schema definition: [schema.json](./schema.json).

## Overview

Four normalized tables: `users`, `boards`, `columns`, `cards`. The API exposes board state as `BoardData` JSON (matching `frontend/src/lib/kanban.ts`); the backend maps between that shape and the database.

| Decision | Choice |
|----------|--------|
| Engine | SQLite |
| File | `data/pm.db` (created on first startup if missing) |
| ORM | SQLAlchemy (Part 6) |
| Users | Table supports multiple users; MVP seeds one (`user`) |
| Boards | One board per user (unique `user_id` on `boards`) |
| Columns | Five fixed per board; stable string IDs; titles renameable |
| Cards | Belong to one column; order via `position` |

## Entity relationships

```
users 1──1 boards 1──* columns 1──* cards
```

- A **user** owns exactly one **board** (MVP constraint).
- A **board** has exactly five **columns** (created at seed time; no add/remove in MVP).
- A **card** belongs to one **column**. Moving a card updates `column_id` and `position`.

## Tables

### users

Stores credentials for sign-in. Part 4 uses hardcoded auth; Part 6 will validate against `password_hash`.

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| username | TEXT UNIQUE | e.g. `user` |
| password_hash | TEXT | bcrypt hash of plaintext password |

### boards

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| user_id | INTEGER UNIQUE FK | One board per user |

### columns

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | Fixed IDs: `col-backlog`, `col-discovery`, `col-progress`, `col-review`, `col-done` |
| board_id | INTEGER FK | Parent board |
| title | TEXT | Renameable display label |
| position | INTEGER | 0-4, unique per board |

### cards

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | e.g. `card-1` or generated `card-abc123` |
| column_id | TEXT FK | Current column |
| title | TEXT | Card heading |
| details | TEXT | Card body (default empty string) |
| position | INTEGER | Order within column, unique per column |

## BoardData mapping

The frontend uses a denormalized `BoardData` object:

```ts
type BoardData = {
  columns: { id: string; title: string; cardIds: string[] }[];
  cards: Record<string, { id: string; title: string; details: string }>;
};
```

### Database to API (`GET /api/board`)

1. Find the board for the authenticated user.
2. Select columns `ORDER BY position`.
3. Select cards for those columns `ORDER BY column_id, position`.
4. Build `cards` as a map keyed by card id.
5. For each column, set `cardIds` to the ordered list of card ids in that column.

### API to database (`PUT /api/board`)

Full board snapshot replace (simple, matches Part 6 plan):

1. Verify all five expected column ids are present.
2. Upsert column titles and positions.
3. For each column, reconcile cards: update titles/details, update `column_id`/`position` for moves, insert new cards, delete removed cards.

## Seeding

On first startup when the database is empty:

1. Insert user `user` with bcrypt hash of `password`.
2. Create a board for that user.
3. Insert five default columns (ids and titles from `schema.json` seed).
4. Insert cards from `initialData` in `frontend/src/lib/kanban.ts` (positions derived from each column's `cardIds` order).

Re-running the app must not duplicate seed data.

## MVP constraints

- Column count is fixed at five; only titles change.
- No card editing API beyond full board replace until Part 7 wires the frontend.
- Chat / conversation history is not stored in Part 5 (deferred to Part 9; in-memory per session for MVP).

## File location

The database file lives at `data/pm.db` inside the container working directory. Persist with a Docker volume in a later iteration if needed; for local MVP, data survives container restarts only if the file is mounted or kept on a volume.

## Approval

This design is ready for review. Part 6 implementation begins after sign-off.
