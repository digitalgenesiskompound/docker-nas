# auth/models.py

import os
import json
from werkzeug.security import generate_password_hash, check_password_hash
from config import CREDENTIALS_FILE, DATA_DIR

def user_exists():
    return os.path.exists(CREDENTIALS_FILE)

def create_user(username, password):
    if user_exists():
        raise Exception("User already exists.")
    
    # Ensure the data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Generate a secret key for Flask sessions
    secret_key = os.urandom(24).hex()
    
    # Hash the password using Werkzeug's generate_password_hash (defaults to pbkdf2:sha256)
    hashed_password = generate_password_hash(password)
    
    user_data = {
        'username': username,
        'password': hashed_password,
        'secret_key': secret_key
    }
    
    with open(CREDENTIALS_FILE, 'w') as f:
        json.dump(user_data, f)
    print(f"User '{username}' created successfully.")

def get_user():
    if not user_exists():
        return None
    with open(CREDENTIALS_FILE, 'r') as f:
        return json.load(f)
