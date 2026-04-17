from functools import wraps
from flask import request, jsonify, g
from app.utils.jwt_utils import decode_jwt
from app.models.db_models import User
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)

def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # Get the Authorization header
        auth = request.headers.get("Authorization", "")
        
        # Handle OPTIONS method (CORS preflight)
        if request.method == "OPTIONS":
            return "", 200

        # Check if the Authorization header is valid
        if not auth.startswith("Bearer "):
            logging.warning("Missing or invalid bearer token")
            return jsonify({"error": "missing bearer token"}), 401

        # Extract the token from the Authorization header
        token = auth.split(" ", 1)[1].strip()

        try:
            # Decode the token
            payload = decode_jwt(token)
            if "sub" not in payload:
                raise Exception("Invalid payload: missing 'sub' key")

        except Exception as e:
            logging.error(f"JWT error: {str(e)}")
            return jsonify({"error": "invalid or expired token"}), 401

        # Fetch user from the database using the 'sub' (subject) from the token payload
        user = User.query.get(payload["sub"])
        if not user:
            logging.warning("User not found for ID: %s", payload["sub"])
            return jsonify({"error": "user not found"}), 401

        # Attach the user to the Flask global `g` object
        g.current_user = user
        logging.info("Authenticated user: %s", user.id)  # or use user.id, depending on what you want to log

        # Proceed to the original view function
        return fn(*args, **kwargs)

    return wrapper