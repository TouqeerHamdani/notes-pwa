from flask import Flask, jsonify
from flask_cors import CORS
from flask_compress import Compress
from .db import Base, engine
import os
from dotenv import load_dotenv
import logging
load_dotenv()
logging.basicConfig(level=logging.DEBUG)


def create_app():
    app = Flask(__name__, instance_relative_config=False)
    app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10MB max request size

    Compress(app)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    CORS(app, supports_credentials=True, origins=[frontend_url])

    @app.after_request
    def set_security_headers(response):
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.supabase.co;"
        )
        return response

    @app.errorhandler(413)
    def request_entity_too_large(error):
        return jsonify({"success": False, "message": "Payload size exceeds 10MB limit"}), 413

    # Add a simple index route to confirm the app is running
    @app.route("/")
    def index():
        return "<h1>Welcome to the Notes PWA Backend!</h1>"

    # Health endpoint for load balancers / CI smoke checks
    @app.route("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    # Import and register blueprints
    from .routes.auth import auth_bp, limiter as auth_limiter
    from .routes.notes import notes
    auth_limiter.init_app(app)
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(notes, url_prefix="/api")

    # Create tables (simple approach; replace with migrations if needed)
    from . import models
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logging.error(f"Error creating tables: {e}")
        raise
    logging.debug("App creation complete.")
    return app


if __name__ == "__main__":
    logging.debug("Running app via __main__ entry point.")
    port = int(os.getenv("PORT", 5001))
    logging.debug(f"App will run on port: {port}")
    app = create_app()
    app.run(host="0.0.0.0", port=port)
