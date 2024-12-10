from flask_cors import CORS
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect

cors = CORS()
login_manager = LoginManager()
csrf = CSRFProtect()
