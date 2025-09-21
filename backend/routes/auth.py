from flask import Blueprint, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token
from backend.db import SessionLocal
from backend.models import User
import os
import re
import logging
from sqlalchemy.exc import IntegrityError
from dotenv import load_dotenv
load_dotenv()

auth_bp = Blueprint("auth", __name__)
bcrypt = Bcrypt()

def is_valid_email(email):
    return re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data or not isinstance(data, dict):
        return jsonify({"msg": "Invalid input"}), 400
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"msg": "Missing email or password"}), 400
    email = email.lower()
    if not is_valid_email(email):
        return jsonify({"msg": "Invalid email format"}), 400
    if len(password) < 8:
        return jsonify({"msg": "Password must be at least 8 characters"}), 400
    db = SessionLocal()
    try:
        if db.query(User).filter_by(email=email).first():
            return jsonify({"msg": "User already exists"}), 409
        pw_hash = bcrypt.generate_password_hash(password).decode("utf-8")
        user = User(email=email, password_hash=pw_hash)
        db.add(user)
        db.commit()
        db.refresh(user)
        return jsonify({"id": user.id, "email": user.email}), 201
    except IntegrityError as ie:
        db.rollback()
        logging.exception("Integrity error during registration")
        return jsonify({"msg": "User already exists or DB error"}), 409
    except Exception as e:
        db.rollback()
        logging.exception("Unexpected error during registration")
        return jsonify({"msg": "Internal server error"}), 500
    finally:
        db.close()

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data or not isinstance(data, dict):
            return jsonify({"msg": "Invalid input"}), 400
        email = data.get("email")
        password = data.get("password")
        if not email or not password:
            return jsonify({"msg": "Missing email or password"}), 400
        db = SessionLocal()
        try:
            user = db.query(User).filter_by(email=email.lower()).first()
            if not user or not bcrypt.check_password_hash(user.password_hash, password):
                return jsonify({"msg": "Bad credentials"}), 401
            access = create_access_token(identity=user.id)
            return jsonify({"access_token": access}), 200
        finally:
            db.close()
    except Exception as e:
        logging.exception("Login error")
        return jsonify({"msg": "Internal server error"}), 500
