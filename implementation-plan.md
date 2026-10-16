# CineSmart Backend: Implementation Plan

**Source of truth:** `change.md` (Q1–Q28, §0 bugs, §9 frontend notes, plus the "Clarification (implementation)" notes added 2026-10-12).
**Status:** all phases (0–9) done 2026-10-12. The deferred items listed at the end of §D are not implemented.
**Legend:** `[ ]` to do · `[x]` done · `[~]` partly done (see note)

---

## A. Starting point (verified 2026-10-12)

**Real database** (captured with a read-only query; PostgreSQL 18.4, app connects as `postgres`):

| Item | State |
|---|---|
| V019 `movie_analytics` redesign + trigger drop | **already run** (new columns, PK, no trigger/function) |
| V020 `user_reaction.reacted_at` | **already run** |
| V021 case-insensitive username/email | **already run** (confirmed by you after the capture) |
| `movie.global_rating`, `movie.global_reaction_count` | unused legacy columns, dropped by new **V022** |
| `movie_role` | `Actor`, `Director`, `Writer` |
| `movie_person` | no billing order, so "top 5 cast" = all `Actor` links |
| Data | 1,136 movies · 3 users · 6 watchlist · 2 ratings · 1 reaction · 11 `top10` rows · 1,047 movies with ≥ 25k IMDb votes |

**Consequence today:** V019 already removed `global_user_rating`/`global_reaction_count` from `movie_analytics`, so the current code's analytics read fails silently (B-10 swallows it), and the hourly job logs a warning every run. Phase 1 points those reads at the new columns.

**Build:** Maven is not on PATH. I compile with IntelliJ's bundled Maven (PowerShell, inside `Cinesmart-Backend`):
```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-25.0.4.1"
& "C:\Program Files\JetBrains\IntelliJ IDEA 2026.2.1\plugins\maven-plugin\lib\maven3\bin\mvn.cmd" -q -DskipTests compile
```

---

## B. Cross-cutting conventions (used by every phase)

### B.1 Package layout (Q26)
```
ca.cinesmart
├── CineSmartApplication
├── shared/
│   ├── api/          ApiError, ErrorCode, ApiException (+ NotFound/BadRequest/... subclasses), GlobalExceptionHandler,
│   │                 PageResponse<T>, PageParams, MessageResponse
│   ├── movie/        MovieCard, UserMovieState, UserMovieStateLookup (interface, see Q26 clarification)
│   ├── security/     SecurityConfig (+CORS), ClientIpResolver, ErrorResponseWriter, CurrentUser
│   ├── ratelimit/    RateLimiter (Redis fixed window), IpRateLimitFilter, UserRateLimitInterceptor, RateLimitProperties
│   ├── redis/        RedisConfig, RedisStartupCheck
│   └── util/         TokenHasher (SHA-256 hex)
├── identity/        api / application / domain / persistence
├── catalog/         api / application / domain / persistence
├── activity/        api / application / domain / persistence
├── analytics/       application / persistence
├── discovery/       api / application / domain / persistence
└── recommendation/  api / application / domain / persistence
```
**Dependency rule:** modules call each other only through `application` services.
- Catalog → shared (`UserMovieStateLookup`).
- Activity implements that interface and calls Catalog (`movieExists`, `getCards`).
- Discovery, Recommendation → Catalog, Activity.
- Identity → Activity (profile counts).
- No cycles.

**Persistence:** reads use JDBC (`NamedParameterJdbcTemplate`). JPA stays only for `AppUser`. Activity moves to JDBC because every write is already a native upsert.

### B.2 Error format (Q25)
```json
{ "status": 400, "code": "VALIDATION_FAILED", "message": "Invalid request fields",
  "path": "/api/v1/auth/signup", "timestamp": "2026-10-12T14:03:00Z", "fields": { "email": "..." } }
```
- `fields` only for validation errors; it is omitted when null (`@JsonInclude(NON_NULL)`).
- Codes: `VALIDATION_FAILED, BAD_REQUEST, UNAUTHORIZED, INVALID_CREDENTIALS, ACCOUNT_NOT_VERIFIED, ACCOUNT_LOCKED, TOKEN_INVALID, EMAIL_TAKEN, USERNAME_TAKEN, MOVIE_NOT_FOUND, NOT_FOUND, METHOD_NOT_ALLOWED, RATE_LIMITED, SERVICE_UNAVAILABLE, INTERNAL_ERROR`.
- `GlobalExceptionHandler extends ResponseEntityExceptionHandler` and overrides `handleExceptionInternal`, so every Spring 4xx keeps its status but uses our shape (B-3).
- Filters (401, 403, 429, 503) write the same JSON through `ErrorResponseWriter`.

### B.3 Pagination (Q17)
- `page` ≥ 0 (default 0), `size` 1–30 (default 20). Invalid → 400.
- `PageResponse { results, page, size, totalResults, totalPages }`. An empty result is still 200.

### B.4 Movie card (Q18)
- Fields: `movieId, title, year, poster, imdbRating, averageRating, likeCount, dislikeCount, inWatchlist, watched`.
- Built by `catalog.MovieCardService.getCards(ids, userIdOrNull)`: one SQL (`movie LEFT JOIN movie_analytics`), with results kept in the order of `ids`.
- The user flags come from one batched `UserMovieStateLookup` call per page. They are `null` when anonymous.

### B.5 Security matrix (Q7, final)
| Access | Paths |
|---|---|
| Public | `POST /auth/signup, login, refresh, email/verify, email/resend, email/change/confirm, password/forgot, password/reset` |
| Public, JWT optional | `GET /movies/**`, `/home`, `/genres`, `/languages` |
| Login required | `/me/**`, `PUT`/`DELETE /movies/{id}/*`, `/recommendations`, `POST /auth/logout, password/change, email/change` |

"JWT optional" means an invalid or expired token on a public GET is treated as anonymous, not as a 401. A custom `BearerTokenResolver` returns `null` on `permitAll` GETs when the token fails validation.

### B.6 Interpretations to confirm (not explicit in change.md)
1. **Rate-limit groups for endpoints Q5 doesn't name:**
   - `email/change/confirm` → the verify/reset group (10 / 15 min).
   - `email/change` and `password/change` → the register/forgot/resend group (5 / 15 min; they send email or check a password).
   - `refresh` → the public group (120 / min).
2. **Password change response:** `password/change` returns the login response shape (new access token + new refresh cookie). It has to, because it sets `tokens-valid-after`, which would otherwise also invalidate the current access token.
3. **Signup when sending the email fails:** if SMTP fails after the user is saved (§8), signup still returns success and the error is logged; the user can use "resend verification".
4. **Signup status:** `POST /auth/signup` returns **201**.
5. **Q19 "unknown params → 400"** applies to `/movies` and `/movies/search` (the endpoints Q19 is about).
6. **Recommendation scoring details Q22 leaves open:**
   - Each score component is normalized 0–1 by dividing by that component's maximum across the candidate set.
   - "Fewer than 3 positive signals" counts distinct signal movies.
   - The ~300 candidates are picked by number of matched profile features, then IMDb votes.
7. **No `/movies/most-rated`.** Q21 dropped the most-rated row, and the Discovery list follows Q21 (`trending, top-rated, most-liked, imdb-top-250`).

---

## C. Phases

### Phase 0: Foundation  `[x]` (done 2026-10-12, compiles)
**As built (differences from the list below):**
- **Error classes:** one `ApiException(ErrorCode, message)` plus `MovieNotFoundException`, instead of a subclass per status. `ErrorCode` carries the HTTP status. A `FORBIDDEN` code was added for the 403 access-denied handler.
- **Identity exceptions** (`InvalidToken`, `EmailNotFound`, `EmailDelivery`, `UserAlreadyExists`) now extend `ApiException`.
- **Signup duplicates:** duplicate username → `USERNAME_TAKEN`, duplicate email → `EMAIL_TAKEN`.
- **Plain-string bodies → `{message}`:** the old identity endpoints now return `{message}` instead of plain strings.
- **`IpBlockingFilter`** writes the standard 429 error JSON.
- **`AuthenticatedUserdto` removed:** controllers use `CurrentUser.id(jwt)`, and services take a `Long userId`.
- **`APP_BASE_URL`** now defaults to `http://localhost:8080` (only used until Phase 3).
- **Unknown URLs:** an unknown URL outside `/api/v1/movies/**` returns 401, not 404, because Spring Security runs first. Test 404 with `GET /api/v1/movies/1/nope`.
- **Not used yet:** `MovieCardService`, `UserMovieStateLookup`, `PageResponse` and `PageParams` exist but no endpoint uses them until Phases 4, 6 and 7.

**Covers:** Q26 (structure), Q25 (error format, global handler), Q17 (`PageResponse`), Q18 (`MovieCard` + card builder), Q28 (CORS), §8 (config/env, show-sql, single `@Transactional`, dead code), Q27 (test removal, Redis check), B-3, B-4, B-11.

**Create**
- `shared/api/*`: `ApiError`, `ErrorCode`, `ApiException` (+ `NotFoundException`, `MovieNotFoundException`, `BadRequestException`, `ServiceUnavailableException`, `RateLimitedException`), `GlobalExceptionHandler`, `PageResponse`, `PageParams`, `MessageResponse`.
- `shared/movie/*`: `MovieCard`, `UserMovieState`, `UserMovieStateLookup`.
- `shared/security/*`: `SecurityConfig` (moved from root, + `CorsConfigurationSource`), `ErrorResponseWriter`, `CurrentUser` (reads `userId` from the JWT).
- `shared/redis/*`: `RedisConfig`, `RedisStartupCheck` (one PING, one log line).
- `shared/util/TokenHasher` (SHA-256 code taken from `JwtBlacklistService`).
- `catalog/application/MovieCardService` + `catalog/persistence/MovieCardRepository`.
- `activity/application/UserMovieStateService implements UserMovieStateLookup` (direct `EXISTS` / value lookups).
- `src/main/resources/application-dev.properties` (`spring.jpa.show-sql=true`).
- `Cinesmart-Backend/.env.example`.

**Move / rename (package only, behaviour unchanged):**
- `identity_and_access` → `identity`
- `movies_catalogue.movie_read` → `catalog`
- `user_movies_activity` → `activity`
- `user_recommendation` → `recommendation`
- `discovery_movies` → `discovery`
- `Security` → `security`, `persistance` → `persistence`
- `ForgotPasswordRequestdto` → `ForgotPasswordRequest`, `AuthenticatedUserdto` → removed (use `CurrentUser`)
- `master_orchestration` stays where it is until Phases 4/7 replace it.

**Delete:**
- `api/BackendError`, `api/BackendErrorHandler`
- both `ApiError` records, `UserExceptionHandler`, `MovieReadExceptionHandler`, `MovieDiscoveryExceptionHandler`, `UserMovieActivityExceptionHandler`
- the duplicate `MovieNotFoundException`s
- `RedisHealthCheckService`
- `RoleDto`, `PersonDto`, the `/auth/me` stub, commented-out code blocks
- `src/test/java/MovieJdbcRepositoryTest.java`

**Change:**
- `jakarta.transaction.Transactional` → Spring `@Transactional` everywhere.
- `application.properties`: see config below.

**Config / env**
- `spring.datasource.*` keep `${SPRING_DATASOURCE_URL|USERNAME|PASSWORD}`.
- `spring.mail.host/port/username/password` → `${MAIL_HOST:smtp.ethereal.email}`, `${MAIL_PORT:587}`, `${MAIL_USERNAME}`, `${MAIL_PASSWORD}`.
- `jwt.secret` → `${JWT_SECRET}` (no default).
- `spring.data.redis.host/port` → `${REDIS_HOST:localhost}` / `${REDIS_PORT:6379}`.
- `spring.jpa.show-sql=false`.
- `app.cors.allowed-origins=${FRONTEND_ORIGINS:http://localhost:5173}`.
- `app.frontend-base-url=${FRONTEND_BASE_URL:http://localhost:5173}` (used from Phase 3).

**Endpoints:** no path changes yet. All errors now use the B.2 shape; unknown URL → 404, wrong method → 405, bad param → 400.

**DB:** none. **Risks:** the big package move touches every file, so the compile check is the safety net. Secrets disappear from `application.properties`, so the app won't start until `JWT_SECRET`, `MAIL_USERNAME` and `MAIL_PASSWORD` are set.

**Check:**
- Compile.
- `GET /api/v1/movies/1/nope` → 404 JSON (`NOT_FOUND`).
- `DELETE /api/v1/movies/1` → 405.
- `GET /api/v1/movies/abc` → 400.
- `OPTIONS /api/v1/movies/1` with `Origin: http://localhost:5173` → CORS headers present.

---

### Phase 1: Remaining bug fixes  `[x]` (done 2026-10-12, compiles)
**As built:**
- `MovieRepositoryRead`:
  - only `EmptyResultDataAccessException` → empty (movie or analytics row missing); every other DB error propagates → 500 `INTERNAL_ERROR`
  - `/movies/top10` no longer hides errors either
- **`MovieAnalyticsDto` is now `{averageRating, ratingCount, likeCount, dislikeCount}`** (V019 columns). The old details endpoints show it under `analytics`.
- **The old hourly job (`MovieAnalyticsAggregationService`) still targets the dropped columns.** It keeps logging a warning each hour until Phase 5 replaces it. That's harmless; the values stay 0/NULL until then.
- **B-13:** `escapeLike` lives privately in `OrchestrationMovieRepository`, which Phase 7 deletes.

**Covers:** B-2, B-10, B-12, B-13, B-14. Also an interim fix so details read the V019 analytics columns.
(B-1, B-6, B-7 and B-8 come with the Identity rewrite in Phase 3, B-5 with Phase 5, and B-9 with Phase 6.)

**Change:**
- `MovieDiscoveryService.searchPage` regex (B-2).
- `MovieRepositoryRead`:
  - stop catching `DataAccessException`; only "no row" → empty (B-10)
  - analytics query uses `average_rating, rating_count, like_count, dislike_count`
- `AppUserPrincipal.toString()` without the hash (B-12).
- `OrchestrationMovieRepository.search` escapes `% _ \` (B-13).
- Activity list GETs return 200 `[]` (B-14).

**Endpoints:** unchanged. **DB:** none. **Risks:** low.

**Check:**
- Compile.
- `GET /api/v1/movies/search/page?keyword=dark` → 200.
- `GET /api/v1/movies/1` → 200 with analytics.
- Stop Postgres, then `GET /api/v1/movies/1` → 500 `INTERNAL_ERROR` (not 404).
- Empty watchlist → 200 `[]`.

---

### Phase 2: DB migrations + schema files  `[x]` (done 2026-10-12, compiles; no Java changed)
**As built:**
- **Real schema re-captured 2026-10-12** (read-only query, saved as `Database/Scripts/schema_capture.sql`). The root schema now uses the real names: `uq_person_name` + `idx_person_name` (redundant btree, kept to match the DB), `unique_genre_name`, `unique_language_name`, `chk_imdb_rating` 0–10, inline `UNIQUE` on `app_user.username/email` and `movie_role.role_name`, `top10_movie_id_fkey` (unnamed inline FK).
- **V021:** the capture was taken before its two `LOWER()` indexes existed; you then showed both `uq_app_user_*_lower` indexes are in place. It is treated as applied; check `is_verified`'s default with the query in the report.
- **V022 undo** uses the real old definitions: `global_reaction_count BIGINT NOT NULL DEFAULT 0`, `movie_global_rating_check` 1–10 (not 0–10).
- **Schema file:** `CREATE INDEX CONCURRENTLY` became plain `CREATE INDEX` (fresh install, empty tables, and CONCURRENTLY fails inside a transaction or multi-statement script). No triggers or functions. Analytics and `top10` are numbered sections 15 and 16.
- **`Database/Schema.sql`** is byte-identical to the root file. Its old trailing status query was moved to the new `Database/Scripts/schema_capture.sql` (Clarification in change.md Q23b).
- **For later phases:** no Java, config or entity changes. `movie.global_*` must not be referenced anywhere (none is today).

**Covers:** Q23b, Q9 (DB part), the Q12/Q14 DB parts (already run, documented only), legacy column cleanup (clarification).

**Files**
- `V021`: already run, left as it is.
- **New** `Database/Migration/V022__movie_drop_legacy_rating_columns.sql`:
  ```sql
  BEGIN;
  ALTER TABLE movie DROP CONSTRAINT IF EXISTS movie_global_rating_check;
  ALTER TABLE movie DROP COLUMN IF EXISTS global_rating, DROP COLUMN IF EXISTS global_reaction_count;
  COMMIT;
  ```
  Its header includes a pre-check (`SELECT COUNT(*) FROM movie WHERE global_rating IS NOT NULL OR global_reaction_count <> 0`, for information only) and the undo SQL (re-add both columns with the old types and check; the values come back only from backup).
- `V019`, `V020`: already run, left as they are.
- **Re-run caveat:** V019 drops and rebuilds `movie_analytics` (derived data only), so don't re-run it after Phase 5 has filled the table. If it is re-run, the next job run refills it.
- **Rewrite** root `Cinesmart_database_schema.sql` = real schema + V021 + V022:
  - real constraint and index names (`unique_genre_name`, `unique_language_name`, `uq_person_name`, `idx_person_name`, `chk_imdb_rating` 0–10)
  - `movie_analytics` with its PK, `user_reaction.reacted_at`
  - `is_verified DEFAULT FALSE`, the `LOWER()` unique indexes
  - `top10.movie_id INT` as it is today
  - The header says: "fresh install = run this file; V001–V018 are history and don't rebuild the DB".
- `Database/Schema.sql`: overwritten as an exact mirror of the root file.
- `Database/Scripts/database_status.sql`: add `user_reaction`, `movie_analytics`, `top10`; drop the stale `user_like` / daily_top_10 comments.

**Endpoints / config:** none. The app starts with or without V022: no entity maps the dropped columns.

**Check:** follow the checklist in §E, then the verify queries listed there.

---

### Phase 3: Identity  `[x]` (done 2026-10-12, compiles)
**As built (differences and additions):**
- **IP login block** (10 failures → 1 h) is checked first in `AuthService.login`, not in `IpRateLimitFilter`. It still applies to login only, but it fails closed like the rest of login (the filter's rate limits fail open).
- **Wrong current password** on `password/change` and `email/change` → 400 `VALIDATION_FAILED` with `fields.currentPassword` (not 401, which would make the frontend refresh and retry). Both endpoints also check the account lock (429) and count a wrong password toward the lockout. New password equal to the current one / new email equal to the current one → 400 with `fields.newPassword` / `fields.newEmail`.
- **Refresh failure** (missing, expired, reused cookie, or past the 7-day cap) → 401 `UNAUTHORIZED` and the cookie is cleared. Logout also clears the cookie.
- **Signup / forgot / resend** PING Redis first, so they return 503 before changing anything when Redis is down. After the user row is saved, a failed verification token or email is logged and signup still returns 201. Forgot and resend swallow SMTP errors so the answer never reveals whether the account exists; `email/change` returns 503 if the email to the new address can't be sent.
- **Old activity paths** (`/api/v1/auth/user/**`) stay login-only: the public auth endpoints are an explicit list, not `/auth/**`.
- **Removed** (beyond the plan's list): `JwtService` → `TokenService`, `UserSignupService` → `AuthService` + `VerificationService`, `SubmitPasswordDto` → `ResetPasswordRequest`, and the Spring Security `BadCredentials/Locked/Disabled/UsernameNotFound` handlers in `GlobalExceptionHandler`.
- **New shared pieces:**
  - `shared/redis/RedisFailClosed` (`call`, `run`, `ensureAvailable`): turns a Redis `DataAccessException` into 503 `SERVICE_UNAVAILABLE`.
  - `shared/util/RandomToken.generate()`: 256-bit URL-safe tokens.
  - `ApiException.invalidField(field, message)` + `fields()`: the global handler now passes `fields` through.
  - `shared/ratelimit`: `RateLimit.parse("10/PT1M")`, `RateLimitProperties.ipLimit(group)` / `userLimit(group)` (`rate-limit.user.*` is read in Phase 6), and `RateLimiter.hit(key, limit)` → `Decision(allowed, retryAfterSeconds)`, which fails open.
- **For later phases:**
  - **Activity counts:** `activity.application.UserMovieStateService.counts(userId)` → `ActivityCounts` is an interim method for `/me`; Phase 6 may move it to `MyListsService.counts`.
  - **Requests without a login:** `CurrentUser.idOrNull(jwt)` on the optional-JWT GETs is `null` for an invalid or expired token.
  - **Auth-side revocation:** `TokenService.revokeAll(userId)` logs a user out everywhere.
  - **Phase 6 rate limits:** the per-user limits go in `UserRateLimitInterceptor` and reuse `RateLimiter`, with keys such as `rl:user:<group>:<userId>`.
- **Config:**
  - `jwt.expiry-seconds` was replaced by `jwt.access-token-ttl`.
  - `app.mail.from` was added.
  - The `dev` profile sets `auth.refresh.cookie-secure=false`.
  - `APP_BASE_URL` is no longer read.

**Covers:** Q1, Q2, Q3, Q4, Q5, Q6, Q8, Q9 (code), Q24, Q28 (login response), §8 (email after commit), B-1, B-6, B-7, B-8, B-12 (principal removed).

**Create**
- `identity/application/AuthService` (rewritten as manual authentication, without `AuthenticationManager`):
  1. lock check (429 `ACCOUNT_LOCKED`, password not checked)
  2. find user by `LOWER(username)`; if missing, run a dummy BCrypt check for equal timing → 401
  3. password check → 401 and count the failure
  4. verified check → 403
  5. clear the counters and issue tokens
- `identity/application/LoginAttemptService` (from `RedisLockoutService`; keys use the lowercased username). Unknown usernames are locked too.
- `identity/application/TokenService`: access JWT (15 min, `sub`, `userId`, `iat`) + refresh tokens:
  - `refresh:<sha>` → `userId|sessionStart`, sliding TTL 2 h
  - `refresh:used:<sha>` for reuse detection
  - `user:sessions:<userId>` set
  - `user:tokens-valid-after:<userId>`
  - 7-day cap
  - `revokeAll(userId)`
- `identity/application/AccessTokenRevocationService` (blacklist + valid-after; fails **open** on Redis errors).
- `identity/application/VerificationService` (hashed `verification:token:<sha>` → userId, 24 h, `POST verify` / `POST resend {email}`).
- `identity/application/PasswordResetService` (rewritten):
  - email only, case-insensitive
  - unverified account → verification email instead
  - `reset:token:<sha>` → userId, 10 min, `getAndDelete`
  - success → `revokeAll`
- `identity/application/AccountService`:
  - `GET /me` profile (counts via Activity)
  - `password/change`: wrong current password counts toward lockout; new ≠ current; revoke others; return new tokens
  - `email/change` + `email/change/confirm`: `email-change:token:<sha>` → `userId|newEmail`, 24 h; notice sent to the old address
- `identity/application/EmailLinkService` (builds `FRONTEND_BASE_URL/verify-email|reset-password|confirm-email?token=`).
- `identity/api`: `AuthController` (signup, login, refresh, logout), `EmailController`, `PasswordController`, `MeController` (`GET /me` only, profile).
- `shared/security/ClientIpResolver` (`getRemoteAddr()`; `X-Forwarded-For` only if `app.trust-proxy=true`).
- `shared/ratelimit/RateLimiter` + `IpRateLimitFilter`:
  - Lua INCR+EXPIRE; 429 + `Retry-After`
  - fails open
  - the IP block applies to `/auth/login` only

**Delete:** `AppUserDetailsService`, `AppUserPrincipal`, `SecurityEventListener`, `IpBlockingFilter`, `JwtBlacklistService`, `RedisLockoutService`, `UserSignupController`/`UserAuthController`/`PasswordResetController` (replaced), the `AuthenticationManager` bean, the `EmailNotFound`/`EmailNotVerified` exceptions.

**Change:**
- `AppUser` (email setter lowercases and trims).
- `AppUserRepository` (`findByUsernameIgnoreCase`, `findByEmailIgnoreCase`, `exists…IgnoreCase`).
- `NewUser` (username pattern `^[A-Za-z0-9_.-]{3,32}$`, email lowercased).
- `SecurityConfig` (B.5 matrix, valid-after check in the decoder, rate-limit filter, optional-JWT resolver).
- Signup: the transaction commits first, then the email is sent.

**Endpoints (all `/api/v1`):**
- `POST /auth/signup` · `login` · `refresh` · `logout` (204)
- `POST /auth/email/verify {token}` · `email/resend {email}` · `email/change {currentPassword,newEmail}` · `email/change/confirm {token}`
- `POST /auth/password/forgot {email}` · `password/reset {token,newPassword}` · `password/change {currentPassword,newPassword}`
- `GET /me`
- **Removed:** `/auth/register`, `GET /auth/email-verification/*`, `/auth/me`.

**Login / refresh response:** `{ accessToken, expiresIn: 900, user: { userId, username } }`, plus the `Set-Cookie: refresh_token=…; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=7200`.

**Config:**
- `jwt.access-token-ttl=PT15M`
- `auth.refresh.idle-ttl=PT2H`, `auth.refresh.max-session=P7D`, `auth.refresh.cookie-secure=true`
- `auth.token.reset-ttl=PT10M`, `auth.token.verification-ttl=PT24H`, `auth.token.email-change-ttl=PT24H`
- `auth.lockout.max-user-failures=5`, `auth.lockout.max-ip-failures=10`, `auth.lockout.duration=PT1H`
- `app.trust-proxy=false`
- `rate-limit.ip.login=10/PT1M`, `rate-limit.ip.account=5/PT15M`, `rate-limit.ip.token=10/PT15M`, `rate-limit.ip.public=120/PT1M`
- `spring.data.redis.timeout=500ms`, `spring.data.redis.connect-timeout=500ms`
- `app.mail.from=noreply@cinesmart.ca`
- `APP_BASE_URL` no longer used.

**Redis down (Q24):**

| Feature | Behaviour |
|---|---|
| Rate limits, blacklist, valid-after check | fail **open** + warning log |
| Login, refresh, signup, verify, resend, forgot, reset, change email/password | fail **closed**: 503 `SERVICE_UNAVAILABLE` |

**DB:** none new. V021's `LOWER()` unique indexes are already in place, so case-insensitive uniqueness is enforced by the database.

**Risks:**
- The Secure cookie over plain `http://localhost`: browsers accept it for localhost, but Postman may not resend it. For Postman testing, set `auth.refresh.cookie-secure=false` in the `dev` profile.
- All existing JWTs become invalid (new TTL and checks); outstanding email links stop working.

**Check (Postman):**
- signup → 201; the email link points to `localhost:5173/verify-email?token=…`
- `POST email/verify` → 200
- 5 wrong logins → 6th gets 429 `ACCOUNT_LOCKED`
- unverified account + correct password → 403 `ACCOUNT_NOT_VERIFIED`
- login → body + cookie
- `POST refresh` → new token; replaying the old cookie → 401 and every session revoked
- logout → 204, then the old access token → 401
- forgot → reset → the old refresh token is dead
- `GET /me`
- password/change, email/change → confirm
- 11 logins in a minute → 429 with `Retry-After`
- stop Redis: login → 503, `GET /movies/1` → 200

---

### Phase 4: Catalog  `[x]` (done 2026-10-12, compiles with `clean compile`)
**As built (differences and additions):**
- **`getMoviesByIds` uses 5 queries, not 6:** analytics is `LEFT JOIN`ed into the core movie query (0 / NULL when there's no row yet). It is `@Transactional(readOnly = true)`, de-duplicates the IDs, skips unknown IDs and keeps the requested order. Every returned `MovieDetails` has `userState = null`.
- **Public methods of `catalog.application.CatalogService`** (later phases depend on these names):
  - `MovieDetails getMovieDetails(Long movieId, Long userId)`: `userId` may be null; unknown ID → `MovieNotFoundException` (404 `MOVIE_NOT_FOUND`).
  - `List<MovieDetails> getMoviesByIds(List<Long> movieIds)`
  - `Map<Long, MovieFeatures> getFeatures(Set<Long> movieIds)`: `MovieFeatures {genreIds, languageIds, actorIds, directorIds}` (all `Set<Long>`; actors = every `Actor` link). Every requested ID is a key; unknown IDs or IDs with no links map to empty sets.
  - `boolean movieExists(Long movieId)`, `List<NamedRef> listGenres()`, `List<NamedRef> listLanguages()`
  - `getTop10Movies()`: **interim**, backs `/movies/top10`; Phase 7 deletes it together with `CatalogRepository.findTop10Movies` and the `top10.*` config.
  - Cards are still built by the existing `MovieCardService.getCards(ids, userId)` (unchanged).
- **Domain records** (`catalog.domain`): `MovieDetails`, `NamedRef {id, name}`, `PersonRef {personId, name}`, `Ratings {imdb, imdbVotes, rottenTomatoes, metascore}`, `PlatformStats {averageRating, ratingCount, likeCount, dislikeCount}`, `Availability {platform, type, url}`, `MovieFeatures`.
- **Response details:** `tmdbId` and `boxOffice` aren't returned. Genres, languages and people are sorted by name, availability by platform. `otherCrew` is a map `role name → [PersonRef]` and is left out of the JSON when empty (always today; only `Actor`/`Director`/`Writer` exist). `userState` is serialized as `null` for anonymous users.
- **`/movies/top10`** moved from the deleted `MovieReadController` into `CatalogController` (same SQL, same `DiscoveryMovieDto` response).
- **Orchestration:** the details endpoint, `MovieDetailsResponse` and the orchestration `UserMovieState` are gone; `MasterOrchestrationService` no longer depends on Catalog or Activity. The orchestration `MovieCard` now uses `catalog.domain.Availability`. `/orchestration/home` and `/orchestration/search` still work until Phase 7.
- **Recommendation interim adapter:** `RecommendationItem.movie` is now a `MovieDetails`, and both recommendation methods load their candidates with one `getMoviesByIds` call instead of one lookup per movie. Phase 8 replaces this.
- **Deleted files were moved, not deleted** (auto mode blocks `rm` in this non-git folder): they're in the session scratchpad under `phase4-removed/`. Nothing in `src` references them.
- **Build note:** after deleting sources, run `clean compile`, not just `compile`, so no stale `.class` files stay in `target/classes` (an old controller class there would register a duplicate mapping). Close any shell sitting inside `target` first, or the clean fails on Windows.

**Covers:** C-1 (`getMoviesByIds`), Q10 (details response), Q20 (`/genres`, `/languages`), Q11 (no change; country and awards stay out).

**Create:**
- `catalog/application/CatalogService`:
  - `getMovieDetails(id, userId)`
  - `getMoviesByIds(ids)` (batched: core + genres + languages + people + availability + analytics in 6 queries, results in requested order)
  - `getFeatures(ids)` (genre, language, actor and director IDs, for Recommendation)
  - `movieExists(id)`, `listGenres()`, `listLanguages()`
- `catalog/persistence/CatalogRepository`.
- `catalog/api/CatalogController` (`GET /movies/{id}`, `/genres`, `/languages`, with `Cache-Control: max-age=3600` on the last two).
- Domain records `MovieDetails`, `NamedRef {id,name}`, `PersonRef {personId,name}`, `Ratings`, `PlatformStats`, `Availability`.

**Delete:**
- `MovieReadController`/`Service`, `MovieRepositoryRead`, `MovieRepository`
- `ResponseDto`, `MovieDto`, `MovieCoreDto`, `GenreDto`, `LanguageDto`, `MovieAnalyticsDto`, `MoviePersonDto`, `MovieAvailabilityDto`
- the orchestration details endpoint + `MovieDetailsResponse`

The `/movies/top10` endpoint stays until Phase 7. Recommendation is moved onto `getMoviesByIds` temporarily so it still compiles.

**Endpoints:**
- `GET /movies/{id}` returns the Q10 shape. `userState` is `null` when anonymous; `reaction` defaults to `"NEUTRAL"`; `boxOffice` is not returned. Unknown ID → 404 `MOVIE_NOT_FOUND`.
- `GET /genres`: sorted by name, only genres with movies.
- `GET /languages`: sorted by movie count descending.

**DB:** none. **Risks:** Recommendation's interim adapter.

**Check:**
- `GET /movies/{id}` anonymous and logged in (compare `userState`)
- `GET /movies/999999` → 404
- `GET /genres`, `GET /languages`: check the response headers

---

### Phase 5: Analytics batch  `[x]` (done 2026-10-12, compiles with `clean compile`)
**As built (differences and additions):**
- **`analytics.application.AnalyticsJob`:**
  - `@Scheduled(fixedDelayString = "${analytics.refresh-interval:PT1H}")` with `initialDelayString` set to the same interval. Without it, the scheduled run would also fire at startup and run twice.
  - The startup run comes from `@EventListener(ApplicationReadyEvent)`. It hands `refresh()` to Boot's auto-configured `TaskScheduler` (single scheduler thread), so startup isn't blocked and the two runs never overlap within one instance.
  - Any `RuntimeException` is logged at ERROR (`analytics refresh failed; previous values kept`) and the next run still happens.
  - Log lines: `analytics refreshed: N movies`, or `analytics refresh skipped: another instance is running it`.
- **`analytics.persistence.AnalyticsRepository.refresh(int minVotes)` → `OptionalInt`** (number of movies written; empty = lock not acquired). It is one `@Transactional` method:
  1. It first calls `pg_try_advisory_xact_lock(7310001)`. The lock is released at commit or rollback, so a crash can't leave it held.
  2. It then runs one `WITH platform / ratings / reactions … INSERT … SELECT FROM movie … ON CONFLICT DO UPDATE` statement, with C, R and `weighted_rating` computed as planned.
  3. `ROUND(…, 2)` is applied to both averages. `weighted_rating` and `average_rating` are NULL when a movie has no ratings, and NEUTRAL reactions are not counted.
- **Deleted:** `catalog.persistence.MovieAnalyticsAggregationService` (moved to the scratchpad under `phase5-removed/`, same as Phase 4). The hourly "analytics schema unavailable" warning is gone.
- **Config:** `analytics.min-votes=5`, `analytics.refresh-interval=PT1H` (ISO-8601 duration). `movie.analytics.refresh-ms` was never in `application.properties`; nothing reads it now.
- **For later phases:**
  - **Top Rated (Phase 7):** filter on `rating_count >= ${analytics.min-votes}` and order by `weighted_rating`.
  - **Freshness:** `movie_analytics` is at most one interval old, so activity changes show up in `platformStats` and on cards only after the next run (or a restart).
  - **Analytics rows:** every movie has a row after the first run, but readers should keep their `LEFT JOIN` + `COALESCE`, because a new ETL movie has no row until the next run.

**Covers:** Q12, Q13, B-5 (code side).

**Create:**
- `analytics/application/AnalyticsJob`:
  - `@Scheduled(fixedDelayString="${analytics.refresh-interval:PT1H}")`
  - also runs once on `ApplicationReadyEvent` on a background thread, so startup isn't blocked
- `analytics/persistence/AnalyticsRepository`: one `@Transactional` method:
  1. `SELECT pg_try_advisory_xact_lock(<const>)`. If false, skip with an info log.
  2. `INSERT … SELECT … FROM movie LEFT JOIN (ratings) LEFT JOIN (reactions) ON CONFLICT (movie_id) DO UPDATE`.
     - `C` is computed in a CTE from `AVG(user_rating.rating)`.
     - `weighted_rating = ROUND((v/(v+m))*R + (m/(v+m))*C, 2)`, NULL when v = 0.
     - `average_rating = ROUND(AVG, 2)`.
     - NEUTRAL is not counted.
     - `updated_at = now()`.
  3. Errors are logged at ERROR level with the exception.

**Delete:** `MovieAnalyticsAggregationService`.

**Config:** `analytics.min-votes=5`, `analytics.refresh-interval=PT1H` (replaces `movie.analytics.refresh-ms`).

**DB:** none (V019 done). **Risks:** none significant; with 1,136 movies the job takes milliseconds.

**Check:**
- The startup log shows "analytics refreshed: N movies".
- Rate a movie, restart, then `GET /movies/{id}` → `platformStats.ratingCount` increases.
- SQL: `SELECT * FROM movie_analytics WHERE rating_count > 0`.

---

### Phase 6: Activity  `[x]` (done 2026-10-12, compiles with `clean compile`)
**As built (differences and additions):**
- **`activity.application.ActivityService`:** the 8 methods are named as planned. Each one is `@Transactional`, runs `catalog.movieExists` (404 `MOVIE_NOT_FOUND`), writes, then returns `UserMovieStateService.getState`. The checks run in this order:
  1. auth (401)
  2. `@Positive` id / body validation (400)
  3. movie exists (404)
- **Watchlist / watched `PUT`:** `ON CONFLICT DO NOTHING`, so repeating it keeps the original `added_at` / `watched_at`. Ratings and reactions update `rated_at` / `reacted_at` on every change.
- **`activity.application.MyListsService`:**
  - `watchlist(userId, PageParams)` → `PageResponse<WatchlistItem>`
  - `ratings(userId, PageParams)` → `PageResponse<RatedItem>`
  - `watched(userId)` → `List<WatchedItem{movieId, watchedAt}>`
  - `reactions(userId)` → `List<ReactionItem{movieId, reaction, reactedAt}>` (LIKE/DISLIKE only)
  - `counts(userId)` → `ActivityCounts` (moved here from `UserMovieStateService`; `AccountService` / `GET /me` now uses it)
  - `signals(userId)` → `ActivitySignals`
- **List items:** `WatchlistItem` and `RatedItem` flatten the full `MovieCard` with `@JsonUnwrapped` and add `addedAt`, or `rating` + `ratedAt`. So a watchlist item carries every card field (Q15 listed a subset; Q18 says lists use the card plus their own fields). Both lists are newest first, with `movie_id` as tie-break.
- **`ActivitySignals` (for Phase 8):** `{watchlist: [Entry], watched: [Entry], ratings: [Rated], likes: [Entry], dislikedIds: Set<Long>}`, where `Entry {movieId, at}` and `Rated {movieId, rating, at}`, with `at` an `Instant`. It is loaded with one `UNION ALL` query; NEUTRAL rows are left out.
- **Persistence:**
  - Activity is all JDBC now: the new `ActivityRepository` handles writes and lists.
  - `UserMovieStateRepository` (state, batched flags, counts) is unchanged.
  - The request DTOs `RatingRequestDto` (1–10, one decimal) and `UserReactionRequestDto` (`LIKE|DISLIKE|NEUTRAL`) are kept as they were.
- **Per-user rate limits:** `shared/ratelimit/UserRateLimitInterceptor` + `UserRateLimitConfig` (a `WebMvcConfigurer`). Key `rl:user:<write|read>:<userId>`; 429 + `Retry-After` in the standard error JSON. Like the IP limits, it fails open.
  - `write`: PUT/DELETE on `/movies/*/watchlist|watched|rating|reaction`.
  - `read`: `/me`, `/me/**`, `/recommendations`, `/recommendations/**`. The `GET /me` profile counts toward `read` too.
  - The interceptor runs after Spring Security, so an unauthenticated request gets 401 before it counts, and only matched handlers count (an unknown path → 404, not counted).
- **Recommendation interim adapter:** `RecommendationService` now depends on `MyListsService.signals` instead of the 4 old activity services. Seeds and exclusions are unchanged.
- **Deleted** (moved to the scratchpad under `phase6-removed/`):
  - the 4 old controllers and their 4 services, plus `MovieUserStateDto`
  - the 5 JPA entities and 4 JPA repositories
  - `persistence/dto/*`
  - with them, the old `/api/v1/auth/user/**` paths, `/ratings/v2`, `/likes/counts`, `/likes/liked-movies`
- **Config:** `rate-limit.user.write=60/PT1M`, `rate-limit.user.read=120/PT1M`. `RateLimitProperties.userLimit` throws at the first request if a group is missing.
- **For later phases:** JPA now maps only `AppUser` and the Discovery entities that Phase 7 deletes. Phase 8 reads `MyListsService.signals` (it has timestamps for the 90-day boost, and `dislikedIds` for exclusion).

**Covers:** Q7 (activity + `/me` paths), Q14, Q15, Q16, Q25 (`userState` after actions), B-9, B-14 (final), U-9.

**Create:**
- `activity/application/ActivityService`:
  - `setWatchlist/removeWatchlist/setWatched/removeWatched/setRating/removeRating/setReaction/removeReaction`
  - each first runs `catalog.movieExists` (404 `MOVIE_NOT_FOUND`), then the upsert/delete, then returns `UserMovieState`
- `activity/application/MyListsService`:
  - `watchlist(page)` → cards + `addedAt`
  - `watched()` → `[{movieId, watchedAt}]`
  - `ratings(page)` → cards + `rating, ratedAt`
  - `reactions()` → LIKE/DISLIKE only, with `reactedAt`
  - `counts(userId)` for `/me`
  - `signals(userId)` for Recommendation
- `activity/persistence/ActivityRepository` (JDBC):
  - `user_rating`: `ON CONFLICT DO UPDATE SET rating = EXCLUDED.rating, rated_at = now()`
  - `user_reaction`: `… reaction = EXCLUDED.reaction, reacted_at = now()`
- `activity/api/MovieActivityController` (`PUT`/`DELETE /movies/{id}/watchlist|watched|rating|reaction`).
- `activity/api/MyActivityController` (`GET /me/watchlist|watched|ratings|reactions`).
- `shared/ratelimit/UserRateLimitInterceptor`: writes 60/min shared across activity writes; reads 120/min for `/me/**` and `/recommendations`.

**Delete:**
- all 4 old activity controllers and services
- the JPA entities `Watchlist`, `AlreadyWatched`, `UserRating`, `UserReaction`, `UserMovieId`
- the JPA repositories and `DBdtos`
- `/ratings/v2`, `/likes/counts`, `/likes/liked-movies`

**Endpoints:**
- `PUT /movies/{id}/watchlist`, `/watched` (no body)
- `PUT /movies/{id}/rating {rating}` (1–10, one decimal)
- `PUT /movies/{id}/reaction {reaction: LIKE|DISLIKE|NEUTRAL}`
- `DELETE` on each of the above
- All of them return 200 `{inWatchlist, watched, rating, reaction}`.
- `GET /me/watchlist?page&size`, `/me/watched`, `/me/ratings?page&size`, `/me/reactions`.

**Config:** `rate-limit.user.write=60/PT1M`, `rate-limit.user.read=120/PT1M`.

**DB:** none (V020 done). **Risks:** `/me` from Phase 3 switches to the new counts method; covered by compile.

**Check:**
- `PUT /movies/1/watchlist` twice → same 200 body
- `DELETE` twice → 200
- `PUT /movies/999999/rating` → 404
- `PUT reaction NEUTRAL` → `"NEUTRAL"`; `DELETE` → `"NEUTRAL"`
- `GET /me/watchlist` with no items → empty page
- 61 writes in a minute → 429

---

### Phase 7: Discovery + Home  `[x]` (done 2026-10-12, compiles with `clean compile`)
**As built (differences and additions):**
- **`discovery.application.DiscoveryService`** (public methods; `userId` null = anonymous, card flags null):
  - `browse(Long genreId, Long languageId, Integer year, PageParams, Long userId)`
  - `search(String q, PageParams, Long userId)`
  - `trending / topRated / mostLiked / imdbTop250(PageParams, Long userId)`
  - all return `PageResponse<MovieCard>`; cards come from `MovieCardService.getCards`.
- **Validation:**
  - an unknown or non-positive `genreId` / `languageId`, or a `year` outside 1888–2100 → 400 `VALIDATION_FAILED` with `fields.genreId|languageId|year`. The upper bound 2100 is my choice (the decision only says "invalid year → 400"); a valid year with no movies → empty page.
  - `q` shorter than 3 or longer than 100 after trim → 400 `fields.q`; missing `q` → 400 (Spring).
  - unknown query params on `/movies` and `/movies/search` → 400 `BAD_REQUEST` "Unknown query parameter: x" (checked in the controller). The four list endpoints ignore extra params.
- **`discovery.persistence.DiscoveryRepository`** returns `IdPage {movieIds, totalResults}`:
  - `browse(...)`, `search(q, threshold, boost, limit, offset)`, `ranked(RankedList, limit, offset)`, `genreExists`, `languageExists`.
  - Genre/language existence is checked with Discovery's own SQL (no new Catalog method).
  - **Search** is one `@Transactional(readOnly = true)` method: `set_config('pg_trgm.word_similarity_threshold', :t, true)` (the bindable form of `SET LOCAL`), then a count query and a page query over the same CTE. Matching uses `:q <% LOWER(title)` and `:q <% LOWER(person.name)` with `q` lowercased. Score = `MAX(title similarity + boost, best person similarity)`; order: score, `imdb_votes DESC NULLS LAST`, `movie_id`.
  - **List orders:** trending = `top10` rows in browse order (`imdb_rating DESC NULLS LAST, imdb_votes DESC NULLS LAST, movie_id`); top-rated = `rating_count >= analytics.min-votes` and `weighted_rating` not null, by `weighted_rating DESC, rating_count DESC, imdb_votes DESC, movie_id`; most-liked = `like_count > 0`, by `like_count DESC, imdb_votes DESC, movie_id`; IMDb Top 250 = `imdb_votes >= 25000` and rating not null, by `imdb_rating DESC, imdb_votes DESC, movie_id`, capped at 250 (`totalResults` ≤ 250; pages past 250 are empty).
  - The count query is skipped when a non-empty page is shorter than `size` (the total is then known).
- **`discovery.domain.RankedList`** enum (`TRENDING, TOP_RATED, MOST_LIKED, IMDB_TOP_250`, declared in home-row order) holds each row's `key`, `title` and `endpoint`.
- **`discovery.application.HomeService.getHome(Long userId)`** → `HomeResponse {sections: [HomeSection {key, title, endpoint, totalResults, results}]}`. Row IDs are picked first (each list fetches `rowSize + shown` from offset 0, then dedupes), then **one** `getCards` call builds every ranked row's cards.
- **For You and the dependency rule:** Discovery doesn't depend on Recommendation. It defines the interface **`discovery.application.ForYouSource`** (`PageResponse<MovieCard> forYou(Long userId, PageParams page)`), and Recommendation implements it. That way Phase 8's cold start can call `DiscoveryService.topRated` / `imdbTop250` without a cycle.
  - Interim implementation: `recommendation.application.ForYouHomeAdapter` over the old `recommendForUser` (≤ 30 items, so the row's `totalResults` = the number returned). Phase 8 deletes it and provides `ForYouSource` itself; exactly one bean must implement it or the app won't start.
  - The For You row's `endpoint` is already `/api/v1/recommendations`, which only exists from Phase 8 (today's path is `/recommendations/me`).
  - For You is only shown when logged in and non-empty.
- **Catalog:** `getTop10Movies`, `CatalogRepository.findTop10Movies`, its `top10.table` / `top10.movie-id-column` `@Value`s and the SQL-identifier check are removed; `/movies/top10` is gone (now 400, because `top10` isn't a valid `{id}`).
- **Deleted** (moved to the scratchpad under `phase7-removed/`): all of `master_orchestration` (controller, service, `HomePageResponse`, its `MovieCard`, `OrchestrationMovieRepository`), the old `DiscoveryController`, `MovieDiscoveryService`, `DiscoveryMovieRepository`, `DiscoveryMovieDto`, and the JPA entities `Movie, Genre, Language, Person, MovieRole, MoviePerson, MoviePersonId`. JPA now maps only `AppUser`.
- **Config:** `search.similarity-threshold=0.3`, `search.title-boost=0.1`, `home.row-size=10`, `home.imdb-top-250.min-votes=25000` (used by both the home row and `/movies/imdb-top-250`). There were no `top10.*` keys in `application.properties`, only code defaults.
- **For later phases:**
  - Phase 8: implement `ForYouSource` (return the same first page as `GET /recommendations`) and delete `ForYouHomeAdapter`. If `RecommendationCard` (card + `reason`) should show on home, widen `HomeSection.results`.
  - The old `/recommendations/me` and `/recommendations/similar/{id}` still exist until Phase 8.

**Covers:** Q17, Q18 (applied to every list), Q19, Q21, C-7, D-1…D-9, H-1…H-5.

**Create:**
- `discovery/application/DiscoveryService`:
  - `browse(genreId?, languageId?, year?, page)`: invalid or unknown IDs → 400
  - `search(q, page)`: `q` is 3–100 characters after trim
  - `trending`, `topRated`, `mostLiked`, `imdbTop250`
- `discovery/application/HomeService`: section order `for-you, trending, top-rated, most-liked, imdb-top-250`.
  - Dedupe in that order. Each row fetches up to `10 + shown` candidates, so it can still show 10.
  - `totalResults` comes from that row's full list.
  - Empty rows are left out.
- `discovery/persistence/DiscoveryRepository` (JDBC, returns IDs + count; cards come from Catalog):
  - Search runs in a read-only transaction with `SET LOCAL pg_trgm.word_similarity_threshold = :t` and `:q <% LOWER(title)` / `<% LOWER(person.name)`, so the existing GIN indexes are used. Score = max(title + boost, person).
  - Browse order: `imdb_rating DESC NULLS LAST, imdb_votes DESC, movie_id`.
- `discovery/api/DiscoveryController` and `HomeController`. The `/movies` and `/movies/search` endpoints reject unknown query params.

**Delete:**
- the rest of `master_orchestration`
- old `DiscoveryController`, `MovieDiscoveryService`, `DiscoveryMovieRepository`, `DiscoveryMovieDto`
- the JPA entities `Movie`, `Genre`, `Language`, `Person`, `MovieRole`, `MoviePerson`, `MoviePersonId`
- `/movies/top10` (and its `top10.*` config)

**Endpoints:**
- `GET /movies?genreId&languageId&year&page&size`
- `GET /movies/search?q&page&size`
- `GET /movies/trending`, `/movies/top-rated`, `/movies/most-liked`, `/movies/imdb-top-250` (all paged; IMDb Top 250 is capped at 250 results)
- `GET /home`

Until Phase 8, the For You row uses an adapter over the current recommendation service.

**Config:** `search.similarity-threshold=0.3`, `search.title-boost=0.1`, `home.row-size=10`, `home.imdb-top-250.min-votes=25000`.

**DB:** none. **Risks:**
- Spring Data's `Pageable` resolver is no longer used, so `PageParams` validates manually.
- `top-rated` will be empty until 5 users rate a movie, so that row is hidden on `/home`.

**Check:**
- `/movies/search?q=inter`: Interstellar first
- `?q=nolan`: person match
- `?q=ab` → 400
- `/movies?genreId=1&year=2014`
- `/movies?foo=1` → 400
- `/movies?genreId=99999` → 400
- `/movies/imdb-top-250?page=12&size=30` → partial last page
- `/home` anonymous vs logged in: no duplicate `movieId` across sections

---

### Phase 8: Recommendation  `[x]` (done 2026-10-12, compiles with `clean compile`)
**As built (differences and additions):**
- **Two open points were asked and answered** (recorded as a Clarification under change.md Q22):
  - liked movies are excluded too;
  - reason rule: people → liked movie (≥ 2 shared genres) → genre.
- **`recommendation.application.RecommendationService implements discovery.application.ForYouSource`:**
  - `PageResponse<RecommendationCard> recommend(Long userId, PageParams)`.
  - `forYou(userId, page)` returns the same items as plain `MovieCard`s, so the home For You row = page 0 of `/recommendations` without `reason`. `HomeSection.results` stays `List<MovieCard>`.
  - The full ranking (≤ `candidate-limit` = 300) is computed on every request and then sliced. `totalResults` = the ranking size. There is no cache (the Redis cache is deferred).
- **Signals and exclusions:**
  - Signals come from `MyListsService.signals`. A movie's weights add up; each signal with `at` in the last 90 days counts ×1.5.
  - Cold start applies when there are fewer than 3 distinct signal movies, **or** when the profile finds no candidates.
  - Excluded: watched, watchlist, every rated movie (any score), liked, disliked. The cold-start list uses the same exclusions.
- **Profile:** signal movies are loaded with `catalog.getMoviesByIds` (not `getFeatures`) because the reasons need titles and genre/person names. Candidates use `catalog.getFeatures`. Actors and directors are separate profile maps: a profile actor only matches a candidate's `Actor` links, and a director only `Director` links.
- **Candidates** (`recommendation.persistence.RecommendationRepository.findCandidates(genreIds, actorIds, directorIds, excludedIds, limit)` → `Candidate {movieId, imdbRating, imdbVotes}`): one query, ordered by number of matched features, then IMDb votes, then ID. Empty ID lists become `-1`.
- **Scoring** (`CandidateScorer`, package-private, shared with similar titles):
  - genre = the sum of the profile weights of the candidate's genres; people = actors + directors; language = the same for languages.
  - Each component is divided by its max across the candidates; imdb = rating/10 (0 when null).
  - Score = 0.4g + 0.3p + 0.1l + 0.2i; ties go to `imdb_votes DESC NULLS LAST`, then `movie_id`.
- **Reason** (plain text, no italics):
  - "More with P", when 0.3·people ≥ 0.4·genre; P = the matched person with the highest summed actor+director weight.
  - Otherwise "Because you liked X", when a liked or ≥ 7-rated movie shares ≥ 2 genres, checked in descending weight order.
  - Otherwise "Matches your taste in G".
  - Cold start: "Popular on CineSmart".
- **Cold start:** `DiscoveryService.rankedIds(TOP_RATED, 300)` followed by `rankedIds(IMDB_TOP_250, 300)`, de-duplicated, minus exclusions, capped at 300. **New public method:** `DiscoveryService.rankedIds(RankedList, int limit)`.
- **`SimilarService.similar(Long movieId, Integer size, Long userId)` → `List<MovieCard>`:**
  - Same candidate query and scorer, with every feature of the movie weighing 1 (shared-feature counts, normalized by the max).
  - `size` outside 1–30 → 400 `fields.size`; unknown movie → 404 `MOVIE_NOT_FOUND`; non-positive `{id}` → 400.
  - Logged in: watched and disliked movies are also excluded.
  - Q23's "no genres or people → same-genre top IMDb, otherwise `[]`" follows from the scorer. A movie with genres but no people gets same-genre movies ranked mostly by IMDb rating; a movie with neither gets `[]`.
- **`recommendation.api.RecommendationController`:** `GET /api/v1/recommendations?page&size` (login required, `read` user rate limit) and `GET /api/v1/movies/{id}/similar?size` (public, JWT optional, IP `public` limit). No security changes were needed.
- **Config:** `RecommendationProperties` (`@ConfigurationProperties("recommendation")`, registered with `@EnableConfigurationProperties` on `RecommendationService`) plus `similar.default-size` / `similar.max-size`. Every key listed below was added to `application.properties`.
- **Deleted** (moved to the scratchpad under `phase8-removed/`): the old `RecommendationController` (`/recommendations/me`, `/recommendations/similar/{id}`), the old `RecommendationService`, `RecommendationItem`, `RecommendationResponse`, `RecommendationCandidateRepository`, and the Phase 7 `ForYouHomeAdapter`.
- **For Phase 9 (PRD):** document the two clarifications above, the liked-movie exclusion and the reason rule.

**Covers:** Q22, Q23, R-1…R-9 (R-2 negative signals deferred), C-1 usage.

**Create:**
- `recommendation/application/RecommendationService`:
  1. **Signals** from Activity (Q22 weights: rating ≥ 8 → +3, 7–7.9 → +2, like +2, watched +1, watchlist +1; activity in the last 90 days ×1.5).
  2. **Profile:** the signals' weights are passed on to each signal movie's genres, languages, actors (all) and directors, using `catalog.getFeatures`.
  3. **Candidates:** about 300 from `RecommendationRepository`. Excluded: watched, watchlist, rated, disliked.
  4. **Score** = `0.4·genre + 0.3·people + 0.1·language + 0.2·imdb/10`, with each component normalized 0–1; ties broken by IMDb votes.
  5. **Reason** per item: "Because you liked *X*" / "More with *Person*" / "Matches your taste in *Genre*".
  6. **Cold start** (< 3 signal movies): Top Rated by Users, falling back to IMDb Top 250, with reason "Popular on CineSmart".
  7. **Output:** paged `RecommendationCard` (MovieCard + `reason`).
- `recommendation/application/SimilarService`:
  - scored against a single movie; logged-in users also exclude watched and disliked
  - movie with no genres or people → same-genre top IMDb, otherwise `[]`
  - unknown movie ID → 404
- `recommendation/api/RecommendationController` (`GET /recommendations?page&size`, `GET /movies/{id}/similar?size`).

**Delete:** `RecommendationItem` (full movie), `RecommendationResponse`, the old candidate SQL, `/recommendations/me`, `/recommendations/similar/{id}`, the Phase 7 adapter.

**Config:**
- `recommendation.weight.rating-high=3`, `.rating-mid=2`, `.like=2`, `.watched=1`, `.watchlist=1`
- `recommendation.recent-days=90`, `.recent-multiplier=1.5`
- `recommendation.candidate-limit=300`, `.cold-start-min-signals=3`
- `recommendation.score.genre=0.4`, `.people=0.3`, `.language=0.1`, `.imdb=0.2`
- `similar.default-size=10`, `similar.max-size=30`

**DB:** none. **Risks:** score tuning is subjective; every weight is a setting.

**Check:**
- A new user → "Popular on CineSmart".
- Like 3 Nolan films → Nolan-related results with "More with Christopher Nolan".
- `GET /movies/{id}/similar` anonymous; `/movies/999999/similar` → 404.
- `/home` For You row matches `/recommendations` page 0.

---

### Phase 9: PRD update  `[x]` (done 2026-10-12; PRD only, no Java/config/DB change; `compile` still passes)
**As built:**
- **Only `CineSmart-Product-Requirements-and-System-Design.md` changed.** New sections and replaced ones are marked *(as built)*, and a header note says those win over older wording.
- **Every `(+9)` item in §D is in the PRD:**

  | Item | Where in the PRD |
  |---|---|
  | Q1, Q2, Q3, Q4, Q5, Q6, Q8, Q9 | §5 Authentication; use cases 2, 3, 17; Identity Domain Rules / API / Application Logic |
  | Q7 | §21 "API Overview" table + the per-module tables |
  | Q12, Q13 | the "Movie Analytics Aggregation" section (table, m = 5, 1 h + startup, advisory lock, write scope) |
  | Q14, Q15 | §9, Design notes, Activity Domain Rules / API |
  | Q17, Q18, Q19, Q20, Q21 | §3, §4, §13–§15, use cases 13, 14, 16, 18; Discovery tree / rules / contract / results |
  | Q22, Q23 | §11, §12, §18; Recommendation Domain Rules, including both Phase 8 clarifications (liked movies are excluded; reason rule) and Future (negative signals, Redis cache) |
  | Q24, Q25 | NFR "Appropriate Responses" (error shape + codes, including `FORBIDDEN`) and the new "Reliable When Redis Is Down" |
  | Q26 | Architecture Boundaries (+ Analytics, Shared, package tree, dependency rule), Final Boundary Map boxes |
  | Q27 | Optional A/B marked "next phase" |
  | Q28 | §21 CORS table + login response |
  | ER diagram | replaced the two fused diagrams with one that matches the schema file (`user_reaction` + `reacted_at`, new analytics columns, `is_verified`, `availability`, `top10`, no `user_like`) |

  Q11 stays a known gap: §16 notes country/awards as not returned, and §27 lists them under future work.
- **Choices where change.md was silent:**
  - The "Based on your watchlist" row was removed together with the Q23 rows; the watchlist feeds For You instead.
  - Rate-limit groups follow B.6.1.
  - The year range 1888–2100 (Phase 7) is documented.
  - "Already Watched" was removed as a logged-in menu item, because Q15 says watched isn't displayed.
  - The original "Recommendation → Discovery criteria" data flow is kept as history, marked "not used", with the as-built flow next to it.
  - Discovery's DB access list now shows `top10` and drops `availability` (cards have no availability).
- **For later:** nothing in code depends on this phase. The PRD now describes the as-built API, so the Postman rebuild (§F) and the frontend can use it as the contract.

**Covers:** every `PRD` / `BOTH` action in change.md: Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q12, Q13, Q14, Q15, Q17, Q18, Q19, Q20, Q21, Q22, Q23, Q24, Q25, Q26, Q27, Q28. Q11 stays a known gap.

**Change:** `CineSmart-Product-Requirements-and-System-Design.md` only:
- auth rules + login table
- forgot/verify flows, session model
- API tables (replacing the "conceptual" hierarchies)
- profile, username/email rules
- `movie_analytics` columns, m = 5, 1 h job + on startup
- `user_reaction` model, `/me` endpoints
- pagination rule, `MovieCard`, Discovery contract
- browse menu (drop actor/director), home sections table
- recommendation algorithm (+ Future: negative signals, Redis cache)
- similar titles, with the "Because you liked X" / actor / director rows removed
- Redis failure table, error shape + codes
- boundary map with `shared` + `analytics` and the dependency rule
- tests/health marked as next phase
- CORS + login response
- ER diagram updated (drop `user_like`, add analytics columns, `reacted_at`)

**Check:** read-through; every change.md item tagged PRD/BOTH is ticked in §D.

---

## D. Traceability: every change.md item → phase

| Item | Phase | | Item | Phase |
|---|---|---|---|---|
| Q1 login errors / lockout | 3 (+9) | | B-1 lock check before auth | 3 |
| Q2 forgot = email only | 3 (+9) | | B-2 search regex | 1 |
| Q3 hashed tokens, 10 min / 24 h | 3 (+9) | | B-3 Spring 4xx keep status | 0 |
| Q4 frontend email links | 3 (+9) | | B-4 orchestration/recommendation errors | 0 |
| Q5 IP rate limits, trust-proxy | 3 (+9) | | B-5 analytics overflow | 2 (done by V019) + 5 |
| Q6 access + refresh tokens | 3 (+9) | | B-6 X-Forwarded-For trust | 3 |
| Q7 path convention | 3, 4, 6, 7, 8 (+9) | | B-7 reset link target | 3 |
| Q8 /me, change password/email | 3 (+9) | | B-8 reset token stores userId | 3 |
| Q9 case-insensitive, username rule | 2 (DB) + 3 (+9) | | B-9 movie-exists check | 6 |
| Q10 details response | 4 | | B-10 stop swallowing DB errors | 1 |
| Q11 country/awards | none (NONE) | | B-11 `IO.println` | 0 |
| Q12 analytics table + job | 2 (done by V019) + 5 (+9) | | B-12 hash in `toString` | 1 (class deleted in 3) |
| Q13 scheduler, advisory lock | 5 (+9) | | B-13 LIKE escape | 1 |
| Q14 reaction model, timestamps | 2 (done by V020) + 6 (+9) | | B-14 200 `[]` not 204 | 1 + 6 |
| Q15 /me lists | 6 (+9) | | C-1 `getMoviesByIds` | 4 |
| Q16 per-user rate limits | 6 | | §8 secrets → env, `.env.example` | 0 |
| Q17 pagination | 0 (wrapper) + 6, 7 (+9) | | §8 show-sql dev only | 0 |
| Q18 movie card | 0 (builder) + 6, 7, 8 (+9) | | §8 email after commit | 3 |
| Q19 search + browse | 7 (+9) | | §8 dead code | 0 |
| Q20 /genres, /languages | 4 (+9) | | §8 one `@Transactional` | 0 |
| Q21 home rows | 7 (+9) | | Legacy `movie` columns (clarification) | 2 (V022) |
| Q22 For You algorithm | 8 (+9) | | `database_status.sql` | 2 |
| Q23 similar titles | 8 (+9) | | Root schema + `Schema.sql` mirror | 2 |
| Q23b manual migrations | 2 | | | |
| Q24 Redis failure behaviour | 3 (+9) | | | |
| Q25 error/response format | 0, 6 (+9) | | | |
| Q26 module structure | 0, finished by 7 (+9) | | | |
| Q27 tests/health deferred | 0 (remove test, slim Redis check) (+9) | | | |
| Q28 CORS + login response | 0 (CORS), 3 (response) (+9) | | | |

**Deferred (not implemented):** tests, Actuator, recommendation Redis cache, negative recommendation signals, country/awards, delete account, browse by actor/director, extra recommendation rows.

---

## E. Before you run migrations (Phase 2)

**Only V022 is left to run.** V019, V020 and V021 are already in your DB.

1. **Back up.** `pg_dump` is installed, just not on PATH. In PowerShell:
   ```powershell
   & "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -h localhost -p 5432 -U postgres -d Test -Fc -f "E:\cinesmart_backup_2026-10-12.dump"
   ```
   It prompts for the `postgres` password. As an alternative, pgAdmin → right-click the DB → **Backup…** (Custom format) runs the same tool.
2. **Pre-check (info only):** shows how many values V022 will discard.
   ```sql
   SELECT COUNT(*) FROM movie WHERE global_rating IS NOT NULL OR global_reaction_count <> 0;
   ```
3. **Run:** `V022__movie_drop_legacy_rating_columns.sql`. It's one transaction, so it either applies fully or not at all, and running it again is harmless.
4. **Verify** (should return 0 rows):
   ```sql
   SELECT column_name FROM information_schema.columns WHERE table_name = 'movie' AND column_name LIKE 'global%';
   ```
5. **Undo:** re-add the columns with the SQL in the file header. The old values only come back from the backup:
   `pg_restore -d Test --clean --if-exists E:\cinesmart_backup_2026-10-12.dump`

---

## F. Manual tasks for you

- [ ] **Back up and run V022** (§E) after Phase 2. The app also starts without it.
- [ ] **Rotate the JWT secret.** The committed one is `jwt.secret` in `application.properties`. Generate a new 32-byte Base64 value, e.g. `[Convert]::ToBase64String((1..32 | % {Get-Random -Max 256}) -as [byte[]])`.
- [ ] **Rotate the SMTP (Ethereal) password.** The committed one must be treated as leaked.
- [ ] **Set env vars** (copy `Cinesmart-Backend/.env.example`):
  - `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`
  - `JWT_SECRET`
  - `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`
  - `REDIS_HOST`, `REDIS_PORT`
  - `FRONTEND_BASE_URL` (default `http://localhost:5173`), `FRONTEND_ORIGINS` (default `http://localhost:5173`)
  - Remove `APP_BASE_URL`.
  - For local Postman testing, run with `SPRING_PROFILES_ACTIVE=dev` (SQL logging, non-Secure refresh cookie).
- [ ] **Rebuild the Postman collection.** Every old path is removed (see each phase's endpoint list). Add a `refresh_token` cookie step and a pre-request script that stores `accessToken`.
- [ ] **Optional (Q13 clarification):** create a dedicated app role so the app can't write catalog tables:
  ```sql
  CREATE ROLE cinesmart_app LOGIN PASSWORD '<new>';
  GRANT CONNECT ON DATABASE "Test" TO cinesmart_app;
  GRANT USAGE ON SCHEMA public TO cinesmart_app;
  GRANT SELECT ON movie, person, movie_role, movie_person, genre, movie_genre, language, movie_language, availability, top10 TO cinesmart_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON app_user, watchlist, already_watched, user_rating, user_reaction, movie_analytics TO cinesmart_app;
  ```
  Then point `SPRING_DATASOURCE_USERNAME` at it.
- [ ] **ETL follow-ups** (Data_Ingestion was not edited):
  - The ETL must **not** rely on the `create_movie_analytics` trigger (already dropped by V019). New movies get their analytics row from the next hourly run or the next app start.
  - The ETL must not write `movie.global_rating` / `global_reaction_count` (dropped by V022). A grep found no use.
  - `top10` sync (`DELETE` + `INSERT`) stays as it is; trending order is decided by the backend (IMDb rating).
  - `movie_person` has no billing order. If "top 5 billed cast" ever matters, the ETL would need to store an order column.
- [ ] **After deployment:** set `app.trust-proxy=true` only behind a proxy that overwrites `X-Forwarded-For`.

## G. Data impacts to expect

- **Reactions:** existing reactions already have `reacted_at` = the V020 run time (1 row).
- **Ratings:** existing `rated_at` values are unchanged; they update on the next rating change.
- **Email links:** outstanding verification and reset links stop working (old raw-token keys aren't hashed). Users request new ones.
- **Sessions:** all users are logged out once in Phase 3 (new token model and checks). There is no refresh cookie yet, so everyone logs in again.
- **Emails:** existing emails were already lowercased by V021; display usernames are unchanged.
- **Analytics:** `movie_analytics` values are recomputed on the first app start after Phase 5. Until then, platform stats read 0/NULL (as they do now after V019).
- **Legacy columns:** the `movie.global_rating` and `global_reaction_count` values are discarded by V022 (unused).
