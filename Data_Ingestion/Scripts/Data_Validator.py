import json
import pathlib
import re
from datetime import datetime, date
from typing import Any
from pathlib import Path
import logging

from Scripts.Logger_Config import setup_logger

setup_logger(__file__)

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent

RESOURCE_DIR = PROJECT_ROOT / "Resource Files"
STAGING_DIR = PROJECT_ROOT / "Staging Files"

LATEST_MANIFEST = STAGING_DIR / "latest_run.json"
FAIL_LOG = STAGING_DIR / "run_failures.log"

def load_latest_run_paths() -> tuple[Path, Path]:
    if not LATEST_MANIFEST.exists():
        raise FileNotFoundError(f"Manifest not found: {LATEST_MANIFEST}")

    with LATEST_MANIFEST.open("r", encoding="utf-8") as mf:
        manifest = json.load(mf)

    omdb_file = Path(manifest["omdb_file"])
    watchmode_file = Path(manifest["watchmode_file"])

    if not omdb_file.exists():
        raise FileNotFoundError(f"OMDb staging file not found: {omdb_file}")
    if not watchmode_file.exists():
        raise FileNotFoundError(f"Watchmode staging file not found: {watchmode_file}")

    return omdb_file, watchmode_file


def get_int(value: Any) -> int | None:
    """Extract digits and return int, or None if unavailable/unparseable."""
    if value in (None, "N/A", ""):
        return None
    digits = "".join(re.findall(r"\d+", str(value)))
    return int(digits) if digits else None


def get_float(value: Any) -> float | None:
    """Return float, or None if unavailable/unparseable."""
    if value in (None, "N/A", ""):
        return None
    try:
        return float(str(value))
    except (TypeError, ValueError):
        return None


def get_date(value: Any) -> date | None:
    """Parse OMDb date format like '21 Apr 2023', else None."""
    if value in (None, "N/A", ""):
        return None
    try:
        return datetime.strptime(str(value), "%d %b %Y").date()
    except ValueError:
        return None


def get_text(value: Any) -> str | None:
    """Return stripped string or None for missing/N/A."""
    if value in (None, "N/A"):
        return None
    text = str(value).strip()
    return text if text else None


def split_csv(value: Any) -> list[str]:
    """Split comma-separated values into cleaned list; empty if missing."""
    text = get_text(value)
    if text is None:
        return []
    return [x.strip() for x in text.split(",") if x.strip()]


def get_primary_language(value: Any) -> str:
    """
    Language is special:
    return literal string 'None' when missing/N/A/empty.
    """
    text = get_text(value)
    if text is None:
        return "None"
    primary = text.split(",")[0].strip()
    return primary if primary else "None"


def get_rotten_tomatoes(ratings: Any) -> int | None:
    """Extract Rotten Tomatoes score as int, else None."""
    if not isinstance(ratings, list):
        return None
    for item in ratings:
        if isinstance(item, dict) and item.get("Source") == "Rotten Tomatoes":
            return get_int(item.get("Value"))
    return None


def build_movie_row(response: dict[str, Any], rotten_tomatoes: int | None) -> list[Any]:
    return [
        response.get("imdbID"),
        response.get("tmdb_id"),
        get_text(response.get("Title")),
        get_int(response.get("Year")),
        get_date(response.get("Released")),
        get_int(response.get("Runtime")),
        get_text(response.get("Plot")),
        get_text(response.get("Poster")),
        get_text(response.get("Type")),
        get_text(response.get("Production")),
        rotten_tomatoes,
        get_int(response.get("Metascore")),
        get_float(response.get("imdbRating")),
        get_int(response.get("imdbVotes")),
        get_int(response.get("BoxOffice")),
    ]


def append_person_relations(
        imdb_id: Any,
        names: list[str],
        role: str,
        out: list[dict[str, Any]],
) -> None:
    for person in names:
        out.append(
            {
                "imdb_id": imdb_id,
                "person_name": person,
                "role": role,
            }
        )


def get_validated_data(omdb_input_file: Path) -> tuple[
    list[list[Any]],
    list[str],
    list[str],
    list[str],
    list[str],
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    person_table_data: list[str] = []
    movies: list[list[Any]] = []
    languages: list[str] = []
    genres_table: list[str] = []
    movie_language_relation: list[dict[str, Any]] = []
    movie_genres_relation: list[dict[str, Any]] = []
    movie_person_relation_data: list[dict[str, Any]] = []

    with omdb_input_file.open("r", encoding="utf-8") as f:

        for line in f:

            if not line.strip():
                continue
            response = json.loads(line)
            if not isinstance(response, dict):
                continue

            imdb_id = response.get("imdbID")
            rotten_tomatoes = get_rotten_tomatoes(response.get("Ratings"))
            movies.append(build_movie_row(response, rotten_tomatoes))

            primary_language = get_primary_language(response.get("Language"))
            languages.append(primary_language)
            movie_language_relation.append(
                {"imdb_id": imdb_id, "language": primary_language}
            )

            directors = split_csv(response.get("Director"))
            writers = split_csv(response.get("Writer"))
            actors = split_csv(response.get("Actors"))
            genres = split_csv(response.get("Genre"))

            person_table_data.extend(directors)
            person_table_data.extend(writers)
            person_table_data.extend(actors)
            genres_table.extend(genres)

            movie_genres_relation.append({"imdb_id": imdb_id, "genres": genres})

            append_person_relations(imdb_id, directors, "Director", movie_person_relation_data)
            append_person_relations(imdb_id, writers, "Writer", movie_person_relation_data)
            append_person_relations(imdb_id, actors, "Actor", movie_person_relation_data)

    my_languages_list = list(dict.fromkeys(languages))
    my_genres_list = list(dict.fromkeys(genres_table))
    my_person_list = list(dict.fromkeys(person_table_data))
    movie_role = ["Actor", "Director", "Writer"]
    logging.info(f"OMDB Data Validation successful")
    return (
        movies,
        my_person_list,
        my_genres_list,
        my_languages_list,
        movie_role,
        movie_language_relation,
        movie_genres_relation,
        movie_person_relation_data,
    )


def get_availability_data(watchmode_input_file: Path) -> list[tuple[Any, Any, Any, Any]]:
    availability_data: list[tuple[Any, Any, Any, Any]] = []
    with watchmode_input_file.open("r", encoding="utf-8") as f2:
        for line in f2:
            if not line.strip():
                continue
            response2 = json.loads(line)
            if not isinstance(response2, dict):
                continue

            result_tp = (
                response2.get("name"),
                response2.get("type"),
                response2.get("web_url"),
                response2.get("imdb_id"),
            )
            availability_data.append(result_tp)
    logging.info(f"Watchmode Data Validation successful")
    return availability_data


# def main() -> None:
#     omdb_file, watchmode_file = load_latest_run_paths()
#     movies_data = get_validated_data(omdb_file)
#     availability_data = get_availability_data(watchmode_file)
