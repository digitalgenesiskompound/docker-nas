// uploadDownload.js

// Function to perform actions based on user selection
App.performAction = function(action) {
    if (App.selectedItems.size === 0) {
        alert('No items selected.');
        return;
    }

    const paths = Array.from(App.selectedItems);
    if (action === 'download') {
        App.downloadItems(paths);
    } else if (action === 'delete') {
        App.deleteItems(paths);
    } else if (action === 'edit') {
        App.editSelectedItem(paths);
    } else if (action === 'move') { // Updated Move Action
        App.openDestinationModal(); // Open the destination selection modal
    }
};

// Function to edit selected item
App.editSelectedItem = function(paths) {
    if (paths.length !== 1) {
        alert('Please select exactly one file to edit.');
        return;
    }

    const path = paths[0];
    // Check if the selected path is a file
    const selectedFile = App.allFiles.find(file => file.path === path);
    if (!selectedFile) {
        alert('Selected item is not a file or does not exist.');
        return;
    }

    App.openEditor(path);
};

// Function to download selected items with progress and cancellation
App.downloadItems = function(paths) {
    if (paths.length === 1 && !App.allDirectories.includes(paths[0])) {
        // Single file download
        App.downloadSingleFile(paths[0]);
    } else {
        // Multiple files or directories download as ZIP
        App.downloadMultipleItems(paths);
    }
};

// Function to download a single file with progress and cancellation
App.downloadSingleFile = function(path) {
    const id = App.generateUniqueId();
    App.addProgressBar(id, 'download', path.split('/').pop());

    const xhr = new XMLHttpRequest();
    App.activeDownloadXHRs[id] = xhr; // Store XHR with unique ID for cancellation
    xhr.open('POST', '/download_selected', true);
    xhr.responseType = 'blob';

    // Set the request header to indicate JSON payload
    xhr.setRequestHeader('Content-Type', 'application/json');

    // Track download progress
    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            App.updateProgressBar(id, percentComplete);
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 207) { // 207 for multi-status responses
            const disposition = xhr.getResponseHeader('Content-Disposition');
            let filename = 'downloaded_file';
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) { 
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            const blob = xhr.response;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            alert('Download completed successfully.');
            App.loadDirectory(App.currentPath); // Refresh the directory view
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                alert(response.error || 'An error occurred during download.');
            } catch (e) {
                alert('An error occurred during download.');
            }
        }
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onerror = function() {
        alert('An error occurred during the download.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onabort = function() {
        alert('Download has been canceled.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    // Send the selected_paths as JSON in the body
    xhr.send(JSON.stringify({ selected_paths: [path] }));
};

// Function to download multiple items as a ZIP with progress and cancellation
App.downloadMultipleItems = function(paths) {
    const id = App.generateUniqueId();
    App.addProgressBar(id, 'download', 'Selected Items');

    const xhr = new XMLHttpRequest();
    App.activeDownloadXHRs[id] = xhr; // Store XHR with unique ID for cancellation
    xhr.open('POST', '/download_selected', true);
    xhr.responseType = 'blob';

    // Set the request header to indicate JSON payload
    xhr.setRequestHeader('Content-Type', 'application/json');

    // Track download progress
    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            App.updateProgressBar(id, percentComplete);
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 207) { // 207 for multi-status responses
            const disposition = xhr.getResponseHeader('Content-Disposition');
            let filename = 'download.zip';
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) { 
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            const blob = xhr.response;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            alert('Download completed successfully.');
            App.loadDirectory(App.currentPath); // Refresh the directory view
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                alert(response.error || 'An error occurred during download.');
            } catch (e) {
                alert('An error occurred during download.');
            }
        }
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onerror = function() {
        alert('An error occurred during the download.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onabort = function() {
        alert('Download has been canceled.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    // Send the selected_paths as JSON in the body
    xhr.send(JSON.stringify({ selected_paths: paths }));
};

// Function to delete items
App.deleteItems = function(paths) {
    if (!confirm(`Are you sure you want to delete ${paths.length} item(s)? This action cannot be undone.`)) {
        return;
    }

    App.showLoading(true);
    fetch('/delete', {  // Ensure this endpoint matches the backend route
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: paths }), // Send array
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => { throw data; });
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            if (data.errors && data.errors.length > 0) {
                let message = 'Some items were not deleted:\n';
                data.errors.forEach(err => {
                    message += `- ${err.path}: ${err.error}\n`;
                });
                alert(message);
            } else {
                alert('Items deleted successfully.');
            }
            App.selectedItems.clear();
            App.updateSelectedItemsPanel();
            App.loadDirectory(App.currentPath); // Refresh the directory view
        }
        App.showLoading(false);
    })
    .catch(error => {
        console.error('Error deleting items:', error);
        alert(error.error || 'An error occurred while deleting the items.');
        App.showLoading(false);
    });
};

// Function to download all files as a ZIP with progress (New Implementation)
App.downloadAll = function() {
    const id = App.generateUniqueId();
    App.addProgressBar(id, 'download', 'All Files');

    const xhr = new XMLHttpRequest();
    App.activeDownloadXHRs[id] = xhr; // Store XHR with unique ID for cancellation
    xhr.open('GET', '/download_all', true);
    xhr.responseType = 'blob';

    // Track download progress
    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            App.updateProgressBar(id, percentComplete);
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200) {
            const disposition = xhr.getResponseHeader('Content-Disposition');
            let filename = 'download.zip';
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) { 
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            const blob = xhr.response;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            alert('Download completed successfully.');
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                alert(response.error || 'An error occurred during download.');
            } catch (e) {
                alert('An error occurred during download.');
            }
        }
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onerror = function() {
        alert('An error occurred during the download.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onabort = function() {
        alert('Download has been canceled.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.send();
};

// Function to cancel ongoing upload or download
App.cancelOperation = function(id, type) {
    if (type === 'upload' && App.activeUploadXHRs[id]) {
        App.activeUploadXHRs[id].abort();
        delete App.activeUploadXHRs[id];
        alert('Upload canceled.');
    }
    if (type === 'download' && App.activeDownloadXHRs[id]) {
        App.activeDownloadXHRs[id].abort();
        delete App.activeDownloadXHRs[id];
        alert('Download canceled.');
    }
    App.removeProgressBar(id);
};

// Function to reset all progress bars
App.resetAllProgressBars = function() {
    const progressList = document.getElementById('progress-list');
    progressList.innerHTML = '';
    App.activeUploadXHRs = {};
    App.activeDownloadXHRs = {};
};

// Function to upload files with progress tracking and cancellation
App.uploadFiles = function() {
    const input = document.getElementById('upload-file-input');
    const files = input.files;
    if (files.length === 0) {
        alert('Please select at least one file to upload.');
        return;
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = App.generateUniqueId();
        App.addProgressBar(id, 'upload', file.name);

        const formData = new FormData();
        formData.append('files', file);
        formData.append('path', App.currentPath);

        const xhr = new XMLHttpRequest();
        App.activeUploadXHRs[id] = xhr; // Assign to activeUploadXHRs for cancellation
        xhr.open('POST', '/upload', true);

        // Track upload progress
        xhr.upload.onprogress = function(event) {
            if (event.lengthComputable) {
                const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
                App.updateProgressBar(id, percentComplete);
            }
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.error) {
                    alert(`Error uploading ${file.name}: ${response.error}`);
                } else {
                    alert(`File "${file.name}" uploaded successfully.`);
                    App.loadDirectory(App.currentPath);
                }
            } else {
                try {
                    const response = JSON.parse(xhr.responseText);
                    alert(`Error uploading ${file.name}: ${response.error}`);
                } catch (e) {
                    alert(`An error occurred during the upload of "${file.name}".`);
                }
            }
            App.removeProgressBar(id);
            delete App.activeUploadXHRs[id];
        };

        xhr.onerror = function() {
            alert(`An error occurred during the upload of "${file.name}".`);
            App.removeProgressBar(id);
            delete App.activeUploadXHRs[id];
        };

        xhr.onabort = function() {
            alert(`Upload of "${file.name}" has been canceled.`);
            App.removeProgressBar(id);
            delete App.activeUploadXHRs[id];
        };

        xhr.send(formData);
    }

    // Reset the input
    input.value = '';
};

// Function to upload folders with directory structure, progress tracking, and cancellation
App.uploadFolders = function() {
    const input = document.getElementById('upload-folder-input');
    const files = input.files;
    if (files.length === 0) {
        alert('Please select at least one folder to upload.');
        return;
    }

    const formData = new FormData();
    formData.append('path', App.currentPath); // Current directory

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Append each file with its relative path
        formData.append('files', file, file.webkitRelativePath);
    }

    const id = App.generateUniqueId();
    App.addProgressBar(id, 'upload', 'Folder Upload');

    const xhr = new XMLHttpRequest();
    App.activeUploadXHRs[id] = xhr; // Assign to activeUploadXHRs for cancellation
    xhr.open('POST', '/upload', true);

    // Track upload progress
    xhr.upload.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            App.updateProgressBar(id, percentComplete);
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            if (response.error) {
                alert(`Error uploading: ${response.error}`);
            } else {
                alert('Folder uploaded successfully.');
                App.loadDirectory(App.currentPath);
            }
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                alert(`Error uploading: ${response.error}`);
            } catch (e) {
                alert('An error occurred during the upload.');
            }
        }
        App.removeProgressBar(id);
        delete App.activeUploadXHRs[id];
    };

    xhr.onerror = function() {
        alert('An error occurred during the upload.');
        App.removeProgressBar(id);
        delete App.activeUploadXHRs[id];
    };

    xhr.onabort = function() {
        alert('Upload has been canceled.');
        App.removeProgressBar(id);
        delete App.activeUploadXHRs[id];
    };

    xhr.send(formData);

    // Reset the input
    input.value = '';
};
