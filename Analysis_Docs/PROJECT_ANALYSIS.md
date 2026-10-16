# CineSmart: An End-to-End Technical Learning Guide

> **What this is.** A study guide to the CineSmart codebase as it exists on 2026-10-14. It is based on reading the real repository.
> **What it is not.** It is not a refactor. I changed no project files. This document is the only file I created.
> **How to read the evidence labels:**
>
> | Label | Meaning |
> |---|---|
> | **[Verified]** | Read directly in the source, config, schema or a library artifact |
> | **[Inferred]** | Follows from the source, but was not executed or observed |
> | **[Version-dependent]** | True for the library versions found here; may differ in other versions |
> | **[Reported]** | Stated in a project document (e.g. `test-results.md`). I did not re-run it |
> | **[Unknown]** | Cannot be established from the repository |
>
> Source references use `path:line` (relative to the project root) wherever I checked the line, and `path` + symbol name elsewhere.

---

## Table of Contents

- [0. Scope, method and coverage checklist](#0-scope-method-and-coverage-checklist)
- **PART I: Understanding the Application**
  - [1. Project Overview](#chapter-1-project-overview)
  - [2. The Complete System Architecture](#chapter-2-the-complete-system-architecture)
  - [3. Repository and File Structure](#chapter-3-repository-and-file-structure)
  - [4. The User's Journey Through the Application](#chapter-4-the-users-journey-through-the-application)
- **PART II: Foundations and Technology Concepts**
  - [5. Web Application Fundamentals](#chapter-5-web-application-fundamentals)
  - [6. Java Language Concepts Used in the Backend](#chapter-6-java-language-concepts-used-in-the-backend)
  - [7. Spring Framework and Spring Boot Foundations](#chapter-7-spring-framework-and-spring-boot-foundations)
  - [8. React and Frontend Foundations](#chapter-8-react-and-frontend-foundations)
  - [9. PostgreSQL and Relational Database Foundations](#chapter-9-postgresql-and-relational-database-foundations)
- **PART III: Backend Architecture and Implementation**
  - [10. Backend Architecture](#chapter-10-backend-architecture)
  - [11. Application Startup and Spring Boot Initialization](#chapter-11-application-startup-and-spring-boot-initialization)
  - [12. Controllers and HTTP Request Handling (API inventory)](#chapter-12-controllers-and-http-request-handling)
  - [13. Services and Business Logic](#chapter-13-services-and-business-logic)
  - [14. Repositories, JDBC, JPA and Persistence](#chapter-14-repositories-jdbc-jpa-and-persistence)
  - [15. Java Object Lifecycle and Backend Runtime Behavior](#chapter-15-java-object-lifecycle-and-backend-runtime-behavior)
- **PART IV: Frontend Architecture and Implementation**
  - [16. Frontend Architecture](#chapter-16-frontend-architecture)
  - [17. Detailed React Component Walkthrough](#chapter-17-detailed-react-component-walkthrough)
  - [18. React Rendering, State, and Browser Behavior](#chapter-18-react-rendering-state-and-browser-behavior)
  - [19. Frontend API Client and Data Flow](#chapter-19-frontend-api-client-and-data-flow)
  - [20. Forms, Validation, and User Interaction](#chapter-20-forms-validation-and-user-interaction)
- **PART V: Database Design and Data Persistence**
  - [21. Database Schema and Data Model](#chapter-21-database-schema-and-data-model)
  - [22. From Java Objects to SQL and Back](#chapter-22-from-java-objects-to-sql-and-back)
  - [23. Transactions, Consistency, and Concurrency](#chapter-23-transactions-consistency-and-concurrency)
- **PART VI: Complete End-to-End Request Traces**
  - [24. Browser-to-Database Execution Traces](#chapter-24-browser-to-database-execution-traces)
  - [25. A Concrete Worked Example](#chapter-25-a-concrete-worked-example)
- **PART VII: Security, Reliability, and Performance**
  - [26. Authentication and Authorization](#chapter-26-authentication-and-authorization)
  - [27. Security Boundaries and Vulnerabilities](#chapter-27-security-boundaries-and-vulnerabilities)
  - [28. Errors, Validation, and Reliability](#chapter-28-errors-validation-and-reliability)
  - [29. Performance and Scalability](#chapter-29-performance-and-scalability)
- **PART VIII: Build, Configuration, Testing, and Deployment**
  - [30. Backend Build and Packaging](#chapter-30-backend-build-and-packaging)
  - [31. Frontend Build and Development](#chapter-31-frontend-build-and-development)
  - [32. Configuration and Environment Management](#chapter-32-configuration-and-environment-management)
  - [33. Tests and Verification](#chapter-33-tests-and-verification)
  - [34. Deployment and Runtime Topology](#chapter-34-deployment-and-runtime-topology)
- **PART IX: System Synthesis and Improvements**
  - [35. The Entire Application as One System](#chapter-35-the-entire-application-as-one-system)
  - [Cross-Layer Consistency Audit](#cross-layer-consistency-audit)
  - [36. Improvement Opportunities](#chapter-36-improvement-opportunities)
  - [37. Learning Roadmap](#chapter-37-learning-roadmap)
- [Appendix A: Authoritative references](#appendix-a-authoritative-references)

---

## 0. Scope, method and coverage checklist

### 0.1 How this analysis was done

1. **Inventory.** I listed every file except `node_modules`, `target`, `dist`, `.venv` and `.git` internals. Then I read every Java source file under `Cinesmart-Backend/src/main` (about 5,200 lines). I also read the test support classes, `pom.xml` and every `.properties` file, the root schema and the migrations V019–V022, the frontend `src` tree (about 11,600 lines including tests; all non-test, non-`ui/` code), the frontend build configs, the READMEs and the Python ETL's database code.
2. **Versions.** Frontend versions come from `Cinesmart-Frontend/node_modules/*/package.json`. Backend library versions come from the local Maven cache (`~/.m2`), which holds the versions that the Boot 4.1.1 parent most likely resolved. Run `mvn dependency:tree` to confirm them exactly.
3. **One library check.** I searched the installed `spring-security-crypto-7.1.1.jar` for its BCrypt length check (see §27.2, finding S-1).
4. **Nothing executed against your systems.** I ran no application code, tests, builds or database queries. Test outcomes are quoted from `Cinesmart-Backend/test-results.md` and `Cinesmart-Frontend/test-results/.last-run.json` and labelled **[Reported]**.
5. **Secrets.** I never printed secret values. Where files contain secrets (IDE run configurations, `.env` files), I name only the location.

### 0.2 Inventory snapshot

| Area | What exists | Size |
|---|---|---|
| Backend (`Cinesmart-Backend`) | Spring Boot 4.1.1, Java 25, 98 main Java files in 7 modules (`identity`, `catalog`, `discovery`, `activity`, `recommendation`, `analytics`, `shared`) | ~5,180 lines of main code; 29 test classes (~3,390 lines) |
| Frontend (`Cinesmart-Frontend`) | React 19.3 + TypeScript 5.9 + Vite 7.3 SPA, TanStack Query 5, React Router 7, react-hook-form + Zod, Tailwind 4 + shadcn/Radix | ~11,600 lines in `src` (incl. tests), 9 Playwright specs |
| Database (`Database`, root `Cinesmart_database_schema.sql`) | PostgreSQL schema (16 tables), migrations V001–V022 (manual, no Flyway), helper scripts | ~1,500 lines of SQL |
| ETL (`Data_Ingestion`) | Python 3.13 + psycopg 3 scripts that pull OMDb, TMDB and Watchmode data and write the catalog tables | ~1,470 lines of Python |
| Docs | PRD, `change.md` (28 decisions), `implementation-plan.md`, `frontend-contract.md` (the API contract), `frontend-plan.md`, `assessment.md`, `test-results.md` | — |

### 0.3 Coverage checklist (audited at the end, see §35.5)

| # | Item | Covered in |
|---|---|---|
| 1 | Every backend package and class | Ch. 10–15, 22 |
| 2 | All 36 HTTP endpoints | Ch. 12 (API inventory) |
| 3 | Every frontend route, page, hook and API module | Ch. 16–20 |
| 4 | All 16 tables, constraints and indexes | Ch. 21 |
| 5 | Redis key space (sessions, lockout, rate limits) | Ch. 13, 21.6, 26 |
| 6 | Config files and environment variables | Ch. 32 |
| 7 | Tests (backend unit/integration, frontend unit, e2e) | Ch. 33 |
| 8 | Cross-layer contracts | Cross-Layer Consistency Audit |
| 9 | Security, reliability and performance | Ch. 26–29 |
| 10 | Improvements, kept separate | Ch. 36 |

**Not fully covered (honest limits):**
- I did not read the shadcn primitives under `src/components/ui/*` line by line. They are generated library wrappers (about 1,200 lines).
- I read only the ETL's database layer and orchestrator. The API clients (OMDb, TMDB, Watchmode) were not studied.
- `src/features/dev/UiKitchenSink.tsx` is dev-only and was skipped.
- I did not read the PRD, `change.md`, `assessment.md` or `frontend-plan.md` in full. I used them only for intent and decision IDs.

---

# PART I — Understanding the Application

## Chapter 1: Project Overview

### 1.1 The problem it solves

CineSmart is a **movie discovery website focused on Canada**. It answers three questions:

1. *What should I watch?* Trending titles, IMDb's best, community favourites, and personal "For You" recommendations.
2. *Where can I watch it in Canada?* Streaming, rental, purchase and free availability per platform.
3. *What have I watched, liked and want to watch?* A personal watchlist, a watched list, ratings and likes/dislikes.

**[Verified]** The hero text in `Cinesmart-Frontend/src/features/home/HomePage.tsx` reads "Find your next movie, and where to watch it in Canada." `index.html` has the matching meta description.

### 1.2 Intended users and use cases

| User | Can do |
|---|---|
| **Anonymous visitor** | Browse all movies with genre/language/year filters; fuzzy search by title or person; view the four ranked lists; open movie details with Canadian availability and similar titles |
| **Registered, verified user** | Everything above, plus: watchlist, watched, rating (1.0–10.0), like/dislike, personal lists, profile, "For You" recommendations with a reason per pick, change password/email |
| **Operator (you)** | Runs the ETL to load and refresh the catalog, runs SQL migrations by hand, configures environment variables |

### 1.3 Implemented features (verified in code)

- **Identity:** signup, email verification, resend, login with lockout, rotating refresh tokens in an HttpOnly cookie, logout, forgot/reset password, change password, change email with confirmation, profile (`/me`).
- **Catalog:** movie details (crew split by role, platform stats, availability), genre and language lists.
- **Discovery:** browse with filters, trigram fuzzy search over titles and people, the ranked lists Trending / Top Rated by Users / Most Liked / IMDb Top 250, and a composed `/home` with de-duplicated rows.
- **Activity:** idempotent PUT/DELETE for watchlist, watched, rating and reaction; personal lists.
- **Recommendation:** a content-based taste profile ("For You") with recency weighting, a cold start fallback, reasons per pick, and "More like this".
- **Analytics:** an hourly batch that recomputes per-movie rating counts, averages, a Bayesian *weighted rating* and like/dislike counts.
- **Cross-cutting:** a uniform error body, Redis-backed rate limits per IP and per user, CORS, and Redis fail-open/fail-closed rules.

### 1.4 Inputs, outputs and observable behavior

- **Inputs:** HTTP requests from the SPA (JSON bodies, query parameters, a Bearer token, the `refresh_token` cookie), plus catalog data written to PostgreSQL by the ETL.
- **Outputs:** JSON responses; transactional emails over SMTP (Ethereal in development); rows in PostgreSQL; keys in Redis.
- **Observable lag:** platform stats and the Top Rated / Most Liked lists update **hourly** (batch job), not instantly. The UI says so (`DetailsSections.tsx`, "CineSmart stats update every hour.").

### 1.5 Responsibilities by tier

| Tier | Responsibility |
|---|---|
| React SPA | Rendering, routing, client-side validation, session restore and refresh coordination, caching (TanStack Query), optimistic updates |
| Spring Boot API | Authentication, authorization, validation, business rules, ranking and recommendation, rate limits, email, error format |
| PostgreSQL | Durable catalog and user activity, integrity constraints, trigram search indexes, derived `movie_analytics` |
| Redis | Short-lived security state: refresh sessions, email-link tokens, revocation, lockout counters, rate-limit windows |
| Python ETL | Loads and refreshes the catalog from OMDb, TMDB and Watchmode; maintains `top10` |

### 1.6 External dependencies and integrations

- **PostgreSQL** (version not pinned for production; tests use `postgres:18-alpine`), with the `pg_trgm` extension.
- **Redis** (tests use `redis:7-alpine`; per `final-stage-chat-prompt.md`, development runs Redis in Docker).
- **SMTP** (defaults to `smtp.ethereal.email:587` with STARTTLS).
- **OMDb, TMDB, Watchmode** (used by the ETL only; the backend never calls them).
- **External poster images** (OMDb/Amazon URLs loaded directly by the browser).

### 1.7 Known assumptions and limitations

- Catalog data is read-only for the backend; only the ETL writes it.
- Migrations are **manual**. `spring.jpa.hibernate.ddl-auto=validate` means the app refuses to start if the `app_user` table does not match the `AppUser` entity.
- There is no deployment configuration in the repository (§34).
- Recommendations are computed on every request; there is no cache.
- The backend README is out of date compared with the code (§36, item P-2).

### 1.8 Real-world relevance

The project uses production patterns:
- refresh-token rotation with reuse detection
- per-IP and per-user rate limiting
- a Bayesian average for ranking
- trigram fuzzy search
- module boundaries inside a monolith
- query caches keyed by viewer, with optimistic UI and rollback
- cross-tab session coordination with Web Locks and BroadcastChannel

These are the techniques used by streaming catalogs, e-commerce sites and SaaS dashboards.

---

## Chapter 2: The Complete System Architecture

### 2.1 System context diagram

```mermaid
flowchart LR
    U[User's browser<br/>React SPA :5173] -- "HTTPS JSON<br/>Bearer token + refresh cookie" --> API[Spring Boot API :8080<br/>/api/v1/**]
    API -- "JDBC (HikariCP)" --> PG[(PostgreSQL<br/>catalog + activity)]
    API -- "RESP (Lettuce)" --> R[(Redis<br/>sessions, tokens,<br/>counters)]
    API -- "SMTP STARTTLS :587" --> M[Mail server<br/>Ethereal in dev]
    U -- "GET image" --> IMG[OMDb / Amazon<br/>poster CDN]
    ETL[Python ETL<br/>Data_Ingestion] -- "psycopg" --> PG
    ETL -- HTTPS --> EXT[OMDb / TMDB / Watchmode APIs]
    M -. email link .-> U
```

**How to read it.** Solid arrows are network calls initiated at runtime. The browser talks **only** to the API (and to image hosts). The API is the only component that touches Redis and SMTP. PostgreSQL has **two writers**: the API (user tables, `movie_analytics`) and the ETL (catalog tables, `top10`). This shared-database integration is a deliberate simplification. It is also the reason the schema is the contract between two programs (§21).

### 2.2 Tier and module architecture

```mermaid
flowchart TB
    subgraph Browser["React SPA (Cinesmart-Frontend/src)"]
        R1[app/router.tsx<br/>routes + layouts]
        R2[features/*<br/>pages]
        R3[components/*<br/>UI building blocks]
        R4[query/*<br/>TanStack Query keys, options, cache patches]
        R5[session/*<br/>session store, refresh, guards]
        R6[api/*<br/>http.ts = the only fetch]
        R1-->R2-->R3
        R2-->R4-->R6
        R2-->R5
        R5-->R6
    end
    subgraph Backend["Spring Boot (ca.cinesmart)"]
        F[Servlet filter chain<br/>CORS → IpRateLimitFilter → BearerToken auth]
        I[HandlerInterceptor<br/>UserRateLimitInterceptor]
        C[@RestController<br/>*.api]
        S[@Service<br/>*.application]
        P[@Repository<br/>*.persistence]
        F-->I-->C-->S-->P
    end
    R6 -- fetch, credentials: include --> F
    P -- NamedParameterJdbcTemplate / JPA --> DB[(PostgreSQL)]
    S -- StringRedisTemplate --> RD[(Redis)]
```

### 2.3 Backend module dependency diagram (verified by imports)

```mermaid
flowchart LR
    identity --> activity
    identity --> shared
    activity --> catalog
    activity --> shared
    catalog --> shared
    discovery --> catalog
    discovery --> shared
    recommendation --> activity
    recommendation --> catalog
    recommendation --> discovery
    recommendation --> shared
    analytics
    shared -. SecurityConfig imports .-> identity
```

**Interpretation:**
- **Two inversions prevent cycles.**
  - `catalog` needs per-user flags (in watchlist? watched?), but those live in `activity`. So `shared/movie/UserMovieStateLookup.java` is an interface that `activity/application/UserMovieStateService.java` implements. Catalog depends on the interface, not on activity.
  - `discovery` needs the "For You" row, but `recommendation` already depends on `discovery` (for cold start). So `discovery/application/ForYouSource.java` is an interface that `RecommendationService` implements.
  This is the **Dependency Inversion Principle**: the module that needs a capability defines the interface, and the module that has the data implements it.
- **One upward dependency remains.** `shared/security/SecurityConfig.java` imports `identity.application.AccessTokenRevocationService`. So `shared → identity` and `identity → shared` form a package-level cycle. Spring resolves it fine at the bean level (no constructor cycle). But "shared" is not purely shared (§36, item A-3).
- `identity → activity` exists because `AccountService.profile` needs counts from `MyListsService`.

### 2.4 Canonical request–response sequence

```mermaid
sequenceDiagram
    participant B as Browser (React)
    participant H as api/http.ts
    participant T as Tomcat thread
    participant SF as Security filter chain
    participant MVC as DispatcherServlet
    participant Ctl as Controller
    participant Svc as Service
    participant Repo as Repository
    participant PG as PostgreSQL
    participant RD as Redis
    B->>H: user event → query/mutation
    H->>H: ensureFreshToken() (maybe POST /auth/refresh)
    H->>T: fetch(url, {Authorization, credentials:'include'})
    T->>SF: CorsFilter → IpRateLimitFilter (Redis INCR) → BearerTokenAuthenticationFilter
    SF->>RD: revocation checks (blacklist, tokens-valid-after)
    SF->>MVC: authenticated / anonymous SecurityContext
    MVC->>Ctl: UserRateLimitInterceptor → handler method (binding + validation)
    Ctl->>Svc: call with userId from JWT
    Svc->>Repo: JDBC / JPA calls (in @Transactional where declared)
    Repo->>PG: SQL
    PG-->>Repo: rows
    Repo-->>Svc: records
    Svc-->>Ctl: DTO/record
    Ctl-->>MVC: object → Jackson → JSON
    MVC-->>B: HTTP response (+ CORS headers)
    B->>B: TanStack Query cache update → React re-render
```

### 2.5 Data-flow diagram

```mermaid
flowchart LR
    OMDb & TMDB & Watchmode --> ETL --> |movie, person, genre, language,<br/>links, availability, top10| PG[(PostgreSQL)]
    User --> |PUT/DELETE activity| API --> |watchlist, already_watched,<br/>user_rating, user_reaction| PG
    PG --> |hourly batch SQL| AN[AnalyticsJob] --> |UPSERT movie_analytics| PG
    PG --> |cards, details, ranked IDs| API --> |JSON| User
    API <--> |sessions, tokens, counters| Redis
```

The key point: **user activity reaches the public lists in two hops.** Activity tables → hourly batch → `movie_analytics` → Top Rated / Most Liked / platform stats. Personal state (`userState`, card flags) is read live from the activity tables, so it is always current.

---

## Chapter 3: Repository and File Structure

### 3.1 Top level

```
CineSmart/                          (not a git repository; sub-projects have their own)
├── Cinesmart-Backend/              Spring Boot API (has its own .git, 3 commits, no remote)
├── Cinesmart-Frontend/             React SPA (no .git)
├── Database/                       Migrations, schema mirror, helper scripts
├── Data_Ingestion/                 Python ETL (has its own .git; only Scripts/ and Logs/ tracked)
├── Cinesmart_database_schema.sql   "The one up-to-date schema" (header comment)
├── Cinesmart_database_schema_info.md
├── CineSmart-Product-Requirements-and-System-Design.md  (PRD)
├── change.md, assessment.md, implementation-plan.md      (design decisions and history)
├── frontend-contract.md            The API contract the frontend was built against
├── frontend-plan.md                Frontend decisions and status
├── next-chat-prompt.md, final-stage-chat-prompt.md       (session hand-off notes)
└── .idea/, CineSmart.iml           IntelliJ project files
```

### 3.2 Backend tree

| Path | Purpose | Depends on | Used by |
|---|---|---|---|
| `pom.xml` | Maven build: Boot parent 4.1.1, Java 25, starters, test deps | Maven Central | Build |
| `src/main/resources/application.properties` | All runtime settings; secrets via `${ENV}` | Env vars | Spring Environment |
| `src/main/resources/application-dev.properties` | `dev` profile: SQL logging, non-Secure cookie | — | When `SPRING_PROFILES_ACTIVE=dev` |
| `.env.example` | Placeholder env vars (no real values) | — | You |
| `ca/cinesmart/CineSmartApplication.java` | Entry point, `@SpringBootApplication`, `@EnableScheduling` | — | JVM |
| `identity/{api,application,domain,persistence}` | Accounts, sessions, email flows | shared, activity | SecurityConfig, controllers |
| `catalog/*` | Movie details, card builder, genres/languages | shared | activity, discovery, recommendation |
| `discovery/*` | Browse, search, ranked lists, home | catalog, shared | recommendation (cold start) |
| `activity/*` | Writes and lists of user activity | catalog, shared | identity (/me counts), recommendation |
| `recommendation/*` | For You and similar titles | activity, catalog, discovery | discovery (via `ForYouSource`) |
| `analytics/*` | Hourly batch for `movie_analytics` | — | — |
| `shared/api` | Error model, paging records | — | everyone |
| `shared/movie` | `MovieCard`, `UserMovieState`, `UserMovieStateLookup` | — | catalog, activity, discovery, recommendation |
| `shared/ratelimit` | Redis fixed-window limiter, IP filter, user interceptor | shared.security, Redis | SecurityConfig, MVC |
| `shared/redis` | `StringRedisTemplate` bean, fail-closed helper, startup ping | Redis | identity, ratelimit |
| `shared/security` | Security filter chain, JWT encoder/decoder, CORS, IP resolver, filter error writer | identity (revocation) | Spring Security |
| `shared/util` | `RandomToken`, `TokenHasher` | JDK | identity |
| `src/test/**` | 29 test classes, Testcontainers support, seed SQL | Docker | `mvn test` |
| `target/` | Build output (compiled classes, surefire reports) | — | generated; ignored |
| `README.md` | **Out of date** (describes an older package layout and older endpoints) | — | — |

**Why the layering `api / application / domain / persistence` inside each module matters:** the package says what kind of code a class is (HTTP adapter, use case, data shape, data access), and the module says which business capability it belongs to. This is "package by feature, then by layer". You can see a feature's whole stack in one folder. The trade-off is that Java's package-private visibility is barely used (most classes are `public`), so the boundaries are a convention, not compiler-enforced (§36, item A-2).

### 3.3 Frontend tree

| Path | Purpose |
|---|---|
| `index.html` | HTML shell with `#root`, dark theme meta, loads `/src/main.tsx` |
| `src/main.tsx` | Installs the session manager, mounts `<App/>` in `StrictMode` |
| `src/app/App.tsx` | Providers: QueryClient, Tooltip, Router, Toaster, dev Query Devtools |
| `src/app/router.tsx` | Route table (data router, lazy pages, guards as layout routes) |
| `src/app/layouts/*` | `RootLayout` (session restore gate), `ShellLayout` (header/footer), `AuthLayout` (card), `RouteAnnouncer` (a11y focus) |
| `src/api/*` | `http.ts` (the only `fetch`), typed endpoint functions, `ApiError` |
| `src/session/*` | In-memory session store, refresh coordinator, cross-tab sync, guards, redirect safety |
| `src/query/*` | QueryClient defaults, query keys, query options, cache patching, watched-ID set |
| `src/features/*` | One folder per page area (auth, home, browse, search, lists, movie, my-lists, profile, errors, dev) |
| `src/components/*` | Reusable UI: `activity/` (action buttons), `movie/` (cards, rows, grids, pagination), `forms/`, `feedback/`, `layout/`, `ui/` (shadcn primitives) |
| `src/hooks/*`, `src/lib/*` | Small hooks (title, media query, page param, retry-after) and pure helpers (format, validation, rating, search rules) |
| `src/test/*` | Vitest setup, MSW handlers, render helper, fixtures |
| `e2e/*` | Playwright specs against the real backend |
| `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.prettierrc`, `components.json` | Toolchain |
| `dist/` | Production build output (generated) |
| `.env.example` / `.env.local` | Build-time `VITE_*` vars and e2e credentials (`.env.local` is git-ignored and holds test account passwords) |

### 3.4 Database tree

| Path | Status |
|---|---|
| `Cinesmart_database_schema.sql` (root) | Declared source of truth: "real schema (captured 2026-10-12) + V019–V022" |
| `Database/Schema.sql` | Exact mirror plus a trailing `ROLLBACK ;`. **Used by the test suite** (`TestcontainersConfiguration.SCHEMA`) |
| `Database/Migration/V001–V018`, `Movie_Analytics_Trigger.sql` | History. The header says they "don't rebuild the DB" (they drifted) |
| `Database/Migration/V019–V022` | Current incremental migrations, each wrapped in `BEGIN … COMMIT` |
| `Database/Scripts/*` | Status, view, schema-capture, seed and reset helpers. `reset_dev_database.sql` is **stale** (references a `user_like` table that does not exist and omits newer tables) |

### 3.5 What is absent

- **No migration tool** (Flyway/Liquibase). Migrations are applied by hand.
- **No Dockerfile, no docker-compose, no CI workflow, no reverse proxy or hosting config.**
- **No Spring Boot Actuator** (health/metrics), and no structured logging config.
- **No OpenAPI/Swagger spec.** `frontend-contract.md` is the human-written equivalent.
- **The backend's `application.properties` is git-ignored** (`Cinesmart-Backend/.gitignore`, line 3). A fresh clone of the backend repository therefore cannot start (§36, item B-3).

---

## Chapter 4: The User's Journey Through the Application

This chapter tells the story; Part VI traces the same flows at code level.

### 4.1 First visit (anonymous)

1. The browser loads `index.html` and the JS bundle. `main.tsx` calls `installSession()` and renders `<App/>`.
2. `RootLayout` → `AuthGate` shows `FullPageSplash` while it calls `restoreSession()`. That sends `POST /api/v1/auth/refresh` with the cookie, if any.
3. With no cookie, the backend answers **401**. The session becomes `anonymous` without a toast, and the routes render.
4. `HomePage` runs `useQuery(homeQuery('anon'))` → `GET /api/v1/home`. The backend returns sections (Trending, Top Rated, Most Liked, IMDb Top 250) with no duplicate movies. Card flags are `null` because the user is anonymous.
5. React renders a `MovieRow` per section. Scrolling a row near its end loads the next page of that list.

### 4.2 Sign up → verify → sign in

1. `/signup`: react-hook-form + Zod validate the username, email and password locally. Then `POST /auth/signup` → **201** with a message. The backend sends a verification email (Ethereal in dev).
2. The SPA navigates to `/login` with router state `{notice:'signed-up', email}` and shows "Check … for a verification link".
3. The email link opens `/verify-email?token=…`. `useTokenMutation` POSTs the token **exactly once** (it is single-use, and StrictMode would otherwise double-fire) → `POST /auth/email/verify` → 200 → "Email verified".
4. `/login` → `POST /auth/login` → 200 with `{accessToken, expiresIn:900, user}` and `Set-Cookie: refresh_token=…; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`. `completeLogin` stores the token **in memory only** and broadcasts it to other tabs. The SPA navigates to the `redirect` target.

### 4.3 Add to watchlist, rate, like

1. On `/movies/42`, the user clicks **Add to watchlist**.
2. `useMovieAction(42,'watchlist').run({kind:'watchlist', on:true})`:
   - It shows the expected state immediately (optimistic update) and patches every cached card of movie 42.
   - It sends `PUT /api/v1/movies/42/watchlist` with the Bearer token.
3. The backend checks the per-user write budget (60/min), checks that the movie exists, and runs `INSERT … ON CONFLICT DO NOTHING`. It reads back the user's state in the same transaction and returns `{inWatchlist:true, watched:false, rating:null, reaction:"NEUTRAL"}`.
4. The frontend writes that server state into the caches, invalidates `/me` lists and recommendations, and the button shows "Remove from watchlist".
5. **Rating** works the same way through a popover (1.0–10.0, one decimal). **Like/Dislike** toggles: like → dislike switches directly, and pressing the active one again sends DELETE.

### 4.4 Personal pages and recommendations

- `/watchlist` and `/ratings` are paginated lists (newest first). `/profile` shows counts and the two account forms.
- `/for-you` shows ranked recommendations with a reason chip ("More with Christopher Nolan", "Because you liked Inception", "Matches your taste in Sci-Fi"). With fewer than 3 signal movies, it shows a "Popular on CineSmart" cold start with an info banner.

### 4.5 Session over time

- The access token lives 15 minutes. A timer refreshes it 60 s before expiry, and `ensureFreshToken` refreshes it before any request when less than 30 s remain.
- The refresh cookie slides: 2 h idle, capped at 7 days after login. After that, the next refresh returns 401: "Your session has expired. Please sign in again."
- **Sign out:** `POST /auth/logout` blacklists the access token and deletes the refresh session. Then the SPA clears this viewer's cache and broadcasts the logout to other tabs.

---

# PART II — Foundations and Technology Concepts

Each section follows the same pattern: **concept → mechanism → tiny example → where CineSmart uses it**.

## Chapter 5: Web Application Fundamentals

### 5.1 Client–server architecture
**Concept.** A *client* (the browser running the SPA) sends *requests*; a *server* (Spring Boot on Tomcat) sends *responses*. They share no memory; everything crosses the network as bytes.
**In CineSmart.** The SPA is static files (HTML/JS/CSS) that run entirely in the browser. All data comes from `http://localhost:8080/api/v1` (`src/lib/env.ts`). The backend never renders HTML.

### 5.2 HTTP requests and responses
An HTTP message has:
- a **start line** (method + path, or status code)
- **headers** (metadata)
- an optional **body**

```
PUT /api/v1/movies/42/rating HTTP/1.1
Host: localhost:8080
Origin: http://localhost:5173
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{"rating":8.5}
```
```
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true

{"inWatchlist":false,"watched":false,"rating":8.5,"reaction":"NEUTRAL"}
```

| Concept | CineSmart usage |
|---|---|
| **Methods** | `GET` reads (catalog, lists); `POST` actions that are not idempotent (signup, login, refresh, email flows); `PUT` "set this state" and `DELETE` "clear this state" for activity. **Idempotent** means repeating the request has the same effect, which is why a double-clicked PUT is harmless server-side |
| **Status codes** | 200, 201 (signup), 204 (logout), 400 (validation/bad request), 401 (no/invalid token or bad credentials), 403 (unverified account), 404, 405, 409 (taken username/email), 429 (rate limit/lockout), 503 (Redis/SMTP down), 500. Mapped centrally in `shared/api/ErrorCode.java` |
| **Headers** | `Authorization`, `Content-Type`, `Origin`, `Set-Cookie`/`Cookie`, `Retry-After`, `Cache-Control` (genres/languages: 1 h) |
| **Path vs query** | Path identifies a resource (`/movies/42`); the query refines a collection (`/movies?genreId=2&year=2014&page=1&size=20`) |
| **Body** | JSON only. `PUT …/watchlist` has **no body** (the state is in the method + path) |

### 5.3 JSON serialization
*Serialization* turns an in-memory object into text; *deserialization* does the reverse. In Java, **Jackson** (3.1.5 under Boot 4) maps record components to JSON properties. In JS, `JSON.parse` builds plain objects.
**Subtlety here.** `BigDecimal 8.40` is written as the JSON number `8.40`, and `JSON.parse` yields `8.4`. The contract therefore says "format for display yourself" (`frontend-contract.md` [CONV-3]). `src/lib/format.ts` always formats with one decimal.

### 5.4 REST, where it applies
The API is *resource-oriented* and mostly RESTful: nouns in paths, HTTP methods as verbs, stateless requests, standard status codes. It also has action-style endpoints (`/auth/password/forgot`, `/auth/email/change/confirm`). That is normal pragmatic REST, where an action has no natural resource. There is no HATEOAS. `/home` sections carry an `endpoint` string, but the SPA uses its own `LIST_META` hrefs instead.

### 5.5 Stateless communication versus server-side state
**Stateless** means each request carries everything needed to authenticate it. CineSmart's API is stateless *for authenticating normal requests*: the JWT is self-contained, and `SessionCreationPolicy.STATELESS` stops Spring from creating an HTTP session. It is **not** stateless overall:
- **Redis holds state:** refresh sessions, revocation lists, counters.
- **PostgreSQL holds the domain state.**
This hybrid design is common. Short-lived self-contained access tokens make requests fast, and server-side refresh state makes logout and revocation possible.

### 5.6 Synchronous versus asynchronous
- **Browser:** `fetch` returns a Promise; the JS event loop keeps the UI responsive while the request is in flight. TanStack Query manages these Promises.
- **Server:** each request runs **synchronously on one Tomcat worker thread** (thread-per-request). JDBC, Redis and SMTP calls block that thread. The only background work is the analytics batch on the scheduler thread.

### 5.7 Same-origin policy and CORS
**Origin** = scheme + host + port. `http://localhost:5173` (SPA) and `http://localhost:8080` (API) are **different origins**. The browser's *same-origin policy* lets a page *send* many cross-origin requests, but not *read* the response unless the server opts in with **CORS** headers.

A **preflight** is an automatic `OPTIONS` request the browser sends first when the real request is not "simple". `Authorization`, `Content-Type: application/json`, `PUT` and `DELETE` all trigger one.

```
OPTIONS /api/v1/movies/42/rating
Origin: http://localhost:5173
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: authorization,content-type
→ 200 Access-Control-Allow-Origin: http://localhost:5173
      Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
      Access-Control-Allow-Headers: Authorization, Content-Type
      Access-Control-Allow-Credentials: true
      Access-Control-Max-Age: 3600
```
**In CineSmart:** `SecurityConfig.corsConfigurationSource` (`shared/security/SecurityConfig.java:140`) builds exactly this. `.cors(Customizer.withDefaults())` puts Spring's `CorsFilter` early in the security chain, so even a 401 or 429 from a filter carries CORS headers. Otherwise the SPA could not read the error body (tested by `RateLimitAndCorsIntegrationTest#responsesToTheFrontendCarryCorsHeadersEvenWhenRateLimited`).

### 5.8 Cookies, sessions and tokens
- A **cookie** is a name=value pair set with `Set-Cookie` and sent back automatically to matching URLs.
- **Attributes** control *where* and *when* it is sent:
  - `Path` (only to URLs under this path)
  - `HttpOnly` (JS cannot read it)
  - `Secure` (HTTPS only; browsers treat `http://localhost` as secure)
  - `SameSite=Strict` (never sent on requests initiated by another *site*)
- A **token** is a credential the client presents explicitly, usually as `Authorization: Bearer …`.

**CineSmart uses both:**
- **Access token (JWT):** in JS memory only (`session/session-store.ts`), sent as a Bearer header, 15 minutes.
- **Refresh token:** a random 256-bit string, *only* in the `refresh_token` cookie (`identity/api/RefreshCookies.java`) with `HttpOnly; SameSite=Strict; Path=/api/v1/auth`. It is sent only to `/api/v1/auth/*`.

**"Site" versus "origin".** `SameSite` is about the *site* (scheme + registrable domain); ports do not count. So `localhost:5173 → localhost:8080` is same-site, and the Strict cookie *is* sent with `credentials:'include'`. In production, the SPA and API must share a registrable domain (frontend README, "Same site").

### 5.9 Frontend routing versus backend routing
- **Backend routing:** Spring MVC maps `/api/v1/...` to controller methods.
- **Frontend routing:** React Router maps browser paths (`/movies/42`, `/watchlist`) to components *inside the already-loaded SPA*. No server round-trip happens on navigation.

A full reload of `/movies/42` asks the **static host** for `/movies/42`. That host must return `index.html` (an "SPA fallback"). Then React Router renders the page. The two route trees are independent: the UI route `/movies/42` calls the API route `/api/v1/movies/42`.

---

## Chapter 6: Java Language Concepts Used in the Backend

Everything below is **core Java** unless marked otherwise. The project targets **Java 25** (`pom.xml`).

### 6.1 Classes, constructors, access modifiers
Services are `public class` with `private final` fields assigned in a single constructor (e.g. `AuthService`). A `final` field can be assigned once, in the constructor. The object's dependencies are therefore fixed after construction, which is the basis for thread-safe singletons (§15.2).

Utility classes use a **private constructor** so they cannot be instantiated: `RandomToken`, `TokenHasher`, `CurrentUser`, `ErrorResponseWriter`, `RedisFailClosed`.

### 6.2 Records (Java 16+)
A `record` is a transparent, shallowly immutable data carrier. The compiler generates:
- a canonical constructor
- `private final` fields
- accessors named like the components (`card.movieId()`, not `getMovieId()`)
- `equals`, `hashCode` and `toString` based on all components

```java
public record PageParams(int page, int size) { ... }        // shared/api/PageParams.java
```
Records are used for **every DTO and value object**: `MovieCard`, `UserMovieState`, `ApiError`, `PageResponse<T>`, `LoginRequest`, `IssuedSession`, `ActivitySignals`, repository row types (`CoreRow`, `IdPage`, `Candidate`) and configuration (`RateLimitProperties`, `RecommendationProperties`).

**Compact canonical constructor.** `RateLimitProperties` validates and normalizes its input before the fields are assigned:
```java
public RateLimitProperties {                     // no parameter list = compact form
    ip = ip == null ? Map.of() : Map.copyOf(ip); // reassigning the parameter
    ip.values().forEach(RateLimit::parse);       // fail fast on a typo at startup
}
```
**Static factories on records** keep construction logic next to the type: `ApiError.of`, `PageResponse.of`, `PageParams.of`, `LoginResponse.from`.

**Nested records** (`LoginResponse.UserSummary`, `ActivitySignals.Entry`, `TokenService.RefreshGrant`) scope small types to their owner.

### 6.3 Interfaces, inheritance and polymorphism
- **Interfaces as seams:** `UserMovieStateLookup`, `ForYouSource`, and Spring's `HandlerInterceptor`, `WebMvcConfigurer`, `JwtDecoder`.
- **A lambda as an implementation:** `BearerTokenResolver` is implemented by a lambda (§6.7).
- **Class inheritance:**
  - `GlobalExceptionHandler extends ResponseEntityExceptionHandler` and overrides template methods (the *Template Method* pattern).
  - `ApiException extends RuntimeException` has subclasses (`MovieNotFoundException`, `InvalidTokenException`, `EmailDeliveryException`, `UserAlreadyExistsException`). One `@ExceptionHandler(ApiException.class)` handles all of them **polymorphically**, because each instance carries its own `ErrorCode`.

### 6.4 Enums with state and behavior
```java
public enum ErrorCode {
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST), ...;
    private final HttpStatus status;
    public static ErrorCode forStatus(int status) { return switch (status) { ... }; }
}
```
Each enum constant is a singleton with fields and methods. `RankedList` also uses its **declaration order** as data: `HomeService` iterates `RankedList.values()` to get the row order. The code comment warns about this implicit coupling.

### 6.5 Switch expressions and pattern matching
- **Arrow `switch` expressions** return a value with no fall-through: `ErrorCode.forStatus`, `IpRateLimitFilter.group`, `DiscoveryRepository.ranked`, `CatalogService.Crew.add`.
- **A switch expression over an enum must be exhaustive.** In `DiscoveryRepository.ranked`, a new `RankedList` constant would fail compilation until it is handled. Compile-time safety.
- **Pattern matching for `instanceof`:** `ex instanceof ErrorResponse errorResponse` (`GlobalExceptionHandler.messageFor`), `auth instanceof JwtAuthenticationToken token` (`UserRateLimitInterceptor`).

### 6.6 Text blocks
`"""` multi-line strings hold the SQL (`ActivityRepository`, `DiscoveryRepository.SEARCH_HITS`, `AnalyticsRepository`) and the Lua scripts (`RateLimiter.INCR_WINDOW_LUA`). Common indentation is stripped, so SQL stays readable without concatenation.

### 6.7 Lambdas, method references, functional interfaces
A *functional interface* has one abstract method; a lambda implements it inline.
- `RowMapper<T>`: `(rs, rowNum) -> new TimedId(...)` in every JDBC read.
- `Supplier<T>` / `Runnable` in `RedisFailClosed.call/run`: *behavior* is passed into a wrapper that adds error translation (a higher-order function).
- Method references: `RateLimit::parse`, `MovieCard::movieId`, `Function.identity()`, `this::refresh` (`AnalyticsJob`).

### 6.8 Generics
- `PageResponse<T>` with `<R> PageResponse<R> map(Function<List<T>, List<R>> mapper)` changes the item type and keeps the paging metadata. It is used by `RecommendationService.forYou`.
- `public static <T> T call(Supplier<T> action)`: the generic method infers `T` from the lambda.
- `DefaultRedisScript<List>` with `@SuppressWarnings("rawtypes")` (`RateLimiter`): the Lua script returns a mixed list, and type erasure means there is no `List<Object>.class`.

### 6.9 Collections and ordering
| Type | Why it is used here |
|---|---|
| `LinkedHashSet` | De-duplicate **and keep insertion order**: `CatalogService.getMoviesByIds` (results in request order), `HomeService` (`allIds`) |
| `LinkedHashMap` | Ordered grouping of rows per movie |
| `HashSet` / `HashMap` | Fast membership (excluded IDs, profile weights), order irrelevant |
| `Map.merge(k, v, Double::sum)` | Accumulate weights (`RecommendationService.add`, `buildProfile`) |
| `computeIfAbsent` | Lazily create a group list (`CatalogService.add`) |
| `List.of`, `Map.of`, `Set.of`, `Map.copyOf` | **Unmodifiable** collections; a mutation throws `UnsupportedOperationException` |
| `List.getFirst()` | Java 21 `SequencedCollection` (`CatalogService.getMovieDetails`) |

**Pitfall that is avoided:** `Collectors.toMap` throws `IllegalStateException` on duplicate keys. Every use here has unique keys by construction.

### 6.10 Streams and Optional
- **Streams** are lazy pipelines (`filter → map → limit → toList()`). `RecommendationService.recommend` pages an in-memory ranking with `skip(offset).limit(size)`.
- **`Optional<AppUser>`** comes from Spring Data. `orElseThrow(() -> new InvalidTokenException(...))` turns "absent" into a domain error. `AuthService.login` instead branches on `found.isEmpty()`, because it must run a dummy BCrypt check on that path (§26.3).

### 6.11 Exceptions and error propagation
All domain errors are **unchecked** (`RuntimeException`). They travel up the stack without `throws` clauses until `@RestControllerAdvice` catches them (§7.11). Checked exceptions appear only where the JDK forces them:
- `TokenHasher` wraps `NoSuchAlgorithmException` into `IllegalStateException`.
- `IOException`/`ServletException` appear in filter signatures.

Exception *translation* happens at boundaries:
- `MailException` → `EmailDeliveryException` (503) in `EmailService`
- a Redis `DataAccessException` → `ApiException(SERVICE_UNAVAILABLE)` in `RedisFailClosed`
- `DataIntegrityViolationException` from a unique index → `UserAlreadyExistsException` (409) in `AuthService.signUp`

### 6.12 Annotations and reflection
Annotations are metadata. **Java itself does nothing with `@Service` or `@Transactional`.** Frameworks read them at runtime through **reflection** and change behavior accordingly. Chapter 7 explains who reads each one and when.

### 6.13 Immutability, references and equality
- Records give value-based `equals`.
- **Records are only shallowly immutable.** `MovieDetails` holds `List`s, and the lists built in `CatalogService` are ordinary `ArrayList`s that are never exposed for mutation. That is a convention, not a guarantee.
- `withUserState(...)` returns a **new** record (copy-on-write) instead of mutating. This style is safe to share across threads.

### 6.14 Exact decimals: `BigDecimal`
Ratings are `BigDecimal` (exact decimal), not `double` (binary floating point cannot represent 0.1 exactly). Comparisons use `compareTo`, **not** `equals`: `new BigDecimal("8.0").equals(new BigDecimal("8"))` is `false` (different scale), while `compareTo` returns 0. See `RecommendationService.weigh` (`rated.rating().compareTo(RATING_HIGH) >= 0`).

The ranking math in `CandidateScorer` uses `double` deliberately: it is relative ordering, not money.

### 6.15 `java.time`
- `Instant` (a UTC moment) for tokens and activity timestamps.
- `Duration` for TTLs. Spring converts ISO strings like `PT15M` automatically.
- `OffsetDateTime` for `app_user.created_at`. `ActivityRepository.instant(rs, col)` reads `TIMESTAMPTZ` with JDBC 4.2's `getObject(col, OffsetDateTime.class)` and converts it to `Instant`.

### 6.16 JDK security primitives
- `SecureRandom` generates 32 random bytes in `RandomToken`, encoded as URL-safe Base64 without padding (43 characters, 256 bits of entropy).
- `MessageDigest` SHA-256 + `HexFormat` in `TokenHasher`. Raw tokens are never stored as Redis keys, only their hashes, so a Redis dump does not leak usable tokens.

### 6.17 Concurrency and memory (JVM)
- **Memory:** request-scoped objects (DTOs, rows, lists) live briefly on the heap and are collected cheaply by the generational garbage collector (G1 by default on server-class JDKs **[Version-dependent]**).
- **Threads:** Tomcat runs requests in parallel on many threads, so *shared mutable state* would need synchronization. The code avoids it: singleton beans hold only `final` references to thread-safe collaborators (§15.2). The one shared static mutable object is `RandomToken.RANDOM`, and `SecureRandom` is thread-safe.

---

## Chapter 7: Spring Framework and Spring Boot Foundations

Versions **[Verified via ~/.m2; confirm with `mvn dependency:tree`]**: Spring Boot 4.1.1, Spring Framework 7.0.9, Spring Security 7.1.1, Hibernate ORM 7.4.5, Jackson 3.1.5, HikariCP 7.0.2, Lettuce 7.5.2, PostgreSQL JDBC 42.7.13.

### 7.1 Inversion of Control and Dependency Injection
**Problem.** `AuthService` needs a repository, a password encoder, a token service and more. If it created them itself (`new TokenService(...)`), it would be hard-wired to concrete classes and their own dependencies, and hard to test.

**IoC.** Hand control of object creation to a *container*.
**DI.** The container passes ("injects") the dependencies in, here through the **constructor**:
```java
@Service
public class AuthService {
    public AuthService(AppUserRepository userRepository, PasswordEncoder passwordEncoder, ...) { ... }
}
```
- With one constructor, Spring needs no `@Autowired` (implicit constructor injection since Spring 4.3).
- **Main code uses constructor injection everywhere**; the tests use `@Autowired` fields (`support/IntegrationTest.java`).
- **Why constructor injection is preferred:**
  - dependencies can be `final`
  - an object is never half-built
  - constructor cycles fail at startup
  - unit tests can call `new X(mock, …)` (as `RecommendationServiceTest` and `TokenServiceTest` do)

### 7.2 The ApplicationContext and beans
The **ApplicationContext** is the container: a registry of **beans** (managed objects). A bean comes from either:
- a **stereotype-annotated class** found by component scanning, or
- a **`@Bean` method** in a `@Configuration` class (e.g. `SecurityConfig.passwordEncoder()` returns a `BCryptPasswordEncoder`).

**Default scope is singleton:** one shared instance per context.

### 7.3 Component scanning and stereotypes
`@SpringBootApplication` on `ca.cinesmart.CineSmartApplication` includes `@ComponentScan` of `ca.cinesmart` **and all sub-packages**. That is why the entry class sits at the root package.

| Annotation | Meaning beyond "this is a bean" |
|---|---|
| `@Component` | Plain bean (`RateLimiter`, `ClientIpResolver`, `RefreshCookies`, `EmailLinkService`, `RedisStartupCheck`) |
| `@Service` | "Business logic"; no extra behavior |
| `@Repository` | Enables persistence-exception translation to Spring's `DataAccessException`. `JdbcTemplate` already translates, so for these JDBC classes it is mainly documentation |
| `@RestController` | `@Controller` + `@ResponseBody`: return values become the JSON response body |
| `@Configuration` | Holds `@Bean` methods. With `proxyBeanMethods=true` (the default) it is CGLIB-proxied so that inter-`@Bean` calls return the singleton |
| `@RestControllerAdvice` | Global controller exception handling |

### 7.4 Spring Data JPA repositories (interface-only beans)
`AppUserRepository extends JpaRepository<AppUser, Long>` has **no implementation class**. At startup Spring Data creates a **proxy** that implements the interface:
- Inherited methods (`findById`, `save`, `saveAndFlush`) are delegated to `SimpleJpaRepository`.
- `@Query` methods are parsed as JPQL.
§14 explains why the queries use `LOWER()` explicitly.

### 7.5 Configuration properties, `@Value` and profiles
- **`@Value("${jwt.access-token-ttl}") Duration ttl`** injects one property; Spring converts `"PT15M"` to `Duration`.
  - `${X:default}` supplies a default.
  - `${JWT_SECRET}` without a default **fails startup** when the variable is missing. This is fail-fast for secrets.
- **`@ConfigurationProperties("rate-limit")`** binds a whole subtree to a type (here records):
  - `RateLimitProperties(Map<String,String> ip, Map<String,String> user)` is enabled by `@EnableConfigurationProperties(RateLimitProperties.class)` on `SecurityConfig`.
  - `RecommendationProperties` is enabled on `RecommendationService`.
  - *Relaxed binding* maps `recommendation.recent-days` to `recentDays`.
- **Profiles:** `application-dev.properties` overlays the base file when `SPRING_PROFILES_ACTIVE=dev`. `application-test.properties` is used with `@ActiveProfiles("test")`.
- **Precedence (simplified, highest first):** command-line args > OS environment > profile-specific file > `application.properties`.

### 7.6 Auto-configuration and conditional configuration
Boot looks at the classpath and existing beans, and defines sensible beans **only when you have not** (`@ConditionalOnMissingBean`).

| Auto-configured | Customized or overridden here |
|---|---|
| `DataSource` (HikariCP) from `spring.datasource.*` | — |
| `EntityManagerFactory`, **`JpaTransactionManager`** (because data-jpa is present) | `ddl-auto=validate` |
| `JdbcTemplate`, `NamedParameterJdbcTemplate` | — |
| `RedisConnectionFactory` (Lettuce) | `StringRedisTemplate` is re-declared in `shared/redis/RedisConfig.java`. Boot would provide one too; the custom one wins (redundant, harmless) |
| `JavaMailSender` | — |
| Default security chain (form login, Basic) | **Replaced** by the custom `SecurityFilterChain` |
| Resource-server `JwtDecoder` | **Replaced** by the custom HMAC decoder with a revocation validator |
| Jackson mapper | defaults |
| `ThreadPoolTaskScheduler` (because of `@EnableScheduling`) | injected into `AnalyticsJob` |
| Embedded Tomcat :8080 | defaults |

### 7.7 Embedded application server
`spring-boot-starter-web` brings **embedded Tomcat**. The app is an executable JAR that *contains* the server (instead of a WAR deployed into a separate one). Tomcat owns the socket, parses HTTP and gives each request to a worker thread. That thread runs the filter chain, then `DispatcherServlet`.

### 7.8 Spring MVC request processing
1. **Servlet filters** run first. Spring Security registers one delegating filter → `FilterChainProxy` → your `SecurityFilterChain`.
2. **`DispatcherServlet`** asks `RequestMappingHandlerMapping` for the handler. Literal path segments beat `{variables}`, so `/movies/search` wins over `/movies/{id}`.
3. **Interceptors** run `preHandle` (`UserRateLimitInterceptor`, registered in `UserRateLimitConfig`).
4. **Argument resolution:**
   - `@PathVariable Long id` (type conversion; `/movies/abc` → 400)
   - `@RequestParam`
   - `@RequestBody` (Jackson)
   - `@CookieValue`
   - `@AuthenticationPrincipal Jwt`
   - `HttpServletRequest`
5. **Validation** (§7.10).
6. **The handler runs.** The return value goes through an `HttpMessageConverter` (Jackson → JSON). `ResponseEntity` controls the status and headers (`Set-Cookie`, `Cache-Control`).

### 7.9 Binding details used here
- `@AuthenticationPrincipal Jwt jwt` resolves the principal of the current `Authentication`. On JWT-optional endpoints the anonymous principal is the string `"anonymousUser"`. `errorOnInvalidType = false` then yields `null` instead of an error, and `CurrentUser.idOrNull(jwt)` treats the request as anonymous.
- `@CookieValue(name = "refresh_token", required = false)` is `null` when the cookie is missing.
- `DiscoveryController.rejectUnknownParams` reads `request.getParameterMap()` to enforce "unknown query params → 400" (Spring would ignore them).

### 7.10 Bean Validation
- Constraints sit on record components: `@NotBlank`, `@Email`, `@Size`, `@Pattern`, `@DecimalMin/@DecimalMax`, `@Digits`, `@NotNull`, `@Positive`.
- `@Valid @RequestBody` validates **after** JSON deserialization. On failure Spring throws `MethodArgumentNotValidException`, and `handleMethodArgumentNotValid` maps it to `fields`.
- **Parameter validation:** `@Validated` on the controller class + `@Positive Long id`. Spring 6.1+ built-in method validation raises `HandlerMethodValidationException`. Class-level `@Validated` also activates the AOP `MethodValidationPostProcessor`, which raises `ConstraintViolationException`. **[Version-dependent]** Which one fires depends on that setup; the advice handles both, with the same response shape.
- **Validation runs before normalization.** `@Email` sees the raw string, so `" a@b.com "` is rejected before `AppUser.normalizeEmail` could trim it. This is BUG-02 in `test-results.md`.

### 7.11 Exception handling
`@RestControllerAdvice` methods are used by `ExceptionHandlerExceptionResolver`, which picks the **most specific** match:
- `ApiException` → `handleApi`
- `ConstraintViolationException` → `handleConstraintViolation`
- anything else → `handleUnexpected` (logs the stack trace, returns a generic 500; `GlobalExceptionHandler.java:49`)

Extending `ResponseEntityExceptionHandler` gives one hook, `handleExceptionInternal` (`:77`), for Spring's own exceptions (404 `NoResourceFoundException`, 405, 415, type mismatch, malformed JSON). They are rewritten into the same `ApiError` shape and keep their status.

**Filters run outside `DispatcherServlet`**, so the advice cannot see their errors. `shared/security/ErrorResponseWriter.java` writes the identical JSON by hand for filter-level 401/403/429.

### 7.12 Filters versus interceptors
| | Servlet `Filter` | `HandlerInterceptor` |
|---|---|---|
| Runs | Before Spring MVC | Inside `DispatcherServlet`, once the handler is known |
| Here | `IpRateLimitFilter`: per IP, protects unauthenticated endpoints like login cheaply | `UserRateLimitInterceptor`: per user, needs the authenticated `SecurityContext` |

### 7.13 Spring Security
- `SecurityFilterChain` defines the ordered filters and the URL rules (`permitAll()` / `authenticated()`).
- `.oauth2ResourceServer(o -> o.jwt(...))` adds `BearerTokenAuthenticationFilter`. It extracts the token (through the custom `BearerTokenResolver`), validates it with the `JwtDecoder`, and puts a `JwtAuthenticationToken` in `SecurityContextHolder`. The holder is a **ThreadLocal**, so each request thread has its own context.
- `.csrf(disable)` and `STATELESS` session management fit a token-based API. CSRF is discussed in §26.8.

### 7.14 Transactions and AOP proxies
**AOP** adds cross-cutting behavior (transactions, validation) around method calls. Spring implements it with **proxies**: the injected bean is a generated subclass (CGLIB) that wraps the real object.
```
caller → [Proxy: begin tx] → ActivityService.setWatchlist(...) → [Proxy: commit or rollback]
```
`@Transactional` is executed by `TransactionInterceptor`. With the auto-configured **`JpaTransactionManager`**:
- **On entry:** it opens or joins an `EntityManager`, gets a JDBC connection, disables auto-commit, and binds the connection to the thread. `JdbcTemplate` calls inside the method find that bound connection through `DataSourceUtils`, so JDBC and JPA share one transaction.
- **On return:** it commits.
- **On a `RuntimeException`:** it rolls back. By default it does *not* roll back for checked exceptions.

**The self-invocation trap.** `this.method()` *inside* the bean bypasses the proxy, so that method's `@Transactional` is ignored. CineSmart has one case: `CatalogService.getMovieDetails` calls `getMoviesByIds` on `this` (`catalog/application/CatalogService.java:43`), so the `@Transactional(readOnly = true)` at `:55` **does not apply on the details path**. It does apply when another bean calls `catalog.getMoviesByIds(...)`, as `RecommendationService` does. The impact is small (§23.4).

### 7.15 Scheduling and events
- `@EnableScheduling` makes Spring find `@Scheduled` methods. `AnalyticsJob.refresh` uses `fixedDelay` = 1 h (measured from the end of the previous run) and `initialDelay` = 1 h.
- `@EventListener(ApplicationReadyEvent.class)` runs once the app is fully started. `AnalyticsJob.refreshOnStartup` hands an immediate run to the `TaskScheduler`, so startup is not blocked. `RedisStartupCheck.ping` logs whether Redis is reachable.
- **The default scheduler has one thread** **[Version-dependent; Boot default]**, so runs never overlap within an instance. A PostgreSQL advisory lock prevents overlap *across* instances (§23.6).

### 7.16 Startup and shutdown
Startup is traced in Ch. 11. On shutdown, Spring destroys singletons in reverse dependency order: Hikari closes its connections, Lettuce disconnects, and the scheduler stops. Graceful HTTP shutdown is the Boot default in recent versions **[Version-dependent]**.

---

## Chapter 8: React and Frontend Foundations

Versions **[Verified in node_modules]**: React 19.3.0, React Router 7.18.4, TanStack Query 5.104.2, react-hook-form 7.90.0, Zod 4.6.7, Vite 7.3.7, TypeScript 5.9.3, Tailwind CSS 4.3.3, radix-ui 1.8.1.

### 8.1 JSX and components
JSX compiles to function calls through the automatic JSX runtime (`"jsx": "react-jsx"`). A **function component** maps props to a UI description:
```tsx
export function ReasonChip({ reason, className }: { reason: string; className?: string }) {
  return <span title={reason} className={cn('inline-flex …', className)}>…</span>;
}
```
Page modules export a function named `Component`, which React Router's `lazy()` picks up.

### 8.2 Props, state and rendering
- **Props:** read-only inputs from the parent.
- **State:** memory owned by one component instance and preserved between renders (`useState`). Calling the setter **schedules a re-render**.
- **Rendering:** React calls the function again for a new element tree, *reconciles* it with the previous one, and updates only the DOM that differs.

State is not a normal variable. `draft = '8'` would neither re-render nor survive the next render. `setDraft('8')` stores the value in React's memory for this instance and schedules the update.

### 8.3 Hooks used, and why
| Hook | Where | Purpose |
|---|---|---|
| `useState` | everywhere (e.g. `RatingControl` `draft`/`open`) | Local UI state |
| `useEffect` | `AuthGate` (restore once), `useTokenMutation` (auto-POST), `RouteAnnouncer`, `useDocumentTitle`, `useRetryAfter` (interval), `BrowsePage` (react to an error) | Sync with things **outside** React (network, focus, `document.title`, timers) |
| `useRef` | `useTokenMutation` (`started`), `ErrorState` (`onRetryRef`, `wasActive`), `MovieRow` (scroller DOM), `Header` | A mutable box that survives renders **without** causing them; DOM refs |
| `useId` | form fields, selects | Stable unique IDs for `htmlFor`/`aria-describedby` |
| `useSyncExternalStore` | `useSession`, `useMediaQuery` | Subscribe to stores **outside** React (the session module, `matchMedia`) without *tearing*, i.e. different components seeing different versions during concurrent rendering |
| `useCallback` | `useMediaQuery` | Stable `subscribe` function so the store is not resubscribed every render |
| TanStack hooks | data layer | Server-state cache (§8.7) |
| Router hooks | pages | The URL as state |
| `useForm` (RHF) | forms | Form state and validation |

**Custom hooks** (functions starting with `use` that call hooks): `useMovieAction`, `useSignInPrompt`, `useTokenMutation`, `useFormServerError`, `useRetryAfter`, `usePageParam`, `useMediaQuery`, `useDocumentTitle`, `useWatchedSet`, `useViewer`, `useSession`.

### 8.4 Effects, dependencies, cleanup and StrictMode
An effect runs **after** React commits to the DOM. When its dependencies change, React runs the old cleanup, then the effect again.

**StrictMode in development** mounts, unmounts and re-mounts every component, so effects run twice to expose missing cleanup. The code handles this in two places:
- `restoreSession()` memoizes its promise (`restorePromise ??= …`), so the double effect makes one request.
- `useTokenMutation` guards with a ref (`started`), so a single-use email token is POSTed once (test: `VerifyEmailPage.test.tsx`, "POSTs the token exactly once under StrictMode").

**Stale closures.** A function captures the variables of the render that created it. `ErrorState` keeps `onRetry` in a ref, updated by an effect without dependencies. The countdown effect, which depends only on `active`, therefore always calls the *latest* `onRetry` (the "latest ref" pattern).

### 8.5 Adjusting state during render
`useRetryAfter` resets itself *while rendering* when its inputs change:
```ts
const changed = state.total !== total || state.resetKey !== resetKey;
if (changed) setState({ total, resetKey, remaining: total });
```
React allows `setState` on the component that is currently rendering. It discards that output and renders again right away. This is the documented alternative to "reset state in an effect", which would show one stale frame.

### 8.6 Identity and the `key` reset technique
React keeps state per *tree position + type + key*. **A new `key` creates a fresh instance.** Uses in this code:
- `<Details key={movieId}>`
- `<RankedList key={listKey}>`
- `<Results key={q}>`
- `<SearchBox key={raw}>` (resets the uncontrolled `defaultValue`)
- `<MovieRow key={`${v}-${section.key}`}>` (drops loaded pages when the viewer changes)

### 8.7 Server state with TanStack Query
**Server state** is data the server owns and the UI caches, with problems of its own: staleness, de-duplication, retries, invalidation.
- **Query keys** start with the viewer for every user-dependent query (`[userId | 'anon', 'movie', 42]`, `src/query/keys.ts`). Public endpoints embed per-user flags, so anonymous and signed-in data must never share a cache entry.
- **`staleTime`:** fresh data is not refetched (`query-client.ts`: home/lists 1 min, details 30 s, catalog 1 h, `/me` 0, watched-set ∞).
- **`gcTime`:** 10 min for unused entries.
- **Retry:** once, after 1 s, only for `NETWORK_ERROR`/`INTERNAL_ERROR`/`SERVICE_UNAVAILABLE`.
- **`refetchOnWindowFocus: false`** protects the shared 120/min IP budget.
- **Mutations:** `onMutate` (optimistic update + snapshot) → `onError` (rollback) → `onSuccess` (apply the server truth) → `onSettled`.

### 8.8 Routing (React Router 7 data router)
- `createBrowserRouter` + `<RouterProvider>`.
- **Pathless layout routes** render `<Outlet/>` (`ShellLayout`, `AuthLayout`, and the guards `RequireAuth`/`GuestOnly`).
- **Lazy routes** split each page into its own chunk.
- **A per-route `ErrorBoundary`** (`RouteErrorBoundary`) keeps a crash inside the layout.
- `<Navigate replace>` redirects during render.
- `<ScrollRestoration/>` restores scroll; it needs a data router.

### 8.9 Forms: controlled and uncontrolled inputs
- **Controlled:** the value lives in React state (`value={draft}` + `onChange`). Used in `RatingControl`, where the slider and the text box must stay in sync.
- **Uncontrolled:** the DOM holds the value. react-hook-form's `register()` attaches refs to native inputs, so typing **does not re-render the form**. `SearchBox` reads `new FormData(form).get('q')` on submit.

### 8.10 Lists, keys, conditional rendering
Lists use stable domain keys (`movieId`, `personId`). Conditional rendering uses `?:`, `&&`, and early returns (`if (query.isPending) return <Skeleton/>`).

### 8.11 React 19 specifics in this code
- `ref` is a normal prop: `SelectTrigger ref={triggerRef}` needs no `forwardRef`.
- `createRoot` enables concurrent rendering, which is why `useSyncExternalStore` matters.

### 8.12 Build tooling
- **Vite:** serves native ES modules in dev (fast hot reload) and bundles with Rollup for production.
- **TypeScript:** type-checks in `tsc -b`; Vite only strips the types.
- **Tailwind 4** (`@tailwindcss/vite`): generates CSS for the utility classes found in the source.

---

## Chapter 9: PostgreSQL and Relational Database Foundations

### 9.1 Types used
| Type | Used for | Note |
|---|---|---|
| `BIGINT GENERATED ALWAYS AS IDENTITY` | surrogate PKs | SQL-standard identity backed by a sequence. `ALWAYS` rejects explicit values unless `OVERRIDING SYSTEM VALUE` (the test seed uses it) |
| `VARCHAR(n)`, `TEXT` | names, titles, URLs, hashes | |
| `SMALLINT` | year, runtime, RT %, metascore | Java `Short` |
| `NUMERIC(3,1)`, `NUMERIC(4,2)` | ratings, averages | exact; Java `BigDecimal` |
| `BOOLEAN` | `is_verified` | |
| `DATE` | `released` | no time zone; Java `LocalDate`; JSON `YYYY-MM-DD` |
| `TIMESTAMPTZ` | `created_at`, `added_at`, `rated_at`, `watched_at`, `reacted_at`, `updated_at` | stored as UTC instants |

### 9.2 Keys and relationships
- **Primary key:** unique + not null; creates a unique B-tree index.
- **Foreign key:** the referenced row must exist (*referential integrity*).
- **Many-to-many:** junction tables with composite PKs (`movie_genre`, `movie_language`, `movie_person(movie_id, person_id, role_id)`).
- **Activity tables:** composite PK `(user_id, movie_id)` means "at most one row per user and movie". **That PK is what `ON CONFLICT (user_id, movie_id)` targets.**
- **`ON DELETE CASCADE`** from `movie` and `app_user` to their dependents. **`RESTRICT`** on `genre`/`language`/`movie_role`: one that is in use cannot be deleted.

### 9.3 Constraints
- `CHECK` constraints encode ranges and enums (`chk_user_rating` 0–10, `chk_user_reaction`, `chk_availability_type`).
- `UNIQUE` on names lets the ETL upsert with `ON CONFLICT (name) DO NOTHING`.
- Expression unique indexes `ON app_user (LOWER(username))` and `(LOWER(email))` enforce case-insensitive uniqueness (V021).

### 9.4 Normalization and deliberate denormalization
The catalog is in 3NF. **`movie_analytics` is deliberate denormalization**: it caches aggregates that could be computed from activity tables, which makes ranking cheap at the cost of up to one hour of staleness.

### 9.5 SQL features relied on
- **Joins:** `LEFT JOIN movie_analytics` + `COALESCE(...,0)`.
- **Aggregates:** `COUNT(*) FILTER (WHERE …)`, `AVG`, `GROUP BY`, `MAX`.
- **CTEs:** search (`hits` → `best`), the analytics batch, recommendation candidates.
- **`UNION ALL`:** title hits + person hits; four activity sources in one query (`ActivityRepository.findSignals`).
- **`EXISTS`:** browse filters, the user state lookup.
- **Upsert:** `INSERT … ON CONFLICT … DO NOTHING | DO UPDATE SET c = EXCLUDED.c`.
- **Paging:** `ORDER BY … LIMIT … OFFSET …` with a final unique tiebreaker (`m.movie_id`), so pages never overlap or skip rows.
- **`NULLS LAST`** in descending orders.

### 9.6 Indexes and trade-offs
A **B-tree** (default) serves equality, ranges and ordering. **GIN + `gin_trgm_ops`** serves trigram operators. Indexes speed up reads but cost write time and storage. An expression index is used only when the query uses the *same expression*: `LOWER(m.title)` in the query matches the index on `LOWER(title)`.

### 9.7 Trigram fuzzy search (`pg_trgm`)
A trigram is a 3-letter slice of a word. `word_similarity(q, text)` scores how well `q` matches a *part* of `text`. `q <% text` is true when that score ≥ `pg_trgm.word_similarity_threshold`, and it **can use the GIN index**.

The threshold is set *transaction-locally* with `set_config(name, value, true)`, the bindable form of `SET LOCAL`. That is why `DiscoveryRepository.search` is `@Transactional(readOnly = true)` (`discovery/persistence/DiscoveryRepository.java:95`): without a transaction, the setting would last only for its own autocommit statement.

### 9.8 Transactions, ACID, isolation
A transaction is:
- **A**tomic: all-or-nothing
- **C**onsistent: constraints hold
- **I**solated: concurrent work is invisible until committed
- **D**urable: committed data survives crashes

PostgreSQL's default isolation is **READ COMMITTED**: each *statement* sees data committed before it started. **[Verified]** No code changes the isolation level.

### 9.9 Locks and advisory locks
`INSERT … ON CONFLICT`, `UPDATE` and `DELETE` take row locks implicitly. An **advisory lock** is an application-chosen lock on a number. `pg_try_advisory_xact_lock(7310001)` returns immediately with `true` or `false` and releases at transaction end. It makes the analytics batch a cluster-wide singleton (`analytics/persistence/AnalyticsRepository.java:31`).

### 9.10 Migrations
Versioned scripts move the schema forward. Here they are run **by hand**. V019–V022 use `BEGIN … COMMIT` and `IF [NOT] EXISTS` so they can be re-run. Flyway or Liquibase would track the applied versions and run them on startup.

### 9.11 Connection pooling
A new PostgreSQL connection costs a TCP + authentication handshake and a server process. **HikariCP** keeps open connections and lends them out (default maximum 10, 30 s wait timeout **[Version-dependent defaults]**). Requests beyond the pool size wait.

### 9.12 Roles and privileges
**[Unknown/Inferred]** The app connects as `SPRING_DATASOURCE_USERNAME`; `.env.example` shows `postgres` (a superuser). `implementation-plan.md` §F lists a least-privilege `cinesmart_app` role as an optional, open task. See §36, item S-6.

---

# PART III — Backend Architecture and Implementation

## Chapter 10: Backend Architecture

### 10.1 The architecture that actually exists
A **modular monolith**: one deployable Spring Boot application, split into **feature modules** (`identity`, `catalog`, `discovery`, `activity`, `recommendation`, `analytics`) plus `shared`. Inside each module there is a conventional layered structure:

| Layer (package) | Responsibility | Examples |
|---|---|---|
| `api` | HTTP adapter: mapping, binding, validation trigger, status/headers, cookies | `AuthController`, `MovieActivityController`, `DiscoveryController` |
| `api.dto` | Request/response shapes with validation annotations | `NewUser`, `LoginRequest`, `RatingRequestDto` |
| `application` | Use cases and business rules; transaction boundaries; orchestration across modules | `AuthService`, `ActivityService`, `RecommendationService` |
| `domain` | Data shapes (records), one JPA entity | `MovieDetails`, `ActivitySignals`, `AppUser` |
| `persistence` | SQL / repository access | `ActivityRepository`, `DiscoveryRepository`, `AppUserRepository` |

**Boundary consistency check:**
- Controllers never touch repositories directly. **[Verified]** Every controller injects only services.
- Services sometimes call other modules' **services**, but never their repositories. **[Verified]** For example, `ActivityService` → `CatalogService.movieExists`, not `CatalogRepository`.
- **Exceptions to the "domain" naming:**
  - `identity/api/dto/ProfileResponse` is built inside `AccountService` (application depends on api.dto).
  - `AuthService.signUp` returns `SignupResponse` (an `api.dto`).
  - These are small layering leaks: the application layer knows about HTTP-facing DTOs.
- Most "domain" classes are pure data. Business rules live in services (an *anemic domain model*, which is a reasonable choice for read-heavy CRUD + ranking).

### 10.2 How requests enter
`Tomcat → Security filter chain (CORS → IpRateLimitFilter → BearerTokenAuthenticationFilter → authorization) → DispatcherServlet → UserRateLimitInterceptor → @RestController method`.

### 10.3 Where business rules execute
In `*.application` services, with a few rules in controllers:
- `DiscoveryController.rejectUnknownParams` (param whitelisting)
- `AuthController.refresh` (clear the cookie on failure)
- `PageParams.of` (paging bounds, called from controllers)

Ranking rules are partly in **SQL** (`DiscoveryRepository.ranked`, `AnalyticsRepository.refresh`). That is a performance-driven choice: the database sorts and pages so Java does not have to.

### 10.4 Where persistence happens
- **JDBC (`NamedParameterJdbcTemplate`)** for everything except users: catalog reads, discovery, activity, analytics, recommendation candidates.
- **JPA (Hibernate)** only for `AppUser` via `AppUserRepository`.
- **Redis (`StringRedisTemplate`)** for all security state.

### 10.5 How errors propagate
Services throw `ApiException` subclasses (unchecked) → `GlobalExceptionHandler` → `ApiError` JSON. Filters write the same JSON through `ErrorResponseWriter`. Unexpected exceptions become a generic 500 and are logged with a stack trace (§28).

### 10.6 How DI connects the components (constructor graph, simplified)

```mermaid
flowchart TB
    AuthController --> AuthService & RefreshCookies & ClientIpResolver
    PasswordController --> PasswordResetService & AccountService & RefreshCookies
    EmailController --> VerificationService & AccountService
    MeController --> AccountService
    AuthService --> AppUserRepository & PasswordEncoder & LoginAttemptService & TokenService & AccessTokenRevocationService & VerificationService & StringRedisTemplate
    AccountService --> AppUserRepository & LoginAttemptService & TokenService & EmailService & EmailLinkService & MyListsService
    TokenService --> JwtEncoder & AccessTokenRevocationService & StringRedisTemplate
    SecurityConfig_jwtDecoder[SecurityConfig.jwtDecoder] --> AccessTokenRevocationService
    MovieActivityController --> ActivityService --> ActivityRepository & CatalogService & UserMovieStateService
    MyActivityController --> MyListsService --> ActivityRepository & UserMovieStateRepository & MovieCardService
    CatalogController --> CatalogService --> CatalogRepository & UserMovieStateLookup
    MovieCardService --> MovieCardRepository & UserMovieStateLookup
    UserMovieStateLookup -.implemented by.-> UserMovieStateService
    DiscoveryController --> DiscoveryService --> DiscoveryRepository & MovieCardService
    HomeController --> HomeService --> DiscoveryRepository & MovieCardService & ForYouSource
    ForYouSource -.implemented by.-> RecommendationService
    RecommendationController --> RecommendationService & SimilarService
    RecommendationService --> RecommendationRepository & CatalogService & MovieCardService & MyListsService & DiscoveryService
    AnalyticsJob --> AnalyticsRepository & TaskScheduler
```

**No constructor cycle.** `RecommendationService → DiscoveryService` and `HomeService → ForYouSource (RecommendationService)` look circular, but `DiscoveryService` does **not** depend on `HomeService`. The bean graph is a DAG (directed acyclic graph), so Spring can build it.

---

## Chapter 11: Application Startup and Spring Boot Initialization

```mermaid
sequenceDiagram
    participant JVM
    participant SA as SpringApplication
    participant Env as Environment
    participant Ctx as ApplicationContext
    participant DB as PostgreSQL
    participant T as Tomcat
    JVM->>SA: CineSmartApplication.main → SpringApplication.run
    SA->>Env: load application.properties (+ application-{profile}), env vars, resolve ${...}
    SA->>Ctx: create context, component-scan ca.cinesmart
    Ctx->>Ctx: register auto-configurations (conditions evaluated)
    Ctx->>Ctx: bind @ConfigurationProperties (RateLimitProperties validates specs)
    Ctx->>DB: Hikari pool start; Hibernate builds metamodel, ddl-auto=validate checks app_user
    Ctx->>Ctx: create singletons in dependency order (constructor injection)
    Ctx->>T: start embedded Tomcat on :8080
    Ctx-->>SA: ApplicationReadyEvent
    SA->>SA: RedisStartupCheck.ping (log only), AnalyticsJob.refreshOnStartup → scheduler
```

**Step by step:**
1. **Java entry point.** `public static void main` in `CineSmartApplication` calls `SpringApplication.run(CineSmartApplication.class, args)`.
2. **Environment.** Property sources are layered:
   - `application.properties`
   - plus `application-dev.properties` if the `dev` profile is active
   - plus OS environment variables
   Placeholders like `${SPRING_DATASOURCE_URL}` are resolved. **A missing `JWT_SECRET`, `MAIL_USERNAME`, `MAIL_PASSWORD` or datasource variable aborts startup** with "Could not resolve placeholder", because those properties have no defaults.
3. **Component scanning** registers bean *definitions* for every stereotype under `ca.cinesmart` (definitions only, not instances yet).
4. **Auto-configuration** (§7.6) adds definitions whose conditions pass.
5. **Configuration properties binding.** `RateLimitProperties`' compact constructor parses every `max/window` spec. A typo (e.g. `10/1M`) fails startup (test: `RateLimitTest#propertiesFailFastOnATypo`).
6. **Bean instantiation and dependency resolution** in topological order:
   - `SecurityConfig.jwtSecretKey` Base64-decodes `jwt.secret` (invalid Base64 → startup failure).
   - `AuthService`'s constructor precomputes `dummyHash` with BCrypt (≈ tens of milliseconds of CPU, once).
7. **Database initialization.**
   - Hikari is created lazily or eagerly depending on version **[Version-dependent]**.
   - Hibernate **connects at startup** to read the JDBC metadata and run `ddl-auto=validate` for the one entity (`app_user`). **So PostgreSQL must be reachable for the app to start.**
   - Redis and SMTP are **not** required at startup: Lettuce and JavaMail connect on first use.
8. **Embedded server.** Tomcat binds port 8080, and the `DispatcherServlet` is registered.
9. **Readiness.**
   - `ApplicationReadyEvent` fires. `RedisStartupCheck.ping()` logs "Redis reachable: PONG" or a warning; it never fails startup (Q27).
   - `AnalyticsJob.refreshOnStartup()` schedules an immediate batch on the scheduler thread. Until that first run completes, `movie_analytics` may still hold old (or zero) values.
10. **Request handling begins.** There is no health endpoint (no Actuator), so "ready" can only be observed through the logs or a real request.

---

## Chapter 12: Controllers and HTTP Request Handling

### 12.1 API inventory (all 36 endpoints)

Base path: `/api/v1`. **Access:** P = public (no token; do not send one), O = public, JWT optional, L = login required. **IP limit group** comes from `IpRateLimitFilter.group`; **user limit group** comes from `UserRateLimitConfig`.

| # | Method & path | Controller method | Access | Input | Success | Main errors | Limits |
|---|---|---|---|---|---|---|---|
| 1 | `POST /auth/signup` | `AuthController.signUp` | P | `NewUser{username,email,password}` | **201** `SignupResponse{username,message}` | 400 fields, 409 `USERNAME_TAKEN`/`EMAIL_TAKEN`, 503 (Redis) | IP account 5/15 min |
| 2 | `POST /auth/login` | `AuthController.login` | P | `LoginRequest{username,password}` | 200 `LoginResponse` + `Set-Cookie` | 400, 401 `INVALID_CREDENTIALS`, 403 `ACCOUNT_NOT_VERIFIED`, 429 `ACCOUNT_LOCKED`/`RATE_LIMITED`, 503 | IP login 10/min + lockout |
| 3 | `POST /auth/refresh` | `AuthController.refresh` | P (cookie) | cookie `refresh_token` | 200 `LoginResponse` + new cookie | 401 (+ cookie cleared), 503 (+ cleared) | IP public 120/min |
| 4 | `POST /auth/logout` | `AuthController.logout` | L | Bearer + cookie | **204** + cookie cleared | 401 | — |
| 5 | `POST /auth/email/verify` | `EmailController.verify` | P | `TokenRequest{token}` | 200 `MessageResponse` | 400 `TOKEN_INVALID`, 503 | IP token 10/15 min |
| 6 | `POST /auth/email/resend` | `EmailController.resend` | P | `{email}` | 200 (same message always) | 400, 503 | IP account |
| 7 | `POST /auth/email/change` | `EmailController.change` | L | `ChangeEmailRequest{currentPassword,newEmail}` | 200 message | 400 fields, 409, 429 locked, 503 | IP account |
| 8 | `POST /auth/email/change/confirm` | `EmailController.confirmChange` | P | `{token}` | 200 message | 400 `TOKEN_INVALID`, 409, 503 | IP token |
| 9 | `POST /auth/password/forgot` | `PasswordController.forgot` | P | `{email}` | 200 (same message always) | 400, 503 | IP account |
| 10 | `POST /auth/password/reset` | `PasswordController.reset` | P | `ResetPasswordRequest{token,newPassword}` | 200 message | 400 `TOKEN_INVALID`/fields, 503 | IP token |
| 11 | `POST /auth/password/change` | `PasswordController.change` | L | `ChangePasswordRequest{currentPassword,newPassword}` | 200 `LoginResponse` + cookie | 400 fields, 429 locked, 503 | IP account |
| 12 | `GET /me` | `MeController.profile` | L | — | `ProfileResponse` | 401 | user read 120/min |
| 13 | `GET /me/watchlist?page&size` | `MyActivityController.watchlist` | L | paging | `PageResponse<WatchlistItem>` | 400 paging | user read |
| 14 | `GET /me/ratings?page&size` | `MyActivityController.ratings` | L | paging | `PageResponse<RatedItem>` | 400 | user read |
| 15 | `GET /me/watched` | `MyActivityController.watched` | L | — | `WatchedItem[]` | — | user read |
| 16 | `GET /me/reactions` | `MyActivityController.reactions` | L | — | `ReactionItem[]` (LIKE/DISLIKE) | — | user read |
| 17–18 | `PUT`/`DELETE /movies/{id}/watchlist` | `MovieActivityController` | L | `id>0` | `UserMovieState` | 400, 404 `MOVIE_NOT_FOUND` | user write 60/min |
| 19–20 | `PUT`/`DELETE /movies/{id}/watched` | 〃 | L | | `UserMovieState` | 〃 | 〃 |
| 21–22 | `PUT /movies/{id}/rating` (`{rating}`), `DELETE` | 〃 | L | `RatingRequestDto` 1.0–10.0, 1 dp | `UserMovieState` | 400 fields, 404 | 〃 |
| 23–24 | `PUT /movies/{id}/reaction` (`{reaction}`), `DELETE` | 〃 | L | `LIKE\|DISLIKE\|NEUTRAL` | `UserMovieState` | 400, 404 | 〃 |
| 25 | `GET /movies/{id}` | `CatalogController.getMovie` | O | `id>0` | `MovieDetails` (+`userState` if signed in) | 400, 404 | IP public |
| 26 | `GET /genres` | `CatalogController.getGenres` | O | — | `NamedRef[]` + `Cache-Control: max-age=3600` | — | IP public |
| 27 | `GET /languages` | `CatalogController.getLanguages` | O | — | `NamedRef[]` + cache 1 h | — | IP public |
| 28 | `GET /movies?genreId&languageId&year&page&size` | `DiscoveryController.browse` | O | filters | `PageResponse<MovieCard>` | 400 unknown param / unknown genre / year range | IP public |
| 29 | `GET /movies/search?q&page&size` | `DiscoveryController.search` | O | `q` 3–100 chars | `PageResponse<MovieCard>` | 400 | IP public |
| 30 | `GET /movies/trending` | `DiscoveryController.trending` | O | paging | `PageResponse<MovieCard>` | 400 | IP public |
| 31 | `GET /movies/top-rated` | `…topRated` | O | paging | page | 400 | IP public |
| 32 | `GET /movies/most-liked` | `…mostLiked` | O | paging | page | 400 | IP public |
| 33 | `GET /movies/imdb-top-250` | `…imdbTop250` | O | paging (capped at 250 total) | page | 400 | IP public |
| 34 | `GET /home` | `HomeController.home` | O | — | `HomeResponse{sections[]}` | — | IP public |
| 35 | `GET /recommendations?page&size` | `RecommendationController.recommendations` | L | paging | `PageResponse<RecommendationCard>` | 400 | user read |
| 36 | `GET /movies/{id}/similar?size` | `RecommendationController.similar` | O | `size` 1–30 (default 10) | `MovieCard[]` | 400, 404 | IP public |

### 12.2 Annotation walk-through on one controller

```java
@RestController                         // bean + @ResponseBody (Jackson writes return values)
@RequestMapping("/api/v1/movies/{id}")  // class-level path prefix with a template variable
@Validated                              // enables method-parameter constraint checks (§7.10)
public class MovieActivityController {
    @PutMapping("/watchlist")           // = @RequestMapping(method = PUT, path = "/watchlist")
    public UserMovieState addToWatchlist(
            @AuthenticationPrincipal Jwt jwt,      // principal from SecurityContext; required endpoint
            @PathVariable @Positive Long id) {     // "{id}" → Long; ≤0 → 400 with fields.id
        return activity.setWatchlist(CurrentUser.id(jwt), id);   // userId ONLY from the token
    }
```
- **Who interprets what, and when:**
  - `@RestController`/`@RequestMapping`: read at **startup** by `RequestMappingHandlerMapping`.
  - `@PathVariable`/`@AuthenticationPrincipal`: resolved **per request** by `HandlerMethodArgumentResolver`s.
  - `@Positive`: checked **per request** before the method body runs.
- **Design choice:** `userId` never comes from the client. It is always taken from the `userId` claim (`shared/security/CurrentUser.java`). This removes a whole class of IDOR bugs (*insecure direct object references*: changing an ID in the URL to reach someone else's data).

### 12.3 Notable per-endpoint behaviors

- **`POST /auth/refresh`** wraps the service call in `try/catch (ApiException)` and adds `Set-Cookie: refresh_token=; Max-Age=0` before rethrowing, so a dead cookie is removed from the browser. The rethrow keeps the normal error body.
- **`POST /auth/logout`** requires *both* a valid access token (it is blacklisted) and, optionally, the cookie (its session is deleted). It always returns 204 with a clearing cookie.
- **`POST /auth/password/change`** returns a brand-new session. The token used for the call is revoked by "tokens-valid-after". The frontend must store the new token immediately (`ChangePasswordForm` → `completeLogin`).
- **`GET /genres`, `/languages`** use `ResponseEntity.ok().cacheControl(CacheControl.maxAge(1h))`. That lets browsers and CDNs cache them. They are the only cacheable responses.
- **`GET /movies` and `/movies/search`** reject unknown query parameters (Q19). The other list endpoints ignore them. This is a deliberate but inconsistent rule.
- **Route precedence:**
  - `GET /movies/{id}` vs `GET /movies/search`: the literal `search` wins, so `{id}` is never matched with "search".
  - `GET /movies/abc` → `MethodArgumentTypeMismatchException` → 400 `BAD_REQUEST`.

---

## Chapter 13: Services and Business Logic

Each subsection gives: **problem → preconditions → steps → state changes → failures → transaction boundary**.

### 13.1 `AuthService.signUp` (signup)
- **Problem:** create an unverified account and send a verification link.
- **Steps:**
  1. `RedisFailClosed.ensureAvailable(redis)`: one PING. If Redis is down → **503 before anything is written** (the verification token would need Redis anyway; test `nothingIsWrittenWhenSignupIsRefused`).
  2. Case-insensitive existence checks for username and email → 409 with the specific code.
  3. Build `AppUser`. `setEmail` lowercases and trims. `passwordEncoder.encode(password)` runs BCrypt with strength 10 by default **[Version-dependent default]**.
  4. `saveAndFlush(user)`: INSERT immediately. A concurrent signup that passed step 2 is caught by the unique **expression indexes** → `DataIntegrityViolationException` → 409 `USERNAME_TAKEN` with the message "Username or email is already registered". Note: the code is always `USERNAME_TAKEN`, even for an email clash (see Cross-Layer Audit X-4).
  5. `verificationService.sendVerification(user)`: store `verification:token:<sha256>` = userId for 24 h, then send the email. Mail failures are caught and logged: **signup still succeeds** (the user can resend).
- **Transaction:** *intentionally none* on the service. `saveAndFlush` runs in Spring Data's own repository transaction and **commits before the email is sent** (the comment cites change.md §8). This avoids holding a DB transaction open during slow SMTP. It also avoids rolling back a user whose email bounced.

### 13.2 `AuthService.login`
**Order matters** (documented in the class Javadoc):
1. `isIpBlocked(ip)` → 429 `RATE_LIMITED` without `Retry-After`.
2. `isUserLocked(username)` → 429 `ACCOUNT_LOCKED`. The password is not checked at all.
3. Unknown username → `passwordEncoder.matches(pw, dummyHash)`. This **equalizes timing**: without it, unknown usernames would answer ~100 ms faster and leak which usernames exist. Then `recordFailure` and 401.
4. Wrong password → `recordFailure` → 401 (same message).
5. Correct password but unverified → 403 `ACCOUNT_NOT_VERIFIED`. **Not counted** as a failure.
6. Success → `reset` the counters → `tokenService.issue(userId, username, now)`.
- **State changes:** Redis counters and locks only. No DB write on login.
- **Fails closed:** if Redis is down, lockout cannot be enforced, so the lockout checks throw 503 (`LoginAttemptService.UNAVAILABLE`).

### 13.3 `LoginAttemptService` (lockout)
- **Keys:** `login:failed:user:<lowercased>`, `login:lock:user:…`, `login:failed:ip:<ip>`, `login:block:ip:…`.
- `countAndMaybeLock` runs a Lua script: `INCR`, and on the first increment `EXPIRE` = lock duration. Doing both in one script makes "increment and start the TTL" **atomic**. Two separate commands could leave a counter without a TTL if the process died between them.
- Reaching the maximum (5 per user, 10 per IP) sets the lock key for 1 h and deletes the counter.
- **Unknown usernames are counted and locked too**, so a lock does not reveal whether an account exists.

### 13.4 `TokenService` (sessions)
- **`issue(userId, username, sessionStart)`**
  - `refreshTtl = min(idleTtl 2h, sessionStart + 7d − now)`. If that is < 1 s → 401 "Session expired".
  - New refresh token (256 bits). Redis writes:
    - `refresh:<sha>` = `"userId|sessionStartEpoch"` with that TTL
    - `SADD user:sessions:<userId> <sha>`
    - `EXPIRE user:sessions:<userId> 7d`
  - Access JWT: claims `iss`, `iat`, `exp` = now + 15 min, `sub` = username, `userId`.
- **`consumeRefreshToken(token)`** (rotation with **reuse detection**, `TokenService.java:100`)
  - `GETDEL refresh:<sha>` makes the token single-use.
  - If it is absent but `refresh:used:<sha>` exists, someone presented an **already-rotated** token. That is treated as theft: `revokeAll(userId)`, then 401.
  - Otherwise: mark it `refresh:used:<sha>` (2 h) and `SREM` it from the session set.
- **`revokeAll(userId)`**: delete every refresh key in the user's set plus the set itself. Then `tokens-valid-after = now` (epoch seconds), so every access token issued *before this second* is rejected by the decoder.
- **Concurrency:** `GETDEL` is atomic in Redis, so two simultaneous refreshes with the same cookie cannot both succeed. The loser sees `refresh:used`, which **revokes every session**. The frontend serializes refreshes across tabs with Web Locks for this reason (§19.4).

### 13.5 `AccessTokenRevocationService`
- `isRevoked(jwt)` runs **on every authenticated request**, inside the decoder's validator:
  1. Blacklist check (`EXISTS jwt:blacklist:<sha>`).
  2. `GET user:tokens-valid-after:<userId>` and compare it with `iat`.
- **Fails open:** if Redis is down, the token is accepted. This is a conscious trade-off (Q24): availability over immediate revocation, with the exposure bounded by the 15-minute token lifetime.
- `blacklist(token, expiresAt)` sets a TTL equal to the token's remaining life (clamped to [1 s, 15 min]).

### 13.6 Password and email flows
| Operation | Steps | Notes |
|---|---|---|
| `PasswordResetService.forgotPassword` | PING Redis → find by email → verified: store `reset:token:<sha>` (10 min) and send the reset link; unverified: resend verification; none: nothing | The response is identical in all cases (no enumeration through content). The **response time** still differs because email is sent synchronously (§27.2, S-5) |
| `resetPassword` | `GETDEL` token → load user → encode new password → `save` → `revokeAll` | No `@Transactional`. If `save` fails after `GETDEL`, the token is already gone (§23.5) |
| `AccountService.changePassword` | lock check → verify current (failures count toward the lockout) → must differ → encode → `save` → `revokeAll` → `issue` a new session | A wrong current password is **400** (not 401), so the frontend does not try to refresh (comment at `AccountService.java:147-150`) |
| `requestEmailChange` | lock check → verify password → normalize → differs? → taken? → store `email-change:token:<sha>` = `"userId\|newEmail"` (24 h) → mail the link **to the new address** | The address only changes after confirmation |
| `confirmEmailChange` | `GETDEL` → load user → set email → `saveAndFlush` (a unique-index race gives 409) → notify the **old** address (best effort) | Sessions are unaffected |
| `VerificationService.verify` | `GETDEL` → set `isVerified=true` → `save` | Idempotent for an already-verified user |

### 13.7 `ActivityService` (writes)
Every method follows the same pattern, and **every one is `@Transactional`**:
```java
@Transactional
public UserMovieState setRating(Long userId, Long movieId, BigDecimal rating) {
    requireMovie(movieId);                         // SELECT EXISTS(...) → 404 if absent
    repository.upsertRating(userId, movieId, rating); // INSERT … ON CONFLICT DO UPDATE … rated_at=now()
    return states.getState(userId, movieId);       // one SELECT with 4 subqueries
}
```
- **Idempotence:**
  - `addToWatchlist` uses `ON CONFLICT DO NOTHING`, so a second PUT keeps the original `added_at` (test `secondPutKeepsTheOriginalAddedAt`).
  - Rating and reaction upserts **do** refresh their timestamp.
  - DELETE of a missing row is a no-op returning 200.
- **Read-your-writes:** the returned state is read **inside the same transaction**, so it always reflects the write. That is what the frontend's "apply server truth" step relies on.
- **NEUTRAL** is stored as a row (`setReaction('NEUTRAL')`) but reads the same as no row. The UI never sends it; it uses DELETE.

### 13.8 `MyListsService` (reads)
- `watchlist`/`ratings`: page of IDs + `COUNT(*)` + batched cards, in **one read-only transaction**. The count and the page therefore come from the same transaction, but under READ COMMITTED each statement still sees the latest commits. They can disagree if a write lands in between (§23.3).
- `watched`/`reactions`: non-paginated lightweight arrays. The frontend's watched-ID set loads `/me/watched` once.
- `counts`: three `COUNT(*)` subqueries in one statement (for `/me`).
- `signals`: one `UNION ALL` query feeding recommendations.

### 13.9 `CatalogService` and `MovieCardService`
- **`getMoviesByIds(ids)`** runs **five queries for any number of movies** (cores+analytics, genres, languages, availability, people), then assembles them in request order. This batch pattern avoids the *N+1 problem* (one query per movie per relation).
- **`Crew`** splits people by `movie_role.role_name` into directors/writers/cast. Other roles go to `otherCrew` (omitted from JSON when empty).
- **`getFeatures(ids)`** returns ID sets only (genre, language, actor, director), for scoring.
- **`MovieCardService.getCards(ids, userId)`:**
  - one cards query
  - plus, when signed in, two `IN (...)` lookups for the watchlist and watched flags
  - keeps the request order and skips unknown IDs

### 13.10 `DiscoveryService` and `HomeService`
- **Browse:**
  - validates the filters (genre/language must exist, year 1888–2100)
  - builds the `WHERE` from fixed `EXISTS` fragments (all values bound as parameters)
  - orders by `imdb_rating DESC NULLS LAST, imdb_votes DESC NULLS LAST, movie_id`
- **Search** (`DiscoveryRepository.search`):
  - `hits` = title matches (score + title boost 0.1) ∪ person-name matches
  - `best` = max score per movie
  - one count query + one page query
  - the transaction-local threshold is 0.3
- **Ranked lists** (`DiscoveryRepository.ranked`, `:119`):

  | List | FROM / WHERE | ORDER BY |
  |---|---|---|
  | Trending | `top10 JOIN movie` | browse order |
  | Top Rated | `movie_analytics` where `rating_count ≥ 5 AND weighted_rating IS NOT NULL` | `weighted_rating DESC, rating_count DESC, imdb_votes DESC, movie_id` |
  | Most Liked | `like_count > 0` | `like_count DESC, …` |
  | IMDb Top 250 | `imdb_votes ≥ 25000 AND imdb_rating IS NOT NULL` | capped at 250 results |

  `page()` skips the `COUNT(*)` query when a short last page already reveals the total. That is a small, clever optimization.
- **Home** (`HomeService.getHome`):
  1. When signed in, compute For You page 0 (10 items) and add those IDs to `shown`.
  2. For each ranked list in enum order, fetch `rowSize + shown.size()` candidates and drop the IDs already shown. This guarantees 10 *new* movies per row when enough exist.
  3. Build **all cards in one batched call**.
  4. Skip empty rows.

### 13.11 `RecommendationService` ("For You")
```mermaid
flowchart LR
    S[signals: watchlist, watched, ratings, likes, dislikes] --> W[weigh: rating≥8 →3, 7–7.9 →2, like →2, watched →1, watchlist →1; ×1.5 if within 90 days]
    W --> C{signal movies ≥ 3?}
    C -- no --> CS[cold start: Top Rated ∪ IMDb Top 250 minus excluded, reason 'Popular on CineSmart']
    C -- yes --> P[profile: each signal movie passes its weight to its genres, languages, actors, directors]
    P --> Q[SQL candidates: share a genre/actor/director, not excluded, most matches first, ≤300]
    Q --> F[features of candidates]
    F --> SC[CandidateScorer: 0.4·genre + 0.3·people + 0.1·language + 0.2·imdb/10, each normalized by its max]
    SC --> R[reason: people > liked movie (≥2 shared genres) > genre]
    R --> PG[page slice → cards → RecommendationCard{card, reason}]
```
- **Excluded:** everything the user already acted on (watched, watchlist, rated, liked, disliked).
- **The whole ranking is recomputed on every request**, including the home For You row. There is no cache (Q22 deferred caching).
- **Determinism:** ties are broken by IMDb votes, then movie ID. Pages are therefore stable while the data is unchanged.

### 13.12 `SimilarService`
The same scorer with a "profile" where each feature of the source movie weighs 1. A signed-in user does not see movies they watched or disliked. A movie without genres or people → `[]`.

### 13.13 `AnalyticsJob` + `AnalyticsRepository.refresh`
- `@Transactional` on the repository method (`AnalyticsRepository.java:30`):
  1. `pg_try_advisory_xact_lock`
  2. **one** `INSERT … SELECT … ON CONFLICT DO UPDATE` over **every movie**
- **Weighted rating** = `(v/(v+m))·R + (m/(v+m))·C`, where:
  - v = the movie's rating count
  - R = its average
  - C = the platform-wide average
  - m = 5 (`analytics.min-votes`)

  This is the IMDb-style Bayesian average. A movie with two 10/10 ratings does not outrank one with fifty 9/10 ratings.
- **Failure handling:** an exception rolls back the whole statement, so previous values stay intact. It is logged and swallowed (test `aFailedRunKeepsThePreviousValuesAndDoesNotThrow`).

### 13.14 Rate limiting (`RateLimiter`)
- **Fixed window per key:** a Lua script does `INCR`, then `PEXPIRE` if the key has no TTL, and returns `{count, ttl}`. When count > max, the request is denied with `Retry-After = ceil(ttl)`.
- **Fails open** on a Redis error (the request is allowed, a warning is logged).
- **Trade-off:** a fixed window lets a client send up to 2× the limit across a window boundary. Sliding windows and token buckets smooth this, at the cost of more state.

---

## Chapter 14: Repositories, JDBC, JPA and Persistence

### 14.1 Which persistence technology is actually used
| Data | Technology | Classes |
|---|---|---|
| `app_user` | **Spring Data JPA + Hibernate 7.4** (ORM) | `identity/domain/AppUser.java`, `identity/persistence/AppUserRepository.java` |
| Everything else in PostgreSQL | **Spring JDBC `NamedParameterJdbcTemplate`** with hand-written SQL | `ActivityRepository`, `UserMovieStateRepository`, `CatalogRepository`, `MovieCardRepository`, `DiscoveryRepository`, `RecommendationRepository`, `AnalyticsRepository` |
| Security state | **Spring Data Redis `StringRedisTemplate`** (Lettuce) | identity services, `RateLimiter` |

**Why the mix is reasonable.** The catalog queries are read-only projections, aggregates, CTEs and trigram search, where an ORM adds little and makes SQL harder to control. The single entity with simple CRUD (users) benefits from Spring Data's conveniences. The cost is two mental models and two kinds of transaction participants, both handled by `JpaTransactionManager`.

### 14.2 JDBC with `NamedParameterJdbcTemplate`
- **Named parameters** (`:userId`) are converted to `?` placeholders. Values are sent **separately from the SQL text**, which prevents SQL injection.
- **Collections expand:** `IN (:ids)` with a `Collection` becomes `IN (?, ?, ?)`.
  - `RecommendationRepository.orNone` replaces an empty list with `[-1]`, because `IN ()` is invalid SQL.
  - `UserMovieStateRepository.findIds` returns early instead.
- **`RowMapper` lambdas** map each `ResultSet` row to a record. `rs.getObject("year", Short.class)` keeps `NULL` as `null`, whereas `rs.getShort` would turn NULL into `0`. That is an important correctness detail, and it is used consistently for nullable columns.
- **One SQL statement per call.** With `JdbcTemplate`, *what you write is what runs*: no hidden queries and no lazy loading.
- **Dynamic SQL** in `DiscoveryRepository.browse/ranked` concatenates **only fixed fragments chosen in code**. Every user value is bound. `UserMovieStateRepository.findIds` concatenates a table name chosen from two constants (the comment documents this).

### 14.3 JPA concepts, applied to `AppUser`
```java
@Entity @Table(name = "app_user")
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)   // DB generates the id (identity column)
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(name = "username", nullable = false, unique = true) private String username;
    @Column(name = "email", nullable = false, unique = true) private String email;
    @Column(name = "password_hash", columnDefinition = "TEXT", nullable = false) private String passwordHash;
    @Column(name = "is_verified", columnDefinition = "BOOLEAN DEFAULT FALSE", nullable = false)
    private Boolean isVerified = false;
    @Column(name = "created_at", nullable = false, updatable = false, insertable = false,
            columnDefinition = "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP")
    @Generated private OffsetDateTime createdAt;   // value produced by the DB, read back after insert
}
```
| JPA concept | Here |
|---|---|
| **Entity ↔ table** | `AppUser` ↔ `app_user`, field access (because `@Id` is on a field) |
| **Identifier** | `IDENTITY`: Hibernate must execute the INSERT immediately to learn the ID (no JDBC batching of inserts), hence `saveAndFlush` |
| **`unique`, `columnDefinition`, `nullable`** | **Only affect schema generation (DDL).** With `ddl-auto=validate` they are *not* enforced. Hibernate checks that the table and columns exist with compatible types. Real uniqueness comes from the DB's indexes |
| **`insertable=false, updatable=false` + `@Generated`** | Hibernate never writes `created_at`. After the INSERT it reads the DB-generated value back (via `RETURNING` or a follow-up `SELECT`, **[Version-dependent]**) |
| **Entity states** | `new AppUser()` is **transient**. After `save`/`persist` it is **managed** (tracked by the persistence context). After the `EntityManager` closes it is **detached**. `remove` makes it **removed** (unused here) |
| **Dirty checking** | At flush, Hibernate compares managed entities with the snapshot taken at load time and issues `UPDATE` for changed ones |
| **Flush vs commit** | *Flush* sends pending SQL to the DB (still inside the transaction); *commit* makes it permanent. `saveAndFlush` forces the flush now, so constraint violations surface *here*, inside the `try/catch`, instead of later at commit |

**Why `LOWER()` queries instead of derived methods.** The repository Javadoc explains: a derived `findByUsernameIgnoreCase` would generate `UPPER(u.username) = UPPER(?)`, which cannot use the `LOWER(username)` unique index. The explicit JPQL `LOWER(u.username) = LOWER(:username)` matches the index expression.

**Relationships, lazy loading, cascades, N+1:** *not applicable to JPA here.* `AppUser` has no associations. Lazy-loading pitfalls (`LazyInitializationException`) cannot occur. N+1 is avoided in the JDBC layer by batching (§13.9).

### 14.4 Open Session in View (OSIV)
Spring Boot enables `spring.jpa.open-in-view=true` by default and logs a warning (noted in `test-results.md`). An `EntityManager` is then bound to the **whole HTTP request**.

**Effect here** **[Inferred]**: in `AccountService.changePassword`, `findById` and the later `save` share one persistence context. `user` stays *managed*, so `save` → `merge` is a no-op on a managed instance, and the change is flushed by the repository's transaction.

**Cost:** for requests that touch JPA outside a service transaction, the EntityManager (and possibly its JDBC connection) stays open until the response is written. See §36, item B-2.

### 14.5 When SQL actually runs
- **JDBC:** synchronously, at the call.
- **JPA:**
  - `findById` → `SELECT` (or a first-level cache hit within the same persistence context)
  - `save` on a new entity with IDENTITY → `INSERT` immediately
  - `save` on an existing managed entity → the `UPDATE` happens at **flush** (transaction commit or `saveAndFlush`)

  A repository call is therefore *not* always one immediate SQL statement.
- **To verify:** run with `SPRING_PROFILES_ACTIVE=dev`. That sets `spring.jpa.show-sql=true` and `hibernate.format_sql=true`, which print Hibernate's SQL. JDBC statements are not logged by that setting; add `logging.level.org.springframework.jdbc.core=DEBUG` for those.

### 14.6 Locking
No optimistic (`@Version`) or pessimistic (`SELECT … FOR UPDATE`) locking is used. Concurrency is handled by:
- primary-key upserts (`ON CONFLICT`)
- unique indexes (signup and email-change races)
- Redis atomic operations (`GETDEL`, Lua)
- an advisory lock (analytics)

See Ch. 23.

---

## Chapter 15: Java Object Lifecycle and Backend Runtime Behavior

### 15.1 Spring-managed versus manually created objects
| Kind | Examples | Lifetime |
|---|---|---|
| **Singleton beans** | all `@Service`/`@Repository`/`@Component`/controllers, `SecurityFilterChain`, `JwtDecoder`, `PasswordEncoder`, `StringRedisTemplate` | the whole application |
| **Created by beans, but long-lived** | `IpRateLimitFilter` (`new` in `SecurityConfig`), `UserRateLimitInterceptor` ×2 (`new` in `UserRateLimitConfig`), `RateLimiter.script`, `AuthService.dummyHash` | application (held by a bean) |
| **Per request** | DTO records, `PageParams`, row records, `MovieDetails`, `ApiError`, `SecurityContext`, `JwtAuthenticationToken` | one request; garbage after the response |
| **Per call** | `MapSqlParameterSource`, `StringBuilder` in `ErrorResponseWriter`, streams | a method call |

`IpRateLimitFilter` is deliberately **not** a `@Component`. Spring Boot automatically registers every `Filter` bean in the *servlet* filter chain, which would make it run twice (once there and once inside the security chain). Creating it with `new` inside the security configuration avoids that.

### 15.2 Singletons and thread safety
One `ActivityService` instance serves all Tomcat threads at once. It is safe because:
- its fields are `final` references set at construction (safe publication through the Spring container), and
- the collaborators are thread-safe: `NamedParameterJdbcTemplate`, `StringRedisTemplate`, `BCryptPasswordEncoder`, `NimbusJwtEncoder`/`Decoder`, `SecureRandom`, `DefaultRedisScript` once initialized.

Per-request state lives on the **stack** (local variables) or in **ThreadLocals** managed by frameworks:
- `SecurityContextHolder`
- `TransactionSynchronizationManager` (the bound connection)
- OSIV's EntityManager holder

### 15.3 Request threads
- Tomcat's thread pool defaults to max 200 threads **[Version-dependent]**. Virtual threads are not enabled (`spring.threads.virtual.enabled` is unset).
- A request holds its thread through filters, the controller, the service, every JDBC/Redis call and **SMTP sending** (signup, forgot, email change all send synchronously).
- The `@Scheduled` analytics job runs on the separate scheduler thread.

### 15.4 Connection and resource lifetimes
| Resource | Pool / sharing | Held for |
|---|---|---|
| PostgreSQL connection | HikariCP (default max 10) | Inside `@Transactional`: the whole method. Outside: each `JdbcTemplate` call borrows and returns one. With OSIV, possibly longer for JPA (§14.4) |
| Redis connection | Lettuce shares **one** thread-safe multiplexed connection by default **[Version-dependent]** | the application; commands are pipelined over it |
| SMTP connection | JavaMail opens one per `send` | the duration of the send |
| Redis/SMTP timeouts | `spring.data.redis.timeout=500ms`, `connect-timeout=500ms` (Q24: fail fast); SMTP: **no explicit timeout configured** | a hung SMTP server could block a request thread (§28.6) |

### 15.5 Serialization and deserialization
- **Inbound:** Jackson creates records via their canonical constructors. Unknown JSON properties are ignored (the contract says so; that is Boot's default with `FAIL_ON_UNKNOWN_PROPERTIES=false`).
- **Outbound:**
  - records are written as JSON objects
  - `@JsonInclude(NON_NULL)` on `ApiError` omits `fields`
  - `@JsonInclude(NON_EMPTY)` omits `otherCrew`
  - `@JsonUnwrapped` flattens the card into `WatchlistItem`, `RatedItem` and `RecommendationCard` (`{...card, addedAt}`)
  - `Instant` and `OffsetDateTime` become ISO-8601 strings (Jackson 3 under Boot 4 does not write dates as numeric timestamps by default **[Version-dependent]**)
- **Annotations are still `com.fasterxml.jackson.annotation.*`** even though Jackson 3's core lives in `tools.jackson.*`. Jackson 3 kept the annotations package for compatibility. This is why the imports look "old" in a Boot 4 project.

### 15.6 Proxy-based behavior
| Proxy | Created for | Effect |
|---|---|---|
| Transaction proxy (CGLIB) | `ActivityService`, `MyListsService`, `CatalogService`, `DiscoveryRepository`, `AnalyticsRepository` (classes with `@Transactional`) | begin/commit/rollback around **external** calls only (§7.14 self-invocation) |
| Method-validation proxy | `@Validated` controllers | constraint checks on parameters |
| Spring Data repository proxy (JDK dynamic proxy) | `AppUserRepository` | implements the interface at runtime |
| `@Configuration` CGLIB | `SecurityConfig`, `RedisConfig`, `UserRateLimitConfig` | singleton semantics for `@Bean` methods |

### 15.7 Garbage collection
Request objects are short-lived and are collected in young-generation collections. The largest per-request allocations are:
- recommendation scoring (up to 300 candidates × features, plus all signal movies loaded as full `MovieDetails`)
- home rendering

Both are bounded by configuration, except the number of a user's signal movies (§29.2).

---

# PART IV — Frontend Architecture and Implementation

## Chapter 16: Frontend Architecture

### 16.1 Entry point and providers
```
index.html  →  /src/main.tsx
  installSession()                       // wire session into http.ts, timers, BroadcastChannel (once)
  createRoot(#root).render(<StrictMode><App/></StrictMode>)
App.tsx
  <QueryClientProvider client={queryClient}>     // one module-level QueryClient
    <TooltipProvider delayDuration={300}>
      <RouterProvider router={router}/>          // data router from app/router.tsx
      <Toaster position=…/>                      // Sonner toasts
    </TooltipProvider>
    {env.isDev && <ReactQueryDevtools/>}
```
`installSession()` runs **before** React renders. The HTTP core therefore already has the real session adapter when the first component mounts.

### 16.2 Route and component hierarchy
```mermaid
flowchart TB
    Root["/ RootLayout (AuthGate: restore session → splash, ScrollRestoration, RouteAnnouncer)"]
    Root --> Shell[ShellLayout: skip link, Header, main, Footer]
    Root --> Auth[AuthLayout: wordmark + card]
    Shell --> Home["index → HomePage"]
    Shell --> Lists["lists/:listKey → RankedListPage"]
    Shell --> Browse["browse → BrowsePage"]
    Shell --> Search["search → SearchPage"]
    Shell --> Details["movies/:movieId → MovieDetailsPage"]
    Shell --> RA[RequireAuth]
    RA --> ForYou["for-you → ForYouPage"]
    RA --> WL["watchlist → WatchlistPage"]
    RA --> RT["ratings → RatingsPage"]
    RA --> PF["profile → ProfilePage"]
    Shell --> NF["* → NotFoundPage"]
    Auth --> GO[GuestOnly]
    GO --> Login["login"] & Signup["signup"]
    Auth --> RV["resend-verification"] & FP["forgot-password"] & VE["verify-email"] & RP["reset-password"] & CE["confirm-email"]
```
Every page route is created by the `page()` helper (`router.tsx`), which attaches `lazy` + `ErrorBoundary: RouteErrorBoundary`. Each page therefore loads as a separate chunk, and a render error stays inside the layout.

### 16.3 State ownership
| State | Owner | Mechanism |
|---|---|---|
| Session (status, token, user, end reason) | `session/session-store.ts` (module-level variable + listeners) | `useSyncExternalStore` → `useSession()` |
| Server data (home, lists, details, me, recs) | TanStack Query cache | `useQuery`/`useQueries`, keys in `query/keys.ts` |
| Watched-ID set | TanStack Query (`[v,'me','watched']`, `staleTime: Infinity`) | `useWatchedSet()` |
| URL state (filters, page, q, movieId) | the browser URL | `useSearchParams`/`useParams` |
| Form state | react-hook-form per form | `useForm` |
| Ephemeral UI (popover open, draft rating, sheet open) | the component | `useState` |
| In-flight action guard | module-level `Set` in `use-movie-actions.ts` | plain JS |

**Data flow.** Data flows **down** as props. Pages own queries; components receive data or call hooks. **Communication across distant components goes through the cache, not props.** For example, a card's watchlist button and the details page's button share one cache entry and one `mutationKey`, so they stay in sync without prop drilling.

### 16.4 API integration layer
`src/api/http.ts` is the **only** place that calls `fetch` (§19). Domain modules (`auth.ts`, `catalog.ts`, `discovery.ts`, `activity.ts`, `me.ts`, `recommendations.ts`) are thin typed wrappers. `src/query/*-queries.ts` turn them into TanStack Query options with keys and stale times.

### 16.5 Styling and assets
- Tailwind 4 utilities + design tokens in `src/styles/globals.css` (dark theme, `bg-surface`, `text-primary`, …).
- shadcn/ui-style primitives in `components/ui/*` built on the unified `radix-ui` package (accessible dialogs, menus, popovers, selects, sliders). `cn()` (`clsx` + `tailwind-merge`) composes classes.
- Font: `@fontsource-variable/inter`. Icons: `lucide-react`. Posters come from external URLs; `PosterImage` falls back to a placeholder.

### 16.6 Error and loading handling (system-wide)
| Situation | Component |
|---|---|
| Query pending | Skeletons sized like the final layout (`Skeletons.tsx`) |
| Query error | `ErrorState`: message per code, Retry button, live countdown for 429 with auto-retry |
| Empty result | `EmptyState` |
| Action error | Toast (`notify.error`), deduplicated by error code, with optimistic rollback |
| Form error | Field errors (`applyServerErrors`) + `FormAlert` (countdown for 429) |
| Render crash | `RouteErrorBoundary` |
| Session ended | Toast "Your session has expired…" + `RequireAuth` redirect to `/login?redirect=…` |

### 16.7 Build and development configuration
- Vite with an `@` alias for `src`, a strict port of 5173 (which must match the backend's CORS default), and manual vendor chunks (`react`, `router`, `query`).
- Vitest (jsdom, MSW).
- Playwright projects run in sequence to respect the backend's rate limits (§33).

---

## Chapter 17: Detailed React Component Walkthrough

> Every non-primitive component was read. Here they are grouped by role; the most instructive ones get line-level commentary.

### 17.1 Layouts
- **`RootLayout` / `AuthGate`**:
  ```tsx
  const { status } = useSession();
  useEffect(() => { void restoreSession(); }, []);   // runs once (memoized promise survives StrictMode)
  if (status === 'restoring') return <FullPageSplash />;
  return (<><Outlet /><RouteAnnouncer /></>);
  ```
  **Why gate the whole tree?** If pages rendered before the restore finished, their first requests would go out **anonymously**, caching anonymous data under the `'anon'` key. When the token then arrived, the viewer would switch and everything would load twice. The gate trades a short splash (at most 5 s, `RESTORE_MAX_MS`) for correct first requests.
- **`RouteAnnouncer`:** after a client-side navigation, it waits one animation frame, moves focus to the page's `h1`, and writes `document.title` into an `aria-live` region. Screen readers otherwise would not notice SPA navigations. It stores the last pathname in a ref, not a "first render" flag, so StrictMode's double effect does not announce twice.
- **`ShellLayout`:** "skip to content" link (focuses `<main>` directly), `Header`, `main#main`, `Footer`.
- **`AuthLayout`:** a centered card for auth and email-link pages.

### 17.2 Guards (`session/guards.tsx`)
- **`RequireAuth`:**
  - authenticated → `<Outlet/>`
  - restoring → `null`
  - logged out on purpose (`endReason==='logout'`) → `<Navigate to="/">`
  - otherwise → `/login?redirect=<current path+search>`
- **`GuestOnly`:** a signed-in user visiting `/login` or `/signup` is sent to `safeRedirect(redirect)`.
- **These are UX, not security.** The server enforces access on every call (§26.6).

### 17.3 Header, menus and search
- **`Header`:** responsive. Desktop has nav + `BrowseMenu` + `SearchBox` + `UserMenu` or Sign in/up. Mobile has a search sheet + `MobileNav` sheet. `handBackFocus` returns focus to the opening button unless a navigation happened (then `RouteAnnouncer` owns focus).
- **`BrowseMenu`:** Radix dropdown. Genres and languages load **only on first open** (`enabled: opened`) and share the 1 h cache with `/browse`.
- **`SearchBox`:** an uncontrolled `<form role="search">`. On submit it reads `FormData`, validates with `checkSearchQuery` (3–100 chars after trimming, the same rule as the backend), then navigates to `/search?q=…`. An invalid query shows an inline `role="alert"` hint and **makes no request**.
- **`UserMenu` / `MobileNav`:** account links + Sign out (`signOut()` then navigate to `/`).

### 17.4 Movie presentation
- **`MovieCard`:**
  - props: `movie`, `caption?`, `action?` (default `CardWatchlistButton`), `variant`, `priority`
  - a single `<Link>` with a composed `aria-label` ("Title, 2014, in your watchlist, watched")
  - the action button sits **outside** the link, so clicking it never navigates
  - the watched marker reads the **watched-ID set** when loaded (`useWatchedSet()`), because `card.watched` in older cached pages can be stale
- **`MovieGrid`:** a `ul/li` grid; the first 6 posters load eagerly.
- **`MovieRow`:**
  - starts from `initial` cards (page 0 from `/home`)
  - `requested` (state) counts extra pages; `useQueries` runs one query per requested page
  - `onScroll` → `loadMoreIfNearEnd()` increments `requested` when the scroller is within one viewport of its end
  - `mergeCards` de-duplicates by `movieId`
  - a "See all" tile appears when no more pages can load
  - keys per page come from `sectionPageQuery(v, key)`, so a later `/lists/:key` visit reuses the cached pages
- **`PosterImage`:** handles a `null` or `"N/A"` src and load errors, showing a placeholder with the title. `failedSrc` state remembers which URL failed, so a new `src` retries.
- **`PaginationBar`, `page-items.ts`:** real `<Link>`s to `?page=N` (works without JS state; shareable URLs).
- **`RatingBadges`, `ReasonChip`:** presentational.

### 17.5 Activity controls (`components/activity/*`) and `useMovieAction`
All four controls call `useMovieAction(movieId, kind)` (`features/movie/use-movie-actions.ts`). It returns `{ pending, signedIn, promptSignIn, run }`.

**`run(action)` step by step:**
1. If anonymous: `promptSignIn()`, which shows a toast and navigates to `/login?redirect=<here>`.
2. If `inFlight.has("42:watchlist")`, ignore the call. This module-level `Set` prevents a double click from sending twice (`:121`).
3. `mutation.mutate(action)`. Then:
   - **`onMutate`:**
     - cancel any in-flight details query for this movie (so it cannot overwrite the optimistic value)
     - snapshot the details, the watched set and every card list
     - write `expectedState(...)` into the details `userState`
     - patch `inWatchlist`/`watched` in every cached card of this viewer (`patchCardFlags`)
   - **`onError`:** restore the snapshots. Toast unless the error is `UNAUTHORIZED` (the session code already showed the expiry toast).
   - **`onSuccess`:** `applyUserState`. The **server response is the source of truth**: write it into the details, re-patch the cards, update the watched set, and invalidate `/me` profile, the affected `/me` list, and recommendations. **Home is deliberately not invalidated**: its cards were patched in place, so going back shows the new flags without a refetch.
   - **`onSettled`:** remove the in-flight key.
4. `pending = useIsMutating({mutationKey:['activity', movieId, kind]}) > 0`. Every control for the same movie and action, on any part of the page, shows busy at once.

**Controls:**
- `WatchlistButton` (full/compact), `CardWatchlistButton` (hover-revealed over posters, always visible on touch screens).
- `WatchedButton` (tooltip "Click to unmark" when active).
- `ReactionButtons`: toggle logic `reaction === value ? null : value`. `null` → DELETE; NEUTRAL is never sent.
- `RatingControl`: a Radix Popover with a **controlled** text input + slider. `parseRating` enforces `^\d{1,2}(\.\d)?$` and 1–10, and Save is disabled when the value is invalid or unchanged. Opening when anonymous prompts sign-in instead.
- `pending-props.ts`: busy controls use `aria-busy` + `aria-disabled` (not `disabled`), so keyboard focus is not lost.

### 17.6 Pages
| Page | Queries | Notable logic |
|---|---|---|
| `HomePage` | `homeQuery(v)` | Hero for anonymous users; a `MovieRow` per section with `key={`${v}-${section.key}`}` |
| `RankedListPage` | `rankedListQuery(v, key, page-1, 20)` | Unknown `listKey` → `NotFound` **without a request**; `placeholderData` keeps the previous page only for the *same* list |
| `ForYouPage` | `recsQuery` + `keepPreviousData` | Cold-start banner when every reason is "Popular on CineSmart" |
| `BrowsePage` | genres, languages, `browseQuery` | URL ⇄ filters (`browse-params.ts`). Non-numeric filters are removed by a render-time `<Navigate replace state={{filterRemoved:true}}>`. A 400 with `fields.genreId` makes an effect drop that filter. Filters live in a bottom sheet on mobile, and the "focus this filter" state comes from the Browse menu |
| `SearchPage` | `searchQuery` | An invalid `q` shows a hint without a request; `<Results key={q}>` |
| `MovieDetailsPage` | `movieQuery`, `similarQuery` | A non-numeric id → `NotFound` without a request; 404 `MOVIE_NOT_FOUND` → the "Movie not found" variant. Sections: actions, external ratings, CineSmart stats (with a one-time lag hint after a rating/reaction), credits linking to a people search, where-to-watch grouped by type (external links `rel="noopener noreferrer"`), similar row |
| `WatchlistPage`, `RatingsPage` | `watchlistQuery`/`ratingsQuery` + `keepPreviousData` | Removing an item fades it (`inWatchlist === false` → opacity), then the refetch removes it. `ListResults` redirects a past-the-end page to the last page |
| `ProfilePage` | `profileQuery`, `reactionsQuery` | Counts (liked/disliked are computed client-side from `/me/reactions`), `ChangePasswordForm`, `ChangeEmailForm`, sign out |
| Auth pages | — (mutations) | Ch. 20 |
| `NotFound`, `RouteErrorBoundary` | — | 404 inside the shell; the boundary logs and offers a reload |

### 17.7 Shared feedback components
`ErrorState` (code → message; 429 countdown → auto-retry at 0 through the latest-ref pattern), `EmptyState`, `InlineAlert` (`role=alert` for errors, `status` otherwise), `RetryAfterNotice` (announces once to screen readers; the visual countdown is `aria-hidden`), `FullPageSplash`, `InfoTooltip`, `notify` (Sonner wrappers; errors deduplicated by `error:<code>` id).

---

## Chapter 18: React Rendering, State, and Browser Behavior

### 18.1 Startup sequence in the browser
1. The browser parses `index.html` and downloads the module graph. In production that is the hashed chunks in `dist/assets`.
2. `main.tsx` runs: `installSession()` (adapter, `visibilitychange` listener, BroadcastChannel, dev tools), then `createRoot().render()`.
3. **First render:**
   - `App` → providers → `RouterProvider` matches the URL → `RootLayout` → `AuthGate`
   - `status === 'restoring'` → splash
   - React commits the DOM, then runs effects: `restoreSession()` → `POST /auth/refresh`
4. **Refresh resolves:**
   - `setAuthenticated(...)` or `setAnonymous(null)` updates the store and notifies listeners
   - `useSyncExternalStore` sees a new snapshot → `AuthGate` re-renders → `<Outlet/>`
   - the lazy page chunk loads (React Router `lazy`); during the load the previous UI (the splash) stays
5. **Page render:**
   - `useQuery` starts the fetch and returns `isPending` → skeleton
   - when data arrives, the cache notifies → the component re-renders with data → React reconciles and patches the DOM

### 18.2 What causes a re-render here
- a `useState` setter (`setDraft`, `setOpen`, `setRequested`)
- a new snapshot from an external store (`useSession`, `useMediaQuery`)
- a TanStack Query cache change for a subscribed key (data, status, `isPlaceholderData`)
- a router location change (`useSearchParams`, `useParams`, `useLocation`)
- the parent re-rendering, unless memoized (this code does not use `React.memo`; the trees are small enough)

**Not** a cause: mutating a ref (`started.current = true`), and react-hook-form keystrokes in uncontrolled fields (RHF re-renders only when subscribed state such as `errors` or `isSubmitting` changes).

### 18.3 State update timing
State updates are **batched** (React 18+ automatic batching): several `setState` calls in one event handler, or after an `await`, produce one render. `setState` does not change the variable in the current render; the new value appears in the *next* render. That is why `RatingControl.save()` computes from the already-derived `value`, not from the state it is about to set.

### 18.4 React's model versus the DOM and the event loop
- **The JS event loop** runs one task at a time: a click handler, a `fetch` resolution (microtask), a timer callback.
- **React** turns state into a virtual tree, diffs it, and commits DOM mutations. Then the **browser** lays out and paints.
- **Effects** run after paint (`useEffect`), which is why `RouteAnnouncer` additionally waits for `requestAnimationFrame` before moving focus: the page's own effects (setting `document.title`) must have run first.

### 18.5 Effects and cleanup in this codebase
| Effect | Cleanup |
|---|---|
| `useRetryAfter` interval (250 ms) | `clearInterval` |
| `RouteAnnouncer` rAF | `cancelAnimationFrame` |
| `BrowsePage` double rAF focus | `cancelAnimationFrame` |
| `useMediaQuery` `change` listener | `removeEventListener` (via the `useSyncExternalStore` unsubscribe) |
| `installSession()` | returns an `uninstall` used by tests |

### 18.6 One subtle correctness design: avoiding cache cross-contamination
Public endpoints return **viewer-specific** data (flags, `userState`). If a token silently expires, the backend answers *anonymously* with status 200 (by design, [CONV-2]). Two safeguards exist:
1. `ensureFreshToken()` refreshes **before** any optional or required request when less than 30 s remain.
2. `fetchWithUserData(fetch, hasUserData)`: if the session is authenticated but the response lacks user data, it refreshes once and fetches again (`query/user-data-retry.ts`).

The data is then cached under the right viewer key, and logout removes the whole `[userId]` prefix (`endSession`).

---

## Chapter 19: Frontend API Client and Data Flow

### 19.1 `request()` in `src/api/http.ts`
```ts
request<T>(method, path, { auth: 'none' | 'optional' | 'required', query?, body?, signal? })
```
1. `buildUrl`: base URL + path, dropping `undefined`/`null`/`''` query values. `/movies` rejects empty or unknown parameters, so this matters.
2. If auth is not `'none'`: `await session.ensureFreshToken()`.
3. `'required'` with no token: throw a local `ApiError(401, UNAUTHORIZED)` **without a network call**.
4. `send()`:
   - headers: `Content-Type: application/json` only when there is a body, and `Authorization: Bearer` only when auth is not `'none'` and a token exists
   - `fetch(url, { credentials: 'include', signal })` (`:121`). `'include'` makes the browser send and store the cross-origin refresh cookie
5. **Response handling:**
   - 204 → `undefined`
   - 2xx → parse JSON (empty → `undefined`)
   - otherwise → `toApiError`: parse the backend error body (`code`, `message`, `path`, `fields`) and the `Retry-After` header; a non-JSON body falls back to a code derived from the status
6. **Network failure** (fetch rejects): `ApiError(status 0, NETWORK_ERROR)`. An `AbortError` is rethrown as is (TanStack Query cancels queries this way).
7. **`'required'` + 401 `UNAUTHORIZED`:** call `session.refresh()` **once** and retry **once** (`:90`). A failed refresh or a second 401 → `session.expire()` → end the session with a toast.

**Why `auth:'none'` never sends the header.** A stale token sent to a *public* auth POST would make Spring Security reject the request with 401 before the endpoint runs ([CONV-2]). Login and signup must work even with a dead token in memory.

### 19.2 Major calls
| Call | Initiator | Trigger | Request | Response → state | UI |
|---|---|---|---|---|---|
| Restore | `AuthGate` effect | app load | `POST /auth/refresh` (cookie) | session store | splash → app |
| Home | `HomePage` | mount | `GET /home` | `[v,'home']` | rows |
| Row page N | `MovieRow` | horizontal scroll | `GET /movies/{list}?page=N&size=10` or `/recommendations` | `[v,'list',key,N,10]` | more cards |
| Details | `MovieDetailsPage` | mount / id change | `GET /movies/{id}` | `[v,'movie',id]` | details |
| Similar | `Similar` | mount | `GET /movies/{id}/similar?size=10` | `[v,'similar',id,10]` | row |
| Browse | `BrowsePage` | URL change | `GET /movies?genreId&…&page&size=20` | `[v,'browse',params]` | grid |
| Search | `SearchPage` | URL `q` | `GET /movies/search?q&page&size=20` | `[v,'search',q,…]` | grid |
| Activity | `useMovieAction` | click | `PUT`/`DELETE /movies/{id}/…` | details + cards + watched set | button state |
| Watched set | `useWatchedSet` | first signed-in card | `GET /me/watched` | `Set<number>` | eye markers |
| Profile | `ProfilePage` | mount | `GET /me`, `GET /me/reactions` | `[v,'me',…]` | counts |
| Login | `LoginPage` | submit | `POST /auth/login` | `completeLogin` | navigate |
| Logout | `signOut()` | menu | `POST /auth/logout` | `endSession` | toast, `/` |

### 19.3 Frontend models versus backend DTOs
The TypeScript interfaces in `src/api/types.ts`, `catalog.ts`, `me.ts`, `recommendations.ts` and `discovery.ts` mirror the Java records **field by field**:

| TS | Java | Transformation |
|---|---|---|
| `MovieCard` | `shared/movie/MovieCard` | `Short year` → `number \| null`; `BigDecimal` → `number`; `Boolean` flags → `boolean \| null` |
| `WatchlistItem extends MovieCard {addedAt}` | `WatchlistItem(@JsonUnwrapped MovieCard card, Instant addedAt)` | flattening by `@JsonUnwrapped` matches TS `extends` |
| `MovieDetails` | `catalog/domain/MovieDetails` | `LocalDate released` → `string 'YYYY-MM-DD'`; `otherCrew?` optional (omitted when empty) |
| `UserMovieState` | `shared/movie/UserMovieState` | `reaction` is never null (the backend maps a missing row to "NEUTRAL") |
| `LoginResponse` | `identity/api/dto/LoginResponse` | `expiresIn` seconds → `expiresAt = Date.now() + expiresIn*1000` (§19.5) |
| `ApiErrorBody` | `shared/api/ApiError` | `fields?` optional (`NON_NULL`) |

The full mismatch analysis is in the Cross-Layer Consistency Audit.

### 19.4 The refresh coordinator (`session/refresh.ts`)
**Why it exists.** The backend treats a reused refresh token as theft and revokes **all** sessions (§13.4). Two tabs, or two requests in one tab, refreshing with the same cookie would log the user out everywhere.

**How it works:**
- `refreshSession()` is **single-flight per tab** (`inFlight ??= run()`).
- `run()` takes the Web Lock `cinesmart-refresh` (`navigator.locks.request`, `:34`), which serializes refreshes **across tabs**.
- Under the lock it checks whether another tab already refreshed and broadcast a token that differs from the one it started with and is valid for more than 60 s (`ADOPT_MIN_VALIDITY_MS`). If so, it adopts it with no request.
- Otherwise it calls `POST /auth/refresh`, stores the result and broadcasts it.

**Error mapping:**
- 401 → session ended (an expiry toast only if there was a live session)
- 503 → ended with "Sign-in is temporarily unavailable"
- 429 / network → rejected, current state kept

### 19.5 Clock-skew safety
`expiresAt = receipt time + expiresIn`. The client never parses the JWT's `exp` claim, so a wrong device clock cannot make tokens look expired or valid. The decision to refresh is based only on local elapsed time. That is a robust design choice.

### 19.6 Cross-tab sync (`session/cross-tab.ts`)
A `BroadcastChannel('cinesmart-session')` carries `{type:'session', accessToken, expiresAt, user}` or `{type:'logout'}`. `handleSessionMessage`:
- adopts newer tokens
- clears the previous viewer's cache if the user changed
- ends the session on logout (without re-broadcasting)

Messages are validated with a type guard (`isSessionMessage`).

---

## Chapter 20: Forms, Validation, and User Interaction

### 20.1 Pattern used by every form
```tsx
const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues });
const server = useFormServerError(form.setError, ['field1', 'field2']);
const onSubmit = form.handleSubmit(async (values) => {
  server.clear();
  try { await apiCall(values); /* success path */ }
  catch (error) { server.handle(error); }
});
<form noValidate onSubmit={(e) => void onSubmit(e)}>
  <FormAlert error={server.error} message={server.message} />
  <TextField … error={errors.x?.message} {...form.register('x')} />
  <SubmitButton pending={isSubmitting} blocked={server.blocked}>…</SubmitButton>
</form>
```
- **Uncontrolled inputs** via `register` (§8.9).
- **`noValidate`** turns off the browser's built-in validation bubbles; Zod's messages are shown instead.
- **Client-side validation** (`src/lib/validation.ts`) mirrors the backend rules: username regex 3–32, email trimmed and ≤ 64 and valid, password 8–100, token 1–200, the confirm-password match (client-only).
- **Server-side validation** is authoritative. `applyServerErrors` maps `fields` onto inputs by JSON name, and maps `USERNAME_TAKEN`/`EMAIL_TAKEN` to the right field. Anything unmapped becomes the form-level alert.
- **Duplicate-submission protection:**
  - `SubmitButton` is `disabled` while `isSubmitting`
  - `handleSubmit` ignores re-entry while a submit is running
  - activity controls use the `inFlight` set
  - email-link tokens use the `started` ref
- **Rate limits:** `useFormServerError` exposes `blocked` while a `Retry-After` countdown runs, so the submit button stays disabled until it ends (test "login submit comes back when the Retry-After countdown ends").

### 20.2 Per-form behavior
| Form | Success | Special errors |
|---|---|---|
| Login | `completeLogin` → navigate to `safeRedirect(redirect)` (replace) | 403 `ACCOUNT_NOT_VERIFIED` → show the inline resend panel; 429 `ACCOUNT_LOCKED` → message, no countdown |
| Signup | navigate to `/login` with a `signed-up` notice | 409 → field error |
| Forgot / Resend | show the server's generic message | — |
| Reset password | `endSession({reason:'logout'})` (the server revoked everything), then `/login` with a notice | `TOKEN_INVALID` or `fields.token` → "Link not valid" view |
| Change password | `completeLogin(newSession)` (the old token is revoked), toast, `form.reset()` | wrong current password → 400 field error (no refresh attempt, by design) |
| Change email | alert "We sent a confirmation link to …", `form.reset()` | 503 → screen-specific message `EMAIL_SEND_FAILED` |
| Rating popover | closes immediately; optimistic | invalid input never sent |

### 20.3 Why client-side validation does not replace server validation
The browser is under the user's control: anyone can call the API with `curl` and skip the SPA. Client-side checks exist for **fast feedback and fewer requests**. They protect the shared rate-limit budget too. The **server** is the trust boundary: Bean Validation, service-level checks and DB constraints. A concrete case in this code: the frontend trims emails before sending (Zod `.trim()`), but the backend rejects padded emails. The frontend therefore masks BUG-02, and only direct API clients see it.

---

# PART V — Database Design and Data Persistence

## Chapter 21: Database Schema and Data Model

**Source of truth:** `Cinesmart_database_schema.sql` (root). Its header says it is the *real schema captured 2026-10-12 plus V019–V022*. `Database/Schema.sql` is the same file plus a trailing `ROLLBACK ;`, and it is what the tests load.
**[Unknown]** Whether your live database has V022 applied: `final-stage-chat-prompt.md` lists V022 as a remaining manual step. Verify with the query in V022's header.

### 21.1 Entity–relationship diagram

```mermaid
erDiagram
    movie ||--o{ movie_genre : has
    genre ||--o{ movie_genre : tags
    movie ||--o{ movie_language : has
    language ||--o{ movie_language : tags
    movie ||--o{ movie_person : credits
    person ||--o{ movie_person : appears
    movie_role ||--o{ movie_person : as
    movie ||--o{ availability : "streams on"
    movie ||--o| movie_analytics : "derived stats"
    movie ||--o| top10 : "trending"
    app_user ||--o{ watchlist : keeps
    movie ||--o{ watchlist : in
    app_user ||--o{ already_watched : marks
    movie ||--o{ already_watched : in
    app_user ||--o{ user_rating : rates
    movie ||--o{ user_rating : rated
    app_user ||--o{ user_reaction : reacts
    movie ||--o{ user_reaction : gets

    movie { bigint movie_id PK; varchar imdb_id UK; int tmdb_id UK; varchar title; smallint year; date released; smallint runtime; text plot; text poster; varchar content_type; varchar studio; smallint rotten_tomatoes; smallint metascore; numeric imdb_rating; bigint imdb_votes; numeric box_office }
    app_user { bigint user_id PK; varchar username UK; varchar email UK; text password_hash; boolean is_verified; timestamptz created_at }
    user_rating { bigint user_id PK_FK; bigint movie_id PK_FK; numeric rating; timestamptz rated_at }
    user_reaction { bigint user_id PK_FK; bigint movie_id PK_FK; varchar reaction; timestamptz reacted_at }
    movie_analytics { bigint movie_id PK_FK; int rating_count; numeric average_rating; numeric weighted_rating; int like_count; int dislike_count; timestamptz updated_at }
```

### 21.2 Tables
| Table | Purpose | PK | FKs (on delete) | Constraints / defaults | Indexes beyond the PK | Java mapping |
|---|---|---|---|---|---|---|
| `movie` | catalog row (ETL-owned) | `movie_id` identity | — | `imdb_id` UNIQUE, `tmdb_id` UNIQUE, `title NOT NULL`, CHECKs on year ≥ 1888, runtime > 0, RT/metascore 0–100, imdb_rating 0–10, votes ≥ 0, box_office ≥ 0 | GIN trigram `LOWER(title)`, B-tree `year` | `CatalogRepository.CoreRow`, `MovieCard` (JDBC) |
| `person` | people | `person_id` | — | `name NOT NULL UNIQUE` | `idx_person_name` (**redundant** with the unique constraint's index), GIN trigram `LOWER(name)` | `PersonRef` |
| `movie_role` | Actor/Director/Writer/… | `role_id` | — | `role_name UNIQUE` | — | role strings in `CatalogService` |
| `movie_person` | credits | `(movie_id, person_id, role_id)` | movie CASCADE, person CASCADE, role RESTRICT | — | `person_id` | `PersonRow`, `PersonIdRow` |
| `genre` / `language` | vocabularies | id | — | name UNIQUE | `LOWER(name)` (unused by current queries) | `NamedRef` |
| `movie_genre` / `movie_language` | links | composite | movie CASCADE, genre/language RESTRICT | — | `genre_id` / `language_id` | `LinkRow` |
| `app_user` | accounts | `user_id` | — | `username` UNIQUE (`VARCHAR(100)`), `email` UNIQUE (`VARCHAR(320)`), `is_verified NOT NULL DEFAULT FALSE`, `created_at NOT NULL DEFAULT CURRENT_TIMESTAMP` | **unique** `LOWER(username)`, **unique** `LOWER(email)` | `AppUser` (**JPA**) |
| `watchlist` | user's list | `(user_id, movie_id)` | both CASCADE | `added_at DEFAULT CURRENT_TIMESTAMP` | — (the PK's leading `user_id` serves per-user scans) | `TimedId` |
| `already_watched` | watched | `(user_id, movie_id)` | both CASCADE | `watched_at` default | — | `WatchedItem` |
| `user_rating` | ratings | `(user_id, movie_id)` | both CASCADE | `rating NUMERIC(3,1) NOT NULL`, CHECK 0–10, `rated_at` default | — | `RatedId` |
| `user_reaction` | like/dislike/neutral | `(user_id, movie_id)` | both CASCADE | CHECK `IN ('LIKE','DISLIKE','NEUTRAL')`, `reacted_at DEFAULT now()` (V020) | — | `ReactionItem` |
| `availability` | Canadian platforms | `(movie_id, platform)` | movie CASCADE | type CHECK `sub/rent/buy/free/NULL` | — | `Availability` |
| `movie_analytics` | derived stats (batch-owned) | `movie_id` | movie CASCADE | counts ≥ 0 and NOT NULL DEFAULT 0, averages 0–10 or NULL | — | `PlatformStats`, ranked list SQL |
| `top10` | trending (ETL-owned) | `movie_id` **INT** | movie CASCADE | — | — | ranked list SQL |

### 21.3 Important invariants and where they are enforced
| Invariant | Enforced by |
|---|---|
| One rating/reaction/watchlist entry per user and movie | **DB** composite PK + `ON CONFLICT` upserts |
| Usernames/emails unique ignoring case | **DB** expression unique indexes (V021) + app pre-checks for nice errors |
| Email stored lowercased and trimmed | **App** (`AppUser.setEmail`); V021 normalized existing rows. *Not* a DB CHECK |
| Rating 1.0–10.0 with one decimal | **App** (`RatingRequestDto`); the **DB allows 0–10** with one decimal (looser, see X-6) |
| Username format `[A-Za-z0-9_.-]{3,32}` | **App** only; the DB allows up to 100 characters of anything |
| Activity only for existing movies | **App** (`requireMovie` → clean 404) **and DB** FKs (the final guard) |
| `movie_analytics` matches the activity tables | **Batch job**, eventually (≤ 1 h). Not transactional with writes |

### 21.4 Schema drift worth knowing
- `top10.movie_id` is `INT` while `movie.movie_id` is `BIGINT` (the comment: "as in the real DB"). It works until IDs exceed 2³¹−1.
- `idx_person_name` duplicates the unique constraint's index (wasted write cost and storage; harmless).
- `Database/Scripts/reset_dev_database.sql` truncates a `user_like` table that does not exist and misses `user_reaction`, `movie_analytics` and `top10`. Running it will **fail** with "relation does not exist" (§36, item B-5).
- V001–V018 cannot rebuild the database (the root schema's header admits this). Only the root file can.

### 21.5 Intended versus deployed schema
The repository describes the *intended* schema. Hibernate validates only `app_user` at startup. Every JDBC query would fail at **runtime** (not at startup) if a column were missing. Check the live schema with `Database/Scripts/schema_capture.sql` (read-only).

### 21.6 The second data store: the Redis key space
Redis is not a relational database, but it is part of the data model:

| Key | Value | TTL | Written by | Read by |
|---|---|---|---|---|
| `refresh:<sha256>` | `userId\|sessionStartEpoch` | ≤ 2 h idle, capped at 7 d | `TokenService.issue` | `consumeRefreshToken` (GETDEL) |
| `refresh:used:<sha256>` | `userId` | 2 h | consume | reuse detection |
| `user:sessions:<userId>` | SET of hashes | 7 d | issue | `revokeAll` |
| `user:tokens-valid-after:<userId>` | epoch seconds | 16 min | `revokeAll` | `isRevoked` |
| `jwt:blacklist:<sha256>` | `1` | the token's remaining life | logout | `isRevoked` |
| `verification:token:<sha>` | userId | 24 h | `sendVerification` | `verify` (GETDEL) |
| `reset:token:<sha>` | userId | 10 min | `forgotPassword` | `resetPassword` (GETDEL) |
| `email-change:token:<sha>` | `userId\|newEmail` | 24 h | `requestEmailChange` | confirm (GETDEL) |
| `login:failed:{user,ip}:…` / `login:lock:user:…` / `login:block:ip:…` | counters / `true` | 1 h | `LoginAttemptService` | login |
| `rl:ip:<group>:<ip>`, `rl:user:<group>:<userId>` | counter | window | `RateLimiter` | `RateLimiter` |

**Durability.** **[Unknown]** Redis persistence (RDB/AOF) is not configured in this repo. If Redis restarts empty, every refresh session is lost (all users must sign in again), lockouts reset, and pending email links stop working.

---

## Chapter 22: From Java Objects to SQL and Back

### 22.1 CREATE: signup (JPA)
1. **Request:** `POST /api/v1/auth/signup` with `{"username":"Alice","email":"Alice@Example.com","password":"Password123!"}`.
2. **DTO:** `NewUser` record, validated (`@Pattern`, `@Email`, `@Size`).
3. **Service:** the existence checks run JPQL. Hibernate translates
   `SELECT COUNT(u) > 0 FROM AppUser u WHERE LOWER(u.username) = LOWER(:username)` into SQL, approximately
   `select count(a.user_id)>0 from app_user a where lower(a.username)=lower(?)`. **[Inferred; the exact text is Hibernate's]**
4. **Entity:** `new AppUser()` (transient); `setEmail` stores `alice@example.com`; `passwordHash = $2a$10$…`.
5. **Repository:** `saveAndFlush(user)` → `SimpleJpaRepository.save` sees `userId == null`, so the entity is new → `em.persist` → with IDENTITY, Hibernate executes immediately:
   ```sql
   insert into app_user (email, is_verified, password_hash, username) values (?, ?, ?, ?)
   -- generated user_id (and created_at, because of @Generated) read back via RETURNING or a follow-up select
   ```
   **[Inferred/Version-dependent]** Verify with the `dev` profile's `show-sql`. Note: `created_at` is excluded from the insert (`insertable=false`), so the DB default applies.
6. **Transaction:** Spring Data's repository-level `@Transactional`. Commit on return. A unique-index violation surfaces as `DataIntegrityViolationException` *inside* the `try`, because of the flush.
7. **Back to Java:** the entity now has `userId` and `createdAt`.
8. **Response:** `SignupResponse("Alice", "Successfully registered…")` → JSON → 201.

### 22.2 UPDATE: rate a movie (JDBC upsert)
```java
jdbc.update("""
    INSERT INTO user_rating (user_id, movie_id, rating) VALUES (:userId, :movieId, :rating)
    ON CONFLICT (user_id, movie_id) DO UPDATE SET rating = EXCLUDED.rating, rated_at = now()
    """, Map.of("userId", 7L, "movieId", 42L, "rating", new BigDecimal("8.5")));
```
- **This is the exact SQL** (JDBC, no ORM). pgjdbc sends it as a prepared statement with `$1,$2,$3`. `EXCLUDED` is the row that failed to insert.
- **One statement, atomic.** Two concurrent ratings by the same user for the same movie serialize on the row lock; the last one wins.
- `now()` is the **transaction start time** in PostgreSQL. Every `now()` within one transaction returns the same value.

### 22.3 READ: details (JDBC, 5–6 queries)
For `GET /movies/42` as user 7:
1. `findCores` — `movie LEFT JOIN movie_analytics … WHERE movie_id IN (42)`
2. `findGenres` — `movie_genre JOIN genre … ORDER BY genre_name`
3. `findLanguages`
4. `findAvailability` — `… ORDER BY platform`
5. `findPeople` — `movie_person JOIN person JOIN movie_role … ORDER BY p.name`
6. (signed in) `findState` — one row: `EXISTS`, `EXISTS`, scalar subquery, scalar subquery

Rows are mapped to records, grouped in `LinkedHashMap`s, assembled into `MovieDetails`, then `withUserState(...)`. Jackson writes JSON, with `released` as `"2014-11-07"` and `otherCrew` omitted when empty.

### 22.4 DELETE: remove from watchlist
`DELETE FROM watchlist WHERE user_id = :userId AND movie_id = :movieId`. A missing row is not an error, so the operation is idempotent. The response state is read in the same transaction.

### 22.5 Batch: analytics (one statement for the whole table)
`INSERT INTO movie_analytics (...) SELECT ... FROM movie CROSS JOIN platform LEFT JOIN ratings LEFT JOIN reactions ON CONFLICT (movie_id) DO UPDATE ...` rewrites every movie's row. `jdbc.update` returns the number of affected rows, which is logged.

### 22.6 How to verify the SQL
- **Hibernate SQL:** `SPRING_PROFILES_ACTIVE=dev` (show-sql + format_sql).
- **JDBC SQL:** `logging.level.org.springframework.jdbc.core.JdbcTemplate=DEBUG`.
- **On the server:** `log_statement = 'all'` in a development PostgreSQL, or the `pg_stat_statements` extension.
- **Plans:** run `EXPLAIN (ANALYZE, BUFFERS)` on the search and ranked-list queries with production-like data.

---

## Chapter 23: Transactions, Consistency, and Concurrency

### 23.1 Transaction boundaries actually declared
| Method | Annotation | What it protects |
|---|---|---|
| `ActivityService.*` (8 methods) | `@Transactional` | existence check + write + state read in one unit; read-your-writes |
| `MyListsService.watchlist/ratings` | `@Transactional(readOnly = true)` | page + count + cards share one connection |
| `CatalogService.getMoviesByIds`, `getFeatures` | `@Transactional(readOnly = true)` | five queries on one connection (only when called from another bean) |
| `DiscoveryRepository.search` | `@Transactional(readOnly = true)` | `set_config(..., true)` scope + two queries |
| `AnalyticsRepository.refresh` | `@Transactional` | advisory lock + full upsert, atomic |
| Spring Data `AppUserRepository` methods | implicit (repository-level) | each `save`/`find` |
| **Not transactional** | `AuthService.signUp`, `PasswordResetService.resetPassword`, `AccountService.*`, `VerificationService.verify`, `HomeService`, `RecommendationService`, `DiscoveryService` | — |

### 23.2 Spring's `@Transactional` semantics, as they apply here
- **Propagation `REQUIRED`** (the default): join an existing transaction or start one. `ActivityService` → `CatalogService.movieExists` (not annotated) → `JdbcTemplate` uses the bound connection, so it is inside the same transaction.
- **Rollback rules:** a `RuntimeException` (all `ApiException`s are) rolls back; checked exceptions do not. Example: `requireMovie` throws `MovieNotFoundException` before any write, so there is nothing to undo.
- **`readOnly = true`** with `JpaTransactionManager`:
  - sets Hibernate's flush mode to MANUAL
  - marks the JDBC connection read-only, so pgjdbc issues a read-only transaction **[Version-dependent; pgjdbc `readOnlyMode` default]**
  - it is a hint and a safety net, not a permission system
- **Proxy-based:** it works only for calls through the bean reference (§7.14).

### 23.3 Isolation in practice (READ COMMITTED)
- **`MyListsService.watchlist`:** the page query and `COUNT(*)` are separate statements. A concurrent insert between them can make `totalResults` disagree by one with the page contents. That is harmless for a UI list. REPEATABLE READ would give one snapshot for both.
- **`HomeService`:** not transactional. Each ranked list query sees its own snapshot; a batch run between them could shift a movie from one row to another. That is acceptable for a home page.

### 23.4 The self-invocation case (`CatalogService.getMovieDetails`)
On `GET /movies/{id}`, the five catalog queries run **in auto-commit mode, each on a connection borrowed and returned separately**. Consequences:
- **(a)** several pool checkouts instead of one (minor overhead)
- **(b)** the queries may see different committed states, e.g. if the ETL updates availability mid-request (rare, low impact)

It is *not* a correctness bug for this read-only data. It is a good teaching example that **an annotation is not a guarantee**.

### 23.5 Cross-store consistency (PostgreSQL + Redis): no distributed transaction
Several flows write to **both** stores without a shared transaction:

| Flow | Order | Failure window | Effect |
|---|---|---|---|
| `resetPassword` | Redis `GETDEL` token → DB `save` → Redis `revokeAll` | DB fails after GETDEL | the token is consumed and the password unchanged; the user must request a new link (UX, not security) |
| | | Redis fails in `revokeAll` after the DB save | the password **is changed** but old sessions stay valid; the client gets 503 and may think the reset failed |
| `changePassword` | lock check (Redis) → DB `save` → `revokeAll` → `issue` | Redis fails after the save | same as above: 503 to the client while the password was actually changed |
| `signUp` | PING → DB insert (commit) → Redis token + email | Redis fails after the insert | the user exists, but no verification email; resend works later |
| `confirmEmailChange` | `GETDEL` → DB save | DB unique violation | 409; the token is consumed; the user must request again |

The code accepts these windows deliberately: it checks Redis up front (`ensureAvailable`, lock checks), so the window is tiny. A *transactional outbox* or "Redis first, then DB, with compensation" are the standard mitigations (§36, item D-1).

### 23.6 Concurrency controls
| Race | Control |
|---|---|
| Two signups with the same name | DB unique index → 409 |
| Double-click PUT | `ON CONFLICT` (DB) + the `inFlight` set (UI) |
| Concurrent rating updates | row lock in the upsert; last writer wins |
| Two refreshes with one cookie | Redis `GETDEL` atomicity; the loser triggers `revokeAll` (theft detection). The client prevents this with single-flight + a Web Lock |
| Two instances running analytics | `pg_try_advisory_xact_lock` (the loser skips) |
| Lockout counters | Lua `INCR`+`EXPIRE` atomic script |
| Analytics vs live writes | the batch reads a snapshot per statement; writes after the snapshot appear in the next run |

### 23.7 Connection and transaction lifetimes
A `@Transactional` method holds one pooled connection for its whole duration. **No transaction here wraps network I/O to Redis or SMTP.** `signUp` is deliberately non-transactional so the email send does not hold a DB connection. That is good practice: long transactions hold locks and pool slots.

---

# PART VI — Complete End-to-End Request Traces

## Chapter 24: Browser-to-Database Execution Traces

### 24.1 Trace A: signed-in user adds a movie to the watchlist (happy path)

```mermaid
sequenceDiagram
    autonumber
    participant UI as WatchlistButton
    participant H as useMovieAction / TanStack
    participant HTTP as api/http.ts
    participant BR as Browser (CORS)
    participant SEC as Security chain
    participant INT as UserRateLimitInterceptor
    participant C as MovieActivityController
    participant S as ActivityService (@Transactional)
    participant PG as PostgreSQL
    participant RD as Redis
    UI->>H: onClick → run({kind:'watchlist', on:true})
    H->>H: inFlight.add("42:watchlist"); onMutate: cancel+snapshot, optimistic userState & card flags
    H->>HTTP: addToWatchlist(42) → request('PUT','/movies/42/watchlist',{auth:'required'})
    HTTP->>HTTP: ensureFreshToken() (≥30 s left → no refresh)
    HTTP->>BR: fetch PUT, Authorization: Bearer, credentials:'include'
    BR->>SEC: (preflight OPTIONS if not cached 1 h) then PUT
    SEC->>SEC: CorsFilter adds headers
    SEC->>SEC: IpRateLimitFilter: PUT not in a group → pass
    SEC->>RD: JwtDecoder validator: EXISTS jwt:blacklist:sha, GET tokens-valid-after:7
    SEC->>SEC: authenticated → JwtAuthenticationToken in SecurityContext
    SEC->>INT: DispatcherServlet → preHandle
    INT->>RD: EVAL INCR rl:user:write:7 (≤60/min)
    INT->>C: addToWatchlist(jwt, 42)  (@Positive ok)
    C->>S: setWatchlist(7, 42)  [proxy: BEGIN]
    S->>PG: SELECT EXISTS (SELECT 1 FROM movie WHERE movie_id=42)
    S->>PG: INSERT INTO watchlist … ON CONFLICT DO NOTHING
    S->>PG: SELECT EXISTS…,EXISTS…,(rating),(reaction)
    S-->>C: UserMovieState  [proxy: COMMIT]
    C-->>BR: 200 {"inWatchlist":true,"watched":false,"rating":null,"reaction":"NEUTRAL"}
    BR-->>HTTP: Response (CORS check passes)
    HTTP-->>H: JSON
    H->>H: onSuccess → applyUserState: set details, patch cards, watched set, invalidate me/recs
    H->>UI: re-render: "Remove from watchlist"; onSettled → inFlight.delete
```

**Layer notes:**
- **Browser security:** the preflight is required because of `Authorization` and `PUT`. `Access-Control-Max-Age: 3600` caches it for an hour.
- **Spring MVC dispatch:** `RequestMappingHandlerMapping` selects `MovieActivityController.addToWatchlist` from the class prefix `/api/v1/movies/{id}` + the method's `/watchlist`.
- **Transaction:** `TransactionInterceptor` → `JpaTransactionManager.doBegin` (connection from Hikari, auto-commit off) → three statements → commit → connection returned.
- **Serialization:** Jackson writes the record's accessors as properties.

**Error paths:**
| Failure | Backend | Frontend |
|---|---|---|
| Movie deleted | 404 `MOVIE_NOT_FOUND` | rollback + toast "This movie is no longer available." |
| 61st write in a minute | interceptor → 429 + `Retry-After` | rollback + toast "You're doing that too fast. Try again in N s." |
| Access token revoked/expired | 401 at the filter (`ErrorResponseWriter`) | `http.ts` refreshes once and retries; if the refresh fails → session expired toast + redirect |
| Backend down | `fetch` rejects | `NETWORK_ERROR` → rollback + toast |
| DB down | `CannotGetJdbcConnectionException` → 500 `INTERNAL_ERROR` (logged) | rollback + "Something went wrong. Please try again." |

### 24.2 Trace B: page load with session restore and home
1. `AuthGate` effect → `restoreSession()` → `refreshSession()` → Web Lock → `POST /api/v1/auth/refresh`. No `Authorization` header; the cookie is sent because the path matches `Path=/api/v1/auth` and the request is same-site.
2. **Backend:**
   - `IpRateLimitFilter` group `public` (120/min)
   - `permitAll` (the bearer resolver returns nothing)
   - `AuthController.refresh` → `TokenService.consumeRefreshToken`: `GETDEL refresh:sha`, `SET refresh:used:sha`, `SREM` → `AppUserRepository.findById(7)` (SQL `select … from app_user where user_id=?`) → `issue(...)` (new keys) → 200 + `Set-Cookie`
3. **Frontend:** `setAuthenticated`, broadcast to other tabs, splash → routes.
4. `HomePage` → `GET /home` with Bearer.
   - **Optional JWT path:** the custom `BearerTokenResolver` *pre-decodes* the token. A bad token yields `null`, so the request continues as anonymous instead of failing with 401.
   - `HomeService`: For You (full recommendation pipeline: signals query, `getMoviesByIds` for the signal movies (5 queries), candidates query, `getFeatures` (3 queries), scoring, card queries) + 4 ranked lists (≤ 2 queries each) + **one** batched card query + 2 flag queries.
5. **Response** `{sections:[…]}` → cached under `[7,'home']` → rows render.

### 24.3 Trace C: login failure paths
| Input | Server path | Status/code | UI |
|---|---|---|---|
| Wrong password (1st–4th) | `recordFailure` | 401 `INVALID_CREDENTIALS` | form alert "Invalid username or password." |
| 5th wrong | lock key set | 401, and the next attempt gets 429 `ACCOUNT_LOCKED` | "Too many failed attempts. This account is locked for up to an hour." (no countdown, no `Retry-After`) |
| 10 failures from one IP | IP block | 429 `RATE_LIMITED` (no `Retry-After`) | "Too many failed sign-in attempts from your network…" (the `path.endsWith('/auth/login')` special case) |
| > 10 requests/min from one IP | `IpRateLimitFilter` | 429 + `Retry-After` | countdown; submit disabled until it ends |
| Correct but unverified | — | 403 `ACCOUNT_NOT_VERIFIED` | inline resend-verification panel |
| Redis down | `RedisFailClosed` | 503 | "This is temporarily unavailable…" |

### 24.4 Trace D: search
`SearchBox` submit → `checkSearchQuery` → `navigate('/search?q=matrix')` → `SearchPage` → `<Results key="matrix">` → `GET /movies/search?q=matrix&page=0&size=20`.

Backend:
1. `DiscoveryController` rejects unknown parameters.
2. `DiscoveryService` validates length and lowercases.
3. `DiscoveryRepository.search` (proxied `@Transactional(readOnly)`):
   - `SELECT set_config('pg_trgm.word_similarity_threshold','0.3',true)`
   - count CTE (GIN index scans for `<%` on title and person name)
   - page CTE joined to `movie` for ordering
4. `MovieCardService` builds the cards.

The UI shows "Results for "matrix"" with a count, a grid, and pagination as links.

---

## Chapter 25: A Concrete Worked Example

**Scenario.** User `alice` (user_id 7, verified) rates *Interstellar* (movie_id 5 in the test seed) 8.5, then reloads the details page.

### 25.1 Browser representation before
Cache `[7,'movie',5]`:
```json
{ "movieId": 5, "title": "Interstellar", "year": 2014, "released": "2014-11-07", "runtime": 169,
  "ratings": { "imdb": 8.7, "imdbVotes": 1900000, "rottenTomatoes": 73, "metascore": 74 },
  "platformStats": { "averageRating": null, "ratingCount": 0, "likeCount": 0, "dislikeCount": 0 },
  "userState": { "inWatchlist": false, "watched": false, "rating": null, "reaction": "NEUTRAL" }, "...": "..." }
```

### 25.2 Interaction
1. Click **Rate** → `RatingControl.onOpenChange(true)` → `setDraft("7.0")` (the default). The user types `8.5`, so `draft = "8.5"` and `parseRating` → `8.5`. Save becomes enabled (`8.5 !== null`).
2. **Save** → `setOpen(false)`, `run({kind:'rating', value:8.5}, {onSuccess: onChanged})`.
3. `onMutate` writes `userState.rating = 8.5` into the cache. The button now reads "★ 8.5" immediately.
4. **HTTP:**
   ```
   PUT /api/v1/movies/5/rating
   Authorization: Bearer eyJ…   (claims: iss=cinesmart-api, sub=alice, userId=7, iat, exp)
   Content-Type: application/json

   {"rating":8.5}
   ```
5. **Backend binding:** Jackson → `RatingRequestDto(rating = BigDecimal("8.5"))`. Constraints: `@NotNull` ✓, `@DecimalMin("1.0")` ✓, `@DecimalMax("10.0")` ✓, `@Digits(2,1)` ✓.
6. **SQL in one transaction:**
   ```sql
   SELECT EXISTS (SELECT 1 FROM movie WHERE movie_id = $1)                      -- 5 → true
   INSERT INTO user_rating (user_id, movie_id, rating) VALUES ($1,$2,$3)
     ON CONFLICT (user_id, movie_id) DO UPDATE SET rating = EXCLUDED.rating, rated_at = now()  -- (7,5,8.5)
   SELECT EXISTS(...watchlist...), EXISTS(...already_watched...),
          (SELECT r.rating FROM user_rating r WHERE ...), (SELECT x.reaction FROM user_reaction x WHERE ...)
   COMMIT
   ```
7. **Database record after:** `user_rating(user_id=7, movie_id=5, rating=8.5, rated_at='2026-10-14 10:15:03.123+00')`.
8. **Response:** `200 {"inWatchlist":false,"watched":false,"rating":8.5,"reaction":"NEUTRAL"}`. Note `rating` is `NUMERIC(3,1)` → `BigDecimal("8.5")` → JSON `8.5`.
9. **Frontend:**
   - `applyUserState` replaces the optimistic value with the server value (same here)
   - invalidates `[7,'me','profile']`, `[7,'me','ratings']`, `[7,'recs']`
   - `onChanged` → `setStatsHint(true)` → the info alert "Your rating counts toward the CineSmart average within the hour."

### 25.3 Reload
`GET /movies/5` returns `userState.rating: 8.5`, read live from `user_rating`. `platformStats` stays at 0 ratings **until the next hourly batch**.

After the batch (with, say, 4 other users' ratings for this movie and a platform-wide average `C`):
- `rating_count = 5`
- `average_rating = AVG(...)`
- `weighted_rating = (5/(5+5))·R + (5/10)·C`

With `rating_count ≥ 5`, the movie becomes eligible for **Top Rated**.

### 25.4 Representations side by side
| Layer | Representation of "alice rated Interstellar 8.5" |
|---|---|
| UI (DOM) | button text "8.5", `aria-label="Your rating: 8.5. Change rating"` |
| Browser cache | `[7,'movie',5].userState.rating = 8.5` (JS `number`) |
| HTTP | `{"rating":8.5}` / `{"rating":8.5,…}` |
| Java DTO | `RatingRequestDto(BigDecimal 8.5)` → `UserMovieState(…, BigDecimal 8.5, "NEUTRAL")` |
| Database | `user_rating` row `(7, 5, 8.5::numeric(3,1), timestamptz)` |
| Derived | `movie_analytics(5).average_rating / weighted_rating` after the batch |
| Recommendation | the next `GET /recommendations` treats movie 5 as a **positive signal** (≥ 8 → weight 3 × 1.5 recency) and excludes it from candidates |

---

# PART VII — Security, Reliability, and Performance

## Chapter 26: Authentication and Authorization

### 26.1 Concepts first
- **Authentication:** *who are you?* (a password check, then a token proving it later).
- **Authorization:** *what may you do?* (route rules, ownership).
- **Token:** a credential you present. **Signed token (JWT):** a JSON payload plus a signature. The server can verify that the payload was issued by itself and not modified, **without a database lookup**.
- **JWT structure:** `base64url(header).base64url(payload).base64url(signature)`. Here:
  - the header is `{"alg":"HS256"}`
  - the payload has `iss`, `sub`, `userId`, `iat`, `exp`
  - the signature is HMAC-SHA256 with a shared secret key (`SecurityConfig.jwtSecretKey` decodes `jwt.secret` from Base64)
- **The payload is readable by anyone** (Base64 is encoding, not encryption). It carries no secrets, only IDs.
- **Trust boundary:** everything from the browser is untrusted until the server verifies it. That includes the token, the body, the path and the headers.

### 26.2 The implemented model
| Element | Implementation |
|---|---|
| Identity | `app_user` row; the JWT `userId` claim; `sub` = username |
| Password storage | **BCrypt** (`BCryptPasswordEncoder`, salted and adaptive). Only the hash is stored (`password_hash`); the test `passwordHashesAndTokensNeverLeakIntoResponses` checks that it never leaks |
| Access token | HS256 JWT, 15 min, in JS memory only |
| Refresh token | opaque 256-bit random value, SHA-256-hashed in Redis, rotated on every use, 2 h idle / 7 d absolute, in an `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` cookie |
| Revocation | per-token blacklist (logout) + per-user `tokens-valid-after` (password change/reset, refresh-token theft) |
| Roles/permissions | **None.** All authenticated users have the same rights; ownership is implicit because every query is scoped by `userId` from the token |
| Email verification | required before login (403 otherwise) |
| Brute force | per-user lock after 5 failures, per-IP block after 10 (1 h); per-IP request limits |

### 26.3 Login flow (sequence)
```mermaid
sequenceDiagram
    participant SPA
    participant API as AuthController/AuthService
    participant R as Redis
    participant DB as PostgreSQL
    SPA->>API: POST /auth/login {username,password}
    API->>R: EXISTS login:block:ip:<ip>, EXISTS login:lock:user:<u>
    API->>DB: SELECT … FROM app_user WHERE LOWER(username)=LOWER(?)
    API->>API: BCrypt.matches (dummy hash if no user)
    alt bad credentials
        API->>R: INCR failure counters (Lua), maybe SET lock
        API-->>SPA: 401 INVALID_CREDENTIALS
    else ok but unverified
        API-->>SPA: 403 ACCOUNT_NOT_VERIFIED
    else ok
        API->>R: DEL counters; SET refresh:<sha>; SADD user:sessions
        API-->>SPA: 200 {accessToken, expiresIn:900, user} + Set-Cookie refresh_token
    end
```

### 26.4 How a request is authenticated (Spring Security internals)
1. `BearerTokenAuthenticationFilter` asks the **custom `BearerTokenResolver`** (`SecurityConfig.java:114`):
   - On non-optional routes: return the `Authorization` value (the default behavior).
   - On optional GETs: **try to decode it now**. On `JwtException`, return `null`, so the request continues as anonymous.
2. If a token is present, `JwtAuthenticationProvider` → `jwtDecoder.decode(token)` (`:172`):
   - **signature** check (HMAC with the secret key)
   - **standard validators** (`exp`/`nbf` with clock skew, and `iss == "cinesmart-api"`)
   - **custom validator:** `revocation.isRevoked(jwt)`
3. On success: a `JwtAuthenticationToken` goes into the `SecurityContext`. On failure on a protected route: the `authenticationEntryPoint` writes 401 `UNAUTHORIZED`, "Missing, invalid or expired access token".
4. **Authorization:** `.requestMatchers(POST, PUBLIC_AUTH_POSTS).permitAll()`, `.requestMatchers(GET, OPTIONAL_JWT_GETS).permitAll()`, `.anyRequest().authenticated()`.
5. The controller reads `userId` through `@AuthenticationPrincipal Jwt` → `CurrentUser.id(jwt)`.

**Consequence.** On optional routes the token is decoded **twice** (in the resolver and in the provider), so the Redis revocation lookups also run twice (§29.2).

### 26.5 Expiration and revocation behavior
| Event | Access token | Refresh session |
|---|---|---|
| 15 min pass | rejected (`exp`) | — |
| 2 h idle | — | Redis TTL expires → refresh 401 |
| 7 days since login | — | `issue` refuses (TTL < 1 s) → 401 |
| Logout | blacklisted until its expiry | deleted |
| Change/reset password | all tokens issued before *this second* rejected | all deleted (the caller of change-password gets a new one) |
| Reused refresh token | all revoked | all deleted |
| **Redis down** | revocation checks **skipped (fail open)** | refresh, login and all token flows **fail closed (503)** |

### 26.6 Frontend route protection versus server enforcement
`RequireAuth` hides `/watchlist`, `/ratings`, `/profile` and `/for-you` from signed-out users. **That is a convenience only.** The security is that `GET /api/v1/me/watchlist` without a valid token returns 401, and every query filters by the token's `userId`. If someone removed `RequireAuth` from the bundle, they would see empty pages with 401 errors, not someone else's data.

### 26.7 A real authenticated request, traced
See §24.1 (Trace A) for `PUT /movies/42/watchlist` through every filter.

### 26.8 CSRF and CORS considerations
- **CSRF** (cross-site request forgery): another site makes the victim's browser send an authenticated request, and **cookies are sent automatically**. Here:
  - Normal API calls authenticate with the **Bearer header**, which a cross-site page cannot set. Not CSRF-able.
  - The refresh cookie is `SameSite=Strict`, so it is **not sent on cross-site requests**. It is also scoped to `/api/v1/auth`.
  - So disabling Spring's CSRF tokens (`SecurityConfig.java:87`) is justified for this design. **Residual risk:** another subdomain of the same *site* (e.g. a compromised `blog.cinesmart.ca`) counts as same-site and could trigger `/auth/refresh`. It still could not read the response (CORS), and rotation would only invalidate the user's current cookie.
- **CORS:** an exact origin allowlist with credentials, the headers limited to `Authorization`/`Content-Type`, and only `Retry-After` exposed. No wildcard origin (wildcard + credentials is forbidden by browsers anyway).

### 26.9 Unauthorized versus forbidden
- **401 `UNAUTHORIZED`:** not authenticated, or a bad token.
- **401 `INVALID_CREDENTIALS`:** a failed login.
- **403 `ACCOUNT_NOT_VERIFIED`:** authenticated by password but not permitted.
- **403 `FORBIDDEN`:** exists only for Spring's access-denied handler; not expected in normal use, because there are no roles.

---

## Chapter 27: Security Boundaries and Vulnerabilities

### 27.1 What is done well (evidence-based)
| Area | Evidence |
|---|---|
| SQL injection | All values bound as parameters (`NamedParameterJdbcTemplate`, JPQL `:params`); the dynamic SQL uses only constant fragments (`DiscoveryRepository`, `UserMovieStateRepository.findIds`) |
| IDOR / broken object-level access | No endpoint accepts a user ID; every activity/me query is keyed by the JWT's `userId` (test `usersOnlyChangeTheirOwnActivity`) |
| Mass assignment | Request DTOs are narrow records (e.g. `NewUser` has no `isVerified`); entities are never bound from JSON |
| Excessive exposure | `ProfileResponse` excludes the password hash; cards carry no internal fields |
| Password storage | BCrypt; constant-time comparison inside BCrypt; dummy hash for unknown users |
| Token storage | Raw tokens never stored server-side (SHA-256 keys); the access token is not in Web Storage (XSS cannot read it after a reload) |
| Enumeration | Forgot/resend give an identical response body; lockout covers unknown usernames |
| Error leakage | 500s return a generic message; details only in server logs |
| Secrets in config | `application.properties` reads secrets from env vars with no defaults (fail-fast) |
| Open redirect | `safeRedirect` allows only `/path` (blocks `//evil.com`, `/\evil.com`) |
| XSS | React escapes text by default; `dangerouslySetInnerHTML` is not used anywhere in `src` **[Verified by search]**; external links use `rel="noopener noreferrer"` |
| Clickjacking | Spring Security's default headers send `X-Frame-Options: DENY` for API responses. **[Unknown]** for the static host serving the SPA |

### 27.2 Findings
Each finding gives the affected code, a scenario, prerequisites, impact, evidence and a confidence level.

**S-1. Passwords longer than 72 bytes cause a 500 error (confirmed library behavior, inferred app impact). Medium.**
- *Code:*
  - `NewUser.password`, `ResetPasswordRequest.newPassword` and `ChangePasswordRequest.newPassword` allow `@Size(max = 100)` (characters)
  - `src/lib/validation.ts` `newPasswordSchema` allows up to 100
  - `AuthService.java:85`, `PasswordResetService.java:79` and `AccountService.java:85` call `passwordEncoder.encode(...)`
- *Evidence:* the installed `spring-security-crypto-7.1.1.jar` `BCrypt` class contains the message **"password cannot be more than 72 bytes"**. BCrypt only uses the first 72 bytes, and newer Spring Security versions reject longer inputs instead of silently truncating them (a CVE-2025-22228 hardening).
- *Scenario:* a user picks an 80-character passphrase, or 30 emoji (≈ 120 UTF-8 bytes). Both pass client and server validation, then `encode` throws `IllegalArgumentException`. `GlobalExceptionHandler.handleUnexpected` turns it into **500 `INTERNAL_ERROR`**, with an ERROR log and a stack trace. Login with such a password probably fails the same way inside `matches` **[Inferred: verify]**.
- *Impact:* signup, reset and change-password are broken for long passphrases; misleading "something went wrong" errors; log noise. Not exploitable for access.

**S-2. Two sessions created in the same second get the same access token. Medium (reported by the tests).**
- *Code:* `TokenService.accessToken` (`:155`) has no `jti` claim, and `iat`/`exp` have one-second resolution.
- *Evidence:* **[Reported]** BUG-01 in `Cinesmart-Backend/test-results.md`; the failing test is `TokenServiceTest#twoSessionsIssuedTogetherGetDifferentAccessTokens`.
- *Impact:* logging out on device A blacklists device B's identical token, so B gets 401 until it refreshes.

**S-3. `X-Forwarded-For` handling takes the left-most address. Medium if deployed behind a proxy that *appends*.**
- *Code:* `ClientIpResolver.java:24`, `forwardedFor.split(",")[0]`.
- *Scenario:* `app.trust-proxy=true` behind a proxy that appends (the common nginx `$proxy_add_x_forwarded_for` default). The client sends `X-Forwarded-For: 1.2.3.4`, and the backend sees `1.2.3.4, <real-ip>` and uses `1.2.3.4`. That **bypasses the per-IP rate limits and the login IP block** with a fresh fake IP per request.
- *Prerequisite:* that proxy configuration. The comment and README say to enable trust only when the proxy *overwrites* the header, so this is a deployment risk rather than a code defect.

**S-4. Refresh-token reuse detection can log a user out everywhere on benign races. Low–Medium (availability).**
- *Code:* `TokenService.consumeRefreshToken` (`:100-114`).
- *Scenario:* the server rotates the token but the response is lost (mobile network drop, tab closed mid-request). The browser keeps the old cookie, and the next refresh presents a "used" token, which triggers `revokeAll`. Also: browsers without the Web Locks API (`session/refresh.ts:33` falls back to unlocked) with two tabs refreshing at once.
- *Trade-off:* this is the standard OAuth-style rotation. Many implementations add a short **grace period** for the previous token (§36, item M-3).

**S-5. Account enumeration through response timing on forgot-password/resend. Low.**
- *Code:* `PasswordResetService.forgotPassword` sends SMTP **synchronously** only when the account exists (`:64`, `:92`).
- *Scenario:* an attacker measures response latency (SMTP adds hundreds of milliseconds). That reveals which emails are registered, despite the identical response bodies. Rate limits (5 per 15 min per IP) slow this down.

**S-6. The application probably connects as the PostgreSQL superuser. Medium (defense in depth). [Inferred]**
- *Evidence:* `.env.example` has `SPRING_DATASOURCE_USERNAME=postgres`, and the `cinesmart_app` least-privilege role is listed as an open optional task in `implementation-plan.md` §F.
- *Impact:* any future SQL injection or bug runs with full rights (DROP, file access functions).

**S-7. Secrets on disk outside version control (location only, values not read).**
- `.idea/workspace.xml` and `Cinesmart-Backend/.idea/workspace.xml`: IntelliJ run configurations contain the environment entries for `jwt`/mail/datasource settings. Both are git-ignored or outside git.
- `Data_Ingestion/.env`: DB credentials and OMDb/TMDB/Watchmode API keys. Not tracked; the ETL's `.gitignore` ignores everything except `Scripts/` and `Logs/`.
- `Cinesmart-Frontend/.env.local`: e2e account usernames and passwords (git-ignored).
- **[Reported]** `final-stage-chat-prompt.md` states that earlier JWT/SMTP secrets were once written in `application.properties` and must be treated as leaked and rotated. **[Unknown]** whether the rotation was done.
- *Risk:* sharing the project folder (zip, cloud sync, screen share) leaks them.

**S-8. Revocation fails open while Redis is down. Low (accepted by design, Q24).** A logged-out or stolen access token keeps working for up to 15 minutes during a Redis outage.

**S-9. External URLs rendered without scheme validation. Low.**
- `availability.platform_url` → `<a href>` and `poster` → `<img src>` / CSS `url("…")` (`MovieDetailsPage.Backdrop`).
- The data comes from Watchmode/OMDb through the ETL (a semi-trusted third party).
- A `javascript:` URL in `href` is a classic XSS vector. Whether React blocks it depends on the React version and flags **[Version-dependent; do not rely on it]**. In `Backdrop`, a poster value containing `")` could break out of the CSS `url()` string (CSS injection, limited impact).
- *Mitigation:* validate `^https?://` in the ETL or the API (§36).

**S-10. Login lockout can be triggered by anyone for any username (account DoS). Low (inherent to lockouts).** Five wrong passwords lock a real user out for 1 h. This is the documented Q1 decision. Common mitigations are CAPTCHA after N failures, or locking per (user, IP) pair.

**S-11. Dependency vulnerabilities. [Unknown].** No `mvn dependency-check` or `pnpm audit` results exist in the repo. The versions are recent (Boot 4.1.1, React 19.3), which helps.

**Non-findings, checked:**
- No HTML injection via email bodies: plain-text `SimpleMailMessage`.
- No path traversal: there are no file endpoints.
- No SSRF: the backend makes no outbound HTTP calls.
- The JWT algorithm is pinned (`macAlgorithm(HS256)`), so there is no `alg:none` confusion.

---

## Chapter 28: Errors, Validation, and Reliability

### 28.1 How an error moves through the system
```
DB/Redis/SMTP/validation problem
  → Java exception (DataAccessException, MailException, MethodArgumentNotValidException, ApiException…)
  → translated at the boundary (RedisFailClosed, EmailService, signup catch)
  → GlobalExceptionHandler (or ErrorResponseWriter in filters)
  → ApiError JSON {status, code, message, path, timestamp, fields?}
  → http.ts toApiError → ApiError(status, code, message, fields, retryAfter)
  → TanStack retry policy (once for NETWORK/INTERNAL/SERVICE_UNAVAILABLE)
  → UI: ErrorState / toast / FormAlert / field errors, by code (never by message)
```
**Consistency.** One error shape across all layers; the frontend switches on `code`. That is a strong design. The error matrix test (`features/errors/error-matrix.test.tsx`) checks the UI side.

### 28.2 Validation layers
| Layer | Example | Purpose |
|---|---|---|
| Client (Zod, `parseRating`, `checkSearchQuery`) | 3–100 chars, 1.0–10.0 | UX, fewer requests |
| Server Bean Validation | `@Size`, `@Pattern`, `@Digits` | authoritative |
| Server code checks | genre exists, year range, new password differs, paging bounds | business rules |
| Database | PK/UNIQUE/CHECK/FK | final integrity guard |

### 28.3 Database constraint violations
- **Handled:** unique violations in signup and email-change confirmation (→ 409).
- **Not specifically handled:** FK violations. They cannot normally occur, because `requireMovie` runs first. If a movie is deleted between the check and the insert, the FK violation becomes a generic 500. That is acceptable.

### 28.4 Rollback and invariants after failure
- Activity writes: atomic per request.
- Analytics: atomic per run; old values are kept on failure.
- Cross-store flows: see §23.5, which lists the windows where the database and Redis can disagree.

### 28.5 Logging
- SLF4J (the Boot default is Logback; no custom configuration). WARN for degraded dependencies (Redis down, mail not sent); ERROR with the stack trace for unexpected exceptions and mail failures.
- **Good:** no tokens or passwords are logged. `EmailService` logs only the subject; `TokenService` logs a user ID on reuse.
- **Missing:** correlation/request IDs, structured (JSON) logs, metrics.

### 28.6 Timeouts and retries
| Dependency | Timeout | Retry |
|---|---|---|
| Redis | 500 ms command and connect (`application.properties`) | none (fail-open or fail-closed per feature) |
| PostgreSQL | Hikari connection timeout (default 30 s); **no statement timeout** | none |
| SMTP | **not configured**; JavaMail's defaults are effectively infinite **[Version-dependent; verify]** | none |
| Browser → API | **none** (`fetch` has no timeout) | TanStack: once after 1 s for transient errors; mutations never |

**Risk.** A hung SMTP server or a slow query can pin Tomcat threads indefinitely. `spring.mail.properties.mail.smtp.connectiontimeout/timeout/writetimeout` and a JDBC `statement_timeout` are cheap fixes (§36).

### 28.7 Empty results and missing records
Empty lists are 200 with `[]` or `results: []`, never 204 or 404 (contract [CONV-4]). A missing movie is a typed 404 (`MOVIE_NOT_FOUND`), which the UI shows as "Movie not found". Past-the-end pages redirect to the last page (`ListResults`).

### 28.8 Network failures
`fetch` rejection → `NETWORK_ERROR` (status 0) → "We couldn't reach CineSmart…". Session restore after a network error retries on the next request (`retryRestoreOnNextRequest`).

### 28.9 Known validation defect (reported)
**BUG-02** (`test-results.md`): `@Email` rejects `"  alice@example.com "` before normalization. The UI is not affected (Zod trims); direct API clients get 400.

---

## Chapter 29: Performance and Scalability

> Separation of evidence types: **[Source]** = visible in code/config; **[Theory]** = algorithmic reasoning; **[Hypothesis]** = needs profiling. **No measurements exist in the repo, and I invented none.**

### 29.1 Frontend
| Aspect | Observation |
|---|---|
| Bundle | [Source] Vendor chunks (react, router, query) + one lazy chunk per route; Zod is kept out of the header's `SearchBox` on purpose (`lib/search-query.ts` comment) |
| Re-renders | [Source] RHF uncontrolled inputs; `useSyncExternalStore` for the session; no `React.memo` (small trees). [Hypothesis] a long `MovieRow` (≤ 50 cards) re-renders all cards when a page arrives; fine at this size |
| Requests | [Source] `staleTime` per family; `refetchOnWindowFocus:false`; genres/languages cached 1 h and HTTP-cacheable; a home row's later pages are reused by `/lists/:key`; activity updates patch caches instead of refetching home |
| Images | [Source] `loading="lazy"` except the first visible posters; no size variants (external full-size posters) — [Hypothesis] the main payload cost |
| Large lists | Pagination at 20 per page; no virtualization needed |

### 29.2 Backend
| Hotspot | Analysis |
|---|---|
| **Recommendations per request** | [Source] `GET /recommendations` *and* every signed-in `GET /home` run the full pipeline: the signals query, `getMoviesByIds` for **all** signal movies (5 queries with an `IN` list as long as the user's history), the candidates query (≤ 300), `getFeatures` (3 queries over 300 IDs), scoring O(300 × features), reasons for **all 300** (only one page is shown), then cards. [Theory] cost grows linearly with the user's activity size; [Hypothesis] tens of ms for small histories, much more for heavy users |
| Optional-JWT double decode | [Source] two HMAC verifications + up to 4 Redis round trips per optional GET (resolver + provider) |
| Redis per request | [Source] rate-limit Lua (1) + revocation (2, or 4 on optional routes) + per-user limit (1) |
| SMTP in the request thread | [Source] signup/forgot/email change wait for SMTP (hundreds of ms+) |
| BCrypt | [Theory] ~50–100 ms CPU per hash at strength 10; login, signup and password flows; that is the point (slows attackers) |
| Batching | [Source] good: details/cards are always batched (no N+1); home builds all cards in one call |
| Thread/connection limits | [Source] Tomcat 200 threads vs Hikari 10 connections by default: under load, requests queue on the pool |

### 29.3 Database
| Query | Index support | Note |
|---|---|---|
| Search `<%` on `LOWER(title)` / `LOWER(name)` | **GIN trigram** indexes exist | [Theory] good; `COUNT` + page = two CTE evaluations per search |
| Browse `ORDER BY imdb_rating DESC NULLS LAST, imdb_votes …` | **no index** on `imdb_rating` | [Theory] full scan + sort of `movie` per page; [Hypothesis] negligible at the current catalog size (the ETL seed file is `imdb_top_1000.csv`), noticeable at 100k+ rows |
| Browse filter `EXISTS movie_genre … genre_id` | `idx_movie_genre_genre` | fine |
| Top Rated / Most Liked | **no index** on `weighted_rating` / `like_count` | full scan of `movie_analytics` (1 row per movie) + sort |
| `/me/ratings` `ORDER BY rated_at DESC` per user | PK `(user_id, movie_id)` finds the rows; the sort is in memory | fine per user |
| Analytics batch | full scans of `user_rating`, `user_reaction`, `movie` hourly; rewrites every row → **table bloat** (each UPDATE creates a dead tuple) handled by autovacuum | [Hypothesis] fine at the current size; consider `WHERE` only for changed movies at scale |
| OFFSET pagination | [Theory] `OFFSET n` scans n rows; deep pages get slower; keyset pagination avoids that |
| `NOT IN (:excludedIds)` | [Theory] long `IN` lists hit the bind-parameter limit (~32k for pgjdbc) at extreme history sizes |

### 29.4 Scalability notes
- **Stateless app tier:** multiple instances work. Sessions and limits are in Redis, and the batch is guarded by an advisory lock.
- **Shared bottlenecks:** Redis (single instance, all security state) and PostgreSQL.
- **How to measure** before optimizing:
  - `EXPLAIN (ANALYZE, BUFFERS)` on the queries
  - `pg_stat_statements`
  - Micrometer timers (requires Actuator)
  - k6/Gatling load tests that respect the rate limits
  - Chrome DevTools/Lighthouse for the SPA

---

# PART VIII — Build, Configuration, Testing, and Deployment

## Chapter 30: Backend Build and Packaging

### 30.1 `pom.xml` explained
| Element | Meaning |
|---|---|
| `<parent>spring-boot-starter-parent 4.1.1` | Inherits **dependency management** (a curated set of compatible versions, so no `<version>` on starters), plugin configuration, Java compiler settings and resource filtering |
| `<java.version>25` | Sets the compiler `--release 25`. The build and runtime need JDK 25 (`test-results.md`: "JAVA_HOME = JDK 25") |
| `spring-boot-starter-web` | Spring MVC + embedded Tomcat + Jackson. **[Version-dependent]** In Boot 4 the web starter family was reorganized (`spring-boot-starter-webmvc`); `-web` remains available. Confirm with `mvn dependency:tree` |
| `-validation` | Hibernate Validator (Jakarta Validation) |
| `-security` | Spring Security |
| `-oauth2-resource-server` | `BearerTokenAuthenticationFilter`, the `Jwt` model, Nimbus JOSE (for both decoding *and* encoding with `NimbusJwtEncoder`) |
| `-data-jpa` | Hibernate + Spring Data JPA + `JpaTransactionManager` |
| `-jdbc` | `JdbcTemplate` + HikariCP (also pulled in transitively by data-jpa; the explicit declaration documents intent) |
| `-mail` | `JavaMailSender` (Jakarta Mail) |
| `-data-redis` | Spring Data Redis + Lettuce |
| `postgresql` (`runtime` scope) | JDBC driver: needed at runtime only, not on the compile classpath, so code cannot depend on driver classes |
| test scope: `-test`, `-webmvc-test`, `-security-test`, `spring-boot-testcontainers`, `testcontainers-postgresql`, `testcontainers-junit-jupiter` | JUnit 5, AssertJ, Mockito, MockMvc, security test helpers, Docker-backed throwaway DBs. **Not packaged** into the app JAR |
| `spring-boot-maven-plugin` | `repackage` goal: builds an **executable "fat" JAR** (`java -jar target/Cinesmart-Backend-0.0.1-SNAPSHOT.jar`) with all dependencies under `BOOT-INF/lib` and a launcher |

### 30.2 Build lifecycle
`mvn package` runs: `validate → compile → test (Surefire runs JUnit; needs Docker for Testcontainers) → package (jar + repackage)`. Use `mvn -DskipTests package` to build without Docker.

**There is no Maven wrapper** (`mvnw`): `.mvn/` exists but is empty, and it is git-ignored. Every machine needs its own Maven install, and builds may differ by Maven version (§36, item B-4).

### 30.3 How the build influences runtime
- Starters on the classpath **switch on auto-configuration** (§7.6). Removing `-data-jpa`, for example, would also remove `JpaTransactionManager`. `@Transactional` would then use a `DataSourceTransactionManager` provided by `-jdbc`.
- `application.properties` is copied into the JAR from `src/main/resources`. **It is git-ignored**, so a CI build from git would package a JAR *without* it (§36, B-3).

---

## Chapter 31: Frontend Build and Development

| Aspect | Detail |
|---|---|
| Node / package manager | `engines.node >=24`, `.nvmrc` = 24, `packageManager: pnpm@10.34.7` (Corepack) |
| Scripts | `dev` (Vite), `build` (`tsc -b && vite build`, so type errors fail the build), `preview`, `typecheck`, `lint` (ESLint 9 flat config with typescript-eslint, react-hooks, react-refresh, jsx-a11y), `format` (Prettier + Tailwind plugin), `test` (Vitest), `test:e2e` (Playwright) |
| Dependency management | `pnpm-lock.yaml` pins exact versions; `pnpm.onlyBuiltDependencies: ["esbuild"]` blocks other packages' install scripts (supply-chain hardening) |
| Dev server | Vite on 5173 (`strictPort`), native ESM, hot module replacement. `/dev/ui` route and React Query Devtools only when `import.meta.env.DEV` |
| JSX/TS transform | `@vitejs/plugin-react` (esbuild/Babel). TypeScript is **erased**, not checked, by Vite; `tsc -b` checks |
| Env vars | Only `VITE_*` are exposed to client code, **inlined at build time** (`VITE_API_BASE_URL` → `src/lib/env.ts`, default `http://localhost:8080/api/v1`). Changing it requires a rebuild |
| Production build | Rollup bundles to `dist/` with hashed file names (long-term caching), manual vendor chunks, one chunk per lazy route |
| Static assets | `public/favicon.svg` copied as is; fonts are bundled via `@fontsource-variable/inter` |
| Routing in production | The host must serve `index.html` for unknown paths (SPA fallback); otherwise deep links and email links 404 |

**Dev versus prod.** In dev, Vite serves the source on demand, with `StrictMode` double effects and devtools. In production there is minified static JS from any static host or CDN, no dev routes and no devtools.

---

## Chapter 32: Configuration and Environment Management

### 32.1 Backend configuration (`application.properties`), grouped
| Group | Keys | Env vars / defaults |
|---|---|---|
| DB | `spring.datasource.url/username/password`, `ddl-auto=validate`, `show-sql=false` | `SPRING_DATASOURCE_*` (required) |
| Mail | host/port/username/password, `smtp.auth`, `starttls.enable`, `app.mail.from` | `MAIL_HOST` (`smtp.ethereal.email`), `MAIL_PORT` (587), `MAIL_USERNAME`/`MAIL_PASSWORD` (required) |
| Redis | host/port, 500 ms timeouts | `REDIS_HOST` (localhost), `REDIS_PORT` (6379) |
| JWT | `jwt.secret`, `jwt.issuer=cinesmart-api`, `jwt.access-token-ttl=PT15M` | `JWT_SECRET` (required, Base64 of 32 bytes) |
| Sessions/tokens | idle 2 h, max 7 d, `cookie-secure=true`, reset 10 min, verification/email-change 24 h | — |
| Lockout | 5 per user / 10 per IP / 1 h | — |
| Rate limits | `rate-limit.ip.{login,account,token,public}`, `rate-limit.user.{write,read}` in `max/ISO-duration` | — |
| Proxy | `app.trust-proxy=false` | — |
| Frontend | `app.cors.allowed-origins`, `app.frontend-base-url` | `FRONTEND_ORIGINS`, `FRONTEND_BASE_URL` (default `http://localhost:5173`) |
| Analytics | `analytics.min-votes=5`, `analytics.refresh-interval=PT1H` | — |
| Discovery | `search.similarity-threshold=0.3`, `search.title-boost=0.1`, `home.row-size=10`, `home.imdb-top-250.min-votes=25000` | — |
| Recommendation | weights, recency 90 d × 1.5, candidate limit 300, cold-start 3, score weights 0.4/0.3/0.1/0.2, similar sizes 10/30 | — |

### 32.2 Profiles
- **`dev`:** SQL logging, `auth.refresh.cookie-secure=false` (for Postman over http).
- **`test`:** dummy datasource (replaced by `@ServiceConnection`), a mocked mailer, a fixed test-only JWT secret, analytics interval 24 h, quieter logs.

### 32.3 Frontend configuration
`VITE_API_BASE_URL` is the build-time API base. `E2E_*` are Playwright-only, loaded from `.env.local` by `playwright.config.ts` via `process.loadEnvFile`. **[Verified]** `.env.local` does **not** set `VITE_API_BASE_URL` (names only checked), so the dev build uses the default `http://localhost:8080/api/v1`.

### 32.4 How the tiers connect (the configuration "contract")
```mermaid
flowchart LR
    FEenv["VITE_API_BASE_URL<br/>(build time)"] --> SPA
    SPA -- "Origin: http://localhost:5173" --> CORS["FRONTEND_ORIGINS must list the exact origin"]
    SPA -- "cookie Path=/api/v1/auth" --> API
    API -- "email links = FRONTEND_BASE_URL + /verify-email?token=…" --> Mail --> SPA
    API -- SPRING_DATASOURCE_URL --> PG[(PostgreSQL)]
    API -- REDIS_HOST/PORT --> R[(Redis)]
```
**Consistency requirements:**
1. Vite's `strictPort` 5173 = the CORS default (`vite.config.ts` comment).
2. `FRONTEND_BASE_URL` must be where the SPA is served, or email links open the wrong host.
3. The API path prefix must stay `/api/v1/auth`, or the cookie path stops matching. That matters behind a reverse proxy that rewrites paths.
4. `cookie-secure=true` requires HTTPS in production. It works on `http://localhost` in Chromium/Firefox.

### 32.5 Secrets management
Env vars only; there is no vault. `.env.example` documents the names with placeholders. **Configuration precedence** lets an OS env var override the file. The test profile hard-codes a test-only JWT key, which is fine because it is used only against throwaway containers.

---

## Chapter 33: Tests and Verification

### 33.1 Backend
**Infrastructure** (`src/test/java/ca/cinesmart/support`):
- `TestcontainersConfiguration` starts `postgres:18-alpine` and `redis:7-alpine`.
  - `@ServiceConnection` overrides the datasource/Redis properties, so **the real database is never used**.
  - Schema: `../Database/Schema.sql`; seed: `src/test/resources/db/test-seed.sql` (fixed IDs, documented edge cases).
- `IntegrationTest` (base class):
  - `@SpringBootTest` + MockMvc (in-process HTTP, no real socket)
  - `@MockitoBean JavaMailSender` (captures emails so tests can extract link tokens)
  - before each test: `TRUNCATE app_user, movie_analytics … CASCADE` + `FLUSHALL`
  - helpers to create users, log in and attach a Bearer token

**Inventory** (191 tests in 29 classes, **[Reported]** 187 passed / 4 failed on 2026-10-14; the failures are BUG-01 and BUG-02):

| Area | What is verified | What it does **not** establish |
|---|---|---|
| Identity (signup, verification, login and lockout, sessions, password, email, unit tests for `TokenService`/revocation) | Lockout thresholds, enumeration resistance, refresh rotation + theft detection, 2 h/7 d limits, cookie attributes, revoke-all, mail failure tolerance | Behavior with >72-byte passwords (S-1); real SMTP; clock-skew edge cases beyond 1 s |
| Catalog | Details shape, `otherCrew`, `userState`, 404/400, genres/languages + cache header | Query performance |
| Discovery | Filters, paging, unknown params, fuzzy search incl. typos and the title boost, ranked lists, home de-dup | Search relevance at production data size |
| Activity | Idempotency, timestamps, validation, 404, ownership isolation, lists | Concurrent writes |
| Recommendation | Normalized scoring, ties, recency, cold start, exclusions, reasons, home row = page 0, similar | Latency for heavy users |
| Analytics | Counts, weighted rating, reset on removal, failure keeps old values, advisory lock skip, startup scheduling | Multi-instance behavior against a real cluster |
| Shared | Security matrix, JWT expiry/issuer/signature, error format, CORS, all five rate limits, Redis outage (container **paused for real**) | Deployment headers (TLS, proxy) |

**Notable technique.** `RedisOutageIntegrationTest` pauses the Redis container through the Docker API to test fail-open versus fail-closed. That is a genuine fault-injection test.

### 33.2 Frontend
- **Vitest + Testing Library + MSW** (`src/test/msw/handlers.ts` mocks the API at the network layer, so `http.ts` runs for real).
- **Covered:**
  - `http.test.ts` (headers, error parsing, refresh-retry)
  - `refresh.test.ts` (single-flight, adopt-from-other-tab, error mapping)
  - `session-manager.test.ts`
  - `query-client.test.ts`, `card-cache.test.ts`
  - components (`RatingControl`, `MovieRow`, `PosterImage`, `ErrorState`)
  - pages (Login, VerifyEmail with StrictMode, Browse, RankedList, MovieDetails, Watchlist, Profile, Search)
  - `error-matrix.test.tsx`
  - pure functions (format, validation, browse params, retry-after)
- **[Reported]** `test-results/.last-run.json`: `"status": "passed"` for the last Playwright run.

### 33.3 End-to-end (Playwright, against the real backend)
- Projects run in a deliberate order (`public → cooldown 61 s → a11y ∥ account → signed-in → limits`) because the backend's rate limits are shared.
- **Covered:** smoke, details, browse/search, accessibility with axe (WCAG 2.2 AA) and keyboard, session reload across pages, the full watchlist → rate → sign-out flow, change password signing out another browser, rate-limit countdowns.
- **Weakness:** e2e depends on a manually created verified account and on the live dev database state.

### 33.4 Database testing
The schema file is loaded into a fresh container on every test run, which validates that `Schema.sql` is syntactically complete. **Not tested:** that V019–V022 transform an *old* schema into the new one (migration testing). The live database is never touched (a project rule recorded in memory).

### 33.5 Coverage gaps worth adding
1. Long-password signup, reset and change (S-1).
2. A refresh where the response is lost (S-4), using the backend unit test style.
3. Partial failure of `changePassword`/`resetPassword` with Redis failing *after* the DB write (§23.5). This needs a Redis fault injected mid-flow.
4. Migration replay: apply V019–V022 to a captured pre-V019 schema dump.
5. A cross-layer contract test: generate TS types from an OpenAPI spec, or snapshot real responses against the TS interfaces.
6. Load/latency tests for `/home` and `/recommendations` with a large-history user.

**I did not run any tests.** All results above are quoted.

---

## Chapter 34: Deployment and Runtime Topology

### 34.1 What the repository establishes
| Topic | Status |
|---|---|
| Frontend hosting | **[Unknown]**. README requirements: static host, SPA fallback, HTTPS, same site as the API |
| Backend deployment | **[Unknown]**. The artifact is the Boot fat JAR; JDK 25 is needed |
| PostgreSQL / Redis hosting | **[Unknown]**. Dev Redis is in Docker (`final-stage-chat-prompt.md`); there is no compose file |
| Reverse proxy / TLS | **[Unknown]**. `app.trust-proxy` exists for a proxy that overwrites `X-Forwarded-For` |
| Containerization | **None** (no Dockerfile/compose) |
| Migrations during deployment | **Manual**, with a documented checklist in `implementation-plan.md` §E (backup with `pg_dump -Fc`, pre-checks, run, verify) |
| Health checks / metrics | **None** (no Actuator). Only logs and the Redis startup ping |
| CI/CD | **None** |
| Deployment status | `final-stage-chat-prompt.md` (2026-10-13) records deployment as an open step |

### 34.2 Startup dependencies and failure behavior
| Dependency down at startup | Effect |
|---|---|
| PostgreSQL | **App fails to start** (Hikari/Hibernate validation) |
| Redis | Starts; logs a warning. Login, refresh, signup, password flows → 503; browsing works; rate limits and revocation fail open |
| SMTP | Starts; email flows log a warning or return 503 at send time |

### 34.3 A plausible minimal production topology (proposal, not current state)
```mermaid
flowchart LR
    Browser -- HTTPS --> CDN["Static host / CDN<br/>cinesmart.ca (SPA, index.html fallback)"]
    Browser -- HTTPS --> RP["Reverse proxy<br/>api.cinesmart.ca (TLS, overwrites X-Forwarded-For)"]
    RP --> APP1["Boot JAR #1"] & APP2["Boot JAR #2"]
    APP1 & APP2 --> PG[(Managed PostgreSQL)]
    APP1 & APP2 --> RD[(Managed Redis with persistence)]
    APP1 & APP2 --> SMTP[(Transactional email)]
    ETL["ETL cron job"] --> PG
```

---

# PART IX — System Synthesis and Improvements

## Chapter 35: The Entire Application as One System

### 35.1 Compact end-to-end diagram
```mermaid
flowchart LR
    subgraph Browser
        UI[React components] --> Q[TanStack Query cache<br/>keys prefixed by viewer]
        Q --> HTTP[http.ts<br/>auth modes, refresh-retry]
        SES[session store<br/>memory token, Web Lock refresh,<br/>BroadcastChannel] --- HTTP
    end
    HTTP -- "JSON + Bearer / refresh cookie" --> SEC
    subgraph SpringBoot
        SEC[CORS → IP limit → JWT auth + revocation] --> MVC[DispatcherServlet → user limit → controller]
        MVC --> SVC[services: identity, catalog, discovery,<br/>activity, recommendation]
        SVC --> JDBC[JDBC repositories] & JPA[AppUser JPA]
        SVC --> RTPL[StringRedisTemplate]
        JOB[Hourly analytics job] --> JDBC
    end
    JDBC & JPA --> PG[(PostgreSQL)]
    RTPL --> RD[(Redis)]
    ETL[Python ETL] --> PG
```

### 35.2 The answers, briefly
- **What happens when a user opens the app?** Static files load. `main.tsx` installs the session manager, and `AuthGate` restores the session with `POST /auth/refresh` (cookie) while a splash shows. Then the router renders the page, whose queries fetch JSON with the correct viewer key.
- **How does React build and update the UI?** Function components render from props, state, the session store and the query cache. Updates come from setters, store notifications and cache changes. React reconciles and commits the minimal DOM changes.
- **How are API requests generated and processed?** Always through `request()` in `http.ts`, which applies the auth mode (none/optional/required), refreshes proactively, retries once after a 401 on required endpoints, and maps errors to a typed `ApiError`.
- **How does Spring dispatch requests?** Tomcat thread → the security filter chain (CORS, IP rate limit, Bearer/JWT with Redis revocation, authorization rules) → `DispatcherServlet` → user rate-limit interceptor → handler method with argument binding and validation → Jackson serialization.
- **Where is the business logic?** In `*.application` services, plus ranking logic expressed as SQL in the repositories.
- **How are Java objects managed?** Singleton beans are created by constructor injection at startup and are stateless (thread-safe). Per-request records are created and garbage-collected; framework state is in ThreadLocals.
- **How does persistence translate to the database?** JDBC: the SQL text you see is what runs, with parameters bound. JPA (users only): Hibernate generates INSERT/SELECT/UPDATE, executed at `saveAndFlush` or at commit.
- **How do transactions protect consistency?** Activity writes are atomic and read back their own state. The analytics batch is atomic and cluster-singleton. Uniqueness and one-per-user rules are DB-enforced. **Database + Redis flows are not atomic** (small windows, §23.5).
- **How do responses become frontend state?** JSON → TS interfaces → query cache entries keyed by viewer. Mutations patch caches optimistically and then apply the server's `UserMovieState`.
- **Where are the main security boundaries?** The JWT validator (signature, issuer, expiry, revocation); the URL authorization rules; the `userId` taken only from the token; validation; DB constraints; the cookie attributes; CORS.
- **The major architectural trade-offs:**
  - JWT + Redis-backed rotation (fast requests, revocable sessions; Redis becomes critical)
  - fail-open versus fail-closed per feature
  - hand-written SQL versus ORM
  - batch analytics (cheap reads, one hour of lag)
  - recommendations computed per request (always fresh, costs CPU and DB)
  - a modular monolith (simple to deploy, conventions instead of compiler-enforced boundaries)
- **What affects reliability and performance most?** Redis availability (all auth flows), PostgreSQL pool size, synchronous SMTP, and the recommendation pipeline on `/home` for signed-in users.

### 35.3 Request lifecycle summary (one paragraph you can present)
> A click in React calls a mutation or query hook. That builds a typed request in `http.ts`, which refreshes the 15-minute access token if needed and sends it as a Bearer header with `credentials: 'include'`. The browser runs CORS and preflight checks. On the server, a Tomcat thread runs Spring Security's chain: CORS headers, a Redis per-IP rate limit, JWT signature/issuer/expiry validation plus Redis revocation checks, then the URL rules. The DispatcherServlet applies a per-user rate limit, binds and validates the inputs, and calls a controller. The controller passes the token's `userId` to a service. Inside a Spring-managed transaction where needed, the service runs parameterized SQL through `NamedParameterJdbcTemplate`, or Hibernate for users, on a pooled PostgreSQL connection. It commits and returns a record that Jackson serializes. The SPA maps any error by its stable `code`, writes success data into a query cache keyed by the viewer, and React re-renders only what changed.

### 35.4 Presenting the architecture to another engineer
"CineSmart is a modular-monolith Spring Boot 4 API on Java 25 with a React 19 SPA. PostgreSQL holds the catalog (loaded by a Python ETL) and the user activity. Redis holds all short-lived security state.

Authentication uses short HS256 access tokens kept only in memory, plus rotating refresh tokens in a strict HttpOnly cookie with reuse detection. Revocation goes through Redis, which fails open, so login and refresh fail closed instead.

Reads are hand-written SQL, batched to avoid N+1. Fuzzy search uses `pg_trgm` GIN indexes. Rankings come from an hourly Bayesian-average batch protected by an advisory lock. Recommendations are a content-based taste profile computed per request.

The frontend centralizes HTTP in one module, coordinates refreshes across tabs with Web Locks, caches server state with TanStack Query keyed by viewer, and applies optimistic updates with rollback. One error contract (`code`-based) runs through every layer."

### 35.5 Coverage audit (against §0.3)
| Item | Status |
|---|---|
| Every backend class | ✔ (all 98 main files read; covered in Ch. 10–15, 22) |
| All 36 endpoints | ✔ §12.1 |
| Frontend routes, pages, hooks, API modules | ✔ Ch. 16–20 (shadcn primitives and the dev page summarized only) |
| 16 tables + Redis keys | ✔ §21.2, §21.6 |
| Config + env | ✔ Ch. 32 |
| Tests | ✔ Ch. 33 (quoted results, not re-run) |
| Cross-layer contracts | ✔ audit below |
| Security/reliability/performance | ✔ Ch. 26–29 |
| Improvements kept separate | ✔ Ch. 36 |
| **Incomplete** | ETL API clients and validator not analyzed; PRD/`change.md` not read in full; no runtime or SQL-plan evidence |

---

## Cross-Layer Consistency Audit

Each row says whether the layers agree, with evidence and how to verify. ✔ = consistent, ⚠ = mismatch or risk.

| # | Contract | Verdict | Evidence | Consequence | Verify by |
|---|---|---|---|---|---|
| X-1 | **Password length**: FE 8–100 chars (Zod), BE `@Size(8,100)`, **BCrypt ≤ 72 bytes** | ⚠ | §27.2 S-1; `BCrypt` class message in `spring-security-crypto-7.1.1.jar` | Long passwords are accepted by both validators and then crash with a 500 | Integration test: signup with 73 ASCII chars, and with 25 four-byte emoji (≤ 100 chars, > 72 bytes) |
| X-2 | **Email trimming**: FE trims (Zod `.trim()`), BE `@Email` runs before trimming | ⚠ (masked by the FE) | `validation.ts emailSchema`; BUG-02 | Only non-SPA clients are affected | The existing failing tests |
| X-3 | **Email validity rules**: Zod `.email()` vs Hibernate `@Email` | ⚠ minor | Different regexes; Zod is stricter in some cases (e.g. no IP-literal domains) **[Version-dependent]** | Some addresses the backend would accept are rejected client-side (no data risk) | Table-driven test of edge addresses through both validators |
| X-4 | **Signup race error code**: BE always sends `USERNAME_TAKEN` for a unique-index violation (`AuthService.java:89-90`) | ⚠ minor | Even when the *email* clashed | FE puts "This username is already taken." on the username field | Concurrent signup test with the same email and different usernames |
| X-5 | **Username/email lengths**: DB `VARCHAR(100)`/`VARCHAR(320)` vs app 32/64 | ✔ (DB looser) | schema vs DTOs | None today; non-API writers (scripts) could insert values the API never would | — |
| X-6 | **Rating range**: FE 1.0–10.0 (1 dp), BE `@DecimalMin 1.0`/`@Digits(2,1)`, DB `CHECK 0–10` + `NUMERIC(3,1)` | ✔ with a looser DB | — | The DB would accept 0.0–0.9 from other writers; analytics `CHECK` averages 0–10 is consistent | — |
| X-7 | **Reaction enum**: FE sends LIKE/DISLIKE (DELETE clears), BE regex `LIKE\|DISLIKE\|NEUTRAL`, DB CHECK the same 3 | ✔ | — | — | — |
| X-8 | **Paging**: FE URL page is 1-based, API 0-based, conversion `page - 1` everywhere | ✔ | `usePageParam`, list pages; test "?page=2 requests API page 1" | — | — |
| X-9 | **Response shapes** (MovieCard, MovieDetails, UserMovieState, Page, LoginResponse, Profile, items with `@JsonUnwrapped`) | ✔ | Field-by-field comparison of `src/api/*.ts` with the Java records (§19.3) | — | A contract test or OpenAPI codegen would make this automatic |
| X-10 | **Dates/times**: `Instant`/`OffsetDateTime` → ISO strings; `LocalDate` → `YYYY-MM-DD`; FE formats date-only in UTC to avoid off-by-one | ✔ | `format.ts formatDate` comment; contract [CONV-3] | — | — |
| X-11 | **Decimals**: `averageRating` scale 2 (`8.40` → JS `8.4`), formatted to 1 dp | ✔ | contract + `formatAverage` | — | — |
| X-12 | **Nulls**: flags `null` when anonymous; `otherCrew` omitted; `ApiError.fields` omitted | ✔ | `@JsonInclude` annotations ↔ optional TS fields | — | — |
| X-13 | **IDs**: Java `Long` ↔ JS `number` | ✔ today | values far below 2⁵³ | Would break above 2⁵³ (theoretical) | — |
| X-14 | **`top10.movie_id INT` vs `movie.movie_id BIGINT`** | ⚠ latent | schema §16 | Fails once IDs exceed 2,147,483,647 | `\d top10` in psql |
| X-15 | **Auth modes**: FE `auth:'none'` on public auth POSTs (no header), `'optional'` on JWT-optional GETs, `'required'` elsewhere ↔ `SecurityConfig` matchers | ✔ | `api/*.ts` vs `PUBLIC_AUTH_POSTS`/`OPTIONAL_JWT_GETS` | — | `http.test.ts` + `SecurityAndErrorsIntegrationTest` |
| X-16 | **Expired token on optional GETs** returns anonymous data (200), not 401 | ✔ handled | `fetchWithUserData` safety net + proactive refresh | Without it, the anonymous data would be cached under the user key | — |
| X-17 | **Error codes**: TS `ErrorCode` union = Java `ErrorCode` enum (16 values) + client-only `NETWORK_ERROR` | ✔ | `types.ts` vs `ErrorCode.java` | — | — |
| X-18 | **429 semantics**: rate limits send `Retry-After`; the login IP block and `ACCOUNT_LOCKED` do not; FE branches on `retryAfter == null` and the path | ✔ | `error-message.ts`; `ErrorResponseWriter` + interceptor | The FE relies on `path.endsWith('/auth/login')`, which is coupled to the URL | — |
| X-19 | **CORS exposed header** `Retry-After` ↔ FE reads `response.headers.get('Retry-After')` | ✔ | `SecurityConfig` `setExposedHeaders` | Without exposing it, JS would read `null` | e2e "limits" project |
| X-20 | **Cookie path/site**: `Path=/api/v1/auth`, `SameSite=Strict`, host-only ↔ FE base URL `…/api/v1` | ✔ in dev; ⚠ deployment-sensitive | `RefreshCookies`; README | A proxy that rewrites `/api` or a different registrable domain breaks session restore | Deploy checklist + an e2e reload test on staging |
| X-21 | **Transaction expectations**: FE "apply server truth" assumes the PUT response reflects the write | ✔ | `ActivityService` reads state inside the same `@Transactional` | — | — |
| X-22 | **Platform stats freshness**: the FE says "within the hour"; the batch runs hourly + on startup | ✔ | `DetailsSections` hint; `analytics.refresh-interval` | — | — |
| X-23 | **Environment wiring**: FE default API `http://localhost:8080/api/v1`, Vite port 5173 (strict) ↔ BE CORS/base-URL defaults `http://localhost:5173` | ✔ dev | `env.ts`, `vite.config.ts`, `application.properties` | In prod, all three must be set together | Deploy checklist |
| X-24 | **Search rule**: FE 3–100 after trim ↔ BE the same | ✔ | `search-query.ts` vs `DiscoveryService` | — | — |
| X-25 | **Browse params**: FE never sends empty/unknown params ↔ BE rejects them with 400 | ✔ | `buildUrl` skips empty values | — | — |
| X-26 | **Entity ↔ FK relationships** | ✔ | JDBC code does not model relationships; DB FKs match every join in the SQL | — | — |

---

## Chapter 36: Improvement Opportunities

> **Only proposals.** Nothing below was applied. Priorities: **Critical / High / Medium / Optional**. Each item names its type: *Defect* (confirmed wrong behavior), *Vulnerability*, *Risk* (needs certain conditions), *Maintainability*, *Optimization (speculative)*.

### 36.1 Critical / High: correctness and security

**S-1. Reject passwords over 72 bytes cleanly** — *Defect (library-confirmed)*, **High**
- *Where:* `NewUser`, `ResetPasswordRequest`, `ChangePasswordRequest`; `src/lib/validation.ts`.
- *Now:* > 72-byte passwords pass validation and then hit 500 in `BCrypt`.
- *Change:* add a byte-length constraint on both sides, or lower the maximum to 72 *bytes*.
  ```java
  // shared/validation/MaxUtf8Bytes.java (new) – custom constraint
  @Target({FIELD, RECORD_COMPONENT, PARAMETER}) @Retention(RUNTIME)
  @Constraint(validatedBy = MaxUtf8BytesValidator.class)
  public @interface MaxUtf8Bytes { int value(); String message() default "must be at most {value} bytes"; Class<?>[] groups() default {}; Class<? extends Payload>[] payload() default {}; }

  public class MaxUtf8BytesValidator implements ConstraintValidator<MaxUtf8Bytes, String> {
      private int max;
      public void initialize(MaxUtf8Bytes a) { max = a.value(); }
      public boolean isValid(String v, ConstraintValidatorContext c) {
          return v == null || v.getBytes(StandardCharsets.UTF_8).length <= max;
      }
  }
  // NewUser: @NotBlank @Size(min = 8) @MaxUtf8Bytes(72) String password
  ```
  ```ts
  // validation.ts
  export const newPasswordSchema = z.string().min(8, 'Use at least 8 characters.')
    .refine((v) => new TextEncoder().encode(v).length <= 72, 'Use at most 72 bytes (about 72 letters).');
  ```
- *Alternative:* pre-hash with SHA-256 before BCrypt (`DelegatingPasswordEncoder` pattern). That needs a migration path for existing hashes.
- *Benefit:* clear 400s instead of 500s. *Trade-off:* the documented limit changes (update `frontend-contract.md`).
- *Verify:* integration tests with 73 ASCII characters and with multibyte strings.

**S-2. Unique access tokens (`jti`)** — *Defect (reported BUG-01)*, **High**
- *Change:* in `TokenService.accessToken`, `.id(UUID.randomUUID().toString())`.
- *Benefit:* logout affects one session only.
- *Verify:* the existing failing test turns green.

**S-3. Correct client-IP extraction behind proxies** — *Risk*, **High when deploying behind a proxy**
- *Change:* prefer Spring's `ForwardedHeaderFilter` / `server.forward-headers-strategy=native` (Tomcat `RemoteIpValve` with `internalProxies`), which takes the **right-most untrusted** address. Or parse from the right with a configured trusted-hop count.
  ```properties
  server.forward-headers-strategy=native
  server.tomcat.remoteip.internal-proxies=10\\.0\\.\\d{1,3}\\.\\d{1,3}
  ```
  Then `request.getRemoteAddr()` is already the client IP, and `ClientIpResolver` can drop its own header parsing.
- *Verify:* a test with `X-Forwarded-For: spoofed, real` from a trusted proxy address.

**S-6. Least-privilege database role** — *Risk*, **High (defense in depth)**
- *Change:* create `cinesmart_app` with `SELECT` on the catalog tables, `SELECT/INSERT/UPDATE/DELETE` on the activity tables and `app_user`, `INSERT/UPDATE` on `movie_analytics`, and no DDL. Give the ETL its own role.
  ```sql
  CREATE ROLE cinesmart_app LOGIN PASSWORD :'pw';
  GRANT SELECT ON movie, person, movie_role, movie_person, genre, movie_genre, language, movie_language, availability, top10 TO cinesmart_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON app_user, watchlist, already_watched, user_rating, user_reaction TO cinesmart_app;
  GRANT SELECT, INSERT, UPDATE ON movie_analytics TO cinesmart_app;
  GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO cinesmart_app;
  ```
- *Trade-off:* `ddl-auto=validate` only reads metadata, so it is still fine.
- *Verify:* run the integration suite with that role in the container.

**S-7. Rotate any once-exposed secrets; keep run configurations out of shared folders** — *Vulnerability (reported)*, **High until done**
- Follow `final-stage-chat-prompt.md` steps 1–2 (new `JWT_SECRET`, new SMTP password).
- Consider a `.env` loader or a secret manager instead of IDE run configurations.

### 36.2 Data integrity and transaction safety

**D-1. Make the DB + Redis password flows failure-tolerant** — *Risk*, **Medium**
- *Where:* `PasswordResetService.resetPassword`, `AccountService.changePassword`.
- *Change (simple):*
  1. Call `RedisFailClosed.ensureAvailable(redis)` **before** the DB write, as signup already does.
  2. If `revokeAll` throws after the save, log at ERROR and still return a clear message ("password changed; other devices may remain signed in up to 15 min").
- *Change (robust):* write a "sessions-revoke" row in the same DB transaction as the password update (a transactional outbox) and let a worker apply it to Redis with retries.
- *Benefit:* the client never sees "failed" when the password actually changed.

**D-2. Consume single-use tokens only after the DB write succeeds** — *Maintainability/UX*, **Optional**. Use `GET` first, then the DB write, then `DEL` (accepting a small double-use window), or a Lua compare-and-delete.

**D-3. Fix the signup race error code** — *Defect (minor)*, **Medium**. Inspect the violated constraint name (`uq_app_user_email_lower` vs `…username…`) in the exception's root cause and return `EMAIL_TAKEN` or `USERNAME_TAKEN` accordingly.

**D-4. Align `top10.movie_id` to `BIGINT`** — *Maintainability*, **Optional**. `ALTER TABLE top10 ALTER COLUMN movie_id TYPE BIGINT;` in a V023 migration with the standard header.

### 36.3 Backend architecture and Java design

**A-1. Fix the self-invocation transaction on details** — *Maintainability*, **Optional**. Annotate `getMovieDetails` itself with `@Transactional(readOnly = true)`. The inner call then joins that transaction (one connection, one consistent set of reads).

**A-2. Enforce module boundaries** — *Maintainability*, **Medium**. Add **Spring Modulith** (`ApplicationModules.of(CineSmartApplication.class).verify()` in a test) or ArchUnit rules: "`..persistence..` only accessed by its own module", "no cycles between modules". This catches the `shared ↔ identity` cycle.

**A-3. Remove the `shared → identity` dependency** — *Maintainability*, **Optional**. Introduce `shared.security.TokenRevocationCheck` (an interface) that `AccessTokenRevocationService` implements, so `SecurityConfig` depends only on `shared`.

**A-4. Keep HTTP DTOs out of services** — *Maintainability*, **Optional**. Make services return domain records (`ProfileView`, `SignupResult`); map to `api.dto` in controllers.

### 36.4 Spring Boot configuration and framework usage

**B-1. Add timeouts** — *Risk*, **High**
```properties
spring.mail.properties.mail.smtp.connectiontimeout=5000
spring.mail.properties.mail.smtp.timeout=5000
spring.mail.properties.mail.smtp.writetimeout=5000
spring.datasource.hikari.connection-timeout=5000
spring.datasource.hikari.data-source-properties.options=-c statement_timeout=5000
```
Optionally send emails asynchronously (`@Async` on a dedicated executor, or an outbox). That also fixes the timing-enumeration finding S-5.

**B-2. Disable Open Session in View** — *Maintainability/Performance*, **Medium**. `spring.jpa.open-in-view=false`. JPA use is tiny and already happens inside repository transactions. *Verify:* the full test suite (any lazy loading would show up immediately; there is none).

**B-3. Version a non-secret `application.properties`** — *Maintainability*, **High**. Remove it from `Cinesmart-Backend/.gitignore` (it has contained only `${ENV}` placeholders since the env-var change). Otherwise a CI build or a fresh clone produces a JAR without configuration.

**B-4. Add the Maven wrapper** — *Developer experience*, **Medium**. `mvn wrapper:wrapper`, then commit `mvnw`, `mvnw.cmd` and `.mvn/wrapper/*` (un-ignore `.mvn/`).

**B-5. Fix the stale DB scripts** — *Defect (tooling)*, **Medium**. `Database/Scripts/reset_dev_database.sql`: replace `user_like` with `user_reaction`, add `movie_analytics` and `top10`, and remove the leading `ROLLBACK ;`. Also drop the trailing `ROLLBACK ;` from `Database/Schema.sql`.

**B-6. Adopt Flyway** — *Maintainability*, **Optional (Medium before multi-environment deploys)**. Baseline the current schema as `V1__baseline.sql` (`flyway.baseline-on-migrate=true` for the existing database), then add new migrations as `V2__…`. Benefit: versions are recorded and applied automatically in every environment, including tests.

**B-7. Add Actuator for health and metrics** — *Observability*, **Medium**. Expose only `health` and `info` publicly. The Redis health indicator should *not* take the app out of service, matching the fail-open browsing behavior (`management.health.redis.enabled` or a custom readiness group).

### 36.5 React architecture and state management
- **F-1.** Add a request timeout in `http.ts` with `AbortSignal.any([opts.signal, AbortSignal.timeout(15000)])` (where supported), mapped to `NETWORK_ERROR`. *Optional.*
- **F-2.** Replace the `path.endsWith('/auth/login')` special case (`error-message.ts`) with a dedicated error code from the backend (e.g. `LOGIN_IP_BLOCKED`). *Optional.*
- **F-3.** Generate the TS API types from an OpenAPI spec (`springdoc-openapi` + `openapi-typescript`) so X-9 is checked mechanically. *Medium.*

### 36.6 API design and consistency
- **P-1.** Apply the "unknown query params → 400" rule consistently (all list endpoints) or nowhere. *Optional.*
- **P-2.** The backend README is out of date (old endpoints such as `/movies/search/genre/{id}`, "Logout: Not implemented"). Replace it with a pointer to `frontend-contract.md`, or regenerate it. *Medium (docs drift misleads new engineers).*
- **P-3.** Return a stable `LOGIN_IP_BLOCKED` code (see F-2).

### 36.7 PostgreSQL schema and query performance (speculative until measured)
- **Q-1.** Indexes matching the hot sorts, created with `CONCURRENTLY` in their own migration file:
  ```sql
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movie_browse_order ON movie (imdb_rating DESC NULLS LAST, imdb_votes DESC NULLS LAST, movie_id);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_top_rated ON movie_analytics (weighted_rating DESC, rating_count DESC) WHERE rating_count >= 5;
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_rating_user_time ON user_rating (user_id, rated_at DESC);
  ```
  Verify with `EXPLAIN ANALYZE` before and after, at realistic sizes. At 1,000 movies they may not be worth their write cost.
- **Q-2.** Drop the redundant `idx_person_name` (the unique constraint's index already covers it).
- **Q-3.** Cache recommendations per user in Redis for a short TTL, invalidated on activity writes. Also compute reasons only for the returned page (`RecommendationService.rank` currently computes reasons for all ≤ 300). *Medium for `/home` latency.*
- **Q-4.** Skip the second JWT decode on optional routes by moving "ignore invalid tokens" into a custom `AuthenticationEntryPoint`/`AuthenticationFailureHandler` that continues the chain, or cache the decode result on the request attribute. *Optional.*

### 36.8 Testing and observability
- **T-1.** Add the tests listed in §33.5. *High for S-1 and D-1.*
- **T-2.** Add request IDs (a `MDC` filter + `X-Request-Id` response header) and JSON logs. *Medium.*
- **T-3.** Add a CI pipeline: `mvn verify` (Docker available), `pnpm typecheck lint test build`, and optionally Playwright against docker-compose services. *Medium.*

### 36.9 Build and deployment
- **B-8.** Add `docker-compose.yml` for local PostgreSQL 18 + Redis 7, matching the test images, with Redis persistence enabled. *Medium.*
- **B-9.** Containerize the backend (`spring-boot:build-image` gives a Buildpacks OCI image, no Dockerfile needed). *Optional.*
- **B-10.** SPA hosting with an `index.html` fallback, long-cache headers for `/assets/*`, and no-cache for `index.html`. *Required at deploy time.*

### 36.10 Maintainability and developer experience
- **M-1.** `git init` at the root (or a monorepo) so the schema, frontend and backend change together. *Medium.*
- **M-2.** Document the Redis key space (§21.6) next to the code, or centralize the key prefixes in one class. *Optional.*
- **M-3.** S-4 refresh grace period: on reuse within N seconds of rotation, return the *same* new session instead of revoking everything (store `refresh:used:<sha>` → the new hash). *Optional; security/UX trade-off.*
- **M-4.** S-9: validate `^https?://` for `poster` and `platform_url` in the ETL (`Data_Validator.py`) and/or in `CatalogRepository` mapping. *Medium.*
- **M-5.** The ETL uses `ON CONFLICT (imdb_id) DO NOTHING` for movies, so IMDb ratings and votes are never refreshed. Use `DO UPDATE SET imdb_rating = EXCLUDED.imdb_rating, imdb_votes = EXCLUDED.imdb_votes, …` if the ranked lists should stay current. *Medium (data freshness).*
- **M-6.** The ETL logs failures at INFO and exits normally (`Ingestion_Script.py` `except` blocks). Log at ERROR and exit non-zero so schedulers notice. *Medium.*

### 36.11 Summary table
| ID | Type | Priority |
|---|---|---|
| S-1 | Defect | High |
| S-2 | Defect (reported) | High |
| S-3 | Risk (deploy) | High |
| S-6 | Risk | High |
| S-7 | Vulnerability (reported) | High |
| B-1 | Risk | High |
| B-3 | Maintainability | High |
| T-1 | Testing | High |
| D-1 | Risk | Medium |
| D-3 | Defect (minor) | Medium |
| B-2, B-4, B-5, B-7, B-8 | Config/tooling | Medium |
| A-2 | Maintainability | Medium |
| F-3, P-2, Q-3, T-2, T-3, M-1, M-4, M-5, M-6 | various | Medium |
| A-1, A-3, A-4, D-2, D-4, F-1, F-2, P-1, P-3, Q-1, Q-2, Q-4, B-6, B-9, M-2, M-3 | various | Optional |

---

## Chapter 37: Learning Roadmap

Ordered from foundation to advanced. Each row: why it matters → where to look → what to know first → what next → an exercise.

| # | Concept | Files that demonstrate it | Prerequisite | Next | Exercise |
|---|---|---|---|---|---|
| 1 | HTTP, status codes, headers, CORS | `api/http.ts`, `SecurityConfig.corsConfigurationSource` | HTTP message anatomy | Preflight caching, credentials mode | In DevTools, watch the OPTIONS + PUT for a rating; change `FRONTEND_ORIGINS` and observe the CORS failure |
| 2 | Java records, switch, pattern matching | `shared/api/*`, `ErrorCode`, `IpRateLimitFilter` | OOP basics | Sealed interfaces | Model `MovieAction` (TS) as a sealed Java interface with records |
| 3 | DI and the bean lifecycle | any `@Service` constructor, `SecurityConfig` `@Bean`s | Interfaces | Conditional beans, `@Profile` | Write a plain JUnit test for `CandidateScorer` and one for `ActivityService` with Mockito, no Spring |
| 4 | Spring MVC binding and validation | `MovieActivityController`, DTOs, `GlobalExceptionHandler` | Annotations as metadata | Custom constraints | Implement `@MaxUtf8Bytes` (S-1) in a scratch branch |
| 5 | Spring Security filter chain | `SecurityConfig`, `IpRateLimitFilter`, `UserRateLimitInterceptor` | Servlet filters | Method security (`@PreAuthorize`) | Set `logging.level.org.springframework.security=TRACE` and read one request's filter trace |
| 6 | JWT, refresh rotation, revocation | `TokenService`, `AccessTokenRevocationService`, `session/refresh.ts` | Hashes, HMAC | OAuth 2.1 / BFF pattern | Decode a JWT at a local tool; tamper with one byte and watch the 401 |
| 7 | Transactions and proxies | `ActivityService`, `CatalogService` (self-invocation), `AnalyticsRepository` | ACID | Propagation, isolation | Log `TransactionSynchronizationManager.isActualTransactionActive()` in `getMoviesByIds` from the details path vs the recommendation path |
| 8 | JDBC vs JPA | `*Repository` classes, `AppUser` | SQL | Hibernate entity states, dirty checking | Rewrite `findWatchlistPage` as JPQL and compare the generated SQL with `show-sql` |
| 9 | PostgreSQL indexes and plans | schema, `DiscoveryRepository` | B-tree basics | GIN/trigram, partial indexes | `EXPLAIN ANALYZE` the search and browse queries; add Q-1 indexes in a dev DB and compare |
| 10 | Upserts and concurrency | `ActivityRepository`, `AnalyticsRepository` | Locks | `SERIALIZABLE`, advisory locks | Fire 50 parallel PUT ratings with k6 and inspect the final row |
| 11 | Redis atomicity (Lua, GETDEL) | `RateLimiter`, `LoginAttemptService`, `TokenService` | Key-value basics | Sliding-window/token-bucket limiters | Implement a sliding-window variant and compare its burst behavior |
| 12 | React rendering, hooks, effects | `AuthGate`, `useRetryAfter`, `useTokenMutation`, `RouteAnnouncer` | JS closures | Concurrent features, transitions | Remove the `started` ref and watch StrictMode double-POST in the Network tab |
| 13 | Server-state caching | `query/*`, `use-movie-actions.ts` | Promises | Infinite queries, persistence | Turn `MovieRow` into `useInfiniteQuery`; keep the cache keys compatible |
| 14 | Forms and validation | `validation.ts`, `apply-server-errors.ts`, `LoginPage` | Controlled vs uncontrolled | Schema sharing via OpenAPI | Add a server-only rule and watch it map onto the field |
| 15 | Accessibility | `RouteAnnouncer`, `pending-props.ts`, e2e `a11y.spec.ts` | Semantic HTML | ARIA patterns (WAI-ARIA APG) | Navigate the whole site with only the keyboard and a screen reader |
| 16 | Testing with containers | `support/*`, `RedisOutageIntegrationTest` | JUnit 5 | Contract testing | Add the long-password test (T-1) and the partial-failure test |
| 17 | Recommendation and ranking math | `CandidateScorer`, `AnalyticsRepository` (Bayesian average) | Weighted averages | Collaborative filtering | Change `analytics.min-votes` and predict Top Rated before checking |
| 18 | Operating a system | Ch. 34, §36.4 | All of the above | SLOs, tracing | Add Actuator + a request-ID filter and follow one request through the logs |

---

## Appendix A: Authoritative references

**Java**
- *The Java Language Specification* (records, switch, pattern matching): https://docs.oracle.com/javase/specs/
- JDK API docs (`java.time`, `BigDecimal`, `SecureRandom`, `MessageDigest`): https://docs.oracle.com/en/java/javase/25/docs/api/

**Spring**
- Spring Framework Reference (IoC, AOP, transactions, MVC, validation): https://docs.spring.io/spring-framework/reference/
- Spring Boot Reference (auto-configuration, externalized configuration, Testcontainers): https://docs.spring.io/spring-boot/reference/
- Spring Security Reference (architecture, OAuth2 resource server/JWT, CORS, CSRF): https://docs.spring.io/spring-security/reference/
- Spring Data JPA / Redis: https://docs.spring.io/spring-data/jpa/reference/ and https://docs.spring.io/spring-data/redis/reference/

**Persistence and drivers**
- Hibernate ORM User Guide: https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html
- HikariCP: https://github.com/brettwooldridge/HikariCP
- PostgreSQL documentation (indexes, `pg_trgm`, `INSERT … ON CONFLICT`, advisory locks, transaction isolation): https://www.postgresql.org/docs/current/
- Redis commands (`GETDEL`, `EVAL`, `INCR`): https://redis.io/docs/latest/commands/

**Frontend**
- React docs (rendering, effects, "You might not need an effect", `useSyncExternalStore`): https://react.dev/
- React Router: https://reactrouter.com/
- TanStack Query: https://tanstack.com/query/latest
- react-hook-form: https://react-hook-form.com/ · Zod: https://zod.dev/
- Vite: https://vite.dev/

**Web platform and security**
- MDN on HTTP, CORS, cookies and SameSite, Web Locks, BroadcastChannel: https://developer.mozilla.org/
- RFC 7519 (JWT), RFC 6265bis (cookies), RFC 9110 (HTTP semantics)
- OWASP ASVS and Cheat Sheets (authentication, session management, password storage, CSRF): https://owasp.org/www-project-application-security-verification-standard/ and https://cheatsheetseries.owasp.org/
- OAuth 2.0 Security Best Current Practice (refresh token rotation): RFC 9700

---

*End of report. Generated by reading the repository only; no project file was modified.*
