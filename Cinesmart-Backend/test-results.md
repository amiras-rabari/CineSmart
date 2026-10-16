# CineSmart Backend — Test Results

## Summary

| | |
|---|---|
| Date | 2026-10-14 |
| Command | `mvn test` (JAVA_HOME = JDK 25, Docker Desktop running) |
| Total | **191** |
| Passed | **187** |
| Failed | **4** (all caused by the 2 real bugs below) |
| Errors / Skipped | 0 / 0 |
| Duration | ~1 min 10 s (first run also pulls the `postgres:18-alpine` and `redis:7-alpine` images) |
| Stability | The full suite ran 3 times with identical results |

**Isolation check:** `src/main/**` and `Database/**` were checksummed before and after the work and are byte-for-byte unchanged (157 files).
The tests run against a throwaway PostgreSQL + Redis in Docker (Testcontainers). The schema comes from a read-only
`../Database/Schema.sql`, and the data from `src/test/resources/db/test-seed.sql`. Your `Test` database is never contacted.
The smoke test asserts this.

## Results per module

| Module | Test class | Type | Tests | Failed |
|---|---|---|---|---|
| app | ApplicationSmokeIntegrationTest | integration | 3 | 0 |
| identity | SignupAndVerificationIntegrationTest | integration | 13 | **1** (BUG-02) |
| identity | LoginAndLockoutIntegrationTest | integration | 11 | 0 |
| identity | SessionIntegrationTest | integration | 10 | 0 |
| identity | PasswordIntegrationTest | integration | 10 | **1** (BUG-02) |
| identity | EmailChangeAndProfileIntegrationTest | integration | 8 | **1** (BUG-02) |
| identity | TokenServiceTest | unit | 9 | **1** (BUG-01) |
| identity | AccessTokenRevocationServiceTest | unit | 5 | 0 |
| identity | IdentityBasicsTest | unit | 3 | 0 |
| catalog | CatalogIntegrationTest | integration | 7 | 0 |
| discovery | BrowseAndSearchIntegrationTest | integration | 16 | 0 |
| discovery | RankedListsAndHomeIntegrationTest | integration | 8 | 0 |
| activity | MovieActivityIntegrationTest | integration | 10 | 0 |
| activity | MyListsIntegrationTest | integration | 7 | 0 |
| recommendation | RecommendationIntegrationTest | integration | 8 | 0 |
| recommendation | SimilarIntegrationTest | integration | 5 | 0 |
| recommendation | CandidateScorerTest | unit | 3 | 0 |
| recommendation | RecommendationServiceTest | unit | 4 | 0 |
| analytics | AnalyticsIntegrationTest | integration | 4 | 0 |
| analytics | AnalyticsJobTest | unit | 4 | 0 |
| shared | SecurityAndErrorsIntegrationTest | integration | 12 | 0 |
| shared | RateLimitAndCorsIntegrationTest | integration | 8 | 0 |
| shared | RedisOutageIntegrationTest | integration | 5 | 0 |
| shared | SharedUtilitiesTest, ApiBasicsTest, RateLimitTest | unit | 18 | 0 |

**What is covered:**
- **Identity:** signup, verification and resend; login, including the 5-per-user and 10-per-IP lockouts; refresh rotation and theft detection; the 2 h idle limit and 7-day cap; logout; forgot/reset/change password; email change; `/me`.
- **Catalog:** movie details, `otherCrew`, `userState`, `/genres` and `/languages`.
- **Discovery:** browse filters and paging; fuzzy search and the title boost; the four ranked lists; home rows with deduplication.
- **Activity:** every PUT/DELETE, with idempotency, validation and timestamps; the four `/me` lists.
- **Recommendation:** For You ranking and reasons, cold start, exclusions, the 90-day recency boost, similar titles.
- **Analytics:** the weighted-rating batch.
- **Shared:** the security matrix, JWT expiry/issuer/signature checks, error format and codes, CORS, the five configured rate limits, and Redis fail-open / fail-closed behaviour (Redis is paused for real during the test).

## Bugs found

Nothing in `src/main` was changed. The failing tests stay as they are and assert the documented behaviour.
They will pass once the bug is fixed.

### BUG-01: Two sessions issued in the same second get the same access token (Medium)

- **Failing test:** `TokenServiceTest#twoSessionsIssuedTogetherGetDifferentAccessTokens`
- **Where:** `src/main/java/ca/cinesmart/identity/application/TokenService.java:155-163` (`accessToken(...)`), together with
  `AuthService.java:143` and `AccessTokenRevocationService.java:42` (logout blacklists by token value).
- **Expected:** Logout ends *this* session only (change.md Q6). Each session's access token must be unique.
- **Actual:** The JWT claims are only `iss, sub, userId, iat, exp`, with second precision and no `jti`. Two logins by the same user within
  the same second produce byte-identical tokens. Logging out on one device blacklists the other device's access
  token too, so it gets 401 for up to 15 minutes, until it refreshes.
- **Reproduce:** Log in twice as the same user within one second (two devices or tabs). Log out with the first token,
  then call `GET /api/v1/me` with the second → 401. The unit test shows the two identical JWT strings.
- **Suggested fix (not applied):** Add a random `jti` claim in `TokenService.accessToken`, e.g. `.id(UUID.randomUUID().toString())`.
  Nothing else needs to change.

### BUG-02: Emails with surrounding spaces are rejected instead of trimmed (Low)

- **Failing tests:**
  - `SignupAndVerificationIntegrationTest#emailWithSurroundingSpacesIsTrimmedNotRejected`
  - `EmailChangeAndProfileIntegrationTest#newEmailWithSurroundingSpacesIsTrimmedNotRejected`
  - `PasswordIntegrationTest#forgotPasswordAndResendTrimTheEmail`
- **Where:** `@Email` on `identity/api/dto/NewUser.java:16`, `ChangeEmailRequest.java:12` and `ForgotPasswordRequest.java:10`.
  This validation runs before `AppUser.normalizeEmail` (`AppUser.java:67`), which would trim.
- **Expected:** change.md Q9 says emails are "lowercased + trimmed" and that this "applies to signup, login, forgot password,
  resend verification and change email". So `"  Alice@Example.COM "` should be stored or looked up as `alice@example.com`.
- **Actual:** 400 `VALIDATION_FAILED` with `fields.email` / `fields.newEmail`. The trim in `normalizeEmail` is never reached for
  padded input. Lowercasing does work: `Alice@Example.COM` is stored as `alice@example.com`, and that test passes.
- **Reproduce:** `POST /api/v1/auth/signup` with `{"username":"alice","email":"  alice@example.com ","password":"Password123!"}` → 400.
- **Suggested fix (not applied):** Trim before validation, e.g. a compact canonical constructor in each record
  (`email = email == null ? null : email.trim();`). Or decide that the frontend always trims, and update Q9 instead.

## Notes (not bugs)

- **Fuzzy search returns weak matches after the strong ones.** With `search.similarity-threshold=0.3`, "matrix" also matches
  "Matthew McConaughey" and "nolan" also matches "The Notebook". Best matches still come first, as Q19 specifies. Raise the
  threshold if this is too loose.
- **`tokens-valid-after` has one-second resolution.** Tokens issued in the same second as a "log out everywhere" stay valid
  (documented in `AccessTokenRevocationServiceTest`). That is acceptable with 15-minute tokens.
- **Unknown URLs return 401 when anonymous** (and 404 with a token), as documented in implementation-plan Phase 0.
- Spring logs a startup warning that `spring.jpa.open-in-view` is enabled by default. This is unrelated to the tests.

## Test-setup problems (fixed in `src/test`)

- The Redis outage test injected "the" container bean, but there are two (Postgres + Redis). It now uses `@Qualifier("redis")`.
- Search tests first expected exact result lists. Because of the fuzzy threshold above, they now assert the top results.
- The logout test now waits one second between its two logins, so it tests logout itself and isn't hit by BUG-01.
  BUG-01 has its own test.

## Files added or changed

- `pom.xml`: test-scoped dependencies only (`spring-boot-starter-webmvc-test`, `spring-boot-starter-security-test`,
  `spring-boot-testcontainers`, `testcontainers-postgresql`, `testcontainers-junit-jupiter`)
- `src/test/resources/application-test.properties`, `src/test/resources/db/test-seed.sql`
- `src/test/java/ca/cinesmart/**`: the test classes above, plus `support/` (containers, base class, JSON helper)
- `test-results.md`: this file
