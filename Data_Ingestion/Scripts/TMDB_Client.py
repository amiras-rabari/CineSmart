import socket
from contextlib import contextmanager
from typing import Any, Iterator
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from Scripts.Config import (
    TMDB_API_TOKEN,
    TMDB_API_URL,
    TMDB_SEARCH_BY_NAME_TMDB_ID_URL,
    TMDB_SEARCH_BY_NAME_URL,
    TMDB_DISCOVER_URL
)

# Uses the Config value if you add it there, otherwise falls back to the default.
try:
    from Config import TMDB_TRENDING_URL
except ImportError:
    TMDB_TRENDING_URL = "https://api.themoviedb.org/3/trending/movie/{time_window}"

import logging
from Scripts.Logger_Config import setup_logger

setup_logger(__file__)

TOKEN = TMDB_API_TOKEN
logging.info("=" * 60)
logging.info(f"Script {__file__}")
logging.info("=" * 60)


# ---------------------------------------------------------------------------
# IPv4 handling: single source of truth for every script using this client.
# ---------------------------------------------------------------------------

_original_getaddrinfo = socket.getaddrinfo


def _ipv4_only_getaddrinfo(
        host,
        port,
        family=socket.AF_UNSPEC,
        type=0,
        proto=0,
        flags=0
):
    return _original_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)


@contextmanager
def ipv4_only() -> Iterator[None]:
    """Process-wide IPv4-only DNS resolution while inside the block (restored on exit).
    This is the same patch the fetcher used to carry itself."""
    previous = socket.getaddrinfo
    socket.getaddrinfo = _ipv4_only_getaddrinfo
    try:
        yield
    finally:
        socket.getaddrinfo = previous


class IPv4Adapter(HTTPAdapter):
    """Session-scoped IPv4 preference: always active for sessions made by this client."""

    def init_poolmanager(self, *args, **kwargs):
        kwargs["source_address"] = ("0.0.0.0", 0)
        super().init_poolmanager(*args, **kwargs)


def create_tmdb_session(token: str) -> requests.Session:
    tmdb_session = requests.Session()
    tmdb_headers = {
        "Authorization": f"Bearer {token}",
        "accept": "application/json",
    }
    tmdb_session.headers.update(tmdb_headers)

    # IPv4 adapter + retries with backoff for flaky connections / rate limits.
    retry_policy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
    )
    tmdb_session.mount("https://", IPv4Adapter(max_retries=retry_policy))
    tmdb_session.mount("http://", IPv4Adapter(max_retries=retry_policy))
    return tmdb_session


def create_tmdb_session(token: str) -> requests.Session:
    tmdb_session = requests.Session()
    tmdb_headers = {
        "Authorization": f"Bearer {token}",
        "accept": "application/json",
    }
    tmdb_session.headers.update(tmdb_headers)

    # IPv4-only + retries with backoff for flaky connections / rate limits.
    retry_policy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
    )
    tmdb_session.mount("https://", IPv4Adapter(max_retries=retry_policy))
    tmdb_session.mount("http://", IPv4Adapter(max_retries=retry_policy))
    return tmdb_session


def _tmdb_get_json(
        web_session: requests.Session,
        url: str,
        params: dict[str, Any],
        context_label: str,
) -> dict[str, Any] | None:
    try:
        response = web_session.get(url, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logging.error(f"request failed for {context_label}")
        logging.error(f"reason {e}")
        return None
    except ValueError as e:
        logging.error(f"Invalid JSON response for {context_label}: {e}")
        return None


def _search_results(
        movie_title: str,
        web_session: requests.Session,
        extra_params: dict[str, Any] | None = None,
) -> list[dict[str, Any]] | None:
    search_params: dict[str, Any] = {
        "query": movie_title,
        "language": "en-US",
    }
    if extra_params:
        search_params.update(extra_params)

    search_data = _tmdb_get_json(
        web_session=web_session,
        url=TMDB_SEARCH_BY_NAME_URL,
        params=search_params,
        context_label=movie_title,
    )
    if search_data is None:
        return None

    results = search_data.get("results", [])
    if not results:
        logging.info(f"no results for {movie_title}")
        return None

    return results


def _discover_page(
        session: requests.Session,
        page: int,
) -> list[dict[str, Any]]:
    params = {
        "language": "en-US",
        "sort_by": "popularity.desc",
        "include_adult": "false",
        "include_video": "false",
        "page": page,
    }
    label = "random_titles"
    resp = _tmdb_get_json(web_session=session, url=TMDB_DISCOVER_URL, params=params, context_label=label)
    if resp is None:
        # request failed (already logged); return empty instead of crashing
        return []
    print(f"\nTotal results: {resp.get('total_results')}")
    print(f"Total pages: {resp.get('total_pages')}")
    print(f"Items on this page: {len(resp.get('results', []))}")
    return resp.get("results", [])


def get_trending_movies(
        web_session: requests.Session,
        time_window: str = "day",   # "day" or "week"
        limit: int | None = None,   # None = everything TMDB returns (20 per page)
) -> list[dict[str, Any]]:
    """Fetch trending movies from TMDB, in trending-rank order. Returns [] on failure."""
    url = TMDB_TRENDING_URL.format(time_window=time_window)
    resp = _tmdb_get_json(
        web_session=web_session,
        url=url,
        params={"language": "en-US"},
        context_label=f"trending_{time_window}",
    )
    if resp is None:
        return []

    results = resp.get("results", [])
    if limit is not None:
        results = results[:limit]
    logging.info(f"Fetched {len(results)} trending movies ({time_window})")
    return results


def get_movie_detail_with_matching_movie_name(
        movie_title: str,
        web_session: requests.Session,
) -> list | None:
    results = _search_results(
        movie_title=movie_title,
        web_session=web_session,
        extra_params={"page": 1},
    )

    if results is None:
        return None

    result_list: list[Any] = []
    for result in results:
        result_title = result.get("title")
        if result_title is None:
            continue

        # case-insensitive match
        if movie_title.casefold() in result_title.casefold():
            tmdb_id = result.get("id")
            if tmdb_id is None:
                continue
            result_list.append(result)

    return result_list


def get_tmdb_ids_by_movie_name(
        movie_title: str,
        web_session: requests.Session,
) -> list | None:
    results = _search_results(
        movie_title=movie_title,
        web_session=web_session,
        extra_params={"page": 5},
    )
    if results is None:
        return None

    result_list: list[Any] = []
    for result in results:
        tmdb_id = result.get("id")
        if tmdb_id is None:
            continue
        result_list.append(tmdb_id)

    return result_list


def get_tmdb_id_by_movie_name_and_year(
        movie_title: str,
        year: int,
        web_session: requests.Session,
) -> int | None:
    results = _search_results(
        movie_title=movie_title,
        web_session=web_session,
        extra_params={"primary_release_year": year},
    )
    if results is None:
        return None

    tmdb_id: int | None = None
    for result in results:
        result_title = result.get("title")
        if result_title is None:
            print("no title found, movie record exist")
            continue

        tmdb_id = result.get("id")
        if tmdb_id is None:
            continue

        return tmdb_id

    return tmdb_id


def movie_detail(tmdb_id: int, web_session: requests.Session) -> dict | None:
    details_url = TMDB_SEARCH_BY_NAME_TMDB_ID_URL.format(tmdb_id=tmdb_id)
    movie_details = _tmdb_get_json(
        web_session=web_session,
        url=details_url,
        params={"language": "en-US"},
        context_label=str(tmdb_id),
    )
    return movie_details


def movie_detail_search_by_name_and_year(
        movie_title: str,
        year: int,
        web_session: requests.Session,
) -> dict | None:
    tmdb_id = get_tmdb_id_by_movie_name_and_year(movie_title, year, web_session)
    if tmdb_id is None:
        return None
    return movie_detail(tmdb_id, web_session)


def get_imdb_id_by_tmdb_id(tmdb_id: int, web_session: requests.Session) -> str | None:
    details_url = TMDB_SEARCH_BY_NAME_TMDB_ID_URL.format(tmdb_id=tmdb_id)
    movie_details = _tmdb_get_json(
        web_session=web_session,
        url=details_url,
        params={"language": "en-US"},
        context_label=str(tmdb_id),
    )
    if movie_details is None:
        return None
    return movie_details.get("imdb_id")


def get_imdb_id_by_movie_name_and_year(
        movie_title: str,
        year: int,
        web_session: requests.Session,
) -> str | None:
    tmdb_id = get_tmdb_id_by_movie_name_and_year(movie_title, year, web_session)
    if tmdb_id is None:
        return None

    imdb_id = get_imdb_id_by_tmdb_id(tmdb_id, web_session)
    if imdb_id is None:
        return None

    return imdb_id


def get_movie_with_crew_by_tmdb_id(
        tmdb_id: int,
        web_session: requests.Session,
) -> dict | None:
    details_url = TMDB_SEARCH_BY_NAME_TMDB_ID_URL.format(tmdb_id=tmdb_id)
    movie_details = _tmdb_get_json(
        web_session=web_session,
        url=details_url,
        params={"language": "en-US", "append_to_response": "credits"},
        context_label=str(tmdb_id),
    )
    if movie_details is None:
        return None

    credits = movie_details.get("credits")
    if credits is None:
        return movie_details

    crew = credits.get("crew")
    if crew is None:
        return movie_details

    # Keep same behavior: inspect crew but still return full movie_details unchanged.
    director = None
    for p in crew:
        if p.get("job") == "Director":
            director = p.get("name")
            break

    return movie_details

# a more fine-grained discovery for latest title if needed ever
# (fixed: removed the invalid timeout kwarg, added context_label, handles None)
# def _discover_page_advanced(
#         session: requests.Session,
#         page: int,
#         date_from: str,
#         date_to: str,
# ) -> list[dict[str, Any]]:
#     params = {
#         "language": "en-US",
#         "sort_by": "popularity.desc",
#         "include_adult": "false",
#         "include_video": "false",
#         "primary_release_date.gte": date_from,
#         "primary_release_date.lte": date_to,
#         "vote_count.gte": 25,
#         "page": page,
#     }
#     resp = _tmdb_get_json(
#         web_session=session,
#         url=TMDB_DISCOVER_URL,
#         params=params,
#         context_label="latest_titles",
#     )
#     if resp is None:
#         return []
#     return resp.get("results", [])