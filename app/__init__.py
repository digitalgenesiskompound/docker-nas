# app/__init__.py

import os
import logging
from logging.handlers import RotatingFileHandler

from flask import Flask, jsonify, request, render_template
from werkzeug.middleware.proxy_fix import ProxyFix

from config import Config, VOLUME
from extensions import cors, login_manager, csrf
from .auth.routes import auth_bp
from .api.routes import api_bp
from .main.routes import main_bp

def create_app():
    app = Flask(__name__, static_folder='static', template_folder='templates')
    app.config.from_object(Config)

    # Initialize Extensions
    cors.init_app(app, resources={
        r"/*": {
            "origins": app.config['CORS_ORIGINS'],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "X-CSRFToken"],
            "expose_headers": ["Content-Disposition"],
            "supports_credentials": True
        }
    })
    login_manager.init_app(app)
    csrf.init_app(app)

    # ProxyFix Middleware
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # Configure Logging
    handler = RotatingFileHandler(app.config['LOG_FILE'], maxBytes=10_000_000, backupCount=5)
    formatter = logging.Formatter('[%(asctime)s] %(levelname)s in %(module)s: %(message)s')
    handler.setFormatter(formatter)
    handler.setLevel(app.config['LOG_LEVEL'])
    app.logger.addHandler(handler)
    app.logger.setLevel(app.config['LOG_LEVEL'])

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(main_bp)  # No prefix; serves root routes

    # Register Error Handlers
    register_error_handlers(app)

    # Ensure VOLUME exists
    with app.app_context():
        if not os.path.exists(VOLUME):
            os.makedirs(VOLUME)
            app.logger.info(f"Created base directory: {VOLUME}")

    return app

def register_error_handlers(app):
    @app.errorhandler(400)
    def bad_request(error):
        app.logger.warning(f"400 Bad Request: {error}")
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Bad Request'}), 400
        else:
            return render_template('400.html'), 400

    @app.errorhandler(403)
    def forbidden(error):
        app.logger.warning(f"403 Forbidden: {error}")
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Forbidden'}), 403
        else:
            return render_template('403.html'), 403

    @app.errorhandler(404)
    def not_found(error):
        app.logger.warning(f"404 Not Found: {error}")
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Not Found'}), 404
        else:
            return render_template('404.html'), 404

    @app.errorhandler(413)
    def request_entity_too_large(error):
        app.logger.warning(f"413 Request Entity Too Large: {error}")
        if request.path.startswith('/api/'):
            return jsonify({'error': 'File Too Large'}), 413
        else:
            return render_template('413.html'), 413

    @app.errorhandler(500)
    def internal_server_error(error):
        app.logger.error(f"500 Internal Server Error: {error}")
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Internal Server Error', 'message': str(error)}), 500
        else:
            return render_template('500.html'), 500
