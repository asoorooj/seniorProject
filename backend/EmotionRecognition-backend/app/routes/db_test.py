import uuid
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

db_test_bp = Blueprint("db_test", __name__)

@db_test_bp.post("/test-db/insert")
def test_insert():
    u = User(external_id="test_user_1")
    db.session.add(u)
    db.session.commit()
    return jsonify(status="inserted", user_id=u.id), 201

@db_test_bp.get("/test-db/users")
def test_list_users():
    users = User.query.order_by(User.id.desc()).limit(10).all()
    return jsonify(
        users=[{"id": u.id, "external_id": u.external_id} for u in users]
    ), 200


@db_test_bp.post("/test-db/evaluation")
def test_insert_evaluation():

    evaluation = Evaluation(
        user_id=1,
        label="happy",
        scores={"happy": 0.9},
        suggestion="take a short walk",
    )
    db.session.add(evaluation)
    db.session.flush()

    audio = AudioEvalutations(
        evaluation_id=evaluation.id,
        label="calm",
        scores={"calm": 0.67},
        data=b"dummy_audio_bytes",
    )
    image = ImageEvalutations(
        evaluation_id=evaluation.id,
        label="joy",
        scores={"joy": 0.82},
        data=b"dummy_image_bytes",
    )
    text = TextEvalutations(
        evaluation_id=evaluation.id,
        label="neutral",
        scores={"neutral": 0.93},
        data="dummy text evaluation",
    )

    db.session.add_all([audio, image, text])
    db.session.commit()

    return jsonify(
        status="inserted",
        user_id=1,
        evaluation_id=evaluation.id,
        audio_id=audio.id,
        image_id=image.id,
        text_id=text.id,
    ), 201
