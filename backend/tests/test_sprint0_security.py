import pytest
from unittest.mock import patch, MagicMock
from backend.app import create_app
from backend.routes.auth import user_required


@pytest.fixture
def app():
    app = create_app()
    yield app


@pytest.fixture
def client(app):
    return app.test_client()


def test_security_headers_present(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert "strict-origin-when-cross-origin" in response.headers.get("Referrer-Policy", "")
    assert "default-src 'self'" in response.headers.get("Content-Security-Policy", "")


@patch('backend.routes.auth.SUPABASE_JWT_SECRET', 'dummy')
@patch('backend.routes.auth.jwt')
def test_sync_batch_size_limit(mock_jwt, client):
    mock_jwt.decode.return_value = {'sub': '00000000-0000-0000-0000-000000000001', 'email': 'test@example.com'}
    client.set_cookie('sb-access-token', 'valid-token')

    # Create 101 items (exceeding MAX_BATCH_SIZE = 100)
    over_limit_notes = [{'id': f'00000000-0000-0000-0000-{i:012d}', 'title': 'T', 'content': 'C', 'last_modified': '2026-08-07T12:00:00Z'} for i in range(101)]

    response = client.post('/api/sync', json={'notes': over_limit_notes})
    assert response.status_code == 400
    assert 'exceeds maximum limit' in response.json['message']


@patch('backend.routes.auth.SUPABASE_JWT_SECRET', 'dummy')
@patch('backend.routes.auth.jwt')
def test_note_title_length_limit(mock_jwt, client):
    mock_jwt.decode.return_value = {'sub': '00000000-0000-0000-0000-000000000001', 'email': 'test@example.com'}
    client.set_cookie('sb-access-token', 'valid-token')

    long_title = 'A' * 501
    response = client.post('/api/notes', json={'title': long_title, 'content': 'Valid content'})
    assert response.status_code == 400
    assert 'Title exceeds maximum length' in response.json['message']
