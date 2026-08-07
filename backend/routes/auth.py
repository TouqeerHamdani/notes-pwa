from flask import Blueprint, request, jsonify, make_response
from functools import wraps
import os
import re
import logging
import jwt
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
from supabase_auth.errors import AuthApiError
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
ENV = os.getenv("FLASK_ENV", "development")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
if not SUPABASE_ANON_KEY:
    logging.error("SUPABASE_ANON_KEY not configured")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
supabase_anon: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

auth_bp = Blueprint("auth", __name__)
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=os.getenv("RATELIMIT_STORAGE_URI", "memory://")
)


_email_re = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def is_valid_email(email):
    return bool(email and _email_re.match(email))


def user_required(f):
    """Decorator to validate Supabase JWT (from Authorization header or sb-access-token cookie)
    and inject user claims dict into the route handler.
    
    Since we're using Supabase's auth.users table directly, we extract claims from the JWT
    and pass them as a dict: {"id": user_id, "email": email, "sub": user_id, ...}
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1]
        else:
            token = request.cookies.get("sb-access-token")

        if not token:
            return jsonify({"msg": "Missing token"}), 401

        if not SUPABASE_JWT_SECRET:
            logging.warning("SUPABASE_JWT_SECRET not set; cannot verify token")
            return jsonify({"msg": "Server misconfiguration"}), 500

        try:
            payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
            user_id = payload.get("sub")
            email = payload.get("email")
            if not user_id:
                return jsonify({"msg": "Invalid token payload"}), 401
        except jwt.PyJWTError:
            logging.exception("Token verification failed")
            return jsonify({"msg": "Invalid token"}), 401

        # Pass the full JWT payload as user dict
        user = {"id": user_id, "email": email, **payload}
        return f(user, *args, **kwargs)

    return decorated


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    """Create a Supabase user via the Admin API and return session tokens.
    Expects JSON { email, password }.
    Requires SUPABASE_SERVICE_ROLE_KEY set in env.
    """
    client_ip = request.remote_addr
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    if not email or not password:
        logging.warning(f"SECURITY_EVENT: registration_failed_missing_fields ip={client_ip}")
        return jsonify({"msg": "Missing email or password"}), 400
    if not is_valid_email(email):
        logging.warning(f"SECURITY_EVENT: registration_failed_invalid_email email={email} ip={client_ip}")
        return jsonify({"msg": "Invalid email format"}), 400
    if len(password) < 8:
        logging.warning(f"SECURITY_EVENT: registration_failed_short_password email={email} ip={client_ip}")
        return jsonify({"msg": "Password must be at least 8 characters"}), 400

    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        logging.error("Supabase URL or service role key not configured")
        return jsonify({"msg": "Server misconfiguration"}), 500

    try:
        resp = supabase_anon.auth.sign_up({"email": email, "password": password})
    except AuthApiError as e:
        if "already been registered" in str(e):
            logging.warning(f"SECURITY_EVENT: registration_failed_duplicate_email email={email} ip={client_ip}")
            return jsonify({"msg": "A user with this email address has already been registered"}), 409
        logging.exception(f"Supabase admin user creation failed for email={email}")
        return jsonify({"msg": "Registration failed"}), 502

    sup_user = resp.user
    if not sup_user or not sup_user.id:
        logging.error(f"Supabase did not return user id for email={email}")
        return jsonify({"msg": "Registration processing error"}), 500

    logging.info(f"SECURITY_EVENT: user_registered user_id={sup_user.id} email={sup_user.email} ip={client_ip}")
    return jsonify({"id": str(sup_user.id), "email": sup_user.email}), 201


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    """Sign in via Supabase and set HttpOnly cookies with access and refresh tokens.
    Expects JSON { email, password }.
    """
    client_ip = request.remote_addr
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    if not email or not password:
        logging.warning(f"SECURITY_EVENT: login_failed_missing_fields ip={client_ip}")
        return jsonify({"msg": "Missing email or password"}), 400

    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        logging.error("Supabase misconfigured")
        return jsonify({"msg": "Server misconfiguration"}), 500

    try:
        resp = supabase_anon.auth.sign_in_with_password(
            {"email": email, "password": password}
        )
    except AuthApiError as e:
        logging.warning(f"SECURITY_EVENT: login_failed_invalid_credentials email={email} ip={client_ip}")
        return jsonify({"msg": "Invalid credentials"}), 401

    if not resp.session:
        logging.error(f"No session returned for login email={email}")
        return jsonify({"msg": "Authentication failed"}), 500
    access_token = resp.session.access_token
    refresh_token = resp.session.refresh_token

    logging.info(f"SECURITY_EVENT: user_login_success email={email} ip={client_ip}")

    # Set HttpOnly cookies
    res = make_response(jsonify({"msg": "ok"}))
    secure_flag = ENV == "production"

    if access_token:
        res.set_cookie("sb-access-token", access_token, httponly=True,
                       secure=secure_flag, samesite="Lax", path="/", max_age=3600)
    if refresh_token:
        res.set_cookie("sb-refresh-token", refresh_token, httponly=True,
                       secure=secure_flag, samesite="Lax", path="/", max_age=604800)

    return res


@auth_bp.route("/refresh", methods=["POST"])
@limiter.limit("10 per minute")
def refresh():
    """Refresh the access token using the refresh token cookie.
    Called when access token expires (frontend can hook into 401 responses).
    """
    client_ip = request.remote_addr
    refresh_token = request.cookies.get("sb-refresh-token")
    
    if not refresh_token:
        logging.warning(f"SECURITY_EVENT: token_refresh_failed_missing_cookie ip={client_ip}")
        return jsonify({"msg": "Missing refresh token"}), 401

    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        logging.error("Supabase misconfigured")
        return jsonify({"msg": "Server misconfiguration"}), 500

    try:
        resp = supabase_anon.auth.refresh_session(refresh_token)
    except AuthApiError as e:
        logging.warning(f"SECURITY_EVENT: token_refresh_failed_invalid_token ip={client_ip}")
        return jsonify({"msg": "Refresh failed"}), 401

    if not resp.session:
        return jsonify({"msg": "No session returned"}), 500

    access_token = resp.session.access_token
    new_refresh_token = resp.session.refresh_token

    logging.info(f"SECURITY_EVENT: token_refresh_success ip={client_ip}")

    res = make_response(jsonify({"msg": "ok"}))
    secure_flag = ENV == "production"

    if access_token:
        res.set_cookie("sb-access-token", access_token, httponly=True,
                       secure=secure_flag, samesite="Lax", path="/", max_age=3600)
    if new_refresh_token:
        res.set_cookie("sb-refresh-token", new_refresh_token, httponly=True,
                       secure=secure_flag, samesite="Lax", path="/", max_age=604800)

    return res


@auth_bp.route("/me", methods=["GET"])
@user_required
def me(user):
    """Return the authenticated user's info (from JWT claims)."""
    return jsonify({
        "id": user.get("id"),
        "email": user.get("email"),
        "user_metadata": user.get("user_metadata")
    }), 200


@auth_bp.route("/logout", methods=["POST"])
@user_required
def logout(user):
    """Clear auth cookies to log out the user."""
    client_ip = request.remote_addr
    logging.info(f"SECURITY_EVENT: user_logout user_id={user.get('id')} ip={client_ip}")
    res = make_response(jsonify({"msg": "ok"}))
    res.set_cookie("sb-access-token", "", expires=0, path="/")
    res.set_cookie("sb-refresh-token", "", expires=0, path="/")
    return res


@auth_bp.route("/google_oauth", methods=["POST"])
@limiter.limit("5 per minute")
def google_oauth():
    """Initiate Google OAuth flow via Supabase."""
    client_ip = request.remote_addr
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        logging.error("Supabase not configured")
        return jsonify({"msg": "Server misconfiguration"}), 500

    try:
        resp = supabase_anon.auth.sign_in_with_oauth({"provider": "google"})
    except AuthApiError as e:
        logging.exception(f"Google OAuth failed ip={client_ip}")
        return jsonify({"msg": "OAuth error"}), 500

    logging.info(f"SECURITY_EVENT: google_oauth_initiated ip={client_ip}")
    return jsonify({"url": resp.url}), 200
