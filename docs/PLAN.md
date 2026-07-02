# Project plan

Sequential build plan for the Project Management MVP. Check off items as completed. See root `AGENTS.md` for business requirements and technical decisions.

---

## Part 1: Plan

Document the project and get user approval before writing application code.

### Substeps

- [x] Enrich this document with detailed substeps, tests, and success criteria for each part
- [x] Create `frontend/AGENTS.md` describing the existing frontend code
- [x] User reviews and approves this plan

### Tests

None (documentation only).

### Success criteria

- `docs/PLAN.md` contains actionable checklists for Parts 2–10
- `frontend/AGENTS.md` accurately describes the demo frontend
- User explicitly approves before Part 2 begins

---

## Part 2: Scaffolding

Docker infrastructure, FastAPI backend skeleton, and start/stop scripts. Serves a hello-world static page and a test API endpoint.

### Substeps

- [x] Create `backend/` FastAPI app with a health or hello endpoint (e.g. `GET /api/health`)
- [x] Create `Dockerfile` that builds the project and runs FastAPI with `uv`
- [x] Add `backend/pyproject.toml` managed by `uv` (fastapi, uvicorn, etc.)
- [x] Serve a minimal static HTML page at `/` confirming the server works
- [x] Wire FastAPI to serve static files from a `static/` directory
- [x] Create `scripts/start.sh` and `scripts/stop.sh` (Mac/Linux)
- [x] Create `scripts/start.ps1` and `scripts/stop.ps1` (Windows)
- [x] Document usage in root `README.md` (minimal: how to start/stop)

### Tests

- [x] Manual or scripted check: `scripts/start` brings up the container (requires Docker running)
- [x] `GET /` returns the hello-world HTML page
- [x] `GET /api/health` (or equivalent) returns a JSON success response
- [x] `scripts/stop` tears down the container cleanly (requires Docker running)

### Success criteria

- One `docker build` + `scripts/start` serves both static HTML at `/` and a working API endpoint
- Start/stop scripts work on Mac, Linux, and Windows
- No frontend integration yet — hello-world only

---

## Part 3: Add in Frontend

Build the Next.js frontend as a static export and serve it from FastAPI at `/`.

### Substeps

- [x] Configure `frontend/next.config.ts` with `output: 'export'` for static build
- [x] Update `Dockerfile` to run `npm ci && npm run build` in `frontend/` and copy `out/` to backend static dir
- [x] Confirm all frontend routes work when served by FastAPI (no Next.js dev server in production)
- [x] Update start scripts if needed for the new build flow
- [x] Ensure existing frontend unit and E2E tests still pass

### Tests

- [x] `npm run test:unit` passes in `frontend/`
- [x] `npm run test:e2e` passes against the Docker-served app (or built static output)
- [x] Manual: visit `/` in the running container and see the full Kanban demo with 5 columns and seed cards
- [x] Manual: rename a column, add a card, drag a card — all work as before

### Success criteria

- Kanban board demo is visible at `/` when running via Docker/scripts
- All pre-existing frontend tests pass
- No auth, no backend persistence — same in-memory behavior as the standalone demo

---

## Part 4: Fake user sign in

Gate the Kanban behind a login screen. Hardcoded credentials: `user` / `password`.

### Substeps

- [x] Add a login page or login form (shown when not authenticated)
- [x] Implement simple session auth in FastAPI (HTTP-only cookie or equivalent)
- [x] Add `POST /api/login` and `POST /api/logout` endpoints
- [x] Protect `/` (and board API routes added later) — unauthenticated users see login
- [x] Add a logout button to the Kanban UI
- [x] Seed the hardcoded user in backend (or in-memory) for MVP

### Tests

- [x] Backend: login with valid credentials returns session; invalid credentials return 401
- [x] Backend: logout clears session
- [x] Backend: protected endpoint returns 401 without session
- [x] Frontend unit tests for login form validation and auth state
- [x] E2E: unauthenticated visit to `/` shows login; login with `user`/`password` shows Kanban; logout returns to login

### Success criteria

- Cannot see the Kanban without logging in
- Login with `user`/`password` works; wrong credentials are rejected
- Logout works and session is cleared
- Board state is still in-memory (no database yet)

---

## Part 5: Database modeling

Propose a SQLite schema for users, boards, columns, and cards. Document and get user sign-off before implementing.

### Substeps

- [x] Design schema supporting multiple users (future) but MVP uses one hardcoded user
- [x] One board per user; five fixed columns per board (IDs match frontend: `col-backlog`, etc.)
- [x] Save schema as JSON in `docs/schema.json`
- [x] Write `docs/DATABASE.md` explaining tables, relationships, and seeding approach
- [x] Document how `BoardData` from the frontend maps to/from the database
- [ ] **Pause for user sign-off before Part 6**

### Tests

None yet (design only).

### Success criteria

- `docs/schema.json` defines the full schema
- `docs/DATABASE.md` is clear and matches root `AGENTS.md` decisions (SQLite, auto-create)
- User has reviewed and approved the schema

---

## Part 6: Backend

API routes to read and update a user's Kanban board. SQLite database created on first run.

### Substeps

- [ ] Add SQLAlchemy (or similar) models matching approved schema
- [ ] Auto-create database file on startup if missing
- [ ] Seed default user (`user`) and board with `initialData` from frontend on first run
- [ ] `GET /api/board` — return current user's board as `BoardData` JSON
- [ ] `PUT /api/board` — replace board state (full snapshot for simplicity)
- [ ] All board routes require authentication (from Part 4)
- [ ] Add `pytest` test suite in `backend/tests/`

### Tests

- [ ] DB is created automatically when missing
- [ ] Seed data matches frontend `initialData` for the default user
- [ ] `GET /api/board` returns correct JSON for authenticated user
- [ ] `PUT /api/board` persists changes; subsequent GET reflects them
- [ ] Unauthenticated requests to board routes return 401
- [ ] `pytest` passes with good coverage of routes and DB logic

### Success criteria

- Board state persists across server restarts
- API shape matches frontend `BoardData` type
- All backend unit tests pass

---

## Part 7: Frontend + Backend

Wire the frontend to the backend API so the Kanban is fully persistent.

### Substeps

- [ ] Add API client helpers in `frontend/src/lib/api.ts` (or similar)
- [ ] Load board from `GET /api/board` on mount (replace `initialData` init)
- [ ] Persist board changes via `PUT /api/board` on rename, add, delete, and drag-drop
- [ ] Handle loading and error states minimally
- [ ] Send credentials (cookies) with API requests
- [ ] Update `backend/AGENTS.md` with API documentation

### Tests

- [ ] Frontend unit tests mock API and verify correct calls on user actions
- [ ] E2E: login, modify board (rename column, add card, move card), reload page — changes persist
- [ ] E2E: two rapid changes do not corrupt board state
- [ ] Backend tests from Part 6 still pass

### Success criteria

- All Kanban interactions persist across page reloads
- Frontend and backend tests pass
- No regressions in drag-and-drop, rename, add, or delete behavior

---

## Part 8: AI connectivity

Backend can call OpenRouter. Verify with a simple prompt.

### Substeps

- [ ] Add OpenAI-compatible client configured for OpenRouter (`OPENROUTER_API_KEY` from `.env`)
- [ ] Use model `openai/gpt-oss-120b`
- [ ] Add `POST /api/ai/test` (or internal test) that sends "What is 2+2?" and returns the response
- [ ] Handle missing API key gracefully with a clear error
- [ ] Update `backend/AGENTS.md` with AI configuration notes

### Tests

- [ ] Backend test (mocked): AI endpoint constructs correct request to OpenRouter
- [ ] Integration test (optional, requires key): "2+2" prompt returns a response containing "4"
- [ ] Missing `OPENROUTER_API_KEY` returns a meaningful error, not a crash

### Success criteria

- Backend successfully calls OpenRouter when the API key is set
- Simple arithmetic test confirms end-to-end connectivity

---

## Part 9: AI with board context

Extend the AI endpoint to include Kanban JSON, user question, and conversation history. Return structured output with a chat reply and optional board update.

### Substeps

- [ ] Define structured output schema (e.g. `{ message: string, board?: BoardData }`)
- [ ] `POST /api/ai/chat` accepts `{ message, history }` and loads current board from DB
- [ ] Send system prompt with board JSON + instructions for card/column operations
- [ ] Parse structured response; if `board` is present, persist via existing board update logic
- [ ] Return `{ message, board? }` to the frontend
- [ ] Store conversation history in request/response (in-memory per session for MVP, or DB if simple)

### Tests

- [ ] Mocked test: correct prompt includes board JSON and user message
- [ ] Mocked test: structured response with board update persists to DB
- [ ] Mocked test: response without board update leaves DB unchanged
- [ ] Mocked test: multi-turn history is included in subsequent calls
- [ ] Example scenarios: "Add a card called X to Backlog", "Move card Y to Done"

### Success criteria

- AI receives full board context on every call
- Structured output is reliably parsed
- Board updates from AI are persisted when provided
- All backend tests pass

---

## Part 10: AI chat sidebar

Add a sidebar chat UI. AI can update the Kanban; the board refreshes automatically.

### Substeps

- [ ] Build chat sidebar component matching existing color scheme and typography
- [ ] Message list with user/assistant bubbles and input field
- [ ] Call `POST /api/ai/chat` on send; append messages to local history
- [ ] On response with `board` update, refresh board state in `KanbanBoard`
- [ ] Show loading indicator while AI responds
- [ ] Layout: board + sidebar side by side (responsive collapse on small screens)
- [ ] Handle AI errors gracefully in the UI

### Tests

- [ ] Unit: chat component renders messages and sends on submit
- [ ] Unit: board refresh triggered when AI response includes board
- [ ] E2E: login, open chat, send a message, receive a response
- [ ] E2E: ask AI to add a card; card appears on the board without manual refresh
- [ ] All prior tests still pass

### Success criteria

- Chat sidebar is functional and visually consistent with the Kanban UI
- AI responses appear in the chat
- Kanban updates from AI are reflected immediately in the UI
- Full test suite passes (unit, E2E, backend)

---

## Approval

**Part 1 is ready for review.** Please confirm this plan before Part 2 begins.

After Part 5, a second approval is required on the database schema before Part 6.
