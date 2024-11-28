// uploadDownload.js

// Initialize CSRF Token
App.getCSRFToken = function() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
};

// Set CSRF Token in XHR Headers
App.setCSRFHeader = function(xhr) {
    const csrfToken = App.getCSRFToken();
    if (csrfToken) {
        xhr.setRequestHeader('X-CSRFToken', csrfToken);
    }
};

// Detect iOS devices
App.isIOS = function() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

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

// -------------------------------------
// Download Functions
// -------------------------------------

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

// Function to download a single file
App.downloadSingleFile = function(path) {
    if (App.isIOS()) {
        App.downloadViaForm([path], 'download-single');
    } else {
        App.downloadSingleFileXHR(path);
    }
};

// Function to download multiple items as ZIP
App.downloadMultipleItems = function(paths) {
    if (App.isIOS()) {
        App.downloadViaForm(paths, 'download-multiple');
    } else {
        App.downloadMultipleItemsXHR(paths);
    }
};

// Function to download all files as ZIP
App.downloadAll = function() {
    const allPaths = App.allFiles.map(file => file.path).concat(App.allDirectories);
    if (App.isIOS()) {
        App.downloadViaForm(allPaths, 'download-all');
    } else {
        App.downloadMultipleItemsXHR(allPaths);
    }
};

// AJAX-based download for single file (non-iOS)
App.downloadSingleFileXHR = function(path) {
    const id = App.generateUniqueId();
    App.addProgressBar(id, 'download', path.split('/').pop());

    const xhr = new XMLHttpRequest();
    App.activeDownloadXHRs[id] = xhr;
    xhr.open('POST', '/download_selected', true);
    xhr.responseType = 'blob';

    // Set headers
    xhr.setRequestHeader('Content-Type', 'application/json');
    App.setCSRFHeader(xhr);

    // Progress tracking
    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            App.updateProgressBar(id, percentComplete);
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 207) {
            const disposition = xhr.getResponseHeader('Content-Disposition');
            let filename = 'downloaded_file';
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const matches = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
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
            App.loadDirectory(App.currentPath);
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

    // Send the selected_paths as JSON
    xhr.send(JSON.stringify({ selected_paths: [path] }));
};

// AJAX-based download for multiple items or all files (non-iOS)
App.downloadMultipleItemsXHR = function(paths) {
    const id = App.generateUniqueId();
    App.addProgressBar(id, 'download', 'Selected Items');

    const xhr = new XMLHttpRequest();
    App.activeDownloadXHRs[id] = xhr;
    xhr.open('POST', '/download_selected', true);
    xhr.responseType = 'blob';

    // Set headers
    xhr.setRequestHeader('Content-Type', 'application/json');
    App.setCSRFHeader(xhr);

    // Progress tracking
    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            App.updateProgressBar(id, percentComplete);
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 207) {
            const disposition = xhr.getResponseHeader('Content-Disposition');
            let filename = 'download.zip';
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const matches = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
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
            App.loadDirectory(App.currentPath);
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

    // Send the selected_paths as JSON
    xhr.send(JSON.stringify({ selected_paths: paths }));
};

// Function to handle download via form submission for iOS devices
App.downloadViaForm = function(paths, formId) {
    // Create a unique form ID
    const uniqueFormId = formId || `download-form-${Date.now()}`;

    // Create form element
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/download_selected';
    form.target = '_blank'; // Open in a new tab/window

    // Add CSRF token as a hidden input
    const csrfToken = App.getCSRFToken();
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrf_token'; // Changed from 'X-CSRFToken' to 'csrf_token'
    csrfInput.value = csrfToken;
    form.appendChild(csrfInput);

    // Add selected_paths as hidden inputs
    paths.forEach(path => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'selected_paths';
        input.value = path;
        form.appendChild(input);
    });

    // Append form to body
    document.body.appendChild(form);

    // Submit the form
    form.submit();

    // Remove the form after submission
    document.body.removeChild(form);

    // Notify user for iOS devices
    alert('Your download should begin shortly. Please check your downloads or the new tab.');
};

// -------------------------------------
// Upload Functions
// -------------------------------------

// Function to upload files with progress tracking and cancellation
App.uploadFiles = function() {
    const input = document.getElementById('upload-file-input');
    const files = input.files;
    if (files.length === 0) {
        alert('Please select at least one file to upload.');
        return;
    }

    const csrfToken = App.getCSRFToken();

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

        // Set the CSRF token in the header
        App.setCSRFHeader(xhr);

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

    const csrfToken = App.getCSRFToken();

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

    // Set the CSRF token in the header
    App.setCSRFHeader(xhr);

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
                App.closeAddFolderModal();
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

// Function to delete items
App.deleteItems = function(paths) {
    if (!confirm(`Are you sure you want to delete ${paths.length} item(s)? This action cannot be undone.`)) {
        return;
    }

    App.showLoading(true);
    const csrfToken = App.getCSRFToken();

    fetch('/delete', {  // Ensure this endpoint matches the backend route
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken  // Include CSRF token in headers
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

// -------------------------------------
// Additional Utility Functions
// -------------------------------------

// Function to generate a unique ID (for progress bars)
App.generateUniqueId = function() {
    return 'id-' + Math.random().toString(36).substr(2, 16);
};

// Function to add a progress bar to the UI
App.addProgressBar = function(id, type, name) {
    const progressList = document.getElementById('progress-list');
    const progressItem = document.createElement('div');
    progressItem.id = id;
    progressItem.className = 'progress-item';

    const label = document.createElement('span');
    label.textContent = `${type.toUpperCase()}: ${name}`;
    progressItem.appendChild(label);

    const progressBar = document.createElement('progress');
    progressBar.value = 0;
    progressBar.max = 100;
    progressItem.appendChild(progressBar);

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = function() {
        App.cancelOperation(id, type);
    };
    progressItem.appendChild(cancelButton);

    progressList.appendChild(progressItem);
};

// Function to update a progress bar's value
App.updateProgressBar = function(id, value) {
    const progressItem = document.getElementById(id);
    if (progressItem) {
        const progressBar = progressItem.querySelector('progress');
        if (progressBar) {
            progressBar.value = value;
        }
    }
};

// Function to remove a progress bar from the UI
App.removeProgressBar = function(id) {
    const progressItem = document.getElementById(id);
    if (progressItem) {
        progressItem.remove();
    }
};

// Function to show or hide a loading indicator
App.showLoading = function(show) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
};

// Function to load the current directory view
App.loadDirectory = function(path) {
    // Implement directory loading logic (e.g., fetch files and directories via /api/list)
    // This is a placeholder for your existing implementation
};

// Function to open the editor for a file
App.openEditor = function(path) {
    // Implement file editor logic
    // This is a placeholder for your existing implementation
};

// Function to open the destination selection modal
App.openDestinationModal = function() {
    // Implement modal opening logic
    // This is a placeholder for your existing implementation
};

// Function to update the selected items panel
App.updateSelectedItemsPanel = function() {
    // Implement UI update logic
    // This is a placeholder for your existing implementation
};

// Function to handle uploading from input elements
App.setupUploadHandlers = function() {
    const uploadFileInput = document.getElementById('upload-file-input');
    if (uploadFileInput) {
        uploadFileInput.addEventListener('change', App.uploadFiles);
    }

    const uploadFolderInput = document.getElementById('upload-folder-input');
    if (uploadFolderInput) {
        uploadFolderInput.addEventListener('change', App.uploadFolders);
    }
};

// Initialize upload handlers on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    App.setupUploadHandlers();
});
