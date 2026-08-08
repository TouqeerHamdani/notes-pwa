import pytest
import uuid
import os
import jwt
from datetime import datetime, timezone, timedelta

from backend.app import create_app
from backend.models import Note, User
from backend.db import SessionLocal, Base, engine

TEST_USER_ID_OBJ = uuid.uuid4()
TEST_USER_ID = str(TEST_USER_ID_OBJ)
SUPABASE_JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET', 'test_jwt_secret')

def get_auth_token(user_id_str):
    payload = {
        "sub": user_id_str,
        "email": "test@example.com",
        "aud": "authenticated"
    }
    return jwt.encode(payload, SUPABASE_JWT_SECRET, algorithm="HS256")

@pytest.fixture(scope='function')
def app():
    app = create_app()
    app.config['TESTING'] = True
    Base.metadata.create_all(bind=engine)
    yield app
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(app):
    test_client = app.test_client()
    test_client.set_cookie('sb-access-token', get_auth_token(TEST_USER_ID))
    return test_client

@pytest.fixture
def db_session():
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def setup_user(db_session):
    user = User(id=TEST_USER_ID_OBJ, email="test_sync@example.com")
    db_session.add(user)
    db_session.commit()
    return TEST_USER_ID_OBJ

@pytest.fixture
def auth_headers():
    return {}

def test_note_versioning_and_conflict(client, setup_user, auth_headers):
    # Create note
    resp = client.post("/api/notes", json={"title": "V1", "content": "C1"}, headers=auth_headers)
    assert resp.status_code == 201
    note_id = resp.json["data"]["id"]
    version = resp.json["data"]["version"]
    assert version == 1
    
    # Update note
    resp2 = client.put(f"/api/notes/{note_id}", json={"title": "V2", "content": "C2"}, headers=auth_headers)
    assert resp2.status_code == 200
    new_version = resp2.json["data"]["version"]
    assert new_version == 2
    
    # Update with stale version (Conflict)
    resp3 = client.put(f"/api/notes/{note_id}", json={"title": "V3", "content": "C3", "version": 1}, headers=auth_headers)
    assert resp3.status_code == 409
    assert resp3.json["success"] is False
    assert resp3.json["message"] == "Conflict: Stale version"
    assert resp3.json["server_note"]["version"] == 2

def test_sync_idempotency(client, setup_user, auth_headers):
    headers = auth_headers.copy()
    headers["Idempotency-Key"] = "idemp_test_123"
    
    payload = {
        "notes": [],
        "last_sync_timestamp": None
    }
    
    resp1 = client.post("/api/sync", json=payload, headers=headers)
    assert resp1.status_code == 200
    
    # Change payload, but use same key
    payload["notes"] = [{"id": str(uuid.uuid4()), "title": "Test", "content": "Test", "last_modified": datetime.now(timezone.utc).isoformat()}]
    resp2 = client.post("/api/sync", json=payload, headers=headers)
    
    assert resp2.status_code == 200
    assert resp1.json == resp2.json

def test_sync_tombstones_and_conflicts(client, setup_user, auth_headers):
    db = SessionLocal()
    note_id1 = uuid.uuid4()
    now = datetime.now(timezone.utc)
    n1 = Note(id=note_id1, user_id=setup_user, title="S1", content="C1", last_modified=now, version=3)
    db.add(n1)
    db.commit()
    db.close()
    
    # Client syncs with stale version
    payload = {
        "notes": [
            {
                "id": str(note_id1),
                "title": "C1",
                "content": "C1",
                "last_modified": (now + timedelta(seconds=1)).isoformat(),
                "version": 2,
                "is_deleted": False
            }
        ]
    }
    
    resp = client.post("/api/sync", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    conflicts = resp.json["conflicts"]
    assert len(conflicts) == 1
    assert conflicts[0]["id"] == str(note_id1)
    assert conflicts[0]["version"] == 3
    
    # Delete note to test tombstone
    resp_del = client.delete(f"/api/notes/{note_id1}", headers=auth_headers)
    assert resp_del.status_code == 200
    
    # Sync with last_sync_timestamp to fetch tombstones
    payload2 = {
        "notes": [],
        "last_sync_timestamp": (now - timedelta(seconds=10)).isoformat()
    }
    
    resp_sync2 = client.post("/api/sync", json=payload2, headers=auth_headers)
    assert resp_sync2.status_code == 200
    notes = resp_sync2.json["notes"]
    assert len(notes) == 1
    assert notes[0]["id"] == str(note_id1)
    assert notes[0]["is_deleted"] is True
    assert notes[0]["version"] == 4
