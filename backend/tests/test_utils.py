import os
import logging
from backend.utils.logging_config import setup_logging


def test_setup_logging(tmp_path):
    """Test setup_logging helper creates log file and configures RotatingFileHandler."""
    log_file = tmp_path / "test.log"
    logger = setup_logging(log_filename=str(log_file), log_level=logging.DEBUG)
    assert logger is not None
    logger.info("Test log entry")

    assert os.path.exists(log_file)
    with open(log_file, "r", encoding="utf-8") as f:
        content = f.read()
    assert "Test log entry" in content
