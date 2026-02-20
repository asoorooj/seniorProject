from flask import Blueprint, jsonify
from app.extensions import db
from app.models.db_models import User

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
