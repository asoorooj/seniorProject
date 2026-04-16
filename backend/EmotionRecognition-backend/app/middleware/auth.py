from functools import wraps
from flask import request, jsonify, g
from app.utils.jwt_utils import decode_jwt
from app.models.db_models import User, Session
from functools import wraps
from flask import request, jsonify, g
from datetime import datetime, timedelta
from app.extensions import db

def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):

        # optional CORS preflight handling
        if request.method == "OPTIONS":
            return "", 200

        # 1. get session id from header
        session_id = request.headers.get("Authorization")

        if not session_id:
            return jsonify({"error": "missing session id"}), 401

        # 2. fetch session from DB
        session = Session.query.get(session_id)

        if not session:
            return jsonify({"error": "invalid session"}), 401

        # 3. optional expiration check
        if session.last_seen_at:
            if session.last_seen_at < datetime.utcnow() - timedelta(hours=24):
                return jsonify({"error": "session expired"}), 401

        # 4. fetch user
        user = User.query.get(session.user_id)

        if not user:
            return jsonify({"error": "user not found"}), 401

        # 5. update activity
        session.last_seen_at = datetime.utcnow()
        db.session.commit()

        # 6. attach to request context
        g.current_user = user
        g.current_session = session
        # Backward-compatible aliases for handlers that prefer shorter names.
        g.user = user
        g.session = session

        return fn(*args, **kwargs)

    return wrapper
