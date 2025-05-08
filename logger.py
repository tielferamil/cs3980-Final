import logging

logging.basicConfig(
    filename="app.log",
    format="%(asctime)s: %(name)s: %(levelname).4s - %(message)s",
    level=logging.INFO,
)

logger = logging.getLogger(__name__)
logger.info("info message")