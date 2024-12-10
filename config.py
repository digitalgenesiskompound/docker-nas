# config.py

import os
from dotenv import load_dotenv

load_dotenv()

# Environment Variables
VOLUME = os.getenv("VOLUME", "/volume")
DATA_DIR = os.getenv("DATA_DIR", "/data")
HOST_PATH = os.getenv("HOST_PATH", "nas")
# Data Directory and Credentials File
CREDENTIALS_FILE = os.path.join(DATA_DIR, 'credentials.json')

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024 * 1024  # 5 GB
    CORS_ORIGINS = os.getenv("CORS_ORIGINS")
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "app.log")
    REMEMBER_COOKIE_DURATION = 3  # days
