# Email auth testing

Registration, verification, password reset, and email change use a pluggable mail provider.

## Automated tests

Backend tests set `ENV=test` and `MAIL_PROVIDER=fake` (see `backend/tests/conftest.py`). The fake provider stores the last code in memory; tests read it via `FakeMailSender.last_code`.

E2E tests use the same setup in `scripts/e2e-server.sh` and fetch codes from `GET /api/auth/test/last-code?email=...` (only available when `ENV=test`).

Run:

```bash
cd backend && uv run pytest
cd frontend && npm run test:unit
cd frontend && npm run test:e2e
```

## Manual smoke test (real email)

1. Copy `.env.example` to `.env` and set:
   - `MAIL_PROVIDER=resend`
   - `RESEND_API_KEY` from [Resend](https://resend.com/api-keys)
   - `MAIL_FROM=onboarding@resend.dev` (test sender) or your verified domain
2. Restart the app after changing `.env` (`./scripts/stop.sh && ./scripts/start.sh`)
3. Register a new account with a real inbox you control.
4. Confirm you receive a 6-digit code and can verify and reach the board.
5. Sign out, use **Forgot password?**, reset with the emailed code, sign in with the new password.
6. Open **Account** settings, change password and email; confirm the new email with a code.
7. Confirm demo user `user` / `password` still signs in without email verification.

## Providers

| Provider | Use |
|----------|-----|
| `fake` | Tests only; codes in memory |
| `console` | Dev; prints codes to server logs |
| `resend` | Production; sends via Resend API |
| `smtp` | Optional; standard SMTP |
