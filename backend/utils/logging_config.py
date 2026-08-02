import logging
import os
from logging.handlers import RotatingFileHandler


def setup_logging(log_filename="app.log", log_level=logging.INFO, max_bytes=10_485_760, backup_count=5):
    """Centralized logging helper with standard formatting and RotatingFileHandler.

    Args:
        log_filename (str): Path to log file.
        log_level (int): Logging level (default logging.INFO).
        max_bytes (int): Maximum log file size before rotation (default 10MB).
        backup_count (int): Number of backup log files to retain (default 5).

    Returns:
        logging.Logger: Configured root logger.
    """
    logger = logging.getLogger()
    logger.setLevel(log_level)

    abs_log_path = os.path.abspath(log_filename)
    has_file_handler = any(
        isinstance(h, RotatingFileHandler) and os.path.abspath(getattr(h, "baseFilename", "")) == abs_log_path
        for h in logger.handlers
    )

    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s in %(module)s (%(pathname)s:%(lineno)d): %(message)s"
    )

    if not has_file_handler:
        logs_dir = os.path.dirname(abs_log_path)
        if logs_dir and not os.path.exists(logs_dir):
            os.makedirs(logs_dir, exist_ok=True)

        file_handler = RotatingFileHandler(
            abs_log_path, maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8"
        )
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    has_console_handler = any(
        isinstance(h, logging.StreamHandler) and not isinstance(h, logging.FileHandler)
        for h in logger.handlers
    )
    if not has_console_handler:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    return logger
