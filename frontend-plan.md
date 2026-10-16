# CineSmart Frontend Plan

## How to use this file
- **What it holds:** every frontend decision (stack, structure, design system, UX rules), the architecture, routes/screens, shared components, the capability coverage checklist, clarifications, backend gaps, and the build phases with checkboxes and "As built" notes.
- **The other file:** `frontend-contract.md` holds the backend facts (endpoints, JSON, errors, limits, config). This plan refers to it as `contract: [ID]` and never copies its JSON.
- **Which file wins:** the contract wins on API facts; this plan wins on decisions and progress. A contract mismatch found while building is a stop-and-ask ([NEXT] rule 5).
- **Where we are:** read [STATUS] (right below). It is the only progress summary; each phase's tasks hold the detail.
- **How to read:** every heading starts with a stable ID (`## [P3] ...`, `## [ARCH-2] ...`). Find it with Grep `^## \[ARCH-2\]` and Read only that range. A phase's "Read first" line lists everything that phase needs. When it lists an earlier phase ID (e.g. `[P1]`), read only that phase's `### [P1] As built` subsection.
- **Status marks:** `[ ]` to do · `[~]` in progress / partly done · `[x]` done.
- **The app lives in** `Cinesmart-Frontend/` (project root). The backend (`Cinesmart-Backend/`) is never changed by frontend work.
- **IDs never change.** New sections get new IDs.

## [STATUS] Phase status
| ID | Phase | Status | Goal | Last updated |
|---|---|---|---|---|
| P0 | Scaffold, design system, API core | [x] | Runnable Vite app with tooling, tokens, UI primitives, typed HTTP core, test setup | 2026-10-12 |
| P1 | Session core and auth pages | [x] | In-memory session with refresh rotation, cross-tab safety, all auth and email-link pages | 2026-10-12 |
| P2 | App shell, home, ranked lists, For You | [x] | Header/footer, movie cards and rows, home sections, "See all" list pages, For You page | 2026-10-12 |
| P3 | Browse and search | [x] | Browse menu and page with genre/language/year filters, search page | 2026-10-12 |
| P4 | Movie details and activity | [x] | Details page, watchlist/watched/rating/reaction controls with optimistic updates, similar titles | 2026-10-12 |
| P5 | My lists and profile | [x] | Watchlist and ratings pages, profile with counts, change password, change email | 2026-10-12 |
| P6 | Hardening, accessibility, e2e | [x] | A11y and responsive pass, error polish, Playwright flows, README and deploy notes | 2026-10-13 |

## [INDEX] ID index
| ID | Title | Summary |
|---|---|---|
| DEC-1 | Location and stack | Folder, libraries with versions |
| DEC-2 | Folder structure | Where every kind of file goes |
| DEC-3 | Code conventions | Naming, TS rules, styling, text, tests |
| DEC-4 | Commands and environment | pnpm scripts, env vars, prerequisites |
| DS-1 | Visual direction and brand | Dark cinematic, amber accent, wordmark |
| DS-2 | Design tokens | Colours, type scale, spacing, radius, elevation |
| DS-3 | Breakpoints, layout and motion | Breakpoints, gutters, card sizes, motion rules |
| ARCH-1 | API client | HTTP core, auth modes, one function per endpoint |
| ARCH-2 | Session and auth handling | In-memory token, restore, refresh lock, 401 retry, logout, cross-tab |
| ARCH-3 | Error code → UI behaviour | What every error code does in the UI; retry policy |
| ARCH-4 | Query keys, caching, invalidation | TanStack Query keys, stale times, what to refresh after actions |
| ARCH-5 | Activity actions | Optimistic updates, in-flight rule, watched-ID set, anonymous redirect |
| ARCH-6 | Routing and guards | Router setup, layouts, guards, URL state |
| ROUTES-1 | Route map | Every route, access, contract IDs, phase |
| ROUTES-2 | Home | Hero, sections, row paging |
| ROUTES-3 | Ranked lists and For You | `/lists/:listKey`, `/for-you` |
| ROUTES-4 | Browse | Filters, URL params, menu |
| ROUTES-5 | Search | Query rules, results |
| ROUTES-6 | Movie details | Layout, actions, availability, similar |
| ROUTES-7 | Watchlist and ratings | `/watchlist`, `/ratings` |
| ROUTES-8 | Profile | Counts, change password, change email |
| ROUTES-9 | Auth pages | Signup, login, resend, forgot |
| ROUTES-10 | Email-link pages | Verify email, reset password, confirm email |
| ROUTES-11 | Not found and app errors | 404 page, error boundary |
| COMP-1 | Layout and navigation components | AppShell, Header, menus, SearchBox, Footer |
| COMP-2 | Movie display components | PosterImage, MovieCard, MovieRow, MovieGrid, PaginationBar |
| COMP-3 | Activity controls | WatchlistButton, WatchedButton, RatingControl, ReactionButtons |
| COMP-4 | Feedback components | Skeletons, EmptyState, ErrorState, alerts, toasts, tooltips |
| COMP-5 | Form components | Form fields, server-error mapping, Zod schemas |
| COVER | Capability coverage checklist | Every backend capability → screen → phase |
| CLAR | Clarifications | Questions asked and answers |
| GAPS | Backend gaps and open risks | List only |
| P0…P6 | Phases | Tasks, files, acceptance checks, As built |
| NEXT | Resume prompt | Paste into a new chat to continue |

---

## [DEC-1] Location and stack
- **Location:** `Cinesmart-Frontend/` at the project root, next to `Cinesmart-Backend/`. Nothing outside it is touched by frontend phases.
- **Runtime/tools:** Node **24 LTS**, **pnpm 10** (via Corepack; `packageManager` field pinned in `package.json`).
- **Versions:** the minimums below were current when planned. P0 installs the latest release within each major, and records the exact resolved versions in `### [P0] As built`. Later phases don't upgrade majors.

| Concern | Choice | Version (major/min) |
|---|---|---|
| Framework | React + React DOM | 19.2 |
| Language | TypeScript (strict) | 5.9 |
| Build/dev server | Vite (+ `@vitejs/plugin-react`) | 7 |
| Router | React Router (`react-router`, data mode with `createBrowserRouter`, no loaders) | 7.9 |
| Server state | TanStack Query (`@tanstack/react-query` + devtools in dev) | 5.90 |
| CSS | Tailwind CSS (`@tailwindcss/vite`) | 4.1 |
| UI primitives | shadcn/ui (Radix-based components generated into the repo; CLI latest) | — |
| Toasts | Sonner (shadcn `sonner` component) | 2 |
| Forms | React Hook Form + `@hookform/resolvers` | 7.62 / 5 |
| Validation | Zod | 4.1 |
| Icons | `lucide-react` | latest |
| Font | `@fontsource-variable/inter` (self-hosted) | 5 |
| Class helpers | `clsx` + `tailwind-merge` (`cn()`), `class-variance-authority` (shadcn) | latest |
| Unit tests | Vitest + jsdom + Testing Library (`react`, `user-event`, `jest-dom`) + MSW 2 | 3.2 / 16 / 2 |
| E2E | Playwright (`@playwright/test`) + `@axe-core/playwright` | 1.55 / 4 |
| Lint/format | ESLint 9 flat config + `typescript-eslint` 8 + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` + `eslint-plugin-jsx-a11y`; Prettier 3 + `prettier-plugin-tailwindcss` | 9 / 3 |

- **Not used:** no state library besides TanStack Query + one small session store (plain module + `useSyncExternalStore`); no i18n library; no analytics; no CSS-in-JS; no axios (native `fetch`); no runtime validation of API responses (types only; Zod is for forms).

## [DEC-2] Folder structure
```
Cinesmart-Frontend/
├── .env.example  .nvmrc  package.json  pnpm-lock.yaml  README.md
├── index.html  vite.config.ts  vitest.config.ts  playwright.config.ts
├── tsconfig.json  tsconfig.app.json  tsconfig.node.json  eslint.config.js  .prettierrc  components.json
├── public/                     favicon.svg
├── e2e/                        *.spec.ts (Playwright), fixtures.ts
└── src/
    ├── main.tsx                 bootstraps <App/>
    ├── app/                     App.tsx (providers), router.tsx (route table), layouts/ (RootLayout, ShellLayout, AuthLayout)
    ├── api/                     http.ts, errors.ts, types.ts, auth.ts, me.ts, activity.ts, catalog.ts, discovery.ts, recommendations.ts
    ├── session/                 session-store.ts, refresh.ts, cross-tab.ts, session-provider.tsx, guards.tsx, dev-tools.ts
    ├── query/                   query-client.ts, keys.ts, card-cache.ts, watched-set.ts
    ├── components/
    │   ├── ui/                  shadcn-generated primitives (button, input, select, dropdown-menu, popover, slider, dialog, sheet, tooltip, skeleton, badge, alert, card, separator, sonner, label)
    │   ├── layout/              AppShell, Header, MobileNav, BrowseMenu, SearchBox, UserMenu, Footer, Wordmark, PageHeader
    │   ├── movie/               PosterImage, MovieCard, MovieRow, MovieGrid, PaginationBar, RatingBadges, ReasonChip
    │   ├── activity/            MovieActions, WatchlistButton, WatchedButton, RatingControl, ReactionButtons, CardWatchlistButton
    │   ├── feedback/            Skeletons, EmptyState, ErrorState, InlineAlert, RetryAfterNotice, InfoTooltip, FullPageSplash, notify.ts
    │   └── forms/               TextField, PasswordField, SubmitButton, FormAlert, apply-server-errors.ts
    ├── features/                one folder per screen: home/, lists/, browse/, search/, movie/, my-lists/, profile/, auth/, errors/, dev/
    ├── hooks/                   use-retry-after.ts, use-document-title.ts, use-media-query.ts, use-page-param.ts
    ├── lib/                     env.ts, format.ts, validation.ts (Zod schemas), utils.ts (cn), constants.ts
    ├── styles/                  globals.css (Tailwind import, tokens, base styles)
    └── test/                    setup.ts, msw/handlers.ts, msw/server.ts, render.tsx (providers wrapper)
```
- A screen's private components live in its `features/<screen>/` folder; anything used by two screens moves to `components/`.

## [DEC-3] Code conventions
- **TypeScript:** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`; no `any` (use `unknown` + narrowing); path alias `@/` → `src/`.
- **Names:** components `PascalCase.tsx` (one exported component per file); every other module `kebab-case.ts`; hooks named `useX` in `use-x.ts`; named exports only (route modules export `Component`/`ErrorBoundary` for React Router lazy routes).
- **API types:** names match the contract's TS names exactly (`MovieCard`, `UserMovieState`, `Page<T>`, `LoginResponse`, …). API functions are the only code that knows URLs.
- **Styling:** Tailwind utilities + `cn()`. Colours, radii and fonts only through the tokens in [DS-2] (no raw hex outside `globals.css`). shadcn components are edited in place when the design needs it.
- **Text:** English, inline in components (no i18n layer). Dates and numbers only through `lib/format.ts` (`Intl`, locale `en-CA`).
- **Accessibility (WCAG 2.2 AA):** semantic elements first; every interactive element reachable by keyboard with a visible focus ring; icon-only buttons have `aria-label`; toggle buttons use `aria-pressed`; images have `alt` (title for posters); colour is never the only signal; live regions for async results (toasts via Sonner, form alerts `role="alert"`).
- **Data access:** components never call `fetch`; they use query/mutation hooks in their feature folder that call `api/*` functions, keyed by `query/keys.ts`.
- **Comments:** only where the why isn't obvious (e.g. contract rules); cite contract IDs like `// contract [AUTH-5]`.
- **Tests:** unit tests next to the file (`x.test.ts(x)`); MSW handlers in `src/test/msw`; Playwright specs in `e2e/`. Every phase adds tests for the logic it introduces.
- **Done means:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all pass ([DEC-4]).

## [DEC-4] Commands and environment
Run inside `Cinesmart-Frontend/`:

| Command | Does |
|---|---|
| `corepack enable` | once per machine, makes the pinned pnpm available |
| `pnpm install` | install dependencies |
| `pnpm dev` | Vite dev server on `http://localhost:5173` (`strictPort: true`, must match the backend's CORS default) |
| `pnpm build` | `tsc -b && vite build` → `dist/` |
| `pnpm preview` | serve `dist/` on 5173 (`--strictPort`) |
| `pnpm typecheck` | `tsc -b --noEmit` |
| `pnpm lint` | `eslint .` |
| `pnpm format` / `pnpm format:check` | Prettier write / check |
| `pnpm test` | `vitest run` (unit + component, MSW, no backend needed) |
| `pnpm test:watch` | `vitest` |
| `pnpm test:e2e` | `playwright test` (needs the backend and `pnpm dev` or `pnpm preview` running) |

**Env vars** (`.env.example`, copied to `.env.local`):
| Var | Default | Meaning |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080/api/v1` | API base (contract [CONV-1]); called directly, cross-origin, with credentials |
| `E2E_BASE_URL` | `http://localhost:5173` | Playwright base URL |
| `E2E_USERNAME` / `E2E_PASSWORD` | — | A verified test account for e2e and acceptance checks |

**Prerequisites for acceptance checks:** backend running on `:8080` with Postgres + Redis (see the backend's `.env.example`; `FRONTEND_ORIGINS`/`FRONTEND_BASE_URL` left at `http://localhost:5173`), access to the dev mailbox (Ethereal) to open email links, and one verified test account. Chromium/Firefox accept the `Secure` refresh cookie on `http://localhost`; for other browsers run the backend with `SPRING_PROFILES_ACTIVE=dev`.

---

## [DS-1] Visual direction and brand
- **Direction:** dark, cinematic streaming style. Near-black surfaces, posters carry the colour, one warm amber accent (marquee/rating gold). Dense horizontal rows on home, calm grids elsewhere. **Dark only** (no light theme, no toggle); colours are CSS variables so a light theme could be added later.
- **Brand:** text wordmark "Cine**Smart**" ("Smart" in the accent colour) with the Lucide `Clapperboard` icon before it; Inter 700, tight tracking. Favicon = the icon in amber on near-black. Footer line: "CineSmart · Canadian streaming availability · Data from OMDb, TMDB and Watchmode".
- **Imagery:** posters only (2:3). The details page uses the poster as a blurred, darkened backdrop. No other images are available (contract [CAT-1]).
- **Missing posters:** gradient tile (surface-2 → surface-3), centred `Film` icon, title text below it (2 lines max); same 2:3 box so grids stay aligned. Also shown when the image fails to load.
- **Tone of copy:** short, friendly, plain English; numbers formatted `en-CA`.

## [DS-2] Design tokens
Defined once in `src/styles/globals.css` as CSS variables, exposed to Tailwind via `@theme`, and mapped to shadcn's token names (`--background`, `--foreground`, `--primary`, …).

**Colours**
| Token | Value | Use |
|---|---|---|
| `--background` | `#0B0B0F` | page |
| `--surface` | `#14141A` | header, cards, panels |
| `--surface-2` | `#1C1C24` | inputs, popovers, hover |
| `--surface-3` | `#262630` | pressed/selected, skeleton shimmer |
| `--border` | `#2E2E3A` | dividers, input borders |
| `--foreground` | `#F4F4F5` | primary text |
| `--muted-foreground` | `#A1A1AA` | secondary text (≥ 4.5:1 on background) |
| `--subtle-foreground` | `#8E8E99` | captions, meta (≥ 4.5:1 on background) |
| `--primary` | `#F5B301` | accent: primary buttons, active states, rating star |
| `--primary-hover` | `#FFC933` | hover |
| `--primary-foreground` | `#14110A` | text on primary |
| `--ring` | `#FBBF24` | focus ring (2px + 2px offset) |
| `--like` | `#4ADE80` | active like |
| `--dislike` | `#F87171` | active dislike |
| `--destructive` | `#EF4444` (text `#FCA5A5` on dark) | errors, destructive buttons |
| `--success` | `#4ADE80` | success alerts |
| `--info` | `#60A5FA` | info alerts, tooltips icon |
| `--overlay` | `rgb(0 0 0 / 0.65)` | card hover overlay, backdrop scrim |

**Typography** (Inter Variable; `font-feature-settings: "cv11", "ss01"`; tabular numbers for ratings/counts)
| Token | Size / line height | Use |
|---|---|---|
| `text-xs` | 12 / 16 | badges, meta |
| `text-sm` | 14 / 20 | secondary text, card titles |
| `text-base` | 16 / 24 | body |
| `text-lg` | 18 / 28 | row titles (mobile), lead |
| `text-xl` | 20 / 28 | row titles (desktop) |
| `text-2xl` | 24 / 32 | page titles (mobile) |
| `text-3xl` | 30 / 36 | page titles (desktop), details title (mobile) |
| `text-4xl` | 36 / 40 | details title (desktop) |
| `text-5xl` | 48 / 52 | hero headline (desktop only) |
Weights: 400 body, 500 labels/buttons, 600 titles, 700 wordmark/hero.

**Spacing, radius, elevation**
- Spacing: Tailwind 4px scale. Page gutter 16px (mobile), 24px (tablet), 48px (desktop). Section gap 32px mobile / 48px desktop. Card gap 8px mobile / 12px tablet / 16px desktop.
- Radius: `--radius-sm` 4px (badges), `--radius-md` 8px (cards, posters, inputs, buttons), `--radius-lg` 12px (dialogs, popovers, panels), `rounded-full` for pills/avatars.
- Elevation: no shadows on surfaces; hover/popover uses `0 8px 24px rgb(0 0 0 / 0.5)`.
- Max content width: 1440px, centred.

## [DS-3] Breakpoints, layout and motion
**Breakpoints** (Tailwind defaults): `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536. Device classes: **mobile** < 640, **tablet** 640–1023, **desktop** ≥ 1024.

| Element | Mobile | Tablet | Desktop |
|---|---|---|---|
| Header | wordmark + search icon + menu button (MobileNav sheet) | wordmark + search field + menu button | full nav + search field + user menu |
| Row card width | ~40% of viewport (2.4 visible) | ~23% (4.3 visible) | 6 visible (xl: 7) |
| Grid columns | 2 | 3 (md: 4) | 5 (xl: 6) |
| Row arrows | hidden (swipe/scroll-snap) | shown | shown on row hover/focus |
| Details layout | poster on top, centred, 50% width | poster left 220px | poster left 300px |
| Auth card | full width | 420px centred | 420px centred |

**Motion** ("subtle"): durations 150 ms (colour/opacity), 200 ms (card hover), 250 ms (popover/sheet); easing `cubic-bezier(0.2, 0.8, 0.2, 1)`. Card hover/focus: lift `translateY(-4px)` + `scale(1.03)` + overlay fade-in. Rows scroll with `scroll-behavior: smooth`. Content fade-in 150 ms. Skeleton shimmer. Everything except opacity changes is disabled under `prefers-reduced-motion: reduce` (shimmer becomes static).

---

## [ARCH-1] API client
- **HTTP core** (`src/api/http.ts`): `request<T>(method, path, opts)` with `opts = { query?, body?, auth: 'none' | 'optional' | 'required', signal? }`.
  - URL = `env.apiBaseUrl` + path; query params with `undefined`, `null` or `''` values are **not sent** (contract [DISC-2] rejects empty/unknown params).
  - Always `credentials: 'include'` (contract [CONV-1], [AUTH-2]).
  - Headers: `Content-Type: application/json` only when there is a body; `Authorization: Bearer <token>` only for `auth: 'optional' | 'required'` when a session exists. **Never** any other custom header (CORS allows only these, contract [CONV-1]). **Never** `Authorization` on `auth: 'none'` (public auth POSTs reject stale tokens, contract [CONV-2]).
  - Before an `optional` or `required` request: `await session.ensureFreshToken()` ([ARCH-2]). `required` with no session → throw `ApiError('UNAUTHORIZED', 401)` locally, no request.
  - Response: 204 → `undefined`; 2xx → parsed JSON as `T`; non-2xx → parse the error body (contract [CONV-5]) into `ApiError { status, code, message, fields?, retryAfter: number | null, path }` (`retryAfter` from the `Retry-After` header). Body not JSON → `code` derived from status (`INTERNAL_ERROR` for 5xx, `BAD_REQUEST` otherwise).
  - `fetch` rejects (offline, backend down, CORS failure) → `ApiError` with client-only code `NETWORK_ERROR`, status 0.
  - `required` + 401 `UNAUTHORIZED` → one `session.refresh()` then one retry; a second 401 or a failed refresh → `session.expire()` and rethrow ([ARCH-2]).
- **One typed function per contract endpoint**, grouped by module. Each file starts with the contract IDs it implements. Pages convert their 1-based URL page to the API's 0-based `page`.

| File | Function → contract ID (auth mode) | Built in |
|---|---|---|
| `api/auth.ts` | `signup` [AUTH-3], `login` [AUTH-4], `refresh` [AUTH-5], `verifyEmail` [AUTH-7], `resendVerification` [AUTH-8], `forgotPassword` [AUTH-9], `resetPassword` [AUTH-10], `confirmEmailChange` [AUTH-13] (all `none`); `logout` [AUTH-6] (`required`) | P1 |
| `api/auth.ts` | `changePassword` [AUTH-11], `changeEmail` [AUTH-12] (`required`) | P5 |
| `api/discovery.ts` | `getHome` [DISC-1], `getTrending` [DISC-4], `getTopRated` [DISC-5], `getMostLiked` [DISC-6], `getImdbTop250` [DISC-7] (`optional`) + `rankedListFetchers` map by key | P2 |
| `api/recommendations.ts` | `getRecommendations` [REC-1] (`required`) | P2 |
| `api/catalog.ts` | `getGenres` [CAT-2], `getLanguages` [CAT-3] (`optional`, though no user data) | P3 |
| `api/discovery.ts` | `browseMovies` [DISC-2], `searchMovies` [DISC-3] (`optional`) | P3 |
| `api/catalog.ts` | `getMovie` [CAT-1] (`optional`) | P4 |
| `api/recommendations.ts` | `getSimilar` [REC-2] (`optional`) | P4 |
| `api/activity.ts` | `addToWatchlist` [ACT-2], `removeFromWatchlist` [ACT-3], `markWatched` [ACT-4], `unmarkWatched` [ACT-5], `rateMovie` [ACT-6], `removeRating` [ACT-7], `setReaction` [ACT-8], `removeReaction` [ACT-9] (`required`) | P4 |
| `api/me.ts` | `getWatched` [ME-4] (`required`) | P4 |
| `api/me.ts` | `getProfile` [ME-1], `getWatchlist` [ME-2], `getRatings` [ME-3], `getReactions` [ME-5] (`required`) | P5 |

- `refresh` is special: called only by the session module, `auth: 'none'`, never retried by the HTTP core.
- Home rows map `section.key` to a fetcher (`for-you` → `getRecommendations`, other keys → `rankedListFetchers[key]`); the `endpoint` string is not called directly.
- `rateMovie` rounds to one decimal before sending (contract [ACT-6]).

## [ARCH-2] Session and auth handling
**State** (`session/session-store.ts`, read via `useSession()` with `useSyncExternalStore`): `status: 'restoring' | 'authenticated' | 'anonymous'`, `accessToken`, `expiresAt` (ms = receipt time + `expiresIn`·1000), `user { userId, username }`. Memory only: never `localStorage`/`sessionStorage`/cookies (contract [AUTH-1]). The refresh cookie is invisible to JS.

**Restore on load:** the app starts `restoring`; `AuthGate` shows `FullPageSplash` (max ~5 s) and calls `refresh()` once. 200 → `authenticated`; 401 → `anonymous`; 503 → `anonymous` + toast "Sign-in is temporarily unavailable. Please sign in again later." (the backend clears the cookie on 503, contract [AUTH-5]); 429 → `anonymous`, retry the restore once after `Retry-After`; network error → `anonymous` + retry on the next `ensureFreshToken`. Routes render only after restore settles, so the first data requests already carry the right token.

**Refresh coordinator** (`session/refresh.ts`):
1. **Single flight per tab:** concurrent callers share one promise.
2. **Across tabs:** the call runs inside `navigator.locks.request('cinesmart-refresh', …)`. After acquiring the lock, if the store already holds a token valid for > 60 s (another tab refreshed and broadcast it), adopt it and skip the network call. This prevents two tabs presenting the same cookie, which the backend treats as theft and revokes every session (contract [AUTH-1]). No Web Locks support → single flight only.
3. The request is `POST /auth/refresh` with no `Authorization` header and `credentials: 'include'` (contract [AUTH-5]).
4. 200 → store the session, broadcast it; 401 → `expire()`; 503 → `expire()` with the "temporarily unavailable" toast; 429 / network → keep the current state and throw (callers show their own error).

**Keeping the token fresh** (needed because JWT-optional GETs silently answer anonymously with an expired token, contract [CONV-2]):
- `ensureFreshToken()` before every `optional`/`required` request: if `authenticated` and `expiresAt − now < 30 s` → `await refresh()`.
- A timer refreshes at `expiresAt − 60 s`; on `visibilitychange` to visible, run `ensureFreshToken()`.
- Safety net: if a JWT-optional response that should carry user data comes back anonymous while `authenticated` (details `userState === null`), refresh once and refetch that query once.

**401 on login-required calls:** refresh once, retry once (in the HTTP core). Still 401 or refresh failed → `expire()`: clear the store, broadcast `logout`, remove this user's cached queries, toast "Your session has expired. Please sign in again.", and if the current route is protected navigate to `/login?redirect=<current path+search>`.

**Login:** `login()` → store session → broadcast → navigate to `redirect` (only same-origin paths starting with `/`, never `//`) or `/`. Queries for the new viewer start fresh because keys include the viewer ([ARCH-4]). Then load the watched-ID set ([ARCH-5]).
**Logout:** `ensureFreshToken()` → `logout()` (204) → on success or on any failure: clear the store, broadcast `logout`, remove this user's queries, navigate to `/`, toast "Signed out". If logout itself returns 401 after the HTTP core's refresh-retry, the session is already gone; treat as success.
**Password change** (P5): store the returned session immediately and broadcast it (the old token is now revoked, contract [AUTH-11]).
**Password reset while logged in** (P1): after success, `expire()` silently (the backend revoked every session).

**Cross-tab** (`session/cross-tab.ts`, `BroadcastChannel('cinesmart-session')`): messages `{ type: 'session', accessToken, expiresAt, user }` and `{ type: 'logout' }`. On `session`: adopt if newer (`expiresAt` later) and switch to `authenticated` (a tab that was anonymous becomes logged in). On `logout`: clear the store, remove that user's queries, leave protected routes for `/`. Never broadcast while `restoring`. No BroadcastChannel → tabs work independently.
**Dev helpers** (`session/dev-tools.ts`, only when `import.meta.env.DEV`): `window.__cinesmart.expireAccessToken()` (sets `expiresAt` to now, to test refresh) and `window.__cinesmart.session()` (prints the state without the token).

## [ARCH-3] Error code → UI behaviour
Switch on `ApiError.code`, never on the message (contract [CONV-5], [ERR-1]).

| Code | UI behaviour |
|---|---|
| `VALIDATION_FAILED` + `fields` | Map each field to its form input (`applyServerErrors`, [COMP-5]); unknown field names → form-level alert with the message. On browse/search URL params → drop the bad param, show an inline notice ([ROUTES-4], [ROUTES-5]). |
| `VALIDATION_FAILED` without `fields` (page/size) | Treat as a client bug: reset to page 1, `ErrorState` if it repeats. |
| `BAD_REQUEST` | Generic "Something went wrong." (`ErrorState` / toast); logged to console. |
| `TOKEN_INVALID` | Email-link pages: "This link is invalid, has expired or was already used." + the right next step ([ROUTES-10]). |
| `UNAUTHORIZED` | Handled by the HTTP core: refresh + retry, then session-expired flow ([ARCH-2]). Never shown on login. |
| `INVALID_CREDENTIALS` | Login form alert "Invalid username or password." |
| `ACCOUNT_NOT_VERIFIED` | Login: show the resend-verification panel ([ROUTES-9]). |
| `ACCOUNT_LOCKED` | Form alert "Too many failed attempts. This account is locked for up to an hour." No countdown (no `Retry-After`). Submit stays enabled. |
| `EMAIL_TAKEN` / `USERNAME_TAKEN` | Field error on `email`/`newEmail` / `username` ("already registered" / "already taken"). On `/confirm-email`: page-level message. |
| `MOVIE_NOT_FOUND` | Details: "Movie not found" state ([ROUTES-11]). Activity action: toast "This movie is no longer available." |
| `NOT_FOUND`, `METHOD_NOT_ALLOWED`, `FORBIDDEN` | Generic error (client bug). |
| `RATE_LIMITED` with `retryAfter` | Forms: `RetryAfterNotice` ("Too many requests. Try again in 42 s.") with submit disabled until it reaches 0. Actions: toast "You're doing that too fast. Try again in N s." Queries: `ErrorState` with the countdown, auto-retry at 0. |
| `RATE_LIMITED` without `retryAfter` (login IP block) | Form alert "Too many failed sign-in attempts from your network. Try again later." |
| `SERVICE_UNAVAILABLE` | Forms: alert "This is temporarily unavailable. Please try again in a moment." (on email change: "We couldn't send the confirmation email. Please try again later."). Browsing is unaffected. |
| `INTERNAL_ERROR`, `NETWORK_ERROR` | Queries: `ErrorState` "We couldn't load this." + Retry. Actions: toast + rollback. Forms: alert. |

**Retry policy** (TanStack Query defaults overridden in `query/query-client.ts`): queries retry once only for `NETWORK_ERROR`, `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE` (after 1 s); never for 4xx. Mutations never auto-retry. `refetchOnWindowFocus: false` (protects the shared 120/min IP budget, contract [LIMIT-1]).

## [ARCH-4] Query keys, caching, invalidation
**Keys** (`query/keys.ts`): every key starts with the viewer, `v = userId ?? 'anon'`, because user-specific flags live inside public responses (contract [CONV-2]). Login/logout therefore never shows another viewer's cached data.

| Key | Data | `staleTime` |
|---|---|---|
| `[v, 'home']` | [DISC-1] | 60 s |
| `[v, 'list', key, page, size]` | [DISC-4]…[DISC-7], row pages | 60 s |
| `[v, 'recs', page, size]` | [REC-1] | 0 |
| `['genres']`, `['languages']` (no viewer) | [CAT-2], [CAT-3] | 1 h |
| `[v, 'browse', { genreId, languageId, year, page, size }]` | [DISC-2] | 60 s |
| `[v, 'search', q, page, size]` | [DISC-3] | 60 s |
| `[v, 'movie', id]` | [CAT-1] | 30 s |
| `[v, 'similar', id, size]` | [REC-2] | 5 min |
| `[v, 'me', 'profile']` | [ME-1] | 0 |
| `[v, 'me', 'watchlist', page, size]` / `[v, 'me', 'ratings', page, size]` | [ME-2] / [ME-3] | 0 |
| `[v, 'me', 'watched']` | [ME-4] (watched-ID set) | ∞ (kept in sync locally) |
| `[v, 'me', 'reactions']` | [ME-5] | 0 |

- `gcTime` 10 min. `placeholderData: keepPreviousData` on paged queries (no flash when changing page).
- **After any activity action** (on success, from the returned `UserMovieState`):
  1. `setQueryData([v,'movie',id])` → replace `userState`.
  2. `patchCardFlags(id, { inWatchlist, watched })` (`query/card-cache.ts`): walks every cached card list (home sections, lists, browse, search, similar, recs, me lists) and patches the matching card in place. No refetch, so no extra load on the rate limits.
  3. Update the watched-ID set ([ARCH-5]).
  4. Invalidate: `[v,'me','profile']` always; `[v,'me','watchlist']` after watchlist changes; `[v,'me','ratings']` after rating changes; `[v,'me','reactions']` after reaction changes; `[v,'recs']` and `[v,'home']` after any change (For You is recomputed per request, contract [REC-1]). Invalidation refetches only active queries.
- **Never** refetch to update `averageRating`/like counts after an action: they lag up to 1 h (contract [CFG-1]).
- **On logout/expiry:** `removeQueries({ queryKey: [userId] })`. On login: nothing to clear (new viewer prefix).
- **Prefetch rule:** prefetch at most the next page of the row/grid the user is currently scrolling; no hover prefetch of details (keeps under 120 requests/min per IP, contract [LIMIT-1]).

## [ARCH-5] Activity actions
- **Hooks** (`features/movie/use-movie-actions.ts`): `useWatchlistAction`, `useWatchedAction`, `useRatingAction`, `useReactionAction`, each a `useMutation` keyed per movie and action.
- **In-flight rule:** while a mutation for (movie, action) is pending, its control is `disabled` + `aria-busy`, so double clicks send nothing (contract [ACT-1] write limit 60/min). Like and dislike share one pending state. The rating popover sends only on **Save** or **Remove**, never while dragging.
- **Optimistic flow:** `onMutate` cancels `[v,'movie',id]`, snapshots it, writes the expected `userState` (and patches card flags); `onError` restores the snapshot (and flags), then shows the [ARCH-3] toast; `onSuccess` applies the server `UserMovieState` (the source of truth) and runs the [ARCH-4] update steps.
- **Reactions:** two exclusive thumbs. Like → `PUT LIKE`; Dislike → `PUT DISLIKE` (switches directly); clicking the active one → `DELETE` (reads `NEUTRAL`). `PUT NEUTRAL` is never sent.
- **Rating:** popover with a 1–10 slider (step 0.1) and a synced number input (step 0.1, clamped, one decimal). Save → `PUT`; Remove (only when rated) → `DELETE`. The trigger shows "Rate" or the user's rating (e.g. "8.5").
- **Watched-ID set** (`query/watched-set.ts`): loaded once after login/restore from [ME-4] into `[v,'me','watched']` as a `Set<number>`; updated from every action response. `MovieCard` shows the watched marker from the set when logged in (falls back to `card.watched`). Cleared on logout.
- **Anonymous users:** every action control is visible; clicking it navigates to `/login?redirect=<current path>` with toast "Sign in to use your watchlist and ratings." After login the user returns to the same page (no action is replayed).
- **After a rating or reaction change** on the details page, show once per visit the hint "Your rating counts toward the CineSmart average within the hour."

## [ARCH-6] Routing and guards
- `createBrowserRouter` in `app/router.tsx`; every page is a lazy route module (`lazy: () => import(...)`), so each screen is its own chunk. No loaders/actions: data comes from TanStack Query in components.
- **Layouts:** `RootLayout` (providers already above it; `AuthGate`, scroll restoration, route announcer for screen readers, `Toaster`) → `ShellLayout` (Header, main, Footer) for app pages; `AuthLayout` (wordmark + centred card, no header nav) for auth and email-link pages.
- **Guards** (`session/guards.tsx`): `RequireAuth` (anonymous → `<Navigate to="/login?redirect=…" replace>`), `GuestOnly` for `/login` and `/signup` (authenticated → `/`). Email-link pages and `/forgot-password`, `/resend-verification` are open to everyone.
- **URL state:** pagination `?page=N` is **1-based** in URLs (absent = 1); filters and `q` live in the URL so pages are shareable and the back button works. `use-page-param.ts` parses/clamps.
- **Document titles:** `<Page> · CineSmart` (`use-document-title.ts`). Focus moves to the page `<h1>` after navigation.
- **Errors:** each route has an `ErrorBoundary` export rendering `ErrorState`; unknown paths render the 404 page ([ROUTES-11]).

---

## [ROUTES-1] Route map
| Route | Screen | Access | Contract IDs | Phase |
|---|---|---|---|---|
| `/` | Home | public | [DISC-1], [DISC-4]…[DISC-7], [REC-1] | P2 |
| `/lists/:listKey` | Ranked list (`trending`, `top-rated`, `most-liked`, `imdb-top-250`) | public | [DISC-4]…[DISC-7] | P2 |
| `/for-you` | For You | login | [REC-1] | P2 |
| `/browse` | Browse | public | [CAT-2], [CAT-3], [DISC-2] | P3 |
| `/search` | Search results | public | [DISC-3] | P3 |
| `/movies/:movieId` | Movie details | public (actions need login) | [CAT-1], [ACT-2]…[ACT-9], [REC-2], [ME-4] | P4 |
| `/watchlist` | My watchlist | login | [ME-2], [ACT-3] | P5 |
| `/ratings` | My ratings | login | [ME-3] | P5 |
| `/profile` | Profile | login | [ME-1], [ME-5], [AUTH-11], [AUTH-12], [AUTH-6] | P5 |
| `/signup` | Sign up | guest only | [AUTH-3] | P1 |
| `/login` | Sign in | guest only | [AUTH-4], [AUTH-8] | P1 |
| `/resend-verification` | Resend verification | everyone | [AUTH-8] | P1 |
| `/forgot-password` | Forgot password | everyone | [AUTH-9] | P1 |
| `/verify-email` | Verify email (email link) | everyone | [AUTH-7] | P1 |
| `/reset-password` | Reset password (email link) | everyone | [AUTH-10] | P1 |
| `/confirm-email` | Confirm new email (email link) | everyone | [AUTH-13] | P1 |
| `/dev/ui` | UI kitchen sink (dev builds only) | dev | [CAT-2] (connectivity ping) | P0 |
| `*` | Not found | everyone | — | P2 |

Session restore ([AUTH-5]) and logout ([AUTH-6]) run from the app shell on every route (P1).

## [ROUTES-2] Home (`/`)
- **Access:** public; contract [DISC-1] (+ row paging via [DISC-4]…[DISC-7] and [REC-1]).
- **Anonymous hero** (compact, above the rows; hidden when logged in): headline "Find your next movie, and where to watch it in Canada."; lead "Browse trending titles and IMDb's best, see Canadian streaming availability, and sign up to rate, like and get picks made for you."; large `SearchBox`; buttons **Sign up** (primary) and **Sign in** (secondary).
- **Sections:** render `sections` in response order, each as a `MovieRow` ([COMP-2]) titled with the backend `title`, a "See all (N)" link (`N` = `totalResults`, formatted) to `/for-you` or `/lists/<key>`, and a subtitle by key: `for-you` "Picked for you", `trending` "Updated daily", `top-rated` "Weighted by CineSmart ratings (5+ ratings)", `most-liked` "Most likes from CineSmart members", `imdb-top-250` "IMDb rating, 25,000+ votes". For You appears only when the backend sends it (logged in and non-empty).
- **Row paging:** a row starts with the home cards; when the user scrolls to within one viewport of the end and loaded < `totalResults`, fetch the next page of that row's list with `size=10` (pages 1, 2, …), de-duplicate by `movieId` within the row, append. Stop at 50 cards or `totalResults`; then the row ends with a "See all" tile.
- **States:** loading → hero (if anonymous) + 3 `RowSkeleton`s; error → `ErrorState` with Retry; `sections` empty → `EmptyState` "No movies to show yet." Row page fetch error → small inline "Couldn't load more · Retry" at the row end.

## [ROUTES-3] Ranked lists and For You
**`/lists/:listKey`** (public; contract [DISC-4]…[DISC-7])
- Valid keys: `trending`, `top-rated`, `most-liked`, `imdb-top-250`; anything else → 404 page. Title and subtitle from a fixed map (same titles as the home rows).
- `PageHeader` with title, subtitle and "N titles"; `MovieGrid` of 20 per page; `PaginationBar` driven by `?page=` (1-based).
- `top-rated` empty → `EmptyState` "No movie has 5 ratings yet. Rate movies to help build this list." `most-liked` empty → "Nobody has liked a movie yet." Others empty → "Nothing here yet."
- `imdb-top-250` shows the note "Derived from stored IMDb data; may differ from IMDb's official list."
**`/for-you`** (login required; contract [REC-1])
- Same grid layout; each card shows its `reason` with `ReasonChip` under the title.
- When every result on page 1 has reason "Popular on CineSmart" (cold start), show an info banner: "Rate, like, watch or add a few movies and this list will adapt to your taste."
- Empty → `EmptyState` "No recommendations right now." Loading → grid skeleton; error → `ErrorState`.

## [ROUTES-4] Browse (`/browse`)
- **Access:** public; contract [CAT-2], [CAT-3], [DISC-2].
- **URL:** `/browse?genreId=&languageId=&year=&page=` (only set params; `page` 1-based).
- **Filter bar:** Genre select (from `/genres`, "All genres" default), Language select (from `/languages`, most-used first, "All languages" default), Year select (current year down to **1920**, "Any year" default), "Clear filters" button when any filter is set. Changing a filter resets `page`. On mobile the filters collapse into a "Filters" button opening a sheet.
- **Results:** heading "All movies" or a summary ("Sci-Fi · English · 2014"), "N movies", `MovieGrid` 20 per page, `PaginationBar`. Order is fixed by the backend (IMDb rating); no sort control.
- **Invalid URL params** (non-numeric, or a 400 with `fields.genreId|languageId|year`): drop that param, keep the rest, show `InlineAlert` "That filter isn't available, so it was removed."
- **States:** filter lists loading → disabled selects; results loading → grid skeleton; empty → `EmptyState` "No movies match these filters." + Clear filters; error → `ErrorState`.
- **Header Browse menu** ([COMP-1] `BrowseMenu`): "All movies" → `/browse`; "Genres" submenu (all genres) → `/browse?genreId=`; "Languages" submenu (first 12 + "All languages…" → `/browse` with the language select focused); "By year" → `/browse` with the year select focused. Main nav also links "IMDb Top 250" → `/lists/imdb-top-250`.

## [ROUTES-5] Search (`/search`)
- **Access:** public; contract [DISC-3].
- **URL:** `/search?q=&page=`. `SearchBox` (header, hero, mobile sheet) submits on Enter or the search button; no type-ahead (each keystroke would cost the shared IP budget).
- **Client rule:** trimmed `q` must be 3–100 characters; otherwise no request, inline hint "Type at least 3 characters." (or "Use 100 characters or fewer."). The page with a missing/invalid `q` shows the search field and the hint.
- **Results:** heading `Results for "q"`, "N titles", note "Matches movie titles and people (actors, directors, writers).", `MovieGrid` 20 per page, `PaginationBar`. Order = relevance.
- **States:** loading → grid skeleton; empty → `EmptyState` `No movies or people match "q".` with tips (check spelling, try a shorter word); 400 `fields.q` → show the hint; error → `ErrorState`.

## [ROUTES-6] Movie details (`/movies/:movieId`)
- **Access:** public; actions need login ([ARCH-5]). Contract [CAT-1], [ACT-2]…[ACT-9], [REC-2], [ME-4].
- `movieId` must be a positive integer, else the 404 page.
- **Layout (top to bottom):** blurred poster backdrop with scrim; `PosterImage` + header block: title (h1), meta line `year · runtime ("2h 49m") · contentType`, genre chips (→ `/browse?genreId=`), languages (→ `/browse?languageId=`); `MovieActions` ([COMP-3]); **Ratings** block: IMDb `8.7/10` + votes ("2.2M votes"), Rotten Tomatoes `73%`, Metascore `74` (each hidden when null); **CineSmart** block: average (`8.4` or "No ratings yet"), "N ratings", likes/dislikes counts, `InfoTooltip` "CineSmart stats update every hour."; plot; credits: Directors, Writers, Cast (names link to `/search?q=<name>`); details list: Released (en-CA long date), Studio; **Where to watch in Canada**: availability grouped Stream (`sub`) / Free / Rent / Buy / Other (`null` type), each a platform chip linking out (`target="_blank" rel="noopener noreferrer"`, external-link icon; no link when `url` is null); none → "No streaming information for Canada yet."; **More like this**: `MovieRow` of [REC-2] (size 10), hidden when empty.
- **States:** loading → `DetailsSkeleton`; `MOVIE_NOT_FOUND` → 404 page variant "Movie not found"; other errors → `ErrorState`; similar loading/error stay inside their row (row skeleton / hidden on error).
- **Freshness:** user state comes from `userState` and action responses; platform stats are never refetched after actions ([ARCH-4]).

## [ROUTES-7] Watchlist and ratings
**`/watchlist`** (login; contract [ME-2], [ACT-3])
- `PageHeader` "My watchlist" + "N titles"; `MovieGrid` (20 per page, newest first) with caption "Added Oct 11, 2026" and the watched marker; each card has a remove button (`WatchlistButton` compact). Removing is optimistic: the card fades out, the page refetches, `PaginationBar` adjusts (go back a page if the current page becomes empty).
- Empty → `EmptyState` "Your watchlist is empty." + "Browse movies" button.
**`/ratings`** (login; contract [ME-3])
- "My ratings" + "N rated"; grid with the user's rating badge (amber star + `9.0`) and "Rated Oct 12, 2026"; 20 per page, most recent first. Changing a rating happens on the details page.
- Empty → `EmptyState` "You haven't rated any movies yet."
- Both: loading → grid skeleton; error → `ErrorState`; linked from the user menu and the profile counts.

## [ROUTES-8] Profile (`/profile`)
- **Access:** login; contract [ME-1], [ME-5], [AUTH-11], [AUTH-12], [AUTH-6].
- **Stacked cards** (single column, max 720px):
  1. **Account:** username (note "Usernames can't be changed."), email, "Member since <Month YYYY>".
  2. **Your activity:** Watchlist N (→ `/watchlist`), Ratings N (→ `/ratings`), Watched N (no link; watched isn't listed), Liked N and Disliked N (counted from [ME-5]).
  3. **Change password:** current password, new password, confirm new password (client-only match check). Success → toast "Password changed. Other devices were signed out." and the form resets ([ARCH-2] stores the new session).
  4. **Change email:** current password, new email. Success → `InlineAlert` (success) "We sent a confirmation link to <newEmail>. Your email changes after you open it." The Account card keeps showing the old email until then.
  5. **Sign out** button.
- **States:** loading → card skeletons; error → `ErrorState`. Form errors per [ARCH-3] (`currentPassword` "is incorrect", `newPassword`/`newEmail` "must be different…", `ACCOUNT_LOCKED`, 429, 503).

## [ROUTES-9] Auth pages
All use `AuthLayout`, React Hook Form + Zod with the contract rules ([COMP-5]), `SubmitButton` pending state, and [ARCH-3] mapping.
- **`/signup`** (guest only; [AUTH-3]): username (hint "3–32 characters: letters, numbers, _ . -"), email, password (8–100, show/hide). Success (201) → navigate to `/login` with the alert "Account created. Check <email> for a verification link (valid 24 hours), then sign in." + link "Didn't get it? Resend". Links: "Already have an account? Sign in".
- **`/login`** (guest only; [AUTH-4], [AUTH-8]): username, password. Success → `redirect` param or `/`. 401 → alert; 403 → **resend panel** inline below the form: text "Your email isn't verified yet. Enter your email and we'll send a new link.", email field, "Resend verification email" (calls [AUTH-8], shows the returned message). Locked/429/503 per [ARCH-3]. Links: "Forgot password?", "Create an account".
- **`/resend-verification`** (everyone; [AUTH-8]): email field → shows the returned message (same whatever the account state). Link back to Sign in.
- **`/forgot-password`** (everyone; [AUTH-9]): email field → success panel with the returned message and "The link is valid for 10 minutes." Link back to Sign in.
- Shared: 429 countdown disables submit; 503 alert; inputs have `autocomplete` (`username`, `email`, `current-password`, `new-password`).

## [ROUTES-10] Email-link pages
Every page reads `token` from the query string; a missing token shows the invalid-link state without calling the API. Tokens are single use, so the POST runs **exactly once** per page load (a `useRef` guard survives React StrictMode's double effect).
- **`/verify-email`** ([AUTH-7]): auto-POST on load with a spinner "Verifying your email…". Success → "Email verified. You can now sign in." + **Sign in** button (no auto-login). `TOKEN_INVALID` → "This verification link is invalid, has expired or was already used. If you already verified, just sign in." + buttons Sign in / Resend verification. 429/503 → message + Retry button.
- **`/reset-password`** ([AUTH-10]): form new password + confirm (client match). Success → navigate to `/login` with alert "Password reset. Please sign in."; if this tab had a session, `expire()` it silently first. `TOKEN_INVALID` → "This reset link is invalid, has expired (10 minutes) or was already used." + "Request a new link" (→ `/forgot-password`).
- **`/confirm-email`** ([AUTH-13]): auto-POST on load. Success → "Your email address has been changed." + button to Profile (if logged in, also invalidate `[v,'me','profile']`) or Home. `TOKEN_INVALID` → invalid-link message + link to Profile. `EMAIL_TAKEN` → "That email is now used by another account. Request the change again with a different email."

## [ROUTES-11] Not found and app errors
- **404 page** (`*`, invalid `listKey`, invalid `movieId`, `MOVIE_NOT_FOUND` variant): `EmptyState` with a film icon, "We couldn't find that page." (or "Movie not found."), buttons Home and Search. Rendered inside `ShellLayout`.
- **Route error boundary:** `ErrorState` "Something went wrong." + Reload; logs the error to the console.
- **Global offline/backend-down:** no banner; each query shows its own `ErrorState` with Retry ([ARCH-3]).

---

## [COMP-1] Layout and navigation components
| Component | Props | Rules |
|---|---|---|
| `AppShell` (`ShellLayout`) | `children` | Skip link "Skip to content" → `#main`; header sticky with `--surface` + bottom border; main max-width 1440px with gutters ([DS-2]). |
| `Header` | — | Desktop: `Wordmark` (→ `/`), nav (Home, Browse menu, IMDb Top 250, Watchlist when logged in), `SearchBox`, then `UserMenu` or Sign in / Sign up buttons. Tablet: wordmark, search field, menu button. Mobile: wordmark, search icon (opens `SearchBox` sheet), menu button. Active link styled with `aria-current="page"`. Shows nothing user-specific while `restoring`. |
| `MobileNav` | `open`, `onOpenChange` | shadcn `Sheet` from the right: same links as the desktop nav, Browse entries flattened, account links, Sign out. Closes on navigation. |
| `BrowseMenu` | — | shadcn `DropdownMenu` per [ROUTES-4]; loads genres/languages lazily on first open (shared cached queries). Keyboard: arrows, Esc. |
| `SearchBox` | `variant: 'header' \| 'hero' \| 'page'`, `defaultValue?`, `autoFocus?` | `role="search"` form; label "Search movies or people"; trims; enforces 3–100 chars with an inline hint, no request when invalid; navigates to `/search?q=`. |
| `UserMenu` | — | Trigger: avatar circle with the username's first letter + username (desktop). Items: Profile, My watchlist, My ratings, For You, Sign out. |
| `Footer` | — | Brand line ([DS-1]), links Browse / IMDb Top 250 / Sign in. |
| `Wordmark` | `size?: 'sm' \| 'md' \| 'lg'` | Icon + "Cine" + accent "Smart"; `aria-label="CineSmart home"` when used as a link. |
| `PageHeader` | `title`, `subtitle?`, `meta?` (e.g. "N titles"), `actions?` | `h1`; focus target after navigation. |
| `AuthLayout` | `children` | Centered card (420px), wordmark above, link "Back to home". |

## [COMP-2] Movie display components
| Component | Props | Rules |
|---|---|---|
| `PosterImage` | `src: string \| null`, `title`, `size: 'card' \| 'details'`, `priority?` | 2:3 box; `loading="lazy"` unless `priority`; `alt` = title; on `null`, empty, `"N/A"` or load error → the [DS-1] placeholder (icon + title). No layout shift. |
| `MovieCard` | `movie: MovieCard`, `caption?: ReactNode` (e.g. reason, "Added …", rating), `action?: ReactNode`, `variant?: 'row' \| 'grid'` | Whole card is one link to `/movies/:id` (title as accessible name). Hover/focus reveals overlay with title, year, IMDb rating and the card action (`CardWatchlistButton`, from P4). Corner markers when logged in: bookmark if `inWatchlist`, eye if watched ([ARCH-5] watched set). Under the poster: title (2 lines), year · IMDb rating. |
| `MovieRow` | `title`, `subtitle?`, `seeAllHref?`, `totalResults?`, `initial: MovieCard[]`, `fetchPage?: (page) => Promise<Page<MovieCard>>`, `maxItems?` (50) | Horizontal scroll container with scroll-snap; prev/next arrow buttons (`aria-label="Scroll <title> left/right"`) scroll by one viewport; lazy next page per [ROUTES-2]; ends with a "See all" tile when `seeAllHref`. Keyboard: cards are tabbable in order; arrows hidden from the tab order on mobile. `section` with `aria-labelledby` the row title. |
| `MovieGrid` | `items: MovieCard[]`, `renderCaption?`, `renderAction?`, `loading?`, `skeletonCount?` (20) | Responsive columns per [DS-3]; `ul`/`li` semantics. |
| `PaginationBar` | `page` (1-based), `totalPages`, `onPageChange` / `hrefForPage` | Prev / numbered pages (current ± 1, first, last, ellipses) / Next; `nav aria-label="Pagination"`; hidden when `totalPages ≤ 1`; scrolls to top on change. |
| `RatingBadges` | `imdb?`, `average?`, `userRating?` | Formats via `lib/format.ts`; IMDb in neutral, CineSmart average with amber star; user rating amber filled. |
| `ReasonChip` | `reason: string` | Small muted pill with a `Sparkles` icon; full text in `title` when truncated. |

## [COMP-3] Activity controls
All use [ARCH-5] hooks; disabled + `aria-busy` while pending; for anonymous users clicking redirects to sign-in.
| Component | Props | Rules |
|---|---|---|
| `MovieActions` | `movieId`, `userState: UserMovieState \| null` | Row of the four controls below; wraps on mobile; reads live state from `[v,'movie',id]`. |
| `WatchlistButton` | `movieId`, `active: boolean`, `compact?` | `aria-pressed`; label "Add to watchlist" / "Remove from watchlist" (icon `Bookmark` / `BookmarkCheck`). Compact = icon-only with `aria-label`. |
| `WatchedButton` | `movieId`, `active` | `aria-pressed`; "Mark as watched" / "Watched" (highlighted, with tooltip "Click to unmark"); icon `Eye` / `EyeOff`. |
| `RatingControl` | `movieId`, `rating: number \| null` | Popover per [ARCH-5]: slider 1–10 step 0.1, number input, Save (disabled when unchanged or invalid), Remove rating (only when rated), Cancel. Trigger shows `Star` + "Rate" or the value. Input rejects anything outside 1–10 / more than one decimal before sending. |
| `ReactionButtons` | `movieId`, `reaction: Reaction` | Two toggle buttons in a group (`role="group" aria-label="Your reaction"`): `ThumbsUp` (active colour `--like`), `ThumbsDown` (`--dislike`); `aria-pressed` reflects LIKE/DISLIKE; NEUTRAL = neither pressed. |
| `CardWatchlistButton` | `movie: MovieCard` | Icon button in the card overlay; same mutation as `WatchlistButton`; stops link navigation; anonymous → sign-in redirect. |

## [COMP-4] Feedback components
| Component | Props | Rules |
|---|---|---|
| `CardSkeleton`, `RowSkeleton`, `GridSkeleton`, `DetailsSkeleton` | `count?` | Match final layout sizes (no shift); shimmer off under reduced motion; `aria-hidden` with a visually hidden "Loading…" status. |
| `EmptyState` | `icon?`, `title`, `description?`, `action?` | Centered; used for empty lists and 404. |
| `ErrorState` | `error: ApiError \| unknown`, `onRetry?`, `title?` | Message per [ARCH-3]; shows `RetryAfterNotice` for `RATE_LIMITED`; Retry button calls `onRetry` (auto-retries at countdown end). |
| `InlineAlert` | `variant: 'error' \| 'warning' \| 'success' \| 'info'`, `title?`, `children` | shadcn `Alert`; `role="alert"` for errors, `status` otherwise. |
| `RetryAfterNotice` + `useRetryAfter(seconds)` | `seconds` | Live countdown "Try again in 42 s"; hook returns `{ remaining, active }` for disabling submits. |
| `InfoTooltip` | `label`, `children` | `Info` icon button with a Radix tooltip; keyboard focusable. |
| `FullPageSplash` | — | Wordmark + subtle pulse while the session restores. |
| `notify` (`feedback/notify.ts`) | `success(msg)`, `error(err)`, `info(msg)` | Wraps Sonner; `error(err)` maps `ApiError` per [ARCH-3]. Toasts bottom-right desktop, top-center mobile; 4 s; deduped by id for repeated errors. |

## [COMP-5] Form components
| Piece | Rules |
|---|---|
| `TextField` | Label, input, hint, error text (`aria-describedby`, `aria-invalid`); shows RHF error. |
| `PasswordField` | `TextField` + show/hide toggle (`aria-pressed`, label "Show password"). |
| `SubmitButton` | Disabled while submitting or while `useRetryAfter` is active; spinner + label. |
| `FormAlert` | Form-level `InlineAlert` for non-field errors. |
| `applyServerErrors(error, setError, knownFields)` | Maps `ApiError.fields` onto RHF fields (field names = contract JSON names); unmapped → returns a message for `FormAlert`. Maps `USERNAME_TAKEN`/`EMAIL_TAKEN` to the `username`/`email` (or `newEmail`) field. |
| Zod schemas (`lib/validation.ts`) | Mirror the contract exactly: `username` `^[A-Za-z0-9_.-]{3,32}$`; `email` valid + max 64, trimmed; `password`/`newPassword` 8–100; login fields non-blank; `token` non-blank ≤ 200; rating 1–10 with ≤ 1 decimal; search `q` 3–100 after trim. Confirm-password match is client-only. |

---

## [COVER] Capability coverage checklist
Tick a row when its phase's acceptance check passes. Every contract endpoint appears at least once.

| # | Backend capability | Contract | Shown in (screen / component) | Phase | Done |
|---|---|---|---|---|---|
| 1 | CORS with credentials, typed error shape, error codes | CONV-1, CONV-5, ERR-1 | HTTP core, `ErrorState`, `notify` | P0 | [x] |
| 2 | Signup with username/email/password rules, duplicate checks | AUTH-3 | `/signup` | P1 | [x] |
| 3 | Verification link (24 h, single use), no auto-login | AUTH-7, CFG-2 | `/verify-email` | P1 | [x] |
| 4 | Resend verification (no enumeration) | AUTH-8 | login resend panel, `/resend-verification` | P1 | [x] |
| 5 | Login order: IP block → lock → password → verified; generic 401 | AUTH-4, LIMIT-3 | `/login` alerts | P1 | [x] |
| 6 | Lockout 429 `ACCOUNT_LOCKED` and IP-block 429 messages | LIMIT-3, ERR-2 | `/login`, profile forms | P1, P5 | [x] |
| 7 | IP rate limits with `Retry-After` countdown | LIMIT-1 | `RetryAfterNotice` on all auth forms, `ErrorState` | P1, P6 | [x] |
| 8 | Access token in memory, session restore via refresh on load | AUTH-1, AUTH-5 | `AuthGate`, session store | P1 | [x] |
| 9 | Refresh-token rotation; reuse = all sessions revoked (cross-tab lock) | AUTH-1, AUTH-2 | refresh coordinator (Web Locks + BroadcastChannel) | P1 | [x] |
| 10 | Proactive refresh (JWT-optional GETs go anonymous when expired) | CONV-2 | `ensureFreshToken`, timer | P1 | [x] |
| 11 | 401 → single refresh + retry → Sign In; 7-day cap | AUTH-1 | HTTP core, session-expired flow | P1 | [x] |
| 12 | Logout (token blacklisted, cookie cleared), cross-tab logout | AUTH-6 | `UserMenu`, `MobileNav`, profile | P1 | [x] |
| 13 | Forgot password (email only, same message, 10 min link) | AUTH-9 | `/forgot-password` | P1 | [x] |
| 14 | Reset password (logs out all sessions) | AUTH-10 | `/reset-password` | P1 | [x] |
| 15 | Email-change confirm link + notice | AUTH-13 | `/confirm-email` | P1 | [x] |
| 16 | Redis-down 503 behaviour (login/refresh/forms) | LIMIT-4 | auth forms, restore toast | P1, P6 | [x] |
| 17 | Home sections in fixed order, de-duplicated, empty rows hidden | DISC-1 | Home | P2 | [x] |
| 18 | For You row only when logged in and non-empty | DISC-1, REC-1 | Home | P2 | [x] |
| 19 | Row arrows load the next page; "See all (totalResults)" | DISC-1, CONV-4 | `MovieRow` | P2 | [x] |
| 20 | Trending (top10 table) | DISC-4 | Home row, `/lists/trending` | P2 | [x] |
| 21 | Weighted top-rated (≥ 5 ratings) and its empty state | DISC-5 | Home row, `/lists/top-rated` | P2 | [x] |
| 22 | Most liked | DISC-6 | Home row, `/lists/most-liked` | P2 | [x] |
| 23 | IMDb Top 250 (25k votes, cap 250) | DISC-7 | Home row, nav link, `/lists/imdb-top-250` | P2 | [x] |
| 24 | For You page with recommendation `reason`s | REC-1 | `/for-you`, `ReasonChip` | P2 | [x] |
| 25 | "Popular on CineSmart" cold start | REC-1 | `/for-you` banner | P2 | [x] |
| 26 | Movie card with platform stats and user flags (`null` when anonymous) | CONV-6 | `MovieCard` | P2 | [x] |
| 27 | Missing poster placeholder | CONV-3 | `PosterImage` | P2 | [x] |
| 28 | Standard pagination (0-based API, 20/30) | CONV-4 | `PaginationBar`, all grids | P2 | [x] |
| 29 | Genres and languages lists (cached 1 h) | CAT-2, CAT-3 | `BrowseMenu`, `/browse` filters | P3 | [x] |
| 30 | Browse all movies by genre/language/year (AND), fixed order | DISC-2 | `/browse` | P3 | [x] |
| 31 | Unknown params / invalid filter → 400 handling | DISC-2 | `/browse` notice | P3 | [x] |
| 32 | Search by title **and person name**, 3–100 chars, relevance | DISC-3 | `SearchBox`, `/search` | P3 | [x] |
| 33 | Full movie details (ratings, crew, studio, released, runtime) | CAT-1 | `/movies/:id` | P4 | [x] |
| 34 | Where to watch in Canada (availability links) | CAT-1 | details "Where to watch" | P4 | [x] |
| 35 | Platform stats with "updated hourly" lag notice | CAT-1, CFG-1 | details `InfoTooltip` + hint | P4 | [x] |
| 36 | Live `userState` after each action (PUT/DELETE idempotent) | ACT-1…ACT-9 | `MovieActions` | P4 | [x] |
| 37 | Watchlist add/remove | ACT-2, ACT-3 | `WatchlistButton`, `CardWatchlistButton`, `/watchlist` | P4, P5 | [x] |
| 38 | Watched mark/unmark (not listed, marker only) | ACT-4, ACT-5, ME-4 | `WatchedButton`, card marker, watched-ID set | P4 | [x] |
| 39 | Rating 1–10 with one decimal, remove | ACT-6, ACT-7 | `RatingControl` | P4 | [x] |
| 40 | Like / dislike / neutral (DELETE to clear) | ACT-8, ACT-9 | `ReactionButtons` | P4 | [x] |
| 41 | In-flight disabling + optimistic update + rollback; per-user 429 | ACT-1, LIMIT-2 | activity hooks, toasts | P4 | [x] |
| 42 | Anonymous action → Sign In prompt | CONV-2 | all activity controls | P4 | [x] |
| 43 | Similar titles (logged-in exclusions) | REC-2 | details "More like this" | P4 | [x] |
| 44 | Movie not found (404) | CAT-1, ERR-1 | 404 variant | P4 | [x] |
| 45 | My watchlist (paged, newest first, watched marker) | ME-2 | `/watchlist` | P5 | [x] |
| 46 | My ratings (paged, rating + date) | ME-3 | `/ratings` | P5 | [x] |
| 47 | Profile with counts; username immutable | ME-1 | `/profile` | P5 | [x] |
| 48 | Liked / disliked counts | ME-5 | `/profile` activity card | P5 | [x] |
| 49 | Change password (wrong current = 400, new token, others signed out) | AUTH-11 | `/profile` | P5 | [x] |
| 50 | Change email (link to new address, switch on confirm) | AUTH-12 | `/profile` | P5 | [x] |
| 51 | Per-user read limit on `/me/**` and `/recommendations` | LIMIT-2 | `ErrorState` countdown | P5, P6 | [x] |
| 52 | Responsive desktop/tablet/mobile, WCAG 2.2 AA | — (PRD) | all screens | P6 | [x] |
| 53 | Deployment constraints (same-site, HTTPS, SPA fallback, origins) | CFG-2 | README | P6 | [x] |

---

## [CLAR] Clarifications
Questions asked while planning (2026-10-12) and the answers. New questions from implementation chats are appended here with the date.

| # | Question | Answer |
|---|---|---|
| 1 | Where does the app live? | `Cinesmart-Frontend/` (new folder). |
| 2 | Framework and language? | React 19 + TypeScript + Vite. |
| 3 | Router and data library? | React Router 7 + TanStack Query 5. |
| 4 | UI / CSS? | Tailwind CSS 4 + shadcn/ui (Radix). |
| 5 | Forms? | React Hook Form + Zod. |
| 6 | Icons? | Lucide. |
| 7 | Package manager / Node? | pnpm + Node 24 LTS. |
| 8 | Testing? | Vitest + Testing Library + Playwright smoke flows. |
| 9 | Visual direction / theme? | Dark cinematic, dark only. |
| 10 | Accent colour? | Amber / gold. |
| 11 | Typography / logo? | Inter + text wordmark (no image logo). |
| 12 | Motion? | Subtle, off under reduced motion. |
| 13 | Home rows? | Scrollable row, lazy next page near the end, "See all (N)" link to a grid page. |
| 14 | Rating control? | Popover with 1–10 slider (step 0.1) + number input + Save/Remove. |
| 15 | Like/dislike toggling? | Two exclusive thumbs; clicking the active one sends DELETE; PUT NEUTRAL never sent. |
| 16 | Optimistic updates? | Yes: optimistic, reconcile with `userState`, roll back on error. |
| 17 | Feedback and states? | Toasts for actions, inline errors for forms, skeletons for loading, empty states with a CTA, error panel with Retry. |
| 18 | Showing the 1-hour stats lag? | Info tooltip "updated hourly" + one-time hint after the user rates/reacts. |
| 19 | Landing intro? | Compact hero above the rows for anonymous visitors. |
| 20 | Missing posters? | Gradient tile + film icon + title. |
| 21 | Profile layout? | Single page, stacked cards. |
| 22 | Browse year range? | Current year down to 1920. |
| 23 | Resend path on 403 at login? | Inline panel on the login page + standalone `/resend-verification`. |
| 24 | 429 / 503 display? | Countdown + disabled submit when `Retry-After` exists; "try again later" without it; 503 retry message. |
| 25 | Multiple tabs vs refresh rotation? | Web Locks around refresh + BroadcastChannel to share the token and login/logout. |
| 26 | API URL in development? | Direct to `VITE_API_BASE_URL` (default `http://localhost:8080/api/v1`), cross-origin with credentials; no Vite proxy. |
| 27 | Accessibility / i18n / analytics? | WCAG 2.2 AA; English only with `en-CA` formats; no analytics. |
| 28 | Lint/format/deploy? | ESLint 9 + Prettier; deployment target undecided, static `dist/` with notes. |
| 29 | How to use `GET /me/watched` and `GET /me/reactions` (IDs only)? | `/me/reactions` → liked/disliked counts on the profile; `/me/watched` → watched-ID set that keeps card markers correct. |
| 30 | Signup body: code returns `{username, message}`, docs say `{message}`. | Code wins; the contract documents `{username, message}`. |

**Code facts that differ from or add to the old docs** (recorded in the contract; no question needed):
- An invalid `Authorization` header on a public auth POST (including `/auth/refresh`) → 401 before the endpoint runs → the client never sends the token there (contract [CONV-2]).
- JWT-optional GETs answer anonymously (200) with an expired token → proactive refresh ([ARCH-2]).
- 429 from the login IP block and `ACCOUNT_LOCKED` carry no `Retry-After` (contract [LIMIT-3]).
- `VALIDATION_FAILED` for `page`/`size` has no `fields` (contract [CONV-4]).
- Any error from `/auth/refresh`, including 503, clears the refresh cookie (contract [AUTH-5]).
- `/auth/refresh` shares the 120/min `public` IP budget with all browsing (contract [LIMIT-1]).

## [GAPS] Backend gaps and open risks
List only; the backend is not changed by frontend work.
1. **Refresh reuse across tabs:** two refreshes with the same cookie revoke every session; there is no grace window. Mitigated client-side by Web Locks ([ARCH-2]); browsers without Web Locks keep the risk.
2. **Refresh 503 clears the cookie:** a Redis blip during refresh logs the user out for good (contract [AUTH-5]).
3. **Silent anonymous responses** on JWT-optional GETs with an expired/revoked token: stale flags are possible if a refresh is missed (mitigated by proactive refresh + the `userState === null` safety net).
4. **Public auth POSTs reject stale `Authorization` headers** with 401 instead of ignoring them (client must never send them).
5. **No `Retry-After`** on `ACCOUNT_LOCKED` and the login IP block; the UI can only say "later".
6. **No batch card endpoint by IDs:** `/me/watched` and `/me/reactions` can't be shown as lists of titles.
7. **No cheap "my watchlist IDs" endpoint:** watchlist flags on cached cards are kept right by local patching only.
8. **Shared IP budget:** 120 requests/min per IP covers refresh, home, rows, browse, search, details and similar; users behind one NAT share it. Aggressive prefetching would hit 429.
9. **Platform stats lag up to 1 h**; Top Rated is empty until a movie has 5 ratings (row hidden, list page shows an empty state).
10. **For You is recomputed on every request** (no cache); slow responses are possible as data grows; counts toward the per-user read limit.
11. **Cookie deployment constraints:** `SameSite=Strict`, host-only, `Path=/api/v1/auth`, `Secure` → frontend and API must be same-site and on HTTPS in production (contract [CFG-2]).
12. **Unknown URLs outside `/movies/**` return 401, not 404**, when no valid token is sent.
13. **Posters are external URLs** (no proxy, no sizes, may be null or broken); no backdrops, trailers or person images.
14. **No country, awards, box office**, no person pages, no browse by actor/director, no delete account, username immutable (product scope).
15. **Search has no type-ahead endpoint** and doesn't say whether a title or a person matched.
16. **Single-use email tokens:** any duplicate POST (double effect, prefetching mail scanners running JS) consumes the token; the second sees `TOKEN_INVALID`.
17. **No health endpoint** for the frontend to detect backend/Redis outages up front.
18. **Docs drift:** signup response shape differs from the PRD (`{username, message}`).

---

## [P0] Phase 0: Scaffold, design system, API core
**Goal:** a runnable `Cinesmart-Frontend/` app with the agreed stack and tooling, the dark design system and UI primitives, the typed HTTP core and error model, and test infrastructure. Proves the browser can call the backend (CORS with credentials).

**Read first:** plan [DEC-1] [DEC-2] [DEC-3] [DEC-4] [DS-1] [DS-2] [DS-3] [ARCH-1] [ARCH-3] [COMP-4] [P0]; contract [CONV-1] [CONV-3] [CONV-4] [CONV-5] [CONV-6] [ERR-1]

**Depends on:** nothing in the frontend. From the owner: Node 24 + Corepack, the backend running on `:8080` with default CORS settings.

**Tasks**
- Setup
  - [x] Create the app with Vite's `react-ts` template in `Cinesmart-Frontend/`; add `.nvmrc` (24) and `packageManager` (pnpm 10).
  - [x] Install the [DEC-1] dependencies (latest within each major); record exact versions in As built.
  - [x] `tsconfig*` strict options + `@/` alias; `vite.config.ts` (port 5173, `strictPort`, alias, Tailwind plugin).
  - [x] ESLint flat config (typescript-eslint, react-hooks, react-refresh, jsx-a11y) and Prettier (+ Tailwind plugin); scripts per [DEC-4]; `.env.example`; minimal `README.md` (commands, env).
- Design system
  - [x] `styles/globals.css`: Tailwind import, [DS-2] tokens, `@theme` mapping, base styles (background, text, focus ring, reduced-motion rule), Inter font import.
  - [x] `shadcn init` (dark tokens mapped to [DS-2]); add primitives listed in [DEC-2] `components/ui/`.
  - [x] `Wordmark` component and favicon ([DS-1]).
  - [x] Feedback components from [COMP-4]: skeletons, `EmptyState`, `ErrorState`, `InlineAlert`, `RetryAfterNotice` + `useRetryAfter`, `InfoTooltip`, `FullPageSplash`, `notify`.
- API core
  - [x] `lib/env.ts` (reads `VITE_API_BASE_URL` with the default), `lib/format.ts` (rating 1 dp, average 1 dp, counts/votes compact, dates en-CA, runtime "2h 49m"), `lib/utils.ts` (`cn`).
  - [x] `api/types.ts`: shared types from contract [CONV-4] [CONV-5] [CONV-6] with the contract's names.
  - [x] `api/errors.ts`: `ApiError` class (+ client code `NETWORK_ERROR`), type guards, `isRateLimited`, `retryAfter` parsing.
  - [x] `api/http.ts` per [ARCH-1] with a pluggable session adapter (`getAccessToken`, `ensureFreshToken`, `refresh`, `expire`); P0 installs an "always anonymous" adapter that P1 replaces.
  - [x] `query/query-client.ts` (retry policy and defaults from [ARCH-3]/[ARCH-4]) and `query/keys.ts` skeleton with the viewer prefix.
- App skeleton
  - [x] `main.tsx`, `app/App.tsx` (QueryClientProvider, TooltipProvider, Toaster, devtools in dev), `app/router.tsx` with `RootLayout` and a placeholder home page.
  - [x] Dev-only `/dev/ui` kitchen sink: every primitive and feedback component, plus a "Ping API" button doing a raw `request('GET','/genres')` and showing the count or the error.
- Tests
  - [x] Vitest (jsdom) + Testing Library + MSW setup (`src/test/*`).
  - [x] Unit tests: `http.ts` (query param skipping, JSON/204 handling, error body parsing incl. `fields`, `Retry-After`, non-JSON error, network error, no `Authorization` on `auth: 'none'`), `format.ts`.
  - [x] Playwright config + one smoke spec (home renders the wordmark).

**Files:** `Cinesmart-Frontend/{package.json,.nvmrc,.env.example,README.md,index.html,vite.config.ts,vitest.config.ts,playwright.config.ts,tsconfig*.json,eslint.config.js,.prettierrc,components.json}`, `public/favicon.svg`, `src/main.tsx`, `src/app/{App.tsx,router.tsx,layouts/RootLayout.tsx}`, `src/styles/globals.css`, `src/components/ui/*`, `src/components/layout/Wordmark.tsx`, `src/components/feedback/*`, `src/hooks/use-retry-after.ts`, `src/lib/{env,format,utils}.ts`, `src/api/{types,errors,http}.ts`, `src/query/{query-client,keys}.ts`, `src/features/dev/UiKitchenSink.tsx`, `src/test/*`, `e2e/smoke.spec.ts`.

**Acceptance checks** (backend running)
- `pnpm dev` → `http://localhost:5173` shows the dark placeholder page with the wordmark; no console errors.
- `/dev/ui` shows every primitive; Tab moves through controls with a visible amber focus ring.
- "Ping API" → shows the genre count; DevTools shows `GET /api/v1/genres` 200 with `Access-Control-Allow-Origin: http://localhost:5173` and `Access-Control-Allow-Credentials: true`.
- Stop the backend, "Ping API" → `ErrorState` with the network message and Retry.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass; `pnpm test:e2e` smoke passes.

### [P0] As built
Done 2026-10-12. typecheck, lint, test (31 tests), build, format:check and the e2e smoke all pass. Checked against the running backend: `/dev/ui` Ping → `GET /api/v1/genres` 200, `Access-Control-Allow-Origin: http://localhost:5173`, `Access-Control-Allow-Credentials: true`, 23 genres; a refused connection → network `ErrorState` + Retry; amber 2px+2px focus ring on Tab; no console errors. The backend matched the contract, so no [CLAR] entries were needed.

**Exact versions** (Node 24.21.0, pnpm 10.34.7 via `packageManager`): react/react-dom 19.3.0, typescript 5.9.3, vite 7.3.7, @vitejs/plugin-react 5.2.0, react-router 7.18.4, @tanstack/react-query(+devtools) 5.104.2, tailwindcss/@tailwindcss/vite 4.3.3, tw-animate-css 1.4.0, radix-ui 1.8.1 (shadcn CLI latest, style new-york), sonner 2.0.8, react-hook-form 7.90.0, @hookform/resolvers 5.9.1, zod 4.6.7, lucide-react 1.55.0, @fontsource-variable/inter 5.3.0, clsx 2.1.1, tailwind-merge 3.7.0, class-variance-authority 0.7.1, vitest 3.2.7, jsdom 30.1.2, @testing-library/react 16.3.3 / user-event 14.6.7 / jest-dom 6.9.1 / dom 10.4.2, msw 2.15.0, @playwright/test 1.64.0, @axe-core/playwright 4.13.0, eslint 9.39.5, typescript-eslint 8.71.2, eslint-plugin-react-hooks 7.1.1, eslint-plugin-react-refresh 0.5.7, eslint-plugin-jsx-a11y 6.10.2, prettier 3.9.10, prettier-plugin-tailwindcss 0.8.1. Newer majors exist (vite 8, vitest 5, TS 7, eslint 10, msw 3, react-router 8) and were deliberately not used ([DEC-1]).

**Differences from the plan**
- `package.json` has `pnpm.onlyBuiltDependencies: ["esbuild"]` (pnpm 10 blocks install scripts by default).
- shadcn's `sonner.tsx` was rewritten to be dark-only without `next-themes` (dependency removed). The shadcn CLI wrote files to a literal `@/` folder; they were moved to `src/components/ui/`, and `tsconfig.json` now also has the `@/` paths, so future `shadcn add` runs resolve correctly.
- shadcn primitives were edited for [DS-2]: the focus ring is `ring-2 ring-ring ring-offset-2 ring-offset-background` (it was 3px at 50%), primary hover uses `bg-primary-hover`, and the skeleton uses `bg-surface-3` with a `skeleton-shimmer`.
- `request()`'s `opts` defaults to `{ auth: 'none' }`; the kitchen-sink ping uses `auth: 'optional'` (CAT-2's mode).
- `SessionAdapter.refresh()` returns `Promise<boolean>`: `false` → `expire()` + rethrow the 401. If it **rejects** (e.g. network), the HTTP core rethrows that error **without** expiring. An `AbortError` from `fetch` is rethrown as-is, not wrapped as `NETWORK_ERROR`.
- `Skeletons.tsx` exports the four skeletons from one file (as listed in [DEC-2]).

**New shared pieces for later phases**
- `api/http.ts`: `request`, `buildUrl`, `setSessionAdapter`, `SessionAdapter`, `anonymousSessionAdapter`. P1 calls `setSessionAdapter`.
- `api/errors.ts`: `ApiError`, `isApiError`, `hasErrorCode(err, ...codes)`, `isRateLimited`, `isNetworkError`, `parseRetryAfter`, `NETWORK_ERROR_MESSAGE`.
- `components/feedback/error-message.ts`: `errorMessage(err, 'query' | 'action' | 'form')` holds the [ARCH-3] copy (incl. login/lock/IP-block/TOKEN_INVALID texts); `logIfClientBug(err)`.
- `query/query-client.ts`: `queryClient`, `createQueryClient`, `shouldRetryQuery`, `staleTimes` (per [ARCH-4] family). `query/keys.ts`: `keys.*` for every [ARCH-4] key + `viewerOf(userId)`; `keys.viewer(v)` for logout removal.
- `lib/constants.ts`: `ROW_CARD_WIDTH_CLASS`, `GRID_COLUMNS_CLASS`, `CARD_GAP_CLASS`. Use them in `MovieRow`/`MovieGrid` so skeletons match.
- `lib/format.ts`: `formatRating`, `formatAverage`, `formatCount`, `formatInteger`, `formatDate` (date-only strings formatted in UTC), `formatRuntime`; null → "—".
- `hooks/use-retry-after.ts` `useRetryAfter(seconds, resetKey?)`; `hooks/use-media-query.ts` `useMediaQuery` + `DESKTOP_QUERY`.
- CSS utilities in `globals.css`: `page-gutter`, `content-width`, `tabular`, `skeleton-shimmer`, `animate-splash-pulse`; colour utilities for every [DS-2] token (`bg-surface-2`, `text-subtle-foreground`, `text-like`, …), `shadow-pop`, `ease-cine`.
- Tests: `src/test/render.tsx` `renderWithProviders`; `src/test/msw/handlers.ts` `api(path)`, `errorResponse(status, code, message, { fields, headers, path })`. MSW runs with `onUnhandledRequest: 'error'`, and the session adapter is reset after each test.
- Route modules export `Component`; `/dev/ui` is registered only when `import.meta.env.DEV`.

**Unfinished:** nothing. The first Playwright run on a machine needs `pnpm exec playwright install chromium` (in README).

---

## [P1] Phase 1: Session core and auth pages
**Goal:** the complete session model (in-memory token, restore on load, proactive refresh, 401 refresh-and-retry, cross-tab lock and sync, logout) and every auth and email-link page, with a minimal header showing sign-in state.

**Read first:** plan [DEC-3] [ARCH-1] [ARCH-2] [ARCH-3] [ARCH-6] [ROUTES-9] [ROUTES-10] [COMP-1] [COMP-5] [P0] [P1]; contract [CONV-2] [AUTH-1] [AUTH-2] [AUTH-3] [AUTH-4] [AUTH-5] [AUTH-6] [AUTH-7] [AUTH-8] [AUTH-9] [AUTH-10] [AUTH-13] [ERR-2] [LIMIT-1] [LIMIT-3] [LIMIT-4] [CFG-2]

**Depends on:** P0 (HTTP core with a pluggable session adapter, `ApiError`, feedback components, `useRetryAfter`, router with `RootLayout`).

**Tasks**
- Session
  - [x] `session/session-store.ts` + `useSession()`; states and fields per [ARCH-2].
  - [x] `api/auth.ts`: `signup`, `login`, `refresh`, `logout`, `verifyEmail`, `resendVerification`, `forgotPassword`, `resetPassword`, `confirmEmailChange` with contract types.
  - [x] `session/refresh.ts`: single flight, Web Locks, "adopt if fresh" check, outcome handling per [ARCH-2].
  - [x] `ensureFreshToken`, refresh timer, `visibilitychange` check; replace P0's adapter so the HTTP core does refresh-and-retry and `expire()`.
  - [x] `session/cross-tab.ts` (BroadcastChannel messages and handlers); `session/dev-tools.ts`.
  - [x] `AuthGate` in `RootLayout` (restore + `FullPageSplash`); `session/guards.tsx` (`RequireAuth`, `GuestOnly`, safe `redirect` parsing).
- Pages and layout
  - [x] `AuthLayout`; `lib/validation.ts` schemas for auth forms; form components from [COMP-5] incl. `applyServerErrors`.
  - [x] `/signup`, `/login` (with resend panel), `/resend-verification`, `/forgot-password` per [ROUTES-9].
  - [x] `/verify-email`, `/reset-password`, `/confirm-email` per [ROUTES-10] (once-only POST guard).
  - [x] Minimal `Header` in a `ShellLayout`: `Wordmark`, Sign in / Sign up buttons or `UserMenu` (username + Sign out only for now); logout flow per [ARCH-2].
- Tests
  - [x] Refresh coordinator: concurrent calls → one request; 401 → anonymous + broadcast; 503 → anonymous + toast; adopt-if-fresh skips the call.
  - [x] HTTP core with the real adapter: 401 → refresh → retry once; second 401 → `expire()`; `auth: 'none'` never sends `Authorization`.
  - [x] Login form: 401 alert, 403 shows resend panel, 429 countdown disables submit, field errors from `fields`.
  - [x] Email-link page: StrictMode renders POST once.

**Files:** `src/session/*`, `src/api/auth.ts`, `src/app/layouts/{RootLayout,ShellLayout,AuthLayout}.tsx`, `src/app/router.tsx`, `src/components/layout/{Header,UserMenu}.tsx`, `src/components/forms/*`, `src/lib/validation.ts`, `src/features/auth/{SignupPage,LoginPage,ResendVerificationPage,ForgotPasswordPage,VerifyEmailPage,ResetPasswordPage,ConfirmEmailPage}.tsx` (+ tests).

**Acceptance checks** (backend + Ethereal mailbox)
- Sign up a new user → 201 → `/login` shows the check-email alert; the email link opens `/verify-email` → "Email verified" → Sign in. Reopening the same link → invalid/used message.
- Sign in with an unverified account (correct password) → resend panel → submit email → backend message shown; a new email arrives.
- Wrong password 5× for one username → the next attempt shows the locked message (no countdown).
- Sign in → header shows the username. Reload → still signed in; Network shows exactly one `POST /auth/refresh` without an `Authorization` header.
- Two tabs signed in; reload both at once → both stay signed in (no "session expired"; backend didn't revoke).
- `window.__cinesmart.expireAccessToken()` then navigate → one refresh happens before the next request.
- Sign out in tab A → tab B switches to signed out within a second.
- Forgot password → link → `/reset-password` → new password → `/login` alert; a tab that was signed in is signed out after reload.
- 11 sign-in attempts within a minute → countdown alert with submit disabled until it ends.
- Stop Redis → sign in shows "temporarily unavailable"; start it again → works.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass.

### [P1] As built
Done 2026-10-12. The user confirmed P1 complete (the backend acceptance checks were not run by Claude: no `E2E_USERNAME`/mailbox was available). typecheck, lint, format:check, test (78 tests), build and the e2e smoke pass. Against the running backend: the auth controllers/DTOs match the contract (no [CLAR] entries); every P1 route renders with its title and no console errors; each page load makes exactly one `POST /auth/refresh`, without `Authorization`, and the anonymous 401 clears the cookie. [COVER] rows 2–5 and 8–15 are ticked; rows 6, 7 and 16 stay open until their later phase (P5/P6) is done.

**Differences from the plan**
- Lifecycle code lives in `session/session-manager.ts` (`restoreSession`, `ensureFreshToken`, timer, `visibilitychange`, `completeLogin`, `signOut`, `handleSessionMessage`, `installSession`). Ending a session is in `session/end-session.ts`; `redirect` parsing is in `session/redirect.ts`, because `guards.tsx` may only export components (react-refresh lint).
- "Adopt if fresh" also requires the stored token to **differ** from the one the caller started with. Otherwise a 401 retry with a still-unexpired but revoked token would adopt it instead of refreshing.
- The session store has `endReason: 'expired' | 'logout' | null`. `RequireAuth` uses it: expired → `/login?redirect=…`, logout (here or in another tab) → `/`. So `expire()` doesn't navigate itself.
- `GuestOnly` sends a signed-in user to the safe `redirect` param, not always `/`, so it can't race the login page's own navigation.
- A failed restore never broadcasts. A 401 on restore is silent; a 503 shows the "temporarily unavailable" toast.
- `signOut()` flags the logout so a 401 from it (after the core's refresh-retry) ends as `logout`, without the "expired" toast.
- `__cinesmart.expireAccessToken()` changes `expiresAt` without notifying the store, so the timer doesn't fire at once. The next `optional`/`required` request refreshes first. In P1 only `/dev/ui` Ping makes such a request (Home has no data yet).
- Signup/reset hand their `/login` alert over in router location state (`features/auth/login-notice.ts`), not in the URL.
- `/reset-password` treats `TOKEN_INVALID`, or `VALIDATION_FAILED` on `fields.token`, as the invalid-link state. `/verify-email` and `/confirm-email` do the same for `VALIDATION_FAILED`.
- `HomePage`'s root is now a `<div>` (`ShellLayout` owns `<main id="main">`). `RootLayout` adds `<ScrollRestoration />`; the route announcer and focus-to-h1 are still to do (P6).
- `e2e/smoke.spec.ts` ignores only Chrome's "status of 401" log for `/api/v1/auth/refresh`, which every anonymous visit triggers by design.
- Tests: `src/test/setup.ts` imports `resetSessionForTests` lazily so test files can `vi.mock('sonner')` / `vi.mock('./cross-tab')`. `renderRoutes` uses `MemoryRouter` + `useRoutes`, not a data router: under jsdom a data-router navigation builds a `Request` whose `AbortSignal` undici rejects.

**New shared pieces for later phases**
- `session/session-store.ts`: `useSession()`, `useViewer()` (viewer prefix for query keys), `getSession()`, `ActiveSession`, `sessionFromResponse`.
- `session/session-manager.ts`: `completeLogin(res)` (P5 password change: call it with the returned session), `signOut()` (for `MobileNav`/profile), `ensureFreshToken()`.
- `session/end-session.ts`: `endSession({ reason, toastMessage?, broadcast? })`, which clears the store, broadcasts and removes `keys.viewer(userId)` queries.
- `session/guards.tsx`: `RequireAuth` / `GuestOnly` are layout routes (render `<Outlet />`); wrap P2/P5 protected routes in `{ Component: RequireAuth, children: [...] }`.
- `session/redirect.ts`: `safeRedirect`, `loginPath(redirect)`. Use `loginPath(location.pathname + location.search)` for the anonymous-action prompt (P4).
- `components/forms/`: `TextField` (`label`, `hint`, `error`, `endAdornment`), `PasswordField`, `SubmitButton` (`pending`, `blocked`), `FormAlert` (`error`, `message`; shows the countdown on a 429), `applyServerErrors`, `useFormServerError(setError, knownFields)` → `{ error, message, blocked, handle, clear }`. The P5 profile forms use these as they are.
- `lib/validation.ts`: `usernameSchema`, `emailSchema`, `newPasswordSchema`, `tokenSchema`, `parseToken`, `USERNAME_HINT`, plus the form schemas.
- `hooks/use-document-title.ts`: `useDocumentTitle('Page')` → `Page · CineSmart` (`''` → `CineSmart`).
- `features/auth/use-token-mutation.ts` and `EmailLinkStatus.tsx` (`EmailLinkPending`, `EmailLinkResult`, `EmailLinkRetry`).
- Test helpers: `renderRoutes(routes, entry, { strict? })` → `{ location() }`; `loginResponse(token, user?)` in `src/test/msw/handlers.ts`.
- Layouts: `ShellLayout` (skip link, `Header`, `<main id="main">`) and `AuthLayout`. P2 extends `Header`/`UserMenu` and adds the footer, nav and the 404 `*` route.

**Unfinished / notes**
- `/confirm-email` links to `/profile`, which doesn't exist until P5. There is no 404 route yet (P2), so the link shows React Router's default error page for now.
- The watched-ID set load after login/restore ([ARCH-5]) is P4.
- `pnpm build` warns that the main chunk is over 500 kB (524 kB, 168 kB gzip), mostly React, router, Query, Radix and zod. Splitting it is left to P6.
- `package.json` has a stray `cn@^0.4.0` dependency from P0; nothing imports it (`cn` comes from `lib/utils`). Left in place; remove it in P6.

---

## [P2] Phase 2: App shell, home, ranked lists, For You
**Goal:** the full app shell (header nav, mobile nav, footer), the movie display components, the home page with all sections and lazy row paging, the four "See all" list pages, the For You page, and the 404 page.

**Read first:** plan [DEC-2] [DS-1] [DS-3] [ARCH-1] [ARCH-4] [ARCH-6] [ROUTES-1] [ROUTES-2] [ROUTES-3] [ROUTES-11] [COMP-1] [COMP-2] [COMP-4] [P1] [P2]; contract [CONV-4] [CONV-6] [DISC-1] [DISC-4] [DISC-5] [DISC-6] [DISC-7] [REC-1] [CFG-1]

**Depends on:** P0 (HTTP core, feedback components, tokens), P1 (session store/`useSession`, `RequireAuth`, `ShellLayout` + minimal `Header`, `UserMenu` with sign out).

**Tasks**
- API and data
  - [x] `api/discovery.ts`: `getHome`, `getTrending`, `getTopRated`, `getMostLiked`, `getImdbTop250`, `rankedListFetchers`; `api/recommendations.ts`: `getRecommendations`.
  - [x] Query keys for home, lists and recs ([ARCH-4]); hooks in `features/home`, `features/lists`.
- Shell
  - [x] Complete `Header` per [COMP-1] (nav links, `SearchBox` navigating to `/search`, Browse link to `/browse` until P3 adds the menu), `MobileNav`, `Footer`, `PageHeader`, skip link, route announcer, focus-to-h1.
  - [x] `UserMenu` items (Profile, My watchlist, My ratings, For You, Sign out); links to P4/P5 routes may 404 until built.
- Movie display
  - [x] `PosterImage`, `MovieCard` (display + markers from `card.inWatchlist`/`card.watched`; no action yet), `MovieRow` (scroll, arrows, lazy paging, "See all" tile), `MovieGrid`, `PaginationBar`, `RatingBadges`, `ReasonChip`, `use-page-param.ts`.
- Screens
  - [x] Home per [ROUTES-2] (hero, sections, subtitles, states).
  - [x] `/lists/:listKey` and `/for-you` per [ROUTES-3] (cold-start banner).
  - [x] 404 page and route `ErrorBoundary` per [ROUTES-11].
- Tests
  - [x] `MovieRow` appends the next page and de-duplicates; stops at `totalResults`.
  - [x] `PosterImage` falls back on null / error.
  - [x] List page: invalid key → 404; page param parsing.

**Files:** `src/api/{discovery,recommendations}.ts`, `src/query/keys.ts`, `src/components/layout/{Header,MobileNav,Footer,SearchBox,PageHeader,UserMenu}.tsx`, `src/components/movie/*`, `src/hooks/{use-page-param,use-document-title}.ts`, `src/features/home/*`, `src/features/lists/{RankedListPage,ForYouPage}.tsx`, `src/features/errors/NotFoundPage.tsx`, `src/app/router.tsx`.

**Acceptance checks**
- Anonymous `/` → hero + rows in order (Trending, then any non-empty of Top Rated / Most Liked, IMDb Top 250); no For You; no movie appears in two rows.
- Signed in → For You first (if the backend returns it), no hero, cards show bookmark/eye markers matching the data.
- IMDb Top 250 row: scroll to the end → Network shows `GET /movies/imdb-top-250?page=1&size=10` and cards append without duplicates.
- "See all (250)" → `/lists/imdb-top-250`: 20 cards, pagination to page 13 with 10 cards.
- `/lists/nope` and `/some/unknown` → 404 page inside the shell.
- `/for-you` signed out → `/login?redirect=%2Ffor-you` → after sign in returns to `/for-you` with reasons; a brand-new user sees "Popular on CineSmart" and the cold-start banner.
- A movie with no poster shows the placeholder; at 375 px rows swipe, the header collapses to the menu button, and the mobile nav works with keyboard.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass.

### [P2] As built
Done 2026-10-12, marked complete on the user's instruction. The signed-in acceptance checks (For You reasons, cold-start banner, card markers, `/for-you` → login → back) were not run by Claude; the user saw the For You row and page working for a new account. [COVER] 18, 24, 25 and 26 stay unticked until those checks are confirmed. typecheck, lint, format:check, test (98 tests), build and `pnpm test:e2e` (4 specs, against the running backend) all pass. The backend matched the contract for `/home`, the four lists and anonymous `/recommendations` (401), so there are no [CLAR] entries. Checked live with Playwright (anonymous):
- Home has the hero and the rows Trending Now, Most Liked, IMDb Top 250 (Top Rated is empty on this backend, so the backend omits it), with no duplicates. Load makes exactly `POST /auth/refresh` + `GET /home`.
- Scrolling the IMDb row to its end makes one `GET /movies/imdb-top-250?page=1&size=10` and the row grows to 20 unique cards.
- `/lists/imdb-top-250` shows 20 cards and "250 titles"; page 13 shows 10. `/lists/nope` and `/some/unknown` show the 404 page inside the shell; `/for-you` signed out → `/login?redirect=%2Ffor-you`.
- At 375 px: no main nav or header search field, but the menu and "Open search" buttons; row arrows are hidden; no horizontal overflow. MobileNav works by keyboard and closes on navigation, then focus moves to the new `h1`. The no-poster placeholder renders. No console errors.
- [COVER] 17, 19, 20, 22, 23, 27 and 28 are ticked. 18, 24, 25 and 26 need a signed-in account; 21 (top-rated) is covered by a unit test, but its live row was empty here.

**Differences from the plan**
- Query options live in `query/list-queries.ts` (`homeQuery`, `rankedListQuery`, `recsQuery`, `sectionPageQuery`), not in hooks under `features/home` / `features/lists`: both screens use them. List titles/subtitles/empty texts and page sizes are in `lib/ranked-lists.ts` (`LIST_META`, `LIST_PAGE_SIZE` 20, `ROW_PAGE_SIZE` 10).
- `MovieRow` takes `pageQuery: (page) => queryOptions` (a `RowPageQuery`), not `fetchPage`. Loaded pages go through `useQueries` under the [ARCH-4] keys (`[v,'list',key,page,10]`, `[v,'recs',page,10]`). So P4's `patchCardFlags` and invalidation also reach appended cards, and new home data flows into the row. The next page loads on a scroll event (or a right-arrow click) that ends within one viewport of the end, not on mount; otherwise every row would fetch page 1 at once on wide screens.
- The row stops when `maxItems` (50) is reached, when page N × 10 ≥ `totalResults`, or when a page comes back empty. The "See all" tile appears only once nothing more can load. Arrows are never disabled; at an edge `scrollBy` does nothing.
- The `ARCH-2` safety net is built for card lists: `query/user-data-retry.ts` `fetchWithUserData(fetch, hasUserData)` + `cardsHaveFlags`. While signed in, a response whose cards have `inWatchlist: null` triggers one refresh and one refetch. Home and the ranked lists use it; P3/P4 should too (details: `userState === null`).
- Error boundaries are set in `router.tsx` (a `page()` helper gives every lazy page route `ErrorBoundary: RouteErrorBoundary`, plus one on the root) instead of each module exporting one. `features/errors/NotFound.tsx` is the reusable 404 content (`variant: 'page' | 'movie'`); `NotFoundPage.tsx` is the `*` route.
- Route announcer + focus-to-h1 are built now (`app/layouts/RouteAnnouncer.tsx`, on pathname changes only, not `?page=`). `EmptyState` gained `headingLevel` (`h1` for the 404).
- `SearchBox` checks `q` with plain code (`lib/search-query.ts` `checkSearchQuery`), not Zod, which kept zod out of the main chunk (628 kB → 547 kB). It navigates to `/search?q=`, which is a 404 until P3. The header hides its search field on `/search` (P3's page has its own).
- The header's mobile search icon is labelled "Open search"; it opens a top `Sheet` with the search field.
- `PaginationBar` uses links (`hrefForPage` → `To`), not `onPageChange`. Pages other than the current one are hidden below `sm`. A `?page=` past the last page redirects (replace) to the last page.
- Tests: `src/test/setup.ts` now wraps `fetch` outside MSW and drops the request's jsdom `AbortSignal`, keeping abort behaviour. Under jsdom, any query that passes TanStack's `signal` otherwise failed as `NETWORK_ERROR`. `e2e/smoke.spec.ts` now covers the hero/rows, IMDb pagination, the 404 pages and the `/for-you` redirect.

**New shared pieces for later phases**
- `api/discovery.ts`: `PageParams` (0-based), `MoviePageFetcher`, `RankedListKey`, `HomeSectionKey`, `isRankedListKey`, `rankedListFetchers`. P3 adds `browseMovies`/`searchMovies` here. `api/recommendations.ts`: `RecommendationCard`, `COLD_START_REASON`.
- `components/movie/`: `PosterImage`, `MovieCard` (`caption`, `action` slot positioned top-right over the poster, outside the link), `MovieRow` + `RowPageQuery`, `MovieGrid` (generic over card type, `renderCaption`/`renderAction`), `PaginationBar`, `page-items.ts`, `RatingBadges`, `ReasonChip`.
- `features/lists/ListResults.tsx`: grid + pagination with loading/error/empty/past-the-end states for any `UseQueryResult<Page<T>>`; reuse for browse, search, watchlist and ratings.
- `hooks/use-page-param.ts`: `usePageParam()` → `{ page, hrefForPage }`, plus `parsePageParam` and `pageSearch` (keeps the other params; page 1 drops `page`).
- `components/layout/`: `PageHeader` (h1), `SearchBox`, `Footer`, `MobileNav`, and `nav-links.ts` (`MAIN_LINKS`, `ACCOUNT_LINKS`, `GUEST_LINKS`). P3 replaces the Browse link with `BrowseMenu` on desktop and flattens its entries in `MobileNav`.
- `query/list-queries.ts` and `query/user-data-retry.ts` (see above).

**Unfinished / notes**
- Signed-in acceptance checks not run by Claude (see first paragraph).
- Decision (user, 2026-10-12): on home, a new user's cold-start For You row keeps the backend title "For You". The home section has no `reason` (contract [DISC-1]), so it can't be relabelled without an extra `/recommendations` call; the `/for-you` page shows the reasons and the cold-start banner.
- `pnpm build` still warns: the main chunk is 547 kB (175 kB gzip). Splitting is P6.
- `UserMenu`/`MobileNav` link to `/watchlist`, `/ratings`, `/profile` (P5) and `/browse`, `/search` (P3), which show the 404 page until those phases.

---

## [P3] Phase 3: Browse and search
**Goal:** the Browse menu and `/browse` page with genre, language and year filters in the URL, and the `/search` page with the 3–100 character rule.

**Read first:** plan [ARCH-1] [ARCH-3] [ARCH-4] [ROUTES-4] [ROUTES-5] [COMP-1] [COMP-2] [P2] [P3]; contract [CONV-4] [CAT-2] [CAT-3] [DISC-2] [DISC-3] [CFG-1]

**Depends on:** P2 (`MovieGrid`, `PaginationBar`, `use-page-param`, `PageHeader`, `SearchBox` navigating to `/search`, `Header` with a Browse link slot).

**Tasks**
- API and data
  - [x] `api/catalog.ts`: `getGenres`, `getLanguages`; `api/discovery.ts`: `browseMovies`, `searchMovies` (never send empty params).
  - [x] Hooks with keys/stale times from [ARCH-4] (genres/languages 1 h, shared by menu and page).
- Browse
  - [x] `BrowseMenu` in `Header` and `MobileNav` per [ROUTES-4].
  - [x] `/browse` filter bar (selects, year options current year → 1920, clear), URL sync, page reset on filter change, mobile filter sheet.
  - [x] Invalid param handling (drop + notice) and states per [ROUTES-4].
- Search
  - [x] `SearchBox` validation hint (no request when invalid); `/search` page per [ROUTES-5].
- Tests
  - [x] Browse URL parsing/serialization (drops non-numeric, keeps others, page reset).
  - [x] Search: `q` "ab" → no request + hint; valid → request with trimmed `q`.

**Files:** `src/api/{catalog,discovery}.ts`, `src/components/layout/{BrowseMenu,Header,MobileNav,SearchBox}.tsx`, `src/features/browse/*`, `src/features/search/*`, `src/app/router.tsx`.

**Acceptance checks**
- `/browse` → all movies by IMDb rating; choose a genre → URL `?genreId=…`, page resets to 1, result count updates; add a language and a year → combined (AND).
- A year with no movies → empty state with "Clear filters".
- `/browse?genreId=99999&year=2014` → genre dropped with the notice, year kept.
- Browse menu → Genres → a genre opens `/browse?genreId=…`; second open of the menu makes no new `/genres` request.
- Search "inter" → Interstellar first; "nolan" → Nolan's films (person match); "ab" → hint, no request; nonsense → empty state.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass.

### [P3] As built
Done 2026-10-12. typecheck, lint, format:check, test (16 files, 113 tests), build and `pnpm test:e2e` (11 specs; 6 new in `e2e/browse-search.spec.ts`, run against the running backend) all pass. The backend matched the contract for `/genres`, `/languages`, `/movies` (incl. `genreId=99999` → 400 `fields.genreId`, `?sort=x` → 400 `BAD_REQUEST`) and `/movies/search` (`q=ab` → 400 `fields.q`), so there are no [CLAR] entries. Checked live with Playwright (anonymous): every P3 acceptance check, plus the desktop "By year" / "All languages…" focus and the 375 px filter sheet with no horizontal overflow. [COVER] 29–32 are ticked. "nolan" returns The Dark Knight, Inception, Interstellar… first; "inter" returns Interstellar first. 1921 has a movie on this backend, so the empty-year check uses 1923.

**Differences from the plan**
- No `features/*/hooks`: query options live in `query/catalog-queries.ts` (`genresQuery`, `languagesQuery`, key without viewer, 1 h) and `query/list-queries.ts` (`browseQuery`, `searchQuery`, both through `fetchWithUserData`).
- URL handling is in `features/browse/browse-params.ts`. Non-numeric, empty or ≤ 0 filter values are dropped on the client before any request (`<Navigate replace>` + notice). A 400 with `fields.genreId|languageId|year` drops those params after the request. The notice travels as router state `{ filterRemoved: true }`, so it disappears on the next filter change. Changing, dropping or clearing a filter also removes `page`. Unknown params (e.g. `sort`) stay in the URL but are never sent.
- The filters are shadcn `Select`s (value `any` = "All …"; `''` shows "Loading…" while the list loads). The year select offers current year → 1920, plus a valid URL year outside that range. The selects are disabled while their list loads, and a failed list shows "Couldn't load the list." under the select.
- Mobile (< 640 px, `TABLET_UP_QUERY`) renders the filters only inside a bottom `Sheet` ("Filters (n)" button in the `PageHeader` actions, "Show N movies" to close). Tablet and up render them inline. Only one set is mounted at a time, so the focus refs are shared.
- Browse menu "All languages…" / "By year" navigate to `/browse` with state `{ focus: 'language' | 'year' }`. On desktop the select is focused two frames later (after `RouteAnnouncer`'s focus on the h1), and the menu's `onCloseAutoFocus` is prevented after any item navigates. On mobile the sheet opens with that select focused. MobileNav flattens Browse to four links (`BROWSE_LINKS`: all movies, by genre, by language, by year) that open `/browse` with that focus state. It doesn't list every genre, so the mobile menu makes no `/genres` request.
- Heading: "All movies" or "Sci-Fi · English · 2014" (names appear once the lists load; "Filtered movies" before), subtitle "Sorted by IMDb rating.", meta "N movies".
- Search: the hint texts are now the plan's ("Type at least 3 characters." / "Use 100 characters or fewer.") in `lib/search-query.ts`. `/search` with no `q` shows the field and the hint as plain text; an invalid `q` shows the field prefilled with the hint as an alert. The heading uses curly quotes (`Results for “inter”`). `SearchBox` has no `autoFocus` prop (jsx-a11y `no-autofocus`; focus goes to the h1 as on every page). It gained `initialHint`, and `variant="page"` now uses the large style with a Search button (also in the header's mobile search sheet).
- Counts are singular/plural ("1 title", "1 movie") via `formatCountOf`.

**New shared pieces for later phases**
- `api/catalog.ts` (`getGenres`, `getLanguages`); P4 adds `getMovie` here. `api/discovery.ts`: `BrowseFilters`, `browseMovies`, `searchMovies`.
- `query/catalog-queries.ts` (`genresQuery`, `languagesQuery`); `query/list-queries.ts`: `browseQuery`, `searchQuery`. P4's `patchCardFlags` must also walk `[v,'browse',…]` and `[v,'search',…]`.
- `features/lists/ListResults.tsx` gained `emptyDescription` and `emptyAction`.
- `lib/format.ts` `formatCountOf(n, singular, plural?)`; `hooks/use-media-query.ts` `TABLET_UP_QUERY`.
- `components/layout/BrowseMenu.tsx`; `nav-links.ts` `BROWSE_LINKS` and `NavLinkItem.state` (links with state are never styled active).
- `features/browse/browse-params.ts`: `browseSearch(filters)` builds `/browse` links (e.g. for genre chips on the details page in P4).

**Unfinished / notes**
- No signed-in checks were needed. Browse and search cards carry flags when signed in, but the card markers are still P2's unconfirmed [COVER] 26.
- `pnpm build` main chunk is now 565 kB (180 kB gzip; was 547 kB) because `BrowseMenu` is in the header. Splitting is still P6.

---

## [P4] Phase 4: Movie details and activity
**Goal:** the details page with every field, availability and similar titles; the four activity controls with optimistic updates, in-flight disabling and live `userState`; card-level watchlist action; the watched-ID set.

**Read first:** plan [ARCH-1] [ARCH-2] [ARCH-3] [ARCH-4] [ARCH-5] [ROUTES-6] [COMP-2] [COMP-3] [COMP-4] [P2] [P4]; contract [CONV-6] [CAT-1] [ACT-1] [ACT-2] [ACT-3] [ACT-4] [ACT-5] [ACT-6] [ACT-7] [ACT-8] [ACT-9] [REC-2] [ME-4] [LIMIT-2]

**Depends on:** P1 (session, `RequireAuth`/redirect helper, `useSession`), P2 (`MovieCard`, `MovieRow`, `PosterImage`, `RatingBadges`, 404 page, query keys).

**Tasks**
- API and data
  - [x] `api/catalog.ts` `getMovie`; `api/recommendations.ts` `getSimilar`; `api/activity.ts` (8 functions); `api/me.ts` `getWatched`.
  - [x] `query/card-cache.ts` `patchCardFlags`; `query/watched-set.ts` (load after login/restore, clear on logout).
  - [x] `features/movie/use-movie-actions.ts`: four mutations per [ARCH-5] with [ARCH-4] update steps and [ARCH-3] errors.
  - [x] Safety net from [ARCH-2]: details `userState === null` while authenticated → refresh once + refetch once.
- Components
  - [x] `MovieActions`, `WatchlistButton`, `WatchedButton`, `RatingControl`, `ReactionButtons`, `CardWatchlistButton` per [COMP-3]; anonymous → sign-in redirect + toast.
  - [x] `MovieCard` uses the watched set and renders `CardWatchlistButton` in its overlay.
- Screen
  - [x] `/movies/:movieId` per [ROUTES-6]: backdrop, header, ratings, CineSmart stats + `InfoTooltip`, plot, credits linking to search, details, Where to watch, More like this, states, one-time lag hint.
- Tests
  - [x] Optimistic watchlist: UI flips immediately, server state applied, rollback + toast on 500.
  - [x] Reaction logic: like → dislike → click dislike = DELETE; buttons disabled while pending.
  - [x] `RatingControl`: rejects 8.55 / 0.5 / 11; sends 8.5; Remove sends DELETE.
  - [x] `patchCardFlags` updates cards in home/list/search caches.

**Files:** `src/api/{catalog,recommendations,activity,me}.ts`, `src/query/{card-cache,watched-set}.ts`, `src/features/movie/*`, `src/components/activity/*`, `src/components/movie/MovieCard.tsx`, `src/session/*` (watched-set hook-up), `src/app/router.tsx`.

**Acceptance checks**
- Anonymous `/movies/<id>` → all available fields, availability links open in a new tab, similar row; no user state. Click "Add to watchlist" → `/login?redirect=/movies/<id>` → after sign in back on the page with the real button state.
- Signed in: Add to watchlist → button flips instantly; the PUT returns `userState`; go back to home → that card shows the bookmark without a home refetch.
- Rapid double-click on Watched → one request.
- Rate 8.5 → trigger shows 8.5; reload → still 8.5; Remove → "Rate". Typing 8.55 is rejected before sending.
- Like → Dislike → click Dislike again → Network shows PUT LIKE, PUT DISLIKE, DELETE; neither thumb pressed.
- Stop the backend, click Watchlist → rollback + error toast.
- 61 activity writes in a minute (devtools loop) → 429 toast with seconds.
- `/movies/999999` → "Movie not found"; `/movies/abc` → 404 page.
- Signed in, mark a movie watched, open a movie that lists it as similar → it's excluded after reload.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass.

### [P4] As built
Done 2026-10-12. typecheck, lint, format:check, test (21 files, 145 tests) and build pass. `pnpm test:e2e` passes against the running backend: `e2e/details.spec.ts` (6 anonymous specs) and `e2e/signed-in.spec.ts` (12 signed-in specs with the `.env.local` test account). The public endpoints and the backend DTOs/routes for activity and `/me/**` match the contract, so there are no [CLAR] entries. Every P4 acceptance check passed live:
- Anonymous: all detail sections, `target="_blank" rel="noopener noreferrer"` links, the similar row. "Add to watchlist" and the card bookmark → `/login?redirect=…` + toast. `/movies/999999` → "Movie not found.", `/movies/abc` → 404. No overflow at 375 px.
- Signed in: "Add to watchlist" flips at once, the PUT returns `inWatchlist: true`, and back on home the Trending card shows the bookmark with **zero** `/home` requests. A double click on Watched → one PUT. Rate 8.5 → PUT `{ rating: 8.5 }`, survives a reload, Remove → "Rate"; 8.55 can't be saved. Like → Dislike → Dislike → `PUT LIKE`, `PUT DISLIKE`, `DELETE` with neither thumb pressed, plus the lag hint. Request aborted → rollback + "We couldn't reach CineSmart" toast (simulated with `page.route(...).abort()` instead of stopping the backend). 60 API writes, then a UI click → "You're doing that too fast. Try again in N s." + rollback. A movie marked watched disappears from the similar list after a reload.
- The same run also confirmed P2's signed-in checks: the home For You row, the `/for-you` cold-start banner with "Popular on CineSmart" reasons, the banner gone once there are signals, card markers. [COVER] 18, 24, 25 and 26 are now ticked.
[COVER] 33–44 are ticked.

**Differences from the plan**
- **Plan conflict, resolved for the acceptance check:** [ARCH-4] says to invalidate `[v,'home']` after any action, but the P4 check says the home card shows the bookmark "without a home refetch". Invalidating would refetch home on return, so actions do **not** invalidate home; its cards are patched in place. They still invalidate profile, watchlist/ratings/reactions (by kind) and `[v,'recs']`.
- One hook, `useMovieAction(movieId, kind)` (`features/movie/use-movie-actions.ts`), serves all four controls plus the card button. `pending` comes from `useIsMutating(['activity', id, kind])`, so the details button and a card button for the same movie share it. A module-level in-flight set drops a second click before React re-renders (a double click sends one request). The hook also returns `signedIn` and `promptSignIn`.
- While pending, controls are `aria-disabled` + `aria-busy` (`components/activity/pending-props.ts`) instead of `disabled`: a disabled button drops keyboard focus. Clicks are ignored by the in-flight guard; `pointer-events-none` + opacity give the visual state.
- Optimistic step: `onMutate` writes the expected `userState` into `[v,'movie',id]` (when cached), patches card flags for watchlist/watched, and updates the watched set. `onError` restores all three from a snapshot (`patchCardFlags` returns a `CardSnapshot`; `restoreCards` puts it back), then `notify.error`. `UNAUTHORIZED` gets no extra toast because the session-expired toast already shows.
- The watched-ID set is a lazy query, not a load triggered by the session: `useWatchedSet()` (in `MovieCard`) runs `[v,'me','watched']` with `staleTime: ∞` once per signed-in viewer. Logout/expiry removes it with the viewer's other queries; nothing in `session/*` changed.
- `MovieCard`'s `action` defaults to `CardWatchlistButton` (pass `null` for none), so rows, grids and similar titles all get it. Unpressed, it shows on hover/focus (always on touch screens); pressed, it always shows.
- Details layout: two panels (Ratings, CineSmart) under the actions. Ratings hidden when null; "No ratings yet." when all three are null. Credits use `Director`/`Directors` singular/plural. "Released" uses `formatLongDate` ("November 7, 2014"). The lag hint is component state set by the rating/reaction `onSuccess` and shown inside the CineSmart panel.
- `RatingControl`: popover with a text input (`inputMode="decimal"`, comma accepted) + Radix slider. `parseRating` (`lib/rating.ts`, plain code) rejects anything outside 1–10 or with more than one decimal. Save is disabled when invalid or unchanged. Opening the popover anonymously goes to sign in.
- Tests: `src/test/session.ts` `signInForTests(token?, user?)`, `src/test/fixtures.ts` (`card`, `pageOf`, `movieDetails`, `neutralState`), and a `ResizeObserver` stub in `src/test/setup.ts` (Radix Slider).

**New shared pieces for later phases**
- `api/activity.ts` (8 functions), `api/me.ts` (types + 5 functions), `api/catalog.ts` `MovieDetails`/`Availability`/`getMovie`, `api/recommendations.ts` `getSimilar`.
- `query/card-cache.ts` (`patchCardFlags`, `restoreCards`, `patchData`), `query/watched-set.ts` (`watchedQuery`, `useWatchedSet`, `setWatched`), `query/movie-queries.ts` (`movieQuery` with the `userState` safety net, `similarQuery`, `SIMILAR_SIZE`).
- `features/movie/use-movie-actions.ts`: `useMovieAction`, `useSignInPrompt`, `applyUserState`, `expectedState`, `sendAction`, `SIGN_IN_PROMPT`.
- `components/activity/*`: `MovieActions`, `WatchlistButton` (`compact`, `title`), `WatchedButton`, `RatingControl`, `ReactionButtons`, `CardWatchlistButton`, `pendingProps`/`PENDING_CLASS`.
- `MovieGrid`/`ListResults` `itemClassName`; `lib/format.ts` `formatLongDate`, `formatMonthYear`.

**Unfinished / notes**
- "Stop the backend" was simulated by aborting the request in Playwright (same `NETWORK_ERROR` path); stopping the real backend is left to P6's offline pass.
- `pnpm build` main chunk is 575 kB (182 kB gzip) because `MovieCard` now pulls in the activity hook; splitting is P6.

---

## [P5] Phase 5: My lists and profile
**Goal:** the watchlist and ratings pages, and the profile with counts (including liked/disliked), change password and change email.

**Read first:** plan [ARCH-2] [ARCH-3] [ARCH-4] [ARCH-5] [ROUTES-7] [ROUTES-8] [COMP-2] [COMP-3] [COMP-5] [P1] [P4] [P5]; contract [CONV-4] [ME-1] [ME-2] [ME-3] [ME-5] [AUTH-11] [AUTH-12] [LIMIT-2] [LIMIT-3]

**Depends on:** P1 (session store set/broadcast functions, form components, `applyServerErrors`, `RequireAuth`), P2 (`MovieGrid`, `PaginationBar`, `PageHeader`), P4 (activity mutations, `WatchlistButton` compact, card-cache patching).

**Tasks**
- API and data
  - [x] `api/me.ts`: `getProfile`, `getWatchlist`, `getRatings`, `getReactions`; `api/auth.ts`: `changePassword`, `changeEmail`.
  - [x] Query hooks with [ARCH-4] keys; watchlist removal also invalidates the current page and handles an emptied last page.
- Screens
  - [x] `/watchlist` and `/ratings` per [ROUTES-7] (captions with dates, rating badge, remove from watchlist, empty states).
  - [x] `/profile` per [ROUTES-8]: account card, activity counts + liked/disliked from `getReactions`, change password form (stores + broadcasts the new session), change email form (success alert), sign out.
  - [x] Wire `UserMenu`/`MobileNav` links (already present) and `RequireAuth` on the three routes.
- Tests
  - [x] Change password: wrong current → field error, no refresh attempted; success → session token replaced and broadcast.
  - [x] Change email: `EMAIL_TAKEN` → `newEmail` field error; 503 → email-send message.
  - [x] Watchlist page: removing the only item on the last page moves back a page.

**Files:** `src/api/{me,auth}.ts`, `src/features/my-lists/{WatchlistPage,RatingsPage}.tsx`, `src/features/profile/*`, `src/app/router.tsx`.

**Acceptance checks**
- `/watchlist` lists newest first with "Added …" and watched markers; remove one → disappears, the profile count drops by one.
- With 21+ watchlist items, page 2 exists; removing the last item of page 2 returns to page 1.
- `/ratings` shows each rating and date; the counts on `/profile` match both lists; Liked/Disliked counts match the reactions made in P4.
- Change password with a wrong current password → field error "is incorrect"; same password → "must be different"; correct → toast, still signed in; a second browser signed in as the same user is signed out on its next action.
- 5 wrong current passwords → locked message.
- Change email → success alert; open the link → `/confirm-email` success → `/profile` shows the new email.
- Signed out, open `/profile` → sign-in redirect and back.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass.

### [P5] As built
Done 2026-10-12. Same command results as P4. The backend DTOs for `/me/**` and the password/email-change endpoints match the contract, so there are no [CLAR] entries. Checked live with `e2e/signed-in.spec.ts`:
- 21 watchlist items: "21 titles", 20 per page, newest first, "Added …". Removing page 2's only item → `/watchlist` with "20 titles", and the profile shows Watchlist 20.
- `/ratings`: "2 rated" with "Rated …", the watched marker on a card. The profile shows Ratings 2, Watched 1, Liked 1, Disliked 1.
- Change email → success alert. Change password: wrong current → "Is incorrect.", same → "Must be different from the current password.", correct → toast and still signed in after a reload. A second browser signed in as the same user lands on `/login?redirect=%2Fprofile` on its next load. The password was then restored (afterAll) and the account left with no activity.
- Signed out, `/watchlist`, `/ratings` and `/profile` → sign-in redirect.
[COVER] 45–49 are ticked. 50 stays open until the email link round trip is done. 6 (lockout) stays open: 5 wrong current passwords were not tried live, because that locks the test account for 1 h and goes over the 5/15-min `account` budget. A component test covers the `ACCOUNT_LOCKED` message on the password form.

**Differences from the plan**
- Query options live in `query/me-queries.ts` (`profileQuery`, `watchlistQuery`, `ratingsQuery`, `reactionsQuery`), not in hooks.
- Watchlist removal reuses the default card action (`CardWatchlistButton` → compact `WatchlistButton`, accessible name "Remove from watchlist: <title>"). The patched card (`inWatchlist: false`) fades via `itemClassName`, the action invalidates `[v,'me','watchlist']`, and the existing `ListResults` past-the-end redirect handles an emptied last page. A list emptied to 0 shows the empty state.
- Watchlist and ratings use `keepPreviousData`. Their empty states ("Your watchlist is empty." / "You haven't rated any movies yet.") both have a "Browse movies" button. Ratings meta is "N rated"; watchlist meta is "N title(s)".
- Profile: the Account and activity cards load from `/me`. Liked/Disliked counts come from `/me/reactions` and show "–" until loaded, with an inline Retry on error. The password and email forms render even while the profile loads. The Watchlist/Ratings counts are links. The card titles are `h2`.
- Change password: `completeLogin(response)` stores and broadcasts the new session, then the toast "Password changed. Other devices were signed out." and the form resets. A wrong current password maps to the field as "Is incorrect." (server text, sentence-cased by `applyServerErrors`); same for "Must be different from the current password."
- Change email: `useFormServerError.handle(error, message?)` gained an optional message override, used for the 503 copy "We couldn't send the confirmation email. Please try again later." `EMAIL_TAKEN` maps to the `newEmail` field ("This email is already registered.").
- `/confirm-email` already invalidated `[v,'me','profile']` (P1), so the new email shows on return.

**New shared pieces for later phases**
- `query/me-queries.ts`; `features/profile/{ChangePasswordForm,ChangeEmailForm}.tsx` (`PASSWORD_CHANGED`, `EMAIL_SEND_FAILED`); `lib/validation.ts` `changePasswordSchema`, `changeEmailSchema`.

**Unfinished / notes**
- Not run live: opening the email-change link (needs the dev mailbox; the test sent a link to `<username>+e2e@example.com`, which expires in 24 h unused), and the 5-wrong-passwords lockout (see above).
- `e2e/signed-in.spec.ts` uses all 5 `account` calls (1 email change + 3 password attempts + the restore). A second run within 15 minutes fails on the IP limit. It also waits twice for a fresh per-user write window (~2.5 min total). `playwright.config.ts` now loads the git-ignored `.env.local` (`process.loadEnvFile`) for `E2E_USERNAME`/`E2E_PASSWORD`. The spec skips itself without them and expects an account with no activity.

---

## [P6] Phase 6: Hardening, accessibility, e2e
**Goal:** make the app production-ready: accessibility and responsive passes, consistent 429/503/offline handling on every screen, performance checks, Playwright end-to-end flows, README with deployment notes, and the coverage checklist verified.

**Read first:** plan [DEC-4] [DS-3] [ARCH-3] [ARCH-4] [COVER] [GAPS] [P0] [P1] [P2] [P3] [P4] [P5] [P6]; contract [ERR-1] [LIMIT-1] [LIMIT-4] [CFG-2]

**Depends on:** P0–P5 delivered (their As built notes list anything unfinished, which this phase picks up first).

**Tasks**
- Carried over from P1–P5 (user decision 2026-10-12: deferred to this phase)
  - [x] Email-change link round trip with the dev mailbox ([COVER] 50). Confirmed by the user (manual, 2026-10-13).
  - [x] Lockout after 5 wrong passwords, live ([COVER] 6). Confirmed by the user (manual, 2026-10-13), along with the IP block.
  - [x] Top Rated row/list live once a movie has ≥ 5 ratings ([COVER] 21). Checked 2026-10-13 (manual checkpoint 7).
  - [x] Real backend stop → rollback + toast on an action, and `ErrorState` + recovery on screens. Confirmed by the user (manual, 2026-10-13).
  - [x] `Retry-After` countdowns ([COVER] 7), Redis-down 503 ([COVER] 16), per-user read limit on `/me/**` ([COVER] 51). Component tests, `e2e/limits.spec.ts` (3/3 pass, 2026-10-13) and manual step 1.
  - [x] Split the 575 kB main chunk; remove the unused `cn` dependency.
- Accessibility and responsive
  - [x] axe checks (`@axe-core/playwright`) on home, list, browse, search, details, watchlist, profile, login: no serious/critical violations. Anonymous and signed-in screens pass (2026-10-13).
  - [x] Keyboard-only pass on every screen (menus, rows, popover, sheet, dialogs); visible focus; skip link; focus to h1 after navigation. Anonymous and signed-in (user menu, rating popover) pass.
  - [x] Contrast check of all token pairs; reduced-motion check.
  - [x] Responsive pass at 375, 768, 1024, 1440 px (no horizontal page scroll, readable rows, filters sheet). Anonymous and signed-in screens pass.
- Errors and limits
  - [x] Matrix test of `RATE_LIMITED` (with/without `Retry-After`), `SERVICE_UNAVAILABLE`, `NETWORK_ERROR`, `INTERNAL_ERROR` on: home, list, details, an action, login, profile forms (MSW-driven component tests).
- Performance
  - [x] Route-level chunks confirmed; `PosterImage` lazy loading; first-row posters `priority`; bundle size report in As built.
  - [x] Verify request counts per screen stay well under 120/min ([ARCH-4] prefetch rule).
- E2E (Playwright, real backend, `E2E_USERNAME`/`E2E_PASSWORD`)
  - [x] Anonymous: home → see all → details → similar; browse with a genre; search by person name.
  - [x] Signed in (`e2e/account.spec.ts`, passes 2026-10-13): login → add/remove watchlist from details → watchlist page → rate → ratings page → logout.
  - [x] Session (`e2e/account.spec.ts`, passes 2026-10-13): reload keeps session; two pages in one context reloading together stay signed in.
- Release
  - [x] Remove or dev-guard `/dev/ui` and dev helpers in production builds.
  - [x] `README.md`: setup, scripts, env, backend prerequisites, deployment constraints from contract [CFG-2] (same-site + HTTPS, SPA fallback to `index.html`, `FRONTEND_ORIGINS`/`FRONTEND_BASE_URL`).
  - [x] Tick every [COVER] row that passed; list any open ones in As built (none open).

**Files:** `e2e/*.spec.ts`, `e2e/fixtures.ts`, component tests across `src/**`, `README.md`, `src/app/router.tsx` (dev route guard), small fixes anywhere in `src/`.

**Acceptance checks**
- `pnpm test:e2e` passes against the running backend; axe reports no serious/critical violations.
- Every screen usable by keyboard only and at 375 px.
- With Redis stopped: browsing works, sign-in shows the unavailable message; with the backend stopped: every screen shows `ErrorState` with Retry and recovers after restart.
- `pnpm build` output served by `pnpm preview` works with deep links (`/movies/<id>` reload).
- Every [COVER] row ticked or listed as open in As built.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass.

### [P6] Manual checkpoints
Run with the user: the user changes the environment, Claude runs the check and records the result here.
- [x] 1) (confirmed by the user, run manually, 2026-10-13) User stops Redis → Claude tests the Redis-down behaviour (browsing works; login/forms show the unavailable message; restore toast) ([COVER] 16).
- [x] 2) (confirmed by the user, run manually, 2026-10-13) User restarts Redis and stops the backend → Claude tests offline: `ErrorState` + Retry on every screen, action rollback + toast.
- [x] 3) (confirmed by the user, run manually, 2026-10-13) User restarts the backend → Claude tests recovery (Retry loads; actions work again).
- [x] 4) (confirmed by the user, run manually, 2026-10-13) User stops `pnpm dev` → Claude tests `pnpm build` + `pnpm preview` with deep-link reloads (`/movies/<id>`, `/confirm-email`, `/lists/…`).
- [x] 5) (confirmed by the user, run manually, 2026-10-13) User opens the email-change link from the dev mailbox → Claude tests that `/profile` shows the new email ([COVER] 50).
- [x] 6) (confirmed by the user, run manually, 2026-10-13: an account locks after repeated wrong passwords, and the IP gets blocked after repeated failed logins) Optional, ask first: lockout check on a throwaway account (or lock the test account for 1 h as the very last step) ([COVER] 6).
- [x] 7) (done 2026-10-13; the user restarted the backend) Top Rated with 6 rating accounts plus a backend restart ([COVER] 21). Shawshank (id 1, avg 9.42), The Godfather (2, 8.08) and The Dark Knight (3, 6.83), each rated by 6 accounts, show on home in that order. The IMDb Top 250 row skips them (de-duplication), `/lists/top-rated` keeps the order at 375 and 1440 px, axe is clean, there is no horizontal scroll and no console errors.

### [P6] As built
Done 2026-10-13. Every check passed, including Top Rated (manual checkpoint 7).

**Built**
- Bundle split into vendor chunks with route-level lazy pages; the unused `cn` package was removed. Sizes (minified): react 222 kB, router 95 kB, query 39 kB, entry (`index`) 222 kB, validation 82 kB. Largest pages: details 32 kB, browse 29 kB.
- MSW error-matrix component tests (`RATE_LIMITED` with and without `Retry-After`, `SERVICE_UNAVAILABLE`, `NETWORK_ERROR`, `INTERNAL_ERROR`) on home, list, details, an action, login and the profile forms.
- Contrast and focus fixes, reduced motion, `/dev/ui` guarded in production builds, `README.md` with deployment constraints ([COVER] 53).
- Playwright projects run in this order: public → cooldown (61 s) → a11y ∥ account → signed-in → limits. Results on 2026-10-13: public + a11y 41/41, account 8/8, signed-in 12/12, limits 3/3.
- Requests per screen on load: home 2, list 2, browse 4, search 2, details 3 (all well under 120/min).
- Unit tests 182/182; `typecheck`, `lint`, `format:check` and `build` pass.
- Confirmed manually by the user: Redis down, backend stop/restart, build + preview deep links, email-change link, account lockout and IP block.

**Fixes made in this session**
- `ui/slider.tsx`: `aria-label`/`aria-labelledby` are passed to the thumb (which has `role="slider"`), not the root. axe `aria-input-field-name` failed on the rating popover.
- `UserMenu` and `BrowseMenu`: `DropdownMenu modal={false}`. A modal menu sets `aria-hidden` on the page, which still holds focusable elements (axe `aria-hidden-focus`). Escape, focus return and outside click still work (keyboard spec passes).
- `e2e/fixtures.ts`: the axe helper waits for finite animations to finish before scanning (a mid-fade popover failed `color-contrast` with blended colours), and its failure message now includes axe's reason for each node.
- `e2e/account.spec.ts`: the session test targets the "Change password" heading (the text also matched the submit button).
- Between e2e runs, the Redis `rl:*` and `login:*` keys were deleted (sessions kept) so each run started with a fresh rate-limit window instead of waiting 15 minutes.

**Open**
- None. Every [COVER] row is ticked. The 18 Top Rated test ratings (6 accounts × movies 1–3) stay in the database as test data; removing them empties Top Rated again.

---

## [NEXT] Resume prompt
Paste this into a new chat (optionally replace "the next phase" with a phase ID):

```
CineSmart frontend: implement the next phase. Project root: E:\Movie Project\CineSmart.

1. Read only the header and [STATUS] of frontend-plan.md (from the top down to the "## [INDEX]" heading).
2. Pick the first phase in [STATUS] not marked [x] (or the phase I name). Load only the IDs in that
   phase's "Read first" line: Grep for the heading (pattern ^## \[ID\] in frontend-plan.md or
   frontend-contract.md, e.g. ^## \[AUTH-4\]), then Read that file with offset/limit up to the next
   "## [" heading. Never load a whole file. For an earlier phase listed in Read first (e.g. [P1]),
   read only its "### [P1] As built" subsection.
3. If the phase is [~], resume from its first unchecked task.
4. Implement only that phase. Work only inside Cinesmart-Frontend/; never change the backend or the
   other docs (only frontend-plan.md progress and, after my confirmation, frontend-contract.md).
5. If the running backend or its code disagrees with frontend-contract.md, stop and ask me; never
   guess. Record the question and my answer in [CLAR], and fix the contract only after I confirm.
6. Run the commands from [DEC-4]: pnpm typecheck, pnpm lint, pnpm test, pnpm build (and
   pnpm test:e2e when the phase has e2e work and the backend is running).
7. Tick the finished tasks, set the phase row in [STATUS] ([~] or [x] + date), tick the [COVER] rows
   whose checks you verified, and write the phase's "As built" note: differences from the plan, new
   shared pieces later phases need (one line each), exact versions/commands if changed, and anything
   unfinished. Then report: what changed, the acceptance checks for me to run, anything not done.
   Then stop.
```
