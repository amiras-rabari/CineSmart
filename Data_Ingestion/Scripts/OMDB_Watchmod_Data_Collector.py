import json
import pathlib
from datetime import datetime
from pathlib import Path

import logging
import OMDB_Client
import Watchmode_Client
from Config import OMDB_API_KEY, WATCHMODE_API_KEY
from Scripts.Logger_Config import setup_logger

setup_logger(__file__)

# ---------- Path configuration (modular + resilient) ----------
# This file is in: Data_Ingestion/Scripts/
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent

RESOURCE_DIR = PROJECT_ROOT / "Resource Files"
STAGING_DIR = PROJECT_ROOT / "Staging Files"

INPUT_FILE = RESOURCE_DIR / "daily_discover_movies.jsonl"
START_INDEX = 0


def build_staging_paths() -> tuple[Path, Path]:
    STAGING_DIR.mkdir(parents=True, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    omdb_out = STAGING_DIR / f"omdb_responses_{ts}.jsonl"
    watchmode_out = STAGING_DIR / f"watchmode_responses_{ts}.jsonl"
    return omdb_out, watchmode_out

# insures if a latest rub was succeeded then log in and use in validator to make sure latest run is validated
def write_latest_run_manifest(omdb_path: Path, watchmode_path: Path) -> None:
    manifest_path = STAGING_DIR / "latest_run.json"
    payload = {
        "omdb_file": str(omdb_path),
        "watchmode_file": str(watchmode_path),
        "created_at": datetime.now().isoformat(timespec="seconds"),
    }
    with manifest_path.open("w", encoding="utf-8") as mf:
        json.dump(payload, mf, indent=2)

def get_imdb_and_tmdb_ids(file_path: Path) -> tuple[list[str], list[int | None]]:
    imdb_ids: list[str] = []
    tmdb_ids: list[int | None] = []

    with file_path.open("r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            movie = json.loads(line)
            imdb_id = movie.get("imdb_id")
            tmdb_id = movie.get("id")
            if imdb_id is None:
                continue

            imdb_ids.append(imdb_id)
            tmdb_ids.append(tmdb_id)

    return imdb_ids, tmdb_ids


def main() -> None:
    omdb_out_path, watchmode_out_path = build_staging_paths()
    imdb_ids, tmdb_ids = get_imdb_and_tmdb_ids(INPUT_FILE)
    with (
        OMDB_Client.create_omdb_session(OMDB_API_KEY) as omdb_session,
        Watchmode_Client.get_watchmode_session(WATCHMODE_API_KEY) as watchmode_session,
        omdb_out_path.open("w", encoding="utf-8") as omdb_out,
        watchmode_out_path.open("w", encoding="utf-8") as watchmode_out,
    ):
        for count, (imdb_id, tmdb_id) in enumerate(
                zip(imdb_ids[START_INDEX:], tmdb_ids[START_INDEX:]),
                start=START_INDEX,
        ):
            omdb_movie = OMDB_Client.get_movie_by_imdb_id(imdb_id, omdb_session)
            if omdb_movie is None:
                continue
            omdb_movie["tmdb_id"] = tmdb_id
            watchmode_response = Watchmode_Client.get_single_source_sub(imdb_id, watchmode_session)
            if watchmode_response is None:
                continue
            watchmode_response["imdb_id"] = omdb_movie.get("imdbID")

            json.dump(omdb_movie, omdb_out)
            omdb_out.write("\n")

            json.dump(watchmode_response, watchmode_out)
            watchmode_out.write("\n")

    write_latest_run_manifest(omdb_out_path, watchmode_out_path)
    logging.info("Finished writing latest run")
    logging.info(f"OMDb staging file: {omdb_out_path}")
    logging.info(f"Watchmode staging file: {watchmode_out_path}")


if __name__ == "__main__":
    main()