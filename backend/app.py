from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from .db import Base, engine
import os

def create_app():
	app = Flask(__name__, instance_relative_config=False)
	jwt_secret = os.getenv("JWT_SECRET")
	if not jwt_secret:
		raise ValueError("JWT_SECRET environment variable must be set")
	app.config["JWT_SECRET_KEY"] = jwt_secret	
	app.config["JWT_ACCESS_TOKEN_EXPIRES"] = int(os.getenv("JWT_ACCESS_EXPIRES", "3600"))
	CORS(app)

	jwt = JWTManager(app)
	bcrypt = Bcrypt(app)

	# Import and register blueprints
	from .routes.auth import auth_bp
	app.register_blueprint(auth_bp, url_prefix="/auth")

	# Create tables (simple approach; replace with migrations if needed)
	Base.metadata.create_all(bind=engine)
	return app

if __name__ == "__main__":
	create_app().run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
