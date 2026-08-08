import os
import sys
import werkzeug
if not hasattr(werkzeug, "__version__"):
    werkzeug.__version__ = "3.0.0"

from unittest.mock import MagicMock
import sqlalchemy
from sqlalchemy.pool import StaticPool
from sqlalchemy import event
from sqlalchemy.engine import Engine

# Set mock environment variables BEFORE backend imports
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SUPABASE_URL"] = "https://dummy.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "dummy"
os.environ["SUPABASE_ANON_KEY"] = "dummy"
os.environ["SUPABASE_JWT_SECRET"] = "dummy"
os.environ["JWT_SECRET"] = "dummy"

# Ensure SQLite in-memory engine uses StaticPool and attaches auth schema
_original_create_engine = sqlalchemy.create_engine


def _mock_create_engine(url, *args, **kwargs):
    if str(url).startswith("sqlite"):
        kwargs["poolclass"] = StaticPool
        kwargs["connect_args"] = {"check_same_thread": False}
        kwargs.pop("pool_size", None)
        kwargs.pop("max_overflow", None)
        kwargs.pop("pool_timeout", None)
    return _original_create_engine(url, *args, **kwargs)


sqlalchemy.create_engine = _mock_create_engine


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("ATTACH DATABASE ':memory:' AS auth")
    except Exception:
        pass
    cursor.close()


# Mock supabase SDK modules before importing backend packages if needed
if "supabase" not in sys.modules:
    sys.modules["supabase"] = MagicMock()
if "supabase_auth" not in sys.modules:
    sys.modules["supabase_auth"] = MagicMock()
if "supabase_auth.errors" not in sys.modules:
    mock_errors = MagicMock()

    class DummyAuthApiError(Exception):
        def __init__(self, message="Auth error", status=400, code="auth_error"):
            super().__init__(message)
            self.message = message
            self.status = status
            self.code = code

    mock_errors.AuthApiError = DummyAuthApiError
    sys.modules["supabase_auth.errors"] = mock_errors
