from functools import wraps
from flask import request, jsonify, g
from app.utils.jwt_utils import decode_jwt
from app.models.db_models import User


def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")

        if request.method == "OPTIONS":
            return "", 200

        if not auth.startswith("Bearer "):
            return jsonify({"error": "missing bearer token"}), 401

        token = auth.split(" ", 1)[1].strip()

        try:
            payload = decode_jwt(token)  
            if "sub" not in payload:
                raise Exception("Invalid payload")
        except Exception:
            return jsonify({"error": "invalid or expired token"}), 401

        user = User.query.get(payload["sub"])
        if not user:
            return jsonify({"error": "user not found"}), 401

        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper