import os
from dotenv import load_dotenv

load_dotenv()

# Environment Variables
VOLUME = os.getenv("VOLUME", "/volume")
DATA_DIR = os.getenv("DATA_DIR", "/data")
USERNAME = os.getenv("USERNAME", "default_user")

# Data Directory and Credentials File
CREDENTIALS_FILE = os.path.join(DATA_DIR, 'credentials.json')