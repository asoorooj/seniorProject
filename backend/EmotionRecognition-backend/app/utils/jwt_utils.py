import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from datetime import datetime, timedelta, timezone
from flask import current_app
import os


def create_jwt(user_id: int) -> str:
    now = datetime.now(timezone.utc)

    exp_minutes = int(current_app.config.get("JWT_EXPIRES_MIN", 60 * 24 * 30))  # 30 days
    secret = os.getenv("JWT_SECRET")

    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=exp_minutes)).timestamp()),
        "type": "access",
        "iss": "emotion-recognition-api",
    }

    return jwt.encode(payload, secret, algorithm="HS256")


def decode_jwt(token: str):
    secret = os.getenv("JWT_SECRET")

    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])

        if "sub" not in payload:
            raise Exception("Invalid payload")

        if payload.get("iss") != "emotion-recognition-api":
            raise Exception("Invalid issuer")

        return payload

    except ExpiredSignatureError:
        raise Exception("Token expired")

    except InvalidTokenError:
        raise Exception("Invalid token")