import pytest
from unittest.mock import patch, MagicMock
from flask import jsonify
from backend.app import create_app
from backend.routes.auth import user_required


@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    app = create_app()

    # Add a dummy protected route for testing the decorator
    @app.route('/api/protected')
    @user_required
    def protected_route(user):
        return jsonify(message="Success", user=user)

    yield app


@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()


# --- Tests for /register ---

@patch('backend.routes.auth.supabase_anon')
def test_register_success(mock_supabase_anon, client):
    """Test successful user registration."""
    mock_user = MagicMock()
    mock_user.id = 'some-uuid'
    mock_user.email = 'test@example.com'

    mock_response = MagicMock()
    mock_response.user = mock_user

    mock_supabase_anon.auth.sign_up.return_value = mock_response

    response = client.post('/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123'
    })

    assert response.status_code == 201
    assert response.json['email'] == 'test@example.com'
    mock_supabase_anon.auth.sign_up.assert_called_once_with({
        'email': 'test@example.com',
        'password': 'password123'
    })


def test_register_invalid_email(client):
    """Test registration with an invalid email."""
    response = client.post('/auth/register', json={
        'email': 'not-an-email',
        'password': 'password123'
    })
    assert response.status_code == 400
    assert 'Invalid email format' in response.json['msg']


def test_register_short_password(client):
    """Test registration with a short password."""
    response = client.post('/auth/register', json={
        'email': 'test@example.com',
        'password': '123'
    })
    assert response.status_code == 400
    assert 'Password must be at least 8 characters' in response.json['msg']


# --- Tests for /login ---

@patch('backend.routes.auth.supabase_anon')
def test_login_success(mock_supabase_anon, client):
    """Test successful login and cookie setting."""
    mock_session = MagicMock()
    mock_session.access_token = 'fake-access-token'
    mock_session.refresh_token = 'fake-refresh-token'

    mock_response = MagicMock()
    mock_response.session = mock_session

    mock_supabase_anon.auth.sign_in_with_password.return_value = mock_response

    response = client.post('/auth/login', json={
        'email': 'test@example.com',
        'password': 'password123'
    })

    assert response.status_code == 200

    # Get all Set-Cookie headers, as there are multiple
    cookies = response.headers.get_all('Set-Cookie')

    # Check that both cookies are present in the list of headers
    assert any('sb-access-token=fake-access-token' in c for c in cookies)
    assert any('sb-refresh-token=fake-refresh-token' in c for c in cookies)
    assert all('HttpOnly' in c for c in cookies)


@patch('backend.routes.auth.supabase_anon')
def test_login_invalid_credentials(mock_supabase_anon, client):
    """Test login with invalid credentials."""
    from supabase_auth.errors import AuthApiError
    mock_supabase_anon.auth.sign_in_with_password.side_effect = AuthApiError(
        "Invalid credentials", status=401, code="invalid_credentials"
    )

    response = client.post('/auth/login', json={
        'email': 'wrong@example.com',
        'password': 'wrongpassword'
    })

    assert response.status_code == 401
    assert 'Invalid credentials' in response.json['msg']


# --- Tests for user_required decorator ---

@patch('backend.routes.auth.SUPABASE_JWT_SECRET', 'dummy')
@patch('backend.routes.auth.jwt')
def test_user_required_success(mock_jwt, client):
    """Test protected route with a valid token in cookie."""
    mock_jwt.decode.return_value = {
        'sub': 'user-id-123',
        'email': 'test@example.com'
    }

    client.set_cookie('sb-access-token', 'valid-token')
    response = client.get('/api/protected')

    assert response.status_code == 200
    assert response.json['message'] == 'Success'
    assert response.json['user']['id'] == 'user-id-123'
    mock_jwt.decode.assert_called_once_with('valid-token', 'dummy', algorithms=["HS256"], audience='authenticated')


def test_user_required_no_token(client):
    """Test protected route without a token."""
    response = client.get('/api/protected')
    assert response.status_code == 401
    assert 'Missing token' in response.json['msg']


@patch('backend.routes.auth.SUPABASE_JWT_SECRET', 'dummy')
@patch('backend.routes.auth.jwt')
def test_user_required_invalid_token(mock_jwt, client):
    """Test protected route with an invalid token."""
    import jwt as real_jwt
    mock_jwt.PyJWTError = real_jwt.PyJWTError
    mock_jwt.decode.side_effect = real_jwt.PyJWTError('Invalid signature')

    client.set_cookie('sb-access-token', 'invalid-token')
    response = client.get('/api/protected')

    assert response.status_code == 401
    assert 'Invalid token' in response.json['msg']


# --- Tests for /google_oauth ---

@patch('backend.routes.auth.supabase_anon')
def test_google_oauth_success(mock_supabase_anon, client):
    """Test successful Google OAuth request."""
    mock_response = MagicMock()
    mock_response.url = 'http://fake-google-oauth-url.com'
    mock_supabase_anon.auth.sign_in_with_oauth.return_value = mock_response

    response = client.post('/auth/google_oauth')

    assert response.status_code == 200
    assert response.json['url'] == 'http://fake-google-oauth-url.com'
    mock_supabase_anon.auth.sign_in_with_oauth.assert_called_once_with({"provider": "google"})


@patch('backend.routes.auth.supabase_anon')
def test_google_oauth_failure(mock_supabase_anon, client):
    """Test failed Google OAuth request."""
    from supabase_auth.errors import AuthApiError

    mock_supabase_anon.auth.sign_in_with_oauth.side_effect = AuthApiError(
        "OAuth provider returned an error", status=500, code="oauth_error"
    )

    response = client.post('/auth/google_oauth')

    assert response.status_code == 500
    assert "OAuth error" in response.json["msg"]