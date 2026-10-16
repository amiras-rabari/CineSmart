import logging
from typing import Any
import requests
from Config import OMDB_API_KEY, OMDB_API_URL
from Scripts.Logger_Config import setup_logger

setup_logger(__file__)

logging.info("=" * 60)
logging.info(f"Script {__file__}")
logging.info("=" * 60)

if not OMDB_API_URL:
    raise ValueError("Missing OMDB_API_URL in environment.")
if not OMDB_API_KEY:
    raise ValueError("Missing OMDB_API_KEY in environment.")


def create_omdb_session(api_key: str) -> requests.Session:
    session = requests.Session()
    session.params = {"apikey": api_key}
    session.headers.update({"Accept": "application/json"})
    return session


def _omdb_get(
        session: requests.Session,
        params: dict[str, Any],
        context_label: str,
) -> dict[str, Any] | None:
    try:
        response = session.get(
            OMDB_API_URL,
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()

        if payload.get("Response") == "True":
            return payload

        logging.info(f"request failed for {context_label} Error: Movie not found!")
        return None

    except requests.RequestException as e:
        logging.error(f"request failed for {context_label}")
        logging.error(f"reason {e}")
        return None
    except ValueError as e:
        logging.error(f"Invalid JSON response for {context_label}: {e}")
        return None


def get_movie_by_imdb_id(imdb_id: str, session: requests.Session) -> dict[str, Any] | None:
    return _omdb_get(session, {"i": imdb_id}, imdb_id)


def get_movie_by_title(movie_title: str, session: requests.Session) -> dict[str, Any] | None:
    return _omdb_get(session, {"t": movie_title, "type": "movie"}, movie_title)


def get_movie_by_title_and_year(
        movie_title: str,
        year: str,
        session: requests.Session,
) -> dict[str, Any] | None:
    return _omdb_get(session, {"t": movie_title, "y": year}, f"{movie_title} ({year})")


def search_movies_by_title(movie_title: str, session: requests.Session) -> dict[str, Any] | None:
    return _omdb_get(session, {"s": movie_title, "type": "movie"}, movie_title)


def search_movies_by_title_and_year(
        movie_title: str,
        year: str,
        session: requests.Session,
) -> dict[str, Any] | None:
    return _omdb_get(session, {"s": movie_title, "y": year, "type": "movie"}, f"{movie_title} ({year})")