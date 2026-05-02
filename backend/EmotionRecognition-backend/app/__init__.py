from datetime import timedelta
import os
from flask import Flask, app, jsonify
from dotenv import load_dotenv

from app.extensions import cors, db, migrate





def create_app():
    load_dotenv()

    
    flask_app = Flask(__name__)  
    # Config
    flask_app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    flask_app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    flask_app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    flask_app.config["API_TOKEN"] = os.getenv("API_TOKEN", "")
    flask_app.config["JSON_SORT_KEYS"] = False
    

    
    # Extensions
    cors.init_app(flask_app, resources={r"/*": {"origins": "*"}})
    db.init_app(flask_app)
    migrate.init_app(flask_app, db)

    
    from app.models import db_models  

    # Routes
    from app.routes.endpoints import api_bp
    flask_app.register_blueprint(api_bp)

    from app.routes.auth_routes import auth_bp
    flask_app.register_blueprint(auth_bp)

    return flask_app
