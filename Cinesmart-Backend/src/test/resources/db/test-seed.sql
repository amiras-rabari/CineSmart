-- ============================================================
-- CineSmart TEST SUITE seed data
-- ============================================================
-- Loaded only into the throwaway Testcontainers PostgreSQL database, right after
-- Database/Schema.sql. It never touches a real database.
--
-- IDs are fixed (OVERRIDING SYSTEM VALUE) so tests can assert exact results.
-- Users and activity are NOT seeded: each test creates its own and they are
-- truncated after every test.
--
-- Data notes the tests rely on:
--   * Horror (genre 7) and German (language 5) are linked to no movie.
--   * Movie 15 has too few IMDb votes for the IMDb Top 250; movie 16 has no IMDb rating.
--   * Movie 19 has no genres, languages or people (similar titles = empty list).
--   * Movie 4 has a Producer, so its otherCrew is not empty.
--   * top10 (trending) = 1, 4, 10, 12, 20.
-- ============================================================

INSERT INTO movie_role (role_id, role_name) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Actor'),
    (2, 'Director'),
    (3, 'Writer'),
    (4, 'Producer');

INSERT INTO genre (genre_id, genre_name) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Action'),
    (2, 'Sci-Fi'),
    (3, 'Drama'),
    (4, 'Comedy'),
    (5, 'Crime'),
    (6, 'Romance'),
    (7, 'Horror'),
    (8, 'Animation');

INSERT INTO language (language_id, language_name) OVERRIDING SYSTEM VALUE VALUES
    (1, 'English'),
    (2, 'French'),
    (3, 'Japanese'),
    (4, 'Korean'),
    (5, 'German');

INSERT INTO movie (movie_id, imdb_id, title, year, released, runtime, plot, poster, content_type, studio,
                   rotten_tomatoes, metascore, imdb_rating, imdb_votes) OVERRIDING SYSTEM VALUE VALUES
    (1,  'tt0133093', 'The Matrix',               1999, '1999-03-31', 136, 'A hacker learns the truth about reality.', 'https://img.test/1.jpg',  'movie', 'Warner Bros.', 83, 73, 8.7, 2000000),
    (2,  'tt0234215', 'The Matrix Reloaded',      2003, '2003-05-15', 138, 'Neo fights on.',                          'https://img.test/2.jpg',  'movie', 'Warner Bros.', 74, 62, 7.2,  600000),
    (3,  'tt2911666', 'John Wick',                2014, '2014-10-24', 101, 'A retired hitman returns.',               'https://img.test/3.jpg',  'movie', 'Lionsgate',    86, 68, 7.4,  700000),
    (4,  'tt1375666', 'Inception',                2010, '2010-07-16', 148, 'Dreams within dreams.',                   'https://img.test/4.jpg',  'movie', 'Warner Bros.', 87, 74, 8.8, 2500000),
    (5,  'tt0816692', 'Interstellar',             2014, '2014-11-07', 169, 'Explorers travel through a wormhole.',    'https://img.test/5.jpg',  'movie', 'Paramount',    73, 74, 8.7, 1900000),
    (6,  'tt0468569', 'The Dark Knight',          2008, '2008-07-18', 152, 'Batman faces the Joker.',                 'https://img.test/6.jpg',  'movie', 'Warner Bros.', 94, 84, 9.0, 2800000),
    (7,  'tt0120338', 'Titanic',                  1997, '1997-12-19', 194, 'A romance aboard a doomed ship.',         'https://img.test/7.jpg',  'movie', 'Paramount',    88, 75, 7.9, 1300000),
    (8,  'tt0211915', 'Amelie',                   2001, '2001-04-25', 122, 'A shy waitress helps others.',            'https://img.test/8.jpg',  'movie', 'UGC',          89, 69, 8.3,  780000),
    (9,  'tt0245429', 'Spirited Away',            2001, '2001-07-20', 125, 'A girl enters a spirit world.',           'https://img.test/9.jpg',  'movie', 'Ghibli',       96, 96, 8.6,  900000),
    (10, 'tt6751668', 'Parasite',                 2019, '2019-05-30', 132, 'A poor family schemes.',                  'https://img.test/10.jpg', 'movie', 'CJ',           99, 96, 8.5,  950000),
    (11, 'tt0111161', 'The Shawshank Redemption', 1994, '1994-10-14', 142, 'Two imprisoned men bond.',                'https://img.test/11.jpg', 'movie', 'Columbia',     91, 82, 9.3, 2900000),
    (12, 'tt0829482', 'Superbad',                 2007, '2007-08-17', 113, 'Two teens plan a party.',                 'https://img.test/12.jpg', 'movie', 'Columbia',     88, 76, 7.6,  600001),
    (13, 'tt0332280', 'The Notebook',             2004, '2004-06-25', 123, 'A love story, remembered.',               'https://img.test/13.jpg', 'movie', 'New Line',     53, 53, 7.8,  610000),
    (14, 'tt3783958', 'La La Land',               2016, '2016-12-09', 128, 'A jazz pianist and an actress.',          'https://img.test/14.jpg', 'movie', 'Lionsgate',    91, 94, 8.0,  650000),
    (15, 'tt9000015', 'Small Indie Film',         2020, '2020-03-01',  90, 'Barely anyone has seen it.',              NULL,                      'movie', NULL,           NULL, NULL, 8.9,  1200),
    (16, 'tt9000016', 'Unrated Mystery',          2021, NULL,          95, 'No ratings anywhere yet.',                NULL,                      'movie', NULL,           NULL, NULL, NULL, NULL),
    (17, 'tt0364569', 'Oldboy',                   2003, '2003-11-21', 120, 'A man is imprisoned for 15 years.',       'https://img.test/17.jpg', 'movie', 'Show East',    82, 77, 8.4,  620000),
    (18, 'tt0114709', 'Toy Story',                1995, '1995-11-22',  81, 'Toys come to life.',                      'https://img.test/18.jpg', 'movie', 'Pixar',        100, 96, 8.3, 1100000),
    (19, 'tt9000019', 'Orphan Movie',             2022, '2022-01-01', 100, 'No genres, languages or people.',         NULL,                      'movie', NULL,           NULL, NULL, 6.0,   30000),
    (20, 'tt10838180','The Matrix Resurrections', 2021, '2021-12-22', 148, 'Neo returns once more.',                  'https://img.test/20.jpg', 'movie', 'Warner Bros.', 63, 63, 5.7,  300000);

INSERT INTO movie_genre (movie_id, genre_id) VALUES
    (1, 1), (1, 2),
    (2, 1), (2, 2),
    (3, 1), (3, 5),
    (4, 1), (4, 2),
    (5, 2), (5, 3),
    (6, 1), (6, 5), (6, 3),
    (7, 3), (7, 6),
    (8, 4), (8, 6),
    (9, 8),
    (10, 3), (10, 5),
    (11, 3),
    (12, 4),
    (13, 3), (13, 6),
    (14, 4), (14, 3), (14, 6),
    (15, 3),
    (16, 3),
    (17, 1), (17, 3),
    (18, 8), (18, 4),
    (20, 1), (20, 2);

INSERT INTO movie_language (movie_id, language_id) VALUES
    (1, 1), (2, 1), (3, 1), (4, 1), (4, 3), (5, 1), (6, 1), (7, 1),
    (8, 2), (9, 3), (10, 4), (11, 1), (12, 1), (13, 1), (14, 1), (15, 1),
    (16, 2), (17, 4), (18, 1), (20, 1);

INSERT INTO person (person_id, name) OVERRIDING SYSTEM VALUE VALUES
    (1,  'Lana Wachowski'),
    (2,  'Keanu Reeves'),
    (3,  'Carrie-Anne Moss'),
    (4,  'Chad Stahelski'),
    (5,  'Christopher Nolan'),
    (6,  'Leonardo DiCaprio'),
    (7,  'Matthew McConaughey'),
    (8,  'Christian Bale'),
    (9,  'James Cameron'),
    (10, 'Jean-Pierre Jeunet'),
    (11, 'Audrey Tautou'),
    (12, 'Hayao Miyazaki'),
    (13, 'Bong Joon Ho'),
    (14, 'Song Kang-ho'),
    (15, 'Frank Darabont'),
    (16, 'Tim Robbins'),
    (17, 'Greg Mottola'),
    (18, 'Jonah Hill'),
    (19, 'Nick Cassavetes'),
    (20, 'Ryan Gosling'),
    (21, 'Damien Chazelle'),
    (22, 'Jane Indie'),
    (23, 'Park Chan-wook'),
    (24, 'Emma Thomas'),
    (25, 'John Lasseter'),
    (26, 'Tom Hanks');

-- (movie, person, role) with role 1 Actor, 2 Director, 3 Writer, 4 Producer
INSERT INTO movie_person (movie_id, person_id, role_id) VALUES
    (1, 1, 2), (1, 1, 3), (1, 2, 1), (1, 3, 1),
    (2, 1, 2), (2, 2, 1), (2, 3, 1),
    (3, 4, 2), (3, 2, 1),
    (4, 5, 2), (4, 5, 3), (4, 6, 1), (4, 24, 4),
    (5, 5, 2), (5, 7, 1),
    (6, 5, 2), (6, 8, 1),
    (7, 9, 2), (7, 6, 1),
    (8, 10, 2), (8, 11, 1),
    (9, 12, 2),
    (10, 13, 2), (10, 14, 1),
    (11, 15, 2), (11, 16, 1),
    (12, 17, 2), (12, 18, 1),
    (13, 19, 2), (13, 20, 1),
    (14, 21, 2), (14, 20, 1),
    (15, 22, 2),
    (17, 23, 2),
    (18, 25, 2), (18, 26, 1),
    (20, 1, 2), (20, 2, 1);

INSERT INTO availability (movie_id, platform, availability_type, platform_url) VALUES
    (1, 'Netflix', 'sub',  'https://netflix.test/matrix'),
    (1, 'Apple TV', 'rent', 'https://apple.test/matrix'),
    (4, 'Max', 'sub', 'https://max.test/inception');

INSERT INTO top10 (movie_id) VALUES (1), (4), (10), (12), (20);
