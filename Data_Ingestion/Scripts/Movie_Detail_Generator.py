import argparse
import json
import logging
import random
import pathlib
from typing import Any, Callable
from Scripts import TMDB_Client

from Scripts.Logger_Config import setup_logger

setup_logger(__file__)

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
RESOURCE_DIR = PROJECT_ROOT / "Resource Files"
OUTPUT_FILE = RESOURCE_DIR / "daily_discover_movies.jsonl"  # single output file for every mode


def save_movies_jsonl(
        movies: list[dict[str, Any]],
        output_file: pathlib.Path = OUTPUT_FILE,
) -> None:
    RESOURCE_DIR.mkdir(parents=True, exist_ok=True)
    with output_file.open("w", encoding="utf-8") as f:  # overwrite each run
        for movie in movies:
            json.dump(movie, f)
            f.write("\n")


def randoom_page_generator():
    return random.randint(1, 500)


# ---------------------------------------------------------------------------
# Modes: each one fetches movies and returns the list to be saved.
# ---------------------------------------------------------------------------

def fetch_discover(session) -> list[dict[str, Any]]:
    """Random page of popular movies (original behavior)."""
    page = randoom_page_generator()
    movies = TMDB_Client._discover_page(session, page)
    for movie in movies:
        movie['imdb_id'] = TMDB_Client.get_imdb_id_by_tmdb_id(movie['id'], session)
    return movies


def fetch_trending(session) -> list[dict[str, Any]]:
    """Today's trending movies (up to 20). Titles without an IMDb ID are dropped."""
    trending = TMDB_Client.get_trending_movies(session, time_window="day", limit=None)
    kept: list[dict[str, Any]] = []
    for movie in trending:
        tmdb_id = movie.get('id')
        if tmdb_id is None:
            continue
        imdb_id = TMDB_Client.get_imdb_id_by_tmdb_id(tmdb_id, session)
        if not imdb_id:  # None or "" -> don't store
            logging.info(f"Skipping trending title without IMDb ID: "
                         f"{movie.get('title')} (tmdb_id={tmdb_id})")
            continue
        movie['imdb_id'] = imdb_id
        kept.append(movie)
    logging.info(f"Trending: kept {len(kept)}/{len(trending)} with an IMDb ID")
    return kept


# To add a new mode later, write a fetch_xxx(session) function and register it here.
MODES: dict[str, Callable[[Any], list[dict[str, Any]]]] = {
    "discover": fetch_discover,
    "trending": fetch_trending,
}
DEFAULT_MODE = "discover"  # same behavior as before when no mode is given


def run(mode: str = DEFAULT_MODE) -> None:
    if mode not in MODES:
        raise ValueError(f"Unknown mode '{mode}'. Choose from: {', '.join(MODES)}")

    logging.info(f"Running mode: {mode}")

    # IPv4 fix comes from the client: the shared patch here + the adapter inside the session.
    with TMDB_Client.ipv4_only():
        with TMDB_Client.create_tmdb_session(TMDB_Client.TOKEN) as session:
            movies = MODES[mode](session)

    if not movies:
        logging.warning(f"Mode '{mode}' produced no movies; leaving existing file untouched")
        return

    save_movies_jsonl(movies)
    logging.info(f"[{mode}] Saved {len(movies)} movies to: {OUTPUT_FILE}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch movies from TMDB into the daily JSONL file.")
    parser.add_argument(
        "--mode",
        choices=list(MODES),
        default=DEFAULT_MODE,
        help=f"What to fetch (default: {DEFAULT_MODE})",
    )
    args = parser.parse_args()
    run(args.mode)


if __name__ == "__main__":
    main()