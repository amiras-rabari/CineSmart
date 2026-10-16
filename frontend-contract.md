# CineSmart Frontend Contract (backend facts)

## How to use this file
- **What it holds:** every backend fact the frontend depends on: endpoints, request/response JSON, validation, error codes, auth/session/cookie/CORS rules, rate limits and UI-relevant config. Facts only: no decisions, no progress.
- **Source:** the backend as built (Spring Boot 4.1.1, `Cinesmart-Backend/`, read 2026-10-12). Where the old docs and the code differed, the code is what is written here (differences are listed in `frontend-plan.md` [CLAR]).
- **The other file:** `frontend-plan.md` holds every frontend decision, the routes/components, the phases and their progress. It refers to sections here by ID and never copies JSON from here.
- **Which file wins:** this file wins on API facts; the plan wins on decisions and progress. If code and this file ever disagree, stop and ask (see plan [NEXT]); fix this file only after the owner confirms.
- **When it changes:** only when the backend changes.
- **How to read it:** every section heading starts with a stable ID, e.g. `## [AUTH-4] ...`. Find a section with Grep (`^## \[AUTH-4\]`) and Read only that range. Each section can be read alone; shared shapes are repeated as one-line reminders with the ID of their full definition.
- **Conventions in this file:** paths are relative to the base URL `/api/v1` unless they start with `/api/v1`. "TS" blocks are TypeScript-style types, not code to copy blindly. `?` in a TS type = field may be absent; `| null` = field is present but may be null.
- **IDs never change.** New sections get new IDs.

## [INDEX] ID index
| ID | Title | Summary |
|---|---|---|
| CONV-1 | Base URL, transport, CORS | Base URL, JSON, allowed headers, credentials, preflight |
| CONV-2 | Access levels and the Authorization header | Public / JWT optional / login required; when not to send the token |
| CONV-3 | JSON value rules | Nulls, decimals (8.40 / 9.0), dates, IDs, enums, unknown fields |
| CONV-4 | Pagination and the page wrapper | `page`/`size` rules, `PageResponse<T>` |
| CONV-5 | Error response shape | `ApiError`, `fields`, framework-generated errors |
| CONV-6 | Shared types | `MovieCard`, `UserMovieState`, `NamedRef`, `PersonRef`, `MessageResponse`, `LoginResponse` |
| AUTH-1 | Session model | Access/refresh tokens, rotation, reuse = revoke all, 7-day cap, valid-after, JWT optional |
| AUTH-2 | Refresh cookie | `refresh_token` attributes, path, Max-Age, when set/cleared, same-site requirement |
| AUTH-3 | POST /auth/signup | Create account (201), verification email |
| AUTH-4 | POST /auth/login | Username + password → tokens; 401/403/429/503 rules |
| AUTH-5 | POST /auth/refresh | Rotate refresh cookie, new access token |
| AUTH-6 | POST /auth/logout | 204, cookie cleared, token blacklisted |
| AUTH-7 | POST /auth/email/verify | Verify email with link token |
| AUTH-8 | POST /auth/email/resend | Resend verification (same answer always) |
| AUTH-9 | POST /auth/password/forgot | Request reset link (same answer always) |
| AUTH-10 | POST /auth/password/reset | Set new password with link token |
| AUTH-11 | POST /auth/password/change | Logged-in password change → new tokens |
| AUTH-12 | POST /auth/email/change | Logged-in email change request → link to new address |
| AUTH-13 | POST /auth/email/change/confirm | Confirm new email with link token |
| ME-1 | GET /me | Profile + counts |
| ME-2 | GET /me/watchlist | Paged watchlist cards + `addedAt` |
| ME-3 | GET /me/ratings | Paged rated cards + `rating`, `ratedAt` |
| ME-4 | GET /me/watched | All watched movie IDs + `watchedAt` |
| ME-5 | GET /me/reactions | All LIKE/DISLIKE movie IDs + `reactedAt` |
| ACT-1 | Activity rules (all 8 endpoints) | Auth, check order, idempotency, `userState` response, write limit |
| ACT-2 | PUT /movies/{id}/watchlist | Add to watchlist |
| ACT-3 | DELETE /movies/{id}/watchlist | Remove from watchlist |
| ACT-4 | PUT /movies/{id}/watched | Mark watched |
| ACT-5 | DELETE /movies/{id}/watched | Unmark watched |
| ACT-6 | PUT /movies/{id}/rating | Set rating 1–10, one decimal |
| ACT-7 | DELETE /movies/{id}/rating | Remove rating |
| ACT-8 | PUT /movies/{id}/reaction | Set LIKE / DISLIKE / NEUTRAL |
| ACT-9 | DELETE /movies/{id}/reaction | Remove reaction (reads NEUTRAL) |
| CAT-1 | GET /movies/{id} | Full movie details + `userState` |
| CAT-2 | GET /genres | Genre list (cacheable 1 h) |
| CAT-3 | GET /languages | Language list (cacheable 1 h) |
| DISC-1 | GET /home | Home sections (For You only when logged in and non-empty) |
| DISC-2 | GET /movies | Browse all movies with genre/language/year filters |
| DISC-3 | GET /movies/search | Title or person-name search, 3–100 chars |
| DISC-4 | GET /movies/trending | Trending list (top10 table) |
| DISC-5 | GET /movies/top-rated | Weighted top rated by users (≥ 5 ratings) |
| DISC-6 | GET /movies/most-liked | Most liked (≥ 1 like) |
| DISC-7 | GET /movies/imdb-top-250 | IMDb top, ≥ 25k votes, capped at 250 |
| REC-1 | GET /recommendations | For You page with `reason` |
| REC-2 | GET /movies/{id}/similar | Similar titles (plain list) |
| ERR-1 | Error code table | Every code → status → meaning |
| ERR-2 | Messages and framework errors | Exact messages, Spring-generated 400/404/405/415 |
| LIMIT-1 | Per-IP rate limits | Groups, limits, which paths |
| LIMIT-2 | Per-user rate limits | Write / read groups |
| LIMIT-3 | Login lockout and IP block | 5 failures/user, 10/IP, 1 h |
| LIMIT-4 | Redis down (503) behaviour | Which endpoints fail open / closed |
| CFG-1 | UI-relevant config values | Sizes, limits, TTLs, year range, analytics interval |
| CFG-2 | Frontend links, origins and deployment constraints | Email link routes, CORS origins, cookie/same-site needs |

---

## [CONV-1] Base URL, transport, CORS
- **Base URL:** `http://localhost:8080/api/v1` in development (Spring default port 8080; no context path). Every endpoint lives under `/api/v1`.
- **Format:** request and response bodies are JSON (UTF-8). Send `Content-Type: application/json` on every request with a body. A body with another content type → 415 (error shape [CONV-5], `code` `BAD_REQUEST`).
- **Success bodies:** always JSON, except `POST /auth/logout` (204, empty body). Messages are `{ "message": "..." }` ([CONV-6] `MessageResponse`), never plain strings.
- **CORS** (applies to every response, including filter-level 401/403/429):

| Setting | Value |
|---|---|
| Allowed origins | env `FRONTEND_ORIGINS` (comma-separated); default `http://localhost:5173` |
| Allowed methods | `GET, POST, PUT, DELETE, OPTIONS` |
| Allowed request headers | `Authorization`, `Content-Type` only (plus CORS-safelisted ones such as `Accept`). Any other custom header fails the preflight. |
| Credentials | allowed (`Access-Control-Allow-Credentials: true`) |
| Exposed response headers | `Retry-After` (readable from JS) |
| Preflight cache | `Access-Control-Max-Age: 3600` |

- **Credentials:** the refresh cookie ([AUTH-2]) is only stored and sent when the request uses `credentials: 'include'` (fetch) / `withCredentials` (XHR). Endpoints that set or read the cookie: login, refresh, logout, password/change.
- **Cache headers:** only `GET /genres` and `GET /languages` send `Cache-Control: max-age=3600`. Other responses carry no caching directive.
- **Other headers the API reads:** `Authorization: Bearer <accessToken>` ([CONV-2]). The client IP comes from the TCP connection (`X-Forwarded-For` is ignored unless the backend sets `app.trust-proxy=true`).

## [CONV-2] Access levels and the Authorization header
Every endpoint has one of three access levels:

| Level | Endpoints | Token behaviour |
|---|---|---|
| **Public** | `POST /auth/signup, /auth/login, /auth/refresh, /auth/email/verify, /auth/email/resend, /auth/email/change/confirm, /auth/password/forgot, /auth/password/reset` | No token needed. **Do not send `Authorization` here:** if a header is sent and the token is invalid, expired or revoked, the request fails with 401 `UNAUTHORIZED` before the endpoint runs (this includes `/auth/refresh`). A valid token is ignored. |
| **Public, JWT optional** | `GET /movies`, `GET /movies/**` (details, search, browse, lists, similar), `GET /home`, `GET /genres`, `GET /languages` | Works without a token. With a **valid** token, user-specific data is added (card flags, `userState`, For You row, similar-title exclusions). An **invalid, expired or revoked** token is silently ignored: the response is the anonymous one (flags `null`, `userState: null`, no For You) with status 200, never 401. |
| **Login required** | `GET /me`, `GET /me/**`, `PUT`/`DELETE /movies/{id}/watchlist · watched · rating · reaction`, `GET /recommendations`, `POST /auth/logout`, `POST /auth/password/change`, `POST /auth/email/change` | Missing, invalid, expired or revoked token → 401 `UNAUTHORIZED`, message `Missing, invalid or expired access token` (no `fields`). |

- **Token format:** `Authorization: Bearer <accessToken>` (HS256 JWT; claims `iss=cinesmart-api`, `sub=<username>`, `userId`, `iat`, `exp`). The backend identifies the user only from `userId` in the token; no endpoint takes a user ID from the client.
- **Unknown URLs:** a `GET` under `/api/v1/movies/**` that matches no endpoint → 404 `NOT_FOUND`. Any other unknown URL → 401 `UNAUTHORIZED` when no valid token is sent (security runs first), 404 when a valid token is sent.
- **403 `FORBIDDEN`** (`Access denied`) exists for Spring's access-denied handler; no endpoint is expected to return it in normal use.

## [CONV-3] JSON value rules
- **Nulls are serialized** as `null` (fields are present), except: `ApiError.fields` is omitted when there are no field errors; `MovieDetails.otherCrew` is omitted when empty (always today).
- **IDs** (`movieId`, `userId`, `personId`, genre/language `id`) are JSON integers (Java `Long`; all current values are far below 2^53).
- **Decimals** are written with the database scale, as JSON numbers:
  - `imdbRating`, `ratings.imdb`, user `rating`: one decimal, e.g. `8.7`, `9.0`.
  - `averageRating` (platform average): two decimals, e.g. `8.40`.
  - `JSON.parse` turns `9.0` into `9` and `8.40` into `8.4`; format for display yourself (e.g. one decimal).
- **Counts** (`likeCount`, `dislikeCount`, `ratingCount`, `*Count` on `/me`, `totalResults`, `imdbVotes`) are integers.
- **Timestamps** (`addedAt`, `ratedAt`, `watchedAt`, `reactedAt`, `createdAt`, `ApiError.timestamp`) are ISO-8601 strings in UTC, e.g. `"2026-10-12T14:03:00.123456Z"` (fractional seconds may be present, with varying length). Parse with `new Date(value)`.
- **Dates** (`released`) are ISO `YYYY-MM-DD` strings without time zone.
- **Enums** are upper-case strings: reaction `LIKE | DISLIKE | NEUTRAL`; error `code` values in [ERR-1]. `availability[].type` is `sub | rent | buy | free | null`. `contentType` is a free string from the data source (e.g. `"movie"`), may be null.
- **Strings from the catalog** (`poster`, `plot`, `studio`, URLs) may be `null`. `poster` is an absolute external image URL (OMDb/Amazon host) when present; there is no image proxy and no size variants.
- **Request bodies:** unknown JSON fields are ignored. A missing or malformed body where one is required → 400 `BAD_REQUEST` `Request body is missing or malformed`.

## [CONV-4] Pagination and the page wrapper
Applies to: `/movies`, `/movies/search`, `/movies/trending`, `/movies/top-rated`, `/movies/most-liked`, `/movies/imdb-top-250`, `/recommendations`, `/me/watchlist`, `/me/ratings`.

| Param | Type | Default | Rule | Invalid → |
|---|---|---|---|---|
| `page` | integer, 0-based | `0` | ≥ 0 | 400 `VALIDATION_FAILED`, message `page must be 0 or greater`, **no `fields`** |
| `size` | integer | `20` | 1–30 | 400 `VALIDATION_FAILED`, message `size must be between 1 and 30`, **no `fields`** |

- A non-integer value (`page=abc`) → 400 `BAD_REQUEST` (Spring type-mismatch message).
- Response wrapper (always 200, also when empty):
```json
{ "results": [ /* items */ ], "page": 0, "size": 20, "totalResults": 137, "totalPages": 7 }
```
| Field | Type | Notes |
|---|---|---|
| `results` | array | Items of the endpoint's type; `[]` when empty |
| `page` | int | Echo of the requested page |
| `size` | int | Echo of the requested size (not the number of results) |
| `totalResults` | int | Size of the whole list |
| `totalPages` | int | `ceil(totalResults / size)`; `0` when empty |

- A page past the end → `results: []` with the real `totalResults`/`totalPages`. Never 404 for an empty list.
- No `sort` parameter exists anywhere. `/similar` and `/me/watched`, `/me/reactions`, `/genres`, `/languages` are plain arrays, not pages.
```ts
interface Page<T> { results: T[]; page: number; size: number; totalResults: number; totalPages: number }
```

## [CONV-5] Error response shape
Every error (controllers and filters) uses one body:
```json
{ "status": 400, "code": "VALIDATION_FAILED", "message": "Invalid request fields",
  "path": "/api/v1/auth/signup", "timestamp": "2026-10-12T14:03:00.512Z",
  "fields": { "email": "must be a well-formed email address" } }
```
| Field | Type | Notes |
|---|---|---|
| `status` | int | Same as the HTTP status |
| `code` | string | Stable code ([ERR-1]). **Switch on `code`, never on `message`.** |
| `message` | string | Human-readable English text; may change |
| `path` | string | Request URI |
| `timestamp` | string | ISO-8601 UTC |
| `fields` | object, **omitted** when absent | `{ fieldName: message }`, one message per field, only on `VALIDATION_FAILED` from body/param validation or a field check in code |

- **When `fields` is present:** body validation (field names = JSON property names), path/param validation (`id`, `size`), and field checks in code (`currentPassword`, `newPassword`, `newEmail`, `genreId`, `languageId`, `year`, `q`, `size`). `VALIDATION_FAILED` from `page`/`size` in [CONV-4] has **no** `fields`.
- **Filter-level errors** (401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 429 `RATE_LIMITED` from rate limits) have no `fields`.
- **429 responses from rate limits** carry `Retry-After: <seconds>` (integer ≥ 1). 429 from the login IP block and `ACCOUNT_LOCKED` do **not** ([LIMIT-3]).
- **500 `INTERNAL_ERROR`** never exposes details (`An unexpected error occurred`). Possible on any endpoint (e.g. database down).
```ts
type ErrorCode = 'VALIDATION_FAILED' | 'BAD_REQUEST' | 'UNAUTHORIZED' | 'INVALID_CREDENTIALS' | 'FORBIDDEN'
  | 'ACCOUNT_NOT_VERIFIED' | 'ACCOUNT_LOCKED' | 'TOKEN_INVALID' | 'EMAIL_TAKEN' | 'USERNAME_TAKEN'
  | 'MOVIE_NOT_FOUND' | 'NOT_FOUND' | 'METHOD_NOT_ALLOWED' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE' | 'INTERNAL_ERROR';
interface ApiErrorBody { status: number; code: ErrorCode; message: string; path: string; timestamp: string; fields?: Record<string, string> }
```

## [CONV-6] Shared types
**MovieCard**: the one card used by every list, search result, home row, similar list and recommendation.
```json
{ "movieId": 118, "title": "Interstellar", "year": 2014,
  "poster": "https://m.media-amazon.com/images/M/MV5BYzdjMDAx...SX300.jpg",
  "imdbRating": 8.7, "averageRating": 8.40, "likeCount": 95, "dislikeCount": 6,
  "inWatchlist": true, "watched": false }
```
| Field | Type | Null? | Notes |
|---|---|---|---|
| `movieId` | int | no | |
| `title` | string | no | |
| `year` | int | yes | |
| `poster` | string | yes | External absolute URL |
| `imdbRating` | number (1 dp) | yes | 0–10 |
| `averageRating` | number (2 dp) | yes | Platform average from the hourly batch; `null` when no user ratings yet. Lags up to 1 h ([CFG-1]) |
| `likeCount`, `dislikeCount` | int | no | `0` when none; lag up to 1 h |
| `inWatchlist`, `watched` | boolean | **yes** | `null` when anonymous (or the token was ignored, [CONV-2]); `true/false` when logged in |

No plot, genres or availability on cards. Lists extend the card with extra fields at the same level (flattened): `/me/watchlist` adds `addedAt`, `/me/ratings` adds `rating`, `ratedAt`, `/recommendations` adds `reason`.

**UserMovieState**: one logged-in user's state for one movie (details `userState` and every activity response).
```json
{ "inWatchlist": true, "watched": false, "rating": 9.0, "reaction": "LIKE" }
```
| Field | Type | Null? | Notes |
|---|---|---|---|
| `inWatchlist`, `watched` | boolean | no | |
| `rating` | number (1 dp) | yes | `null` when not rated |
| `reaction` | `LIKE \| DISLIKE \| NEUTRAL` | no | `NEUTRAL` when the user has no reaction (never `null`) |

**Other shared shapes**
```ts
interface MovieCard { movieId: number; title: string; year: number | null; poster: string | null;
  imdbRating: number | null; averageRating: number | null; likeCount: number; dislikeCount: number;
  inWatchlist: boolean | null; watched: boolean | null }
type Reaction = 'LIKE' | 'DISLIKE' | 'NEUTRAL';
interface UserMovieState { inWatchlist: boolean; watched: boolean; rating: number | null; reaction: Reaction }
interface NamedRef { id: number; name: string }            // genre or language
interface PersonRef { personId: number; name: string }
interface MessageResponse { message: string }
interface LoginResponse { accessToken: string; expiresIn: number; user: { userId: number; username: string } }
```
- `LoginResponse` is returned by login, refresh and password change. `expiresIn` is seconds (900). The refresh token is never in a body, only in the cookie ([AUTH-2]).
- `username` keeps the case typed at signup (display case).

---

## [AUTH-1] Session model
| Token | Lifetime | Where | Notes |
|---|---|---|---|
| Access token (JWT) | 15 min (`expiresIn: 900`) | Returned in the body; sent as `Authorization: Bearer` | Claims `sub` (username), `userId`, `iat`, `exp`, `iss` |
| Refresh token | 2 h sliding: each refresh issues a new token with a fresh 2 h window | `refresh_token` HttpOnly cookie ([AUTH-2]) | Random value; JS can never read it |
| Absolute session cap | 7 days from login | — | A refresh past the cap → 401; the cookie lifetime shrinks as the cap approaches |

- **Rotation:** `POST /auth/refresh` consumes the current refresh token and sets a new cookie. The old token becomes "used".
- **Reuse = theft:** presenting a used refresh token again → 401 **and every session of that user is revoked** (all refresh tokens deleted, all access tokens issued until now rejected). This includes two browser tabs refreshing with the same cookie at nearly the same time: the second request carries the already-used token.
- **Refresh failure** (no cookie, unknown, expired, used, past the cap, user deleted) → 401 `UNAUTHORIZED` `Session expired. Please sign in again.` and the cookie is cleared.
- **Any error from the refresh endpoint itself clears the cookie**, including 503 when Redis is down ([LIMIT-4]). A 429 from the IP rate limit happens before the endpoint and does not clear it.
- **Logout** (`POST /auth/logout`, login required): deletes the current refresh token, blacklists the access token until it expires, clears the cookie. Other sessions stay.
- **tokens-valid-after:** password reset and password change set a per-user timestamp; every access token issued before it is rejected (401 on login-required endpoints, silently anonymous on JWT-optional GETs). Password reset and password change also delete every refresh token of the user. Password change then issues a new session for the caller (new token + cookie); reset does not log anyone in.
- **JWT-optional GETs** ([CONV-2]) never return 401 for a bad token; they answer anonymously. So an expired token on those endpoints is only visible as missing user data (`inWatchlist: null`, `userState: null`, no For You).
- **Redis down:** access-token checks fail open (tokens keep working until they expire); login, refresh, signup and the email/password flows return 503 ([LIMIT-4]).
- Login identifies the user by **username** (case-insensitive); there is no login by email.

## [AUTH-2] Refresh cookie
| Attribute | Value |
|---|---|
| Name | `refresh_token` |
| Value | Random URL-safe token (opaque) |
| `HttpOnly` | yes (not readable by JS) |
| `Secure` | yes by default; `false` when the backend runs with the `dev` profile (`auth.refresh.cookie-secure=false`) |
| `SameSite` | `Strict` |
| `Path` | `/api/v1/auth` (sent only to `/api/v1/auth/**` requests) |
| `Domain` | not set (host-only: the API host) |
| `Max-Age` | seconds until the refresh token expires: 7200 (2 h), or less near the 7-day cap |

- **Set by:** `POST /auth/login`, `POST /auth/refresh`, `POST /auth/password/change` (200 responses).
- **Cleared by** (`Max-Age=0`, empty value): `POST /auth/logout` (204) and any error from `POST /auth/refresh`.
- **Read by:** `POST /auth/refresh` (required) and `POST /auth/logout` (optional; without it only the access token is revoked).
- Example header: `Set-Cookie: refresh_token=k3Jx...Q; Path=/api/v1/auth; Max-Age=7200; Expires=Mon, 12 Oct 2026 16:03:00 GMT; Secure; HttpOnly; SameSite=Strict`
- **Browser requirements:** requests must use `credentials: 'include'`. Because of `SameSite=Strict`, the page origin and the API must be **same-site** (same scheme and registrable domain; ports don't matter). `http://localhost:5173` → `http://localhost:8080` is same-site. A production frontend on a different registrable domain than the API would never send the cookie ([CFG-2]).
- `Secure` cookies over plain `http://localhost` are accepted by Chromium and Firefox; if a browser refuses, run the backend with the `dev` profile.

## [AUTH-3] POST /auth/signup
| Access | Rate limit | Cookies | Success |
|---|---|---|---|
| Public (no `Authorization`, [CONV-2]) | IP `account` 5 / 15 min ([LIMIT-1]) | none | **201** |

**Request**
| Field | Type | Required | Rule (server) |
|---|---|---|---|
| `username` | string | yes | `^[A-Za-z0-9_.-]{3,32}$` (3–32 chars: letters, digits, `_`, `.`, `-`); unique case-insensitively; kept as typed; can never be changed later |
| `email` | string | yes | not blank, valid email, max 64 chars; stored trimmed + lowercased; unique case-insensitively |
| `password` | string | yes | not blank, 8–100 chars (no other complexity rule) |

**Response 201**
```json
{ "username": "Amir", "message": "Successfully registered. Please verify your email to use the account." }
```
| Field | Type | Null? |
|---|---|---|
| `username` | string | no (as typed) |
| `message` | string | no |

- The account is created **unverified**. A verification email with a link to `FRONTEND_BASE_URL/verify-email?token=…` (valid 24 h) is sent after the account is saved. If sending fails, signup still returns 201 (the user can use resend, [AUTH-8]).
- No tokens, no cookie: the user is not logged in.

**Errors**
| Status | Code | When | `fields` |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | Body rule broken | `username`, `email`, `password` (first message per field) |
| 400 | `BAD_REQUEST` | Missing/malformed body | — |
| 409 | `USERNAME_TAKEN` | Username exists (`Username is already taken`); also a rare race on either field (`Username or email is already registered`) | — |
| 409 | `EMAIL_TAKEN` | Email exists (`Email is already registered`) | — |
| 429 | `RATE_LIMITED` | IP limit; `Retry-After` set | — |
| 503 | `SERVICE_UNAVAILABLE` | Redis down (checked before anything is saved) | — |

```ts
interface SignupRequest { username: string; email: string; password: string }
interface SignupResponse { username: string; message: string }
```
**UI note:** after 201 the user must open the email link, then sign in. Username uniqueness is checked before email uniqueness.

## [AUTH-4] POST /auth/login
| Access | Rate limit | Cookies | Success |
|---|---|---|---|
| Public (no `Authorization`, [CONV-2]) | IP `login` 10 / min ([LIMIT-1]) + lockout/IP block ([LIMIT-3]) | **Sets** `refresh_token` ([AUTH-2]); use `credentials: 'include'` | 200 `LoginResponse` |

**Request**
| Field | Type | Required | Rule |
|---|---|---|---|
| `username` | string | yes | not blank; trimmed; matched case-insensitively |
| `password` | string | yes | not blank (no length check at login) |

**Response 200**
```json
{ "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJjaW5lc21hcnQtYXBpIiwic3ViIjoiQW1pciIsInVzZXJJZCI6NDIsImlhdCI6MTc2MDI3NzM4MCwiZXhwIjoxNzYwMjc4MjgwfQ.3vQ...",
  "expiresIn": 900,
  "user": { "userId": 42, "username": "Amir" } }
```
| Field | Type | Null? | Notes |
|---|---|---|---|
| `accessToken` | string | no | JWT, valid 15 min |
| `expiresIn` | int | no | seconds (900) |
| `user.userId` | int | no | |
| `user.username` | string | no | display case |

Header: `Set-Cookie: refresh_token=…; Path=/api/v1/auth; Max-Age=7200; Secure; HttpOnly; SameSite=Strict`.

**Check order and errors** (the order matters for the UI):
| # | Situation | Status | Code | Message | Counts toward lockout |
|---|---|---|---|---|---|
| 0 | Over the IP rate limit | 429 | `RATE_LIMITED` | `Too many requests. Try again later.` + `Retry-After` | no |
| 1 | IP blocked (10 failed logins from this IP) | 429 | `RATE_LIMITED` | `Too many failed login attempts from this address. Try again later.` **no `Retry-After`** | no |
| 2 | Username locked (5 failures) — password not checked | 429 | `ACCOUNT_LOCKED` | `Too many failed attempts. Try again later.` no `Retry-After` | no |
| 3 | Unknown username | 401 | `INVALID_CREDENTIALS` | `Invalid username or password` | yes |
| 4 | Wrong password (verified or not) | 401 | `INVALID_CREDENTIALS` | `Invalid username or password` | yes |
| 5 | Correct password, email not verified | 403 | `ACCOUNT_NOT_VERIFIED` | `Account not verified` | no |
| 6 | Success | 200 | — | — | counters reset |

Also: 400 `VALIDATION_FAILED` (`fields.username` / `fields.password` blank), 400 `BAD_REQUEST` (malformed body), 503 `SERVICE_UNAVAILABLE` `Login temporarily unavailable. Please try again later.` (Redis down; fails closed).

```ts
interface LoginRequest { username: string; password: string }
type LoginResult = LoginResponse   // [CONV-6]
```
**UI note:** 401 here means bad credentials (`INVALID_CREDENTIALS`), not an expired session: never refresh-and-retry on login. On 403 offer "resend verification" ([AUTH-8], needs the email). A locked username stays locked 1 h whatever password is typed; unknown usernames get locked too.

## [AUTH-5] POST /auth/refresh
| Access | Rate limit | Cookies | Success |
|---|---|---|---|
| Public — **must not send `Authorization`** (a stale token here → 401 before the endpoint runs, [CONV-2]) | IP `public` 120 / min, shared with all public GETs ([LIMIT-1]) | **Reads** `refresh_token`; **sets** a new one on 200; **clears** it on any endpoint error. Use `credentials: 'include'`. | 200 `LoginResponse` |

**Request:** no body (send none; the cookie is the input).

**Response 200** (same shape as login)
```json
{ "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJ...", "expiresIn": 900, "user": { "userId": 42, "username": "Amir" } }
```
| Field | Type | Null? |
|---|---|---|
| `accessToken` | string | no |
| `expiresIn` | int (900) | no |
| `user.userId` / `user.username` | int / string | no |

**Errors**
| Status | Code | When | Cookie |
|---|---|---|---|
| 401 | `UNAUTHORIZED` | No cookie, unknown/expired token, past the 7-day cap, user gone: `Session expired. Please sign in again.` | cleared |
| 401 | `UNAUTHORIZED` | **Reused (already rotated) token**: same message, and **all sessions of the user are revoked** | cleared |
| 401 | `UNAUTHORIZED` | An invalid `Authorization` header was sent: `Missing, invalid or expired access token` | unchanged |
| 429 | `RATE_LIMITED` | IP `public` limit, `Retry-After` set | unchanged |
| 503 | `SERVICE_UNAVAILABLE` | Redis down: `Service temporarily unavailable. Please try again later.` | **cleared** (the session can't be restored afterwards) |

```ts
type RefreshResponse = LoginResponse   // [CONV-6]
```
**UI note:** each successful call invalidates the previous cookie; two concurrent calls with the same cookie trigger reuse detection ([AUTH-1]). The session start (7-day cap) is kept across refreshes.

## [AUTH-6] POST /auth/logout
| Access | Rate limit | Cookies | Success |
|---|---|---|---|
| **Login required** (valid `Authorization`) | none | Reads `refresh_token` (optional); **clears** it. Use `credentials: 'include'`. | **204**, empty body |

**Request:** no body.

- Blacklists the presented access token until it expires and deletes the refresh token from the cookie (if present). Other devices/sessions stay logged in.
- Redis down: still 204 (cleanup fails open).

**Errors:** 401 `UNAUTHORIZED` (missing/invalid/expired/revoked access token; the cookie is **not** cleared in that case).
```ts
// no request body, no response body
```
**UI note:** with an expired access token, logout returns 401; the cookie stays until a refresh or a successful logout clears it.

## [AUTH-7] POST /auth/email/verify
| Access | Rate limit | Cookies | Success |
|---|---|---|---|
| Public (no `Authorization`) | IP `token` 10 / 15 min ([LIMIT-1]) | none | 200 `MessageResponse` |

**Request**
| Field | Type | Required | Rule |
|---|---|---|---|
| `token` | string | yes | not blank, max 200 chars (the `token` query value from the email link `FRONTEND_BASE_URL/verify-email?token=…`) |

**Response 200**
```json
{ "message": "Email verified. You can now sign in." }
```
**Errors**
| Status | Code | When | `fields` |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | token blank / > 200 chars | `token` |
| 400 | `TOKEN_INVALID` | Unknown, expired (24 h) or already used: `Invalid or expired verification link` | — |
| 429 | `RATE_LIMITED` | IP limit + `Retry-After` | — |
| 503 | `SERVICE_UNAVAILABLE` | Redis down | — |

```ts
interface TokenRequest { token: string }
type VerifyResponse = MessageResponse
```
**UI note:** the token is **single use**: a second POST with the same token returns `TOKEN_INVALID` even though the first one succeeded. No login happens; the user signs in afterwards.

## [AUTH-8] POST /auth/email/resend
| Access | Rate limit | Cookies | Success |
|---|---|---|---|
| Public (no `Authorization`) | IP `account` 5 / 15 min | none | 200 `MessageResponse` |

**Request**
| Field | Type | Required | Rule |
|---|---|---|---|
| `email` | string | yes | not blank, valid email, max 64; matched case-insensitively |

**Response 200** (identical whether or not an unverified account exists)
```json
{ "message": "If an unverified account exists for this email, we've sent a new verification link." }
```
- Sends a new 24 h link only when an **unverified** account has that email. Older links stay valid until they expire. Mail failures are hidden.

**Errors:** 400 `VALIDATION_FAILED` (`fields.email`), 400 `BAD_REQUEST`, 429 `RATE_LIMITED` (+ `Retry-After`), 503 `SERVICE_UNAVAILABLE` (Redis down).
```ts
interface EmailRequest { email: string }
type ResendResponse = MessageResponse
```
**UI note:** never reveals whether the account exists; show the message as returned.

## [AUTH-9] POST /auth/password/forgot
| Access | Rate limit | Cookies | Success |
|---|---|---|---|
| Public (no `Authorization`) | IP `account` 5 / 15 min | none | 200 `MessageResponse` |

**Request**
| Field | Type | Required | Rule |
|---|---|---|---|
| `email` | string | yes | not blank, valid email, max 64; case-insensitive (email only, no username) |

**Response 200** (identical in every case)
```json
{ "message": "If an account exists for this email, we've sent instructions." }
```
| Account state | What is emailed |
|---|---|
| No account | nothing |
| Verified | reset link `FRONTEND_BASE_URL/reset-password?token=…`, valid **10 min**, single use |
| Unverified | a verification link instead (as [AUTH-8]) |

**Errors:** 400 `VALIDATION_FAILED` (`fields.email`), 400 `BAD_REQUEST`, 429 `RATE_LIMITED` (+ `Retry-After`), 503 `SERVICE_UNAVAILABLE` (Redis down).
```ts
interface EmailRequest { email: string }
type ForgotResponse = MessageResponse
```
**UI note:** works whether or not the user is logged in.

## [AUTH-10] POST /auth/password/reset
| Access | Rate limit | Cookies | Success |
|---|---|---|---|
| Public (no `Authorization`) | IP `token` 10 / 15 min | none | 200 `MessageResponse` |

**Request**
| Field | Type | Required | Rule |
|---|---|---|---|
| `token` | string | yes | not blank, max 200 (from `/reset-password?token=…`) |
| `newPassword` | string | yes | not blank, 8–100 chars. (May equal the old password; no check.) |

**Response 200**
```json
{ "message": "Your password has been reset. Please sign in." }
```
- Single-use token (10 min). On success every session of the user is revoked (all refresh tokens, all access tokens issued before now). No login happens.

**Errors**
| Status | Code | When | `fields` |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | rule broken | `token`, `newPassword` |
| 400 | `TOKEN_INVALID` | unknown/expired/used: `Invalid or expired reset link. Request a new one.` | — |
| 429 | `RATE_LIMITED` | IP limit + `Retry-After` | — |
| 503 | `SERVICE_UNAVAILABLE` | Redis down | — |

```ts
interface ResetPasswordRequest { token: string; newPassword: string }
type ResetResponse = MessageResponse
```
**UI note:** the token is consumed by the first valid request even if the client never sees the answer; then a new reset must be requested.

## [AUTH-11] POST /auth/password/change
| Access | Rate limit | Cookies | Success |
|---|---|---|---|
| **Login required** | IP `account` 5 / 15 min | **Sets** a new `refresh_token`; use `credentials: 'include'` | 200 `LoginResponse` (new session) |

**Request**
| Field | Type | Required | Rule |
|---|---|---|---|
| `currentPassword` | string | yes | not blank; must match |
| `newPassword` | string | yes | not blank, 8–100; must differ from the current password |

**Response 200**
```json
{ "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJ...", "expiresIn": 900, "user": { "userId": 42, "username": "Amir" } }
```
- Every other session is logged out (all refresh tokens deleted; every access token issued before now rejected, **including the one used for this request**). The caller continues with the returned token + new cookie.

**Errors** (check order: auth → lock → current password → new ≠ current)
| Status | Code | When | `fields` |
|---|---|---|---|
| 401 | `UNAUTHORIZED` | missing/invalid/expired token | — |
| 400 | `VALIDATION_FAILED` | body rules | `currentPassword`, `newPassword` |
| 429 | `ACCOUNT_LOCKED` | username locked ([LIMIT-3]) `Too many failed attempts. Try again later.` | — |
| 400 | `VALIDATION_FAILED` | wrong current password (`is incorrect`); **counts toward the lockout** | `currentPassword` |
| 400 | `VALIDATION_FAILED` | same as current (`must be different from the current password`) | `newPassword` |
| 429 | `RATE_LIMITED` | IP limit + `Retry-After` | — |
| 503 | `SERVICE_UNAVAILABLE` | Redis down | — |

```ts
interface ChangePasswordRequest { currentPassword: string; newPassword: string }
type ChangePasswordResponse = LoginResponse
```
**UI note:** a wrong current password is a 400, not a 401, so it must not trigger a refresh. Replace the stored access token with the returned one immediately.

## [AUTH-12] POST /auth/email/change
| Access | Rate limit | Cookies | Success |
|---|---|---|---|
| **Login required** | IP `account` 5 / 15 min | none | 200 `MessageResponse` |

**Request**
| Field | Type | Required | Rule |
|---|---|---|---|
| `currentPassword` | string | yes | not blank; must match |
| `newEmail` | string | yes | not blank, valid email, max 64; trimmed + lowercased; must differ from the current email; must not belong to another account |

**Response 200**
```json
{ "message": "We've sent a confirmation link to the new email address." }
```
- The email does **not** change yet. A link `FRONTEND_BASE_URL/confirm-email?token=…` (24 h, single use) goes to the **new** address; [AUTH-13] does the switch, after which the old address gets a notice. `GET /me` keeps showing the old email until then.

**Errors** (order: auth → body → lock → password → same email → taken → send)
| Status | Code | When | `fields` |
|---|---|---|---|
| 401 | `UNAUTHORIZED` | token | — |
| 400 | `VALIDATION_FAILED` | body rules | `currentPassword`, `newEmail` |
| 429 | `ACCOUNT_LOCKED` | username locked | — |
| 400 | `VALIDATION_FAILED` | wrong password (`is incorrect`), counts toward the lockout | `currentPassword` |
| 400 | `VALIDATION_FAILED` | same as current (`must be different from the current email`) | `newEmail` |
| 409 | `EMAIL_TAKEN` | used by another account | — |
| 429 | `RATE_LIMITED` | IP limit + `Retry-After` | — |
| 503 | `SERVICE_UNAVAILABLE` | Redis down, or the email could not be sent (`The email could not be sent. Please try again later.`) | — |

```ts
interface ChangeEmailRequest { currentPassword: string; newEmail: string }
type ChangeEmailResponse = MessageResponse
```

## [AUTH-13] POST /auth/email/change/confirm
| Access | Rate limit | Cookies | Success |
|---|---|---|---|
| Public (no `Authorization`; works logged in or not) | IP `token` 10 / 15 min | none | 200 `MessageResponse` |

**Request**
| Field | Type | Required | Rule |
|---|---|---|---|
| `token` | string | yes | not blank, max 200 (from `/confirm-email?token=…`) |

**Response 200**
```json
{ "message": "Your email address has been changed." }
```
- Switches the account email; sends a "your email was changed" notice to the old address (failure hidden). Sessions are not affected.

**Errors**
| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | `fields.token` |
| 400 | `TOKEN_INVALID` | unknown/expired/used: `Invalid or expired confirmation link` |
| 409 | `EMAIL_TAKEN` | another account took that email in the meantime |
| 429 | `RATE_LIMITED` | IP limit + `Retry-After` |
| 503 | `SERVICE_UNAVAILABLE` | Redis down |

```ts
interface TokenRequest { token: string }
type ConfirmEmailResponse = MessageResponse
```
**UI note:** single-use token (a repeated POST → `TOKEN_INVALID`).

---

## [ME-1] GET /me
| Access | Rate limit | Success |
|---|---|---|
| **Login required** | per-user `read` 120 / min ([LIMIT-2]) | 200 |

**Query params:** none.

**Response 200**
```json
{ "userId": 42, "username": "Amir", "email": "amir@example.com",
  "createdAt": "2026-09-30T18:22:41.115204Z",
  "watchlistCount": 6, "watchedCount": 12, "ratingCount": 2 }
```
| Field | Type | Null? | Notes |
|---|---|---|---|
| `userId` | int | no | |
| `username` | string | no | display case; immutable |
| `email` | string | no | lowercased; the current (confirmed) email |
| `createdAt` | ISO timestamp | no | account creation |
| `watchlistCount`, `watchedCount`, `ratingCount` | int | no | live counts (not from the hourly batch) |

**Errors:** 401 `UNAUTHORIZED` (also when the user no longer exists), 429 `RATE_LIMITED` (+ `Retry-After`).
```ts
interface Profile { userId: number; username: string; email: string; createdAt: string;
  watchlistCount: number; watchedCount: number; ratingCount: number }
```
**UI note:** there are no like/dislike counts here; [ME-5] lists reactions.

## [ME-2] GET /me/watchlist
| Access | Rate limit | Success |
|---|---|---|
| **Login required** | per-user `read` 120 / min | 200 `Page<WatchlistItem>` |

**Query params:** `page` (int ≥ 0, default 0), `size` (int 1–30, default 20) ([CONV-4]). Unknown params are ignored.

**Response 200** (newest added first; tie-break `movieId`)
```json
{ "results": [
    { "movieId": 118, "title": "Interstellar", "year": 2014,
      "poster": "https://m.media-amazon.com/images/M/MV5BYzdjMDAx...SX300.jpg",
      "imdbRating": 8.7, "averageRating": null, "likeCount": 0, "dislikeCount": 0,
      "inWatchlist": true, "watched": false,
      "addedAt": "2026-10-11T20:15:03.481922Z" } ],
  "page": 0, "size": 20, "totalResults": 1, "totalPages": 1 }
```
| Field | Type | Null? | Notes |
|---|---|---|---|
| card fields | — | — | every `MovieCard` field ([CONV-6]) at the top level; `inWatchlist` is `true`, `watched` is `true/false` |
| `addedAt` | ISO timestamp | no | when it was added (a repeated PUT keeps the original) |

**Errors:** 401, 400 (`page`/`size`, [CONV-4]), 429 `RATE_LIMITED`.
```ts
interface WatchlistItem extends MovieCard { addedAt: string }
type WatchlistPage = Page<WatchlistItem>
```

## [ME-3] GET /me/ratings
| Access | Rate limit | Success |
|---|---|---|
| **Login required** | per-user `read` 120 / min | 200 `Page<RatedItem>` |

**Query params:** `page`, `size` ([CONV-4]). Unknown params are ignored.

**Response 200** (most recently rated/changed first; tie-break `movieId`)
```json
{ "results": [
    { "movieId": 412, "title": "Inception", "year": 2010,
      "poster": "https://m.media-amazon.com/images/M/MV5BMjAxMzY3...SX300.jpg",
      "imdbRating": 8.8, "averageRating": 9.00, "likeCount": 1, "dislikeCount": 0,
      "inWatchlist": false, "watched": true,
      "rating": 9.0, "ratedAt": "2026-10-12T09:41:17.002311Z" } ],
  "page": 0, "size": 20, "totalResults": 1, "totalPages": 1 }
```
| Field | Type | Null? | Notes |
|---|---|---|---|
| card fields | — | — | every `MovieCard` field ([CONV-6]) |
| `rating` | number (1 dp) | no | the user's rating 1.0–10.0 |
| `ratedAt` | ISO timestamp | no | set again on every change |

**Errors:** 401, 400 (`page`/`size`), 429.
```ts
interface RatedItem extends MovieCard { rating: number; ratedAt: string }
type RatingsPage = Page<RatedItem>
```

## [ME-4] GET /me/watched
| Access | Rate limit | Success |
|---|---|---|
| **Login required** | per-user `read` 120 / min | 200 array (not paginated) |

**Query params:** none.

**Response 200** (newest first)
```json
[ { "movieId": 412, "watchedAt": "2026-10-10T21:05:44.910021Z" },
  { "movieId": 233, "watchedAt": "2026-09-02T17:30:00.000001Z" } ]
```
| Field | Type | Null? |
|---|---|---|
| `movieId` | int | no |
| `watchedAt` | ISO timestamp | no |

Empty → `[]`. No titles or posters (no batch card endpoint exists).

**Errors:** 401, 429.
```ts
interface WatchedItem { movieId: number; watchedAt: string }
type WatchedList = WatchedItem[]
```
**UI note:** the whole list in one response; size = `watchedCount` from [ME-1].

## [ME-5] GET /me/reactions
| Access | Rate limit | Success |
|---|---|---|
| **Login required** | per-user `read` 120 / min | 200 array (not paginated) |

**Query params:** none.

**Response 200** (newest first; only `LIKE` and `DISLIKE`; NEUTRAL rows are never listed)
```json
[ { "movieId": 118, "reaction": "LIKE", "reactedAt": "2026-10-12T10:02:13.551003Z" },
  { "movieId": 905, "reaction": "DISLIKE", "reactedAt": "2026-10-01T08:15:09.004112Z" } ]
```
| Field | Type | Null? |
|---|---|---|
| `movieId` | int | no |
| `reaction` | `'LIKE' \| 'DISLIKE'` | no |
| `reactedAt` | ISO timestamp | no |

**Errors:** 401, 429.
```ts
interface ReactionItem { movieId: number; reaction: 'LIKE' | 'DISLIKE'; reactedAt: string }
type ReactionList = ReactionItem[]
```

---

## [ACT-1] Activity rules (all 8 endpoints)
Applies to `PUT` and `DELETE` on `/movies/{id}/watchlist`, `/movies/{id}/watched`, `/movies/{id}/rating`, `/movies/{id}/reaction` ([ACT-2]…[ACT-9]).
- **Access:** login required. **Rate limit:** per-user `write` 60 / min, **one budget shared by all 8** ([LIMIT-2]). No IP limit.
- **Path `{id}`:** positive integer. `≤ 0` → 400 `VALIDATION_FAILED` `fields.id` (`must be greater than 0`); not a number → 400 `BAD_REQUEST`.
- **Check order:** 401 (token) → 429 (write limit; the request is counted even if it then fails) → 400 (path/body) → 404 `MOVIE_NOT_FOUND` (`Movie was not found with id: <id>`) → write.
- **Idempotent:** `PUT` sets a state (repeating it changes nothing, except rating/reaction values); `DELETE` removes it and still succeeds when nothing was there.
- **Response:** always **200** with the user's **updated `UserMovieState`** for that movie ([CONV-6]): `{ inWatchlist, watched, rating, reaction }`.
- **Not updated immediately:** the movie's `averageRating`, `likeCount`, `dislikeCount`, `ratingCount` come from the hourly batch and change only after the next run (up to 1 h).
- **Errors common to all 8:** 401 `UNAUTHORIZED`; 429 `RATE_LIMITED` + `Retry-After`; 400 `VALIDATION_FAILED` (`fields.id`); 400 `BAD_REQUEST`; 404 `MOVIE_NOT_FOUND`; 500. Redis down does not affect them (limits fail open).
```ts
type ActivityResponse = UserMovieState   // [CONV-6]
```

## [ACT-2] PUT /movies/{id}/watchlist
Login required · write limit 60/min shared ([ACT-1]) · no body · 200 `UserMovieState`.
- Adds the movie to the watchlist. Repeating keeps the original `addedAt`.
- Example response: `{ "inWatchlist": true, "watched": false, "rating": null, "reaction": "NEUTRAL" }`
- Errors: 401, 429 (+`Retry-After`), 400 `fields.id`, 404 `MOVIE_NOT_FOUND`.
```ts
// PUT, no request body → UserMovieState
```

## [ACT-3] DELETE /movies/{id}/watchlist
Login required · write limit ([ACT-1]) · no body · 200 `UserMovieState`.
- Removes it; succeeds when it wasn't there.
- Example response: `{ "inWatchlist": false, "watched": false, "rating": null, "reaction": "NEUTRAL" }`
- Errors: 401, 429, 400 `fields.id`, 404 `MOVIE_NOT_FOUND`.
```ts
// DELETE → UserMovieState
```

## [ACT-4] PUT /movies/{id}/watched
Login required · write limit ([ACT-1]) · no body · 200 `UserMovieState`.
- Marks the movie as watched (stores `watchedAt`; repeating keeps the original). Independent of the watchlist (marking watched does not remove it from the watchlist).
- Example response: `{ "inWatchlist": true, "watched": true, "rating": null, "reaction": "NEUTRAL" }`
- Errors: 401, 429, 400 `fields.id`, 404 `MOVIE_NOT_FOUND`.
```ts
// PUT, no request body → UserMovieState
```

## [ACT-5] DELETE /movies/{id}/watched
Login required · write limit ([ACT-1]) · no body · 200 `UserMovieState`.
- Removes the watched mark; succeeds when it wasn't there.
- Example response: `{ "inWatchlist": true, "watched": false, "rating": null, "reaction": "NEUTRAL" }`
- Errors: 401, 429, 400 `fields.id`, 404 `MOVIE_NOT_FOUND`.

## [ACT-6] PUT /movies/{id}/rating
Login required · write limit ([ACT-1]) · JSON body · 200 `UserMovieState`.

**Request**
| Field | Type | Required | Rule | `fields.rating` message |
|---|---|---|---|---|
| `rating` | number | yes | 1.0 ≤ rating ≤ 10.0, at most one decimal place (`8`, `8.5` ok; `8.55`, `0.5`, `10.5` rejected) | `Rating cannot be null` · `Rating must be at least 1.0` · `Rating must be at most 10.0` · `Rating must have at most 2 integer digits and 1 decimal place` |

- Creates or replaces the user's rating; `ratedAt` is set again on every change.
- Example request `{ "rating": 8.5 }` → response `{ "inWatchlist": false, "watched": true, "rating": 8.5, "reaction": "LIKE" }`
- Errors: 401, 429, 400 `VALIDATION_FAILED` (`fields.rating` or `fields.id`), 400 `BAD_REQUEST` (missing/malformed body, e.g. `"rating": "abc"`), 404 `MOVIE_NOT_FOUND`.
```ts
interface RatingRequest { rating: number }   // send a number rounded to 1 decimal
```

## [ACT-7] DELETE /movies/{id}/rating
Login required · write limit ([ACT-1]) · no body · 200 `UserMovieState`.
- Removes the rating; `rating` becomes `null`. Succeeds when there was none.
- Example response: `{ "inWatchlist": false, "watched": true, "rating": null, "reaction": "LIKE" }`
- Errors: 401, 429, 400 `fields.id`, 404 `MOVIE_NOT_FOUND`.

## [ACT-8] PUT /movies/{id}/reaction
Login required · write limit ([ACT-1]) · JSON body · 200 `UserMovieState`.

**Request**
| Field | Type | Required | Rule | `fields.reaction` message |
|---|---|---|---|---|
| `reaction` | string | yes | exactly `LIKE`, `DISLIKE` or `NEUTRAL` (case-sensitive) | `Reaction is required` · `Reaction must be LIKE, DISLIKE, or NEUTRAL` |

- Creates or replaces the reaction (one per user and movie); `reactedAt` set again on every change. `NEUTRAL` is stored but reads the same as no reaction (not listed by [ME-5], not counted).
- Example request `{ "reaction": "DISLIKE" }` → response `{ "inWatchlist": false, "watched": false, "rating": null, "reaction": "DISLIKE" }`
- Errors: 401, 429, 400 `VALIDATION_FAILED` (`fields.reaction`, `fields.id`), 400 `BAD_REQUEST`, 404 `MOVIE_NOT_FOUND`.
```ts
interface ReactionRequest { reaction: 'LIKE' | 'DISLIKE' | 'NEUTRAL' }
```

## [ACT-9] DELETE /movies/{id}/reaction
Login required · write limit ([ACT-1]) · no body · 200 `UserMovieState`.
- Removes the reaction row; `reaction` then reads `"NEUTRAL"`. Succeeds when there was none.
- Example response: `{ "inWatchlist": false, "watched": false, "rating": null, "reaction": "NEUTRAL" }`
- Errors: 401, 429, 400 `fields.id`, 404 `MOVIE_NOT_FOUND`.

---

## [CAT-1] GET /movies/{id}
| Access | Rate limit | Success |
|---|---|---|
| Public, JWT optional ([CONV-2]) | IP `public` 120 / min ([LIMIT-1]) | 200 `MovieDetails` |

**Path:** `id` positive integer (`≤ 0` → 400 `VALIDATION_FAILED` `fields.id`; non-numeric → 400 `BAD_REQUEST`). **Query params:** none (extras ignored).

**Response 200** (logged in; `userState` is `null` when anonymous)
```json
{ "movieId": 118, "imdbId": "tt0816692", "title": "Interstellar", "year": 2014,
  "released": "2014-11-07", "runtime": 169,
  "plot": "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
  "poster": "https://m.media-amazon.com/images/M/MV5BYzdjMDAx...SX300.jpg",
  "contentType": "movie", "studio": "Paramount Pictures",
  "ratings": { "imdb": 8.7, "imdbVotes": 2154321, "rottenTomatoes": 73, "metascore": 74 },
  "genres":    [ { "id": 1, "name": "Adventure" }, { "id": 7, "name": "Drama" }, { "id": 15, "name": "Sci-Fi" } ],
  "languages": [ { "id": 3, "name": "English" } ],
  "directors": [ { "personId": 9, "name": "Christopher Nolan" } ],
  "writers":   [ { "personId": 9, "name": "Christopher Nolan" }, { "personId": 10, "name": "Jonathan Nolan" } ],
  "cast":      [ { "personId": 21, "name": "Anne Hathaway" }, { "personId": 20, "name": "Matthew McConaughey" } ],
  "platformStats": { "averageRating": 8.40, "ratingCount": 12, "likeCount": 9, "dislikeCount": 1 },
  "availability": [ { "platform": "Netflix", "type": "sub", "url": "https://www.netflix.com/title/70305903" },
                    { "platform": "Apple TV", "type": "rent", "url": null } ],
  "userState": { "inWatchlist": true, "watched": false, "rating": 9.0, "reaction": "LIKE" } }
```
| Field | Type | Null? | Notes |
|---|---|---|---|
| `movieId`, `title` | int, string | no | |
| `imdbId` | string | yes | e.g. `tt0816692` |
| `year`, `runtime` | int | yes | runtime in minutes |
| `released` | `YYYY-MM-DD` | yes | |
| `plot`, `poster`, `contentType`, `studio` | string | yes | `poster` = external URL |
| `ratings.imdb` | number (1 dp) | yes | 0–10 |
| `ratings.imdbVotes` | int | yes | |
| `ratings.rottenTomatoes`, `ratings.metascore` | int 0–100 | yes | percent / score |
| `genres`, `languages` | `NamedRef[]` | no (may be `[]`) | sorted by name |
| `directors`, `writers`, `cast` | `PersonRef[]` | no (may be `[]`) | sorted by name; cast has no billing order |
| `otherCrew` | `Record<string, PersonRef[]>` | **omitted** when empty | always omitted today (only Actor/Director/Writer exist) |
| `platformStats.averageRating` | number (2 dp) | yes | `null` until someone rated it; hourly batch |
| `platformStats.ratingCount`, `likeCount`, `dislikeCount` | int | no | `0` when none; hourly batch (lag ≤ 1 h) |
| `availability` | array | no (may be `[]`) | Canada; sorted by platform |
| `availability[].platform` | string | no | |
| `availability[].type` | `sub \| rent \| buy \| free` | yes | |
| `availability[].url` | string | yes | external link |
| `userState` | `UserMovieState` | yes | `null` when anonymous or the token was ignored ([CONV-2]) |

No `country`, `awards`, `boxOffice` or `tmdbId`.

**Errors:** 404 `MOVIE_NOT_FOUND` (`Movie was not found with id: 999999`), 400 (`fields.id` / `BAD_REQUEST`), 429 `RATE_LIMITED` (+`Retry-After`), 500.
```ts
interface MovieDetails {
  movieId: number; imdbId: string | null; title: string; year: number | null; released: string | null;
  runtime: number | null; plot: string | null; poster: string | null; contentType: string | null; studio: string | null;
  ratings: { imdb: number | null; imdbVotes: number | null; rottenTomatoes: number | null; metascore: number | null };
  genres: NamedRef[]; languages: NamedRef[]; directors: PersonRef[]; writers: PersonRef[]; cast: PersonRef[];
  otherCrew?: Record<string, PersonRef[]>;
  platformStats: { averageRating: number | null; ratingCount: number; likeCount: number; dislikeCount: number };
  availability: { platform: string; type: 'sub' | 'rent' | 'buy' | 'free' | null; url: string | null }[];
  userState: UserMovieState | null;
}
```
**UI note:** `userState` reflects activity instantly; `platformStats` lags up to 1 hour.

## [CAT-2] GET /genres
| Access | Rate limit | Success | Headers |
|---|---|---|---|
| Public, JWT optional | IP `public` 120 / min | 200 `NamedRef[]` | `Cache-Control: max-age=3600` |

**Query params:** none.

**Response 200** (sorted by name; only genres with ≥ 1 movie)
```json
[ { "id": 1, "name": "Action" }, { "id": 2, "name": "Adventure" }, { "id": 4, "name": "Animation" } ]
```
| Field | Type | Null? |
|---|---|---|
| `id` | int | no |
| `name` | string | no |

**Errors:** 429, 500.
```ts
type GenreList = NamedRef[]
```
**UI note:** IDs are database-generated: never hard-code them; send the chosen `id` as `genreId` to [DISC-2].

## [CAT-3] GET /languages
| Access | Rate limit | Success | Headers |
|---|---|---|---|
| Public, JWT optional | IP `public` 120 / min | 200 `NamedRef[]` | `Cache-Control: max-age=3600` |

**Query params:** none.

**Response 200** (sorted by number of movies, most first, then name; only languages with ≥ 1 movie)
```json
[ { "id": 3, "name": "English" }, { "id": 11, "name": "French" }, { "id": 8, "name": "Spanish" } ]
```
| Field | Type | Null? |
|---|---|---|
| `id` | int | no |
| `name` | string | no |

**Errors:** 429, 500.
```ts
type LanguageList = NamedRef[]
```
**UI note:** send the chosen `id` as `languageId` to [DISC-2].

---

## [DISC-1] GET /home
| Access | Rate limit | Success |
|---|---|---|
| Public, JWT optional | IP `public` 120 / min | 200 `HomeResponse` |

**Query params:** none.

**Response 200** (logged in; anonymous responses have no `for-you` section and `null` card flags)
```json
{ "sections": [
  { "key": "for-you", "title": "For You", "endpoint": "/api/v1/recommendations", "totalResults": 214,
    "results": [ { "movieId": 412, "title": "Inception", "year": 2010, "poster": "https://m.media-amazon.com/images/M/MV5BMjAx...jpg",
                   "imdbRating": 8.8, "averageRating": null, "likeCount": 0, "dislikeCount": 0,
                   "inWatchlist": false, "watched": false } ] },
  { "key": "trending", "title": "Trending Now", "endpoint": "/api/v1/movies/trending", "totalResults": 10, "results": [ /* MovieCard × ≤10 */ ] },
  { "key": "top-rated", "title": "Top Rated by CineSmart Users", "endpoint": "/api/v1/movies/top-rated", "totalResults": 3, "results": [ /* … */ ] },
  { "key": "most-liked", "title": "Most Liked", "endpoint": "/api/v1/movies/most-liked", "totalResults": 41, "results": [ /* … */ ] },
  { "key": "imdb-top-250", "title": "IMDb Top 250", "endpoint": "/api/v1/movies/imdb-top-250", "totalResults": 250, "results": [ /* … */ ] } ] }
```
| Field | Type | Null? | Notes |
|---|---|---|---|
| `sections` | array | no | non-empty rows only, in this fixed order: `for-you`, `trending`, `top-rated`, `most-liked`, `imdb-top-250` |
| `key` | string | no | one of the five keys above |
| `title` | string | no | display title (exact strings above) |
| `endpoint` | string | no | full path incl. `/api/v1` of the "see more" list: `/api/v1/recommendations` ([REC-1]) or `/api/v1/movies/<key>` ([DISC-4]…[DISC-7]) |
| `totalResults` | int | no | size of the full list behind `endpoint` (that list is not de-duplicated) |
| `results` | `MovieCard[]` | no | up to 10 cards ([CONV-6]); For You cards have no `reason` here |

- **For You** appears only when the token is valid **and** the recommendation list is non-empty; it is page 0 (size 10) of [REC-1].
- **De-duplication (home only):** rows are filled in the order above; a movie shown in an earlier row is skipped in later rows, which pull extra candidates to still show 10 when possible. So `results.length` can be < 10 even when `totalResults` ≥ 10, and row page 0 can differ from page 0 of its endpoint.
- **Empty rows are omitted** (e.g. `top-rated` until a movie has 5 user ratings; `most-liked` until someone likes something).

**Errors:** 429, 500.
```ts
type HomeSectionKey = 'for-you' | 'trending' | 'top-rated' | 'most-liked' | 'imdb-top-250';
interface HomeSection { key: HomeSectionKey; title: string; endpoint: string; totalResults: number; results: MovieCard[] }
interface HomeResponse { sections: HomeSection[] }
```

## [DISC-2] GET /movies
| Access | Rate limit | Success |
|---|---|---|
| Public, JWT optional | IP `public` 120 / min | 200 `Page<MovieCard>` |

**Query params** (all optional, combined with AND; **any other param → 400**)
| Param | Type | Rule | Invalid → |
|---|---|---|---|
| `genreId` | int | an `id` from [CAT-2] | ≤ 0 or unknown → 400 `VALIDATION_FAILED` `fields.genreId` = `Unknown genre` |
| `languageId` | int | an `id` from [CAT-3] | → 400 `fields.languageId` = `Unknown language` |
| `year` | int | 1888–2100 | → 400 `fields.year` = `must be between 1888 and 2100` |
| `page` | int | ≥ 0, default 0 | 400 no `fields` ([CONV-4]) |
| `size` | int | 1–30, default 20 | 400 no `fields` |

- Unknown param (e.g. `?sort=x`) → 400 `BAD_REQUEST` `Unknown query parameter: sort` (first unknown name alphabetically). Non-numeric value → 400 `BAD_REQUEST`.
- No filter = all movies. A valid year with no movies → 200 empty page.
- **Fixed order:** IMDb rating desc (nulls last), IMDb votes desc, `movieId`.

**Response 200**
```json
{ "results": [ { "movieId": 118, "title": "Interstellar", "year": 2014, "poster": "https://m.media-amazon.com/images/M/MV5BYzdj...jpg",
                 "imdbRating": 8.7, "averageRating": 8.40, "likeCount": 9, "dislikeCount": 1,
                 "inWatchlist": null, "watched": null } ],
  "page": 0, "size": 20, "totalResults": 37, "totalPages": 2 }
```
Fields: `Page<MovieCard>` ([CONV-4], [CONV-6]); flags `null` when anonymous.

**Errors:** 400 (`VALIDATION_FAILED` with `fields.genreId|languageId|year`; `VALIDATION_FAILED` without fields for page/size; `BAD_REQUEST` unknown param), 429, 500.
```ts
interface BrowseParams { genreId?: number; languageId?: number; year?: number; page?: number; size?: number }
type BrowsePage = Page<MovieCard>
```
**UI note:** never send empty-valued params (`genreId=`): send only the filters that are set.

## [DISC-3] GET /movies/search
| Access | Rate limit | Success |
|---|---|---|
| Public, JWT optional | IP `public` 120 / min | 200 `Page<MovieCard>` |

**Query params** (**any other param → 400**)
| Param | Type | Rule | Invalid → |
|---|---|---|---|
| `q` | string | **required**; 3–100 chars **after trim** | missing → 400 `BAD_REQUEST` (Spring message); too short/long → 400 `VALIDATION_FAILED` `fields.q` = `must be between 3 and 100 characters` |
| `page` | int | ≥ 0, default 0 | [CONV-4] |
| `size` | int | 1–30, default 20 | [CONV-4] |

- Matches **movie titles and person names** (actors, directors, writers): a person match returns that person's movies. Fuzzy trigram word similarity ≥ 0.3, case-insensitive; partial words match ("incep" → Inception).
- **Order:** relevance (best of title score + 0.1 boost and person score), then IMDb votes desc, then `movieId`. No filters, no sort, no person results (only movies).
- No match → 200 empty page.

**Response 200**
```json
{ "results": [ { "movieId": 118, "title": "Interstellar", "year": 2014, "poster": "https://m.media-amazon.com/images/M/MV5BYzdj...jpg",
                 "imdbRating": 8.7, "averageRating": 8.40, "likeCount": 9, "dislikeCount": 1,
                 "inWatchlist": false, "watched": true } ],
  "page": 0, "size": 20, "totalResults": 1, "totalPages": 1 }
```
**Errors:** 400 (`fields.q`, page/size, unknown param, missing `q`), 429, 500.
```ts
interface SearchParams { q: string; page?: number; size?: number }
type SearchPage = Page<MovieCard>
```
**UI note:** results don't say whether the title or a person matched.

## [DISC-4] GET /movies/trending
| Access | Rate limit | Success |
|---|---|---|
| Public, JWT optional | IP `public` 120 / min | 200 `Page<MovieCard>` |

- **Query params:** `page`, `size` ([CONV-4]); other params ignored.
- **List:** the movies in the `top10` table (refreshed daily by the ETL, so usually ~10), ordered by IMDb rating desc (nulls last), votes desc, `movieId`.
- **Response 200:** `Page<MovieCard>`, e.g. `{ "results": [ { "movieId": 1104, "title": "Inside Out 2", "year": 2024, "poster": "https://…jpg", "imdbRating": 7.6, "averageRating": null, "likeCount": 0, "dislikeCount": 0, "inWatchlist": null, "watched": null } ], "page": 0, "size": 20, "totalResults": 10, "totalPages": 1 }`
- **Errors:** 400 page/size, 429, 500.
```ts
type TrendingPage = Page<MovieCard>
```

## [DISC-5] GET /movies/top-rated
| Access | Rate limit | Success |
|---|---|---|
| Public, JWT optional | IP `public` 120 / min | 200 `Page<MovieCard>` |

- **Query params:** `page`, `size` ([CONV-4]); other params ignored.
- **List:** movies with **≥ 5 CineSmart user ratings** (`analytics.min-votes`), ordered by **weighted rating** desc (Bayesian: `(v/(v+5))·R + (5/(v+5))·C`, C = platform-wide average), then rating count, IMDb votes, `movieId`. The weighted value itself is not returned; cards show `averageRating`. Recomputed hourly.
- Often empty on a young platform → 200 empty page.
- **Response 200:** `Page<MovieCard>` (see [DISC-4] example shape).
- **Errors:** 400 page/size, 429, 500.
```ts
type TopRatedPage = Page<MovieCard>
```

## [DISC-6] GET /movies/most-liked
| Access | Rate limit | Success |
|---|---|---|
| Public, JWT optional | IP `public` 120 / min | 200 `Page<MovieCard>` |

- **Query params:** `page`, `size` ([CONV-4]); other params ignored.
- **List:** movies with `likeCount > 0`, ordered by like count desc, IMDb votes desc, `movieId`. Counts from the hourly batch.
- **Response 200:** `Page<MovieCard>` (see [DISC-4] example shape).
- **Errors:** 400 page/size, 429, 500.
```ts
type MostLikedPage = Page<MovieCard>
```

## [DISC-7] GET /movies/imdb-top-250
| Access | Rate limit | Success |
|---|---|---|
| Public, JWT optional | IP `public` 120 / min | 200 `Page<MovieCard>` |

- **Query params:** `page`, `size` ([CONV-4]); other params ignored.
- **List:** movies with **≥ 25,000 IMDb votes** and an IMDb rating, ordered by IMDb rating desc, votes desc, `movieId`, **capped at 250** (`totalResults` ≤ 250; pages past 250 are empty). Derived from stored data; may differ from IMDb's official list.
- **Response 200:** `Page<MovieCard>`; e.g. `?page=12&size=20` → 10 results, `totalResults: 250`, `totalPages: 13`.
- **Errors:** 400 page/size, 429, 500.
```ts
type ImdbTop250Page = Page<MovieCard>
```

---

## [REC-1] GET /recommendations
| Access | Rate limit | Success |
|---|---|---|
| **Login required** | per-user `read` 120 / min ([LIMIT-2]); no IP limit | 200 `Page<RecommendationCard>` |

**Query params:** `page`, `size` ([CONV-4]); other params ignored.

**Response 200**
```json
{ "results": [
    { "movieId": 412, "title": "Inception", "year": 2010, "poster": "https://m.media-amazon.com/images/M/MV5BMjAx...jpg",
      "imdbRating": 8.8, "averageRating": null, "likeCount": 0, "dislikeCount": 0,
      "inWatchlist": false, "watched": false, "reason": "More with Christopher Nolan" },
    { "movieId": 77, "title": "The Matrix", "year": 1999, "poster": null,
      "imdbRating": 8.7, "averageRating": null, "likeCount": 0, "dislikeCount": 0,
      "inWatchlist": false, "watched": false, "reason": "Matches your taste in Sci-Fi" } ],
  "page": 0, "size": 20, "totalResults": 214, "totalPages": 11 }
```
| Field | Type | Null? | Notes |
|---|---|---|---|
| card fields | — | — | every `MovieCard` field ([CONV-6]), flags `true/false` |
| `reason` | string | no | plain text, one of: `More with <Person>` · `Because you liked <Title>` · `Matches your taste in <Genre>` · `Popular on CineSmart` |

- **Signals (positive only):** ratings ≥ 7, likes, watched, watchlist (activity in the last 90 days counts ×1.5). Dislikes and ratings < 7 add no weight.
- **Never recommended:** the user's watched, watchlist, rated (any score), liked and disliked movies.
- **Cold start:** fewer than 3 distinct signal movies (or no candidates) → Top Rated by users, then IMDb Top 250, every item with reason `Popular on CineSmart`.
- **Size:** at most 300 items (`totalResults` ≤ 300). Computed on every request (no cache), so it changes right after any activity action.
- The home `for-you` row ([DISC-1]) equals page 0, size 10 of this list without `reason`.

**Errors:** 401 `UNAUTHORIZED`, 400 page/size, 429 `RATE_LIMITED` (+`Retry-After`), 500.
```ts
interface RecommendationCard extends MovieCard { reason: string }
type RecommendationPage = Page<RecommendationCard>
```

## [REC-2] GET /movies/{id}/similar
| Access | Rate limit | Success |
|---|---|---|
| Public, JWT optional ([CONV-2]) | IP `public` 120 / min | 200 `MovieCard[]` (plain array, not paginated) |

**Path:** `id` positive integer (`≤ 0` → 400 `fields.id`; non-numeric → 400 `BAD_REQUEST`).
**Query params**
| Param | Type | Default | Rule | Invalid → |
|---|---|---|---|---|
| `size` | int | 10 | 1–30 | 400 `VALIDATION_FAILED` `fields.size` = `must be between 1 and 30` |

**Response 200**
```json
[ { "movieId": 412, "title": "Inception", "year": 2010, "poster": "https://m.media-amazon.com/images/M/MV5BMjAx...jpg",
    "imdbRating": 8.8, "averageRating": 9.00, "likeCount": 1, "dislikeCount": 0,
    "inWatchlist": null, "watched": null } ]
```
- Score: shared genres 0.4, shared directors + cast 0.3, shared language 0.1, IMDb rating/10 0.2 (each normalized); ties by IMDb votes. The movie itself is excluded.
- **Logged in:** the user's watched and disliked movies are also excluded; flags filled.
- A movie with genres but no people → same-genre movies ranked mostly by IMDb rating; with neither → `[]`.

**Errors:** 404 `MOVIE_NOT_FOUND`, 400 (`fields.size`, `fields.id`, `BAD_REQUEST`), 429, 500.
```ts
type SimilarList = MovieCard[]
```

---

## [ERR-1] Error code table
| Code | Status | Meaning | Typical endpoints |
|---|---|---|---|
| `VALIDATION_FAILED` | 400 | Input broke a rule. `fields` present for body/param/field checks; absent for `page`/`size` | all with input |
| `BAD_REQUEST` | 400 | Malformed/missing body, wrong type, missing required param, unknown query param on `/movies` and `/movies/search`; also used for 415 and other unmapped 4xx | any |
| `TOKEN_INVALID` | 400 | Email-link token unknown, expired or already used | verify, reset, change/confirm |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired/revoked access token on a login-required endpoint, an invalid token sent to a public auth POST, refresh failed, unknown URL outside `/movies/**` without a token | login-required, refresh |
| `INVALID_CREDENTIALS` | 401 | Unknown username or wrong password at login | login |
| `FORBIDDEN` | 403 | Access denied (not expected in normal use) | — |
| `ACCOUNT_NOT_VERIFIED` | 403 | Correct password, email not verified | login |
| `EMAIL_TAKEN` | 409 | Email belongs to another account | signup, email/change, email/change/confirm |
| `USERNAME_TAKEN` | 409 | Username exists (or rare signup race on either field) | signup |
| `MOVIE_NOT_FOUND` | 404 | No movie with that ID | details, similar, activity |
| `NOT_FOUND` | 404 | Unknown URL under `/movies/**` (or with a valid token) | — |
| `METHOD_NOT_ALLOWED` | 405 | Wrong HTTP method on an existing path | — |
| `ACCOUNT_LOCKED` | 429 | Username locked after 5 failures (1 h); no `Retry-After` | login, password/change, email/change |
| `RATE_LIMITED` | 429 | IP or per-user rate limit (`Retry-After` set), or login IP block (no `Retry-After`) | all limited endpoints |
| `SERVICE_UNAVAILABLE` | 503 | Redis down on a fail-closed flow, or an email could not be sent (email/change) | auth flows ([LIMIT-4]) |
| `INTERNAL_ERROR` | 500 | Unexpected error (e.g. database down); no details | any |

## [ERR-2] Messages and framework errors
Messages are informative only (never parse them). Exact texts as built:
| Code | Message |
|---|---|
| `UNAUTHORIZED` (filter) | `Missing, invalid or expired access token` |
| `UNAUTHORIZED` (refresh) | `Session expired. Please sign in again.` |
| `FORBIDDEN` | `Access denied` |
| `INVALID_CREDENTIALS` | `Invalid username or password` |
| `ACCOUNT_NOT_VERIFIED` | `Account not verified` |
| `ACCOUNT_LOCKED` | `Too many failed attempts. Try again later.` |
| `RATE_LIMITED` (limits) | `Too many requests. Try again later.` |
| `RATE_LIMITED` (login IP block) | `Too many failed login attempts from this address. Try again later.` |
| `SERVICE_UNAVAILABLE` (login) | `Login temporarily unavailable. Please try again later.` |
| `SERVICE_UNAVAILABLE` (other) | `Service temporarily unavailable. Please try again later.` |
| `SERVICE_UNAVAILABLE` (email send) | `The email could not be sent. Please try again later.` |
| `TOKEN_INVALID` | `Invalid or expired verification link` · `Invalid or expired reset link. Request a new one.` · `Invalid or expired confirmation link` |
| `USERNAME_TAKEN` | `Username is already taken` (race: `Username or email is already registered`) |
| `EMAIL_TAKEN` | `Email is already registered` |
| `MOVIE_NOT_FOUND` | `Movie was not found with id: <id>` |
| `VALIDATION_FAILED` (body) | `Invalid request fields` |
| `VALIDATION_FAILED` (path/param) | `Invalid request parameters` |
| `INTERNAL_ERROR` | `An unexpected error occurred` |

**Default bean-validation field messages** (English): blank → `must not be blank`; bad email → `must be a well-formed email address`; length → `size must be between 8 and 100` / `size must be between 0 and 64` / `size must be between 0 and 200`; username pattern → `must be 3-32 characters: letters, digits, '_', '.' or '-'`; positive id → `must be greater than 0`.

**Framework-generated errors** (all in the [CONV-5] shape, never with `fields`):
| Situation | Status | Code | Message |
|---|---|---|---|
| Missing/malformed JSON body | 400 | `BAD_REQUEST` | `Request body is missing or malformed` |
| Wrong value type (`page=abc`, `/movies/abc`) | 400 | `BAD_REQUEST` | Spring's detail text |
| Missing required query param (`q`) | 400 | `BAD_REQUEST` | Spring's detail text |
| Unsupported `Content-Type` | 415 | `BAD_REQUEST` | Spring's detail text |
| Unknown path under `/movies/**` | 404 | `NOT_FOUND` | `Resource not found` |
| Wrong method | 405 | `METHOD_NOT_ALLOWED` | Spring's detail text |

---

## [LIMIT-1] Per-IP rate limits
Fixed window per client IP (Redis). Over the limit → 429 `RATE_LIMITED`, message `Too many requests. Try again later.`, header `Retry-After: <seconds until the window resets>`. Counted before authentication and before the endpoint runs (failed requests count too).

| Group | Limit | Requests counted |
|---|---|---|
| `login` | 10 / 1 min | `POST /auth/login` |
| `account` | 5 / 15 min | `POST /auth/signup`, `/auth/password/forgot`, `/auth/email/resend`, `/auth/email/change`, `/auth/password/change` |
| `token` | 10 / 15 min | `POST /auth/email/verify`, `/auth/password/reset`, `/auth/email/change/confirm` |
| `public` | 120 / 1 min | `POST /auth/refresh` **and** every `GET /movies`, `/movies/**` (details, search, browse, the four lists, similar), `/home`, `/genres`, `/languages` — one shared budget |

- Not IP-limited: `/me/**`, `/recommendations`, activity writes (they have per-user limits, [LIMIT-2]), `POST /auth/logout`.
- All users behind one IP (NAT, office) share these budgets.
- Fails **open** when Redis is down (no limit applied).

## [LIMIT-2] Per-user rate limits
Fixed window per `userId` (from the token). Over the limit → 429 `RATE_LIMITED` + `Retry-After`. Checked after authentication (anonymous requests get 401 first) and before validation (a 400/404 still counts).

| Group | Limit | Requests counted |
|---|---|---|
| `write` | 60 / 1 min | `PUT` and `DELETE` on `/movies/{id}/watchlist`, `/watched`, `/rating`, `/reaction` — one shared budget |
| `read` | 120 / 1 min | `GET /me`, `/me/watchlist`, `/me/ratings`, `/me/watched`, `/me/reactions`, `/recommendations` — one shared budget |

- Fails **open** when Redis is down.

## [LIMIT-3] Login lockout and IP block
| Rule | Value | Effect |
|---|---|---|
| Username lock | 5 failed attempts (unknown username or wrong password) within the lock window | That username is locked for **1 h**: login, password/change and email/change answer 429 `ACCOUNT_LOCKED` without checking the password. No `Retry-After`. |
| IP block | 10 failed logins from one IP | That IP can't **log in** for **1 h**: 429 `RATE_LIMITED` `Too many failed login attempts from this address. Try again later.` No `Retry-After`. Browsing still works. |
| What counts | wrong password or unknown username at login (also on unverified accounts); a wrong `currentPassword` on password/change and email/change | A correct password resets both counters (login only). |
| Unknown usernames | are counted and locked like real ones | A lock doesn't reveal whether the account exists. |

- The failure counter expires 1 h after the first failure. Usernames are compared lowercased.
- Lockout checks fail **closed**: Redis down → login 503.

## [LIMIT-4] Redis down (503) behaviour
| Feature | Redis down → |
|---|---|
| Browsing, search, details, home, genres, languages, similar | Works |
| `/me/**`, `/recommendations`, activity PUT/DELETE | Works |
| IP and per-user rate limits | Fail **open** (not applied) |
| Access-token blacklist / tokens-valid-after checks | Fail **open** (tokens accepted until they expire) |
| `POST /auth/logout` | Works (204; cleanup skipped) |
| `POST /auth/login` | **503** `Login temporarily unavailable. Please try again later.` |
| `POST /auth/refresh` | **503**, and the refresh cookie is **cleared** ([AUTH-5]) |
| signup, email/verify, email/resend, password/forgot, password/reset, password/change, email/change, email/change/confirm | **503** `Service temporarily unavailable. Please try again later.` (signup/forgot/resend check first and change nothing) |

- Redis calls time out after 500 ms, so a 503 arrives quickly.
- `email/change` also returns 503 when the confirmation email can't be sent ([AUTH-12]).

---

## [CFG-1] UI-relevant config values
| Setting | Value | Used by |
|---|---|---|
| Page size default / max | 20 / 30; `page` 0-based | [CONV-4] |
| Home row size | 10 | [DISC-1] |
| Similar titles default / max size | 10 / 30 | [REC-2] |
| Search `q` length (after trim) | 3–100 | [DISC-3] |
| Search similarity threshold / title boost | 0.3 / 0.1 | [DISC-3] |
| Browse `year` range | 1888–2100 | [DISC-2] |
| IMDb Top 250 min votes / cap | 25,000 / 250 | [DISC-7] |
| Top Rated min user ratings (m) | 5 | [DISC-5] |
| Analytics refresh (platform stats, top-rated, most-liked) | every 1 h + once at backend start | `averageRating`, like/dislike/rating counts lag ≤ 1 h |
| Access token TTL | 15 min (`expiresIn: 900`) | [AUTH-1] |
| Refresh token idle TTL / absolute session cap | 2 h sliding / 7 days | [AUTH-1], [AUTH-2] |
| Verification link / reset link / email-change link TTL | 24 h / 10 min / 24 h | [AUTH-7], [AUTH-10], [AUTH-13] |
| Username / email / password rules | `^[A-Za-z0-9_.-]{3,32}$` / valid, ≤ 64 / 8–100 | [AUTH-3], [AUTH-11], [AUTH-12] |
| Rating | 1.0–10.0, one decimal | [ACT-6] |
| Lockout | 5 failures/username, 10 failures/IP, 1 h | [LIMIT-3] |
| IP limits | login 10/min · account 5/15 min · token 10/15 min · public 120/min | [LIMIT-1] |
| Per-user limits | write 60/min · read 120/min | [LIMIT-2] |
| Recommendations | max 300 items; cold start below 3 signal movies; recency window 90 days | [REC-1] |
| `Cache-Control` on genres/languages | `max-age=3600` | [CAT-2], [CAT-3] |
| CORS preflight max age | 3600 s | [CONV-1] |

## [CFG-2] Frontend links, origins and deployment constraints
| Setting | Env var | Default | Meaning |
|---|---|---|---|
| Frontend base URL for email links | `FRONTEND_BASE_URL` | `http://localhost:5173` | Prefix of every link in emails |
| CORS allowed origins | `FRONTEND_ORIGINS` (comma-separated) | `http://localhost:5173` | Exact origins allowed to call the API with credentials |
| Refresh cookie `Secure` flag | `auth.refresh.cookie-secure` (`dev` profile → false) | `true` | [AUTH-2] |
| Proxy trust for client IP | `app.trust-proxy` | `false` | Only the TCP peer IP is used for limits |

**Routes the frontend must serve** (the backend emails these links; the page reads `token` from the query string and POSTs it):
| Route | Query | Calls | Then |
|---|---|---|---|
| `/verify-email` | `token` | [AUTH-7] `POST /auth/email/verify` | user signs in (no auto-login) |
| `/reset-password` | `token` | [AUTH-10] `POST /auth/password/reset` with the new password | user signs in |
| `/confirm-email` | `token` | [AUTH-13] `POST /auth/email/change/confirm` | done (sessions unaffected) |

Tokens are URL-safe Base64 (no encoding needed), ≤ 200 chars.

**Deployment constraints implied by the backend:**
- The frontend origin must be listed in `FRONTEND_ORIGINS` exactly (scheme + host + port), and `FRONTEND_BASE_URL` must point at it.
- Because the refresh cookie is `SameSite=Strict`, `Path=/api/v1/auth`, host-only: the frontend and API must be **same-site** (e.g. `cinesmart.ca` + `api.cinesmart.ca`, or one host behind a reverse proxy). Different registrable domains break refresh.
- Production cookies are `Secure`, so the API must be served over HTTPS.
- The SPA host must serve `index.html` for every route above (deep links from emails).
