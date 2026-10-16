import logging
import pathlib

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
LOG_DIR = PROJECT_ROOT.joinpath("Logs")
MASTER_LOG_PATH = LOG_DIR.joinpath("master_app.log")
def setup_logger(file):
    """Initializes and configures the logging system."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        filename=MASTER_LOG_PATH,
        filemode="a",
        level=logging.INFO,
        format="%(asctime)s - [%(levelname)s] - %(module)s.%(funcName)s(line:%(lineno)d) - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    logging.info("=" * 60)
    logging.info(f"SCRIPT {file} RUN STARTED")
    logging.info("=" * 60)

