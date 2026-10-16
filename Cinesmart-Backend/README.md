# CineSmart Backend

CineSmart is a Spring Boot backend for a movie discovery application. The backend currently provides the core read and user-activity flows needed to start building a frontend:

- Movie detail retrieval
- Movie discovery by title, year, genre, and language
- User registration and email verification
- JWT-based login
- Password reset
- Watchlist management
- Already-watched management
- Personal ratings
- Like/dislike reactions

Recommendation generation, movie analytics aggregation, and the master orchestration layer are planned next. Country-specific behavior is intentionally not part of this implementation guide.

## Current implementation status

| Capability | Status | Notes |
|---|---|---|
| Movie detail page data | Implemented | Returns core movie data, genres, languages, people/roles, analytics when available, and availability rows. |
| Discovery by year | Implemented | Returns lightweight movie results. |
| Discovery by genre | Implemented | Supports genre ID and genre name. |
| Discovery by language | Implemented | Supports language ID and language name. |
| Basic title search | Implemented | Uses substring matching first and PostgreSQL `word_similarity` as a fallback. |
| Search pagination | Not implemented | Current discovery endpoints return lists without page/size parameters. |
| Person search | Not implemented | Actor/director search is not currently exposed. |
| Homepage composition | Not implemented | Top lists and a unified homepage response belong in the future orchestration layer. |
| Registration | Implemented | Username, email, and password validation; duplicate checks; password hashing. |
| Email verification | Implemented | Verification token is stored in Redis and is single-use with expiration. |
| Login | Implemented | Verified users receive a signed JWT. |
| Logout | Not implemented | The API is stateless; the frontend should remove its stored JWT. |
| Password reset | Implemented with limitations | Requires username and email together; reset token is single-use and expires. |
| Watchlist | Implemented | Add, remove, and retrieve movie IDs for the authenticated user. |
| Already watched | Implemented | Add, remove, and retrieve movie IDs for the authenticated user. |
| Ratings | Implemented | One rating per user/movie; values from 1.0 through 10.0; repeated submission updates the row. |
| Reactions | Implemented | Supports `LIKE`, `DISLIKE`, and `NEUTRAL`; repeated submission updates the row. |
| Recommendation engine | Not implemented | The recommendation package currently has no implementation. |
| Movie analytics batch | Not implemented | No scheduled aggregation job currently maintains analytics. |
| Master orchestration | Not implemented | Future layer will compose discovery, catalog, activity, analytics, and recommendations. |

## Architecture

The project is a modular monolith. Each boundary is a package inside one Spring Boot application.

```text
ca.cinesmart
├── identity_and_access       Authentication, signup, verification, password reset
├── movies_catalogue          Read-only complete movie retrieval
├── discovery_movies          Lightweight movie discovery and search
├── user_movies_activity      Watchlist, watched, ratings, and reactions
├── user_recommendation       Reserved for recommendation functionality
└── shared_security            Shared authenticated-user DTO
```

The movie data used by the Spring application is read-only from the application's perspective. Catalog ingestion and database preparation are assumed to be handled outside this backend.

## Running the backend

The project uses:

- Java 25
- Spring Boot 4.1.1
- PostgreSQL
- Redis
- Spring Security
- Spring Data JPA and JDBC
- Spring Mail

Required environment/configuration values include:

```text
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
SPRING_DATASOURCE_PASSWORD
APP_BASE_URL
```

The application also expects:

- PostgreSQL to contain the catalog and activity tables.
- Redis to be available at the configured host and port.
- SMTP settings to be configured for registration verification and password reset emails.
- `jwt.secret`, `jwt.issuer`, and `jwt.expiry-seconds` to be configured.

The application uses `spring.jpa.hibernate.ddl-auto=validate`, so it validates the schema rather than creating or modifying it.

## Authentication flow

### Register

```http
POST /api/v1/auth/register
Content-Type: application/json
```

```json
{
  "username": "moviefan",
  "email": "moviefan@example.com",
  "password": "password123"
}
```

Validation currently requires:

- Nonblank username, maximum 32 characters
- Valid email, maximum 64 characters
- Password between 8 and 100 characters

The backend hashes the password, creates the account as unverified, stores a verification token in Redis, and sends an email.

### Verify email

```http
GET /api/v1/auth/email-verification/verify?token=<verification-token>
```

The token is consumed when it is read, so it cannot be reused.

### Resend verification

```http
GET /api/v1/auth/email-verification/resend?username=moviefan
```

The response is intentionally generic when the user does not exist or is already verified.

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "username": "moviefan",
  "password": "password123"
}
```

Successful response:

```json
{
  "token": "<jwt>",
  "message": "logged in"
}
```

The frontend should send the token on protected requests:

```http
Authorization: Bearer <jwt>
```

The JWT contains the authenticated user's ID in the `userId` claim. Protected activity operations derive the user identity from this claim rather than accepting a user ID from the frontend.

### Password reset request

```http
POST /api/v1/auth/password/forgot
Content-Type: application/json
```

```json
{
  "username": "moviefan",
  "email": "moviefan@example.com"
}
```

The endpoint returns a successful response without revealing whether the account matched. A reset link is sent only when the username, email, and verified-account checks succeed.

### Password reset

```http
POST /api/v1/auth/password/reset
Content-Type: application/json
```

```json
{
  "resetTicket": "<reset-token>",
  "newPassword": "newpassword123"
}
```

The reset token expires and is atomically deleted when used.

### Authentication protection

Public endpoints include registration, login, email verification, password reset, and movie read/discovery endpoints. User activity endpoints require a valid JWT.

Redis is used for:

- Failed-login counters
- Temporary user lockout
- IP-level blocking
- Email verification tokens
- Password reset tokens

## Movie catalog API

### Get complete movie details

```http
GET /api/v1/movies/{movieId}
```

Example:

```http
GET /api/v1/movies/1000
```

The response is assembled from the read-only catalog tables and contains:

```json
{
  "movie": {
    "imdbId": "tt0000000",
    "tmdbId": 1000,
    "title": "Example Movie",
    "year": 2024,
    "released": "2024-01-01",
    "runtime": 120,
    "plot": "Movie description",
    "poster": "https://example.com/poster.jpg",
    "contentType": "movie",
    "studio": "Example Studio",
    "rottenTomatoes": 90,
    "metascore": 80,
    "imdbRating": 8.1,
    "imdbVotes": 100000
  },
  "genres": "Drama, Sci-Fi",
  "languages": "English",
  "crew": [
    {
      "personId": 10,
      "name": "Example Person",
      "roleId": 1,
      "role": "Actor"
    }
  ],
  "analytics": {
    "globalUserRating": 8.5,
    "globalReactionCount": 20
  },
  "availability": [
    {
      "platform": "Example Platform",
      "availabilityType": "subscription",
      "platformUrl": "https://example.com"
    }
  ]
}
```

The exact values depend on the database schema and available rows. A missing analytics row is returned as `null`, while missing genres, languages, crew, or availability are returned as empty collections/strings.

## Discovery API

Discovery endpoints return lightweight `DiscoveryMovieDto` records:

```json
{
  "title": "Example Movie",
  "year": 2024,
  "plot": "Short description",
  "poster": "https://example.com/poster.jpg",
  "imdbRating": 8.1
}
```

The frontend should use the movie ID associated with its catalog/discovery response when opening a movie detail page. The current lightweight DTO should be extended to include that ID before the frontend is finalized if the discovery persistence projection does not already provide it through the surrounding application.

### Get all discovery movies

```http
GET /api/v1/movies/search
```

### Search by genre ID

```http
GET /api/v1/movies/search/genre/{genreId}
```

### Search by language ID

```http
GET /api/v1/movies/search/language/{languageId}
```

### Search by year

```http
GET /api/v1/movies/search/year/{year}
```

The year must be at least 1888.

### Search by title keyword

```http
GET /api/v1/movies/search/keyword/{keyword}
```

The keyword must contain at least three characters. The current implementation:

1. Trims and lowercases the keyword.
2. Attempts a title substring search.
3. Uses PostgreSQL `word_similarity` when the substring search returns no results.

### Search by genre name

```http
GET /api/v1/movies/search/genre-name/{genreName}
```

### Search by language name

```http
GET /api/v1/movies/search/language-name/{languageName}
```

### Discovery limitations to account for in the frontend

The current Discovery boundary does not yet provide:

- Pagination
- Page-size metadata
- Sorting parameters
- Combined filters
- Actor/director search
- Search by keyword columns
- Top 250 lists
- Popular or most-liked lists
- A composed homepage response
- Recommendation sections

For the first frontend version, the existing endpoints can support basic browse/filter pages and a movie detail flow. Large result sets should be addressed before production use.

## User movie activity API

All activity endpoints require:

```http
Authorization: Bearer <jwt>
```

The frontend should not send a user ID. The backend obtains the user ID from the JWT.

### Watchlist

Add:

```http
POST /api/v1/auth/user/watchlist/add-movie/{movieId}
```

Remove:

```http
POST /api/v1/auth/user/watchlist/remove-movie/{movieId}
```

Retrieve movie IDs:

```http
GET /api/v1/auth/user/watchlist
```

Successful nonempty response:

```json
[1000, 1001, 1002]
```

An empty watchlist currently returns HTTP 204.

### Already watched

Add:

```http
POST /api/v1/auth/user/already-watched/add-movie/{movieId}
```

Remove:

```http
POST /api/v1/auth/user/already-watched/remove-movie/{movieId}
```

Retrieve movie IDs:

```http
GET /api/v1/auth/user/already-watched
```

An empty watched list currently returns HTTP 204.

### Ratings

Submit or update a rating:

```http
POST /api/v1/auth/user/ratings/add-movie/{movieId}
Content-Type: application/json
```

```json
{
  "rating": 8.5
}
```

Allowed values are from `1.0` through `10.0`, with at most one decimal place.

Retrieve ratings as a map:

```http
GET /api/v1/auth/user/ratings
```

```json
{
  "1000": 8.5,
  "1001": 7.0
}
```

Retrieve ratings as records:

```http
GET /api/v1/auth/user/ratings/v2
```

```json
[
  {
    "movieId": 1000,
    "rating": 8.5
  }
]
```

### Reactions

Create or update a reaction:

```http
POST /api/v1/auth/user/likes/{movieId}
Content-Type: application/json
```

```json
{
  "reaction": "LIKE"
}
```

Allowed values are:

- `LIKE`
- `DISLIKE`
- `NEUTRAL`

Get the current reaction for one movie:

```http
GET /api/v1/auth/user/likes/{movieId}
```

Get all reactions:

```http
GET /api/v1/auth/user/likes
```

Get liked movie IDs:

```http
GET /api/v1/auth/user/likes/liked-movies
```

Delete a reaction:

```http
DELETE /api/v1/auth/user/likes/{movieId}
```

Get reaction counts:

```http
GET /api/v1/auth/user/likes/counts
```

The counts endpoint currently calculates counts directly from the user reaction table. It should eventually be replaced or aligned with the planned analytics aggregation flow.

## Recommended frontend integration flow

### Application startup

1. Load the public discovery/home page.
2. Do not require authentication for movie detail, browse, or search requests.
3. Store the JWT only after a successful login.
4. Include the JWT in the `Authorization` header for activity requests.

### Movie cards

A discovery page can call one of the discovery endpoints and render poster, title, year, plot, and IMDb rating. When the user selects a card:

1. Read the movie ID from the selected card.
2. Navigate to a route such as `/movies/{movieId}`.
3. Call `GET /api/v1/movies/{movieId}`.
4. Render the complete movie response.

The discovery response contract should include the internal movie ID before production frontend integration is considered complete.

### Movie detail page for anonymous users

Anonymous users can:

- View complete movie details
- View discovery/search results

They cannot use protected activity operations. The frontend should show a login prompt when they attempt to:

- Add to watchlist
- Mark as watched
- Rate
- Like/dislike

### Movie detail page for authenticated users

After loading the movie details:

1. Load the watchlist IDs.
2. Load the watched IDs.
3. Load the user's ratings.
4. Load the user's reactions.
5. Compare the current movie ID with those responses.
6. Render the current state of each action.

For example:

- Movie ID exists in watchlist IDs → show “Remove from watchlist”.
- Movie ID exists in watched IDs → show “Remove from watched”.
- Rating map contains the movie ID → show the current rating.
- Reaction endpoint returns `LIKE` or `DISLIKE` → show the current reaction.

Repeated watchlist/watched actions are safe at the database level because duplicate inserts are ignored. Rating and reaction writes use one row per user/movie and update the existing row.

### User library pages

The current activity endpoints return movie IDs rather than complete movie cards. The frontend can:

1. Retrieve the user's watchlist or watched IDs.
2. Request the corresponding movie details individually.
3. Render the returned movie information.

For a responsive production implementation, a future catalog `getMoviesByIds` operation or orchestration endpoint should replace one-request-per-movie loading.

## Error behavior

Validation failures generally return HTTP 400 with a structure similar to:

```json
{
  "status": 400,
  "error": "Validation Failed",
  "message": "Invalid request fields",
  "fields": {
    "rating": "Rating must be at most 10.0"
  }
}
```

Movie-not-found responses return HTTP 404. Protected endpoints without a valid JWT return HTTP 401. Invalid or expired JWTs are reported as unauthorized.

## Known limitations before the next phase

These items do not prevent an initial frontend from being built, but they should be addressed as the backend evolves:

1. Add the internal movie ID to lightweight discovery results.
2. Add pagination and server-side result limits.
3. Add a catalog operation for retrieving multiple movie IDs.
4. Validate that activity movie IDs exist in the catalog before writing.
5. Add individual watchlist/watched/rating status endpoints.
6. Add rating deletion.
7. Decide whether reactions are boolean or `LIKE`/`DISLIKE`/`NEUTRAL`, then standardize the API and database.
8. Add activity rate limiting if repeated requests become a concern.
9. Align analytics fields and add the analytics aggregation process.
10. Implement Recommendation and the master orchestration layer.

## Next backend phase

The next phase should focus on:

1. Implementing `movie_analytics` aggregation.
2. Implementing recommendation inputs and ranked recommendation results.
3. Adding the master orchestration service for homepage and personalized responses.
4. Preserving the existing boundary responsibilities while composing responses through application services.

