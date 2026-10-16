import logging
from typing import Any
import requests
from Config import WATCHMODE_API_KEY, WATCHMODE_API_URL_SEARCH_ID_URL
from Scripts.Logger_Config import setup_logger

setup_logger(__file__)

WATCHMODE_API_SEARCH_URL = WATCHMODE_API_URL_SEARCH_ID_URL

logging.info("=" * 60)
logging.info(f"Script {__file__}")
logging.info("=" * 60)


def get_watchmode_session(api_key: str) -> requests.Session:
    """Create and return a configured Watchmode API session."""
    watchmode_session = requests.Session()
    watchmode_session.headers.update(
        {
            "X-API-Key": api_key,
            "Accept": "application/json",
        }
    )
    return watchmode_session


def _watchmode_get_json(
        session: requests.Session,
        url: str,
        params: dict[str, Any],
        context_label: str,
) -> Any | None:
    """Execute GET request and return parsed JSON, or None on failure."""
    try:
        response = session.get(url, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logging.error("request failed for %s", context_label)
        logging.error("reason %s", e)
        return None
    except ValueError as e:
        logging.error("Invalid JSON response for %s: %s", context_label, e)
        return None


def get_movie_availability_by_imdb_id(
        imdb_id: str,
        session: requests.Session,
) -> list[dict[str, Any]] | None:
    """Fetch availability rows for a movie by IMDb ID (CA region)."""
    search_url = WATCHMODE_API_SEARCH_URL.format(imdb_id=imdb_id)
    search_params = {"regions": "CA"}

    data = _watchmode_get_json(
        session=session,
        url=search_url,
        params=search_params,
        context_label=imdb_id,
    )
    if data is None:
        return None

    if not isinstance(data, list) or not data:
        logging.info("Search success but no availability data for %s", imdb_id)
        return None

    return data


def get_sources_sub(
        imdb_id: str,
        session: requests.Session,
) -> list[dict[str, Any]] | None:
    """
    Return source list by priority:
    sub -> rent -> buy -> free -> None.
    """
    api_response = get_movie_availability_by_imdb_id(imdb_id, session)
    if api_response is None:
        return None

    subscriptions: list[dict[str, Any]] = []
    rentals: list[dict[str, Any]] = []
    buy_movies: list[dict[str, Any]] = []
    free_movies: list[dict[str, Any]] = []

    for item in api_response:
        item_type = item.get("type")
        if item_type == "sub":
            subscriptions.append(item)
        elif item_type == "rent":
            rentals.append(item)
        elif item_type == "buy":
            buy_movies.append(item)
        elif item_type == "free":
            free_movies.append(item)

    return subscriptions or rentals or buy_movies or free_movies or None


def get_single_source_sub(
        imdb_id: str,
        session: requests.Session,
) -> dict[str, Any] | None:
    """
    Return one source by priority:
    first sub, else first rent, else first buy, else first free, else None.
    """
    api_response = get_movie_availability_by_imdb_id(imdb_id, session)
    if api_response is None:
        return None

    rental: dict[str, Any] | None = None
    buy: dict[str, Any] | None = None
    free: dict[str, Any] | None = None

    for item in api_response:
        source_type = item.get("type")

        if source_type == "sub":
            return item
        if source_type == "rent" and rental is None:
            rental = item
        elif source_type == "buy" and buy is None:
            buy = item
        elif source_type == "free" and free is None:
            free = item

    return rental or buy or free