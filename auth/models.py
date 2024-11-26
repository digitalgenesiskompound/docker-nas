# auth/models.py

import os
import json
import secrets
from werkzeug.security import generate_password_hash
from config import DATA_DIR, CREDENTIALS_FILE  # Import from config.py

def user_exists():
    """Check if the user credentials file exists."""
    return os.path.exists(CREDENTIALS_FILE)

def create_user(username, password):
    """Create a new user with hashed password and secret key."""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)  # Ensure the data directory exists
    user_data = {
        'username': username,
        'password': generate_password_hash(password),
        'secret_key': secrets.token_hex(16),
    }
    with open(CREDENTIALS_FILE, 'w') as f:
        json.dump(user_data, f)

def get_user():
    """Retrieve user data from the credentials file."""
    if not user_exists():
        return None
    with open(CREDENTIALS_FILE, 'r') as f:
        return json.load(f)
