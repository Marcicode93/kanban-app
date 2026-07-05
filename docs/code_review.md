# Code Review Report

Review date: 2026-07-05

Scope: full repository review of the FastAPI backend, Next.js frontend, Docker workflow, scripts, and tests.

## Summary

The application is in good MVP shape: the main auth, board, AI, registration, email verification, and Docker flows are implemented and covered by backend, frontend unit, and Playwright tests. The highest-risk issues are around board snapshot validation/concurrency and production hardening details that matter once the demo is public.

Recent verification:

- `cd backend && uv run pytest` passed: 44 tests.
- `cd frontend && npm run test:unit` passed: 20 tests.
- `cd frontend && npm run test:e2e` passed: 13 tests.
- `cd frontend && npm run lint` passed.
- `cd frontend && npm run build` passed with network access for Google Fonts.

## Remediation Status

The High and Medium priority findings below have been addressed in the current working tree:

- Strict board graph validation now rejects orphan cards, duplicate references, and mismatched card IDs.
- Logical card IDs are scoped internally per board, while the API continues exposing the original logical IDs.
- Board saves now use optimistic concurrency through a board `version`; stale saves return `409`.
- Production session cookies are configured with `Secure` via `https_only=is_production()`.
- Email-change verification rechecks target email uniqueness before applying the change.
- Failed registration email sends now clean up the newly created unverified account so registration can be retried.
- Rate limiting now has a database-backed path for request handlers.
- Production mail configuration rejects unsafe `console` and non-test `fake` providers.

Remaining work is mainly clean-code refactoring and optional deployment hardening.

## Refactoring Status

The first refactoring pass is complete:

- `backend/app/main.py` now only owns app setup, middleware, lifespan, router registration, and static mounting. It was reduced from 375 lines to 68 lines.
- API endpoints were split into `backend/app/routes/` modules for health, auth, registration/password/email verification, account settings, board, and AI routes.
- Tests that mocked route-local dependencies were updated to target the new route modules.
- `frontend/src/components/KanbanBoard.tsx` was reduced from 396 lines to 219 lines.
- The board header moved to `KanbanHeader`.
- Board loading/save queue/toast behavior moved to `useBoardData`.
- Board mutations moved to `useBoardMutations`.

Still worth doing later:

- Move backend transaction-heavy route logic from route modules into `app/services/*`.
- Normalize frontend API errors with a typed `ApiError`.
- Decide whether `backend/static/` should remain committed.

## Findings And Actions

### High: Board replacement accepts invalid card graphs

Status: addressed.

`replace_board` checks that every column card ID exists in `data.cards`, but it does not verify that every `data.cards` entry is referenced exactly once, that a card is not listed in multiple columns, or that `CardData.id` matches the dictionary key. See `backend/app/board.py:69-123`.

Impact:

- A malformed client or AI response can persist orphaned cards.
- Duplicate card IDs across columns can produce inconsistent state or database errors.
- Existing cards included in `data.cards` but omitted from all `cardIds` are not deleted because deletion uses `payload_card_ids`.

Actions:

- Add a strict board validator before mutation:
  - flatten all `column.cardIds`;
  - reject duplicates;
  - require `set(flattened_ids) == set(data.cards.keys())`;
  - require `data.cards[card_id].id == card_id`.
- Add backend tests for duplicate card IDs, orphan `cards` entries, mismatched card IDs, and missing card data.
- Reuse this validation for AI board updates before calling `replace_board`.

### High: Card IDs are globally unique across all users

Status: addressed.

`Card.id` is the primary key (`backend/app/db/models.py:65-75`). The frontend generates IDs client-side with `createId`, and AI is instructed to create IDs like `card-9`. In a multi-user app, two users can generate the same card ID. Because the key is global, a collision across users can fail a board save or AI update.

Actions:

- Scope cards by board, not globally. Preferred minimal fix: add `board_id` to cards and use a composite uniqueness rule such as `(board_id, id)`, or generate server-side globally unique card IDs.
- Update `replace_board` queries to constrain by board explicitly.
- Add a test where two different users save a card with the same logical ID.

### High: Concurrent full-board saves can lose updates or fail

Status: addressed.

The backend persists full board snapshots with no revision/version check (`backend/app/main.py:327-335`, `backend/app/board.py:69-123`). The frontend serializes saves within one tab (`frontend/src/components/KanbanBoard.tsx:72-88`), but concurrent tabs, AI updates, or overlapping requests can overwrite newer state. During E2E, parallel tests against one board triggered a SQLAlchemy stale update error, which is the same class of risk.

Actions:

- Add optimistic concurrency: a `version` or `updated_at` field on boards returned by `GET /api/board` and required by `PUT /api/board`.
- Return `409 Conflict` when the client saves an old version.
- On `409`, reload the board and show a clear “board changed elsewhere” message.
- Keep E2E serial unless each worker gets an isolated database/user.

### Medium: Session cookies are not marked secure in production

Status: addressed.

`SessionMiddleware` is configured with only `secret_key` and `same_site="lax"` (`backend/app/main.py:76-77`). `validate_production_config` requires a non-default secret, but the session cookie is not set with `https_only=True` for production.

Actions:

- Configure `SessionMiddleware(..., https_only=is_production(), same_site="lax")`.
- Consider setting an explicit cookie name.
- Add a production-mode test that verifies the cookie contains the `Secure` attribute.

### Medium: Email-change verification has a race on duplicate addresses

Status: addressed.

`change_email` checks whether the new email exists before sending the code (`backend/app/main.py:283-297`), but verification later applies `token.target_email` without rechecking uniqueness. If another user registers or changes to that email before verification, the commit can hit a database integrity error instead of returning a controlled `409`.

Actions:

- In `/api/auth/verify-email`, before assigning `token.target_email`, recheck that no other user owns it.
- Return `409 Email already registered` if it was taken after the code was issued.
- Add a backend test for this race.

### Medium: Register can leave unusable accounts when email sending fails

Status: addressed.

Registration creates and commits the user/board in `create_user_with_board`, then creates a token, then sends email (`backend/app/main.py:157-162`, `backend/app/verification.py:33-57`). If sending fails, the API returns 503, but the user and board already exist. Retrying registration then returns duplicate email.

Actions:

- Wrap user creation, token creation, and mail send decision in a transaction strategy.
- If mail send fails, either delete the newly created unverified user or return a response that lets the user continue to resend verification.
- Add a test where the mail sender raises and then registration is retried.

### Medium: Rate limiting is in-memory only

Status: addressed for app request handlers. The in-memory path remains only as a fallback/helper path.

Rate limits use a module-level dictionary (`backend/app/rate_limit.py:1-19`). This works for local MVP but resets on restart and does not work across multiple workers or containers.

Actions:

- Document this as local-only if production stays single-process.
- For public deployment, move rate limiting to SQLite, Redis, or the hosting platform edge/proxy.
- Add operational guidance for resetting or observing rate-limit state.

### Low: Console mail logs verification codes

Status: addressed for production by rejecting `MAIL_PROVIDER=console` when `ENV=production`.

`ConsoleMailSender` logs and prints verification codes (`backend/app/mail.py:18-21`). This is useful locally, but dangerous if `MAIL_PROVIDER=console` is accidentally used in a public deployment.

Actions:

- In production, reject `MAIL_PROVIDER=console` unless an explicit override is set.
- Keep `fake` restricted to `ENV=test`.
- Update README environment notes accordingly.

### Low: Minor frontend type/API drift

`KanbanBoard` still declares a `username` prop but no longer uses it (`frontend/src/components/KanbanBoard.tsx:28-32`). This is harmless after lint cleanup if ignored via destructuring, but it makes the component contract misleading.

Actions:

- Remove `username` from the prop type and from callers/tests unless it is needed again.

## Clean Code And Refactoring Opportunities

These are not all bugs, but they are the main places where the codebase will become harder to change if the app grows.

### Split `backend/app/main.py` into routers

Status: addressed.

`backend/app/main.py` is 375 lines and currently owns app setup, auth routes, registration, verification, account settings, board routes, AI routes, and static mounting. That is the clearest backend clean-code issue.

Actions:

- Keep app construction, middleware, lifespan, and static mount in `main.py`.
- Move route groups into small modules:
  - `app/routes/auth.py` for login/logout/auth status.
  - `app/routes/registration.py` for register, verify, resend, forgot/reset.
  - `app/routes/account.py` for account, password, email changes.
  - `app/routes/board.py` for `GET/PUT /api/board`.
  - `app/routes/ai.py` for AI test/chat.
- Register them with `APIRouter` from `main.py`.
- Move shared response helpers, if needed, into `app/routes/common.py`.

### Separate route handlers from business workflows

Several route handlers directly orchestrate validation, database writes, token creation, mail sending, session mutation, and response shaping. Examples include registration (`backend/app/main.py:131-163`), email change (`backend/app/main.py:283-297`), and AI board updates (`backend/app/main.py:349-370`).

Actions:

- Add small service modules:
  - `app/services/registration.py`
  - `app/services/account.py`
  - `app/services/board.py`
  - `app/services/ai_board.py`
- Keep FastAPI handlers thin: parse request, call service, return response.
- Put transaction-sensitive workflows in services so they are easier to test without HTTP.

### Give board validation its own module

Board graph rules are central to the app but currently implicit inside `replace_board` (`backend/app/board.py:69-123`) and duplicated conceptually in the AI prompt. This makes invalid board states easy to miss.

Actions:

- Create a pure function such as `validate_board_data(data: BoardData) -> None`.
- Keep it free of database access.
- Use it in `PUT /api/board`, AI board updates, and tests.
- Add a small `backend/tests/test_board_validation.py` with table-style cases.

### Break up `KanbanBoard.tsx`

Status: addressed.

`frontend/src/components/KanbanBoard.tsx` is 396 lines and owns loading, save queueing, search, onboarding, drag-and-drop, board mutations, modal state, toast state, account/header UI, and layout. This makes every board feature risky to touch.

Actions:

- Extract `useBoardData()` for load/save queue/error/toast handling.
- Extract `useBoardMutations(board, persistBoard)` for add/edit/delete/rename/move handlers.
- Extract `KanbanHeader` for signed-in user, search, column pills, theme/account/logout buttons.
- Keep `KanbanBoard` as composition: load state, hooks, DnD wrapper, columns, chat, modals.

### Normalize frontend API error handling

`frontend/src/lib/api.ts` is 217 lines and repeats `response.ok` checks and error parsing in many functions. Components then map raw error strings to user-facing copy.

Actions:

- Add a typed `requestJson<T>()` helper that handles method, body, credentials, parsing, and `detail`.
- Consider a small `ApiError` class with `status` and `detail`.
- Let components switch on `status` where needed instead of string matching error messages.

### Reuse auth form UI primitives

`LoginForm`, `ForgotPasswordForm`, `VerifyEmailForm`, and `AccountSettingsModal` repeat the same card shell, label/input/button/error patterns. The duplication is manageable now, but it already makes polish changes repetitive.

Actions:

- Add small primitives such as `AuthShell`, `FieldLabel`, `TextInput`, `FormError`, and `PrimaryButton`.
- Keep them simple and local to `frontend/src/components/` unless reuse grows.
- Do this after functional fixes, not before.

### Reduce duplicated test helpers

Backend tests define local `login` and register/verify helpers in multiple files. This is fine for small suites, but as auth/email coverage grows, setup changes will scatter.

Actions:

- Move common helpers into `backend/tests/helpers.py`.
- Keep fixtures in `conftest.py`.
- Add explicit helper names such as `login_demo_user`, `register_verified_user`, and `get_last_fake_code`.

### Keep generated static output out of review noise

`backend/static/` contains generated Next.js export files. If committed, frontend builds create large diffs that obscure source changes.

Actions:

- Decide whether `backend/static/` should be committed.
- If Docker always builds the frontend, prefer ignoring generated static output and keeping only `.gitkeep`.
- If committed for convenience, document that reviewers should usually ignore those diffs.

### Suggested refactoring order

1. Extract backend service functions for transaction-heavy workflows.
2. Normalize frontend API errors.
3. Introduce small form primitives only after the behavior is stable.
4. Decide whether generated `backend/static/` output should stay committed.

## Test Coverage Gaps

Add focused tests for:

- Production session cookie `Secure` flag after the backend is refactored to a `create_app()` factory that can be instantiated under different environments in one test process.
- End-to-end stale-save behavior with two browser contexts after board versioning.
- Database-backed rate-limit behavior across app restarts or multiple worker processes, if the deployment target uses more than one process.

## Operational Notes

- The Docker workflow builds and serves the app successfully.
- `scripts/start.sh` performs a health check, but the PowerShell start script only starts the container and prints the URL. Consider adding the same health-check loop to `scripts/start.ps1`.
- Generated static files under `backend/static/` are build output. If they remain committed, expect churn whenever the frontend build changes.

## Recommended Action Order

1. Extract board/account/registration services.
2. Normalize frontend API errors.
3. Decide whether `backend/static/` should remain committed.
