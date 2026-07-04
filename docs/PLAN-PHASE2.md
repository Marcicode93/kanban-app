# Phase 2 plan — Features and polish

Post-MVP work in this repo: multi-user registration, UI polish, production hardening.

MVP complete — see [PLAN.md](./PLAN.md) Parts 1–10.

**Out of scope:** hosting, subdomain DNS, FTP deploy — you handle that after the build.

---

## Part A: Multi-user registration

### Substeps

- [x] Add `POST /api/register` with `{username, password}` validation
- [x] Reject duplicate usernames (409)
- [x] Hash password with bcrypt; create user + board + five columns
- [x] Add registration form on [LoginForm](../frontend/src/components/LoginForm.tsx)
- [x] Update [backend/AGENTS.md](../backend/AGENTS.md) with register endpoint
- [x] Backend tests: register success, duplicate user, login after register, isolation
- [x] E2E: register new user, empty board

### Success criteria

- Anyone can create an account
- Each user has an isolated board
- MVP seed user `user` still works

---

## Part B: UI and Kanban features

### Substeps

- [x] **Card edit** — modal to edit title/details
- [x] **Save feedback** — toast on save error
- [x] **Loading skeletons** — board load
- [x] **Mobile polish** — horizontal column scroll
- [ ] Optional: dark mode toggle (deferred)
- [x] Update tests

### Success criteria

- Cards are editable after creation
- Users see clear feedback on errors
- UI works on desktop and mobile

---

## Part C: Production hardening

### Substeps

- [x] Require strong `SESSION_SECRET` when `ENV=production`
- [x] Rate-limit `POST /api/ai/chat` (10/hour per user)
- [x] Rate-limit `POST /api/register` (5/hour per IP)
- [x] Disable `POST /api/ai/test` in production
- [x] Document production env vars in README

### Success criteria

- Public demo cannot be abused for unlimited AI calls
- App is ready for you to deploy

---

## After build (your tasks)

Hosting, FTP portfolio page, OpenRouter billing alerts, database backups.

---

## Status

**Phase 2 complete (Parts A–C).** Ready for you to deploy.
