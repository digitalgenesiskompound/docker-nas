from flask import Blueprint, render_template, request, jsonify, send_file, Response, current_app, send_from_directory
from flask_login import login_required, current_user
import os
import io
import zipfile
import shutil
from werkzeug.utils import secure_filename

from config import VOLUME
from app.api.routes import secure_path, secure_relative_path

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
@login_required
def index():
    current_app.logger.info(f"User '{current_user.id}' accessed the index page.")
    return render_template('index.html')

@main_bp.route('/download_all', methods=['GET'])
@login_required
def download_all():
    try:
        if not os.path.exists(VOLUME):
            current_app.logger.error("Backup directory not found.")
            return jsonify({'error': 'Backup directory not found.'}), 500

        username = current_user.id
        current_app.logger.info(f"User '{username}' is downloading all backups.")

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for root, dirs, files in os.walk(VOLUME):
                for dir in dirs:
                    dir_path = os.path.join(root, dir)
                    relative_dir_path = os.path.relpath(dir_path, VOLUME).replace("\\", "/") + '/'
                    zip_file.writestr(relative_dir_path, '')

                for file in files:
                    file_path = os.path.join(root, file)
                    relative_file_path = os.path.relpath(file_path, VOLUME).replace("\\", "/")
                    zip_file.write(file_path, relative_file_path)
                    current_app.logger.debug(f"Added to ZIP: {relative_file_path}")

        zip_buffer.seek(0)
        zip_filename = f"{username}-all.zip"
        current_app.logger.info(f"Serving ZIP file: {zip_filename}")
        return Response(
            zip_buffer,
            mimetype='application/zip',
            headers={
                'Content-Disposition': f'attachment; filename="{zip_filename}"',
                'Content-Length': str(zip_buffer.getbuffer().nbytes)
            }
        )

    except Exception as e:
        current_app.logger.exception(f"Error creating ZIP: {e}")
        return jsonify({'error': 'An error occurred while creating ZIP.', 'message': str(e)}), 500

@main_bp.route('/download_selected', methods=['POST'])
@login_required
def download_selected():
    try:
        current_app.logger.debug(f"Request Headers: {request.headers}")

        selected_paths = []

        if request.is_json:
            data = request.get_json()
            selected_paths = data.get('selected_paths', [])
            current_app.logger.debug(f"Request JSON Data: {data}")
        else:
            selected_paths = request.form.getlist('selected_paths')
            current_app.logger.debug(f"Request Form Data: {selected_paths}")

        current_app.logger.debug(f"Received selected_paths: {selected_paths}")

        if not selected_paths:
            current_app.logger.error("No files or directories selected for download.")
            return jsonify({'error': 'No files or directories selected for download.'}), 400

        username = current_user.id
        absolute_paths = [secure_path(path) for path in selected_paths]

        current_app.logger.info(f"User '{username}' is downloading selected items: {selected_paths}")

        # Single item download
        if len(absolute_paths) == 1:
            selected_path = absolute_paths[0]
            if os.path.isfile(selected_path):
                current_app.logger.info(f"Serving single file: {selected_path}")
                response = send_file(
                    selected_path,
                    mimetype='application/octet-stream',
                    as_attachment=True,
                    download_name=os.path.basename(selected_path),
                    conditional=True
                )
                response.headers['X-Content-Type-Options'] = 'nosniff'
                return response
            elif os.path.isdir(selected_path):
                zip_buffer = io.BytesIO()
                with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                    for root, dirs, files in os.walk(selected_path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            relative_path = os.path.relpath(file_path, VOLUME).replace("\\", "/")
                            zip_file.write(file_path, relative_path)
                            current_app.logger.debug(f"Added to ZIP: {relative_path}")
                zip_buffer.seek(0)
                zip_filename = f"{username}-{os.path.basename(selected_path)}.zip"
                current_app.logger.info(f"Serving ZIP file: {zip_filename}")
                response = Response(
                    zip_buffer,
                    mimetype='application/zip',
                    headers={
                        'Content-Disposition': f'attachment; filename="{zip_filename}"',
                        'Content-Length': str(zip_buffer.getbuffer().nbytes),
                        'X-Content-Type-Options': 'nosniff'
                    }
                )
                return response
            else:
                current_app.logger.error(f"Selected path is neither a file nor a directory: {selected_path}")
                return jsonify({'error': "Selected path is neither a file nor a directory."}), 400

        # Multiple items download as ZIP
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for selected_path in absolute_paths:
                if os.path.isfile(selected_path):
                    relative_path = os.path.relpath(selected_path, VOLUME).replace("\\", "/")
                    zip_file.write(selected_path, relative_path)
                    current_app.logger.debug(f"Added to ZIP: {relative_path}")
                elif os.path.isdir(selected_path):
                    for root, dirs, files in os.walk(selected_path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            relative_path = os.path.relpath(file_path, VOLUME).replace("\\", "/")
                            zip_file.write(file_path, relative_path)
                            current_app.logger.debug(f"Added to ZIP: {relative_path}")

        zip_buffer.seek(0)
        zip_filename = f"{username}-selected.zip"
        current_app.logger.info(f"Serving ZIP file: {zip_filename}")
        response = Response(
            zip_buffer,
            mimetype='application/zip',
            headers={
                'Content-Disposition': f'attachment; filename="{zip_filename}"',
                'Content-Length': str(zip_buffer.getbuffer().nbytes),
                'X-Content-Type-Options': 'nosniff'
            }
        )
        return response

    except Exception as e:
        current_app.logger.exception(f"Error creating ZIP for selected items: {e}")
        return jsonify({'error': 'An error occurred while creating ZIP.', 'message': str(e)}), 500

@main_bp.route('/upload', methods=['POST'])
@login_required
def upload_files():
    try:
        path = request.form.get('path', '').strip()
        target_dir = secure_path(path)

        current_app.logger.info(f"User '{current_user.id}' is uploading files to: {path}")

        if not os.path.exists(target_dir):
            current_app.logger.error(f"Target directory does not exist: {target_dir}")
            return jsonify({'error': 'Target directory does not exist.'}), 400

        uploaded_files = request.files.getlist('files')
        if not uploaded_files:
            current_app.logger.error("No files uploaded.")
            return jsonify({'error': 'No files uploaded.'}), 400

        for file in uploaded_files:
            if file.filename == '':
                current_app.logger.warning("Empty filename detected.")
                continue

            relative_path = secure_relative_path(file.filename)
            if os.path.isabs(relative_path) or '..' in relative_path:
                current_app.logger.error(f"Invalid file path: {relative_path}")
                return jsonify({'error': 'Invalid file path.'}), 400

            safe_relative_path = secure_relative_path(relative_path)
            relative_dirs, filename = os.path.split(safe_relative_path)
            final_dir = os.path.join(target_dir, relative_dirs)
            os.makedirs(final_dir, exist_ok=True)

            file_path = os.path.join(final_dir, filename)
            if os.path.exists(file_path):
                current_app.logger.error(f'File "{file_path}" already exists.')
                return jsonify({'error': f'File "{filename}" already exists in the target directory.'}), 400

            file.save(file_path)
            current_app.logger.info(f"Uploaded file: {file_path}")

        return jsonify({'message': 'Files uploaded successfully.'}), 200

    except Exception as e:
        current_app.logger.exception(f"Error uploading files to {path}: {e}")
        return jsonify({'error': 'An error occurred while uploading files.', 'message': str(e)}), 500

@main_bp.route('/delete', methods=['POST'])
@login_required
def delete_item():
    try:
        data = request.get_json()
        if not data:
            current_app.logger.error("No JSON payload received.")
            return jsonify({'error': 'Invalid or missing JSON payload.'}), 400

        paths = data.get('path', [])
        if not paths:
            current_app.logger.error("No paths provided for deletion.")
            return jsonify({'error': 'No paths provided for deletion.'}), 400

        if not isinstance(paths, list):
            paths = [paths]

        deleted = []
        errors = []

        for path in paths:
            current_app.logger.info(f"User '{current_user.id}' attempting to delete: {path}")
            destination_path = secure_path(path)

            if not os.path.exists(destination_path):
                current_app.logger.error(f"Item does not exist: {destination_path}")
                errors.append({'path': path, 'error': 'Item does not exist.'})
                continue

            try:
                if os.path.isfile(destination_path):
                    os.remove(destination_path)
                    current_app.logger.info(f"Deleted file: {destination_path}")
                elif os.path.isdir(destination_path):
                    shutil.rmtree(destination_path)
                    current_app.logger.info(f"Deleted directory and its contents: {destination_path}")
                else:
                    current_app.logger.error(f"Selected path is neither a file nor a directory: {destination_path}")
                    errors.append({'path': path, 'error': 'Neither file nor directory.'})
                    continue
                deleted.append(path)
            except Exception as e:
                current_app.logger.exception(f"Error deleting item {path}: {e}")
                errors.append({'path': path, 'error': 'Failed to delete item.'})

        if errors:
            return jsonify({'message': 'Some items were not deleted.', 'deleted': deleted, 'errors': errors}), 207
        else:
            return jsonify({'message': 'All items deleted successfully.', 'deleted': deleted}), 200

    except Exception as e:
        current_app.logger.exception(f"Error deleting items: {e}")
        return jsonify({'error': 'An error occurred while deleting items.', 'message': str(e)}), 500

@main_bp.route('/create_folder', methods=['POST'])
@login_required
def create_folder():
    try:
        if not request.is_json:
            current_app.logger.error("Request content type is not JSON.")
            return jsonify({'error': 'Invalid content type. JSON expected.'}), 400

        data = request.get_json()
        if not data:
            current_app.logger.error("No JSON payload received.")
            return jsonify({'error': 'Invalid or missing JSON payload.'}), 400

        path = data.get('path', '').strip()
        folder_name = data.get('folder_name', '').strip()

        if not folder_name:
            current_app.logger.error("Folder name cannot be empty.")
            return jsonify({'error': 'Folder name cannot be empty.'}), 400

        target_dir = secure_path(path)
        new_folder_path = os.path.join(target_dir, secure_filename(folder_name))

        if os.path.exists(new_folder_path):
            current_app.logger.error(f'Folder "{new_folder_path}" already exists.')
            return jsonify({'error': 'Folder already exists.'}), 400

        os.makedirs(new_folder_path)
        current_app.logger.info(f"Created new folder: {new_folder_path}")

        return jsonify({'message': 'Folder created successfully.'}), 200

    except Exception as e:
        current_app.logger.exception(f"Error creating folder in {path}: {e}")
        return jsonify({'error': 'An error occurred while creating the folder.', 'message': str(e)}), 500

@main_bp.route('/create_file', methods=['POST'])
@login_required
def create_file():
    try:
        if not request.is_json:
            current_app.logger.error("Request content type is not JSON.")
            return jsonify({'error': 'Invalid content type. JSON expected.'}), 400

        data = request.get_json()
        if not data:
            current_app.logger.error("No JSON payload received.")
            return jsonify({'error': 'Invalid or missing JSON payload.'}), 400

        path = data.get('path', '').strip()
        file_name = data.get('file_name', '').strip()

        if not file_name:
            current_app.logger.error("File name cannot be empty.")
            return jsonify({'error': 'File name cannot be empty.'}), 400

        target_dir = secure_path(path)
        new_file_path = os.path.join(target_dir, secure_filename(file_name))

        if os.path.exists(new_file_path):
            current_app.logger.error(f'File "{new_file_path}" already exists.')
            return jsonify({'error': 'File already exists.'}), 400

        with open(new_file_path, 'w', encoding='utf-8') as f:
            pass  # Create an empty file

        current_app.logger.info(f"Created new file: {new_file_path}")
        return jsonify({'message': 'File created successfully.'}), 200

    except Exception as e:
        current_app.logger.exception(f"Error creating file in {path}: {e}")
        return jsonify({'error': 'An error occurred while creating the file.', 'message': str(e)}), 500
    
@main_bp.route('/static/<path:filename>')
@login_required
def serve_static_file(filename):
    return send_from_directory(current_app.static_folder, filename)
