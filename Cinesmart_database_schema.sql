-- ============================================================
-- CINESMART DATABASE SCHEMA
-- PostgreSQL
-- ============================================================
-- Fresh install = run this file. V001-V018 (and Movie_Analytics_Trigger.sql)
-- in Database/Migration are history and don't rebuild the DB.
--
-- This file is the real schema (captured 2026-10-12) + V019, V020, V021, V022.
-- Update it with every new migration. Database/Schema.sql is an exact mirror.
--
-- PRIMARY KEY and UNIQUE constraints create indexes in PostgreSQL.
-- pg_trgm provides trigram-based matching for fuzzy text searches.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 1. MOVIE
-- ============================================================

CREATE TABLE movie (
    movie_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    imdb_id         VARCHAR(20) UNIQUE,
    tmdb_id         INT UNIQUE,
    title           VARCHAR(500) NOT NULL,
    year            SMALLINT,
    released        DATE,
    runtime         SMALLINT,
    plot            TEXT,
    poster          TEXT,
    content_type    VARCHAR(50),
    studio          VARCHAR(255),
    rotten_tomatoes SMALLINT,
    metascore       SMALLINT,
    imdb_rating     NUMERIC(3, 1),
    imdb_votes      BIGINT,
    box_office      NUMERIC(15, 2),

    CONSTRAINT chk_movie_year
        CHECK (year IS NULL OR year >= 1888),

    CONSTRAINT chk_movie_runtime
        CHECK (runtime IS NULL OR runtime > 0),

    CONSTRAINT chk_rotten_tomatoes
        CHECK (rotten_tomatoes IS NULL OR rotten_tomatoes BETWEEN 0 AND 100),

    CONSTRAINT chk_metascore
        CHECK (metascore IS NULL OR metascore BETWEEN 0 AND 100),

    CONSTRAINT chk_imdb_rating
        CHECK (imdb_rating IS NULL OR imdb_rating BETWEEN 0 AND 10),

    CONSTRAINT chk_imdb_votes
        CHECK (imdb_votes IS NULL OR imdb_votes >= 0),

    CONSTRAINT chk_box_office
        CHECK (box_office IS NULL OR box_office >= 0)
);

-- GIN trigram index for case-insensitive fuzzy title searches.
CREATE INDEX idx_movie_title_trgm
    ON movie USING gin (LOWER(title) gin_trgm_ops);

CREATE INDEX idx_movie_year
    ON movie (year);

-- ============================================================
-- 2. PERSON
-- ============================================================

CREATE TABLE person (
    person_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name      VARCHAR(255) NOT NULL,

    CONSTRAINT uq_person_name
        UNIQUE (name)
);

-- Exists in the real DB (overlaps uq_person_name); kept so this file matches it.
CREATE INDEX idx_person_name
    ON person (name);

CREATE INDEX idx_person_name_trgm
    ON person USING gin (LOWER(name) gin_trgm_ops);

-- ============================================================
-- 3. ROLE
-- ============================================================
-- Rows today: Actor, Director, Writer.

CREATE TABLE movie_role (
    role_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE
);

-- ============================================================
-- 4. MOVIE_PERSON
-- ============================================================
-- No billing order column: all Actor links count as the cast.

CREATE TABLE movie_person (
    movie_id  BIGINT NOT NULL,
    person_id BIGINT NOT NULL,
    role_id   BIGINT NOT NULL,

    PRIMARY KEY (movie_id, person_id, role_id),

    CONSTRAINT fk_movie_person_movie
        FOREIGN KEY (movie_id)
            REFERENCES movie (movie_id)
            ON DELETE CASCADE,

    CONSTRAINT fk_movie_person_person
        FOREIGN KEY (person_id)
            REFERENCES person (person_id)
            ON DELETE CASCADE,

    CONSTRAINT fk_movie_person_role
        FOREIGN KEY (role_id)
            REFERENCES movie_role (role_id)
            ON DELETE RESTRICT
);

-- Supports lookups for all movies associated with a person.
CREATE INDEX idx_movie_person_person
    ON movie_person (person_id);

-- ============================================================
-- 5. GENRE
-- ============================================================

CREATE TABLE genre (
    genre_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    genre_name VARCHAR(100) NOT NULL,

    CONSTRAINT unique_genre_name
        UNIQUE (genre_name)
);

CREATE INDEX idx_genre_name_lower
    ON genre (LOWER(genre_name));

-- ============================================================
-- 6. MOVIE_GENRE
-- ============================================================

CREATE TABLE movie_genre (
    movie_id BIGINT NOT NULL,
    genre_id BIGINT NOT NULL,

    PRIMARY KEY (movie_id, genre_id),

    CONSTRAINT fk_movie_genre_movie
        FOREIGN KEY (movie_id)
            REFERENCES movie (movie_id)
            ON DELETE CASCADE,

    CONSTRAINT fk_movie_genre_genre
        FOREIGN KEY (genre_id)
            REFERENCES genre (genre_id)
            ON DELETE RESTRICT
);

-- Supports lookups from a genre to its associated movies.
CREATE INDEX idx_movie_genre_genre
    ON movie_genre (genre_id);

-- ============================================================
-- 7. LANGUAGE
-- ============================================================

CREATE TABLE language (
    language_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    language_name VARCHAR(100) NOT NULL,

    CONSTRAINT unique_language_name
        UNIQUE (language_name)
);

CREATE INDEX idx_language_name_lower
    ON language (LOWER(language_name));

-- ============================================================
-- 8. MOVIE_LANGUAGE
-- ============================================================

CREATE TABLE movie_language (
    movie_id    BIGINT NOT NULL,
    language_id BIGINT NOT NULL,

    PRIMARY KEY (movie_id, language_id),

    CONSTRAINT fk_movie_language_movie
        FOREIGN KEY (movie_id)
            REFERENCES movie (movie_id)
            ON DELETE CASCADE,

    CONSTRAINT fk_movie_language_language
        FOREIGN KEY (language_id)
            REFERENCES language (language_id)
            ON DELETE RESTRICT
);

CREATE INDEX idx_movie_language_language
    ON movie_language (language_id);

-- ============================================================
-- 9. APP_USER
-- ============================================================
-- Email is stored lowercased + trimmed; username keeps its display case.
-- Both are unique case-insensitively (V021).

CREATE TABLE app_user (
    user_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    email         VARCHAR(320) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_app_user_username_lower
    ON app_user (LOWER(username));

CREATE UNIQUE INDEX uq_app_user_email_lower
    ON app_user (LOWER(email));

-- ============================================================
-- 10. WATCHLIST
-- ============================================================

CREATE TABLE watchlist (
    user_id  BIGINT NOT NULL,
    movie_id BIGINT NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, movie_id),

    CONSTRAINT fk_watchlist_user
        FOREIGN KEY (user_id)
            REFERENCES app_user (user_id)
            ON DELETE CASCADE,

    CONSTRAINT fk_watchlist_movie
        FOREIGN KEY (movie_id)
            REFERENCES movie (movie_id)
            ON DELETE CASCADE
);

-- ============================================================
-- 11. ALREADY_WATCHED
-- ============================================================

CREATE TABLE already_watched (
    user_id    BIGINT NOT NULL,
    movie_id   BIGINT NOT NULL,
    watched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, movie_id),

    CONSTRAINT fk_already_watched_user
        FOREIGN KEY (user_id)
            REFERENCES app_user (user_id)
            ON DELETE CASCADE,

    CONSTRAINT fk_already_watched_movie
        FOREIGN KEY (movie_id)
            REFERENCES movie (movie_id)
            ON DELETE CASCADE
);

-- ============================================================
-- 12. USER_RATING
-- ============================================================
-- rated_at is set again on every rating change.

CREATE TABLE user_rating (
    user_id  BIGINT NOT NULL,
    movie_id BIGINT NOT NULL,
    rating   NUMERIC(3, 1) NOT NULL,
    rated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, movie_id),

    CONSTRAINT fk_user_rating_user
        FOREIGN KEY (user_id)
            REFERENCES app_user (user_id)
            ON DELETE CASCADE,

    CONSTRAINT fk_user_rating_movie
        FOREIGN KEY (movie_id)
            REFERENCES movie (movie_id)
            ON DELETE CASCADE,

    CONSTRAINT chk_user_rating
        CHECK (rating BETWEEN 0 AND 10)
);

-- ============================================================
-- 13. USER_REACTION
-- ============================================================
-- LIKE, DISLIKE or NEUTRAL. No row reads as NEUTRAL.
-- reacted_at is set again on every change (V020).

CREATE TABLE user_reaction (
    user_id    BIGINT NOT NULL,
    movie_id   BIGINT NOT NULL,
    reaction   VARCHAR(10) NOT NULL,
    reacted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (user_id, movie_id),

    CONSTRAINT chk_user_reaction
        CHECK (reaction IN ('LIKE', 'DISLIKE', 'NEUTRAL')),

    CONSTRAINT fk_user_reaction_user
        FOREIGN KEY (user_id)
            REFERENCES app_user (user_id)
            ON DELETE CASCADE,

    CONSTRAINT fk_user_reaction_movie
        FOREIGN KEY (movie_id)
            REFERENCES movie (movie_id)
            ON DELETE CASCADE
);

-- ============================================================
-- 14. AVAILABILITY
-- ============================================================
-- A movie can be available on multiple platforms.
-- (movie_id, platform) uniquely identifies an availability record.

CREATE TABLE availability (
    movie_id          BIGINT NOT NULL,
    platform          VARCHAR(100) NOT NULL,
    availability_type VARCHAR(10),
    platform_url      TEXT,

    PRIMARY KEY (movie_id, platform),

    CONSTRAINT fk_availability_movie
        FOREIGN KEY (movie_id)
            REFERENCES movie (movie_id)
            ON DELETE CASCADE,

    CONSTRAINT chk_availability_type
        CHECK (availability_type IS NULL OR availability_type IN ('sub', 'rent', 'buy', 'free'))
);

-- ============================================================
-- 15. MOVIE_ANALYTICS
-- ============================================================
-- Derived data only, written by the backend's analytics batch job (V019).
-- Every movie gets a row from the job's upsert; there is no insert trigger.

CREATE TABLE movie_analytics (
    movie_id        BIGINT PRIMARY KEY,
    rating_count    INT NOT NULL DEFAULT 0,
    average_rating  NUMERIC(4, 2),
    weighted_rating NUMERIC(4, 2),
    like_count      INT NOT NULL DEFAULT 0,
    dislike_count   INT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_movie_analytics_movie
        FOREIGN KEY (movie_id)
            REFERENCES movie (movie_id)
            ON DELETE CASCADE,

    CONSTRAINT chk_analytics_average_rating
        CHECK (average_rating IS NULL OR average_rating BETWEEN 0 AND 10),

    CONSTRAINT chk_analytics_weighted_rating
        CHECK (weighted_rating IS NULL OR weighted_rating BETWEEN 0 AND 10),

    CONSTRAINT chk_analytics_counts
        CHECK (rating_count >= 0 AND like_count >= 0 AND dislike_count >= 0)
);

-- ============================================================
-- 16. TOP10 (trending)
-- ============================================================
-- Synced by the ETL (DELETE + INSERT). movie_id is INT here, as in the real DB.

CREATE TABLE top10 (
    movie_id INT PRIMARY KEY REFERENCES movie (movie_id) ON DELETE CASCADE
);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
