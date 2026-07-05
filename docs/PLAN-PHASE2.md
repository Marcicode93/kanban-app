# Phase 2 plan — Features and polish

Post-MVP work in this repo: multi-user registration, UI polish, production hardening.

MVP complete — see [PLAN.md](./PLAN.md) Parts 1–10.

**Out of scope for this plan:** hosting, subdomain DNS, Render/FTP deploy. You handle that yourself once the build is ready.

Optional reference (not part of implementation here): [DEPLOY.md](./DEPLOY.md), [portfolio-case-study.md](./portfolio-case-study.md).

---

## Part A: Multi-user registration

Allow new users to sign up; each gets their own board.

### Substeps

- [x] Add `POST /api/register` with `{username, password}` validation
- [x] Reject duplicate usernames (409)
- [x] Hash password with bcrypt; create user + board + five columns (reuse [seed.py](../backend/app/db/seed.py) patterns)
- [x] Add registration form or link on [LoginForm](../frontend/src/components/LoginForm.tsx)
- [x] Update [backend/AGENTS.md](../backend/AGENTS.md) with register endpoint
- [x] Backend tests: register success, duplicate user, login after register
- [x] E2E: register new user, see empty/default board, isolated from other users

### Testsc

- [x] `POST /api/register` creates user and board
- [x] Duplicate username returns 409
- [x] User A cannot see User B board
- [x] Frontend unit tests for registration form

### Success criteria

- Anyone can create an account on the public demo (or invite-only if you add a flag later)
- Each user has an isolated board
- MVP seed user `user` still works

---

## Part B: UI and Kanban features

High-impact polish for portfolio visitors.

### Substeps

- [x] **Card edit** — click card to edit title/details inline or in a modal
- [x] **Save feedback** — toast or banner on save error (board PUT failures)
- [x] **Loading skeletons** — board load and chat response
- [x] **Mobile polish** — horizontal column scroll, touch-friendly targets; chat always visible at all breakpoints
- [x] **Dark mode toggle** — light/dark theme with persistence
- [x] Update [frontend/AGENTS.md](../frontend/AGENTS.md)

### Tests

- [x] Unit: card edit saves via `PUT /api/board`
- [x] E2E: edit card title, reload, change persists
- [x] Existing test suites pass

### Success criteria

- Cards are editable after creation
- Users see clear feedback on errors
- UI feels finished on desktop and mobile

### Deferred (not Phase 2 unless needed)

- Multiple boards per user
- Add/remove columns
- File attachments
- Real-time multi-user collaboration (WebSockets)

---

## Part C: Production hardening

Security and cost control before you put the app online.

### Substeps

- [x] Require strong `SESSION_SECRET` in production (fail or warn if default dev secret)
- [x] Rate-limit `POST /api/ai/chat` per session/IP (e.g. 10 requests/hour)
- [x] Rate-limit `POST /api/register` to prevent spam accounts
- [x] Disable `POST /api/ai/test` in production
- [x] Document production env vars in README (no hosting steps)

### Tests

- [x] Rate limit returns 429 after threshold
- [x] App refuses default session secret when `ENV=production`

### Success criteria

- Public demo cannot be abused for unlimited AI calls
- App is ready for you to deploy when Parts A–C are done

---

## After build (your tasks, not in this plan)

When implementation above is complete, you deploy yourself:

- Subdomain + app host (e.g. Render)
- FTP portfolio case study page
- OpenRouter billing alerts
- Database backups on your host

See [DEPLOY.md](./DEPLOY.md) and [portfolio-case-study.md](./portfolio-case-study.md) if useful.

---

## Status

**Phase 2 complete (Parts A–C).** Part D (email auth) and Phase 2.5 polish are implemented.

Hosting/deploy is yours after the build is finished.

---

## Part D: Email registration and account settings

Full email flow: verify on register, forgot/reset password, account settings. Username login unchanged. Demo user `user` / `password` skips verification.

### Substeps

- [x] User model: `email`, `email_verified`, `is_demo`, verification tokens
- [x] `POST /api/register` with email; returns `pending_verification` (no session until verified)
- [x] `POST /api/auth/verify-email`, `/resend-code`, `/forgot-password`, `/reset-password`
- [x] `GET /api/account`, `POST /api/account/password`, `POST /api/account/email`
- [x] Mail providers: `fake`, `console`, `resend`, `smtp` (`backend/app/mail.py`)
- [x] Block board/AI for unverified users; demo user exempt
- [x] Verify, forgot-password, and account settings UI
- [x] `.env.example` with mail-related variables
- [x] Tests and `docs/TESTING-EMAIL.md`

### Success criteria

- New users verify email before using the board
- Password reset and email change work via emailed codes
- Demo credentials still work without email

---

## Phase 2.5: UX polish

- [x] Success/error toasts
- [x] Delete card confirmation modal
- [x] Card search filter
- [x] Chat clear history
- [x] Rate-limit message in chat (429)
- [x] Onboarding banner for empty boards
- [x] Password minimum 8 characters

### Deferred (Phase 2.6)

- Due date and label on cards
