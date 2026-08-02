import pytest
from datetime import datetime, timezone
import uuid
import os
import jwt

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
    """Create app and initialize test database."""
    app = create_app()
    app.config['TESTING'] = True

    # Create tables for testing
    Base.metadata.create_all(bind=engine)
    yield app

    # Clean up
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(app):
    """A test client for the app with auth cookie set."""
    test_client = app.test_client()
    test_client.set_cookie('sb-access-token', get_auth_token(TEST_USER_ID))
    return test_client


@pytest.fixture
def db_session():
    """Provide a clean session for each test."""
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()


def test_get_notes_success(client, db_session):
    """Test retrieving notes successfully."""
    user = User(id=TEST_USER_ID_OBJ, email='test@example.com')
    db_session.add(user)

    now = datetime.now(timezone.utc)
    note1 = Note(
        id=uuid.uuid4(),
        user_id=TEST_USER_ID_OBJ,
        title='Title 1',
        content='Test Note 1',
        last_modified=now,
        created_at=now,
        is_deleted=False
    )
    note2 = Note(
        id=uuid.uuid4(),
        user_id=TEST_USER_ID_OBJ,
        title='Title 2',
        content='Test Note 2',
        last_modified=now,
        created_at=now,
        is_deleted=False
    )
    db_session.add_all([note1, note2])
    db_session.commit()

    response = client.get('/api/notes')
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert len(data['data']) == 2


def test_create_note_success(client, db_session):
    """Test creating a note successfully."""
    user = User(id=TEST_USER_ID_OBJ, email='test@example.com')
    db_session.add(user)
    db_session.commit()

    response = client.post(
        '/api/notes',
        json={'title': 'New Title', 'content': 'New Note'},
        content_type='application/json'
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data['success'] is True
    assert data['data']['content'] == 'New Note'
    assert data['data']['title'] == 'New Title'


def test_update_note_success(client, db_session):
    """Test updating a note and persisting title."""
    user = User(id=TEST_USER_ID_OBJ, email='test@example.com')
    db_session.add(user)

    now = datetime.now(timezone.utc)
    note_id_obj = uuid.uuid4()
    note_id_str = str(note_id_obj)
    note = Note(
        id=note_id_obj,
        user_id=TEST_USER_ID_OBJ,
        title='Old Title',
        content='Old Content',
        last_modified=now,
        created_at=now,
        is_deleted=False
    )
    db_session.add(note)
    db_session.commit()

    response = client.put(
        f'/api/notes/{note_id_str}',
        json={'title': 'Updated Title', 'content': 'Updated Content'},
        content_type='application/json'
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['data']['title'] == 'Updated Title'
    assert data['data']['content'] == 'Updated Content'

    # Verify title in DB
    db_note = db_session.query(Note).filter(Note.id == note_id_obj).first()
    assert db_note.title == 'Updated Title'


def test_create_note_empty_content(client, db_session):
    """Test creating a note with empty content."""
    user = User(id=TEST_USER_ID_OBJ, email='test@example.com')
    db_session.add(user)
    db_session.commit()

    response = client.post(
        '/api/notes',
        json={'content': '   '},
        content_type='application/json'
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False


def test_get_notes_pagination(client, db_session):
    """Test notes list endpoint pagination params page and per_page."""
    user = User(id=TEST_USER_ID_OBJ, email='test@example.com')
    db_session.add(user)

    now = datetime.now(timezone.utc)
    for i in range(5):
        note = Note(
            id=uuid.uuid4(),
            user_id=TEST_USER_ID_OBJ,
            title=f'Title {i}',
            content=f'Content {i}',
            last_modified=now,
            created_at=now,
            is_deleted=False
        )
        db_session.add(note)
    db_session.commit()

    # Fetch page 1 with per_page=2
    response = client.get('/api/notes?page=1&per_page=2')
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert len(data['data']) == 2
    assert data['total'] == 5
    assert data['page'] == 1
    assert data['per_page'] == 2
    assert data['total_pages'] == 3

    # Fetch page 3 with per_page=2 (should have 1 item left)
    response2 = client.get('/api/notes?page=3&per_page=2')
    assert response2.status_code == 200
    data2 = response2.get_json()
    assert len(data2['data']) == 1


