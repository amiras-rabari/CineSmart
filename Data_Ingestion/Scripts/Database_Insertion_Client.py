import logging

from psycopg import Cursor

logging.info("=" * 60)
logging.info(f"Script {__file__}")
logging.info("=" * 60)



def sync_movie_table(movies: list[list], cursor: Cursor):
    cursor.executemany(
        """
        INSERT INTO movie (
            imdb_id,
            tmdb_id,
            title,
            year,
            released,
            runtime,
            plot,
            poster,
            content_type,
            studio,
            rotten_tomatoes,
            metascore,
            imdb_rating,
            imdb_votes,
            box_office
        )
        VALUES (
                   %s, %s, %s, %s, %s,
                   %s, %s, %s, %s, %s,
                   %s, %s, %s, %s, %s
               )
            ON CONFLICT (imdb_id) DO NOTHING
        """,
        movies
    )

def sync_top10_table(imdb_ids: list[str], cursor: Cursor):
    """Replaces the top10 table contents with today's trending movies (movie IDs only).
    Must run after sync_movie_table so the movies exist."""
    if not imdb_ids:
        logging.warning("No IMDb IDs given; leaving top10 table untouched")
        return

    cursor.execute("DELETE FROM top10")
    cursor.executemany(
        """
        INSERT INTO top10 (movie_id)
        SELECT m.movie_id
        FROM movie m
        WHERE m.imdb_id = %s
            ON CONFLICT (movie_id) DO NOTHING
        """,
        [(i,) for i in imdb_ids]
    )

def sync_person_table(persons: list, cursor: Cursor):
    cursor.executemany(
        """
        INSERT INTO person (name)
        VALUES (%s)
            ON CONFLICT (name) DO NOTHING
        """,
        [(p,) for p in persons]
    )


def sync_language_table(languages: list, cursor: Cursor):
    cursor.executemany(
        """
        INSERT INTO language (language_name)
        VALUES (%s)
            ON CONFLICT (language_name) DO NOTHING
        """,
        [(l,) for l in languages]
    )


def sync_roles_table(roles: list, cursor: Cursor):
    cursor.executemany(
        """
        INSERT INTO movie_role (role_name)
        VALUES (%s)
            ON CONFLICT (role_name) DO NOTHING
        """,
        [(r,) for r in roles]
    )


def sync_genres_table(genres: list, cursor: Cursor):
    cursor.executemany(
        """
        INSERT INTO genre (genre_name)
        VALUES (%s)
            ON CONFLICT (genre_name) DO NOTHING
        """,
        [(g,) for g in genres]
    )

def sync_movie_language(movie_langugae_relation: list[dict], cursor: Cursor):
    query = """
            INSERT INTO movie_language (movie_id, language_id)
            SELECT m.movie_id, l.language_id
            FROM movie m
            JOIN public.language l ON l.language_name = %s
            WHERE m.imdb_id = %s
            ON CONFLICT (movie_id, language_id) DO NOTHING
            """
    query_data = [(item['language'],item['imdb_id'])for item in movie_langugae_relation]
    cursor.executemany(query, query_data)

def sync_movie_genre(movie_genres_relation: list[dict], cursor: Cursor):
    query = """
            INSERT INTO movie_genre (movie_id, genre_id)
            SELECT m.movie_id, g.genre_id
            FROM movie m
                     JOIN public.genre g ON g.genre_name = %s
            WHERE m.imdb_id = %s
            ON CONFLICT (movie_id, genre_id) DO NOTHING
            """
    query_data = [(j,i['imdb_id'])  for i in movie_genres_relation
                  for g in [i['genres']]
                  for j in g]

    cursor.executemany(query, query_data)

def sync_movie_person(movie_person_relation: list[dict], cursor: Cursor):
    query = """
            INSERT INTO movie_person (movie_id, person_id,role_id)
            SELECT m.movie_id, p.person_id,r.role_id
            FROM movie m
                     JOIN public.person p ON p.name = %s
                     JOIN public.movie_role r ON r.role_name = %s
            WHERE m.imdb_id = %s
            ON CONFLICT (movie_id, person_id, role_id) DO NOTHING
            """
    query_data = [(item['person_name'],item['role'],item['imdb_id'])for item in movie_person_relation]
    cursor.executemany(query, query_data)

def sync_availability_data(availability_data: list[tuple], cursor: Cursor):
    query = """
            INSERT INTO availability
                (movie_id, platform, availability_type, platform_url)
            SELECT
                m.movie_id,
                %s,
                %s,
                %s
            FROM movie AS m
            WHERE m.imdb_id = %s
                ON CONFLICT (movie_id, platform) DO UPDATE
                SET
                    availability_type = EXCLUDED.availability_type,
                    platform_url = EXCLUDED.platform_url 
            """

    query_data = availability_data
    cursor.executemany(query, query_data)


def view_database(cursor: Cursor):

    print("\n--- MOVIES ---")

    cursor.execute("SELECT * FROM movie")

    for row in cursor.fetchall():
        print(row)

    print("\n--- GENRES ---")

    cursor.execute("SELECT * FROM genre")

    for row in cursor.fetchall():
        print(row)

    print("\n--- LANGUAGES ---")

    cursor.execute("SELECT * FROM language")

    for row in cursor.fetchall():
        print(row)

    print("\n--- PERSONS ---")

    cursor.execute("SELECT * FROM person")

    for row in cursor.fetchall():
        print(row)

    print("\n--- MOVIE ROLES ---")

    cursor.execute("SELECT * FROM movie_role")

    for row in cursor.fetchall():
        print(row)

# ========== SAME AS ABOVE BUT SIMPLER ABOVE IS MORE EFFICIENT BACTH PROCESSING ==========
# def sync_movie_table(movies:list[list],cursor:Cursor):
#     for m in movies:
#         cursor.execute("""INSERT INTO movie (
#             imdb_id,
#             tmdb_id,
#             title,
#             year,
#             released,
#             runtime,
#             plot,
#             poster,
#             content_type,
#             studio,
#             rotten_tomatoes,
#             metascore,
#             imdb_rating,
#             imdb_votes,
#             box_office)
#                           VALUES (
#                                      %s, %s, %s, %s, %s,
#                                      %s, %s, %s, %s, %s,
#                                      %s, %s, %s, %s, %s
#                                  )
#                                     ON CONFLICT (imdb_id) DO NOTHING""",m)
#
# def sync_person_table(persons:list,cursor:Cursor):
#     for p in persons:
#         """multiple actors have exact same name so allowed here handled at data
#         scarping level as main concern is matching even sam name with different movie"""
#         cursor.execute("""INSERT INTO person (name)
#                           VALUES (%s)""",(p,))
#
# def sync_language_table(languages: list, cursor: Cursor):
#     """Inserts unique languages, safely ignoring existing ones."""
#     for l in languages:
#         cursor.execute("""
#                        INSERT INTO language (language_name) VALUES (%s)
#                            ON CONFLICT (language_name) DO NOTHING
#                        """, (l,))
#
#
# def sync_roles_table(roles: list, cursor: Cursor):
#     """Inserts unique roles, safely ignoring existing ones."""
#     for r in roles:
#         cursor.execute("""
#                        INSERT INTO movie_role (role_name) VALUES (%s)
#                            ON CONFLICT (role_name) DO NOTHING
#                        """, (r,))
#
#
# def sync_genres_table(genres: list, cursor: Cursor):
#     """Inserts unique genres, safely ignoring existing ones."""
#     for g in genres:
#         cursor.execute("""
#                        INSERT INTO genre (genre_name) VALUES (%s)
#                            ON CONFLICT (genre_name) DO NOTHING
#                        """, (g,))

