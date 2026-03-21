from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models.db_models import (
    AudioEvalutations,
    Evaluation,
    ImageEvalutations,
    TextEvalutations,
    User,
)

from app.chatbot_service import createChat, create_chat_with_id, get_chat

api_bp = Blueprint("api", __name__)


def _parse_iso_dt(value, field_name):
    if value is None:
        return None, None
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value), None
        except ValueError:
            return None, f"{field_name} must be ISO8601 datetime"
    return None, f"{field_name} must be a string"


def _json_error(message, status_code=400):
    return jsonify(error=message), status_code


def _user_to_dict(user):
    return {
        "id": user.id,
        "external_id": user.external_id,
        "created_at": user.created_at.isoformat(),
    }

def _parse_js_date(value):
    # Expected: "Sun Mar 15 2026 00:00:00 GMT-0400 (Eastern Daylight Time)"
    if not value or not isinstance(value, str):
        return None
    try:
        date_part, rest = value.split(" GMT", 1)
        tz_part = rest.strip().split(" ", 1)[0]
        dt = datetime.strptime(date_part, "%a %b %d %Y %H:%M:%S")
        sign = 1 if tz_part.startswith("+") else -1
        hours = int(tz_part[1:3])
        minutes = int(tz_part[3:5])
        offset = timedelta(hours=hours, minutes=minutes) * sign
        return dt.replace(tzinfo=timezone(offset))
    except Exception:
        return None


def _extract_gemini_text(response):
    text = getattr(response, "text", None)
    if text:
        return text

    candidates = getattr(response, "candidates", None)
    if not candidates:
        return None

    for candidate in candidates:
        content = getattr(candidate, "content", None)
        if not content:
            continue
        parts = getattr(content, "parts", None) or []
        for part in parts:
            part_text = getattr(part, "text", None)
            if part_text:
                return part_text

    return None


@api_bp.get("/users")
def list_users():
    users = User.query.order_by(User.id.asc()).all()
    return jsonify(users=[_user_to_dict(u) for u in users]), 200


@api_bp.get("/users/<int:user_id>")
def get_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return _json_error("User not found", 404)
    return jsonify(user=_user_to_dict(user)), 200


@api_bp.post("/users")
def create_user():
    payload = request.get_json(silent=True) or {}
    external_id = payload.get("external_id")
    if not external_id:
        return _json_error("external_id is required")

    user = User(external_id=external_id)
    db.session.add(user)
    db.session.commit()
    return jsonify(user=_user_to_dict(user)), 201


@api_bp.put("/users/<int:user_id>")
def update_user(user_id):
    payload = request.get_json(silent=True) or {}
    user = User.query.get(user_id)
    if not user:
        return _json_error("User not found", 404)

    if "external_id" in payload:
        user.external_id = payload["external_id"]

    db.session.commit()
    return jsonify(user=_user_to_dict(user)), 200


@api_bp.delete("/users/<int:user_id>")
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return _json_error("User not found", 404)

    db.session.delete(user)
    db.session.commit()
    return jsonify(status="deleted"), 200

@api_bp.get("/evaluation/by-date")
def test_get_evaluations_by_date():
    user_id = request.args.get("user_id", type=int)
    start_date_raw = request.args.get("start_date")
    if not user_id:
        return jsonify(error="user_id is required"), 400
    if not start_date_raw:
        return jsonify(error="start_date is required"), 400

    start_dt = _parse_js_date(start_date_raw)
    if not start_dt:
        return jsonify(error="start_date format is invalid"), 400

    start_utc = start_dt.astimezone(timezone.utc)
    end_utc = start_utc + timedelta(days=7)

    evaluations = (
        Evaluation.query.filter_by(user_id=user_id)
        .filter(Evaluation.timestamp >= start_utc)
        .filter(Evaluation.timestamp < end_utc)
        .order_by(Evaluation.id.desc())
        .all()
    )
    if not evaluations:
        return jsonify(evaluations=[]), 200

    evaluation_ids = [e.id for e in evaluations]

    audio_rows = (
        AudioEvalutations.query.filter(
            AudioEvalutations.evaluation_id.in_(evaluation_ids)
        ).all()
    )
    image_rows = (
        ImageEvalutations.query.filter(
            ImageEvalutations.evaluation_id.in_(evaluation_ids)
        ).all()
    )
    text_rows = (
        TextEvalutations.query.filter(
            TextEvalutations.evaluation_id.in_(evaluation_ids)
        ).all()
    )

    audio_by_eval = {}
    for a in audio_rows:
        audio_by_eval.setdefault(
            a.evaluation_id,
            {
                "id": a.id,
                "evaluation_id": a.evaluation_id,
                "emotionScore": a.emotionScore,
                "emotionLabel": a.emotionLabel,
            },
        )

    image_by_eval = {}
    for i in image_rows:
        image_by_eval.setdefault(
            i.evaluation_id,
            {
                "id": i.id,
                "evaluation_id": i.evaluation_id,
                "emotionScore": i.emotionScore,
                "emotionLabel": i.emotionLabel,
            },
        )

    text_by_eval = {}
    for t in text_rows:
        text_by_eval.setdefault(
            t.evaluation_id,
            {
                "id": t.id,
                "evaluation_id": t.evaluation_id,
                "emotionScore": t.emotionScore,
                "emotionLabel": t.emotionLabel,
            },
        )

    payload = []
    for e in evaluations:
        payload.append(
            {
                "evaluation": {
                    "id": e.id,
                    "user_id": e.user_id,
                    "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                    "emotionScore": e.emotionScore,
                    "emotionLabel": e.emotionLabel,
                    "suggestion": e.suggestion,
                },
                "audio": audio_by_eval.get(e.id),
                "image": image_by_eval.get(e.id),
                "text": text_by_eval.get(e.id),
            }
        )

    return jsonify(evaluations=payload), 200

@api_bp.post("/chat")
def chat_with_gemini():
    payload = request.get_json(silent=True) or {}
    message = payload.get("message") or request.args.get("message")
    chat_id = payload.get("chat_id") or request.args.get("chat_id")
    if not message:
        return _json_error("message is required in JSON body")

    try:
        if chat_id:
            chat = get_chat(chat_id)
            if not chat:
                return _json_error("chat_id not found", 404)
        else:
            chat_id, chat = create_chat_with_id()
        response = chat.send_message(message)
    except Exception as exc:
        return _json_error(f"Gemini error: {exc}", 500)

    response_text = _extract_gemini_text(response) or ""
    print(response_text)
    return jsonify(message=message, response=response_text, chat_id=chat_id), 200
