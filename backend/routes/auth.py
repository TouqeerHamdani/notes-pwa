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
def register():
    """Create a Supabase user via the Admin API and return session tokens.
    Expects JSON { email, password }.
    Requires SUPABASE_SERVICE_ROLE_KEY set in env.
    """
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    if not email or not password:
        return jsonify({"msg": "Missing email or password"}), 400
    if not is_valid_email(email):
        return jsonify({"msg": "Invalid email format"}), 400
    if len(password) < 8:
        return jsonify({"msg": "Password must be at least 8 characters"}), 400

    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        logging.error("Supabase URL or service role key not configured")
        return jsonify({"msg": "Server misconfiguration"}), 500

    try:
        resp = supabase_anon.auth.sign_up({"email": email, "password": password})
    except AuthApiError as e:
        if "already been registered" in str(e):
            return jsonify({"msg": "A user with this email address has already been registered"}), 409
        logging.exception("Supabase admin user creation failed")
        return jsonify({"msg": "Upstream error", "detail": str(e)}), 502

    sup_user = resp.user
    if not sup_user or not sup_user.id:
        return jsonify({"msg": "Supabase did not return user id"}), 500

    return jsonify({"id": str(sup_user.id), "email": sup_user.email}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Sign in via Supabase and set HttpOnly cookies with access and refresh tokens.
    Expects JSON { email, password }.
    """
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    if not email or not password:
        return jsonify({"msg": "Missing email or password"}), 400

    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        logging.error("Supabase misconfigured")
        return jsonify({"msg": "Server misconfiguration"}), 500

    try:
        resp = supabase_anon.auth.sign_in_with_password(
            {"email": email, "password": password}
        )
    except AuthApiError as e:
        return jsonify({"msg": "Invalid credentials", "detail": str(e)}), 401

    if not resp.session:
        return jsonify({"msg": "No session returned", "detail": str(e)}), 500

    access_token = resp.session.access_token
    refresh_token = resp.session.refresh_token

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
def refresh():
    """Refresh the access token using the refresh token cookie.
    Called when access token expires (frontend can hook into 401 responses).
    """
    refresh_token = request.cookies.get("sb-refresh-token")
    
    if not refresh_token:
        return jsonify({"msg": "Missing refresh token"}), 401

    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        logging.error("Supabase misconfigured")
        return jsonify({"msg": "Server misconfiguration"}), 500

    try:
        resp = supabase_anon.auth.refresh_session(refresh_token)
    except AuthApiError as e:
        return jsonify({"msg": "Refresh failed", "detail": str(e)}), 401

    if not resp.session:
        return jsonify({"msg": "No session returned", "detail": str(e)}), 500

    access_token = resp.session.access_token
    new_refresh_token = resp.session.refresh_token

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
    res = make_response(jsonify({"msg": "ok"}))
    res.set_cookie("sb-access-token", "", expires=0, path="/")
    res.set_cookie("sb-refresh-token", "", expires=0, path="/")
    return res


@auth_bp.route("/google_oauth", methods=["POST"])
def google_oauth():
    """Initiate Google OAuth flow via Supabase."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        logging.error("Supabase not configured")
        return jsonify({"msg": "Server misconfiguration"}), 500

    try:
        resp = supabase_anon.auth.sign_in_with_oauth({"provider": "google"})
    except AuthApiError as e:
        logging.exception("Google OAuth failed")
        return jsonify({"msg": "OAuth error", "detail": str(e)}), 500

    return jsonify({"url": resp.url}), 200
