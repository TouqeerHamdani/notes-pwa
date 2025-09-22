from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv
load_dotenv()

import logging
logging.basicConfig(level=logging.DEBUG)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required but not set")

try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    logging.debug("Database engine created successfully.")
except Exception as e:
    logging.error(f"Error creating database engine: {e}")
    raise
try:
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logging.debug("SessionLocal created successfully.")
except Exception as e:
    logging.error(f"Error creating SessionLocal: {e}")
    raise
try:
    Base = declarative_base()
    logging.debug("Base declarative class created successfully.")
except Exception as e:
    logging.error(f"Error creating Base declarative class: {e}")
    raise

if __name__ == "__main__":
    logging.info("Attempting to connect to the database to verify connection...")
    try:
        with engine.connect() as connection:
            logging.info("Database connection successful!")
    except Exception as e:
        logging.error(f"Database connection failed: {e}")