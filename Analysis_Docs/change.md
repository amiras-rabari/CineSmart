# CineSmart Backend — Change Decisions

**Status:** Planning complete (Q1–Q28 decided). Implementation in progress, tracked in `implementation-plan.md` (Phases 0–9 done; every `PRD` / `BOTH` item is now reflected in `CineSmart-Product-Requirements-and-System-Design.md`).
**Source:** `assessment.md` (IDs like I-1, B-2 refer to it)
**Process:** We go module by module, one difference at a time. Each entry records the question, your answer and the resulting action. An action can change the code, the PRD, or both.

**Action tags:** `CODE` = change the backend · `PRD` = update the requirements doc · `BOTH` · `NONE` = keep as is

---

## 0. Bug fixes (no decision needed — will fix)

| ID | Fix |
|---|---|
| B-1 | Check the Redis lock in `AuthService.login` before `authenticate()`, so a locked account gets the proper locked response instead of a 500 (see Q1 for the exact response) |
| B-2 | Fix the regex in `MovieDiscoveryService.searchPage` (`"[%_\\\\]"`) |
| B-3 | Global handler extends `ResponseEntityExceptionHandler`, so Spring's 4xx errors (404 unknown URL, 405, bad param, malformed JSON) keep their status; only real unexpected errors become 500 |
| B-4 | Add exception handling for orchestration and recommendation controllers (404 for an unknown movie, 400 for bad input) |
| B-5 | Overflow on a 10.0 average. Resolved by the new analytics schema (Q12: `NUMERIC(4,2)`, rounded) |
| B-8 | Password-reset token stores `userId` instead of the typed email |
| B-9 | Activity add/rate/react checks the movie exists → 404 instead of FK-violation 500 |
| B-10 | Catalog repository stops swallowing DB errors (DB down must not look like "movie not found") |
| B-11 | Remove `IO.println` debug output |
| B-12 | Remove the password hash from `AppUserPrincipal.toString()` |
| B-13 | Escape `%` and `_` in the orchestration search LIKE pattern |
| B-14 | Empty activity lists return 200 `[]` instead of 204 |

**Waiting on a decision:** B-6 (X-Forwarded-For trust) and B-7 (reset-link target) are decided together with the Identity items below.

---

## 1. Identity & Access

### Q1 — I-1, I-8: Login error messages and what counts as a failed attempt
**Question:** The PRD wants one generic error for every failed login. The code returns a separate 403 for unverified accounts *before* checking the password, which lets anyone find out an account exists. Options: fully generic, generic with the specific message shown only after the correct password, or keep the current behaviour.
**Answer:** Option 2. Also count failed attempts on unverified accounts toward the lockout.
**Decision (`BOTH`):**

| Situation | Response | Counts toward lockout? |
|---|---|---|
| Unknown username | 401 `Invalid username or password` | Yes |
| Wrong password (verified or unverified account) | 401 `Invalid username or password` | Yes |
| Correct password, account unverified | 403 `Account not verified` (frontend offers "resend verification") | No (password was correct) |
| Username currently locked | 429 `Too many failed attempts. Try again later.`, returned **without checking the password** | No (already locked) |
| Correct password, verified | 200 + token, failure counter cleared | — |

- **Code:** check the lock first in `AuthService.login` (also fixes B-1). Turn off Spring's "check enabled before password" order so the verified check runs only after the password matches. Count every bad-password or unknown-user failure, including on unverified accounts.
- **PRD:** replace "same generic error in every case" with the table above.
- **Note on "locked":** the locked message is shown no matter what password is entered. If it only appeared after the correct password, an attacker could keep guessing during the lock and the lock would stop nothing. The message doesn't reveal whether the account exists, because unknown usernames get locked too.

### Q2 — I-2: Forgot-password input
**Question:** The PRD asks for email only. The code requires username + email, and sends nothing for unverified accounts.
**Answer:** Option 1, email only. Unverified accounts get a verification email instead.
**Decision (`CODE` + small `PRD` note):**
- `POST /auth/password/forgot` body = `{ email }` only (drop `username` from `ForgotPasswordRequestdto`).
- Email lookup is case-insensitive.

| Account state | What is sent |
|---|---|
| No account with that email | Nothing |
| Account exists, verified | Password-reset link |
| Account exists, unverified | Verification email (same as "resend verification") |

- The response is the same 200 message in every case, e.g. "If an account exists for this email, we've sent instructions."
- Abuse protection comes from the rate limit (decided under I-5).
- **PRD:** add the unverified → verification-email rule to Password Reset.

### Q3 — I-3: Storing reset and verification tokens
**Question:** The PRD says reset tokens are stored hashed. The code stores raw tokens as Redis keys (reset and verification), both with a 10-minute TTL.
**Answer:** Option 1, hash both. Keep 10 minutes for reset, raise verification to 24 hours.
**Decision (`CODE` + `PRD`):**

| Token | Redis key | Value | TTL | Use |
|---|---|---|---|---|
| Password reset | `reset:token:<sha256(token)>` | `userId` | 10 min | single use (`getAndDelete`) |
| Email verification | `verification:token:<sha256(token)>` | `userId` | **24 h** | single use (`getAndDelete`) |

- The raw token exists only in the email link. The backend hashes whatever arrives before looking it up.
- Reuse the SHA-256 helper from `JwtBlacklistService` (move it into one shared utility).
- Update the email text ("expires in 10 minutes" / "expires in 24 hours").
- **PRD:** say that verification tokens are also hashed and last 24 h.

### Q4 — I-4 / B-7: Email link targets
**Question:** The reset link points to a POST-only backend URL, so it's broken. The verification link points to a backend GET that returns plain text.
**Answer:** Option 1, both links go to frontend pages. After verification the user is sent to Sign In.
**Decision (`BOTH`):**
- New config `FRONTEND_BASE_URL` (env var). `APP_BASE_URL` is no longer used in email links.

| Flow | Email link | Frontend page does | Backend endpoint |
|---|---|---|---|
| Verify email | `FRONTEND_BASE_URL/verify-email?token=…` | POSTs the token, shows the result, then **goes to Sign In** | `POST /auth/email/verify` `{ token }` (was GET) |
| Reset password | `FRONTEND_BASE_URL/reset-password?token=…` | Shows the new-password form, POSTs it, then **goes to Sign In** (PRD flow) | `POST /auth/password/reset` `{ token, newPassword }` |

- Rename the body field `resetTicket` → `token`.
- Verification changes from GET to POST, so email scanners that open links automatically can't verify accounts.
- No auto-login after verify or reset.
- Resend-verification also becomes POST, `{ email }` (matches Q2, which identifies users by email).
- **Frontend needs:** `/verify-email` and `/reset-password` routes.

### Q5 — I-5 / B-6: IP rate limiting and proxy trust
**Question:** There's no general rate limiting, only a 1 h IP block on all endpoints after 10 failed logins. The client IP is read from the client-controlled `X-Forwarded-For` header, which can be faked.
**Answer:** Agree with the proposal and the numbers. Deployment setup is not known yet.
**Decision (`BOTH`):**
1. **Client IP:** use `request.getRemoteAddr()`. Honour `X-Forwarded-For` only when `app.trust-proxy=true` (default **false**; switch it on once a reverse proxy is in place). One shared `ClientIpResolver` used by the filter and the security listener.
2. **Rate limits** (Redis fixed window, per IP):

| Endpoint group | Limit |
|---|---|
| `login` | 10 / min |
| `register`, `password/forgot`, `email/resend` | 5 / 15 min |
| `email/verify`, `password/reset` | 10 / 15 min |
| Public browsing / search | 120 / min |

   Over the limit → `429` + `Retry-After` header, standard error JSON. Limits live in `application.properties` so they can be tuned.
3. **IP block:** keep the 1 h block after 10 failed logins, but it applies **to the login endpoint only**. Browsing still works.
- **PRD:** replace "IP-based rate limiting" with this table and the login-only block rule.
- **Later:** when the deployment target is chosen, set `app.trust-proxy` and confirm the proxy overwrites `X-Forwarded-For`.

### Q6 — I-6: Session lifetime
**Question:** The PRD says the session expires after 2 h of inactivity. The code uses one fixed 1 h JWT with no refresh.
**Answer:** Option 1 (access + refresh token), with the recommended defaults: 7-day absolute cap, and password reset logs out all sessions.
**Decision (`BOTH`):**

| Token | Lifetime | Where it lives | Notes |
|---|---|---|---|
| Access JWT | 15 min | Frontend memory, sent as `Authorization: Bearer` | Same claims as today (`sub`, `userId`) plus `iat` |
| Refresh token | **2 h sliding** (each use issues a new token and resets the 2 h) | `HttpOnly; Secure; SameSite=Strict` cookie, path `/api/v1/auth` | Random value; Redis stores `refresh:<sha256>` → `userId` + session start time |
| Absolute cap | 7 days from login | — | Refresh is refused after this; the user must log in again |

- **Endpoints:**
  - `POST /auth/login` → access token in the body and the refresh cookie set.
  - `POST /auth/refresh` → new access token and a new refresh cookie. The old refresh token is deleted. If an already-used refresh token is presented again, it is treated as theft and all of that user's sessions are revoked.
  - `POST /auth/logout` → delete the refresh token, blacklist the access token, clear the cookie.
- **Log out everywhere:** Redis set `user:sessions:<userId>` lists that user's refresh tokens. Redis key `user:tokens-valid-after:<userId>` = timestamp; the JWT decoder rejects access tokens whose `iat` is before it.
- **Password reset (and later password change)** revokes all refresh tokens and sets `tokens-valid-after`, so every device is logged out.
- **CORS** must allow credentials for the frontend origin, so the cookie works (see §9).
- **PRD:** replace "Session expires after 2 hours of inactivity" with this model.

### Q7 — I-7 (applies to every module): API path convention
**Question:** Current paths are inconsistent: activity sits under `/auth/user/...`, removal uses POST, and there are `orchestration` and path-variable search endpoints. Adopt the PRD's REST shape?
**Answer:** Option 1, adopt it and remove the old paths (no frontend exists yet).
**Decision (`BOTH`):** All endpoints use the `/api/v1` prefix and this convention:

| Area | Paths |
|---|---|
| Auth | `POST /auth/signup · login · logout · refresh · email/verify · email/resend · password/forgot · password/reset · password/change` |
| Me | `GET /me` · `/me/watchlist` · `/me/watched` · `/me/ratings` · `/me/reactions` · `/me/activity` |
| Activity | `PUT` / `DELETE /movies/{id}/watchlist` · `/watched` · `/rating` · `/reaction` |
| Catalog | `GET /movies/{id}` · `/genres` · `/languages` |
| Discovery | `GET /home` · `/movies/search?…` · `/movies/trending` · `/movies/imdb-top-250` · `/movies/most-rated` · `/movies/most-liked` |
| Recommendation | `GET /recommendations` · `/movies/{id}/similar` |

- **Rules:** `PUT` sets a state, so repeating it has no extra effect. `DELETE` removes it, and removing something that's already gone still succeeds (both return the updated `userState`; see Q25). Nouns, not verbs: no `add-movie` or `remove-movie`.
- **Security:**
  - Public, JWT optional (adds user state when present): `GET /movies/**`, `/home`, `/genres`, `/languages`.
  - Public: `/auth/**` except `logout` and `password/change`.
  - Login required: `/me/**`, `PUT`/`DELETE /movies/{id}/*`, `/recommendations`, `auth/logout`, `auth/password/change`.
- Old paths are removed (no backward-compatible aliases). The Postman collection must be updated.
- The exact Discovery and Recommendation lists may change in later questions; the convention stays fixed.
- **PRD:** replace the "conceptual" API hierarchies with this table.

### Q8 — Missing Identity features: profile, change password, change email
**Question:** The PRD has change email, change password and a profile view; none exist (`/auth/me` is a stub). Also asked about change-email verification, delete account and username changes.
**Answer:** Include all three. Users can **not** change their username; only email and password can be updated.
**Decision (`BOTH`):**

| Feature | Endpoint | Rules |
|---|---|---|
| Profile | `GET /me` (login required) | Returns `userId, username, email, createdAt, watchlistCount, watchedCount, ratingCount` |
| Change password | `POST /auth/password/change` `{currentPassword, newPassword}` | Current password must match (a wrong one counts toward the lockout); new password follows signup rules (8–100 chars) and must differ from the current one; other sessions are logged out, the current one stays |
| Change email | `POST /auth/email/change` `{currentPassword, newEmail}` | Password must match; new email valid, case-insensitively unique; a verification link (24 h, hashed token, same as Q3) goes to the **new** address and the switch happens only when it's opened; a "your email was changed" notice is sent to the old address once it switches |

- **Username** can't be changed once the account is created.
- **Delete account:** not included for now; you only asked for email and password updates. It can be added later.
- **Change-email confirm:** the link goes to `FRONTEND_BASE_URL/confirm-email?token=…`, and that page POSTs to `POST /auth/email/change/confirm` `{ token }`.
- **PRD:** add the profile response fields, and the rule that usernames can't be changed.
- **Clarification (implementation), Phase 3, 2026-10-12** (choices where the decision was silent, reported to you with the phase):
  - A wrong current password on change password / change email returns **400 `VALIDATION_FAILED`** (`fields.currentPassword`), not 401, because a 401 would make the frontend refresh and retry (§9 Q6 note).
  - Change email follows the same rules as change password: a locked account gets 429, and a wrong password counts toward the lockout.

### Q9 — Case sensitivity of username and email
**Question:** Uniqueness and login are case-sensitive today (`John` ≠ `john`), and usernames accept any characters.
**Answer:** Agree with the recommendation.
**Decision (`BOTH`):**

| Field | Uniqueness | Stored as | Lookup |
|---|---|---|---|
| Email | case-insensitive | lowercased + trimmed | case-insensitive |
| Username | case-insensitive | as typed (display case kept) | case-insensitive |

- DB migration: unique indexes on `LOWER(username)` and `LOWER(email)`. Check existing rows for case duplicates before applying it.
- Username validation: `^[A-Za-z0-9_.-]{3,32}$`.
- Applies to signup, login, forgot password, resend verification and change email.
- **PRD:** add both rules to the User Account domain rules.

---

## 2. Movie Catalog

**No decision needed:** C-1. Add `getMoviesByIds(ids)` (batched queries, results kept in the requested order) to the Catalog service. Recommendation, watchlist cards and lists use it instead of one-by-one lookups (removes the N+1 problem).

### Q10 — C-5 / C-6: Movie details response shape
**Question:** Details are split across two endpoints. Genres and languages are comma-joined strings, crew has no `personId`, and fields are nested and duplicated.
**Answer:** Agree with the proposed shape.
**Decision (`CODE`):** One endpoint, `GET /api/v1/movies/{id}` (public, JWT optional):
```json
{
  "movieId": 123, "imdbId": "tt0816692", "title": "Interstellar", "year": 2014,
  "released": "2014-11-07", "runtime": 169, "plot": "...", "poster": "https://...",
  "contentType": "movie", "studio": "Paramount",
  "ratings": { "imdb": 8.7, "imdbVotes": 2100000, "rottenTomatoes": 73, "metascore": 74 },
  "genres":    [ { "id": 1, "name": "Sci-Fi" } ],
  "languages": [ { "id": 3, "name": "English" } ],
  "directors": [ { "personId": 9,  "name": "Christopher Nolan" } ],
  "writers":   [ { "personId": 9,  "name": "Christopher Nolan" } ],
  "cast":      [ { "personId": 20, "name": "Matthew McConaughey" } ],
  "platformStats": { "averageRating": 8.4, "ratingCount": 120, "likeCount": 95, "dislikeCount": 6 },
  "availability": [ { "platform": "Netflix", "type": "sub", "url": "https://..." } ],
  "userState": { "inWatchlist": true, "watched": false, "rating": 9.0, "reaction": "LIKE" }
}
```
- `userState` is `null` when anonymous. It's built with direct existence and value lookups, not by loading the user's whole lists.
- Crew is split into `directors`, `writers` and `cast` by `movie_role.role_name`. **Check the actual role names in the DB during implementation**; any unknown role goes to an `otherCrew` list.
- `boxOffice` is not returned.
- `platformStats` fields depend on the Analytics decisions (§3).
- The orchestration details endpoint and the old `ResponseDto` / `MovieDto` are removed.
- **Clarification (implementation):** the real `movie_role` table has exactly three roles: `Actor` (→ `cast`), `Director` (→ `directors`), `Writer` (→ `writers`). The `otherCrew` fallback stays in the code for any role added later.

### Q11 — C-4: Country and awards
**Question:** The PRD wants country (and stored awards) on the details page. Neither exists in the DB or the code.
**Answer:** Keep whatever the code does now; don't worry about this one.
**Decision (`NONE`):** No schema, ETL or backend change. Country and awards are not returned. The PRD mentions remain as a known gap and can be revisited later.

---

## 3. Movie Analytics batch

### Q12 — A-1, A-3, A-4: Analytics table and computation
**Question:** The PRD wants separate like, dislike and rating counts, a weighted rating and a full-recompute upsert. The DB has only an average (overflowing `NUMERIC(3,2)`) and one combined reaction count, updated with `UPDATE` only.
**Answer:** Agree with all of it; m = 5.
**Decision (`BOTH`):** New `movie_analytics` schema (migration replaces the current table):

| Column | Type | Meaning |
|---|---|---|
| `movie_id` | BIGINT PK, FK → movie ON DELETE CASCADE | |
| `rating_count` | INT NOT NULL DEFAULT 0 | number of user ratings |
| `average_rating` | NUMERIC(4,2) NULL | plain average, shown on details |
| `weighted_rating` | NUMERIC(4,2) NULL | `(v/(v+m))·R + (m/(v+m))·C`, used for ranking |
| `like_count` | INT NOT NULL DEFAULT 0 | |
| `dislike_count` | INT NOT NULL DEFAULT 0 | |
| `updated_at` | TIMESTAMPTZ NOT NULL | last batch run |

- **Job:** full recompute from `user_rating` + `user_reaction` with `INSERT … SELECT … FROM movie LEFT JOIN … ON CONFLICT (movie_id) DO UPDATE`. Every movie gets a row; removed activity resets to 0/NULL. Runs in one transaction, so a failed run leaves the previous values in place.
- `m = 5` (setting `analytics.min-votes`). `C` = platform-wide average of all user ratings, computed in the same run.
- Top-rated-by-users lists include only movies with `rating_count >= m`, ordered by `weighted_rating`.
- NEUTRAL reactions (if kept) are not counted.
- Drop the `create_movie_analytics` insert trigger (the upsert makes it unnecessary).
- Errors are logged as real errors, not "schema unavailable" (fixes the B-5 mislabel).
- Details `platformStats` = `averageRating, ratingCount, likeCount, dislikeCount`.
- **PRD:** rename `global_rating` → `average_rating`; set m = 5.

### Q13 — A-2, A-5: Where the job runs and how often
**Question:** The PRD says every 6 h, with "Spring or Python ETL" left open and the app read-only. The code uses a Spring `@Scheduled` job every 1 h that writes `movie_analytics`.
**Answer:** Yes to all three recommendations.
**Decision (`BOTH`):**
- Runs in the **Spring scheduler**.
- Interval: **1 h**, set by `analytics.refresh-interval` (default `PT1H`).
- Also runs **once at application startup** (after the context is ready, without blocking startup).
- Wrapped in a **Postgres advisory lock** (`pg_try_advisory_lock`), so only one instance runs it at a time; others skip that run.
- The app's DB user gets write access to `movie_analytics` only; catalog tables stay read-only.
- **Clarification (implementation):** the app currently connects as `postgres` (superuser), so this can't be enforced yet. A dedicated app role is not a migration; the plan lists it as an optional manual task with the `CREATE ROLE` / `GRANT` SQL.
- **PRD:** "Spring scheduler, every 1 h plus on startup; the app writes only `movie_analytics`."

---

## 4. User Movie Activity

**Already covered:** U-1 paths (Q7), U-5 unknown movie → 404 (B-9), U-9 status checks use direct lookups (Q10).

### Q14 — U-2, U-3, U-4: Reaction model and timestamps
**Question:** The PRD describes a boolean `user_like` where removal deletes the row. The DB has `user_reaction` with LIKE/DISLIKE/NEUTRAL, no reaction timestamp, and `rated_at` isn't updated when a rating changes.
**Answer:** Option 1 (keep the table, add timestamps), but **keep NEUTRAL** as the default state.
**Decision (`BOTH`):**
- Table stays `user_reaction`, `reaction VARCHAR` in `LIKE` / `DISLIKE` / `NEUTRAL`.
- **NEUTRAL = the default "no opinion" state:**
  - `userState.reaction` returns `"NEUTRAL"` when the user has no row (never `null`).
  - `PUT /movies/{id}/reaction {"reaction":"NEUTRAL"}` is allowed and stores NEUTRAL.
  - `DELETE /movies/{id}/reaction` removes the row; the reaction then reads as NEUTRAL.
  - Analytics and recommendations treat NEUTRAL and "no row" the same: not a like, not a dislike, no signal.
- Add `reacted_at TIMESTAMPTZ NOT NULL DEFAULT now()`, set again on every change.
- `rated_at` is set again on every rating change (`ON CONFLICT DO UPDATE SET rating = …, rated_at = now()`).
- **PRD:** replace the boolean `user_like` design note with `user_reaction` (LIKE/DISLIKE/NEUTRAL, NEUTRAL = default), and add `reacted_at`.

### Q15 — U-7, U-8: The "My …" endpoints
**Question:** Watchlist and watched return IDs only (204 when empty), ratings come back in two shapes, and there's no `/me/activity`. The PRD wants the watchlist with posters and a watched marker; "watched" is not displayed.
**Answer:** Agree. Drop `/me/activity`. Keep watched non-displayed.
**Decision (`BOTH`):**

| Endpoint | Returns |
|---|---|
| `GET /me/watchlist?page&size` | Paginated cards, newest first: `movieId, title, year, poster, imdbRating, watched, addedAt` |
| `GET /me/watched` | `[{movieId, watchedAt}]` (not paginated, lightweight, for marking watched items in the UI) |
| `GET /me/ratings?page&size` | Paginated cards + `rating, ratedAt`, newest first |
| `GET /me/reactions` | `[{movieId, reaction, reactedAt}]`, LIKE/DISLIKE only (NEUTRAL omitted) |

- Empty → 200 with `[]` or an empty page (never 204).
- Pagination uses the standard page wrapper (defined under Discovery).
- `/me/activity` is removed. The PRD entry is dropped; `userState` on details covers per-movie state.
- Old `/ratings/v2`, the `/likes/counts` (counts now come from analytics) and `/likes/liked-movies` endpoints are removed.

### Q16 — U-6: Per-user rate limiting
**Question:** The PRD wants per-user (Redis) limits on activity endpoints; there are none.
**Answer:** Agree with the limits, and record the frontend note.
**Decision (`CODE`):** Redis fixed window keyed by `userId` (same limiter as Q5):

| Group | Limit per user |
|---|---|
| Writes: `PUT`/`DELETE /movies/{id}/watchlist · watched · rating · reaction` | 60 / min (shared across all of them) |
| Reads: `/me/**`, `/recommendations` | 120 / min |

- Over the limit → `429` + `Retry-After`. Limits are configurable.
- **Frontend note (→ §9):** disable or debounce each action button while its request is in flight, and update the UI optimistically.

---

## 5. Discovery

### Q17 — D-3, D-5, D-6: Pagination standard (all list endpoints)
**Question:** The PRD says max 30 in one place and max 20 in another. The code has mostly unpaginated lists, a whole-catalog endpoint, inconsistent caps, and 404 on empty results.
**Answer:** Agree: default 20, max 30, 0-based pages.
**Decision (`BOTH`):**
- Params: `page` (0-based, default 0, ≥ 0), `size` (default 20, 1–30). Invalid → 400.
- Standard wrapper on every list endpoint (search, lists, home rows, `/me/watchlist`, `/me/ratings`):
```json
{ "results": [ ... ], "page": 0, "size": 20, "totalResults": 137, "totalPages": 7 }
```
- Empty → 200, `results: []`, `totalResults: 0`. Never 404 for an empty list.
- Home rows use the same wrapper with `size=10`; the arrows request the next page of that row's list endpoint.
- The unpaginated `GET /movies/search` (whole catalog) and all the path-variable search endpoints are removed.
- **PRD:** one rule: "default 20, max 30, 0-based".

### Q18 — D-4: Movie card (used by every list, search and home row)
**Question:** There are three different card types (`DiscoveryMovieDto`, `MovieCard`, full movies in recommendations), none with platform likes or ratings.
**Answer:** Agree. Include `inWatchlist` and `watched`. No genres.
**Decision (`BOTH`):** One `MovieCard`:
```json
{
  "movieId": 123, "title": "Interstellar", "year": 2014, "poster": "https://...",
  "imdbRating": 8.7,
  "averageRating": 8.4, "likeCount": 95, "dislikeCount": 6,
  "inWatchlist": true, "watched": false
}
```
- `averageRating`, `likeCount`, `dislikeCount` come from `movie_analytics` (one join).
- `inWatchlist` / `watched` are filled for logged-in users with one batched lookup per page (not per card); `null` when anonymous.
- No `plot`, `availability` or `genres` on cards.
- `/me/watchlist` and `/me/ratings` (Q15) use this card plus their own extra fields (`addedAt`; `rating, ratedAt`).
- `DiscoveryMovieDto`, orchestration `MovieCard` and `RecommendationItem.movie` (full movie) are replaced.
- **PRD:** replace `MovieSearchResult` with this card.

### Q19 — D-1, D-2, D-7, D-8: Search and browse
**Question:** The PRD has one combinable `/movies/search` (title, person, year, genre, language, sort). The code has separate single-filter endpoints, title-only matching, LIKE before fuzzy, and no sort. I proposed one endpoint with many params plus optional people search.
**Answer:** Keep it small. The search bar matches movie title or person name. Browse filters are genre, language and year only, plus a default paginated "all movies" endpoint. Use the recommended matching strategy. Nothing more. *Clarified:* browse uses a fixed order by IMDb rating; search is `q` alone.
**Decision (`BOTH`):**

| Endpoint | Params | Order |
|---|---|---|
| `GET /movies/search` | `q` (required, 3–100 chars after trim), `page`, `size` | relevance |
| `GET /movies` | optional `genreId`, `languageId`, `year` (combinable, AND), `page`, `size`; no filters = all movies | `imdb_rating DESC NULLS LAST, imdb_votes DESC, movie_id` (fixed) |

- **Search matching:** a movie matches if `word_similarity(q, LOWER(title))` or `word_similarity(q, LOWER(person.name))` for any of its people is ≥ **0.3** (configurable). Score = best match, with a small boost when the title matched. Sorted by score, then IMDb votes. Uses the existing trigram indexes on `movie.title` and `person.name`.
- No `sort` parameter anywhere. Unknown params, an invalid `year`, or IDs that don't exist → 400.
- Both return the Q17 page wrapper of Q18 cards.
- **Dropped:** browse by actor or director, year ranges, people search, search + filter combinations.
- **PRD:** remove "Browse by Actor / Browse by Director" from the logged-in menu; replace the Discovery API contract with this table.

### Q20 — Browse menu data (genres, languages, years)
**Question:** The browse filters take IDs, but nothing tells the frontend which genres or languages exist or what their IDs are. IDs are generated by the DB, so they can't safely be hard-coded.
**Answer:** Option 1: genre and language list endpoints. Years are a range on the frontend.
**Decision (`BOTH`):**

| Endpoint | Returns |
|---|---|
| `GET /genres` | `[{ "id": 1, "name": "Action" }]`, sorted by name; only genres with ≥ 1 movie |
| `GET /languages` | `[{ "id": 3, "name": "English" }]`, sorted by number of movies (most first); only languages with ≥ 1 movie |

- Public, unpaginated, cacheable (`Cache-Control: max-age=3600`).
- **No `/years` endpoint.** The frontend shows a year range (e.g. 1920 → current year) and sends the chosen `year`. A year with no movies returns an empty page.
- **Frontend note (→ §9):** the Browse tab loads `/genres` and `/languages` once, shows the names, and sends the clicked item's `id`.

---

## 6. Home page

### Q21 — H-1 … H-5, C-7: Home rows
**Question:** The PRD wants trending (`top10` table), top rated by users, IMDb Top 250 and For You, without duplicates. The code shows top-10-by-IMDb inside top-20-by-IMDb, ignores `top10`, and has no platform rows.
**Answer:** Agree with all rows. Min votes = 25k. Yes to dedupe. Trending order doesn't matter.
**Decision (`BOTH`):** `GET /api/v1/home` (public, JWT optional):

| Order | Key | Title | Source | "See more" endpoint |
|---|---|---|---|---|
| 0 | `for-you` | For You (logged in only) | Recommendation | `GET /recommendations` |
| 1 | `trending` | Trending Now | `top10` table | `GET /movies/trending` |
| 2 | `top-rated` | Top Rated by CineSmart Users | `weighted_rating` desc, `rating_count ≥ 5` | `GET /movies/top-rated` |
| 3 | `most-liked` | Most Liked | `like_count` desc (`like_count > 0`) | `GET /movies/most-liked` |
| 4 | `imdb-top-250` | IMDb Top 250 | `imdb_rating` desc, `imdb_votes ≥ 25,000`, max 250 | `GET /movies/imdb-top-250` |

Response:
```json
{ "sections": [
  { "key": "trending", "title": "Trending Now", "endpoint": "/api/v1/movies/trending",
    "totalResults": 10, "results": [ /* up to 10 MovieCards */ ] }
] }
```
- **Dedupe (home only):** rows are filled in the order above. A movie already shown in an earlier row is skipped, and each row pulls extra candidates so it still shows 10 when possible. `totalResults` = the full list size from the "see more" endpoint. "See more" endpoints are not deduped.
- **Empty rows are left out** of the response.
- **Trending order:** any order is fine. Use IMDb rating desc so it's predictable. No `rank` column needed.
- Settings: `home.imdb-top-250.min-votes=25000`, `analytics.min-votes=5`.
- "Popular on platform" and "most rated" are not separate rows (covered by top-rated and most-liked).
- `/movies/top10` (catalog) and `/orchestration/home` are removed; Trending moves to Discovery.
- **PRD:** replace the home-page category lists with this table.

---

## 7. Recommendation

### Q22 — R-1 … R-5, R-7: "For You" algorithm
**Question:** The PRD wants a weighted taste profile (genres, languages, actors, directors) built from positive and negative signals, scored candidates, exclusions and a cold start. The code returns any movie sharing any genre or person with any seed, sorted by IMDb rating, with dislikes ignored and fake reasons.
**Answer:** Agree with all of it. **Don't do negative signals for now.** The goal is to show what the user likes. Redis caching comes later; document it in the PRD.
**Decision (`BOTH`):**
1. **Signal weights (positive only):**

| Signal | Weight |
|---|---|
| Rating ≥ 8 | +3 |
| Rating 7–7.9 | +2 |
| Like | +2 |
| Watched | +1 |
| Watchlist | +1 |

   Activity in the last 90 days ×1.5. A movie's signals add up. Ratings < 7, dislikes and NEUTRAL carry no weight.
2. **Profile:** weights are passed on to each signal movie's genres, languages, actors (top 5 billed) and directors.
3. **Candidates:** top ~300 movies sharing a profile genre, director or actor. **Excluded:** watched, in watchlist, rated by the user, and **disliked** (the PRD exclusion rule is kept; it's a filter, not a negative weight).
4. **Score** = `0.4·genre + 0.3·people + 0.1·language + 0.2·(imdbRating/10)`, each match normalized 0–1. Ties are broken by IMDb votes.
5. **Reason** per item, from its strongest match: "Because you liked *X*", "More with *Person*", "Matches your taste in *Genre*".
6. **Cold start:** fewer than 3 positive signals → Top Rated by Users (falling back to IMDb Top 250), labelled "Popular on CineSmart".
7. **Output:** `GET /recommendations?page&size` → Q17 page of Q18 cards, each with `reason`. Recommendation produces ranked IDs and Catalog builds the cards via `getMoviesByIds` (fixes R-6 N+1 and the heavy payload).
8. All weights and limits are settings (`recommendation.*`).

- **Clarification (implementation):** `movie_person` has no billing-order column (OMDb gives ~3 actors per movie). "Top 5 billed actors" means **all** of a movie's `Actor` links (here and in Q23).
- **Clarification (implementation), Phase 8, 2026-10-12** (asked and answered):
  - **Liked movies are excluded too.** Besides watched, watchlist, rated and disliked, a movie the user liked is never recommended back.
  - **Reason rule ("strongest match"):**
    1. "More with *P*" when the weighted people part (0.3·people) ≥ the weighted genre part (0.4·genre); *P* = the matched actor/director with the highest profile weight.
    2. Otherwise "Because you liked *X*" when a liked or ≥ 7-rated movie shares ≥ 2 genres with the item; *X* = the highest-weight such movie.
    3. Otherwise "Matches your taste in *G*"; *G* = the matched genre with the highest profile weight.
- **Not now:** negative signals (dislikes, ratings < 5).
- **Later:** a Redis cache of each user's results (10 min TTL, cleared on any activity change).
- **PRD:** replace "Heuristic Scoring (draft)" with points 1–8. Move negative signals and the Redis cache to "Future enhancements".

### Q23 — R-8, R-9: Similar titles and extra rows
**Question:** The PRD wants a public, scored `GET /movies/{id}/similar` list, plus optional "Because you liked X" and actor/director rows. The code returns a single unscored movie behind login.
**Answer:** Agree with the similar-titles proposal. Skip the extra rows, and remove them from the PRD.
**Decision (`BOTH`):**
- `GET /api/v1/movies/{id}/similar?size=` (public, JWT optional, default 10, max 30) returns `[MovieCard]` (not paginated).
- Score = `0.4·shared genres + 0.3·shared directors and top-5 cast + 0.1·same language + 0.2·(imdbRating/10)`. The movie itself is excluded; ties go to IMDb votes.
- Logged in: also exclude the user's watched and disliked movies.
- No genres or people on the movie → same-genre top IMDb, otherwise an empty list. An unknown movie ID → 404.
- `/recommendations/similar/{id}` is removed.
- **PRD:** keep "Similar titles" (sections 18 and 11 "More like this") with this scoring. **Remove** "Because you liked X", "More starring this actor" and "Because you like this director" (sections 11 and 12), and the related logged-in rows.

---

## 8. Cross-cutting (config, security, structure, tests)

**No decision needed (will do):**
- Move `jwt.secret`, SMTP credentials and DB credentials to env vars (with a `.env.example`), and **rotate** the committed JWT secret and SMTP password.
- `spring.jpa.show-sql=false` by default (on only in a `dev` profile).
- Sending email doesn't hold a DB transaction open: save the user, commit, then send. If sending fails, the user can use "resend verification".
- Remove dead code: commented blocks, unused `RoleDto`/`PersonDto`, `/auth/me` stub (see Q27 for `RedisHealthCheckService`).
- One `@Transactional` (Spring's), not a mix with `jakarta.transaction`.
- **Clarification (implementation):** the env-var template goes in `Cinesmart-Backend/.env.example` (placeholders only, no secrets).

### Q23b — How database changes are applied
**Question:** Manual SQL migrations or Flyway? Also: what this means for the existing data, and what's wrong with the current DB file setup.
**Answer:** Manual migrations. Keep the schema SQL in sync with the migrations.
**Decision (`CODE`):**
- New files `Database/Migration/V019__….sql` onward. You run them by hand; no Flyway.
- Each new migration is `ALTER`-based, in a transaction, re-runnable (`IF [NOT] EXISTS`), and comes with pre-check queries and undo SQL. Tables with user data are never dropped or recreated.
- First capture the real DB schema (`pg_dump --schema-only`), because the three schema sources disagree.
- Root `Cinesmart_database_schema.sql` = the one up-to-date schema, updated with every migration.
- Back up (`pg_dump -Fc`) before running migrations.
- Open (ask during implementation): clean up old V001–V018 or leave them as history; delete or merge `Database/Schema.sql`.
- Known problems in the current setup: V016/V017 recreate tables instead of altering them; schema files disagree; V015 is commented out; the trigger file has no version number; V018 naming; V013 has a stale comment; `database_status.sql` is missing tables.
- **Clarification (implementation), from the real schema captured 2026-10-12:**
  - V019, V020 and V021 **have been run** (V021 confirmed by you on 2026-10-12, after the capture).
  - The real `movie` table has two unused legacy columns, `global_rating NUMERIC(3,1)` and `global_reaction_count BIGINT` (+ `movie_global_rating_check`). Nothing reads them → drop them in a new **V022**.
  - Old V001–V018 and the trigger file are **left untouched as history**; the root schema file is the source for a fresh install (noted in its header).
  - `Database/Schema.sql` is **kept as an exact mirror** of the root `Cinesmart_database_schema.sql` and updated together with it.
- **Clarification (implementation), Phase 2, 2026-10-12:**
  - The read-only status query that sat at the end of `Database/Schema.sql` was moved to `Database/Scripts/schema_capture.sql`, so the mirror holds schema only. (You didn't choose between moving and dropping it; moving is the reversible default. Delete the script if it isn't wanted.)
  - A re-capture of the real schema showed no `uq_app_user_*_lower` indexes; you then showed both exist, so V021 counts as applied and the capture predates it.
  - The real old `movie_global_rating_check` was `1–10` and `global_reaction_count` was `NOT NULL DEFAULT 0`; V022's undo SQL uses those.

### Q24 — Behaviour when Redis is down
**Question:** Every authenticated request depends on Redis today, so a Redis outage breaks login and all logged-in requests. Fail open, fail closed, or mixed?
**Answer:** Mixed approach.
**Decision (`BOTH`):**

| Feature | Redis down → |
|---|---|
| Public browsing, search, details, home | Works (no Redis) |
| Rate limits (Q5, Q16) | Fail **open**: skip the limit, log a warning |
| Access-token blacklist / `tokens-valid-after` check | Fail **open** (15-min tokens limit the exposure), log a warning |
| Login (lockout check) | Fail **closed**: 503 "Login temporarily unavailable" |
| Refresh, signup, verify, resend, forgot, reset, change email/password | Fail **closed**: 503 |

- Redis calls get a short timeout (≈ 500 ms), so an outage doesn't hang requests.
- 503 uses the standard error JSON (Q25).
- **PRD:** add this table under Non-Functional → Reliable.

### Q25 — Error and response format
**Question:** There are three error shapes (`BackendError`, two `ApiError`s, plain strings) and mixed success responses. Proposed one error shape with a stable `code`, plus a choice between 204 and returning `userState` after activity actions.
**Answer:** Agree with the shape. Return `userState` after each action.
**Decision (`BOTH`):**
- **Every error**, including filter-level 401/403/429/503:
```json
{ "status": 400, "code": "VALIDATION_FAILED", "message": "Invalid request fields",
  "path": "/api/v1/auth/signup", "timestamp": "2026-10-12T14:03:00Z",
  "fields": { "email": "must be a well-formed email address" } }
```
- `fields` appears only for validation errors. 500 errors never expose internals.
- **Codes (initial list):** `VALIDATION_FAILED`, `BAD_REQUEST`, `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `ACCOUNT_NOT_VERIFIED`, `ACCOUNT_LOCKED`, `TOKEN_INVALID`, `EMAIL_TAKEN`, `USERNAME_TAKEN`, `MOVIE_NOT_FOUND`, `NOT_FOUND`, `METHOD_NOT_ALLOWED`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`.
- **Success:** always JSON; messages as `{ "message": "..." }`, never plain strings.
- **Activity actions** (`PUT`/`DELETE /movies/{id}/watchlist · watched · rating · reaction`) return **200 with the updated `userState`**: `{ inWatchlist, watched, rating, reaction }`. This replaces the "204" rule in Q7.
- Logout: 204.
- One global `@RestControllerAdvice` replaces `UserExceptionHandler`, `MovieReadExceptionHandler`, `MovieDiscoveryExceptionHandler`, `UserMovieActivityExceptionHandler` and `BackendErrorHandler` (also fixes B-3, B-4).
- **PRD:** add the error shape and code list under Non-Functional → Appropriate Responses.

### Q26 — Module structure
**Question:** There's an extra `master_orchestration` module, Catalog depends on a Discovery DTO, Discovery uses a JPA graph while Catalog uses JDBC, and classes and package names are duplicated or inconsistent.
**Answer:** Agree. Remove orchestration and use JDBC for reads.
**Decision (`BOTH`):**
```
ca.cinesmart
├── shared/          error format + global handler, rate limiter, ClientIpResolver,
│                    PageResponse, MovieCard, security/CORS config, hashing util
├── identity/        signup, login, refresh, logout, verify, reset, change email/password, /me profile
├── catalog/         GET /movies/{id}, getMoviesByIds, card builder, /genres, /languages
├── activity/        watchlist, watched, rating, reaction, /me lists, userState
├── analytics/       batch job
├── discovery/       /home, /movies, /movies/search, trending, top-rated, most-liked, imdb-top-250
└── recommendation/  /recommendations, /movies/{id}/similar
```
- Each module: `api / application / domain / persistence`.
- **Dependency rule:** modules call each other only through **application services**, never another module's repository. No cycles. Discovery, Recommendation and Activity use Catalog's card builder; Catalog uses Activity for `userState`.
- `master_orchestration` is removed: home → `discovery`, details + user state → `catalog`.
- **Reads use JDBC** (`NamedParameterJdbcTemplate`). The Discovery JPA entities (`Movie`, `Genre`, `Language`, `Person`, `MovieRole`, `MoviePerson`) are deleted. JPA stays only for simple writes (`AppUser`, activity tables) or those move to JDBC too, whichever keeps the code simpler.
- Package names: lowercase, consistent spelling; one class per concept (no duplicate `ApiError` / `MovieNotFoundException`).
- **Clarification (implementation):** "Activity uses Catalog's card builder" + "Catalog uses Activity for userState" would be a cycle. It's broken with an interface in `shared` (`UserMovieStateLookup`: batched `inWatchlist`/`watched` and single-movie `userState`). Activity implements it; Catalog depends only on the interface; Activity → Catalog stays a normal service call.
- **PRD:** add `shared` and `analytics` to the boundary map; state the dependency rule.

### Q27 — Tests and health check
**Question:** There's only one print-only test with no assertions, and no health endpoint. Proposed Testcontainers integration tests, unit tests and an Actuator health endpoint.
**Answer:** Tests later; Actuator health later.
**Decision (`NONE` now → deferred):**
- No new tests in this implementation round. Later scope = the proposed integration flows (Testcontainers) + unit tests for scoring, weighted rating, rate limiter, token hashing and validation.
- No Actuator for now. `RedisHealthCheckService` stays, reduced to a startup `PING` with a single log line (no test-key write, no banners).
- The existing `MovieJdbcRepositoryTest` is removed (it asserts nothing and breaks without a live DB).
- **PRD:** keep tests and health checks under "Optional"; mark them as the next phase after this round.

---

## 9. Extra functionality needed for the frontend

### Q28 — CORS and login response
**Question:** Neither the PRD nor the code has CORS, so the browser would block every frontend call (and the Q6 refresh cookie). Login returns `{token, msg}`, so the frontend can't show the username without extra work.
**Answer:** Agree with both. The frontend uses Vite on port 5173 for now.
**Decision (`BOTH`):**

| CORS setting | Value |
|---|---|
| Allowed origins | env `FRONTEND_ORIGINS` (comma-separated), default `http://localhost:5173` |
| Methods | `GET, POST, PUT, DELETE, OPTIONS` |
| Allowed headers | `Authorization, Content-Type` |
| Credentials | `true` |
| Exposed headers | `Retry-After` |

- Configured once in the security config (`CorsConfigurationSource`), so it also applies to 401/429 responses from filters.
- `FRONTEND_BASE_URL` (Q4) defaults to `http://localhost:5173`.
- **Login and refresh response:**
```json
{ "accessToken": "...", "expiresIn": 900, "user": { "userId": 42, "username": "Amir" } }
```
  The refresh token is only ever in the HttpOnly cookie, never in the body.
- **PRD:** add CORS under Backend architecture; add the login response shape to the Identity API.

### Frontend notes collected so far
| From | Note |
|---|---|
| Q1 | On 403 `Account not verified`, offer a "Resend verification email" action (`POST /auth/email/resend`) |
| Q4, Q8 | Routes needed: `/verify-email`, `/reset-password`, `/confirm-email`; all end on Sign In |
| Q6 | Keep the access token in memory; on 401, call `POST /auth/refresh` once (with credentials), then retry; on refresh failure → Sign In |
| Q16 | Disable or debounce watchlist / watched / rating / reaction buttons while a request is in flight; update the UI optimistically |
| Q20 | Browse tab: load `/genres` and `/languages`, render names, send the clicked `id` to `GET /movies`; years = frontend range picker |
| Q21 | Home: render `sections` in order; each row's arrow/"see more" calls that section's `endpoint` with `page`/`size`; show `totalResults` |
| Q25 | Switch on the error `code`, not `message`; activity actions return `userState`, so update the buttons from the response |
| Q28 | Send requests with `credentials: 'include'` (needed for the refresh cookie); dev server on `http://localhost:5173` |
