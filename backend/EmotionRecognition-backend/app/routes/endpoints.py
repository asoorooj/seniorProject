import base64
import os
import requests
import time
from datetime import datetime, timedelta, timezone
from flask import Blueprint, jsonify, request
from app.middleware.auth import auth_required
from flask import g

from app.extensions import db
from app.models.db_models import (
    AudioEvalutations,
    Evaluation,
    ImageEvalutations,
    Message,
    TextEvalutations,
    User,
)

from app.chatbot_service import (
    create_chat_with_id,
    get_chat_history,
    quickEval,
    statistic_analysis,
)
from app.ai_models import (
    FUSION_LABELS,
    predict_face,
    predict_fusion,
    predict_fusion_from_probs,
    predict_emotion_text,
    predict_audio_file,
)
from google.genai import types
from google import genai

api_bp = Blueprint("api", __name__)

CLOUDCONVERT_API_KEY = os.getenv("CLOUD_CONVERT_KEY")

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
        "preferences": {
            "eval_face": user.pref_eval_image,
            "eval_audio": user.pref_eval_audio,
            "eval_text": user.pref_eval_text,
        },
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

def _parse_mmddyyyy_date(value):
    # Expected: "MM/dd/yyyy" (e.g., "03/24/2026")
    if not value or not isinstance(value, str):
        return None
    try:
        dt = datetime.strptime(value, "%m/%d/%Y")
        return dt.replace(tzinfo=timezone.utc)
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


def _message_to_dict(message):
    return {
        "id": str(message.id),
        "userId": str(message.user_id),
        "isUser": message.role == "user",
        "textMessage": message.textMessage,
        "emotionLabel": message.emotion_label,
        "timestamp": message.timestamp.isoformat() if message.timestamp else None,
        "status": "sent",
    }


@api_bp.get("/users")
@auth_required
def list_users():
    users = User.query.all()
    
    return jsonify(users=[_user_to_dict(u) for u in users]), 200


@api_bp.get("/users/me")
@auth_required
def get_current_user():
    try:
        user = g.current_user
        print(user)
        count = Evaluation.query.filter_by(user_id=user.id).count()
        print(count)
        return jsonify({
            "user": {
                "id": user.id,
                "external_id": user.external_id,
                "created_at": user.created_at.isoformat(),
                "email": user.email,
                "consent_timestamp": user.consent_timestamp.isoformat(),
                "preferences":{
                    "pref_eval_image": user.pref_eval_image,
                    "pref_eval_audio": user.pref_eval_audio,
                    "pref_eval_text": user.pref_eval_text,
                },
                "storage_consent":{
                    "stor_cons_image": user.stor_cons_image,
                    "stor_cons_audio": user.stor_cons_audio,
                    "stor_cons_text": user.stor_cons_text,
                },                
                "streak": user.streak
            },
            "journal_count":count
        }), 200
    except Exception as e:
        print(e)
        return jsonify({"error", str(e)}), 500
    


@api_bp.get("/users/<int:user_id>")
@auth_required
def get_user(user_id):
    user = g.current_user
    user_id = user.id
    if user.id != user_id:
        return _json_error("Unauthorized", 403)
    if not user:
        return _json_error("User not found", 404)
    return jsonify(user=_user_to_dict(user)), 200




@api_bp.put("/users/<int:user_id>")
@auth_required
def update_user(user_id):
    user = g.current_user

    if user.id != user_id:
        return jsonify({"error": "unauthorized"}), 403
    payload = request.get_json(silent=True) or {}


    if "external_id" in payload:
        user.external_id = payload["external_id"]

    db.session.commit()
    return jsonify(user=_user_to_dict(user)), 200


@api_bp.put("/users/preferences")
@auth_required
def update_user_preferences():
    payload = request.get_json(silent=True) or {}
    user = g.current_user
    user_id = user.id
    if not user:
        return _json_error("User not found", 404)

    allowed_fields = ["pref_eval_image","pref_eval_audio","pref_eval_text",]

    updated = False
    for field in allowed_fields:
        if field in payload:
            setattr(user, field, bool(payload[field]))
            updated = True

    if not updated:
        return _json_error("no valid fields provided")

    db.session.commit()
    return jsonify(
        message="preferences updated",
        preferences={
            "pref_eval_image": user.pref_eval_image,
            "pref_eval_audio": user.pref_eval_audio,
            "pref_eval_text": user.pref_eval_text,
        },
    ), 200

@api_bp.put("/users/consent")
@auth_required
def update_user_consent():
    payload = request.get_json(silent=True) or {}
    user = g.current_user
    user_id = user.id
    if user.id != user_id:
        return jsonify({"error": "unauthorized"}), 403
    if not user:
        return _json_error("User not found", 404)

    allowed_fields = ["stor_cons_image","stor_cons_audio","stor_cons_text",]

    updated = False
    for field in allowed_fields:
        if field in payload:
            setattr(user, field, bool(payload[field]))
            updated = True

    if not updated:
        return _json_error("no valid fields provided")

    db.session.commit()
    return jsonify(
        message="preferences updated",
        storage_consent={
            "stor_cons_image": user.stor_cons_image,
            "stor_cons_audio": user.stor_cons_audio,
            "stor_cons_text": user.stor_cons_text,
        },
    ), 200



@api_bp.delete("/users/<int:user_id>")
@auth_required
def delete_user(user_id):
    user = g.current_user
    if user.id != user_id:
        return jsonify({"error": "unauthorized"}), 403
    if not user:
        return _json_error("User not found", 404)

    db.session.delete(user)
    db.session.commit()
    return jsonify(status="deleted"), 200

@api_bp.get("/evaluation/by-date")
@auth_required
def test_get_evaluations_by_date():
    user = g.current_user
    user_id = user.id
    start_date_raw = request.args.get("start_date")
    if not user_id:
        return jsonify(error="user_id is required"), 400
    if not start_date_raw:
        return jsonify(error="start_date is required"), 400

    start_dt = _parse_mmddyyyy_date(start_date_raw)
    if not start_dt:
        start_dt = _parse_js_date(start_date_raw)
    if not start_dt:
        return jsonify(error="start_date format is invalid (use MM/dd/yyyy)"), 400

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
                "scores": a.scores,
                "label": a.label,
            },
        )

    image_by_eval = {}
    for i in image_rows:
        image_by_eval.setdefault(
            i.evaluation_id,
            {
                "id": i.id,
                "evaluation_id": i.evaluation_id,
                "scores": i.scores,
                "label": i.label,
            },
        )

    text_by_eval = {}
    for t in text_rows:
        text_by_eval.setdefault(
            t.evaluation_id,
            {
                "id": t.id,
                "evaluation_id": t.evaluation_id,
                "scores": t.scores,
                "label": t.label,
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
                    "scores": e.scores,
                    "label": e.label,
                    "suggestion": e.suggestion,
                },
                "audio": audio_by_eval.get(e.id),
                "image": image_by_eval.get(e.id),
                "text": text_by_eval.get(e.id),
            }
        )

    return jsonify(evaluations=payload), 200

@api_bp.get("/evaluation/by-month")
@auth_required
def get_evaluations_by_month():
    try:
        user_id = g.current_user.id
        month = request.args.get("month", type=int)  # 0-11

        if month is None or month < 0 or month > 11:
            return jsonify(error="month must be between 0 and 11"), 400

        # Assume current year (you can extend later)
        year = datetime.now().year

        # Convert JS-style month (0-11) → Python (1-12)
        month_num = month + 1

        # Get first and last day of month
        start_date = datetime(year, month_num, 1, tzinfo=timezone.utc)

        last_day = calendar.monthrange(year, month_num)[1]
        end_date = datetime(year, month_num, last_day, 23, 59, 59, tzinfo=timezone.utc)

        # Query evaluations in range
        evaluations = (
            Evaluation.query
            .filter_by(user_id=user_id)
            .filter(Evaluation.timestamp >= start_date)
            .filter(Evaluation.timestamp <= end_date)
            .order_by(Evaluation.id.desc())
            .all()
        )

        if not evaluations:
            return jsonify(evaluations=[]), 200

        evaluation_ids = [e.id for e in evaluations]

        # Fetch related rows
        audio_rows = AudioEvalutations.query.filter(
            AudioEvalutations.evaluation_id.in_(evaluation_ids)
        ).all()

        image_rows = ImageEvalutations.query.filter(
            ImageEvalutations.evaluation_id.in_(evaluation_ids)
        ).all()

        text_rows = TextEvalutations.query.filter(
            TextEvalutations.evaluation_id.in_(evaluation_ids)
        ).all()

        # Map by evaluation_id
        audio_by_eval = {
            a.evaluation_id: {
                "id": a.id,
                "evaluation_id": a.evaluation_id,
                "scores": a.scores,
                "label": a.label,
            }
            for a in audio_rows
        }

        image_by_eval = {
            i.evaluation_id: {
                "id": i.id,
                "evaluation_id": i.evaluation_id,
                "scores": i.scores,
                "label": i.label,
            }
            for i in image_rows
        }

        text_by_eval = {
            t.evaluation_id: {
                "id": t.id,
                "evaluation_id": t.evaluation_id,
                "scores": t.scores,
                "label": t.label,
            }
            for t in text_rows
        }

        # Build response
        payload = [
            {
                "evaluation": {
                    "id": e.id,
                    "user_id": e.user_id,
                    "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                    "scores": e.scores,
                    "label": e.label,
                    "suggestion": e.suggestion,
                },
                "audio": audio_by_eval.get(e.id),
                "image": image_by_eval.get(e.id),
                "text": text_by_eval.get(e.id),
            }
            for e in evaluations
        ]

        return jsonify(evaluations=payload), 200

    except Exception as e:
        print(e)
        return jsonify(error="there was an error"), 500

@api_bp.post("/recieve_eval_data")
@auth_required
def recieve_eval():
    user = g.current_user
    user_id = user.id
    try:
        audio_file_suffix = ".wav"

        if request.mimetype and request.mimetype.startswith("multipart/form-data"):
            audio_file = request.files.get("audio")
            image_file = request.files.get("image")
            text = request.form.get("text")

            if not audio_file or not image_file or text is None:
                return jsonify({"error": "Missing required fields"}), 400

            audio_bytes = audio_file.read()
            image_bytes = image_file.read()

            _, ext = os.path.splitext(audio_file.filename or "")
            if ext:
                audio_file_suffix = ext
        elif request.is_json:
            data = request.get_json()

            if not data:
                return jsonify({"error": "No JSON body provided"}), 400

            # Extract fields
            audio_b64 = data.get("audio")
            image_b64 = data.get("image")
            text = data.get("text")

            if not audio_b64 or not image_b64 or text is None:
                return jsonify({"error": "Missing required fields"}), 400

            # Decode base64 -> bytes
            audio_bytes = base64.b64decode(audio_b64)
            image_bytes = base64.b64decode(image_b64)
        else:
            return jsonify({"error": "Unsupported Media Type. Use multipart/form-data or application/json."}), 415

        # --- YOUR LOGIC HERE ---
        print("Audio bytes length:", len(audio_bytes))
        print("Image bytes length:", len(image_bytes))
        print("Text:", text)

        model_outputs = predict_fusion(
            text=text,
            image_bytes=image_bytes,
            audio_bytes=audio_bytes,
            audio_file_suffix=audio_file_suffix,
        )

        fusion_output = model_outputs["fusion"]
        label = fusion_output["label"]
        probabilities = fusion_output["probs"]

        print(model_outputs)

        probs_list = [
            {"label": lbl, "probability": float(prob)}
            for lbl, prob in zip(FUSION_LABELS, probabilities)
        ]
        quick_message = quickEval(label, probs_list)

        # Example response
        return jsonify({
            "message": "Data received successfully",
            "userId":user_id,
            "label": label,
            "probabilities": probs_list,
            "quick_message": quick_message,
            "audio_size": len(audio_bytes),
            "image_size": len(image_bytes),
            "text": text,
            "MISC_DATA": {
                "fusion": {
                    "label": fusion_output["label"],
                    "probabilities": probs_list,
                },
                "text": {
                    "label": model_outputs["text"]["label"],
                    "probabilities": [
                        {"label": lbl, "probability": float(prob)}
                        for lbl, prob in zip(
                            model_outputs["text"]["labels"],
                            model_outputs["text"]["probs"],
                        )
                    ],
                },
                "image": {
                    "label": model_outputs["image"]["label"],
                    "probabilities": [
                        {"label": lbl, "probability": float(prob)}
                        for lbl, prob in zip(
                            model_outputs["image"]["labels"],
                            model_outputs["image"]["probs"],
                        )
                    ],
                },
                "audio": {
                    "label": model_outputs["audio"]["label"],
                    "probabilities": [
                        {"label": lbl, "probability": float(prob)}
                        for lbl, prob in zip(
                            model_outputs["audio"]["labels"],
                            model_outputs["audio"]["probs"],
                        )
                    ],
                },
                "confidences": model_outputs["confidences"],
            },
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
def _scores_with_raw(labels, probs, raw_label=None):
    scores = {lbl: float(prob) for lbl, prob in zip(labels, probs)}
    if raw_label is not None:
        scores["_raw_label"] = raw_label
    return scores

def _normalize_scores_for_json(scores):
    if scores is None:
        return None
    if isinstance(scores, dict):
        return {k: float(v) if k != "_raw_label" else v for k, v in scores.items()}
    # numpy arrays / lists
    try:
        return [float(x) for x in scores]
    except Exception:
        return scores

def _vector_to_scores_dict(vec):
    if vec is None:
        return None
    return {lbl: float(prob) for lbl, prob in zip(FUSION_LABELS, vec)}

def save_full_evaluation(
    user_id,
    model_outputs,
    text_data,
    image_bytes,
    audio_bytes,
    suggestion=None
): # {user_id, model_outputs, text, image, audio}
    try:
        fusion_output = model_outputs["fusion"]
        text_output = model_outputs["text"]
        image_output = model_outputs["image"]
        audio_output = model_outputs["audio"]

        overall_label = fusion_output["label"]
        overall_scores = _scores_with_raw(
            fusion_output["labels"],
            fusion_output["probs"],
        )

        text_label = text_output["label"]
        text_scores = _scores_with_raw(
            text_output["labels"],
            text_output["probs"],
            text_output.get("raw_label"),
        )

        image_label = image_output["label"]
        image_scores = _scores_with_raw(
            image_output["labels"],
            image_output["probs"],
            image_output.get("raw_label"),
        )

        audio_label = audio_output["label"]
        audio_scores = _scores_with_raw(
            audio_output["labels"],
            audio_output["probs"],
            audio_output.get("raw_label"),
        )

        # --- 1. Create main evaluation ---
        evaluation = Evaluation(
            user_id=user_id,
            label=overall_label,
            scores=overall_scores,
            suggestion=suggestion,
            timestamp=datetime.utcnow()
        )

        db.session.add(evaluation)
        db.session.flush()  # 👈 gets evaluation.id BEFORE commit

        # --- 2. Text ---
        text_eval = TextEvalutations(
            evaluation_id=evaluation.id,
            label=text_label,
            scores=text_scores,
            data=text_data
        )

        # --- 3. Image ---
        image_eval = ImageEvalutations(
            evaluation_id=evaluation.id,
            label=image_label,
            scores=image_scores,
            data=image_bytes
        )

        # --- 4. Audio ---
        audio_eval = AudioEvalutations(
            evaluation_id=evaluation.id,
            label=audio_label,
            scores=audio_scores,
            data=audio_bytes
        )

        # --- 5. Save all ---
        db.session.add_all([text_eval, image_eval, audio_eval])
        db.session.commit()

        return {
            "status": "success",
            "evaluation_id": evaluation.id
        }

    except Exception as e:
        db.session.rollback()
        return {
            "status": "error",
            "message": str(e)
        }
    
@api_bp.post("/startevaluation")
@auth_required
def start_evaluation():
    payload = request.get_json(silent=True) or {}
    user = g.current_user
    user_id = user.id
    try:
        evaluation = Evaluation(
            user_id=user_id,
            label=None,
            scores=None,
            suggestion=None,
            timestamp=datetime.utcnow()
        )
        db.session.add(evaluation)
        db.session.flush() 
        db.session.commit() 
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "failed to create an evaluation"
        }), 500
    return jsonify({
        "evaluation_id":evaluation.id,
        "status": "succesfully created evaluation",
    })

@api_bp.post("/startevaluation_face")
@auth_required
def start_evaluation_face():
    payload = request.get_json(silent=True) or {}
    user = g.current_user
    evaluation_id = payload.get("evaluationId")
    evaluation = Evaluation.query.get(evaluation_id)

    if not evaluation or evaluation.user_id != user.id:
        return jsonify({"error": "unauthorized"}), 403
    try:
        image_bytes = None
        if request.mimetype and request.mimetype.startswith("multipart/form-data"):
            image_file = request.files.get("image")
            image_bytes = image_file.read() if image_file else None
        elif request.is_json:
            image_b64 = payload.get("image")
            if image_b64:
                    if "," in image_b64:
                        image_b64 = image_b64.split(",")[1]
                    image_b64 = image_b64 + '=' * (-len(image_b64) % 4)
                    image_bytes = base64.b64decode(image_b64)
        pred, probs, vec = predict_face(image_bytes)
        image_eval = ImageEvalutations.query.filter_by(
            evaluation_id=evaluation_id
        ).first()
        scores = _vector_to_scores_dict(vec)
        if image_eval:
            image_eval.label = pred
            image_eval.scores = scores
            image_eval.data = None
        else:
            image_eval = ImageEvalutations(
                evaluation_id=evaluation_id,
                label=pred,
                scores=scores,
                data=None
            )
            db.session.add(image_eval)
        db.session.flush() 
        db.session.commit() 
    except Exception as e:        
        db.session.rollback()
        print("ERROR:", str(e)) 
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    return jsonify({
        "evaluation_id":evaluation_id,
        "status": "succesfully created evaluation",
        "image_label":image_eval.label,
        "image_scores":image_eval.scores,
    })

@api_bp.post("/startevaluation_text")
@auth_required
def start_eval_text():
    payload = request.get_json(silent=True) or {}
    user = g.current_user
    
    evaluation_id = payload.get("evaluationId")
    text = payload.get("text")
    evaluation = Evaluation.query.get(evaluation_id)
    if not evaluation or evaluation.user_id != user.id:
        return jsonify({"error": "unauthorized"}), 403
    
    try:
        pred, probs, vec = predict_emotion_text(text)
        text_eval = TextEvalutations.query.filter_by(
            evaluation_id=evaluation_id
        ).first()
        scores = _vector_to_scores_dict(vec)
        if text_eval:
            text_eval.label = pred
            text_eval.scores = scores
            text_eval.data = text
        else:
            text_eval = TextEvalutations(
                evaluation_id=evaluation_id,
                label=pred,
                scores=scores,
                data=text
            )
            db.session.add(text_eval)
        db.session.flush()
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "failed to create a text evaluation"
        }), 500
    return jsonify({
        "evaluation_id": evaluation_id,
        "status": "succesfully created evaluation",
        "text_label":text_eval.label,
        "text_scores":text_eval.scores,
    })

@api_bp.post("/startevaluation_audio")
@auth_required
def start_eval_audio():
    try:
        payload = request.get_json(silent=True) or {}
        user = g.current_user
        evaluation_id = payload.get("evaluationId") or request.form.get("evaluationId")
        evaluation = Evaluation.query.get(evaluation_id)
        print(evaluation_id)
        print(evaluation)
        if not evaluation or evaluation.user_id != user.id:
            return jsonify({"error": "unauthorized"}), 403
        try:
            audio_bytes = None
            audio_file_suffix = ".wav"
            if request.mimetype and request.mimetype.startswith("multipart/form-data"):
                audio_file = request.files.get("audio")
                if audio_file:
                    audio_bytes = audio_file.read()
                    _, ext = os.path.splitext(audio_file.filename or "")
                    if ext:
                        audio_file_suffix = ext
            elif request.is_json:
                audio_b64 = payload.get("audio")
                if audio_b64:
                    audio_bytes = base64.b64decode(audio_b64)

            # ❗ SAFETY CHECK
            if not audio_bytes:
                return jsonify({
                    "status": "error",
                    "message": "No audio provided"
                }), 400
            if not evaluation_id:
                return jsonify({"status": "error", "message": "evaluationId is required"}), 400
            evaluation_id = int(evaluation_id)

            # 🔥 M4A → CLOUDCONVERT PATH
            if audio_file_suffix == ".m4a":
                print("converting")
                audio_bytes = convert_m4a_bytes_to_wav_bytes(audio_bytes)
                audio_file_suffix = ".wav"

            pred, probs, _, _, vec = predict_audio_file(audio_bytes, file_suffix=audio_file_suffix)
            audio_eval = AudioEvalutations.query.filter_by(
                evaluation_id=evaluation_id
            ).first()
            scores = _vector_to_scores_dict(vec)
            if audio_eval:
                audio_eval.label = pred
                audio_eval.scores = scores
                audio_eval.data = None
            else:
                audio_eval = AudioEvalutations(
                    evaluation_id=evaluation_id,
                    label=pred,
                    scores=scores,
                    data=None
                )
                db.session.add(audio_eval)
            db.session.flush()
            db.session.commit()
        except Exception:
            db.session.rollback()
            return jsonify({
                "status": "error",
                "message": "failed to create an audio evaluation"
            }), 500
        return jsonify({
            "evaluation_id": evaluation_id,
            "status": "succesfully created evaluation",
            "audio_label":audio_eval.label,
            "audio_scores":audio_eval.scores,
        })
    except Exception as e:
        print(e)
        return jsonify({
            "error": e,
        })

def _scores_to_fusion_vector(scores):
    if scores is None:
        return None
    if isinstance(scores, list):
        return scores
    if isinstance(scores, dict):
        return [float(scores.get(lbl, 0.0)) for lbl in FUSION_LABELS]
    return None

@api_bp.post("/endevaluation")
@auth_required
def end_evaluation():
    payload = request.get_json(silent=True) or {}
    evaluation_id = payload.get("evaluationId")
    evaluation = Evaluation.query.get(evaluation_id)
    user = g.current_user

    if not evaluation_id:
        return jsonify({"error": "evaluationId is required"}), 400

    if not evaluation:
        return jsonify({"error": "evaluation not found"}), 404

    if evaluation.user_id != user.id:
        return jsonify({"error": "unauthorized"}), 403

    evaluation = Evaluation.query.get(evaluation_id)
    if not evaluation:
        return jsonify({"error": "evaluation not found"}), 404

    text_eval = TextEvalutations.query.filter_by(evaluation_id=evaluation_id).first()
    image_eval = ImageEvalutations.query.filter_by(evaluation_id=evaluation_id).first()
    audio_eval = AudioEvalutations.query.filter_by(evaluation_id=evaluation_id).first()

    if not (text_eval or image_eval or audio_eval):
        try:
            db.session.delete(evaluation)
            db.session.commit()
        except Exception:
            db.session.rollback()
            return jsonify({"status": "error", "message": "failed to delete evaluation"}), 500
        return jsonify({
            "status": "deleted",
            "message": "no sub evaluations found",
        }), 200

    text_probs = _scores_to_fusion_vector(getattr(text_eval, "scores", None)) if text_eval else None
    image_probs = _scores_to_fusion_vector(getattr(image_eval, "scores", None)) if image_eval else None
    audio_probs = _scores_to_fusion_vector(getattr(audio_eval, "scores", None)) if audio_eval else None

    try:
        fusion_output = predict_fusion_from_probs(
            text_probs=text_probs,
            image_probs=image_probs,
            audio_probs=audio_probs,
        )
        fusion_probs = fusion_output["fusion"]["probs"]
        fusion_label = fusion_output["fusion"]["label"]
        fusion_scores = {lbl: float(prob) for lbl, prob in zip(FUSION_LABELS, fusion_probs)}

        suggestion = quickEval(fusion_label, fusion_scores)

        evaluation.label = fusion_label
        evaluation.scores = fusion_scores
        evaluation.suggestion = suggestion

        now = datetime.now()
        yesterday_start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_end = yesterday_start.replace(hour=23, minute=59, second=59, microsecond=999999)
        exists = Evaluation.query.filter(
            Evaluation.user_id == user.id,
            Evaluation.timestamp >= yesterday_start,
            Evaluation.timestamp <= yesterday_end,
        ).first is not None
        print(exists)
        if(not exists):
            user.streak = 0

        user.streak = user.streak + 1

        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

    return jsonify({
        "status": "updated",
        "evaluation_id": evaluation_id,
        "label": fusion_label,
        "scores": fusion_scores,
        "suggestion": suggestion,
    }), 200


@api_bp.delete("/evaluation/<int:evaluation_id>")
@auth_required
def cancel_evaluation(evaluation_id):
    evaluation = Evaluation.query.get(evaluation_id)
    if not evaluation:
        return jsonify({"error": "evaluation not found"}), 404

    try:
        db.session.delete(evaluation)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"status": "error", "message": "failed to delete evaluation"}), 500

    return jsonify({
        "status": "deleted",
        "evaluation_id": evaluation_id,
    }), 200

@api_bp.post("/chat")
@auth_required
def chat_with_gemini():
    payload = request.get_json(silent=True) or {}
    message_payload = payload.get("message")
    user = g.current_user
    user_id = user.id
    if not isinstance(message_payload, dict):
        return _json_error("message is required and must be an object", 400)
    text_message = message_payload.get("textMessage")
    if not text_message:
        return _json_error("message.textMessage is required", 400)
    try:
        if not user_id:
            return _json_error("userId is required with auth", 400)
        chat = create_chat_with_id(user_id)

        user_emotion_label, _, _ = predict_emotion_text(text_message)
        user_message = Message(
            user_id=int(user_id),
            role="user",
            textMessage=text_message,
            emotion_label=user_emotion_label,
        )
        db.session.add(user_message)
        db.session.flush()

        response = chat.send_message(text_message)
    except Exception as exc:
        db.session.rollback()
        return _json_error(f"Gemini error: {exc}", 500)

    response_text = _extract_gemini_text(response) or ""
    assistant_message = Message(
        user_id=int(user_id),
        role="assistant",
        textMessage=response_text,
    )
    db.session.add(assistant_message)
    db.session.commit()
    return jsonify(
        chat_id=str(user_id),
        user_message=_message_to_dict(user_message),
        response_message=_message_to_dict(assistant_message),
    ), 200


@api_bp.get("/chat/history")
@auth_required
def get_chat_history_endpoint():
    user = g.current_user
    user_id = user.id
    before_id = request.args.get("before_id", type=int)
    limit = request.args.get("limit", type=int) or 20

    if not user_id:
        return _json_error("user_id is required", 400)

    if limit <= 0 or limit > 50:
        return _json_error("limit must be between 1 and 50", 400)

    payload = get_chat_history(user_id, limit=limit, before_id=before_id)
    return jsonify(payload), 200

def convert_m4a_bytes_to_wav_bytes(m4a_bytes: bytes) -> bytes:
    print("convert function")
    try:
        headers = {
            "Authorization": f"Bearer {CLOUDCONVERT_API_KEY}",
            "Content-Type": "application/json",
        }

        # 1. Create upload task
        job_payload = {
            "tasks": {
                "upload-my-file": {
                    "operation": "import/upload"
                },
                "convert-my-file": {
                    "operation": "convert",
                    "input": "upload-my-file",
                    "output_format": "wav"
                },
                "export-my-file": {
                    "operation": "export/url",
                    "input": "convert-my-file"
                }
            }
        }

        job_res = requests.post(
            "https://api.cloudconvert.com/v2/jobs",
            json=job_payload,
            headers=headers
        )

        print(job_res)

        job = job_res.json()["data"]
        tasks = job["tasks"]


        upload_task = next(t for t in tasks if t["name"] == "upload-my-file")
        upload_url = upload_task["result"]["form"]["url"]
        upload_fields = upload_task["result"]["form"]["parameters"]

        # 2. Upload file bytes to CloudConvert
        files = {
            "file": ("audio.m4a", m4a_bytes)
        }

        upload_res = requests.post(
            upload_url,
            data=upload_fields,
            files=files
        )

        if upload_res.status_code not in [200, 201, 204]:
            raise Exception("Upload to CloudConvert failed")

        job_id = job["id"]

        # 3. Poll job until finished
        while True:
            job_status = requests.get(
                f"https://api.cloudconvert.com/v2/jobs/{job_id}",
                headers=headers
            ).json()["data"]

            status = job_status["status"]

            if status == "finished":
                break
            if status == "error":
                raise Exception("CloudConvert job failed")

            time.sleep(2)

        # 4. Get export URL
        export_task = next(
            t for t in job_status["tasks"]
            if t["name"] == "export-my-file"
        )

        file_url = export_task["result"]["files"][0]["url"]

        # 5. Download WAV file
        wav_response = requests.get(file_url)

        if wav_response.status_code != 200:
            raise Exception("Failed to download WAV file")
    except Exception as e:
        print(e)
        raise Exception(e)

    return wav_response.content

@api_bp.post("/chat/statistics-analysis")
@auth_required
def statisitc_analysis():
    user = g.current_user

    payload = request.get_json(silent=True) or {}
    statistics = payload["statistics"]

    message = statistic_analysis(statistics)

    return jsonify({
        "comment":message
    }), 200