# CineSmart Backend — Assessment vs PRD & System Design

**Scope:** `Cinesmart-Backend/src/**` compared with `CineSmart-Product-Requirements-and-System-Design.md` (DB schema files used only to confirm column types).
**Out of scope:** frontend code and the ETL pipeline. Backend items the frontend will need are listed in §5.
**Legend:** ✅ matches · 🟡 partial / differs · ❌ missing · 🐞 bug

---

## 0. TL;DR

- **Solid:** signup and email verification, JWT login and logout (Redis blacklist), Redis failed-login lockout, password reset (single-use, expiring), watchlist / watched / rating / reaction CRUD with DB upserts, full movie details, logged-in user state on the details page, and a basic recommendation flow with exclusions.
- **Biggest gaps:** no real paginated `/movies/search` with combined filters and sort, no search by person name, and no IMDb Top 250, most-rated, most-liked or top-rated-by-users lists. The home page ignores the `top10` trending table. The analytics batch does not follow the PRD (no like/dislike split, no weighted rating). There is no change password, change email or profile, no "similar titles" list, and no per-user rate limiting.
- **Bugs to fix first:** locked accounts probably get a **500**; `/movies/search/page` **always returns 500**; movie details for an unknown ID return **500**; the catch-all handler turns *every* Spring 4xx (unknown URL, wrong method, bad param) into a **500**; analytics **overflows on a 10.0 average**, so the whole batch stops; the password-reset link points to a POST-only backend URL; `X-Forwarded-For` spoofing lets anyone bypass the IP block or block other people's IPs.

---

## 1. Current endpoint inventory (what the code exposes)

| Module | Method & path | Auth | Notes |
|---|---|---|---|
| Identity | `POST /api/v1/auth/register` | public | signup |
| Identity | `GET /api/v1/auth/email-verification/verify?token=` | public | verify email |
| Identity | `GET /api/v1/auth/email-verification/resend?username=` | public | resend verification |
| Identity | `POST /api/v1/auth/login` | public | returns `{token,msg}` |
| Identity | `POST /api/v1/auth/logout` | JWT | blacklists token in Redis |
| Identity | `GET /api/v1/auth/me` | JWT | **stub**: returns `"you are logged in "` |
| Identity | `POST /api/v1/auth/password/forgot` | public | needs **username + email** |
| Identity | `POST /api/v1/auth/password/reset` | public | `{resetTicket,newPassword}` |
| Catalog | `GET /api/v1/movies/{id}` | public | full movie |
| Catalog | `GET /api/v1/movies/top10` | public | from `top10` table |
| Discovery | `GET /api/v1/movies/search` | public | **entire catalog, unpaginated** |
| Discovery | `GET /api/v1/movies/search/genre/{id}` · `/language/{id}` · `/year/{y}` · `/genre-name/{n}` · `/language-name/{n}` · `/keyword/{kw}` | public | unpaginated lists, 404 when empty |
| Discovery | `GET /api/v1/movies/search/page?keyword&page&size` | public | 🐞 always 500 (see §4) |
| Orchestration | `GET /api/v1/movies/orchestration/home` | optional JWT | featured + topRated (+ recommendations) |
| Orchestration | `GET /api/v1/movies/orchestration/movies/{id}` | optional JWT | movie + user state |
| Orchestration | `GET /api/v1/movies/orchestration/search?query&limit` | public | LIKE + trigram, max 30, no paging |
| Activity | `POST /api/v1/auth/user/watchlist/add-movie/{id}` · `POST .../remove-movie/{id}` · `GET .../watchlist` | JWT | GET returns IDs only; 204 when empty |
| Activity | `POST /api/v1/auth/user/already-watched/add-movie/{id}` · `POST .../remove-movie/{id}` · `GET` | JWT | same pattern |
| Activity | `POST /api/v1/auth/user/ratings/add-movie/{id}` · `GET` · `GET /v2` · `GET /movie/{id}` · `DELETE /movie/{id}` | JWT | `/movie/{id}` returns the full user state for that movie |
| Activity | `POST/GET/DELETE /api/v1/auth/user/likes/{id}` · `GET /likes` · `GET /likes/liked-movies` · `GET /likes/counts` | JWT | `/counts` = counts for all movies, unpaginated |
| Recommendation | `GET /api/v1/recommendations/me?limit` | JWT | 1–30 items |
| Recommendation | `GET /api/v1/recommendations/similar/{movieId}` | JWT | returns **one** item |

---

## 2. Where PRD and code agree ✅

| Area | PRD requirement | Code |
|---|---|---|
| Stack | Spring Boot, PostgreSQL, REST, layered api/application/domain/persistence | ✅ Spring Boot 4.1, Java 25, modules split into api/application/domain/persistence |
| Modular monolith | Identity, Catalog, Activity, Discovery, Recommendation | ✅ one package per boundary (plus an extra `master_orchestration`) |
| Catalog read-only | Spring never writes catalog tables | ✅ JPA entities are `@Immutable`; reads use JDBC |
| Signup | username + email + password, email format, no duplicate username or email | ✅ `@Email` and size checks, `existsBy…`, and a DB unique-constraint fallback |
| Password hashing | never plaintext | ✅ BCrypt |
| Email verification | link emailed; account cannot log in until verified | ✅ Redis token (10 min) and `isEnabled()=verified` |
| Login identity | backend identifies the user from the token, never from client input | ✅ every activity endpoint reads `userId` from the JWT claim |
| Failed-login lockout | 5 failures → 1 h lock in Redis, counter cleared on success | ✅ `RedisLockoutService` (atomic Lua INCR+EXPIRE) and success listener |
| Logout | token invalidated through Redis | ✅ SHA-256 hashed token blacklist with TTL; checked in `JwtDecoder` |
| Password reset | single-use, expiring, same response whether or not the account exists | ✅ `getAndDelete` (atomic single use), 10 min TTL, silent on unknown account |
| Watchlist / watched | add, remove, view; no duplicates; timestamp stored | ✅ `ON CONFLICT DO NOTHING`, PK (user, movie), DB default timestamp |
| Rating | 1–10, one per user and movie, re-submitting updates | ✅ `@DecimalMin 1 / @DecimalMax 10`, `ON CONFLICT DO UPDATE` |
| Rating removal | existing rating can be removed | ✅ `DELETE /ratings/movie/{id}` |
| Reaction | one per user and movie, change, remove | ✅ upsert and delete |
| Repeated clicks | the same request repeated has no extra effect | ✅ upserts are idempotent (but see "rate limit" in §3) |
| Own state shown live | user's own rating and reaction read live | ✅ orchestration details and `/ratings/movie/{id}` |
| Movie details | poster, title, year, runtime, plot, studio, IMDb, RT, metascore, genres, languages, cast/crew, availability, platform aggregates | ✅ mostly (see §3 for missing fields and shape issues) |
| Where to watch | platform, type and link | ✅ `availability` returned on details and cards |
| Logged-in details state | show the current watchlist, watched, rating and reaction state | ✅ `UserMovieState` |
| Fuzzy search | `pg_trgm`, min 3 chars | 🟡 trigram `word_similarity` is used and min 3 is enforced, but only on titles |
| Recommendation inputs | watchlist, likes, ratings ≥ 7 | ✅ used as seeds |
| Recommendation exclusions | watched and watchlist excluded | ✅ (dislikes are **not** excluded, see §3) |
| Cold start | no activity → popular list | ✅ `popular-fallback` (by IMDb rating) |
| Recommendation module separation | separate module, can be extracted later | ✅ separate package that calls other modules through services |

---

## 3. Differences — PRD says vs code does 🟡

### 3.1 Identity & Access

| # | PRD says | Code does |
|---|---|---|
| I-1 | Every invalid login gets the **same generic error** (wrong password, unknown user, unverified) | Unverified accounts get **403 "Account is not verified"**. Spring checks this before the password, so anyone can confirm an unverified username. Locked accounts get a separate 423 message (or a 500, see 🐞 B-1). |
| I-2 | Forgot password: user enters **email only** | Requires **username + email**, and both must match |
| I-3 | Reset token **stored hashed** | Stored in plain text inside the Redis key (`reset:token:<uuid>`) |
| I-4 | Reset link opens a **form** to set the new password | The link is `APP_BASE_URL/api/v1/auth/password/reset?token=…`, a **POST-only** backend endpoint, so clicking it fails. It should point to a frontend route. |
| I-5 | IP-based **rate limiting** | Only an IP *block* after 10 failed logins. No general request rate limiting. |
| I-6 | Session expires after **2 h of inactivity** | JWT has a fixed **1 h** expiry, with no refresh or sliding session |
| I-7 | Endpoints `/auth/signup`, `/auth/email/verify` (POST), `/auth/password/forgot`, `/auth/password/reset` | `/auth/register`, `GET /auth/email-verification/verify`, plus an extra `/resend`. Naming differs (the PRD calls its names "conceptual"). |
| I-8 | Failed attempts counted for **every** invalid login | Only `BadCredentials` events are counted. Unverified and locked attempts are not. |

### 3.2 Movie Catalog

| # | PRD says | Code does |
|---|---|---|
| C-1 | Catalog API: `getMovie(id)` **and `getMoviesByIds(ids)`** | Only single-movie lookup, so Recommendation runs **6 queries for each movie** (N+1) |
| C-2 | Analytics fields: `like_count, dislike_count, rating_count, global_rating, weighted_rating, updated_at` | Table and DTO only have `global_user_rating` and `global_reaction_count` (likes and dislikes **combined**, and NEUTRAL counted too) |
| C-3 | Details show "number of user ratings/likes" | No rating count; likes and dislikes are not separated |
| C-4 | Details show **Country**, awards | ❌ no column or field (schema gap) |
| C-5 | Genres and languages as data | Returned as a **comma-joined string** (`"Action, Drama"`), so the frontend cannot link them to browse pages |
| C-6 | Cast and director as people | `crew` = `{name, role}`. The SQL selects `personId` but the DTO drops it, so you cannot browse by actor. |
| C-7 | Top 10 trending belongs to **Discovery** (homepage) | Lives in the Catalog controller (`/movies/top10`), returns no aggregates, has no defined order (the `top10` table has no rank column), and is **not used on the home page** |

### 3.3 Movie Analytics batch

| # | PRD says | Code does |
|---|---|---|
| A-1 | Full recompute and **upsert** (`INSERT … ON CONFLICT`); zeros for movies with no activity | `UPDATE` on existing rows only. It depends on a DB trigger to create rows, so movies inserted before the trigger existed never get analytics. |
| A-2 | Every **6 h** [confirm] | Every **1 h** (`movie.analytics.refresh-ms`, default 3600000) |
| A-3 | `weighted_rating` (Bayesian) for top-rated lists | ❌ not computed |
| A-4 | Separate like and dislike counts | ❌ one combined count |
| A-5 | Runs in "[Spring scheduler / Python ETL — confirm]"; app runtime only reads | It runs in Spring and **writes** `movie_analytics`. Decide which you want. |
| A-6 | Failed run keeps the previous values | Yes, but failures are logged as "schema unavailable", which hides real errors (see 🐞 B-5) |

### 3.4 User Movie Activity

| # | PRD says | Code does |
|---|---|---|
| U-1 | REST shape `/movies/{id}/watchlist` POST/DELETE, `/rating` PUT/DELETE, `/reaction` PUT/DELETE, `/me/...` GET | `/api/v1/auth/user/watchlist/add-movie/{id}`, **remove via POST** not DELETE, ratings `add-movie` via POST. Everything sits under `/auth/`, which is the wrong boundary. |
| U-2 | Reaction is **LIKE or DISLIKE**; removing deletes the row (PRD design notes say a `user_like` boolean) | DB and API use `user_reaction` VARCHAR with **LIKE / DISLIKE / NEUTRAL**. NEUTRAL duplicates DELETE. |
| U-3 | Reaction timestamp `liked_at` stored | ❌ no timestamp on `user_reaction` |
| U-4 | Rating timestamp stored and updated | `rated_at` set on insert only; **not updated** when the rating changes |
| U-5 | "Check movie reference" before insert | No check. An unknown movie hits an FK violation and returns **500** "could not be updated" instead of 404. |
| U-6 | Activity endpoints **rate-limited per user (Redis)** | ❌ none |
| U-7 | `/me/activity` (combined activity) | ❌ none (per-movie state exists, but no combined view) |
| U-8 | View watchlist "with posters" | Returns **only movie IDs**, and **204 No Content** when empty (should be 200 `[]`) |
| U-9 | Check watchlist / watched status | Done by loading the user's *whole* list and calling `contains()`. `existsByUserIdAndMovieId` exists but is unused. |

### 3.5 Discovery

| # | PRD says | Code does |
|---|---|---|
| D-1 | **One** `GET /movies/search` with `title, person, year, genre, language, sort, page, size`, filters combinable | Separate path-variable endpoints, **one filter at a time**, no sort, no paging (except the broken `/page`) |
| D-2 | Search titles **and person names** | Titles only. A `person` trigram index exists in the DB but is unused. |
| D-3 | Paginated, max **20** (Discovery) / **30** (search section). The PRD contradicts itself; pick one. | `/page` caps at 100 (and is broken). Orchestration search caps at 30 with no page info. Other lists are unbounded. `GET /movies/search` returns the **entire catalog**. |
| D-4 | Result = `movieId, title, poster, releaseYear, globalRating, likeCount, dislikeCount` | `DiscoveryMovieDto` = `movieId, title, year, plot, poster, imdbRating`: no platform aggregates, and `plot` is extra |
| D-5 | Page wrapper = `results, currentPage, pageSize, totalResults, totalPages` | Raw `List` or Spring `Page` object. No total counts on most endpoints. |
| D-6 | Empty result is a normal result | Discovery returns **404 "Movie was not found"** for an empty list |
| D-7 | Ranked by similarity | `/keyword` runs LIKE first (sorted alphabetically) and only falls back to trigram when LIKE finds nothing. Orchestration search mixes LIKE and similarity, then **re-sorts by IMDb rating**, so similarity order is lost. |
| D-8 | Reject unsupported or invalid params | Partly (`@Min`, `@Size`); there are no sort fields yet |
| D-9 | `GET /home` | `GET /movies/orchestration/home` (new `master_orchestration` module not in the PRD) |

### 3.6 Home page

| # | PRD says | Code does |
|---|---|---|
| H-1 | Top 10 **trending** (from `top10` table) | `featured` = top 10 by **IMDb rating**. The `top10` table is ignored. |
| H-2 | Popular on platform, Acclaimed, **Top Rated by website users**, **IMDb Top 250** (min-votes threshold) | Only `featured` (top 10 IMDb) and `topRated` (top 20 IMDb). No vote threshold, no platform-based lists. |
| H-3 | Avoid duplicates across sections | `featured` is **exactly the first 10 items of `topRated`** |
| H-4 | Logged-in: "For You" first | ✅ included for logged-in users (field order is up to the frontend) |
| H-5 | Total-count indicator per row | ❌ no totals |

### 3.7 Recommendation

| # | PRD says | Code does |
|---|---|---|
| R-1 | Weighted profile of genres, languages, actors and directors; candidates **scored by match** | Candidate = any movie sharing **any** genre or **any** person with **any** seed (common genres like "Drama" match nearly everything), sorted by **IMDb rating**. Score = IMDb rating. No real personalization. |
| R-2 | Negative signals: dislikes, ratings < 5 | ❌ ignored |
| R-3 | **Disliked movies never recommended** | ❌ not excluded |
| R-4 | Watched movies = positive signal (recent weighted higher) | Only excluded, never used as seeds |
| R-5 | Languages and directors considered | ❌ |
| R-6 | Output = ranked **movie IDs**; Catalog builds movies | Returns full `ResponseDto` per item (heavy) using N+1 catalog calls |
| R-7 | "Reasons" | Hard-coded text. "Matches preferred genres" is added whenever the movie has *any* genre. |
| R-8 | Similar titles: `GET /movies/{id}/similar`, list, scored on genre, cast, director, language; public | `/recommendations/similar/{id}` returns **a single item**, **needs login**, and is not scored |
| R-9 | "Because you liked X", "More starring actor", "Because you like this director" | ❌ |

---

## 4. Missing entirely ❌

**Identity:** change password (logged in) · change email · real profile `/me` (username, email, created_at) · session inactivity expiry and refresh token · unlock account (admin) · general IP rate limiting.

**Catalog:** `getMoviesByIds` · country / awards fields · list of all genres · list of all languages · person lookup (actor/director pages).

**Discovery:** combined filter search · person search · sort options · IMDb Top 250 (`/movies/imdb-top-250`) · most rated (`/movies/most-rated`) · most liked (`/movies/most-liked`) · top rated by users (weighted) · popular on platform · browse by actor / director · paginated result wrapper with totals.

**Activity:** `/me/activity` · per-user rate limiting · watched list with movie data · reaction timestamp.

**Analytics:** like and dislike split · rating count · weighted rating · `updated_at` · upsert.

**Recommendation:** real scoring and profile · negative signals · "because you liked X" and actor/director rails · similar-titles list.

**Non-functional:** CORS config · real tests (only one test exists; it prints, asserts nothing and needs a live DB) · health endpoint (Actuator) · secrets kept out of source.

---

## 5. Backend items the frontend will need

| Frontend need (from PRD UI sections) | Backend status | Needed |
|---|---|---|
| Call API from browser on another origin | ❌ no CORS | `CorsConfigurationSource` in `SecurityConfig` |
| Browse menu: list of genres, languages, years | ❌ | `GET /genres`, `GET /languages`, (`GET /years` or min/max) |
| Browse by actor / director | ❌ | person search, and `personId` in crew |
| Rows of 10 cards with arrows and **total count** | ❌ totals | paginated wrapper with `totalResults` on every list |
| Search bar results (poster, title, year, rating, likes) | 🟡 | unified paginated `/movies/search` with aggregates |
| Watchlist page **with posters** and **watched marker** | ❌ (IDs only) | `GET /me/watchlist` returning cards and a `watched` flag |
| Profile tab (user info) | ❌ stub | `GET /me` → username, email, createdAt |
| Header after login (show username) | 🟡 | include username/userId in the login response, or use `/me` |
| Details page genre/language chips that link to browse | 🟡 | return `[{id,name}]` instead of a comma string |
| Details page: "N ratings, N likes, N dislikes" | ❌ | analytics split (§3.3) |
| Similar titles at bottom of details | 🟡 | list endpoint, public |
| Email links land on frontend pages | 🐞 | verification and reset links should use a `FRONTEND_BASE_URL` route; frontend then POSTs the token |
| "Sign in" redirect when anonymous user clicks Add to Watchlist | ✅ | 401 JSON already returned |
| Consistent error JSON | 🟡 | 3 shapes today (`BackendError`, two `ApiError`s, plain strings); unify |

---

## 6. Code assessment (independent of the PRD)

### 6.1 Bugs 🐞 (fix first)

| # | Severity | Where | Problem |
|---|---|---|---|
| B-1 | High | `identity_and_access/application/AppUserDetailsService.java:27` | `LockedException` is thrown inside `loadUserByUsername`. Spring's `DaoAuthenticationProvider` wraps non-`UsernameNotFound` exceptions in `InternalAuthenticationServiceException`, which no handler maps, so **a locked user most likely gets a 500** instead of the locked message. (Confirm with Postman: 6 bad logins, then a 7th.) Fix: check the lock in `AuthService.login` before `authenticate()`. |
| B-2 | High | `discovery_movies/application/MovieDiscoveryService.java:67` | Regex `"[%_\\]"` = `[%_\]` is an **unclosed character class**, so `PatternSyntaxException` → **every `/search/page` call returns 500**. Use `"[%_\\\\]"` as on the keyword method. |
| B-3 | High | `api/BackendErrorHandler.java:16` | `@ExceptionHandler(Exception.class)` catches **all** Spring MVC exceptions. Unknown URL (`NoResourceFoundException`), wrong HTTP method, missing or invalid param, and malformed JSON all become **500** for controllers without their own advice (orchestration, recommendation). Extend `ResponseEntityExceptionHandler`, or handle `ErrorResponse` types first. |
| B-4 | High | `master_orchestration` | No exception advice. `MovieNotFoundException` on `/orchestration/movies/{id}` → **500**. A non-numeric id → 500. |
| B-5 | High | `MovieAnalyticsAggregationService.java:24` + schema | `global_user_rating` is `NUMERIC(3,2)` (max **9.99**). The first movie whose average is 10.0 causes `numeric field overflow`, the **entire UPDATE fails**, and the error is logged as "schema unavailable", so analytics silently stop for all movies. Use `NUMERIC(4,2)` and `ROUND(AVG(),2)`. |
| B-6 | High | `IpBlockingFilter.java:69`, `SecurityEventListener.java:57` | Trusts the client-sent `X-Forwarded-For`. An attacker rotates the header to dodge the IP block, or sends a victim's IP to **block the victim for 1 h on all endpoints**. Only trust XFF behind a known proxy (`server.forward-headers-strategy`). |
| B-7 | Medium | `PasswordResetService.java:67` | Reset link targets a POST-only API URL, so a GET from the email fails. |
| B-8 | Medium | `PasswordResetService` | Redis stores the *typed* email; `forgotPassword` matches case-insensitively, but `resetPassword` uses an exact `findByEmail`. A user who types a different letter case gets a 403 "Email is not valid" after the token is already consumed. Store `userId` instead. |
| B-9 | Medium | Activity add endpoints | Unknown movieId → FK violation → 500. Validate the movie first, or map FK errors to 404. |
| B-10 | Medium | `MovieRepositoryRead` | Every `DataAccessException` is swallowed and turned into `Optional.empty()`. **DB down → "Movie not found" 404**, and genres or crew silently become empty. Let infrastructure errors propagate. |
| B-11 | Low | `MovieRepositoryRead.java:120` | `IO.println` debug output left in a repository |
| B-12 | Low | `AppUserPrincipal.toString()` | Includes the password hash. It could end up in logs. |
| B-13 | Low | Orchestration search | `%` and `_` in the query are not escaped in the LIKE pattern |
| B-14 | Low | Activity GET lists | 204 on empty instead of 200 `[]`, which complicates the frontend |

### 6.2 Security / config

- **Secrets committed** in `application.properties` (`jwt.secret`, SMTP password). Move them to env vars and rotate both.
- `spring.jpa.show-sql=true` logs every query. Turn it off outside dev.
- `APP_BASE_URL` has no default, so the app fails to start without it (fine, but document it).
- Every authenticated request hits Redis (blacklist). If Redis is down, all JWT requests fail, and so does login. Decide on fail-open or fail-closed explicitly.
- Signup sends email inside the DB transaction. An SMTP failure rolls the user back (acceptable), but it holds a DB transaction open during network I/O.
- Username and email uniqueness is **case-sensitive** (`John` and `john` are both allowed).
- After a password reset, existing JWTs stay valid, and the lockout is not cleared.
- `/likes/counts` exposes counts for every movie, unpaginated (a heavy query that any logged-in user can call).

### 6.3 Design / structure

- **Three search implementations** (`/search/keyword`, `/search/page`, `/orchestration/search`) behave differently. Merge them into one Discovery search.
- **Inverted dependency:** Catalog (`MovieReadService`, `MovieRepository`) imports `discovery_movies.GeneralDtos.DiscoveryMovieDto`. Catalog should not depend on Discovery.
- `master_orchestration` is really "Discovery homepage + details". Either fold it into Discovery or document it as the BFF (backend-for-frontend) layer in the PRD.
- Activity controllers live under `/api/v1/auth/...`, which is Identity's namespace.
- Duplicate classes: two `ApiError` records, two `MovieNotFoundException` classes, three error-response formats.
- Discovery JPA entities: `Genre` and `Movie` both declare `@JoinTable` (two owning sides), `Genre` overrides `equals` without `hashCode`, and `Movie.equals` uses a nullable `imdbId`. Harmless while read-only, but messy. The JPA graph is only used for JPQL projections; JDBC (as in Catalog) would be simpler and consistent.
- `UserRatingController` injects 4 services to build user state, while orchestration builds the same state again. Keep one.
- `/ratings` and `/ratings/v2` return the same data in two shapes.
- Mixed `jakarta.transaction.Transactional` and Spring `@Transactional`. Pick Spring's.
- Naming inconsistencies: `persistance` vs `persistence`, `Security` vs `security` package casing, `ForgotPasswordRequestdto`, `AuthenticatedUserdto`.

### 6.4 Performance

- `GET /movies/search` (all movies) and the unbounded genre, language and year lists will not scale. Paginate everything.
- Recommendation: 12 candidates × 6 queries = ~72 queries per home-page load, and the full movie object is sent per card.
- Status checks load whole user lists (U-9).
- Orchestration `findTopRated` is fine. The trigram GIN index on `LOWER(title)` exists, but the LIKE-first path loses ranking.

### 6.5 Testing

- One `@SpringBootTest` that needs a real DB, prints output and has **no assertions**. No unit tests for services, lockout, reset, recommendation or validation. Start with Testcontainers (Postgres + Redis) integration tests for auth and activity.

---

## 7. Decisions you need to make (PRD open items / conflicts)

1. **Page size:** 20 (Discovery rules) or 30 (Search results section)?
2. **Reaction model:** keep `LIKE/DISLIKE/NEUTRAL` VARCHAR (current DB) or move to the PRD's boolean `user_like` with delete-to-remove? And add `reacted_at`?
3. **Analytics job:** Spring scheduler (current) or Python ETL? Interval 1 h (current) or 6 h (PRD)? Extend the `movie_analytics` schema to the PRD columns?
4. **Forgot password:** email only (PRD) or username + email (current)?
5. **Unverified login:** generic error (PRD) or the helpful "verify your email" message (current; leaks account state)?
6. **Session:** 1 h fixed JWT (current) or 2 h inactivity, which needs a refresh token or sliding expiry?
7. **API paths:** adopt the PRD's REST shape (`/movies/{id}/watchlist`, `/me/...`, `/home`, `/movies/search?…`) now, before the frontend is built, or keep the current paths?
8. **`master_orchestration`:** keep as a BFF layer or merge into Discovery?
9. **Country / awards:** add to schema and ETL, or drop from the PRD?
10. **Lockout threshold:** PRD marks 5 as [confirm]. The code uses 5 per user and 10 per IP.

---

## 8. Suggested implementation order

1. **Fix bugs** B-1 … B-10 and add CORS (small, unblocks everything).
2. **Unified Discovery search** with paging and totals (title + person, filters, sort) plus genre and language list endpoints.
3. **Analytics rework** (schema + upsert + like/dislike/rating counts + weighted rating) → unlocks Top Rated by Users, Most Liked, Most Rated.
4. **Home page** sections: trending (`top10`), IMDb Top 250 (vote threshold), Top Rated by Users, Most Liked, with no duplicates.
5. **Activity:** watchlist and watched with movie cards, movie-exists check, PRD REST paths, per-user rate limit.
6. **Identity:** `/me` profile, change password, change email, reset and verify links to the frontend, generic login error.
7. **Catalog:** `getMoviesByIds`, structured genres, languages and crew with IDs.
8. **Recommendation:** weighted profile scoring, negative signals, exclude dislikes, similar-titles list.
9. Tests, secrets out of source, Actuator health.
