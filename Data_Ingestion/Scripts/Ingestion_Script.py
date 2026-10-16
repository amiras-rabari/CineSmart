import psycopg
from psycopg import errors
from Scripts import Data_Validator, Database_Insertion_Client
from Config import DB_HOST,DB_PORT,DB_NAME,DB_USER,DB_PASSWORD
from Logger_Config import setup_logger
import logging


setup_logger(__file__)


def main():
    # ---- Choose the mode here: "discovery" or "trending" ----
    MODE = "trending"
    # ---------------------------------------------------------

    if MODE not in ("discovery", "trending"):
        raise ValueError(f"Unknown MODE '{MODE}'. Use 'discovery' or 'trending'.")
    logging.info(f"Ingestion mode: {MODE}")

    omdb_file, watchmode_file = Data_Validator.load_latest_run_paths()

    movies, my_person_list, my_genres_list, my_languages_list,movie_role, \
        movie_langugae_relation, movie_genres_relation, movie_person_relation_data = Data_Validator.get_validated_data(omdb_file)
    availability_data = Data_Validator.get_availability_data(watchmode_file)

    db_conn = None
    try:
        # If this line works, We are successfully connected!
        db_conn = psycopg.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD)
        logging.info("DB Connection is working perfectly!")


        with db_conn.cursor() as cursor:
            Database_Insertion_Client.sync_movie_table(movies, cursor)
            Database_Insertion_Client.sync_person_table(my_person_list, cursor)
            Database_Insertion_Client.sync_genres_table(my_genres_list, cursor)
            Database_Insertion_Client.sync_language_table(my_languages_list, cursor)
            Database_Insertion_Client.sync_roles_table(movie_role, cursor)
            Database_Insertion_Client.sync_availability_data(availability_data, cursor)
            Database_Insertion_Client.sync_movie_language(movie_langugae_relation, cursor)
            Database_Insertion_Client.sync_movie_genre(movie_genres_relation, cursor)
            Database_Insertion_Client.sync_movie_person(movie_person_relation_data, cursor)

            # Trending mode only: refresh the top10 table with this run's movie IDs.
            # Discovery mode never touches it.
            if MODE == "trending":
                imdb_ids = [m[0] for m in movies]  # imdb_id is the first column of each movie row
                Database_Insertion_Client.sync_top10_table(imdb_ids, cursor)
                logging.info(f"Updated top10 table with {len(imdb_ids)} movie IDs")

            logging.info(f"Saved {len(movies)} movies to: Database")

            db_conn.commit()

    # 1. Catch specific Postgres integrity errors first (Duplicates, missing foreign keys)
    except errors.IntegrityError as e:
        db_conn.rollback()
        logging.info(f"❌ Database Integrity Error (e.g., Duplicate ID or Null constraint violation): {e}")
        # Action: Skip this movie, update it instead, or log a duplicate error

    # 2. Catch generic Postgres errors next (Syntax errors, missing tables, connection drops)
    except psycopg.Error as e:
        if db_conn:
            db_conn.rollback()
        logging.info(f"❌ General PostgreSQL Error: {e}")
        # Action: Fix your SQL syntax or check if the table exists

    # 3. Catch all other Python errors last (Typos, NoneType errors, math errors)
    except Exception as e:
        if db_conn:
            db_conn.rollback()
        logging.info(f"❌ Unexpected Python Error: {e}")
        # Action: Debug your Python code logic
    finally:
        # 2. ALWAYS close the connection when finished
        if db_conn and not db_conn.closed:
            db_conn.close()
            logging.info("DB Connection closed successfully.")


if __name__ == "__main__":
    main()