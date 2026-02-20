import os
from dataclasses import dataclass

class Config:
    SECRET_KEY = "dev-secret"
    API_TOKEN = ""
    JSON_SORT_KEYS = False

    SQLALCHEMY_DATABASE_URI = None
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevConfig(Config):
    DEBUG = True

class ProdConfig(Config):
    DEBUG = False
