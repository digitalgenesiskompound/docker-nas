import os
from dotenv import load_dotenv

load_dotenv()

# Environment Variables
VOLUME = os.getenv("VOLUME")
DATA_DIR = ("/data")
USERNAME = os.getenv("USERNAME")

# Data Directory and Credentials File
CREDENTIALS_FILE = os.path.join(DATA_DIR, 'credentials.json')
