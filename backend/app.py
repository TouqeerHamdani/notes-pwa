from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from .db import Base, engine
import os
from dotenv import load_dotenv
import logging
load_dotenv()
logging.basicConfig(level=logging.DEBUG)


def create_app():
	app = Flask(__name__, instance_relative_config=False)
	jwt_secret = os.getenv("JWT_SECRET")
	if not jwt_secret:
		logging.error("JWT_SECRET environment variable must be set.")
		raise ValueError("JWT_SECRET environment variable must be set")
	app.config["JWT_SECRET_KEY"] = jwt_secret    
	app.config["JWT_ACCESS_TOKEN_EXPIRES"] = int(os.getenv("JWT_ACCESS_EXPIRES", "3600"))
	CORS(app)
	jwt = JWTManager(app)
	bcrypt = Bcrypt(app)

	# Add a simple index route to confirm the app is running
	@app.route("/")
	def index():
		return "<h1>Welcome to the Notes PWA Backend!</h1>"

	# Import and register blueprints
	from .routes.auth import auth_bp
	from .routes.notes import notes
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
