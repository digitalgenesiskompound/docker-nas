from flask import Blueprint, request, jsonify, abort, current_app
from flask_login import login_required
import os
import pathlib
import shutil
from werkzeug.utils import secure_filename

from config import VOLUME

api_bp = Blueprint('api', __name__)

def secure_path(path):
    """
    Ensure the path is secure and within VOLUME.
    """
    abs_path = os.path.abspath(os.path.join(VOLUME, path))
    if not abs_path.startswith(os.path.abspath(VOLUME)):
        current_app.logger.warning(f"Attempted access to forbidden path: {path}")
        abort(403)
    return abs_path

def secure_relative_path(relative_path):
    """
    Secure each part of the relative path to prevent directory traversal.
    """
    parts = pathlib.PurePosixPath(relative_path).parts
    safe_parts = [secure_filename(part) for part in parts]
    return os.path.join(*safe_parts)


@api_bp.route('/list', methods=['GET'])
@login_required
def list_directory():
    path = request.args.get('path', '')
    current_app.logger.info(f"Listing directory: {path}")
    try:
        current_dir = secure_path(path)
        if not os.path.exists(current_dir):
            current_app.logger.error(f"Directory not found: {current_dir}")
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
                    'lastModified': int(stat.st_mtime),
                    'path': os.path.relpath(item_path, VOLUME).replace("\\", "/")
                })

        directories.sort()
        files.sort(key=lambda x: x['name'].lower())

        breadcrumb = [{'name': 'Root', 'path': ''}]
        if path:
            parts = path.strip('/').split('/')
            accumulated_path = ''
            for part in parts:
                accumulated_path = os.path.join(accumulated_path, part)
                breadcrumb.append({'name': part, 'path': accumulated_path.replace("\\", "/")})

        return jsonify({
            'directories': directories,
            'files': files,
            'breadcrumb': breadcrumb
        })

    except Exception as e:
        current_app.logger.exception(f"Error listing directory {path}: {e}")
        return jsonify({'error': 'An error occurred while listing the directory.', 'message': str(e)}), 500

@api_bp.route('/search', methods=['GET'])
@login_required
def search():
    query = request.args.get('query', '').lower()
    if not query:
        current_app.logger.error("No search query provided.")
        return jsonify({'error': 'No search query provided.'}), 400

    current_app.logger.info(f"Performing search for query: {query}")
    matched_directories = []
    matched_files = []

    try:
        for root, dirs, files in os.walk(VOLUME):
            for dir in dirs:
                if query in dir.lower():
                    relative_path = os.path.relpath(os.path.join(root, dir), VOLUME).replace("\\", "/")
                    matched_directories.append(relative_path)

            for file in files:
                if query in file.lower():
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, VOLUME).replace("\\", "/")
                    stat = os.stat(file_path)
                    matched_files.append({
                        'name': file,
                        'size': stat.st_size,
                        'lastModified': int(stat.st_mtime),
                        'path': relative_path
                    })

        breadcrumb = [{'name': 'Root', 'path': ''}, {'name': f"Search Results for '{query}'", 'path': ''}]

        current_app.logger.info(f"Search found {len(matched_directories)} directories and {len(matched_files)} files.")
        return jsonify({
            'directories': matched_directories,
            'files': matched_files,
            'breadcrumb': breadcrumb
        })
    except Exception as e:
        current_app.logger.exception(f"Error during search: {e}")
        return jsonify({'error': 'An error occurred during the search.', 'message': str(e)}), 500
    
@api_bp.route('/get_file_content', methods=['GET'])
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

    except UnicodeDecodeError:
        current_app.logger.error(f"Encoding error when reading file: {path}")
        return jsonify({'error': 'File encoding not supported.'}), 400
    except Exception as e:
        current_app.logger.exception(f"Error fetching file content for {path}: {e}")
        return jsonify({'error': 'An error occurred while fetching file content.', 'message': str(e)}), 500

@api_bp.route('/save_file_content', methods=['POST'])
@login_required
def save_file_content():
    try:
        if not request.is_json:
            current_app.logger.error("Request content type is not JSON.")
            return jsonify({'error': 'Invalid content type. JSON expected.'}), 400

        data = request.get_json()
        if not data:
            current_app.logger.error("No JSON payload received.")
            return jsonify({'error': 'Invalid or missing JSON payload.'}), 400

        path = data.get('path', '').strip()
        content = data.get('content', '')

        if not path:
            return jsonify({'error': 'No file path provided.'}), 400

        secure_file_path = secure_path(path)

        if not os.path.isfile(secure_file_path):
            return jsonify({'error': 'The specified path is not a file.'}), 400

        with open(secure_file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        current_app.logger.info(f"File saved: {secure_file_path}")
        return jsonify({'message': 'File saved successfully.'}), 200

    except Exception as e:
        current_app.logger.exception(f"Error saving file content for {path}: {e}")
        return jsonify({'error': 'An error occurred while saving file content.', 'message': str(e)}), 500
    
@api_bp.route('/move_items', methods=['POST'])
@login_required
def move_items():
    try:
        if not request.is_json:
            current_app.logger.error("Request content type is not JSON.")
            return jsonify({'error': 'Invalid content type. JSON expected.'}), 400

        data = request.get_json()
        current_app.logger.debug(f"Received move_items data: {data}")
        source_paths = data.get('source_paths', [])
        destination_path = data.get('destination_path', '')

        if not source_paths:
            current_app.logger.error("No source paths provided.")
            return jsonify({'error': 'No source paths provided.'}), 400

        if not isinstance(source_paths, list):
            source_paths = [source_paths]

        secure_destination_path = VOLUME if destination_path == '' else secure_path(destination_path)

        if not os.path.exists(secure_destination_path):
            current_app.logger.error("Target directory does not exist.")
            return jsonify({'error': 'Target directory does not exist.'}), 400

        moved = []
        errors = []

        for source_path in source_paths:
            secure_source_path = secure_path(source_path)
            item_name = os.path.basename(secure_source_path)
            destination = os.path.join(secure_destination_path, item_name)

            if os.path.abspath(destination).startswith(os.path.abspath(secure_source_path)):
                errors.append({'path': source_path, 'error': 'Cannot move a directory into itself or its subdirectory.'})
                continue

            if os.path.exists(destination):
                errors.append({'path': source_path, 'error': 'Destination already exists.'})
                continue

            try:
                shutil.move(secure_source_path, destination)
                current_app.logger.info(f"Moved {secure_source_path} to {destination}")
                moved.append(source_path)
            except Exception as e:
                current_app.logger.exception(f"Error moving {source_path} to {destination}: {e}")
                errors.append({'path': source_path, 'error': 'Failed to move item.'})

        if errors:
            return jsonify({'message': 'Some items were not moved.', 'moved': moved, 'errors': errors}), 207
        else:
            return jsonify({'message': 'All items moved successfully.', 'moved': moved}), 200

    except Exception as e:
        current_app.logger.exception(f"Error moving items: {e}")
        return jsonify({'error': 'An error occurred while moving items.', 'message': str(e)}), 500