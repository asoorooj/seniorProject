
from flask import Blueprint, request, jsonify
from app.models.db_models import User
from app.extensions import db
from app.utils.jwt_utils import create_jwt
import uuid
from werkzeug.security import check_password_hash


auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/auth/register")
def register():
    data = request.get_json(silent=True) or {}

    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    # CONSENT
    consent_chat = data.get("consent_chat", False)
    consent_image = data.get("consent_image", False)
    consent_audio = data.get("consent_audio", False)

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    if len(password) < 8:
        return jsonify({"error": "password must be at least 8 characters"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email already registered"}), 409
    print("REGISTER PASSWORD:", repr(password))

    from datetime import datetime

    user = User(
        external_id=str(uuid.uuid4()),
        email=email,
        consent_chat=consent_chat,
        consent_image=consent_image,
        consent_audio=consent_audio,
        consent_timestamp=datetime.utcnow()
    )

    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    token = create_jwt(user.id)


    return jsonify({
        "message": "registered successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "external_id": user.external_id,
            "consent_chat": user.consent_chat,
            "consent_image": user.consent_image,
            "consent_audio": user.consent_audio
        },
        "token": token
    }), 201



@auth_bp.post("/auth/login")
def login():
    data = request.get_json(silent=True) or {}

    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    print("Direct check:", check_password_hash(user.password_hash, password))
    print("Method check:", user.check_password(password))

    print("Entered password:", repr(password))
    print("Stored hash:", user.password_hash if user else None)

    if user:
        print("Password match:", user.check_password(password))
        
    if not user or not user.check_password(password):
        return jsonify({"error": "invalid credentials"}), 401

    token = create_jwt(user.id)

    

    return jsonify({
        "message": "login successful",
        "user": {
            "id": user.id,
            "email": user.email,
            "external_id": user.external_id,
            "consent_timestamp": user.consent_timestamp.isoformat() if user.consent_timestamp else None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "pref_eval_face": 1,
            "pref_eval_image": 1,            
            "pref_eval_audio": 1,

        },
        "access_token": token,
        "user_id": user.id
    }), 200