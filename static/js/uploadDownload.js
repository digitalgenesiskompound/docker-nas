// uploadDownload.js

// Ensure the App namespace exists
var App = App || {};

// Initialize active XHR objects for uploads and downloads
App.activeUploadXHRs = App.activeUploadXHRs || {};
App.activeDownloadXHRs = App.activeDownloadXHRs || {};

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
        App.showToast('No items selected.');
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
        App.showToast('Please select exactly one file to edit.');
        return;
    }

    const path = paths[0];
    // Check if the selected path is a file
    const selectedFile = App.allFiles.find(file => file.path === path);
    if (!selectedFile) {
        App.showToast('Selected item is not a file or does not exist.');
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
            App.updateProgressBar(id, percentComplete, false);
        } else {
            // Indeterminate progress
            App.updateProgressBar(id, 0, true);
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
            App.showToast('Download completed successfully.');
            App.loadDirectory(App.currentPath);
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                App.showToast(response.error || 'An error occurred during download.');
            } catch (e) {
                App.showToast('An error occurred during download.');
            }
        }
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onerror = function() {
        App.showToast('An error occurred during the download.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onabort = function() {
        App.showToast('Download has been canceled.');
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
            App.updateProgressBar(id, percentComplete, false);
        } else {
            // Indeterminate progress
            App.updateProgressBar(id, 0, true);
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
            App.showToast('Download completed successfully.');
            App.loadDirectory(App.currentPath);
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                App.showToast(response.error || 'An error occurred during download.');
            } catch (e) {
                App.showToast('An error occurred during download.');
            }
        }
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onerror = function() {
        App.showToast('An error occurred during the download.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onabort = function() {
        App.showToast('Download has been canceled.');
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
    form.target = '_self'; // Submit in the same tab for better iOS compatibility
    
    // Add CSRF token as a hidden input
    const csrfToken = App.getCSRFToken();
    if (!csrfToken) {
        App.showToast('CSRF token not found. Cannot initiate download.');
        return;
    }
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrf_token'; // Must match Flask-WTF's expectations
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
    App.showToast('Your download should begin shortly. Please check your downloads.');
};


// -------------------------------------
// Upload Functions
// -------------------------------------

// Function to upload files with progress tracking and cancellation
App.uploadFiles = function() {
    const input = document.getElementById('upload-file-input');
    const files = input.files;
    if (files.length === 0) {
        App.showToast('Please select at least one file to upload.');
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

        // Set the CSRF token in the header
        App.setCSRFHeader(xhr);

        // Track upload progress
        xhr.upload.onprogress = function(event) {
            if (event.lengthComputable) {
                const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
                App.updateProgressBar(id, percentComplete, false);
            } else {
                // Indeterminate progress
                App.updateProgressBar(id, 0, true);
            }
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.error) {
                    App.showToast(`Error uploading ${file.name}: ${response.error}`);
                } else {
                    App.showToast(`File "${file.name}" uploaded successfully.`);
                    App.loadDirectory(App.currentPath);
                }
            } else {
                try {
                    const response = JSON.parse(xhr.responseText);
                    App.showToast(`Error uploading ${file.name}: ${response.error}`);
                } catch (e) {
                    App.showToast(`An error occurred during the upload of "${file.name}".`);
                }
            }
            App.removeProgressBar(id);
            delete App.activeUploadXHRs[id];
        };

        xhr.onerror = function() {
            App.showToast(`An error occurred during the upload of "${file.name}".`);
            App.removeProgressBar(id);
            delete App.activeUploadXHRs[id];
        };

        xhr.onabort = function() {
            App.showToast(`Upload of "${file.name}" has been canceled.`);
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
        App.showToast('Please select at least one folder to upload.', 'warning');
        return;
    }

    // Extract folder name from the first file's relative path
    const folderName = files.length > 0 ? files[0].webkitRelativePath.split('/')[0] : 'this folder';

    // Show confirmation modal
    App.showConfirmation(`Are you sure you want to upload all files from “${folderName}”? Only do this if you trust the site.`, 'Confirm Upload')
        .then(() => {
            // User confirmed - proceed with uploading
            const formData = new FormData();
            formData.append('path', App.currentPath); // Current directory

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                // Append each file with its relative path
                formData.append('files', file, file.webkitRelativePath);
            }

            const id = App.generateUniqueId();
            App.addProgressBar(id, 'upload', 'Folder Upload', true); // Set as indeterminate

            const xhr = new XMLHttpRequest();
            App.activeUploadXHRs[id] = xhr; // Assign to activeUploadXHRs for cancellation
            xhr.open('POST', '/upload', true);

            // Set the CSRF token in the header
            App.setCSRFHeader(xhr);

            // Track upload progress
            xhr.upload.onprogress = function(event) {
                if (event.lengthComputable) {
                    const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
                    App.updateProgressBar(id, percentComplete, false);
                } else {
                    // Indeterminate progress
                    App.updateProgressBar(id, 0, true);
                }
            };

            xhr.onload = function() {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    if (response.error) {
                        App.showToast(`Error uploading: ${response.error}`, 'danger');
                    } else {
                        App.showToast('Folder uploaded successfully.', 'success');
                        App.loadDirectory(App.currentPath);
                        App.closeAddFolderModal();
                    }
                } else {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        App.showToast(`Error uploading: ${response.error}`, 'danger');
                    } catch (e) {
                        App.showToast('An error occurred during the upload.', 'danger');
                    }
                }
                App.removeProgressBar(id);
                delete App.activeUploadXHRs[id];
            };

            xhr.onerror = function() {
                App.showToast('An error occurred during the upload.', 'danger');
                App.removeProgressBar(id);
                delete App.activeUploadXHRs[id];
            };

            xhr.onabort = function() {
                App.showToast('Upload has been canceled.', 'warning');
                App.removeProgressBar(id);
                delete App.activeUploadXHRs[id];
            };

            xhr.send(formData);

            // Reset the input
            input.value = '';
        })
        .catch(() => {
            // User canceled - do nothing or show a toast if desired
            App.showToast('Upload canceled.', 'info');
        });
};


// Function to delete items
App.deleteItems = function(paths) {
    if (!paths || paths.length === 0) {
        App.showToast('No items selected for deletion.', 'warning');
        return;
    }

    const itemCount = paths.length;
    const message = `Are you sure you want to delete ${itemCount} item(s)? This action cannot be undone.`;

    App.showConfirmation(message, 'Confirm Deletion')
        .then(() => {
            // User confirmed - proceed with deletion
            App.showLoading(true);
            const csrfToken = App.getCSRFToken();

            return fetch('/delete', {  // Ensure this endpoint matches the backend route
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken  // Include CSRF token in headers
                },
                body: JSON.stringify({ path: paths }), // Send array
            });
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => { throw data; });
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                App.showToast(data.error, 'danger');
            } else {
                if (data.errors && data.errors.length > 0) {
                    let errorMessage = 'Some items were not deleted:\n';
                    data.errors.forEach(err => {
                        errorMessage += `- ${err.path}: ${err.error}\n`;
                    });
                    App.showToast(errorMessage, 'warning');
                } else {
                    App.showToast('Items deleted successfully.', 'success');
                }
                App.selectedItems.clear();
                App.updateSelectedItemsPanel();
                App.loadDirectory(App.currentPath); // Refresh the directory view
            }
            App.showLoading(false);
        })
        .catch(error => {
            if (error instanceof TypeError) {
                // Likely a network error or user canceled the confirmation
                console.error('Operation canceled or network error:', error);
                App.showToast('Operation was canceled or a network error occurred.', 'warning');
            } else {
                console.error('Error deleting items:', error);
                App.showToast(error.error || 'An error occurred while deleting the items.', 'danger');
            }
            App.showLoading(false);
        });
};


// Function to cancel ongoing upload or download
App.cancelOperation = function(id, type) {
    if (type === 'upload' && App.activeUploadXHRs[id]) {
        App.activeUploadXHRs[id].abort();
        delete App.activeUploadXHRs[id];
        App.showToast('Upload canceled.');
    }
    if (type === 'download' && App.activeDownloadXHRs[id]) {
        App.activeDownloadXHRs[id].abort();
        delete App.activeDownloadXHRs[id];
        App.showToast('Download canceled.');
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

// Function to show or hide a loading indicator
App.showLoading = function(show) {
    const loadingIndicator = document.getElementById('loading');
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
};
