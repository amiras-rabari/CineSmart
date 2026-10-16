# CineSmart Frontend

React 19 + TypeScript + Vite SPA for the CineSmart API. Decisions and progress live in
`../frontend-plan.md`; backend facts in `../frontend-contract.md`.

## Setup

Requires Node 24 (`.nvmrc`) and pnpm 10 via Corepack.

```sh
corepack enable          # once per machine
pnpm install
cp .env.example .env.local
pnpm dev                 # http://localhost:5173
```

### Backend prerequisites

- The CineSmart API on `http://localhost:8080` with PostgreSQL and Redis running (see the
  backend's `.env.example`).
- `FRONTEND_ORIGINS` and `FRONTEND_BASE_URL` left at `http://localhost:5173` (CORS with
  credentials, and the links in emails). The dev server uses `strictPort`, so port 5173 must be free.
- The refresh cookie is `Secure`. Chromium and Firefox accept it on `http://localhost`; for other
  browsers run the backend with `SPRING_PROFILES_ACTIVE=dev`.
- Email links (verify, reset password, confirm email change) arrive in the backend's dev mailbox
  (Ethereal).

## Commands

| Command                             | Does                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `pnpm dev`                          | Vite dev server on `http://localhost:5173`                              |
| `pnpm build`                        | `tsc -b && vite build` → `dist/`                                        |
| `pnpm preview`                      | Serve `dist/` on 5173                                                   |
| `pnpm typecheck`                    | `tsc -b --noEmit`                                                       |
| `pnpm lint`                         | ESLint                                                                  |
| `pnpm format` / `pnpm format:check` | Prettier write / check                                                  |
| `pnpm test` / `pnpm test:watch`     | Vitest (unit + component, MSW; no backend needed)                       |
| `pnpm test:e2e`                     | Playwright (needs the backend and `pnpm dev` or `pnpm preview` running) |

First Playwright run: `pnpm exec playwright install chromium`.

## End-to-end tests

`pnpm test:e2e` runs against the real backend and the running `pnpm dev` (or `pnpm preview`)
server. `E2E_USERNAME` / `E2E_PASSWORD` (in `.env.local`) must be a verified account with no
activity; the signed-in specs skip themselves without them.

The backend's rate limits are shared by every test, so the Playwright projects run in order:

| Project     | Specs                         | Notes                                                                               |
| ----------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `public`    | smoke, details, browse-search | anonymous, parallel                                                                 |
| `cooldown`  | `cooldown.setup.ts`           | waits 61 s for a fresh 120/min public window                                        |
| `a11y`      | a11y, flows                   | axe (WCAG 2.2 AA), keyboard, 375/768/1024/1440 px, request counts                   |
| `account`   | account                       | signed-in axe/keyboard, session reloads, watchlist → rate → sign-out flow           |
| `signed-in` | signed-in                     | uses all 5 `account` calls (15 min window): don't rerun it within 15 minutes        |
| `limits`    | limits                        | exhausts the per-user read, public and login budgets on purpose; runs last (~3 min) |

Run one project alone with `pnpm exec playwright test --project=a11y --no-deps`. The specs use only
the correct password: wrong ones count toward the 5-attempt account lock and the 10-attempt IP
block (1 hour each).

## Environment

| Var                             | Default                        | Meaning                                        |
| ------------------------------- | ------------------------------ | ---------------------------------------------- |
| `VITE_API_BASE_URL`             | `http://localhost:8080/api/v1` | API base; called cross-origin with credentials |
| `E2E_BASE_URL`                  | `http://localhost:5173`        | Playwright base URL                            |
| `E2E_USERNAME` / `E2E_PASSWORD` | —                              | A verified test account for e2e                |

## Build and deployment

`pnpm build` writes a static SPA to `dist/` (framework code split into `react`, `router` and
`query` vendor chunks; every page is a lazy route chunk). `pnpm preview` serves it on 5173 for a
local check. Constraints from the backend (contract [CFG-2]):

- **SPA fallback:** the host must serve `index.html` for every unknown path. Email links open
  `/verify-email`, `/reset-password` and `/confirm-email` directly, and every page can be reloaded.
- **Same site:** the refresh cookie is `SameSite=Strict`, host-only, `Path=/api/v1/auth`. The
  frontend and the API must be on the same site (e.g. `cinesmart.ca` + `api.cinesmart.ca`, or one
  host behind a reverse proxy). Different registrable domains break session restore.
- **HTTPS:** production cookies are `Secure`, so the API (and the site) must be served over HTTPS.
- **Origins:** the frontend origin must be listed exactly (scheme + host + port) in the backend's
  `FRONTEND_ORIGINS`, and `FRONTEND_BASE_URL` must point at it so email links open this app.
- **API URL:** set `VITE_API_BASE_URL` at build time (it is baked into the bundle).
- **Rate limits:** all users behind one IP share 120 requests/min for browsing; a reverse proxy in
  front of the API needs the backend's `app.trust-proxy` set, or every user shares one budget.

## Dev tools

- `/dev/ui` (dev builds only): every UI primitive and feedback component, plus a "Ping API" button.
- TanStack Query devtools: bottom-left button in dev.
