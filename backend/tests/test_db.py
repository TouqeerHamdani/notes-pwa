import pytest
from sqlalchemy import text
from backend.db import engine, SessionLocal, Base, get_db
import logging

def test_database_connection():
    """
    Tests the database connection by trying to connect and execute a simple query.
    """
    try:
        with engine.connect() as connection:
            # The connection is successful if no exception is raised
            # Optional: Execute a simple query to be more thorough
            result = connection.execute(text("SELECT 1"))
            assert result.scalar() == 1
    except Exception as e:
        pytest.fail(f"Database connection failed: {e}")

def test_session_creation():
    """
    Tests if a new session can be created from SessionLocal.
    """
    session = None
    try:
        session = SessionLocal()
        # The creation is successful if no exception is raised
        assert session is not None
        # Optional: Check if the session is active
        assert session.is_active
    except Exception as e:
        pytest.fail(f"Session creation failed: {e}")
    finally:
        if session:
            session.close()

def test_base_declarative():
    """
    Tests if the Base for declarative models is created.
    This is a basic check to ensure the declarative_base() call was successful.
    """
    assert Base is not None
    # Check if it has the expected `metadata` attribute
    assert hasattr(Base, 'metadata')


def test_get_db_context_manager():
    """Test get_db context manager helper."""
    with get_db() as db:
        assert db is not None
        assert db.is_active

if __name__ == "__main__":
    logging.info("Running database integrity checks...")
    test_database_connection()
    test_session_creation()
    test_base_declarative()
    logging.info("Database integrity checks passed successfully!")
