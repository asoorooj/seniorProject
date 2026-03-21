from datetime import datetime
from app.extensions import db


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    external_id = db.Column(db.String(64), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Session(db.Model):
    __tablename__ = "sessions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_seen_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Message(db.Model):
    __tablename__ = "messages"
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("sessions.id"), nullable=False)
    role = db.Column(db.String(16), nullable=False)  # "user" or "assistant"
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Extraction(db.Model):
    __tablename__ = "extractions"
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("sessions.id"), nullable=False)
    json_data = db.Column(db.JSON, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Prediction(db.Model):
    __tablename__ = "predictions"
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("sessions.id"), nullable=False)
    modality = db.Column(db.String(16), nullable=False)  # "text" / "face" / "audio"
    label = db.Column(db.String(32), nullable=False)
    confidence = db.Column(db.Float, nullable=True)
    raw_probs = db.Column(db.JSON, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

class Evaluation(db.Model):
    __tablename__ = "evaluations"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    emotionScore = db.Column(db.Integer, nullable=False)
    emotionLabel = db.Column(db.String(8), nullable=False)
    suggestion = db.Column(db.String(64))

class AudioEvalutations(db.Model):
    __tablename__ = "audioEvalutations"
    id = db.Column(db.Integer, primary_key=True)
    evaluation_id = db.Column(db.Integer, db.ForeignKey("evaluations.id"))
    emotionScore = db.Column(db.Integer, nullable=False)
    emotionLabel = db.Column(db.String(8), nullable=False)
    data = db.Column(db.LargeBinary)

class ImageEvalutations(db.Model):
    __tablename__ = "imageEvalutations"
    id = db.Column(db.Integer, primary_key=True)
    evaluation_id = db.Column(db.Integer, db.ForeignKey("evaluations.id"))
    emotionScore = db.Column(db.Integer, nullable=False)
    emotionLabel = db.Column(db.String(8), nullable=False)
    data = db.Column(db.LargeBinary)

class TextEvalutations(db.Model):
    __tablename__ = "textEvalutations"
    id = db.Column(db.Integer, primary_key=True)
    evaluation_id = db.Column(db.Integer, db.ForeignKey("evaluations.id"))
    emotionScore = db.Column(db.Integer, nullable=False)
    emotionLabel = db.Column(db.String(8), nullable=False)
    data = db.Column(db.String(128))
