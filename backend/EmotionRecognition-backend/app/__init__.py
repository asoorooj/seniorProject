import os
from flask import Flask, jsonify
from dotenv import load_dotenv

from app.extensions import cors, db, migrate




def create_app():
    load_dotenv()

    
    flask_app = Flask(__name__)  # ✅ rename to avoid name collisions

    # Config
    flask_app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    flask_app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    flask_app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    flask_app.config["API_TOKEN"] = os.getenv("API_TOKEN", "")
    flask_app.config["JSON_SORT_KEYS"] = False

    from app.routes.db_test import db_test_bp
    flask_app.register_blueprint(db_test_bp)

    # Extensions
    cors.init_app(flask_app, resources={r"/*": {"origins": "*"}})
    db.init_app(flask_app)
    migrate.init_app(flask_app, db)

    # ✅ Import models so SQLAlchemy knows them (DO NOT "import app" here)
    from app.models import db_models  # noqa: F401

    # Routes
    from app.routes.health import health_bp
    flask_app.register_blueprint(health_bp)

    # Error handlers
    @flask_app.errorhandler(404)
    def not_found(_):
        return jsonify(error="Not Found", message="Route does not exist"), 404

    @flask_app.errorhandler(500)
    def server_error(_):
        return jsonify(error="Server Error", message="Something went wrong"), 500

    return flask_app
