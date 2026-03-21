from datetime import datetime

from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models.db_models import Extraction, Message, Prediction, Session, User

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


def _session_to_dict(session):
    return {
        "id": session.id,
        "user_id": session.user_id,
        "started_at": session.started_at.isoformat(),
        "last_seen_at": session.last_seen_at.isoformat(),
    }


def _message_to_dict(message):
    return {
        "id": message.id,
        "session_id": message.session_id,
        "role": message.role,
        "content": message.content,
        "timestamp": message.timestamp.isoformat(),
    }


def _extraction_to_dict(extraction):
    return {
        "id": extraction.id,
        "session_id": extraction.session_id,
        "json_data": extraction.json_data,
        "timestamp": extraction.timestamp.isoformat(),
    }


def _prediction_to_dict(prediction):
    return {
        "id": prediction.id,
        "session_id": prediction.session_id,
        "modality": prediction.modality,
        "label": prediction.label,
        "confidence": prediction.confidence,
        "raw_probs": prediction.raw_probs,
        "timestamp": prediction.timestamp.isoformat(),
    }


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


@api_bp.get("/sessions")
def list_sessions():
    sessions = Session.query.order_by(Session.id.asc()).all()
    return jsonify(sessions=[_session_to_dict(s) for s in sessions]), 200


@api_bp.get("/sessions/<int:session_id>")
def get_session(session_id):
    session = Session.query.get(session_id)
    if not session:
        return _json_error("Session not found", 404)
    return jsonify(session=_session_to_dict(session)), 200


@api_bp.post("/sessions")
def create_session():
    payload = request.get_json(silent=True) or {}
    user_id = payload.get("user_id")
    if not user_id:
        return _json_error("user_id is required")

    started_at, err = _parse_iso_dt(payload.get("started_at"), "started_at")
    if err:
        return _json_error(err)

    last_seen_at, err = _parse_iso_dt(payload.get("last_seen_at"), "last_seen_at")
    if err:
        return _json_error(err)

    session = Session(user_id=user_id)
    if started_at:
        session.started_at = started_at
    if last_seen_at:
        session.last_seen_at = last_seen_at

    db.session.add(session)
    db.session.commit()
    return jsonify(session=_session_to_dict(session)), 201


@api_bp.put("/sessions/<int:session_id>")
def update_session(session_id):
    payload = request.get_json(silent=True) or {}
    session = Session.query.get(session_id)
    if not session:
        return _json_error("Session not found", 404)

    if "user_id" in payload:
        session.user_id = payload["user_id"]

    if "started_at" in payload:
        started_at, err = _parse_iso_dt(payload.get("started_at"), "started_at")
        if err:
            return _json_error(err)
        if started_at:
            session.started_at = started_at

    if "last_seen_at" in payload:
        last_seen_at, err = _parse_iso_dt(payload.get("last_seen_at"), "last_seen_at")
        if err:
            return _json_error(err)
        if last_seen_at:
            session.last_seen_at = last_seen_at

    db.session.commit()
    return jsonify(session=_session_to_dict(session)), 200


@api_bp.delete("/sessions/<int:session_id>")
def delete_session(session_id):
    session = Session.query.get(session_id)
    if not session:
        return _json_error("Session not found", 404)

    db.session.delete(session)
    db.session.commit()
    return jsonify(status="deleted"), 200


@api_bp.get("/messages")
def list_messages():
    messages = Message.query.order_by(Message.id.asc()).all()
    return jsonify(messages=[_message_to_dict(m) for m in messages]), 200


@api_bp.get("/messages/<int:message_id>")
def get_message(message_id):
    message = Message.query.get(message_id)
    if not message:
        return _json_error("Message not found", 404)
    return jsonify(message=_message_to_dict(message)), 200


@api_bp.post("/messages")
def create_message():
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    role = payload.get("role")
    content = payload.get("content")
    if not session_id or not role or content is None:
        return _json_error("session_id, role, and content are required")

    timestamp, err = _parse_iso_dt(payload.get("timestamp"), "timestamp")
    if err:
        return _json_error(err)

    message = Message(session_id=session_id, role=role, content=content)
    if timestamp:
        message.timestamp = timestamp

    db.session.add(message)
    db.session.commit()
    return jsonify(message=_message_to_dict(message)), 201


@api_bp.put("/messages/<int:message_id>")
def update_message(message_id):
    payload = request.get_json(silent=True) or {}
    message = Message.query.get(message_id)
    if not message:
        return _json_error("Message not found", 404)

    if "session_id" in payload:
        message.session_id = payload["session_id"]
    if "role" in payload:
        message.role = payload["role"]
    if "content" in payload:
        message.content = payload["content"]

    if "timestamp" in payload:
        timestamp, err = _parse_iso_dt(payload.get("timestamp"), "timestamp")
        if err:
            return _json_error(err)
        if timestamp:
            message.timestamp = timestamp

    db.session.commit()
    return jsonify(message=_message_to_dict(message)), 200


@api_bp.delete("/messages/<int:message_id>")
def delete_message(message_id):
    message = Message.query.get(message_id)
    if not message:
        return _json_error("Message not found", 404)

    db.session.delete(message)
    db.session.commit()
    return jsonify(status="deleted"), 200


@api_bp.get("/extractions")
def list_extractions():
    extractions = Extraction.query.order_by(Extraction.id.asc()).all()
    return jsonify(extractions=[_extraction_to_dict(e) for e in extractions]), 200


@api_bp.get("/extractions/<int:extraction_id>")
def get_extraction(extraction_id):
    extraction = Extraction.query.get(extraction_id)
    if not extraction:
        return _json_error("Extraction not found", 404)
    return jsonify(extraction=_extraction_to_dict(extraction)), 200


@api_bp.post("/extractions")
def create_extraction():
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    json_data = payload.get("json_data")
    if not session_id or json_data is None:
        return _json_error("session_id and json_data are required")

    timestamp, err = _parse_iso_dt(payload.get("timestamp"), "timestamp")
    if err:
        return _json_error(err)

    extraction = Extraction(session_id=session_id, json_data=json_data)
    if timestamp:
        extraction.timestamp = timestamp

    db.session.add(extraction)
    db.session.commit()
    return jsonify(extraction=_extraction_to_dict(extraction)), 201


@api_bp.put("/extractions/<int:extraction_id>")
def update_extraction(extraction_id):
    payload = request.get_json(silent=True) or {}
    extraction = Extraction.query.get(extraction_id)
    if not extraction:
        return _json_error("Extraction not found", 404)

    if "session_id" in payload:
        extraction.session_id = payload["session_id"]
    if "json_data" in payload:
        extraction.json_data = payload["json_data"]

    if "timestamp" in payload:
        timestamp, err = _parse_iso_dt(payload.get("timestamp"), "timestamp")
        if err:
            return _json_error(err)
        if timestamp:
            extraction.timestamp = timestamp

    db.session.commit()
    return jsonify(extraction=_extraction_to_dict(extraction)), 200


@api_bp.delete("/extractions/<int:extraction_id>")
def delete_extraction(extraction_id):
    extraction = Extraction.query.get(extraction_id)
    if not extraction:
        return _json_error("Extraction not found", 404)

    db.session.delete(extraction)
    db.session.commit()
    return jsonify(status="deleted"), 200


@api_bp.get("/predictions")
def list_predictions():
    predictions = Prediction.query.order_by(Prediction.id.asc()).all()
    return jsonify(predictions=[_prediction_to_dict(p) for p in predictions]), 200


@api_bp.get("/predictions/<int:prediction_id>")
def get_prediction(prediction_id):
    prediction = Prediction.query.get(prediction_id)
    if not prediction:
        return _json_error("Prediction not found", 404)
    return jsonify(prediction=_prediction_to_dict(prediction)), 200


@api_bp.post("/predictions")
def create_prediction():
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    modality = payload.get("modality")
    label = payload.get("label")
    if not session_id or not modality or not label:
        return _json_error("session_id, modality, and label are required")

    timestamp, err = _parse_iso_dt(payload.get("timestamp"), "timestamp")
    if err:
        return _json_error(err)

    prediction = Prediction(
        session_id=session_id,
        modality=modality,
        label=label,
        confidence=payload.get("confidence"),
        raw_probs=payload.get("raw_probs"),
    )
    if timestamp:
        prediction.timestamp = timestamp

    db.session.add(prediction)
    db.session.commit()
    return jsonify(prediction=_prediction_to_dict(prediction)), 201


@api_bp.put("/predictions/<int:prediction_id>")
def update_prediction(prediction_id):
    payload = request.get_json(silent=True) or {}
    prediction = Prediction.query.get(prediction_id)
    if not prediction:
        return _json_error("Prediction not found", 404)

    if "session_id" in payload:
        prediction.session_id = payload["session_id"]
    if "modality" in payload:
        prediction.modality = payload["modality"]
    if "label" in payload:
        prediction.label = payload["label"]
    if "confidence" in payload:
        prediction.confidence = payload["confidence"]
    if "raw_probs" in payload:
        prediction.raw_probs = payload["raw_probs"]

    if "timestamp" in payload:
        timestamp, err = _parse_iso_dt(payload.get("timestamp"), "timestamp")
        if err:
            return _json_error(err)
        if timestamp:
            prediction.timestamp = timestamp

    db.session.commit()
    return jsonify(prediction=_prediction_to_dict(prediction)), 200


@api_bp.delete("/predictions/<int:prediction_id>")
def delete_prediction(prediction_id):
    prediction = Prediction.query.get(prediction_id)
    if not prediction:
        return _json_error("Prediction not found", 404)

    db.session.delete(prediction)
    db.session.commit()
    return jsonify(status="deleted"), 200


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
