# config.py

import os
from dotenv import load_dotenv

load_dotenv()

def str_to_bool(value):
    return str(value).lower() in ('true', '1', 't', 'yes', 'y')

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

    # Convert HTTPS environment variable to boolean
    HTTPS = str_to_bool(os.getenv("HTTPS", "False"))

    # Set SameSite and Secure attributes based on HTTPS
    if HTTPS:
        SESSION_COOKIE_SAMESITE = 'None'
        SESSION_COOKIE_SECURE = True
        REMEMBER_COOKIE_SAMESITE = 'None'
        REMEMBER_COOKIE_SECURE = True
    else:
        # Choose appropriate SameSite value when not using Secure
        # 'Lax' is a safe default that allows some cross-site usage without requiring HTTPS
        SESSION_COOKIE_SAMESITE = 'Lax'
        SESSION_COOKIE_SECURE = False
        REMEMBER_COOKIE_SAMESITE = 'Lax'
        REMEMBER_COOKIE_SECURE = False