import os
from dotenv import load_dotenv


# super important it is because of this line python knows
# where to go and load the DB_HOST and etc keys it searches for .env file
load_dotenv()


def _required(name: str) -> str:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        raise ValueError(f"Missing required environment variable: {name}")
    return value.strip()


def _int_required(name: str) -> int:
    raw = _required(name)
    try:
        return int(raw)
    except ValueError as e:
        raise ValueError(f"Environment variable {name} must be an integer, got: {raw}") from e


# PostgreSQL
DB_HOST = _required("DB_HOST")
DB_PORT = _int_required("DB_PORT")
DB_NAME = _required("DB_NAME")
DB_USER = _required("DB_USER")
DB_PASSWORD = _required("DB_PASSWORD")

# OMDb
OMDB_API_URL = _required("OMDB_API_URL")
OMDB_API_KEY = _required("OMDB_API_KEY")

# TMDB
TMDB_API_URL = _required("TMDB_API_URL")
TMDB_SEARCH_BY_NAME_URL = _required("TMDB_SEARCH_BY_NAME_URL")
TMDB_SEARCH_BY_NAME_TMDB_ID_URL = _required("TMDB_SEARCH_BY_NAME_TMDB_ID_URL")
TMDB_API_KEY = _required("TMDB_API_KEY")
TMDB_API_TOKEN = _required("TMDB_API_TOKEN")
TMDB_DISCOVER_URL = _required("TMDB_DISCOVER_URL")

# Watchmode
WATCHMODE_API_URL_MAIN = _required("WATCHMODE_API_URL_MAIN")
WATCHMODE_API_URL_SEARCH_ID_URL = _required("WATCHMODE_API_URL_SEARCH_ID_URL")
WATCHMODE_API_KEY = _required("WATCHMODE_API_KEY")

# Application
LOG_LEVEL = _required("LOG_LEVEL")
API_TIMEOUT = _int_required("API_TIMEOUT")