# auth/models.py

import os
import json
import secrets
from werkzeug.security import generate_password_hash
from config import DATA_DIR, CREDENTIALS_FILE  # Ensure these are defined

def user_exists():
    return os.path.exists(CREDENTIALS_FILE)

def create_user(username, password, passphrase):
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    secret_key = secrets.token_hex(24)  # 48-character hex string
    user_data = {
        'username': username,
        'password': generate_password_hash(password),
        'passphrase_hash': generate_password_hash(passphrase),
        'secret_key': secret_key,
    }
    with open(CREDENTIALS_FILE, 'w') as f:
        json.dump(user_data, f)

def get_user():
    if not user_exists():
        return None
    with open(CREDENTIALS_FILE, 'r') as f:
        return json.load(f)
