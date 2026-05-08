from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)

@health_bp.get("/health")
def health():
    return jsonify(
        status="ok",
        service="emotion-recognition-backend",
        models_loaded={
            #False for now since we don't have any models, but this is where we can indicate (True) if the models are loaded and ready to use
            "text": False,
            "face": False,
            "audio": False
        }
    ), 200
