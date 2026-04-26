from datetime import datetime
from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.ext.mutable import MutableList


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    external_id = db.Column(db.String(64), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    consent_timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    likes = db.Column(MutableList.as_mutable(db.JSON), default=list, nullable=False)
    dislikes = db.Column(MutableList.as_mutable(db.JSON), default=list, nullable=False)

    

    # EVALUATION PREFERENCES
    pref_eval_image = db.Column(db.Boolean, default=True, nullable=False)
    pref_eval_audio = db.Column(db.Boolean, default=True, nullable=False)
    pref_eval_text = db.Column(db.Boolean, default=True, nullable=False)

    # EVALUATION PREFERENCES
    stor_cons_image = db.Column(db.Boolean, default=True, nullable=False)
    stor_cons_audio = db.Column(db.Boolean, default=True, nullable=False)
    stor_cons_text = db.Column(db.Boolean, default=True, nullable=False)

    streak = db.Column(db.Integer, default=0, nullable=True)

    sessions = db.relationship("Session", backref="user", cascade="all, delete-orphan")
    evaluations = db.relationship("Evaluation", backref="user", cascade="all, delete-orphan")

    # to set and check hasehd passwords
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Session(db.Model):
    __tablename__ = "sessions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_seen_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=True)

    # messages = db.relationship("Message", backref="session", cascade="all, delete-orphan")
    # extractions = db.relationship("Extraction", backref="session", cascade="all, delete-orphan")
    # predictions = db.relationship("Prediction", backref="session", cascade="all, delete-orphan")


class Message(db.Model):
    __tablename__ = "messages"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    role = db.Column(db.String(16), nullable=False)  # "user" or "assistant"
    textMessage = db.Column(db.Text, nullable=False)
    emotion_label = db.Column(db.String(32), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    

# class Extraction(db.Model):
#     __tablename__ = "extractions"
#     id = db.Column(db.Integer, primary_key=True)
#     session_id = db.Column(db.Integer, db.ForeignKey("sessions.id"), nullable=False)
#     json_data = db.Column(db.JSON, nullable=False)
#     timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


# class Prediction(db.Model):
#     __tablename__ = "predictions"
#     id = db.Column(db.Integer, primary_key=True)
#     session_id = db.Column(db.Integer, db.ForeignKey("sessions.id"), nullable=False)
#     modality = db.Column(db.String(16), nullable=False)  # "text" / "face" / "audio"
#     label = db.Column(db.String(32), nullable=False)
#     confidence = db.Column(db.Float, nullable=True)
#     raw_probs = db.Column(db.JSON, nullable=True)
#     timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

class Evaluation(db.Model):
    __tablename__ = "evaluations"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    label = db.Column(db.String(16), nullable=True)
    scores = db.Column(db.JSON, nullable=True)
    suggestion = db.Column(db.String(64))

    audio = db.relationship("AudioEvalutations", backref="evaluation", uselist=False, cascade="all, delete-orphan")
    image = db.relationship("ImageEvalutations", backref="evaluation", uselist=False, cascade="all, delete-orphan")
    text = db.relationship("TextEvalutations", backref="evaluation", uselist=False, cascade="all, delete-orphan") 


class AudioEvalutations(db.Model):
    __tablename__ = "audioEvalutations"
    id = db.Column(db.Integer, primary_key=True)
    evaluation_id = db.Column(db.Integer, db.ForeignKey("evaluations.id"))
    label = db.Column(db.String(16), nullable=False)
    scores = db.Column(db.JSON, nullable=False)
    data = db.Column(db.LargeBinary)

class ImageEvalutations(db.Model):
    __tablename__ = "imageEvalutations"
    id = db.Column(db.Integer, primary_key=True)
    evaluation_id = db.Column(db.Integer, db.ForeignKey("evaluations.id"))
    label = db.Column(db.String(16), nullable=False)
    scores = db.Column(db.JSON, nullable=False)
    data = db.Column(db.LargeBinary)

class TextEvalutations(db.Model):
    __tablename__ = "textEvalutations"
    id = db.Column(db.Integer, primary_key=True)
    evaluation_id = db.Column(db.Integer, db.ForeignKey("evaluations.id"))
    label = db.Column(db.String(16), nullable=False)
    scores = db.Column(db.JSON, nullable=False)
    data = db.Column(db.String(128))
