import logging
from flask import Flask, send_file, send_from_directory, abort, render_template, request, Response, jsonify, redirect, url_for, flash
from flask_cors import CORS
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_wtf.csrf import CSRFProtect
from auth.models import user_exists, create_user, get_user
from auth.forms import SetupForm, LoginForm
from werkzeug.utils import secure_filename
import os
import zipfile
import io
import pathlib
import json
import shutil
from werkzeug.middleware.proxy_fix import ProxyFix
from dotenv import load_dotenv
from auth.utils import check_password

from config import DATA_DIR, CREDENTIALS_FILE, VOLUME, USERNAME  # Import VOLUME

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, resources={r"/*": {"origins": "*"}})  # Adjust origins as needed for security

# Apply ProxyFix to handle headers from Nginx
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Set maximum file size for uploads (5 GB)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024 * 1024  # 5 GB limit per file

# Load SECRET_KEY from credentials.json if user exists, else use default (will be overwritten during setup)
if user_exists():
    user = get_user()
    app.config['SECRET_KEY'] = user.get('secret_key', os.getenv("SECRET_KEY", "your_default_secret_key"))
else:
    app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "your_default_secret_key")

# Initialize CSRF protection
csrf = CSRFProtect(app)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

class User(UserMixin):
    def __init__(self, id):
        self.id = id

@login_manager.user_loader
def load_user(user_id):
    user = get_user()
    if user and user['username'] == user_id:
        return User(user['username'])
    return None

# Route for initial setup
@app.route('/setup', methods=['GET', 'POST'])
def setup():
    if user_exists():
        return redirect(url_for('login'))
    
    form = SetupForm()
    if form.validate_on_submit():
        username = form.username.data
        password = form.password.data
        create_user(username, password)
        flash('Setup complete. Please log in.', 'success')
        return redirect(url_for('login'))
    
    return render_template('setup.html', form=form)

# Route for login
@app.route('/login', methods=['GET', 'POST'])
def login():
    if not user_exists():
        return redirect(url_for('setup'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = get_user()
        if user and form.username.data == user['username'] and check_password(form.password.data, user['password']):
            user_obj = User(user['username'])
            login_user(user_obj)
            flash('Logged in successfully.', 'success')
            return redirect(url_for('index'))
        else:
            flash('Invalid username or password.', 'danger')
    
    return render_template('login.html', form=form)

# Route for logout
@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logged out successfully.', 'success')
    return redirect(url_for('login'))

# Protect all routes below with login_required
@app.before_request
def require_login():
    allowed_routes = ['login', 'setup', 'static']
    if user_exists():
        if request.endpoint == 'setup':
            return redirect(url_for('login'))
    if request.endpoint not in allowed_routes and not current_user.is_authenticated:
        return redirect(url_for('login'))

def secure_path(path):
    """
    Ensure the path is secure and within VOLUME.
    """
    abs_path = os.path.abspath(os.path.join(VOLUME, path))
    if not abs_path.startswith(os.path.abspath(VOLUME)):
        logger.warning(f"Attempted access to forbidden path: {path}")
        abort(403)  # Forbidden
    return abs_path

def secure_relative_path(relative_path):
    """
    Secure each part of the relative path to prevent directory traversal.
    """
    parts = pathlib.PurePosixPath(relative_path).parts
    safe_parts = [secure_filename(part) for part in parts]
    return os.path.join(*safe_parts)

@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/api/list', methods=['GET'])
@login_required
def list_directory():
    path = request.args.get('path', '')
    logger.info(f"Listing directory: {path}")
    try:
        current_dir = secure_path(path)
        if not os.path.exists(current_dir):
            logger.error(f"Directory not found: {current_dir}")
            return jsonify({'error': 'Directory not found'}), 404

        directories = []
        files = []
        for item in os.listdir(current_dir):
            item_path = os.path.join(current_dir, item)
            if os.path.isdir(item_path):
                directories.append(item)
            elif os.path.isfile(item_path):
                stat = os.stat(item_path)
                files.append({
                    'name': item,
                    'size': stat.st_size,
                    'lastModified': int(stat.st_mtime),  # Unix timestamp in seconds
                    'path': os.path.relpath(item_path, VOLUME).replace("\\", "/")  # Ensure consistent path separators
                })

        directories.sort()
        files.sort(key=lambda x: x['name'].lower())

        # Build breadcrumb data
        breadcrumb = []
        if path:
            parts = path.strip('/').split('/')
            accumulated_path = ''
            breadcrumb.append({'name': 'Root', 'path': ''})
            for part in parts:
                accumulated_path = os.path.join(accumulated_path, part)
                breadcrumb.append({'name': part, 'path': accumulated_path.replace("\\", "/")})
        else:
            breadcrumb.append({'name': 'Root', 'path': ''})

        return jsonify({
            'directories': directories,
            'files': files,
            'breadcrumb': breadcrumb
        })

    except Exception as e:
        logger.exception(f"Error listing directory {path}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/search', methods=['GET'])
@login_required
def search():
    query = request.args.get('query', '').lower()
    if not query:
        logger.error("No search query provided.")
        return jsonify({'error': 'No search query provided.'}), 400

    logger.info(f"Performing search for query: {query}")
    matched_directories = []
    matched_files = []

    for root, dirs, files in os.walk(VOLUME):
        # Check directories
        for dir in dirs:
            if query in dir.lower():
                relative_path = os.path.relpath(os.path.join(root, dir), VOLUME).replace("\\", "/")
                matched_directories.append(relative_path)

        # Check files
        for file in files:
            if query in file.lower():
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, VOLUME).replace("\\", "/")
                stat = os.stat(file_path)
                matched_files.append({
                    'name': file,
                    'size': stat.st_size,
                    'lastModified': int(stat.st_mtime),  # Unix timestamp in seconds
                    'path': relative_path
                })

    # Build breadcrumb for search results
    breadcrumb = [{'name': 'Root', 'path': ''}, {'name': f"Search Results for '{query}'", 'path': ''}]

    logger.info(f"Search found {len(matched_directories)} directories and {len(matched_files)} files.")
    return jsonify({
        'directories': matched_directories,
        'files': matched_files,
        'breadcrumb': breadcrumb
    })

@app.route('/upload', methods=['POST'])
@login_required
@csrf.exempt
def upload_files():
    try:
        # Get the target path from form data
        path = request.form.get('path', '').strip()

        target_dir = secure_path(path)

        logger.info(f"Uploading files to: {path}")

        # Ensure the target directory exists
        if not os.path.exists(target_dir):
            logger.error(f"Target directory does not exist: {target_dir}")
            return jsonify({'error': 'Target directory does not exist.'}), 400

        uploaded_files = request.files.getlist('files')
        if not uploaded_files:
            logger.error("No files uploaded.")
            return jsonify({'error': 'No files uploaded.'}), 400

        for file in uploaded_files:
            # Secure the relative path
            relative_path = file.filename
            if relative_path.startswith('/') or '..' in relative_path:
                logger.error(f"Invalid file path: {relative_path}")
                return jsonify({'error': 'Invalid file path.'}), 400

            safe_relative_path = secure_relative_path(relative_path)
            relative_dirs, filename = os.path.split(safe_relative_path)
            final_dir = os.path.join(target_dir, relative_dirs)
            os.makedirs(final_dir, exist_ok=True)

            file_path = os.path.join(final_dir, filename)
            if os.path.exists(file_path):
                logger.error(f'File "{file_path}" already exists.')
                return jsonify({'error': f'File "{file_path}" already exists.'}), 400

            file.save(file_path)
            logger.info(f"Uploaded file: {file_path}")

        return jsonify({'message': 'Files uploaded successfully.'}), 200

    except Exception as e:
        logger.exception(f"Error uploading files to {path}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/delete', methods=['POST'])
@login_required
@csrf.exempt
def delete_item():
    try:
        data = request.get_json()
        paths = data.get('path', [])
        if not paths:
            logger.error("No paths provided for deletion.")
            return jsonify({'error': 'No paths provided for deletion.'}), 400

        if not isinstance(paths, list):
            paths = [paths]

        deleted = []
        errors = []

        for path in paths:
            logger.info(f"Attempting to delete: {path}")
            destination_path = secure_path(path)

            if not os.path.exists(destination_path):
                logger.error(f"Item does not exist: {destination_path}")
                errors.append({'path': path, 'error': 'Item does not exist.'})
                continue

            try:
                if os.path.isfile(destination_path):
                    os.remove(destination_path)
                    logger.info(f"Deleted file: {destination_path}")
                elif os.path.isdir(destination_path):
                    shutil.rmtree(destination_path)  # Removes directory and all its contents
                    logger.info(f"Deleted directory and its contents: {destination_path}")
                else:
                    logger.error(f"Selected path is neither a file nor a directory: {destination_path}")
                    errors.append({'path': path, 'error': 'Neither file nor directory.'})
                    continue
                deleted.append(path)
            except Exception as e:
                logger.exception(f"Error deleting item {path}: {e}")
                errors.append({'path': path, 'error': str(e)})

        if errors:
            return jsonify({'message': 'Some items were not deleted.', 'deleted': deleted, 'errors': errors}), 207  # Multi-Status
        else:
            return jsonify({'message': 'All items deleted successfully.', 'deleted': deleted}), 200

    except Exception as e:
        logger.exception(f"Error deleting items: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/download_all', methods=['GET'])
@login_required
def download_all():
    try:
        if not os.path.exists(VOLUME):
            logger.error("Backup directory not found.")
            return jsonify({'error': 'Backup directory not found.'}), 500

        logger.info("Creating ZIP for all backups.")

        # Create a zip file in-memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for root, dirs, files in os.walk(VOLUME):
                # Add directories (including empty ones)
                for dir in dirs:
                    dir_path = os.path.join(root, dir)
                    relative_dir_path = os.path.relpath(dir_path, VOLUME).replace("\\", "/") + '/'
                    zip_file.writestr(relative_dir_path, '')  # Add directory entry

                # Add files
                for file in files:
                    file_path = os.path.join(root, file)
                    relative_file_path = os.path.relpath(file_path, VOLUME).replace("\\", "/")
                    zip_file.write(file_path, relative_file_path)
                    logger.debug(f"Added to ZIP: {relative_file_path}")

        # Set the pointer to the start of the BytesIO buffer
        zip_buffer.seek(0)

        # Serve the zip file as a downloadable response with a custom name
        zip_filename = f"{USERNAME}-all.zip"
        logger.info(f"Serving ZIP file: {zip_filename}")
        return Response(
            zip_buffer,
            mimetype='application/zip',
            headers={
                'Content-Disposition': f'attachment; filename={zip_filename}',
                'Content-Length': str(zip_buffer.getbuffer().nbytes)  # Set Content-Length
            }
        )

    except Exception as e:
        logger.exception(f"Error creating ZIP: {e}")
        return jsonify({'error': f"An error occurred while creating ZIP: {str(e)}"}), 500

@app.route('/download_selected', methods=['POST'])
@login_required
@csrf.exempt
def download_selected():
    try:
        # Get the list of selected paths from the JSON payload
        selected_paths = request.json.get('selected_paths', [])

        if not selected_paths:
            logger.error("No files or directories selected for download.")
            return jsonify({'error': 'No files or directories selected for download.'}), 400

        # Secure and validate all selected paths
        absolute_paths = [secure_path(path) for path in selected_paths]

        logger.info(f"Creating ZIP for selected items: {selected_paths}")

        # If only one file or directory is selected, handle accordingly
        if len(absolute_paths) == 1:
            selected_path = absolute_paths[0]
            relative_path = os.path.relpath(selected_path, VOLUME).replace("\\", "/")

            if os.path.isfile(selected_path):
                # Serve the single file
                logger.info(f"Serving single file: {selected_path}")
                return send_file(
                    selected_path,
                    as_attachment=True,
                    download_name=os.path.basename(selected_path)
                )
            elif os.path.isdir(selected_path):
                # Create a zip of the selected directory
                zip_buffer = io.BytesIO()
                with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                    for root, dirs, files in os.walk(selected_path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            relative_file_path = os.path.relpath(file_path, VOLUME).replace("\\", "/")
                            zip_file.write(file_path, relative_file_path)
                            logger.debug(f"Added to ZIP: {relative_file_path}")
                zip_buffer.seek(0)
                zip_filename = f"{USERNAME}-{os.path.basename(selected_path)}.zip"
                logger.info(f"Serving ZIP file: {zip_filename}")
                return Response(
                    zip_buffer,
                    mimetype='application/zip',
                    headers={
                        'Content-Disposition': f'attachment; filename={zip_filename}',
                        'Content-Length': str(zip_buffer.getbuffer().nbytes)  # Set Content-Length
                    }
                )
            else:
                logger.error(f"Selected path is neither a file nor a directory: {selected_path}")
                return jsonify({'error': "Selected path is neither a file nor a directory."}), 400

        # For multiple selections, create a zip containing all selected files and directories
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for selected_path in absolute_paths:
                if os.path.isfile(selected_path):
                    # Add the file to the zip
                    relative_path = os.path.relpath(selected_path, VOLUME).replace("\\", "/")
                    zip_file.write(selected_path, relative_path)
                    logger.debug(f"Added to ZIP: {relative_path}")
                elif os.path.isdir(selected_path):
                    # Add the directory and its contents to the zip
                    for root, dirs, files in os.walk(selected_path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            relative_path = os.path.relpath(file_path, VOLUME).replace("\\", "/")
                            zip_file.write(file_path, relative_path)
                            logger.debug(f"Added to ZIP: {relative_path}")

        # Set the pointer to the start of the BytesIO buffer
        zip_buffer.seek(0)

        # Serve the zip file as a downloadable response with a custom name
        zip_filename = f"{USERNAME}-selected.zip"
        logger.info(f"Serving ZIP file: {zip_filename}")
        return Response(
            zip_buffer,
            mimetype='application/zip',
            headers={
                'Content-Disposition': f'attachment; filename={zip_filename}',
                'Content-Length': str(zip_buffer.getbuffer().nbytes)  # Set Content-Length
            }
        )

    except Exception as e:
        logger.exception(f"Error creating ZIP for selected items: {e}")
        return jsonify({'error': f"An error occurred while creating ZIP: {str(e)}"}), 500

@app.route('/api/get_file_content', methods=['GET'])
@login_required
def get_file_content():
    try:
        path = request.args.get('path', '')
        if not path:
            return jsonify({'error': 'No file path provided.'}), 400

        secure_file_path = secure_path(path)

        if not os.path.isfile(secure_file_path):
            return jsonify({'error': 'The specified path is not a file.'}), 400

        with open(secure_file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        return jsonify({'content': content}), 200

    except Exception as e:
        logger.exception(f"Error fetching file content for {path}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/save_file_content', methods=['POST'])
@login_required
@csrf.exempt
def save_file_content():
    try:
        data = request.get_json()
        path = data.get('path', '')
        content = data.get('content', '')

        if not path:
            return jsonify({'error': 'No file path provided.'}), 400

        secure_file_path = secure_path(path)

        if not os.path.isfile(secure_file_path):
            return jsonify({'error': 'The specified path is not a file.'}), 400

        # Write the new content to the file
        with open(secure_file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        logger.info(f"File saved: {secure_file_path}")
        return jsonify({'message': 'File saved successfully.'}), 200

    except Exception as e:
        logger.exception(f"Error saving file content for {path}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/create_folder', methods=['POST'])
@login_required
@csrf.exempt
def create_folder():
    try:
        # Validate incoming JSON
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data.'}), 400

        # Extract and validate the fields
        path = data.get('path', '').strip()
        folder_name = data.get('folder_name', '').strip()

        if not folder_name:
            return jsonify({'error': 'Folder name cannot be empty.'}), 400

        # Secure the target directory
        target_dir = secure_path(path)

        # Full path for the new folder
        new_folder_path = os.path.join(target_dir, secure_filename(folder_name))

        if os.path.exists(new_folder_path):
            return jsonify({'error': 'Folder already exists.'}), 400

        os.makedirs(new_folder_path)
        logger.info(f"Created new folder: {new_folder_path}")

        return jsonify({'message': 'Folder created successfully.'}), 200

    except Exception as e:
        logger.exception(f"Error creating folder in {path}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/create_file', methods=['POST'])
@login_required
@csrf.exempt
def create_file():
    try:
        # Validate incoming JSON
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data.'}), 400

        # Extract and validate the fields
        path = data.get('path', '').strip()
        file_name = data.get('file_name', '').strip()

        if not file_name:
            return jsonify({'error': 'File name cannot be empty.'}), 400

        # Secure the target directory
        target_dir = secure_path(path)

        # Full path for the new file
        new_file_path = os.path.join(target_dir, secure_filename(file_name))

        if os.path.exists(new_file_path):
            return jsonify({'error': 'File already exists.'}), 400

        # Create an empty file
        with open(new_file_path, 'w') as f:
            pass

        logger.info(f"Created new file: {new_file_path}")

        return jsonify({'message': 'File created successfully.'}), 200

    except Exception as e:
        logger.exception(f"Error creating file in {path}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/move_items', methods=['POST'])
@login_required
@csrf.exempt
def move_items():
    try:
        data = request.get_json()
        logger.debug(f"Received move_items data: {data}")
        source_paths = data.get('source_paths', [])
        destination_path = data.get('destination_path', '')
        logger.debug(f"Source paths: {source_paths}, Destination path: {destination_path}")

        if not source_paths:
            return jsonify({'error': 'No source paths provided.'}), 400

        # Handle empty destination_path (root directory)
        if destination_path == '':
            secure_destination_path = VOLUME  # Use the root volume directory
        else:
            secure_destination_path = secure_path(destination_path)

        logger.debug(f"Secure destination path: {secure_destination_path}")

        # Ensure the target directory exists
        if not os.path.exists(secure_destination_path):
            return jsonify({'error': 'Target directory does not exist.'}), 400

        # Process each source path
        moved = []
        errors = []

        for source_path in source_paths:
            secure_source_path = secure_path(source_path)
            item_name = os.path.basename(secure_source_path)
            destination = os.path.join(secure_destination_path, item_name)

            # Prevent moving an item into itself or its subdirectories
            if os.path.abspath(destination).startswith(os.path.abspath(secure_source_path)):
                errors.append({'path': source_path, 'error': 'Cannot move a directory into itself or its subdirectory.'})
                continue

            # Check if destination already exists
            if os.path.exists(destination):
                errors.append({'path': source_path, 'error': 'Destination already exists.'})
                continue

            try:
                shutil.move(secure_source_path, destination)
                logger.info(f"Moved {secure_source_path} to {destination}")
                moved.append(source_path)
            except Exception as e:
                logger.exception(f"Error moving {source_path} to {destination}: {e}")
                errors.append({'path': source_path, 'error': str(e)})

        if errors:
            return jsonify({'message': 'Some items were not moved.', 'moved': moved, 'errors': errors}), 207  # Multi-Status
        else:
            return jsonify({'message': 'All items moved successfully.', 'moved': moved}), 200

    except Exception as e:
        logger.exception(f"Error moving items: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/static/<path:filename>')
@login_required
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

if __name__ == '__main__':
    # Ensure the base directory exists
    if not os.path.exists(VOLUME):
        os.makedirs(VOLUME)
    app.run(host='0.0.0.0', port=5000)
